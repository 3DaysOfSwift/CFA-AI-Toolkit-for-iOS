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
    'ApplicationTests/View model tests/ChatViewModelTests.swift': 'struct ChatViewModelTests {}',
    'ApplicationTests/FeatureTests/Chats/ChatsFeatureTests.swift': 'struct ChatsFeatureTests {}'
  });
  const report = await inspect(root);
  assert.equal(report.screens.length, 1);
  assert.equal(report.findings.length, 0);
  assert.equal(report.schemaVersion, 2);
  assert.equal(report.screens[0].dependencies[0].featureType, 'ChatsFeature');
  assert.deepEqual(report.screens[0].dependencies[0].collaborators, ['ChatsRepository']);
  assert.match(renderInspection(report), /ChatViewModel → chatsFeature.*private @State recognized/);
  await fs.writeFile(path.join(root, 'ApplicationTests/ChatsFeature.swift'), 'final class ChatsFeature {}');
  const ambiguous = await inspect(root);
  assert.equal(ambiguous.screens[0].dependencies[0].featureFile, null);
  assert.deepEqual(ambiguous.screens[0].dependencies[0].collaborators, []);
  assert.match(renderInspection(ambiguous), /chatsFeature \(ChatsFeature, source unresolved\)/);
  const ambiguity = ambiguous.findings.filter(item => item.code === 'feature-source-ambiguous');
  assert.deepEqual(ambiguity.map(item => item.file), ['Application/2 - AppModel/AppModel.swift']);
  assert.match(ambiguity[0].message, /Features\/Chats\/ChatsFeature\.swift:1/);
  assert.match(ambiguity[0].message, /ApplicationTests\/ChatsFeature\.swift:1/);
  await fs.unlink(path.join(root, 'Application/1 - View/Views/Chat/ChatViewModel.swift'));
  assert.ok((await inspect(root)).findings.some(item => item.code === 'feature-source-ambiguous'));
  assert.ok(!ambiguous.findings.some(item => item.code === 'feature-placement'));

});

test('leaves AppModel routes unresolved when multiple app roots are scanned', async t => {
  const root = await fixture(t, {
    'First/2 - AppModel/AppModel.swift': 'final class AppModel { let feedFeature: FeedFeature }',
    'Second/2 - AppModel/AppModel.swift': 'final class AppModel { let feedFeature: OtherFeature }',
    'Second/1 - View/Views/Feed/FeedView.swift': 'struct FeedView: View { @State private var viewModel = FeedViewModel() }',
    'Second/1 - View/Views/Feed/FeedViewModel.swift': 'final class FeedViewModel { let feedFeature = AppModel.shared.feedFeature }'
  });
  const report = await inspect(root);
  assert.equal(report.appModelFile, null);
  assert.equal(report.screens[0].dependencies[0].featureType, null);
  assert.ok(report.findings.some(item => item.code === 'app-model-ambiguous'));
  assert.ok(!report.findings.some(item => item.code === 'app-model-missing'));
});

test('does not prefer a conventional AppModel over a candidate in a differently named file', async t => {
  const root = await fixture(t, {
    'First/2 - AppModel/AppModel.swift': 'final class AppModel { let feedFeature: FeedFeature }',
    'Second/Composition.swift': 'final class AppModel { let feedFeature: OtherFeature }',
    'Second/1 - View/Views/Feed/FeedView.swift': 'struct FeedView: View { @State private var viewModel = FeedViewModel() }',
    'Second/1 - View/Views/Feed/FeedViewModel.swift': 'final class FeedViewModel { let feedFeature = AppModel.shared.feedFeature }'
  });
  const report = await inspect(root);
  assert.equal(report.appModelFile, null);
  assert.equal(report.screens[0].dependencies[0].featureType, null);
  assert.match(report.findings.find(item => item.code === 'app-model-ambiguous')?.message, /Second\/Composition\.swift:1/);
});

test('reviews Feature placement for a qualified Feature outside the AppModel feature folders', async t => {
  const featureFile = 'Packages/Feed/Sources/Features/Feed/FeedFeature.swift';
  const root = await fixture(t, {
    'App/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() }; let feedFeature: FeedModule.FeedFeature }',
    [featureFile]: 'import Foundation\nfinal class FeedFeature {}'
  });
  const { findings } = await inspect(root);
  assert.ok(!findings.some(item => item.code === 'app-model-non-feature-state'));
  const finding = findings.find(item => item.code === 'feature-placement');
  assert.deepEqual([finding?.file, finding?.line, finding?.severity], [featureFile, 2, 'review']);
});

test('reviews an actor exposed as a Feature while leaving its worker alone', async t => {
  const file = 'Application/2 - AppModel/Features/Settings/SettingsFeature.swift';
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() }; let settingsFeature: SettingsFeature }',
    [file]: 'actor SettingsFeature {}\nactor SettingsStorage {}'
  });
  const {findings} = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'feature-isolation')
    .map(({file, line, severity}) => [file, line, severity]), [[file, 1, 'review']]);
});

test('reviews explicit nonisolated Feature declarations without inferring default isolation', async t => {
  const file = 'Application/2 - AppModel/Features/Settings/SettingsFeature.swift';
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { let settingsFeature: SettingsFeature }',
    [file]: 'nonisolated final\nclass SettingsFeature {}'
  });
  const matches = (await inspect(root)).findings.filter(item => item.code === 'feature-isolation');
  assert.equal(matches.length, 1);
  const [finding] = matches;
  assert.deepEqual([finding?.file, finding?.line, finding?.severity], [file, 2, 'review']);
  await fs.writeFile(path.join(root, 'Application/2 - AppModel/AppModel.swift'), 'final class AppModel {}');
  await fs.writeFile(path.join(root, file), 'final nonisolated class SettingsFeature {}');
  assert.equal((await inspect(root)).findings.find(item => item.code === 'feature-isolation')?.line, 1);
  await fs.writeFile(path.join(root, file), 'final class SettingsFeature {}');
  assert.ok(!(await inspect(root)).findings.some(item => item.code === 'feature-isolation'));
});

test('reviews a nonisolated Feature in a later conditional declaration', async t => {
  const file = 'Application/2 - AppModel/Features/Settings/SettingsFeature.swift';
  const root = await fixture(t, {
    [file]: `#if DEBUG
    @MainActor final class SettingsFeature {}
    #else
    nonisolated final class SettingsFeature {}
    #endif`
  });
  const {findings} = await inspect(root);
  const isolation = findings.filter(item => item.code === 'feature-isolation');
  assert.deepEqual(isolation.map(item => [item.file, item.line, item.severity]), [[file, 4, 'review']]);
});

test('reports a missing named feature test file', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static let shared = live(); static func live() -> AppModel { AppModel() }; let settingsFeature: SettingsFeature }',
    'Application/2 - AppModel/Features/Settings/SettingsFeature.swift': 'final class SettingsFeature {}'
  });
  const report = await inspect(root);
  assert.deepEqual(report.findings.map(item => item.code), ['feature-tests-missing']);
  assert.equal(report.findings[0].severity, 'review');
  assert.match(report.findings[0].message, /SettingsFeatureTests.swift/);
  assert.match(report.findings[0].message, /scanned directory/);
});

test('reviews missing tests for a concrete Feature without direct AppModel exposure', async t => {
  const file = 'App/2 - AppModel/Features/Checkout/CheckoutFeature.swift';
  const root = await fixture(t, {
    [file]: 'final class CheckoutFeature {}',
    'App/2 - AppModel/Features/Checkout/CheckoutStore.swift': 'actor CheckoutStore {}'
  });
  const {findings} = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'feature-tests-missing')
    .map(item => [item.file, item.line]), [[file, 1]]);
});

test('reviews Feature tests placed within a production source tree', async t => {
  const file = 'Application/2 - AppModel/FeatureTests/SettingsFeatureTests.swift';
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() }; let settingsFeature: SettingsFeature }',
    'Application/2 - AppModel/Features/Settings/SettingsFeature.swift': 'final class SettingsFeature {}',
    'ApplicationTests/SettingsFeatureTests.swift': 'struct SettingsFeatureTests {}',
    'Application/4 - Swift Extensions/FeatureTests/SettingsFeatureTests.swift': 'struct SettingsFeatureTests {}',
    [file]: 'struct SettingsFeatureTests {}'
  });
  const {findings} = await inspect(root);
  const placement = findings.find(item => item.code === 'feature-test-placement');
  assert.deepEqual([placement?.file, placement?.line, placement?.severity], [file, 1, 'review']);
  assert.ok(findings.some(item => item.code === 'feature-test-placement' && item.file === 'ApplicationTests/SettingsFeatureTests.swift'));
  assert.ok(findings.some(item => item.code === 'feature-test-placement'
    && item.file === 'Application/4 - Swift Extensions/FeatureTests/SettingsFeatureTests.swift'
    && item.message.includes('production source tree')));
  assert.ok(findings.some(item => item.code === 'feature-tests-ambiguous'));
  assert.ok(!findings.some(item => item.code === 'feature-tests-missing'));
});

test('reports test search scope when tests are beside the scanned app folder', async t => {
  const root = await fixture(t, {
    'Application/1 - View/Views/Chat/ChatView.swift': 'struct ChatView: View { @State private var viewModel = ChatViewModel() }',
    'Application/1 - View/Views/Chat/ChatViewModel.swift': 'final class ChatViewModel { init(chatsFeature: ChatsFeature = AppModel.shared.chatsFeature) {} }',
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() }; let chatsFeature: ChatsFeature }',
    'Application/2 - AppModel/Features/Chats/ChatsFeature.swift': 'final class ChatsFeature {}',
    'ApplicationTests/View model tests/ChatViewModelTests.swift': 'struct ChatViewModelTests {}',
    'ApplicationTests/FeatureTests/ChatsFeatureTests.swift': 'struct ChatsFeatureTests {}'
  });
  const isMissingTest = item => ['feature-tests-missing', 'view-model-tests-missing'].includes(item.code);
  const scoped = (await inspect(path.join(root, 'Application'))).findings.filter(isMissingTest);
  assert.equal(scoped.length, 2);
  assert.ok(scoped.every(item => item.severity === 'review'));
  assert.ok(scoped.every(item => /scanned directory/.test(item.message)));
  assert.equal((await inspect(root)).findings.filter(isMissingTest).length, 0);
  await fs.rename(path.join(root, 'ApplicationTests/FeatureTests'), path.join(root, 'FeatureTests'));
  await fs.rename(path.join(root, 'ApplicationTests/View model tests/ChatViewModelTests.swift'), path.join(root, 'ChatViewModelTests.swift'));
  assert.equal((await inspect(root)).findings.filter(isMissingTest).length, 0);
});

test('does not mistake composition locals for AppModel properties', async t => {
  const root = await fixture(t, {
    'Application/1 - View/Views/Chat/ChatView.swift': 'struct ChatView: View { @State private var viewModel = ChatViewModel() }',
    'Application/1 - View/Views/Chat/ChatViewModel.swift': 'final class ChatViewModel { init(chatFeature: ChatFeature = AppModel.shared.chatFeature) {} }',
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { let chatFeature: ChatFeature = ChatFeature(); return AppModel() } }',
    'Application/2 - AppModel/Features/Chat/ChatFeature.swift': 'final class ChatFeature {}',
    'ApplicationTests/View model tests/ChatViewModelTests.swift': 'struct ChatViewModelTests {}'
  });
  const report = await inspect(root);
  assert.ok(report.findings.some(item => item.code === 'unresolved-feature'));
  const missingTests = report.findings.filter(item => item.code === 'feature-tests-missing');
  assert.deepEqual(missingTests.map(item => item.file), ['Application/2 - AppModel/Features/Chat/ChatFeature.swift']);
  assert.equal(report.screens[0].dependencies[0].featureType, null);
});

