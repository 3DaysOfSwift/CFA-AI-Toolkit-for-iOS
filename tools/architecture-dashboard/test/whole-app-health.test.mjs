import test from 'node:test';
import assert from 'node:assert/strict';
import {coverageGaps, inventoryCandidates, taskCandidates, nextWork} from '../src/whole-app-health.mjs';
import {renderHealthReport} from '../src/health-report.mjs';
import {prepare, finish, progress, next} from '../src/whole-app-health.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const report = {scope:{skipped:[]}, files:[{path:'App.swift',declarations:[{type:'struct',name:'App',line:1}],sites:[{id:'entry',kind:'launch-callback',file:'App.swift',line:2}]}]};
const complete = () => ({productionTargets:['App'],targetInventoryVerified:true, fileReviews:[{file:'App.swift',status:'sound'}],typeReviews:[{file:'App.swift',line:1,kind:'struct',name:'App',status:'sound'}],operationInventory:{coverage:'complete'},operations:[{id:'launch',steps:[{id:'trigger',relation:'event'}],checks:[{status:'pass'}],scenarios:['repeat','leave','late-result','failure'].map(id=>({id,status:'not-applicable'})),unknowns:[],evidence:[{file:'App.swift',line:2,endLine:2}]}],entryPoints:[{siteId:'entry',operationId:'launch'}]});

test('next work resumes from recorded evidence and retains the completion gate', () => {
  const pending=complete(); pending.fileReviews=[]; pending.entryPoints=[];
  const work=nextWork(report,pending);
  assert.deepEqual(work.nextFiles,['App.swift']);
  assert.equal(work.nextEntryPoints[0].id,'entry');
  assert.ok(work.gaps.length);
  assert.deepEqual(nextWork(report,complete()).nextFiles,[]);
  assert.deepEqual(nextWork(report,complete()).gaps,[]);
});

test('coverage requires source files and detected entry points, without individual type verdicts', () => {
  assert.equal(inventoryCandidates(report).length,1);
  assert.deepEqual(coverageGaps(report,complete()),[]);
  const review=complete(); review.fileReviews=[]; review.typeReviews=[]; review.entryPoints=[];
  const gaps=coverageGaps(report,review).join(' ');
  assert.match(gaps,/Swift files/); assert.doesNotMatch(gaps,/types/); assert.match(gaps,/entry points/);
  const batched=complete(); batched.fileReviews=[]; batched.typeReviews=[]; batched.fileBatches=[{files:['App.swift']}];
  assert.deepEqual(coverageGaps(report,batched),[]);
  for (const status of ['unassessed','investigate']) {
    batched.fileReviews=[{file:'App.swift',status}];
    assert.deepEqual(nextWork(report,batched).nextFiles,['App.swift']);
    assert.match(coverageGaps(report,batched).join(' '),/Swift files still need review: App.swift/);
  }
});

test('an explicitly unassessed type keeps the whole-app review open', () => {
  const review = complete();
  review.typeReviews[0].status = 'unassessed';
  review.typeReviews[0].reason = 'Trace the app lifecycle.';
  const pending = nextWork(report, review);
  assert.equal(pending.pendingTypes, 1);
  assert.deepEqual(pending.nextTypes, [{
    name:'App', file:'App.swift', line:1, status:'unassessed', reason:'Trace the app lifecycle.'
  }]);
  assert.match(coverageGaps(report, review).join(' '), /Recorded types still need review: App \(App.swift:1\)/);
});

test('whole-app reviews require timing outcomes even if an old input disables the flag', () => {
  const review=complete(); review.behaviourScenariosRequired=false; review.operations[0].scenarios=[];
  assert.match(coverageGaps(report,review).join(' '),/timing-scenario/);
  review.operations[0].scenarios=['repeat','leave','late-result','failure'].map(id=>({id,status:'not-applicable'}));
  assert.deepEqual(coverageGaps(report,review),[]);
  review.operations[0].scenarios[1].status='unresolved';
  assert.equal(nextWork(report,review).pendingOperations,1);
  assert.deepEqual(nextWork(report,review).nextOperations[0].missingTimingScenarios,['leave']);
  assert.match(coverageGaps(report,review).join(' '),/timing-scenario/);
});

test('refuses stale entry IDs and unsupported caller links', () => {
  const stale=complete(); stale.entryPoints[0].siteId='old';
  assert.throws(()=>coverageGaps(report,stale),/current inventory/);
  const wrong=complete(); wrong.operations[0].evidence[0].line=3;
  assert.throws(()=>coverageGaps(report,wrong),/evidence/);
});

