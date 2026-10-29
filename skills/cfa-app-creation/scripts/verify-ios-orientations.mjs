import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const orientations = [
  'UIInterfaceOrientationPortrait', 'UIInterfaceOrientationPortraitUpsideDown',
  'UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight'
];

export function readPlist(file) {
  return JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', file], { encoding: 'utf8' }));
}

export function verifyOrientations(info) {
  const families = info.UIDeviceFamily;
  if (!Array.isArray(families) || !families.some(value => value === 1 || value === 2)) {
    throw Error('Missing iPhone/iPad UIDeviceFamily in the built app.');
  }
  for (const [family, suffix] of [[1, 'iphone'], [2, 'ipad']]) {
    if (!families.includes(family)) continue;
    const declared = info[`UISupportedInterfaceOrientations~${suffix}`] ?? info.UISupportedInterfaceOrientations;
    if (!Array.isArray(declared) || !declared.length || declared.some(value => !orientations.includes(value))) {
      throw Error(`Missing or invalid supported orientations for ${suffix}. Expected a nonempty array of orientation names.`);
    }
    if (family === 2 && info.UIRequiresFullScreen !== true && !orientations.every(value => declared.includes(value))) {
      throw Error('iPad multitasking requires all four interface orientations.');
    }
  }
  return true;
}

// Verify the template defaults separately from the generated app's actual plist.
export function verifyTemplateOrientations(root) {
  const base = path.join(root, 'templates/Xcode');
  function verifySettings(settings) {
    if (settings.INFOPLIST_KEY_UIRequiresFullScreen === 'YES') throw Error('Templates must not opt out of iPad multitasking.');
    verifyOrientations({
      UIDeviceFamily: [1, 2],
      UISupportedInterfaceOrientations: settings.INFOPLIST_KEY_UISupportedInterfaceOrientations?.split(/\s+/),
      'UISupportedInterfaceOrientations~ipad': settings.INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad?.split(/\s+/)
    });
  }
  for (const name of ['CFA App', 'Habit Tracker', 'Day Streak']) {
    const info = readPlist(path.join(base, 'Project Templates/iOS/Application', `${name}.xctemplate/TemplateInfo.plist`));
    const target = info.Targets.find(value => !value.TargetIdentifier || value.TargetIdentifier === 'com.apple.dt.applicationTarget');
    if (!target) throw Error(`Missing application target: ${name}`);
    verifySettings(target.SharedSettings);
  }
  for (const project of ['Todays Twenty/TimesThirty', 'Habit Tracker/HabitTrackerTemplate', 'Habit Tracker Pro/HabitTrackerPro']) {
    const { objects } = readPlist(path.join(root, 'starter-apps', `${project}.xcodeproj/project.pbxproj`));
    const targets = Object.values(objects).filter(value => value.productType === 'com.apple.product-type.application');
    if (!targets.length) throw Error(`Missing application target: ${project}`);
    for (const target of targets) {
      for (const id of objects[target.buildConfigurationList].buildConfigurations) {
        verifySettings(objects[id].buildSettings);
      }
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    let file = process.argv[2];
    if (!file) throw Error('Usage: node verify-ios-orientations.mjs <built Info.plist | app.app | app.xcarchive>');
    if (file.endsWith('.xcarchive')) {
      const applications = path.join(file, 'Products/Applications');
      const apps = fs.readdirSync(applications).filter(name => name.endsWith('.app'));
      if (apps.length !== 1) throw Error('Archive must contain exactly one app; pass its Info.plist explicitly.');
      file = path.join(applications, apps[0]);
    }
    if (file.endsWith('.app')) file = path.join(file, 'Info.plist');
    verifyOrientations(readPlist(file));
    console.log('Built app orientation declarations are valid for its supported device families.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