test('flags AppModel dumping-ground state and View-tied launch or storage', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': '@MainActor final class AppModel {\n    let habitsFeature: HabitsFeature\n    private(set) var modelContainer: ModelContainer?\n    private(set) var startupError: String?\n    private var didFinishLaunching: Bool = false\n}',
    'Application/2 - AppModel/Features/Habits/HabitsFeature.swift': 'final class HabitsFeature {}',
    'Application/1 - View/HabitApp.swift': 'struct HabitApp { let appModel: AppModel; var body: some View { Text("Hi").task { await appModel.applicationDidFinishLaunching() }; let container: ModelContainer } }'
  });
  const report = await inspect(root);
  const codes = report.findings.map(item => item.code);
  for (const code of ['app-model-live-factory', 'app-model-non-feature-state', 'app-model-boolean-purpose', 'stored-app-model', 'view-tied-app-launch', 'view-swiftdata-access']) {
    assert.ok(codes.includes(code), `Expected ${code}`);
  }
  for (const code of ['stored-app-model', 'view-swiftdata-access', 'view-tied-app-launch']) {
    assert.equal(report.findings.find(item => item.code === code).severity, 'review');
  }
});

test('a launch call in preview code is a review hint, not a production assertion', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() } }',
    'Application/1 - View/PreviewSupport.swift': '#Preview { DemoView().task { AppModel.shared.applicationDidFinishLaunching() } }',
    'Application/1 - View/StartupView.swift': 'struct StartupView: View {\n var body: some View {\n Text("Startup").task(id: phase.key()) { if enabled { prepare() }; AppModel.shared.applicationDidFinishLaunching() }\n }\n}',
    'Application/1 - View/LocalHelper.swift': 'struct LocalHelper: View { var body: some View { Text("Hi").task { func applicationDidFinishLaunching() {} } } }'
  });
  const {findings} = await inspect(root);
  const finding = findings.find(item => item.code === 'view-tied-app-launch');
  assert.equal(finding.severity, 'review');
  assert.match(finding.message, /preview or test/);
  const startupFinding = findings.find(item => item.code === 'view-tied-app-launch' && item.file.endsWith('/StartupView.swift'));
  assert.equal(startupFinding?.line, 3);
  assert.equal(findings.filter(item => item.code === 'view-tied-app-launch').length, 2);
});

test('reviews app launch signals in synchronous SwiftUI callbacks', async t => {
  const file = 'Application/StartupView.swift';
  const root = await fixture(t, {
    [file]: `struct StartupView: View {
      var body: some View {
        Text("Startup")
          .onAppear(perform: { AppModel.shared.applicationDidFinishLaunching() })
          .onChange(of: phase) { AppModel.shared.applicationDidFinishLaunching() }
          .onReceive(events) { _ in AppModel.shared.applicationDidFinishLaunching() }
      }
    }`
  });
  const {findings} = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'view-tied-app-launch')
    .map(({file, line, severity}) => [file, line, severity]),
    [[file, 4, 'review'], [file, 5, 'review'], [file, 6, 'review']]);
});

test('reports typed and inferred AppModel property defaults without flagging shared or local values', async t => {
  const file = 'Application/2 - AppModel/AppModel.swift';
  const root = await fixture(t, {
    [file]: `final class AppModel {
      static let shared = live()
      private var hasLaunched = false
      let feedFeature
        = FeedFeature()
      public let ordersFeature: OrdersFeature = OrdersFeature()
      static func live() -> AppModel {
        let feature = FeedFeature()
        return AppModel()
      }
    }`
  });
  const { findings } = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'app-model-default-value')
    .map(({file, line}) => [file, line]), [[file, 3], [file, 4], [file, 6]]);
});

test('flags extra static AppModel storage while allowing shared and computed properties', async t => {
  const file = 'Application/2 - AppModel/AppModel.swift';
  const root = await fixture(t, {
    [file]: `final class AppModel {
      static let shared = live()
      private static var alternateGraph:
        AppModel
        = live()
      static var title: String { "Home" }
      static func live() -> AppModel { AppModel() }
    }`
  });
  const { findings } = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'app-model-static-state')
    .map(({file, line}) => [file, line]), [[file, 3]]);
});

test('reviews a production factory without an AppModel.shared property', async t => {
  const file = 'Application/2 - AppModel/AppModel.swift';
  const root = await fixture(t, {
    [file]: 'final class AppModel { static func live() -> AppModel { AppModel() } }'
  });
  const missingShared = item => item.code === 'app-model-shared-missing';
  const finding = (await inspect(root)).findings.find(missingShared);
  assert.equal(finding?.severity, 'review');
  assert.equal(finding?.file, file);
  await fs.writeFile(path.join(root, file), 'final class AppModel { static func live() -> AppModel { AppModel() } }\nextension AppModel { static let shared = live() }');
  assert.ok(!(await inspect(root)).findings.some(missingShared));
});

test('reviews competing conditional shared graphs and checks each initializer', async t => {
  const file = 'Application/2 - AppModel/AppModel.swift';
  const root = await fixture(t, {
    [file]: `final class AppModel {
      #if DEBUG
      static let shared = live()
      #else
      static let \`shared\` = AppModel()
      #endif
      static func live() -> AppModel { AppModel() }
    }`
  });
  const {findings} = await inspect(root);
  const ambiguity = findings.find(item => item.code === 'app-model-shared-ambiguous');
  assert.equal(ambiguity?.severity, 'review');
  assert.ok(ambiguity?.message.includes(`${file}:3, ${file}:5`));
  assert.equal(findings.find(item => item.code === 'app-model-shared-factory')?.line, 5);
});

test('checks static AppModel storage in an extension at its source location', async t => {
  const file = 'Application/2 - AppModel/AppModel+Graph.swift';
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel {}',
    [file]: `extension AppModel {
      static let \`shared\` = AppModel()
      static let \`alternateGraph\` = AppModel()
      static func live() -> AppModel { AppModel() }
    }`
  });
  const {findings} = await inspect(root);
  const storageFindings = findings.filter(item =>
    ['app-model-static-state', 'app-model-shared-factory'].includes(item.code)
  );
  assert.deepEqual(storageFindings.map(item => [item.code, item.file, item.line]), [
    ['app-model-static-state', file, 3],
    ['app-model-shared-factory', file, 2]
  ]);
});

test('flags a mutable shared AppModel graph', async t => {
  const file = 'Application/2 - AppModel/AppModel.swift';
  const root = await fixture(t, {
    [file]: `final class AppModel {
      private(set) static var \`shared\`: AppModel
        = live()
      static func live() -> AppModel { AppModel() }
    }`
  });
  const { findings } = await inspect(root);
  const warning = findings.find(item => item.code === 'app-model-mutable-shared');
  assert.equal(warning?.file, file);
  assert.equal(warning?.line, 2);
});

test('flags a computed shared AppModel graph', async t => {
  const file = 'Application/2 - AppModel/AppModel.swift';
  const root = await fixture(t, {
    [file]: `final class AppModel {
      static var \`shared\`: AppModel { live() }
      static func live() -> AppModel { AppModel() }
    }`
  });
  const { findings } = await inspect(root);
  const warning = findings.find(item => item.code === 'app-model-computed-shared');
  assert.equal(warning?.file, file);
  assert.equal(warning?.line, 2);
});

test('does not identify a launch guard by the order of private Boolean properties', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel {\n    private var unrelatedFlag: Bool = false\n    private var didFinishLaunching: Bool\n    static func live() -> AppModel { AppModel() }\n}'
  });
  const findings = (await inspect(root)).findings;
  const booleans = findings.filter(item => item.code === 'app-model-boolean-purpose');
  const extra = findings.find(item => item.code === 'app-model-extra-boolean-state');
  assert.equal(extra?.severity, 'review');
  assert.match(extra?.message, /unrelatedFlag \(line 2\).*didFinishLaunching \(line 3\)/);
  assert.equal(booleans.length, 2);
  assert.ok(booleans.every(item => item.severity === 'review'));
  assert.ok(!findings.some(item => item.code === 'app-model-non-feature-state' && /didFinishLaunching/.test(item.message)));
  assert.ok(!findings.some(item => /launch guard unrelatedFlag/.test(item.message)));
});

test('local and preview storage references are not asserted to be production violations', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() } }',
    'Application/1 - View/PreviewSupport.swift': 'import SwiftUI\nfunc makePreview() {\n let model: Example.AppModel = AppModel.live(); let container: ModelContainer = previewContainer\n}'
  });
  const findings = (await inspect(root)).findings;
  assert.equal(findings.find(item => item.code === 'stored-app-model').severity, 'review');
  assert.match(findings.find(item => item.code === 'stored-app-model').message, /local value or preview/);
  assert.equal(findings.find(item => item.code === 'stored-app-model').line, 3);
  assert.equal(findings.find(item => item.code === 'view-swiftdata-access').severity, 'review');
  assert.match(findings.find(item => item.code === 'view-swiftdata-access').message, /previews retain the same CFA boundaries/);
});

test('reports a stored AppModel once and retains a separate local declaration lead', async t => {
  const file = 'Application/1 - View/Detail.swift';
  const root = await fixture(t, {
    [file]: `struct Detail: View {
      let model: AppModel
      var body: some View {
        let local: AppModel = model
        return Text("Detail")
      }
    }`
  });
  const findings = (await inspect(root)).findings.filter(item =>
    item.code === 'stored-app-model' || item.code === 'view-stored-model-dependency');
  assert.deepEqual(findings.map(item => [item.code, item.line]), [
    ['view-stored-model-dependency', 2],
    ['stored-app-model', 4]
  ]);
});

test('reviews direct SwiftData preview and query usage without flagging a normal preview', async t => {
  const root = await fixture(t, {
    'Application/1 - View/PreviewSupport.swift': 'import SwiftUI\n#Preview { NotesView().`modelContainer`(container) }',
    'Application/PreviewContent/NotesPreview.swift': '#Preview { NotesView().modelContainer(container) }',
    'Application/PreviewContent/LegacyPreview.swift': 'struct LegacyPreview: PreviewProvider { static var previews: some View { NotesView().modelContainer(container) } }',
    'Application/PreviewContent/SafeLegacyPreview.swift': 'struct SafeLegacyPreview: PreviewProvider { static var previews: some View { NotesView() } }',
    'Application/2 - AppModel/SwiftDataManager.swift': 'class SwiftDataManager { let container: ModelContainer }',
    'Application/1 - View/QueryScreen.swift': 'struct QueryScreen: View { @Query var notes: [Note]; var body: some View { Text("Notes") } }\n#Preview { QueryScreen().modelContainer(container) }',
    'Application/Components/QualifiedQuery.swift': 'struct QualifiedQuery: View { @SwiftData.Query var notes: [Note] }',
    'Application/1 - View/EnvironmentScreen.swift': 'struct EnvironmentScreen: View { @Environment(\\.modelContext) private var context; var body: some View { Text("Notes") } }',
    'Application/Components/QualifiedEnvironment.swift': 'struct QualifiedEnvironment: SwiftUI.View { @SwiftUI.Environment(\\SwiftUI.EnvironmentValues.modelContext) var context }',
    'Application/1 - View/SimplePreview.swift': '#Preview { NotesView() }\n// @Query var notes: [Note]\nlet example = ".modelContainer(container)"'
  });
  const matches = (await inspect(root)).findings.filter(item => item.code === 'view-swiftdata-access');
  assert.equal(matches.length, 8);
  assert.ok(matches.some(item => item.file.endsWith('/QualifiedEnvironment.swift') && item.line === 1));
  assert.ok(matches.some(item => item.file.endsWith('/QualifiedQuery.swift') && item.line === 1));
  assert.ok(matches.some(item => item.file.endsWith('NotesPreview.swift') && item.line === 1));
  assert.ok(matches.some(item => item.file.endsWith('/LegacyPreview.swift') && item.line === 1));
  assert.ok(matches.every(item => item.severity === 'review'));
  assert.equal(matches.find(item => item.file.endsWith('PreviewSupport.swift'))?.line, 2);
  assert.deepEqual(matches.filter(item => item.file.endsWith('QueryScreen.swift')).map(item => item.line).sort(), [1, 2]);
  assert.ok(matches.some(item => item.file.endsWith('EnvironmentScreen.swift')));
});

