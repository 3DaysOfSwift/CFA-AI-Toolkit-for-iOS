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

test('selected detail data and owned State are reviewed rather than rejected', async t => {
  const { report, findings } = await inspectView(t, `struct HomeView: View {
    @State private var reminders: HomeViewModel
    init(launch: LaunchSnapshot) {
      _reminders = State(initialValue: HomeViewModel(launch: launch))
    }
    var body: some View { Text("Home") }
  }`);
  assert.equal(report.screens[0].ownsViewModel, true);
  assert.equal(report.findings.find(item => item.code === 'view-model-property-name')?.line, 2);
  assert.ok(findings.length > 0);
  assert.ok(findings.every(item => item.severity === 'review'));
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
  '@State private var reminders: HomeViewModel = .init()',
  '@State private var reminders: MyApp.HomeViewModel = MyApp.HomeViewModel()',
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
    if (declaration.includes('reminders')) {
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
  assert.deepEqual(findings.map(item => item.code), ['view-model-ownership']);
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

test('flags possible screen-owned task handles without flagging lifecycle tasks', async t => {
  const { report } = await inspectView(t, `struct HomeView: View {
    @State private var viewModel = HomeViewModel()
    @State private var refreshTask: Task<Void, Never>?
    private let otherTask = Task {}
    var body: some View {
      Text("Home").task {
        let localTask = Task {}
        await localTask.value
      }
    }
  }`);
  assert.deepEqual(
    report.findings.filter(item => item.code === 'screen-task-handle').map(item => item.line),
    [3, 4]
  );
  assert.deepEqual(
    report.findings.filter(item => item.code === 'task-inside-view-lifecycle').map(item => item.line),
    [7]
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
    @State private var viewModel: MyApp.HomeViewModel
    init(launch: LaunchSnapshot) {
      self._viewModel = State<MyApp.HomeViewModel>(wrappedValue: .init(launch: launch))
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
    }
  }`);
  const findings = report.findings.filter(item => item.code === 'task-inside-view-lifecycle');
  assert.deepEqual(findings.map(item => item.line), [6]);
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
