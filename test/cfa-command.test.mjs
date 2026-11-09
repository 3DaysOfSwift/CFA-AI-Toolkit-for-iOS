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

function installedCommand(t, destination = 'customer') {
  const directory = sandbox(t);
  const source = stageSkillsPackage(path.join(directory, 'ios-app-development-cfa'));
  const result = install({ source, destination: path.join(directory, destination), mode: 'skills' });
  return { directory, command: result.command };
}

test('doctor verifies installed skills without requiring optional project guidance', (t) => {
  const { directory, command } = installedCommand(t, "customer's $workspace");
  const project = path.join(directory, 'project');
  fs.mkdirSync(project);

  const result = spawnSync(command, ['doctor', project], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PASS CFA skills are installed/);
  assert.match(result.stdout, /INFO no optional CFA project guidance/);
});

test('doctor reports an installed skill missing its specification', (t) => {
  const { directory, command } = installedCommand(t);
  const reference = 'cfa-feature-work/references/cfa-specification.md';
  fs.unlinkSync(path.join(directory, 'customer/.agents/skills', reference));

  const result = spawnSync(command, ['doctor', directory], { encoding: 'utf8' });

  assert.equal(result.status, 1, result.stderr);
  assert.ok(result.stdout.includes(`WARN missing CFA reference: ${reference}`));
  assert.doesNotMatch(result.stdout, /PASS CFA skills are installed/);
});

test('doctor identifies a missing review skill entry and a directory masquerading as one', (t) => {
  const { directory, command } = installedCommand(t);
  const skills = path.join(directory, 'customer/.agents/skills');
  fs.unlinkSync(path.join(skills, 'cfa-architecture-review/SKILL.md'));
  const featureEntry = path.join(skills, 'cfa-feature-work/SKILL.md');
  fs.unlinkSync(featureEntry);
  fs.mkdirSync(featureEntry);

  const result = spawnSync(command, ['doctor', directory], { encoding: 'utf8' });

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /WARN missing CFA skills: cfa-feature-work, cfa-architecture-review/);
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
  assert.match(content, /Preserve the existing product design\s+during migration and maintenance/);
  assert.match(content, /Missing optional themes, branding or a CFA footer\s+do not count as architecture findings/);
  assert.match(content, /from View to ViewModel to Feature\. The Feature\s+calls internal microservices when it needs networking, storage or device APIs/);
  assert.match(content, /SwiftDataManager owns container and context creation/);
  assert.match(content, /changing shared Model code or\s+services used by an existing target/);
  assert.match(content, /Verify that existing data handoffs still work/);
  assert.match(content, /Route URLSession requests through NetworkingManager/);
  assert.match(content, /Composition code may\s+configure and inject the session/);
  assert.match(content, /In new apps, start with a stateless value type/);
  assert.match(content, /independent requests able to progress in parallel/);
  assert.match(content, /#Preview \{ NotesEditorView\(\) \}/);
  assert.match(content, /default Feature dependency comes\s+from AppModel\.shared/);
  assert.match(content, /A changed input does not\s+automatically replace its State-backed ViewModel/);
  assert.match(content, /genuinely shared across the app, define it once as a static\s+property on a purpose-named enum/);
  assert.match(content, /snapshot structs use let properties and immutable contents/);
  assert.match(content, /nested values and collection elements for references that can change\s+in place/);
  assert.match(content, /read observable Feature state through the ViewModel/);
  assert.match(content, /Keep confirmed data, operation state and failure outcomes as separate\s+Feature values/);
  assert.match(content, /draft available for retry, preserve previously confirmed state\s+and present a recoverable error/);
  assert.match(content, /Save the safe data needed to identify and present each request before adding\s+it to the visible pending list/);
  assert.match(content, /Surface an initial\s+save failure and leave the pending list unchanged/);
  assert.match(content, /during restoration, preserve both the saved requests and the new request/);
  assert.match(content, /delayed restore must leave opened requests removed and unrelated requests\s+available/);
  assert.match(content, /Deduplicate callbacks for the same opening event\. Keep separate\s+opening events distinct even when they point to the same destination/);
  assert.match(content, /route that bypasses the screen checks current\s+entitlement in its own caller/);
  assert.match(content, /same account can sign back in before old work finishes, check the\s+session identity/);
  assert.match(content, /refresh caller has returned before releasing the write/);
  assert.match(content, /missing, incompatible or unreadable cache\s+supplies no restored data/);
  assert.match(content, /Instant Loading binary snapshots only\s+on request and for a sufficiently stable format with safe decoding/);
  assert.match(content, /Avoid\s+proposing binary snapshots during app creation or migration/);
  assert.match(content, /publish confirmed changes only after required persistence succeeds/);
  assert.match(content, /Call the AppModel launch signal directly\s+and synchronously from the application lifecycle callback/);
  assert.match(content, /AppModel signals the relevant Features and starts its\s+required app-wide listeners before the callback returns/);
  assert.match(content, /SwiftUI Views never store task handles, including in @State/);
  assert.match(content, /use task identity to reject stale results and clear the handle only when\s+that identity still matches/);
  assert.match(content, /ViewModel\s+owns explicitly created screen tasks and retains their named handles/);
  assert.match(content, /even\s+if it was the only caller\. Later equivalent callers can join/);
  assert.match(content, /remaining callers of legacy dependencies and record which adapters were\s+removed or retained to preserve behaviour or platform support/);
  assert.equal((content.match(/CFA Toolkit project guidance/g) ?? []).length, 1);
  assert.match(repeated.stdout, /already enabled/);
  assert.match(doctor.stdout, /INFO CFA project guidance found/);
  assert.doesNotMatch(doctor.stdout, /outdated (?:startup|screen ownership) guidance|differs from the installed toolkit/);
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
  const original = '<!-- CFA Toolkit project guidance -->\nAppModel properties exposing feature managers use the Manager suffix.\n- AppModel stores only shared, concrete Features, and one private launch guard.\n- SwiftData uses SwiftDataManager; URLSession calls use NetworkingManager.\n- Every screen owns a dedicated ViewModel. Declare it as @State private var\n  viewModel and construct it inline by default.\n  twice, and remove it on actual navigation or explicit dismissal. Leave\n- Published domain snapshots use immutable properties and contents, without\n  A departing screen may stop waiting while the Feature keeps refreshing.\n  or a scheduled Task. Features can start their own asynchronous work without\n  delaying the callback for disk or network completion.\n';
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
  assert.match(doctor.stdout, /outdated snapshot guidance.*Use let properties/);
  assert.match(repeated.stdout, /existing CFA snapshot guidance.*nested values/);
  assert.match(doctor.stdout, /outdated shared-refresh guidance.*cancel the screen’s wait independently/);
  assert.match(repeated.stdout, /existing CFA shared-refresh guidance.*cancel the screen’s wait independently/);
  assert.match(repeated.stdout, /existing AppModel guidance.*app-wide listeners/);
  assert.match(doctor.stdout, /outdated startup guidance.*before the launch callback returns/);
  assert.match(repeated.stdout, /existing CFA startup guidance.*before the launch callback returns/);
  assert.match(repeated.stdout, /will not overwrite project instructions/);
  assert.equal(fs.readFileSync(agents, 'utf8'), original);
});

