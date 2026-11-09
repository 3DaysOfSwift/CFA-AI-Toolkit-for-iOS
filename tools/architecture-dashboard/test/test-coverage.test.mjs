import test from 'node:test';
import assert from 'node:assert/strict';
import { importTestCoverage } from '../src/test-coverage.mjs';
test('coverage uses measured counts for one explicit target, never averaged percentages',()=>{
  const input={targets:[{name:'App',coveredLines:3,executableLines:8,lineCoverage:1},{name:'Tests',coveredLines:100,executableLines:100}]};
  assert.equal(importTestCoverage(input,'App').value,37.5);
  assert.throws(()=>importTestCoverage(input,'Missing'));
  assert.throws(()=>importTestCoverage(input));
  assert.throws(()=>importTestCoverage({targets:[{name:'App',coveredLines:9,executableLines:8}]},'App'));
  assert.equal(importTestCoverage({targets:[{name:'App',coveredLines:0,executableLines:0}]},'App').value,null);
  assert.equal(importTestCoverage({targets:[{name:'App',coveredLines:0,executableLines:8}]},'App').value,0);
});

test('rounding preserves the distinction between partial and complete coverage', () => {
  const coverage = coveredLines =>
    importTestCoverage({ targets: [{ name: 'App', coveredLines, executableLines: 10000 }] }, 'App').value;
  assert.equal(coverage(1), 0.1);
  assert.equal(coverage(9999), 99.9);
  assert.equal(coverage(10000), 100);
});
