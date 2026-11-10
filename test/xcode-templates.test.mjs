import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const names = ['CFA App', 'Habit Tracker', 'Day Streak'];

test('generated template files import the frameworks used by their declarations', () => {
  const application = 'templates/Xcode/Project Templates/iOS/Application';
  const expectations = new Map([
    ['Habit Tracker.xctemplate/Source/Application/1 - View/___PACKAGENAMEASIDENTIFIER___App.swift', ['SwiftUI', 'UIKit']],
    ['Day Streak.xctemplate/Source/Application/1 - View/___PACKAGENAMEASIDENTIFIER___App.swift', ['SwiftUI']],
    ['Day Streak.xctemplate/Source/Application/1 - View/Theme/ThemeManager.swift', ['Observation', 'SwiftUI', 'UIKit']]
  ]);
  for (const [relative, modules] of expectations) {
    const source = fs.readFileSync(path.join(root, application, relative), 'utf8');
    for (const module of modules) assert.match(source, new RegExp(`^import ${module}$`, 'm'), `${relative} requires ${module}`);
  }
});

test('screen-level template roots own dedicated ViewModels', () => {
  const application = path.join(root, 'templates/Xcode/Project Templates/iOS/Application');
  for (const name of ['Habit Tracker', 'Day Streak']) {
    const source = path.join(application, `${name}.xctemplate/Source/Application/1 - View/Views/Root`);
    const view = fs.readFileSync(path.join(source, 'ContentView.swift'), 'utf8');
    const viewModel = fs.readFileSync(path.join(source, 'ContentViewModel.swift'), 'utf8');

    assert.match(view, /@State private var viewModel = ContentViewModel\(\)/);
    assert.match(view, /TabView\(selection: \$viewModel\.selectedTab\)/);
    assert.match(viewModel, /@MainActor\s+@Observable\s+final class ContentViewModel/);
    assert.match(viewModel, /var selectedTab: Tab = \./);
  }
});

test('Habit Tracker keeps operation failures in Features and presentation text in ViewModels', () => {
  const source = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/Habit Tracker.xctemplate/Source/Application');
  const feature = fs.readFileSync(path.join(source, '2 - AppModel/Features/Habits/HabitsFeature.swift'), 'utf8');
  const domain = fs.readFileSync(path.join(source, '2 - AppModel/Features/Habits/Habit.swift'), 'utf8');
  const store = fs.readFileSync(path.join(source, '2 - AppModel/User Data Storage/Local/HabitStore.swift'), 'utf8');
  assert.match(feature, /private\(set\) var loadError: \(any Error\)\?/);
  assert.doesNotMatch(feature, /loadError\s*=\s*error\.localizedDescription/);
  assert.doesNotMatch(domain, /LocalizedError|errorDescription/);
  assert.doesNotMatch(store, /LocalizedError|errorDescription/);

  for (const screen of ['Habits', 'Today', 'DayStreak']) {
    const viewModel = fs.readFileSync(path.join(source, `1 - View/Views/${screen}/${screen}ViewModel.swift`), 'utf8');
    assert.match(viewModel, /var loadError: String\?/);
    assert.match(viewModel, /\.loadError\.map/);
  }
  for (const screen of ['AddHabit', 'Today']) {
    const viewModel = fs.readFileSync(path.join(source, `1 - View/Views/${screen}/${screen}ViewModel.swift`), 'utf8');
    assert.match(viewModel, /private func message\(for error: any Error\)/);
    assert.doesNotMatch(viewModel, /error\.localizedDescription/);
  }
});

test('Habit Tracker keeps entry validity in its Feature boundary', () => {
  const source = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/Habit Tracker.xctemplate/Source/Application');
  const feature = fs.readFileSync(path.join(source, '2 - AppModel/Features/Habits/HabitsFeature.swift'), 'utf8');
  const todayFeature = fs.readFileSync(path.join(source, '2 - AppModel/Features/Today/TodayFeature.swift'), 'utf8');
  const viewModel = fs.readFileSync(path.join(source, '1 - View/Views/Today/TodayViewModel.swift'), 'utf8');

  assert.match(feature, /func isValidEntryValue\(_ value: Int\) -> Bool/);
  assert.match(feature, /guard isValidEntryValue\(value\) else/);
  assert.match(todayFeature, /func isValidEntryValue\(_ value: Int\) -> Bool/);
  assert.match(viewModel, /todayFeature\.isValidEntryValue/);
  assert.doesNotMatch(viewModel, /value >= 0/);
});

