import test from 'node:test';
import assert from 'node:assert/strict';
import {assess, renderHealthReport} from '../src/health-report.mjs';

test('scores reviewed criteria and rejects unassessed or empty input', () => {
  assert.equal(assess([{title:'A', detail:'Evidence', status:'pass'}, {title:'B', detail:'Evidence', status:'concern'}]), 75);
  assert.throws(() => assess([]));
  assert.throws(() => assess([{title:'A', detail:'Evidence', status:'unknown'}]));
});

test('reports assessed scope and escapes reviewer content', () => {
  const html = renderHealthReport({app:'<App>', summary:'Summary', scope:'One path', conclusion:'Conclusion', criteria:[{title:'Ownership', detail:'Checked', status:'pass'}]});
  assert.match(html, /100%/);
  assert.match(html, /Good foundation/);
  assert.match(html, /One path/);
  assert.doesNotMatch(html, /partial review/i);
  assert.match(html, /&lt;App&gt;/);
  assert.doesNotMatch(html, /<App>/);
});
