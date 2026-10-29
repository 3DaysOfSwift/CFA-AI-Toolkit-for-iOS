import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRecord, inspectRecord, validateStructure } from '../tools/migration-evidence/evidence.mjs';
import { root } from '../scripts/sync.mjs';
import { stageRelease } from '../scripts/build.mjs';
import { validate } from '../scripts/validate.mjs';
import { install } from '../scripts/install.mjs';

// All records in this test are fabricated fixtures in temporary directories.
// Tests that set kind=real exercise gates; they never enter a case catalogue.
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-evidence-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const project = path.join(directory, 'app');
  fs.mkdirSync(project);
  fs.writeFileSync(path.join(project, 'unchanged.txt'), 'Do not change the app.');
  const destination = path.join(directory, 'case');
  const options = { destination, project, id: 'test-case', migrationId: 'test-migration', date: '2026-10-25', synthetic: true };
  createRecord(options);
  const file = path.join(destination, 'record.json');
  const record = JSON.parse(fs.readFileSync(file));
  const write = () => fs.writeFileSync(file, JSON.stringify(record, null, 2));
  return { directory, project, destination, file, record, write, options };
}

function reviewedFixture(t) {
  const f = fixture(t), r = f.record;
  Object.assign(r, {
    kind: 'real', status: 'approved', author: 'Fictional fixture author', toolkitVersion: '0.3.0',
    classification: 'mixed', confidence: 'limited', result: 'partial', lesson: 'A fictional lesson for gate testing.',
    tags: ['ordering'], limitations: ['All evidence here is fabricated test data, not a real migration.'], toolchain: ['Fictional Swift toolchain']
  });
  Object.assign(r.repository, { url: 'https://example.invalid/fixture', beforeCommit: 'a'.repeat(40), afterCommit: 'b'.repeat(40), license: 'MIT', allowedUse: 'redistributable', licenseNotes: 'Fictional license review for tests only.' });
  Object.assign(r.scope, { feature: 'FixtureFeature', symbols: ['Fixture.save'], mechanisms: ['gcd'], diagnosis: 'Fictional ordering hazard.', behaviourToPreserve: ['Fictional acceptance ordering.'] });
  Object.assign(r.decision, { summary: 'Fictional queue.', rationale: 'Fictional ordering.', generalGuidance: 'Fictional language reasoning.', cfaGuidance: 'Fictional CFA reasoning.', noAlternativesReason: 'No actual alternatives were considered in this fixture.' });
  r.humanCorrections.noneReason = 'No actual person corrected this fixture.';
  Object.assign(r.review, { reviewer: 'Fictional fixture reviewer', reviewedAt: '2026-10-25', notes: 'Only a validator test.', privacy: 'cleared' });
  fs.writeFileSync(path.join(f.destination, 'evidence.md'), 'Fictional test evidence. No command executed.');
  const evidence = (id, kind, phase, commit) => ({ id, kind, phase, commit, reference: 'evidence.md', summary: 'Fictional test observation.', outcome: ['build', 'test'].includes(kind) ? 'not-run' : 'observed', command: ['build', 'test'].includes(kind) ? 'example-never-execute' : null, environment: 'Fixture environment', recordedAt: '2026-10-25' });
  r.evidence = [
    evidence('source', 'source', 'before', r.repository.beforeCommit),
    evidence('diff', 'diff', 'after', r.repository.afterCommit),
    evidence('license', 'license', 'before', r.repository.beforeCommit),
    ...['build', 'test'].flatMap(kind => ['before', 'after'].map(phase => evidence(`${phase}-${kind}`, kind, phase, phase === 'before' ? r.repository.beforeCommit : r.repository.afterCommit)))
  ];
  f.seal = () => { f.write(); const result = inspectRecord(f.file, { checkDigest: false }); assert.equal(result.valid, true, result.errors.join('\n')); r.review.digest = result.digest; f.write(); };
  f.seal();
  return f;
}

test('initialization creates an explicitly incomplete draft without touching the app', t => {
  const f = fixture(t);
  assert.equal(inspectRecord(f.file).valid, true);
  assert.equal(f.record.createdAt, '2026-10-25');
  assert.equal(f.record.status, 'draft');
  assert.equal(f.record.kind, 'synthetic');
  assert.equal(f.record.review.reviewer, null);
  assert.deepEqual(fs.readdirSync(f.project), ['unchanged.txt']);
  assert.equal(fs.readFileSync(path.join(f.project, 'unchanged.txt'), 'utf8'), 'Do not change the app.');
  assert.deepEqual(fs.readdirSync(f.destination).sort(), ['case-study.md', 'record.json']);
  assert.throws(() => createRecord(f.options), /already exists/);
});

