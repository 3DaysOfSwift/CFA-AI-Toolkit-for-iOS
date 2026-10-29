const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={sound:'✅ Stable',problem:'❌ Problem',investigate:'⚠️ Needs investigation',unassessed:'➖ Not assessed'};
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
export function operationStatus(op) {
  return [op.correctness,op.clarity].sort((a,b)=>priority[a]-priority[b])[0];
}
export function operationAssessments(review) {
  const operations=review?.operations??[];
  const counts=Object.fromEntries(Object.keys(labels).map(s=>[s,operations.filter(o=>operationStatus(o)===s).length]));
  const inventory=review?.operationInventory;
  const complete=inventory?.coverage==='complete' && operations.length>0 && !counts.investigate && !counts.unassessed;
  const conflicts=operations.filter(o=>operationStatus(o)==='problem'&&o.problemKind==='architectural-conflict');
  const verdict=conflicts.length?'Yes — architectural conflicts identified':complete?'No architectural conflicts identified in the assessed scope':'Inconclusive — assessment coverage is incomplete';
  const correctnessProblems=operations.filter(o=>o.correctness==='problem').length;
  const correctnessOpen=operations.filter(o=>o.correctness==='investigate'||o.correctness==='unassessed').length;
  const correctnessVerdict=correctnessProblems
    ? '❌ '+correctnessProblems+' operation'+(correctnessProblems===1?' has':'s have')+' a confirmed correctness problem.'
    : !operations.length ? '➖ No operations assessed yet.'
    : correctnessOpen ? '⚠️ Correctness is unresolved for '+correctnessOpen+' operation'+(correctnessOpen===1?'.':'s.')
    : '✅ Correctness checks passed for all '+operations.length+' assessed operations.';
  const field=(name,value)=>'<p><strong>'+name+':</strong> '+esc(value)+'</p>';
  const rows=[...operations].sort((a,b)=>priority[operationStatus(a)]-priority[operationStatus(b)]).map(op=>{
    const status=operationStatus(op);
    const sources=op.evidence.map(e=>'<details><summary>'+esc(e.file.split('/').pop())+' · Lines '+e.line+'–'+e.endLine+'</summary><p class="path">'+esc(e.file)+'</p><pre>'+esc(e.excerpt)+'</pre></details>').join('');
    const checkSummary=op.checks ? Object.entries(checkLabels).map(([status,label])=>[label,op.checks.filter(c=>c.dimension!=='cfa'&&c.status===status).length]).filter(([,count])=>count).map(([label,count])=>count+' '+label).join(' · ') : op.reason;
    const attention = op.checks
      ? op.checks.filter(c=>c.dimension!=='cfa' && ['fail','unresolved','not-checked'].includes(c.status)).map(c=>c.title+': '+(c.status==='fail'?c.consequence:c.status==='unresolved'?c.question:c.reason))
      : status==='investigate' ? op.unknowns : [];
    const attentionSummary=attention.map(text=>'<span style="display:block;font-weight:400;margin:6px 0;overflow-wrap:anywhere">'+esc(text)+'</span>').join('');
    return '<details class="review"><summary>'+labels[status]+' · '+esc(op.title)+'<span style="display:block;font-weight:400;margin:6px 0;overflow-wrap:anywhere">'+esc(checkSummary)+'</span>'+attentionSummary+'<span style="display:block;font-weight:400;margin:6px 0">Concurrency correctness: '+labels[op.correctness]+' · Architectural clarity: '+labels[op.clarity]+'</span></summary>'+renderChecks(op.checks)+field('Assessment',op.reason)+field('Correctness',labels[op.correctness])+field('Architectural clarity',labels[op.clarity])+(status==='problem'?field('Problem type',op.problemKind):'')+'<h3>What the code currently does</h3>'+[['Trigger',op.trigger],['Execution path',op.path],['Application state owner',op.stateOwner],['Task owner and lifetime',op.taskOwner],['Actor boundaries',op.isolation],['Verification performed',op.verification]].map(([k,v])=>field(k,v)).join('')+(op.unknowns.length?field('Unresolved boundaries',op.unknowns.join('; ')):'')+'<h3>Source evidence</h3>'+sources+(op.recommendation?'<h3>Suggested change</h3><p>'+esc(op.recommendation)+'</p>':'')+'</details>';
  }).join('');
  return {counts,verdict,html:'<h2>Does the reviewed code work correctly?</h2><p><strong>'+correctnessVerdict+'</strong></p>'+(inventory?.coverage!=='complete'?'<p>The operation inventory is incomplete; this is not a whole-app pass.</p>':'')+'<h3>Is this a Frankenstein architecture?</h3><p><strong>'+verdict+'</strong></p><p>Assessment of the recorded source snapshot. Source changes require a new analysis and review. These judgments describe the code; suggested changes are not implemented behavior.</p>'+(inventory?field('Scope',inventory.scope)+field('Entry-point discovery',inventory.method)+field('Inventory coverage',inventory.coverage):'')+'<p><strong>'+operations.length+' identified operations · '+counts.sound+' stable · '+counts.problem+' problems · '+counts.investigate+' need investigation · '+counts.unassessed+' not assessed</strong></p><p class="small muted">Coverage counts identified operations, not all possible runtime paths. A complete inventory is a reviewer assertion supported by the discovery method, not a scanner guarantee.</p>'+(rows||'<p class="empty">No operation assessments imported. Task counts cannot establish whether this architecture works well. Supply a source-linked review with the report’s --review option, including synchronous actions and lifecycle entry points.</p>')};
}
