import test from 'node:test';
import assert from 'node:assert/strict';
import {coverageGaps, inventoryCandidates} from '../src/whole-app-health.mjs';
import {renderHealthReport} from '../src/health-report.mjs';
import {prepare, finish} from '../src/whole-app-health.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const report = {scope:{skipped:[]}, files:[{path:'App.swift',declarations:[{type:'struct',name:'App',line:1}],sites:[{id:'entry',kind:'launch-callback',file:'App.swift',line:2}]}]};
const complete = () => ({productionTargets:['App'],targetInventoryVerified:true, fileReviews:[{file:'App.swift',status:'sound'}],typeReviews:[{file:'App.swift',line:1,kind:'struct',name:'App',status:'sound'}],operationInventory:{coverage:'complete'},operations:[{id:'launch',checks:[{status:'pass'}],unknowns:[],evidence:[{file:'App.swift',line:2,endLine:2}]}],entryPoints:[{siteId:'entry',operationId:'launch'}]});

test('coverage requires every file, type and detected entry point', () => {
  assert.equal(inventoryCandidates(report).length,1);
  assert.deepEqual(coverageGaps(report,complete()),[]);
  const review=complete(); review.fileReviews=[]; review.typeReviews=[]; review.entryPoints=[];
  const gaps=coverageGaps(report,review).join(' ');
  assert.match(gaps,/Swift files/); assert.match(gaps,/types/); assert.match(gaps,/entry points/);
});

test('refuses stale entry IDs and unsupported caller links', () => {
  const stale=complete(); stale.entryPoints[0].siteId='old';
  assert.throws(()=>coverageGaps(report,stale),/current inventory/);
  const wrong=complete(); wrong.operations[0].evidence[0].line=3;
  assert.throws(()=>coverageGaps(report,wrong),/evidence/);
});

test('unknown operations and target membership cannot yield a pass score', () => {
  const review=complete(); review.targetInventoryVerified=false; review.operations[0].unknowns=['Unresolved callback'];
  assert.equal(coverageGaps(report,review).length,2);
  const html=renderHealthReport({app:'App',summary:'Summary',scope:'Scope',conclusion:'Conclusion',scoreAvailable:false,criteria:[{title:'Open question',detail:'Investigate',status:'concern'}]});
  assert.match(html,/Score unavailable/); assert.match(html,/Needs investigation/); assert.doesNotMatch(html,/Good foundation/);
});

test('report rescans source, surfaces coverage gaps and rejects stale review', async () => {
  const base=await fs.mkdtemp(path.join(os.tmpdir(),'whole-health-test-'));
  try {
    const project=path.join(base,'app'); await fs.mkdir(project);
    await fs.writeFile(path.join(project,'App.swift'),'struct App {}\n');
    const inventory=await prepare(project,path.join(base,'inventory'));
    const review={schemaVersion:1,sourceFingerprint:inventory.sourceFingerprint,author:'Reviewer',scope:'App target',presentation:{app:'App',summary:'Summary',conclusion:'Conclusion',criteria:[{title:'A',detail:'Checked',status:'pass'}]}};
    const reviewPath=path.join(base,'review.json'); await fs.writeFile(reviewPath,JSON.stringify(review));
    const output=path.join(base,'report.html'); const result=await finish(project,reviewPath,output);
    assert.ok(result.gaps.length > 0);
    assert.match(await fs.readFile(output,'utf8'),/Score unavailable/);
    await fs.writeFile(path.join(project,'App.swift'),'struct Changed {}\n');
    await assert.rejects(finish(project,reviewPath,path.join(base,'stale.html')),/fingerprint mismatch/);
  } finally { await fs.rm(base,{recursive:true,force:true}); }
});
