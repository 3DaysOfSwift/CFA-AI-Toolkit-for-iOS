import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { inspect, renderInspection } from '../src/inspector.mjs';

async function fixture(t, files) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cfa-inspect-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const [file, source] of Object.entries(files)) {
    const target = path.join(root, file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, source);
  }
  return root;
}

test('maps a complete screen to AppModel, feature, collaborator and named tests', async t => {
  const root = await fixture(t, {
    'Application/1 - View/Views/Chat/ChatView.swift': 'import SwiftUI\nstruct ChatView: View { @State private var viewModel = ChatViewModel(); var body: some View { Text("Hi") } }',
    'Application/1 - View/Views/Chat/ChatViewModel.swift': '@MainActor final class ChatViewModel { private let chatsFeature: ChatsFeature; init(chatsFeature: ChatsFeature = AppModel.shared.chatsFeature) { self.chatsFeature = chatsFeature } }',
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static let shared = live(); static func live() -> AppModel { AppModel() }; let chatsFeature: ChatsFeature }',
    'Application/2 - AppModel/Features/Chats/ChatsFeature.swift': 'final class ChatsFeature { private let repository: any ChatsRepository }',
    'ApplicationTests/ViewModelTests/ChatViewModelTests.swift': 'struct ChatViewModelTests {}',
    'ApplicationTests/FeatureTests/Chats/ChatsFeatureTests.swift': 'struct ChatsFeatureTests {}'
  });
  const report = await inspect(root);
  assert.equal(report.screens.length, 1);
  assert.equal(report.findings.length, 0);
  assert.equal(report.schemaVersion, 2);
  assert.equal(report.screens[0].dependencies[0].featureType, 'ChatsFeature');
  assert.deepEqual(report.screens[0].dependencies[0].collaborators, ['ChatsRepository']);
  assert.match(renderInspection(report), /ChatViewModel → chatsFeature/);
});

test('reports a missing named feature test file', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() }; let settingsFeature: SettingsFeature }',
    'Application/2 - AppModel/Features/Settings/SettingsFeature.swift': 'final class SettingsFeature {}'
  });
  const report = await inspect(root);
  assert.deepEqual(report.findings.map(item => item.code), ['feature-tests-missing']);
  assert.match(report.findings[0].message, /SettingsFeatureTests.swift/);
});

test('flags AppModel dumping-ground state and View-tied launch or storage', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': '@MainActor final class AppModel {\n    let habitsFeature: HabitsFeature\n    private(set) var modelContainer: ModelContainer?\n    private(set) var startupError: String?\n    private var didFinishLaunching: Bool = false\n}',
    'Application/2 - AppModel/Features/Habits/HabitsFeature.swift': 'final class HabitsFeature {}',
    'Application/1 - View/HabitApp.swift': 'struct HabitApp { let appModel: AppModel; var body: some View { Text("Hi").task { await appModel.applicationDidFinishLaunching() }; let container: ModelContainer } }'
  });
  const report = await inspect(root);
  const codes = report.findings.map(item => item.code);
  for (const code of ['app-model-live-factory', 'app-model-non-feature-state', 'app-model-default-value', 'stored-app-model', 'view-tied-app-launch', 'view-swiftdata-access']) {
    assert.ok(codes.includes(code), `Expected ${code}`);
  }
});

test('flags SwiftData without a manager and direct URLSession calls', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() } }',
    'Application/2 - AppModel/Storage/HabitStore.swift': 'import SwiftData\nfinal class HabitStore {}',
    'Application/2 - AppModel/Networking/GitHubAPI.swift': 'import Foundation\nfinal class GitHubAPI { func load() async throws { _ = try await URLSession.shared.data(from: url) } }'
  });
  const codes = (await inspect(root)).findings.map(item => item.code);
  assert.ok(codes.includes('swiftdata-manager-missing'));
  assert.ok(codes.includes('direct-url-session'));
});

test('flags conditional database startup presentation in App.body', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() } }',
    'Application/1 - View/HabitApp.swift': 'import SwiftUI\nstruct HabitApp: App { var body: some Scene { WindowGroup { if ready { RootTabView().modelContainer(container) } else { ProgressView("Opening") } } } }'
  });
  const codes = (await inspect(root)).findings.map(item => item.code);
  assert.ok(codes.includes('conditional-app-body'));
  assert.ok(codes.includes('app-startup-presentation'));
});

test('flags storage-gated conventional roots as review hints', async t => {
  const root = await fixture(t, {
    'Application/1 - View/ContentView.swift': 'struct ContentView: View { var body: some View { if let container = storage.container { RootTabView() } else { ProgressView() } } }',
    'Application/1 - View/RootTabView.swift': 'struct RootTabView: View { var body: some View { switch databaseState { case .ready: Tabs(); default: ProgressView() } } }',
    'Application/1 - View/RootView.swift': 'struct RootView: View { var body: some View { if isStoreReady { Tabs() } else { ErrorView() } } }'
  });
  const report = await inspect(root);
  const gates = report.findings.filter(item => item.code === 'root-storage-gate');
  assert.equal(gates.length, 3);
  assert.ok(gates.every(item => item.severity === 'review' && item.line === 1));
  assert.ok(gates.some(item => item.file.endsWith('ContentView.swift')));
  assert.match(report.limitations.join(' '), /blocking overlays require manual/);
});