test('reconciled task sites must be cited in a workflow step', () => {
  const inventory = structuredClone(report);
  inventory.syntax = {status:'available',files:['App.swift'],warnings:[],items:[
    {kind:'concurrency.task',file:'App.swift',line:3,column:5}
  ]};
  const review = complete();
  const [site] = taskCandidates(inventory);
  review.taskSites = [{siteId:site.id,operationId:'launch'}];
  const evidence = [{file:'App.swift',line:3,endLine:3}];
  review.operations[0].evidence.push(...evidence);
  assert.match(coverageGaps(inventory,review).join(' '), /need workflow steps: App.swift:3:5/);
  assert.deepEqual(nextWork(inventory, review).nextTaskSites, [site]);
  review.operations[0].steps[0].evidence = evidence;
  assert.match(coverageGaps(inventory,review).join(' '), /need workflow steps: App.swift:3:5/);
  review.operations[0].steps.push({id:'load',parentId:'trigger',relation:'unstructured-task',evidence});
  assert.deepEqual(coverageGaps(inventory,review), []);
  assert.deepEqual(nextWork(inventory, review).nextTaskSites, []);
});

test('unknown operations and target membership cannot yield a pass score', () => {
  const review=complete(); review.targetInventoryVerified=false; review.operations[0].unknowns=['Unresolved callback'];
  assert.equal(coverageGaps(report,review).length,2);
  const html=renderHealthReport({app:'App',summary:'Summary',verdict:'Clear ownership',scope:'Scope',conclusion:'Conclusion',scoreAvailable:false,criteria:[{title:'Open question',detail:'Investigate',status:'concern'}]});
  assert.match(html,/50%/); assert.match(html,/Needs attention/);
});

test('a whole-app operation needs a workflow trace', () => {
  const review = complete();
  delete review.operations[0].steps;
  const work = nextWork(report, review);
  assert.equal(work.nextOperations[0].missingTrace, true);
  assert.match(work.gaps.join(' '), /need a workflow trace/);
});

test('a CFA-only deviation leaves the operation concurrency result stable', () => {
  const html = renderHealthReport({
    app:'App',summary:'Summary',verdict:'Clear ownership',scope:'Scope',conclusion:'Conclusion',
    criteria:[{title:'Clear ownership',detail:'Reviewed',status:'pass'}],
    operations:[{title:'Save',steps:complete().operations[0].steps,
      scenarios:complete().operations[0].scenarios,checks:[
      {dimension:'correctness',status:'pass',title:'Save owns its work'},
      {dimension:'cfa',status:'fail',title:'Naming differs from CFA'}
    ]}]
  });
  assert.match(html, /aria-label="Stable">✓<\/span>Save/);
  assert.match(html, /CFA alignment.*× Naming differs from CFA/s);
});

test('an unresolved task relationship keeps an operation pending', () => {
  const review = complete();
  review.operations[0].steps = [
    { id: 'trigger', relation: 'event' },
    { id: 'work', title: 'Load schedule', detail: 'Caller ownership is unclear.', parentId: 'trigger', relation: 'unknown' }
  ];
  const work = nextWork(report, review);
  assert.match(work.gaps.join(' '), /1 operations have unresolved checks or boundaries/);
  assert.equal(work.nextOperations[0].id, 'launch');
  assert.deepEqual(work.nextOperations[0].unresolvedSteps, [
    { id: 'work', title: 'Load schedule', detail: 'Caller ownership is unclear.' }
  ]);
  review.operations[0].steps[1].relation = 'same-task';
  assert.deepEqual(nextWork(report, review).gaps, []);
});

