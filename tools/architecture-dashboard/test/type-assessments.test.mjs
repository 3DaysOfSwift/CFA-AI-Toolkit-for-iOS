import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {analyse} from '../src/analyse.mjs';
import {importReview} from '../src/review-import.mjs';
import {typeAssessments} from '../src/type-assessments.mjs';
import {operationAssessments} from '../src/operation-assessments.mjs';

test('every scanned file and detected type starts unassessed; accepted issues stay visible',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'type-review-'));
 try {
  await fs.writeFile(path.join(root,'Feature.swift'),'@MainActor final class FeedFeature {}\n');
  await fs.writeFile(path.join(root,'Helpers.swift'),'func helper() {}\n');
  const report=await analyse(root);
  const first=typeAssessments(report.files);
  assert.equal(first.counts.unassessed,1);
  assert.match(first.html,/Helpers\.swift/);
  assert.doesNotMatch(first.html,/✅ No problems found/);
  const evidence=[{file:'Feature.swift',line:1,endLine:1}];
  const input={schemaVersion:1,sourceFingerprint:report.sourceFingerprint,scope:'Fixture',author:'Reviewer',typeReviews:[{file:'Feature.swift',line:1,kind:'class',name:'FeedFeature',status:'problem',reason:'Missing cancellation',verification:'Source review',evidence,issues:[{title:'Cancellation',detail:'The operation continues.',evidence},{title:'Ordering',detail:'An older result may overwrite a newer one.',evidence}],acceptance:{by:'Developer',reason:'Scheduled for later'}}],fileReviews:[{file:'Feature.swift',status:'problem',reason:'Missing cancellation',verification:'Source review',evidence}]};
  const imported=await importReview(report,input,root);
  const output=typeAssessments(report.files,imported.typeReviews,imported.fileReviews);
  assert.equal(output.counts.problem,1);
  assert.match(output.html,/Accepted by developer/);
  assert.match(output.html,/Missing cancellation/);
  assert.match(output.html,/❌ Cancellation/);
  assert.match(output.html,/❌ Ordering/);
  assert.match(output.html,/Helpers\.swift/);
  const invalid=structuredClone(input); invalid.typeReviews[0].issues=[]; invalid.typeReviews[0].status='sound';
  await assert.rejects(importReview(report,invalid,root),/acceptance requires a problem/);
  invalid.typeReviews[0].status='problem'; invalid.typeReviews[0].line=2;
  await assert.rejects(importReview(report,invalid,root),/scanned declaration/);
  await fs.writeFile(path.join(root,'Feature.swift'),'final class Changed {}\n');
  await assert.rejects(importReview(report,input,root),/hash mismatch/);
 } finally {await fs.rm(root,{recursive:true,force:true});}
});

test('reviewed event tree requires source evidence and earlier parents',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tree-review-'));
 try {
  await fs.writeFile(path.join(root,'App.swift'),'func launch() {}\nTask { await load() }\n');
  const report=await analyse(root);
  const e=[{file:'App.swift',line:1,endLine:2}];
  const op={id:'launch',title:'Launch',trigger:'Launch callback',triggerSource:{file:'App.swift',line:1},path:'Launch → load',stateOwner:'Feature',taskOwner:'Feature',isolation:'Unresolved',reason:'Trace reviewed',verification:'Source',correctness:'investigate',clarity:'investigate',unknowns:['Isolation unresolved'],evidence:e,steps:[{id:'event',title:'Launch callback',relation:'event',detail:'The app starts',evidence:e},{id:'load',parentId:'event',title:'Load',relation:'unstructured-task',detail:'A separate task starts',evidence:e}]};
  const input={schemaVersion:1,sourceFingerprint:report.sourceFingerprint,scope:'Fixture',author:'Reviewer',operationInventory:{scope:'Fixture',method:'Inspection',coverage:'partial'},operations:[op]};
  const review=await importReview(report,input,root);
  assert.match(operationAssessments(review).html,/Unstructured task · Load/);
  const bad=structuredClone(input);bad.operations[0].steps[1].parentId='missing';
  await assert.rejects(importReview(report,bad,root),/earlier parent/);
 } finally {await fs.rm(root,{recursive:true,force:true});}
});
