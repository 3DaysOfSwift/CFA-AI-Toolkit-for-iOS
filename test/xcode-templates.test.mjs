import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const names = ['CFA App', 'Habit Tracker'];

for (const [name, application, assets, configuration, light, dark] of [
  ['Habit Tracker', 'Habit Tracker iOS/HabitTrackerTemplate', 'Habit Tracker iOS/HabitTrackerTemplate/Assets.xcassets', 'Habit Tracker iOS/HabitTrackerTemplate.xcodeproj/project.pbxproj', [0.96, 0.96, 0.94], [0.08, 0.09, 0.09]],
  ['Habit Tracker Pro', 'Habit Tracker Pro iOS/HabitTrackerPro', 'Habit Tracker Pro iOS/HabitTrackerPro/Assets.xcassets', 'Habit Tracker Pro iOS/HabitTrackerPro.xcodeproj/project.pbxproj', [0.96, 0.96, 0.94], [0.08, 0.09, 0.09]],
  ['CFA App native template', 'Project Templates/iOS/Application/CFA App.xctemplate/Source/Application', 'Project Templates/iOS/Application/CFA App.xctemplate/Source/Assets.xcassets', 'Project Templates/iOS/Application/CFA App.xctemplate/TemplateInfo.plist', [0.94902, 0.94902, 0.96863], [0.04, 0.10, 0.16]],
  ['Habit Tracker native template', 'Project Templates/iOS/Application/Habit Tracker.xctemplate/Source/Application', 'Project Templates/iOS/Application/Habit Tracker.xctemplate/Source/Assets.xcassets', 'Project Templates/iOS/Application/Habit Tracker.xctemplate/TemplateInfo.plist', [0.96, 0.96, 0.94], [0.08, 0.09, 0.09]]
]) {
  test(`${name} supplies system-adaptive launch colours and a wired native launch screen`, () => {
    const base = path.join(root, 'templates/Xcode');
    const catalog = JSON.parse(fs.readFileSync(path.join(base, assets, 'LaunchBackground.colorset/Contents.json'), 'utf8'));
    const anyColour = catalog.colors.find(colour => !colour.appearances);
    const darkColour = catalog.colors.find(colour => colour.appearances?.some(value => value.appearance === 'luminosity' && value.value === 'dark'));
    for (const [colour, expected] of [[anyColour, light], [darkColour, dark]]) {
      assert.ok(colour, 'Both Any and Dark variants must exist');
      assert.equal(colour.color['color-space'], 'srgb');
      assert.deepEqual(['red', 'green', 'blue'].map(channel => Number(colour.color.components[channel])), expected);
      assert.equal(Number(colour.color.components.alpha), 1);
    }
    const storyboard = fs.readFileSync(path.join(base, application, '3 - App Resources/LaunchScreen.storyboard'), 'utf8');
    assert.match(storyboard, /launchScreen="YES"/);
    assert.match(storyboard, /key="backgroundColor" name="LaunchBackground"/);
    assert.doesNotMatch(storyboard, /customClass=|userInterfaceStyle=/);
    const settings = fs.readFileSync(path.join(base, configuration), 'utf8');
    const iconSet = path.join(base, assets, 'AppIcon.appiconset');
    const iconContents = JSON.parse(fs.readFileSync(path.join(iconSet, 'Contents.json'), 'utf8'));
    const imageName = iconContents.images.find(image => image.size === '1024x1024')?.filename;
    assert.equal(imageName, 'CFA-App-Icon.png');
    assert.deepEqual(
      fs.readFileSync(path.join(iconSet, imageName)),
      fs.readFileSync(path.join(base, 'Project Templates/iOS/Application/CFA App.xctemplate/Source/Assets.xcassets/AppIcon.appiconset/CFA-App-Icon.png'))
    );
    assert.match(settings, /ASSETCATALOG_COMPILER_APPICON_NAME(?: = AppIcon;|<\/key>\s*<string>AppIcon<\/string>)/);
    assert.match(settings, /INFOPLIST_KEY_UILaunchStoryboardName(?: = LaunchScreen;|<\/key>\s*<string>LaunchScreen<\/string>)/);
    assert.doesNotMatch(settings, /INFOPLIST_KEY_UIUserInterfaceStyle/);
    if (configuration.endsWith('TemplateInfo.plist')) {
      assert.match(settings, /Source\/Application\/3 - App Resources\/LaunchScreen.storyboard/);
    }
  });
}

test('starter Settings screens use an About section and a version footer outside cells', () => {
  const applications = [
    'Habit Tracker iOS/HabitTrackerTemplate',
    'Habit Tracker Pro iOS/HabitTrackerPro',
    'Project Templates/iOS/Application/CFA App.xctemplate/Source/Application',
    'Project Templates/iOS/Application/Habit Tracker.xctemplate/Source/Application'
  ];
  for (const application of applications) {
    const settings = path.join(root, 'templates/Xcode', application, '1 - View/Views/Settings');
    const view = fs.readFileSync(path.join(settings, 'SettingsView.swift'), 'utf8');
    const viewModel = fs.readFileSync(path.join(settings, 'SettingsViewModel.swift'), 'utf8');
    assert.match(view, /Text\("About"\)/);
    assert.match(view, /Text\(viewModel.appName\)/);
    assert.match(view, /CFA iOS Architecture/);
    assert.match(view, /Built with Cooperative Feature Architecture\./);
    assert.match(view, /footer: \{[\s\S]*Text\(viewModel.versionDescription\)/);
    assert.doesNotMatch(view, /LabeledContent\("Version"/);
    assert.doesNotMatch(view, /On.device AI|LabeledContent\("AI"/);
    assert.match(viewModel, /settingsFeature.appVersion/);
    assert.match(viewModel, /settingsFeature.buildNumber/);
  }
});

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
