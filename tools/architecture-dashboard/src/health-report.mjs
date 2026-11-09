#!/usr/bin/env node
import path from 'node:path';
import {checkOutcome, missingTimingScenarios, problemLabel} from './operation-assessments.mjs';
import {fileURLToPath} from 'node:url';

const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const sourceLocation = ({file, line, endLine}) =>
  `${file}:${line}${endLine > line ? `–${endLine}` : ''}`;
const evidenceText = evidence =>
  Array.isArray(evidence) ? evidence.map(sourceLocation).join(' · ') : evidence;
const weights = {pass: 1, concern: 0.5, problem: 0};
export function assess(criteria) {
  if (!Array.isArray(criteria) || !criteria.length) throw Error('Provide at least one reviewed criterion.');
  for (const c of criteria) {
    if (!c.title || !c.detail || !Object.hasOwn(weights, c.status)) throw Error('Each criterion needs a title, detail and a pass, concern or problem status.');
  }
  const points = criteria.reduce((sum, criterion) => sum + weights[criterion.status], 0);
  if (points === criteria.length) return 100;
  return Math.min(99, Math.round(points * 100 / criteria.length));
}
function operationStatus(operation) {
  const checks = (operation.checks || []).filter(check => check.dimension !== 'cfa');
  const scenarios = operation.scenarios || [];
  if (operation.correctness === 'problem' || operation.clarity === 'problem' ||
      checks.some(check => check.status === 'fail') || scenarios.some(scenario => scenario.status === 'problem')) return 'problem';
  if (checkOutcome(checks, 'correctness') !== 'sound' || checkOutcome(checks, 'clarity') !== 'sound' ||
      !operation.steps?.length || missingTimingScenarios(operation).length ||
      operation.unknowns?.length || operation.steps?.some(step => step.relation === 'unknown')) return 'concern';
  return 'pass';
}

export function validateReportPresentation(data) {
  const headings = [data.app, data.summary, data.verdict, data.scope];
  if (headings.some(value => typeof value !== 'string' || !value.trim()) || !data.conclusion) {
    throw Error('Provide an app name, summary, substantive verdict, scope and conclusion.');
  }
  const score = assess(data.criteria);
  const conclusionItems = Array.isArray(data.conclusion) ? data.conclusion : [data.conclusion];
  if (!conclusionItems.length || conclusionItems.some(item => typeof item !== 'string' || !item.trim())) throw Error('Provide non-empty conclusion points.');
  return {score, conclusionItems};
}

