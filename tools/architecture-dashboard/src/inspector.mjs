import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { analyse, maskSwift, scanSource } from './analyse.mjs';

const screenPath = /(?:^|\/)1 - View\/Views\/.*View\.swift$/;
const productionSourceTree = /(?:^|\/)(?:1 - View|2 - AppModel|3 - App Resources|4 - Swift Extensions)\//;
const featureTypeSuffix = /Feature(?:API)?$/;
const serviceTypeSuffix = /(?:Repository|NetworkingManager|SwiftDataManager)$/;

function isKnownNonFeatureType(type) {
  return type.endsWith('ViewModel') || type === 'NetworkingManager' || type === 'SwiftDataManager';
}

function isFeatureCandidate(type, file = '') {
  if (isKnownNonFeatureType(type)) return false;
  return featureTypeSuffix.test(type) || /(?:^|\/)Features\/[^/]+\//.test(file);
}

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

const identifier = '[\\p{L}_][\\p{L}\\p{M}\\p{N}_]*';
const inferredAppModelStorage = /\b(?:let|var)\s+`?[\p{L}_][\p{L}\p{M}\p{N}_]*`?\s*=\s*(?:\w+\s*\.\s*)*AppModel\s*\.\s*shared\b(?!\s*[.?![(])/gu;
const propertyNamePattern = '(?:`(' + identifier + ')`|(' + identifier + '))';

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

function* storedTypedMembers(members, body) {
  const property = /\b(?:let|var)\s+`?[\p{L}_][\p{L}\p{M}\p{N}_]*`?\s*:\s*(?:\(\s*any\s+((?:\w+\s*\.\s*)*\w+)\s*\)\s*\?|(?:(?:any|some)\s+)?((?:\w+\s*\.\s*)*\w+)\b(?!\s*\.)(?:[ \t]*[?!])?)/gu;
  for (const match of members.matchAll(property)) {
    if (hasComputedAccessor(body.slice(match.index + match[0].length))) continue;
    yield { index: match.index, type: (match[1] ?? match[2]).split('.').at(-1).trim() };
  }
}

function closingParenthesis(source, opening) {
  let depth = 0;
  for (let index = opening; index < source.length; index++) {
    if (source[index] === '(') depth++;
    if (source[index] === ')' && --depth === 0) return index;
  }
  return -1;
}

function closingGenericArguments(source, opening) {
  let depth = 1;
  for (let index = opening + 1; index < source.length; index++) {
    const token = source[index];
    if (token === '<') depth++;
    if (token === '>' && source[index - 1] !== '-' && --depth === 0) return index;
    if (';{}='.includes(token)) break;
  }
  return -1;
}

// Inspect the first top-level colon in each parameter, skipping labels in
// default calls and closure signatures.
function initializerParameterTypes(parameters) {
  const types = [];
  let depth = 0;
  let foundType = false;
  for (const {0: token, index} of parameters.matchAll(/[()[\]{},:]/g)) {
    if ('([{'.includes(token)) depth++;
    else if (')]}'.includes(token)) depth--;
    else if (depth === 0 && token === ',') foundType = false;
    else if (depth === 0 && token === ':' && !foundType) {
      const parameter = parameters.slice(index + 1);
      const type = /^\s*\(\s*any\s+((?:\w+\s*\.\s*)*\w+)\s*\)\s*\?/.exec(parameter)
        ?? /^\s*(?:(?:any|some)\s+)?((?:\w+\s*\.\s*)*\w+)/.exec(parameter);
      if (type) types.push(type[1].split('.').at(-1).trim());
      foundType = true;
    }
  }
  return types;
}

function* typeInitializers(body) {
  for (const initializer of memberSignatures(body).matchAll(/(?<![.\w])init[?!]?\s*\(/g)) {
    const opening = initializer.index + initializer[0].length - 1;
    const closing = closingParenthesis(body, opening);
    if (closing < 0) continue;
    const parameters = body.slice(opening + 1, closing);
    const types = initializerParameterTypes(parameters);
    const injectedViewModel = types.some(type => type.endsWith('ViewModel'));
    const injectedAppModel = types.includes('AppModel');
    const possibleModelDependencies = [...new Set(types.filter(type => featureTypeSuffix.test(type) || serviceTypeSuffix.test(type)))];
    const tail = body.slice(closing + 1);
    const openingBody = /^\s*(?:(?:async|throws|rethrows)\s*)*\{/.exec(tail);
    const bodyStart = openingBody ? closing + 1 + openingBody[0].length : null;
    const initializerBody = bodyStart === null ? null : braceBody(body, bodyStart - 1);
    yield { index: initializer.index, parameters, types, injectedViewModel, injectedAppModel, possibleModelDependencies, initializerBody, bodyStart };
  }
}

function inspectInitializerTask(name, initializer, source, start, file, findings) {
  const task = initializer.initializerBody && /\bTask\s*(?:<[^{};]*>\s*)?(?:\.\s*(?:detached|init)\s*)?(?:\([^{}]*\)\s*)?\{/.exec(initializer.initializerBody);
  if (task) {
    findings.push(finding('screen-initializer-task', 'review', `${name}'s initializer contains a Task. Trace whether construction starts work or only defines a closure for later use.`, file, lineOf(source, start + initializer.bodyStart + task.index)));
  }
}

function inspectScreenInputs(name, body, source, start, file, findings) {
  for (const initializer of typeInitializers(body)) {
    inspectInitializerTask(name, initializer, source, start, file, findings);
    if (initializer.injectedViewModel) {
      findings.push(finding('screen-initializer-inputs', 'warning', `${name} appears to accept a ViewModel; CFA screens construct their own.`, file, lineOf(source, start + initializer.index)));
    }
    if (initializer.injectedAppModel) {
      findings.push(finding('screen-initializer-inputs', 'warning', `${name} appears to accept AppModel; CFA screens resolve Features through their own ViewModel.`, file, lineOf(source, start + initializer.index)));
    }
    if (initializer.possibleModelDependencies.length) {
      findings.push(finding('screen-initializer-inputs', 'review', `${name} accepts ${initializer.possibleModelDependencies.join(', ')}. Verify whether this injects a Feature or microservice into a View.`, file, lineOf(source, start + initializer.index)));
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
  for (const task of source.matchAll(/\.\s*(task|refreshable|onAppear|onChange|onReceive)\b\s*([({])/g)) {
    let opening = task.index + task[0].length - 1;
    if (task[2] === '(') {
      const closing = closingParenthesis(source, opening);
      if (closing < 0) continue;
      const argumentsText = source.slice(opening + 1, closing);
      const label = task[1] === 'task' ? 'operation' : task[1] === 'onAppear' ? 'perform' : 'action';
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
    if (task[1] === 'task' || task[1] === 'refreshable') {
      for (const site of scanSource(lifecycleBody, file).sites) {
        if (site.kind !== 'task' && site.kind !== 'detached') continue;
        findings.push(finding('task-inside-view-lifecycle', 'review', `A SwiftUI ${modifier} body appears to create an independent Task. Trace its lifetime and cancellation. In CFA, await lifecycle-bound work directly, let the ViewModel own independent screen work, and let the Feature own shared operations that may outlive the screen.`, file, bodyStartLine + site.line - 1));
      }
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
  const conventionalAppModelPath = /(?:^|\/)2 - AppModel\/AppModel\.swift$/;
  const appModelCandidates = [...sources].flatMap(([file, source]) =>
    [...source.matchAll(/\bclass\s+AppModel\b[^{}]*\{/g)].map(declaration => ({file, declaration}))
  );
  const candidate = appModelCandidates.length === 1 ? appModelCandidates[0] : null;
  const appModelFile = candidate?.file ?? null;
  const appModel = appModelFile ? sources.get(appModelFile) : '';
  const appModelDeclaration = candidate?.declaration;
  const appModelBodyStart = appModelDeclaration ? appModelDeclaration.index + appModelDeclaration[0].length : 0;
  // Keep original offsets while excluding unrelated types and method-local values.
  const appMembers = appModelDeclaration
    ? appModel.slice(0, appModelBodyStart).replace(/[^\n]/g, ' ') + memberSignatures(braceBody(appModel, appModelBodyStart - 1))
    : '';
  const findings = [];
  const propertyCandidates = new Map();
  function recordProperty(name, property) {
    if (!propertyCandidates.has(name)) propertyCandidates.set(name, []);
    propertyCandidates.get(name).push(property);
  }
  const appProperties = new Map();
  for (const match of appMembers.matchAll(/\b(?:let|var)\s+(\w+)\s*:\s*(?:any\s+)?(?:\w+\s*\.\s*)*(\w+)/g)) {
    recordProperty(match[1], {
      file: appModelFile,
      type: match[2],
      line: lineOf(appModel, match.index),
      computed: hasComputedAccessor(appModel.slice(match.index + match[0].length))
    });
  }

  if (appModelDeclaration) {
    for (const [file, source] of sources) {
      for (const extension of source.matchAll(/\bextension\s+AppModel\b(?!\s*\.)[^{}]*\{/g)) {
        const offset = extension.index + extension[0].length;
        const body = braceBody(source, offset - 1);
        for (const match of memberSignatures(body).matchAll(/(?:^|(?<=;))[ \t]*(?:(?:private|fileprivate|internal|package|public)\s+)?var\s+(\w+)\s*:\s*(?:\w+\s*\.\s*)*(\w+Feature)\b(?!\s*\.)/gm)) {
          if (!hasComputedAccessor(body.slice(match.index + match[0].length))) continue;
          const [, name, type] = match;
          const property = {file, type, line: lineOf(source, offset + match.index), computed: true};
          recordProperty(name, property);
        }
      }
    }
  }
  for (const [name, candidates] of propertyCandidates) {
    const [first] = candidates;
    if (candidates.length === 1) {
      appProperties.set(name, first);
    } else {
      const locations = candidates.map(({file, line}) => `${file}:${line}`).join(', ');
      findings.push(finding('app-model-property-ambiguous', 'review', `AppModel.${name} has multiple candidate declarations: ${locations}. Verify the active target and compilation conditions before resolving this property.`, first.file, first.line));
    }
  }

  const declarationsByName = new Map();
  for (const file of inventory.files) {
    for (const declaration of file.declarations) {
      if (!declarationsByName.has(declaration.name)) declarationsByName.set(declaration.name, []);
      declarationsByName.get(declaration.name).push({file: file.path, declaration});
    }
  }

  if (!appModelCandidates.length) findings.push(finding('app-model-missing', 'warning', 'No AppModel class was found in the scanned source.', null, null));
  if (appModelFile && !conventionalAppModelPath.test(appModelFile)) {
    findings.push(finding('app-model-placement', 'review', 'AppModel is outside the conventional 2 - AppModel/AppModel.swift path. Verify the intended target and source layout.', appModelFile, lineOf(appModel, appModelDeclaration.index)));
  }
  if (appModelCandidates.length > 1) {
    findings.push(finding('app-model-ambiguous', 'review', `Multiple AppModel declarations were found: ${appModelCandidates.map(({file, declaration}) => `${file}:${lineOf(sources.get(file), declaration.index)}`).join(', ')}. Verify target membership or inspect one app directory at a time before attributing Feature routes.`, null, null));
  }
  if (appModelFile) {
    const liveFactoryPattern = /\bstatic\s+func\s+live\s*\(\s*\)\s*->\s*(?:\w+\s*\.\s*)*AppModel\b/g;
    const liveFactories = [...appMembers.matchAll(liveFactoryPattern)]
      .filter(match => /^\s*\{/.test(appModel.slice(match.index + match[0].length)));
    if (liveFactories.length !== 1) findings.push(finding('app-model-live-factory', 'review', `Found ${liveFactories.length} static live() -> AppModel declarations directly inside AppModel. Verify the single production factory, including extensions and active compilation conditions.`, appModelFile, 1));
    const constructionBodies = liveFactories.map(factory => ({
      name: 'AppModel.live()', file: appModelFile, source: appModel,
      opening: appModel.indexOf('{', factory.index + factory[0].length)
    }));
    const initializerScopes = [{file: appModelFile, source: appModel, members: appMembers, start: 0}];
    for (const [file, source] of sources) {
      for (const extension of source.matchAll(/\bextension\s+AppModel\b(?!\s*\.)[^{}]*\{/g)) {
        const start = extension.index + extension[0].length;
        const members = memberSignatures(braceBody(source, start - 1));
        initializerScopes.push({file, source, members, start});
        for (const factory of members.matchAll(liveFactoryPattern)) {
          const end = start + factory.index + factory[0].length;
          const body = /^\s*\{/.exec(source.slice(end));
          if (body) constructionBodies.push({name: 'AppModel.live()', file, source, opening: end + body[0].length - 1});
        }
      }
    }
    for (const {file, source, members, start} of initializerScopes) {
      for (const initializer of members.matchAll(/(?<![.\w])init[?!]?\s*\(/g)) {
        const closing = closingParenthesis(source, start + initializer.index + initializer[0].length - 1);
        if (closing < 0) continue;
        const body = /^\s*(?:(?:async|throws|rethrows)\s*)*\{/.exec(source.slice(closing + 1));
        if (body) constructionBodies.push({name: 'AppModel.init', file, source, opening: closing + body[0].length});
      }
    }
    for (const {name, file, source, opening} of constructionBodies) {
      const container = /\b(?:SwiftData\s*\.\s*)?ModelContainer\s*(?:\.\s*init\s*)?\(/.exec(braceBody(source, opening));
      if (container) {
        findings.push(finding('app-model-storage-construction', 'review', `${name} references a ModelContainer initializer. Trace whether it opens storage during graph construction. CFA opens the store within the storage owner’s data request.`, file, lineOf(source, opening + 1 + container.index)));
      }
    }
    for (const match of appMembers.matchAll(/\bstatic[ \t]+(let|var)[ \t]+(\w+)[ \t]*(?::[^;=\n]+)?=(?!=)/g)) {
      const [, binding, name] = match;
      if (name === 'shared') {
        if (binding === 'var') findings.push(finding('app-model-mutable-shared', 'warning', 'AppModel.shared is mutable. Declare the production graph with static let shared and construct it through live().', appModelFile, lineOf(appModel, match.index)));
        continue;
      }
      findings.push(finding('app-model-static-state', 'warning', `AppModel declares static stored property ${name}; CFA reserves static storage in AppModel for the shared production graph.`, appModelFile, lineOf(appModel, match.index)));
    }
    const computedShared = /\bstatic\s+var\s+shared\s*:\s*(?:\w+\s*\.\s*)*AppModel\b/.exec(appMembers);
    if (computedShared && hasComputedAccessor(appModel.slice(computedShared.index + computedShared[0].length))) {
      findings.push(finding('app-model-computed-shared', 'warning', 'AppModel.shared is computed. CFA uses one stored static let initialized through live(). Trace whether the getter creates a new graph on access.', appModelFile, lineOf(appModel, computedShared.index)));
    }
    const sharedInitializer = /\bstatic\s+let\s+shared\s*(?::\s*(?:\w+\s*\.\s*)*AppModel\s*)?=/.exec(appMembers);
    if (sharedInitializer) {
      const initializer = appModel.slice(sharedInitializer.index + sharedInitializer[0].length);
      if (!/^\s*(?:(?:\w+\s*\.\s*)*(?:AppModel|Self)\s*\.\s*)?live\s*\(\s*\)/.test(initializer)) {
        findings.push(finding('app-model-shared-factory', 'review', 'AppModel.shared does not visibly call live(). Trace its initializer and verify the production graph comes from the single live factory.', appModelFile, lineOf(appModel, sharedInitializer.index)));
      }
    }
    for (const match of appMembers.matchAll(/(?:^|(?<=;))[ \t]*(?:@[\w.]+(?:\([^\n)]*\))?[ \t]+)*(?:(?:private(?:\(set\))?|fileprivate|internal|public|package)[ \t]+)?(?:let|var)[ \t]+(\w+)[ \t]*=(?!=)/gm)) {
      const line = lineOf(appModel, match.index);
      findings.push(finding('app-model-default-value', 'warning', `AppModel property ${match[1]} has a default value; initialise it in the explicit initializer.`, appModelFile, line));
      const start = match.index + match[0].length;
      const constructor = /^\s*(?:\w+\s*\.\s*)*([A-Z]\w*)\s*\(/.exec(appModel.slice(start));
      if (!constructor) continue;
      const close = closingParenthesis(appModel, start + constructor[0].length - 1);
      if (close < 0 || /^\s*(?:[.\[]|as[?!]?\b)/.test(appModel.slice(close + 1))) continue;
      const type = constructor[1];
      const declarations = declarationsByName.get(type) || [];
      if (!isKnownNonFeatureType(type) &&
          (declarations.length !== 1 || isFeatureCandidate(type, declarations[0].file))) continue;
      findings.push(finding('app-model-non-feature-state', 'review', `AppModel appears to store ${match[1]} from ${type} construction. Verify the inferred type and keep services and presentation state outside AppModel storage.`, appModelFile, line));
    }
    for (const match of appMembers.matchAll(/(?:^|(?<=;))[ \t]*(?:@[\w.]+(?:\([^\n)]*\))?[ \t]+)*(private[ \t]+)?(?:(?:private\(set\)|fileprivate|internal|public|package)[ \t]+)?(?:let|var)[ \t]+(\w+)[ \t]*:\s*(?:any\s+)?(?:\w+\s*\.\s*)*(\w+)/gm)) {
      const [, privateModifier, name, type] = match;
      let suffix = appModel.slice(match.index + match[0].length);
      let optionalTask = false;
      const genericStart = /^\s*</.exec(suffix);
      if (genericStart) {
        const close = closingGenericArguments(suffix, genericStart[0].length - 1);
        if (close >= 0) {
          const argument = suffix.slice(genericStart[0].length, close);
          const taskStart = /^\s*(?:(?:Swift|_Concurrency)\s*\.\s*)?Task\s*</.exec(argument);
          if (type === 'Optional' && taskStart) {
            const taskEnd = closingGenericArguments(argument, taskStart[0].length - 1);
            optionalTask = taskEnd >= 0 && !argument.slice(taskEnd + 1).trim();
          }
          suffix = suffix.slice(close + 1);
        }
      }
      suffix = suffix.replace(/^[?!]/, '');
      const defaultValue = /^[ \t]*=(?!=)/.test(suffix);
      // A getter is not stored state. Property observers still belong to storage.
      if (!defaultValue && hasComputedAccessor(suffix)) continue;
      if (defaultValue) findings.push(finding('app-model-default-value', 'warning', `AppModel property ${name} has a default value; initialise it in the explicit initializer.`, appModelFile, lineOf(appModel, match.index)));
      if (type === 'Bool' && privateModifier) {
        // A declaration's order and type do not establish its purpose.
        findings.push(finding('app-model-boolean-purpose', 'review', `AppModel declares private Bool ${name}; verify whether it is the launch guard and whether its initialization and use follow the AppModel rules.`, appModelFile, lineOf(appModel, match.index)));
        continue;
      }
      // Lexical analysis cannot establish whether this is an app-wide listener.
      if ((type === 'Task' || optionalTask) && privateModifier) {
        findings.push(finding('app-model-task-purpose', 'review', `AppModel retains ${name}; trace whether startup creates one app-wide listener, whether it forwards events to the owning Feature without a screen present, and how it stops or is replaced when required.`, appModelFile, lineOf(appModel, match.index)));
        continue;
      }
      const declarations = declarationsByName.get(type) || [];
      const declarationFile = declarations.length === 1 ? declarations[0].file : undefined;
      if (!isFeatureCandidate(type, declarationFile)) findings.push(finding('app-model-non-feature-state', 'warning', `AppModel stores ${name}: ${type}; check that it is a Feature, launch guard or private app-wide listener handle.`, appModelFile, lineOf(appModel, match.index)));
    }
  }
  const checkedFeatureTests = new Set();
  function inspectFeatureTests(type, location, line) {
    if (checkedFeatureTests.has(type)) return;
    checkedFeatureTests.add(type);
    const testName = `${type}Tests.swift`;
    const namedTests = [...paths].filter(file => path.posix.basename(file) === testName);
    for (const file of namedTests) {
      const inProduction = productionSourceTree.test(file);
      if (inProduction || !file.split('/').includes('FeatureTests')) {
        const location = inProduction ? 'in a production source tree' : 'outside a FeatureTests folder';
        findings.push(finding('feature-test-placement', 'review', `${testName} appears ${location}. Verify that it belongs to the unit-test target and its FeatureTests group.`, file, 1));
      }
    }
    if (namedTests.length > 1) {
      findings.push(finding('feature-tests-ambiguous', 'review', `Multiple files match ${testName}: ${namedTests.join(', ')}. Verify which test target covers this Feature.`, location, line));
    } else if (namedTests.length === 1 && (declarationsByName.get(type)?.length ?? 0) > 1) {
      findings.push(finding('feature-tests-ambiguous', 'review', `${namedTests[0]} matches multiple declarations named ${type}. Verify which declaration the test target covers.`, location, line));
    }
    if (!namedTests.length) {
      findings.push(finding('feature-tests-missing', 'review', `No ${testName} was found in the scanned directory. Check the project root and test target before concluding the test is missing.`, location, line));
    }
  }

  const featureProperties = new Set();
  for (const [name, property] of appProperties) {
    const candidates = declarationsByName.get(property.type) || [];
    const source = candidates.length === 1 ? candidates[0] : null;
    const declarationFile = source?.file;
    const isFeature = isFeatureCandidate(property.type, declarationFile);
    if (!isFeature) continue;
    featureProperties.add(name);
    if (property.computed) {
      findings.push(finding('feature-computed-exposure', 'review', `AppModel exposes ${name} through a computed property. Trace it to the concrete Feature retained by the live graph and check that access does not construct a competing instance.`, property.file, property.line));
    }
    if (!candidates.length) {
      findings.push(finding('feature-source-missing', 'review', `${property.type} is exposed by AppModel, but the inspector could not locate its declaration. Check aliases, generated code and target membership.`, property.file, property.line));
    }
    if (candidates.length > 1) {
      const locations = candidates.map(({file, declaration}) => `${file}:${declaration.line}`).sort();
      findings.push(finding('feature-source-ambiguous', 'review', `${property.type} has multiple declarations. Candidates: ${locations.join(', ')}. Verify which declaration belongs to the active target before assessing placement or collaborators.`, property.file, property.line));
    }
    const hasFeatureSuffix = featureTypeSuffix.test(property.type);
    if (!hasFeatureSuffix) {
      findings.push(finding('feature-type-name', 'review', `${property.type} is declared in a Feature folder and exposed by AppModel. Verify its responsibility. Use the Feature suffix for a concrete Feature owner. Keep a supporting service behind the Feature.`, property.file, property.line));
    }
    const expected = featurePropertyName(hasFeatureSuffix
      ? property.type
      : `${property.type.replace(/Manager$/, '')}Feature`);
    if (name !== expected) {
      const message = hasFeatureSuffix
        ? `${name} should use the same domain name as ${property.type}, ending in Feature (${expected}).`
        : `If ${property.type} is a Feature, use a matching Feature property name (${expected}).`;
      findings.push(finding('feature-property-name', hasFeatureSuffix ? 'warning' : 'review', message, property.file, property.line));
    }
    if (featureTypeSuffix.test(property.type) && !property.type.endsWith('API')) {
      const declaration = source?.declaration;
      if (declaration?.type === 'actor') {
        findings.push(finding('feature-isolation', 'review', `${property.type} is an actor exposed by AppModel. Verify its role. CFA Feature owners explicitly use MainActor, and worker actors belong behind the Feature boundary.`, declarationFile, declaration.line));
      }
      const featureFolder = path.posix.join(path.posix.dirname(appModelFile), 'Features');
      const relative = declarationFile && path.posix.relative(featureFolder, declarationFile);
      if (declaration?.type === 'class' && (relative.startsWith('../') || !relative.includes('/'))) {
        findings.push(finding('feature-placement', 'review', `${property.type} is outside a named subfolder of ${featureFolder}. Verify the intended package and target placement before moving it.`, declarationFile, declaration.line));
      }
      inspectFeatureTests(property.type, property.file, property.line);
    }
  }

  for (const [type, candidates] of declarationsByName) {
    if (!type.endsWith('Feature')) continue;
    const owner = candidates.find(({file, declaration}) =>
      declaration.type === 'class' && /(?:^|\/)2 - AppModel\/Features\//.test(file));
    if (owner) inspectFeatureTests(type, owner.file, owner.declaration.line);
  }

  // A stored dependency is evidence of a potential workflow, not a violation.
  for (const [file, source] of sources) {
    for (const declaration of source.matchAll(/\bclass\s+(\w+Feature)\b[^{}]*\{/g)) {
      const bodyStart = declaration.index + declaration[0].length;
      const body = braceBody(source, bodyStart - 1);
      const members = memberSignatures(body);
      for (const property of members.matchAll(/(?:^|(?<=;))[ \t]*(?:(?:private(?:\(set\))?|fileprivate|internal|public|package|lazy|weak|unowned(?:\((?:safe|unsafe)\))?)[ \t]+)*(?:let|var)\s+(\w+)\s*(?::\s*((?:\w+\s*\.\s*)*\w+Feature\b(?:\s*[?!])?)(?!\s*[.?!])|=\s*((?:\w+\s*\.\s*)*\w+Feature)\b(?:\s*\.\s*init)?\s*\()/gm)) {
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
    for (const alias of source.matchAll(/\blet\s+([A-Za-z_]\w*)(?:\s*:\s*(?:\w+\s*\.\s*)*AppModel)?\s*=\s*(?:\w+\s*\.\s*)*AppModel\s*\.\s*shared\b(?!\s*\.)/g)) {
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
    return [...source.matchAll(/\b(\w+Feature)\s*(?:\.\s*init\s*)?\(/g)]
      .find(match => concreteFeatures.has(match[1]));
  }

  const screens = [];
  const storageOwners = (declarationsByName.get('SwiftDataManager') || [])
    .filter(({declaration}) => declaration.type !== 'protocol');
  const hasStorageOwnerOutsideTestFolders = storageOwners.some(({file}) =>
    !path.posix.dirname(file).split('/').some(folder => /(?:^tests?$|Tests?$)/.test(folder)));
  if (!hasStorageOwnerOutsideTestFolders) {
    for (const [file, source] of sources) {
      const swiftDataImport = /\bimport\s+(?:(?:typealias|struct|class|enum|protocol|let|var|func)\s+)?SwiftData\b/.exec(source);
      if (!swiftDataImport) continue;
      const ownerEvidence = storageOwners.length
        ? 'Concrete SwiftDataManager declarations were found only in test-named folders.'
        : 'No concrete SwiftDataManager declaration was found.';
      findings.push(finding('swiftdata-manager-missing', 'review', `SwiftData is imported. ${ownerEvidence} Check whether the import belongs to an app target and whether an appropriate storage boundary exists; this scan also includes tests and does not resolve target membership.`, file, lineOf(source, swiftDataImport.index)));
    }
  }
  for (const [file, source] of sources) {
    const managerBodies = [...source.matchAll(/\b(?:struct|class|actor|enum|extension)\s+NetworkingManager\b[^{}]*\{/g)]
      .map(match => {
        const start = match.index + match[0].length;
        return {start, end: start + braceBody(source, start - 1).length};
      });
    const outsideManager = match => !managerBodies.some(({start, end}) => match.index >= start && match.index < end);
    const sessionNames = new Set([...source.matchAll(/\b(\w+)\s*:\s*(?:Foundation(?:Networking)?\s*\.\s*)?URLSession\b(?!\s*\.)/g)]
      .map(match => match[1]));
    for (const alias of source.matchAll(/\b(?:let|var)\s+(\w+)\s*=\s*(?:Foundation(?:Networking)?\s*\.\s*)?URLSession\s*(?:\.\s*shared\b|\()/g)) {
      const end = alias.index + alias[0].length;
      const closing = alias[0].endsWith('(') ? closingParenthesis(source, end - 1) : end - 1;
      if (closing < 0) continue;
      const remainder = source.slice(closing + 1);
      if (/^[ \t]*(?:[;\n}]|$)/.test(remainder) && !/^\s*[.([?]/.test(remainder)) {
        sessionNames.add(alias[1]);
      }
    }
    const requestCall = /\s*\??\.\s*(?:data|bytes|download|upload|dataTask|dataTaskPublisher|downloadTask|uploadTask|webSocketTask|streamTask)\s*\(/;
    const requestOnReceiver = new RegExp(String.raw`\b(?:(URLSession\s*\.\s*shared)|(\w+))${requestCall.source}`, 'g');
    const directRequests = [...source.matchAll(requestOnReceiver)]
      .filter(match => (match[1] || sessionNames.has(match[2])) && outsideManager(match));
    for (const constructor of source.matchAll(/\bURLSession\s*\(/g)) {
      if (!outsideManager(constructor)) continue;
      const closing = closingParenthesis(source, constructor.index + constructor[0].length - 1);
      if (closing >= 0 && source.slice(closing + 1).search(requestCall) === 0) directRequests.push(constructor);
    }
    directRequests.sort((a, b) => a.index - b.index);
    for (const request of directRequests) {
      findings.push(finding('direct-url-session', 'review', 'Possible URLSession request outside NetworkingManager. Verify the receiver type and production target membership before reporting a bypass.', file, lineOf(source, request.index)));
    }
    if (!directRequests.length) {
      const reference = [...source.matchAll(/\bURLSession\s*[.(]/g)].find(outsideManager);
      if (reference) {
        findings.push(finding('url-session-reference', 'review', 'URLSession is referenced outside NetworkingManager. Trace whether the reference configures a session for injection or leads to a production request that bypasses the manager.', file, lineOf(source, reference.index)));
      }
    }
  }
  // Independent work may be scheduled here. Review only closures that
  // appear to call the shared launch signal.
  for (const [file, source] of sources) {
    for (const callback of source.matchAll(/\bfunc\s+application\s*\([^{}]*,\s*didFinishLaunchingWithOptions\s*(?:\w+\s*)?:[^{}]*\)\s*(?:->\s*[^\{]+)?\s*\{/g)) {
      const start = callback.index + callback[0].length - 1;
      const body = braceBody(source, start);
      for (const scheduled of body.matchAll(/\b(?:Task\s*(?:<[^{}]*>\s*)?(?:\.\s*(?:init|detached)\s*)?|DispatchQueue\s*\.\s*(?:main|global\s*\([^{}()]*\))\s*\.\s*async(?:After)?\b\s*|OperationQueue\s*(?:\.\s*main|\(\s*\))\s*\.\s*addOperation\b\s*|(?<![.\w])(?<queue>\w+)\s*\.\s*(?<method>asyncAfter|async|addOperation)\b\s*)(?:\([^{}]*\)\s*|\([^{}]*?\b(?:operation|execute)\s*:\s*)?\{/g)) {
        const {queue, method} = scheduled.groups;
        const queueType = method === 'addOperation' ? 'OperationQueue' : 'DispatchQueue';
        if (queue) {
          const localDeclarations = memberSignatures(body.slice(0, scheduled.index));
          const queueDeclaration = new RegExp(
            '\\b(?:let|var)\\s+' + queue + '\\s*(?::\\s*' + queueType + '\\s*=|=\\s*' + queueType + '\\s*[.(])'
          );
          if (!queueDeclaration.test(localDeclarations)) continue;
        }
        const scheduledBody = braceBody(body, scheduled.index + scheduled[0].length - 1);
        const precedingSource = body.slice(0, scheduled.index) + '\n' + scheduledBody;
        const aliases = [...precedingSource.matchAll(/\b(?:let|var)\s+(\w+)(?:\s*:\s*AppModel)?\s*=\s*AppModel\s*\.\s*shared\b(?!\s*\.)/g)]
          .map(match => match[1]);
        const captures = /^\s*(?:@MainActor\s+)?\[([^\]]*)\]/.exec(scheduledBody);
        if (captures) {
          for (const capture of captures[1].matchAll(/(?:^|,)\s*(\w+)\s*=\s*AppModel\s*\.\s*shared\s*(?=,|$)/g)) {
            aliases.push(capture[1]);
          }
        }
        const directSignal = /\bAppModel\s*\.\s*shared\s*\.\s*applicationDidFinishLaunching\s*\(/.test(scheduledBody);
        const aliasedSignal = aliases.some(alias => new RegExp(
          `(?<![.\\w])${alias}\\s*\\.\\s*applicationDidFinishLaunching\\s*\\(`
        ).test(scheduledBody));
        if (directSignal || aliasedSignal) {
          let scheduler = queue ? queueType + '.' + method : 'Task';
          if (scheduled[0].startsWith('OperationQueue')) scheduler = 'OperationQueue.addOperation';
          if (scheduled[0].startsWith('DispatchQueue')) {
            scheduler = /\.\s*asyncAfter\b/.test(scheduled[0]) ? 'DispatchQueue.asyncAfter' : 'DispatchQueue.async';
          }
          findings.push(finding('scheduled-app-model-launch', 'review', `The launch callback appears to defer the AppModel launch signal through ${scheduler}. CFA requires the callback to signal AppModel directly and synchronously. Features may start their own asynchronous work.`, file, lineOf(source, start + 1 + scheduled.index)));
        }
      }
    }
  }
  const viewDeclarations = /\bstruct\s+(\w+)(?:\s*<[^{}]+>)?\s*:\s*(?:(?:\w+\s*\.\s*)*\w+\s*,\s*)*(?:SwiftUI\s*\.\s*)?View\b(?!\s*\.)[^{}]*\{/g;
  const viewConformances = /\bextension\s+(\w+)\s*:\s*(?:(?:\w+\s*\.\s*)*\w+\s*,\s*)*(?:SwiftUI\s*\.\s*)?View\b(?!\s*\.)[^{}]*\{/g;
  const appDeclarations = /\bstruct\s+\w+\s*:\s*(?:SwiftUI\s*\.\s*)?App\b[^{}]*\{/g;
  const sceneBodyPattern = /\bvar\s+body\s*:\s*some\s+(?:SwiftUI\s*\.\s*)?Scene\s*\{/;
  const rootViewNames = new Set(['ContentView', 'RootTabView', 'RootView']);
  const rootStorageGate = /(?<!#)\b(?:if|guard|switch)\s+[^{};]*\b\w*(?:container|database|storeReady|storageReady|startupError|launchError)\w*\b/i;
  function inspectRootNavigation(body, file, source, offset) {
    const featureAccess = findFeatureAccess(body);
    if (featureAccess) {
      findings.push(finding('root-feature-access', 'review', 'Root navigation appears to access a Feature directly. Keep refresh and Feature state presentation in the owning screen and its ViewModel.', file, lineOf(source, offset + featureAccess.index)));
    }
    const gate = rootStorageGate.exec(body);
    if (gate) {
      findings.push(finding('root-storage-gate', 'review', 'Root navigation may gate the interface on storage availability. Open storage within a Feature data request and present its error in the feature screen, never a root wrapper or app-wide blocking overlay.', file, lineOf(source, offset + gate.index)));
    }
  }
  const viewNames = new Set();
  const extendedViews = new Set();
  for (const source of sources.values()) {
    for (const view of source.matchAll(viewDeclarations)) viewNames.add(view[1]);
    for (const view of source.matchAll(viewConformances)) {
      viewNames.add(view[1]);
      extendedViews.add(view[1]);
    }
  }
  for (const source of sources.values()) {
    for (const app of source.matchAll(appDeclarations)) {
      const appBody = braceBody(source, app.index + app[0].length - 1);
      const scene = sceneBodyPattern.exec(appBody);
      if (!scene) continue;
      const body = braceBody(appBody, scene.index + scene[0].length - 1);
      for (const root of body.matchAll(/\bWindowGroup\s*(?:\([^{}]*\)\s*)?\{\s*(\w+)\s*\(/g)) {
        if (viewNames.has(root[1])) rootViewNames.add(root[1]);
      }
    }
  }
  function declarationsForViews(source) {
    const direct = [...source.matchAll(viewDeclarations)];
    if (!extendedViews.size) return direct;
    const directOffsets = new Set(direct.map(view => view.index));
    const extended = [...source.matchAll(/\bstruct\s+(\w+)\b[^{}]*\{/g)]
      .filter(view => extendedViews.has(view[1]) && !directOffsets.has(view.index));
    return [...direct, ...extended].sort((a, b) => a.index - b.index);
  }
  const swiftDataAccess = /\b(?:ModelContainer|ModelContext)\b|@(?:SwiftData\s*\.\s*)?Query\b|\.(?:modelContainer|`modelContainer`)\s*\(|(?:@(?:SwiftUI\s*\.\s*)?Environment|\.\s*environment)\s*\(\s*\\\s*(?:(?:SwiftUI\s*\.\s*)?EnvironmentValues\s*)?\.\s*modelContext\b/;
  for (const [file, source] of sources) {
    const isViewFile = /(?:^|\/)1 - View\//.test(file);
    const previewRanges = [];
    const reviewedAppModelDeclarations = new Set();
    for (const preview of source.matchAll(/(?:#Preview\b\s*(?:\([^{}]*?\)\s*)?|\b(?:struct|enum|class|extension)\s+\w+\s*:[^{}]*?\bPreviewProvider\b[^{}]*)\{/g)) {
      const start = preview.index + preview[0].length;
      const previewBody = braceBody(source, start - 1);
      const access = findFeatureAccess(previewBody);
      const composition = /\bAppModel\s*(?:\.\s*(?:live|init)\s*)?\(/.exec(previewBody);
      if (composition) {
        findings.push(finding('preview-app-model-composition', 'review', 'This preview appears to construct AppModel. Verify that the preview constructs the View and uses its normal ViewModel and Feature route.', file, lineOf(source, start + composition.index)));
      }
      for (const line of swiftDataLines(previewBody, start)) {
        findings.push(finding('view-swiftdata-access', 'review', 'This preview appears to access SwiftData directly. Preview construction follows the same CFA storage boundary as the app.', file, line));
      }
      previewRanges.push({start, end: start + previewBody.length});
      if (access) {
        findings.push(finding('preview-feature-access', 'review', 'This preview appears to access a Feature directly. A normal CFA preview constructs the View and uses its usual ViewModel and Feature route.', file, lineOf(source, start + access.index)));
      }
    }
    for (const view of declarationsForViews(source)) {
      const start = view.index + view[0].length;
      const body = braceBody(source, start - 1);
      inspectScreenInputs(view[1], body, source, start, file, findings);
      const members = memberSignatures(body);
      for (const { index, type } of storedTypedMembers(members, body)) {
        const isFeature = featureTypeSuffix.test(type);
        if (!isFeature && !serviceTypeSuffix.test(type) && type !== 'AppModel') continue;
        if (type === 'AppModel') reviewedAppModelDeclarations.add(start + index);
        const code = isFeature ? 'view-stored-feature' : 'view-stored-model-dependency';
        findings.push(finding(code, 'review', `${view[1]} appears to store ${type} directly. Verify that Feature access goes through the screen-owned ViewModel.`, file, lineOf(source, start + index)));
      }
      const viewModelInput = /(?:^|(?<=;))[ \t]*(?:@(?:SwiftUI\s*\.\s*)?(State|StateObject|ObservedObject|Bindable)\s+)?(?:(?:private|fileprivate|internal|package|public)\s+)?(?:let|var)\s+`?\w+`?\s*:\s*(?:\w+\s*\.\s*)*(\w+ViewModel)\b(?!\s*\.)(?:[ \t]*[?!])?/gm;
      for (const match of members.matchAll(viewModelInput)) {
        const [declaration, wrapper, type] = match;
        if (wrapper === 'State' || wrapper === 'StateObject') continue;
        const suffix = body.slice(match.index + declaration.length);
        if (hasComputedAccessor(suffix) || /^\s*=/.test(suffix)) continue;
        findings.push(finding('view-model-input-storage', 'review', `${view[1]} declares ${type} storage without an inline value. Trace its initialization to check whether another View supplies the ViewModel.`, file, lineOf(source, start + match.index)));
      }
      for (const storedModel of members.matchAll(inferredAppModelStorage)) {
        findings.push(finding('stored-app-model', 'review', 'This View appears to retain AppModel.shared in a stored property. Resolve the required Features through its ViewModel.', file, lineOf(source, start + storedModel.index)));
      }

      for (const match of members.matchAll(new RegExp(`\\b(?:let|var)\\s+${propertyNamePattern}\\s*(?::\\s*(?:(?<genericWrapper>(?:Swift\\s*\\.\\s*)?(?:(?:Optional|Array)\\s*<|Dictionary\\s*<\\s*\\w+\\s*,)\\s*)|(?<bracketWrapper>\\[\\s*(?:\\w+\\s*:\\s*)?))?(?:(?:Swift|_Concurrency)\\s*\\.\\s*)?Task\\s*<|(?<inferred>=\\s*(?:(?:Swift|_Concurrency)\\s*\\.\\s*)?Task\\b))`, 'gu'))) {
        const suffix = body.slice(match.index + match[0].length);
        if (match.groups.inferred) {
          const genericStart = /^\s*</.exec(suffix);
          const close = genericStart ? closingGenericArguments(suffix, genericStart[0].length - 1) : -1;
          const call = suffix.slice(close + 1);
          if (!/^\s*(?:\.\s*(?:init|detached)\s*)?[({]/.test(call)) continue;
        } else {
          const close = closingGenericArguments(body, match.index + match[0].length - 1);
          let afterType = body.slice(close + 1);
          if (match.groups.genericWrapper) afterType = afterType.replace(/^\s*>/, '');
          if (match.groups.bracketWrapper) afterType = afterType.replace(/^\s*\]/, '');
          if (close >= 0 && hasComputedAccessor(afterType.replace(/^\s*[?!]/, ''))) continue;
        }
        findings.push(finding('screen-task-handle', 'review', `${view[1]} declares ${match[1] ?? match[2]} with a possible Task handle. If it stores the handle, move task ownership to the ViewModel.`, file, lineOf(source, start + match.index)));
      }
      if (rootViewNames.has(view[1])) {
        inspectRootNavigation(body, file, source, start);
        continue;
      }
      const access = findFeatureAccess(body);
      if (access) {
        findings.push(finding('view-feature-access', 'review', 'This View appears to access a Feature directly. Trace the call and route intent and state through the owning screen and ViewModel.', file, lineOf(source, start + access.index)));
      }
    }
    for (const app of source.matchAll(appDeclarations)) {
      const start = app.index + app[0].length;
      const members = braceBody(source, start - 1);
      const sceneBody = sceneBodyPattern.exec(members);
      if (sceneBody) {
        const bodyStart = sceneBody.index + sceneBody[0].length;
        const body = braceBody(members, bodyStart - 1);
        const conditional = /(?<!#)\b(?:if|switch)\b/.exec(body);
        const presentation = swiftDataAccess.exec(body) ?? /\b(?:ProgressView|ContentUnavailableView)\s*\(/.exec(body);
        if (conditional) findings.push(finding('conditional-app-body', 'review', 'App.body contains a conditional. Check whether it gates root navigation on storage or an unrelated condition.', file, lineOf(source, start + bodyStart + conditional.index)));
        if (presentation) findings.push(finding('app-startup-presentation', 'review', 'App.body contains storage or loading presentation. Check whether database availability gates the interface; a lexical match alone cannot establish this.', file, lineOf(source, start + bodyStart + presentation.index)));
      }
    }
    function swiftDataLines(scope, offset) {
      const lines = new Set();
      for (const match of scope.matchAll(new RegExp(swiftDataAccess, 'g'))) {
        const index = offset + match.index;
        if (!previewRanges.some(({start, end}) => index >= start && index < end)) {
          lines.add(lineOf(source, index));
        }
      }
      return lines;
    }
    if (!isViewFile) {
      for (const view of declarationsForViews(source)) {
        const start = view.index + view[0].length;
        const body = braceBody(source, start - 1);
        inspectLifecycleClosures(body, file, findings, lineOf(source, start));
        for (const line of swiftDataLines(body, start)) {
          findings.push(finding('view-swiftdata-access', 'review', 'This SwiftUI View appears to access SwiftData directly. Verify that storage is reached through its ViewModel and Feature.', file, line));
        }
      }
      for (const extension of source.matchAll(/\bextension\s+(\w+)\b(?!\s*\.)[^{}]*\{/g)) {
        if (!viewNames.has(extension[1])) continue;
        const start = extension.index + extension[0].length;
        const body = braceBody(source, start - 1);
        inspectLifecycleClosures(body, file, findings, lineOf(source, start));
        for (const line of swiftDataLines(body, start)) {
          findings.push(finding('view-swiftdata-access', 'review', 'This SwiftUI View extension appears to access SwiftData directly. Verify that storage is reached through its ViewModel and Feature.', file, line));
        }
      }
      continue;
    }
    inspectLifecycleClosures(source, file, findings);
    const modelDeclaration = [...source.matchAll(/\b(?:let|var)\s+\w+\s*:\s*(?:\w+\s*\.\s*)*AppModel\b(?!\s*\.)/g)]
      .find(match => !reviewedAppModelDeclarations.has(match.index));
    if (modelDeclaration) {
      findings.push(finding('stored-app-model', 'review', 'An AppModel-typed declaration appears in the View layer. Check whether a View or ViewModel retains it; this lexical match may be a local value or preview.', file, lineOf(source, modelDeclaration.index)));
    }
    for (const line of swiftDataLines(source, 0)) {
      findings.push(finding('view-swiftdata-access', 'review', 'SwiftData storage access may appear in a View-layer file. Check whether a View, ViewModel or preview accesses storage directly; previews retain the same CFA boundaries. A lexical match alone does not establish how the value is used.', file, line));
    }
  }
  const extensionsByName = new Map();
  for (const [file, source] of sources) {
    for (const extension of source.matchAll(/\bextension\s+(\w+)\b(?!\s*\.)[^{}]*\{/g)) {
      const name = extension[1];
      const offset = extension.index + extension[0].length;
      if (!extensionsByName.has(name)) extensionsByName.set(name, []);
      extensionsByName.get(name).push({file, source, offset, body: braceBody(source, offset - 1)});
    }
  }
  for (const viewFile of [...paths].filter(file => screenPath.test(file)).sort()) {
    const view = sources.get(viewFile);
    const name = screenName(viewFile);
    const declaration = declarationsForViews(view).find(match => match[1] === name);
    if (!declaration) continue;
    const bodyOffset = declaration.index + declaration[0].length;
    const body = braceBody(view, bodyOffset - 1);
    const members = memberSignatures(body);
    const viewModelName = `${name}Model`;
    const viewModelFile = viewFile.replace(/View\.swift$/, 'ViewModel.swift');
    const candidateViewModel = sources.get(viewModelFile);
    const viewModelDeclaration = candidateViewModel && new RegExp(`\\bclass\\s+${viewModelName}\\b[^\\{]*\\{`).exec(candidateViewModel);
    const viewModel = viewModelDeclaration ? candidateViewModel : undefined;
    const viewModelBodyStart = viewModelDeclaration ? viewModelDeclaration.index + viewModelDeclaration[0].length : 0;
    const viewModelBody = viewModelDeclaration ? braceBody(viewModel, viewModelBodyStart - 1) : '';
    const dependencySources = viewModel ? [
      {file: viewModelFile, source: viewModel, offset: viewModelBodyStart, body: viewModelBody},
      ...(extensionsByName.get(viewModelName) ?? [])
    ] : [];
    for (const location of dependencySources) {
      for (const initializer of typeInitializers(location.body)) {
        inspectInitializerTask(viewModelName, initializer, location.source, location.offset, location.file, findings);
        const services = [...new Set(initializer.types.filter(type => serviceTypeSuffix.test(type)))];
        if (services.length) {
          findings.push(finding('view-model-non-feature-dependency', 'review', `${viewModelName} accepts ${services.join(', ')} in its initializer. Verify that the ViewModel calls a Feature and that the Feature owns the service dependency.`, location.file, lineOf(location.source, location.offset + initializer.index)));
        }
      }
    }
    const viewModelMembers = viewModelDeclaration
      ? viewModel.slice(0, viewModelBodyStart).replace(/[^\n]/g, ' ') + memberSignatures(viewModelBody)
      : '';
    const retainedAppModels = [];
    for (const member of storedTypedMembers(viewModelMembers, viewModel ?? '')) {
      if (member.type === 'AppModel') retainedAppModels.push(member);
      if (!serviceTypeSuffix.test(member.type)) continue;
      findings.push(finding('view-model-non-feature-dependency', 'review', `${viewModelName} appears to store ${member.type} directly. Verify that the ViewModel calls a Feature and that the Feature owns the service dependency.`, viewModelFile, lineOf(viewModel, member.index)));
    }
    retainedAppModels.push(...viewModelMembers.matchAll(inferredAppModelStorage));
    for (const match of retainedAppModels) {
      const line = lineOf(viewModel, match.index);
      const existing = findings.findIndex(item => item.code === 'stored-app-model' && item.file === viewModelFile && item.line === line);
      const findingForStorage = finding('stored-app-model', 'review', 'This ViewModel appears to retain AppModel in a stored property. Keep only the concrete Features this screen needs.', viewModelFile, line);
      if (existing < 0) findings.push(findingForStorage);
      else findings[existing] = findingForStorage;
    }
    const testName = `${viewModelName}Tests.swift`;
    const testCandidates = [...paths].filter(file => path.posix.basename(file) === testName);
    const hasCompetingViewModels = (declarationsByName.get(viewModelName)?.length ?? 0) > 1;
    const testFile = testCandidates.length === 1 && !hasCompetingViewModels ? testCandidates[0] : null;
    const viewModelTypePattern = `(?:(?:\\w+\\s*\\.\\s*)*${viewModelName})`;
    const stateTypePattern = `(?:SwiftUI\\s*\\.\\s*)?State`;
    const statePattern = new RegExp(`@${stateTypePattern}\\s+private\\s+var\\s+${propertyNamePattern}(?:\\s*:\\s*${viewModelTypePattern})?\\s*=\\s*${viewModelTypePattern}(?:\\s*\\.\\s*init)?\\s*\\(\\s*\\)(?!\\s*\\.)`, 'u');
    const typedStatePattern = new RegExp(`@${stateTypePattern}\\s+private\\s+var\\s+${propertyNamePattern}\\s*:\\s*${viewModelTypePattern}\\s*=\\s*\\.init\\s*\\(\\s*\\)(?!\\s*\\.)`, 'u');
    const inlineState = statePattern.exec(members) ?? typedStatePattern.exec(members);
    let ownedState = inlineState && { name: inlineState[1] ?? inlineState[2], index: inlineState.index };
    const typedStateProperties = [...members.matchAll(new RegExp(
      `@${stateTypePattern}\\s+private\\s+var\\s+${propertyNamePattern}\\s*:\\s*${viewModelTypePattern}\\b`, 'gu'
    ))].map(match => ({ name: match[1] ?? match[2], index: match.index }));
    const dependencies = [];
    const initializerLocations = [
      {file: viewFile, source: view, offset: bodyOffset, body},
      ...(extensionsByName.get(name) ?? [])
    ];
    const initializers = initializerLocations.flatMap(location =>
      [...typeInitializers(location.body)].map(initializer => ({...initializer, location}))
    );
    for (const { index, parameters, injectedViewModel, injectedAppModel, possibleModelDependencies, initializerBody, location } of initializers) {
      if (!injectedViewModel && !injectedAppModel && !possibleModelDependencies.length && parameters.trim() && viewModel) {
        findings.push(finding('screen-initializer-inputs', 'review', `${name} accepts initializer inputs. Check that a detail screen receives selected immutable data and constructs its own ViewModel. Check for injected Features, repositories, service closures and actions owned by another screen. Reusable presentation components may receive action closures.`, location.file, lineOf(location.source, location.offset + index)));
      }
      if (initializerBody !== null) {
        const ownConstruction = typedStateProperties.find(({name: property}) => new RegExp(
          `(?<![.\\p{L}\\p{M}\\p{N}_])(?:self\\s*\\.\\s*)?_${property}\\s*=\\s*${stateTypePattern}(?:\\s*<\\s*${viewModelTypePattern}\\s*>)?\\s*\\(\\s*(?:initialValue|wrappedValue)\\s*:\\s*(?:${viewModelTypePattern}(?:\\s*\\.\\s*init)?|\\.init)\\s*\\(`, 'u'
        ).test(initializerBody));
        if (parameters.trim() && !injectedViewModel && ownConstruction) ownedState ??= ownConstruction;
        const statePropertyNames = typedStateProperties.map(property => property.name);
        if (inlineState) statePropertyNames.push(inlineState[1] ?? inlineState[2]);
        const assignsViewModel = statePropertyNames.some(property =>
          new RegExp(`(?<![\\p{L}\\p{M}\\p{N}_])_?${property}\\s*=(?!=)`, 'u').test(initializerBody)
        );
        if (assignsViewModel) {
          findings.push(finding('view-model-initializer-construction', 'review', `${name} assigns ViewModel state in init. Verify it constructs its own ViewModel from a selected immutable snapshot and does not accept an injected ViewModel.`, location.file, lineOf(location.source, location.offset + index)));
        }
      }
    }
    if (viewModel) {
      const references = dependencySources.flatMap(location =>
        [...location.body.matchAll(/\bAppModel\s*\.\s*shared\s*\.\s*(\w+)/g)]
          .map(match => ({property: match[1], file: location.file, line: lineOf(location.source, location.offset + match.index)}))
      );
      for (const {property, file, line} of references) {
        const exposure = appProperties.get(property);
        if (exposure && isKnownNonFeatureType(exposure.type)) {
          findings.push(finding('view-model-non-feature-dependency', 'review', `${viewModelName} accesses ${exposure.type} through AppModel.shared.${property}. Verify that the ViewModel uses a concrete Feature for this capability.`, file, line));
          continue;
        }
        const featureType = exposure?.type ?? null;
        const candidates = declarationsByName.get(featureType) || [];
        const featureFile = candidates.length === 1 ? candidates[0].file : null;
        const featureSource = featureFile ? sources.get(featureFile) : '';
        const collaborators = [...featureSource.matchAll(/\b(?:private\s+)?let\s+\w+\s*:\s*(?:any\s+)?(\w+(?:Repository|Provider|Responding|Client|Store|Service))\b/g)]
          .map(item => item[1]);
        dependencies.push({ property, featureType, featureFile, collaborators: [...new Set(collaborators)], sourceFile: file, line });
        if (!exposure) findings.push(finding('unresolved-feature', 'review', `${viewModelName} references AppModel.shared.${property}, but the inspector could not resolve it in the AppModel declarations. Check conditional extensions, inferred types and target membership.`, file, line));
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
    const rootScopes = [body, ...(extensionsByName.get(name) ?? []).map(extension => extension.body)];
    const structuralRoot = rootViewNames.has(name)
      && rootScopes.some(scope => /\bTabView\s*[(\{]/.test(scope))
      && !rootScopes.some(scope => findFeatureAccess(scope) || rootStorageGate.test(scope) || swiftDataAccess.test(scope));
    if (!viewModel && !structuralRoot) findings.push(finding('view-model-missing', 'review', `${name} has no adjacent ${viewModelName}. Verify whether it is a screen requiring a dedicated ViewModel or a reusable presentation component.`, viewFile, 1));
    else if (viewModel) {
      if (!ownsViewModel) findings.push(finding('view-model-ownership', 'review', `${name} has no recognized private @State ViewModel storage. Verify that the screen constructs and stores its ViewModel. Detail Views may initialize that stored state from a selected immutable snapshot. A computed property does not satisfy CFA screen ownership.`, viewFile, lineOf(view, declaration.index)));
      if (!dependencies.length) findings.push(finding('feature-route-unresolved', 'review', `${viewModelName} has no visible AppModel.shared feature route; inspect whether this screen is presentation-only.`, viewModelFile, 1));
      const suiteDeclarations = declarationsByName.get(`${viewModelName}Tests`) ?? [];
      for (const file of testCandidates) {
        if (!suiteDeclarations.some(candidate => candidate.file === file
          && ['class', 'struct', 'enum'].includes(candidate.declaration.type))) {
          findings.push(finding('view-model-test-suite-unresolved', 'review', `${testName} matches by filename. Verify that it contains the named test suite and exercises ${viewModelName}.`, file, 1));
        }
        const inProduction = productionSourceTree.test(file);
        const hasTestFolder = file.split('/').some(folder => /^(?:ViewModelTests|View model tests)$/i.test(folder));
        if (inProduction || !hasTestFolder) {
          const location = inProduction ? 'in a production source tree' : 'outside a dedicated ViewModel test folder';
          findings.push(finding('view-model-test-placement', 'review', `${testName} appears ${location}. Verify its Xcode navigator group and unit-test target membership.`, file, 1));
        }
      }
      if (testCandidates.length > 1) findings.push(finding('view-model-tests-ambiguous', 'review', `Multiple files match ${testName}: ${testCandidates.join(', ')}. Verify which test target covers this ViewModel.`, viewModelFile, 1));
      if (testCandidates.length === 1 && hasCompetingViewModels) {
        findings.push(finding('view-model-tests-ambiguous', 'review', `${testCandidates[0]} matches multiple declarations named ${viewModelName}. Verify which declaration the test target covers.`, viewModelFile, 1));
      }
      if (!testCandidates.length) findings.push(finding('view-model-tests-missing', 'review', `No ${testName} was found in the scanned directory. Check the project root and test target before concluding the test is missing.`, viewModelFile, 1));
    }
    screens.push({ name, viewFile, viewModelFile: viewModel ? viewModelFile : null, ownsViewModel, structuralRoot, testFile, testCandidates, dependencies });
  }

  for (const [name, extensions] of extensionsByName) {
    if (!viewNames.has(name)) continue;
    for (const {file, source, offset, body} of extensions) {
      inspectScreenInputs(name, body, source, offset, file, findings);
      if (rootViewNames.has(name)) {
        inspectRootNavigation(body, file, source, offset);
        continue;
      }
      const access = findFeatureAccess(body);
      if (access) {
        findings.push(finding('view-feature-access', 'review', 'This View extension appears to access a Feature directly. Trace the call and route it through the owning ViewModel.', file, lineOf(source, offset + access.index)));
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
      'Screen ownership mapping uses conventionally named screen files and adjacent ViewModels. Explicit initializer input checks include recognized View extensions. Stored-property checks can surface possible implicit memberwise inputs. Confirm aliases and actual call sites in source.',
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
        : screen.testCandidates?.length === 1 ? 'matching test file needs target verification'
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
