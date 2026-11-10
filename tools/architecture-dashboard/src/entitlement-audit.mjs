#!/usr/bin/env node
import fs from 'node:fs/promises';
import {existsSync, realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// Matching written calls gives review leads, never proof of access control.
export function auditEntitlements(analysis, policy) {
  if (!Array.isArray(policy?.capabilities) || !policy.capabilities.length) throw Error('Supply at least one explicitly identified paid capability.');
  const identifiers = new Set();
  for (const capability of policy.capabilities) {
    if (typeof capability?.name !== 'string' || !capability.name.trim() || !Array.isArray(capability.writtenCalls) || !capability.writtenCalls.length || capability.writtenCalls.some(value => typeof value !== 'string' || !value.trim())) throw Error('Each capability requires a name and one or more exact writtenCalls.');
    if (identifiers.has(capability.name)) throw Error(`Duplicate capability: ${capability.name}`);
    identifiers.add(capability.name);
  }
  if (!Array.isArray(analysis?.callCandidates)) throw Error('Analysis does not contain callCandidates.');
  const calls = analysis.callCandidates;
  const indexed = analysis.compilerIndex?.status === 'available' ? analysis.compilerIndex.calls || [] : [];
  const callsByCallee = new Map();
  for (const call of indexed) {
    if (!call.calleeID) continue;
    if (!callsByCallee.has(call.calleeID)) callsByCallee.set(call.calleeID, []);
    callsByCallee.get(call.calleeID).push(call);
  }

  function possibleCallers(matches) {
    const pending = [...new Set(matches.map(match => match.callerID).filter(Boolean))];
    const possibleIndexedEnclosingIDs = [...pending];
    const visited = new Set(pending);
    const direct = new Map();
    const upstream = new Map();
    const directCount = pending.length;
    for (let index = 0; index < pending.length; index++) {
      const leads = index < directCount ? direct : upstream;
      for (const call of callsByCallee.get(pending[index]) ?? []) {
        const lead = {
          caller:call.caller, callerID:call.callerID ?? null, calleeID:call.calleeID,
          file:call.file, line:call.line, column:call.column
        };
        const key = JSON.stringify(lead);
        if (!direct.has(key)) leads.set(key, lead);
        if (call.callerID && !visited.has(call.callerID)) {
          visited.add(call.callerID);
          pending.push(call.callerID);
        }
      }
    }
    return {
      possibleIndexedEnclosingIDs,
      possibleIndexedCallers:[...direct.values()],
      possibleIndexedUpstreamCallers:[...upstream.values()]
    };
  }
  const capabilities = policy.capabilities.map(capability => {
    const matches = calls.filter(call => capability.writtenCalls.includes(call.written)).map(call => ({
      file:call.file, line:call.line, column:call.column, written:call.written,
      enclosingFunction:call.enclosingFunction || null,
      ...possibleCallers(call.possibleIndexMatches || []),
      status:'review-required'
    }));
    return {name:capability.name, writtenCalls:capability.writtenCalls, status:matches.length ? 'review-required' : 'no-matches-unverified', calls:matches};
  });
  return {schemaVersion:1, sourceFingerprint:analysis.sourceFingerprint || null, scope:analysis.scope ?? null,
    syntaxStatus:analysis.syntax?.status || 'unknown', syntaxCoverage:analysis.syntax?.coverage || 'unverified',
    syntaxWarnings:analysis.syntax?.warnings || [], syntaxReason:analysis.syntax?.reason || null,
    syntaxMissingFiles:analysis.syntax?.missingFiles ?? [],
    syntaxExcludedItems:analysis.syntax?.excludedItems ?? null,
    indexStatus:analysis.compilerIndex?.status || 'unknown',
    indexModule:analysis.compilerIndex?.module || null, indexReason:analysis.compilerIndex?.reason || null,
    indexFreshness:analysis.compilerIndex?.indexFreshness || 'unverified',
    indexExcludedCalls:analysis.compilerIndex?.excludedCalls ?? null, capabilities,
    verification:[
      'Trace paid presentation and execution on the usual screen and alternate entry points, including routes absent from these results.',
      'Verify PurchasesFeature owns entitlement state and that the screen ViewModel or alternate route caller checks current entitlement before presentation or execution. Test locked and entitled outcomes. On a screen, verify that denied access shows the intended locked or purchase experience.',
      'Keep entitlement and pricing checks outside the paid capability Feature. Verify server-protected operations enforce their own authorisation.',
      'If entitlement can change while the route is suspended, revoke it during the wait and verify that the resumed route checks again and blocks access.'
    ],
    limitations:['Exact written-call matches are candidates, not resolved targets, proof of an entitlement check, or proof of a missing check.', 'Aliases, dynamic dispatch, properties, closures, external modules and unlisted spellings can be missed.', 'Direct and upstream indexed callers are possible navigation leads; index freshness and target coverage must be verified.', 'Inspect each entry point and test locked and entitled outcomes. No matches do not imply protection.']};
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args=process.argv.slice(2), options={};
    while (args.length) { const flag=args.shift(), value=args.shift(); if (!['--analysis','--policy','--out'].includes(flag) || !value || options[flag]) throw Error('Usage: node entitlement-audit.mjs --analysis <analysis.json> --policy <paid-capabilities.json> --out <new-report.json>'); options[flag]=value; }
    if (!options['--analysis'] || !options['--policy'] || !options['--out']) throw Error('Supply --analysis, --policy and --out.');
    const [analysis,policy]=await Promise.all([fs.readFile(options['--analysis'],'utf8'),fs.readFile(options['--policy'],'utf8')]);
    const result=auditEntitlements(JSON.parse(analysis),JSON.parse(policy));
    await fs.writeFile(options['--out'],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
    console.log(`Saved entitlement review candidates to ${options['--out']}`);
  } catch (error) { console.error(error.message); process.exitCode=1; }
}
