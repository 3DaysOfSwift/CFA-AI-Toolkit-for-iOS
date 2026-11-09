import fs from 'node:fs/promises';
import path from 'node:path';
import { dashboard } from './dashboard.mjs';
import { createHash } from 'node:crypto';

// Preserve offsets while hiding comments and string contents. This is lexical
// evidence extraction, not a Swift parser or a compiler-resolved call graph.
export function maskSwift(source) {
  const chars = source.split('');
  const hide = (a, b) => { for (let k = a; k < b; k++) if (chars[k] !== '\n' && chars[k] !== '\r') chars[k] = ' '; };
  let i = 0;
  while (i < source.length) {
    const start = i;
    if (source.startsWith('//', i)) {
      while (i < source.length && source[i] !== '\n') i++;
      hide(start, i);
    } else if (source.startsWith('/*', i)) {
      let depth = 1; i += 2;
      while (i < source.length && depth) {
        if (source.startsWith('/*', i)) { depth++; i += 2; }
        else if (source.startsWith('*/', i)) { depth--; i += 2; }
        else i++;
      }
      hide(start, i);
    } else {
      const opening = /^(#*)("""|")/.exec(source.slice(i));
      if (!opening) { i++; continue; }
      const hashes = opening[1], quote = opening[2], close = quote + hashes;
      i += opening[0].length;
      while (i < source.length) {
        if (source.startsWith('\\' + hashes, i)) { i += 1 + hashes.length + 1; continue; }
        if (source.startsWith(close, i)) { i += close.length; break; }
        i++;
      }
      hide(start, Math.min(i, source.length));
    }
  }
  return chars.join('');
}

const rules = [
  ['launch-callback', 'Possible application lifecycle callback', /\bfunc\s+application\s*\([^{}]*?\bdidFinishLaunchingWithOptions\b/g],
  ['button-action', 'Possible button entry point', /\bButton\s*(?:\([^{}\n]*\))?\s*\{/g],
  ['await', 'Possible suspension point', /\bawait\b/g],
  ['main-actor', 'Explicit MainActor annotation', /@MainActor\b/g],
  ['task', 'Unstructured task', /\bTask\s*(?:<[^;{}]+?>)?\s*(?:\.\s*init\s*)?(?:\([^;{}]*?\)\s*|\([^;{}]*?\boperation\s*:\s*)?\{/g],
  ['detached', 'Detached task', /\bTask\s*\.\s*detached\s*(?:\([^;{}]*?\)\s*|\([^;{}]*?\boperation\s*:\s*)?\{/g],
  ['async-let', 'Structured child binding', /\basync\s+let\s+\w+/g],
  ['group', 'Task-group scope', /\bwith(?:Throwing|Discarding|ThrowingDiscarding)?TaskGroup\s*\(/g],
  ['group-child', 'Possible group child site', /\.\s*addTask(?:UnlessCancelled)?\s*(?:\([^;{}]*?\))?\s*\{/g],
  ['view-task', 'SwiftUI .task', /\.\s*task\s*(?:\([^;{}]*?\))?\s*\{/g],
  ['refresh', 'SwiftUI .refreshable', /\.\s*refreshable\s*\{/g],
  ['gcd', 'Dispatch scheduling', /\b(?:DispatchQueue\s*(?:\.\s*\w+|\([^;{}]*?\))|\w*[Qq]ueue)\s*(?:\([^;{}]*?\))?\s*\.\s*(?:asyncAfter|async|sync)\b/g],
  ['blocking', 'Could this work block a thread?', /\b(?:Data\s*\(\s*contentsOf\s*:|Thread\s*\.\s*sleep\b|DispatchSemaphore\s*\()/g],
  ['ui-rule', 'Is this the responsibility of the UI?', /\b(?:Calendar\s*\.\s*current|calendar\s*\.\s*(?:date|startOfDay|component)|\w+\s*\.\s*reduce\s*\()/g]
];

export function scanSource(source, file) {
  const masked = maskSwift(source), lines = source.split('\n');
  const isUI = /(?:View|ViewModel)\.swift$/.test(file) || /(?:^|\/)1 - View\//.test(file);
  const evidence = (index) => {
    const line = masked.slice(0, index).split('\n').length;
    return { file, line, excerpt: lines.slice(Math.max(0, line - 3), line + 4).join('\n') };
  };
  const sites = [];
  for (const [kind, label, pattern] of rules) {
    if (kind === 'ui-rule' && !isUI) continue;
    pattern.lastIndex = 0;
    for (const match of masked.matchAll(pattern)) {
      // A return/property type followed by a body is not a constructor call.
      // Work from syntax, never filenames, line numbers or a particular app.
      if (kind==='task' && /(?:(?:->|:)\s*(?:sending\s+)?|\b(?:struct|class|enum|actor|protocol|extension)\s+)(?:Swift\s*\.\s*)?$/.test(masked.slice(0,match.index))) continue;
      sites.push({ id: `${file}:${match.index}:${kind}`, kind, label, ...evidence(match.index) });
    }
  }
  const declarations = [];
  for (const match of masked.matchAll(/\b(?:struct|class|actor|enum|protocol)\s+(\w+)/g)) {
    const type = match[0].split(/\s/)[0], name = match[1];
    const role = type === 'actor' ? 'Actor' : /ViewModel$/.test(name) ? 'ViewModel' : /View$/.test(name) ? 'View' : /Manager$/.test(name) ? 'Manager' : /(?:Repository|Store|Client)$/.test(name) ? 'Storage / integration' : 'Other';
    declarations.push({ name, type, role, ...evidence(match.index) });
  }
  const entries = [...masked.matchAll(/@main\b/g)].map(m => ({ label: '@main entry point', ...evidence(m.index) }));
  const usesSwiftConcurrency=/\b(?:await|async|actor|Task)\b|@(?:MainActor|globalActor)\b/.test(masked);
  return { sites: sites.sort((a,b) => a.line-b.line), declarations, entries, usesSwiftConcurrency };
}

const excluded = new Set(['.git', '.build', '.swiftpm', 'Pods', 'Carthage', 'node_modules', 'DerivedData', 'build']);
export async function analyse(root, { includeTests = false, excludedOutput } = {}) {
  root = await fs.realpath(root);
  if (!(await fs.stat(root)).isDirectory()) throw new Error('Repository path must be a directory.');
  const files = [], skipped = [], excludedTestDirectories = [], buildDefinitions = [];
  async function walk(directory) {
    for (const entry of (await fs.readdir(directory, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (excluded.has(entry.name) || entry.name.startsWith('.') || absolute === excludedOutput) continue;
        if (!includeTests && /(?:^tests?$|Tests?$)/.test(entry.name)) {
          excludedTestDirectories.push(path.relative(root, absolute).split(path.sep).join('/'));
          continue;
        }
        await walk(absolute);
      } else if (entry.isFile() && /(?:\.(?:pbxproj|xcconfig|xcscheme|entitlements)$|Info\.plist$|^(?:contents\.xcworkspacedata|Package\.resolved)$)/.test(entry.name)) {
        const relative = path.relative(root, absolute).split(path.sep).join('/');
        const hash = createHash('sha256').update(await fs.readFile(absolute)).digest('hex');
        buildDefinitions.push([relative, hash]);
      } else if (entry.isFile() && entry.name.endsWith('.swift')) {
        const relative = path.relative(root, absolute).split(path.sep).join('/');
        if ((await fs.stat(absolute)).size > 2_000_000) { skipped.push({ file: relative, reason: 'Over 2 MB source limit' }); continue; }
        const source = await fs.readFile(absolute, 'utf8');
        files.push({ path: relative, hash: createHash('sha256').update(source).digest('hex'), lineCount: source.split('\n').length, ...scanSource(source, relative) });
      }
    }
  }
  await walk(root);
  const fingerprint = createHash('sha256').update(JSON.stringify(files.map(file => [file.path, file.hash])));
  if (excludedTestDirectories.length) fingerprint.update(JSON.stringify(excludedTestDirectories));
  if (buildDefinitions.length) fingerprint.update(JSON.stringify(buildDefinitions));
  if (skipped.length) fingerprint.update(JSON.stringify(skipped));
  const sourceFingerprint = fingerprint.digest('hex');
  return { schemaVersion: 3, sourceFingerprint, dashboard: dashboard(files), project: path.basename(root), generatedAt: new Date().toISOString(),
    method: 'Lexical source inventory — not compiler-resolved or runtime-observed',
    scope: { includeTests, fileCount: files.length, skipped, excludedTestDirectories, targetMembership: 'Not resolved; inactive compilation branches may be included' },
    limitations: [
      'Matches are source matches: similarly named custom APIs may match; wrappers and unusual syntax may be missed.',
      'String interpolation bodies and Swift regex literals are not fully parsed. Source offsets use UTF-16 code units.',
      'No call graph, task-parent relationships, inferred isolation, runtime timings or automatic race proof.',
      'Task-group scopes and possible child sites are separate; neither is a runtime task count.',
      'Naming-based architecture roles and UI responsibility warnings require human or AI semantic review.',
      'No quality score or UI-cleanliness percentage is computed from these heuristics.'
    ], files };
}
