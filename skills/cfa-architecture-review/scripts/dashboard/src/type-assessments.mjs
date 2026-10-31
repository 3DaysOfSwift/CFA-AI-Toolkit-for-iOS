const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels = {sound:'✅ No problems found', problem:'❌ Problem', investigate:'⚠️ Needs investigation', unassessed:'➖ Not assessed'};
const issues = review => (review?.issues ?? []).map(issue => '<div class="entry"><strong>❌ '+escape(issue.title)+'</strong><p>'+escape(issue.detail)+'</p>'+issue.evidence.map(e=>'<details><summary>'+escape(e.file)+' · '+e.line+'–'+e.endLine+'</summary><pre>'+escape(e.excerpt)+'</pre></details>').join('')+'</div>').join('');

// Source declarations are candidates, not proof of target membership or a review.
export function typeAssessments(files, reviews = [], fileReviews = []) {
  const entries = new Map(reviews.map(r => [JSON.stringify([r.file, r.line, r.kind, r.name]), r]));
  const declarations = files.flatMap(file => file.declarations.map(d => ({...d, file:file.path})));
  const rows = declarations.map(d => {
    const review = entries.get(JSON.stringify([d.file,d.line,d.type,d.name]));
    const status = review?.status ?? 'unassessed';
    const evidence = (review?.evidence ?? []).map(e => '<p class="path">'+escape(e.file)+' · '+e.line+'–'+e.endLine+'</p><pre>'+escape(e.excerpt)+'</pre>').join('');
    const accepted = review?.acceptance ? '<p><strong>Accepted by developer:</strong> '+escape(review.acceptance.by)+' — '+escape(review.acceptance.reason)+'</p>' : '';
    return '<details class="review"><summary>'+labels[status]+' · '+escape(d.name)+' <span class="small muted">('+escape(d.type)+')</span></summary><p class="path">'+escape(d.file)+' · line '+d.line+'</p>'+(review?'<p>'+escape(review.reason)+'</p><p><strong>Verification:</strong> '+escape(review.verification)+'</p>':'<p>This declaration has not been reviewed.</p>')+issues(review)+accepted+evidence+'</details>';
  }).join('');
  const reviewedFiles = new Map(fileReviews.map(r => [r.file,r]));
  const fileRows = files.map(file => {
    const review = reviewedFiles.get(file.path);
    const accepted = review?.acceptance ? '<p><strong>Accepted by developer:</strong> '+escape(review.acceptance.by)+' — '+escape(review.acceptance.reason)+'</p>' : '';
    const evidence = (review?.evidence ?? []).map(e => '<p class="path">'+escape(e.file)+' · '+e.line+'–'+e.endLine+'</p><pre>'+escape(e.excerpt)+'</pre>').join('');
    return '<details class="review"><summary>'+labels[review?.status ?? 'unassessed']+' · '+escape(file.path)+'</summary>'+(review?'<p>'+escape(review.reason)+'</p><p><strong>Verification:</strong> '+escape(review.verification)+'</p>':'<p>This file has not been reviewed.</p>')+issues(review)+accepted+evidence+'</details>';
  }).join('');
  const counts = Object.fromEntries(Object.keys(labels).map(status => [status, declarations.filter(d => (entries.get(JSON.stringify([d.file,d.line,d.type,d.name]))?.status ?? 'unassessed')===status).length]));
  return {counts, html:'<h2>File and type review</h2><p>Review each file and type, then trace callers and app operations. A scan alone does not establish a pass.</p><p class="small muted">Declarations are lexical candidates; target membership, extensions, conditional compilation and runtime paths require review. An accepted problem remains a problem in this record.</p><h3>Files · '+files.length+'</h3>'+fileRows+'<h3>Types · '+declarations.length+'</h3><p><strong>'+counts.sound+' reviewed without identified problems · '+counts.problem+' problems · '+counts.investigate+' need investigation · '+counts.unassessed+' not assessed</strong></p>'+rows};
}
