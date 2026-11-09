import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { inspect } from '../src/inspector.mjs';

const viewPath = 'App/1 - View/Views/Home/HomeView.swift';
const constructionCodes = new Set([
  'view-model-ownership',
  'screen-initializer-inputs',
  'view-stored-feature',
  'view-model-input-storage',
  'view-stored-model-dependency',
  'view-model-initializer-construction'
]);

async function inspectView(t, source, additionalFiles = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cfa-screen-construction-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const files = {
    [viewPath]: source,
    'App/1 - View/Views/Home/HomeViewModel.swift':
      'final class HomeViewModel { init(homeFeature: HomeFeature = AppModel.shared.homeFeature) {} }',
    ...additionalFiles
  };
  for (const [relative, text] of Object.entries(files)) {
    const file = path.join(root, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, text);
  }
  const report = await inspect(root);
  return { report, findings: report.findings.filter(item => constructionCodes.has(item.code)) };
}

test('rejects the reported defaulted HomeViewModel injection with source locations', async t => {
  const { report, findings } = await inspectView(t, `import SwiftUI
struct HomeView: View {
    @State private var viewModel: HomeViewModel
    init(viewModel: HomeViewModel = HomeViewModel()) {
        _viewModel = State(initialValue: viewModel)
    }
    var body: some View { Text("Home") }
}`);
  assert.equal(report.screens[0].ownsViewModel, false);
  assert.deepEqual(findings.map(item => [item.code, item.line]), [
    ['screen-initializer-inputs', 4],
    ['view-model-initializer-construction', 4],
    ['view-model-ownership', 2]
  ]);
  assert.ok(findings.every(item => item.file === viewPath));
  assert.equal(findings[0].severity, 'warning');
});

test('flags a module-qualified ViewModel initializer input', async t => {
  const { report, findings } = await inspectView(t, `struct HomeView: View {
    @State private var viewModel: HomeViewModel
    init(model: MyApp.HomeViewModel) {
      _viewModel = State(initialValue: model)
    }
    var body: some View { Text("Home") }
  }`);
  assert.equal(report.screens[0].ownsViewModel, false);
  const input = findings.find(item => item.code === 'screen-initializer-inputs');
  assert.equal(input?.severity, 'warning');
  assert.match(input.message, /appears to accept a ViewModel/);
});

test('flags ViewModel injection even when its declaration is in another folder', async t => {
  const { findings } = await inspectView(t, `struct HomeView: View {
    @State private var viewModel: SharedViewModel
    init(model: SharedViewModel) {
      _viewModel = State(initialValue: model)
    }
    var body: some View { Text("Home") }
  }`, {
    'App/1 - View/Views/Home/HomeViewModel.swift': '',
    'App/Presentation/SharedViewModel.swift': 'final class SharedViewModel {}'
  });
  const input = findings.find(item => item.code === 'screen-initializer-inputs');
  assert.equal(input?.severity, 'warning');
  assert.equal(input?.line, 3);
});

test('flags initializer injection in a flat project layout', async t => {
  const file = 'App/Detail.swift';
  const { findings } = await inspectView(t, '', {
    [file]: `struct Detail: SwiftUI.View {
      init(model: DetailViewModel) {}
      var body: some View { Text("Detail") }
    }`
  });
  const finding = findings.find(item => item.code === 'screen-initializer-inputs');
  assert.equal(finding?.file, file);
  assert.equal(finding?.line, 2);
  assert.equal(finding?.severity, 'warning');
});

test('distinguishes a Feature API input from a reusable action closure', async t => {
  const { findings } = await inspectView(t, '', {
    'App/Presentation/Notes.swift': `struct NotesView: View {
      init(notesFeature: any NotesFeatureAPI) {}
      var body: some View { Text("Notes") }
    }
    struct RefreshButton: View {
      let action: () -> Void
      init(action: @escaping () -> Void) { self.action = action }
      var body: some View { Button("Refresh", action: action) }
    }`
  });
  assert.deepEqual(findings.map(({code, line, severity}) => [code, line, severity]), [
    ['screen-initializer-inputs', 2, 'review']
  ]);
  assert.match(findings[0].message, /NotesFeatureAPI/);
});

