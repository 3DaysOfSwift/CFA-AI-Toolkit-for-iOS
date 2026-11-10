import test from 'node:test';
import assert from 'node:assert/strict';
import {analyseProject} from '../src/project-analysis.mjs';
import {auditEntitlements} from '../src/entitlement-audit.mjs';
import {collectSyntax} from '../src/syntax-evidence.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const inventory = () => ({sourceFingerprint:'abc',scope:{skipped:[]},files:[{path:'App.swift',hash:'hash'}],buildDefinitions:[{path:'App.entitlements',hash:'config-hash'}]});
const syntax = async () => ({status:'available',files:['App.swift'],items:[{kind:'call.expression',name:'refresh',file:'App.swift',line:2}],warnings:[]});

test('distinguishes an empty scan from one where every source was skipped', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cfa-empty-inventory-'));
  t.after(() => fs.rm(root, {recursive:true, force:true}));
  await assert.rejects(analyseProject(root), /No Swift source files found/);
  await fs.writeFile(path.join(root, 'Invalid.swift'), Buffer.from([0xff]));
  await assert.rejects(analyseProject(root), /No Swift source files could be scanned: Invalid\.swift \(Source is not valid UTF-8\)/);
});

test('compiled SwiftSyntax scanner inventories startup candidates', {
  skip: process.platform !== 'darwin', timeout: 150_000
}, async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cfa-startup-inventory-'));
  t.after(() => fs.rm(root, {recursive:true, force:true}));
  await fs.writeFile(path.join(root, 'main.swift'), 'import Foundation\nprint("start")\nprint("finish")\n');
  const initialized = path.join(root, 'Initialized');
  await fs.mkdir(initialized);
  await fs.writeFile(path.join(initialized, 'main.swift'),
    'var computed: Int { 1 }\nlet value = start()\nprint(value)\n');
  const conditional = path.join(root, 'Conditional');
  await fs.mkdir(conditional);
  await fs.writeFile(path.join(conditional, 'main.swift'),
    '#if DEBUG\nprint("debug")\nprint("next")\n#else\nprint("release")\n#endif\nprint("after startup")\n');
  const fallback = path.join(root, 'Fallback');
  await fs.mkdir(fallback);
  await fs.writeFile(path.join(fallback, 'main.swift'),
    '#if DEBUG\nprint("debug")\n#endif\nprint("fallback")\n');
  await fs.writeFile(path.join(root, 'App.swift'), [
    '@available(*, deprecated, message: "Use @main") struct Old {}',
    '@main enum App { static func main() async {} }',
    'class Delegate {',
    '  @MainActor',
    '  public func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool { true }',
    '  func application(_ app: UIApplication, options didFinishLaunchingWithOptions: Bool) -> Bool { true }',
    '  func run() {',
    '    _Concurrency.Task<Void, Never>.init { }',
    '    _Concurrency.Task.detached { }',
    '    Fixtures.Task { }',
    '  }',
    '}'
  ].join('\n'));

  const inventory = await collectSyntax(root);
  assert.equal(inventory.status, 'available', inventory.reason);
  assert.deepEqual(inventory.items.filter(item => ['concurrency.task', 'concurrency.detached'].includes(item.kind))
    .map(({kind, line, column}) => [kind, line, column]), [
    ['concurrency.task', 8, 5],
    ['concurrency.detached', 9, 5]
  ]);
  assert.deepEqual(inventory.items.filter(item => item.kind.startsWith('entry.'))
    .map(({kind, name, file, line, column}) => [kind, name, file, line, column]), [
    ['entry.main', 'App', 'App.swift', 2, 1],
    ['entry.launchCallback', 'application', 'App.swift', 5, 10],
    ['entry.main', 'main.swift', 'Conditional/main.swift', 2, 1],
    ['entry.main', 'main.swift', 'Conditional/main.swift', 5, 1],
    ['entry.main', 'main.swift', 'Fallback/main.swift', 2, 1],
    ['entry.main', 'main.swift', 'Fallback/main.swift', 4, 1],
    ['entry.main', 'main.swift', 'Initialized/main.swift', 2, 13],
    ['entry.main', 'main.swift', 'main.swift', 2, 1]
  ]);
});

test('combines syntax and index evidence without treating calls as runtime traces', async () => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'project-analysis-test-'));
  try {
    const result=await analyseProject(root,{indexStore:'/index',module:'App'},{analyse:async()=>inventory(),syntax,index:async()=>[
      {file:'App.swift',line:2,caller:'start',callee:'refresh'},
      {file:'Excluded.swift',line:1,caller:'test',callee:'refresh'}]});
    assert.equal(result.syntax.coverage,'matching');
    assert.deepEqual(result.buildDefinitions, inventory().buildDefinitions);
    assert.equal(result.compilerIndex.status,'available');
    assert.equal(result.compilerIndex.indexFreshness,'unverified');
    assert.equal(result.compilerIndex.calls.length,1);
    assert.equal(result.compilerIndex.excludedCalls,1);
    assert.equal(result.callCandidates[0].written,'refresh');
    assert.equal(result.callCandidates[0].possibleIndexMatches[0].callee,'refresh');
    assert.match(result.limitations.join(' '),/Same-line index matches are candidates/);
    assert.match(result.limitations.join(' '),/not proof of runtime/);
    assert.match(result.limitations.join(' '), /default actor isolation from the selected target and build configuration/);
  } finally { await fs.rm(root,{recursive:true,force:true}); }
});

