import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {scanSource,analyse} from '../src/analyse.mjs';
import {importReview} from '../src/review-import.mjs';
import {importTestResults} from '../src/test-results.mjs';

test('Task type declarations are not constructors, regardless of file or line',()=>{
 const source=`
 func load() -> Task<Void, Never> { return Task { await fetch() } }
 func refresh() -> sending
   Task<
      Void, Never
   > { Task<Void, Never> { } }
 var pending: Task<Void, Never> { Task(priority: .high) { } }
 func another() -> Swift.Task<Void, Never> { Task.init { } }
 struct Task<T, E> { }
 extension Task { }
 let retained: Task<Void, Never> = Task { }
 `;
 const found=scanSource(source,'Unrelated.swift').sites.filter(s=>s.kind==='task');
 assert.equal(found.length,5);
 assert.equal(scanSource('func f() -> Task<Void,Never> { fatalError() }','Anything.swift').sites.filter(s=>s.kind==='task').length,0);
 assert.equal(scanSource('struct Plain { var count=0 }','Plain.swift').usesSwiftConcurrency,false);
});

test('test summary rejects inconsistent counts and keeps zero total distinct',()=>{
 const run={passedTests:4,failedTests:0,skippedTests:1,totalTestCount:5,startTime:1};
 assert.equal(importTestResults(run).totalTestCount,5);
 assert.throws(()=>importTestResults({...run,totalTestCount:4}),/sum/);
 assert.throws(()=>importTestResults({...run,passedTests:-1}),/count/);
 assert.equal(importTestResults({passedTests:0,failedTests:0,skippedTests:0,totalTestCount:0,startTime:1}).totalTestCount,0);
});

test('overall failure is retained even when every reported test passed',()=>{
 const run={passedTests:4,failedTests:0,skippedTests:0,totalTestCount:4,startTime:1};
 assert.equal(importTestResults({...run,result:'Failed'}).outcome,'failed');
 assert.equal(importTestResults({...run,result:'Passed'}).outcome,'passed');
 assert.equal(importTestResults(run).outcome,'unknown');
 assert.equal(importTestResults({...run,passedTests:3,failedTests:1,result:'Passed'}).outcome,'failed');
});

test('generic CLI imports reviewed ratings and test results without an example generator',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'dashboard-fixture-'));
 try {
   const app=path.join(root,'Sample');await fs.mkdir(app);await fs.mkdir(path.join(app,'Tests'));
   await fs.writeFile(path.join(app,'Feature.swift'),'actor Feature { func load() async -> Int { 3 } }\n');
   const assertion='func verifiesLoad() async { #expect(await Feature().load() == 3) }\n';
   await fs.writeFile(path.join(app,'Tests','FeatureTests.swift'),assertion);
   const report=await analyse(app);
   const prod={file:'Feature.swift',line:1,endLine:1};
   const ref={file:'Tests/FeatureTests.swift',line:1,endLine:1};
   const input={schemaVersion:1,sourceFingerprint:report.sourceFingerprint,author:'Fixture',scope:'Synthetic contract test',findings:[],testQuality:{scope:'One reviewed scenario',scenarios:[{title:'Load returns expected value',status:'identified',detail:'Assertion verifies output',evidence:[ref]}],concerns:[]},evidenceHashes:{'Tests/FeatureTests.swift':createHash('sha256').update(assertion).digest('hex')}};
   const read=await importReview(report,input,app);
   assert.match(read.testQuality.scenarios[0].evidence[0].excerpt,/#expect/);
   const tampered=structuredClone(input);tampered.testQuality.scenarios[0].evidence[0].file='../outside.swift';
   await assert.rejects(importReview(report,tampered,app),/inside repository/);
   await assert.rejects(importReview(report,{...input,sourceFingerprint:'wrong'},app),/fingerprint/);
   const duplicate=structuredClone(input);duplicate.testQuality.scenarios.push(duplicate.testQuality.scenarios[0]);
   await assert.rejects(importReview(report,duplicate,app),/duplicate/);
   const observations={schemaVersion:1,sourceFingerprint:report.sourceFingerprint,author:'Fixture',createdAt:'2026-09-13',scope:'One rule',journeys:[],separation:{complete:true,hasTestableModel:true,rationale:'Testable actor feature',decisions:[{id:'load',description:'Returns expected value',location:'model',testable:true,evidence:[prod]}]}};
   const run={passedTests:4,failedTests:0,skippedTests:1,totalTestCount:5,startTime:1};
   await fs.writeFile(path.join(root,'review.json'),JSON.stringify(input));
   await fs.writeFile(path.join(root,'notes.json'),JSON.stringify(observations));
   await fs.writeFile(path.join(root,'run.json'),JSON.stringify(run));
   const out=path.join(root,'out');
   execFileSync(process.execPath,[fileURLToPath(new URL('../src/cli.mjs',import.meta.url)),app,'--review',path.join(root,'review.json'),'--observations',path.join(root,'notes.json'),'--test-results',path.join(root,'run.json'),'--project-name','Sample iOS App','--out',out]);
   const html=await fs.readFile(path.join(out,'report.html'),'utf8');
   assert.ok(!html.includes('Trend'));
   const nodes=new Map();let id=0;
   const node=k=>{if(!nodes.has(k))nodes.set(k,{value:k==='kind'?'all':'',innerHTML:'',events:{},setAttribute(){},append(){},after(c){this.afterChild=c},prepend(){},insertAdjacentHTML(p,s){this.innerHTML+=s},addEventListener(n,f){this.events[n]=f},focus(){},scrollIntoView(){this.scrolled=true}});return nodes.get(k)};
   const document={getElementById:node,querySelector:()=>node('nav'),querySelectorAll:()=>[],createElement:()=>node('created-'+id++)};
   vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],{document});
   assert.match(node('separation-gauge').innerHTML,/100%/);
   assert.match(node('separation-gauge').afterChild.innerHTML,/4 \/ 5/);
   assert.match(node('separation-gauge').afterChild.innerHTML,/80% passed/);
   assert.match(node('dashboard').innerHTML,/100 \/ 100/);
   assert.match(node('review').innerHTML,/#expect/);
   node('show-authored-review').events.click();
   assert.equal(node('review').hidden,false);
   assert.equal(node('authored-review').scrolled,true);
   await fs.writeFile(path.join(app,'Tests','FeatureTests.swift'),assertion+'// changed\n');
   await assert.rejects(importReview(report,input,app),/hash mismatch/);
   await fs.writeFile(path.join(app,'Feature.swift'),'struct Plain { var value=3 }');
   assert.throws(()=>execFileSync(process.execPath,[fileURLToPath(new URL('../src/cli.mjs',import.meta.url)),app,'--out',path.join(root,'legacy')],{stdio:'pipe'}),/No Swift Concurrency/);
 } finally { await fs.rm(root,{recursive:true,force:true}); }
});