test('syntax entry points join the inventory without duplicating lexical findings', () => {
  const combined=structuredClone(report);
  combined.syntax={status:'available',files:['App.swift'],warnings:[],items:[
    {kind:'entry.launchCallback',file:'App.swift',line:2,column:1},
    {kind:'entry.main',file:'App.swift',line:1,column:1},
    {kind:'entry.backgroundHandler',file:'App.swift',line:3,column:1},
    {kind:'entry.incomingLink',file:'App.swift',line:3,column:2},
    {kind:'entry.notificationResponse',file:'App.swift',line:3,column:3},
    {kind:'concurrency.task',file:'App.swift',line:3,column:1},
    {kind:'concurrency.asyncLet',file:'App.swift',line:3,column:4}
  ]};
  const candidates=inventoryCandidates(combined);
  assert.equal(candidates.length,5);
  assert.equal(candidates.filter(c=>c.kind==='launch-callback').length,1);
  assert.equal(candidates.filter(c=>c.kind==='main').length,1);
  const background = candidates.find(c=>c.kind==='background-handler');
  assert.ok(background);
  const review = complete();
  review.operations[0].evidence[0].line = 1;
  review.entryPoints.push({siteId:candidates.find(c=>c.kind==='main').id, operationId:'launch'});
  const openingSites = candidates.filter(c=>['incoming-link','notification-response'].includes(c.kind));
  assert.equal(openingSites.length,2);
  assert.deepEqual(nextWork(combined,review).nextEntryPoints,[background,...openingSites]);
  review.entryPoints.push({siteId:background.id, excludedReason:'Registration belongs to a test-only target.'});
  for (const site of openingSites) review.entryPoints.push({siteId:site.id, operationId:'launch'});
  assert.throws(()=>coverageGaps(combined,review),/evidence must include its reconciled entry point/);
  review.operations[0].evidence[0].endLine = 3;
  assert.deepEqual(nextWork(combined,review).nextEntryPoints,[]);
  assert.match(coverageGaps(combined,complete()).join(' '),/entry points/);
  assert.equal(taskCandidates(combined).length,2);
  assert.ok(nextWork(combined,review).nextTaskSites.some(site => site.kind === 'concurrency.asyncLet'));
  assert.match(coverageGaps(combined,complete()).join(' '),/task sites/);
});

test('unavailable or inconsistent parser evidence does not become a pass', () => {
  const missing=structuredClone(report); missing.syntax={status:'unavailable',reason:'Xcode unavailable'};
  assert.match(coverageGaps(missing,complete()).join(' '),/Xcode unavailable/);
  const mismatch=structuredClone(report); mismatch.syntax={status:'available',files:[],items:[],warnings:[]};
  assert.match(coverageGaps(mismatch,complete()).join(' '),/different files/);
});