test('locates multiple SwiftData access lines in a View-layer file', async t => {
  const file = 'Application/1 - View/Notes.swift';
  const root = await fixture(t, {
    [file]: `struct NotesView: View {
      @Query var notes: [Note]
      var body: some View { Text("Notes").modelContainer(container) }
    }
    #Preview { NotesView() }`
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'view-swiftdata-access');
  assert.deepEqual(findings.map(item => [item.file, item.line]), [[file, 2], [file, 3]]);
});

test('reviews a preview that injects a SwiftData context through the environment', async t => {
  const file = 'Application/1 - View/NotesPreview.swift';
  const root = await fixture(t, {
    [file]: [
      '#Preview {',
      '  NotesView().environment(\\.modelContext, context)',
      '    .modelContainer(container)',
      '}',
      '#Preview { NotesView().environment(\\.locale, locale) }'
    ].join('\n')
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'view-swiftdata-access');
  assert.deepEqual(findings.map(item => [item.file, item.line, item.severity]), [[file, 2, 'review'], [file, 3, 'review']]);
});

test('reviews a preview reaching the context through a model instance', async t => {
  const file = 'Application/PreviewContent/NotesPreview.swift';
  const root = await fixture(t, {
    [file]: [
      '#Preview {',
      '  let context = note.modelContext',
      '  NotesView(). /* storage setup */ modelContainer(container)',
      '}',
      '#Preview { NotesView() }'
    ].join('\n'),
    'Application/Storage/NotesStore.swift': 'actor NotesStore { func context(for note: Note) { _ = note.modelContext } }'
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'view-swiftdata-access');
  assert.deepEqual(findings.map(item => [item.file, item.line, item.severity]), [[file, 2, 'review'], [file, 3, 'review']]);
});

test('reviews SwiftData access in a SwiftUI View outside the CFA View folder', async t => {
  const root = await fixture(t, {
    'Application/Presentation/Notes.swift': [
      'struct NotesView: SwiftUI.View {',
      '  @Query var notes: [Note]',
      '  var body: some View { Text("Notes").modelContainer(container) }',
      '}',
      'struct SummaryView: View { var body: some View { Text("Summary") } }',
      'actor NotesStore { let container: ModelContainer }'
    ].join('\n'),
    'Application/Presentation/Notes+Storage.swift': `extension NotesView {
      var editor: some View { Text("Notes").modelContainer(container) }
    }
    extension NotesStore {
      func read(context: ModelContext) {}
    }`
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'view-swiftdata-access');
  assert.deepEqual(findings.map(({file, line, severity}) => [file, line, severity]).sort(), [
    ['Application/Presentation/Notes+Storage.swift', 2, 'review'],
    ['Application/Presentation/Notes.swift', 2, 'review'],
    ['Application/Presentation/Notes.swift', 3, 'review']
  ]);
});

test('reviews direct SwiftData access in ViewModels outside the CFA View folder', async t => {
  const file = 'Application/Presentation/NotesViewModel.swift';
  const extension = 'Application/Presentation/NotesViewModel+Storage.swift';
  const root = await fixture(t, {
    [file]: 'final class NotesViewModel { let context: ModelContext }',
    [extension]: 'extension NotesViewModel { func read() { _ = ModelContainer.self } }',
    'Application/Presentation/NotesStore.swift': 'actor NotesStore { let context: ModelContext }'
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'view-swiftdata-access');
  assert.deepEqual(findings.map(({file, line, severity}) => [file, line, severity]).sort(), [
    [extension, 1, 'review'],
    [file, 1, 'review']
  ]);
});

test('reviews lifecycle tasks in a SwiftUI View outside the CFA View folder', async t => {
  const file = 'Application/Presentation/Notes.swift';
  const root = await fixture(t, {
    [file]: `struct NotesView: SwiftUI.View {
      var body: some View {
        Text("Notes").task {
          Task { await viewModel.refresh() }
        }
      }
    }
    struct Worker {
      func run() { client.task { Task {} } }
    }`,
    'Application/Presentation/Notes+Refresh.swift': `extension NotesView {
      var refreshView: some View {
        Text("Refresh").refreshable { Task { await viewModel.refresh() } }
      }
    }`
  });
  const { findings } = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'task-inside-view-lifecycle')
    .map(({file, line, severity}) => [file, line, severity]).sort(), [
    ['Application/Presentation/Notes+Refresh.swift', 3, 'review'],
    [file, 4, 'review']
  ]);
});

test('identifies a launch signal scheduled inside a delegate Task or dispatch queue without flagging independent work', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() } }',
    'Application/AppDelegate.swift': 'class AppDelegate {\n func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool {\n Task { await AppModel.shared.applicationDidFinishLaunching() }\n return true\n }\n}',
    'Application/OtherDelegate.swift': 'class OtherDelegate { func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool { AppModel.shared.applicationDidFinishLaunching(); Task { await refresh(); analytics.applicationDidFinishLaunching() }; return true } }',
    'Application/UnrelatedDelegate.swift': 'class AppDelegate { func application(_ app: UIApplication, options didFinishLaunchingWithOptions: Bool) -> Bool { Task { AppModel.shared.applicationDidFinishLaunching() }; return true } }',
    'Application/UnrelatedOverload.swift': 'class Helper { func application(_ app: String, didFinishLaunchingWithOptions options: Bool) -> Bool { Task { AppModel.shared.applicationDidFinishLaunching() }; return true } }',
    'Application/DispatchDelegate.swift': 'class AppDelegate {\n func application(_ app: UIKit.UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Swift.Bool {\n DispatchQueue.main.async { AppModel.shared.applicationDidFinishLaunching() }\n return true\n }\n}'
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'scheduled-app-model-launch');
  assert.deepEqual(findings.map(({file, line, severity}) => [file, line, severity]), [
    ['Application/AppDelegate.swift', 3, 'review'],
    ['Application/DispatchDelegate.swift', 3, 'review']
  ]);
  assert.match(findings[0].message, /through Task/);
  assert.match(findings[1].message, /through DispatchQueue\.async/);
});