test('both guidance commands flag the previous inline-only wording', t => {
  const { directory, command } = installedCommand(t);
  const project = path.join(directory, 'project');
  fs.mkdirSync(project);
  const agents = path.join(project, 'AGENTS.md');
  const original = '<!-- CFA Toolkit project guidance -->\n- Every screen-level SwiftUI View owns a dedicated ViewModel. Declare it as\n  @State private var viewModel and construct it inline by default. Keep View\n  and ViewModel initializers free of work.\n';
  fs.writeFileSync(agents, original);

  for (const action of ['doctor', 'enable-project']) {
    const result = spawnSync(command, [action, project], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /screen ownership guidance.*immutable snapshot/);
  }
  assert.equal(fs.readFileSync(agents, 'utf8'), original);
});

test('current CFA guidance is not flagged for legacy text in surrounding project notes', t => {
  const {directory, command} = installedCommand(t);
  const agents = path.join(directory, 'AGENTS.md');
  const note = 'Published domain snapshots use immutable properties and contents';
  fs.writeFileSync(agents, note + '\n');
  assert.equal(spawnSync(command, ['enable-project', directory]).status, 0);
  fs.appendFileSync(agents, '\n' + note + '\n');
  for (const action of ['doctor', 'enable-project']) {
    const result = spawnSync(command, [action, directory], {encoding:'utf8'});
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /snapshot guidance/);
  }
});

test('both guidance commands identify missing dismissal recovery in the installed block', t => {
  const {directory, command} = installedCommand(t);
  const agents = path.join(directory, 'AGENTS.md');
  assert.equal(spawnSync(command, ['enable-project', directory]).status, 0);
  const current = fs.readFileSync(agents, 'utf8');
  const previous = current.replace(/If an explicit\n  dismissal cannot be saved, report the error and keep the request pending for\n  retry\. The destination/, 'The destination');
  assert.notEqual(previous, current);
  fs.writeFileSync(agents, previous);

  for (const action of ['doctor', 'enable-project']) {
    const result = spawnSync(command, [action, directory], {encoding:'utf8'});
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /deep-link guidance.*Keep a failed dismissal pending for retry/);
  }
  assert.equal(fs.readFileSync(agents, 'utf8'), previous);
});

test('installed guidance predating the isolation rule is identified and preserved', t => {
  const { directory, command } = installedCommand(t);
  const agents = path.join(directory, 'AGENTS.md');
  const enabled = spawnSync(command, ['enable-project', directory], { encoding: 'utf8' });
  assert.equal(enabled.status, 0, enabled.stderr);
  const current = fs.readFileSync(agents, 'utf8');
  const previous = current.replace(/- Keep Features explicitly on MainActor\.[\s\S]*?(?=- SwiftDataManager)/, '');
  assert.notEqual(previous, current);
  fs.writeFileSync(agents, previous);

  for (const action of ['doctor', 'enable-project']) {
    const result = spawnSync(command, [action, directory], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /differs from the installed toolkit/);
  }
  assert.equal(fs.readFileSync(agents, 'utf8'), previous);
});

test('both guidance commands identify the previous microservices wording without rewriting it', t => {
  const { directory, command } = installedCommand(t);
  const agents = path.join(directory, 'AGENTS.md');
  const original = '<!-- CFA Toolkit project guidance -->\n- Preserve the CFA call path: View → ViewModel → Feature → Microservices (such as providers, storage or device API adapters).\n';
  fs.writeFileSync(agents, original);

  for (const action of ['doctor', 'enable-project']) {
    const result = spawnSync(command, [action, directory], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /dependency guidance.*A Feature calls internal microservices only when its work needs them/);
  }
  assert.equal(fs.readFileSync(agents, 'utf8'), original);
});
