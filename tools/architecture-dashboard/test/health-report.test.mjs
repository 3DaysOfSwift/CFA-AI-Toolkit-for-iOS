import test from 'node:test';
import assert from 'node:assert/strict';
import {assess, renderHealthReport} from '../src/health-report.mjs';

test('scores reviewed criteria and rejects unassessed or empty input', () => {
  assert.equal(assess([{title:'A', detail:'Evidence', status:'pass'}, {title:'B', detail:'Evidence', status:'concern'}]), 75);
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
  assert.match(html, /Assessment/);
  assert.match(html, /Strong concurrency design/);
  assert.doesNotMatch(html, />100%<|>Health score</);
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
