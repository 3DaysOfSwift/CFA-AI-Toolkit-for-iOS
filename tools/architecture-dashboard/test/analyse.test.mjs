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
test('framework modifiers, detached work and group scopes have distinct kinds',()=>{
  const source='Task.detached { }\n.task(id: item) { }\n.refreshable { }\nwithThrowingTaskGroup(of: Int.self) { group in group.addTask { 1 } }';
  assert.deepEqual(scanSource(source,'A.swift').sites.map(s=>s.kind),['detached','view-task','refresh','group','group-child']);
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
    const before=await fs.readFile(path.join(root,'App.swift'),'utf8');
    const report=await analyse(root);assert.equal(report.scope.fileCount,1);assert.equal(report.files[0].entries.length,1);
    assert.equal((await analyse(root,{includeTests:true})).scope.fileCount,2);
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
