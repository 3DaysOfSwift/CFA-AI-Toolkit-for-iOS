#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inspect, renderInspection } from './inspector.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const dashboardCLI = path.join(scriptDirectory, 'cli.mjs');
const args = process.argv.slice(2);
const cfaSkillNames = [
  'cfa-app-creation',
  'cfa-feature-work',
  'cfa-architecture-adoption',
  'swift-concurrency-migration',
  'cfa-architecture-review',
  'cfa-codebase-tidy',
  'cfa-unit-tests',
  'swift-code-quality'
];
const guidanceMarker = '<!-- CFA Toolkit project guidance -->';
const outdatedFeatureGuidance = 'managers use the Manager suffix';
const projectGuidance = `${guidanceMarker}
# CFA project guidance

This iOS project uses Cooperative Feature Architecture (CFA). Match each
request to the relevant installed CFA skill before changing the project.

- Preserve the CFA call path: View → ViewModel → feature → provider or cache.
- Every screen has a dedicated ViewModel. A concrete feature owner uses the
  Feature suffix; its AppModel property, ViewModel dependency and initializer
  label use the matching lower-camel-case Feature name. Narrow protocols, when
  useful, may use the FeatureAPI suffix. Lower-level services keep names that
  describe their actual jobs.
- Keep Views declarative. Feature state and business decisions belong outside
  the View layer.
- Do not call an app CFA merely because it has numbered folders. Trace real
  ownership, AppModel composition, and the focused tests for the changed work.

This project guidance supplements the developer's request; it does not replace
the installed CFA skills or authorise unrelated changes.
`;

function usage() {
  console.log(`CFA command

Usage:
  cfa dashboard [project-folder] [dashboard options]
  cfa inspect [project-folder] [--json]
  cfa doctor [project-folder]
  cfa enable-project [project-folder] [--host auto|codex|claude]

Examples:
  cfa dashboard
  cfa dashboard ~/Developer/MyApp
  cfa dashboard ~/Developer/MyApp --include-tests
  cfa inspect ~/Developer/MyApp
  cfa doctor ~/Developer/MyApp
  cfa enable-project ~/Developer/MyApp --host claude

`);
}

function installedSkillsRoot() {
  let current = scriptDirectory;
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'SKILL.md'))) return path.dirname(current);
    current = path.dirname(current);
  }
  return undefined;
}

function projectDirectory(value) {
  const project = path.resolve(value ?? process.cwd());
  if (!fs.existsSync(project) || !fs.statSync(project).isDirectory()) {
    throw Error(`Project folder does not exist: ${project}`);
  }
  return project;
}

function guidanceFiles(project) {
  return ['AGENTS.md', 'CLAUDE.md']
    .map((name) => path.join(project, name))
    .filter((file) => fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes(guidanceMarker));
}

function doctor(projectArgument) {
  const project = projectDirectory(projectArgument);
  const skillsRoot = installedSkillsRoot();
  const missingSkills = skillsRoot
    ? cfaSkillNames.filter((name) => !fs.existsSync(path.join(skillsRoot, name, 'SKILL.md')))
    : cfaSkillNames;

  if (missingSkills.length === 0) {
    console.log(`PASS CFA skills are installed: ${skillsRoot}`);
  } else if (skillsRoot) {
    console.log(`WARN missing CFA skills: ${missingSkills.join(', ')}`);
  } else {
    console.log('WARN this CFA command is not running from an installed CFA skill.');
  }

  const guidance = guidanceFiles(project);
  if (guidance.length > 0) {
    console.log(`PASS CFA project guidance: ${guidance.join(', ')}`);
    for (const file of guidance) {
      if (fs.readFileSync(file, 'utf8').includes(outdatedFeatureGuidance)) {
        console.log(`WARN outdated feature naming guidance in ${file}; update the CFA guidance block to use concrete *Feature types and matching *Feature properties.`);
      }
    }
  } else {
    console.log(`INFO no optional CFA project guidance in ${project}`);
    console.log(`Run: cfa enable-project ${JSON.stringify(project)}`);
  }

  if (missingSkills.length > 0) process.exitCode = 1;
}

function parseEnableProjectArguments(values) {
  let host = 'auto';
  let project;
  while (values.length > 0) {
    const value = values.shift();
    if (value === '--host' && values[0]) host = values.shift();
    else if (!value.startsWith('--') && !project) project = value;
    else throw Error(`Unknown or incomplete option: ${value}`);
  }
  if (!['auto', 'codex', 'claude'].includes(host)) {
    throw Error(`Unsupported host: ${host}. Use auto, codex, or claude.`);
  }
  return { host, project: projectDirectory(project) };
}

function enableProject(values) {
  const { host, project } = parseEnableProjectArguments(values);
  const codexFile = path.join(project, 'AGENTS.md');
  const claudeFile = path.join(project, 'CLAUDE.md');
  const guidanceFile = host === 'codex'
    ? codexFile
    : host === 'claude'
      ? claudeFile
      : fs.existsSync(codexFile)
        ? codexFile
        : fs.existsSync(claudeFile) || fs.existsSync(path.join(project, '.claude'))
          ? claudeFile
          : codexFile;

  if (fs.existsSync(guidanceFile) && fs.readFileSync(guidanceFile, 'utf8').includes(guidanceMarker)) {
    console.log(`CFA project guidance is already enabled: ${guidanceFile}`);
    if (fs.readFileSync(guidanceFile, 'utf8').includes(outdatedFeatureGuidance)) {
      console.log('The existing guidance still uses the old Manager rule. Edit only the CFA guidance block; the command will not overwrite project instructions.');
    }
    return;
  }

  const prefix = fs.existsSync(guidanceFile) && fs.readFileSync(guidanceFile, 'utf8').trim().length > 0 ? '\n\n' : '';
  fs.appendFileSync(guidanceFile, `${prefix}${projectGuidance}`);
  console.log(`Enabled CFA project guidance: ${guidanceFile}`);
}

function dashboard(values) {
  let project = process.cwd();
  if (values[0] && !values[0].startsWith('--')) project = values.shift();
  const hasOutput = values.includes('--out');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const output = path.join(path.resolve(project), `cfa-dashboard-${stamp}`);
  const dashboardArgs = [project, ...(hasOutput ? [] : ['--out', output]), ...values];
  const result = spawnSync(process.execPath, [dashboardCLI, ...dashboardArgs], {
    stdio: 'inherit',
    shell: false
  });
  if (result.error) {
    console.error(result.error.message);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
}

async function inspectProject(values) {
  let project;
  let json = false;
  while (values.length > 0) {
    const value = values.shift();
    if (value === '--json') json = true;
    else if (!value.startsWith('--') && !project) project = value;
    else throw Error(`Unknown or incomplete option: ${value}`);
  }
  const report = await inspect(projectDirectory(project));
  console.log(json ? JSON.stringify(report, null, 2) : renderInspection(report));
}

try {
  if (!args.length || args.includes('--help') || args.includes('-h')) {
    usage();
  } else {
    const command = args.shift();
    if (command === 'dashboard') dashboard(args);
    else if (command === 'inspect') await inspectProject(args);
    else if (command === 'doctor') doctor(args.shift());
    else if (command === 'enable-project') enableProject(args);
    else throw Error('Unknown CFA command. Run: cfa --help');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
