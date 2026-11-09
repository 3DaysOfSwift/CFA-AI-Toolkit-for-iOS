import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {install} from '../../../scripts/install.mjs';
import {stageSkillsPackage} from '../../../test/fixtures/skills-package.mjs';
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

test('shows target-membership evidence to reconcile when resuming a review', () => {
  const inventory = structuredClone(report);
  Object.assign(inventory.scope, {
    buildDefinitionPaths: ['App.xcodeproj/project.pbxproj'],
    excludedTestDirectories: ['AppTests'],
    symbolicLinkPaths: ['SharedSource']
  });
  const pending = {...complete(), targetInventoryVerified: false};
  assert.deepEqual(nextWork(inventory, pending).targetReview, {
    buildDefinitionPaths: ['App.xcodeproj/project.pbxproj'],
    excludedTestDirectories: ['AppTests'],
    symbolicLinkPaths: ['SharedSource']
  });
  for (const productionTargets of [[], [' '], 'App']) {
    const incomplete = {...complete(), productionTargets};
    const work = nextWork(inventory, incomplete);
    assert.deepEqual(work.targetReview, nextWork(inventory, pending).targetReview);
    assert.match(work.gaps.join(' '), /Production targets and local packages/);
  }
  assert.equal(nextWork(inventory, complete()).targetReview, undefined);
});

test('identifies skipped files and reasons in the next review checkpoint', () => {
  const inventory = structuredClone(report);
  inventory.scope.skipped.push({file:'Generated/Large.swift', reason:'Over 2 MB source limit'});
  assert.deepEqual(nextWork(inventory,complete()).gaps,[
    'Source file could not be scanned: Generated/Large.swift (Over 2 MB source limit).'
  ]);
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
  Object.assign(review.operations[0].scenarios[1], {
    status:'unresolved', title:'Leave the screen',
    outcome:'The refresh owner is unclear.', verification:'Trace the cancellation handler.'
  });
  const work = nextWork(report, review);
  assert.equal(work.pendingOperations, 1);
  assert.deepEqual(work.nextOperations[0].missingTimingScenarios, ['leave']);
  assert.deepEqual(work.nextOperations[0].unresolvedTimingScenarios, [{
    id:'leave', title:'Leave the screen', outcome:'The refresh owner is unclear.',
    verification:'Trace the cancellation handler.'
  }]);
  assert.match(coverageGaps(report,review).join(' '),/timing-scenario/);
});

test('refuses stale entry IDs and unsupported caller links', () => {
  const stale=complete(); stale.entryPoints[0].siteId='old';
  assert.throws(()=>coverageGaps(report,stale),/current inventory/);
  const wrong=complete(); wrong.operations[0].evidence[0].line=3;
  assert.throws(()=>nextWork(report,wrong), /reconciled entry point: launch → App\.swift:2/);
});

test('reconciled task sites must be cited in a workflow step', () => {
  const inventory = structuredClone(report);
  inventory.syntax = {status:'available',files:['App.swift'],warnings:[],items:[
    {kind:'concurrency.task',file:'App.swift',line:3,column:5}
  ]};
  const review = complete();
  const [site] = taskCandidates(inventory);
  review.taskSites = [{siteId:site.id,operationId:'launch'}];
  assert.throws(() => nextWork(inventory, review), /reconciled task site: launch → App\.swift:3:5/);
  review.taskSites[0].operationId = 'unknown';
  assert.throws(() => nextWork(inventory, review), /unknown operation: unknown → App\.swift:3:5/);
  review.taskSites[0].operationId = 'launch';
  const evidence = [{file:'App.swift',line:3,endLine:3}];
  review.operations[0].evidence.push(...evidence);
  assert.match(coverageGaps(inventory,review).join(' '), /need workflow steps: App.swift:3:5/);
  assert.deepEqual(nextWork(inventory, review).nextTaskSites, [site]);
  review.operations[0].steps[0].evidence = evidence;
  assert.match(coverageGaps(inventory,review).join(' '), /need workflow steps: App.swift:3:5/);
  const step = {id:'load',parentId:'trigger',relation:'child-task',evidence};
  review.operations[0].steps.push(step);
  assert.deepEqual(nextWork(inventory, review).nextTaskSites, [site]);
  assert.match(coverageGaps(inventory, review).join(' '), /App.swift:3:5 \(launch, expected unstructured-task\)/);
  step.relation = 'unstructured-task';
  assert.deepEqual(coverageGaps(inventory,review), []);
  assert.deepEqual(nextWork(inventory, review).nextTaskSites, []);

  inventory.syntax.items.push({kind:'concurrency.task',file:'App.swift',line:3,column:25});
  const [, second] = taskCandidates(inventory);
  review.taskSites.push({siteId:second.id,operationId:'launch'});
  assert.deepEqual(nextWork(inventory, review).nextTaskSites, [site, second]);
  review.operations[0].steps[1].taskSiteId = site.id;
  assert.deepEqual(nextWork(inventory, review).nextTaskSites, [second]);
  review.operations[0].steps.push({
    id:'second-load',parentId:'trigger',relation:'unstructured-task',taskSiteId:second.id,evidence
  });
  assert.deepEqual(coverageGaps(inventory,review), []);
  review.operations[0].steps.push({
    id:'stale-link',parentId:'trigger',relation:'unstructured-task',taskSiteId:'stale',evidence
  });
  assert.match(coverageGaps(inventory,review).join(' '), /launch\/stale-link must cite its reconciled task site/);
});