test('reviews a stored Feature input even when Swift synthesizes the View initializer', async t => {
  const file = 'App/Presentation/NoteRow.swift';
  const { findings } = await inspectView(t, '', {
    [file]: `struct NoteRow: View {
      let notes: (any NotesFeatureAPI)?
      let snapshot: NotesFeature.Snapshot
      let refresh: () -> Void
      var computed: NotesFeature? { nil }
      var derived: NotesFeature { makeFeature() }
      var body: some View { Button("Refresh", action: refresh) }
    }`
  });
  assert.deepEqual(findings.map(item => [item.code, item.file, item.line, item.severity]), [
    ['view-stored-feature', file, 2, 'review']
  ]);
});

test('reviews stored model dependencies without requiring an explicit initializer', async t => {
  const file = 'App/Presentation/NoteRow.swift';
  const { findings } = await inspectView(t, '', {
    [file]: `struct NoteRow: View {
      let storage: App.NotesRepository
      let networking: NetworkingManager
      let model: AppModel?
      let snapshot: NotesRepository.Snapshot
      var body: some View { Text("Note") }
    }`
  });
  assert.deepEqual(findings.map(item => [item.code, item.file, item.line]), [
    ['view-stored-model-dependency', file, 2],
    ['view-stored-model-dependency', file, 3],
    ['view-stored-model-dependency', file, 4]
  ]);
});

test('reviews supplied ViewModel storage without flagging screen-owned State', async t => {
  const file = 'App/Presentation/Notes.swift';
  const { findings } = await inspectView(t, '', {
    [file]: `struct NoteRow: View {
      var model: App.NotesViewModel
      @Bindable var editor: EditorViewModel
      let snapshot: NotesViewModel.Snapshot
      var body: some View { Text("Note") }
    }
    struct NotesView: View {
      @State private var viewModel: NotesViewModel
      init() { _viewModel = State(initialValue: NotesViewModel()) }
      var body: some View { Text("Notes") }
    }`
  });
  assert.deepEqual(findings.map(item => [item.code, item.file, item.line]), [
    ['view-model-input-storage', file, 2],
    ['view-model-input-storage', file, 3]
  ]);
});

test('flags explicit ViewModel inputs in extensions of recognized Views', async t => {
  const file = 'App/Detail+Init.swift';
  const { findings } = await inspectView(t, '', {
    'App/Detail.swift': 'struct Detail: View { var body: some View { Text("Detail") } }',
    [file]: `extension Detail {
      init(model: DetailViewModel) { self.init() }
    }
    extension Worker {
      init(model: DetailViewModel) { self.init() }
    }`
  });
  assert.deepEqual(findings.map(item => [item.code, item.file, item.line]), [
    ['screen-initializer-inputs', file, 2]
  ]);
});

test('flags a direct AppModel initializer input without mistaking a nested value for AppModel', async t => {
  const { findings } = await inspectView(t, `struct HomeView: View {
    @State private var viewModel = HomeViewModel()
    init(model: MyApp.AppModel) {}
    init(snapshot: AppModel.Snapshot) {}
    var body: some View { Text("Home") }
  }`);
  assert.deepEqual(findings.map(item => [item.code, item.line, item.severity]), [
    ['screen-initializer-inputs', 3, 'warning'],
    ['screen-initializer-inputs', 4, 'review']
  ]);
  assert.match(findings[0].message, /appears to accept AppModel/);
});

test('reviews possible model dependencies in a flat View initializer', async t => {
  const file = 'App/Detail.swift';
  const { findings } = await inspectView(t, '', {
    [file]: `struct Detail: View {
      init(schedule: LaunchFeature) {}
      init(repository: (any MyApp.LaunchRepository)?, network: NetworkingManager) {}
      init(snapshot: LaunchFeature.Snapshot) {}
      init(snapshot: LaunchSnapshot = makeSnapshot(feature: LaunchFeature())) {}
      init(action: (feature: LaunchFeature) -> Void) {}
      var body: some View { Text("Detail") }
    }`
  });
  assert.deepEqual(findings.map(item => [item.code, item.file, item.line, item.severity]), [
    ['screen-initializer-inputs', file, 2, 'review'],
    ['screen-initializer-inputs', file, 3, 'review']
  ]);
  assert.match(findings[1].message, /LaunchRepository, NetworkingManager/);
});

test('locates possible work started by a SwiftUI initializer', async t => {
  const { report } = await inspectView(t, `struct HomeView: View {
    @State private var viewModel = HomeViewModel()
    init() {
      Task<Void, Never> { await load() }
    }
    var body: some View { Text("Home").task { await load() } }
  }`);
  const tasks = report.findings.filter(item => item.code === 'screen-initializer-task');
  assert.deepEqual(tasks.map(item => [item.file, item.line, item.severity]), [[viewPath, 4, 'review']]);
});

