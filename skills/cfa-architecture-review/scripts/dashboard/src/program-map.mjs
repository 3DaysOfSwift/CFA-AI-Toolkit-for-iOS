#!/usr/bin/env node
import fs from 'node:fs/promises';
import {existsSync, realpathSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';

const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export function buildMap(records, root) {
  const unique = new Map();
  const resolvedFiles = new Map();
  for (const record of records) {
    if (!resolvedFiles.has(record.file)) {
      let resolved = record.file;
      try { resolved = realpathSync(record.file); } catch {
        // Keep the recorded path when a source file is no longer available.
      }
      resolvedFiles.set(record.file, resolved);
    }
    const relative = path.relative(root, resolvedFiles.get(record.file));
    if (!relative || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) continue;
    const item = {...record, file: relative};
    unique.set(JSON.stringify(item), item);
  }
  return [...unique.values()].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column);
}

export function launchTree(calls, maxDepth = 5) {
  const byCaller = new Map();
  for (const call of calls) {
    if (!call.callerID) continue;
    if (!byCaller.has(call.callerID)) byCaller.set(call.callerID, []);
    byCaller.get(call.callerID).push(call);
  }
  const roots = [...byCaller.entries()].filter(([, list]) => /didFinishLaunchingWithOptions/.test(list[0].caller || ''));
  function children(id, seen, depth) {
    if (seen.has(id) || depth >= maxDepth) return [];
    const nextSeen = new Set([...seen, id]);
    return (byCaller.get(id) || []).map(call => ({
      name: call.callee, file: call.file, line: call.line,
      children: children(call.calleeID, nextSeen, depth + 1),
      truncated: byCaller.has(call.calleeID) && (depth + 1 >= maxDepth || nextSeen.has(call.calleeID))
    }));
  }
  return roots.map(([id, list]) => ({name: list[0].caller, file: list[0].file, line: list[0].line, children: children(id, new Set(), 0)}));
}

export async function collectIndexedCalls(root, index, moduleName) {
  root = await fs.realpath(root); index = await fs.realpath(index);
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'cfa-index-map-'));
  let stdout;
  try {
    const compiler = (await run('xcrun', ['--find', 'swiftc'])).stdout.trim();
    const lib = path.resolve(path.dirname(compiler), '../lib/libIndexStore.dylib');
    const binary = path.join(temporary, 'index-program-map');
    await run('xcrun', ['clang', path.join(here, 'index-program-map.c'), lib, '-Wl,-rpath,' + path.dirname(lib), '-o', binary]);
    ({stdout} = await run(binary, [index, moduleName], {maxBuffer: 100 * 1024 * 1024}));
  } finally { await fs.rm(temporary, {recursive: true, force: true}); }
  const calls = buildMap(stdout.split('\n').filter(Boolean).map(line => JSON.parse(line)), root);
  if (!calls.length) throw Error('No indexed calls found inside the project for this module. Check the module, index and build.');
  return calls;
}

export async function generate(root, index, moduleName, output) {
  root = await fs.realpath(root);
  const calls = await collectIndexedCalls(root, index, moduleName);
  const files = [...new Set(calls.map(call => call.file))];
  const hashes = {};
  for (const file of files) {
    try { hashes[file] = createHash('sha256').update(await fs.readFile(path.join(root, file))).digest('hex'); }
    catch { hashes[file] = null; }
  }
  const launch = launchTree(calls);
  const report = {version: 1, module: moduleName, indexFreshness: 'unverified', generatedAt: new Date().toISOString(), indexedFiles: files.length, calls, launch, currentSourceHashes: hashes, limitations: ['Index freshness and build configuration are not verified.', 'A call site is not proof of execution, runtime dispatch, task ownership or actor isolation.', 'Framework callbacks, generated entry points and unresolved calls are not a complete program graph.']};
  await fs.mkdir(output, {recursive: false});
  await fs.writeFile(path.join(output, 'program-map.json'), JSON.stringify(report, null, 2) + '\n');
  const rows = calls.map(c => `<tr><td>${escape(c.file)}:${c.line}:${c.column}</td><td>${escape(c.caller || 'Unknown caller')}</td><td>${escape(c.callee)}</td></tr>`).join('\n');
  const tree = nodes => `<ul>${nodes.map(n => `<li><strong>${escape(n.name)}</strong> <small>${escape(n.file)}:${n.line}</small>${n.truncated ? ' (further calls not expanded)' : ''}${n.children.length ? tree(n.children) : ''}</li>`).join('')}</ul>`;
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Indexed program map</title><style>body{font:16px system-ui;background:#101d1a;color:#e9f4ef;margin:3rem auto;max-width:1100px;padding:0 1.5rem}h1,h2{color:#8ce0bc}p,li{line-height:1.6}small{color:#b0c9bf}input{font:inherit;width:100%;box-sizing:border-box;padding:.8rem}table{width:100%;border-collapse:collapse;margin-top:1rem}th,td{text-align:left;padding:.7rem;border-bottom:1px solid #38534b;vertical-align:top}th{color:#8ce0bc}code{color:#fff}</style><h1>Indexed program map</h1><p>${escape(moduleName)} · ${calls.length} indexed call sites across ${files.length} source files</p><p>Index freshness and build configuration are unverified. Calls are compiler-indexed possibilities, not proof of execution. Framework callbacks, dynamic dispatch and task boundaries may be missing. Current source hashes record the scan only; they do not prove the index matches it.</p><h2>Launch callback</h2><p>SwiftUI’s generated entry point and the system’s callback are not connected by this index. Calls inside closures can appear under their enclosing function; this tree does not show when a task is scheduled. Only calls with an indexed caller in this module are expanded.</p>${launch.length ? tree(launch) : '<p>No indexed launch callback found.</p>'}<h2>All indexed call sites</h2><input id="filter" placeholder="Filter by file or function" aria-label="Filter calls"><table><thead><tr><th>Source location</th><th>Indexed caller</th><th>Called symbol</th></tr></thead><tbody>${rows}</tbody></table><script>document.querySelector('#filter').addEventListener('input',e=>{const q=e.target.value.toLowerCase();for(const r of document.querySelectorAll('tbody tr'))r.hidden=!r.textContent.toLowerCase().includes(q)})</script></html>`;
  await fs.writeFile(path.join(output, 'program-map.html'), html);
  return report;
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [root, index, moduleName, output] = process.argv.slice(2);
  if (!root || !index || !moduleName || !output || process.argv.length !== 6) {
    console.error('Usage: node program-map.mjs <project-root> <index-store> <module-name> <new-output-directory>');
    process.exitCode = 2;
  } else {
    generate(root, index, moduleName, output).then(result => console.log(`Mapped ${result.calls.length} indexed call sites. Open ${path.join(output, 'program-map.html')}`)).catch(error => {console.error(error.message); process.exitCode = 1;});
  }
}
