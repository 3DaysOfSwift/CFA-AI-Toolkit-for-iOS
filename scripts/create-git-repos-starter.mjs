import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'starter-apps', 'Git Repos');
const projectName = 'GitRepos';

function copy(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

function renamePaths(directory, from, to) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const source = path.join(directory, entry.name);
    if (entry.isDirectory()) renamePaths(source, from, to);
    const target = path.join(directory, entry.name.replaceAll(from, to));
    if (target !== source) fs.renameSync(source, target);
  }
}

function replaceProjectNames(directory) {
  for (const relative of fs.readdirSync(directory, { recursive: true, encoding: 'utf8' })) {
    const file = path.join(directory, relative);
    if (!fs.statSync(file).isFile() || !/\.(swift|pbxproj|xcscheme|plist|md)$/.test(relative)) continue;
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8')
      .replaceAll('TimesThirty', projectName)
      .replaceAll('Times Thirty', 'Git Repos')
      .replaceAll('com.3DaysOfSwiftConcurrency.GitRepos', 'com.3DaysOfSwiftConcurrency.GitRepos')
      .replaceAll('___PACKAGENAME:identifier___', projectName));
  }
}

export function createGitReposStarter() {
  if (fs.existsSync(output)) throw Error(`Starter already exists: ${output}`);
  const dayStreak = path.join(root, 'starter-apps', 'Todays Twenty');
  const template = path.join(root, 'templates', 'Xcode', 'Project Templates', 'iOS', 'Application');
  copy(dayStreak, output);
  fs.rmSync(path.join(output, 'TimesThirty'), { recursive: true });
  fs.rmSync(path.join(output, 'TimesThirtyTests'), { recursive: true });
  copy(path.join(template, 'CFA App.xctemplate', 'Source', 'Application'), path.join(output, projectName));
  copy(path.join(template, 'CFA App.xctemplate', 'Source', 'Assets.xcassets'), path.join(output, projectName, 'Assets.xcassets'));
  copy(path.join(template, 'CFA App Tests.xctemplate', 'Source'), path.join(output, `${projectName}Tests`));
  renamePaths(output, 'TimesThirty', projectName);
  renamePaths(output, '___PACKAGENAME:identifier___', projectName);
  replaceProjectNames(output);
  fs.writeFileSync(path.join(output, 'README.md'), `# Git Repos Starter\n\nAn optional CFA example for remote collections, cache restoration, shared refresh and list/detail presentation. It is not the general CFA App foundation.\n`);
  return output;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { console.log(`Created ${createGitReposStarter()}`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