test('locates possible work started by the screen ViewModel initializer', async t => {
  const modelFile = viewPath.replace('View.swift', 'ViewModel.swift');
  const { report } = await inspectView(t, `struct HomeView: View {
    @State private var viewModel = HomeViewModel()
    var body: some View { Text("Home") }
  }`, {
    [modelFile]: `final class HomeViewModel {
      init() {
        Task { await load() }
      }
      func refresh() { Task { await load() } }
    }`
  });
  const tasks = report.findings.filter(item => item.code === 'screen-initializer-task');
  assert.deepEqual(tasks.map(item => [item.file, item.line]), [[modelFile, 3]]);
});

test('maps a conventionally located screen with qualified View conformance', async t => {
  const {report} = await inspectView(t, `struct HomeView: SwiftUI.View {
    @State private var viewModel = HomeViewModel()
    var body: some View { Text("Home") }
  }`);
  assert.equal(report.screens[0]?.name, 'HomeView');
  assert.equal(report.screens[0]?.ownsViewModel, true);
});

test('maps a screen when SwiftUI.View follows another conformance', async t => {
  const {report} = await inspectView(t, `struct HomeView: Equatable, SwiftUI.View {
    @State private var viewModel = HomeViewModel()
    var body: some View { Text("Home") }
    static func == (lhs: Self, rhs: Self) -> Bool { true }
  }`);
  assert.equal(report.screens[0]?.name, 'HomeView');
  assert.equal(report.screens[0]?.ownsViewModel, true);
});

test('a nested snapshot type is not a ViewModel initializer input', async t => {
  const {report, findings} = await inspectView(t, `struct HomeView: View {
    @State private var viewModel: HomeViewModel
    init(snapshot: HomeViewModel.Snapshot) {
      _viewModel = State(initialValue: HomeViewModel(snapshot: snapshot))
    }
    var body: some View { Text("Home") }
  }`);
  assert.equal(report.screens[0].ownsViewModel, true);
  assert.equal(findings.find(item => item.code === 'screen-initializer-inputs')?.severity, 'review');
});

test('selected detail data and owned State are reviewed rather than rejected', async t => {
  const { report, findings } = await inspectView(t, `struct HomeView: View {
    @State private var modèle: HomeViewModel
    init(launch: LaunchSnapshot) {
      _modèle = State(initialValue: HomeViewModel(launch: launch))
    }
    var body: some View { Text("Home") }
  }`);
  assert.equal(report.screens[0].ownsViewModel, true);
  assert.equal(report.findings.find(item => item.code === 'view-model-property-name')?.line, 2);
  assert.ok(findings.length > 0);
  assert.ok(findings.every(item => item.severity === 'review'));
});

test('a local with a Unicode prefix is not the ViewModel backing property', async t => {
  const { report, findings } = await inspectView(t, `struct HomeView: View {
    @State private var viewModel: HomeViewModel
    init(launch: LaunchSnapshot) {
      let pré_viewModel = State(initialValue: HomeViewModel(launch: launch))
      _viewModel = pré_viewModel
    }
    var body: some View { Text("Home") }
  }`);
  assert.equal(report.screens[0].ownsViewModel, false);
  assert.ok(findings.some(item => item.code === 'view-model-ownership'));
});

for (const expression of [
  'State(initialValue: HomeViewModel())',
  'State(wrappedValue: HomeViewModel())'
]) {
  test('rejects zero-argument View init constructing ' + expression, async t => {
    const { findings } = await inspectView(t, `struct HomeView: View {
      @State private var viewModel: HomeViewModel
      init() { _viewModel = ${expression} }
      var body: some View { Text("Home") }
    }`);
    assert.deepEqual(findings.map(item => item.code), [
      'view-model-initializer-construction', 'view-model-ownership'
    ]);
  });
}

