const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={sound:'✅ Sound',problem:'❌ Problem',investigate:'⚠️ Needs investigation',unassessed:'➖ Not assessed'};
const priority={problem:0,investigate:1,unassessed:2,sound:3};
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
  const field=(name,value)=>'<p><strong>'+name+':</strong> '+esc(value)+'</p>';
  const rows=[...operations].sort((a,b)=>priority[operationStatus(a)]-priority[operationStatus(b)]).map(op=>{
    const status=operationStatus(op);
    const sources=op.evidence.map(e=>'<details><summary>'+esc(e.file.split('/').pop())+' · Lines '+e.line+'–'+e.endLine+'</summary><p class="path">'+esc(e.file)+'</p><pre>'+esc(e.excerpt)+'</pre></details>').join('');
    return '<details class="review"><summary>'+labels[status]+' · '+esc(op.title)+'<span style="display:block;font-weight:400;margin:6px 0;overflow-wrap:anywhere">'+esc(op.reason)+'</span></summary>'+field('Assessment',op.reason)+field('Correctness',labels[op.correctness])+field('Architectural clarity',labels[op.clarity])+(status==='problem'?field('Problem type',op.problemKind):'')+'<h3>What the code currently does</h3>'+[['Trigger',op.trigger],['Execution path',op.path],['Application state owner',op.stateOwner],['Task owner and lifetime',op.taskOwner],['Actor boundaries',op.isolation],['Verification performed',op.verification]].map(([k,v])=>field(k,v)).join('')+(op.unknowns.length?field('Unresolved boundaries',op.unknowns.join('; ')):'')+'<h3>Source evidence</h3>'+sources+(op.recommendation?'<h3>Suggested change</h3><p>'+esc(op.recommendation)+'</p>':'')+'</details>';
  }).join('');
  return {counts,verdict,html:'<h2>Is this a Frankenstein architecture?</h2><p><strong>'+verdict+'</strong></p><p>Assessment of the recorded source snapshot. Source changes require a new analysis and review. These judgments describe the code; suggested changes are not implemented behavior.</p>'+(inventory?field('Scope',inventory.scope)+field('Entry-point discovery',inventory.method)+field('Inventory coverage',inventory.coverage):'')+'<p><strong>'+operations.length+' identified operations · '+counts.sound+' sound · '+counts.problem+' problems · '+counts.investigate+' need investigation · '+counts.unassessed+' not assessed</strong></p><p class="small muted">Coverage counts identified operations, not all possible runtime paths. A complete inventory is a reviewer assertion supported by the discovery method, not a scanner guarantee.</p>'+(rows||'<p class="empty">No operation assessments imported. Task counts cannot establish whether this architecture works well. Supply a source-linked review with the report’s --review option, including synchronous actions and lifecycle entry points.</p>')};
}
