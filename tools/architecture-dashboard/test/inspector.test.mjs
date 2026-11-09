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
  assert.match(renderInspection(report), /ChatViewModel → chatsFeature.*private @State recognized/);
  await fs.writeFile(path.join(root, 'ApplicationTests/ChatsFeature.swift'), 'final class ChatsFeature {}');
  const ambiguous = await inspect(root);
  assert.equal(ambiguous.screens[0].dependencies[0].featureFile, null);
  assert.deepEqual(ambiguous.screens[0].dependencies[0].collaborators, []);
  assert.match(renderInspection(ambiguous), /chatsFeature \(ChatsFeature, source unresolved\)/);
  const ambiguity = ambiguous.findings.filter(item => item.code === 'feature-source-ambiguous');
  assert.deepEqual(ambiguity.map(item => item.file), ['Application/2 - AppModel/AppModel.swift']);
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

test('reviews Feature placement outside the AppModel feature folders', async t => {
  const featureFile = 'Packages/Feed/Sources/Features/Feed/FeedFeature.swift';
  const root = await fixture(t, {
    'App/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() }; let feedFeature: FeedFeature }',
    [featureFile]: 'import Foundation\nfinal class FeedFeature {}'
  });
  const finding = (await inspect(root)).findings.find(item => item.code === 'feature-placement');
  assert.deepEqual([finding?.file, finding?.line, finding?.severity], [featureFile, 2, 'review']);
});

test('reports a missing named feature test file', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() }; let settingsFeature: SettingsFeature }',
    'Application/2 - AppModel/Features/Settings/SettingsFeature.swift': 'final class SettingsFeature {}'
  });
  const report = await inspect(root);
  assert.deepEqual(report.findings.map(item => item.code), ['feature-tests-missing']);
  assert.equal(report.findings[0].severity, 'review');
  assert.match(report.findings[0].message, /SettingsFeatureTests.swift/);
  assert.match(report.findings[0].message, /scanned directory/);
});

test('reports test search scope when tests are beside the scanned app folder', async t => {
  const root = await fixture(t, {
    'Application/1 - View/Views/Chat/ChatView.swift': 'struct ChatView: View { @State private var viewModel = ChatViewModel() }',
    'Application/1 - View/Views/Chat/ChatViewModel.swift': 'final class ChatViewModel { init(chatsFeature: ChatsFeature = AppModel.shared.chatsFeature) {} }',
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() }; let chatsFeature: ChatsFeature }',
    'Application/2 - AppModel/Features/Chats/ChatsFeature.swift': 'final class ChatsFeature {}',
    'ApplicationTests/ViewModelTests/ChatViewModelTests.swift': 'struct ChatViewModelTests {}',
    'ApplicationTests/FeatureTests/ChatsFeatureTests.swift': 'struct ChatsFeatureTests {}'
  });
  const isMissingTest = item => ['feature-tests-missing', 'view-model-tests-missing'].includes(item.code);
  const scoped = (await inspect(path.join(root, 'Application'))).findings.filter(isMissingTest);
  assert.equal(scoped.length, 2);
  assert.ok(scoped.every(item => item.severity === 'review'));
  assert.ok(scoped.every(item => /scanned directory/.test(item.message)));
  assert.equal((await inspect(root)).findings.filter(isMissingTest).length, 0);
  await fs.rename(path.join(root, 'ApplicationTests/FeatureTests'), path.join(root, 'FeatureTests'));
  await fs.rename(path.join(root, 'ApplicationTests/ViewModelTests/ChatViewModelTests.swift'), path.join(root, 'ChatViewModelTests.swift'));
  assert.equal((await inspect(root)).findings.filter(isMissingTest).length, 0);
});

