import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const sourceFiles = new Set(['cfa-specification.md', 'swift-coding-guide.md', 'project-workflow.md', 'new-app-design-defaults.md']);
const classifications = new Set(['cfa-choice', 'swift-guidance', 'mixed', 'new-app-default']);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
function requireValue(condition, message) { if (!condition) throw Error(message); }

// Inventory headings outside code fences; this is section association, not a
// parser for individual normative rules or proof of semantic completeness.
export function headings(markdown) {
  let fence = null;
  const result = [];
  for (const line of markdown.split('\n')) {
    const delimiter = line.match(/^\s*(`{3,}|~{3,})/);
    if (delimiter) {
      if (!fence) fence = delimiter[1][0];
      else if (delimiter[1][0] === fence) fence = null;
      continue;
    }
    if (!fence) {
      const match = line.match(/^#{2,3} (.+?)\s*#*$/);
      if (match) result.push(match[1]);
    }
  }
  return result;
}

function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value &&
    value <= new Date().toISOString().slice(0, 10);
}

export function validatePublication(publication) {
  requireValue(publication && ['planned', 'published', 'withdrawn'].includes(publication.status), 'Invalid publication status');
  if (publication.status !== 'published') {
    requireValue(publication.url === null && publication.verifiedOn === null &&
      publication.verificationEvidence === null, 'Unpublished links must not carry eligible URL or verification metadata');
    return;
  }
  let url;
  try { url = new URL(publication.url); } catch { throw Error('Invalid publication URL'); }
  requireValue(url.protocol === 'https:' && url.hostname === 'www.3daysofswiftconcurrency.com' &&
    !url.username && !url.password && !url.port && !url.search && !url.hash &&
    /^\/(cfa\/explanations|blog|articles)\/[a-z0-9%-]+$/.test(url.pathname),
  'Publication URL must be a clean HTTPS explanation or lesson on the publisher site');
  requireValue(validDate(publication.verifiedOn), 'Publication needs a valid non-future verification date');
  const evidence = publication.verificationEvidence;
  requireValue(evidence?.method === 'rendered-content-review' &&
    nonempty(evidence.title) && nonempty(evidence.relevance) && nonempty(evidence.reviewer) &&
    evidence.anonymousAccess === true, 'Publication needs anonymous-access and relevant content-review evidence');
}

export function validateCatalogue(catalogue, directory, { sourceRoot } = {}) {
  requireValue(catalogue?.schemaVersion === 1 && Array.isArray(catalogue.topics) &&
    catalogue.topics.length > 0, 'Invalid explanation catalogue');
  requireValue(Array.isArray(catalogue.auditSources) && catalogue.auditSources.length > 0 &&
    new Set(catalogue.auditSources).size === catalogue.auditSources.length &&
    catalogue.auditSources.every(file => sourceFiles.has(file)), 'Invalid audit sources');
  const ids = new Set(), rules = new Set();
  const sourceHeadings = new Map();
  const validateSource = source => {
    requireValue(source && sourceFiles.has(source.file) && nonempty(source.heading), 'Invalid canonical source');
    if (sourceRoot) {
      if (!sourceHeadings.has(source.file)) sourceHeadings.set(source.file,
        headings(fs.readFileSync(path.join(sourceRoot, source.file), 'utf8')));
      requireValue(sourceHeadings.get(source.file).includes(source.heading),
        `Missing canonical heading: ${source.file} → ${source.heading}`);
    }
  };
  for (const topic of catalogue.topics) {
    requireValue(slug.test(topic.id) && !ids.has(topic.id), 'Invalid or duplicate topic ID');
    ids.add(topic.id);
    requireValue(nonempty(topic.title) && classifications.has(topic.classification), 'Invalid title/classification');
    requireValue(topic.rationaleStatus === 'documented-basis-editorial-analysis', 'Unrecognised rationale provenance');
    requireValue(Array.isArray(topic.ruleIds) && topic.ruleIds.length > 0, 'Topic needs rule IDs');
    for (const id of topic.ruleIds) {
      requireValue(/^CFA-[A-Z]+-\d{2}$/.test(id) && !rules.has(id), 'Invalid or duplicate rule ID');
      rules.add(id);
    }
    requireValue(topic.note === `decisions/${topic.id}.md`, 'Invalid note path');
    const notePath = path.join(directory, topic.note);
    requireValue(!fs.lstatSync(path.join(directory, 'decisions')).isSymbolicLink() &&
      !fs.lstatSync(notePath).isSymbolicLink(), 'Linked notes are not distributable');
    const note = fs.readFileSync(notePath, 'utf8');
    for (const section of ['Rule', 'Problem', 'Documented rationale', 'Trade-offs and alternatives',
      'Scope and exceptions', 'Verification', 'Evidence and provenance', 'Open question', 'Publication']) {
      requireValue(headings(note).includes(section), `Incomplete decision note: ${topic.id}/${section}`);
    }
    requireValue(Array.isArray(topic.sources) && topic.sources.length > 0, 'Topic needs canonical sources');
    topic.sources.forEach(validateSource);
    const priority = topic.priority;
    requireValue(priority && ['impact', 'confusion', 'reach'].every(key =>
      Number.isInteger(priority[key]) && priority[key] >= 1 && priority[key] <= 3) &&
      nonempty(priority.basis), 'Invalid editorial priority');
    requireValue(priority.observedOccurrences === null, 'Measured demand is not supported without an evidence-backed demand schema');
    requireValue(topic.publication?.proposedPath === `/cfa/explanations/${topic.id}`, 'Invalid proposed explanation path');
    validatePublication(topic.publication);
    requireValue(Array.isArray(topic.relatedLessons), 'Invalid related lessons');
    for (const lesson of topic.relatedLessons) {
      requireValue(nonempty(lesson.title), 'Lesson needs a title');
      validatePublication(lesson);
    }
  }
  requireValue(Array.isArray(catalogue.exclusions), 'Missing audit exclusions');
  const excluded = new Set();
  for (const source of catalogue.exclusions) {
    validateSource(source);
    const key = `${source.file}#${source.heading}`;
    requireValue(catalogue.auditSources.includes(source.file) && nonempty(source.reason) && !excluded.has(key),
      'Invalid or duplicate audit exclusion');
    requireValue(!catalogue.topics.some(t => t.sources.some(s => s.file === source.file && s.heading === source.heading)),
      'A section cannot be mapped and excluded');
    excluded.add(key);
  }
  const expectedNotes = catalogue.topics.map(topic => `${topic.id}.md`).sort();
  requireValue(JSON.stringify(fs.readdirSync(path.join(directory, 'decisions')).sort()) ===
    JSON.stringify(expectedNotes), 'Decision notes differ from catalogue allowlist');
  return catalogue;
}

export function lookup(catalogue, key) {
  const topic = catalogue.topics.find(t => t.id === key || t.ruleIds.includes(key));
  if (!topic) throw Error(`Unknown explanation key: ${key}`);
  const candidates = [{ title: topic.title, ...topic.publication }, ...topic.relatedLessons];
  candidates.forEach(validatePublication);
  const seen = new Set();
  const links = candidates.filter(item => item.status === 'published').flatMap(item => {
    if (seen.has(item.url)) return [];
    seen.add(item.url);
    return [{ title: item.title, url: item.url, verifiedOn: item.verifiedOn }];
  });
  return { id: topic.id, classification: topic.classification, note: topic.note,
    rationaleStatus: topic.rationaleStatus, links };
}

export function audit(catalogue, sourceRoot) {
  const sections = catalogue.auditSources.flatMap(file =>
    headings(fs.readFileSync(path.join(sourceRoot, file), 'utf8')).map(heading => ({ file, heading })));
  const mapped = [], excluded = [], unmapped = [];
  for (const section of sections) {
    const topics = catalogue.topics.filter(t => t.sources.some(s =>
      s.file === section.file && s.heading === section.heading)).map(t => t.id);
    const exclusion = catalogue.exclusions.find(s => s.file === section.file && s.heading === section.heading);
    if (topics.length) mapped.push({ ...section, topics });
    else if (exclusion) excluded.push({ ...section, reason: exclusion.reason });
    else unmapped.push(section);
  }
  const priorities = catalogue.topics.map(t => ({
    id: t.id, score: 2 * t.priority.impact + t.priority.confusion + t.priority.reach,
    observedOccurrences: t.priority.observedOccurrences,
    publicationStatus: t.publication.status
  })).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return { scope: 'H2/H3 sections outside code fences in the declared sources; not atomic-rule coverage or human approval',
    counts: { sections: sections.length, mapped: mapped.length, excluded: excluded.length,
      unmapped: unmapped.length, topics: catalogue.topics.length,
      publishedExplanations: catalogue.topics.filter(t => t.publication.status === 'published').length },
    priorities, unmapped, excluded, mapped };
}

function defaults() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const canonical = path.resolve(here, '../../architecture/explanations');
  return fs.existsSync(canonical) ? { directory: canonical, sourceRoot: path.dirname(canonical) } :
    { directory: path.resolve(here, '../references/explanations'), sourceRoot: undefined };
}

export function main(args) {
  const { directory, sourceRoot } = defaults();
  const catalogue = validateCatalogue(JSON.parse(fs.readFileSync(path.join(directory, 'catalogue.json'), 'utf8')),
    directory, { sourceRoot });
  const [command, key, ...extra] = args;
  requireValue(extra.length === 0 && ((command === 'lookup' && nonempty(key)) ||
    (['validate', 'audit'].includes(command) && key === undefined)),
  'Usage: explanations.mjs validate | audit | lookup <topic-or-rule-id>');
  if (command === 'lookup') return lookup(catalogue, key);
  if (command === 'audit') {
    requireValue(sourceRoot, 'Audit requires canonical source checkout; installed skills support lookup and validate');
    return audit(catalogue, sourceRoot);
  }
  return { valid: true, topics: catalogue.topics.length };
}

if (process.argv[1] && fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(path.resolve(process.argv[1]))) {
  try { console.log(JSON.stringify(main(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
