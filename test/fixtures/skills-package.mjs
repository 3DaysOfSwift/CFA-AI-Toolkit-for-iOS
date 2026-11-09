import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inventory, isReleasePath, writeJSON } from '../../scripts/files.mjs';

export function stageSkillsPackage(source) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  fs.mkdirSync(source);
  for (const folder of ['.codex-plugin', 'skills']) {
    const from = path.join(root, folder);
    fs.cpSync(from, path.join(source, folder), {
      recursive: true,
      filter: file => isReleasePath(path.relative(from, file))
    });
  }
  writeJSON(path.join(source, 'checksums.json'), inventory(source));
  return source;
}
