import test from 'node:test';
import assert from 'node:assert/strict';
import {analyseProject} from '../src/project-analysis.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const inventory = () => ({sourceFingerprint:'abc',scope:{skipped:[]},files:[{path:'App.swift',hash:'hash'}]});
const syntax = async () => ({status:'available',files:['App.swift'],items:[{kind:'call.expression',name:'refresh',file:'App.swift',line:2}],warnings:[]});

test('combines syntax and index evidence without treating calls as runtime traces', async () => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'project-analysis-test-'));
  try {
    const result=await analyseProject(root,{indexStore:'/index',module:'App'},{analyse:async()=>inventory(),syntax,index:async()=>[
      {file:'App.swift',line:2,caller:'start',callee:'refresh'},
      {file:'Excluded.swift',line:1,caller:'test',callee:'refresh'}]});
    assert.equal(result.syntax.coverage,'matching');
    assert.equal(result.compilerIndex.status,'available');
    assert.equal(result.compilerIndex.indexFreshness,'unverified');
    assert.equal(result.compilerIndex.calls.length,1);
    assert.equal(result.compilerIndex.excludedCalls,1);
    assert.equal(result.callCandidates[0].written,'refresh');
    assert.equal(result.callCandidates[0].possibleIndexMatches[0].callee,'refresh');
    assert.match(result.limitations.join(' '),/Same-line index matches are candidates/);
    assert.match(result.limitations.join(' '),/not proof of runtime/);
  } finally { await fs.rm(root,{recursive:true,force:true}); }
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
