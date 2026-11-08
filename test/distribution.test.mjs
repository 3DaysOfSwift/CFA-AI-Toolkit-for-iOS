import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { stageRelease } from '../scripts/build.mjs';
import { root, skills, iconSkills, starterIcon } from '../scripts/sync.mjs';
import { validate } from '../scripts/validate.mjs';
import { install } from '../scripts/install.mjs';
import { json, hash, inventory, isReleasePath } from '../scripts/files.mjs';

function sandbox(t) { const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cfa-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir; }
function release(t) {const dir=sandbox(t);return {dir,source:stageRelease(path.join(dir,'ios-app-development-cfa'))};}

test('release omits local Xcode state and build outputs, but retains shared project configuration', t => {
 for (const file of ['A.xcodeproj/xcuserdata/person.xcuserdatad/state', 'View.xcuserstate',
  '.DS_Store', 'App/.build/debug/out', 'App/DerivedData/out', 'App/.git/config']) assert.equal(isReleasePath(file),false,file);
 for (const file of ['A.xcodeproj/xcshareddata/xcschemes/App.xcscheme',
  'Package.swift', '.swiftpm/configuration/registries.json', 'Package.resolved']) assert.equal(isReleasePath(file),true,file);
 const {source}=release(t);
 assert.ok(Object.keys(inventory(source)).every(isReleasePath));
 const helper=path.join(source,'skills/cfa-architecture-review/scripts/explanations.mjs');
 const lookup=spawnSync(process.execPath,[helper,'lookup','CFA-TASK-01'],{encoding:'utf8'});
 assert.equal(lookup.status,0,lookup.stderr);
 assert.equal(JSON.parse(lookup.stdout).links[0].url,'https://www.3daysofswiftconcurrency.com/cfa/explanation/unstructured-tasks');
});

