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
  '@State private var viewModel: HomeViewModel = .init()'
]) {
  test('accepts private inline no-argument ownership: ' + declaration, async t => {
    const { report, findings } = await inspectView(t, `struct HomeView: View {
      ${declaration}
      var body: some View { Text("Home") }
    }`);
    assert.equal(report.screens[0].ownsViewModel, true);
    assert.deepEqual(findings, []);
  });
}

for (const declaration of [
  '@State var viewModel = HomeViewModel()',
  '@State private var viewModel = HomeViewModel(homeFeature: feature)',
  '@State private var viewModel = makeViewModel()',
  '@State private var viewModel =\n HomeViewModel()'
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
