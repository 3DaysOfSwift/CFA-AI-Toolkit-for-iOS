import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runEvaluations } from '../scripts/run-evaluations.mjs';
import { root } from '../scripts/sync.mjs';

test('evaluation fixtures retain their substantive release criteria', () => {
  assert.equal(runEvaluations(root), true);
});

test('evaluation validation rejects a continuation fixture that permits checkpoint stopping', t => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-evaluations-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  fs.cpSync(path.join(root, 'evals'), path.join(base, 'evals'), { recursive: true });
  const fixture = path.join(base, 'evals/migration-continuation.md');
  const original = fs.readFileSync(fixture, 'utf8');
  fs.writeFileSync(fixture, original.replace('Do not ask the developer to prompt “continue”', 'Pause after each checkpoint'));
  assert.throws(() => runEvaluations(base), /migration-continuation\.md is missing/);
});
