import test from 'node:test';
import assert from 'node:assert/strict';
import {auditEntitlements} from '../src/entitlement-audit.mjs';

const analysis={sourceFingerprint:'abc',syntax:{status:'available',coverage:'matching'},compilerIndex:{status:'available',calls:[{calleeID:'caller-1',caller:'openExport',file:'View.swift',line:8}]},callCandidates:[{written:'exportFeature.export',file:'ExportViewModel.swift',line:20,column:5,enclosingFunction:'export',possibleIndexMatches:[{callerID:'caller-1'}]},{written:'other.export',file:'Other.swift',line:1,column:1}]};
test('paid capability matches are review leads, with possible indexed callers',()=>{
  const result=auditEntitlements(analysis,{capabilities:[{name:'Export',writtenCalls:['exportFeature.export']}]});
  assert.equal(result.capabilities[0].status,'review-required');
  assert.equal(result.capabilities[0].calls.length,1);
  assert.deepEqual(result.capabilities[0].calls[0].possibleIndexedCallers,[{caller:'openExport',file:'View.swift',line:8}]);
  assert.equal(result.sourceFingerprint,'abc');
});
test('no matches and missing syntax cannot be reported as a pass',()=>{
  const result=auditEntitlements({...analysis,syntax:{status:'unavailable'},callCandidates:[]},{capabilities:[{name:'Export',writtenCalls:['exportFeature.export']}]});
  assert.equal(result.capabilities[0].status,'no-matches-unverified');
  assert.equal(result.syntaxStatus,'unavailable');
});
test('requires explicit nonempty capability names and call spellings',()=>{
  assert.throws(()=>auditEntitlements(analysis,{capabilities:[]}));
  assert.throws(()=>auditEntitlements(analysis,{capabilities:[{name:'Export',writtenCalls:[]}]}));
  assert.throws(()=>auditEntitlements(analysis,{capabilities:[{name:'A',writtenCalls:['a']},{name:'A',writtenCalls:['b']}]}));
});
