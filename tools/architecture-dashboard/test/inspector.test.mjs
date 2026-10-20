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
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static let shared = AppModel(); let chatsFeature: ChatsFeature }',
    'Application/2 - AppModel/Features/Chats/ChatsFeature.swift': 'final class ChatsFeature { private let repository: any ChatsRepository }',
    'ApplicationTests/ViewModelTests/ChatViewModelTests.swift': 'struct ChatViewModelTests {}'
  });
  const report = await inspect(root);
  assert.equal(report.screens.length, 1);
  assert.equal(report.findings.length, 0);
  assert.equal(report.schemaVersion, 2);
  assert.equal(report.screens[0].dependencies[0].featureType, 'ChatsFeature');
  assert.deepEqual(report.screens[0].dependencies[0].collaborators, ['ChatsRepository']);
  assert.match(renderInspection(report), /ChatViewModel → chatsFeature/);
});

test('reports missing ownership and tests without pretending to verify semantics', async t => {
  const root = await fixture(t, {
    'Application/1 - View/Views/Chat/ChatView.swift': 'import SwiftUI\nstruct ChatView: View { var body: some View { Text("Hi") } }',
    'Application/1 - View/Views/Chat/ChatViewModel.swift': 'final class ChatViewModel { init() {} }',
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel {}'
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
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel {}',
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
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static let shared = AppModel(); let chatsManager: ChatsManager }',
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
