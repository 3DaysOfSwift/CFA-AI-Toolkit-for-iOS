import test from 'node:test';
import assert from 'node:assert/strict';
import {analyseProject} from '../src/project-analysis.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const inventory = () => ({sourceFingerprint:'abc',scope:{skipped:[]},files:[{path:'App.swift',hash:'hash'}],buildDefinitions:[{path:'App.entitlements',hash:'config-hash'}]});
const syntax = async () => ({status:'available',files:['App.swift'],items:[{kind:'call.expression',name:'refresh',file:'App.swift',line:2}],warnings:[]});

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
