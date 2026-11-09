import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { maskSwift, scanSource, analyse } from '../src/analyse.mjs';
import { render } from '../src/render.mjs';

test('comments and strings do not invent task sites; offsets are preserved',()=>{
  const source='// Task { }\n/* outer /* Task { } */ end */\nlet s = #"Task { }"#\nlet m = """Task { }"""\nTask { await load() }';
  assert.equal(maskSwift(source).length,source.length);
  const sites=scanSource(source,'Example.swift').sites;
  assert.equal(sites.length,2);assert.equal(sites.find(s=>s.kind==='task').line,5);
});
test('ordinary await creates no task; nested unstructured tasks stay distinct',()=>{
  const ordinary=scanSource('func f() async { await load() }','A.swift').sites;
  assert.deepEqual(ordinary.map(s=>s.kind),['await']);
  const sites=scanSource('Task { Task { await load() }; async let value = load() }','A.swift').sites;
  assert.equal(sites.filter(s=>s.kind==='task').length,2);
  assert.equal(sites.filter(s=>s.kind==='async-let').length,1);
  assert.ok(sites.every(s=>!('parentTask' in s)));
});
test('finds task closures written as explicit operation arguments', () => {
  const source = 'Task(operation: { refresh() })\nTask.detached(priority: .background, operation: { refresh() })';
  assert.deepEqual(scanSource(source,'A.swift').sites.map(site => site.kind), ['task','detached']);
});

test('framework modifiers, detached work and group scopes have distinct kinds',()=>{
  const source='Task.detached { }\n.task(id: item) { }\n.refreshable { }\nwithThrowingTaskGroup(of: Int.self) { group in group.addTask { 1 } }';
  assert.deepEqual(scanSource(source,'A.swift').sites.map(s=>s.kind),['detached','view-task','refresh','group','group-child']);
});
test('discovers possible synchronous entry points without declaring them complete',()=>{
  const source='func application(_ app: UIApplication, didFinishLaunchingWithOptions opts: Options?) -> Bool { true }\nButton("Refresh") { refresh() }';
  assert.deepEqual(scanSource(source,'App.swift').sites.map(s=>s.kind),['launch-callback','button-action']);
});
test('architecture warnings depend on source location, not every conditional',()=>{
  const source='if visible { show() }; let day = calendar.startOfDay(for: date)';
  assert.equal(scanSource(source,'CoffeeViewModel.swift').sites.filter(s=>s.kind==='ui-rule').length,1);
  assert.equal(scanSource(source,'CoffeeFeature.swift').sites.length,0);
});
test('scan excludes test folders and symlinks and does not change input',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'swift-explorer-test-'));
  try {
    await fs.mkdir(path.join(root,'AppTests'));
    await fs.writeFile(path.join(root,'App.swift'),'@main struct Demo: App { Task { } }');
    await fs.writeFile(path.join(root,'AppTests','Test.swift'),'Task { }');
    await fs.symlink(path.join(root,'App.swift'),path.join(root,'Link.swift'));
    await fs.mkdir(path.join(root,'Contest'));
    await fs.writeFile(path.join(root,'Contest','ContestFeature.swift'),'struct ContestFeature {}');
    const before=await fs.readFile(path.join(root,'App.swift'),'utf8');
    await fs.mkdir(path.join(root,'reports'));
    await fs.writeFile(path.join(root,'reports','ReportFeature.swift'),'struct ReportFeature {}');
    const report = await analyse(root);
    assert.deepEqual(report.files.map(file => file.path), ['App.swift', 'Contest/ContestFeature.swift', 'reports/ReportFeature.swift']);
    assert.equal(report.files[0].entries.length,1);
    assert.deepEqual(report.scope.excludedTestDirectories, ['AppTests']);
    assert.deepEqual(report.scope.symbolicLinkPaths, ['Link.swift']);
    await fs.unlink(path.join(root,'Link.swift'));
    await fs.symlink('Contest/ContestFeature.swift',path.join(root,'Link.swift'));
    const retargeted = await analyse(root);
    assert.deepEqual(retargeted.files, report.files);
    assert.notEqual(retargeted.sourceFingerprint, report.sourceFingerprint);
    await fs.mkdir(path.join(root, 'ExtraTests'));
    const expanded = await analyse(root);
    assert.deepEqual(expanded.files, report.files);
    assert.notEqual(expanded.sourceFingerprint, retargeted.sourceFingerprint);
    assert.equal((await analyse(root,{includeTests:true})).scope.fileCount,4);
    assert.equal(await fs.readFile(path.join(root,'App.swift'),'utf8'),before);
  } finally { await fs.rm(root,{recursive:true,force:true}); }
});
test('report escapes repository text and embeds data without script injection',()=>{
  const payload='</script><script>alert(1)</script>';
  const report={project:payload,generatedAt:'2026-09-13',revision:'abc',dirty:false,files:[],scope:{fileCount:0,skipped:[]},limitations:[payload]};
  const html=render(report);
  assert.ok(!html.includes(payload));assert.ok(html.includes('\\u003c/script>'));
  assert.equal((html.match(/<script>/g)||[]).length,1);
  assert.ok(html.includes("connect-src 'none'"));
});

