export const missingTimingScenarios = operation => ['repeat', 'leave', 'late-result', 'failure']
  .filter(id => !operation.scenarios?.some(scenario => scenario.id === id && scenario.status !== 'unresolved'));

const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={sound:'✅ Stable',problem:'❌ Problem',investigate:'⚠️ Needs investigation',unassessed:'➖ Not assessed'};
const cfaLabels={sound:'✅ Pass',problem:'❌ Fail',investigate:'⚠️ Needs investigation',unassessed:'➖ Not assessed'};
const priority={problem:0,investigate:1,unassessed:2,sound:3};
export function checkOutcome(checks,dimension) {
  const applicable=checks.filter(c=>c.dimension===dimension && c.status!=='not-applicable');
  if(applicable.some(c=>c.status==='fail')) return 'problem';
  if(applicable.some(c=>c.status==='unresolved')) return 'investigate';
  if(!applicable.length || applicable.some(c=>c.status==='not-checked')) return 'unassessed';
  return 'sound';
}
const checkLabels={pass:'✅ Pass',fail:'❌ Fail',unresolved:'⚠️ Unresolved','not-checked':'➖ Not checked','not-applicable':'— Not applicable'};
function renderChecks(checks) {
  if(!checks) return '';
  return ['correctness','clarity','cfa'].map(dimension=>{
    const group=checks.filter(c=>c.dimension===dimension);
    if(!group.length) return '';
    return '<h3>'+({correctness:'Swift Concurrency checks',clarity:'Architectural clarity',cfa:'CFA conformance'})[dimension]+'</h3>'+group.map(c=>'<div class="entry"><strong>'+checkLabels[c.status]+' · '+esc(c.title)+'</strong><p>'+esc(c.reason)+'</p>'+(c.status==='unresolved'?'<p><strong>Open question:</strong> '+esc(c.question)+'</p><p><strong>How to resolve:</strong> '+esc(c.resolveBy)+'</p>':'')+(c.status==='fail'?'<p><strong>Consequence:</strong> '+esc(c.consequence)+'</p>':'')+'<details><summary>Evidence and verification</summary><p>'+esc(c.verification)+'</p>'+c.evidence.map(e=>'<p class="path">'+esc(e.file)+' · '+e.line+'–'+e.endLine+'</p><pre>'+esc(e.excerpt)+'</pre>').join('')+'</details></div>').join('');
  }).join('');
}
function renderSteps(steps) {
  if (!steps?.length) return '';
  const names = {event:'Event', 'same-task':'Same task / synchronous call', 'child-task':'Structured child task', 'unstructured-task':'Unstructured task', 'framework-task':'Framework-owned task', unknown:'Relationship unknown'};
  const seen = new Map();
  return '<h3>Event and task tree</h3><p class="small muted">Source-reviewed relationships, not a runtime recording.</p>'+steps.map(step => {
    const depth = step.parentId ? (seen.get(step.parentId) ?? 0) + 1 : 0;
    seen.set(step.id,depth);
    return '<div class="entry" style="margin-left:'+Math.min(depth,5)*18+'px"><strong>'+esc(names[step.relation])+' · '+esc(step.title)+'</strong><p>'+esc(step.detail)+'</p>'+step.evidence.map(e=>'<details><summary>'+esc(e.file)+' · '+e.line+'–'+e.endLine+'</summary><pre>'+esc(e.excerpt)+'</pre></details>').join('')+'</div>';
  }).join('');
}
function renderTimingScenarios(scenarios = []) {
  if (!scenarios.length) return '';
  const statuses = {pass:'Pass', problem:'Problem', unresolved:'Unresolved', 'not-applicable':'Not applicable'};
  const rows = scenarios.map(scenario => {
    const sources = (scenario.evidence || []).map(ref =>
      `<p class="path">${esc(ref.file)} · ${ref.line}–${ref.endLine}</p><pre>${esc(ref.excerpt)}</pre>`
    ).join('');
    return `<details class="entry"><summary>${esc(statuses[scenario.status])} · ${esc(scenario.title || scenario.id)}</summary><p>${esc(scenario.outcome)}</p>${scenario.consequence ? `<p>${esc(scenario.consequence)}</p>` : ''}<p>${esc(scenario.verification)}</p>${sources}</details>`;
  }).join('');
  return '<h3>When timing changes</h3>' + rows;
}

