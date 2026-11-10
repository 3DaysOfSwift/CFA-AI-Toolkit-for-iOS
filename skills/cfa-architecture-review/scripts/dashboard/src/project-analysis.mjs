#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {existsSync, realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {analyse} from './analyse.mjs';
import {collectSyntax} from './syntax-evidence.mjs';
import {collectIndexedCalls} from './program-map.mjs';

// This is a source-evidence map, not a runtime trace or an automatic verdict.
export async function collectProjectAnalysis(root, options = {}, providers = {}) {
  if (Boolean(options.indexStore) !== Boolean(options.module)) throw Error('Supply both indexStore and module, or neither.');
  root = await fs.realpath(root);
  const scan = providers.analyse || analyse;
  const before = await scan(root, {excludedOutput:options.output, includeTests:options.includeTests});
  if (options.expectedSourceFingerprint !== undefined && before.sourceFingerprint !== options.expectedSourceFingerprint) {
    throw Error('Health Check source fingerprint mismatch. Prepare a fresh inventory and recheck changed evidence.');
  }
  if (!before.files.length) {
    const skipped = before.scope.skipped ?? [];
    if (skipped.length) {
      const details = skipped.map(({file, reason}) => `${file} (${reason})`);
      throw Error(`No Swift source files could be scanned: ${details.join(', ')}.`);
    }
    throw Error('No Swift source files found.');
  }
  const syntax = await (providers.syntax || collectSyntax)(root, {includeTests:options.includeTests});
  let compilerIndex = {status:'not-requested', calls:[], reason:'No compiler index and module were supplied.'};
  if (options.indexStore) {
    try {
      const records = await (providers.index || collectIndexedCalls)(root, options.indexStore, options.module);
      const sourceFiles = new Set(before.files.map(file => file.path));
      const calls = records.filter(call => sourceFiles.has(call.file));
      compilerIndex = {status:calls.length ? 'available' : 'unavailable', module:options.module, indexFreshness:'unverified', calls,
        excludedCalls:records.length-calls.length,
        reason:calls.length ? 'Index freshness, configuration and target completeness are not verified.'
          : 'No indexed calls match the scanned source files.'};
    } catch (error) {
      compilerIndex = {status:'unavailable', module:options.module, calls:[], reason:String(error.message)};
    }
  }
  const after = await scan(root, {excludedOutput:options.output, includeTests:options.includeTests});
  if (before.sourceFingerprint !== after.sourceFingerprint) throw Error('Source changed during analysis. Run it again.');
  const sourceFiles = new Set(before.files.map(file => file.path));
  const syntaxFiles = new Set(syntax.files || []);
  const missingFiles = [...sourceFiles].filter(file => !syntaxFiles.has(file));
  const matchingFileSets = sourceFiles.size === syntaxFiles.size && !missingFiles.length;
  const syntaxCoverage = syntax.status === 'available' && matchingFileSets && !syntax.warnings?.length
    ? 'matching' : 'unverified';
  // A shared source line is a navigation lead, not proof that two records are the same call.
  const indexedByLine = new Map();
  for (const call of compilerIndex.calls) {
    const key = JSON.stringify([call.file,call.line]);
    if (!indexedByLine.has(key)) indexedByLine.set(key,[]);
    indexedByLine.get(key).push(call);
  }
  const syntaxItems = syntax.items || [];
  const scopedSyntaxItems = syntaxItems.filter(item => sourceFiles.has(item.file));
  const excludedSyntaxItems = syntaxItems.length - scopedSyntaxItems.length;
  const callCandidates = scopedSyntaxItems.filter(item => item.kind === 'call.expression').map(item => ({
    file:item.file, line:item.line, column:item.column, written:item.name, enclosingFunction:item.enclosingFunction,
    possibleIndexMatches:indexedByLine.get(JSON.stringify([item.file,item.line])) || []
  }));
  const analysis = {schemaVersion:1, generatedAt:new Date().toISOString(), sourceFingerprint:before.sourceFingerprint,
    scope:before.scope, files:before.files.map(({path,hash})=>({path,hash})),
    nativeSources:before.nativeSources || [], buildDefinitions:before.buildDefinitions || [], syntax:{...syntax,items:scopedSyntaxItems,excludedItems:excludedSyntaxItems,missingFiles:syntax.status === 'available' ? missingFiles : [],coverage:excludedSyntaxItems ? 'unverified' : syntaxCoverage}, compilerIndex, callCandidates,
    limitations:['Syntax calls and lexical task nesting are not resolved relationships or runtime parentage.',
      'Same-line index matches are candidates only; multiple calls and macros can make them ambiguous.',
      'Compiler-index calls reflect an unverified build configuration and are not proof of runtime dispatch.',
      'Build definition hashes identify scanned files. Determine effective Swift language mode and default actor isolation from the selected target and build configuration.',
      'Target membership, dynamic callbacks, task ownership and behaviour require source review.']};
  return {inventory:before, analysis};
}

export async function analyseProject(root, options = {}, providers = {}) {
  return (await collectProjectAnalysis(root, options, providers)).analysis;
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args=process.argv.slice(2), root=args.shift();
    const options={};
    while (args.length) {
      const flag=args.shift(), value=args.shift();
      if (!value || !['--out','--index-store','--module'].includes(flag)) throw Error('Usage: node project-analysis.mjs <project-root> --out <new-analysis.json> [--index-store <path> --module <name>]');
      const key={'--out':'output','--index-store':'indexStore','--module':'module'}[flag];
      if (options[key]) throw Error(`Duplicate option: ${flag}`);
      options[key]=value;
    }
    if (!root || !options.output) throw Error('Usage: node project-analysis.mjs <project-root> --out <new-analysis.json> [--index-store <path> --module <name>]');
    const report=await analyseProject(root, options);
    await fs.writeFile(options.output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    console.log(`Analysed ${report.files.length} source files; SwiftSyntax: ${report.syntax.status}; compiler index: ${report.compilerIndex.status}. Saved ${options.output}`);
  } catch (error) { console.error(error.message); process.exitCode=1; }
}
