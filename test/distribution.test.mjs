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
import { json, hash, inventory } from '../scripts/files.mjs';

function sandbox(t) { const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cfa-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir; }
function release(t) {const dir=sandbox(t);return {dir,source:stageRelease(path.join(dir,'ios-app-development-cfa'))};}

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
 assert.ok(fs.existsSync(result.command));
 const command=spawnSync(result.command,['dashboard',fixture],{cwd:dir,encoding:'utf8'});
 assert.equal(command.status,0,command.stderr);
 assert.equal(fs.readdirSync(fixture).filter(name=>name.startsWith('cfa-dashboard-')).length,1);
 assert.equal(fs.readFileSync(path.join(fixture,'Feature.swift'),'utf8'),'actor Feature { func refresh() async { await Task.yield() } }');
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
