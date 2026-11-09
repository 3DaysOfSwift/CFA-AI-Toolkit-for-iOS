import test from 'node:test';
import assert from 'node:assert/strict';
import {auditEntitlements} from '../src/entitlement-audit.mjs';

const analysis={sourceFingerprint:'abc',scope:{includeTests:false,fileCount:3,excludedTestDirectories:['AppTests'],targetMembership:'Not resolved'},syntax:{status:'available',coverage:'matching'},compilerIndex:{status:'available',calls:[{calleeID:'caller-1',caller:'openExport',file:'View.swift',line:8,column:5},{calleeID:'caller-1',caller:'openExport',file:'View.swift',line:8,column:25}]},callCandidates:[{written:'exportFeature.export',file:'ExportViewModel.swift',line:20,column:5,enclosingFunction:'export',possibleIndexMatches:[{callerID:'caller-1'},{callerID:'caller-1'}]},{written:'other.export',file:'Other.swift',line:1,column:1}]};
test('paid capability matches are review leads, with possible indexed callers',()=>{
  const result=auditEntitlements(analysis,{capabilities:[{name:'Export',writtenCalls:['exportFeature.export']}]});
  assert.equal(result.capabilities[0].status,'review-required');
  assert.equal(result.capabilities[0].calls.length,1);
  assert.deepEqual(result.capabilities[0].calls[0].possibleIndexedCallers,[
    {caller:'openExport',callerID:null,calleeID:'caller-1',file:'View.swift',line:8,column:5},
    {caller:'openExport',callerID:null,calleeID:'caller-1',file:'View.swift',line:8,column:25}
  ]);
  assert.equal(result.sourceFingerprint,'abc');
  assert.deepEqual(result.scope, analysis.scope);
  const compilerIndex = {...analysis.compilerIndex, module:'ExampleApp', reason:'Build coverage is unverified.', indexFreshness:'unverified', excludedCalls:3};
  const indexed = auditEntitlements({...analysis, compilerIndex}, {
    capabilities:[{name:'Export', writtenCalls:['exportFeature.export']}]
  });
  assert.equal(indexed.indexModule, compilerIndex.module);
  assert.equal(indexed.indexReason, compilerIndex.reason);
  assert.equal(indexed.indexFreshness, compilerIndex.indexFreshness);
  assert.equal(indexed.indexExcludedCalls, 3);
});
test('traces upstream indexed callers through helpers and stops at cycles', () => {
  const compilerIndex = {status:'available', calls:[
    {calleeID:'caller-1', callerID:'router', caller:'route', file:'Router.swift', line:7, column:5},
    {calleeID:'router', callerID:'shortcut', caller:'perform', file:'Shortcut.swift', line:3, column:5},
    {calleeID:'shortcut', callerID:'router', caller:'route', file:'Router.swift', line:9, column:5}
  ]};
  const result = auditEntitlements({...analysis, compilerIndex}, {
    capabilities:[{name:'Export', writtenCalls:['exportFeature.export']}]
  });
  const [match] = result.capabilities[0].calls;
  assert.deepEqual(match.possibleIndexedCallers.map(call => call.file), ['Router.swift']);
  assert.deepEqual(match.possibleIndexedEnclosingIDs, ['caller-1']);
  assert.deepEqual(match.possibleIndexedCallers.map(call => [call.callerID, call.calleeID]), [['router', 'caller-1']]);
  assert.deepEqual(match.possibleIndexedUpstreamCallers.map(call => [call.callerID, call.calleeID]), [
    ['shortcut', 'router'], ['router', 'shortcut']
  ]);
  assert.equal(match.status, 'review-required');
});

test('no matches and missing syntax cannot be reported as a pass',()=>{
  const result=auditEntitlements({...analysis,syntax:{status:'unavailable',reason:'Xcode not selected'},callCandidates:[]},{capabilities:[{name:'Export',writtenCalls:['exportFeature.export']}]});
  assert.equal(result.capabilities[0].status,'no-matches-unverified');
  assert.equal(result.syntaxStatus,'unavailable');
  assert.equal(result.syntaxReason,'Xcode not selected');
  assert.ok(result.verification.some(step => step.includes('alternate entry points')));
  assert.ok(result.verification.some(step => step.includes('resumed route checks again')));
  assert.ok(result.verification.some(step => step.includes('PurchasesFeature owns entitlement state')));
  assert.ok(result.verification.some(step => step.includes('server-protected operations enforce their own authorisation')));
});
test('preserves parser warnings alongside partial entitlement leads', () => {
  const warnings = ['Parser reported errors in ExportViewModel.swift'];
  const syntax = {status:'available',coverage:'unverified',warnings,excludedItems:2,missingFiles:['Shortcut.swift']};
  const result = auditEntitlements({...analysis,syntax}, {
    capabilities:[{name:'Export',writtenCalls:['exportFeature.export']}]
  });
  assert.deepEqual(result.syntaxWarnings,warnings);
  assert.equal(result.syntaxExcludedItems,2);
  assert.deepEqual(result.syntaxMissingFiles,['Shortcut.swift']);
  assert.equal(result.syntaxCoverage,'unverified');
  assert.equal(result.capabilities[0].status,'review-required');
});
test('requires explicit nonempty capability names and call spellings',()=>{
  assert.throws(()=>auditEntitlements(analysis,{capabilities:[]}));
  assert.throws(()=>auditEntitlements(analysis,{capabilities:[null]}), /Each capability requires a name/);
  assert.throws(()=>auditEntitlements(analysis,{capabilities:[{name:'Export',writtenCalls:[]}]}));
  assert.throws(()=>auditEntitlements(analysis,{capabilities:[{name:'A',writtenCalls:['a']},{name:'A',writtenCalls:['b']}]}));
});