test('does not mistake composition locals for AppModel properties', async t => {
  const root = await fixture(t, {
    'Application/1 - View/Views/Chat/ChatView.swift': 'struct ChatView: View { @State private var viewModel = ChatViewModel() }',
    'Application/1 - View/Views/Chat/ChatViewModel.swift': 'final class ChatViewModel { init(chatFeature: ChatFeature = AppModel.shared.chatFeature) {} }',
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { let chatFeature: ChatFeature = ChatFeature(); return AppModel() } }',
    'Application/2 - AppModel/Features/Chat/ChatFeature.swift': 'final class ChatFeature {}',
    'ApplicationTests/ViewModelTests/ChatViewModelTests.swift': 'struct ChatViewModelTests {}'
  });
  const report = await inspect(root);
  assert.ok(report.findings.some(item => item.code === 'unresolved-feature'));
  assert.ok(!report.findings.some(item => item.code === 'feature-tests-missing'));
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

test('does not identify a launch guard by the order of private Boolean properties', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel {\n    private var unrelatedFlag: Bool = false\n    private var didFinishLaunching: Bool\n    static func live() -> AppModel { AppModel() }\n}'
  });
  const findings = (await inspect(root)).findings;
  const booleans = findings.filter(item => item.code === 'app-model-boolean-purpose');
  assert.equal(booleans.length, 2);
  assert.ok(booleans.every(item => item.severity === 'review'));
  assert.ok(!findings.some(item => item.code === 'app-model-non-feature-state' && /didFinishLaunching/.test(item.message)));
  assert.ok(!findings.some(item => /launch guard unrelatedFlag/.test(item.message)));
});

test('local and preview storage references are not asserted to be production violations', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() } }',
    'Application/1 - View/PreviewSupport.swift': 'func makePreview() { let model: AppModel = AppModel.live(); let container: ModelContainer = previewContainer }'
  });
  const findings = (await inspect(root)).findings;
  assert.equal(findings.find(item => item.code === 'stored-app-model').severity, 'review');
  assert.match(findings.find(item => item.code === 'stored-app-model').message, /local value or preview/);
  assert.equal(findings.find(item => item.code === 'view-swiftdata-access').severity, 'review');
  assert.match(findings.find(item => item.code === 'view-swiftdata-access').message, /previews retain the same CFA boundaries/);
});

test('reviews direct SwiftData preview and query usage without flagging a normal preview', async t => {
  const root = await fixture(t, {
    'Application/1 - View/PreviewSupport.swift': 'import SwiftUI\n#Preview { NotesView().modelContainer(container) }',
    'Application/PreviewContent/NotesPreview.swift': '#Preview { NotesView().modelContainer(container) }',
    'Application/PreviewContent/LegacyPreview.swift': 'struct LegacyPreview: PreviewProvider { static var previews: some View { NotesView().modelContainer(container) } }',
    'Application/PreviewContent/SafeLegacyPreview.swift': 'struct SafeLegacyPreview: PreviewProvider { static var previews: some View { NotesView() } }',
    'Application/2 - AppModel/SwiftDataManager.swift': 'class SwiftDataManager { let container: ModelContainer }',
    'Application/1 - View/QueryScreen.swift': 'struct QueryScreen: View { @Query var notes: [Note]; var body: some View { Text("Notes") } }',
    'Application/1 - View/EnvironmentScreen.swift': 'struct EnvironmentScreen: View { @Environment(\\.modelContext) private var context; var body: some View { Text("Notes") } }',
    'Application/1 - View/SimplePreview.swift': '#Preview { NotesView() }\n// @Query var notes: [Note]\nlet example = ".modelContainer(container)"'
  });
  const matches = (await inspect(root)).findings.filter(item => item.code === 'view-swiftdata-access');
  assert.equal(matches.length, 5);
  assert.ok(matches.some(item => item.file.endsWith('NotesPreview.swift') && item.line === 1));
  assert.ok(matches.some(item => item.file.endsWith('/LegacyPreview.swift') && item.line === 1));
  assert.ok(matches.every(item => item.severity === 'review'));
  assert.equal(matches.find(item => item.file.endsWith('PreviewSupport.swift'))?.line, 2);
  assert.ok(matches.some(item => item.file.endsWith('QueryScreen.swift')));
  assert.ok(matches.some(item => item.file.endsWith('EnvironmentScreen.swift')));
});

