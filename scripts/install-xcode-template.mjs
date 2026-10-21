#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolkitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templateNames = ['CFA App', 'Habit Tracker'];

function usage() {
  console.log(`Install CFA App and Habit Tracker into Xcode\n\nnode scripts/install-xcode-template.mjs [--replace] [--destination directory]\n\nBy default, Xcode templates are installed in:\n~/Library/Developer/Xcode/Templates`);
}

function isCFATemplate(directory, name) {
  const marker = path.join(directory, 'CFA-TEMPLATE.json');
  if (!fs.existsSync(marker)) return false;
  try {
    const value = JSON.parse(fs.readFileSync(marker, 'utf8'));
    return value.product === 'cooperative-feature-architecture' && value.template === name;
  } catch {
    return false;
  }
}

function install({ destination = path.join(os.homedir(), 'Library', 'Developer', 'Xcode', 'Templates'), replace = false } = {}) {
  const templates = templateNames.map(name => {
    const relative = path.join('Project Templates', 'iOS', 'Application', `${name}.xctemplate`);
    return { name, templateSource: path.join(toolkitRoot, 'templates', 'Xcode', relative), target: path.join(path.resolve(destination), relative) };
  });
  // Preflight every destination before changing any of them.
  for (const { name, templateSource, target } of templates) {
    if (!fs.existsSync(path.join(templateSource, 'TemplateInfo.plist'))) {
      throw Error(`${name} template is missing from this toolkit copy.`);
    }
    if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) throw Error(`Refusing to replace a symlink: ${target}`);
    if (fs.existsSync(target)) {
      if (!replace) throw Error(`Template already exists: ${target}\nRun again with --replace to replace the CFA-managed copy.`);
      if (!isCFATemplate(target, name)) throw Error(`Refusing to replace a template not installed by CFA: ${target}`);
    }
  }
  for (const { templateSource, target } of templates) {
    if (fs.existsSync(target)) {
      const backup = `${target}.backup-${Date.now()}`;
      fs.renameSync(target, backup);
      console.log(`Previous template preserved at: ${backup}`);
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(templateSource, target, { recursive: true, errorOnExist: true, force: false, filter: source => !['.DS_Store', 'xcuserdata'].includes(path.basename(source)) });
  }
  return templates.map(item => item.target);
}

try {
  const argumentsList = process.argv.slice(2);
  if (argumentsList.includes('--help')) {
    usage();
  } else {
    let replace = false;
    let destination;
    while (argumentsList.length > 0) {
      const argument = argumentsList.shift();
      if (argument === '--replace') replace = true;
      else if (argument === '--destination' && argumentsList[0]) destination = argumentsList.shift();
      else throw Error(`Unknown or incomplete option: ${argument}`);
    }
    const targets = install({ destination, replace });
    console.log(`CFA App and Habit Tracker are installed in Xcode.\n\nOpen Xcode → File → New → Project → iOS.\n\nInstalled at:\n${targets.join('\n')}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