for (const declaration of [
  '@State private var viewModel = HomeViewModel()',
  '@State private var viewModel: HomeViewModel = HomeViewModel()',
  '@State private var reminders = HomeViewModel()',
  '@State private var modèle = HomeViewModel()',
  '@State private var `default` = HomeViewModel()',
  '@State private var `viewModel`: HomeViewModel = .init()',
  '@State private var reminders: HomeViewModel = .init()',
  '@State private var reminders: MyApp.HomeViewModel = MyApp.HomeViewModel()',
  '@SwiftUI.State private var viewModel = HomeViewModel()',
  '@State private var viewModel = MyApp.HomeViewModel.init()',
  '@State private var viewModel =\n HomeViewModel()'
]) {
  test('accepts private inline no-argument ownership: ' + declaration, async t => {
    const { report, findings } = await inspectView(t, `struct HomeView: View {
      ${declaration}
      var body: some View { Text("Home") }
    }`);
    assert.equal(report.screens[0].ownsViewModel, true);
    assert.deepEqual(findings, []);
    const naming = report.findings.find(item => item.code === 'view-model-property-name');
    if (/reminders|modèle|`default`/.test(declaration)) {
      assert.equal(naming?.severity, 'warning');
      assert.equal(naming?.file, viewPath);
      assert.equal(naming?.line, 2);
    } else {
      assert.equal(naming, undefined);
    }
  });
}

for (const declaration of [
  '@State var viewModel = HomeViewModel()',
  '@State private var viewModel = HomeViewModel(homeFeature: feature)',
  '@State private var viewModel = makeViewModel()',
  '@State private var viewModel = HomeViewModel().sharedModel',
  '@State private var viewModel: HomeViewModel = .init()\n    .sharedModel',
  'private var viewModel: HomeViewModel { HomeViewModel() }'
]) {
  test('reports nonconforming ownership: ' + declaration, async t => {
    const { findings } = await inspectView(t, `struct HomeView: View {
      ${declaration}
      var body: some View { Text("Home") }
    }`);
    assert.deepEqual(findings.map(item => item.code), ['view-model-ownership']);
  });
}

test('flags screen data inputs even with compliant inline ViewModel ownership', async t => {
  const { report, findings } = await inspectView(t, `struct HomeView: View {
    @State private var viewModel = HomeViewModel()
    let itemID: UUID
    init(itemID: UUID) { self.itemID = itemID }
    var body: some View { Text("Home") }
  }`);
  assert.equal(report.screens[0].ownsViewModel, true);
  assert.deepEqual(findings.map(item => item.code), ['screen-initializer-inputs']);
});

test('comments, strings, nested types and sibling Views cannot establish screen ownership', async t => {
  const { findings } = await inspectView(t, `struct HomeView: View {
    // @State private var viewModel = HomeViewModel()
    let example = "@State private var viewModel = HomeViewModel()"
    struct Nested {
      @State private var viewModel = HomeViewModel()
      init(viewModel: HomeViewModel) {}
    }
    var body: some View { Text(example) }
  }
  struct OtherView: View {
    @State private var viewModel = HomeViewModel()
    init(viewModel: HomeViewModel) {}
    var body: some View { Text("Other") }
  }`);
  assert.deepEqual(findings.map(item => item.code), ['screen-initializer-inputs', 'view-model-ownership']);
  assert.match(findings[0].message, /^OtherView /);
  assert.equal(findings[0].line, 12);
});

test('allows a stateless graph snapshot initializer inside a compliant screen file', async t => {
  const { findings } = await inspectView(t, `struct HomeView: View {
    @State private var viewModel = HomeViewModel()
    var body: some View {
      GraphView(graphData: viewModel.graphData)
    }
  }
  struct GraphView: View {
    let graphData: GraphData
    init(graphData: GraphData) { self.graphData = graphData }
    var body: some View { Text("Graph") }
  }`);
  assert.deepEqual(findings, []);
});

test('reviews stored task handles in Views outside conventional screen folders', async t => {
  const file = 'App/Presentation/RefreshRow.swift';
  const {report} = await inspectView(t, '', {
    [file]: `struct RefreshRow: View {
      @State private var work: Swift.Task<Void, Never>?
      private var current: Task<
        Result<[Int], Never>,
        Never
      >? { work }
      private var watched: Task<Void, Never>? { didSet { observe() } }
      private var optional: Swift.Optional<_Concurrency.Task<Void, Never>>
      private var computed: Optional<Task<Void, Never>> { optional }
      private var keyed: [String: Task<Void, Never>] = [:]
      private var queued: Array<Task<Void, Never>> = []
      private var handles: [Task<Void, Never>] { queued }
      private var grouped: Dictionary<String, Task<Void, Never>> { keyed }
      var body: some View { Text("Refresh").task { await refresh() } }
    }`
  });
  assert.deepEqual(report.findings.filter(item => item.code === 'screen-task-handle')
    .map(({file, line}) => [file, line]), [[file, 2], [file, 7], [file, 8], [file, 10], [file, 11]]);
});

