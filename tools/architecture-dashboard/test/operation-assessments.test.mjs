import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {analyse} from '../src/analyse.mjs';
import {importReview} from '../src/review-import.mjs';
import {operationAssessments} from '../src/operation-assessments.mjs';
import {render} from '../src/render.mjs';
const op={id:'select',title:'Select item',trigger:'Button tap',triggerSource:{file:'Selection.swift',line:1},path:'Button → select()',stateOwner:'Selection',taskOwner:'No new Task; synchronous action',isolation:'MainActor',reason:'Selection has one owner',verification:'Source inspection',correctness:'sound',clarity:'sound',unknowns:[],evidence:[{file:'Selection.swift',line:1,endLine:1}]};
test('synchronous operations import with source evidence; stale and unsupported judgments fail',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'operations-'));
 try {
  await fs.writeFile(path.join(root,'Selection.swift'),'@MainActor func select() {}\n');
  const report=await analyse(root);
  const input={schemaVersion:1,sourceFingerprint:report.sourceFingerprint,scope:'Selection',author:'Reviewer',operationInventory:{scope:'Selection button',method:'Inspected button handlers',coverage:'complete'},operations:[op]};
  const review=await importReview(report,input,root);
  assert.match(review.operations[0].evidence[0].excerpt,/func select/);
  assert.match(operationAssessments(review).verdict,/No architectural conflicts/);
  for(const change of [{correctness:'safe'},{unknowns:['Unknown dispatch target']},{triggerSource:{file:'Other.swift',line:1}},{correctness:'problem'},{id:''}]) await assert.rejects(importReview(report,{...input,operations:[{...op,...change}]},root));
  await assert.rejects(importReview(report,{...input,operations:[op,op]},root),/duplicate/);
  await fs.writeFile(path.join(root,'Selection.swift'),'func changed() {}\n');
  await assert.rejects(importReview(report,input,root),/hash mismatch/);
 } finally {await fs.rm(root,{recursive:true,force:true});}
});
test('partial inventories and unknowns never receive a clean verdict; problems appear first',()=>{
 const data={operationInventory:{scope:'Example',method:'Inspection',coverage:'partial'},operations:[op]};
 assert.match(operationAssessments(data).verdict,/Inconclusive/);
 const bad={...op,id:'bad',title:'<script>alert(1)</script>',correctness:'problem',problemKind:'architectural-conflict',recommendation:'Move ownership later'};
 const result=operationAssessments({...data,operations:[op,bad]});
 assert.match(result.verdict,/Yes/);
 assert.ok(result.html.indexOf('❌ Problem ·')<result.html.indexOf('✅ Sound ·'));
 assert.ok(!result.html.includes('<script>'));
 assert.match(result.html,/Suggested change/);
 assert.match(operationAssessments().verdict,/Inconclusive/);
});
test('assessment is the initial panel and inventory is not labelled as app entry points',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'operations-render-'));
 try {
  await fs.writeFile(path.join(root,'App.swift'),'@MainActor func run() async {}\n');
  const html=render(await analyse(root));
  assert.match(html,/aria-controls="operations" aria-selected="true"/);
  assert.match(html,/aria-labelledby="tab-dashboard" hidden/);
  assert.doesNotMatch(html,/Modern Concurrent architecture|All entry points/);
 } finally {await fs.rm(root,{recursive:true,force:true});}
});