test('reviews synchronous launch reads without attributing Task work to the callback', async t => {
  const file = 'Application/AppDelegate.swift';
  const root = await fixture(t, {
    [file]: `class AppDelegate {
      func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool {
        _ = try? Foundation.Data(contentsOf: cacheURL)
        _ = FileManager.default.contents(atPath: cachePath)
        Task { _ = try? String(contentsOf: otherURL, encoding: .utf8) }
        return true
      }
    }`
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'blocking-app-launch-io');
  assert.deepEqual(findings.map(item => [item.file, item.line, item.severity]), [[file, 3, 'review'], [file, 4, 'review']]);
});

test('reviews synchronous file opens before the launch callback returns', async t => {
  const file = 'Application/AppDelegate.swift';
  const root = await fixture(t, {
    [file]: `class AppDelegate {
      func application(_: UIApplication, didFinishLaunchingWithOptions _: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        _ = try? Foundation.FileHandle(forReadingFrom: cacheURL)
        _ = try? FileHandle.init(forUpdating: logURL)
        Task { _ = try? FileHandle(forWritingTo: logURL) }
        return true
      }
    }`
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'blocking-app-launch-io');
  assert.deepEqual(findings.map(item => [item.file, item.line, item.severity]), [[file, 3, 'review'], [file, 4, 'review']]);
});

test('reviews direct synchronous reads in AppModel construction and startup', async t => {
  const model = 'App/2 - AppModel/AppModel.swift';
  const startup = 'App/2 - AppModel/AppModel+Startup.swift';
  const root = await fixture(t, {
    [model]: `final class AppModel {
      init() { _ = try? Data(contentsOf: url) }
      static func live() -> AppModel {
        _ = try? Foundation.Data.init(contentsOf: url)
        return AppModel()
      }
      func unrelated() { _ = try? Data(contentsOf: url) }
    }`,
    [startup]: `extension AppModel {
      func applicationDidFinishLaunching() -> Void {
        _ = try? String(contentsOf: url, encoding: .utf8)
        Task { _ = try? Data(contentsOf: url) }
      }
    }`
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'blocking-app-launch-io');
  assert.deepEqual(findings.map(item => [item.file, item.line]).sort(), [[startup, 3], [model, 2], [model, 4]]);
});

test('reviews a launch signal deferred through mutable local aliases', async t => {
  const file = 'Application/AppDelegate.swift';
  const root = await fixture(t, {
    [file]: `class AppDelegate {
      func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool {
        var startupQueue: DispatchQueue = .main
        var model = AppModel.shared
        startupQueue.async { model.applicationDidFinishLaunching() }
        return true
      }
    }`
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'scheduled-app-model-launch');
  assert.deepEqual(findings.map(item => [item.file, item.line]), [[file, 5]]);
  assert.match(findings[0].message, /DispatchQueue\.async/);
});

test('identifies a launch signal deferred by DispatchQueue.asyncAfter', async t => {
  const root = await fixture(t, {
    'Application/AppDelegate.swift': `class Delegate {
      func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool {
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
          AppModel.shared.applicationDidFinishLaunching()
        }
        DispatchQueue(label: "startup").async {
          AppModel.shared.applicationDidFinishLaunching()
        }
        return true
      }
    }`
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'scheduled-app-model-launch');
  assert.deepEqual(findings.map(item => item.line), [3, 6]);
  assert.match(findings[0].message, /DispatchQueue\.asyncAfter/);
  assert.match(findings[1].message, /DispatchQueue\.async\b/);
});

test('reviews a launch signal queued on a main or newly created OperationQueue', async t => {
  const root = await fixture(t, {
    'Application/AppDelegate.swift': `class Delegate {
      func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool {
        OperationQueue.main.addOperation { analytics.recordLaunch() }
        OperationQueue.main.addOperation { AppModel.shared.applicationDidFinishLaunching() }
        OperationQueue().addOperation { AppModel.shared.applicationDidFinishLaunching() }
        let queue = OperationQueue.main
        queue.addOperation { AppModel.shared.applicationDidFinishLaunching() }
        let dispatcher: DispatchQueue = .main
        dispatcher.async { AppModel.shared.applicationDidFinishLaunching() }
        let unrelated = CustomQueue()
        unrelated.async { AppModel.shared.applicationDidFinishLaunching() }
        return true
      }
    }`
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'scheduled-app-model-launch');
  assert.deepEqual(findings.map(item => item.line), [4, 5, 7, 9]);
  assert.match(findings[0].message, /OperationQueue\.addOperation/);
});

test('reviews a deferred AppModel launch through a local alias', async t => {
  const root = await fixture(t, {
    'Application/SeparateScopeDelegate.swift': `class Delegate {
      func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool {
        if shouldInspect { let model = AppModel.shared; inspect(model) }
        Task { model.applicationDidFinishLaunching() }
        return true
      }
    }`,
    'Application/AppDelegate.swift': `class Delegate {
      func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool {
        let model: Example.AppModel = Example.AppModel.shared
        Task { model.applicationDidFinishLaunching() }
        return true
      }
    }`,
    'Application/CaptureDelegate.swift': `class Delegate {
      func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool {
        Task { @MainActor [model = Example.AppModel.shared] in model.applicationDidFinishLaunching() }
        return true
      }
    }`,
    'Application/DirectDelegate.swift': `class Delegate {
      func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool {
        let model = AppModel.shared
        model.applicationDidFinishLaunching()
        Task { await refresh() }
        return true
      }
    }`
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'scheduled-app-model-launch');
  assert.deepEqual(findings.map(({file, line}) => [file, line]), [['Application/AppDelegate.swift', 4], ['Application/CaptureDelegate.swift', 3]]);
});

test('identifies priority and explicitly typed Tasks scheduling the launch signal', async t => {
  const root = await fixture(t, {
    'Application/PriorityDelegate.swift': 'class Delegate { func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool { Task(priority: .high) { AppModel.shared.applicationDidFinishLaunching() }; return true } }',
    'Application/DetachedDelegate.swift': 'class Delegate { func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool { Task.detached(priority: .background) { await AppModel.shared.applicationDidFinishLaunching() }; return true } }',
    'Application/TypedDelegate.swift': 'class Delegate { func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool { Task<\n  Void,\n  Never\n> { AppModel.shared.applicationDidFinishLaunching() }; return true } }',
    'Application/ExplicitInitializerDelegate.swift': 'class Delegate { func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool { Task<Void, Never>.init { AppModel.shared.applicationDidFinishLaunching() }; return true } }',
    'Application/OperationArgumentDelegate.swift': 'class Delegate { func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool { Task(priority: .high, operation: { AppModel.shared.applicationDidFinishLaunching() }); return true } }',
    'Application/DirectDelegate.swift': 'class Delegate { func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool { AppModel.shared.applicationDidFinishLaunching(); Task(priority: .high) { await refresh() }; return true } }'
  });
  const files = (await inspect(root)).findings.filter(item => item.code === 'scheduled-app-model-launch').map(item => item.file).sort();
  assert.deepEqual(files, ['Application/DetachedDelegate.swift', 'Application/ExplicitInitializerDelegate.swift', 'Application/OperationArgumentDelegate.swift', 'Application/PriorityDelegate.swift', 'Application/TypedDelegate.swift']);
});

test('reviews deferred startup when the delegate omits unused parameter names', async t => {
  const file = 'Application/AppDelegate.swift';
  const root = await fixture(t, {
    [file]: `class Delegate {
      func application(_: UIKit.UIApplication, didFinishLaunchingWithOptions _: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        Task { AppModel.shared.applicationDidFinishLaunching() }
        return true
      }
    }`
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'scheduled-app-model-launch');
  assert.deepEqual(findings.map(({file, line}) => [file, line]), [[file, 3]]);
});

test('checks qualified AppModel factory return types and shared initializers', async t => {
  const file = 'Application/2 - AppModel/AppModel.swift';
  const source = `final class AppModel {
    static let shared: Application.AppModel = Application.AppModel.live()
    static func live() -> Application.AppModel { AppModel() }
  }`;
  const root = await fixture(t, {[file]: source});
  const factoryCodes = ['app-model-live-factory', 'app-model-shared-factory'];
  assert.ok(!(await inspect(root)).findings.some(item => factoryCodes.includes(item.code)));
  await fs.writeFile(path.join(root, file), source.replace('Application.AppModel.live()', 'Application.AppModel()'));
  assert.equal((await inspect(root)).findings.find(item => item.code === 'app-model-shared-factory')?.line, 2);
});

test('reviews a chained initializer that can replace the live AppModel graph', async t => {
  const file = 'Application/2 - AppModel/AppModel.swift';
  const root = await fixture(t, {
    [file]: `final class AppModel {
      static let shared = live()
        .alternateGraph()
      static func live() -> AppModel { AppModel() }
      func alternateGraph() -> AppModel { AppModel() }
    }`
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'app-model-shared-factory');
  assert.deepEqual(findings.map(item => [item.file, item.line, item.severity]), [[file, 2, 'review']]);
});

test('counts live factory candidates across AppModel and its extensions', async t => {
  const file = 'Application/2 - AppModel/AppModel.swift';
  const root = await fixture(t, {
    [file]: 'final class AppModel {}',
    'Application/2 - AppModel/AppModel+Live.swift': 'extension AppModel { static func live() -> AppModel { AppModel() } }'
  });
  assert.ok(!(await inspect(root)).findings.some(item => item.code === 'app-model-live-factory'));

  await fs.writeFile(path.join(root, file), 'final class AppModel { static func live() -> AppModel { AppModel() } }');
  const finding = (await inspect(root)).findings.find(item => item.code === 'app-model-live-factory');
  assert.equal(finding?.severity, 'review');
  assert.match(finding?.message, /Found 2 .* candidates/);
});

test('a Feature exposed in an AppModel extension resolves with a computed-exposure review', async t => {
  const root = await fixture(t, {
    'Application/1 - View/Views/Chat/ChatView.swift': 'struct ChatView: View { @State private var viewModel = ChatViewModel() }',
    'Application/1 - View/Views/Chat/ChatViewModel.swift': 'final class ChatViewModel { init(chatFeature: ChatFeature = AppModel.shared.chatFeature) {} }',
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static let shared = AppModel(); static func live() -> AppModel { AppModel() } }',
    'Application/2 - AppModel/AppModel+Chat.swift': 'extension AppModel { var chatFeature: ChatFeature { ChatFeature() } }',
    'Application/2 - AppModel/Features/Chat/ChatFeature.swift': 'final class ChatFeature {}',
    'ApplicationTests/View model tests/ChatViewModelTests.swift': 'struct ChatViewModelTests {}'
  });
  const { findings } = await inspect(root);
  assert.ok(findings.some(item => item.code === 'app-model-shared-factory'));
  assert.ok(!findings.some(item => item.code === 'unresolved-feature'));
  const finding = findings.find(item => item.code === 'feature-computed-exposure');
  assert.equal(finding?.severity, 'review');
  assert.equal(finding.file, 'Application/2 - AppModel/AppModel+Chat.swift');
});

test('requests review of an AppModel task without assuming its purpose', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel {\n    private var transactionUpdatesTask: Swift.Optional<_Concurrency.Task<Void, Never>>\n    let settingsFeature: SettingsFeature\n    static func live() -> AppModel { AppModel() }\n}',
    'Application/2 - AppModel/Features/Settings/SettingsFeature.swift': 'final class SettingsFeature {}',
    'ApplicationTests/FeatureTests/Settings/SettingsFeatureTests.swift': 'struct SettingsFeatureTests {}'
  });
  const report = await inspect(root);
  assert.ok(!report.findings.some(item => item.code === 'app-model-non-feature-state'));
  const listener = report.findings.find(item => item.code === 'app-model-task-purpose');
  assert.equal(listener?.severity, 'review');
  assert.match(listener.message, /transactionUpdatesTask/);
  assert.match(listener.message, /repeated startup leaves one app-wide listener/);
  assert.match(listener.message, /cleanup leaves the replacement running/);
  assert.match(listener.message, /forwards events to the owning Feature without a screen present/);
  assert.match(listener.message, /old listener stops forwarding/);
});

test('reviews directly constructed services stored in AppModel with inferred types', async t => {
  const file = 'Application/2 - AppModel/AppModel.swift';
  const root = await fixture(t, {
    [file]: `final class AppModel {
      private let networking = Transport.NetworkingManager()
      private let settingsFeature = SettingsFeature()
      private let derived = NetworkingManager().feature
      static func live() -> AppModel { let service = NetworkingManager(); return AppModel() }
    }`,
    'Application/NetworkingManager.swift': 'struct NetworkingManager {}',
    'Application/SettingsFeature.swift': 'final class SettingsFeature {}'
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'app-model-non-feature-state');
  assert.deepEqual(findings.map(({file, line, severity}) => [file, line, severity]), [[file, 2, 'review']]);
});

test('a ViewModel inside a Features folder is still presentation state', async t => {
  const file = 'App/2 - AppModel/AppModel.swift';
  const root = await fixture(t, {
    [file]: `final class AppModel {
      let notesViewModel: NotesViewModel
      let anotherModel = NotesViewModel()
    }`,
    'App/2 - AppModel/Features/Notes/NotesViewModel.swift': 'final class NotesViewModel {}'
  });
  const { findings } = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'app-model-non-feature-state')
    .map(({line, severity}) => [line, severity]).sort(), [[2, 'warning'], [3, 'review']]);
  assert.ok(!findings.some(item => item.code === 'feature-property-name' && item.file === file));
});

test('CFA infrastructure inside a Features folder is still service storage', async t => {
  const file = 'App/2 - AppModel/AppModel.swift';
  const root = await fixture(t, {
    [file]: `final class AppModel {
      let networking: NetworkingManager
      let storage = SwiftDataManager()
    }`,
    'App/2 - AppModel/Features/Notes/NetworkingManager.swift': 'struct NetworkingManager {}',
    'App/2 - AppModel/Features/Notes/SwiftDataManager.swift': 'struct SwiftDataManager {}'
  });
  const { findings } = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'app-model-non-feature-state')
    .map(({line, severity}) => [line, severity]).sort(), [[2, 'warning'], [3, 'review']]);
  assert.ok(!findings.some(item => item.code === 'feature-property-name' && item.file === file));
});

test('reviews inferred AppModel service storage from another module and allows factory locals', async t => {
  const file = 'App/2 - AppModel/AppModel.swift';
  const root = await fixture(t, {
    [file]: `final class AppModel {
      let \`stored\` =
        Infrastructure.NetworkingManager()
      static func live() -> AppModel {
        let local = Infrastructure.SwiftDataManager()
        return AppModel()
      }
    }`
  });
  const { findings } = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'app-model-non-feature-state')
    .map(({line, severity}) => [line, severity]), [[2, 'review']]);
});

test('inspects AppModel properties regardless of indentation', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel {\n  private var `twoSpaceTask`: Task<Void, Never>?\n\tprivate var tabTask: Task<Void, Never>?\n        private var unexpectedCache: String\n    static func live() -> AppModel { AppModel() }\n}'
  });
  const findings = (await inspect(root)).findings;
  assert.ok(findings.some(item => item.code === 'app-model-task-purpose' && /twoSpaceTask/.test(item.message)));
  assert.ok(findings.some(item => item.code === 'app-model-task-purpose' && /tabTask/.test(item.message)));
  assert.ok(findings.some(item => item.code === 'app-model-non-feature-state' && /unexpectedCache/.test(item.message)));
});

