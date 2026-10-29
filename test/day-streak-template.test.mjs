import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = path.join(root, 'starter-apps/Todays Twenty');
const native = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/Day Streak.xctemplate');

test('Day Streak native template matches the editable project', () => {
  execFileSync('python3', ['scripts/sync-day-streak-template.py', '--check'], { cwd: root });
  const info = JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', path.join(native, 'TemplateInfo.plist')], { encoding: 'utf8' }));
  for (const node of info.Nodes) {
    assert.ok(fs.existsSync(path.join(native, info.Definitions[node].Path)), node);
  }
  for (const name of ['Practice', 'DayStreak', 'Settings']) {
    for (const relative of [
      `TimesThirty/2 - AppModel/Features/${name}/${name}Feature.swift`,
      `TimesThirty/1 - View/Views/${name}/${name}View.swift`,
      `TimesThirty/1 - View/Views/${name}/${name}ViewModel.swift`,
      `TimesThirtyTests/FeatureTests/${name}FeatureTests.swift`,
      `TimesThirtyTests/ViewModelTests/${name}ViewModelTests.swift`
    ]) assert.ok(fs.existsSync(path.join(project, relative)), relative);
  }
  assert.equal(info.Targets[0].SharedSettings.PRODUCT_BUNDLE_IDENTIFIER, 'com.3DaysOfSwiftConcurrency.___PACKAGENAMEASIDENTIFIER___');
});

test('Day Streak ships matching light/dark launch colours and a starter icon', () => {
  const assets = path.join(project, 'TimesThirty/Assets.xcassets');
  const launch = JSON.parse(fs.readFileSync(path.join(assets, 'LaunchBackground.colorset/Contents.json')));
  const values = launch.colors.map(item => ['red', 'green', 'blue'].map(component => Number(item.color.components[component])));
  assert.deepEqual(values, [[0.96078, 0.96863, 0.98824], [0.02353, 0.04314, 0.08627]]);
  assert.ok(fs.statSync(path.join(assets, 'AppIcon.appiconset/CFA-App-Icon.png')).size > 1000);
});