test('release keeps runnable Starter Apps separate from installable Xcode templates', t => {
 const {dir,source}=release(t);
 const projects = [
  'Habit Tracker/HabitTrackerTemplate.xcodeproj/project.pbxproj',
  'Habit Tracker Pro/HabitTrackerPro.xcodeproj/project.pbxproj',
  'Todays Twenty/TimesThirty.xcodeproj/project.pbxproj'
 ];
 for (const project of projects) {
  const relative=path.join('starter-apps',project);
  assert.equal(hash(path.join(source,relative)),hash(path.join(root,relative)));
 }
 for (const relative of ['starter-apps/README.md','templates/Xcode/README.md']) {
  assert.ok(fs.existsSync(path.join(source,relative)),relative);
 }
 for (const old of ['Habit Tracker iOS','Habit Tracker Pro iOS','Day Streak iOS']) {
  assert.equal(fs.existsSync(path.join(source,'templates/Xcode',old)),false);
 }
 const destination=path.join(dir,'xcode-templates');
 const result=spawnSync(process.execPath,[path.join(source,'scripts/install-xcode-template.mjs'),'--destination',destination],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const applicationFolder=path.join(destination,'Project Templates/iOS/Application');
 assert.deepEqual(fs.readdirSync(applicationFolder).sort(),['CFA App Tests.xctemplate','CFA App.xctemplate','Day Streak Tests.xctemplate','Day Streak.xctemplate','Habit Tracker Tests.xctemplate','Habit Tracker.xctemplate']);
 assert.equal(fs.existsSync(path.join(destination,'starter-apps')),false);
});

test('standalone release carries scanner dependencies and scans outside the source checkout',t=>{
 const {dir,source}=release(t); const destination=path.join(dir,'customer');
 const result=install({source,destination,mode:'skills'});
 assert.equal(result.status,'installed');
 assert.equal(result.paths.length,8);
 for(const installed of result.paths) assert.ok(fs.existsSync(path.join(installed,'SKILL.md')));
 const tidy=path.join(destination,'.agents/skills/cfa-codebase-tidy');
 assert.ok(result.paths.includes(tidy));
 for(const resource of ['references/cfa-specification.md','references/product-behaviour-contract.md','agents/openai.yaml','LICENSE']) assert.ok(fs.existsSync(path.join(tidy,resource)));
 assert.equal(hash(path.join(tidy,'references/cfa-specification.md')),hash(path.join(root,'architecture/cfa-specification.md')));
 const cli=path.join(destination,'.agents/skills/cfa-architecture-review/scripts/dashboard/src/cli.mjs');
 const fixture=path.join(dir,'unrelated-app');fs.mkdirSync(fixture);
 fs.writeFileSync(path.join(fixture,'Feature.swift'),'actor Feature { func refresh() async { await Task.yield() } }');
 const report=path.join(dir,'report');
 const execution=spawnSync(process.execPath,[cli,fixture,'--out',report],{cwd:dir,encoding:'utf8'});
 assert.equal(execution.status,0,execution.stderr);
 assert.ok(fs.existsSync(path.join(report,'report.html')));
 assert.equal(json(path.join(report,'report.json')).scope.fileCount,1);
 const analysis=path.join(dir,'migration-analysis.json');
 const migration=path.join(destination,'.agents/skills/swift-concurrency-migration/scripts/project-analysis/project-analysis.mjs');
 for (const name of ['Serial Weight Saves','Callback Networking','MainActor Result','Observation Migration']) {
  for (const relative of [`${name}/Before.playground/Contents.swift`, `${name}/After.playground/Contents.swift`, `${name}/case.md`]) {
  const example=path.join(destination,'.agents/skills/swift-concurrency-migration/assets/migration-examples',relative);
  assert.equal(hash(example),hash(path.join(root,'examples/migration',relative)));
  }
 }
 const migrationRun=spawnSync(process.execPath,[migration,fixture,'--out',analysis],{cwd:dir,encoding:'utf8',timeout:120000});
 assert.equal(migrationRun.status,0,migrationRun.stderr);
 const shared=json(analysis);
 assert.equal(shared.files.length,1);
 assert.equal(shared.compilerIndex.status,'not-requested');
 assert.ok(fs.existsSync(result.command));
 const command=spawnSync(result.command,['dashboard',fixture],{cwd:dir,encoding:'utf8'});
 assert.equal(command.status,0,command.stderr);
 assert.equal(fs.readdirSync(fixture).filter(name=>name.startsWith('cfa-dashboard-')).length,1);
 assert.equal(fs.readFileSync(path.join(fixture,'Feature.swift'),'utf8'),'actor Feature { func refresh() async { await Task.yield() } }');
});

test('installed architecture-review skill inventories an app and creates its Health Check report',t=>{
 const {dir,source}=release(t), destination=path.join(dir,'customer');
 install({source,destination,mode:'skills'});
 const skill=path.join(destination,'.agents/skills/cfa-architecture-review');
 const cli=path.join(skill,'scripts/dashboard/src/whole-app-health.mjs');
 assert.ok(fs.existsSync(path.join(skill,'scripts/dashboard/src/health-report.mjs')));
 const app=path.join(dir,'example-app'); fs.mkdirSync(app);
 const sourceFile=path.join(app,'Example.swift');
 fs.writeFileSync(sourceFile,'struct Example { func refresh() async { await Task.yield() } }\n');
 const inventory=path.join(dir,'health-inventory');
 const scan=spawnSync(process.execPath,[cli,'prepare',app,inventory],{cwd:dir,encoding:'utf8'});
 assert.equal(scan.status,0,scan.stderr);
 const fingerprint=json(path.join(inventory,'inventory.json')).sourceFingerprint;
 const review=path.join(dir,'health-review.json');
 fs.writeFileSync(review,JSON.stringify({schemaVersion:1,sourceFingerprint:fingerprint,author:'Reviewer',scope:'Example app',presentation:{app:'Example',summary:'Example assessment',verdict:'Clear ownership',conclusion:'More evidence is needed.',criteria:[{title:'Example',detail:'Investigated.',status:'concern'}]}}));
 const report=path.join(dir,'health-report.html');
 const generation=spawnSync(process.execPath,[cli,'report',app,review,report],{cwd:dir,encoding:'utf8'});
 assert.notEqual(generation.status,0);
 assert.match(generation.stderr,/no report was generated/);
 assert.equal(fs.existsSync(report),false);
 assert.ok(fs.existsSync(path.join(inventory,'checklist.json')));
 assert.equal(fs.readFileSync(sourceFile,'utf8'),'struct Example { func refresh() async { await Task.yield() } }\n');
});

test('portable installation accepts an explicit host skill directory',t=>{
 const {dir,source}=release(t); const destination=path.join(dir,'customer');
 const skillsDirectory=path.join(destination,'.claude','skills');
 const result=install({source,destination,mode:'skills',skillsDirectory});
 assert.equal(result.paths.length,8);
 assert.ok(result.paths.every(item=>item.startsWith(skillsDirectory+path.sep)));
 assert.ok(fs.existsSync(path.join(skillsDirectory,'cfa-feature-work','SKILL.md')));
 assert.ok(fs.existsSync(path.join(skillsDirectory,'cfa-unit-tests','SKILL.md')));
 assert.equal(fs.existsSync(path.join(destination,'.agents','skills')),false);
});

test('every portable skill carries the shared workflow and separate design defaults', t => {
 const {dir,source}=release(t);
 const destination=path.join(dir,'customer');
 install({source,destination,mode:'skills'});
 for (const name of skills) {
  const installed=path.join(destination,'.agents/skills',name);
  const entry=fs.readFileSync(path.join(installed,'SKILL.md'),'utf8');
  assert.ok(entry.includes('(references/project-workflow.md)'),name);
  for (const file of ['project-workflow.md','new-app-design-defaults.md']) {
   assert.equal(hash(path.join(installed,'references',file)),
    hash(path.join(root,'architecture',file)),name);
  }
 }
});

test('release validation rejects a missing workflow policy and an entry point that bypasses it', t => {
 const {source}=release(t);
 const skill=path.join(source,'skills/cfa-feature-work');
 const policy=path.join(skill,'references/project-workflow.md');
 const original=fs.readFileSync(policy);
 fs.unlinkSync(policy);
 assert.throws(()=>validate(source,{source:false}),/Missing workflow reference/);
 fs.writeFileSync(policy,original);
 const entry=path.join(skill,'SKILL.md');
 fs.writeFileSync(entry,fs.readFileSync(entry,'utf8').replace('(references/project-workflow.md)',''));
 assert.throws(()=>validate(source,{source:false}),/Missing workflow policy entry point/);
});

test('release validation rejects a stale bundled reference Feature', t => {
 const {source}=release(t);
 const reference=path.join(source,'skills/cfa-app-creation/references/reference-feature.md');
 fs.appendFileSync(reference,'\nOutdated example.\n');
 assert.throws(()=>validate(source,{source:false}),/Stale reference Feature: cfa-app-creation/);
});

test('release validation rejects a stale product behaviour contract', t => {
 const {source}=release(t);
 const contract=path.join(source,'skills/swift-concurrency-migration/references/product-behaviour-contract.md');
 fs.appendFileSync(contract,'\nOutdated guidance.\n');
 assert.throws(()=>validate(source,{source:false}),/Stale product behaviour contract: swift-concurrency-migration/);
});

test('source validation rejects stale bundled dashboard metadata', t => {
 const source=path.join(sandbox(t),'source');
 fs.cpSync(root,source,{recursive:true,filter: file => isReleasePath(path.relative(root,file))});
 for (const name of ['README.md','package.json']) {
  const bundled=path.join(source,'skills/cfa-architecture-review/scripts/dashboard',name);
  const original=fs.readFileSync(bundled);
  fs.appendFileSync(bundled,'\n');
  assert.throws(()=>validate(source), new RegExp(`Stale bundled dashboard ${name.replace('.', '\\.')}`));
  fs.writeFileSync(bundled,original);
 }
});

test('portable skills carry the original CFA App icon without needing the source checkout', t => {
 const {dir,source}=release(t);
 const destination=path.join(dir,'customer');
 install({source,destination,mode:'skills'});
 for (const skill of iconSkills) {
  const installed=path.join(destination,'.agents/skills',skill,'assets/AppIcon.appiconset');
  const contents=json(path.join(installed,'Contents.json'));
  assert.equal(contents.images[0].filename,'CFA-App-Icon.png');
  for (const file of ['Contents.json','CFA-App-Icon.png']) {
   assert.equal(hash(path.join(installed,file)),hash(path.join(root,starterIcon,file)));
  }
 }
});

test('release validation rejects an icon set that no longer references the starter artwork', t => {
 const {source}=release(t);
 const contents=path.join(source,'skills/cfa-codebase-tidy/assets/AppIcon.appiconset/Contents.json');
 fs.writeFileSync(contents,JSON.stringify({images:[],info:{version:1,author:'xcode'}}));
 assert.throws(()=>validate(source,{source:false}),/Missing starter app icon mapping/);
});

test('plugin staging preserves unrelated marketplace configuration and names',t=>{
 const {dir,source}=release(t);const destination=path.join(dir,'customer');
 const market=path.join(destination,'.agents/plugins/marketplace.json');fs.mkdirSync(path.dirname(market),{recursive:true});
 const existing={name:'my-personal',interface:{displayName:'My Plugins'},plugins:[{name:'other',source:{source:'local',path:'./plugins/other'},policy:{installation:'AVAILABLE',authentication:'ON_USE'},category:'Productivity'}]};
 fs.writeFileSync(market,JSON.stringify(existing));
 const result=install({source,destination,stageOnly:true});
 assert.equal(result.status,'staged');assert.equal(result.marketplace,'my-personal');
 assert.deepEqual(json(market).plugins[0],existing.plugins[0]);
 assert.deepEqual(json(market).interface,existing.interface);
 assert.equal(json(market).plugins[1].source.path,'./plugins/ios-app-development-cfa');
 assert.ok(fs.existsSync(path.join(destination,'plugins/ios-app-development-cfa/skills/cfa-app-creation/references/cfa-specification.md')));
 const stagedPlugin=path.join(destination,'plugins/ios-app-development-cfa');
 const iconPath='./readme-images/CFA-Toolkit-AppIcon.png';
 const brandedManifest=json(path.join(stagedPlugin,'.codex-plugin/plugin.json'));
 assert.equal(brandedManifest.interface.logo,iconPath);
 assert.equal(brandedManifest.interface.composerIcon,iconPath);
 assert.equal(hash(path.join(stagedPlugin,iconPath)),hash(path.join(root,iconPath)));
});

test('installer rejects tampered releases before writing destination',t=>{
 const {dir,source}=release(t);fs.appendFileSync(path.join(source,'README.md'),'tampered');
 const destination=path.join(dir,'customer');
 assert.throws(()=>install({source,destination,stageOnly:true}),/Checksum/);
 assert.equal(fs.existsSync(destination),false);
});

test('existing unmanaged skill directories are never overwritten',t=>{
 const {dir,source}=release(t);const destination=path.join(dir,'customer');
 const owned=path.join(destination,'.agents/skills/cfa-app-creation');fs.mkdirSync(owned,{recursive:true});
 fs.writeFileSync(path.join(owned,'mine.txt'),'keep');
 assert.throws(()=>install({source,destination,mode:'skills',replace:true}),/Not a CFA-managed/);
 assert.equal(fs.readFileSync(path.join(owned,'mine.txt'),'utf8'),'keep');
 assert.equal(fs.existsSync(path.join(destination,'.agents/skills/cfa-architecture-review')),false);
});

test('upgrade retains a backup and preserves existing CFA policy',t=>{
 const {dir,source}=release(t);const destination=path.join(dir,'customer');
 install({source,destination,stageOnly:true});
 const market=path.join(destination,'.agents/plugins/marketplace.json');let content=json(market);content.plugins[0].policy.authentication='ON_USE';fs.writeFileSync(market,JSON.stringify(content));
 const result=install({source,destination,stageOnly:true,replace:true});
 assert.equal(result.backups.length,1);assert.ok(fs.existsSync(result.backups[0]));
 assert.equal(json(market).plugins.length,1);assert.equal(json(market).plugins[0].policy.authentication,'ON_USE');
});

test('modified installations cannot be replaced even with replace',t=>{
 const {dir,source}=release(t);const destination=path.join(dir,'customer');
 const initial=install({source,destination,mode:'skills'});
 const edited=path.join(initial.paths[0],'SKILL.md');fs.appendFileSync(edited,'my edit');
 assert.throws(()=>install({source,destination,mode:'skills',replace:true}),/Checksum/);
 assert.match(fs.readFileSync(edited,'utf8'),/my edit$/);
});

test('invalid marketplace leaves existing files unchanged',t=>{
 const {dir,source}=release(t);const destination=path.join(dir,'customer');
 const market=path.join(destination,'.agents/plugins/marketplace.json');fs.mkdirSync(path.dirname(market),{recursive:true});fs.writeFileSync(market,'broken');
 assert.throws(()=>install({source,destination,stageOnly:true}));
 assert.equal(fs.readFileSync(market,'utf8'),'broken');assert.equal(fs.existsSync(path.join(destination,'plugins')),false);
});

test('symlink installation paths are rejected',t=>{
 const {dir,source}=release(t);const destination=path.join(dir,'customer');fs.mkdirSync(destination);
 const elsewhere=path.join(dir,'elsewhere');fs.mkdirSync(elsewhere);fs.symlinkSync(elsewhere,path.join(destination,'plugins'));
 assert.throws(()=>install({source,destination,stageOnly:true}),/ordinary directory/);
 assert.deepEqual(fs.readdirSync(elsewhere),[]);
});

test('CFA source and package outputs are deterministic',t=>{
 const {dir,source}=release(t);const second=stageRelease(path.join(dir,'second'));
 assert.deepEqual(inventory(source),inventory(second));
 assert.equal(hash(path.join(root,'architecture/cfa-specification.md')),hash(path.join(source,'skills/cfa-app-creation/references/cfa-specification.md')));
});


test('legacy standalone skill blocks a conflicting installation without deleting edits',t=>{
 const {dir,source}=release(t);const destination=path.join(dir,'customer');
 const old=path.join(destination,'.agents/skills/cfa-development');fs.mkdirSync(old,{recursive:true});
 fs.writeFileSync(path.join(old,'SKILL.md'),'customer edits');
 assert.throws(()=>install({source,destination,mode:'skills',replace:true}),/Legacy skill/);
 assert.equal(fs.readFileSync(path.join(old,'SKILL.md'),'utf8'),'customer edits');
 assert.equal(fs.existsSync(path.join(destination,'.agents/skills/cfa-app-creation')),false);
});