test('inspects annotated AppModel properties without treating a private task as a verified listener', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel {\n    static let shared: AppModel = live()\n    @ObservationIgnored private var updateTask: Task<Void, Never>? = nil\n    private var hasLaunched: Bool = false\n    @ObservationIgnored private var secretCache: String\n    @ObservationIgnored\n    private var backupTask:\n      _Concurrency.Task<Void, Never>?\n      = nil\n    static func live() -> AppModel { AppModel() }\n}'
  });
  const report = await inspect(root);
  const checks = report.findings.filter(item => item.code === 'app-model-task-purpose');
  assert.equal(checks.length, 2);
  assert.ok(checks.every(item => item.severity === 'review'));
  assert.ok(!report.findings.some(item => item.code === 'app-model-non-feature-state' && /backupTask/.test(item.message)));
  const defaults = report.findings.filter(item => item.code === 'app-model-default-value');
  assert.equal(defaults.length, 3);
  assert.match(defaults[0].message, /updateTask/);
  assert.match(defaults[1].message, /hasLaunched/);
  assert.match(defaults[2].message, /backupTask/);
  assert.ok(report.findings.some(item => item.code === 'app-model-non-feature-state' && /secretCache/.test(item.message)));
});

test('does not mistake a structural tab root or nested Feature value for a missing or renamed owner', async t => {
  const root = await fixture(t, {
    'Application/1 - View/Views/RootTabView.swift': 'struct RootTabView: View { @State private var selectedTab = 0; var body: some View { TabView(selection: $selectedTab) { PracticeView().tag(0) } } }',
    'Application/1 - View/Views/Practice/PracticeView.swift': 'struct PracticeView: View { @State private var viewModel = PracticeViewModel(); var body: some View { Text("Practice") } }',
    'Application/1 - View/Views/Practice/PracticeViewModel.swift': 'final class PracticeViewModel { private var retryCommand: PracticeFeature.Command = .refresh; init(practiceFeature: PracticeFeature = AppModel.shared.practiceFeature) {} }',
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() }; let practiceFeature: PracticeFeature }',
    'Application/2 - AppModel/Features/Practice/PracticeFeature.swift': 'final class PracticeFeature {}',
    'ApplicationTests/View model tests/PracticeViewModelTests.swift': 'struct PracticeViewModelTests {}',
    'ApplicationTests/FeatureTests/PracticeFeatureTests.swift': 'struct PracticeFeatureTests {}'
  });
  const report = await inspect(root);
  const codes = report.findings.map(item => item.code);
  assert.ok(!codes.includes('view-model-missing'));
  assert.ok(!codes.includes('feature-reference-name'));
  assert.match(renderInspection(report), /RootTabView: structural tab root/);
  assert.doesNotMatch(renderInspection(report), /RootTabView: missing ViewModel/);
  assert.match(renderInspection(report), /2 View candidates/);
});

test('flags matching FeatureAPI protocols for review without flagging unrelated service protocols', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() } }',
    'Application/2 - AppModel/Features/ChatFeature.swift': 'protocol ChatFeatureAPI {}\nfinal class ChatFeature {}\nprotocol ChatRepository {}',
    'Application/2 - AppModel/Features/OtherFeature.swift': 'protocol OtherFeatureAPI {}'
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'matching-feature-protocol');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'review');
  assert.match(findings[0].message, /ChatFeatureAPI.*ChatFeature/);
});

test('asks whether a View without a ViewModel is a screen or reusable component', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() } }',
    'Application/1 - View/Views/Settings/SettingsRowView.swift': 'struct SettingsRowView: View { let title: String; var body: some View { Text(title) } }'
  });
  const finding = (await inspect(root)).findings.find(item => item.code === 'view-model-missing');
  assert.equal(finding?.severity, 'review');
  assert.match(finding.message, /screen requiring a dedicated ViewModel or a reusable presentation component/);
});

test('reviews requests through an injected URLSession outside NetworkingManager', async t => {
  const root = await fixture(t, {
    'Provider.swift': 'struct Provider { let transport: Foundation.URLSession\n func load() async throws { _ = try await transport.data(from: url) } }',
    'OptionalProvider.swift': 'struct OptionalProvider { let transport: URLSession?\n func load() async throws { _ = try await transport!.data(from: url) } }',
    'ReactiveProvider.swift': 'import Combine\nstruct ReactiveProvider { let transport: URLSession\n func load() { _ = transport.dataTaskPublisher(for: url) } }',
    'Manager.swift': 'struct NetworkingManager { let transport: URLSession\n func load() async throws { _ = try await transport.data(from: url) } }',
    'Configuration.swift': 'struct Configuration { let transport: URLSession }',
    'ColocatedProvider.swift': `struct NetworkingManager {
      private let session: URLSession
      private let fallback = URLSession.shared
    }
    struct ColocatedProvider {
      let session: FileStore
      let fallback: FileStore
      func load() { _ = session.data(); _ = fallback.data() }
    }`
  });
  const {findings} = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'direct-url-session')
    .map(({file, line, severity}) => [file, line, severity]), [['OptionalProvider.swift', 2, 'review'], ['Provider.swift', 2, 'review'], ['ReactiveProvider.swift', 3, 'review']]);
});

test('points to the URLSession request when the same file also configures a session', async t => {
  const root = await fixture(t, {
    'Provider.swift': `struct Provider {
      let session: URLSession = URLSession(configuration: .ephemeral)
      func load() async throws { _ = try await session.data(from: url) }
    }`,
    'ChainedProvider.swift': `struct ChainedProvider {
      let configured = URLSession(configuration: .ephemeral)
      func load() async throws {
        _ = try await URLSession.init(configuration: makeConfiguration()).data(from: url)
      }
    }`,
    'ConfiguredProvider.swift': `struct ConfiguredProvider {
      let session = Foundation.URLSession.init(configuration: .ephemeral)
      func load() async throws { _ = try await session.data(from: url) }
    }`,
    'InferredProvider.swift': `struct InferredProvider {
      let session = Foundation.URLSession.shared
      func load() async throws { _ = try await session.data(from: url) }
    }`,
    'SharedProvider.swift': `struct SharedProvider {
      let configured = URLSession(configuration: .ephemeral)
      func load() async throws { _ = try await URLSession.shared.data(from: url) }
      func retry() async throws { _ = try await configured.data(from: url) }
    }`
  });
  const {findings} = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'direct-url-session')
    .map(({file, line}) => [file, line]), [['ChainedProvider.swift', 4], ['ConfiguredProvider.swift', 3], ['InferredProvider.swift', 3], ['Provider.swift', 3], ['SharedProvider.swift', 3], ['SharedProvider.swift', 4]]);
});

test('flags SwiftData without a manager and direct URLSession calls', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() } }',
    'Application/2 - AppModel/Storage/HabitStore.swift': 'import SwiftData\nfinal class HabitStore {}',
    'Application/2 - AppModel/Networking/GitHubAPI.swift': 'import Foundation\nfinal class GitHubAPI { func load() async throws { _ = try await URLSession.shared.data(from: url) } }'
  });
  const findings = (await inspect(root)).findings;
  const codes = findings.map(item => item.code);
  assert.ok(codes.includes('swiftdata-manager-missing'));
  assert.ok(codes.includes('direct-url-session'));
  assert.equal(findings.find(item => item.code === 'swiftdata-manager-missing').severity, 'review');
  assert.equal(findings.find(item => item.code === 'direct-url-session').severity, 'review');
  assert.match(findings.find(item => item.code === 'direct-url-session').message, /Verify the receiver type and production target membership/);
});

test('a SwiftData import in tests is a target-membership review, not an app defect', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() } }',
    'ApplicationTests/StorageTests.swift': 'import class SwiftData.ModelContainer\nstruct StorageTests {}'
  });
  const finding = (await inspect(root)).findings.find(item => item.code === 'swiftdata-manager-missing');
  assert.equal(finding.severity, 'review');
  assert.match(finding.message, /includes tests and does not resolve target membership/);
  assert.equal(finding.file, 'ApplicationTests/StorageTests.swift');
  assert.equal(finding.line, 1);
});

test('keeps app and test SwiftData imports visible when storage ownership is unresolved', async t => {
  const root = await fixture(t, {
    'AAATests/StorageTests.swift': 'import SwiftData',
    'App/Storage.swift': '\nimport class SwiftData.ModelContainer'
  });
  const {findings} = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'swiftdata-manager-missing')
    .map(({file, line, severity}) => [file, line, severity]),
  [['AAATests/StorageTests.swift', 1, 'review'], ['App/Storage.swift', 2, 'review']]);
});

test('a storage manager in a test-named folder does not settle app storage ownership', async t => {
  const root = await fixture(t, {
    'App/Storage.swift': 'import SwiftData',
    'AppTests/SwiftDataManager.swift': 'actor SwiftDataManager {}'
  });
  const {findings} = await inspect(root);
  const review = findings.find(item => item.code === 'swiftdata-manager-missing');
  assert.equal(review?.file, 'App/Storage.swift');
  assert.equal(review.severity, 'review');
  assert.match(review.message, /only in test-named folders/);
});

test('reviews AppModel storage in a SwiftUI App outside the View folder', async t => {
  const file = 'Application/ExampleApp.swift';
  const root = await fixture(t, {
    [file]: `struct ExampleApp: AnotherProtocol, SwiftUI.App {
      private let model = AppModel.shared
      private let secondModel: AppModel = AppModel.shared
      private var computedModel: AppModel { AppModel.shared }
      var body: some Scene { WindowGroup { ContentView() } }
    }`
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'stored-app-model');
  assert.deepEqual(findings.map(item => [item.file, item.line]).sort(), [[file, 2], [file, 3]]);
});

test('reviews the App declaration and scene body when conformance is in an extension', async t => {
  const app = 'Application/ExampleApp.swift';
  const scene = 'Application/ExampleApp+Scene.swift';
  const root = await fixture(t, {
    [app]: `struct ExampleApp {
      private let model = AppModel.shared
    }`,
    [scene]: `extension ExampleApp: SwiftUI.App {
      var body: some Scene {
        if ready { WindowGroup { ContentView() } }
        else { WindowGroup { ProgressView() } }
      }
    }`
  });
  const {findings} = await inspect(root);
  assert.ok(findings.some(item => item.code === 'stored-app-model' && item.file === app && item.line === 2));
  assert.ok(findings.some(item => item.code === 'conditional-app-body' && item.file === scene && item.line === 3));
  assert.ok(findings.some(item => item.code === 'app-startup-presentation' && item.file === scene && item.line === 4));
});

test('checks the app scene body even when a nested scene declares body first', async t => {
  const file = 'Application/ExampleApp.swift';
  const root = await fixture(t, {
    [file]: `struct ExampleApp: App {
      struct NestedScene: Scene {
        var body: some Scene { WindowGroup { Text("Nested") } }
      }
      var body: some Scene {
        if ready { WindowGroup { ContentView() } }
        else { WindowGroup { ProgressView() } }
      }
    }`
  });
  const {findings} = await inspect(root);
  assert.ok(findings.some(item => item.code === 'conditional-app-body' && item.file === file && item.line === 6));
  assert.ok(findings.some(item => item.code === 'app-startup-presentation' && item.file === file && item.line === 7));
});

test('checks App scene bodies across compilation branches', async t => {
  const file = 'Application/ExampleApp.swift';
  const root = await fixture(t, {
    [file]: `struct ExampleApp: App {
      #if DEBUG
      var body: some Scene { WindowGroup { DebugShell() } }
      #else
      var body: some Scene { WindowGroup { ReleaseShell() } }
      #endif
    }`,
    'Application/ReleaseShell.swift': `struct ReleaseShell: View {
      var body: some View { if storageReady { Tabs() } else { ProgressView() } }
    }`
  });
  const {findings} = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'root-storage-gate')
    .map(item => [item.file, item.line]), [['Application/ReleaseShell.swift', 2]]);
});

