import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) values.set(argv[index], argv[index + 1]);
  const name = values.get('--name');
  const out = values.get('--out');
  if (argv.length !== 4 || !name || !out || !/^[A-Za-z][A-Za-z0-9]*$/.test(name)) {
    throw Error('Usage: node scripts/create-cfa-project.mjs --name <AppName> --out <directory>');
  }
  return { name, out: path.resolve(out) };
}

function renamePaths(directory, from, to) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const source = path.join(directory, entry.name);
    if (entry.isDirectory()) renamePaths(source, from, to);
    const renamed = entry.name.replaceAll(from, to);
    if (renamed !== entry.name) fs.renameSync(source, path.join(directory, renamed));
  }
}

export function createCFAProject({ name, out }) {
  if (fs.existsSync(out)) throw Error(`Destination already exists: ${out}`);
  fs.cpSync(path.join(root, 'starter-apps', 'Todays Twenty'), out, { recursive: true });
  renamePaths(out, 'TimesThirty', name);
  for (const relative of fs.readdirSync(out, { recursive: true, encoding: 'utf8' })) {
    const file = path.join(out, relative);
    if (!fs.statSync(file).isFile() || !/\.(swift|pbxproj|xcscheme|md|plist)$/.test(file)) continue;
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8')
      .replaceAll('com.3DaysOfSwiftConcurrency.TimesThirty', `com.3DaysOfSwiftConcurrency.${name}`)
      .replaceAll('TimesThirty', name)
      .replaceAll('Times Thirty', name));
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { console.log(`Created ${createCFAProject(readArguments(process.argv.slice(2)))}`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
