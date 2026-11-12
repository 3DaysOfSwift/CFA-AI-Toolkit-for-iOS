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
  const manualFixtures = [
    ['migration-handoff.md', /^## Synthetic checkpoint$/m, /^## Expected outcome$/m,
      /Report the migration as continuing/, /Complete the final CFA audit/,
      /human architecture review/, /Fail the evaluation if the response declares completion/],
    ['migration-continuation.md', /^## Synthetic checkpoint$/m, /^## Expected outcome$/m,
      /Continue implementation through Account and Saved Items/,
      /Do not ask the developer to prompt “continue”/,
      /only after the migration completion gate/,
      /asks whether it should continue/],
    ['product-design-scope/expected.md', /^## 1\. New product, first request$/m,
      /^## Evaluation rubric$/m, /preserves UI and saved preferences/,
      /No artwork installation or project-instruction edits/],
    ['explanations.md', /^\| Prompt \/ context \| Expected behaviour \| Failure \|$/m,
      /Apply the current shared refresh rule/,
      /Review this non-CFA app/,
      /not these agent behaviours/]
  ];
  for (const [file, ...markers] of manualFixtures) {
    const fixture = requireText(path.join(base, 'evals', file), 'manual evaluation fixture');
    for (const marker of markers) {
      if (!marker.test(fixture)) throw Error(`Evaluation fixture ${file} is missing: ${marker}`);
    }
  }
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    runEvaluations();
    console.log('CFA evaluation fixtures contain their required markers. Installed-host evaluations are manual.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
