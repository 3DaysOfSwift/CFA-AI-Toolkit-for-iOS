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
  const partial=await importReview(report,{...input,operations:[{...op,correctness:'investigate',unknowns:['Does cancellation stop the external request?']}]},root);
  assert.equal(partial.operations[0].clarity,'sound');
  assert.equal(partial.operations[0].correctness,'investigate');
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
 assert.ok(result.html.indexOf('❌ Problem ·')<result.html.indexOf('✅ Stable ·'));
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

test('individual checks preserve verified strengths and separate CFA deviations',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'check-verdicts-'));
 try {
  await fs.writeFile(path.join(root,'Selection.swift'),'@MainActor func select() {}\n');
  const report=await analyse(root);
  const checks=['state-ownership','actor-isolation','task-lifetime','repeated-requests','cancellation','errors','architectural-clarity'].map(id=>({id,title:id,dimension:id==='architectural-clarity'?'clarity':'correctness',status:'pass',reason:'Verified scoped property',verification:'Source inspection',evidence:op.evidence}));
  checks.find(c=>c.id==='cancellation').status='unresolved';
  Object.assign(checks.find(c=>c.id==='cancellation'),{question:'Does the API observe cancellation?',resolveBy:'Inspect the API implementation'});
  checks.push({id:'naming',title:'Feature naming',dimension:'cfa',status:'fail',reason:'Uses Manager suffix',consequence:'Does not follow CFA naming',problemKind:'cfa-deviation',verification:'Source',evidence:op.evidence});
  const input={schemaVersion:1,sourceFingerprint:report.sourceFingerprint,scope:'Fixture',author:'Reviewer',operationInventory:{scope:'Fixture',method:'Inspection',coverage:'complete'},operations:[{...op,checks,unknowns:['API cancellation unresolved']}]};
  const imported=await importReview(report,input,root);
  assert.equal(imported.operations[0].correctness,'investigate');
  assert.equal(imported.operations[0].clarity,'sound');
  const html=operationAssessments(imported).html;
  assert.match(html,/6 ✅ Pass/);
  const collapsedRow=html.slice(html.indexOf('<details class="review">'),html.indexOf('</summary>',html.indexOf('<details class="review">')));
  assert.match(collapsedRow,/Does the API observe cancellation\?/);
  assert.doesNotMatch(collapsedRow,/Does not follow CFA naming/);
  assert.match(html,/How to resolve/);
  assert.match(operationAssessments(imported).verdict,/Inconclusive/);
  const resolved=structuredClone(input);
  resolved.operations[0].checks.find(c=>c.id==='cancellation').status='pass';
  resolved.operations[0].unknowns=[];
  const good=await importReview(report,resolved,root);
  assert.equal(good.operations[0].correctness,'sound');
  assert.match(operationAssessments(good).verdict,/No architectural conflicts/);
  for(const mutate of [c=>delete c.question,c=>delete c.resolveBy]) {
   const invalid=structuredClone(input);mutate(invalid.operations[0].checks.find(c=>c.id==='cancellation'));
   await assert.rejects(importReview(report,invalid,root),/requires question/);
  }
  const missing=structuredClone(input);missing.operations[0].checks.shift();
  await assert.rejects(importReview(report,missing,root),/missing operation check/);
 } finally {await fs.rm(root,{recursive:true,force:true});}
});

 test('a local defect fails correctness even without conflicting architectures',()=>{
  const result=operationAssessments({operationInventory:{coverage:'complete'},operations:[{...op,correctness:'problem',problemKind:'local-defect'}]});
  assert.match(result.html,/❌ 1 operation has a confirmed correctness problem/);
  assert.match(result.verdict,/No architectural conflicts/);
  assert.ok(result.html.indexOf('Does the reviewed code work correctly?')<result.html.indexOf('Is this a Frankenstein architecture?'));
 });
 test('verified scoped correctness is distinct from inventory completeness',()=>{
  const result=operationAssessments({operationInventory:{coverage:'partial'},operations:[op]});
  assert.match(result.html,/Correctness checks passed for all 1 assessed operations/);
  assert.match(result.html,/not a whole-app pass/);
  const mixed=operationAssessments({operations:[{...op,clarity:'investigate',unknowns:['Where is the lifetime policy documented?']}]});
  assert.match(mixed.html,/Concurrency correctness: ✅ Stable · Architectural clarity: ⚠️ Needs investigation/);
 });
