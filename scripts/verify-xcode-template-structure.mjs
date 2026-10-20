import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(scriptDirectory, '..');
export const defaultTemplate = path.join(
  root,
  'templates/Xcode/Project Templates/iOS/Application/CFA App.xctemplate'
);

function fail(message) {
  throw Error(`CFA App template structure: ${message}`);
}

function readTemplateInfo(templateDirectory) {
  const file = path.join(templateDirectory, 'TemplateInfo.plist');
  if (!fs.existsSync(file)) fail(`missing ${file}`);
  try {
    return JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', file], { encoding: 'utf8' }));
  } catch {
    fail('TemplateInfo.plist could not be read with macOS plutil.');
  }
}

function checkEntry(info, templateDirectory, { id, sourcePath, group }) {
  const entry = info.Definitions?.[id];
  if (!entry) fail(`missing definition for ${id}`);
  if (entry.Path !== sourcePath) fail(`${id} has path ${entry.Path ?? 'none'}, expected ${sourcePath}`);
  if (entry.Group !== group) {
    fail(`${id} must appear in the ${group} navigator group.`);
  }
  if (!info.Nodes?.includes(id)) fail(`${id} is missing from Nodes.`);
  if (!fs.existsSync(path.join(templateDirectory, sourcePath))) fail(`missing source file ${sourcePath}`);
}

export function verifyXcodeTemplateStructure(templateDirectory = defaultTemplate) {
  const info = readTemplateInfo(templateDirectory);
  checkEntry(info, templateDirectory, {
    id: '1 - View/___PACKAGENAME:identifier___App.swift',
    sourcePath: 'Source/Application/1 - View/___PACKAGENAME:identifier___App.swift',
    group: '1 - View'
  });
  checkEntry(info, templateDirectory, {
    id: '3 - App Resources/PrivacyInfo.xcprivacy',
    sourcePath: 'Source/Application/3 - App Resources/PrivacyInfo.xcprivacy',
    group: '3 - App Resources'
  });
  for (const entry of [
    {
      id: '1 - View/Views/Git Repos/GitReposView.swift',
      sourcePath: 'Source/Application/1 - View/Views/Git Repos/GitReposView.swift',
      group: undefined
    },
    {
      id: '1 - View/Views/Git Repos/GitReposViewModel.swift',
      sourcePath: 'Source/Application/1 - View/Views/Git Repos/GitReposViewModel.swift',
      group: undefined
    },
    {
      id: '2 - AppModel/Features/Git Repos/Repo.swift',
      sourcePath: 'Source/Application/2 - AppModel/Features/Git Repos/Repo.swift',
      group: undefined
    },
    {
      id: '2 - AppModel/Features/Git Repos/GitReposFeature.swift',
      sourcePath: 'Source/Application/2 - AppModel/Features/Git Repos/GitReposFeature.swift',
      group: undefined
    },
    {
      id: '2 - AppModel/Features/Settings/AppColourTheme.swift',
      sourcePath: 'Source/Application/2 - AppModel/Features/Settings/AppColourTheme.swift',
      group: undefined
    },
    {
      id: '2 - AppModel/Features/Settings/SettingsFeature.swift',
      sourcePath: 'Source/Application/2 - AppModel/Features/Settings/SettingsFeature.swift',
      group: undefined
    },
    {
      id: '2 - AppModel/Networking & Data Storage/File Cache/RepoFileCache.swift',
      sourcePath: 'Source/Application/2 - AppModel/Networking & Data Storage/File Cache/RepoFileCache.swift',
      group: undefined
    },
    {
      id: '2 - AppModel/Networking & Data Storage/Networking/GitHubAPI.swift',
      sourcePath: 'Source/Application/2 - AppModel/Networking & Data Storage/Networking/GitHubAPI.swift',
      group: undefined
    },
    {
      id: '2 - AppModel/Networking & Data Storage/Protocols/GitReposProvider.swift',
      sourcePath: 'Source/Application/2 - AppModel/Networking & Data Storage/Protocols/GitReposProvider.swift',
      group: undefined
    }
  ]) {
    checkEntry(info, templateDirectory, entry);
  }
  if (Object.keys(info.Definitions ?? {}).some((name) => /Favourite|Saved Repos|FavouriteReposAPI|SwiftData|User Data Storage/.test(name))) {
    fail('contains retired storage or repository template files.');
  }
  if (info.Definitions?.['___PACKAGENAME:identifier___App.swift']) {
    fail('App.swift is incorrectly defined at the project root.');
  }
  const assets = info.Definitions?.['Assets.xcassets'];
  if (!assets || assets.Path !== 'Source/Assets.xcassets' || assets.Group || !fs.existsSync(path.join(templateDirectory, assets.Path, 'AppIcon.appiconset', 'CFA-App-Icon.png'))) {
    fail('Assets.xcassets must be the root Xcode asset catalog and include the CFA AppIcon artwork.');
  }
  const sourceDirectory = path.join(templateDirectory, 'Source', 'Application');
  for (const retiredPath of ['Assets.xcassets', '2 - AppModel/User Data Storage']) {
    if (fs.existsSync(path.join(sourceDirectory, retiredPath))) {
      fail(`contains retired source path ${retiredPath}.`);
    }
  }
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    verifyXcodeTemplateStructure(process.argv[2] ? path.resolve(process.argv[2]) : defaultTemplate);
    console.log('CFA App includes its root Xcode asset catalog, custom AppIcon artwork, and CFA resources in 3 - App Resources.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