test('identifies a launch signal scheduled inside a delegate Task or dispatch queue without flagging independent work', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() } }',
    'Application/AppDelegate.swift': 'class AppDelegate {\n func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool {\n Task { await AppModel.shared.applicationDidFinishLaunching() }\n return true\n }\n}',
    'Application/OtherDelegate.swift': 'class OtherDelegate { func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool { AppModel.shared.applicationDidFinishLaunching(); Task { await refresh(); analytics.applicationDidFinishLaunching() }; return true } }',
    'Application/DispatchDelegate.swift': 'class AppDelegate {\n func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool {\n DispatchQueue.main.async { AppModel.shared.applicationDidFinishLaunching() }\n return true\n }\n}'
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'scheduled-app-model-launch');
  assert.deepEqual(findings.map(({file, line, severity}) => [file, line, severity]), [
    ['Application/AppDelegate.swift', 3, 'review'],
    ['Application/DispatchDelegate.swift', 3, 'review']
  ]);
  assert.match(findings[0].message, /through Task/);
  assert.match(findings[1].message, /through DispatchQueue\.async/);
});

test('identifies a launch signal deferred by DispatchQueue.asyncAfter', async t => {
  const root = await fixture(t, {
    'Application/AppDelegate.swift': `class Delegate {
      func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool {
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
          AppModel.shared.applicationDidFinishLaunching()
        }
        return true
      }
    }`
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'scheduled-app-model-launch');
  assert.deepEqual(findings.map(item => item.line), [3]);
  assert.match(findings[0].message, /DispatchQueue\.asyncAfter/);
});

test('reviews a deferred AppModel launch through a local alias', async t => {
  const root = await fixture(t, {
    'Application/AppDelegate.swift': `class Delegate {
      func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool {
        let model: AppModel = AppModel.shared
        Task { model.applicationDidFinishLaunching() }
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
  assert.deepEqual(findings.map(({file, line}) => [file, line]), [['Application/AppDelegate.swift', 4]]);
});

test('identifies priority and explicitly typed Tasks scheduling the launch signal', async t => {
  const root = await fixture(t, {
    'Application/PriorityDelegate.swift': 'class Delegate { func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool { Task(priority: .high) { AppModel.shared.applicationDidFinishLaunching() }; return true } }',
    'Application/DetachedDelegate.swift': 'class Delegate { func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool { Task.detached(priority: .background) { await AppModel.shared.applicationDidFinishLaunching() }; return true } }',
    'Application/TypedDelegate.swift': 'class Delegate { func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool { Task<Void, Never> { AppModel.shared.applicationDidFinishLaunching() }; return true } }',
    'Application/ExplicitInitializerDelegate.swift': 'class Delegate { func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool { Task<Void, Never>.init { AppModel.shared.applicationDidFinishLaunching() }; return true } }',
    'Application/OperationArgumentDelegate.swift': 'class Delegate { func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool { Task(priority: .high, operation: { AppModel.shared.applicationDidFinishLaunching() }); return true } }',
    'Application/DirectDelegate.swift': 'class Delegate { func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [String: Any]?) -> Bool { AppModel.shared.applicationDidFinishLaunching(); Task(priority: .high) { await refresh() }; return true } }'
  });
  const files = (await inspect(root)).findings.filter(item => item.code === 'scheduled-app-model-launch').map(item => item.file).sort();
  assert.deepEqual(files, ['Application/DetachedDelegate.swift', 'Application/ExplicitInitializerDelegate.swift', 'Application/OperationArgumentDelegate.swift', 'Application/PriorityDelegate.swift', 'Application/TypedDelegate.swift']);
});

test('a live factory in an extension is not reported as definitely absent', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel {}',
    'Application/2 - AppModel/AppModel+Live.swift': 'extension AppModel { static func live() -> AppModel { AppModel() } }'
  });
  const finding = (await inspect(root)).findings.find(item => item.code === 'app-model-live-factory');
  assert.equal(finding.severity, 'review');
  assert.match(finding.message, /including extensions and active compilation conditions/);
});

test('a Feature exposed in an extension remains an unresolved review, not a missing-property claim', async t => {
  const root = await fixture(t, {
    'Application/1 - View/Views/Chat/ChatView.swift': 'struct ChatView: View { @State private var viewModel = ChatViewModel() }',
    'Application/1 - View/Views/Chat/ChatViewModel.swift': 'final class ChatViewModel { init(chatFeature: ChatFeature = AppModel.shared.chatFeature) {} }',
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static let shared = AppModel(); static func live() -> AppModel { AppModel() } }',
    'Application/2 - AppModel/AppModel+Chat.swift': 'extension AppModel { var chatFeature: ChatFeature { ChatFeature() } }',
    'Application/2 - AppModel/Features/Chat/ChatFeature.swift': 'final class ChatFeature {}',
    'ApplicationTests/ViewModelTests/ChatViewModelTests.swift': 'struct ChatViewModelTests {}'
  });
  const { findings } = await inspect(root);
  assert.ok(findings.some(item => item.code === 'app-model-shared-factory'));
  const finding = findings.find(item => item.code === 'unresolved-feature');
  assert.equal(finding.severity, 'review');
  assert.match(finding.message, /Check extensions, inferred types and target membership/);
});

test('requests review of an AppModel task without assuming its purpose', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel {\n    private var transactionUpdatesTask: Task<Void, Never>?\n    let settingsFeature: SettingsFeature\n    static func live() -> AppModel { AppModel() }\n}',
    'Application/2 - AppModel/Features/Settings/SettingsFeature.swift': 'final class SettingsFeature {}',
    'ApplicationTests/FeatureTests/Settings/SettingsFeatureTests.swift': 'struct SettingsFeatureTests {}'
  });
  const report = await inspect(root);
  assert.ok(!report.findings.some(item => item.code === 'app-model-non-feature-state'));
  assert.ok(report.findings.some(item => item.code === 'app-model-task-purpose' && item.severity === 'review' && /transactionUpdatesTask/.test(item.message)));
});

test('inspects AppModel properties regardless of indentation', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel {\n  private var twoSpaceTask: Task<Void, Never>?\n\tprivate var tabTask: Task<Void, Never>?\n        private var unexpectedCache: String\n    static func live() -> AppModel { AppModel() }\n}'
  });
  const findings = (await inspect(root)).findings;
  assert.ok(findings.some(item => item.code === 'app-model-task-purpose' && /twoSpaceTask/.test(item.message)));
  assert.ok(findings.some(item => item.code === 'app-model-task-purpose' && /tabTask/.test(item.message)));
  assert.ok(findings.some(item => item.code === 'app-model-non-feature-state' && /unexpectedCache/.test(item.message)));
});

test('inspects annotated AppModel properties without treating a private task as a verified listener', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel {\n    static let shared: AppModel = live()\n    @ObservationIgnored private var updateTask: Task<Void, Never>? = nil\n    private var hasLaunched: Bool = false\n    @ObservationIgnored private var secretCache: String\n    @ObservationIgnored\n    private var backupTask: _Concurrency.Task<Void, Never>?\n    static func live() -> AppModel { AppModel() }\n}'
  });
  const report = await inspect(root);
  const checks = report.findings.filter(item => item.code === 'app-model-task-purpose');
  assert.equal(checks.length, 2);
  assert.ok(checks.every(item => item.severity === 'review'));
  assert.ok(!report.findings.some(item => item.code === 'app-model-non-feature-state' && /backupTask/.test(item.message)));
  const defaults = report.findings.filter(item => item.code === 'app-model-default-value');
  assert.equal(defaults.length, 2);
  assert.match(defaults[0].message, /updateTask/);
  assert.match(defaults[1].message, /hasLaunched/);
  assert.ok(report.findings.some(item => item.code === 'app-model-non-feature-state' && /secretCache/.test(item.message)));
});

test('does not mistake a structural tab root or nested Feature value for a missing or renamed owner', async t => {
  const root = await fixture(t, {
    'Application/1 - View/Views/ContentView.swift': 'struct ContentView: View { @State private var selectedTab = 0; var body: some View { TabView(selection: $selectedTab) { PracticeView().tag(0) } } }',
    'Application/1 - View/Views/Practice/PracticeView.swift': 'struct PracticeView: View { @State private var viewModel = PracticeViewModel(); var body: some View { Text("Practice") } }',
    'Application/1 - View/Views/Practice/PracticeViewModel.swift': 'final class PracticeViewModel { private var retryCommand: PracticeFeature.Command = .refresh; init(practiceFeature: PracticeFeature = AppModel.shared.practiceFeature) {} }',
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() }; let practiceFeature: PracticeFeature }',
    'Application/2 - AppModel/Features/Practice/PracticeFeature.swift': 'final class PracticeFeature {}',
    'ApplicationTests/ViewModelTests/PracticeViewModelTests.swift': 'struct PracticeViewModelTests {}',
    'ApplicationTests/FeatureTests/PracticeFeatureTests.swift': 'struct PracticeFeatureTests {}'
  });
  const report = await inspect(root);
  const codes = report.findings.map(item => item.code);
  assert.ok(!codes.includes('view-model-missing'));
  assert.ok(!codes.includes('feature-reference-name'));
  assert.match(renderInspection(report), /ContentView: structural tab root/);
  assert.doesNotMatch(renderInspection(report), /ContentView: missing ViewModel/);
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
});

test('a SwiftData import in tests is a target-membership review, not an app defect', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() } }',
    'ApplicationTests/StorageTests.swift': 'import SwiftData\nstruct StorageTests {}'
  });
  const finding = (await inspect(root)).findings.find(item => item.code === 'swiftdata-manager-missing');
  assert.equal(finding.severity, 'review');
  assert.match(finding.message, /includes tests and does not resolve target membership/);
});

test('flags conditional database startup presentation in App.body', async t => {
  const root = await fixture(t, {
    'Application/2 - AppModel/AppModel.swift': 'final class AppModel { static func live() -> AppModel { AppModel() } }',
    'Application/1 - View/HabitApp.swift': 'import SwiftUI\nstruct HabitApp: App { var body: some Scene { WindowGroup { if ready { RootTabView().modelContainer(container) } else { ProgressView("Opening") } } } }'
  });
  const findings = (await inspect(root)).findings;
  const codes = findings.map(item => item.code);
  assert.ok(codes.includes('conditional-app-body'));
  assert.ok(codes.includes('app-startup-presentation'));
  assert.ok(findings.filter(item => ['conditional-app-body', 'app-startup-presentation'].includes(item.code)).every(item => item.severity === 'review'));
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
  assert.match(report.findings.find(item => item.code === 'view-model-tests-missing').message, /scanned directory/);
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
      var computedValue: String { "value" }
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
  assert.deepEqual(findings.filter(item => item.code === 'direct-url-session').map(({file, line}) => [file, line]), [['Client.swift', 1], ['NetworkingManager.swift', 2]]);
});

test('reviews direct Feature access in root tab navigation', async t => {
  const root = await fixture(t, {
    'Application/1 - View/Views/ContentView.swift': `struct ContentView: View {
      var body: some View {
        TabView { PracticeView() }.task { await AppModel.shared.practiceFeature.refresh() }
      }
    }`
  });
  const report = await inspect(root);
  assert.equal(report.screens[0].structuralRoot, false);
  assert.equal(report.findings.find(item => item.code === 'root-feature-access')?.line, 3);
});

test('reviews direct Feature access in a preview while leaving normal previews clear', async t => {
  const file = 'App/1 - View/Preview.swift';
  const root = await fixture(t, {
    [file]: `#Preview { HomeView() }
    #Preview("Direct access") {
      Text(AppModel.shared.homeFeature.title)
    }
    #Preview("Aliased access") {
      let model = AppModel.shared
      Text(model.homeFeature.title)
    }
    #Preview("Separate local bindings") {
      if enabled { let model = AppModel.shared; use(model) }
      let model = PreviewFixture()
      Text(model.homeFeature.title)
    }`
  });
  const { findings } = await inspect(root);
  assert.deepEqual(findings.filter(item => item.code === 'preview-feature-access')
    .map(({file, line}) => [file, line]), [[file, 3], [file, 7]]);
});

test('surfaces a stored Feature dependency as coordination to review', async t => {
  const file = 'Application/2 - AppModel/Features/Profile/UserProfileFeature.swift';
  const root = await fixture(t, {
    [file]: `final class UserProfileFeature {
      private let orders: OrdersFeature
      private let service: AccountService
      private let orderID: OrdersFeature.OrderID
      var computed: OrdersFeature { orders }
      func signOut() { let local: OrdersFeature = orders }
    }`
  });
  const findings = (await inspect(root)).findings.filter(item => item.code === 'feature-coordination');
  assert.deepEqual(findings.map(({file, line, severity}) => [file, line, severity]), [[file, 2, 'review']]);
  assert.match(findings[0].message, /business capability.*one owner per state.*dependency cycle/);
});