test('allows feature-scoped errors and unrelated root layout without storage-gate findings', async t => {
  const root = await fixture(t, {
    'Application/1 - View/ChatView.swift': 'struct ChatView: View { var body: some View { if let databaseError = viewModel.error { ErrorView() } else { MessagesView() } } }',
    'Application/1 - View/ContentView.swift': 'struct ContentView: View { var body: some View { /* if databaseReady { } */ if horizontalSizeClass == .compact { Tabs() } else { Text("if containerReady { }") } } }',
    'Application/1 - View/HabitApp.swift': 'struct HabitApp: App { var body: some Scene { WindowGroup { ContentView() } } }'
  });
  const codes = (await inspect(root)).findings.map(item => item.code);
  assert.ok(!codes.includes('root-storage-gate'));
  assert.ok(!codes.includes('app-startup-presentation'));
  assert.ok(!codes.includes('conditional-app-body'));
});

test('reports missing ownership and tests without pretending to verify semantics', async t => {
  const root = await fixture(t, {
    'Application/1 - View/Views/Chat/ChatView.swift': 'import SwiftUI\nstruct ChatView: View { var body: some View { Text("Hi") } }',
    'Application/1 - View/Views/Chat/ChatViewModel.swift': 'final class ChatViewModel { init() {} }',
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() } }'
  });
  const report = await inspect(root);
  assert.deepEqual(report.findings.map(item => item.code), [
    'view-model-ownership', 'feature-route-unresolved', 'view-model-tests-missing'
  ]);
  assert.match(report.method, /Lexical/);
  assert.match(report.limitations.join(' '), /not type-check/);
});

test('ignores fake dependencies in comments and strings and flags unresolved properties', async t => {
  const root = await fixture(t, {
    'Application/1 - View/Views/Chat/ChatView.swift': 'import SwiftUI\nstruct ChatView: View { @State private var viewModel = ChatViewModel(); var body: some View { Text("AppModel.shared.fakeFeature") } }',
    'Application/1 - View/Views/Chat/ChatViewModel.swift': '// AppModel.shared.fakeFeature\nfinal class ChatViewModel { init(chatsFeature: any ChatsFeatureAPI = AppModel.shared.missingFeature) {} }',
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() } }',
    'ApplicationTests/ChatViewModelTests.swift': 'struct ChatViewModelTests {}'
  });
  const report = await inspect(root);
  assert.deepEqual(report.screens[0].dependencies.map(item => item.property), ['missingFeature']);
  assert.deepEqual(report.findings.map(item => item.code), ['unresolved-feature']);
});

test('reports old feature-owner types and mismatched feature references', async t => {
  const root = await fixture(t, {
    'Application/1 - View/Views/Chat/ChatView.swift': 'import SwiftUI\nstruct ChatView: View { @State private var viewModel = ChatViewModel(); var body: some View { Text("Hi") } }',
    'Application/1 - View/Views/Chat/ChatViewModel.swift': 'final class ChatViewModel { private let chats: ChatsManager; init(chats: ChatsManager = AppModel.shared.chatsManager) { self.chats = chats } }',
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static let shared = live(); static func live() -> AppModel { AppModel() }; let chatsManager: ChatsManager }',
    'Application/2 - AppModel/Features/Chats/ChatsManager.swift': 'final class ChatsManager {}',
    'ApplicationTests/ChatViewModelTests.swift': 'struct ChatViewModelTests {}'
  });
  const report = await inspect(root);
  assert.deepEqual(report.findings.map(item => item.code), ['feature-type-name', 'feature-property-name']);
  assert.equal(report.screens[0].dependencies[0].featureType, 'ChatsManager');
});

test('reports a feature local stored under a different name', async t => {
  const root = await fixture(t, {
    'Application/1 - View/Views/Chat/ChatView.swift': 'import SwiftUI\nstruct ChatView: View { @State private var viewModel = ChatViewModel(); var body: some View { Text("Hi") } }',
    'Application/1 - View/Views/Chat/ChatViewModel.swift': 'final class ChatViewModel { private let chats: ChatsFeature; init(chats: ChatsFeature = AppModel.shared.chatsFeature) { self.chats = chats } }',
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static let shared = AppModel(); let chatsFeature: ChatsFeature }',
    'Application/2 - AppModel/Features/Chats/ChatsFeature.swift': 'final class ChatsFeature {}',
    'ApplicationTests/ChatViewModelTests.swift': 'struct ChatViewModelTests {}'
  });
  const report = await inspect(root);
  assert.ok(report.findings.some(item => item.code === 'feature-reference-name'));
  assert.ok(report.findings.some(item => item.code === 'feature-parameter-name'));
});
