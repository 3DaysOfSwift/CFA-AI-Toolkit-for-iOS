import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const names = ['CFA App', 'Habit Tracker'];
function temporary(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-xcode-templates-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}
function target(destination, name) {
  return path.join(destination, 'Project Templates/iOS/Application', `${name}.xctemplate`);
}
function install(destination, ...args) {
  return execFileSync(process.execPath, ['scripts/install-xcode-template.mjs', '--destination', destination, ...args], { cwd: root, encoding: 'utf8' });
}

test('both Xcode templates install and updating preserves the previous copy', t => {
  const destination = temporary(t);
  install(destination);
  for (const name of names) assert.ok(fs.existsSync(path.join(target(destination, name), 'TemplateInfo.plist')));
  fs.writeFileSync(path.join(target(destination, 'Habit Tracker'), 'local-note.txt'), 'Keep this');
  install(destination, '--replace');
  const parent = path.dirname(target(destination, 'Habit Tracker'));
  const backup = fs.readdirSync(parent).find(name => name.startsWith('Habit Tracker.xctemplate.backup-'));
  assert.equal(fs.readFileSync(path.join(parent, backup, 'local-note.txt'), 'utf8'), 'Keep this');
});

test('an unmanaged second template prevents changing either destination', t => {
  const destination = temporary(t);
  fs.mkdirSync(target(destination, 'Habit Tracker'), { recursive: true });
  const result = spawnSync(process.execPath, ['scripts/install-xcode-template.mjs', '--destination', destination, '--replace'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /not installed by CFA/);
  assert.equal(fs.existsSync(target(destination, 'CFA App')), false);
});

test('Habit Tracker export stays in sync with the buildable project', () => {
  execFileSync('python3', ['scripts/sync-habit-template.py', '--check'], { cwd: root });
  const project = path.join(root, 'templates/Xcode/Habit Tracker iOS');
  function files(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : [entry.name]);
  }
  const source = files(path.join(project, 'HabitTrackerTemplate'));
  const tests = files(path.join(project, 'HabitTrackerTemplateTests'));
  for (const file of source.filter(name => /(?:ViewModel|Feature)\.swift$/.test(name))) {
    assert.ok(tests.includes(file.replace('.swift', 'Tests.swift')), `${file} requires a named test file`);
  }
  const pbx = fs.readFileSync(path.join(project, 'HabitTrackerTemplate.xcodeproj/project.pbxproj'), 'utf8');
  assert.ok(!pbx.includes('DEVELOPMENT_TEAM'));
  assert.match(pbx, /com\.3DaysOfSwiftConcurrency\.HabitTrackerTemplate\.HabitTrackerTemplateTests/);
});

test('Node-free macOS installer installs and updates both templates', { skip: process.platform !== 'darwin' }, t => {
  const destination = temporary(t);
  const options = { cwd: root, env: { ...process.env, CFA_TEMPLATE_DESTINATION: destination }, stdio: 'pipe' };
  execFileSync('/bin/zsh', ['Install Xcode Template.command'], options);
  execFileSync('/bin/zsh', ['Install Xcode Template.command'], options);
  for (const name of names) assert.ok(fs.existsSync(path.join(target(destination, name), 'TemplateInfo.plist')));
});