test('Habit Tracker separates its Feature repository from its SwiftData model actor', () => {
  const source = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/Habit Tracker.xctemplate/Source/Application');
  const manager = fs.readFileSync(path.join(source, '2 - AppModel/User Data Storage/Local/SwiftDataManager.swift'), 'utf8');
  const store = fs.readFileSync(path.join(source, '2 - AppModel/User Data Storage/Local/HabitStore.swift'), 'utf8');

  assert.match(manager, /actor SwiftDataManager: HabitsRepository/);
  assert.match(manager, /private var habitStore: HabitStore\?/);
  assert.match(store, /@ModelActor\s+actor HabitStore\s*\{/);
  assert.doesNotMatch(store, /actor HabitStore: HabitsRepository/);
  assert.equal(
    fs.existsSync(path.join(source, '2 - AppModel/User Data Storage/Local/HabitRepository.swift')),
    false
  );
});

test('Habit Tracker keeps saved theme ownership in SettingsFeature', () => {
  const source = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/Habit Tracker.xctemplate/Source/Application');
  const feature = fs.readFileSync(path.join(source, '2 - AppModel/Features/Settings/SettingsFeature.swift'), 'utf8');
  const manager = fs.readFileSync(path.join(source, '1 - View/Theme/ThemeManager.swift'), 'utf8');
  const viewModel = fs.readFileSync(path.join(source, '1 - View/Views/Settings/SettingsViewModel.swift'), 'utf8');
  const view = fs.readFileSync(path.join(source, '1 - View/Views/Settings/SettingsView.swift'), 'utf8');

  assert.match(feature, /private\(set\) var selectedTheme: ThemeSelection/);
  assert.match(feature, /func selectTheme\(_ theme: ThemeSelection\)/);
  assert.doesNotMatch(feature, /SwiftUI|ColorScheme|Color\(/);
  assert.doesNotMatch(manager, /UserDefaults|defaults\.set/);
  assert.match(manager, /private let settingsFeature: SettingsFeature/);
  assert.match(viewModel, /func selectTheme\(_ theme: ThemeSelection\)/);
  assert.match(view, /set: \{ viewModel\.selectTheme\(\$0\) \}/);
  assert.doesNotMatch(view, /themeManager\.select\(/);
});

test('Habit Tracker shares equivalent record commands at the Feature boundary', () => {
  const file = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/Habit Tracker.xctemplate/Source/Application/2 - AppModel/Features/Habits/HabitsFeature.swift');
  const feature = fs.readFileSync(file, 'utf8');

  assert.match(feature, /private var lastRecord: \(habitID: UUID, value: Int\)\?/);
  assert.match(feature, /lastRecord\?\.habitID == habitID/);
  assert.match(feature, /try await lastRecordTask\.value/);
});

test('Day Streak keeps saved theme ownership in SettingsFeature', () => {
  const source = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/Day Streak.xctemplate/Source/Application');
  const feature = fs.readFileSync(path.join(source, '2 - AppModel/Features/Settings/SettingsFeature.swift'), 'utf8');
  const manager = fs.readFileSync(path.join(source, '1 - View/Theme/ThemeManager.swift'), 'utf8');
  const viewModel = fs.readFileSync(path.join(source, '1 - View/Views/Settings/SettingsViewModel.swift'), 'utf8');
  const view = fs.readFileSync(path.join(source, '1 - View/Views/Settings/SettingsView.swift'), 'utf8');

  assert.match(feature, /private\(set\) var selectedTheme: ThemeChoice/);
  assert.match(feature, /enum ThemeChoice: String, CaseIterable, Identifiable/);
  assert.match(feature, /func selectTheme\(_ theme: ThemeChoice\)/);
  assert.doesNotMatch(feature, /SwiftUI|ColorScheme|Color\(/);
  assert.doesNotMatch(manager, /UserDefaults|defaults\.set/);
  assert.match(manager, /private let settingsFeature: SettingsFeature/);
  assert.match(viewModel, /func selectTheme\(_ theme: ThemeChoice\)/);
  assert.match(view, /set: \{ viewModel\.selectTheme\(\$0\) \}/);
  assert.doesNotMatch(view, /themeManager\.select/);
});

test('Day Streak maps domain outcomes to presentation inside ViewModels', () => {
  const source = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/Day Streak.xctemplate/Source/Application');
  const model = fs.readFileSync(path.join(source, '2 - AppModel/Features/Practice/PracticeSession.swift'), 'utf8');
  const settingsFeature = fs.readFileSync(path.join(source, '2 - AppModel/Features/Settings/SettingsFeature.swift'), 'utf8');
  const practiceViewModel = fs.readFileSync(path.join(source, '1 - View/Views/Practice/PracticeViewModel.swift'), 'utf8');
  const streakViewModel = fs.readFileSync(path.join(source, '1 - View/Views/DayStreak/DayStreakViewModel.swift'), 'utf8');
  const settingsViewModel = fs.readFileSync(path.join(source, '1 - View/Views/Settings/SettingsViewModel.swift'), 'utf8');

  assert.doesNotMatch(model, /LocalizedError|errorDescription|var title:|var detail:/);
  assert.match(model, /var earnsPoint: Bool/);
  assert.match(model, /func isCorrectChoice\(_ choice: Int\)/);
  assert.match(practiceViewModel, /func difficultyDescription\(_ difficulty: Difficulty\)/);
  assert.match(practiceViewModel, /private func message\(for error: any Error/);
  assert.doesNotMatch(practiceViewModel, /error\.localizedDescription/);
  assert.doesNotMatch(practiceViewModel, /wrongAnswers\.isEmpty|wrongAnswers\.contains/);
  assert.doesNotMatch(streakViewModel, /error\.localizedDescription/);
  assert.doesNotMatch(settingsFeature, /Bundle\.main|appInformation|appVersion|buildNumber|"Version/);
  assert.match(settingsViewModel, /Bundle\.main\.infoDictionary/);
  assert.match(settingsViewModel, /var versionDescription: String/);
});

test('Day Streak shares equivalent refreshes at the Feature boundary', () => {
  const source = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/Day Streak.xctemplate/Source/Application');
  const feature = fs.readFileSync(path.join(source, '2 - AppModel/Features/Practice/PracticeFeature.swift'), 'utf8');
  const viewModel = fs.readFileSync(path.join(source, '1 - View/Views/Practice/PracticeViewModel.swift'), 'utf8');

  assert.match(feature, /private var refreshTask: Task<Void, Error>\?/);
  assert.match(feature, /func refresh\(\) async throws/);
  assert.match(feature, /if let refreshTask\s*\{\s*try await refreshTask\.value/);
  assert.match(viewModel, /try await practiceFeature\.refresh\(\)/);
});

test('Day Streak shares consecutive equivalent commands at the Feature boundary', () => {
  const file = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/Day Streak.xctemplate/Source/Application/2 - AppModel/Features/Practice/PracticeFeature.swift');
  const feature = fs.readFileSync(file, 'utf8');

  assert.match(feature, /private var lastCommand: Command\?/);
  assert.match(feature, /if lastCommand == command, let lastCommandTask/);
  assert.match(feature, /try await lastCommandTask\.value/);
});

test('Day Streak gives reusable presentation components purpose-named files', () => {
  const directory = path.join(
    root,
    'templates/Xcode/Project Templates/iOS/Application/Day Streak.xctemplate/Source/Application/1 - View/Views/Components'
  );
  const components = [
    'DayBoundaryObserver',
    'HeroCard',
    'OperationErrorView',
    'PracticeButtonStyle',
    'PrimaryAction',
    'StreakStrip'
  ];

  for (const component of components) {
    assert.ok(fs.existsSync(path.join(directory, `${component}.swift`)), component);
  }
  assert.equal(fs.existsSync(path.join(directory, 'PracticeComponents.swift')), false);
});

test('Day Streak presents the generated app identity instead of its source-project name', () => {
  const source = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/Day Streak.xctemplate/Source/Application');
  const practiceView = fs.readFileSync(path.join(source, '1 - View/Views/Practice/PracticeView.swift'), 'utf8');
  const practiceViewModel = fs.readFileSync(path.join(source, '1 - View/Views/Practice/PracticeViewModel.swift'), 'utf8');
  const settingsView = fs.readFileSync(path.join(source, '1 - View/Views/Settings/SettingsView.swift'), 'utf8');
  const settingsViewModel = fs.readFileSync(path.join(source, '1 - View/Views/Settings/SettingsViewModel.swift'), 'utf8');

  for (const file of [practiceView, practiceViewModel, settingsView, settingsViewModel]) {
    assert.doesNotMatch(file, /Todays Twenty|TimesThirty/);
  }
  assert.match(practiceView, /navigationTitle\(viewModel\.appName\)/);
  assert.match(settingsView, /Text\(viewModel\.appName\)/);
  assert.match(practiceViewModel, /var appName: String/);
  assert.match(settingsViewModel, /var appName: String/);
});

test('CFA App keeps theme presentation outside its AppModel layer', () => {
  const source = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/CFA App.xctemplate/Source/Application');
  const model = fs.readFileSync(path.join(source, '2 - AppModel/Features/Settings/AppColourTheme.swift'), 'utf8');
  const palette = fs.readFileSync(path.join(source, '1 - View/Theme/AppColourTheme+Palette.swift'), 'utf8');
  const viewModel = fs.readFileSync(path.join(source, '1 - View/Views/Settings/SettingsViewModel.swift'), 'utf8');
  const view = fs.readFileSync(path.join(source, '1 - View/Views/Settings/SettingsView.swift'), 'utf8');

  assert.doesNotMatch(model, /var name:|defaultLight|defaultDark|SwiftUI|ColorScheme|Color\(/);
  assert.match(palette, /static let defaultLight/);
  assert.match(palette, /static let defaultDark/);
  assert.match(viewModel, /func themeName\(_ theme: AppColourTheme\)/);
  assert.match(view, /Text\(viewModel\.themeName\(theme\)\)/);
});

test('CFA App omits unused example-only extensions', () => {
  const file = path.join(
    root,
    'templates/Xcode/Project Templates/iOS/Application/CFA App.xctemplate/Source/Application/4 - Swift Extensions/Date+Display.swift'
  );

  assert.equal(fs.existsSync(file), false);
});

test('template AppModel roots remain fixed composition graphs', () => {
  for (const name of names) {
    const file = path.join(root, 'templates/Xcode/Project Templates/iOS/Application', `${name}.xctemplate/Source/Application/2 - AppModel/AppModel.swift`);
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /@Observable|import Observation/);
    assert.match(source, /static let shared\s*=\s*AppModel\.live\(\)/);
  }
});

test('Day Streak omits a no-op application lifecycle adapter', () => {
  const source = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/Day Streak.xctemplate/Source/Application');
  const app = fs.readFileSync(path.join(source, '1 - View/___PACKAGENAMEASIDENTIFIER___App.swift'), 'utf8');
  const appModel = fs.readFileSync(path.join(source, '2 - AppModel/AppModel.swift'), 'utf8');

  assert.doesNotMatch(app, /UIApplicationDelegate|UIApplicationDelegateAdaptor|applicationDidFinishLaunching/);
  assert.doesNotMatch(appModel, /didFinishLaunching|applicationDidFinishLaunching/);
});

test('template Apps compose presentation managers without another shared graph', () => {
  for (const [name, appFile] of [
    ['CFA App', '___PACKAGENAME:identifier___App.swift'],
    ['Habit Tracker', '___PACKAGENAMEASIDENTIFIER___App.swift'],
    ['Day Streak', '___PACKAGENAMEASIDENTIFIER___App.swift']
  ]) {
    const source = path.join(root, 'templates/Xcode/Project Templates/iOS/Application', `${name}.xctemplate/Source/Application`);
    const manager = fs.readFileSync(path.join(source, '1 - View/Theme/ThemeManager.swift'), 'utf8');
    const app = fs.readFileSync(path.join(source, '1 - View', appFile), 'utf8');
    assert.doesNotMatch(manager, /static let shared/);
    assert.match(app, /@State private var themeManager = ThemeManager\(settingsFeature: AppModel\.shared\.settingsFeature\)/);
  }
});

test('native templates provide the accent color expected by generated Xcode projects', () => {
  for (const name of names) {
    const file = path.join(root, 'templates/Xcode/Project Templates/iOS/Application', `${name}.xctemplate/Source/Assets.xcassets/AccentColor.colorset/Contents.json`);
    const asset = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.ok(asset.colors.some(color => color.idiom === 'universal'), name);
  }
});

test('templates using UserDefaults declare its required-reason API', () => {
  for (const name of names) {
    const template = path.join(root, 'templates/Xcode/Project Templates/iOS/Application', `${name}.xctemplate`);
    const sourceRoot = path.join(template, 'Source/Application');
    const swiftSources = fs.readdirSync(sourceRoot, { recursive: true, encoding: 'utf8' })
      .filter(file => file.endsWith('.swift'))
      .map(file => fs.readFileSync(path.join(sourceRoot, file), 'utf8'))
      .join('\n');
    if (!/\bUserDefaults\b/.test(swiftSources)) continue;

    const manifestFile = path.join(sourceRoot, '3 - App Resources/PrivacyInfo.xcprivacy');
    const manifest = JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', manifestFile], { encoding: 'utf8' }));
    const declaration = manifest.NSPrivacyAccessedAPITypes?.find(
      entry => entry.NSPrivacyAccessedAPIType === 'NSPrivacyAccessedAPICategoryUserDefaults'
    );
    assert.ok(declaration, `${name} must declare UserDefaults access`);
    assert.ok(declaration.NSPrivacyAccessedAPITypeReasons?.includes('CA92.1'), `${name} must declare reason CA92.1`);
  }
});

for (const [name, application, assets, configuration, light, dark] of [
  ['Habit Tracker', 'Habit Tracker/HabitTrackerTemplate', 'Habit Tracker/HabitTrackerTemplate/Assets.xcassets', 'Habit Tracker/HabitTrackerTemplate.xcodeproj/project.pbxproj', [0.96, 0.96, 0.94], [0.08, 0.09, 0.09]],
  ['Habit Tracker Pro', 'Habit Tracker Pro/HabitTrackerPro', 'Habit Tracker Pro/HabitTrackerPro/Assets.xcassets', 'Habit Tracker Pro/HabitTrackerPro.xcodeproj/project.pbxproj', [0.96, 0.96, 0.94], [0.08, 0.09, 0.09]],
  ['CFA App native template', 'Project Templates/iOS/Application/CFA App.xctemplate/Source/Application', 'Project Templates/iOS/Application/CFA App.xctemplate/Source/Assets.xcassets', 'Project Templates/iOS/Application/CFA App.xctemplate/TemplateInfo.plist', [0.94902, 0.94902, 0.96863], [0.04, 0.10, 0.16]],
  ['Habit Tracker native template', 'Project Templates/iOS/Application/Habit Tracker.xctemplate/Source/Application', 'Project Templates/iOS/Application/Habit Tracker.xctemplate/Source/Assets.xcassets', 'Project Templates/iOS/Application/Habit Tracker.xctemplate/TemplateInfo.plist', [0.96, 0.96, 0.94], [0.08, 0.09, 0.09]]
]) {
  test(`${name} supplies system-adaptive launch colours and a wired native launch screen`, () => {
    const base = path.join(root, application.startsWith('Project Templates/') ? 'templates/Xcode' : 'starter-apps');
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
      fs.readFileSync(path.join(root, 'templates/Xcode/Project Templates/iOS/Application/CFA App.xctemplate/Source/Assets.xcassets/AppIcon.appiconset/CFA-App-Icon.png'))
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
    'Habit Tracker/HabitTrackerTemplate',
    'Habit Tracker Pro/HabitTrackerPro',
    'Project Templates/iOS/Application/CFA App.xctemplate/Source/Application',
    'Project Templates/iOS/Application/Habit Tracker.xctemplate/Source/Application'
  ];
  for (const application of applications) {
    const base = application.startsWith('Project Templates/') ? 'templates/Xcode' : 'starter-apps';
    const settings = path.join(root, base, application, '1 - View/Views/Settings');
    const view = fs.readFileSync(path.join(settings, 'SettingsView.swift'), 'utf8');
    const viewModel = fs.readFileSync(path.join(settings, 'SettingsViewModel.swift'), 'utf8');
    assert.match(view, /Text\("About"\)/);
    assert.match(view, /Text\(viewModel.appName\)/);
    assert.match(view, /CFA iOS Architecture/);
    assert.match(view, /Built with Cooperative Feature Architecture\./);
    assert.match(view, /footer: \{[\s\S]*Text\(viewModel.versionDescription\)/);
    assert.doesNotMatch(view, /LabeledContent\("Version"/);
    assert.doesNotMatch(view, /On.device AI|LabeledContent\("AI"/);
    if (application.startsWith('Project Templates/')) {
      assert.match(viewModel, /Bundle\.main\.infoDictionary/);
      assert.match(viewModel, /CFBundleShortVersionString/);
      assert.match(viewModel, /CFBundleVersion/);
    }
  }
});

test('new-project templates contain no UI-test targets or empty UI-test folders', () => {
  const base = path.join(root, 'templates/Xcode');
  const nativeTemplates = [
    'Project Templates/iOS/Application/CFA App.xctemplate',
    'Project Templates/iOS/Application/Habit Tracker.xctemplate',
    'Project Templates/iOS/Application/Day Streak.xctemplate'
  ];

  for (const template of nativeTemplates) {
    const info = JSON.parse(execFileSync('python3', ['-c', 'import json, plistlib, sys; print(json.dumps(plistlib.load(open(sys.argv[1], "rb"))))', path.join(base, template, 'TemplateInfo.plist')], { encoding: 'utf8' }));
    assert.ok(!info.Targets.some(target => target.ProductType === 'com.apple.product-type.bundle.ui-testing'));
    assert.ok(![...info.Nodes, ...Object.keys(info.Definitions)].some(name => /UITests/i.test(name)));
  }

  for (const project of [
    'Habit Tracker/HabitTrackerTemplate.xcodeproj/project.pbxproj',
    'Habit Tracker Pro/HabitTrackerPro.xcodeproj/project.pbxproj',
    'Todays Twenty/TimesThirty.xcodeproj/project.pbxproj'
  ]) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, 'starter-apps', project), 'utf8'), /UITests/i);
  }
});

test('application templates reference every shipped source in the app target', () => {
  for (const name of names) {
    const template = path.join(root, 'templates/Xcode/Project Templates/iOS/Application', `${name}.xctemplate`);
    const info = JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', path.join(template, 'TemplateInfo.plist')], { encoding: 'utf8' }));
    assert.ok(info.Targets.some(target => target.TargetIdentifier === 'com.apple.dt.applicationTarget'), `${name} requires an explicit app target`);
    for (const node of info.Nodes) assert.ok(info.Definitions[node], `${name} node ${node} requires a definition`);

    const definitions = Object.values(info.Definitions);
    const paths = definitions.map(definition => definition.Path).filter(Boolean);
    const sourceFiles = fs.readdirSync(path.join(template, 'Source'), { recursive: true, encoding: 'utf8' })
      .filter(file => fs.statSync(path.join(template, 'Source', file)).isFile())
      .map(file => `Source/${file}`);
    for (const file of sourceFiles) {
      assert.ok(paths.some(defined => file === defined || file.startsWith(`${defined}/`)), `${name} does not reference ${file}`);
    }
    for (const definition of definitions) {
      assert.ok(definition.TargetIdentifiers?.includes('com.apple.dt.applicationTarget'), `${name} must assign ${definition.Path} to the app target`);
    }
  }
});

test('template targets use explicit Swift 6 isolation and concurrency settings', () => {
  for (const name of names) {
    const directory = path.join(root, 'templates/Xcode/Project Templates/iOS/Application');
    const appInfo = JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', path.join(directory, `${name}.xctemplate/TemplateInfo.plist`)], { encoding: 'utf8' }));
    const testInfo = JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', path.join(directory, `${name} Tests.xctemplate/TemplateInfo.plist`)], { encoding: 'utf8' }));
    const appSettings = appInfo.Targets.find(target => target.TargetIdentifier === 'com.apple.dt.applicationTarget').SharedSettings;
    const testSettings = testInfo.Targets.find(target => target.TargetIdentifier === 'com.apple.dt.applicationUnitTestBundleTarget').SharedSettings;
    for (const settings of [appSettings, testSettings]) {
      assert.equal(settings.SWIFT_VERSION, '6.0', name);
      assert.equal(settings.SWIFT_STRICT_CONCURRENCY, 'complete', name);
      assert.equal(settings.SWIFT_DEFAULT_ACTOR_ISOLATION, 'nonisolated', name);
    }
    assert.equal(appSettings.ENABLE_TESTABILITY, 'YES', name);
  }
});

test('new-project templates define app display name and initial version identity', () => {
  for (const name of names) {
    const file = path.join(root, 'templates/Xcode/Project Templates/iOS/Application', `${name}.xctemplate/TemplateInfo.plist`);
    const info = JSON.parse(execFileSync('python3', ['-c', 'import json, plistlib, sys; print(json.dumps(plistlib.load(open(sys.argv[1], "rb"))))', file], { encoding: 'utf8' }));
    const settings = info.Targets.find(target => target.TargetIdentifier === 'com.apple.dt.applicationTarget' || !target.TargetIdentifier)?.SharedSettings;
    assert.equal(settings?.INFOPLIST_KEY_CFBundleDisplayName, '$(PRODUCT_NAME)', `${name} must supply a resolved display name`);
    assert.equal(settings?.MARKETING_VERSION, '1.0', `${name} must supply a marketing version`);
    assert.equal(settings?.CURRENT_PROJECT_VERSION, '1', `${name} must supply a build number`);
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

test('all three Xcode templates install and updating preserves the previous copy', t => {
  const destination = temporary(t);
  install(destination);
  for (const name of names) assert.ok(fs.existsSync(path.join(target(destination, name), 'TemplateInfo.plist')));
  assert.ok(fs.existsSync(path.join(target(destination, 'CFA App Tests'), 'TemplateInfo.plist')));
  assert.ok(fs.existsSync(path.join(target(destination, 'Habit Tracker Tests'), 'TemplateInfo.plist')));
  assert.ok(fs.existsSync(path.join(target(destination, 'Day Streak Tests'), 'TemplateInfo.plist')));
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
  const project = path.join(root, 'starter-apps/Habit Tracker');
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

test('Node-free macOS installer installs and updates all three templates', { skip: process.platform !== 'darwin' }, t => {
  const destination = temporary(t);
  const options = { cwd: root, env: { ...process.env, CFA_TEMPLATE_DESTINATION: destination }, stdio: 'pipe' };
  execFileSync('/bin/zsh', ['Install Xcode Template.command'], options);
  execFileSync('/bin/zsh', ['Install Xcode Template.command'], options);
  for (const name of names) assert.ok(fs.existsSync(path.join(target(destination, name), 'TemplateInfo.plist')));
  assert.ok(fs.existsSync(path.join(target(destination, 'CFA App Tests'), 'TemplateInfo.plist')));
  assert.ok(fs.existsSync(path.join(target(destination, 'Habit Tracker Tests'), 'TemplateInfo.plist')));
  assert.ok(fs.existsSync(path.join(target(destination, 'Day Streak Tests'), 'TemplateInfo.plist')));
});


test('CFA App template publishes fresh data without waiting for its optional cache', {skip: process.platform !== 'darwin', timeout: 120000}, () => {
  const source = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/CFA App.xctemplate/Source/Application/2 - AppModel');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-template-behavior-'));
  try {
    const executable = path.join(directory, 'test');
    const files = [
      path.join(source, 'Features/Git Repos/Repo.swift'),
      path.join(source, 'Features/Git Repos/GitReposFeature.swift'),
      path.join(source, 'Networking & Data Storage/Protocols/GitReposProvider.swift'),
      path.join(root, 'test/fixtures/CFAAppTemplateBehavior.swift')
    ];
    const build = spawnSync('xcrun', ['swiftc', '-parse-as-library', '-swift-version', '6', '-module-cache-path', path.join(directory, 'cache'), ...files, '-o', executable], {encoding: 'utf8', timeout: 90000});
    assert.equal(build.status, 0, build.stderr || build.error?.message);
    const run = spawnSync(executable, [], {encoding: 'utf8', timeout: 15000});
    assert.equal(run.status, 0, run.stderr || run.error?.message);
    assert.match(run.stdout, /independent restore, shared refresh/);
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});

test('CFA App verifier rejects launch signals inside priority or detached tasks', {skip: process.platform !== 'darwin'}, t => {
  const source = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/CFA App.xctemplate');
  const directory = temporary(t);
  const copy = path.join(directory, 'CFA App.xctemplate');
  fs.cpSync(source, copy, {recursive: true});
  const app = path.join(copy, 'Source/Application/1 - View/___PACKAGENAME:identifier___App.swift');
  const original = fs.readFileSync(app, 'utf8');
  const signal = 'AppModel.shared.applicationDidFinishLaunching()';
  assert.ok(original.includes(signal));
  for (const task of ['Task(priority: .high)', 'Task.detached(priority: .background)', 'Task<Void, Never>']) {
    fs.writeFileSync(app, original.replace(signal, `${task} { ${signal} }`));
    const result = spawnSync('node', [path.join(root, 'scripts/verify-xcode-template-structure.mjs'), copy], {encoding: 'utf8'});
    assert.notEqual(result.status, 0, task);
    assert.match(result.stderr, /launch method directly/, task);
  }
  fs.writeFileSync(app, original.replace(signal, `Task { if true { print("ready") }; ${signal} }`));
  const nested = spawnSync('node', [path.join(root, 'scripts/verify-xcode-template-structure.mjs'), copy], {encoding: 'utf8'});
  assert.notEqual(nested.status, 0, 'nested block before launch');
  fs.writeFileSync(app, original.replace(signal, `Task { print("}"); ${signal} }`));
  const braceInString = spawnSync('node', [path.join(root, 'scripts/verify-xcode-template-structure.mjs'), copy], {encoding: 'utf8'});
  assert.notEqual(braceInString.status, 0, 'brace inside a string must not close the task');
  fs.writeFileSync(app, original.replace(signal, `Task { print("AppModel.shared.applicationDidFinishLaunching()") }; ${signal}`));
  const signalInString = spawnSync('node', [path.join(root, 'scripts/verify-xcode-template-structure.mjs'), copy], {encoding: 'utf8'});
  assert.equal(signalInString.status, 0, signalInString.stderr);
  fs.writeFileSync(app, original.replace(signal, `Task { print("independent work") }; ${signal}`));
  const independent = spawnSync('node', [path.join(root, 'scripts/verify-xcode-template-structure.mjs'), copy], {encoding: 'utf8'});
  assert.equal(independent.status, 0, independent.stderr);
});

test('CFA App includes a separate unit-test template component', {skip: process.platform !== 'darwin'}, () => {
  const template = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/CFA App.xctemplate');
  const info = JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', path.join(template, 'TemplateInfo.plist')], {encoding: 'utf8'}));
  const component = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/CFA App Tests.xctemplate');
  const testInfo = JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', path.join(component, 'TemplateInfo.plist')], {encoding: 'utf8'}));
  const option = info.Options.find(item => item.Identifier === 'cfaUnitTests');
  assert.equal(option.Units.Include.Components[0].Identifier, testInfo.Identifier);
  assert.equal(info.Targets.length, 1);
  assert.equal(testInfo.Targets[0].TargetIdentifierToBeTested, 'com.apple.dt.applicationTarget');
  assert.ok(info.Nodes.every(node => !node.endsWith('Tests.swift')), 'Test files must not be included in the app component');
  for (const node of testInfo.Nodes) {
    assert.ok(!info.Nodes.includes(node), `Test component source must not be an app node: ${node}`);
  }
  const testFiles = ['AppModelTests/AppModelTests.swift', 'FeatureTests/GitReposFeatureTests.swift', 'FeatureTests/SettingsFeatureTests.swift', 'NetworkingTests/NetworkingManagerTests.swift', 'ViewModelTests/GitReposViewModelTests.swift', 'ViewModelTests/SettingsViewModelTests.swift', 'ViewModelTests/RootTabViewModelTests.swift', 'Support/TestDependencies.swift'];
  for (const file of testFiles) {
    assert.ok(testInfo.Nodes.includes(file), `Missing test source ${file}`);
    assert.ok(fs.existsSync(path.join(component, testInfo.Definitions[file].Path)));
  }
  assert.equal(info.Targets.filter(target => target.ProductType === 'com.apple.product-type.bundle.ui-testing').length, 0);
});

for (const [name, optionName] of [['Habit Tracker', 'cfaHabitTests'], ['Day Streak', 'cfaDayTests']]) {
  test(`${name} keeps its test sources in its linked unit-test component`, {skip: process.platform !== 'darwin'}, () => {
    const base = path.join(root, 'templates/Xcode/Project Templates/iOS/Application');
    const app = path.join(base, `${name}.xctemplate`);
    const component = path.join(base, `${name} Tests.xctemplate`);
    const readPlist = directory => JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', path.join(directory, 'TemplateInfo.plist')], {encoding: 'utf8'}));
    const info = readPlist(app);
    const tests = readPlist(component);
    const option = info.Options.find(item => item.Identifier === optionName);
    assert.equal(option.Units.Include.Components[0].Identifier, tests.Identifier);
    assert.equal(info.Targets.length, 1);
    assert.equal(tests.Targets[0].TargetIdentifierToBeTested, 'com.apple.dt.applicationTarget');
    assert.ok(tests.Nodes.length > 0);
    assert.ok(info.Nodes.every(node => !node.endsWith('Tests.swift')));
    for (const node of tests.Nodes) {
      assert.ok(fs.existsSync(path.join(component, tests.Definitions[node].Path)), node);
      if (node.endsWith('Tests.swift')) {
        assert.match(fs.readFileSync(path.join(component, tests.Definitions[node].Path), 'utf8'), /@testable import ___PROJECTNAME:identifier___/);
      }
    }
  });
}
