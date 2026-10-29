import {operationAssessments} from './operation-assessments.mjs';
import { folderReview } from './folders.mjs';
import { separation } from './separation.mjs';
import { definitions } from './definitions.mjs';
import { dashboard } from './dashboard.mjs';
import { observationCoverage } from './observations.mjs';
import {reviewPanels} from './review-panels.mjs';
import {taskLifetimes} from './task-lifetimes.mjs';
import {concurrencyReview} from './concurrency-review.mjs';
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function render(report) {
  report = { ...report, panels:reviewPanels(report.reviewData), folders: folderReview(report.files), separation: separation(report.observations?.separation), dashboard: dashboard(report.files), coverage: observationCoverage(report), definitions };
  report.dashboard.metrics.push(...taskLifetimes(report.files,report.reviewData?.taskLifetimes));
  report.concurrencyReview=concurrencyReview(report.reviewData?.concurrencyChecks);
  const data = JSON.stringify(report).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">
<title>${escapeHTML(report.project)} · Swift Architecture Explorer</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='10' fill='%23127977'/%3E%3Ctext x='20' y='28' text-anchor='middle' font-size='28' fill='white'%3ES%3C/text%3E%3C/svg%3E">
<style>
:root{color-scheme:light dark;--bg:#f4f7f6;--surface:#fff;--text:#173430;--muted:#566e69;--line:#cddbd6;--accent:#096e60;--wash:#e5f2eb;--amber:#80520c;--code:#edf2ef}
@media(prefers-color-scheme:dark){:root{--bg:#101c1b;--surface:#172725;--text:#e3f0eb;--muted:#adc4bb;--line:#344d46;--accent:#80ddbc;--wash:#223f35;--amber:#efc278;--code:#0c1916}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:1rem/1.55 ui-sans-serif,system-ui,sans-serif}button,input,select{font:inherit}button{cursor:pointer;color:inherit}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--accent);outline-offset:3px}button:disabled{cursor:default;opacity:.6}
.shell{max-width:1260px;margin:auto;padding:36px 32px 70px}.brand{font-size:.8rem;letter-spacing:.13em;text-transform:uppercase;color:var(--accent);font-weight:700}header{display:flex;justify-content:space-between;gap:20px;align-items:start;padding-bottom:26px;border-bottom:1px solid var(--line)}h1{font-size:clamp(2rem,5vw,3.4rem);line-height:1.15;letter-spacing:-.04em;margin:12px 0}h2{font-size:1.5rem;letter-spacing:-.025em}h3{font-size:1rem;margin:0 0 8px}p{max-width:70ch}.muted{color:var(--muted)}.small{font-size:.85rem}.tag{display:inline-block;padding:4px 10px;border-radius:6px;background:var(--wash);color:var(--accent);font-size:.8rem;font-weight:650}.status{text-align:right;min-width:170px}nav{display:flex;gap:8px;flex-wrap:wrap;margin:24px 0 32px}nav button,.control{border:1px solid var(--line);border-radius:8px;padding:10px 15px;background:var(--surface)}nav button[aria-selected=true]{background:var(--text);color:var(--bg);border-color:var(--text)}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin:28px 0}.metric{border-top:2px solid var(--accent);padding-top:12px}.metric strong{display:block;font-size:2rem;line-height:1.25}.metric span{color:var(--muted);font-size:.9rem}
.map{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.column{min-width:0;border-top:1px solid var(--line);padding-top:18px}.file{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid var(--line);padding:14px 0;background:transparent}.file:hover{color:var(--accent)}.file strong{display:block;overflow-wrap:anywhere;font-weight:600}.file span{font-size:.8rem;color:var(--muted)}.entry{border-left:3px solid var(--accent);padding:8px 18px;margin:12px 0;overflow-wrap:anywhere}.layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:24px}.toolbar{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:18px}input,select{padding:10px 12px;border:1px solid var(--line);border-radius:7px;color:var(--text);background:var(--surface);max-width:100%}input{flex:1;min-width:180px}.items{max-height:650px;overflow:auto;padding:4px}.item{display:block;width:100%;text-align:left;background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:15px;margin-bottom:10px}.item[aria-pressed=true]{border-color:var(--accent);background:var(--wash)}.item strong,.item span{display:block;overflow-wrap:anywhere}.item span{font-size:.85rem;color:var(--muted)}.inspector{min-width:0;align-self:start;border-top:3px solid var(--accent);padding-top:18px}.path{overflow-wrap:anywhere;font-family:ui-monospace,monospace;font-size:.85rem}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--code);padding:18px;border-radius:8px;font: .85rem/1.65 ui-monospace,monospace}details{border-top:1px solid var(--line);padding:15px 0}summary{cursor:pointer;font-weight:600}.review{border-bottom:1px solid var(--line);padding:20px 0}.review header{padding:0;border:0}.review .tag{color:var(--amber);background:transparent;padding-left:0}.empty{padding:28px 0;color:var(--muted)}footer{margin-top:40px;padding-top:20px;border-top:1px solid var(--line)}[hidden]{display:none!important}
@media(max-width:760px){.shell{padding:24px 18px}header{display:block}.status{text-align:left;margin-top:18px}.layout,.map{grid-template-columns:1fr}.items{max-height:380px}.metrics{gap:12px}.metric strong{font-size:1.6rem}.metric span{font-size:.8rem}nav button{padding:8px 11px}.toolbar>*{width:100%}}
.dash-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}.dash-heading h2{margin-top:0}.score-grid,.dash-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.score,.dash-metric{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:20px;min-width:0;text-align:left}.score strong,.dash-metric strong{display:block;font-size:2.4rem;line-height:1.4}.score>span,.dash-metric>span{display:block}.overall{background:var(--wash);border-color:var(--accent)}.dash-metric>span:last-child{margin-top:12px}.dash-metric:disabled{opacity:1}.dash-metric:not(:disabled):hover{border-color:var(--accent)}.score details{margin-top:14px;padding-bottom:0}.score summary{font-size:.85rem}header h1{font-size:2rem}header p{margin-bottom:0}.shell{padding-top:24px}@media(max-width:760px){.score-grid,.dash-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:440px){.score-grid,.dash-grid{grid-template-columns:1fr}.dash-heading{align-items:start;flex-direction:column;margin-bottom:18px}}