test('flags possible screen-owned task handles without flagging lifecycle tasks', async t => {
  const { report } = await inspectView(t, `struct HomeView: View {
    @State private var viewModel = HomeViewModel()
    @State private var refreshTask: Task<Void, Never>?
    private let \`repeat\` = Task {}
    private let cancellation = Task.isCancelled
    private let typedCancellation = Task<Never, Never>.isCancelled
    private let tâche = _Concurrency.Task<Void, Never>.detached {}
    @State private var qualified: _Concurrency.Task<Void, Never>?
    var body: some View {
      Text("Home").task {
        let localTask = Task {}
        await localTask.value
      }
    }
  }`);
  assert.deepEqual(
    report.findings.filter(item => item.code === 'screen-task-handle').map(item => item.line),
    [3, 4, 7, 8]
  );
  assert.deepEqual(
    report.findings.filter(item => item.code === 'task-inside-view-lifecycle').map(item => item.line),
    [11]
  );
});

test('an unrelated property named viewModel does not imply ViewModel state assignment', async t => {
  const { report, findings } = await inspectView(t, `struct HomeView: View {
    @State private var home = HomeViewModel()
    private let viewModel: String
    init() { viewModel = "Home" }
    var body: some View { Text(viewModel) }
  }`);
  assert.equal(report.screens[0].ownsViewModel, true);
  assert.deepEqual(findings, []);
});

test('recognizes typed State construction with a contextual detail ViewModel initializer', async t => {
  const { report, findings } = await inspectView(t, `struct HomeView: View {
    @SwiftUI.State private var viewModel: MyApp.HomeViewModel
    init(launch: LaunchSnapshot) {
      self._viewModel = SwiftUI.State<MyApp.HomeViewModel>(wrappedValue: .init(launch: launch))
    }
    var body: some View { Text("Home") }
  }`);
  assert.equal(report.screens[0].ownsViewModel, true);
  assert.deepEqual(findings.map(item => item.code), [
    'screen-initializer-inputs', 'view-model-initializer-construction'
  ]);
});

test('recognizes a named detail ViewModel initializer call', async t => {
  const { report, findings } = await inspectView(t, `struct HomeView: View {
    @State private var viewModel: HomeViewModel
    init(launch: LaunchSnapshot) {
      _viewModel = State<HomeViewModel>(initialValue: HomeViewModel.init(launch: launch))
    }
    var body: some View { Text("Home") }
  }`);
  assert.equal(report.screens[0].ownsViewModel, true);
  assert.deepEqual(findings.map(item => item.code), [
    'screen-initializer-inputs', 'view-model-initializer-construction'
  ]);
});

test('comparing a ViewModel in init does not count as assigning its state', async t => {
  const { report, findings } = await inspectView(t, `struct HomeView: View {
    @State private var viewModel = HomeViewModel()
    init() { _ = viewModel === HomeViewModel() }
    var body: some View { Text("Home") }
  }`);
  assert.equal(report.screens[0].ownsViewModel, true);
  assert.deepEqual(findings, []);
});

test('reviews independent Tasks inside SwiftUI refresh callbacks', async t => {
  const { report } = await inspectView(t, `struct HomeView: View {
    @State private var viewModel = HomeViewModel()
    var body: some View {
      Text("Home").refreshable {
        await viewModel.refresh()
        Task(operation: { await viewModel.refresh() })
      }
      .refreshable(action: {
        Task { await viewModel.refresh() }
      })
      .task(id: selection(operation: { Task {} }), priority: .userInitiated, operation: {
        Task { await viewModel.refresh() }
      })
    }
  }`);
  const findings = report.findings.filter(item => item.code === 'task-inside-view-lifecycle');
  assert.deepEqual(findings.map(item => item.line), [6, 9, 12]);
  assert.match(findings[0].message, /\.refreshable/);
});

