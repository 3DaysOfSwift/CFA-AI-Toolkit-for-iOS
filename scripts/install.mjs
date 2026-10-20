#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inventory, verify, json, writeJSON, files } from './files.mjs';
import { skills } from './sync.mjs';

const NAME='ios-app-development-cfa';
const RECEIPT='.cfa-receipt.json';
const COMMAND_MARKER='# CFA Toolkit command launcher';
function runCodex(executable,args) {
  const result=spawnSync(executable,args,{stdio:'inherit',shell:false});
  if(result.error || result.status!==0) throw Error(`Codex did not complete installation. Source files are staged safely. Retry: ${executable} ${args.join(' ')}`);
}
function safeDirectories(root,relative) {
  fs.mkdirSync(root,{recursive:true});
  let current=root;
  for(const part of relative.split(path.sep).filter(Boolean)) {
    current=path.join(current,part);
    if(fs.existsSync(current) && (fs.lstatSync(current).isSymbolicLink() || !fs.statSync(current).isDirectory())) throw Error(`Expected an ordinary directory: ${current}`);
  }
}
function checkManaged(target,replace) {
  if(!fs.existsSync(target)) return;
  if(!replace) throw Error(`Already exists: ${target}. Use --replace for an unmodified CFA-managed installation.`);
  const receiptPath=path.join(target,RECEIPT);
  if(!fs.existsSync(receiptPath)) throw Error(`Not a CFA-managed installation: ${target}. Move it aside yourself before installing.`);
  const receipt=json(receiptPath);
  if(receipt.product!==NAME) throw Error(`Unrecognised installation: ${target}`);
  verify(target,receipt.files,[RECEIPT]);
}
function atomicJSON(file,value) {
  const tmp=file+`.${crypto.randomUUID()}.tmp`;
  try {writeJSON(tmp,value);fs.renameSync(tmp,file);} finally {if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
}
function checkCommandTarget(target) {
  if(!fs.existsSync(target)) return;
  if(fs.lstatSync(target).isSymbolicLink() || !fs.statSync(target).isFile()) throw Error(`Cannot install the CFA command over this path: ${target}`);
  if(!fs.readFileSync(target,'utf8').includes(COMMAND_MARKER)) throw Error(`The cfa command already belongs to something else: ${target}`);
}
function writeCommand(target,dashboardCommand,nodeExecutable=process.execPath) {
  fs.mkdirSync(path.dirname(target),{recursive:true});
  const temp=`${target}.${crypto.randomUUID()}.tmp`;
  const script=`#!/bin/sh\n${COMMAND_MARKER}\nexec ${JSON.stringify(nodeExecutable)} ${JSON.stringify(dashboardCommand)} "$@"\n`;
  try {
    fs.writeFileSync(temp,script,{mode:0o755,flag:'wx'});
    fs.renameSync(temp,target);
    fs.chmodSync(target,0o755);
  } finally { if(fs.existsSync(temp)) fs.unlinkSync(temp); }
}
export function install({source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),destination=os.homedir(),mode='plugin',replace=false,stageOnly=false,codex='codex',skillsDirectory,commandDirectory,installCommand=true,execute=runCodex}={}) {
  if(Number(process.versions.node.split('.')[0])<20) throw Error('Node.js 20 or newer is required.');
  if(!['plugin','skills'].includes(mode)) throw Error('Mode must be plugin or skills.');
  if(stageOnly && mode!=='plugin') throw Error('--stage-only applies only to plugins.');
  source=path.resolve(source);destination=path.resolve(destination);
  if(mode==='plugin'&&!stageOnly && destination!==path.resolve(os.homedir())) throw Error('Use --stage-only when supplying a custom destination for plugins.');
  const checksums=path.join(source,'checksums.json');
  if(!fs.existsSync(checksums)) throw Error('Use the extracted release package. Maintainers: build it with python3 scripts/release.py first.');
  verify(source,json(checksums),['checksums.json']);
  const manifest=json(path.join(source,'.codex-plugin/plugin.json'));
  if(manifest.name!==NAME) throw Error('Unexpected plugin name.');
  const standaloneDirectory=skillsDirectory ? path.resolve(skillsDirectory) : path.join(destination,'.agents/skills');
  const destinations=mode==='plugin' ? [[source,path.join(destination,'plugins',NAME)]] : skills.map(name=>[path.join(source,'skills',name),path.join(standaloneDirectory,name)]);
  const commandTarget=installCommand&&!stageOnly ? path.join(commandDirectory ? path.resolve(commandDirectory) : path.join(destination,'.local/bin'),'cfa') : undefined;
  const dashboardCommand=mode==='plugin'
    ? path.join(destination,'plugins',NAME,'skills/cfa-architecture-review/scripts/dashboard/src/cfa.mjs')
    : path.join(standaloneDirectory,'cfa-architecture-review/scripts/dashboard/src/cfa.mjs');
  if(commandTarget) checkCommandTarget(commandTarget);
  if(mode==='skills') {
    for(const legacy of ['cfa-development','xcode-project-dashboard']) {
      const old=path.join(standaloneDirectory,legacy);
      if(fs.existsSync(old)) throw Error(`Legacy skill ${legacy} is still installed. Move it outside the skill directory, preserving edits, before installing CFA.`);
    }
  }
  let market,marketFile;
  if(mode==='plugin') {
    safeDirectories(destination,'.agents/plugins');
    marketFile=path.join(destination,'.agents/plugins/marketplace.json');
    if(fs.existsSync(marketFile) && fs.lstatSync(marketFile).isSymbolicLink()) throw Error('Refusing a linked marketplace file.');
    market=fs.existsSync(marketFile) ? json(marketFile) : {name:'personal',interface:{displayName:'Personal'},plugins:[]};
    if(!/^[A-Za-z0-9_-]+$/.test(market.name) || !Array.isArray(market.plugins)) throw Error('Existing personal marketplace is invalid; no changes made.');
    const previous=market.plugins.find(p=>p.name===NAME);
    if(previous && (previous.source?.source!=='local' || previous.source?.path!==`./plugins/${NAME}`)) throw Error('CFA marketplace entry points to another source; no changes made.');
  }
  for(const [from,to] of destinations) {
    safeDirectories(destination,path.relative(destination,to));
    if(to===source || source.startsWith(to+path.sep) || to.startsWith(source+path.sep)) throw Error('Source and installation destination must be separate.');
    files(from);checkManaged(to,replace);
  }
  const changes=[];
  try {
    for(const [from,to] of destinations) {
      fs.mkdirSync(path.dirname(to),{recursive:true});
      const stage=path.join(path.dirname(to),`.cfa-stage-${crypto.randomUUID()}`);
      fs.cpSync(from,stage,{recursive:true,errorOnExist:true,force:false});
      writeJSON(path.join(stage,RECEIPT),{product:NAME,version:manifest.version,files:inventory(stage)});
      let backup;
      if(fs.existsSync(to)) { backup=`${to}.backup-${crypto.randomUUID()}`;fs.renameSync(to,backup); }
      changes.push({to,backup,stage});
      fs.renameSync(stage,to);
    }
    if(market) {
      const entry={name:NAME,source:{source:'local',path:`./plugins/${NAME}`},policy:{installation:'AVAILABLE',authentication:'ON_INSTALL'},category:'Productivity'};
      const index=market.plugins.findIndex(p=>p.name===NAME);
      // Retain existing policy/metadata; only the packaged source changes on an upgrade.
      if(index<0) market.plugins.push(entry);
      atomicJSON(marketFile,market);
    }
  } catch(error) {
    for(const change of changes.reverse()) {
      if(fs.existsSync(change.to))fs.rmSync(change.to,{recursive:true});
      if(change.backup)fs.renameSync(change.backup,change.to);
      if(fs.existsSync(change.stage))fs.rmSync(change.stage,{recursive:true});
    }
    throw error;
  }
  if(mode==='plugin'&&!stageOnly) {
    if(destination!==path.resolve(os.homedir())) throw Error('Custom destination was staged only; native Codex activation is supported only for the actual user home.');
    execute(codex,['plugin','add',`${NAME}@${market.name}`]);
  }
  if(commandTarget) writeCommand(commandTarget,dashboardCommand);
  return {status:mode==='plugin'&&stageOnly?'staged':'installed',mode,version:manifest.version,paths:destinations.map(([,to])=>to),command:commandTarget,marketplace:market?.name,backups:changes.flatMap(c=>c.backup?[c.backup]:[])};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const options={};const args=process.argv.slice(2);
    if(args.includes('--help')) {
      console.log('CFA installer (Node.js 20+)\nnode scripts/install.mjs [--mode plugin|skills] [--replace] [--codex executable] [--skills-directory directory] [--command-directory directory] [--no-command]\nTesting/offline staging: --destination directory --stage-only\nPlugin mode installs for Codex. Skills mode copies portable skill folders to ~/.agents/skills, or the explicit --skills-directory.\nIt also installs cfa in ~/.local/bin by default. Existing installations are never replaced unless --replace is given; edited files are always protected.');
    } else {
      while(args.length) {
        const flag=args.shift();
        if(flag==='--replace') options.replace=true;
        else if(flag==='--no-command') options.installCommand=false;
        else if(flag==='--stage-only')options.stageOnly=true;
        else if(['--mode','--destination','--codex','--skills-directory','--command-directory'].includes(flag)&&args[0]&&!args[0].startsWith('--'))options[flag.slice(2).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=args.shift();
        else throw Error(`Unknown or incomplete option: ${flag}`);
      }
      const result=install(options);console.log(JSON.stringify(result,null,2));
      if(result.status==='installed') {
        console.log('Installation complete. Open a new conversation, then ask: I have installed CFA AI Toolkit for iOS. Do you have access to create and maintain iOS projects with CFA?');
        if(result.command) console.log(`Terminal command installed: ${result.command}\nRun: cfa dashboard`);
      } else console.log('Package staged; Codex activation was not attempted.');
    }
  } catch(error){console.error(error.message);process.exitCode=1;}
}
