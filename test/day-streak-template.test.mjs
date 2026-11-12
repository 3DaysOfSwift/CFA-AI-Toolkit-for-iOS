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
  const info = JSON.parse(execFileSync('python3', ['-c', 'import json, plistlib, sys; print(json.dumps(plistlib.load(open(sys.argv[1], "rb"))))', path.join(native, 'TemplateInfo.plist')], { encoding: 'utf8' }));
  for (const node of info.Nodes) {
    assert.ok(fs.existsSync(path.join(native, info.Definitions[node].Path)), node);
  }
  for (const name of ['Practice', 'DayStreak', 'Settings']) {
    for (const relative of [
      `TimesThirty/2 - AppModel/Features/${name}/${name}Feature.swift`,
      `TimesThirty/1 - View/Views/${name}/${name}View.swift`,
      `TimesThirty/1 - View/Views/${name}/${name}ViewModel.swift`,
      `TimesThirtyTests/FeatureTests/${name}FeatureTests.swift`,
      `TimesThirtyTests/View model tests/${name}ViewModelTests.swift`
    ]) assert.ok(fs.existsSync(path.join(project, relative)), relative);
  }
  assert.equal(info.Targets.length, 1);
  assert.equal(info.Targets[0].SharedSettings.SWIFT_DEFAULT_ACTOR_ISOLATION, 'nonisolated');
  const testTemplate = path.join(path.dirname(native), 'Day Streak Tests.xctemplate');
  const testInfo = JSON.parse(execFileSync('python3', ['-c', 'import json, plistlib, sys; print(json.dumps(plistlib.load(open(sys.argv[1], "rb"))))', path.join(testTemplate, 'TemplateInfo.plist')], { encoding: 'utf8' }));
  assert.equal(testInfo.Targets[0].SharedSettings.PRODUCT_BUNDLE_IDENTIFIER, '___VARIABLE_bundleIdentifierPrefix___.___PROJECTNAME:identifier___.___PACKAGENAME:identifier___');
  for (const node of testInfo.Nodes) assert.ok(fs.existsSync(path.join(testTemplate, testInfo.Definitions[node].Path)), node);
});

test('Day Streak ships matching light/dark launch colours and a starter icon', () => {
  const assets = path.join(project, 'TimesThirty/Assets.xcassets');
  const launch = JSON.parse(fs.readFileSync(path.join(assets, 'LaunchBackground.colorset/Contents.json')));
  const values = launch.colors.map(item => ['red', 'green', 'blue'].map(component => Number(item.color.components[component])));
  assert.deepEqual(values, [[0.96078, 0.96863, 0.98824], [0.02353, 0.04314, 0.08627]]);
  assert.ok(fs.statSync(path.join(assets, 'AppIcon.appiconset/CFA-App-Icon.png')).size > 1000);
});

test('Day Streak keeps recent-history selection in its Feature', () => {
  const source = path.join(native, 'Source/Application');
  const feature = fs.readFileSync(
    path.join(source, '2 - AppModel/Features/DayStreak/DayStreakFeature.swift'),
    'utf8'
  );
  const viewModel = fs.readFileSync(
    path.join(source, '1 - View/Views/DayStreak/DayStreakViewModel.swift'),
    'utf8'
  );
  const view = fs.readFileSync(
    path.join(source, '1 - View/Views/DayStreak/DayStreakView.swift'),
    'utf8'
  );

  assert.match(feature, /private static let recentCompletedDayLimit = 30/);
  assert.match(feature, /var recentCompletedDays: \[Date\]/);
  assert.match(viewModel, /dayStreakFeature\.recentCompletedDays/);
  assert.doesNotMatch(viewModel, /\.sorted|\.prefix/);
  assert.doesNotMatch(view, /\.sorted|\.prefix/);
});
