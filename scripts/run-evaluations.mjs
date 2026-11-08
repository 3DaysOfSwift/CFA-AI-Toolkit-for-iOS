import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function requireText(file, description) {
  if (!fs.existsSync(file)) throw Error(`Missing ${description}: ${file}`);
  return fs.readFileSync(file, 'utf8');
}

export function runEvaluations(base = root) {
  const fixtureDirectory = path.join(base, 'evals', 'flat-app');
  const source = requireText(path.join(fixtureDirectory, 'FlatApp.swift'), 'flat-app source fixture');
  const expected = requireText(path.join(fixtureDirectory, 'expected.md'), 'flat-app expected outcome');

  if (!source.includes('UserDefaults.standard') || !source.includes('Task {')) {
    throw Error('Flat-app fixture must retain its mixed persistence and task work.');
  }
  for (const expression of [/CFA\s+Architecture\s+Adoption/, /wallet feature/, /dedicated ViewModel/, /AppModel/]) {
    if (!expression.test(expected)) throw Error(`Flat-app expected outcome is missing: ${expression}`);
  }
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    runEvaluations();
    console.log('Flat-app evaluation fixture contains its required markers.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