/* Keep the useful numbers above the fold; explanations live in drill-downs. */
header{padding-bottom:14px}header h1{margin:6px 0;font-size:1.7rem}.status p{margin:6px 0}.shell{padding-top:20px}nav{margin:16px 0 20px}.dash-heading h2{font-size:1.25rem;margin-bottom:12px}.dash-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.dash-metric{padding:14px 18px}.dash-metric strong{font-size:2.5rem;line-height:1.15;font-variant-numeric:tabular-nums}.dash-metric>span:last-child{margin-top:6px;font-size:.9rem}.dash-metric:first-child{background:var(--wash);border-color:var(--accent)}.mix{margin-top:20px}.mix-label{display:flex;justify-content:space-between;gap:12px;font-size:.9rem}.mix-bar{height:9px;margin-top:10px;background:#768ac9;border-radius:8px;overflow:hidden}.mix-bar span{display:block;height:100%;background:var(--accent)}.mix p{margin:6px 0}.pending{border-top:1px solid var(--line);padding-top:12px;margin-top:16px;color:var(--muted)}.pending p{max-width:none;margin:6px 0}.pending h3{font-size:.9rem}#pending-metrics{font-size:.85rem}@media(max-width:760px){.dash-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.mix-label{flex-direction:column;gap:2px}.status{display:none}}@media(max-width:380px){.dash-metric{padding:12px}.dash-metric strong{font-size:2rem}}
.code-line{display:block;min-height:1.65em}.code-focus{background:var(--wash);border-left:3px solid var(--accent);font-weight:700}.line-number{display:inline-block;width:3.5em;color:var(--muted);font-weight:400;user-select:none}.definition{background:var(--wash);border:1px solid var(--line);border-radius:10px;padding:16px;margin:16px 0;font-size:.9rem}.definition p{margin:10px 0}.definition a{color:var(--accent)}.definition h3{font-size:1rem}.task-categories{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:16px 0}.category{background:var(--surface);border:1px solid var(--line);border-radius:9px;padding:10px 12px;text-align:left;min-width:0}.category strong{display:block;font-size:1.5rem;font-variant-numeric:tabular-nums;line-height:1.2}.category span{font-size:.8rem;display:block;margin-top:4px}.category[aria-pressed=true]{background:var(--wash);border:2px solid var(--accent);padding:9px 11px}.category:hover{border-color:var(--accent)}@media(max-width:760px){.task-categories{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:420px){.task-categories{grid-template-columns:repeat(2,minmax(0,1fr))}}.results-panel{margin-top:24px;padding:22px;background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:0 8px 28px #0000000c}.results-panel>h3{font-size:1.15rem;margin:0 0 18px;color:var(--accent)}.results-panel .item{background:var(--bg)}.results-panel .item[aria-pressed=true]{background:var(--wash)}.results-panel .inspector{border-top:1px solid var(--line)}@media(max-width:760px){.results-panel{padding:14px;margin-top:18px}}.empty-results{font-size:clamp(1.6rem,3vw,2.2rem);font-weight:650;line-height:1.3;text-align:center;max-width:none;padding:40px 12px;margin:0;color:var(--text)}.separation-gauge{display:flex;align-items:center;justify-content:space-between;gap:24px;border:1px solid var(--line);border-radius:12px;padding:18px;margin-top:16px;background:var(--surface)}.separation-gauge>div:first-child{max-width:65%}.gauge{position:relative;width:200px;flex-shrink:0;text-align:center}.gauge svg{width:100%;display:block}.gauge>strong{position:absolute;top:48px;left:0;width:100%;font-size:1.7rem}.gauge>span{font-size:.8rem}.gauge-scale{display:flex;justify-content:space-between;font-size:.75rem;color:var(--muted)}@media(max-width:600px){.separation-gauge{flex-direction:column}.separation-gauge>div:first-child{max-width:100%}}.architecture-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:20px}.folder-panel{padding:22px;border:1px solid var(--line);border-radius:12px;background:var(--surface);min-width:0}.folder-tree{list-style:none;padding-left:18px;border-left:1px solid var(--line);margin:8px 0}.folder-tree details{border:0;padding:3px 0}.folder-tree summary{font-size:.95rem;overflow-wrap:anywhere}.tree-file{padding:4px 0;color:var(--muted);font-size:.85rem;overflow-wrap:anywhere}.folder-check{display:flex;gap:14px;border-bottom:1px solid var(--line);padding:16px 0}.folder-check>span{font-size:1.5rem}.folder-check p{margin:5px 0}.check-yes{color:var(--accent)}.check-no{color:var(--amber)}@media(max-width:760px){.architecture-grid{grid-template-columns:1fr}}#reviews > details > summary{color:var(--amber)}</style></head><body><main class="shell">
<header><div><div class="brand">Analysis · Xcode Project dashboard</div><h1>${escapeHTML(report.project)}</h1><p class="muted">Current source snapshot · Architecture and concurrency analysis</p></div><div class="status"><span class="tag">ARCHITECTURE REPORT</span><p class="small muted">${escapeHTML(report.generatedAt.slice(0,10))}</p></div></header>
<nav role="tablist" aria-label="Report sections"><button id="tab-operations" role="tab" aria-controls="operations" aria-selected="true">Operation assessments</button><button id="tab-dashboard" role="tab" aria-controls="dashboard" aria-selected="false">Dashboard</button><button id="tab-overview" role="tab" aria-controls="overview" aria-selected="false">Search source files</button><button id="tab-tasks" role="tab" aria-controls="tasks" aria-selected="false">Tasks</button><button id="tab-journey-panel" role="tab" aria-controls="journey-panel" aria-selected="false">Task journeys</button><button id="tab-review" role="tab" aria-controls="review" aria-selected="false">Architecture review</button><button id="tab-method" role="tab" aria-controls="method" aria-selected="false">Definitions</button></nav>
<section id="operations" role="tabpanel" aria-labelledby="tab-operations">${operationAssessments(report.reviewData).html}</section>
<section id="dashboard" role="tabpanel" aria-labelledby="tab-dashboard" hidden><div class="dash-heading"><h2>Concurrency at a glance</h2></div><div id="dash-metrics" class="dash-grid"></div><div id="separation-gauge" class="separation-gauge"></div><div id="task-mix" class="mix"></div><p class="small muted">These numbers count instructions in the source code, not Tasks running now. Select a number to inspect the code.</p><details><summary>How to read these numbers</summary><div id="metric-definitions"></div><p id="dash-isolation" class="muted"></p><p id="dash-coverage"></p></details></section>
<section id="journey-panel" role="tabpanel" aria-labelledby="tab-journey-panel" hidden><h2>Task journeys</h2><p class="muted">Source-derived notes, not runtime recordings.</p><p id="dash-summary" class="small muted"></p><div id="journeys"></div><details><summary>Tasks and triggers without journey notes</summary><div id="remaining"></div></details></section>
<section id="overview" role="tabpanel" aria-labelledby="tab-overview" hidden><h2>Source files</h2><p class="muted">Select a file to inspect its task and scheduling instructions. These are source locations, not a call graph or runtime task counts.</p><div id="metrics" class="metrics"></div><h3>Application roots</h3><div id="roots"></div><h2>Task and scheduling locations</h2><div id="source-map" class="map"></div></section>
<section id="tasks" role="tabpanel" aria-labelledby="tab-tasks" hidden><h2>View results for</h2><div id="task-categories" class="task-categories" role="group" aria-label="Filter by concurrency category"></div><section class="results-panel" aria-labelledby="results-title"><h3 id="results-title" aria-live="polite">Results</h3><div class="toolbar"><input id="search" type="search" aria-label="Search source locations" placeholder="Search a file or task kind…"><select id="kind" aria-label="Filter by kind"><option value="all">All task & scheduling kinds</option></select></div><p class="small muted" id="match-count" aria-live="polite"></p><p id="empty-results" class="empty-results" role="status" hidden></p><div id="results-layout" class="layout"><div id="items" class="items"></div><aside id="inspector" class="inspector" aria-live="polite"></aside></div></section></section>
<section id="review" role="tabpanel" aria-labelledby="tab-review" hidden><h2>Architecture, made visible</h2><p class="muted">Folder organisation compared with the layered architecture template. These checks describe names and grouping—not verified business-logic separation.</p><div class="architecture-grid"><section class="folder-panel"><h3>Project structure</h3><p class="small muted">Expand folders to see their Swift files.</p><div id="folder-tree"></div></section><section class="folder-panel"><h3>Template alignment</h3><p class="small muted">✓ Match · ✕ No match · ? Not established</p><div id="folder-checks"></div></section></div><p class="small muted">Swift-file folders only. Empty folders, resources and Xcode virtual groups are not scanned. A cross means this naming/grouping rule did not match; a different architecture may be intentional.</p><h2>⚠️ Code Investigations</h2><p class="muted">Expand a warning to inspect the code and its context. A warning identifies something to investigate, not a confirmed defect.</p><div id="reviews"></div></section>
<section id="method" role="tabpanel" aria-labelledby="tab-method" hidden><h2>What this report can prove</h2><p>The scanner locates source patterns. Operation assessments are source-linked judgments supplied by the reviewer, not conclusions inferred from keyword counts.</p><div id="method-detail"></div><h2>Plain-English definitions</h2><div id="definitions"></div><h2>From inventory to understanding</h2><ol><li>Resolve the selected target, Swift language settings and live dependency wiring.</li><li>Trace one feature end to end; distinguish task creation from ordinary calls.</li><li>Review ownership, cancellation, state changes and ordering across suspension.</li><li>Attach tests or runtime traces to any suspected failure.</li><li>Agree a refactoring plan, preserve behaviour and compare the next report.</li></ol><p class="muted">Future review progress should count confirmed findings resolved against a recorded baseline—not invent a percentage of “clean” code.</p></section>
<footer class="small muted">Offline report · no analytics, external assets or network requests.<br/>Contains source excerpts. Review before sharing. No application files were modified.</footer>
</main><script>(${client.toString()})(${data});</script></body></html>`;
}

function client(report) {
  const $ = id => document.getElementById(id);
  $('tasks').insertAdjacentHTML('beforeend',report.concurrencyReview.html);
  $('dashboard').insertAdjacentHTML('beforeend','<section class="results-panel"><h2>Concurrency Warnings</h2><p>'+(report.reviewData?.concurrencyChecks?.length ? report.concurrencyReview.counts.warning+' warnings · '+report.concurrencyReview.counts.managed+' managed operations · '+report.concurrencyReview.counts.unresolved+' unresolved checks' : 'Operation reviews have not been imported.')+'</p><button class="control" id="show-concurrency">Review operation lifetimes →</button></section>');
  $('show-concurrency').addEventListener('click',()=>{tab('tasks');$('concurrency-warnings').scrollIntoView({block:'start'});});
  if(report.panels?.detail) {
    $('review').insertAdjacentHTML('beforeend',report.panels.detail);
    $('dashboard').insertAdjacentHTML('beforeend',report.panels.dashboard);
    $('show-authored-review').addEventListener('click',()=>{tab('review');$('authored-review').scrollIntoView({block:'start'});});
  }
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const all = report.files.flatMap(f => f.sites);
  const reviewKinds = new Set(['blocking','ui-rule']);
  const sites = all.filter(s => !reviewKinds.has(s.kind));
  const descriptions = {
    await: 'An await keyword is a potential suspension point, not proof of suspension or sequential execution. It does not create a task.',
    'main-actor': 'An explicit annotation. Inferred isolation, inherited isolation and workload are not measured by this count.',
    task: 'Task { … } creates an unstructured task. Even when created inside another task, it is not a structured child: cancellation is not automatically inherited from the creating task. Another button press does not cancel it automatically either. Inspect retained ownership and duplicate-request guards; absence of a stored handle alone does not establish a defect.',
    detached: 'A detached Task. Review captures, isolation and why inherited actor context is not desired.',
    'async-let': 'An async-let binding creates a structured child task whose lifetime is bounded by the enclosing scope. Check the enclosing scope and the point where its result is awaited.',
    group: 'This is a task-group scope, not a task count. Inspect additions and how results, errors and cancellation are handled.',
    'group-child': 'Verify the receiver is a Swift task group. One addition site can execute repeatedly and create many children.',
    'view-task': 'Verify this is SwiftUI’s task modifier. Inspect view identity, restart conditions and lifecycle cancellation.',
    refresh: 'A framework refresh callback. Inspect the awaited operation; do not invent the framework’s internal task tree.',
    gcd: 'Dispatch scheduling. Preserve serial ordering, QoS, deadlines and API requirements before considering migration.',
    blocking: 'Inspect the executor and cost of this operation. Synchronous disk work is not a suspension; its presence alone does not prove a UI hang.',
    'ui-rule': 'Check whether this operation is presentation-only or a reusable domain decision. Extract only confirmed business rules, not every conditional or calculation.'
  };
  function location(ref) {
    const filename=ref.file.split('/').pop();
    const lines=ref.endLine && ref.endLine!==ref.line ? 'Lines '+ref.line+'–'+ref.endLine : 'Line '+ref.line;
    return '<span title="'+esc(ref.file)+'">'+esc(filename)+' · '+lines+'</span>';
  }
  function unstructuredWarning() {
    return '<aside class="definition"><h3>Root Task lifetime</h3><p>Task { … } starts an independent root, even inside another Task. Keeping its handle makes it trackable; it does not create a structured parent–child relationship.</p><p>Check the lifetime filters for explicit waiting and cancellation forwarding. A synchronous button action has no parent Task obligation. A retained worker may intentionally outlive its caller.</p></aside>';
  }
  function definitionBox(kind, collapsed=false) {
    const d=report.definitions[kind];
    if(!d)return '';
    const body='<p>'+esc(d.meaning)+'</p><p>'+esc(d.detail)+'</p><p><strong>When to use it: </strong>'+esc(d.choice)+'</p>'+(d.source?'<a href="'+esc(d.source)+'" target="_blank" rel="noopener noreferrer">Official documentation ↗</a>':'');
    return (kind==='task'||kind==='detached'?unstructuredWarning():'')+(collapsed?'<details class="definition"><summary>💡 What is '+esc(d.title)+'?</summary>'+body+'</details>':'<aside class="definition"><h3>💡 What is '+esc(d.title)+'?</h3>'+body+'</aside>');
  }
  $('definitions').innerHTML=Object.keys(report.definitions).map(k=>definitionBox(k,true)).join('');
  function tab(name) {
    for (const key of ['operations','dashboard','overview','tasks','journey-panel','review','method']) {
      $('tab-'+key).setAttribute('aria-selected', String(name === key)); $(key).hidden = name !== key;
    }
  }
  for (const key of ['operations','dashboard','overview','tasks','journey-panel','review','method']) $('tab-'+key).addEventListener('click',()=>tab(key));
  const nav = document.querySelector('[role=tablist]');
  nav.addEventListener('keydown', e => {
    const keys = ['operations','dashboard','overview','tasks','journey-panel','review','method'], current = keys.findIndex(k => $('tab-'+k) === document.activeElement);
    if (current < 0 || !['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
    e.preventDefault(); const index = e.key === 'Home' ? 0 : e.key === 'End' ? keys.length-1 : (current + (e.key === 'ArrowRight' ? 1 : keys.length-1)) % keys.length;
    tab(keys[index]); $('tab-'+keys[index]).focus();
  });
  const taskCount = sites.filter(s => ['task','detached'].includes(s.kind)).length;
  const actors = report.files.flatMap(f => f.declarations).filter(d => d.type === 'actor').length;
  $('metrics').innerHTML = [[report.scope.fileCount,'Swift files scanned'],[taskCount,'Explicit Tasks'],[actors,'Actor declarations']].map(([n,t])=>'<div class="metric"><strong>'+n+'</strong><span>'+t+'</span></div>').join('');
  const roots = report.files.flatMap(f => f.entries);
  $('roots').innerHTML = roots.length ? roots.map(r=>'<div class="entry"><strong>'+esc(r.label)+'</strong><div class="path">'+location(r)+'</div></div>').join('') : '<p class="empty">No @main declaration found in this scope.</p>';
  const buckets = [ ['UI & presentation', f=> /(?:View|ViewModel)\.swift$/.test(f.path)||f.path.includes('1 - View/')], ['Model & features',f=>!/(?:Repository|Store|Client)\.swift$/.test(f.path)], ['Storage & integrations',()=>true] ];
  const groups = buckets.map(([label])=>({ label, files:[] }));
  for (const file of report.files.filter(f=>f.sites.some(s=>!reviewKinds.has(s.kind)))) groups[buckets.findIndex(([,matches])=>matches(file))].files.push(file);
  $('source-map').innerHTML = groups.map(g=>'<div class="column"><h3>'+esc(g.label)+'</h3>'+g.files.map(f=>'<button class="file" data-file="'+esc(f.path)+'"><strong>'+esc(f.path.split('/').pop())+'</strong><span>'+f.sites.filter(s=>!reviewKinds.has(s.kind)).length+' source matches · inspect →</span></button>').join('')+(g.files.length?'':'<p class="empty">No matches</p>')+'</div>').join('');
  $('source-map').addEventListener('click',e=>{const button=e.target.closest('[data-file]');if(!button)return;dashboardMetric=null;$('search').value=button.dataset.file;$('kind').value='all';tab('tasks');draw();$('search').focus();});
  for (const kind of [...new Set(sites.map(s=>s.kind))]) { const option=document.createElement('option');option.value=kind;option.textContent=sites.find(s=>s.kind===kind).label;$('kind').append(option); }
  let selected;
  let dashboardMetric = null;
  function lifetimeDetail(site) {
    if(!['task','detached'].includes(site.kind)) return '';
    const r=report.reviewData?.taskLifetimes?.find(r=>r.siteId===site.id);
    if(!r)return '<aside class="definition"><h3>Lifetime analysis incomplete</h3><p>Handle ownership, creating context, waiting and cancellation policy have not been resolved for this Task.</p></aside>';
    // A missing automatic relationship can be intentional (shared loads/saves).
    // Orange requires a source-reviewed warning, not the classification alone.
    const warning=report.reviewData?.concurrencyChecks?.some(c=>c.siteId===site.id&&c.status==='warning');
    return '<aside class="definition"'+(warning?' style="border:2px solid var(--amber)"':'')+'><h3>'+(warning?'⚠️ ':'')+'Task lifetime</h3><ul><li>Handle: '+esc(r.handle)+'</li><li>Creating context: '+esc(r.creator)+'</li><li>Creator waits: '+esc(r.wait)+'</li><li>Cancellation: '+esc(r.cancellation)+'</li></ul><p>'+esc(r.policy)+'</p>'+r.evidence.map(e=>'<p class="small">'+location(e)+'</p><pre>'+esc(e.excerpt)+'</pre>').join('')+'</aside>';
  }
  function inspect(site) {
    selected=site.id;
    document.querySelectorAll('[data-site]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.site===selected)));
    $('inspector').innerHTML='<span class="tag">SOURCECODE</span><h2>'+esc(site.label)+'</h2><p class="path">'+location(site)+'</p><pre>'+site.excerpt.split('\n').map((line,i)=>{const n=(site.excerptStartLine ?? Math.max(1,site.line-2))+i;return '<span class="code-line '+(n===site.line?'code-focus':'')+'"><span class="line-number">'+n+'</span>'+esc(line)+'</span>';}).join('')+'</pre>'+lifetimeDetail(site)+definitionBox(site.kind);
  }
  function draw() {
    const categories=[{id:'all',label:'All source locations',value:sites.length},...report.dashboard.metrics.filter(m=>m.value!==null)];
    $('task-categories').innerHTML=categories.map(m=>'<button class="category" data-metric="'+esc(m.id)+'" aria-pressed="'+String(dashboardMetric ? dashboardMetric.id===m.id : m.id==='all' && $('kind').value==='all')+'"><strong>'+m.value+'</strong><span>'+esc(m.label)+'</span></button>').join('');

    const q=$('search').value.toLowerCase(), kind=$('kind').value;
    const isUI = file => file.endsWith('View.swift') || file.endsWith('ViewModel.swift') || file.includes('1 - View/');
    const isModel = file => !isUI(file) && (file.includes('2 - AppModel/') || /(?:^|\/)(?:Model|Features)\//.test(file) || /(?:Manager|Worker|Repository|Store|Client|AppModel)\.swift$/.test(file));
    const matchesMetric = s => !dashboardMetric || (dashboardMetric.kinds.includes(s.kind) &&
      (!dashboardMetric.siteIds || dashboardMetric.siteIds.includes(s.id)) &&
      (dashboardMetric.id !== 'ui-main' || isUI(s.file)) &&
      (dashboardMetric.id !== 'feature-main' || isModel(s.file)) &&
      (dashboardMetric.id !== 'model-tasks' || isModel(s.file)) &&
      (dashboardMetric.id !== 'viewmodel-tasks' || s.file.endsWith('ViewModel.swift')));
    const found=sites.filter(s=>matchesMetric(s) && (kind==='all'||s.kind===kind)&&(s.file+' '+s.label).toLowerCase().includes(q));
    const filterLabel=dashboardMetric?.label ?? (kind==='all'?'All source locations':sites.find(s=>s.kind===kind)?.label ?? kind);
    $('results-title').textContent='Results · '+filterLabel;
    $('match-count').textContent=found.length+' source matches';
    $('match-count').hidden=!found.length;
    $('results-layout').hidden=!found.length;
    $('empty-results').hidden=!!found.length;
    const emptyLabels={creation:'No tasks',unstructured:'No unstructured tasks',detached:'No detached tasks',children:'No child tasks',await:'No await expressions',framework:'No SwiftUI Tasks','viewmodel-tasks':'No ViewModel Tasks','model-tasks':'No Model Tasks','ui-main':'No MainActor UI annotations','feature-main':'No Model MainActor annotations'};
    $('empty-results').textContent=found.length ? '' : q.trim() ? 'No results for this search' : emptyLabels[dashboardMetric?.id ?? kind] ?? 'No results';
    $('items').innerHTML=found.map(s=>'<button class="item" data-site="'+esc(s.id)+'" aria-pressed="false"><strong>'+esc(s.label)+'</strong><span>'+location(s)+'</span></button>').join('');
    if(found.length)inspect(found.find(s=>s.id===selected)||found[0]);else $('inspector').innerHTML='';
  }
  $('items').addEventListener('click',e=>{const button=e.target.closest('[data-site]');if(button)inspect(sites.find(s=>s.id===button.dataset.site));});
  $('search').addEventListener('input',draw);$('kind').addEventListener('change',()=>{dashboardMetric=null;draw();});draw();
  const score=report.separation;
  // Keep measured test execution separate from reviewed architectural decisions.
  const testCoverage = report.testCoverage;
  let coveragePanel = document.createElement('div');
  coveragePanel.className = 'separation-gauge';
  const cv = testCoverage?.value ?? null;
  coveragePanel.innerHTML='<div><h3>Test coverage</h3><p class="small muted">'+(testCoverage ? esc(testCoverage.target)+' · '+testCoverage.coveredLines+' / '+testCoverage.executableLines+' executable lines reached' : 'No Xcode coverage report imported')+'</p><details><summary>What this measures</summary><p class="small">The percentage of executable lines reached during the imported test run. It does not prove every decision or outcome was tested.</p><p class="small">'+(testCoverage ? esc(testCoverage.source)+' · '+esc(testCoverage.sourceAlignment)+'. This may describe an older or differently configured build.' : 'Enable code coverage in your Xcode test plan, run tests, then import the xccov JSON report for your app target.')+'</p></details></div><div class="gauge" role="img" aria-label="Test coverage: '+(cv===null?'not measured':cv+' percent')+'"><svg viewBox="0 0 200 115" aria-hidden="true"><path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke="var(--line)" stroke-width="13"/>'+(cv===null?'':'<path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke="var(--accent)" stroke-width="13" pathLength="100" stroke-dasharray="'+cv+' 100"/>')+'</svg><strong>'+(cv===null?'—':cv+'%')+'</strong><span>'+(cv===null?'Not measured':'Imported test run')+'</span><div class="gauge-scale"><span>0%</span><span>100%</span></div></div>';
  if(report.testRun && testCoverage) {
    $('separation-gauge').after(coveragePanel);
    coveragePanel=document.createElement('div');
    coveragePanel.className='separation-gauge';
  }
  if(report.testRun) {
    const run=report.testRun;
    const passRate=run.totalTestCount>0 ? Math.max(0,Math.min(100,100*run.passedTests/run.totalTestCount)) : null;
    coveragePanel.innerHTML='<div><h3>Test results</h3><p><strong>'+esc(run.outcome==='failed'?'❌ Xcode run failed':run.outcome==='passed'?'✅ Xcode run passed':'⚠️ Overall run outcome unverified')+'</strong></p><p class="small muted">'+esc(run.failedTests)+' failed · '+esc(run.skippedTests)+' skipped</p><p class="small muted">Imported Xcode run · '+esc(new Date(run.startTime*1000).toISOString())+'</p><details><summary>What this measures</summary><p class="small">Passed tests divided by the total reported by Xcode, including skipped tests. Passing tests are not code coverage. Source alignment is not verified; code coverage, when supplied, is shown separately.</p></details></div><div class="gauge" role="img" aria-label="'+esc(run.passedTests)+' of '+esc(run.totalTestCount)+' tests passed"><svg viewBox="0 0 200 115" aria-hidden="true"><path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke="var(--line)" stroke-width="13"/>'+(passRate===null?'':'<path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke="var(--accent)" stroke-width="13" pathLength="100" stroke-dasharray="'+passRate+' 100"/>')+'</svg><strong style="font-size:1.45rem">'+esc(run.passedTests)+' / '+esc(run.totalTestCount)+'</strong><span>'+(passRate===null?'No tests reported':Math.round(passRate*10)/10+'% passed')+'</span><div class="gauge-scale"><span>0%</span><span>100%</span></div></div>';
  }
  if(report.testRun || testCoverage) $('separation-gauge').after(coveragePanel);
  if(score.value===null) $('separation-gauge').hidden=true;
  const decisionReview=report.observations?.separation;
  const decisions=decisionReview?.decisions ?? [];
  const decisionPanel=document.createElement('section');
  const sourceEvidence = ref => '<p class="path">'+location(ref)+'</p><pre>'+(ref.excerpt ?? 'Source excerpt unavailable').split('\n').map((line,i)=>'<span class="code-line '+(i===0?'code-focus':'')+'"><span class="line-number">'+(ref.line+i)+'</span>'+esc(line)+'</span>').join('')+'</pre>';
  const testLabel = d => d.testStatus==='identified' ? 'Test identified' : d.testStatus==='not-identified' ? 'No test identified in this review' : 'Tests not reviewed';
  decisionPanel.innerHTML='<h2>Business decisions</h2><p class="small muted">'+(decisionReview ? (decisionReview.complete?'Complete':'Partial')+' business-decision review. '+esc(decisionReview.rationale) : 'Not reviewed yet. These counts require reading product rules, not counting every if statement.')+'</p><div class="score-grid">'+[['ui','SwiftUI Views'],['viewmodel','ViewModels'],['model','Model'],...(decisions.some(d=>d.location==='other')?[['other','Other']]:[])].map(([key,label])=>'<div class="score"><strong>'+(decisionReview?decisions.filter(d=>d.location===key).length:'—')+'</strong><span>'+(decisionReview?'Reviewed business decisions':'Not reviewed')+'</span><span class="small muted">'+label+'</span></div>').join('')+'</div><h2>Testable areas</h2><p class="small muted">Testable means the rule can be exercised without constructing the UI. “No test identified” is a review finding, not proof that a test does not exist. Highlighted lines locate the decision—not measured uncovered lines.</p>'+(['not-identified','unknown','identified'].map(status=>decisions.filter(d=>d.testable && (d.testStatus ?? 'unknown')===status).map(d=>'<details class="review"><summary>'+esc(d.description)+' · '+testLabel(d)+'</summary>'+d.evidence.map(sourceEvidence).join('')+'<p class="small">'+esc(d.testNote ?? '')+'</p>'+(d.testReference?'<p class="small">Test reference: '+esc(d.testReference)+'</p>':'')+'</details>').join('')).join('') || '<p class="empty">No testable decisions reviewed yet.</p>')+'<details><summary>All reviewed business decisions</summary>'+decisions.map(d=>'<article class="review"><h3>'+esc(d.description)+'</h3><span class="tag">'+esc(d.location)+' · '+(d.testable?'Testable':'Requires UI isolation')+'</span>'+d.evidence.map(sourceEvidence).join('')+'</article>').join('')+'</details>';
  $('review').prepend(decisionPanel);
  $('separation-gauge').innerHTML='<div><h3>UI / Model separation</h3><p class="small muted">'+esc(score.reason)+'</p><details><summary>How this percentage works</summary><p class="small">Testable model business-rule groups divided by reviewed business-rule groups, equally weighted. A rating labelled Reviewed rules only does not claim an exhaustive whole-app assessment. UI and ViewModel business decisions lose points; presentation-only decisions are excluded. No meaningful testable model boundary means 0%. One or two isolated testable functions do not establish that boundary. This is not test coverage.</p></details></div><div class="gauge" role="img" aria-label="UI / Model separation: '+(score.value===null?'not assessed':score.value+' percent'+(score.partial?', reviewed rules only':''))+'"><svg viewBox="0 0 200 115" aria-hidden="true"><path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke="var(--line)" stroke-width="13"/>'+(score.value===null?'':'<path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke="var(--accent)" stroke-width="13" pathLength="100" stroke-dasharray="'+score.value+' 100"/>')+'</svg><strong>'+(score.value===null?'—':score.value+'%')+'</strong><span>'+(score.value===null?'Not assessed':(score.partial?'Reviewed rules only':'Reviewed separation'))+'</span><div class="gauge-scale"><span>0%</span><span>100%</span></div></div>';
  const dash = report.dashboard;
  const coverage = report.coverage;
  $('dash-summary').textContent=coverage.documented+' of '+coverage.total+' Tasks and UI triggers have journey notes. '+coverage.remaining.length+' remain unexplored.';
  const notes = report.observations;
  $('journeys').innerHTML = notes ? '<p class="small muted">'+esc(notes.author)+' · '+esc(notes.createdAt)+' · '+esc(notes.scope)+'</p>'+notes.journeys.map(j=>'<article class="review"><h3>'+esc(j.title)+'</h3><p>'+esc(j.scope)+'</p><ol>'+j.steps.map(s=>'<li><strong>'+esc(s.action)+'</strong><p class="small muted">'+esc(s.task)+' · '+esc(s.context)+'</p>'+s.evidence.map(r=>'<details><summary class="path">'+location(r)+'</summary><pre>'+esc(r.excerpt ?? 'Source excerpt unavailable')+'</pre></details>').join('')+'</li>').join('')+'</ol><h3>Not established / outside this journey</h3><ul>'+j.unknowns.map(u=>'<li>'+esc(u)+'</li>').join('')+'</ul></article>').join('') : '<p class="empty">No journey observations imported. Source counts are on the Dashboard tab.</p>';
  $('remaining').innerHTML = coverage.remaining.map(s=>'<button class="item" data-unreviewed="'+esc(s.id)+'">'+esc(s.label)+' · '+location(s)+'</button>').join('') || '<p>Every scanned Task or trigger has notes. This does not establish complete runtime coverage.</p>';
  $('remaining').addEventListener('click',e=>{const b=e.target.closest('[data-unreviewed]');if(!b)return;dashboardMetric=null;const s=sites.find(s=>s.id===b.dataset.unreviewed);$('search').value=s.file;$('kind').value=s.kind;selected=s.id;tab('tasks');draw();});
  $('dash-metrics').innerHTML=dash.metrics.filter(m=>m.value!==null).map(m=>'<button class="dash-metric" data-metric="'+esc(m.id)+'" title="'+esc(m.detail)+'"><strong>'+m.value+'</strong><span>'+esc(m.label)+'</span></button>').join('');
  $('metric-definitions').innerHTML=dash.metrics.filter(m=>m.value!==null).map(m=>'<p class="small"><strong>'+esc(m.label)+': </strong>'+esc(m.detail)+'</p>').join('');
  const total=dash.metrics.find(m=>m.id==='creation').value;
  const unstructured=dash.metrics.find(m=>m.id==='unstructured').value;
  const children=dash.metrics.find(m=>m.id==='children').value;
  $('task-mix').innerHTML='<h3>How Tasks are created</h3>'+(total ? '<p><strong>'+unstructured+' unstructured Tasks · '+children+' structured child Tasks</strong></p><p class="small">'+(unstructured===total?'All '+total+' explicit Tasks found in the code are unstructured.': 'The code contains both unstructured Tasks and structured child Tasks.')+' Each unstructured Task needs a deliberate lifetime policy.</p>' : '<p>No explicit Tasks found in the code.</p>')+(unstructured?unstructuredWarning():'')+'<details><summary>Why does this matter?</summary><p class="small"><code>Task { … }</code> and <code>Task.detached { … }</code> create unstructured Tasks. Their creator does not automatically wait for them or pass on cancellation. The app must decide how to manage their lifetime.</p><p class="small"><code>async let</code> and task groups create structured child Tasks. Their scope waits for them to finish, and parent cancellation is passed to them. Cancellation still requires cooperation.</p><p class="small">Neither kind is always better. Inspect whether each Task has the right lifetime and repeated-request behaviour. SwiftUI <code>.task</code> and <code>.refreshable</code> are counted separately above.</p></details>';
  $('dash-isolation').textContent=dash.isolation;
  $('dash-coverage').textContent='Coverage counts unique scanned Task declarations and framework triggers with author-supplied notes, not fully verified tasks. The fingerprint covers scanned Swift contents and paths, not build settings or dependencies. Import validation checks structure and source alignment, not whether each claim is true.';
  function selectCategory(e) {
    const button=e.target.closest('[data-metric]');
    if(!button)return;
    dashboardMetric=report.dashboard.metrics.find(m=>m.id===button.dataset.metric) ?? null;
    $('search').value='';$('kind').value='all';selected=undefined;tab('tasks');draw();
    $('items').scrollTop=0;
  }
  $('dash-metrics').addEventListener('click',selectCategory);
  $('task-categories').addEventListener('click',selectCategory);
  function tree(node,depth=0) {
    return '<ul class="folder-tree">'+node.children.map(c=>'<li><details '+(depth<2?'open':'')+'><summary>📁 '+esc(c.name)+'</summary>'+tree(c,depth+1)+'</details></li>').join('')+node.files.map(f=>'<li class="tree-file" title="'+esc(f.path)+'">'+esc(f.name)+'</li>').join('')+'</ul>';
  }
  $('folder-tree').innerHTML=tree(report.folders.root);
  $('folder-checks').innerHTML=report.folders.checks.map(c=>'<div class="folder-check"><span class="'+(c.matched===true?'check-yes':'check-no')+'">'+(c.matched===null?'?':c.matched?'✓':'✕')+'</span><div><strong>'+esc(c.title)+'</strong><p class="small muted">'+esc(c.detail)+'</p></div></div>').join('');
  const reviews=all.filter(s=>reviewKinds.has(s.kind)||s.kind==='gcd');
  $('reviews').innerHTML=reviews.map(s=>'<details class="review"><summary>'+esc(s.label)+' · '+location(s)+'</summary><p>'+esc(descriptions[s.kind])+'</p><pre>'+esc(s.excerpt)+'</pre></details>').join('')||'<p class="empty">No observations matched these limited rules. This is not proof of correctness.</p>';
  $('method-detail').innerHTML='<p><strong>Method:</strong> '+esc(report.method)+'</p><p><strong>Tests:</strong> '+(report.scope.includeTests?'Included':'Test-named directories excluded')+'</p><p><strong>Targets:</strong> '+esc(report.scope.targetMembership)+'</p><ul>'+report.limitations.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>'+(report.scope.skipped.length?'<p>Skipped files: '+esc(report.scope.skipped.map(s=>s.file+' — '+s.reason).join('; '))+'</p>':'');
}