test('initialization refuses app paths, their symlink aliases, invalid IDs and impossible dates', t => {
  const f = fixture(t);
  assert.throws(() => createRecord({ ...f.options, destination: path.join(f.project, 'evidence') }), /separate/);
  const alias = path.join(f.directory, 'alias'); fs.symlinkSync(f.project, alias);
  assert.throws(() => createRecord({ ...f.options, destination: path.join(alias, 'evidence') }), /separate/);
  for (const override of [{ id: '../bad' }, { date: '2026-02-30' }, { migrationId: '' }]) {
    assert.throws(() => createRecord({ ...f.options, destination: path.join(f.directory, 'invalid'), ...override }));
    assert.equal(fs.existsSync(path.join(f.directory, 'invalid')), false);
  }
});

test('schema rejects missing fields, unknown tags, whitespace, invalid dates and unsupported versions', t => {
  const f = fixture(t);
  for (const mutate of [r => delete r.scope, r => r.tags.push('invented-tag'), r => r.createdAt = '2025-02-29', r => r.title = ' ', r => r.schemaVersion = '99', r => r.unexpected = true, r => r.revision = 0]) {
    const copy = structuredClone(f.record); mutate(copy);
    assert.ok(validateStructure(copy).length);
  }
  assert.throws(() => validateStructure({}, { unexpectedKeyword: true }), /Unsupported schema/);
});

test('local reference validation rejects missing, absolute, traversal and symlink files', t => {
  const f = reviewedFixture(t);
  fs.symlinkSync(path.join(f.project, 'unchanged.txt'), path.join(f.destination, 'linked.md'));
  for (const reference of ['missing.md', '../app/unchanged.txt', path.join(f.project, 'unchanged.txt'), 'linked.md', 'file:///private/tmp/no', '%2e%2e/app']) {
    f.record.evidence[0].reference = reference; f.write();
    assert.equal(inspectRecord(f.file).valid, false, reference);
  }
});

test('URLs are never fetched and credential/query-bearing or non-HTTPS references are rejected', t => {
  const f = reviewedFixture(t);
  f.record.evidence[0].reference = `https://example.invalid/blob/${'a'.repeat(40)}/Source.swift#L3`;
  f.seal();
  const result = inspectRecord(f.file);
  assert.equal(result.valid, true);
  assert.ok(result.warnings.some(w => w.includes('remote reference not fetched')));
  for (const reference of ['https://user:secret@example.invalid/file', 'https://example.invalid/file?token=secret', 'http://example.invalid/file']) {
    f.record.evidence[0].reference = reference; f.write();
    assert.equal(inspectRecord(f.file).valid, false);
  }
});

test('duplicate evidence IDs and corrections pointing to missing evidence are invalid', t => {
  const f = reviewedFixture(t);
  f.record.evidence.push(structuredClone(f.record.evidence[0])); f.write();
  assert.ok(inspectRecord(f.file).errors.some(e => e.includes('duplicate ID')));
  f.record.evidence.pop();
  f.record.humanCorrections = { items: [{ change: 'Change', reason: 'Reason', evidenceIds: ['missing'] }], noneReason: null }; f.write();
  assert.ok(inspectRecord(f.file).errors.some(e => e.includes('unknown evidence ID')));
});

test('reviewed real cases need provenance, separated guidance and baseline and after checks', t => {
  const f = reviewedFixture(t);
  f.record.repository.beforeCommit = null;
  f.record.decision.generalGuidance = null;
  f.record.evidence = f.record.evidence.filter(e => e.kind !== 'test'); f.write();
  const errors = inspectRecord(f.file).errors.join('\n');
  assert.match(errors, /beforeCommit/); assert.match(errors, /generalGuidance/);
  assert.match(errors, /before test/); assert.match(errors, /after test/);
});

test('partial cases and failures can be approved without inventing success, but need limitations', t => {
  const f = reviewedFixture(t);
  f.record.evidence.find(e => e.id === 'after-test').outcome = 'failed'; f.seal();
  assert.equal(inspectRecord(f.file, { publish: true }).valid, true);
  f.record.limitations = []; f.write();
  assert.ok(inspectRecord(f.file).errors.some(e => e.startsWith('limitations:')));
});

test('completion is not inferred from a build pass or tests at a different commit', t => {
  const f = reviewedFixture(t);
  f.record.result = 'completed';
  f.record.evidence.find(e => e.id === 'after-build').outcome = 'passed'; f.write();
  assert.ok(inspectRecord(f.file).errors.some(e => e.includes('completed requires a passed after test')));
  const testEvidence = f.record.evidence.find(e => e.id === 'after-test');
  testEvidence.outcome = 'passed'; testEvidence.commit = 'c'.repeat(40); f.write();
  assert.equal(inspectRecord(f.file).valid, false);
  testEvidence.commit = f.record.repository.afterCommit; f.write();
  assert.ok(inspectRecord(f.file).errors.some(error => error.includes('requires a completionGate')));
  const afterEvidence = (id, kind) => ({
    id, kind, phase: 'after', commit: f.record.repository.afterCommit,
    reference: 'evidence.md', summary: 'Fictional completion-gate evidence.',
    outcome: 'passed', command: null, environment: 'Fixture environment', recordedAt: '2026-10-25'
  });
  f.record.evidence.push(
    afterEvidence('after-navigator', 'manual'),
    afterEvidence('after-feature-inventory', 'source'),
    afterEvidence('after-primitive-inventory', 'source'),
    afterEvidence('after-architecture-review', 'manual')
  );
  f.record.completionGate = {
    navigatorEvidenceId: 'after-navigator',
    featureInventoryEvidenceId: 'after-feature-inventory',
    primitiveInventoryEvidenceId: 'after-primitive-inventory',
    buildEvidenceId: 'after-build',
    testEvidenceId: 'after-test',
    manualArchitectureReviewEvidenceId: 'after-architecture-review'
  };
  f.seal();
  assert.equal(inspectRecord(f.file).valid, true);
});

