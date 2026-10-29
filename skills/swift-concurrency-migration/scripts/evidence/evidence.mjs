#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(fs.readFileSync(path.join(directory, 'schema.json'), 'utf8'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => {
  if (!fs.statSync(file).isFile() || fs.statSync(file).size > 8_000_000) throw Error('Evidence must be a regular file smaller than 8 MB.');
  return fs.readFileSync(file, 'utf8');
};
const canonical = value => JSON.stringify(value, (_, item) => {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    return Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]]));
  }
  return item;
});
const inside = (parent, child) => child === parent || child.startsWith(parent + path.sep);

// This intentionally implements only the keywords used by our bundled schema.
// It is not a general JSON Schema library. Unknown keywords fail closed.
export function validateStructure(value, definition = schema, location = '$', errors = []) {
  const supported = new Set(['$schema', '$defs', '$ref', 'title', 'description', 'type', 'const', 'enum', 'required', 'properties', 'additionalProperties', 'items', 'minItems', 'uniqueItems', 'minimum', 'minLength', 'maxLength', 'pattern', 'format']);
  for (const key of Object.keys(definition)) if (!supported.has(key)) throw Error(`Unsupported schema keyword: ${key}`);
  if (definition.$ref) {
    const name = definition.$ref.replace('#/$defs/', '');
    if (definition.$ref !== `#/$defs/${name}` || !Object.hasOwn(schema.$defs, name)) throw Error('Unknown schema reference.');
    return validateStructure(value, schema.$defs[name], location, errors);
  }
  const fail = message => errors.push(`${location}: ${message}`);
  if (definition.type) {
    const matches = type => type === 'null' ? value === null
      : type === 'array' ? Array.isArray(value)
      : type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value)
      : type === 'integer' ? Number.isInteger(value) : typeof value === type;
    if (![definition.type].flat().some(matches)) { fail(`expected ${definition.type}`); return errors; }
  }
  if (Object.hasOwn(definition, 'const') && value !== definition.const) fail('unexpected fixed value');
  if (definition.enum && !definition.enum.includes(value)) fail('value is not in the controlled vocabulary');
  if (typeof value === 'string') {
    if (value.length < (definition.minLength ?? 0)) fail('text is too short');
    if (value.length > (definition.maxLength ?? Infinity)) fail('text is too long');
    if (definition.pattern && !new RegExp(definition.pattern).test(value)) fail('invalid text format');
    if (definition.format) {
      if (definition.format !== 'date') throw Error('Unknown schema format.');
      const date = new Date(value);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) fail('expected a real YYYY-MM-DD date');
    }
  }
  if (typeof value === 'number' && value < (definition.minimum ?? -Infinity)) fail('number is below minimum');
  if (Array.isArray(value)) {
    if (value.length < (definition.minItems ?? 0)) fail('not enough entries');
    if (definition.uniqueItems && new Set(value.map(canonical)).size !== value.length) fail('duplicate entries');
    if (definition.items) value.forEach((item, index) => validateStructure(item, definition.items, `${location}[${index}]`, errors));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of definition.required ?? []) if (!Object.hasOwn(value, key)) fail(`missing ${key}`);
    for (const key of Object.keys(value)) {
      if (Object.hasOwn(definition.properties ?? {}, key)) validateStructure(value[key], definition.properties[key], `${location}.${key}`, errors);
      else if (definition.additionalProperties === false) fail(`unknown field ${key}`);
    }
  }
  return errors;
}

function httpsReference(reference) {
  const url = new URL(reference);
  if (url.protocol !== 'https:' || url.username || url.password || url.search) throw Error('Use HTTPS without credentials or query parameters.');
  return url;
}

function localReference(folder, reference) {
  // Refuse traversal and symlinks rather than following them into app/private data.
  if (!reference || path.isAbsolute(reference) || reference.includes('\\') || reference.includes('\0') || reference.includes(':') || reference.split('/').some(part => !part || part === '.' || part === '..')) throw Error('Use a relative file inside this evidence folder.');
  let current = folder;
  for (const part of reference.split('/')) {
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) throw Error('Linked evidence files are not allowed.');
  }
  return current;
}

