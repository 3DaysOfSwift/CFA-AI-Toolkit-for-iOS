import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const releaseExclusions = JSON.parse(fs.readFileSync(
  new URL('./release-exclusions.json', import.meta.url), 'utf8'));
export function isReleasePath(relative) {
  const parts = relative.split(/[\\/]/);
  return !parts.some(part => releaseExclusions.directoryNames.includes(part)) &&
    !releaseExclusions.fileNames.includes(parts.at(-1)) &&
    !releaseExclusions.fileSuffixes.some(suffix => parts.at(-1).endsWith(suffix));
}

export function files(root, prefix = '') {
  return fs.readdirSync(path.join(root, prefix), { withFileTypes: true }).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(entry => {
    const name = path.posix.join(prefix, entry.name);
    if (entry.isSymbolicLink()) throw Error(`Symbolic links are not supported in packages: ${name}`);
    if (entry.isDirectory()) return files(root, name);
    if (!entry.isFile()) throw Error(`Unsupported package entry: ${name}`);
    return [name];
  });
}
export const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export function inventory(root, excluded = []) {
  return Object.fromEntries(files(root).filter(f=>!excluded.includes(f)).map(f=>[f,hash(path.join(root,f))]));
}
export function verify(root, expected, excluded = []) {
  if (!expected || typeof expected !== 'object' || Array.isArray(expected)) throw Error('Invalid checksum inventory.');
  const actual = inventory(root, excluded);
  if (JSON.stringify(Object.keys(actual).sort()) !== JSON.stringify(Object.keys(expected).sort())) throw Error('Package file list differs from its checksum inventory.');
  for (const [file, value] of Object.entries(expected)) {
    if (!/^[a-f0-9]{64}$/.test(value) || actual[file] !== value) throw Error(`Checksum mismatch: ${file}`);
  }
}
export const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
export function writeJSON(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value,null,2)+'\n');
}