test('review fingerprint catches edited record, case study and local evidence', t => {
  const f = reviewedFixture(t);
  assert.equal(inspectRecord(f.file).valid, true);
  f.record.lesson = 'Changed lesson'; f.write();
  assert.ok(inspectRecord(f.file).errors.some(e => e.startsWith('review.digest')));
  f.seal();
  fs.appendFileSync(path.join(f.destination, 'case-study.md'), '\nChanged case study.');
  assert.equal(inspectRecord(f.file).valid, false); f.seal();
  fs.appendFileSync(path.join(f.destination, 'evidence.md'), '\nChanged evidence.');
  assert.equal(inspectRecord(f.file).valid, false);
});

test('publication gate excludes drafts, synthetic cases, holdouts, superseded cases and missing clearances', t => {
  const f = reviewedFixture(t);
  assert.equal(inspectRecord(f.file, { publish: true }).valid, true);
  const original = structuredClone(f.record);
  for (const change of [
    r => r.status = 'draft', r => r.status = 'reviewed', r => r.kind = 'synthetic',
    r => r.evaluationUse = 'holdout', r => { r.status = 'superseded'; r.supersededBy = 'replacement'; },
    r => r.repository.allowedUse = 'internal-only', r => r.review.privacy = 'unreviewed',
    r => r.evidence = r.evidence.filter(e => e.kind !== 'license')
  ]) {
    Object.assign(f.record, structuredClone(original)); change(f.record); f.seal();
    assert.ok(inspectRecord(f.file, { publish: true }).errors.some(e => e.startsWith('publish:')));
  }
});

test('CLI digest and validation are read-only and do not execute recorded commands', t => {
  const f = reviewedFixture(t);
  const marker = path.join(f.directory, 'MUST-NOT-EXIST');
  f.record.evidence.find(e => e.kind === 'build').command = `touch ${marker}`; f.seal();
  const before = fs.readFileSync(f.file, 'utf8');
  const cli = path.join(root, 'tools/migration-evidence/evidence.mjs');
  for (const command of ['digest', 'validate']) {
    const result = spawnSync(process.execPath, [cli, command, f.file], { encoding: 'utf8', cwd: f.project });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }
  assert.equal(fs.existsSync(marker), false);
  assert.equal(fs.readFileSync(f.file, 'utf8'), before);
  assert.notEqual(spawnSync(process.execPath, [cli, 'validate', f.file, '--unknown']).status, 0);
});

test('bundled synthetic example is a valid draft, never publishable', () => {
  const file = path.join(root, 'tools/migration-evidence/examples/synthetic-serial-writes/record.json');
  assert.equal(inspectRecord(file).valid, true);
  assert.equal(inspectRecord(file, { publish: true }).valid, false);
});

test('portable installation carries the complete evidence tool and creates cases outside app source', t => {
  const f = fixture(t);
  const source = stageRelease(path.join(f.directory, 'release'));
  const customer = path.join(f.directory, 'customer');
  install({ source, destination: customer, mode: 'skills', installCommand: false });
  const cli = path.join(customer, '.agents/skills/swift-concurrency-migration/scripts/evidence/evidence.mjs');
  const target = path.join(f.directory, 'portable-case');
  const creation = spawnSync(process.execPath, [cli, 'init', target, '--project', f.project, '--id', 'portable-case', '--migration-id', 'portable-migration', '--date', '2026-10-25'], { encoding: 'utf8', cwd: f.project });
  assert.equal(creation.status, 0, creation.stderr);
  const check = spawnSync(process.execPath, [cli, 'validate', path.join(target, 'record.json')], { encoding: 'utf8', cwd: f.project });
  assert.equal(check.status, 0, check.stderr);
  assert.equal(JSON.parse(check.stdout).valid, true);
  assert.deepEqual(fs.readdirSync(f.project), ['unchanged.txt']);
});

test('release validation rejects unreviewed files added to evidence payload', t => {
  const f = fixture(t), source = stageRelease(path.join(f.directory, 'release'));
  fs.writeFileSync(path.join(source, 'skills/swift-concurrency-migration/scripts/evidence/private-case.json'), '{}');
  assert.throws(() => validate(source, { source: false }), /explicit allowlist/);
});
