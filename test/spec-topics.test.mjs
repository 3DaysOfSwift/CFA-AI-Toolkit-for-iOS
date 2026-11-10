import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { specTopics } from '../scripts/spec-topics.mjs';
import { root, cfaSkills } from '../scripts/sync.mjs';
import { lookup } from '../tools/explanations/explanations.mjs';

test('specification generation validates explanations from the canonical tool', () => {
  const generator = fs.readFileSync(path.join(root, 'scripts/spec-topics.mjs'), 'utf8');
  assert.match(generator, /from '\.\.\/tools\/explanations\/explanations\.mjs'/);
  assert.doesNotMatch(generator, /from '\.\.\/skills\//);
});

test('topic reading edition retains every canonical section and is bundled consistently', () => {
  const expected = specTopics(root);
  const canonical = fs.readFileSync(path.join(root, 'architecture/cfa-specification.md'), 'utf8');
  const reconstructed = expected.get('introduction.md') + [...expected].filter(([name]) => name.startsWith('topics/')).map(([, value]) => value.replace(/\]\(\.\.\/\.\.\/((?:swift-coding-guide|project-workflow|new-app-design-defaults)\.md(?:#[^)]*)?|spec\/(?:examples\/open-source-apps|explanations)\.md)\)/g, ']($1)')).join('');
  assert.equal(reconstructed, canonical);
  for (const folder of ['architecture/spec', ...cfaSkills.map(name => `skills/${name}/references/spec`)]) {
    for (const [name, value] of expected) assert.equal(fs.readFileSync(path.join(root, folder, name), 'utf8'), value, `${folder}/${name}`);
  }
});

test('headings inside fenced examples remain part of their section', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-spec-topics-'));
  try {
    fs.mkdirSync(path.join(base, 'architecture'));
    fs.copyFileSync(path.join(root, 'architecture/spec-rule-catalog.json'), path.join(base, 'architecture/spec-rule-catalog.json'));
    fs.copyFileSync(path.join(root, 'architecture/open-source-apps.json'), path.join(base, 'architecture/open-source-apps.json'));
    fs.mkdirSync(path.join(base, 'architecture/explanations'));
    fs.copyFileSync(path.join(root, 'architecture/explanations/catalogue.json'), path.join(base, 'architecture/explanations/catalogue.json'));
    fs.cpSync(path.join(root, 'architecture/spec-examples'), path.join(base, 'architecture/spec-examples'), { recursive: true });
    fs.copyFileSync(path.join(root, 'architecture/reference-feature.md'), path.join(base, 'architecture/reference-feature.md'));
    const source = fs.readFileSync(path.join(root, 'architecture/cfa-specification.md'), 'utf8');
    fs.writeFileSync(path.join(base, 'architecture/cfa-specification.md'), source + '\n```markdown\n## Example only\n```\n');
    assert.equal(specTopics(base).size, specTopics(root).size);
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
});

test('rule cards reject unclassified sections and missing verification', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-spec-coverage-'));
  try {
    fs.mkdirSync(path.join(base, 'architecture'));
    fs.copyFileSync(path.join(root, 'architecture/open-source-apps.json'), path.join(base, 'architecture/open-source-apps.json'));
    fs.mkdirSync(path.join(base, 'architecture/explanations'));
    fs.copyFileSync(path.join(root, 'architecture/explanations/catalogue.json'), path.join(base, 'architecture/explanations/catalogue.json'));
    fs.cpSync(path.join(root, 'architecture/spec-examples'), path.join(base, 'architecture/spec-examples'), { recursive: true });
    fs.copyFileSync(path.join(root, 'architecture/reference-feature.md'), path.join(base, 'architecture/reference-feature.md'));
    const source = fs.readFileSync(path.join(root, 'architecture/cfa-specification.md'), 'utf8');
    const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'architecture/spec-rule-catalog.json'), 'utf8'));
    fs.writeFileSync(path.join(base, 'architecture/cfa-specification.md'), source + '\n## New required rule\n');
    fs.writeFileSync(path.join(base, 'architecture/spec-rule-catalog.json'), JSON.stringify(catalogue));
    assert.throws(() => specTopics(base), /Unclassified specification section/);
    fs.writeFileSync(path.join(base, 'architecture/cfa-specification.md'), source);
    catalogue.rules[0].verify = '';
    fs.writeFileSync(path.join(base, 'architecture/spec-rule-catalog.json'), JSON.stringify(catalogue));
    assert.throws(() => specTopics(base), /Missing verify/);
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
});

test('deep-link example persists a deferred request and completes after navigation', { skip: process.platform !== 'darwin', timeout: 120000 }, () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-spec-example-'));
  try {
    const executable = path.join(directory, 'example');
    const build = spawnSync('xcrun', ['swiftc', '-disable-sandbox', '-parse-as-library', '-swift-version', '6', '-module-cache-path', path.join(directory, 'cache'), path.join(root, 'architecture/spec-examples/DeepLinkingExample.swift'), '-o', executable], { encoding: 'utf8', timeout: 90000 });
    assert.equal(build.status, 0, build.stderr || build.error?.message);
    const run = spawnSync(executable, [], { encoding: 'utf8', timeout: 15000 });
    assert.equal(run.status, 0, run.stderr || run.error?.message);
    assert.match(run.stdout, /deferred destination survives restart/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('Notes reference documentation shows the executable Swift source', () => {
  const source = fs.readFileSync(path.join(root, 'architecture/spec-examples/NotesReference.swift'), 'utf8');
  const reference = fs.readFileSync(path.join(root, 'architecture/reference-feature.md'), 'utf8');
  const code = /^```swift\n([\s\S]*?)^```$/m.exec(reference);
  assert.equal(code?.[1], source, 'Reference code must match the tested source');
});

test('Notes reference preserves failed drafts and serialises independent saves', { skip: process.platform !== 'darwin', timeout: 120000 }, () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-notes-example-'));
  try {
    const source = path.join(root, 'architecture/spec-examples/NotesReference.swift');
    const tests = path.join(root, 'architecture/spec-examples/NotesReferenceTests.swift');
    const executable = path.join(directory, 'notes');
    const build = spawnSync('xcrun', ['swiftc', '-disable-sandbox', '-parse-as-library', '-swift-version', '6', '-module-cache-path', path.join(directory, 'cache'), source, tests, '-o', executable], { encoding: 'utf8', timeout: 90000 });
    assert.equal(build.status, 0, build.stderr || build.error?.message);
    const run = spawnSync(executable, [], { encoding: 'utf8', timeout: 15000 });
    assert.equal(run.status, 0, run.stderr || run.error?.message);
    assert.match(run.stdout, /failed save, retry, ordered overlap and JSON storage passed/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('Notes reference preserves admitted overlapping saves after a predecessor fails', { skip: process.platform !== 'darwin', timeout: 120000 }, () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-notes-queue-'));
  try {
    const reference = fs.readFileSync(path.join(root, 'architecture/spec-examples/NotesReference.swift'), 'utf8');
    // The extension shares the temporary source file solely to observe admission.
    const harness = `
actor GatedNotes: NotesRepository {
    private var started = false
    private var startWaiter: CheckedContinuation<Void, Never>?
    private var releaseWaiter: CheckedContinuation<Void, Never>?
    private(set) var saved: [String] = []
    private var releaseSecond: CheckedContinuation<Void, Never>?
    func load() async throws -> [Note] { [] }
    func save(_ note: Note) async throws {
        if note.text == "first" {
            started = true
            startWaiter?.resume(); startWaiter = nil
            await withCheckedContinuation { releaseWaiter = $0 }
            throw CocoaError(.fileWriteNoPermission)
        }
        if note.text == "second", saved.isEmpty {
            await withCheckedContinuation { releaseSecond = $0 }
        }
        saved.append(note.text)
    }
    func waitForFirst() async {
        if started { return }
        await withCheckedContinuation { startWaiter = $0 }
    }
    func release() { releaseWaiter?.resume(); releaseWaiter = nil }
    func finishSecond() async {
        while releaseSecond == nil { await Task.yield() }
        releaseSecond?.resume(); releaseSecond = nil
    }
}
extension NotesFeature { var auditSaveID: UUID? { lastSave?.id } }
@main struct Runner {
    @MainActor static func main() async throws {
        let repository = GatedNotes()
        let feature = NotesFeature(repository: repository)
        let first = Task { try await feature.save("first") }
        await repository.waitForFirst()
        let firstID = feature.auditSaveID
        let second = Task { try await feature.save("second") }
        while feature.auditSaveID == firstID { await Task.yield() }
        let secondID = feature.auditSaveID
        let third = Task { try await feature.save("third") }
        while feature.auditSaveID == secondID { await Task.yield() }
        let thirdID = feature.auditSaveID
        let fourth = Task { try await feature.save("second") }
        while feature.auditSaveID == thirdID { await Task.yield() }
        let fourthID = feature.auditSaveID
        let savedWhileBlocked = await repository.saved
        precondition(savedWhileBlocked.isEmpty)
        await repository.release()
        do { try await first.value; preconditionFailure("first save must fail") }
        catch is CocoaError {}
        precondition(feature.auditSaveID == fourthID, "An older save must not clear the current queue tail")
        await repository.finishSecond()
        try await second.value
        try await third.value
        try await fourth.value
        precondition(feature.auditSaveID == nil)
        let saved = await repository.saved
        precondition(saved == ["second", "third", "second"] && feature.notes.map(\\.text) == saved)
    }
}`;
    const input = path.join(directory, 'NotesQueue.swift');
    fs.writeFileSync(input, reference + harness);
    const executable = path.join(directory, 'notes-queue');
    const build = spawnSync('xcrun', ['swiftc', '-disable-sandbox', '-parse-as-library', '-swift-version', '6', '-module-cache-path', path.join(directory, 'cache'), input, '-o', executable], { encoding: 'utf8', timeout: 90000 });
    assert.equal(build.status, 0, build.stderr || build.error?.message);
    const run = spawnSync(executable, [], { encoding: 'utf8', timeout: 15000 });
    assert.equal(run.status, 0, run.stderr || run.error?.message);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('navigation exposes the agreed account, refresh and multi-device boundaries', () => {
  const topics = specTopics(root);
  const account = topics.get('rules/cfa-account-01.md');
  const refresh = topics.get('rules/cfa-task-02.md');
  const devices = topics.get('rules/cfa-device-01.md');
  const links = topics.get('rules/cfa-link-01.md');
  assert.match(account, /sign-out fails.*retain the session/);
  assert.match(refresh, /continues after the user leaves/);
  assert.match(devices, /each process has its own AppModel/i);
  assert.match(devices, /Watch Connectivity/);
  assert.match(links, /scene owns navigation/);
  assert.match(links, /successful navigation or explicit dismissal/);
});

test('complete review checklist names mandatory CFA invariants that broad labels could hide', () => {
  const checklist = specTopics(root).get('topics/29-review-checklist.md');
  for (const requirement of [
    /`AppModel\.shared` a stored `static let` constructed by the single/,
    /every request go through `NetworkingManager`/,
    /every access go through `SwiftDataManager`/,
    /without matching `FeatureAPI`\s+protocols/,
    /confirmed domain data, operation state and retained errors represented\s+separately/,
    /SwiftUI `App\.body` declare one stable root/,
    /complete prohibited-pattern list reviewed/
  ]) assert.match(checklist, requirement);
});

test('published app examples link to pinned source and relevant rule cards', () => {
  const topics = specTopics(root);
  const index = topics.get('examples/open-source-apps.md');
  assert.match(index, /Trend-iOS-App-Swift-Concurrency-CFA/);
  assert.match(index, /RocketLaunch-iOS-App-Swift-Concurrency\/blob\/[a-f0-9]{40}\//);
  assert.match(index, /\[Detail View\]\([^\n]*\/LaunchDetailView\.swift\)/);
  assert.match(index, /\[Detail ViewModel\]\([^\n]*\/LaunchDetailViewModel\.swift\)/);
  assert.equal((index.match(/LaunchDetailView\.swift\)/g) ?? []).length, 1);
  assert.match(topics.get('rules/cfa-cache-01.md'), /bundled CFA App template.*GitReposFeature/);
  assert.doesNotMatch(topics.get('rules/cfa-cache-01.md'), /RocketLaunch-iOS-App-Swift-Concurrency\/blob\//);
  const persistence = topics.get('topics/19-keep-persistence-behind-repository-contracts.md');
  assert.match(persistence, /`GitReposFeature` in the CFA App Xcode project/);
  assert.doesNotMatch(persistence, /RocketLaunch-iOS-App-Swift-Concurrency\/blob\/[^\s)]*LaunchScheduleFeature/);
  assert.match(topics.get('rules/cfa-state-01.md'), /bundled Habit Tracker/);
  assert.match(topics.get('rules/cfa-store-01.md'), /bundled Habit Tracker/);
  assert.match(topics.get('rules/cfa-feature-01.md'), /bundled Habit Tracker.*HabitsFeature/);
  assert.doesNotMatch(topics.get('rules/cfa-feature-01.md'), /Verbos\/blob\//);
  const capabilities = topics.get('topics/16-define-features-by-business-capability-not-by-screen-or-tab.md');
  assert.match(capabilities, /`HabitsFeature` in the bundled Habit Tracker/);
  assert.doesNotMatch(capabilities, /Trend-iOS-App-Swift-Concurrency-CFA\/blob\/[^\s)]*WeightLogFeature/);
  assert.doesNotMatch(topics.get('rules/cfa-state-01.md'), /Trend-iOS-App-Swift-Concurrency-CFA\/blob\//);
  assert.doesNotMatch(topics.get('rules/cfa-store-01.md'), /Trend-iOS-App-Swift-Concurrency-CFA\/blob\//);
  assert.match(index, /older naming or differ from current CFA rules/);
});

test('published explanations appear in the index and relevant rule cards', () => {
  const topics = specTopics(root);
  const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'architecture/explanations/catalogue.json'), 'utf8'));
  const cards = JSON.parse(fs.readFileSync(path.join(root, 'architecture/spec-rule-catalog.json'), 'utf8'));
  const associated = new Set(cards.rules.flatMap(rule => rule.explanationIds ?? []));
  const index = topics.get('explanations.md');
  for (const topic of catalogue.topics.filter(item => item.publication.status === 'published')) {
    assert.ok(index.includes(`](${topic.publication.url})`), topic.id);
    assert.ok(associated.has(topic.id), `No rule card links to ${topic.id}`);
  }
  assert.match(topics.get('rules/cfa-app-01.md'), /cfa\/explanation\/appmodel-composition/);
  assert.match(topics.get('rules/cfa-conc-03.md'), /cfa\/explanation\/task-cancellation/);
  const sharedRefresh = topics.get('rules/cfa-task-02.md');
  assert.match(sharedRefresh, /\*\*Explanation:\*\* [^\n]+\/overlapping-requests\)/);
  assert.match(sharedRefresh, /\*\*Related reading:\*\* [^\n]+\/task-cancellation\)/);
});

test('withdrawn explanations keep local routing and missing rule mappings fail generation', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-explanations-'));
  try {
    fs.cpSync(path.join(root, 'architecture'), path.join(base, 'architecture'), { recursive: true });
    const file = path.join(base, 'architecture/explanations/catalogue.json');
    const catalogue = JSON.parse(fs.readFileSync(file, 'utf8'));
    const target = catalogue.topics.find(topic => topic.id === 'appmodel-composition');
    const url = target.publication.url;
    Object.assign(target.publication, { status: 'withdrawn', url: null, verifiedOn: null, verificationEvidence: null });
    fs.writeFileSync(file, JSON.stringify(catalogue));
    const topics = specTopics(base);
    assert.equal(topics.get('explanations.md').includes(url), false);
    assert.equal(topics.get('rules/cfa-app-01.md').includes(url), false);
    const local = lookup(catalogue, 'CFA-SPEC-APP-01');
    assert.equal(local.note, target.note);
    assert.ok(local.links.every(link => link.url !== url));

    target.ruleIds = target.ruleIds.filter(id => id !== 'CFA-SPEC-APP-01');
    fs.writeFileSync(file, JSON.stringify(catalogue));
    assert.throws(() => specTopics(base), /No linked explanation resolves canonical rule CFA-SPEC-APP-01/);
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
});