export function operationStatus(op) {
  return [op.correctness,op.clarity].sort((a,b)=>priority[a]-priority[b])[0];
}
export function operationAssessments(review) {
  const expectsTiming = operation => operation.scenarios !== undefined || review?.behaviourScenariosRequired === true;
  const operations=(review?.operations??[]).map(operation => {
    const scenarios = operation.scenarios || [];
    if (scenarios.some(scenario => scenario.status === 'problem')) {
      return {...operation, correctness:'problem', problemKind:operation.problemKind || 'local-defect'};
    }
    const unresolvedBoundary = operation.steps?.some(step => step.relation === 'unknown') ||
      (operation.clarity === 'sound' && operation.unknowns?.length);
    const unresolvedTiming = expectsTiming(operation) && missingTimingScenarios(operation).length;
    if (operation.correctness === 'sound' && (unresolvedBoundary || unresolvedTiming)) {
      return {...operation, correctness:'investigate'};
    }
    return operation;
  });
  const counts=Object.fromEntries(Object.keys(labels).map(s=>[s,operations.filter(o=>operationStatus(o)===s).length]));
  const inventory=review?.operationInventory;
  const cfaCounts=Object.fromEntries(Object.keys(cfaLabels).map(status=>[status,operations.filter(op=>checkOutcome(op.checks??[],'cfa')===status).length]));
  const complete = inventory?.coverage === 'complete' && operations.length > 0 &&
    operations.every(op => [op.correctness, op.clarity].every(status => status === 'sound' || status === 'problem') &&
      !op.unknowns?.length && !op.steps?.some(step => step.relation === 'unknown') &&
      (!expectsTiming(op) || !missingTimingScenarios(op).length));
  const conflicts=operations.filter(o=>operationStatus(o)==='problem'&&o.problemKind==='architectural-conflict');
  const verdict=conflicts.length?'Yes — architectural conflicts identified':complete?'No architectural conflicts identified in the assessed scope':'Inconclusive — assessment coverage is incomplete';
  const correctnessProblems=operations.filter(o=>o.correctness==='problem').length;
  const correctnessOpen=operations.filter(o=>o.correctness==='investigate'||o.correctness==='unassessed').length;
  const correctnessVerdict=correctnessProblems
    ? '❌ '+correctnessProblems+' operation'+(correctnessProblems===1?' has':'s have')+' a confirmed correctness problem.'
    : !operations.length ? '➖ No operations assessed yet.'
    : correctnessOpen ? '⚠️ Correctness is unresolved for '+correctnessOpen+' operation'+(correctnessOpen===1?'.':'s.')
    : operations.every(op => op.checks?.some(check => check.dimension === 'correctness' && check.status === 'pass'))
      ? '✅ Correctness checks passed for all '+operations.length+' assessed operations.'
      : '✅ No correctness problems were recorded in the '+operations.length+' assessed operations.';
  const field=(name,value)=>'<p><strong>'+name+':</strong> '+esc(value)+'</p>';
  const rows=[...operations].sort((a,b)=>priority[operationStatus(a)]-priority[operationStatus(b)]).map(op=>{
    const status=operationStatus(op);
    const cfaStatus=checkOutcome(op.checks??[],'cfa');
    const sources=op.evidence.map(e=>'<details><summary>'+esc(e.file.split('/').pop())+' · Lines '+e.line+'–'+e.endLine+'</summary><p class="path">'+esc(e.file)+'</p><pre>'+esc(e.excerpt)+'</pre></details>').join('');
    const checkSummary=op.checks ? Object.entries(checkLabels).map(([status,label])=>[label,op.checks.filter(c=>c.dimension!=='cfa'&&c.status===status).length]).filter(([,count])=>count).map(([label,count])=>count+' '+label).join(' · ') : op.reason;
    const attention = op.checks
      ? op.checks.filter(c=>c.dimension!=='cfa' && ['fail','unresolved','not-checked'].includes(c.status)).map(c=>c.title+': '+(c.status==='fail'?c.consequence:c.status==='unresolved'?c.question:c.reason))
      : [];
    const cfaAttention=(op.checks??[]).filter(c=>c.dimension==='cfa' && ['fail','unresolved','not-checked'].includes(c.status)).map(c=>'CFA · '+c.title+': '+(c.status==='fail'?c.consequence:c.status==='unresolved'?c.question:c.reason));
    const timingAttention=(op.scenarios??[]).filter(scenario=>['problem','unresolved'].includes(scenario.status)).map(scenario=>scenario.title+': '+(scenario.consequence || scenario.outcome));
    const unreviewedTiming = expectsTiming(op)
      ? missingTimingScenarios(op).filter(id => !op.scenarios?.some(scenario => scenario.id === id))
      : [];
    if (unreviewedTiming.length) timingAttention.push('Timing scenarios still to assess: '+unreviewedTiming.join(', '));
    const unresolvedSteps=(op.steps??[]).filter(step=>step.relation==='unknown').map(step=>step.title+': '+step.detail);
    const attentionSummary=[...attention,...op.unknowns,...unresolvedSteps,...timingAttention,...cfaAttention].map(text=>'<span style="display:block;font-weight:400;margin:6px 0;overflow-wrap:anywhere">'+esc(text)+'</span>').join('');
    return '<details class="review"><summary>'+labels[status]+' · '+esc(op.title)+'<span style="display:block;font-weight:400;margin:6px 0;overflow-wrap:anywhere">'+esc(checkSummary)+'</span>'+attentionSummary+'<span style="display:block;font-weight:400;margin:6px 0">Concurrency correctness: '+labels[op.correctness]+' · Architectural clarity: '+labels[op.clarity]+' · CFA conformance: '+cfaLabels[cfaStatus]+'</span></summary>'+renderChecks(op.checks)+renderTimingScenarios(op.scenarios)+field('Assessment',op.reason)+field('Correctness',labels[op.correctness])+field('Architectural clarity',labels[op.clarity])+(status==='problem'?field('Problem type',op.problemKind):'')+'<h3>What the code currently does</h3>'+[['Trigger',op.trigger],['Execution path',op.path],['Application state owner',op.stateOwner],['Task owner and lifetime',op.taskOwner],['Actor boundaries',op.isolation],['Verification performed',op.verification]].map(([k,v])=>field(k,v)).join('')+renderSteps(op.steps)+(op.unknowns.length?field('Unresolved boundaries',op.unknowns.join('; ')):'')+'<h3>Source evidence</h3>'+sources+(op.recommendation?'<h3>Suggested change</h3><p>'+esc(op.recommendation)+'</p>':'')+'</details>';
  }).join('');
  return {counts,verdict,html:'<h2>Does the reviewed code work correctly?</h2><p><strong>'+correctnessVerdict+'</strong></p>'+(inventory?.coverage!=='complete'?'<p>The operation inventory is incomplete; this is not a whole-app pass.</p>':'')+'<h3>CFA conformance</h3><p>'+cfaCounts.sound+' operations pass · '+cfaCounts.problem+' fail · '+cfaCounts.investigate+' need investigation · '+cfaCounts.unassessed+' not assessed.</p><p>CFA conformance is assessed separately from Swift Concurrency correctness.</p><h3>Is this a Frankenstein architecture?</h3><p><strong>'+verdict+'</strong></p><p>Assessment of the recorded source snapshot. Source changes require a new analysis and review. These judgments describe the code; suggested changes are not implemented behavior.</p>'+(inventory?field('Scope',inventory.scope)+field('Entry-point discovery',inventory.method)+field('Inventory coverage',inventory.coverage):'')+'<p><strong>'+operations.length+' identified operations · '+counts.sound+' stable · '+counts.problem+' problems · '+counts.investigate+' need investigation · '+counts.unassessed+' not assessed</strong></p><p class="small muted">Coverage counts identified operations, not all possible runtime paths. A complete inventory is a reviewer assertion supported by the discovery method, not a scanner guarantee.</p>'+(rows||'<p class="empty">No operation assessments imported. Task counts cannot establish whether this architecture works well. Supply a source-linked review with the report’s --review option, including synchronous actions and lifecycle entry points.</p>')};
}