test('flags conditional database startup presentation in App.body', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() } }',
    'Application/HabitApp.swift': `import SwiftUI
struct Habit: SwiftUI.App {
  var body: some SwiftUI.Scene {
    WindowGroup {
      #if DEBUG
      if ready {
        RootTabView().modelContainer(container)
      } else {
        ProgressView("Opening")
      }
      #endif
    }
  }
}`
  });
  const findings = (await inspect(root)).findings;
  const conditional = findings.find(item => item.code === 'conditional-app-body');
  const presentation = findings.find(item => item.code === 'app-startup-presentation');
  assert.equal(conditional?.severity, 'review');
  assert.equal(conditional?.line, 6);
  assert.equal(presentation?.severity, 'review');
  assert.equal(presentation?.line, 7);
});

test('reviews early return from App.body as a possible startup gate', async t => {
  const file = 'Application/ExampleApp.swift';
  const root = await fixture(t, {
    [file]: `struct ExampleApp: App {
      var body: some Scene {
        guard startupReady else { return WindowGroup { RootView(blocked: true) } }
        return WindowGroup { RootView(blocked: false) }
      }
    }`
  });
  const {findings} = await inspect(root);
  const gates = findings.filter(item => item.code === 'conditional-app-body');
  assert.deepEqual(gates.map(item => [item.file, item.line, item.severity]), [[file, 3, 'review']]);
});

test('reviews a direct ModelContainer reference in a structural App body', async t => {
  const file = 'Application/HabitApp.swift';
  const root = await fixture(t, {
    [file]: `struct Habit: App {
      var body: some Scene {
        let container = try! ModelContainer(for: HabitRecord.self)
        WindowGroup { RootTabView() }
      }
    }`
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'app-startup-presentation');
  assert.deepEqual(findings.map(({file, line, severity}) => [file, line, severity]), [[file, 3, 'review']]);
});

test('flags storage-gated conventional roots as review hints', async t => {
  const root = await fixture(t, {
    'Application/1 - View/ContentView.swift': 'struct ContentView: View {\n var body: some View {\n if sessionIsReady,\n let container = storage.container { RootTabView() } else { ProgressView() } } }',
    'Application/1 - View/RootTabView.swift': 'struct RootTabView: View { var body: some View { switch databaseState { case .ready: Tabs(); default: ProgressView() } } }',
    'Application/1 - View/RootView.swift': 'struct RootView: SwiftUI.View { var body: some View { if isStoreReady { Tabs() } else { ErrorView() } } }'
  });
  const report = await inspect(root);
  const gates = report.findings.filter(item => item.code === 'root-storage-gate');
  assert.equal(gates.length, 3);
  assert.ok(gates.every(item => item.severity === 'review'));
  assert.equal(gates.find(item => item.file.endsWith('ContentView.swift'))?.line, 3);
  assert.match(report.limitations.join(' '), /blocking overlays require manual/);
});

test('reviews startup progress branches in scene roots only', async t => {
  const file = 'Application/1 - View/Views/WorkspaceShellView.swift';
  const root = await fixture(t, {
    'Application/ExampleApp.swift': 'struct ExampleApp: App { var body: some Scene { WindowGroup { WorkspaceShellView() } } }',
    [file]: `struct WorkspaceShellView: View {
      var body: some View {
        switch startupPhase { case .ready: TabView { ScheduleScreen() }; default: ProgressView() }
      }
    }`,
    'Application/ScheduleScreen.swift': 'struct ScheduleScreen: View { var body: some View { if isLaunching { ProgressView() } } }'
  });
  const { findings, screens } = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'root-startup-gate')
    .map(item => [item.file, item.line, item.severity]), [[file, 3, 'review']]);
  assert.equal(screens.find(item => item.name === 'WorkspaceShellView')?.structuralRoot, false);
});

test('reviews a custom root directly constructed by the app scene', async t => {
  const file = 'Application/Navigation/WorkspaceShell.swift';
  const root = await fixture(t, {
    'Application/ExampleApp.swift': 'struct ExampleApp: App { var body: some Scene { SwiftUI.WindowGroup { Example.WorkspaceShell() } } }',
    [file]: `struct WorkspaceShell: View {
      var body: some View {
        if storageReady { Tabs() } else { ProgressView() }
      }
    }`,
    'Application/Navigation/AccountScreen.swift': 'struct AccountScreen: View { var body: some View { if storageReady { AccountDetails() } } }'
  });
  const { findings } = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'root-storage-gate')
    .map(item => [item.file, item.line]), [[file, 3]]);
});

test('reviews the root of a value-driven WindowGroup', async t => {
  const file = 'Application/Navigation/DetailShell.swift';
  const root = await fixture(t, {
    'Application/ExampleApp.swift': `struct ExampleApp: App {
      var body: some Scene {
        WindowGroup(for: String.self) { route in
          DetailShell(route: route)
        }
      }
    }`,
    [file]: `struct DetailShell: View {
      let route: Binding<String?>
      var body: some View {
        if storageReady { Details() } else { ProgressView() }
      }
    }`
  });
  const {findings} = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'root-storage-gate')
    .map(item => [item.file, item.line]), [[file, 4]]);
});

for (const name of ['WorkspaceShell', 'ContentView']) {
  test(`leaves competing ${name} scene roots for target-aware review`, async t => {
    const app = 'Application/ExampleApp.swift';
    const root = await fixture(t, {
      [app]: `struct ExampleApp: App { var body: some Scene {\n WindowGroup { ${name}() } } }`,
      [`Application/${name}.swift`]: `struct ${name}: View { var body: some View { Tabs() } }`,
      [`OtherTarget/${name}.swift`]: `struct ${name}: View { var body: some View { if storageReady { AccountDetails() } } }`
    });
    const { findings } = await inspect(root);
    assert.ok(!findings.some(item => item.code === 'root-storage-gate'));
    assert.deepEqual(findings.filter(item => item.code === 'scene-root-ambiguous')
      .map(item => [item.file, item.line]), [[app, 2]]);
  });
}

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
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static let shared = live(); static func live() -> AppModel { AppModel() } }'
  });
  const report = await inspect(root);
  assert.deepEqual(report.findings.map(item => item.code), [
    'view-model-ownership', 'feature-route-unresolved', 'view-model-tests-missing'
  ]);
  assert.match(report.findings.find(item => item.code === 'view-model-tests-missing').message, /scanned directory/);
  assert.match(report.method, /Lexical/);
  assert.match(report.limitations.join(' '), /not type-check/);
});

test('ignores fake dependencies in comments and strings and flags unresolved properties', async t => {
  const root = await fixture(t, {
    'Application/1 - View/Views/Chat/ChatView.swift': 'import SwiftUI\nstruct ChatView: View { @State private var viewModel = ChatViewModel(); var body: some View { Text("AppModel.shared.fakeFeature") } }',
    'Application/1 - View/Views/Chat/ChatViewModel.swift': '// AppModel.shared.fakeFeature\nfinal class ChatViewModel { init(chatsFeature: any ChatsFeatureAPI = AppModel.shared.missingFeature) {} }',
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static let shared = live(); static func live() -> AppModel { AppModel() } }',
    'ApplicationTests/View model tests/ChatViewModelTests.swift': 'struct ChatViewModelTests {}'
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
    'ApplicationTests/View model tests/ChatViewModelTests.swift': 'struct ChatViewModelTests {}'
  });
  const report = await inspect(root);
  assert.deepEqual(report.findings.map(item => item.code), ['feature-type-name', 'feature-property-name']);
  assert.ok(report.findings.every(item => item.severity === 'review'));
  assert.match(report.findings[0].message, /supporting service behind the Feature/);
  assert.equal(report.screens[0].dependencies[0].featureType, 'ChatsManager');
});

test('reports a feature property stored under a different name', async t => {
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

test('checks Feature labels after the first initializer parameter', async t => {
  const root = await fixture(t, {
    'Application/1 - View/Views/Chat/ChatView.swift': 'struct ChatView: View { @State private var viewModel = ChatViewModel() }',
    'Application/1 - View/Views/Chat/ChatViewModel.swift': 'final class ChatViewModel { init(profileFeature: ProfileFeature = AppModel.shared.profileFeature, chats: ChatsFeature = AppModel.shared.chatsFeature) {} }',
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() }; let profileFeature: ProfileFeature; let chatsFeature: ChatsFeature }',
    'Application/2 - AppModel/Features/Chats/ChatsFeature.swift': 'final class ChatsFeature {}',
    'Application/2 - AppModel/Features/Profile/ProfileFeature.swift': 'final class ProfileFeature {}',
    'ApplicationTests/ChatViewModelTests.swift': 'struct ChatViewModelTests {}'
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'feature-parameter-name');
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /chatsFeature as chats/);
});

test('does not treat a method-local Feature as a stored ViewModel dependency', async t => {
  const root = await fixture(t, {
    'Application/1 - View/Views/Chat/ChatView.swift': 'struct ChatView: View { @State private var viewModel = ChatViewModel() }',
    'Application/1 - View/Views/Chat/ChatViewModel.swift': 'final class ChatViewModel { private let chatsFeature: ChatsFeature; init(chatsFeature: ChatsFeature = AppModel.shared.chatsFeature) { self.chatsFeature = chatsFeature }; func inspect() { let local: ChatsFeature = chatsFeature } }',
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() }; let chatsFeature: ChatsFeature }',
    'Application/2 - AppModel/Features/Chats/ChatsFeature.swift': 'final class ChatsFeature {}',
    'ApplicationTests/FeatureTests/Chats/ChatsFeatureTests.swift': 'struct ChatsFeatureTests {}',
    'ApplicationTests/ChatViewModelTests.swift': 'struct ChatViewModelTests {}'
  });
  const findings = (await inspect(root)).findings;
  assert.ok(!findings.some(item => item.code === 'feature-reference-name'));
});

test('recognizes lower-camel-case Feature properties with leading acronyms', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { let urlFeature: URLFeature; let apiAccessFeature: APIAccessFeature; let uRLImportFeature: URLImportFeature }'
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'feature-property-name');
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /uRLImportFeature.*\(urlImportFeature\)/);
});

test('does not choose a test file by basename when multiple targets have matches', async t => {
  const root = await fixture(t, {
    'App/1 - View/Views/Home/HomeView.swift': 'struct HomeView: View { @State private var viewModel = HomeViewModel() }',
    'App/1 - View/Views/Home/HomeViewModel.swift': 'final class HomeViewModel {}',
    'PhoneTests/HomeViewModelTests.swift': 'struct HomeViewModelTests {}',
    'WatchTests/HomeViewModelTests.swift': 'struct HomeViewModelTests {}'
  });
  const report = await inspect(root);
  assert.equal(report.screens[0].testFile, null);
  assert.equal(report.screens[0].testCandidates.length, 2);
  assert.ok(report.findings.some(item => item.code === 'view-model-tests-ambiguous'));
  assert.ok(!report.findings.some(item => item.code === 'view-model-tests-missing'));
  assert.match(renderInspection(report), /multiple matching test files. Verify target/);
});

