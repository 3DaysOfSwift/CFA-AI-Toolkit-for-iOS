import test from 'node:test';
import assert from 'node:assert/strict';
import {assess, renderHealthReport} from '../src/health-report.mjs';

test('scores reviewed criteria and rejects unassessed or empty input', () => {
  assert.equal(assess([{title:'A', detail:'Evidence', status:'pass'}, {title:'B', detail:'Evidence', status:'concern'}]), 75);
  const passes = Array.from({length: 99}, () => ({title:'Pass', detail:'Evidence', status:'pass'}));
  assert.equal(assess([...passes, {title:'Concern', detail:'Evidence', status:'concern'}]), 99);
  assert.throws(() => assess([]));
  assert.throws(() => assess([{title:'A', detail:'Evidence', status:'unknown'}]));
});

test('reports the verdict and escapes reviewer content', () => {
  const html = renderHealthReport({app:'<App>', summary:'Summary', verdict:'Clear ownership', scope:'One path', conclusion:'Conclusion', criteria:[{title:'Ownership', detail:'Checked', status:'pass'}]});
  assert.match(html, /100%/);
  assert.match(html, /Strong concurrency design/);
  assert.match(html, /Clear ownership/);
  assert.doesNotMatch(html, /partial review/i);
  assert.match(html, /&lt;App&gt;/);
  assert.doesNotMatch(html, /<App>/);
});

 test('requires an explicit verdict instead of falling back to procedural scope or summary', () => {
  const data = {app:'App', summary:'264 tests passed', scope:'Three paths reviewed', conclusion:'Conclusion', criteria:[{title:'Ownership', detail:'Checked', status:'pass'}]};
  assert.throws(() => renderHealthReport(data), /verdict/);
  assert.throws(() => renderHealthReport({...data, verdict:'  '}), /verdict/);
  const html = renderHealthReport({...data, verdict:'Clear ownership of shared work.'});
  assert.match(html, /Clear ownership of shared work/);
  assert.doesNotMatch(html, /Three paths reviewed/);
});

test('supports a qualitative assessment without a percentage', () => {
  const html = renderHealthReport({app:'App', summary:'Summary', verdict:'Clear ownership', scope:'App', conclusion:'Conclusion', qualitativeOnly:true, criteria:[{title:'Ownership', detail:'Checked', status:'pass'}]});
  assert.match(html, /<div class="caption">Result<\/div>/);
  assert.match(html, /Strong concurrency design/);
  assert.doesNotMatch(html, />100%<|>Health score</);
  assert.match(html, /class="number">✓</);
  const needsAttention = renderHealthReport({
    app:'App', summary:'Summary', verdict:'Shared writes can race.', scope:'App',
    conclusion:'Conclusion', qualitativeOnly:true,
    criteria:[{title:'Ordering', detail:'Overlapping writes can lose updates.', status:'problem'}]
  });
  assert.match(needsAttention, /class="number">×</);
  assert.match(needsAttention, /Needs attention/);
});


