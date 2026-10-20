#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolkitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const relativeTemplate = path.join('Project Templates', 'iOS', 'Application', 'CFA App.xctemplate');
const templateSource = path.join(toolkitRoot, 'templates', 'Xcode', relativeTemplate);

function usage() {
  console.log(`Install CFA App into Xcode\n\nnode scripts/install-xcode-template.mjs [--replace] [--destination directory]\n\nBy default, Xcode templates are installed in:\n~/Library/Developer/Xcode/Templates`);
}

function isCFATemplate(directory) {
  const marker = path.join(directory, 'CFA-TEMPLATE.json');
  if (!fs.existsSync(marker)) return false;
  try {
    const value = JSON.parse(fs.readFileSync(marker, 'utf8'));
    return value.product === 'cooperative-feature-architecture' && value.template === 'CFA App';
  } catch {
    return false;
  }
}

function install({ destination = path.join(os.homedir(), 'Library', 'Developer', 'Xcode', 'Templates'), replace = false } = {}) {
  if (!fs.existsSync(path.join(templateSource, 'TemplateInfo.plist'))) {
    throw Error('CFA App template is missing from this CFA AI Toolkit for iOS copy. Download a complete release and retry.');
  }

  const target = path.join(path.resolve(destination), relativeTemplate);
  if (fs.existsSync(target)) {
    if (!replace) throw Error(`Template already exists: ${target}\nRun again with --replace to replace the CFA-managed copy.`);
    if (!isCFATemplate(target)) throw Error(`Refusing to replace a template not installed by CFA: ${target}`);
    fs.rmSync(target, { recursive: true, force: false });
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(templateSource, target, { recursive: true, errorOnExist: true, force: false });
  return target;
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
    const target = install({ destination, replace });
    console.log(`CFA App is installed in Xcode.\n\nOpen Xcode → File → New → Project → iOS → CFA App.\n\nInstalled at: ${target}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
