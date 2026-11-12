import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { verifyXcodeTemplateStructure } from '../scripts/verify-xcode-template-structure.mjs';

const root = path.resolve(import.meta.dirname, '..');
const app = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/CFA App.xctemplate');
const tests = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/CFA App Tests.xctemplate');

test('CFA App is a neutral, strict-concurrency foundation', () => {
  assert.equal(verifyXcodeTemplateStructure(app), true);
  const source = fs.readdirSync(path.join(app, 'Source', 'Application'), { recursive: true, encoding: 'utf8' })
    .filter(file => file.endsWith('.swift'))
    .map(file => fs.readFileSync(path.join(app, 'Source', 'Application', file), 'utf8')).join('\n');
  assert.doesNotMatch(source, /GitRepos|GitHub|URLSession|RepoCache|SettingsFeature|ThemeManager/);
  assert.match(source, /@State private var viewModel = ContentViewModel\(\)/);
  assert.match(source, /static let shared = AppModel\(\)/);
});

test('CFA App includes a matching minimal test component', () => {
  for (const file of ['Source/AppModel tests/AppModelTests.swift', 'Source/View model tests/ContentViewModelTests.swift']) {
    assert.equal(fs.existsSync(path.join(tests, file)), true, file);
  }
  execFileSync('plutil', ['-lint', path.join(tests, 'TemplateInfo.plist')]);
});

test('Git Repos remains an openable optional remote-list starter', () => {
  const starter = path.join(root, 'starter-apps/Git Repos');
  assert.equal(fs.existsSync(path.join(starter, 'GitRepos.xcodeproj/project.pbxproj')), true);
  assert.equal(fs.existsSync(path.join(starter, 'GitRepos/Assets.xcassets/AppIcon.appiconset/GitRepos-App-Icon.png')), true);
  assert.equal(fs.existsSync(path.join(starter, 'GitRepos/2 - AppModel/Features/Git Repos/GitReposFeature.swift')), true);
});
