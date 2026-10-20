import fs from 'node:fs/promises';
import path from 'node:path';
import { analyse, maskSwift } from './analyse.mjs';

const screenPath = /(?:^|\/)1 - View\/Views\/.*View\.swift$/;
const featureTypeSuffix = /Feature(?:API)?$/;

function featurePropertyName(type) {
  const domain = type.replace(/Feature(?:API)?$/, '');
  return domain ? `${domain[0].toLowerCase()}${domain.slice(1)}Feature` : null;
}

function lineOf(source, index) {
  return source.slice(0, index).split('\n').length;
}

function finding(code, severity, message, file, line) {
  return { code, severity, message, file, line };
}

function screenName(file) {
  return path.posix.basename(file, '.swift');
}

/** A lexical route inventory, not a Swift compiler or proof of CFA conformance. */
export async function inspect(project) {
  const root = await fs.realpath(project);
  const inventory = await analyse(root, { includeTests: true });
  const sources = new Map();
  for (const file of inventory.files) {
    sources.set(file.path, maskSwift(await fs.readFile(path.join(root, file.path), 'utf8')));
  }
  const paths = new Set(sources.keys());
  const appModelFile = [...paths].find(file => /(?:^|\/)2 - AppModel\/AppModel\.swift$/.test(file));
  const appModel = appModelFile ? sources.get(appModelFile) : '';
  const appProperties = new Map();
  for (const match of appModel.matchAll(/\b(?:let|var)\s+(\w+)\s*:\s*(?:any\s+)?(\w+)/g)) {
    appProperties.set(match[1], { type: match[2], line: lineOf(appModel, match.index) });
  }

  const findings = [];
  if (!appModelFile) findings.push(finding('app-model-missing', 'warning', 'No AppModel.swift was found under 2 - AppModel.', null, null));
  for (const [name, property] of appProperties) {
    const declarationFile = inventory.files.find(file => file.declarations.some(declaration => declaration.name === property.type))?.path;
    const isFeature = featureTypeSuffix.test(property.type) || /(?:^|\/)Features\/[^/]+\//.test(declarationFile ?? '');
    if (!isFeature) continue;
    if (!featureTypeSuffix.test(property.type)) {
      findings.push(finding('feature-type-name', 'warning', `${property.type} is exposed as a feature; new concrete feature owners use the Feature suffix.`, appModelFile, property.line));
    }
    const expected = featurePropertyName(featureTypeSuffix.test(property.type)
      ? property.type
      : `${property.type.replace(/Manager$/, '')}Feature`);
    if (name !== expected) {
      findings.push(finding('feature-property-name', 'warning', `${name} should use the same domain name as ${property.type}, ending in Feature${featureTypeSuffix.test(property.type) ? ` (${expected})` : ''}.`, appModelFile, property.line));
    }
  }

  const screens = [];
  for (const viewFile of [...paths].filter(file => screenPath.test(file) && !file.endsWith('/RootTabView.swift')).sort()) {
    const view = sources.get(viewFile);
    const name = screenName(viewFile);
    if (!new RegExp(`\\bstruct\\s+${name}\\s*:\\s*View\\b`).test(view)) continue;
    const viewModelName = `${name}Model`;
    const viewModelFile = viewFile.replace(/View\.swift$/, 'ViewModel.swift');
    const viewModel = sources.get(viewModelFile);
    const testName = `${viewModelName}Tests.swift`;
    const testFile = [...paths].find(file => file.endsWith(`/${testName}`)) ?? null;
    const statePattern = new RegExp(`@State\\s+(?:private\\s+)?var\\s+viewModel\\s*=\\s*${viewModelName}\\s*\\(`);
    const ownsViewModel = statePattern.test(view);
    const dependencies = [];
    if (viewModel) {
      for (const match of viewModel.matchAll(/\bAppModel\s*\.\s*shared\s*\.\s*(\w+)/g)) {
        const property = match[1];
        const exposure = appProperties.get(property);
        const featureType = exposure?.type ?? null;
        const featureFile = featureType
          ? inventory.files.find(file => file.declarations.some(declaration => declaration.name === featureType))?.path ?? null
          : null;
        const featureSource = featureFile ? sources.get(featureFile) : '';
        const collaborators = [...featureSource.matchAll(/\b(?:private\s+)?let\s+\w+\s*:\s*(?:any\s+)?(\w+(?:Repository|Provider|Responding|Client|Store|Service))\b/g)]
          .map(item => item[1]);
        dependencies.push({ property, featureType, featureFile, collaborators: [...new Set(collaborators)], line: lineOf(viewModel, match.index) });
        if (!exposure) findings.push(finding('unresolved-feature', 'warning', `${viewModelName} references AppModel.shared.${property}, but that property was not found.`, viewModelFile, lineOf(viewModel, match.index)));
        else if (!featureFile) findings.push(finding('feature-source-missing', 'warning', `${featureType} is exposed by AppModel but its source declaration was not found.`, appModelFile, exposure.line));
        if (exposure && featureTypeSuffix.test(featureType)) {
          for (const local of viewModel.matchAll(/\b(?:let|var)\s+(\w+)\s*:\s*(?:any\s+)?(\w+Feature(?:API)?)\b/g)) {
            if (featurePropertyName(local[2]) === property && local[1] !== property) {
              findings.push(finding('feature-reference-name', 'warning', `${viewModelName} stores ${featureType} as ${local[1]}; use ${property}.`, viewModelFile, lineOf(viewModel, local.index)));
            }
          }
          for (const initializer of viewModel.matchAll(/\binit\s*\(\s*(\w+)\s*:\s*(?:any\s+)?\w+Feature(?:API)?\s*=\s*AppModel\s*\.\s*shared\s*\.\s*(\w+)/g)) {
            if (initializer[2] === property && initializer[1] !== property) {
              findings.push(finding('feature-parameter-name', 'warning', `${viewModelName} receives ${property} as ${initializer[1]}; use ${property} for the initializer label.`, viewModelFile, lineOf(viewModel, initializer.index)));
            }
          }
        }
      }
    }
    if (!viewModel) findings.push(finding('view-model-missing', 'warning', `${name} has no adjacent ${viewModelName}.`, viewFile, 1));
    else {
      if (!ownsViewModel) findings.push(finding('view-model-ownership', 'warning', `${name} does not visibly own @State viewModel = ${viewModelName}().`, viewFile, 1));
      if (!dependencies.length) findings.push(finding('feature-route-unresolved', 'review', `${viewModelName} has no visible AppModel.shared feature route; inspect whether this screen is presentation-only.`, viewModelFile, 1));
      if (!testFile) findings.push(finding('view-model-tests-missing', 'warning', `No ${testName} was found.`, viewModelFile, 1));
    }
    screens.push({ name, viewFile, viewModelFile: viewModel ? viewModelFile : null, ownsViewModel, testFile, dependencies });
  }

  return {
    schemaVersion: 2,
    project: path.basename(root),
    sourceFingerprint: inventory.sourceFingerprint,
    method: 'Lexical source inspection; verify findings against Swift semantics and target membership.',
    scope: { swiftFiles: inventory.scope.fileCount, screens: screens.length, skipped: inventory.scope.skipped },
    appModelFile: appModelFile ?? null,
    screens,
    findings,
    limitations: [
      'This does not type-check Swift or resolve target membership, protocols, runtime behaviour, or test results.',
      'Unusual declarations, macros, generated code, and custom composition routes may be missed.',
      'A visible route is not proof that business rules, concurrency, persistence, or UI behaviour are correct.'
    ]
  };
}

export function renderInspection(report) {
  const lines = [`CFA inspection: ${report.project}`, `${report.scope.screens} screens · ${report.scope.swiftFiles} Swift files · ${report.findings.length} findings`, ''];
  for (const screen of report.screens) {
    const routes = screen.dependencies.map(dependency => `${dependency.property}${dependency.featureType ? ` (${dependency.featureType})` : ' (unresolved)'}`);
    lines.push(`${screen.name}: ${screen.viewModelFile ? screenName(screen.viewModelFile) : 'missing ViewModel'} → ${routes.join(', ') || 'no visible feature route'} · ${screen.testFile ? 'tests found' : 'no tests found'}`);
  }
  if (report.findings.length) {
    lines.push('', 'Findings:');
    for (const item of report.findings) lines.push(`- ${item.severity.toUpperCase()} ${item.code}: ${item.message}${item.file ? ` (${item.file}:${item.line})` : ''}`);
  }
  lines.push('', 'Lexical inventory only; review findings before changing code. No tests were run.');
  return lines.join('\n');
}