test('changing Xcode target definitions invalidates source review evidence', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cfa-target-definition-'));
  t.after(() => fs.rm(root, {recursive:true, force:true}));
  await fs.writeFile(path.join(root, 'App.swift'), 'struct App {}');
  const project = path.join(root, 'App.xcodeproj');
  await fs.mkdir(project);
  const definition = path.join(project, 'project.pbxproj');
  await fs.writeFile(definition, 'First target membership');
  const before = await analyse(root);
  await fs.writeFile(definition, 'Changed target membership');
  const after = await analyse(root);
  assert.deepEqual(after.files, before.files);
  assert.notEqual(after.sourceFingerprint, before.sourceFingerprint);
});

test('changing app capability or lifecycle configuration invalidates source review evidence', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cfa-app-configuration-'));
  t.after(() => fs.rm(root, {recursive:true, force:true}));
  await fs.writeFile(path.join(root, 'App.swift'), 'struct App {}');
  for (const file of ['App-Info.plist', 'App.entitlements']) {
    const configuration = path.join(root, file);
    await fs.writeFile(configuration, 'Original configuration');
    const before = await analyse(root);
    await fs.writeFile(configuration, 'Changed configuration');
    const after = await analyse(root);
    assert.deepEqual(after.files, before.files);
    assert.notEqual(after.sourceFingerprint, before.sourceFingerprint, file);
    assert.ok(after.scope.buildDefinitionPaths.includes(file));
  }
});

test('surfaces local Swift package manifests as build definitions and keeps them in the source inventory', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cfa-package-definition-'));
  t.after(() => fs.rm(root, {recursive:true, force:true}));
  const folder = path.join(root, 'LocalPackage');
  await fs.mkdir(folder);
  const manifests = ['Package.swift', 'Package@swift-6.0.swift'];
  for (const name of manifests) await fs.writeFile(path.join(folder, name), 'import PackageDescription\n');
  const before = await analyse(root);
  for (const name of manifests) {
    const relative = 'LocalPackage/' + name;
    const file = before.files.find(file => file.path === relative);
    const definition = before.buildDefinitions.find(file => file.path === relative);
    assert.ok(before.scope.buildDefinitionPaths.includes(relative));
    assert.equal(definition.hash, file.hash);
  }
  await fs.appendFile(path.join(folder, manifests[1]), '// Changed package configuration\n');
  assert.notEqual((await analyse(root)).sourceFingerprint, before.sourceFingerprint);
});

test('fingerprints build settings under test-named folders even when Swift sources there are excluded', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cfa-build-settings-'));
  t.after(() => fs.rm(root, {recursive:true, force:true}));
  await fs.mkdir(path.join(root, 'AppTests'));
  await fs.writeFile(path.join(root, 'App.swift'), 'struct App {}');
  await fs.writeFile(path.join(root, 'AppTests', 'Test.swift'), 'struct Test {}');
  const manifest = path.join(root, 'AppTests', 'Package@swift-6.0.swift');
  await fs.writeFile(manifest, 'import PackageDescription\n');
  const configuration = path.join(root, 'AppTests', 'Shared.xcconfig');
  await fs.writeFile(configuration, 'SWIFT_VERSION = 5.0\n');
  const before = await analyse(root);
  assert.deepEqual(before.files.map(file => file.path), ['App.swift']);
  assert.deepEqual(before.scope.excludedTestDirectories, ['AppTests']);
  assert.ok(before.scope.buildDefinitionPaths.includes('AppTests/Shared.xcconfig'));
  assert.ok(before.scope.buildDefinitionPaths.includes('AppTests/Package@swift-6.0.swift'));
  await fs.writeFile(configuration, 'SWIFT_VERSION = 6.0\n');
  const after = await analyse(root);
  assert.deepEqual(after.files, before.files);
  assert.notEqual(after.sourceFingerprint, before.sourceFingerprint);
  await fs.appendFile(manifest, '// Changed package target membership\n');
  assert.notEqual((await analyse(root)).sourceFingerprint, after.sourceFingerprint);
});

test('reports invalid Swift source instead of scanning replacement characters', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cfa-source-encoding-'));
  t.after(() => fs.rm(root, {recursive:true, force:true}));
  await fs.writeFile(path.join(root, 'App.swift'), 'struct App {}');
  await fs.writeFile(path.join(root, 'Invalid.swift'), Buffer.from([0xff]));
  await fs.writeFile(path.join(root, 'Null.swift'), Buffer.from([0]));
  const report = await analyse(root);
  assert.deepEqual(report.files.map(file => file.path), ['App.swift']);
  assert.deepEqual(report.scope.skipped, [
    {file:'Invalid.swift', reason:'Source is not valid UTF-8'},
    {file:'Null.swift', reason:'Source contains a null byte'}
  ]);
});

test('preserves evidence line numbers and comment boundaries for mixed line endings', () => {
  const source = '// Task {}\rstruct Example {}\r\nTask {}\nTask {}';
  const report = scanSource(source, 'Example.swift');
  assert.equal(report.declarations[0].line, 2);
  assert.deepEqual(report.sites.filter(site => site.kind === 'task').map(site => site.line), [3,4]);
});