test('renders conclusion points as escaped status bullets', () => {
  const html = renderHealthReport({app:'App', summary:'Summary', verdict:'Clear ownership', scope:'App', conclusion:['Clear <ownership>', 'Screen state stays local'], criteria:[{title:'Ownership', detail:'Checked', status:'pass'}]});
  assert.match(html, /class=\"conclusion-list\"/);
  assert.match(html, /Clear &lt;ownership&gt;/);
  assert.match(html, /Screen state stays local/);
});


test('conclusion uses ticks while concerns remain marked in findings', () => {
  const html = renderHealthReport({app:'App', summary:'Summary', verdict:'Some improvements needed', scope:'App', conclusion:['Consider the boundary'], criteria:[{title:'Boundary', detail:'Needs attention', status:'concern'}]});
  assert.match(html, /conclusion-mark pass" aria-hidden="true">✓/);
  assert.match(html, /conclusion-tick pass" aria-hidden="true">✓/);
  assert.match(html, /indicator concern" aria-label="concern">!/);
});

test('groups distinct actions under their capability without merging them', () => {
  const op = (title, group) => ({title,group,path:'Screen to Feature',stateOwner:'Feature',taskOwner:'Feature',isolation:'MainActor',reason:'Reviewed'});
  const html=renderHealthReport({app:'Launch & Watch',summary:'Summary',verdict:'Clear ownership',scope:'App',conclusion:'Conclusion',criteria:[{title:'Ownership',detail:'Checked',status:'pass'}],operations:[op('Set reminder','Reminders'),op('Open launch','Navigation'),op('Remove reminder','Reminders')]});
  assert.match(html, /<h2>Launch &amp; Watch App Workflow<\/h2>/);
  assert.ok(html.lastIndexOf('<section') === html.indexOf('<section class="conclusion">'));
  assert.equal((html.match(/class="operation-group">Reminders/g) || []).length,1);
  assert.ok(html.indexOf('Set reminder') < html.indexOf('Remove reminder'));
  assert.ok(html.indexOf('Remove reminder') < html.indexOf('operation-group">Navigation'));
});

test('requires a visible finding for confirmed operation problems', () => {
  const data = {
    app:'App', summary:'Summary', verdict:'Clear ownership', scope:'App',
    conclusion:'Conclusion', criteria:[{title:'Ownership', detail:'Checked', status:'pass'}],
    operations:[{title:'Refresh', checks:[{status:'fail', dimension:'correctness'}]}]
  };
  assert.throws(() => renderHealthReport(data), /Include confirmed operation problems/);
  data.operations[0].checks[0].dimension = 'cfa';
  Object.assign(data.operations[0].checks[0], {
    title:'Screen task ownership',
    problemKind:'cfa-deviation',
    reason:'The screen retains its own task handle.',
    verification:'Inspected the screen declaration.',
    evidence:[{file:'Views/HomeView.swift',line:12,endLine:14}]
  });
  const cfaReport = renderHealthReport(data);
  assert.match(cfaReport, /Refresh <small>· CFA deviation<\/small><\/summary>/);
  assert.doesNotMatch(cfaReport, /aria-label="Problem"/);
  assert.match(cfaReport, /<h3>CFA alignment<\/h3>.*Screen task ownership/);
  assert.doesNotMatch(cfaReport, /<h3>Behaviour checks<\/h3>/);
  assert.match(cfaReport, /Screen task ownership.*Inspected the screen declaration.*Evidence: Views\/HomeView\.swift:12–14/);
  data.operations[0].scenarios = [{status:'problem'}];
  assert.throws(() => renderHealthReport(data), /Include confirmed operation problems/);
  data.criteria.push({title:'Refresh ordering', detail:'A stale result can replace the latest result.', status:'problem'});
  assert.match(renderHealthReport(data), /Problems to address/);
});

test('withholds a stable workflow result until its trace and timing outcomes exist', () => {
  const operation = {title:'Save',checks:[{dimension:'correctness',status:'pass'}]};
  const data = {
    app:'App',summary:'Summary',verdict:'Clear ownership',scope:'App',conclusion:'Conclusion',
    criteria:[{title:'Ownership',detail:'Checked',status:'pass'}],operations:[operation]
  };
  assert.match(renderHealthReport(data), /aria-label="Needs investigation">\?<\/span>Save/);
  operation.steps = [{id:'event',relation:'event',title:'Save'}];
  assert.match(renderHealthReport(data), /aria-label="Needs investigation">\?<\/span>Save/);
  operation.scenarios = ['repeat','leave','late-result','failure'].map(id => ({id,status:'not-applicable'}));
  Object.assign(operation.scenarios[2], {
    title:'Older result arrives late', outcome:'The operation never suspends.',
    verification:'Traced the synchronous update.'
  });
  const html = renderHealthReport(data);
  assert.match(html, /aria-label="Stable">✓<\/span>Save/);
  assert.match(html, /Timing scenarios that don’t apply.*— Older result arrives late.*The operation never suspends/);
});

test('a confirmed problem keeps the verdict red even with a high score', () => {
  const criteria = ['Ownership', 'Isolation', 'Cancellation', 'Persistence'].map(title => ({
    title, detail:'Checked', status:'pass'
  }));
  criteria.push({title:'Refresh ordering', detail:'A stale response can overwrite newer data.', status:'problem'});
  const report = {app:'App', summary:'Summary', verdict:'Refresh ordering needs attention.', scope:'App', conclusion:'Conclusion', criteria};
  assert.match(renderHealthReport(report), /class="number">80%<.*class="stamp negative">Needs attention</s);
  assert.match(renderHealthReport({...report, qualitativeOnly:true}), /class="number">×</);
});

test('requires a visible problem when the structural verdict reports a conflict', () => {
  const data = {
    app:'App', summary:'Two workflows compete for shared state', verdict:'Needs attention',
    scope:'App', conclusion:'Give shared state one owner', architecturalConflict:true,
    criteria:[{title:'Launch', detail:'Starts correctly', status:'pass'}]
  };
  assert.throws(() => renderHealthReport(data), /Include confirmed operation problems/);
  data.criteria.push({title:'Competing state owners', detail:'Either workflow can overwrite the other.', status:'problem'});
  const html = renderHealthReport(data);
  assert.match(html, /stamp negative">Needs attention/);
  assert.match(html, /Problems to address.*Competing state owners/s);
});
