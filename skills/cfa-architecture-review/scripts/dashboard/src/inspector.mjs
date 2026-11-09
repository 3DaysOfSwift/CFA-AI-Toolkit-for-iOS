import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { analyse, maskSwift, scanSource } from './analyse.mjs';

const screenPath = /(?:^|\/)1 - View\/Views\/.*View\.swift$/;
const featureTypeSuffix = /Feature(?:API)?$/;

function featurePropertyName(type) {
  const domain = type.replace(/Feature(?:API)?$/, '');
  const lowerCamelDomain = domain.replace(/^[A-Z]+(?=[A-Z][a-z]|$)|^[A-Z]/, prefix => prefix.toLowerCase());
  return domain ? `${lowerCamelDomain}Feature` : null;
}

function hasComputedAccessor(suffix) {
  return /^\s*\{(?!\s*(?:willSet|didSet)\b)/.test(suffix);
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

function* viewInitializers(body) {
  for (const initializer of memberSignatures(body).matchAll(/(?<![.\w])init[?!]?\s*\(/g)) {
    const opening = initializer.index + initializer[0].length - 1;
    const closing = closingParenthesis(body, opening);
    if (closing < 0) continue;
    const parameters = body.slice(opening + 1, closing);
    const injectedViewModel = /:\s*(?:any\s+)?(?:\w+\s*\.\s*)*\w*ViewModel\b(?!\s*\.)/.test(parameters);
    yield { index: initializer.index, closing, parameters, injectedViewModel };
  }
}

function inspectViewModelInputs(name, body, source, start, file, findings) {
  for (const initializer of viewInitializers(body)) {
    if (initializer.injectedViewModel) {
      findings.push(finding('screen-initializer-inputs', 'warning', `${name} appears to accept a ViewModel; CFA screens construct their own.`, file, lineOf(source, start + initializer.index)));
    }
  }
}

function labeledClosureOffset(argumentsText, label) {
  let depth = 0;
  let argumentStart = 0;
  for (const token of argumentsText.matchAll(/[()[\]{},]/g)) {
    const character = token[0];
    if (character === '{' && depth === 0 &&
        argumentsText.slice(argumentStart, token.index).trim().replace(/\s*:\s*$/, ':') === label + ':') {
      return token.index;
    }
    if ('([{'.includes(character)) depth++;
    if (')]}'.includes(character)) depth--;
    if (character === ',' && depth === 0) argumentStart = token.index + 1;
  }
  return -1;
}

function inspectLifecycleClosures(source, file, findings, firstLine = 1) {
  for (const task of source.matchAll(/\.\s*(task|refreshable)\b\s*([({])/g)) {
    let opening = task.index + task[0].length - 1;
    if (task[2] === '(') {
      const closing = closingParenthesis(source, opening);
      if (closing < 0) continue;
      const argumentsText = source.slice(opening + 1, closing);
      const label = task[1] === 'task' ? 'operation' : 'action';
      const inlineClosure = labeledClosureOffset(argumentsText, label);
      if (inlineClosure >= 0) {
        opening += inlineClosure + 1;
      } else {
        const trailingClosure = /^\s*\{/.exec(source.slice(closing + 1));
        if (!trailingClosure) continue;
        opening = closing + trailingClosure[0].length;
      }
    }
    const modifier = `.${task[1]}`;
    const lifecycleBody = braceBody(source, opening);
    const bodyStartLine = firstLine + lineOf(source, opening + 1) - 1;
    for (const site of scanSource(lifecycleBody, file).sites) {
      if (site.kind !== 'task' && site.kind !== 'detached') continue;
      findings.push(finding('task-inside-view-lifecycle', 'review', `A SwiftUI ${modifier} body appears to create an independent Task. Trace its lifetime and cancellation. In CFA, await lifecycle-bound work directly, let the ViewModel own independent screen work, and let the Feature own shared operations that may outlive the screen.`, file, bodyStartLine + site.line - 1));
    }
    if (/(?<!\bfunc\s+)\bapplicationDidFinishLaunching\s*\(/.test(lifecycleBody)) {
      findings.push(finding('view-tied-app-launch', 'review', `A View-layer ${modifier} appears to call applicationDidFinishLaunching. Check whether this is production launch behavior rather than a preview or test, and use the app lifecycle callback for the shared launch signal.`, file, firstLine + lineOf(source, task.index) - 1));
    }
  }
}

/** A lexical route inventory, not a Swift compiler or proof of CFA conformance. */
export async function inspect(project) {
  const root = await fs.realpath(project);
  const inventory = await analyse(root, { includeTests: true });
  const sources = new Map();
  for (const file of inventory.files) {
    const source = await fs.readFile(path.join(root, file.path), 'utf8');
    if (createHash('sha256').update(source).digest('hex') !== file.hash) {
      throw Error(`Source changed during inspection: ${file.path}. Run the inspector again.`);
    }
    // Preserve offsets while making standalone CR line endings visible to line-based patterns.
    sources.set(file.path, maskSwift(source.replace(/\r(?!\n)/g, '\n')));
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
  for (const match of appMembers.matchAll(/\b(?:let|var)\s+(\w+)\s*:\s*(?:any\s+)?(?:\w+\s*\.\s*)*(\w+)/g)) {
    appProperties.set(match[1], {
      type: match[2],
      line: lineOf(appModel, match.index),
      computed: hasComputedAccessor(appModel.slice(match.index + match[0].length))
    });
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
    const liveFactories = [...appMembers.matchAll(/\bstatic\s+func\s+live\s*\(\s*\)\s*->\s*AppModel\b/g)]
      .filter(match => /^\s*\{/.test(appModel.slice(match.index + match[0].length)));
    if (liveFactories.length !== 1) findings.push(finding('app-model-live-factory', 'review', `Found ${liveFactories.length} static live() -> AppModel declarations directly inside AppModel. Verify the single production factory, including extensions and active compilation conditions.`, appModelFile, 1));
    const constructionBodies = liveFactories.map(factory => ({
      name: 'AppModel.live()',
      opening: appModel.indexOf('{', factory.index + factory[0].length)
    }));
    for (const initializer of appMembers.matchAll(/(?<![.\w])init[?!]?\s*\(/g)) {
      const closing = closingParenthesis(appModel, initializer.index + initializer[0].length - 1);
      if (closing < 0) continue;
      const body = /^\s*(?:(?:async|throws|rethrows)\s*)*\{/.exec(appModel.slice(closing + 1));
      if (body) constructionBodies.push({name:'AppModel.init', opening:closing + body[0].length});
    }
    for (const {name, opening} of constructionBodies) {
      const container = /\b(?:SwiftData\s*\.\s*)?ModelContainer\s*\(/.exec(braceBody(appModel, opening));
      if (container) {
        findings.push(finding('app-model-storage-construction', 'review', `${name} references a ModelContainer initializer. Trace whether it opens storage during graph construction. CFA opens the store within the storage owner’s data request.`, appModelFile, lineOf(appModel, opening + 1 + container.index)));
      }
    }
    const sharedInitializer = /\bstatic\s+let\s+shared\s*(?::\s*AppModel\s*)?=/.exec(appMembers);
    if (sharedInitializer) {
      const initializer = appModel.slice(sharedInitializer.index + sharedInitializer[0].length);
      if (!/^\s*(?:(?:AppModel|Self)\s*\.\s*)?live\s*\(\s*\)/.test(initializer)) {
        findings.push(finding('app-model-shared-factory', 'review', 'AppModel.shared does not visibly call live(). Trace its initializer and verify the production graph comes from the single live factory.', appModelFile, lineOf(appModel, sharedInitializer.index)));
      }
    }
    for (const match of appMembers.matchAll(/(?:^|(?<=;))[ \t]*(?:@[\w.]+(?:\([^\n)]*\))?[ \t]+)*(?:(?:private(?:\(set\))?|fileprivate|internal|public|package)[ \t]+)?(?:let|var)[ \t]+(\w+)[ \t]*=(?!=)/gm)) {
      findings.push(finding('app-model-default-value', 'warning', `AppModel property ${match[1]} has a default value; initialise it in the explicit initializer.`, appModelFile, lineOf(appModel, match.index)));
    }
    for (const match of appMembers.matchAll(/(?:^|(?<=;))[ \t]*(?:@[\w.]+(?:\([^\n)]*\))?[ \t]+)*(private[ \t]+)?(?:private\(set\)[ \t]+)?(?:let|var)[ \t]+(\w+)[ \t]*:[ \t]*(?:any[ \t]+)?(?:\w+[ \t]*\.[ \t]*)*(\w+)(?:<[^;\n=]*>)?[?!]?([ \t]*=(?!=))?/gm)) {
      const [, privateModifier, name, type, defaultValue] = match;
      const suffix = appModel.slice(match.index + match[0].length);
      // A getter is not stored state. Property observers still belong to storage.
      if (!defaultValue && hasComputedAccessor(suffix)) continue;
      if (defaultValue) findings.push(finding('app-model-default-value', 'warning', `AppModel property ${name} has a default value; initialise it in the explicit initializer.`, appModelFile, lineOf(appModel, match.index)));
      if (type === 'Bool' && privateModifier) {
        // A declaration's order and type do not establish its purpose.
        findings.push(finding('app-model-boolean-purpose', 'review', `AppModel declares private Bool ${name}; verify whether it is the launch guard and whether its initialization and use follow the AppModel rules.`, appModelFile, lineOf(appModel, match.index)));
        continue;
      }
      // Lexical analysis cannot establish whether this is an app-wide listener.
      if (type === 'Task' && privateModifier) {
        findings.push(finding('app-model-task-purpose', 'review', `AppModel retains ${name}; trace whether startup creates one app-wide listener, whether it forwards events to the owning Feature without a screen present, and how it stops or is replaced when required.`, appModelFile, lineOf(appModel, match.index)));
        continue;
      }
      const declarations = declarationsByName.get(type) || [];
      const isLegacyFeature = declarations.length === 1 && /(?:^|\/)Features\/[^/]+\//.test(declarations[0].file);
      if (!featureTypeSuffix.test(type) && !isLegacyFeature) findings.push(finding('app-model-non-feature-state', 'warning', `AppModel stores ${name}: ${type}; check that it is a Feature, launch guard or private app-wide listener handle.`, appModelFile, lineOf(appModel, match.index)));
    }
  }
  const featureProperties = new Set();
  for (const [name, property] of appProperties) {
    const candidates = declarationsByName.get(property.type) || [];
    const source = candidates.length === 1 ? candidates[0] : null;
    const declarationFile = source?.file;
    const isFeature = featureTypeSuffix.test(property.type) || /(?:^|\/)Features\/[^/]+\//.test(declarationFile ?? '');
    if (!isFeature) continue;
    featureProperties.add(name);
    if (property.computed) {
      findings.push(finding('feature-computed-exposure', 'review', `AppModel exposes ${name} through a computed property. Trace it to the concrete Feature retained by the live graph and check that access does not construct a competing instance.`, appModelFile, property.line));
    }
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
      const testCandidates = [...paths].filter(file => file.split('/').includes('FeatureTests') && path.posix.basename(file) === testName);
      if (testCandidates.length > 1) {
        findings.push(finding('feature-tests-ambiguous', 'review', `Multiple files match ${testName}: ${testCandidates.join(', ')}. Verify which test target covers this Feature.`, appModelFile, property.line));
      }
      if (!testCandidates.length) {
        findings.push(finding('feature-tests-missing', 'review', `No ${testName} was found under FeatureTests in the scanned directory. Check the project root and test target before concluding the test is missing.`, appModelFile, property.line));
      }
    }
  }

  // A stored dependency is evidence of a potential workflow, not a violation.
  for (const [file, source] of sources) {
    for (const declaration of source.matchAll(/\bclass\s+(\w+Feature)\b[^{}]*\{/g)) {
      const bodyStart = declaration.index + declaration[0].length;
      const body = braceBody(source, bodyStart - 1);
      const members = memberSignatures(body);
      for (const property of members.matchAll(/(?:^|(?<=;))[ \t]*(?:(?:private(?:\(set\))?|fileprivate|internal|public)\s+)?(?:let|var)\s+(\w+)\s*(?::\s*((?:\w+\s*\.\s*)*\w+Feature\b(?:\s*[?!])?)(?!\s*[.?!])|=\s*((?:\w+\s*\.\s*)*\w+Feature)\b(?:\s*\.\s*init)?\s*\()/gm)) {
        const end = property.index + property[0].length;
        const [, name, declaredType, constructedType] = property;
        if (declaredType && hasComputedAccessor(body.slice(end))) continue;
        if (constructedType) {
          const close = closingParenthesis(body, end - 1);
          if (close < 0 || /^\s*(?:[.\[]|as[?!]?\b)/.test(body.slice(close + 1))) continue;
        }
        const dependency = declaredType ?? constructedType;
        findings.push(finding('feature-coordination', 'review', `${declaration[1]} stores ${name}: ${dependency}. Trace the workflow and verify that coordination serves a business capability, preserves one owner per state and introduces no dependency cycle.`, file, lineOf(source, bodyStart + property.index)));
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

  function findFeatureAccess(source) {
    const isFeature = name => name.endsWith('Feature') || featureProperties.has(name);
    const direct = [...source.matchAll(/\bAppModel\s*\.\s*shared\s*\.\s*(\w+)/g)]
      .find(match => isFeature(match[1]));
    if (direct) return direct;
    for (const alias of source.matchAll(/\blet\s+([A-Za-z_]\w*)(?:\s*:\s*AppModel)?\s*=\s*AppModel\s*\.\s*shared\b(?!\s*\.)/g)) {
      const access = new RegExp(`(?<![.\\w])${alias[1]}\\s*\\.\\s*(\\w+)`, 'g');
      const start = alias.index + alias[0].length;
      // Keep alias review local. Resolving captures or shadowing needs Swift semantics.
      const remainingScope = memberSignatures(braceBody('{' + source.slice(start), 0));
      const use = [...remainingScope.matchAll(access)].find(match => isFeature(match[1]));
      if (use) {
        use.index += start;
        return use;
      }
    }
  }

  const screens = [];
  const usesSwiftData = [...sources].some(([file, source]) => file.endsWith('.swift') && /\bimport\s+SwiftData\b/.test(source));
  if (usesSwiftData && !declarationsByName.get('SwiftDataManager')?.some(({declaration}) => declaration.type !== 'protocol')) {
    findings.push(finding('swiftdata-manager-missing', 'review', 'SwiftData is imported, but no concrete SwiftDataManager declaration was found. Check whether the import belongs to an app target and whether an appropriate storage boundary exists; this scan also includes tests and does not resolve target membership.', null, null));
  }
  for (const [file, source] of sources) {
    const managerBodies = [...source.matchAll(/\b(?:struct|class|actor|enum|extension)\s+NetworkingManager\b[^{}]*\{/g)]
      .map(match => {
        const start = match.index + match[0].length;
        return {start, end: start + braceBody(source, start - 1).length};
      });
    const directAccess = [...source.matchAll(/\bURLSession\s*[.(]/g)]
      .find(match => !managerBodies.some(({start, end}) => match.index >= start && match.index < end));
    if (directAccess) {
      findings.push(finding('direct-url-session', 'review', 'URLSession appears outside NetworkingManager. Check whether this is a production network request that should use a NetworkingManager; shared configuration or instances are needed only when appropriate.', file, lineOf(source, directAccess.index)));
    }
  }
  // Independent work may be scheduled here. Review only closures that
  // appear to call the shared launch signal.
  for (const [file, source] of sources) {
    for (const callback of source.matchAll(/\bfunc\s+application\s*\([^{}]*\bdidFinishLaunchingWithOptions\b[^{}]*\)\s*(?:->\s*[^\{]+)?\s*\{/g)) {
      const start = callback.index + callback[0].length - 1;
      const body = braceBody(source, start);
      for (const scheduled of body.matchAll(/\b(?:Task\s*(?:<[^{}\n]*>\s*)?(?:\.\s*(?:init|detached)\s*)?|DispatchQueue\s*\.\s*(?:main|global\s*\([^{}()]*\))\s*\.\s*async(?:After)?\b\s*)(?:\([^{}]*\)\s*|\([^{}]*?\b(?:operation|execute)\s*:\s*)?\{/g)) {
        const scheduledBody = braceBody(body, scheduled.index + scheduled[0].length - 1);
        const precedingSource = body.slice(0, scheduled.index) + '\n' + scheduledBody;
        const aliases = [...precedingSource.matchAll(/\blet\s+(\w+)(?:\s*:\s*AppModel)?\s*=\s*AppModel\s*\.\s*shared\b(?!\s*\.)/g)]
          .map(match => match[1]);
        const directSignal = /\bAppModel\s*\.\s*shared\s*\.\s*applicationDidFinishLaunching\s*\(/.test(scheduledBody);
        const aliasedSignal = aliases.some(alias => new RegExp(
          `(?<![.\\w])${alias}\\s*\\.\\s*applicationDidFinishLaunching\\s*\\(`
        ).test(scheduledBody));
        if (directSignal || aliasedSignal) {
          const scheduler = scheduled[0].startsWith('DispatchQueue') ? (/\.\s*asyncAfter\b/.test(scheduled[0]) ? 'DispatchQueue.asyncAfter' : 'DispatchQueue.async') : 'Task';
          findings.push(finding('scheduled-app-model-launch', 'review', `The launch callback appears to defer the AppModel launch signal through ${scheduler}. CFA requires the callback to signal AppModel directly and synchronously. Features may start their own asynchronous work.`, file, lineOf(source, start + 1 + scheduled.index)));
        }
      }
    }
  }
  const viewDeclarations = /\bstruct\s+(\w+)(?:\s*<[^{}]+>)?\s*:\s*(?:SwiftUI\s*\.\s*)?View\b[^{}]*\{/g;
  const rootViewNames = new Set(['ContentView', 'RootTabView', 'RootView']);
  const viewNames = new Set();
  for (const source of sources.values()) {
    for (const view of source.matchAll(viewDeclarations)) viewNames.add(view[1]);
  }
  const swiftDataAccess = /\b(?:ModelContainer|ModelContext)\b|@Query\b|\.modelContainer\s*\(|@Environment\s*\(\s*\\\s*\.\s*modelContext\b/;
  for (const [file, source] of sources) {
    const isViewFile = /(?:^|\/)1 - View\//.test(file);
    for (const preview of source.matchAll(/(?:#Preview\b\s*(?:\([^{}]*?\)\s*)?|\b(?:struct|enum|class|extension)\s+\w+\s*:[^{}]*?\bPreviewProvider\b[^{}]*)\{/g)) {
      const start = preview.index + preview[0].length;
      const previewBody = braceBody(source, start - 1);
      const access = findFeatureAccess(previewBody);
      const storage = !isViewFile && swiftDataAccess.exec(previewBody);
      if (storage) {
        findings.push(finding('view-swiftdata-access', 'review', 'This preview appears to access SwiftData directly. Preview construction follows the same CFA storage boundary as the app.', file, lineOf(source, start + storage.index)));
      }
      if (access) {
        findings.push(finding('preview-feature-access', 'review', 'This preview appears to access a Feature directly. A normal CFA preview constructs the View and uses its usual ViewModel and Feature route.', file, lineOf(source, start + access.index)));
      }
    }
    for (const view of source.matchAll(viewDeclarations)) {
      const start = view.index + view[0].length;
      const body = braceBody(source, start - 1);
      inspectViewModelInputs(view[1], body, source, start, file, findings);
      if (isViewFile && rootViewNames.has(view[1])) continue;
      const access = findFeatureAccess(body);
      if (access) {
        findings.push(finding('view-feature-access', 'review', 'This View appears to access a Feature directly. Trace the call and route intent and state through the owning screen and ViewModel.', file, lineOf(source, start + access.index)));
      }
    }
    for (const app of source.matchAll(/\bstruct\s+\w+\s*:\s*(?:SwiftUI\s*\.\s*)?App\b[^{}]*\{/g)) {
      const start = app.index + app[0].length;
      const members = braceBody(source, start - 1);
      const sceneBody = /\bvar\s+body\s*:\s*some\s+(?:SwiftUI\s*\.\s*)?Scene\s*\{/.exec(members);
      if (sceneBody) {
        const bodyStart = sceneBody.index + sceneBody[0].length;
        const body = braceBody(members, bodyStart - 1);
        const conditional = /(?<!#)\b(?:if|switch)\b/.exec(body);
        const presentation = /\.modelContainer\s*\(|\b(?:ProgressView|ContentUnavailableView)\s*\(/.exec(body);
        if (conditional) findings.push(finding('conditional-app-body', 'review', 'App.body contains a conditional. Check whether it gates root navigation on storage or an unrelated condition.', file, lineOf(source, start + bodyStart + conditional.index)));
        if (presentation) findings.push(finding('app-startup-presentation', 'review', 'App.body contains storage or loading presentation. Check whether database availability gates the interface; a lexical match alone cannot establish this.', file, lineOf(source, start + bodyStart + presentation.index)));
      }
    }
    if (!isViewFile) {
      for (const view of source.matchAll(viewDeclarations)) {
        const start = view.index + view[0].length;
        const body = braceBody(source, start - 1);
        inspectLifecycleClosures(body, file, findings, lineOf(source, start));
        const storage = swiftDataAccess.exec(body);
        if (storage) {
          findings.push(finding('view-swiftdata-access', 'review', 'This SwiftUI View appears to access SwiftData directly. Verify that storage is reached through its ViewModel and Feature.', file, lineOf(source, start + storage.index)));
        }
      }
      for (const extension of source.matchAll(/\bextension\s+(\w+)\b(?!\s*\.)[^{}]*\{/g)) {
        if (!viewNames.has(extension[1])) continue;
        const start = extension.index + extension[0].length;
        const body = braceBody(source, start - 1);
        inspectLifecycleClosures(body, file, findings, lineOf(source, start));
        const storage = swiftDataAccess.exec(body);
        if (storage) {
          findings.push(finding('view-swiftdata-access', 'review', 'This SwiftUI View extension appears to access SwiftData directly. Verify that storage is reached through its ViewModel and Feature.', file, lineOf(source, start + storage.index)));
        }
      }
      continue;
    }
    // Known root conventions only: this is a review hint, not data-flow analysis.
    // Keep feature-screen conditionals and unrelated adaptive layout out of this check.
    for (const rootView of source.matchAll(viewDeclarations)) {
      if (!rootViewNames.has(rootView[1])) continue;
      const bodyOffset = rootView.index + rootView[0].length;
      const rootBody = braceBody(source, bodyOffset - 1);
      const featureAccess = findFeatureAccess(rootBody);
      if (featureAccess) {
        findings.push(finding('root-feature-access', 'review', 'Root navigation appears to access a Feature directly. Keep refresh and Feature state presentation in the owning screen and its ViewModel.', file, lineOf(source, bodyOffset + featureAccess.index)));
      }
      const gate = /(?<!#)\b(?:if|guard|switch)\s+[^{};]*\b\w*(?:container|database|storeReady|storageReady|startupError|launchError)\w*\b/i.exec(rootBody);
      if (gate) {
        findings.push(finding('root-storage-gate', 'review', 'Root navigation may gate the interface on storage availability. Open storage within a Feature data request and present its error in the feature screen, never a root wrapper or app-wide blocking overlay.', file, lineOf(source, bodyOffset + gate.index)));
      }
    }
    inspectLifecycleClosures(source, file, findings);
    if (/\b(?:let|var)\s+\w+\s*:\s*AppModel\b/.test(source)) findings.push(finding('stored-app-model', 'review', 'An AppModel-typed declaration appears in the View layer. Check whether a View or ViewModel retains it; this lexical match may be a local value or preview.', file, 1));
    const storageAccess = swiftDataAccess.exec(source);
    if (storageAccess) {
      findings.push(finding('view-swiftdata-access', 'review', 'SwiftData storage access may appear in a View-layer file. Check whether a View, ViewModel or preview accesses storage directly; previews retain the same CFA boundaries. A lexical match alone does not establish how the value is used.', file, lineOf(source, storageAccess.index)));
    }
  }
  for (const viewFile of [...paths].filter(file => screenPath.test(file) && !file.endsWith('/RootTabView.swift')).sort()) {
    const view = sources.get(viewFile);
    const name = screenName(viewFile);
    const declaration = [...view.matchAll(viewDeclarations)].find(match => match[1] === name);
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
    const testCandidates = [...paths].filter(file => path.posix.basename(file) === testName);
    const testFile = testCandidates.length === 1 ? testCandidates[0] : null;
    const viewModelTypePattern = `(?:(?:\\w+\\s*\\.\\s*)*${viewModelName})`;
    const stateTypePattern = `(?:SwiftUI\\s*\\.\\s*)?State`;
    const statePattern = new RegExp(`@${stateTypePattern}\\s+private\\s+var\\s+([A-Za-z_]\\w*)(?:\\s*:\\s*${viewModelTypePattern})?\\s*=\\s*${viewModelTypePattern}(?:\\s*\\.\\s*init)?\\s*\\(\\s*\\)`);
    const typedStatePattern = new RegExp(`@${stateTypePattern}\\s+private\\s+var\\s+([A-Za-z_]\\w*)\\s*:\\s*${viewModelTypePattern}\\s*=\\s*\\.init\\s*\\(\\s*\\)`);
    const inlineState = statePattern.exec(members) ?? typedStatePattern.exec(members);
    let ownedState = inlineState && { name: inlineState[1], index: inlineState.index };
    const typedStateProperties = [...members.matchAll(new RegExp(
      `@${stateTypePattern}\\s+private\\s+var\\s+([A-Za-z_]\\w*)\\s*:\\s*${viewModelTypePattern}\\b`, 'g'
    ))].map(match => ({ name: match[1], index: match.index }));
    const dependencies = [];
    for (const { index, closing, parameters, injectedViewModel } of viewInitializers(body)) {
      if (!injectedViewModel && parameters.trim() && viewModel) {
        findings.push(finding('screen-initializer-inputs', 'review', `${name} accepts initializer inputs. Verify that the detail input is a selected immutable snapshot and no ViewModel is injected.`, viewFile, lineOf(view, bodyOffset + index)));
      }
      const tail = body.slice(closing + 1);
      const openingBody = /^\s*(?:(?:async|throws|rethrows)\s*)*\{/.exec(tail);
      if (openingBody) {
        const initializerBody = braceBody(tail, openingBody[0].length - 1);
        const ownConstruction = typedStateProperties.find(({name: property}) => new RegExp(
          `\\b_${property}\\s*=\\s*${stateTypePattern}(?:\\s*<\\s*${viewModelTypePattern}\\s*>)?\\s*\\(\\s*(?:initialValue|wrappedValue)\\s*:\\s*(?:${viewModelTypePattern}(?:\\s*\\.\\s*init)?|\\.init)\\s*\\(`
        ).test(initializerBody));
        if (parameters.trim() && !injectedViewModel && ownConstruction) ownedState ??= ownConstruction;
        const statePropertyNames = typedStateProperties.map(property => property.name);
        if (inlineState) statePropertyNames.push(inlineState[1]);
        const assignsViewModel = statePropertyNames.some(property =>
          new RegExp(`\\b_?${property}\\s*=(?!=)`).test(initializerBody)
        );
        if (assignsViewModel) {
          findings.push(finding('view-model-initializer-construction', 'review', `${name} assigns ViewModel state in init. Verify it constructs its own ViewModel from a selected immutable snapshot and does not accept an injected ViewModel.`, viewFile, lineOf(view, bodyOffset + index)));
        }
      }
    }
    if (viewModel) {
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
    const structuralRoot = name === 'ContentView' && /\bTabView\s*[(\{]/.test(body) && !/\b(?:AppModel|\w+Feature)\b/.test(body);
    if (!viewModel && !structuralRoot) findings.push(finding('view-model-missing', 'review', `${name} has no adjacent ${viewModelName}. Verify whether it is a screen requiring a dedicated ViewModel or a reusable presentation component.`, viewFile, 1));
    else if (viewModel) {
      if (!ownsViewModel) findings.push(finding('view-model-ownership', 'review', `${name} has no recognized private @State ViewModel storage. Verify that the screen constructs and stores its ViewModel. Detail Views may initialize that stored state from a selected immutable snapshot. A computed property does not satisfy CFA screen ownership.`, viewFile, lineOf(view, declaration.index)));
      if (!dependencies.length) findings.push(finding('feature-route-unresolved', 'review', `${viewModelName} has no visible AppModel.shared feature route; inspect whether this screen is presentation-only.`, viewModelFile, 1));
      if (testCandidates.length > 1) findings.push(finding('view-model-tests-ambiguous', 'review', `Multiple files match ${testName}: ${testCandidates.join(', ')}. Verify which test target covers this ViewModel.`, viewModelFile, 1));
      if (!testCandidates.length) findings.push(finding('view-model-tests-missing', 'review', `No ${testName} was found in the scanned directory. Check the project root and test target before concluding the test is missing.`, viewModelFile, 1));
    }
    screens.push({ name, viewFile, viewModelFile: viewModel ? viewModelFile : null, ownsViewModel, structuralRoot, testFile, testCandidates, dependencies });
  }

  for (const [file, source] of sources) {
    for (const extension of source.matchAll(/\bextension\s+(\w+)\b(?!\s*\.)[^{}]*\{/g)) {
      if (!viewNames.has(extension[1])) continue;
      const start = extension.index + extension[0].length;
      const body = braceBody(source, start - 1);
      inspectViewModelInputs(extension[1], body, source, start, file, findings);
      const access = findFeatureAccess(body);
      if (access) {
        findings.push(finding('view-feature-access', 'review', 'This View extension appears to access a Feature directly. Trace the call and route it through the owning ViewModel.', file, lineOf(source, start + access.index)));
      }
    }
  }

  return {
    schemaVersion: 2,
    project: path.basename(root),
    sourceFingerprint: inventory.sourceFingerprint,
    method: 'Lexical source inspection; verify findings against Swift semantics and target membership.',
    scope: { swiftFiles: inventory.scope.fileCount, screens: screens.length, skipped: inventory.scope.skipped, symbolicLinkPaths: inventory.scope.symbolicLinkPaths },
    appModelFile: appModelFile ?? null,
    screens,
    findings,
    limitations: [
      'This does not type-check Swift or resolve target membership, protocols, runtime behaviour, or test results.',
      'Unusual declarations, macros, generated code, and custom composition routes may be missed.',
      'Screen ownership mapping uses conventionally named screen files and adjacent ViewModels. Explicit initializer input checks include recognized View extensions. Implicit memberwise inputs, aliases and actual call sites still need manual review.',
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
    const routes = screen.dependencies.map(({property, featureType, featureFile}) => {
      if (!featureType) return `${property} (unresolved)`;
      return `${property} (${featureType}${featureFile ? '' : ', source unresolved'})`;
    });
    const viewModel = screen.viewModelFile ? screenName(screen.viewModelFile) : 'no adjacent ViewModel; review screen role';
    const ownership = screen.ownsViewModel ? 'private @State recognized' : 'ownership needs review';
    const tests = screen.testFile ? 'matching test file found'
      : screen.testCandidates?.length > 1 ? 'multiple matching test files. Verify target'
        : 'no matching test file found';
    lines.push(`${screen.name}: ${viewModel} → ${routes.join(', ') || 'no visible feature route'} · ${ownership} · ${tests}`);
  }
  if (report.findings.length) {
    lines.push('', 'Findings:');
    for (const item of report.findings) lines.push(`- ${item.severity.toUpperCase()} ${item.code}: ${item.message}${item.file ? ` (${item.file}:${item.line})` : ''}`);
  }
  lines.push('', 'Source scan limits:');
  for (const {file, reason} of report.scope.skipped ?? []) lines.push(`- Skipped ${file}: ${reason}.`);
  for (const file of report.scope.symbolicLinkPaths ?? []) lines.push(`- Symbolic link not followed: ${file}. Verify target membership.`);
  for (const limitation of report.limitations) lines.push('- ' + limitation);
  lines.push('Use this map to guide source review. No tests were run.');
  return lines.join('\n');
}