test('rejects a screen changed between inventory and inspection', async t => {
  const readFile = fs.readFile;
  let screenReads = 0;
  t.mock.method(fs, 'readFile', async (file, ...options) => {
    const contents = await readFile(file, ...options);
    if (String(file).endsWith(viewPath) && ++screenReads === 2) {
      return contents.replace('HomeViewModel()', 'OtherViewModel()');
    }
    return contents;
  });
  await assert.rejects(inspectView(t, `struct HomeView: View {
    @State private var viewModel = HomeViewModel()
    var body: some View { Text("Home") }
  }`), /Source changed during inspection: .*HomeView\.swift/);
});

test('reviews a direct Feature call even when the screen owns a ViewModel', async t => {
  const {report} = await inspectView(t, `struct HomeView: View {
    @State private var viewModel = HomeViewModel()
    var body: some View {
      Text("Home").task { await AppModel.shared.homeFeature.refresh() }
    }
  }`);
  assert.equal(report.screens[0].ownsViewModel, true);
  assert.equal(report.findings.find(item => item.code === 'view-feature-access')?.line, 4);
});

test('reviews direct Feature access in an extension of a scanned screen', async t => {
  const extensionFile = 'App/1 - View/Views/Home/HomeView+Actions.swift';
  const {report} = await inspectView(t, `struct HomeView: View {
    @State private var viewModel = HomeViewModel()
    var body: some View { Text("Home") }
  }`, {
    [extensionFile]: `extension HomeView {
      func refresh() async { await AppModel.shared.home.refresh() }
    }`,
    'App/2 - AppModel/AppModel.swift': 'final class AppModel { let home: HomeFeature }'
  });
  const findings = report.findings.filter(item => item.code === 'view-feature-access');
  assert.deepEqual(findings.map(({file, line}) => [file, line]), [[extensionFile, 2]]);
});

test('reviews Feature access when a View declares its conformance in an extension', async t => {
  const extensionFile = 'App/Presentation/HomeView+Body.swift';
  const {report} = await inspectView(t, 'struct HomeView { @State private var viewModel = HomeViewModel(); var title: String { AppModel.shared.homeFeature.title } }', {
    [extensionFile]: 'extension HomeView: SwiftUI.View { var body: some View { Text(AppModel.shared.homeFeature.title) } }',
    'App/Presentation/HomeView+Actions.swift': 'extension HomeView { func refresh() async { await AppModel.shared.homeFeature.refresh() } }',
    'App/2 - AppModel/AppModel.swift': 'final class AppModel { let homeFeature: HomeFeature }'
  });
  assert.equal(report.screens[0].ownsViewModel, true);
  assert.deepEqual(report.findings.filter(item => item.code === 'view-feature-access').map(item => item.file).sort(),
    ['App/1 - View/Views/Home/HomeView.swift', 'App/Presentation/HomeView+Actions.swift', extensionFile]);
});

test('recognizes detail ViewModel ownership when the initializer is in an extension', async t => {
  const file = 'App/Presentation/HomeView+Init.swift';
  const {report} = await inspectView(t, 'struct HomeView: View { @State private var viewModel: HomeViewModel; var body: some View { Text("Home") } }', {
    [file]: 'extension HomeView { init(snapshot: HomeSnapshot) { _viewModel = State(initialValue: HomeViewModel(snapshot: snapshot)) } }'
  });
  assert.equal(report.screens[0].ownsViewModel, true);
  assert.equal(report.findings.find(item => item.code === 'view-model-initializer-construction')?.file, file);
});

test('recognizes escaped detail ViewModel backing storage and reports naming separately', async t => {
  const {report} = await inspectView(t, `struct HomeView: View {
    @State private var \`default\`: HomeViewModel
    init(snapshot: HomeSnapshot) {
      self.\`_default\` = State(wrappedValue: HomeViewModel(snapshot: snapshot))
    }
    var body: some View { Text("Home") }
  }`);
  assert.equal(report.screens[0].ownsViewModel, true);
  assert.equal(report.findings.find(item => item.code === 'view-model-property-name')?.line, 2);
  assert.equal(report.findings.find(item => item.code === 'view-model-initializer-construction')?.line, 3);
});

test('an initializer assignment to another instance does not establish screen ownership', async t => {
  const {report} = await inspectView(t, `struct HomeView: View {
    @State private var viewModel: HomeViewModel
    init(snapshot: HomeSnapshot) {
      self = Self.preview
      var other = self
      other._viewModel = State(initialValue: HomeViewModel(snapshot: snapshot))
      other . \`_viewModel\` = State(initialValue: HomeViewModel(snapshot: snapshot))
    }
    var body: some View { Text("Home") }
  }`);
  assert.equal(report.screens[0].ownsViewModel, false);
  assert.ok(!report.findings.some(item => item.code === 'view-model-initializer-construction'));
});

