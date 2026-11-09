import {checkOutcome} from './operation-assessments.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Review judgments are authored; validation establishes provenance, not truth.
export async function importReview(report,input,root) {
  const text=v=>typeof v==='string' && v.trim().length>0;
  const fail=m=>{throw Error('Invalid architecture review: '+m)};
  if(input?.schemaVersion!==1 || input.sourceFingerprint!==report.sourceFingerprint) fail('schema or source fingerprint mismatch');
  if(!text(input.scope)||!text(input.author)) fail('scope and author required');
  const review=structuredClone(input), refs=[];
  const list=(items,fields)=>{
    if(!Array.isArray(items)) fail('expected review list');
    for(const item of items) {
      if(!item||!fields.every(k=>text(item[k]))) fail('missing review text');
      if(!Array.isArray(item.evidence)||!item.evidence.length) fail('source evidence required');
      refs.push(...item.evidence);
    }
  };
  list(review.findings??[],['title','status','description','check']);
  for (const criterion of Array.isArray(review.presentation?.criteria) ? review.presentation.criteria : []) {
    if (Array.isArray(criterion?.evidence)) list([criterion], ['title', 'detail']);
  }
  if (review.fileBatches !== undefined) {
    list(review.fileBatches,['title','reason','verification']);
    const seen = new Set();
    for (const batch of review.fileBatches) {
      if (!Array.isArray(batch.files) || !batch.files.length) fail('file batch needs source files');
      for (const file of batch.files) {
        if (!text(file) || !report.files.some(item => item.path === file)) fail('batch file is outside the scan');
        if (seen.has(file)) fail('duplicate batch file');
        if (!batch.evidence.some(ref => ref.file === file)) fail('batch evidence must include each source file');
        seen.add(file);
      }
    }
  }
  for (const [key, isType] of [['fileReviews',false],['typeReviews',true]]) {
    if (review[key] === undefined) continue;
    list(review[key],['file','status','reason','verification']);
    const seen = new Set();
    for (const item of review[key]) {
      const file = report.files.find(f => f.path === item.file);
      if (!file) fail('reviewed file is outside the scan');
      if (!['sound','problem','investigate','unassessed'].includes(item.status)) fail('invalid file or type status');
      if (!item.evidence.some(e => e.file === item.file)) fail('review evidence must include its file');
      if (item.issues !== undefined) {
        list(item.issues,['title','detail']);
        if (item.status !== 'problem' && item.issues.length) fail('issues require a problem status');
      }
      let id = item.file;
      if (isType) {
        if (!text(item.name) || !text(item.kind) || !Number.isInteger(item.line) || !file.declarations.some(d => d.name === item.name && d.type === item.kind && d.line === item.line)) fail('type review must match a scanned declaration');
        if (!item.evidence.some(e => e.file === item.file && e.line <= item.line && e.endLine >= item.line)) fail('type evidence must include its declaration');
        id = JSON.stringify([item.file,item.line,item.kind,item.name]);
      }
      if (seen.has(id)) fail('duplicate file or type review');
      seen.add(id);
      if (item.acceptance !== undefined && (item.status !== 'problem' || !text(item.acceptance?.by) || !text(item.acceptance?.reason))) fail('acceptance requires a problem, developer and reason');
    }
  }
  if(review.operations) {
    const inventory=review.operationInventory;
    if(!inventory || !text(inventory.scope) || !text(inventory.method) || !['partial','complete'].includes(inventory.coverage)) fail('operation inventory scope, method and coverage required');
    list(review.operations,['id','title','trigger','path','stateOwner','taskOwner','isolation','reason','verification']);
    const seen=new Set();
    for(const op of review.operations) {
      if(seen.has(op.id)) fail('duplicate operation');
      seen.add(op.id);
      if (op.group !== undefined && !text(op.group)) fail('operation group must be a non-empty name');
      if (op.steps !== undefined) {
        list(op.steps,['id','title','relation','detail']);
        if (!op.steps.length) fail('operation steps must not be empty');
        const stepIDs = new Set();
        for (const [index, step] of op.steps.entries()) {
          if (stepIDs.has(step.id)) fail('duplicate operation step');
          if (!['event','same-task','child-task','unstructured-task','framework-task','unknown'].includes(step.relation)) fail('invalid operation step relation');
          if (index === 0 && (step.relation !== 'event' || step.parentId !== undefined)) fail('first operation step must be an event');
          if (index > 0 && (!text(step.parentId) || !stepIDs.has(step.parentId) || step.relation === 'event')) fail('operation step needs an earlier parent');
          stepIDs.add(step.id);
        }
      }
      if (op.scenarios !== undefined) {
        list(op.scenarios,['id','title','status','outcome','verification']);
        const ids = new Set();
        for (const scenario of op.scenarios) {
          if (ids.has(scenario.id)) fail('duplicate operation scenario');
          ids.add(scenario.id);
          if (!['repeat','leave','late-result','failure'].includes(scenario.id)) fail('invalid operation scenario');
          if (!['pass','problem','unresolved','not-applicable'].includes(scenario.status)) fail('invalid scenario status');
          if (scenario.status === 'problem' && !text(scenario.consequence)) fail('scenario problem needs a consequence');
        }
      }
      if(op.checks!==undefined) {
        list(op.checks,['id','title','dimension','status','reason','verification']);
        const ids=new Set();
        for(const check of op.checks) {
          if(ids.has(check.id)) fail('duplicate operation check');
          ids.add(check.id);
          if(!['correctness','clarity','cfa'].includes(check.dimension)) fail('invalid check dimension');
          if(!['pass','fail','unresolved','not-checked','not-applicable'].includes(check.status)) fail('invalid check status');
          if(check.status==='unresolved' && (!text(check.question)||!text(check.resolveBy))) fail('unresolved check requires question and resolution');
          if(check.status==='fail' && (!text(check.consequence)||!['local-defect','architectural-conflict','cfa-deviation'].includes(check.problemKind))) fail('failed check requires consequence and classification');
          if(check.status==='fail' && ((check.dimension==='cfa')!==(check.problemKind==='cfa-deviation'))) fail('keep CFA deviations separate from concurrency defects');
        }
        for(const id of ['state-ownership','actor-isolation','task-lifetime','repeated-requests','cancellation','errors','architectural-clarity']) if(!ids.has(id)) fail('missing operation check: '+id);
        if(op.checks.find(c=>c.id==='architectural-clarity').dimension!=='clarity' || op.checks.filter(c=>c.id!=='architectural-clarity' && ['state-ownership','actor-isolation','task-lifetime','repeated-requests','cancellation','errors'].includes(c.id)).some(c=>c.dimension!=='correctness')) fail('invalid core check dimension');
        op.correctness=checkOutcome(op.checks,'correctness');
        op.clarity=checkOutcome(op.checks,'clarity');
        const conflicts=op.checks.filter(c=>c.dimension!=='cfa'&&c.status==='fail');
        if(conflicts.length) op.problemKind=conflicts.some(c=>c.problemKind==='architectural-conflict')?'architectural-conflict':'local-defect';
      }
      for(const field of ['correctness','clarity']) if(!['sound','problem','investigate','unassessed'].includes(op[field])) fail('invalid operation '+field);
      if(!Array.isArray(op.unknowns) || op.unknowns.some(v=>!text(v))) fail('operation unknowns required');
      if(!op.checks && op.unknowns.length && (op.correctness==='sound' && op.clarity==='sound')) fail('resolve unknowns before marking operation sound');
      if((op.correctness==='problem'||op.clarity==='problem') && !['local-defect','architectural-conflict'].includes(op.problemKind)) fail('classify operation problem');
      if(op.recommendation!==undefined && !text(op.recommendation)) fail('invalid recommendation');
      const t=op.triggerSource;
      if(!t || !Number.isInteger(t.line) || t.line<1 || !op.evidence.some(e=>e.file===t.file && e.line<=t.line && e.endLine>=t.line)) fail('operation evidence must include trigger');
      if(op.steps?.length && !op.steps[0].evidence.some(e=>e.file===t.file && e.line<=t.line && e.endLine>=t.line)) fail('event step evidence must include trigger');
    }
  }
  if(review.concurrencyChecks) {
    list(review.concurrencyChecks,['siteId','title','status','path','trigger','navigation','repetition','lifetime','effect','conclusion','verification']);
    const entries=new Map(report.files.flatMap(f=>f.sites).filter(s=>['task','detached','view-task','refresh'].includes(s.kind)).map(s=>[s.id,s]));
    const seen=new Set();
    for(const c of review.concurrencyChecks) {
      if(!entries.has(c.siteId)||seen.has(c.siteId)) fail('invalid or duplicate concurrency entry');
      seen.add(c.siteId);
      if(!['warning','managed','unresolved'].includes(c.status)) fail('invalid concurrency outcome');
      const entry=entries.get(c.siteId);
      if(!c.evidence.some(e=>e.file===entry.file&&e.line<=entry.line&&e.endLine>=entry.line)) fail('concurrency evidence must include its trigger');
    }
  }
  if(review.taskLifetimes) {
    list(review.taskLifetimes,['siteId','handle','creator','wait','cancellation','policy']);
    const roots=new Map(report.files.flatMap(f=>f.sites).filter(s=>['task','detached'].includes(s.kind)).map(s=>[s.id,s]));
    const seen=new Set();
    for(const r of review.taskLifetimes) {
      if(!roots.has(r.siteId)||seen.has(r.siteId)) fail('invalid or duplicate root Task');
      seen.add(r.siteId);
      for(const [key,values] of Object.entries({handle:['tracked','untracked','unknown'],creator:['task','synchronous','unknown'],wait:['awaited','not-awaited','not-applicable','unknown'],cancellation:['forwarded','not-forwarded','not-applicable','unknown']}))if(!values.includes(r[key]))fail('invalid lifetime '+key);
      if(r.creator==='synchronous'&&(r.wait!=='not-applicable'||r.cancellation!=='not-applicable'))fail('synchronous creator has no creating Task relationship');
      if(r.creator==='task'&&(r.wait==='not-applicable'||r.cancellation==='not-applicable'))fail('creating Task requires wait and cancellation review');
    }
  }
  const q=review.testQuality;
  if(q) {
    if(!text(q.scope)) fail('test review scope required');
    list(q.scenarios,['title','status','detail']);
    if(new Set(q.scenarios.map(s=>s.title)).size!==q.scenarios.length) fail('duplicate scenario');
    if(q.scenarios.some(s=>!['identified','not-identified'].includes(s.status))) fail('unsupported scenario status');
    list(q.concerns??[],['title','detail']);
    list(q.keep?[q.keep]:[],['title','detail']);
    q.concerns??=[];
  }
  const base=await fs.realpath(root),cache=new Map();
  const hashes=new Map(report.files.map(f=>[f.path,f.hash]));
  for(const ref of refs) {
    if(!text(ref.file)||path.isAbsolute(ref.file)||ref.file.split(/[\\/]/).includes('..')) fail('evidence must stay inside repository');
    if(!cache.has(ref.file)) {
      const real=await fs.realpath(path.join(base,ref.file));
      if(!real.startsWith(base+path.sep)) fail('evidence symlink escapes repository');
      const source=await fs.readFile(real,'utf8');
      const expected=hashes.get(ref.file)??review.evidenceHashes?.[ref.file];
      if(!expected||createHash('sha256').update(source).digest('hex')!==expected) fail('evidence hash mismatch: '+ref.file);
      cache.set(ref.file,source.split('\n'));
    }
    const lines=cache.get(ref.file);
    if(!Number.isInteger(ref.line)||!Number.isInteger(ref.endLine)||ref.line<1||ref.endLine<ref.line||ref.endLine>lines.length) fail('invalid evidence lines');
    ref.excerpt=lines.slice(ref.line-1,ref.endLine).join('\n');
  }
  return review;
}
