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
// Keep this legacy ownership marker stable so upgrades recognise existing guidance.
const guidanceMarker = '<!-- CFA Toolkit project guidance -->';
const outdatedAppModelGuidance = 'AppModel stores only shared, concrete Features, and one private launch guard.';
const outdatedFeatureGuidance = 'managers use the Manager suffix';
const outdatedServiceGuidance = 'SwiftData uses SwiftDataManager; URLSession calls use NetworkingManager.';
const serviceGuidanceUpdate = 'Clarify SwiftDataManager ownership and keep independent network requests able to progress in parallel.';
const outdatedScreenGuidance = 'Every screen owns a dedicated ViewModel. Declare it as @State private var';
const screenGuidanceUpdate = 'Apply private @State ViewModel ownership to SwiftUI screens and trace the actual presentation owner for UIKit migrations.';
const outdatedDeepLinkGuidance = 'remove it on actual navigation or explicit dismissal';
const deepLinkGuidanceUpdate = 'Explain how to retry a failed pending-request removal without navigating again.';
const projectGuidance = `${guidanceMarker}
# CFA project guidance

This iOS project uses Cooperative Feature Architecture (CFA). The supporting
product is CFA AI Toolkit for iOS. Match each request to the relevant installed
skill from that toolkit before changing the project.

- Preserve the CFA call path: View → ViewModel → Feature → Microservices (such as providers, storage or device API adapters).
- Every screen-level SwiftUI View owns a dedicated ViewModel. Declare it as
  @State private var viewModel and construct it inline by default. Keep View
  and ViewModel initializers free of work-starting side effects. For existing UIKit screens
  in a migration, map the actual presentation owner to its Features and tests.
- A concrete feature owner uses the
  Feature suffix; its AppModel property, ViewModel dependency and initializer
  label use the matching lower-camel-case Feature name. Use concrete features
  directly; do not add matching FeatureAPI protocols. Lower-level services keep names that
  describe their actual jobs.
- A detail View may receive selected immutable value data and construct its own
  State-backed ViewModel in its initializer. Do not inject or share ViewModels;
  keep each scene's selection in presentation, not in a shared Feature.
- In a new app with deep links or notification actions, DeepLinkingFeature
  validates opening requests and owns the durable pending list shown in Settings.
  Persist only the safe data needed to identify and present each request.
  Handle expired or unavailable destinations clearly. Record incoming URLs
  and user actions on local or push notifications.
  Scheduling or delivery alone does not create a pending item. The receiving
  scene owns navigation and protects unsaved edits and active payments. Any
  scene can retry a pending request. Coordinate attempts to avoid opening it
  twice, and persist removal after actual navigation or explicit dismissal.
  Leave requests pending when navigation is declined, cancelled before it opens,
  or fails. If removal fails after navigation, report the storage error and
  retry removal without navigating again. The request can reappear after restart
  until removal is saved. The destination owns its content loading. Preserve
  existing link and notification history behaviour during migration.
- A normal preview constructs the View and follows the same ownership and
  storage boundaries. Keep SwiftData containers and contexts out of previews.
- Keep Views declarative. Feature state and business decisions belong outside
  the View layer. Reusable presentation components may receive action closures
  that forward intent to their owning screen and its ViewModel. Keep service
  closures and other screens' ViewModel actions out of screen inputs.
- Published domain snapshots use immutable properties and contents, without
  mutable reference state that undermines them; replace them after confirmed
  changes. The screen ViewModel owns temporary unsaved editor values.
- Start with independent Features; compose them only for a genuine business
  responsibility, without duplicating authoritative state or creating cycles.
- For sign-out or account switching, let the owning Feature coordinate explicit
  cleanup calls. Preserve the session and its data when sign-out fails before
  ending the session. Reconcile partial authentication changes with the actual
  session. Clear account-specific Feature state after successful sign-out and
  check the account or session generation before publishing in-flight results.
  If sign-out promises a fresh-install experience, clear account-specific
  memory, caches and locally stored files. Preserve independent purchases and
  user-owned documents. Handle unsynchronised work according to the product
  contract and report cleanup failures accurately.
- AppModel exposes concrete Features and keeps a private launch guard and the
  private task handles needed for app-wide listeners. Its initializer assigns
  the supplied Features, sets the guard to false and sets the handles to nil.
  One static live() factory constructs production dependencies for
  AppModel.shared. Keep services and UI errors out of its stored properties.
- AppModel starts each needed app-wide listener once and forwards events to
  the responsible Feature. The Feature interprets events and owns the resulting
  state. Screen-only observation follows the screen's lifetime.
- Features own their background capabilities. During synchronous launch,
  AppModel can ask each Feature to register its permitted BGTaskScheduler
  identifiers once. Schedule work separately and honour expiration,
  cancellation and system completion. Work may outlive a screen, but continuing
  after iOS backgrounds the app requires an appropriate system mechanism.
- SwiftDataManager owns container and context creation. Keep SwiftData records
  and contexts inside the storage boundary and give Features narrow load and
  save operations.
- Route URLSession calls through NetworkingManager. In new apps, start with a
  stateless value type when it meets the session and concurrency requirements.
  Keep independent requests able to progress in parallel unless an explicit
  policy limits them. AppModel.live() can compose shared services locally and
  inject them into Features or their providers.
- Call the AppModel launch signal directly
  and synchronously from the application lifecycle callback, never a View .task
  or a scheduled Task. Features can start their own asynchronous work without
  delaying the callback for disk or network completion.
- A Feature-owned shared refresh normally continues when a screen leaves;
  preserve its result for later callers unless a specific product or resource
  requirement calls for another cancellation policy.
  A departing screen may stop waiting while the Feature keeps refreshing.
- Cancel superseded presentation work such as search. Cancel screen-only work
  on disappearance when continuing would have no value. Check cancellation
  before expensive work and before publishing, and protect current state
  against stale results after suspension.
- At the Feature boundary, equivalent requests await one in-flight task and
  receive its outcome. One caller cancelling must leave shared work running
  when other callers still need it. Queue commands that must each take effect
  in admission order, including across awaits, and return each caller's own
  outcome. Matching inputs alone do not make commands duplicates. Define how
  failure and cancellation affect queued work and when to clear task handles.
- PurchasesFeature owns entitlement state. Screen ViewModels check access before
  presenting or calling a paid capability. Trace every other entry point to its
  own guard and verify both locked and entitled outcomes. Keep pricing and
  entitlement checks out of the capability Feature so the product can change
  which capabilities it charges for. Protected server operations enforce their
  own access policy.
- Publish durable user edits as saved only after required persistence succeeds.
- Start remote refresh and optional cache restoration independently when both
  are needed. Publish current server data without waiting for the cache write.
  Keep valid in-memory data if refresh fails, and prevent older restores from
  replacing fresher data. Bound cache-write retries, preserve the last usable
  cache if replacement fails, and prevent older writes from replacing newer
  snapshots. Report offline availability only for data that was saved. Use JSON
  by default for a simple cache. Help apply binary snapshots only on request.
- App.body installs a stable root View and presentation modifiers only. Keep
  startup conditionals, database loading and feature error UI out of App and
  out of the root navigation View; feature screens present their own state.
- Database availability must never gate the interface, including root wrappers
  or blocking overlays. Open storage lazily within a Feature's data request;
  opening failures follow that request through Feature, ViewModel and screen,
  never an app-level launch error. Retry the request without discarding data.
  Verify initial open failure leaves the root and independent navigation usable.
- Do not call an app CFA merely because it has numbered folders. Trace real
  ownership, AppModel composition, and the focused tests for the changed work.

This project guidance supplements the developer's request; it does not replace
the installed CFA skills or authorise unrelated changes.
`;

