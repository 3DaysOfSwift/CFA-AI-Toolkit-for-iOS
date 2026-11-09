import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildMap, launchTree} from '../src/program-map.mjs';

test('keeps only project calls and deduplicates index records', () => {
  const call = {file: '/app/A.swift', line: 3, column: 2, caller: 'a', callerID: 'A', callee: 'b', calleeID: 'B'};
  assert.deepEqual(buildMap([call, call, {...call, file: '/app-old/B.swift'}], '/app'), [{...call, file: 'A.swift'}]);
});

test('joins calls by symbol identity and bounds cycles', () => {
  const calls = [
    {file: 'App.swift', line: 1, caller: 'application(_:didFinishLaunchingWithOptions:)', callerID: 'delegate', callee: 'start()', calleeID: 'one'},
    {file: 'Feature.swift', line: 2, caller: 'start()', callerID: 'one', callee: 'start()', calleeID: 'two'},
    {file: 'Other.swift', line: 3, caller: 'start()', callerID: 'two', callee: 'start()', calleeID: 'one'},
    {file: 'App.swift', line: 4, caller: 'application(_:didFinishLaunchingWithOptions:)', callerID: 'delegate', callee: 'scheduleRefresh()', calleeID: 'leaf'}
  ];
  const tree = launchTree(calls);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].children[0].file, 'App.swift');
  assert.equal(tree[0].children[0].children[0].file, 'Feature.swift');
  assert.equal(tree[0].children[0].children[0].children[0].truncated, true);
  const leaf = launchTree(calls, 1)[0].children[1];
  assert.equal(leaf.name, 'scheduleRefresh()');
  assert.deepEqual(leaf.children, []);
  assert.equal(leaf.truncated, false);
});

test('keeps indexed calls when the compiler records a project path alias', t => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-index-alias-'));
  t.after(() => fs.rmSync(temporary, {recursive: true, force: true}));
  const root = fs.realpathSync(temporary);
  const project = path.join(root, 'project');
  const alias = path.join(root, 'alias');
  fs.mkdirSync(project);
  fs.symlinkSync(project, alias, 'dir');
  fs.writeFileSync(path.join(project, 'A.swift'), '');
  const call = {file: path.join(alias, 'A.swift'), line: 1, column: 1};
  assert.deepEqual(buildMap([call], project), [{...call, file: 'A.swift'}]);
});