test('rejects blank or non-text Health Check headings', () => {
  const report = {app:'App',summary:'Summary',verdict:'Clear ownership',scope:'Scope',
    conclusion:'Conclusion',criteria:[{title:'Ownership',detail:'Checked',status:'pass'}]};
  for (const heading of ['app', 'summary', 'verdict', 'scope']) {
    for (const value of [' ', 1]) {
      assert.throws(() => renderHealthReport({...report, [heading]:value}), /Provide an app name, summary, substantive verdict/);
    }
  }
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
      {dimension:'clarity',status:'pass',title:'Save path is clear'},
      {dimension:'cfa',status:'fail',title:'Naming differs from CFA'}
    ]}]
  });
  assert.match(html, /aria-label="Stable">✓<\/span>Save/);
  assert.match(html, /CFA alignment.*× Naming differs from CFA/s);
});

test('a pending review checkpoint retains the open check and its source locations', () => {
  const review = complete();
  const check = {
    id: 'paid-entry', title: 'Paid entry point', dimension: 'cfa', status: 'unresolved',
    reason: 'A shortcut reaches the operation.', question: 'Does the shortcut check entitlement?',
    resolveBy: 'Trace the shortcut handler.',
    evidence: [{file: 'App.swift', line: 1, endLine: 1, excerpt: 'App'}]
  };
  review.operations[0].checks = [check];
  const work = nextWork(report, review);
  assert.match(work.gaps.join(' '), /operations have unresolved checks/);
  assert.deepEqual(work.nextOperations[0].pendingChecks, [{
    ...check, evidence: [{file: 'App.swift', line: 1, endLine: 1}]
  }]);
  check.status = 'not-checked';
  assert.match(coverageGaps(report, review).join(' '), /operations have unresolved checks/);
  Object.assign(check, {status: 'fail', problemKind: 'cfa-deviation', consequence: 'The shortcut bypasses the paywall.'});
  assert.deepEqual(coverageGaps(report, review), []);
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

test('matches same-line parser entry points to the right lexical column', () => {
  const combined = structuredClone(report);
  combined.files[0].sites = [
    {id:'lexical-second',kind:'button-action',file:'App.swift',line:2,column:40}
  ];
  combined.syntax = {items:[
    {kind:'entry.button',file:'App.swift',line:2,column:10},
    {kind:'entry.button',file:'App.swift',line:2,column:40}
  ]};
  const candidates = inventoryCandidates(combined);
  assert.deepEqual(candidates.map(site => site.column), [40, 10]);
  assert.equal(candidates[0].id, 'lexical-second');
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
  assert.deepEqual(openingSites.map(site => site.column), [2, 3]);
  assert.deepEqual(nextWork(combined,review).nextEntryPoints,[background,...openingSites]);
  review.entryPoints.push({siteId:background.id, excludedReason:'Registration belongs to a test-only target.'});
  for (const site of openingSites) review.entryPoints.push({siteId:site.id, operationId:'launch'});
  assert.throws(()=>coverageGaps(combined,review),/reconciled entry point: launch → App\.swift:3:2 \(incoming-link\)/);
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
  const mismatch = structuredClone(report);
  mismatch.syntax = {status:'available',files:['Other.swift'],items:[],warnings:['Parser reported errors in App.swift']};
  assert.deepEqual(coverageGaps(mismatch,complete()), [
    'SwiftSyntax warning: Parser reported errors in App.swift',
    'The SwiftSyntax and source inventories cover different files.',
    'Missing from SwiftSyntax: App.swift.',
    'Missing from lexical inventory: Other.swift.'
  ]);
  mismatch.syntax = {status:'available',files:['App.swift'],items:[],excludedItems:2};
  assert.deepEqual(coverageGaps(mismatch,complete()), [
    'SwiftSyntax returned 2 findings outside the source inventory. Reconcile the scan scope before generating a report.'
  ]);
});

test('installed Health Check rescans source, surfaces gaps and rejects stale review', async () => {
  const base=await fs.mkdtemp(path.join(os.tmpdir(),'whole-health-test-'));
  try {
    const source = stageSkillsPackage(path.join(base, 'package'));
    const installation = install({source, destination:path.join(base, 'customer'), mode:'skills', installCommand:false});
    const reviewSkill = installation.paths.find(folder => path.basename(folder) === 'cfa-architecture-review');
    const workflow = path.join(reviewSkill, 'scripts/dashboard/src/whole-app-health.mjs');
    const {prepare, finish, progress, next} = await import(pathToFileURL(workflow).href);
    const project=path.join(base,'app'); await fs.mkdir(project);
    await fs.writeFile(path.join(project,'App.swift'),'struct App {\r\n}\r\n');
    await fs.writeFile(path.join(project,'Value.swift'),'struct Value {}\n');
    const buildSettings = path.join(project, 'App.xcconfig');
    const initialSettings = 'SWIFT_VERSION = 6.0\n';
    await fs.writeFile(buildSettings, initialSettings);
    const syntax=async()=>({status:'available',files:['App.swift','Value.swift'],items:[],warnings:[]});
    const inventory=await prepare(project,path.join(base,'inventory'),syntax);
    const taskMap = await fs.readFile(path.join(base,'inventory','task-map.html'),'utf8');
    assert.match(taskMap,/Task sites/);
    assert.match(taskMap,/SwiftSyntax available · file coverage matching/);
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
    assert.match((await progress(project,reviewPath,syntax)).gaps.join(' '), /App-level assessments still needed:.*launch-performance/);
    assert.match((await next(project,reviewPath,syntax)).gaps.join(' '), /App-level assessments still needed:.*launch-performance/);
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
    await assert.rejects(finish(project,reviewPath,output,undefined,syntax),/Record app-level assessments.*launch-performance/);
    review.presentation.criteria[0].appChecks = [
      'deliberate-concurrency', 'discoverable-capabilities', 'view-model-boundaries',
      'additional-targets', 'actor-design', 'state-observation', 'launch-performance',
      'cancellation', 'mutable-value-copies'
    ];
    await fs.writeFile(reviewPath,JSON.stringify(review));
    const missingClarity = structuredClone(review);
    missingClarity.operations[0].checks.find(check => check.id === 'architectural-clarity').status = 'not-applicable';
    await fs.writeFile(reviewPath,JSON.stringify(missingClarity));
    const pendingClarity = await next(project,reviewPath,syntax);
    assert.deepEqual(pendingClarity.nextOperations[0].pendingDimensions,['clarity']);
    await assert.rejects(finish(project,reviewPath,output,undefined,syntax),/operations have unresolved checks or boundaries/);
    await assert.rejects(fs.access(output));
    const unsupportedAssessment = structuredClone(review);
    delete unsupportedAssessment.presentation.criteria[0].evidence;
    await fs.writeFile(reviewPath,JSON.stringify(unsupportedAssessment));
    assert.match((await next(project,reviewPath,syntax)).gaps.join(' '), /App-level assessments still needed:.*launch-performance/);
    const draftAssessment = structuredClone(review);
    draftAssessment.presentation.criteria[0].status = 'draft';
    await fs.writeFile(reviewPath,JSON.stringify(draftAssessment));
    assert.match((await next(project,reviewPath,syntax)).gaps.join(' '), /App-level assessments still needed:.*launch-performance/);
    const blankAssessment = structuredClone(review);
    blankAssessment.presentation.criteria[0].detail = '  ';
    await fs.writeFile(reviewPath,JSON.stringify(blankAssessment));
    await assert.rejects(next(project,reviewPath,syntax), /missing review text/);
    await assert.rejects(finish(project,reviewPath,output,undefined,syntax), /missing review text/);
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
    const incompleteEvidence = structuredClone(generalProblem);
    incompleteEvidence.findings[0].evidence = [{file:'App.swift',line:1,endLine:2}];
    await fs.writeFile(reviewPath,JSON.stringify(incompleteEvidence));
    await assert.rejects(finish(project,reviewPath,output,undefined,syntax), /Include confirmed source problems.*Confirmed issue/);
    await assert.rejects(fs.access(output));
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
    assert.match(problemHtml, /When timing changes.*Timing defect.*Repeating the action starts duplicate work/s);
    checkProblem.presentation.criteria = timingProblem.presentation.criteria;
    checkProblem.operations[0].checks[0].problemKind = 'architectural-conflict';
    await fs.writeFile(reviewPath,JSON.stringify(checkProblem));
    const conflictOutput = path.join(base,'conflict.html');
    await finish(project,reviewPath,conflictOutput,undefined,syntax);
    const conflictHtml = await fs.readFile(conflictOutput,'utf8');
    assert.match(conflictHtml,/Frankenstein architecture detected.*Yes. Architectural conflicts/);
    assert.match(conflictHtml,/state-ownership<\/strong><p>Architectural conflict<\/p>/);
    assert.match(conflictHtml,/Start <small>· Architectural conflict<\/small><\/summary>/);
    assert.match(problemHtml,/<summary><span class="indicator problem" aria-label="Problem">×<\/span>Start/);
    await fs.writeFile(reviewPath,JSON.stringify(review));
    const cfaDeviation = structuredClone(review);
    cfaDeviation.operations[0].recommendation = "Name the stored property <viewModel>.";
    cfaDeviation.operations[0].checks.push({
      id:'view-model-property-name', title:'ViewModel property name', dimension:'cfa', status:'fail',
      reason:'The screen owns its ViewModel under another name.', verification:'Source inspection',
      consequence:'The property differs from the CFA naming convention.', problemKind:'cfa-deviation',
      evidence:[{file:'App.swift',line:2,endLine:2}]
    });
    await fs.writeFile(reviewPath, JSON.stringify(cfaDeviation));
    const cfaOutput = path.join(base, 'cfa-deviation.html');
    await finish(project, reviewPath, cfaOutput, undefined, syntax);
    const cfaHtml = await fs.readFile(cfaOutput, 'utf8');
    assert.match(cfaHtml, /aria-label="Stable">✓<\/span>Start <small>· CFA deviation/);
    assert.match(cfaHtml, /Suggested change<\/h3><p>Name the stored property &lt;viewModel&gt;\./);
    assert.match(cfaHtml, /CFA alignment.*ViewModel property name.*CFA naming convention/s);
    assert.match(cfaHtml, /Frankenstein architecture detected.*No architectural conflicts/);
    await fs.writeFile(reviewPath, JSON.stringify(review));
    const result=await finish(project,reviewPath,output,undefined,syntax);
    assert.deepEqual(result.gaps,[]);
    const html=await fs.readFile(output,'utf8');
    assert.match(html,/100%/);
    assert.match(html,/<summary><span class="indicator pass" aria-label="Stable">✓<\/span>Start/);
    assert.match(html,/When timing changes/);
    assert.match(html, /<strong>Trigger:<\/strong> Launch/);
    assert.match(html, /<strong>Verification:<\/strong> Source inspection<\/p><p class="evidence">Evidence: App\.swift:1 · Value\.swift:1/);
    assert.match(html,/The owner handles this case/);
    assert.match(html,/App\.swift:1–2/);
    assert.doesNotMatch(html,/What still needs checking/);
    const mustNotParse = async () => assert.fail('Stale evidence should be rejected before running SwiftSyntax');
    await fs.appendFile(buildSettings, 'SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor\n');
    await assert.rejects(next(project, reviewPath, mustNotParse), /fingerprint mismatch/);
    await assert.rejects(finish(project, reviewPath, path.join(base, 'stale-settings.html'), undefined, mustNotParse), /fingerprint mismatch/);
    await fs.writeFile(buildSettings, initialSettings);
    await fs.writeFile(path.join(project,'App.swift'),'struct Changed {}\n');
    await assert.rejects(finish(project,reviewPath,path.join(base,'stale.html'),undefined,mustNotParse),/fingerprint mismatch/);
    await fs.writeFile(path.join(project,'App.swift'),'struct App {\r\n}\r\n');
    await fs.writeFile(path.join(project,'Unreadable.swift'), Buffer.from([0xff]));
    const rescanned = await prepare(project, path.join(base,'unreadable-inventory'), syntax);
    review.sourceFingerprint = rescanned.sourceFingerprint;
    await fs.writeFile(reviewPath,JSON.stringify(review));
    const incompleteOutput = path.join(base,'unreadable.html');
    await assert.rejects(finish(project,reviewPath,incompleteOutput,undefined,syntax), /Source file could not be scanned: Unreadable.swift/);
    await assert.rejects(fs.access(incompleteOutput));
  } finally { await fs.rm(base,{recursive:true,force:true}); }
});

test('retains test-named directories in subsequent scans when explicitly included', async t => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'whole-health-scope-'));
  t.after(() => fs.rm(base, {recursive:true,force:true}));
  const project = path.join(base,'app');
  const helper = 'NetworkTests/ProductionHelper.swift';
  await fs.mkdir(path.join(project,'NetworkTests'),{recursive:true});
  await fs.writeFile(path.join(project,'App.swift'),'struct App {}\n');
  await fs.writeFile(path.join(project,helper),'struct ProductionHelper {}\n');
  const syntax = async (_root, {includeTests}) => ({
    status:'available', files:includeTests ? ['App.swift',helper] : ['App.swift'],
    items:includeTests ? [5, 15].map(column => ({kind:'concurrency.task',file:helper,line:1,column})) : [], warnings:[]
  });
  const output = path.join(base,'inventory');
  const inventory = await prepare(project,output,syntax,{includeTests:true});
  assert.deepEqual(inventory.scope.excludedTestDirectories,[]);
  assert.ok(inventory.files.some(file => file.path === helper));
  const checklist = JSON.parse(await fs.readFile(path.join(output,'checklist.json'),'utf8'));
  assert.deepEqual(checklist.taskSites.map(site => site.column), [5, 15]);
  const work = await next(project,path.join(output,'review-draft.json'),syntax);
  assert.ok(work.nextFiles.includes(helper));
  assert.ok(!work.gaps.some(gap => gap.includes('different files')));
});

