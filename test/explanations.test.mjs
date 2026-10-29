import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateCatalogue, validatePublication, headings, lookup, audit } from '../tools/explanations/explanations.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'architecture/explanations');
const sourceRoot = path.join(root, 'architecture');
const read = () => JSON.parse(fs.readFileSync(path.join(directory, 'catalogue.json'), 'utf8'));
const validate = catalogue => validateCatalogue(catalogue, directory, { sourceRoot });
const live = {
  status: 'published',
  url: 'https://www.3daysofswiftconcurrency.com/cfa/explanations/unstructured-tasks',
  verifiedOn: '2026-10-27',
  verificationEvidence: {
    method: 'rendered-content-review', title: 'Fixture only',
    relevance: 'Synthetic verification metadata; no network request or real publication',
    reviewer: 'Synthetic test', anonymousAccess: true
  }
};

test('all inventoried canonical sections are associated or explicitly excluded', () => {
  const catalogue = validate(read());
  const result = audit(catalogue, sourceRoot);
  assert.equal(result.unmapped.length, 0);
  assert.equal(result.counts.sections, result.counts.mapped + result.counts.excluded);
  assert.ok(result.counts.mapped > 0);
  assert.ok(result.priorities.every(row => row.observedOccurrences === null));
});

test('rule lookup returns relevant local rationale without inventing planned URLs', () => {
  const catalogue = validate(read());
  const byRule = lookup(catalogue, 'CFA-TASK-01');
  assert.equal(byRule.id, 'unstructured-tasks');
  assert.equal(byRule.note, 'decisions/unstructured-tasks.md');
  assert.deepEqual(byRule.links, []);
  assert.deepEqual(byRule, lookup(catalogue, 'unstructured-tasks'));
  assert.throws(() => lookup(catalogue, 'unstructured-task'), /Unknown/);
});

test('published links need content verification, not merely a status flag', () => {
  const catalogue = read(), topic = catalogue.topics.find(t => t.id === 'unstructured-tasks');
  topic.publication = { ...topic.publication, status: 'published' };
  assert.throws(() => validate(catalogue), /publication URL/);
  topic.publication = { ...topic.publication, ...live, verificationEvidence: null };
  assert.throws(() => validate(catalogue), /content-review/);
  topic.publication.verificationEvidence = live.verificationEvidence;
  validate(catalogue);
  assert.equal(lookup(catalogue, topic.id).links[0].url, live.url);
});

test('lookup deduplicates links and never adds unrelated topics', () => {
  const catalogue = read(), topic = catalogue.topics.find(t => t.id === 'unstructured-tasks');
  topic.publication = { ...topic.publication, ...live };
  topic.relatedLessons = [{ title: 'Same resource', ...live }];
  validate(catalogue);
  assert.equal(lookup(catalogue, topic.id).links.length, 1);
  assert.deepEqual(lookup(catalogue, 'readability').links, []);
});

test('unpublished and withdrawn resources cannot leak public URLs', () => {
  for (const status of ['planned', 'withdrawn']) {
    assert.throws(() => validatePublication({ ...live, status }), /Unpublished/);
    validatePublication({ status, url: null, verifiedOn: null, verificationEvidence: null });
  }
});

test('rejects credential-bearing, tracking, off-site and insecure links', () => {
  for (const url of ['http://www.3daysofswiftconcurrency.com/blog/example',
    'https://example.com/blog/example',
    'https://name:secret@www.3daysofswiftconcurrency.com/blog/example',
    live.url + '?token=secret', live.url + '#invented', live.url.replace('.com/', '.com:444/')]) {
    assert.throws(() => validatePublication({ ...live, url }), /clean HTTPS/);
  }
});

test('rejects invalid/future dates and unverified anonymous access', () => {
  for (const verifiedOn of ['2026-02-30', '2999-01-01', null, 'yesterday']) {
    assert.throws(() => validatePublication({ ...live, verifiedOn }), /verification date/);
  }
  assert.throws(() => validatePublication({ ...live,
    verificationEvidence: { ...live.verificationEvidence, anonymousAccess: false } }), /anonymous-access/);
});

test('rejects duplicate topic/rule IDs and traversal note paths', () => {
  let catalogue = read();
  catalogue.topics[1].id = catalogue.topics[0].id;
  assert.throws(() => validate(catalogue), /duplicate topic/);
  catalogue = read();
  catalogue.topics[1].ruleIds.push(catalogue.topics[0].ruleIds[0]);
  assert.throws(() => validate(catalogue), /duplicate rule/);
  catalogue = read();
  catalogue.topics[0].note = '../outside.md';
  assert.throws(() => validate(catalogue), /note path/);
});

test('missing canonical sections, false classifications and manufactured demand fail', () => {
  let catalogue = read();
  catalogue.topics[0].sources[0].heading = 'Does not exist';
  assert.throws(() => validate(catalogue), /Missing canonical/);
  catalogue = read();
  catalogue.topics[0].classification = 'Apple mandates CFA';
  assert.throws(() => validate(catalogue), /classification/);
  catalogue = read();
  catalogue.topics[0].priority.observedOccurrences = 1000;
  assert.throws(() => validate(catalogue), /Measured demand/);
});

test('coverage reports newly unmapped sections instead of claiming total rule coverage', () => {
  const catalogue = read();
  catalogue.topics = catalogue.topics.filter(t => t.id !== 'appmodel-composition');
  const result = audit(catalogue, sourceRoot);
  assert.ok(result.unmapped.some(s => s.heading === 'Use AppModel as the Composition Root and Feature Facade'));
  assert.match(result.scope, /not atomic-rule coverage/);
});

test('code examples do not become invented source headings', () => {
  assert.deepEqual(headings('## Real\n~~~text\n## Not real\n~~~\n### Another'), ['Real', 'Another']);
});

test('standalone skill helper works after copying only one skill, without repository or network', t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-explanations-test-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const skill = path.join(temp, 'one-skill');
  fs.cpSync(path.join(root, 'skills/swift-code-quality'), skill, { recursive: true });
  const output = execFileSync(process.execPath, [path.join(skill, 'scripts/explanations.mjs'),
    'lookup', 'CFA-TASK-01'], { cwd: temp, encoding: 'utf8' });
  const result = JSON.parse(output);
  assert.equal(result.id, 'unstructured-tasks');
  assert.ok(fs.readFileSync(path.join(skill, 'references/explanations', result.note), 'utf8').includes('## Documented rationale'));
  assert.deepEqual(result.links, []);
  assert.throws(() => execFileSync(process.execPath, [path.join(skill, 'scripts/explanations.mjs'), 'audit'],
    { cwd: temp, stdio: 'pipe' }), /Audit requires canonical/);
});
