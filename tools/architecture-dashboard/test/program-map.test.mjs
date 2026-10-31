import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMap, launchTree} from '../src/program-map.mjs';

test('keeps only project calls and deduplicates index records', () => {
  const call = {file: '/app/A.swift', line: 3, column: 2, caller: 'a', callerID: 'A', callee: 'b', calleeID: 'B'};
  assert.deepEqual(buildMap([call, call, {...call, file: '/app-old/B.swift'}], '/app'), [{...call, file: 'A.swift'}]);
});

test('joins calls by symbol identity and bounds cycles', () => {
  const calls = [
    {file: 'App.swift', line: 1, caller: 'application(_:didFinishLaunchingWithOptions:)', callerID: 'delegate', callee: 'start()', calleeID: 'one'},
    {file: 'Feature.swift', line: 2, caller: 'start()', callerID: 'one', callee: 'start()', calleeID: 'two'},
    {file: 'Other.swift', line: 3, caller: 'start()', callerID: 'two', callee: 'start()', calleeID: 'one'}
  ];
  const tree = launchTree(calls);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].children[0].file, 'App.swift');
  assert.equal(tree[0].children[0].children[0].file, 'Feature.swift');
  assert.equal(tree[0].children[0].children[0].children[0].truncated, true);
});