test('rejects scope flags on report instead of silently using a different scope', () => {
  const cli = fileURLToPath(new URL('../src/whole-app-health.mjs', import.meta.url));
  for (const icon of [[], ['icon.png']]) {
    const result = spawnSync(process.execPath, [
      cli, 'report', '.', 'review.json', 'report.html', ...icon, '--include-tests'
    ], {encoding:'utf8'});
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^Usage:/);
  }
});

test('rejects a malformed review scope before scanning', async t => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'whole-health-invalid-scope-'));
  t.after(() => fs.rm(base, {recursive:true,force:true}));
  const draft = path.join(base,'review.json');
  const output = path.join(base,'report.html');
  await fs.writeFile(draft, JSON.stringify({includeTests:'true'}));
  const syntax = async () => assert.fail('Invalid review scope should be rejected before scanning');
  await assert.rejects(progress(base,draft,syntax), /includeTests must be true or false/);
  await assert.rejects(next(base,draft,syntax), /includeTests must be true or false/);
  await assert.rejects(finish(base,draft,output,undefined,syntax), /includeTests must be true or false/);
  for (const invalid of [{schemaVersion:2, sourceFingerprint:'snapshot'}, {schemaVersion:1}]) {
    await fs.writeFile(draft, JSON.stringify(invalid));
    await assert.rejects(next(base,draft,syntax), /schema-version 1 Health Check review with a source fingerprint/);
  }
});
