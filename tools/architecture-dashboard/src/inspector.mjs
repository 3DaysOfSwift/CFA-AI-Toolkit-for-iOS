import fs from 'node:fs/promises';
import path from 'node:path';
import { analyse, maskSwift, scanSource } from './analyse.mjs';

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

function braceBody(source, openingBrace) {
  let depth = 0;
  for (let index = openingBrace; index < source.length; index++) {
    if (source[index] === '{') depth++;
    if (source[index] === '}' && --depth === 0) return source.slice(openingBrace + 1, index);
  }
  return source.slice(openingBrace + 1);
}

// Keep only direct member signatures. Mask method/nested-type bodies without
// changing offsets, so a nested example cannot satisfy the screen's ownership.
function memberSignatures(body) {
  let depth = 0;
  return body.split('').map(character => {
    if (character === '{') { depth++; return ' '; }
    if (character === '}') { depth--; return ' '; }
    return depth > 0 && character !== '\n' ? ' ' : character;
  }).join('');
}

function closingParenthesis(source, opening) {
  let depth = 0;
  for (let index = opening; index < source.length; index++) {
    if (source[index] === '(') depth++;
    if (source[index] === ')' && --depth === 0) return index;
  }
  return -1;
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
  const appModelFiles = [...paths].filter(file => /(?:^|\/)2 - AppModel\/AppModel\.swift$/.test(file));
  const appModelFile = appModelFiles.length === 1 ? appModelFiles[0] : null;
  const appModel = appModelFile ? sources.get(appModelFile) : '';
  const appModelDeclaration = /\bclass\s+AppModel\b[^\{]*\{/.exec(appModel);
  const appModelBodyStart = appModelDeclaration ? appModelDeclaration.index + appModelDeclaration[0].length : 0;
  // Keep original offsets while excluding unrelated types and method-local values.
  const appMembers = appModelDeclaration
    ? appModel.slice(0, appModelBodyStart).replace(/[^\n]/g, ' ') + memberSignatures(braceBody(appModel, appModelBodyStart - 1))
    : '';
  const appProperties = new Map();
  for (const match of appMembers.matchAll(/\b(?:let|var)\s+(\w+)\s*:\s*(?:any\s+)?(\w+)/g)) {
    appProperties.set(match[1], { type: match[2], line: lineOf(appModel, match.index) });
  }

  const declarationsByName = new Map();
  for (const file of inventory.files) {
    for (const declaration of file.declarations) {
      if (!declarationsByName.has(declaration.name)) declarationsByName.set(declaration.name, []);
      declarationsByName.get(declaration.name).push({file: file.path, declaration});
    }
  }

  const findings = [];
  if (!appModelFiles.length) findings.push(finding('app-model-missing', 'warning', 'No AppModel.swift was found under 2 - AppModel.', null, null));
  if (appModelFiles.length > 1) {
    findings.push(finding('app-model-ambiguous', 'review', `Multiple AppModel files were found: ${appModelFiles.join(', ')}. Verify target membership or inspect one app directory at a time before attributing Feature routes.`, null, null));
  }
  if (appModelFile) {
    const liveFactories = [...appMembers.matchAll(/\bstatic\s+func\s+live\s*\(/g)];
    if (liveFactories.length !== 1) findings.push(finding('app-model-live-factory', 'review', `Found ${liveFactories.length} static live() declarations directly inside AppModel. Verify the single production factory, including extensions and active compilation conditions.`, appModelFile, 1));
    for (const match of appMembers.matchAll(/^[ \t]*(?:@[\w.]+(?:\([^\n)]*\))?[ \t]+)*(private[ \t]+)?(?:private\(set\)[ \t]+)?(?:let|var)[ \t]+(\w+)[ \t]*:[ \t]*(?:any[ \t]+)?(\w+)(?:<[^;\n=]*>)?[?!]?([ \t]*=(?!=))?/gm)) {
      const [, privateModifier, name, type, defaultValue] = match;
      if (defaultValue) findings.push(finding('app-model-default-value', 'warning', `AppModel property ${name} has a default value; initialise it in the explicit initializer.`, appModelFile, lineOf(appModel, match.index)));
      if (type === 'Bool' && privateModifier) {
        // A declaration's order and type do not establish its purpose.
        findings.push(finding('app-model-boolean-purpose', 'review', `AppModel declares private Bool ${name}; verify whether it is the launch guard and whether its initialization and use follow the AppModel rules.`, appModelFile, lineOf(appModel, match.index)));
        continue;
      }
      // Lexical analysis cannot establish whether this is an app-wide listener.
      if (type === 'Task' && privateModifier) {
        findings.push(finding('app-model-task-purpose', 'review', `AppModel retains ${name}; verify it owns an app-wide listener and that its lifecycle is managed.`, appModelFile, lineOf(appModel, match.index)));
        continue;
      }
      if (!featureTypeSuffix.test(type)) findings.push(finding('app-model-non-feature-state', 'warning', `AppModel stores ${name}: ${type}; check that it is a Feature, launch guard or private app-wide listener handle.`, appModelFile, lineOf(appModel, match.index)));
    }
  }
  for (const [name, property] of appProperties) {
    const candidates = declarationsByName.get(property.type) || [];
    const source = candidates.length === 1 ? candidates[0] : null;
    const declarationFile = source?.file;
    const isFeature = featureTypeSuffix.test(property.type) || /(?:^|\/)Features\/[^/]+\//.test(declarationFile ?? '');
    if (!isFeature) continue;
    if (candidates.length > 1) {
      findings.push(finding('feature-source-ambiguous', 'review', `${property.type} has multiple declarations. Verify which declaration belongs to the active target before assessing placement or collaborators.`, appModelFile, property.line));
    }
    if (!featureTypeSuffix.test(property.type)) {
      findings.push(finding('feature-type-name', 'warning', `${property.type} is exposed as a feature; new concrete feature owners use the Feature suffix.`, appModelFile, property.line));
    }
    const expected = featurePropertyName(featureTypeSuffix.test(property.type)
      ? property.type
      : `${property.type.replace(/Manager$/, '')}Feature`);
    if (name !== expected) {
      findings.push(finding('feature-property-name', 'warning', `${name} should use the same domain name as ${property.type}, ending in Feature${featureTypeSuffix.test(property.type) ? ` (${expected})` : ''}.`, appModelFile, property.line));
    }
    if (featureTypeSuffix.test(property.type) && !property.type.endsWith('API')) {
      const declaration = source?.declaration;
      const featureFolder = path.posix.join(path.posix.dirname(appModelFile), 'Features');
      const relative = declarationFile && path.posix.relative(featureFolder, declarationFile);
      if (declaration?.type === 'class' && (relative.startsWith('../') || !relative.includes('/'))) {
        findings.push(finding('feature-placement', 'review', `${property.type} is outside a named subfolder of ${featureFolder}. Verify the intended package and target placement before moving it.`, declarationFile, declaration.line));
      }
      const testName = `${property.type}Tests.swift`;
      if (![...paths].some(file => file.split('/').includes('FeatureTests') && path.posix.basename(file) === testName)) {
        findings.push(finding('feature-tests-missing', 'review', `No ${testName} was found under FeatureTests in the scanned directory. Check the project root and test target before concluding the test is missing.`, appModelFile, property.line));
      }
    }
  }

  // A matching FeatureAPI protocol is a review hint: lexical scanning cannot
  // resolve conditional compilation, target membership or legacy boundaries.
  const concreteFeatures = new Set();
  for (const source of sources.values()) {
    for (const match of source.matchAll(/\bclass\s+(\w+Feature)\b/g)) concreteFeatures.add(match[1]);
  }
  for (const [file, source] of sources) {
    for (const match of source.matchAll(/\bprotocol\s+(\w+FeatureAPI)\b/g)) {
      const feature = match[1].slice(0, -3);
      if (concreteFeatures.has(feature)) {
        findings.push(finding('matching-feature-protocol', 'review', `${match[1]} has a matching ${feature} declaration. Verify whether the app can use the concrete Feature and substitute its lower-level collaborators.`, file, lineOf(source, match.index)));
      }
    }
  }

  const screens = [];
  const usesSwiftData = [...sources].some(([file, source]) => file.endsWith('.swift') && /\bimport\s+SwiftData\b/.test(source));
  if (usesSwiftData && ![...paths].some(file => file.endsWith('/SwiftDataManager.swift'))) {
    findings.push(finding('swiftdata-manager-missing', 'review', 'SwiftData is imported, but no SwiftDataManager.swift was found. Check whether the import belongs to an app target and whether an appropriate storage boundary exists; this scan also includes tests and does not resolve target membership.', null, null));
  }
  for (const [file, source] of sources) {
    if (!file.endsWith('.swift') || file.endsWith('/NetworkingManager.swift')) continue;
    if (/\bURLSession\s*\.|\bURLSession\s*\(/.test(source)) {
      findings.push(finding('direct-url-session', 'review', 'URLSession appears outside NetworkingManager. Check whether this is a production network request that should use a NetworkingManager; shared configuration or instances are needed only when appropriate.', file, 1));
    }
  }
  // Independent work may be scheduled here. Review only closures that
  // appear to call the shared launch signal.
  for (const [file, source] of sources) {
    for (const callback of source.matchAll(/\bfunc\s+application\s*\([^{}]*\bdidFinishLaunchingWithOptions\b[^{}]*\)\s*(?:->\s*[^\{]+)?\s*\{/g)) {
      const start = callback.index + callback[0].length - 1;
      const body = braceBody(source, start);
      for (const scheduled of body.matchAll(/\b(?:Task\s*(?:<[^{}\n]*>\s*)?(?:\.\s*(?:init|detached)\s*)?|DispatchQueue\s*\.\s*(?:main|global\s*\([^{}()]*\))\s*\.\s*async\s*)(?:\([^{}]*\)\s*)?\{/g)) {
        const scheduledBody = braceBody(body, scheduled.index + scheduled[0].length - 1);
        if (/(?<!\bfunc\s+)\bapplicationDidFinishLaunching\s*\(/.test(scheduledBody)) {
          const scheduler = scheduled[0].startsWith('DispatchQueue') ? 'DispatchQueue.async' : 'Task';
          findings.push(finding('scheduled-app-model-launch', 'review', `The launch callback appears to defer the AppModel launch signal through ${scheduler}. Check whether the callback can signal AppModel synchronously while Features own their asynchronous work.`, file, lineOf(source, start + 1 + scheduled.index)));
        }
      }
    }
  }
  for (const [file, source] of sources) {
    if (!/(?:^|\/)1 - View\//.test(file)) continue;
    if (/\bstruct\s+\w+App\s*:\s*App\b/.test(source)) {
      const sceneBody = /\bvar\s+body\s*:\s*some\s+Scene\s*\{/.exec(source);
      if (sceneBody) {
        const body = braceBody(source, sceneBody.index + sceneBody[0].length - 1);
        if (/\b(?:if|switch)\b/.test(body)) findings.push(finding('conditional-app-body', 'review', 'App.body contains a conditional. Check whether it gates root navigation on storage or an unrelated condition.', file, lineOf(source, sceneBody.index)));
        if (/\.modelContainer\s*\(|\b(?:ProgressView|ContentUnavailableView)\s*\(/.test(body)) findings.push(finding('app-startup-presentation', 'review', 'App.body contains storage or loading presentation. Check whether database availability gates the interface; a lexical match alone cannot establish this.', file, lineOf(source, sceneBody.index)));
      }
    }
    // Known root conventions only: this is a review hint, not data-flow analysis.
    // Keep feature-screen conditionals and unrelated adaptive layout out of this check.
    for (const rootView of source.matchAll(/\bstruct\s+(?:ContentView|RootTabView|RootView)\s*:\s*View\b[^\{]*\{/g)) {
      const rootBody = braceBody(source, rootView.index + rootView[0].length - 1);
      if (/\b(?:if|guard|switch)\s+[^\{;\n]*\b\w*(?:container|database|storeReady|storageReady|startupError|launchError)\w*\b/i.test(rootBody)) {
        findings.push(finding('root-storage-gate', 'review', 'Root navigation may gate the interface on storage availability. Open storage within a Feature data request and present its error in the feature screen, never a root wrapper or app-wide blocking overlay.', file, lineOf(source, rootView.index)));
      }
    }
    for (const task of source.matchAll(/\.task\b\s*([({])/g)) {
      let opening = task.index + task[0].length - 1;
      if (task[1] === '(') {
        const closing = closingParenthesis(source, opening);
        if (closing < 0) continue;
        const closure = /^\s*\{/.exec(source.slice(closing + 1));
        if (!closure) continue;
        opening = closing + closure[0].length;
      }
      const lifecycleBody = braceBody(source, opening);
      const bodyStartLine = lineOf(source, opening + 1);
      for (const site of scanSource(lifecycleBody, file).sites) {
        if (site.kind !== 'task' && site.kind !== 'detached') continue;
        findings.push(finding('task-inside-view-lifecycle', 'review', 'A SwiftUI .task body appears to create an independent Task. Verify its lifetime owner. Await lifecycle-bound work directly and give independent screen work a ViewModel owner.', file, bodyStartLine + site.line - 1));
      }
      if (/(?<!\bfunc\s+)\bapplicationDidFinishLaunching\s*\(/.test(lifecycleBody)) {
        findings.push(finding('view-tied-app-launch', 'review', 'A View-layer .task appears to call applicationDidFinishLaunching. Check whether this is production launch behavior rather than a preview or test, and use the app lifecycle callback for the shared launch signal.', file, lineOf(source, task.index)));
      }
    }
    if (/\b(?:let|var)\s+\w+\s*:\s*AppModel\b/.test(source)) findings.push(finding('stored-app-model', 'review', 'An AppModel-typed declaration appears in the View layer. Check whether a View or ViewModel retains it; this lexical match may be a local value or preview.', file, 1));
    if (/\b(?:ModelContainer|ModelContext)\b|@Query\b|\.modelContainer\s*\(|@Environment\s*\(\s*\\\s*\.\s*modelContext\b/.test(source)) findings.push(finding('view-swiftdata-access', 'review', 'SwiftData storage access may appear in a View-layer file. Check whether a View or preview accesses storage directly; previews retain the same CFA boundaries. A lexical match alone does not establish how the value is used.', file, 1));
  }
  for (const viewFile of [...paths].filter(file => screenPath.test(file) && !file.endsWith('/RootTabView.swift')).sort()) {
    const view = sources.get(viewFile);
    const name = screenName(viewFile);
    const declaration = new RegExp(`\\bstruct\\s+${name}\\s*:\\s*View\\b[^\\{]*\\{`).exec(view);
    if (!declaration) continue;
    const bodyOffset = declaration.index + declaration[0].length;
    const body = braceBody(view, bodyOffset - 1);
    const members = memberSignatures(body);
    for (const match of members.matchAll(/\b(?:let|var)\s+(\w+)\s*(?::\s*Task\s*<|(=\s*Task\b))/g)) {
      if (match[2] && !/^\s*[<.{(]/.test(body.slice(match.index + match[0].length))) continue;
      findings.push(finding('screen-task-handle', 'review', `${name} declares ${match[1]} with a possible Task handle. If it stores the handle, move task ownership to the ViewModel.`, viewFile, lineOf(view, bodyOffset + match.index)));
    }
    const viewModelName = `${name}Model`;
    const viewModelFile = viewFile.replace(/View\.swift$/, 'ViewModel.swift');
    const viewModel = sources.get(viewModelFile);
    const viewModelDeclaration = viewModel && new RegExp(`\\bclass\\s+${viewModelName}\\b[^\\{]*\\{`).exec(viewModel);
    const viewModelBodyStart = viewModelDeclaration ? viewModelDeclaration.index + viewModelDeclaration[0].length : 0;
    const viewModelMembers = viewModelDeclaration
      ? viewModel.slice(0, viewModelBodyStart).replace(/[^\n]/g, ' ') + memberSignatures(braceBody(viewModel, viewModelBodyStart - 1))
      : '';
    const testName = `${viewModelName}Tests.swift`;
    const testFile = [...paths].find(file => path.posix.basename(file) === testName) ?? null;
    const statePattern = new RegExp(`@State\\s+private\\s+var\\s+([A-Za-z_]\\w*)(?:\\s*:\\s*${viewModelName})?\\s*=\\s*${viewModelName}\\s*\\(\\s*\\)`);
    const typedStatePattern = new RegExp(`@State\\s+private\\s+var\\s+([A-Za-z_]\\w*)\\s*:\\s*${viewModelName}\\s*=\\s*\\.init\\s*\\(\\s*\\)`);
    const inlineState = statePattern.exec(members) ?? typedStatePattern.exec(members);
    let ownedState = inlineState && { name: inlineState[1], index: inlineState.index };
    const typedStateProperties = [...members.matchAll(new RegExp(
      `@State\\s+private\\s+var\\s+([A-Za-z_]\\w*)\\s*:\\s*${viewModelName}\\b`, 'g'
    ))].map(match => ({ name: match[1], index: match.index }));
    const dependencies = [];
    if (viewModel) {
      for (const initializer of members.matchAll(/(?<![.\w])init[?!]?\s*\(/g)) {
        const opening = initializer.index + initializer[0].length - 1;
        const closing = closingParenthesis(body, opening);
        if (closing < 0) continue;
        const parameters = body.slice(opening + 1, closing);
        if (parameters.trim()) {
          const injectedViewModel = /:\s*(?:any\s+)?\w*ViewModel\b/.test(parameters);
          findings.push(finding('screen-initializer-inputs', injectedViewModel ? 'warning' : 'review', injectedViewModel ? `${name} appears to accept a ViewModel; CFA screens construct their own.` : `${name} accepts initializer inputs. Verify that detail inputs are selected value data and no ViewModel is injected.`, viewFile, lineOf(view, bodyOffset + initializer.index)));
        }
        const tail = body.slice(closing + 1);
        const openingBody = /^\s*(?:(?:async|throws|rethrows)\s*)*\{/.exec(tail);
        if (openingBody) {
          const initializerBody = braceBody(tail, openingBody[0].length - 1);
          const ownConstruction = typedStateProperties.find(({name: property}) => new RegExp(
            `\\b_${property}\\s*=\\s*State\\s*\\(\\s*(?:initialValue|wrappedValue)\\s*:\\s*${viewModelName}\\s*\\(`
          ).test(initializerBody));
          if (parameters.trim() && !/:\s*(?:any\s+)?\w*ViewModel\b/.test(parameters) && ownConstruction) ownedState ??= ownConstruction;
          const assignsViewModel = ['viewModel', ...typedStateProperties.map(property => property.name)].some(property =>
            new RegExp(`\\b_?${property}\\s*=`).test(initializerBody)
          );
          if (assignsViewModel) {
            findings.push(finding('view-model-initializer-construction', 'review', `${name} assigns ViewModel state in init. Verify it constructs its own ViewModel from selected detail data and does not accept an injected ViewModel.`, viewFile, lineOf(view, bodyOffset + initializer.index)));
          }
        }
      }
      for (const match of viewModel.matchAll(/\bAppModel\s*\.\s*shared\s*\.\s*(\w+)/g)) {
        const property = match[1];
        const exposure = appProperties.get(property);
        const featureType = exposure?.type ?? null;
        const candidates = declarationsByName.get(featureType) || [];
        const featureFile = candidates.length === 1 ? candidates[0].file : null;
        const featureSource = featureFile ? sources.get(featureFile) : '';
        const collaborators = [...featureSource.matchAll(/\b(?:private\s+)?let\s+\w+\s*:\s*(?:any\s+)?(\w+(?:Repository|Provider|Responding|Client|Store|Service))\b/g)]
          .map(item => item[1]);
        dependencies.push({ property, featureType, featureFile, collaborators: [...new Set(collaborators)], line: lineOf(viewModel, match.index) });
        if (!exposure) findings.push(finding('unresolved-feature', 'review', `${viewModelName} references AppModel.shared.${property}, but the inspector could not resolve it in the primary AppModel declaration. Check extensions, inferred types and target membership.`, viewModelFile, lineOf(viewModel, match.index)));
        else if (!candidates.length) findings.push(finding('feature-source-missing', 'review', `${featureType} is exposed by AppModel, but the inspector could not locate its declaration. Check aliases, generated code and target membership.`, appModelFile, exposure.line));
        if (exposure && featureTypeSuffix.test(featureType)) {
          for (const local of viewModelMembers.matchAll(/\b(?:let|var)\s+(\w+)\s*:\s*(?:any\s+)?(\w+Feature(?:API)?)\b(?!\s*\.)/g)) {
            if (featurePropertyName(local[2]) === property && local[1] !== property) {
              findings.push(finding('feature-reference-name', 'warning', `${viewModelName} stores ${featureType} as ${local[1]}; use ${property}.`, viewModelFile, lineOf(viewModel, local.index)));
            }
          }
          for (const initializer of viewModelMembers.matchAll(/\binit\s*\(/g)) {
            const opening = initializer.index + initializer[0].lastIndexOf('(');
            const closing = closingParenthesis(viewModelMembers, opening);
            if (closing < 0) continue;
            const parameters = viewModelMembers.slice(opening + 1, closing);
            for (const parameter of parameters.matchAll(/(?:^|,)\s*(\w+)\s*:\s*(?:any\s+)?\w+Feature(?:API)?\s*=\s*AppModel\s*\.\s*shared\s*\.\s*(\w+)/g)) {
              if (parameter[2] === property && parameter[1] !== property) {
                findings.push(finding('feature-parameter-name', 'warning', `${viewModelName} receives ${property} as ${parameter[1]}; use ${property} for the initializer label.`, viewModelFile, lineOf(viewModel, initializer.index)));
              }
            }
          }
        }
      }
    }
    const ownsViewModel = Boolean(ownedState);
    if (ownedState && ownedState.name !== 'viewModel') {
      findings.push(finding('view-model-property-name', 'warning', `${name} owns its ViewModel as ${ownedState.name}; CFA names the property viewModel.`, viewFile, lineOf(view, bodyOffset + ownedState.index)));
    }
    const structuralRoot = name === 'ContentView' && /\bTabView\s*\{/.test(body) && !/\b(?:AppModel|\w+Feature)\b/.test(members);
    if (!viewModel && !structuralRoot) findings.push(finding('view-model-missing', 'review', `${name} has no adjacent ${viewModelName}. Verify whether it is a screen requiring a dedicated ViewModel or a reusable presentation component.`, viewFile, 1));
    else if (viewModel) {
      if (!ownsViewModel) findings.push(finding('view-model-ownership', 'review', `${name} does not use the default inline ViewModel pattern. Verify private ownership; a detail View may construct its own State-backed ViewModel from selected value data.`, viewFile, lineOf(view, declaration.index)));
      if (!dependencies.length) findings.push(finding('feature-route-unresolved', 'review', `${viewModelName} has no visible AppModel.shared feature route; inspect whether this screen is presentation-only.`, viewModelFile, 1));
      if (!testFile) findings.push(finding('view-model-tests-missing', 'review', `No ${testName} was found in the scanned directory. Check the project root and test target before concluding the test is missing.`, viewModelFile, 1));
    }
    screens.push({ name, viewFile, viewModelFile: viewModel ? viewModelFile : null, ownsViewModel, structuralRoot, testFile, dependencies });
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
      'Screen-construction checks use conventionally named screen files and adjacent ViewModels; extension initializers, implicit memberwise inputs, aliases and actual call sites still need manual review.',
      'Root storage-gate detection uses conventional root names and storage identifiers; aliases, helper functions, and blocking overlays require manual failure-path review.',
      'A visible route is not proof that business rules, concurrency, persistence, or UI behaviour are correct.'
    ]
  };
}

export function renderInspection(report) {
  const lines = [`CFA inspection: ${report.project}`, `${report.scope.screens} View candidates · ${report.scope.swiftFiles} Swift files · ${report.findings.length} findings`, ''];
  for (const screen of report.screens) {
    if (screen.structuralRoot && !screen.viewModelFile) {
      lines.push(`${screen.name}: structural tab root · no ViewModel required by this pattern`);
      continue;
    }
    const routes = screen.dependencies.map(dependency => `${dependency.property}${dependency.featureType ? ` (${dependency.featureType})` : ' (unresolved)'}`);
    lines.push(`${screen.name}: ${screen.viewModelFile ? screenName(screen.viewModelFile) : 'no adjacent ViewModel; review screen role'} → ${routes.join(', ') || 'no visible feature route'} · ${screen.testFile ? 'matching test file found' : 'no test file found'}`);
  }
  if (report.findings.length) {
    lines.push('', 'Findings:');
    for (const item of report.findings) lines.push(`- ${item.severity.toUpperCase()} ${item.code}: ${item.message}${item.file ? ` (${item.file}:${item.line})` : ''}`);
  }
  lines.push('', 'Source scan limits:');
  for (const limitation of report.limitations) lines.push('- ' + limitation);
  lines.push('Use this map to guide source review. No tests were run.');
  return lines.join('\n');
}