export function inspectRecord(recordFile, { publish = false, checkDigest = true } = {}) {
  const errors = [], warnings = [];
  let record, folder;
  try {
    if (fs.lstatSync(recordFile).isSymbolicLink()) throw Error('Record must not be a symbolic link.');
    folder = fs.realpathSync(path.dirname(recordFile));
    record = JSON.parse(read(recordFile));
  } catch { return { valid: false, errors: ['Cannot read a regular JSON record file.'], warnings }; }
  validateStructure(record, schema, '$', errors);
  if (errors.length) return { valid: false, errors, warnings };
  const localHashes = {};
  const inspectReference = (reference, label, localOnly = false) => {
    try {
      if (reference.startsWith('https:') && !localOnly) {
        httpsReference(reference);
        warnings.push(`${label}: remote reference not fetched; verify access, pinned revision and redaction during review.`);
      } else localHashes[reference] = hash(read(localReference(folder, reference)));
    } catch { errors.push(`${label}: missing, unsafe or oversized reference`); }
  };
  inspectReference(record.caseStudy, 'caseStudy', true);
  if (record.repository.url !== null) {
    try { httpsReference(record.repository.url); } catch { errors.push('repository.url: expected a credential-free HTTPS repository URL'); }
  }
  const ids = new Set();
  for (const item of record.evidence) {
    if (ids.has(item.id)) errors.push(`evidence: duplicate ID ${item.id}`);
    ids.add(item.id);
    inspectReference(item.reference, `evidence.${item.id}`);
    if (['build', 'test'].includes(item.kind)) {
      if (!item.command || !item.environment) errors.push(`evidence.${item.id}: build/test checks require a command and environment, including checks not run`);
      if (item.outcome === 'observed') errors.push(`evidence.${item.id}: use passed, failed or not-run for builds/tests`);
    }
  }
  for (const correction of record.humanCorrections.items) {
    for (const id of correction.evidenceIds) if (!ids.has(id)) errors.push(`humanCorrections: unknown evidence ID ${id}`);
  }
  if (record.decision.alternatives.length && record.decision.noAlternativesReason) errors.push('decision: alternatives and noAlternativesReason are mutually exclusive');
  if (record.humanCorrections.items.length && record.humanCorrections.noneReason) errors.push('humanCorrections: items and noneReason are mutually exclusive');
  if (record.status === 'superseded') {
    if (!record.supersededBy || record.supersededBy === record.id) errors.push('supersededBy: identify a different replacement case');
  } else if (record.supersededBy !== null) errors.push('supersededBy is only valid for a superseded case');
  if (record.classification === 'general-swift-concurrency' && record.decision.cfaGuidance !== null) errors.push('classification: CFA guidance requires mixed or cfa-specific');
  if (record.classification === 'cfa-specific' && record.decision.generalGuidance !== null) errors.push('classification: general guidance requires mixed or general-swift-concurrency');

  const reviewed = ['reviewed', 'approved'].includes(record.status);
  if (reviewed) {
    for (const [key, value] of Object.entries({ author: record.author, toolkitVersion: record.toolkitVersion,
      feature: record.scope.feature, diagnosis: record.scope.diagnosis, decision: record.decision.summary,
      rationale: record.decision.rationale, lesson: record.lesson, classification: record.classification,
      reviewer: record.review.reviewer, reviewedAt: record.review.reviewedAt, reviewNotes: record.review.notes })) {
      if (!value) errors.push(`${key}: required for review`);
    }
    for (const [key, list] of Object.entries({ toolchain: record.toolchain, mechanisms: record.scope.mechanisms,
      symbols: record.scope.symbols, behaviourToPreserve: record.scope.behaviourToPreserve, tags: record.tags })) {
      if (!list.length) errors.push(`${key}: required for review`);
    }
    if (record.confidence === 'unassessed') errors.push('confidence: assess confidence before review');
    if (record.classification !== 'cfa-specific' && !record.decision.generalGuidance) errors.push('generalGuidance: explain the language/runtime guidance');
    if (record.classification !== 'general-swift-concurrency' && !record.decision.cfaGuidance) errors.push('cfaGuidance: explain the CFA-specific choice');
    if (!record.decision.alternatives.length && !record.decision.noAlternativesReason) errors.push('decision: record alternatives or explicitly explain none were captured');
    if (!record.humanCorrections.items.length && !record.humanCorrections.noneReason) errors.push('humanCorrections: record corrections or explicitly explain none were captured');
    if (record.result === 'not-started') errors.push('result: a reviewed case must describe an attempted migration');
    if (record.kind === 'real') {
      for (const key of ['url', 'beforeCommit', 'license', 'licenseNotes']) if (!record.repository[key]) errors.push(`repository.${key}: required for a reviewed real case`);
      if (['unreviewed', 'prohibited'].includes(record.repository.allowedUse)) errors.push('repository.allowedUse: establish permitted use before review');
      if (record.result !== 'blocked' && !record.repository.afterCommit) errors.push('repository.afterCommit: pin the resulting implementation');
      if (!record.evidence.some(item => item.kind === 'source' && item.phase === 'before' && item.commit === record.repository.beforeCommit)) errors.push('evidence: baseline source must identify beforeCommit');
      if (record.repository.afterCommit && !record.evidence.some(item => item.kind === 'diff' && item.commit === record.repository.afterCommit)) errors.push('evidence: link the change at afterCommit');
      for (const kind of ['build', 'test']) {
        for (const phase of ['before', 'after']) {
          const commit = phase === 'before' ? record.repository.beforeCommit : record.repository.afterCommit;
          if (!record.evidence.some(item => item.kind === kind && item.phase === phase && item.commit === commit)) errors.push(`evidence: record ${phase} ${kind} at its pinned commit, even if not run`);
        }
      }
    }
    if (record.review.reviewedAt && record.review.reviewedAt < record.createdAt) errors.push('reviewedAt: cannot precede creation');
    if (record.result !== 'completed' || record.evidence.some(item => ['failed', 'not-run'].includes(item.outcome))) {
      if (!record.limitations.length) errors.push('limitations: explain incomplete work, failed or unexecuted checks');
    }
  }
  if (record.result === 'completed') {
    for (const kind of ['build', 'test']) if (!record.evidence.some(item => item.kind === kind && item.phase === 'after' && item.outcome === 'passed' && item.commit === record.repository.afterCommit)) errors.push(`result: completed requires a passed after ${kind} at afterCommit; otherwise use partial`);
    const gate = record.completionGate;
    if (!gate) {
      errors.push('result: completed requires a completionGate; otherwise use partial');
    } else {
      const requiredEvidence = [
        ['navigatorEvidenceId', ['manual', 'diff']],
        ['featureInventoryEvidenceId', ['source', 'diff']],
        ['primitiveInventoryEvidenceId', ['source', 'diff']],
        ['buildEvidenceId', ['build']],
        ['testEvidenceId', ['test']],
        ['manualArchitectureReviewEvidenceId', ['manual']]
      ];
      for (const [field, kinds] of requiredEvidence) {
        const item = record.evidence.find(candidate => candidate.id === gate[field]);
        if (!item || !kinds.includes(item.kind) || item.phase !== 'after' || item.outcome !== 'passed' || item.commit !== record.repository.afterCommit) {
          errors.push(`completionGate.${field}: requires passed after evidence at afterCommit with kind ${kinds.join(' or ')}`);
        }
      }
    }
  }
  const digestRecord = structuredClone(record);
  digestRecord.review.digest = null;
  const digest = hash(canonical({ record: digestRecord, localEvidence: localHashes }));
  if (reviewed && checkDigest && record.review.digest !== digest) errors.push('review.digest: missing or stale; review the changed record and evidence before sealing again');
  if (publish) {
    if (record.status !== 'approved') errors.push('publish: only approved records are eligible');
    if (record.kind !== 'real') errors.push('publish: synthetic examples are not migration evidence');
    if (record.evaluationUse !== 'development') errors.push('publish: holdout records must not enter retrieval');
    if (record.repository.allowedUse !== 'redistributable') errors.push('publish: redistribution approval required');
    if (record.review.privacy !== 'cleared') errors.push('publish: privacy review required');
    if (!record.evidence.some(item => item.kind === 'license')) errors.push('publish: include license/attribution evidence');
  }
  warnings.push('Validation checks structure and references, not factual truth, concurrency safety, legal permission or reviewer identity. No commands or remote requests were executed.');
  return { valid: errors.length === 0, id: record.id, status: record.status, errors, warnings, digest };
}