test('report rescans source, surfaces coverage gaps and rejects stale review', async () => {
  const base=await fs.mkdtemp(path.join(os.tmpdir(),'whole-health-test-'));
  try {
    const project=path.join(base,'app'); await fs.mkdir(project);
    await fs.writeFile(path.join(project,'App.swift'),'struct App {\r\n}\r\n');
    await fs.writeFile(path.join(project,'Value.swift'),'struct Value {}\n');
    const syntax=async()=>({status:'available',files:['App.swift','Value.swift'],items:[],warnings:[]});
    const inventory=await prepare(project,path.join(base,'inventory'),syntax);
    assert.match(await fs.readFile(path.join(base,'inventory','task-map.html'),'utf8'),/Task sites/);
    const draftPath=path.join(base,'inventory','review-draft.json');
    const pending=await progress(project,draftPath,syntax);
    assert.ok(pending.gaps.some(gap=>gap.includes('Swift files')));
    const review={schemaVersion:1,sourceFingerprint:inventory.sourceFingerprint,author:'Reviewer',scope:'App target',presentation:{app:'App',summary:'Summary',verdict:'Clear ownership',conclusion:'Conclusion',criteria:[{title:'A',detail:'Checked',status:'pass'}]}};
    const reviewPath=path.join(base,'review.json'); await fs.writeFile(reviewPath,JSON.stringify(review));
    const checklist=JSON.parse(await fs.readFile(path.join(base,'inventory','checklist.json'),'utf8'));
    assert.equal(checklist.files[0].status,'pending');
    assert.equal(checklist.files.length,2);
    const output=path.join(base,'report.html');
    await assert.rejects(finish(project,reviewPath,output,undefined,syntax),/no report was generated/);
    await assert.rejects(fs.access(output));
    const evidence=[{file:'App.swift',line:1,endLine:1},{file:'Value.swift',line:1,endLine:1}];
    const checks=['state-ownership','actor-isolation','task-lifetime','repeated-requests','cancellation','errors','architectural-clarity'].map(id=>({id,title:id,dimension:id==='architectural-clarity'?'clarity':'correctness',status:'pass',reason:'Reviewed',verification:'Source inspection',evidence}));
    const scenarios=['repeat','leave','late-result','failure'].map(id=>({id,title:id,status:'pass',outcome:'The owner handles this case',verification:'Source inspection',evidence}));
    Object.assign(review,{productionTargets:['App'],targetInventoryVerified:true,
      behaviourScenariosRequired:true,
      fileBatches:[{title:'Application entry',files:['App.swift','Value.swift'],reason:'Reviewed entry and ownership',verification:'Source inspection',evidence}],
      operationInventory:{scope:'App',method:'Source review',coverage:'complete'},
      operations:[{id:'launch',title:'Start',trigger:'Launch',path:'App',stateOwner:'App',taskOwner:'App',isolation:'Main actor',reason:'Reviewed',verification:'Source inspection',correctness:'sound',clarity:'sound',unknowns:[],triggerSource:{file:'App.swift',line:1},steps:[{id:'trigger',title:'Start',relation:'event',detail:'The app starts here.',evidence}],checks,scenarios,evidence}]});
    await fs.writeFile(reviewPath,JSON.stringify(review));
    assert.deepEqual((await progress(project,reviewPath,syntax)).gaps,[]);
    const badBatch=structuredClone(review); badBatch.fileBatches[0].evidence=[{file:'App.swift',line:1,endLine:1}];
    await fs.writeFile(reviewPath,JSON.stringify(badBatch));
    await assert.rejects(progress(project,reviewPath,syntax),/batch evidence must include each source file/);
    const missingEvidence=structuredClone(review); missingEvidence.operations[0].scenarios[0].evidence=[];
    await fs.writeFile(reviewPath,JSON.stringify(missingEvidence));
    await assert.rejects(progress(project,reviewPath,syntax),/source evidence required/);
    const unsupportedProblem=structuredClone(review); unsupportedProblem.operations[0].scenarios[0].status='problem';
    await fs.writeFile(reviewPath,JSON.stringify(unsupportedProblem));
    await assert.rejects(progress(project,reviewPath,syntax),/scenario problem needs a consequence/);
    await fs.writeFile(reviewPath,JSON.stringify(review));
    await assert.rejects(finish(project,reviewPath,output,undefined,syntax),/criterion needs source evidence/);
    await assert.rejects(fs.access(output));
    review.presentation.criteria[0].evidence = 'App.swift:1 (source inspected)';
    await fs.writeFile(reviewPath,JSON.stringify(review));
    await assert.rejects(finish(project,reviewPath,output,undefined,syntax),/criterion needs source evidence as file and line references/);
    await assert.rejects(fs.access(output));
    review.presentation.criteria[0].evidence = [null];
    await fs.writeFile(reviewPath,JSON.stringify(review));
    await assert.rejects(finish(project,reviewPath,output,undefined,syntax),/evidence must name a repository-relative file/);
    review.presentation.criteria[0].evidence = [{file:'Missing.swift',line:1,endLine:1}];
    await fs.writeFile(reviewPath,JSON.stringify(review));
    await assert.rejects(finish(project,reviewPath,output,undefined,syntax),/evidence file not found: Missing.swift/);
    review.presentation.criteria[0].evidence = [{file:'App.swift',line:3,endLine:3}];
    await fs.writeFile(reviewPath,JSON.stringify(review));
    await assert.rejects(finish(project,reviewPath,output,undefined,syntax),/invalid evidence lines: App.swift:3–3/);
    review.presentation.criteria[0].evidence = [{file:'App.swift',line:1,endLine:2}];
    await fs.writeFile(reviewPath,JSON.stringify(review));
    const missingClarity = structuredClone(review);
    missingClarity.operations[0].checks.find(check => check.id === 'architectural-clarity').status = 'not-applicable';
    await fs.writeFile(reviewPath,JSON.stringify(missingClarity));
    const pendingClarity = await next(project,reviewPath,syntax);
    assert.deepEqual(pendingClarity.nextOperations[0].pendingDimensions,['clarity']);
    await assert.rejects(finish(project,reviewPath,output,undefined,syntax),/operations have unresolved checks or boundaries/);
    await assert.rejects(fs.access(output));
    const sourceProblem = structuredClone(review);
    sourceProblem.fileReviews = [{
      file:'Value.swift',status:'problem',reason:'Confirmed issue',verification:'Source inspection',
      evidence:[{file:'Value.swift',line:1,endLine:1}]
    }];
    await fs.writeFile(reviewPath,JSON.stringify(sourceProblem));
    await assert.rejects(finish(project,reviewPath,output,undefined,syntax),/Include confirmed source problems/);
    await assert.rejects(fs.access(output));
    await fs.writeFile(reviewPath,JSON.stringify(review));
    const generalProblem = structuredClone(review);
    generalProblem.findings = [{
      title:'Confirmed issue',status:'problem',description:'A late result can replace current state.',
      check:'Repeat the action with reversed completion order.',evidence:[{file:'Value.swift',line:1,endLine:1}]
    }];
    await fs.writeFile(reviewPath,JSON.stringify(generalProblem));
    await assert.rejects(finish(project,reviewPath,output,undefined,syntax),/Include confirmed source problems/);
    await assert.rejects(fs.access(output));
    generalProblem.presentation.criteria.push({
      title:'Different problem',detail:'Different source.',status:'problem',
      evidence:[{file:'App.swift',line:1,endLine:1}]
    });
    await fs.writeFile(reviewPath,JSON.stringify(generalProblem));
    await assert.rejects(finish(project,reviewPath,output,undefined,syntax),/Include confirmed source problems.*Confirmed issue/);
    const omittedConcern = structuredClone(generalProblem);
    omittedConcern.findings[0].status = 'concern';
    await fs.writeFile(reviewPath,JSON.stringify(omittedConcern));
    await assert.rejects(finish(project,reviewPath,output,undefined,syntax),/Include source concerns.*Confirmed issue/);
    await assert.rejects(fs.access(output));
    const invalidStatus = structuredClone(generalProblem);
    invalidStatus.findings[0].status = 'Problem';
    await fs.writeFile(reviewPath,JSON.stringify(invalidStatus));
    await assert.rejects(finish(project,reviewPath,output,undefined,syntax),/Whole-app finding status must be pass, concern or problem.*Confirmed issue/);
    await assert.rejects(fs.access(output));
    generalProblem.presentation.criteria.push({
      title:'Confirmed issue',detail:'A late result can replace current state.',status:'problem',
      evidence:[{file:'Value.swift',line:1,endLine:1}]
    });
    await fs.writeFile(reviewPath,JSON.stringify(generalProblem));
    const timingProblem = structuredClone(generalProblem);
    timingProblem.operations[0].scenarios[0] = {
      ...timingProblem.operations[0].scenarios[0], status:'problem',
      consequence:'Repeating the action starts duplicate work.',
      evidence:[{file:'App.swift',line:2,endLine:2}]
    };
    await fs.writeFile(reviewPath,JSON.stringify(timingProblem));
    await assert.rejects(finish(project,reviewPath,output,undefined,syntax),/Include confirmed source problems.*repeat/);
    await assert.rejects(fs.access(output));
    const checkProblem = structuredClone(generalProblem);
    checkProblem.operations[0].checks[0] = {
      ...checkProblem.operations[0].checks[0], status:'fail', problemKind:'local-defect',
      consequence:'Two callers can overwrite the same result.',
      evidence:[{file:'App.swift',line:2,endLine:2}]
    };
    await fs.writeFile(reviewPath,JSON.stringify(checkProblem));
    await assert.rejects(finish(project,reviewPath,output,undefined,syntax),/Include confirmed source problems.*state-ownership/);
    timingProblem.presentation.criteria.push({
      title:'Duplicate work on repeated action',detail:'Repeated actions start competing work.',status:'problem',
      evidence:[{file:'App.swift',line:2,endLine:2}]
    });
    await fs.writeFile(reviewPath,JSON.stringify(timingProblem));
    const problemsOutput = path.join(base,'problems.html');
    await finish(project,reviewPath,problemsOutput,undefined,syntax);
    const problemHtml = await fs.readFile(problemsOutput,'utf8');
    assert.match(problemHtml,/Problems to address.*Confirmed issue.*Duplicate work on repeated action/s);
    assert.match(problemHtml,/Frankenstein architecture detected.*No architectural conflicts/);
    checkProblem.presentation.criteria = timingProblem.presentation.criteria;
    checkProblem.operations[0].checks[0].problemKind = 'architectural-conflict';
    await fs.writeFile(reviewPath,JSON.stringify(checkProblem));
    const conflictOutput = path.join(base,'conflict.html');
    await finish(project,reviewPath,conflictOutput,undefined,syntax);
    assert.match(await fs.readFile(conflictOutput,'utf8'),/Frankenstein architecture detected.*Yes. Architectural conflicts/);
    assert.match(problemHtml,/<summary><span class="indicator problem" aria-label="Problem">×<\/span>Start/);
    await fs.writeFile(reviewPath,JSON.stringify(review));
    const result=await finish(project,reviewPath,output,undefined,syntax);
    assert.deepEqual(result.gaps,[]);
    const html=await fs.readFile(output,'utf8');
    assert.match(html,/100%/);
    assert.match(html,/<summary><span class="indicator pass" aria-label="Stable">✓<\/span>Start/);
    assert.match(html,/When timing changes/);
    assert.match(html,/The owner handles this case/);
    assert.match(html,/App\.swift:1–2/);
    assert.doesNotMatch(html,/What still needs checking/);
    await fs.writeFile(path.join(project,'App.swift'),'struct Changed {}\n');
    await assert.rejects(finish(project,reviewPath,path.join(base,'stale.html'),undefined,syntax),/fingerprint mismatch/);
  } finally { await fs.rm(base,{recursive:true,force:true}); }
});