test('does not assign one test file to competing ViewModel declarations', async t => {
  const root = await fixture(t, {
    'App/1 - View/Views/Home/HomeView.swift': 'struct HomeView: View { @State private var viewModel = HomeViewModel() }',
    'App/1 - View/Views/Home/HomeViewModel.swift': 'final class HomeViewModel {}',
    'Other/1 - View/Views/Home/HomeViewModel.swift': 'final class HomeViewModel {}',
    'AppTests/View model tests/HomeViewModelTests.swift': 'struct HomeViewModelTests {}'
  });
  const report = await inspect(root);
  assert.equal(report.screens[0].testFile, null);
  assert.equal(report.screens[0].testCandidates.length, 1);
  assert.ok(report.findings.some(item => item.code === 'view-model-tests-ambiguous'));
  assert.match(renderInspection(report), /matching test file needs target verification/);
});

test('distinguishes a matching ViewModel test filename from a suite declaration', async t => {
  const file = 'AppTests/View model tests/HomeViewModelTests.swift';
  const root = await fixture(t, {
    'App/1 - View/Views/Home/HomeView.swift': 'struct HomeView: View { @State private var viewModel = HomeViewModel() }',
    'App/1 - View/Views/Home/HomeViewModel.swift': 'final class HomeViewModel {}',
    [file]: 'struct UnrelatedTests {}'
  });
  const report = await inspect(root);
  assert.equal(report.screens[0].testFile, file);
  assert.deepEqual(report.findings.filter(item => item.code === 'view-model-test-suite-unresolved')
    .map(item => item.file), [file]);
  assert.match(renderInspection(report), /matching test filename; verify named suite, behaviour and target membership/);
  await fs.writeFile(path.join(root, file), '// Test suite placeholder');
  const placeholder = await inspect(root);
  assert.match(renderInspection(placeholder), /matching test filename; verify named suite, behaviour and target membership/);
  assert.doesNotMatch(renderInspection(placeholder), /matching suite declaration found/);
  await fs.writeFile(path.join(root, file), 'struct Legacy { struct HomeViewModelTests {} }\nstruct Current { struct HomeViewModelTests {} }');
  const competing = await inspect(root);
  assert.match(competing.findings.find(item => item.code === 'view-model-test-suite-unresolved')?.message, /competing suite declarations on lines 1, 2/);
  assert.doesNotMatch(renderInspection(competing), /matching suite declaration found/);
  await fs.writeFile(path.join(root, file), 'struct HomeViewModelTests {}');
  assert.match(renderInspection(await inspect(root)), /matching suite declaration found; verify behaviour and target membership/);
});

test('reviews matching ViewModel tests in production source trees', async t => {
  const file = 'App/1 - View/Views/Home/HomeViewModelTests.swift';
  const root = await fixture(t, {
    'App/1 - View/Views/Home/HomeView.swift': 'struct HomeView: View { @State private var viewModel = HomeViewModel() }',
    'App/1 - View/Views/Home/HomeViewModel.swift': 'final class HomeViewModel {}',
    'App/2 - AppModel/HomeViewModelTests.swift': 'struct HomeViewModelTests {}',
    'AppTests/HomeViewModelTests.swift': 'struct HomeViewModelTests {}',
    'OtherTests/View model tests/HomeViewModelTests.swift': 'struct HomeViewModelTests {}',
    'OtherTests/ViewModelTests/HomeViewModelTests.swift': 'struct HomeViewModelTests {}',
    [file]: 'struct HomeViewModelTests {}'
  });
  const {findings} = await inspect(root);
  const placement = findings.filter(item => item.code === 'view-model-test-placement');
  assert.deepEqual(placement.map(item => item.file), [file, 'App/2 - AppModel/HomeViewModelTests.swift', 'AppTests/HomeViewModelTests.swift', 'OtherTests/ViewModelTests/HomeViewModelTests.swift']);
  assert.ok(placement.every(item => item.severity === 'review' && /unit-test target/.test(item.message)));
});

test('reviews production graph references in AppModel tests', async t => {
  const file = 'AppTests/AppModel tests/LifecycleTests.swift';
  const root = await fixture(t, {
    [file]: `struct LifecycleTests {
      func launch() { AppModel.shared.applicationDidFinishLaunching() }
      func isolated() { AppModel(notesFeature: testNotes).applicationDidFinishLaunching() }
      // AppModel.shared is intentionally absent from isolated tests.
    }`
  });
  const {findings} = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'app-model-test-shared-graph')
    .map(item => [item.file, item.line, item.severity]), [[file, 2, 'review']]);
});

test('reviews a Feature test file containing only imports and comments', async t => {
  const file = 'AppTests/FeatureTests/LaunchFeatureTests.swift';
  const root = await fixture(t, {
    'App/2 - AppModel/Features/Launch/LaunchFeature.swift': 'final class LaunchFeature {}',
    [file]: 'import Testing\n@testable import App\n// LaunchFeatureTests are still to be written'
  });
  const {findings} = await inspect(root);
  const empty = findings.find(item => item.code === 'feature-test-source-empty');
  assert.deepEqual([empty?.file, empty?.line, empty?.severity], [file, 1, 'review']);
  assert.ok(!findings.some(item => item.code === 'feature-tests-missing'));
});

test('reviews a single test filename that matches competing Feature declarations', async t => {
  const root = await fixture(t, {
    'App/2 - AppModel/Features/Launch/LaunchFeature.swift': 'final class LaunchFeature {}',
    'Other/2 - AppModel/Features/Launch/LaunchFeature.swift': 'final class LaunchFeature {}',
    'AppTests/FeatureTests/LaunchFeatureTests.swift': 'struct LaunchFeatureTests {}'
  });
  const {findings} = await inspect(root);
  const ambiguity = findings.filter(item => item.code === 'feature-tests-ambiguous');
  assert.equal(ambiguity.length, 1);
  assert.match(ambiguity[0].message, /matches multiple declarations named LaunchFeature/);
});

test('reports ambiguous Feature test filenames across targets', async t => {
  const root = await fixture(t, {
    'App/2 - AppModel/AppModel.swift': 'final class AppModel { let launchFeature: LaunchFeature }',
    'App/2 - AppModel/Features/Launch/LaunchFeature.swift': 'final class LaunchFeature {}',
    'PhoneTests/FeatureTests/LaunchFeatureTests.swift': 'struct LaunchFeatureTests {}',
    'WatchTests/FeatureTests/LaunchFeatureTests.swift': 'struct LaunchFeatureTests {}'
  });
  const { findings } = await inspect(root);
  const ambiguity = findings.find(item => item.code === 'feature-tests-ambiguous');
  assert.match(ambiguity?.message, /PhoneTests.*WatchTests/);
  assert.ok(!findings.some(item => item.code === 'feature-tests-missing'));
});

test('distinguishes AppModel computed getters from stored properties with observers', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': `final class AppModel {
      var computedValue: Result<
        String,
        Never
      > { .success("value") }
      var storedValue: String { didSet { reportChange() } }
      static func live() -> AppModel { AppModel() }
    }`
  });
  const { findings } = await inspect(root);
  const storage = findings.filter(item => item.code === 'app-model-non-feature-state');
  assert.equal(storage.length, 1);
  assert.match(storage[0].message, /storedValue/);
});

test('requires review of a computed AppModel Feature exposure', async t => {
  const root = await fixture(t, {
    'App/2 - AppModel/AppModel.swift': 'final class AppModel { var notesFeature: NotesFeature { NotesFeature() } }',
    'App/2 - AppModel/Features/Notes/NotesFeature.swift': 'final class NotesFeature {}'
  });
  const { findings } = await inspect(root);
  assert.equal(findings.find(item => item.code === 'feature-computed-exposure')?.severity, 'review');
});

test('checks semicolon-separated AppModel storage and excludes method locals', async t => {
  const root = await fixture(t, {
    'App/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { let local: String = "local"; return AppModel() }; private var cache: String = ""; private var listener: Task<Void, Never>? }'
  });
  const { findings } = await inspect(root);
  assert.ok(findings.some(item => item.code === 'app-model-non-feature-state' && /cache/.test(item.message)));
  assert.ok(findings.some(item => item.code === 'app-model-task-purpose' && /listener/.test(item.message)));
  assert.ok(!findings.some(item => /local/.test(item.message)));
});

test('an unrelated live overload does not satisfy the AppModel factory check', async t => {
  const root = await fixture(t, {
    'App/2 - AppModel/AppModel.swift': 'final class AppModel { static func live(environment: String) -> AppModel { AppModel() } }'
  });
  const { findings } = await inspect(root);
  assert.match(findings.find(item => item.code === 'app-model-live-factory')?.message, /Found 0/);
});

test('an optional AppModel result does not satisfy the production factory check', async t => {
  const root = await fixture(t, {
    'App/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel? { nil } }'
  });
  const { findings } = await inspect(root);
  assert.match(findings.find(item => item.code === 'app-model-live-factory')?.message, /Found 0/);
});

test('recognizes storage and networking declarations independently of filenames', async t => {
  const root = await fixture(t, {
    'Storage.swift': 'import SwiftData\nstruct SwiftDataManager {}',
    'Transport.swift': 'struct NetworkingManager { let session = URLSession.shared }',
    'NetworkingManager.swift': 'extension NetworkingManager { static let fallback = URLSession.shared }\nstruct Bypass { let session = URLSession.shared }',
    'Client.swift': 'struct Client { let session = URLSession.shared }'
  });
  const {findings} = await inspect(root);
  assert.ok(!findings.some(item => item.code === 'swiftdata-manager-missing'));
  assert.ok(!findings.some(item => item.code === 'direct-url-session'));
  const references = findings.filter(item => item.code === 'url-session-reference');
  assert.deepEqual(references.map(({file, line}) => [file, line]), [['Client.swift', 1], ['NetworkingManager.swift', 2]]);
  assert.match(references[0].message, /configures a session for injection/);
});

test('reviews direct Feature access in reusable Views outside screen folders', async t => {
  const file = 'Application/Components/Badge.swift';
  const root = await fixture(t, {
    [file]: `struct Badge: SwiftUI.View {
      var body: some View { Text(AppModel.shared.profileFeature.name) }
    }
    struct Worker {
      func read() { _ = AppModel.shared.profileFeature.name }
    }
    struct LocalBadge: View {
      var body: some View { Text(Domain.ProfileFeature().name) }
    }
    extension Badge {
      func label() -> String { ProfileFeature.init().name }
    }`,
    'Application/2 - AppModel/Features/Profile/ProfileFeature.swift': 'final class ProfileFeature { let name = "Profile" }'
  });
  const report = await inspect(root);
  assert.equal(report.screens.length, 0);
  assert.deepEqual(report.findings.filter(item => item.code === 'view-feature-access')
    .map(item => [item.file, item.line]), [[file, 2], [file, 8], [file, 11]]);
});

test('reviews direct Feature access in root tab navigation', async t => {
  const root = await fixture(t, {
    'Application/1 - View/Views/ContentView.swift': `struct ContentView: SwiftUI.View {
      var body: some View {
        TabView { PracticeView() }.task { await AppModel.shared.practiceFeature.refresh() }
      }
    }`
  });
  const report = await inspect(root);
  assert.equal(report.screens[0].structuralRoot, false);
  assert.equal(report.findings.find(item => item.code === 'root-feature-access')?.line, 3);
  assert.ok(!report.findings.some(item => item.code === 'view-feature-access'));
});

test('checks root navigation implemented in a separate extension', async t => {
  const extensionFile = 'Application/1 - View/Views/RootTabView+Navigation.swift';
  const root = await fixture(t, {
    'Application/1 - View/Views/RootTabView.swift': 'struct RootTabView: View {}',
    [extensionFile]: `extension RootTabView {
      var body: some View {
        if databaseReady {
          TabView { PracticeView() }.task { await AppModel.shared.practiceFeature.refresh() }
        }
      }
    }`
  });
  const report = await inspect(root);
  assert.equal(report.screens[0].structuralRoot, false);
  const findings = report.findings.filter(item => item.code === 'root-feature-access' || item.code === 'root-storage-gate');
  assert.deepEqual(findings.map(item => [item.code, item.file, item.line]), [
    ['root-feature-access', extensionFile, 4],
    ['root-storage-gate', extensionFile, 3]
  ]);
});

test('reviews direct Feature access in a preview while leaving normal previews clear', async t => {
  const file = 'App/1 - View/Preview.swift';
  const root = await fixture(t, {
    [file]: `#Preview { HomeView() }
    #Preview("Direct access") {
      Text(AppModel.shared.homeFeature.title)
    }
    #Preview("Aliased access") {
      let model: Example.AppModel = Example.AppModel.shared
      Text(model.homeFeature.title)
    }
    #Preview("Separate local bindings") {
      if enabled { let model = AppModel.shared; use(model) }
      let model = PreviewFixture()
      Text(model.homeFeature.title)
    }
    #Preview {
      let feature = Example.HomeFeature.init()
      HomeView()
    }
    #Preview { HomeView(input: LaunchFeature.ID()) }`,
    'App/2 - AppModel/Features/Home/HomeFeature.swift': 'final class HomeFeature {}',
    'App/2 - AppModel/Features/Launch/LaunchFeature.swift': 'final class LaunchFeature { struct ID {} }'
  });
  const { findings } = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'preview-feature-access')
    .map(({file, line}) => [file, line]), [[file, 3], [file, 7], [file, 15]]);
});

