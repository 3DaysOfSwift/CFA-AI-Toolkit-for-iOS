import test from 'node:test';
import assert from 'node:assert/strict';
import {folderReview} from '../src/folders.mjs';
test('folder checks describe naming and pairing without guessing architecture',()=>{
  const files=['App/1 - View/Today/TodayView.swift','App/1 - View/Today/TodayViewModel.swift','App/2 - AppModel/AppModel.swift','App/2 - AppModel/Features/Coffee/CoffeeFeature.swift'].map(path=>({path}));
  assert.ok(folderReview(files).checks.every(c=>c.matched));
  const missing=folderReview(files.filter(f=>!f.path.endsWith('TodayView.swift')));
  assert.equal(missing.checks.at(-1).matched,false);
  assert.equal(folderReview([]).checks.at(-1).matched,null);
  assert.equal(folderReview(files).root.children[0].name,'App');
});
