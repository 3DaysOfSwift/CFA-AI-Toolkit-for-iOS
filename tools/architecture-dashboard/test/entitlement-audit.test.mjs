import test from 'node:test';
import assert from 'node:assert/strict';
import {auditEntitlements} from '../src/entitlement-audit.mjs';

const analysis={sourceFingerprint:'abc',syntax:{status:'available',coverage:'matching'},compilerIndex:{status:'available',calls:[{calleeID:'caller-1',caller:'openExport',file:'View.swift',line:8,column:5},{calleeID:'caller-1',caller:'openExport',file:'View.swift',line:8,column:25}]},callCandidates:[{written:'exportFeature.export',file:'ExportViewModel.swift',line:20,column:5,enclosingFunction:'export',possibleIndexMatches:[{callerID:'caller-1'},{callerID:'caller-1'}]},{written:'other.export',file:'Other.swift',line:1,column:1}]};
test('paid capability matches are review leads, with possible indexed callers',()=>{
  const result=auditEntitlements(analysis,{capabilities:[{name:'Export',writtenCalls:['exportFeature.export']}]});
  assert.equal(result.capabilities[0].status,'review-required');
  assert.equal(result.capabilities[0].calls.length,1);
  assert.deepEqual(result.capabilities[0].calls[0].possibleIndexedCallers,[
    {caller:'openExport',file:'View.swift',line:8,column:5},
    {caller:'openExport',file:'View.swift',line:8,column:25}
  ]);
  assert.equal(result.sourceFingerprint,'abc');
  const compilerIndex = {...analysis.compilerIndex, module:'ExampleApp', reason:'Build coverage is unverified.'};
  const indexed = auditEntitlements({...analysis, compilerIndex}, {
    capabilities:[{name:'Export', writtenCalls:['exportFeature.export']}]
  });
  assert.equal(indexed.indexModule, compilerIndex.module);
  assert.equal(indexed.indexReason, compilerIndex.reason);
});
test('no matches and missing syntax cannot be reported as a pass',()=>{
  const result=auditEntitlements({...analysis,syntax:{status:'unavailable',reason:'Xcode not selected'},callCandidates:[]},{capabilities:[{name:'Export',writtenCalls:['exportFeature.export']}]});
  assert.equal(result.capabilities[0].status,'no-matches-unverified');
  assert.equal(result.syntaxStatus,'unavailable');
  assert.equal(result.syntaxReason,'Xcode not selected');
});
test('preserves parser warnings alongside partial entitlement leads', () => {
  const warnings = ['Parser reported errors in ExportViewModel.swift'];
  const syntax = {status:'available',coverage:'unverified',warnings,excludedItems:2};
  const result = auditEntitlements({...analysis,syntax}, {
    capabilities:[{name:'Export',writtenCalls:['exportFeature.export']}]
  });
  assert.deepEqual(result.syntaxWarnings,warnings);
  assert.equal(result.syntaxExcludedItems,2);
  assert.equal(result.syntaxCoverage,'unverified');
  assert.equal(result.capabilities[0].status,'review-required');
});
test('requires explicit nonempty capability names and call spellings',()=>{
  assert.throws(()=>auditEntitlements(analysis,{capabilities:[]}));
  assert.throws(()=>auditEntitlements(analysis,{capabilities:[null]}), /Each capability requires a name/);
  assert.throws(()=>auditEntitlements(analysis,{capabilities:[{name:'Export',writtenCalls:[]}]}));
  assert.throws(()=>auditEntitlements(analysis,{capabilities:[{name:'A',writtenCalls:['a']},{name:'A',writtenCalls:['b']}]}));
});
