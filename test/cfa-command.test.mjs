import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { stageSkillsPackage } from './fixtures/skills-package.mjs';
import { install } from '../scripts/install.mjs';

function sandbox(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-command-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function installedCommand(t) {
  const directory = sandbox(t);
  const source = stageSkillsPackage(path.join(directory, 'ios-app-development-cfa'));
  const result = install({ source, destination: path.join(directory, 'customer'), mode: 'skills' });
  return { directory, command: result.command };
}

test('doctor verifies installed skills without requiring optional project guidance', (t) => {
  const { directory, command } = installedCommand(t);
  const project = path.join(directory, 'project');
  fs.mkdirSync(project);

  const result = spawnSync(command, ['doctor', project], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PASS CFA skills are installed/);
  assert.match(result.stdout, /INFO no optional CFA project guidance/);
});

test('installed inspect command reads a project without writing into it', (t) => {
  const { directory, command } = installedCommand(t);
  const project = path.join(directory, 'project');
  const view = path.join(project, 'App', '1 - View', 'Views', 'Chat', 'ChatView.swift');
  fs.mkdirSync(path.dirname(view), { recursive: true });
  fs.writeFileSync(view, 'import SwiftUI\nstruct ChatView: View { var body: some View { Text("Hi") } }');
  const schedule = path.join(project, 'App', '1 - View', 'Views', 'Schedule');
  fs.mkdirSync(schedule, { recursive: true });
  fs.writeFileSync(path.join(schedule, 'ScheduleView.swift'),
    'struct ScheduleView: View { @State private var schedule = ScheduleViewModel() }');
  fs.writeFileSync(path.join(schedule, 'ScheduleViewModel.swift'), 'final class ScheduleViewModel {}');
  const before = fs.readdirSync(project, { recursive: true });

  const result = spawnSync(command, ['inspect', project, '--json'], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.screens[0].name, 'ChatView');
  assert.ok(report.findings.some(item => item.code === 'view-model-missing'));
  const scheduleScreen = report.screens.find(screen => screen.name === 'ScheduleView');
  assert.equal(scheduleScreen.ownsViewModel, true);
  assert.ok(report.findings.some(item => item.code === 'view-model-property-name' && item.file === scheduleScreen.viewFile));
  assert.ok(!report.findings.some(item => item.code === 'view-model-ownership' && item.file === scheduleScreen.viewFile));
  assert.deepEqual(fs.readdirSync(project, { recursive: true }), before);
});

test('enable-project appends CFA guidance without overwriting existing instructions', (t) => {
  const { directory, command } = installedCommand(t);
  const project = path.join(directory, 'project');
  fs.mkdirSync(project);
  const agents = path.join(project, 'AGENTS.md');
  fs.writeFileSync(agents, '# Existing project rule\nKeep this text.\n');

  const enabled = spawnSync(command, ['enable-project', project], { encoding: 'utf8' });
  const repeated = spawnSync(command, ['enable-project', project], { encoding: 'utf8' });
  const doctor = spawnSync(command, ['doctor', project], { encoding: 'utf8' });
  const content = fs.readFileSync(agents, 'utf8');

  assert.equal(enabled.status, 0, enabled.stderr);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.equal(doctor.status, 0, doctor.stderr);
  assert.match(content, /Keep this text\./);
  assert.match(content, /View → ViewModel → Feature → Microservices/);
  assert.match(content, /SwiftDataManager owns container and context creation/);
  assert.match(content, /NetworkingManager\. In new apps, start with a\s+stateless value type/);
  assert.match(content, /independent requests able to progress in parallel/);
  assert.match(content, /A changed input does not\s+automatically replace its State-backed ViewModel/);
  assert.match(content, /draft available for retry if saving fails/);
  assert.match(content, /missing, incompatible or unreadable cache\s+supplies no restored data/);
  assert.match(content, /Instant Loading binary snapshots only\s+on request and for a sufficiently stable format/);
  assert.match(content, /publish confirmed changes only after required persistence succeeds/);
  assert.match(content, /Call the AppModel launch signal directly\s+and synchronously from the application lifecycle callback/);
  assert.match(content, /AppModel signals the relevant Features and starts its\s+required app-wide listeners before the callback returns/);
  assert.equal((content.match(/CFA Toolkit project guidance/g) ?? []).length, 1);
  assert.match(repeated.stdout, /already enabled/);
  assert.match(doctor.stdout, /INFO CFA project guidance found/);
  assert.doesNotMatch(doctor.stdout, /outdated startup guidance/);
});

test('enable-project can create Claude guidance when explicitly requested', (t) => {
  const { directory, command } = installedCommand(t);
  const project = path.join(directory, 'project');
  fs.mkdirSync(project);

  const result = spawnSync(command, ['enable-project', project, '--host', 'claude'], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(project, 'CLAUDE.md')));
  assert.equal(fs.existsSync(path.join(project, 'AGENTS.md')), false);
});

test('doctor warns about previously installed CFA guidance without changing it', (t) => {
  const { directory, command } = installedCommand(t);
  const project = path.join(directory, 'project');
  fs.mkdirSync(project);
  const agents = path.join(project, 'AGENTS.md');
  const original = '<!-- CFA Toolkit project guidance -->\nAppModel properties exposing feature managers use the Manager suffix.\n- AppModel stores only shared, concrete Features, and one private launch guard.\n- SwiftData uses SwiftDataManager; URLSession calls use NetworkingManager.\n- Every screen owns a dedicated ViewModel. Declare it as @State private var\n  viewModel and construct it inline by default.\n  twice, and remove it on actual navigation or explicit dismissal. Leave\n  A departing screen may stop waiting while the Feature keeps refreshing.\n  or a scheduled Task. Features can start their own asynchronous work without\n  delaying the callback for disk or network completion.\n';
  fs.writeFileSync(agents, original);

  const doctor = spawnSync(command, ['doctor', project], { encoding: 'utf8' });
  const repeated = spawnSync(command, ['enable-project', project], { encoding: 'utf8' });

  assert.equal(doctor.status, 0, doctor.stderr);
  assert.match(doctor.stdout, /outdated feature naming guidance/);
  assert.match(doctor.stdout, /outdated AppModel guidance.*app-wide listeners/);
  assert.match(doctor.stdout, /outdated service guidance.*SwiftDataManager ownership/);
  assert.match(doctor.stdout, /outdated screen ownership guidance.*UIKit migrations/);
  assert.match(repeated.stdout, /existing CFA screen ownership guidance.*UIKit migrations/);
  assert.match(repeated.stdout, /existing CFA service guidance.*independent network requests/);
  assert.match(doctor.stdout, /outdated deep-link guidance.*without navigating again/);
  assert.match(repeated.stdout, /existing CFA deep-link guidance.*without navigating again/);
  assert.match(doctor.stdout, /outdated shared-refresh guidance.*cancel the screen’s wait independently/);
  assert.match(repeated.stdout, /existing CFA shared-refresh guidance.*cancel the screen’s wait independently/);
  assert.match(repeated.stdout, /existing AppModel guidance.*app-wide listeners/);
  assert.match(doctor.stdout, /outdated startup guidance.*before the launch callback returns/);
  assert.match(repeated.stdout, /existing CFA startup guidance.*before the launch callback returns/);
  assert.match(repeated.stdout, /will not overwrite project instructions/);
  assert.equal(fs.readFileSync(agents, 'utf8'), original);
});