export function renderHealthReport(data, iconData = '') {
  const {score, conclusionItems} = validateReportPresentation(data);
  const hasOperationProblem = data.architecturalConflict === true ||
    (data.operations || []).some(operation => operationStatus(operation) === 'problem');
  if (hasOperationProblem && !data.criteria.some(criterion => criterion.status === 'problem')) {
    throw Error('Include confirmed operation problems in the report criteria before rendering.');
  }
  const workflows = data.operations || [];
  const architectureUnresolved = !workflows.length || workflows.some(operation =>
    !operation.steps?.length ||
    ['investigate', 'unassessed'].includes(checkOutcome(operation.checks || [], 'clarity')) ||
    operation.unknowns?.length || operation.steps?.some(step => step.relation === 'unknown')
  );
  const conflictVerdict = typeof data.architecturalConflict === 'boolean'
    ? `<p class="caption"><strong>Frankenstein architecture detected?</strong> ${data.architecturalConflict
      ? 'Yes. Architectural conflicts were identified.'
      : architectureUnresolved
        ? 'Inconclusive. Architectural evidence is unresolved.'
        : 'No architectural conflicts were identified in the assessed operations.'}</p>`
    : '';
  const sections = ['pass','concern','problem'].map(status => {
    const rows = data.criteria.filter(c => c.status === status);
    if (!rows.length) return '';
    const title = {pass:'What is working well',concern:'Worth a closer look',problem:'Problems to address'}[status];
    return `<section><h2>${title}</h2>${rows.map(c => `<article class="finding"><span class="indicator ${status}" aria-label="${status}">${{pass:'✓',concern:'!',problem:'×'}[status]}</span><div><h3>${escape(c.title)}</h3><p>${escape(c.detail)}</p>${c.evidence ? `<p class="evidence">Evidence: ${escape(evidenceText(c.evidence))}</p>` : ''}</div></article>`).join('')}</section>`;
  }).join('');
  const hasConfirmedProblem = data.criteria.some(criterion => criterion.status === 'problem');
  const needsAttention = hasConfirmedProblem || score < 75;
  const stamp = needsAttention ? 'Needs attention' : score === 100 ? 'Strong concurrency design' : 'Good foundation';
  const stampClass = needsAttention ? 'negative' : 'positive';
  const resultMark = stampClass === 'positive' ? '✓' : '×';
  // The conclusion uses a consistent tick; individual findings keep their own status.
  const conclusionStatus = 'pass';
  const conclusionSymbol = '✓';
  const conclusionList = `<ul class="conclusion-list">${conclusionItems.map(item => `<li><span class="conclusion-tick ${conclusionStatus}" aria-hidden="true">${conclusionSymbol}</span><span>${escape(item)}</span></li>`).join('')}</ul>`;
  const icon = iconData ? `<img class="icon" src="${escape(iconData)}" alt="${escape(data.app)} app icon">` : '<div class="icon placeholder" aria-hidden="true">⌘</div>';

  const sourceLinks = refs => refs?.length ? `<p class="evidence">Evidence: ${escape(evidenceText(refs))}</p>` : '';
  const outcomes = op => {
    const checks = (op.checks || []).filter(check => check.status !== 'not-applicable');
    const inapplicableChecks = (op.checks || []).filter(check => check.status === 'not-applicable');
    const scenarios = op.scenarios || [];
    const applicableScenarios = scenarios.filter(scenario => scenario.status !== 'not-applicable');
    const inapplicableScenarios = scenarios.filter(scenario => scenario.status === 'not-applicable');
    const labels = {pass:'✓', fail:'×', problem:'×', unresolved:'?', 'not-checked':'?', 'not-applicable':'—'};
    const rows = items => items.map(item => {
      const classification = item.status === 'problem' ? 'Timing defect'
        : item.status === 'fail' ? problemLabel(item.problemKind) : '';
      const question = item.status === 'unresolved' && item.question
        ? `<p><strong>Open question:</strong> ${escape(item.question)}</p>` : '';
      const resolution = item.status === 'unresolved' && item.resolveBy
        ? `<p><strong>How to resolve:</strong> ${escape(item.resolveBy)}</p>` : '';
      return `<div class="behaviour-row"><strong>${labels[item.status] || '?'} ${escape(item.title)}</strong>${classification ? `<p>${classification}</p>` : ''}<p>${escape(item.reason || item.outcome)}</p>${question}${resolution}${item.consequence ? `<p><strong>Consequence:</strong> ${escape(item.consequence)}</p>` : ''}<p class="evidence">${escape(item.verification)}</p>${sourceLinks(item.evidence)}</div>`;
    }).join('');
    const behaviourChecks = checks.filter(check => check.dimension !== 'cfa');
    const cfaChecks = checks.filter(check => check.dimension === 'cfa');
    return `${behaviourChecks.length ? `<h3>Behaviour checks</h3>${rows(behaviourChecks)}` : ''}${cfaChecks.length ? `<h3>CFA alignment</h3>${rows(cfaChecks)}` : ''}${inapplicableChecks.length ? `<details><summary>Checks that don’t apply</summary>${rows(inapplicableChecks)}</details>` : ''}${applicableScenarios.length ? `<h3>When timing changes</h3>${rows(applicableScenarios)}` : ''}${inapplicableScenarios.length ? `<details><summary>Timing scenarios that don’t apply</summary>${rows(inapplicableScenarios)}</details>` : ''}`;
  };
  const renderOperation = op => {
    const status = operationStatus(op);
    const mark = {pass:'✓', concern:'?', problem:'×'}[status];
    const label = {pass:'Stable', concern:'Needs investigation', problem:'Problem'}[status];
    const hasCfaDeviation = op.checks?.some(check => check.dimension === 'cfa' && check.status === 'fail');
    const cfaBadge = hasCfaDeviation ? ' <small>· CFA deviation</small>' : '';
    const conflictBadge = op.problemKind === 'architectural-conflict'
      ? ' <small>· Architectural conflict</small>' : '';
    const trigger = op.trigger ? `<p><strong>Trigger:</strong> ${escape(op.trigger)}</p>` : '';
    const verification = op.verification ? `<p><strong>Verification:</strong> ${escape(op.verification)}</p>` : '';
    return `<details class="finding"><summary><span class="indicator ${status}" aria-label="${label}">${mark}</span>${escape(op.title)}${conflictBadge}${cfaBadge}</summary><div>${trigger}<p><strong>Path:</strong> ${escape(op.path)}</p><p><strong>State ownership:</strong> ${escape(op.stateOwner || "Not recorded")}</p><p><strong>Task ownership:</strong> ${escape(op.taskOwner)}</p><p><strong>Isolation:</strong> ${escape(op.isolation)}</p><p>${escape(op.reason)}</p>${op.steps?.length ? `<ol>${op.steps.map(step => `<li><strong>${escape(step.title)}</strong> · ${escape(step.relation)}${step.parentId ? ` · parent: ${escape(op.steps.find(parent => parent.id === step.parentId)?.title || step.parentId)}` : ''}<br>${escape(step.detail)}${step.taskLocation ? `<br><span class="evidence">Task site: ${escape(step.taskLocation)}</span>` : ''}${step.evidence?.length ? `<br><span class="evidence">${escape(evidenceText(step.evidence))}</span>` : ''}</li>`).join('')}</ol>` : ''}${outcomes(op)}${verification}${sourceLinks(op.evidence)}${op.recommendation ? `<h3>Suggested change</h3><p>${escape(op.recommendation)}</p>` : ''}${op.unknowns?.length ? `<p><strong>To investigate:</strong> ${op.unknowns.map(escape).join('; ')}</p>` : ''}</div></details>`;
  };
  const groups = new Map();
  for (const op of data.operations || []) {
    const name = op.group || '';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(op);
  }
  const operations = groups.size ? `<section><h2>${escape(data.app)} App Workflow</h2>${[...groups].map(([name, items]) => `${name ? `<h3 class="operation-group">${escape(name)}</h3>` : ''}${items.map(renderOperation).join('')}`).join('')}</section>` : '';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(data.app)} · Concurrency Health Check</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#111214;color:#f2f3f4;font:17px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.wrap{max-width:940px;margin:auto;padding:64px 30px 90px}header{display:flex;align-items:center;gap:22px}.icon{width:76px;height:76px;border-radius:18px;object-fit:cover;box-shadow:0 8px 30px #0006}.placeholder{display:grid;place-items:center;background:#292b30;font-size:30px}h1{font-size:clamp(2rem,5vw,3.4rem);line-height:1.08;letter-spacing:-.04em;margin:7px 0}h2{font-size:1.4rem;margin:0 0 22px}h3{font-size:1.04rem;margin:0 0 5px;line-height:1.4}.eyebrow{font-size:.76rem;text-transform:uppercase;letter-spacing:.17em;color:#aab1b6;font-weight:700}.app{color:#d2d7db;font-weight:600}.intro{font-size:1.15rem;color:#d4d8db;max-width:800px;margin:32px 0}.verdict{display:flex;gap:25px;align-items:center;border:1px solid #373b3f;background:#1b1d20;border-radius:18px;padding:25px 28px;margin:36px 0}.verdict>div:first-child{border-right:1px solid #96a4aa;padding-right:25px}.number{font-size:3.6rem;font-weight:750;letter-spacing:-.05em;line-height:1}.caption{color:#b5bec2;font-size:.88rem;margin-top:6px}.stamp{display:inline-block;border:1px solid;border-radius:6px;padding:3px 9px;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;font-weight:800}.partial{color:#f5c878;border-color:#9b7430}.positive{color:#8de2ac;border-color:#4f996a}.negative{color:#ff9999;border-color:#a64b4b}section{margin:48px 0}.finding{display:flex;gap:14px;padding:19px 0;border-top:1px solid #33373b}.finding p{margin:0;color:#cbd0d4}.indicator{flex:none;width:25px;height:25px;border-radius:7px;display:grid;place-items:center;font-weight:800;line-height:1}.pass{background:#176739;color:#a7f4bf}.concern{background:#725019;color:#ffe0a0}.problem{background:#7a282c;color:#ffd0d0}.evidence{font-size:.85rem;color:#92a4ad!important;margin-top:8px!important;overflow-wrap:anywhere}.conclusion{border-top:1px solid #33373b;padding-top:36px}.conclusion-heading{display:flex;align-items:center;gap:18px;margin-bottom:20px}.conclusion-mark{width:54px;height:54px;flex:none;display:grid;place-items:center;border-radius:50%;font-size:1.7rem;font-weight:750;line-height:1}.conclusion-mark.pass{background:#153d29;color:#95e9b3;box-shadow:0 0 0 7px #58c98715}.conclusion-mark.concern{background:#4a3514;color:#ffda8a;box-shadow:0 0 0 7px #ffcc6715}.conclusion-mark.problem{background:#4b1d21;color:#ffaaaa;box-shadow:0 0 0 7px #ff888815}.conclusion h2{margin:0}.conclusion p{margin:0;color:#cbd0d4;max-width:760px}.conclusion-list{list-style:none;margin:0;padding:0;color:#cbd0d4;max-width:760px}.conclusion-list li{display:flex;gap:12px;align-items:baseline;margin:9px 0}.conclusion-tick{font-weight:750;background:transparent}.conclusion-tick.pass{color:#8de2ac}.conclusion-tick.concern{color:#ffda8a}.conclusion-tick.problem{color:#ffaaaa}.method{font-size:.85rem;color:#aeb7bb;margin-top:30px}.operation-group{margin:52px 0 18px;color:#b5bec2}.behaviour-row{padding:10px 0;border-top:1px solid #33373b}.behaviour-row p{margin:4px 0}details.finding{display:block;border:1px solid #40464b;border-radius:10px;background:#191b1e;padding:18px 20px;margin:10px 0}details.finding[open]{border-color:#68777d}details.finding summary{cursor:pointer;font-weight:700}details.finding summary .indicator{display:inline-grid;vertical-align:middle;margin:0 10px 0 6px}details.finding>div{padding:12px 0 0}details.finding p{margin:6px 0} @media(max-width:550px){.wrap{padding:36px 20px}.verdict{align-items:flex-start;flex-direction:column}.verdict>div:first-child{border-right:0;padding-right:0}header{align-items:flex-start}.icon{width:58px;height:58px;border-radius:14px}}
</style></head><body><main class="wrap"><header>${icon}<div><div class="eyebrow">Swift Concurrency</div><div class="app">${escape(data.app)}</div><h1>Health Check</h1></div></header><p class="intro">${escape(data.summary)}</p><div class="verdict"><div><div class="number">${data.qualitativeOnly ? resultMark : score + '%'}</div><div class="caption">${data.qualitativeOnly ? 'Result' : 'Health score'}</div></div><div><span class="stamp ${stampClass}">${stamp}</span><div class="caption">${escape(data.verdict)}</div>${conflictVerdict}</div></div>${sections}${operations}<section class="conclusion"><div class="conclusion-heading"><span class="conclusion-mark ${conclusionStatus}" aria-hidden="true">${conclusionSymbol}</span><h2>Conclusion</h2></div>${conclusionList}${data.conclusionNote ? `<p class="method">${escape(data.conclusionNote)}</p>` : ''}</section></main></body></html>`;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.error('Use whole-app-health.mjs to inventory the project and validate review coverage before generating a Health Check.');
  process.exitCode = 1;
}
