#!/usr/bin/env node
import fs from 'node:fs/promises';
import {existsSync, realpathSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {importReview} from './review-import.mjs';
import {missingTimingScenarios} from './operation-assessments.mjs';
import {renderHealthReport, validateReportPresentation} from './health-report.mjs';
import {collectSyntax} from './syntax-evidence.mjs';
import {collectProjectAnalysis} from './project-analysis.mjs';

const appCheckIDs = [
  'deliberate-concurrency', 'discoverable-capabilities', 'view-model-boundaries',
  'additional-targets', 'actor-design', 'state-observation', 'launch-performance',
  'cancellation', 'mutable-value-copies'
];

const candidateKinds = new Set(['launch-callback', 'button-action', 'view-task', 'refresh']);
const taskRelations = new Map([
  ['concurrency.task', 'unstructured-task'],
  ['concurrency.detached', 'unstructured-task'],
  ['concurrency.taskGroup', 'same-task'],
  ['concurrency.groupChild', 'child-task'],
  ['concurrency.asyncLet', 'child-task'],
  ['entry.viewTask', 'framework-task'],
  ['entry.refreshable', 'framework-task']
]);
export function taskCandidates(report) {
  return (report.syntax?.items || []).filter(item=>taskRelations.has(item.kind)).map(item=>({...item,id:`syntax-task:${item.file}:${item.line}:${item.column}:${item.kind}`}));
}
function pendingSourceFiles(report, review) {
  const batched = new Set((review.fileBatches || []).flatMap(batch => batch.files || []));
  const statuses = new Map((review.fileReviews || []).map(item => [item.file, item.status]));
  return report.files.filter(({path}) => {
    const status = statuses.get(path);
    return status ? status === 'unassessed' || status === 'investigate' : !batched.has(path);
  }).map(file => file.path);
}
const pendingDimensions = operation => ['correctness', 'clarity']
  .filter(dimension => ['unassessed', 'investigate'].includes(operation[dimension]));

const hasOpenChecks = operation => !operation.checks?.length ||
  operation.checks.some(check => ['unresolved', 'not-checked'].includes(check.status)) ||
  pendingDimensions(operation).length > 0 ||
  Boolean(operation.unknowns?.length) ||
  Boolean(operation.steps?.some(step => step.relation === 'unknown'));

function stepCitesTask(step, site) {
  return step.relation === taskRelations.get(site.kind) &&
    step.evidence?.some(ref => ref.file === site.file && ref.line <= site.line && ref.endLine >= site.line);
}

function hasTaskTrace(operation, site, sites) {
  const sharesLine = sites.some(other =>
    other.id !== site.id && other.file === site.file && other.line === site.line
  );
  return operation?.steps?.some(step => {
    if (!stepCitesTask(step, site)) return false;
    if (step.taskSiteId !== undefined) return step.taskSiteId === site.id;
    return !sharesLine && !sites.some(other => other.id !== site.id && stepCitesTask(step, other));
  });
}

function invalidTaskLinks(operation, sites, taskEntries) {
  const invalid = [];
  for (const step of operation.steps || []) {
    if (step.taskSiteId === undefined) continue;
    const site = sites.find(item => item.id === step.taskSiteId);
    const entry = taskEntries.get(step.taskSiteId);
    let reason;
    if (!site) reason = 'Task site is absent from the current inventory.';
    else if (entry?.excludedReason) reason = 'Task site was excluded from the review.';
    else if (!entry?.operationId) reason = 'Task site needs an operation assignment.';
    else if (step.relation !== taskRelations.get(site.kind)) reason = `Expected relation ${taskRelations.get(site.kind)}.`;
    else if (!stepCitesTask(step, site)) reason = `Step evidence must include ${site.file}:${site.line}:${site.column}.`;
    else if (!stepCitesTask({relation: step.relation, evidence: operation.evidence}, site)) {
      reason = `Operation evidence must include ${site.file}:${site.line}:${site.column}.`;
    }
    if (reason) invalid.push({...step, reason});
  }
  return invalid;
}

const pendingTypeReviews = review => (review.typeReviews || [])
  .filter(item => item.status === 'investigate' || item.status === 'unassessed');

function hasProductionTargets(review) {
  const targets = review.productionTargets;
  return Array.isArray(targets) && targets.length > 0 &&
    targets.every(target => typeof target === 'string' && target.trim());
}

const evidenceLocations = evidence =>
  (evidence || []).map(({file, line, endLine}) => ({file, line, endLine}));

// Describe the next concrete review work without treating inventory as evidence.
export function nextWork(report, review, limit = 8) {
  const entries = new Set((review.entryPoints || []).map(item => item.siteId));
  const tasks = new Map((review.taskSites || []).map(item => [item.siteId, item]));
  const operations = new Map((review.operations || []).map(item => [item.id, item]));
  const pendingFiles = pendingSourceFiles(report, review);
  const nextFiles = pendingFiles.slice(0, limit);
  const nextFilePaths = new Set(nextFiles);
  const pendingTypes = pendingTypeReviews(review);
  const pendingEntries = inventoryCandidates(report).filter(site => !entries.has(site.id));
  const sites = taskCandidates(report);
  const pendingTasks = sites.filter(site => {
    const entry = tasks.get(site.id);
    return !entry || (entry.operationId && !hasTaskTrace(operations.get(entry.operationId), site, sites));
  });
  const pendingOperations = (review.operations || []).map(operation => ({
    id: operation.id,
    title: operation.title,
    openChecks: hasOpenChecks(operation),
    pendingDimensions: pendingDimensions(operation),
    missingTrace: !operation.steps?.length,
    pendingChecks: (operation.checks || [])
      .filter(check => check.status === 'unresolved' || check.status === 'not-checked' ||
        (check.status === 'not-applicable' && pendingDimensions(operation).includes(check.dimension)))
      .map(({id, title, dimension, status, reason, question, resolveBy, evidence}) => ({
        id, title, dimension, status, reason, question, resolveBy,
        evidence: evidenceLocations(evidence)
      })),
    unknowns: operation.unknowns || [],
    unresolvedSteps: (operation.steps || [])
      .filter(step => step.relation === 'unknown')
      .map(({id, title, detail, evidence}) => ({id, title, detail, evidence: evidenceLocations(evidence)})),
    unresolvedTimingScenarios: (operation.scenarios || [])
      .filter(scenario => scenario.status === 'unresolved')
      .map(({id, title, outcome, verification, evidence}) => ({id, title, outcome, verification, evidence: evidenceLocations(evidence)})),
    invalidTaskLinks: invalidTaskLinks(operation, sites, tasks)
      .map(({id, taskSiteId, relation, reason, evidence}) => ({id, taskSiteId, relation, reason, evidence: evidenceLocations(evidence)})),
    missingTimingScenarios: missingTimingScenarios(operation)
  })).filter(operation => operation.openChecks || operation.missingTrace || operation.missingTimingScenarios.length || operation.invalidTaskLinks.length);
  return {
    pendingFiles: pendingFiles.length,
    pendingTypes: pendingTypes.length,
    pendingEntryPoints: pendingEntries.length,
    pendingTaskSites: pendingTasks.length,
    pendingOperations: pendingOperations.length,
    nextFiles,
    nextFileReviews: (review.fileReviews || [])
      .filter(item => nextFilePaths.has(item.file))
      .map(({file, status, reason, verification, evidence}) => ({
        file, status, reason, verification, evidence: evidenceLocations(evidence)
      })),
    nextTypes: pendingTypes.slice(0, limit).map(({name, kind, file, line, status, reason, verification, evidence}) => ({
      name, kind, file, line, status, reason, verification, evidence: evidenceLocations(evidence)
    })),
    nextEntryPoints: pendingEntries.slice(0, limit),
    nextTaskSites: pendingTasks.slice(0, limit),
    nextOperations: pendingOperations.slice(0, limit),
    ...(review.targetInventoryVerified === true && hasProductionTargets(review) ? {} : {
      targetReview: {
        buildDefinitionPaths: report.scope.buildDefinitionPaths ?? [],
        excludedTestDirectories: report.scope.excludedTestDirectories ?? [],
        symbolicLinkPaths: report.scope.symbolicLinkPaths ?? []
      }
    }),
    gaps: coverageGaps(report, review)
  };
}
export function renderTaskMap(taskMap) {
  const esc=value=>String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  const labels={'concurrency.task':'Unstructured task','concurrency.detached':'Detached task','concurrency.taskGroup':'Task group','concurrency.groupChild':'Possible group child','concurrency.asyncLet':'Async let child','entry.viewTask':'Possible SwiftUI task','entry.refreshable':'Possible SwiftUI refresh'};
  const parserNotes = [
    taskMap.reason,
    ...(taskMap.warnings || []),
    ...(taskMap.missingFiles || []).map(file => `SwiftSyntax did not inventory: ${file}.`),
    taskMap.excludedItems ? `Parser findings outside the source inventory: ${taskMap.excludedItems}.` : null
  ].filter(Boolean);
  const diagnostics = parserNotes.map(note => `<p>${esc(note)}</p>`).join('');
  const rows=taskMap.sites.map(site=>`<li><strong>${esc(labels[site.kind] || site.kind)}</strong> · ${esc(site.file)}:${site.line}:${site.column}<br><span>${site.enclosingFunction ? `Function: ${esc(site.enclosingFunction)}` : 'Enclosing function not identified'}${site.lexicalTaskParent ? ` · Written inside task at ${esc(site.lexicalTaskParent)}` : ''}</span></li>`).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Task sites</title><style>body{font:16px/1.6 system-ui;background:#111214;color:#f2f3f4;max-width:900px;margin:50px auto;padding:0 24px}h1{font-size:2.4rem}p,span{color:#bac4c8}li{padding:14px 0;border-bottom:1px solid #373b3f;overflow-wrap:anywhere}</style><h1>Task sites</h1><p>${esc(taskMap.note)}</p><p>${taskMap.sites.length} sites · SwiftSyntax ${esc(taskMap.status)} · file coverage ${esc(taskMap.coverage ?? 'unverified')}</p>${diagnostics}<ul>${rows}</ul></html>`;
}
export function inventoryCandidates(report) {
  const candidates = report.files.flatMap(file => file.sites.filter(site => candidateKinds.has(site.kind)));
  const kindMap = {'entry.launchCallback':'launch-callback','entry.button':'button-action','entry.viewTask':'view-task','entry.refreshable':'refresh','entry.main':'main','entry.backgroundHandler':'background-handler','entry.incomingLink':'incoming-link','entry.notificationResponse':'notification-response'};
  const keyFor = (site, kind) => JSON.stringify([site.file, site.line, kind]);
  const lexicalByLine = new Map();
  for (const site of candidates) {
    const key = keyFor(site, site.kind);
    if (!lexicalByLine.has(key)) lexicalByLine.set(key, []);
    lexicalByLine.get(key).push(site);
  }
  const syntaxEntries = (report.syntax?.items || []).filter(item => Object.hasOwn(kindMap, item.kind));
  const syntaxCounts = new Map();
  for (const item of syntaxEntries) {
    const key = keyFor(item, kindMap[item.kind]);
    syntaxCounts.set(key, (syntaxCounts.get(key) || 0) + 1);
  }
  for (const item of syntaxEntries) {
    const kind = kindMap[item.kind];
    const key = keyFor(item, kind);
    const lexicalMatches = lexicalByLine.get(key) || [];
    const exact = lexicalMatches.findIndex(site => site.column === item.column);
    const unambiguous = syntaxCounts.get(key) === 1 && lexicalMatches.length === 1;
    const duplicate = unambiguous ? 0 : exact;
    if (duplicate >= 0) {
      lexicalMatches.splice(duplicate, 1);
      continue;
    }
    candidates.push({id:`syntax:${item.file}:${item.line}:${item.column}:${kind}`,kind,file:item.file,line:item.line,column:item.column,label:`SwiftSyntax ${item.kind}`});
  }
  return candidates;
}
export function coverageGaps(report, review) {
  const gaps = [];
  if (!hasProductionTargets(review)) gaps.push('Production targets and local packages have not been accounted for.');
  if (review.targetInventoryVerified !== true) gaps.push('Production target membership and excluded sources need verification.');
  for (const {file, reason} of report.scope.skipped) {
    gaps.push(`Source file could not be scanned: ${file} (${reason}).`);
  }
  if (report.syntax?.status === 'unavailable') gaps.push(report.syntax.reason);
  for (const warning of report.syntax?.warnings ?? []) gaps.push(`SwiftSyntax warning: ${warning}`);
  if (report.syntax?.excludedItems > 0) {
    gaps.push(`SwiftSyntax returned ${report.syntax.excludedItems} findings outside the source inventory. Reconcile the scan scope before generating a report.`);
  }
  if (report.syntax?.status === 'available') {
    const scannerFiles = new Set(report.files.map(file=>file.path));
    const syntaxFiles = new Set(report.syntax.files);
    const missingSyntax = [...scannerFiles].filter(file => !syntaxFiles.has(file));
    const missingSource = [...syntaxFiles].filter(file => !scannerFiles.has(file));
    if (missingSyntax.length || missingSource.length) {
      gaps.push('The SwiftSyntax and source inventories cover different files.');
      if (missingSyntax.length) gaps.push(`Missing from SwiftSyntax: ${missingSyntax.join(', ')}.`);
      if (missingSource.length) gaps.push(`Missing from lexical inventory: ${missingSource.join(', ')}.`);
    }
  }
  const missingFiles = pendingSourceFiles(report, review);
  if (missingFiles.length) gaps.push(`${missingFiles.length} Swift files still need review: ${missingFiles.join(', ')}.`);
  const openTypes = pendingTypeReviews(review);
  if (openTypes.length) {
    const locations = openTypes.map(item => `${item.name} (${item.file}:${item.line})`);
    gaps.push(`Recorded types still need review: ${locations.join(', ')}.`);
  }
  const operations = review.operations || [];
  if (review.operationInventory?.coverage !== 'complete') gaps.push('The operation inventory has not been reconciled with the application entry points.');
  if (!operations.length) gaps.push('No application operations have been reviewed.');
  const missingTraces = operations.filter(operation => !operation.steps?.length);
  if (missingTraces.length) gaps.push(`${missingTraces.length} operations need a workflow trace.`);
  const openOperations = operations.filter(hasOpenChecks);
  if (openOperations.length) gaps.push(`${openOperations.length} operations have unresolved checks or boundaries.`);
  const incomplete = operations.filter(op => missingTimingScenarios(op).length);
  if (incomplete.length) gaps.push(`${incomplete.length} operations need timing-scenario assessments.`);
  const entries = new Map();
  for (const entry of review.entryPoints || []) {
    if (!entry.siteId || entries.has(entry.siteId)) throw Error('Entry-point reconciliation needs unique site IDs.');
    if (Boolean(entry.operationId) === Boolean(entry.excludedReason)) throw Error('Each entry point needs an operation ID or an exclusion reason.');
    if (entry.operationId && !operations.some(op => op.id === entry.operationId)) throw Error('Entry point references an unknown operation.');
    if (entry.excludedReason && (typeof entry.excludedReason !== 'string' || !entry.excludedReason.trim())) throw Error('An exclusion reason must explain the exclusion.');
    entries.set(entry.siteId, entry);
  }
  const candidates = inventoryCandidates(report);
  const validIDs = new Set(candidates.map(site => site.id));
  for (const id of entries.keys()) if (!validIDs.has(id)) throw Error('Entry point does not match the current inventory.');
  for (const site of candidates) {
    const entry = entries.get(site.id);
    if (!entry?.operationId) continue;
    const op = operations.find(item => item.id === entry.operationId);
    if (!op.evidence.some(ref => ref.file === site.file && ref.line <= site.line && ref.endLine >= site.line)) {
      const location = [site.file, site.line, site.column].filter(value => value !== undefined).join(':');
      throw Error(`Operation evidence must include its reconciled entry point: ${op.id} → ${location} (${site.kind}).`);
    }
  }
  const missingEntries = candidates.filter(site => !entries.has(site.id));
  if (missingEntries.length) gaps.push(`${missingEntries.length} detected entry points still need reconciliation.`);
  const tasks = taskCandidates(report), taskEntries = new Map();
  const untracedTasks = [];
  for (const entry of review.taskSites || []) {
    if (!entry.siteId || taskEntries.has(entry.siteId)) throw Error('Task reconciliation needs unique site IDs.');
    if (Boolean(entry.operationId) === Boolean(entry.excludedReason)) throw Error('Each task site needs an operation ID or an exclusion reason.');
    if (entry.excludedReason && (typeof entry.excludedReason !== 'string' || !entry.excludedReason.trim())) throw Error('A task exclusion needs a reason.');
    const site=tasks.find(item=>item.id===entry.siteId);
    if (!site) throw Error('Task site does not match the current inventory.');
    if (entry.operationId) {
      const op=operations.find(item=>item.id===entry.operationId);
      if (!op) throw Error(`Task site references an unknown operation: ${entry.operationId} → ${site.file}:${site.line}:${site.column}.`);
      if (!op.evidence.some(ref => ref.file === site.file && ref.line <= site.line && ref.endLine >= site.line)) throw Error(`Operation evidence must include its reconciled task site: ${op.id} → ${site.file}:${site.line}:${site.column}.`);
      if (!hasTaskTrace(op, site, tasks)) untracedTasks.push(`${site.file}:${site.line}:${site.column} (${op.id}, expected ${taskRelations.get(site.kind)})`);
    }
    taskEntries.set(entry.siteId,entry);
  }
  for (const operation of operations) {
    for (const step of invalidTaskLinks(operation, tasks, taskEntries)) {
      gaps.push(`Workflow step ${operation.id}/${step.id} must cite its reconciled task site. ${step.reason}`);
    }
  }
  if (untracedTasks.length) gaps.push(`Reconciled task sites need workflow steps: ${untracedTasks.join(', ')}.`);
  const missingTasks=tasks.filter(site=>!taskEntries.has(site.id));
  if (missingTasks.length) gaps.push(`${missingTasks.length} detected task sites still need reconciliation.`);
  return gaps;
}
async function currentInventory(root, syntaxProvider = collectSyntax, options = {}) {
  const {inventory:report,analysis} = await collectProjectAnalysis(root, options, {syntax:syntaxProvider});
  report.syntax = analysis.syntax;
  report.syntax.sourceFingerprint = report.sourceFingerprint;
  return {report,analysis};
}
export async function prepare(root, output, syntaxProvider = collectSyntax, options = {}) {
  const {report,analysis} = await currentInventory(root, syntaxProvider, options);
  try {
    await fs.mkdir(output, {recursive:false});
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const draft = await fs.stat(path.join(output, 'review-draft.json')).catch(statError => {
      if (!['ENOENT', 'ENOTDIR'].includes(statError.code)) throw statError;
      return null;
    });
    const recovery = draft?.isFile()
      ? 'Resume with next and the existing review-draft.json, or choose a new output directory for a fresh scan.'
      : 'No review-draft.json was found. Choose a new output directory for a fresh scan.';
    throw Error(`Health Check output already exists: ${output}. ${recovery}`, {cause:error});
  }
  await fs.writeFile(path.join(output,'inventory.json'), JSON.stringify(report,null,2)+'\n', {flag:'wx'});
  await fs.writeFile(path.join(output,'project-analysis.json'), JSON.stringify(analysis,null,2)+'\n', {flag:'wx'});
  const checklist = {
    sourceFingerprint: report.sourceFingerprint,
    note: 'Review each item against its source and record evidence in the review input. Scanner candidates are leads. Verify target membership, discover additional entry points, and record the target, configuration and effective Swift isolation settings used for isolation findings.',
    productionTargets: {
      status:'pending', targets:[],
      excludedTestDirectories: report.scope.excludedTestDirectories,
      symbolicLinkPaths: report.scope.symbolicLinkPaths,
      buildDefinitionPaths: report.scope.buildDefinitionPaths
    },
    files: report.files.map(file=>({file:file.path,status:'pending'})),
    entryPoints: inventoryCandidates(report).map(site=>({siteId:site.id,file:site.file,line:site.line,column:site.column,kind:site.kind,status:'pending'})),
    taskSites: taskCandidates(report).map(site=>({siteId:site.id,file:site.file,line:site.line,column:site.column,kind:site.kind,status:'pending'})),
    operations: {status:'pending', note:'Discover and trace user actions and system events, including operations the scanner cannot detect.'}
  };
  await fs.writeFile(path.join(output,'checklist.json'),JSON.stringify(checklist,null,2)+'\n',{flag:'wx'});
  const draft = {schemaVersion:1,sourceFingerprint:report.sourceFingerprint,author:'Health Check reviewer',includeTests:report.scope.includeTests,scope:'Whole application',productionTargets:[],targetInventoryVerified:false,fileReviews:[],fileBatches:[],operationInventory:{scope:'Whole application',method:'Source review and scanner inventory',coverage:'partial'},operations:[],entryPoints:[],taskSites:[]};
  await fs.writeFile(path.join(output,'review-draft.json'),JSON.stringify(draft,null,2)+'\n',{flag:'wx'});
  const {status, coverage, reason, warnings, excludedItems, missingFiles} = report.syntax;
  const taskMap = {sourceFingerprint:report.sourceFingerprint, status, coverage, reason, warnings, excludedItems, missingFiles,
    note:'Syntax locations and lexical nesting are leads only. Task parentage, ownership and call relationships require source review.',
    sites:taskCandidates(report)};
  await fs.writeFile(path.join(output,'task-map.json'),JSON.stringify(taskMap,null,2)+'\n',{flag:'wx'});
  await fs.writeFile(path.join(output,'task-map.html'),renderTaskMap(taskMap),{flag:'wx'});
  return report;
}
async function appIcon(root) {
  const assets = [];
  async function walk(directory) {
    for (const item of await fs.readdir(directory,{withFileTypes:true})) {
      if (!item.isDirectory() || item.name.startsWith('.') || /^(?:node_modules|Pods|Carthage|DerivedData|build|reports)$/i.test(item.name) || /tests?$/i.test(item.name)) continue;
      const next=path.join(directory,item.name);
      if (item.name === 'AppIcon.appiconset') assets.push(next);
      else await walk(next);
    }
  }
  await walk(root);
  if (assets.length !== 1) return null;
  try {
    const contents=JSON.parse(await fs.readFile(path.join(assets[0],'Contents.json'),'utf8'));
    const images=(contents.images || []).filter(image => typeof image.filename === 'string' && path.basename(image.filename) === image.filename && image.filename.toLowerCase().endsWith('.png'));
    images.sort((a,b) => (Number.parseFloat(b.size) || 0) * (Number.parseInt(b.scale) || 1) - (Number.parseFloat(a.size) || 0) * (Number.parseInt(a.scale) || 1));
    return images.length ? path.join(assets[0],images[0].filename) : null;
  } catch { return null; }
}
function pendingAppChecks(review) {
  const appChecks = new Set();
  const criteria = Array.isArray(review.presentation?.criteria)
    ? review.presentation.criteria
    : [];
  for (const criterion of criteria) {
    if (criterion?.appChecks === undefined) continue;
    if (!Array.isArray(criterion.appChecks) || criterion.appChecks.some(id => !appCheckIDs.includes(id))) {
      throw Error('Use recognised app-level check IDs in criterion.appChecks.');
    }
    if (['pass', 'concern', 'problem'].includes(criterion.status) &&
        Array.isArray(criterion.evidence) && criterion.evidence.length) {
      criterion.appChecks.forEach(id => appChecks.add(id));
    }
  }
  return appCheckIDs.filter(id => !appChecks.has(id));
}

function appCheckGaps(review) {
  const missing = pendingAppChecks(review);
  return missing.length ? ['App-level assessments still needed: ' + missing.join(', ')] : [];
}

async function loadCurrentReview(root, input, syntaxProvider) {
  const contents = await fs.readFile(input, 'utf8');
  let raw;
  try {
    raw = JSON.parse(contents);
  } catch (error) {
    throw Error(`Saved Health Check review is not valid JSON at "${input}". Correct the file or restore a valid copy before resuming.`, {cause:error});
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw Error(`Expected a Health Check review object at "${input}". Correct the file or restore a valid copy before resuming.`);
  }
  const {includeTests = false} = raw;
  if (typeof includeTests !== 'boolean') throw Error('Review includeTests must be true or false. Use the scope recorded by prepare.');
  if (raw.schemaVersion !== 1 || typeof raw.sourceFingerprint !== 'string' || !raw.sourceFingerprint.trim()) {
    throw Error('Expected a schema-version 1 Health Check review with a source fingerprint. Use the draft generated by prepare.');
  }
  for (const key of ['entryPoints', 'taskSites']) {
    const entries = raw[key] ?? [];
    if (!Array.isArray(entries) || entries.some(entry => !entry || typeof entry !== 'object' || Array.isArray(entry))) {
      throw Error(`Review ${key} must be a list of reconciliation records.`);
    }
  }
  const {report} = await currentInventory(root, syntaxProvider, {includeTests, expectedSourceFingerprint:raw.sourceFingerprint});
  return {report, review:await importReview(report,raw,root)};
}

function reportPresentationGap(review) {
  const presentation = review.presentation;
  if (!presentation?.app || !presentation.summary || typeof presentation.verdict !== 'string' || !presentation.verdict.trim() || !presentation.conclusion || !Array.isArray(presentation.criteria) || !presentation.criteria.length) return 'Provide presentation app, summary, verdict, conclusion and criteria.';
  for (const criterion of presentation.criteria) {
    if (!Array.isArray(criterion?.evidence) || !criterion.evidence.length) {
      return 'Each whole-app presentation criterion needs source evidence as file and line references.';
    }
  }
  try {
    validateReportPresentation({...presentation, scope:review.scope});
  } catch (error) {
    return error.message;
  }
  return null;
}

function reportFindingsGaps(review) {
  const gaps = [];
  const criteria = Array.isArray(review.presentation?.criteria)
    ? review.presentation.criteria.filter(criterion => Array.isArray(criterion?.evidence))
    : [];
  for (const finding of review.findings || []) {
    if (!['pass', 'concern', 'problem'].includes(finding.status)) {
      gaps.push('Whole-app finding status must be pass, concern or problem: ' + finding.title);
    }
  }
  const sourceProblems = [
    ...(review.findings || []), ...(review.fileReviews || []), ...(review.typeReviews || [])
  ].filter(item => item.status === 'problem').flatMap(item => item.issues?.length ? item.issues : [item]);
  const operationProblems = (review.operations || []).flatMap(operation => [
    ...(operation.checks || []).filter(check => check.status === 'fail' && check.dimension !== 'cfa'),
    ...(operation.scenarios || []).filter(scenario => scenario.status === 'problem')
  ]);
  const missingEvidence = (finding, visibleEvidence) => finding.evidence.filter(ref =>
    !visibleEvidence.some(visible =>
      visible.file === ref.file && visible.line <= ref.line && visible.endLine >= ref.endLine
    )
  ).map(({file, line, endLine}) => `${file}:${line}${endLine > line ? `–${endLine}` : ''}`);
  const problemEvidence = criteria
    .filter(criterion => criterion.status === 'problem')
    .flatMap(criterion => criterion.evidence);
  for (const problem of [...sourceProblems, ...operationProblems]) {
    const missing = missingEvidence(problem, problemEvidence);
    if (missing.length) {
      gaps.push('Include confirmed source problems in the report criteria before rendering: ' +
        (problem.title || problem.name || problem.file) + ` (missing ${missing.join(', ')})`);
    }
  }
  const concernEvidence = criteria
    .filter(criterion => ['concern', 'problem'].includes(criterion.status))
    .flatMap(criterion => criterion.evidence);
  for (const concern of (review.findings || []).filter(finding => finding.status === 'concern')) {
    const missing = missingEvidence(concern, concernEvidence);
    if (missing.length) {
      gaps.push(`Include source concerns in the report criteria before rendering: ${concern.title} (missing ${missing.join(', ')})`);
    }
  }
  return gaps;
}

export async function progress(root, input, syntaxProvider = collectSyntax) {
  const {report, review} = await loadCurrentReview(root, input, syntaxProvider);
  return {gaps:[...coverageGaps(report,review), ...appCheckGaps(review), ...reportFindingsGaps(review), reportPresentationGap(review)].filter(Boolean),files:report.files.length,operations:(review.operations || []).length};
}
export async function next(root, input, syntaxProvider = collectSyntax) {
  const {report, review} = await loadCurrentReview(root, input, syntaxProvider);
  const work = nextWork(report,review);
  return {...work, gaps:[...work.gaps, ...appCheckGaps(review), ...reportFindingsGaps(review), reportPresentationGap(review)].filter(Boolean)};
}
export async function finish(root, input, output, icon, syntaxProvider = collectSyntax) {
  const {report, review} = await loadCurrentReview(root, input, syntaxProvider);
  const gaps = coverageGaps(report,review);
  if (gaps.length) throw Error('Health Check is not complete; no report was generated. Complete the review checklist:\n- ' + gaps.join('\n- '));
  const presentationGap = reportPresentationGap(review);
  if (presentationGap) throw Error(presentationGap);
  const presentation = review.presentation;
  const missingAppChecks = pendingAppChecks(review);
  if (missingAppChecks.length) {
    throw Error('Record app-level assessments before rendering: ' + missingAppChecks.join(', '));
  }
  const findingsGaps = reportFindingsGaps(review);
  if (findingsGaps.length) throw Error(findingsGaps.join('\n'));
  const data = {...presentation, scope:review.scope};
  data.operations = (review.operations || []).map(op=>({group:op.group,title:op.title,trigger:op.trigger,verification:op.verification,evidence:op.evidence,path:op.path,stateOwner:op.stateOwner,taskOwner:op.taskOwner,isolation:op.isolation,reason:op.reason,unknowns:op.unknowns,steps:op.steps,checks:op.checks,scenarios:op.scenarios,problemKind:op.problemKind,recommendation:op.recommendation}));
  const taskSites = new Map(taskCandidates(report).map(site => [site.id, site]));
  const taskOwners = new Map((review.taskSites || []).map(entry => [entry.siteId, entry.operationId]));
  for (const [index, operation] of data.operations.entries()) {
    operation.steps = operation.steps.map(step => {
      const site = taskSites.get(step.taskSiteId);
      if (!site || taskOwners.get(site.id) !== review.operations[index].id) {
        return {...step, taskLocation: undefined};
      }
      return {...step, taskLocation: `${site.file}:${site.line}:${site.column}`};
    });
  }
  data.architecturalConflict = review.operations.some(op => op.problemKind === 'architectural-conflict');
  const selectedIcon = icon || await appIcon(root);
  const iconData = selectedIcon ? `data:image/png;base64,${(await fs.readFile(selectedIcon)).toString('base64')}` : '';
  await fs.writeFile(output,renderHealthReport(data,iconData),{flag:'wx'});
  return {gaps,files:report.files.length,operations:(review.operations || []).length};
}
if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const includeTests = args[0] === 'prepare' && args.at(-1) === '--include-tests';
    if (includeTests) args.pop();
    const [mode, root, input, output, icon, moduleFlag, moduleName] = args;
    if (mode === 'prepare' && root && input && (args.length === 3 || (output === '--index-store' && icon && moduleFlag === '--module' && moduleName && args.length === 7))) {
      const result = await prepare(root,input,collectSyntax,{includeTests, ...(output ? {indexStore:icon,module:moduleName} : {})});
      console.log(`Inventoried ${result.files.length} Swift files and ${inventoryCandidates(result).length} possible entry points. Review inventory.json before producing the report.`);
      if (output) {
        const analysis = JSON.parse(await fs.readFile(path.join(input,'project-analysis.json'),'utf8'));
        const {status, module, reason} = analysis.compilerIndex;
        console.log(`Compiler index: ${status}${module ? ` (module ${module})` : ''}`);
        if (reason) console.log(reason);
      }
    } else if (mode === 'progress' && root && input && args.length === 3) {
      const result = await progress(root,input);
      console.log(result.gaps.length ? 'Remaining review work:\n- ' + result.gaps.join('\n- ') : 'Source checklist and report presentation validated. Generate the report.');
    } else if (mode === 'next' && root && input && args.length === 3) {
      const result = await next(root,input);
      console.log(JSON.stringify(result,null,2));
    } else if (mode === 'report' && root && input && output && (args.length === 4 || (args.length === 5 && icon && !icon.startsWith('--')))) {
      const result = await finish(root,input,output,icon);
      console.log(`Inventoried ${result.files} source files, ${result.operations} recorded operations; ${result.gaps.length} coverage gaps. Report: ${output}`);
    } else throw Error('Usage: node whole-app-health.mjs prepare <project> <new-inventory-dir> [--index-store <path> --module <name>] [--include-tests] | progress <project> <review.json> | next <project> <review.json> | report <project> <review.json> <new-report.html> [app-icon.png]');
  } catch (error) { console.error(error.message); process.exitCode=1; }
}