test('reviews a View storing an inferred AppModel alias without confusing locals or Feature access', async t => {
  const file = 'App/Presentation/ModelAliasView.swift';
  const {report} = await inspectView(t, '', {
    [file]: `struct ModelAliasView: View {
      private let feature = AppModel.shared.notesFeature
      private let graph = AppModel.shared
      private let données = App.AppModel.shared
      var body: some View { Text(graph.notesFeature.title) }
    }
    struct LocalAliasView: View {
      var body: some View {
        let graph = AppModel.shared
        Text(graph.notesFeature.title)
      }
    }`
  });
  assert.deepEqual(report.findings.filter(item => item.code === 'stored-app-model').map(item => [item.file, item.line]),
    [[file, 3], [file, 4]]);
});

test('reviews typed and inferred AppModel storage in a screen ViewModel', async t => {
  const file = viewPath.replace('View.swift', 'ViewModel.swift');
  const {report} = await inspectView(t, `struct HomeView: View {
    @State private var viewModel = HomeViewModel()
    var body: some View { Text("Home") }
  }`, {
    [file]: `final class HomeViewModel {
      private let notesFeature = AppModel.shared.notesFeature
      private let graph = AppModel.shared
      private let typedGraph: AppModel = AppModel.shared
      func example() { let graph = AppModel.shared }
    }`
  });
  assert.deepEqual(report.findings.filter(item => item.code === 'stored-app-model').map(item => [item.file, item.line]),
    [[file, 4], [file, 3]]);
});

test('resolves dependencies from the screen ViewModel and its extensions', async t => {
  const file = viewPath.replace('View.swift', 'ViewModel.swift');
  const extensionFile = 'App/Presentation/HomeViewModel+History.swift';
  const {report} = await inspectView(t, 'struct HomeView: View { @State private var viewModel = HomeViewModel(); var body: some View { Text("Home") } }', {
    [file]: 'final class HomeViewModel { let home = AppModel.shared.homeFeature }\nfinal class OtherViewModel { let settings = AppModel.shared.settingsFeature }',
    [extensionFile]: 'extension HomeViewModel {\n func showHistory() { AppModel.shared.historyFeature.load() }\n func load() { AppModel.shared.networking.request() }\n}',
    'App/2 - AppModel/AppModel.swift': 'final class AppModel { let homeFeature: HomeFeature; let settingsFeature: SettingsFeature; let historyFeature: HistoryFeature; let networking: NetworkingManager }'
  });
  assert.deepEqual(report.screens[0].dependencies.map(({property, sourceFile, line}) => [property, sourceFile, line]), [
    ['homeFeature', file, 1],
    ['historyFeature', extensionFile, 2]
  ]);
  const service = report.findings.find(item => item.code === 'view-model-non-feature-dependency');
  assert.deepEqual([service?.file, service?.line], [extensionFile, 3]);
});

test('reviews a lower-level service injected directly into a screen ViewModel', async t => {
  const file = viewPath.replace('View.swift', 'ViewModel.swift');
  const extensionFile = 'App/Presentation/HomeViewModel+Init.swift';
  const {report} = await inspectView(t, 'struct HomeView: View { @State private var viewModel = HomeViewModel() }', {
    [file]: 'final class HomeViewModel {\n init(repository: any NotesRepository, network: NetworkingManager) {}\n init(notesFeature: NotesFeature) {}\n}',
    [extensionFile]: 'extension HomeViewModel {\n convenience init(network: NetworkingManager) { self.init(notesFeature: AppModel.shared.notesFeature) }\n}'
  });
  const findings = report.findings.filter(item => item.code === 'view-model-non-feature-dependency');
  assert.deepEqual(findings.map(({file, line}) => [file, line]), [[file, 2], [extensionFile, 2]]);
  assert.match(findings[0].message, /NotesRepository, NetworkingManager/);
});

test('reviews stored ViewModel services without an explicit initializer', async t => {
  const file = viewPath.replace('View.swift', 'ViewModel.swift');
  const {report} = await inspectView(t, 'struct HomeView: View { @State private var viewModel = HomeViewModel() }', {
    [file]: `final class HomeViewModel {
      private let dépôt: (any App.NotesRepository)? = nil
      private var computed: NotesRepository? { nil }
      private var snapshot: NotesRepository.Snapshot?
      func example() { let local: NetworkingManager = .init() }
    }`
  });
  assert.deepEqual(report.findings.filter(item => item.code === 'view-model-non-feature-dependency')
    .map(({file, line}) => [file, line]), [[file, 2]]);
});