test('retains excluded call counts when the index has no in-scope calls', async () => {
  const result = await analyseProject(os.tmpdir(), {indexStore:'/index',module:'App'}, {
    analyse:async()=>inventory(), syntax,
    index:async()=>[{file:'Excluded.swift',line:1,caller:'test',callee:'refresh'}]
  });
  assert.equal(result.compilerIndex.status, 'unavailable');
  assert.equal(result.compilerIndex.excludedCalls, 1);
  assert.deepEqual(result.callCandidates[0].possibleIndexMatches, []);
});

test('reports index failures and rejects a source change during analysis', async () => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'project-analysis-test-'));
  try {
    const result=await analyseProject(root,{indexStore:'/missing',module:'App'},{analyse:async()=>inventory(),syntax,index:async()=>{throw Error('Index not readable')}});
    assert.equal(result.compilerIndex.status,'unavailable');
    assert.match(result.compilerIndex.reason,/not readable/);
    await assert.rejects(analyseProject(root,{indexStore:'/index'},{analyse:async()=>inventory(),syntax}),/both/);
    let n=0;
    await assert.rejects(analyseProject(root,{}, {analyse:async()=>({...inventory(),sourceFingerprint:String(n++)}),syntax}),/changed during analysis/);
  } finally { await fs.rm(root,{recursive:true,force:true}); }
});

test('preserves ambiguous same-line matches instead of choosing a callee', async () => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'project-analysis-test-'));
  try {
    const result=await analyseProject(root,{indexStore:'/index',module:'App'},{analyse:async()=>inventory(),syntax,index:async()=>[
      {file:'App.swift',line:2,column:10,callee:'first'},
      {file:'App.swift',line:2,column:25,callee:'second'}]});
    assert.deepEqual(result.callCandidates[0].possibleIndexMatches.map(call=>call.callee),['first','second']);
    assert.equal(result.callCandidates[0].resolvedCallee,undefined);
  } finally { await fs.rm(root,{recursive:true,force:true}); }
});

test('keeps syntax coverage unverified when a listed file has parser warnings', async () => {
  const partialSyntax = async () => ({
    ...(await syntax()), warnings:['Parser reported errors in App.swift']
  });
  const result = await analyseProject(os.tmpdir(), {}, {
    analyse:async () => inventory(), syntax:partialSyntax
  });
  assert.equal(result.syntax.status, 'available');
  assert.equal(result.syntax.coverage, 'unverified');
  assert.deepEqual(result.syntax.warnings, ['Parser reported errors in App.swift']);
  assert.equal(result.callCandidates[0].written, 'refresh');
});

test('keeps syntax and call candidates inside the inventoried source scope', async () => {
  const result = await analyseProject(os.tmpdir(), {}, {
    analyse: async () => inventory(),
    syntax: async () => {
      const evidence = await syntax();
      return {
        ...evidence,
        files: [...evidence.files, 'Excluded.swift'],
        items: [...evidence.items, {kind:'call.expression', name:'export', file:'Excluded.swift', line:1}]
      };
    }
  });
  assert.equal(result.syntax.coverage, 'unverified');
  assert.equal(result.syntax.excludedItems, 1);
  assert.deepEqual(result.syntax.items.map(item => item.file), ['App.swift']);
  assert.deepEqual(result.callCandidates.map(call => call.file), ['App.swift']);
});


test('project analysis carries indexed caller links into entitlement review', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cfa-entitlement-project-'));
  t.after(() => fs.rm(root, {recursive:true, force:true}));
  await fs.writeFile(path.join(root, 'Export.swift'), [
    'func export() { exportFeature.export() }',
    'func route() { export() }',
    'func shortcut() { route() }'
  ].join('\n'));
  const analysis = await analyseProject(root, {indexStore:'/index', module:'App'}, {
    syntax: async () => ({status:'available', files:['Export.swift'], items:[
      {kind:'call.expression', name:'exportFeature.export', file:'Export.swift', line:1, column:17}
    ]}),
    index: async () => [
      {file:'Export.swift', line:1, column:31, callerID:'export', calleeID:'paid', caller:'export'},
      {file:'Export.swift', line:2, column:16, callerID:'route', calleeID:'export', caller:'route'},
      {file:'Export.swift', line:3, column:19, callerID:'shortcut', calleeID:'route', caller:'shortcut'},
      {file:'Unscanned.swift', line:1, column:1, callerID:'excluded', calleeID:'route', caller:'excluded'}
    ]
  });
  const report = auditEntitlements(analysis, {
    capabilities:[{name:'Export', writtenCalls:['exportFeature.export']}]
  });
  const [match] = report.capabilities[0].calls;
  assert.deepEqual(match.possibleIndexedCallers.map(call => call.caller), ['route']);
  assert.deepEqual(match.possibleIndexedUpstreamCallers.map(call => call.caller), ['shortcut']);
  assert.equal(report.indexExcludedCalls, 1);
  assert.equal(match.status, 'review-required');
});
