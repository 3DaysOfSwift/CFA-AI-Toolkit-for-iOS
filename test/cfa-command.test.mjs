import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { stageRelease } from '../scripts/build.mjs';
import { install } from '../scripts/install.mjs';

function sandbox(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-command-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function installedCommand(t) {
  const directory = sandbox(t);
  const source = stageRelease(path.join(directory, 'ios-app-development-cfa'));
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
  const before = fs.readdirSync(project, { recursive: true });

  const result = spawnSync(command, ['inspect', project, '--json'], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.screens[0].name, 'ChatView');
  assert.ok(report.findings.some(item => item.code === 'view-model-missing'));
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
  assert.equal((content.match(/CFA Toolkit project guidance/g) ?? []).length, 1);
  assert.match(repeated.stdout, /already enabled/);
  assert.match(doctor.stdout, /PASS CFA project guidance/);
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

test('doctor warns about previously installed Manager naming guidance without changing it', (t) => {
  const { directory, command } = installedCommand(t);
  const project = path.join(directory, 'project');
  fs.mkdirSync(project);
  const agents = path.join(project, 'AGENTS.md');
  const original = '<!-- CFA Toolkit project guidance -->\nAppModel properties exposing feature managers use the Manager suffix.\n';
  fs.writeFileSync(agents, original);

  const doctor = spawnSync(command, ['doctor', project], { encoding: 'utf8' });
  const repeated = spawnSync(command, ['enable-project', project], { encoding: 'utf8' });

  assert.equal(doctor.status, 0, doctor.stderr);
  assert.match(doctor.stdout, /outdated feature naming guidance/);
  assert.match(repeated.stdout, /will not overwrite project instructions/);
  assert.equal(fs.readFileSync(agents, 'utf8'), original);
});