test('reviews memberwise ViewModel input with a Unicode property name', async t => {
  const file = 'App/Presentation/RefreshButton.swift';
  const {report} = await inspectView(t, '', {
    [file]: `struct RefreshButton: View {
      let modèle: HomeViewModel
      var body: some View { Button("Refresh") { modèle.refresh() } }
    }`
  });
  assert.deepEqual(report.findings.filter(item => item.code === 'view-model-input-storage')
    .map(({file, line}) => [file, line]), [[file, 2]]);
});

test('reviews a defaulted mutable memberwise ViewModel input', async t => {
  const file = 'App/Presentation/RefreshButton.swift';
  const {report} = await inspectView(t, '', {
    [file]: `struct RefreshButton: View {
      var model = HomeViewModel()
      var controller: HomeViewModel = HomeViewModel()
      private let helper: HomeViewModel = HomeViewModel()
      private var ownedHelper = HomeViewModel()
      var body: some View { Button("Refresh") { controller.refresh() } }
    }`
  });
  assert.deepEqual(report.findings.filter(item => item.code === 'view-model-input-storage')
    .map(({file, line}) => [file, line]), [[file, 2], [file, 3]]);
});

test('reviews shared ViewModel storage on the View type', async t => {
  const {report} = await inspectView(t, `struct HomeView: View {
    private static let sharedModel = HomeViewModel()
    static var computed: HomeViewModel { HomeViewModel() }
    var body: some View { Text("Home") }
  }`);
  assert.deepEqual(report.findings.filter(item => item.code === 'view-model-static-storage')
    .map(({line}) => line), [2]);
  assert.ok(!report.findings.some(item => item.code === 'view-model-input-storage'));
});

test('reviews ViewModels injected through the SwiftUI environment', async t => {
  const {report} = await inspectView(t, `struct HomeView: View {
    @Environment(HomeViewModel.self) private var model: HomeViewModel
    @SwiftUI.EnvironmentObject private var legacy: HomeViewModel
    @Environment(\\.dismiss) private var dismiss: DismissAction
    var body: some View { Text("Home") }
  }`);
  assert.deepEqual(report.findings.filter(item => item.code === 'view-model-environment-input')
    .map(({line}) => line), [2, 3]);
});

test('points to a ViewModel constructed for environment injection', async t => {
  const {report} = await inspectView(t, `struct HomeView: View {
    var body: some View {
      DetailsView()
        .environment(Example.DetailsViewModel())
        .environmentObject(LegacyViewModel.init())
        .environment(Theme())
    }
  }`);
  assert.deepEqual(report.findings.filter(item => item.code === 'view-model-environment-provider')
    .map(({line}) => line), [4, 5]);
});

test('reviews ViewModel injection from the app scene', async t => {
  const file = 'App/ExampleApp.swift';
  const {report} = await inspectView(t, '', {
    [file]: `struct ExampleApp: App {
      var body: some Scene {
        WindowGroup { HomeView().environment(HomeViewModel()) }
      }
    }`
  });
  assert.deepEqual(report.findings.filter(item => item.code === 'view-model-environment-provider')
    .map(item => [item.file, item.line]), [[file, 3]]);
});

test('reviews ViewModel environment injection in a separate View extension', async t => {
  const file = 'App/Presentation/HomeView+Body.swift';
  const {report} = await inspectView(t, 'struct HomeView: View {}', {
    [file]: `extension HomeView {
      var body: some View {
        DetailsView().environment(DetailsViewModel())
      }
    }`
  });
  assert.deepEqual(report.findings.filter(item => item.code === 'view-model-environment-provider')
    .map(item => [item.file, item.line]), [[file, 3]]);
});

test('points to environment injection from a typed ViewModel property', async t => {
  const {report} = await inspectView(t, `struct HomeView: View {
    private let model: HomeViewModel = HomeViewModel()
    private let theme: Theme = Theme()
    var body: some View {
      DetailsView().environment(self.model).environment(self.theme)
    }
  }`);
  assert.deepEqual(report.findings.filter(item => item.code === 'view-model-environment-provider')
    .map(({line}) => line), [5]);
});
