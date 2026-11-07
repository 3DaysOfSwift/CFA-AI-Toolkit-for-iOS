import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { specTopics } from '../scripts/spec-topics.mjs';
import { root, cfaSkills } from '../scripts/sync.mjs';

test('topic reading edition retains every canonical section and is bundled consistently', () => {
  const expected = specTopics(root);
  const canonical = fs.readFileSync(path.join(root, 'architecture/cfa-specification.md'), 'utf8');
  const reconstructed = expected.get('introduction.md') + [...expected].filter(([name]) => name.startsWith('topics/')).map(([, value]) => value.replace(/\]\(\.\.\/\.\.\/((?:swift-coding-guide|project-workflow|new-app-design-defaults)\.md(?:#[^)]*)?|spec\/(?:examples\/open-source-apps|explanations)\.md)\)/g, ']($1)')).join('');
  assert.equal(reconstructed, canonical);
  for (const folder of ['architecture/spec', ...cfaSkills.map(name => `skills/${name}/references/spec`)]) {
    for (const [name, value] of expected) assert.equal(fs.readFileSync(path.join(root, folder, name), 'utf8'), value, `${folder}/${name}`);
  }
});

test('headings inside fenced examples remain part of their section', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-spec-topics-'));
  try {
    fs.mkdirSync(path.join(base, 'architecture'));
    fs.copyFileSync(path.join(root, 'architecture/spec-rule-catalog.json'), path.join(base, 'architecture/spec-rule-catalog.json'));
    fs.copyFileSync(path.join(root, 'architecture/open-source-apps.json'), path.join(base, 'architecture/open-source-apps.json'));
    fs.mkdirSync(path.join(base, 'architecture/explanations'));
    fs.copyFileSync(path.join(root, 'architecture/explanations/catalogue.json'), path.join(base, 'architecture/explanations/catalogue.json'));
    fs.cpSync(path.join(root, 'architecture/spec-examples'), path.join(base, 'architecture/spec-examples'), { recursive: true });
    const source = fs.readFileSync(path.join(root, 'architecture/cfa-specification.md'), 'utf8');
    fs.writeFileSync(path.join(base, 'architecture/cfa-specification.md'), source + '\n```markdown\n## Example only\n```\n');
    assert.equal(specTopics(base).size, specTopics(root).size);
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
});

test('rule cards reject unclassified sections and missing verification', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-spec-coverage-'));
  try {
    fs.mkdirSync(path.join(base, 'architecture'));
    fs.copyFileSync(path.join(root, 'architecture/open-source-apps.json'), path.join(base, 'architecture/open-source-apps.json'));
    fs.mkdirSync(path.join(base, 'architecture/explanations'));
    fs.copyFileSync(path.join(root, 'architecture/explanations/catalogue.json'), path.join(base, 'architecture/explanations/catalogue.json'));
    fs.cpSync(path.join(root, 'architecture/spec-examples'), path.join(base, 'architecture/spec-examples'), { recursive: true });
    const source = fs.readFileSync(path.join(root, 'architecture/cfa-specification.md'), 'utf8');
    const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'architecture/spec-rule-catalog.json'), 'utf8'));
    fs.writeFileSync(path.join(base, 'architecture/cfa-specification.md'), source + '\n## New required rule\n');
    fs.writeFileSync(path.join(base, 'architecture/spec-rule-catalog.json'), JSON.stringify(catalogue));
    assert.throws(() => specTopics(base), /Unclassified specification section/);
    fs.writeFileSync(path.join(base, 'architecture/cfa-specification.md'), source);
    catalogue.rules[0].verify = '';
    fs.writeFileSync(path.join(base, 'architecture/spec-rule-catalog.json'), JSON.stringify(catalogue));
    assert.throws(() => specTopics(base), /Missing verify/);
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
});

test('deep-link example persists a deferred request and completes after navigation', { skip: process.platform !== 'darwin', timeout: 120000 }, () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-spec-example-'));
  try {
    const executable = path.join(directory, 'example');
    const build = spawnSync('xcrun', ['swiftc', '-parse-as-library', '-swift-version', '6', '-module-cache-path', path.join(directory, 'cache'), path.join(root, 'architecture/spec-examples/DeepLinkingExample.swift'), '-o', executable], { encoding: 'utf8', timeout: 90000 });
    assert.equal(build.status, 0, build.stderr || build.error?.message);
    const run = spawnSync(executable, [], { encoding: 'utf8', timeout: 15000 });
    assert.equal(run.status, 0, run.stderr || run.error?.message);
    assert.match(run.stdout, /deferred destination survives restart/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('navigation exposes the agreed account, refresh and multi-device boundaries', () => {
  const topics = specTopics(root);
  const account = topics.get('rules/cfa-account-01.md');
  const refresh = topics.get('rules/cfa-task-02.md');
  const devices = topics.get('rules/cfa-device-01.md');
  const links = topics.get('rules/cfa-link-01.md');
  assert.match(account, /sign-out fails.*retain the session/);
  assert.match(refresh, /continues after the user leaves/);
  assert.match(devices, /each process has its own AppModel/);
  assert.match(devices, /Watch Connectivity/);
  assert.match(links, /scene owns navigation/);
  assert.match(links, /successful navigation or explicit dismissal/);
});

test('specification card identifiers do not collide with explanation rule identifiers', () => {
  const cards = JSON.parse(fs.readFileSync(path.join(root, 'architecture/spec-rule-catalog.json'), 'utf8'));
  const explanations = JSON.parse(fs.readFileSync(path.join(root, 'architecture/explanations/catalogue.json'), 'utf8'));
  const explanationIds = new Set(explanations.topics.flatMap(topic => topic.ruleIds ?? []));
  for (const rule of cards.rules) assert.equal(explanationIds.has(rule.id), false, rule.id);
});

test('published app examples link to pinned source and relevant rule cards', () => {
  const topics = specTopics(root);
  const index = topics.get('examples/open-source-apps.md');
  assert.match(index, /Trend-iOS-App-Swift-Concurrency-CFA\/blob\/[a-f0-9]{40}\//);
  assert.match(index, /RocketLaunch-iOS-App-Swift-Concurrency\/blob\/[a-f0-9]{40}\//);
  assert.match(topics.get('rules/cfa-cache-01.md'), /RocketLaunch-iOS-App-Swift-Concurrency\/blob\/[a-f0-9]{40}\//);
  assert.match(index, /older naming or differ from current CFA rules/);
});

test('published explanations appear in the index and relevant rule cards', () => {
  const topics = specTopics(root);
  const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'architecture/explanations/catalogue.json'), 'utf8'));
  const cards = JSON.parse(fs.readFileSync(path.join(root, 'architecture/spec-rule-catalog.json'), 'utf8'));
  const associated = new Set(cards.rules.flatMap(rule => rule.explanationIds ?? []));
  const index = topics.get('explanations.md');
  for (const topic of catalogue.topics.filter(item => item.publication.status === 'published')) {
    assert.ok(index.includes(`](${topic.publication.url})`), topic.id);
    assert.ok(associated.has(topic.id), `No rule card links to ${topic.id}`);
  }
  assert.match(topics.get('rules/cfa-app-01.md'), /cfa\/explanation\/appmodel-composition/);
  assert.match(topics.get('rules/cfa-conc-03.md'), /cfa\/explanation\/task-cancellation/);
});

test('withdrawn explanations are never included in generated links', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-explanations-'));
  try {
    fs.cpSync(path.join(root, 'architecture'), path.join(base, 'architecture'), { recursive: true });
    const file = path.join(base, 'architecture/explanations/catalogue.json');
    const catalogue = JSON.parse(fs.readFileSync(file, 'utf8'));
    const target = catalogue.topics.find(topic => topic.id === 'appmodel-composition');
    const url = target.publication.url;
    Object.assign(target.publication, { status: 'withdrawn', url: null, verifiedOn: null, verificationEvidence: null });
    fs.writeFileSync(file, JSON.stringify(catalogue));
    const topics = specTopics(base);
    assert.equal(topics.get('explanations.md').includes(url), false);
    assert.equal(topics.get('rules/cfa-app-01.md').includes(url), false);
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
});