function usage() {
  console.log(`CFA AI Toolkit for iOS — cfa command

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
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes(outdatedFeatureGuidance)) {
        console.log(`WARN outdated feature naming guidance in ${file}; update the CFA guidance block to use concrete *Feature types and matching *Feature properties.`);
      }
      if (content.includes(outdatedServiceGuidance)) {
        console.log(`WARN outdated service guidance in ${file}. ${serviceGuidanceUpdate}`);
      }
      if (content.includes(outdatedScreenGuidance)) {
        console.log(`WARN outdated screen ownership guidance in ${file}. ${screenGuidanceUpdate}`);
      }
      if (content.includes(outdatedDeepLinkGuidance)) {
        console.log(`WARN outdated deep-link guidance in ${file}. ${deepLinkGuidanceUpdate}`);
      }
      if (content.includes(outdatedAppModelGuidance)) {
        console.log(`WARN outdated AppModel guidance in ${file}; update the CFA guidance block to allow private task handles for app-wide listeners.`);
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

  const existingGuidance = fs.existsSync(guidanceFile) ? fs.readFileSync(guidanceFile, 'utf8') : '';
  if (existingGuidance.includes(guidanceMarker)) {
    console.log(`CFA project guidance is already enabled: ${guidanceFile}`);
    if (existingGuidance.includes(outdatedFeatureGuidance)) {
      console.log('The existing guidance still uses the old Manager rule. Edit only the CFA guidance block; the command will not overwrite project instructions.');
    }
    if (existingGuidance.includes(outdatedServiceGuidance)) {
      console.log(`Update the existing CFA service guidance block. ${serviceGuidanceUpdate}`);
    }
    if (existingGuidance.includes(outdatedScreenGuidance)) {
      console.log(`Update the existing CFA screen ownership guidance block. ${screenGuidanceUpdate}`);
    }
    if (existingGuidance.includes(outdatedDeepLinkGuidance)) {
      console.log(`Update the existing CFA deep-link guidance block. ${deepLinkGuidanceUpdate}`);
    }
    if (existingGuidance.includes(outdatedAppModelGuidance)) {
      console.log('The existing AppModel guidance should allow private task handles for app-wide listeners. Edit only the CFA guidance block.');
    }
    return;
  }

  const prefix = existingGuidance.trim().length > 0 ? '\n\n' : '';
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