export function createRecord({ destination, project, id, migrationId, date, synthetic = false }) {
  if (!destination || !project || !id || !migrationId || !date) throw Error('init requires destination, --project, --id, --migration-id and --date.');
  const projectRoot = fs.realpathSync(project);
  if (!fs.statSync(projectRoot).isDirectory()) throw Error('Project must be an existing directory.');
  // Require an existing parent; never create a speculative directory tree.
  const target = path.join(fs.realpathSync(path.dirname(path.resolve(destination))), path.basename(destination));
  if (inside(projectRoot, target) || inside(target, projectRoot)) throw Error('Evidence must be separate from the application project.');
  if (fs.existsSync(target)) throw Error('Destination already exists; nothing was overwritten.');
  const record = JSON.parse(read(path.join(directory, 'template/record.json')));
  Object.assign(record, { id, migrationId, createdAt: date, kind: synthetic ? 'synthetic' : 'real', title: synthetic ? `SYNTHETIC: ${id}` : id });
  const errors = validateStructure(record);
  if (errors.length) throw Error(errors.join('\n'));
  fs.mkdirSync(target);
  fs.copyFileSync(path.join(directory, 'template/case-study.md'), path.join(target, 'case-study.md'), fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(path.join(target, 'record.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  return { directory: target, status: 'draft', synthetic };
}

const help = `CFA migration evidence (Node.js 20+; local only)
  node evidence.mjs init <new-folder> --project <app-folder> --id <case-id> --migration-id <migration-id> --date YYYY-MM-DD [--synthetic]
  node evidence.mjs validate <record.json> [--publish]
  node evidence.mjs digest <record.json>

init never reads or edits app source. validate is read-only. --publish checks
eligibility only: it does not publish or export anything. digest prints a review
fingerprint; it never approves a record. Dates use the capture team's local date.
`;

export function main(args) {
  if (!args.length || (args.length === 1 && args[0] === '--help')) { console.log(help); return; }
  const [command, target, ...rest] = args;
  if (command === 'init') {
    const options = { destination: target };
    const names = { '--project': 'project', '--id': 'id', '--migration-id': 'migrationId', '--date': 'date' };
    while (rest.length) {
      const flag = rest.shift();
      if (flag === '--synthetic' && options.synthetic === undefined) options.synthetic = true;
      else if (Object.hasOwn(names, flag) && options[names[flag]] === undefined && rest[0] && !rest[0].startsWith('--')) options[names[flag]] = rest.shift();
      else throw Error('Unknown, duplicate or incomplete option. Use --help.');
    }
    console.log(JSON.stringify(createRecord(options), null, 2));
  } else if (['validate', 'digest'].includes(command) && target && (rest.length === 0 || (command === 'validate' && rest.length === 1 && rest[0] === '--publish'))) {
    const result = inspectRecord(path.resolve(target), { publish: rest.includes('--publish'), checkDigest: command !== 'digest' });
    if (command === 'digest' && result.valid) console.log(result.digest);
    else console.log(JSON.stringify(result, null, 2));
    if (!result.valid) process.exitCode = 1;
  } else throw Error('Unknown or incomplete command. Use --help.');
}

if (process.argv[1] && fs.existsSync(process.argv[1]) && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