test('reviews AppModel composition in previews outside the View folder', async t => {
  const file = 'App/PreviewContent/HomePreview.swift';
  const root = await fixture(t, {
    [file]: `#Preview { HomeView() }
    #Preview {
      let model = Example.AppModel.live()
      HomeView()
    }
    #Preview {
      let model = AppModel()
      HomeView()
    }`
  });
  const { findings } = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'preview-app-model-composition')
    .map(({file, line, severity}) => [file, line, severity]), [
    [file, 3, 'review'], [file, 7, 'review']
  ]);
});

test('reviews ViewModel injection in previews', async t => {
  const file = 'App/PreviewContent/HomePreview.swift';
  const root = await fixture(t, {
    [file]: `#Preview { HomeView() }
    #Preview { HomeView().environment(HomeViewModel()) }
    struct HomePreview: PreviewProvider {
      static var previews: some View { HomeView().environmentObject(HomeViewModel()) }
    }`
  });
  const { findings } = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'view-model-environment-provider')
    .map(item => [item.file, item.line]), [[file, 2], [file, 4]]);
});

test('reviews a preview passing the shared graph without accessing a Feature', async t => {
  const file = 'App/PreviewContent/HomePreview.swift';
  const root = await fixture(t, {
    [file]: `#Preview { HomeView() }
    #Preview { HomeView(graph: Example.AppModel.shared) }
    #Preview { Text("AppModel.shared") }`
  });
  const { findings } = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'preview-app-model-access')
    .map(({file, line, severity}) => [file, line, severity]), [[file, 2, 'review']]);
});

test('surfaces a stored Feature dependency as coordination to review', async t => {
  const file = 'Application/2 - AppModel/Features/Profile/UserProfileFeature.swift';
  const root = await fixture(t, {
    [file]: `final class UserProfileFeature {
      private let orders: OrdersFeature
      private let service: AccountService
      private let favourites: AccountDomain.FavouritesFeature
      private let orderID: AccountDomain.OrdersFeature.OrderID
      var computed: OrdersFeature { orders }
      var optionalComputed: OrdersFeature? { orders }
      private var optionalOrders: OrdersFeature?
      private weak var backupOrders: OrdersFeature?
      private lazy var deferredOrders = OrdersFeature()
      func signOut() { let local: OrdersFeature = orders }
    }`
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'feature-coordination');
  assert.deepEqual(findings.map(({file, line, severity}) => [file, line, severity]), [[file, 2, 'review'], [file, 4, 'review'], [file, 8, 'review'], [file, 9, 'review'], [file, 10, 'review']]);
  assert.match(findings[1].message, /AccountDomain\.FavouritesFeature/);
  assert.match(findings[0].message, /business capability.*one owner per state.*dependency cycle/);
});

test('reviews Feature coordination in a flat source layout', async t => {
  const file = 'Application/UserProfileFeature.swift';
  const root = await fixture(t, {
    [file]: `final class UserProfileFeature {
      private let orders: OrdersFeature
      private let favourites = AccountDomain.FavouritesFeature()
      private let key = OrdersFeature.OrderID()
      private let title = OrdersFeature().title
      func clear() { let local = OrdersFeature() }
    }`
  });
  const {findings} = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'feature-coordination')
    .map(({file, line, severity}) => [file, line, severity]), [[file, 2, 'review'], [file, 3, 'review']]);
});

test('reports AppModel findings at the correct lines in CR-delimited source', async t => {
  const file = 'Application/2 - AppModel/AppModel.swift';
  const root = await fixture(t, {
    [file]: 'final class AppModel {\r    private var cache: String\r    static func live() -> AppModel { AppModel() }\r}'
  });
  const {findings} = await inspect(root);
  const warning = findings.find(item => item.code === 'app-model-non-feature-state');
  assert.equal(warning?.file, file);
  assert.equal(warning?.line, 2);
});

test('shows skipped source and unfollowed links in the text inspection', async t => {
  const root = await fixture(t, {
    'App.swift': 'struct App {}',
    'Invalid.swift': Buffer.from([0xff])
  });
  await fs.symlink('App.swift', path.join(root,'Linked.swift'));
  const report = await inspect(root);
  assert.deepEqual(report.scope.symbolicLinkPaths, ['Linked.swift']);
  const output = renderInspection(report);
  assert.match(output, /Skipped Invalid\.swift: Source is not valid UTF-8/);
  assert.match(output, /Symbolic link not followed: Linked\.swift/);
});

test('reviews direct container construction in the AppModel factory at its source line', async t => {
  const file = 'Application/2 - AppModel/AppModel.swift';
  const root = await fixture(t, {
    [file]: 'final class AppModel {\n  static func live() -> AppModel {\n    let store = try SwiftData.ModelContainer.init(for: Note.self)\n    return AppModel()\n  }\n}',
    'Application/2 - AppModel/SwiftDataManager.swift': 'actor SwiftDataManager { func open() throws { _ = try ModelContainer(for: Note.self) } }'
  });
  const {findings} = await inspect(root);
  const storage = findings.filter(item => item.code === 'app-model-storage-construction');
  assert.deepEqual(storage.map(item => [item.severity, item.file, item.line]), [['review',file,3]]);
});

test('reviews storage construction in an AppModel factory extension', async t => {
  const file = 'Application/AppModel+Live.swift';
  const root = await fixture(t, {
    'Application/AppModel.swift': 'final class AppModel {}',
    [file]: 'extension AppModel {\n  static func live() -> AppModel {\n    _ = try ModelContainer(for: Note.self)\n    return AppModel()\n  }\n}'
  });
  const {findings} = await inspect(root);
  const storage = findings.filter(item => item.code === 'app-model-storage-construction');
  assert.deepEqual(storage.map(({file, line}) => [file, line]), [[file, 3]]);
});

test('reviews storage construction in AppModel convenience initializers declared in extensions', async t => {
  const file = 'Application/AppModel+Storage.swift';
  const root = await fixture(t, {
    'Application/AppModel.swift': 'final class AppModel {}',
    [file]: `extension AppModel {
      convenience init(storeURL: URL) throws {
        _ = try ModelContainer(for: Note.self)
        self.init()
      }
      func unrelated() throws { _ = try ModelContainer(for: Note.self) }
    }`
  });
  const {findings} = await inspect(root);
  const storage = findings.filter(item => item.code === 'app-model-storage-construction');
  assert.deepEqual(storage.map(({file, line}) => [file, line]), [[file, 3]]);
  assert.match(storage[0].message, /AppModel\.init/);
});

test('reviews storage construction in a flat AppModel without treating placement as conventional', async t => {
  const file = 'Application/Composition.swift';
  const root = await fixture(t, {
    [file]: 'final class AppModel {\n  static func live() -> AppModel {\n    _ = try ModelContainer(for: Note.self)\n    return AppModel()\n  }\n}'
  });
  const report = await inspect(root);
  assert.equal(report.appModelFile, file);
  assert.equal(report.findings.find(item => item.code === 'app-model-placement')?.file, file);
  assert.equal(report.findings.find(item => item.code === 'app-model-storage-construction')?.line, 3);
});

test('reviews storage construction in AppModel init but not unrelated methods', async t => {
  const file = 'Application/2 - AppModel/AppModel.swift';
  const root = await fixture(t, {
    [file]: [
      'final class AppModel {',
      '  init(storeURL: URL = defaultURL()) throws {',
      '    _ = try ModelContainer(for: Note.self)',
      '  }',
      '  func unrelated() throws { _ = try ModelContainer(for: Other.self) }',
      '}'
    ].join('\n')
  });
  const {findings} = await inspect(root);
  const storage = findings.filter(item => item.code === 'app-model-storage-construction');
  assert.deepEqual(storage.map(item => item.line), [3]);
  assert.match(storage[0].message, /AppModel\.init/);
});

test('reports unresolved Feature source without requiring a screen reference', async t => {
  const file = 'Application/2 - AppModel/AppModel.swift';
  const root = await fixture(t, {
    [file]: 'final class AppModel {\n let telemetryFeature: TelemetryFeature\n}'
  });
  const {findings} = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'feature-source-missing').map(item => [item.file, item.line]), [[file, 2]]);
});

test('does not resolve competing AppModel exposures to one Feature', async t => {
  const file = 'Application/2 - AppModel/AppModel.swift';
  const extensionFile = 'Application/2 - AppModel/AppModel+Chat.swift';
  const root = await fixture(t, {
    [file]: 'final class AppModel {\n#if INTERNAL\n let chatFeature: ChatFeature\n#endif\n}',
    [extensionFile]: '#if !INTERNAL\nextension AppModel { var `chatFeature`: ChatFeature { ChatFeature() } }\n#endif',
    'Application/1 - View/Views/Chat/ChatView.swift': 'struct ChatView: View { @State private var viewModel = ChatViewModel() }',
    'Application/1 - View/Views/Chat/ChatViewModel.swift': 'final class ChatViewModel { let chatFeature = AppModel.shared.`chatFeature` }'
  });
  const report = await inspect(root);
  const ambiguity = report.findings.find(item => item.code === 'app-model-property-ambiguous');
  assert.ok(ambiguity.message.includes(file + ':3'));
  assert.ok(ambiguity.message.includes(extensionFile + ':2'));
  assert.equal(report.screens[0].dependencies[0].featureType, null);
});
