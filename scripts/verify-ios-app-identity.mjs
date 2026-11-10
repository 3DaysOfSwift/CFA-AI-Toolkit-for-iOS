import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function readPlist(file) {
  return JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', file], { encoding: 'utf8' }));
}

function requiredString(info, key, displayName) {
  const value = info[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw Error(`Missing ${displayName} (${key}) in the built app Info.plist.`);
  }
  if (value.includes('$(') || value.includes('${') || value.includes('___') || value.includes('YOUR_')) {
    throw Error(`${displayName} (${key}) is still a build or template placeholder: ${value}`);
  }
  return value;
}

export function verifyAppIdentity(info, expectedBundleIdentifier) {
  const bundleIdentifier = requiredString(info, 'CFBundleIdentifier', 'bundle identifier');
  if (!/^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(bundleIdentifier)) {
    throw Error(`Bundle identifier is not a valid reverse-DNS identifier: ${bundleIdentifier}`);
  }

  if (expectedBundleIdentifier !== undefined && bundleIdentifier !== expectedBundleIdentifier) {
    throw Error(`Built app bundle identifier ${bundleIdentifier} does not match the expected identifier ${expectedBundleIdentifier}.`);
  }

  requiredString(info, 'CFBundleDisplayName', 'display name');
  requiredString(info, 'CFBundleShortVersionString', 'marketing version');
  requiredString(info, 'CFBundleVersion', 'build number');
  return true;
}

function resolveInfoPlistPath(inputPath) {
  if (inputPath.endsWith('.xcarchive')) {
    const applicationsDirectory = path.join(inputPath, 'Products/Applications');
    const applicationNames = fs.readdirSync(applicationsDirectory).filter(name => name.endsWith('.app'));
    if (applicationNames.length !== 1) {
      throw Error('Archive must contain exactly one app; pass its Info.plist explicitly.');
    }
    return path.join(applicationsDirectory, applicationNames[0], 'Info.plist');
  }
  if (inputPath.endsWith('.app')) return path.join(inputPath, 'Info.plist');
  return inputPath;
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  try {
    const [inputPath, flag, expectedBundleIdentifier, ...extra] = process.argv.slice(2);
    if (!inputPath || extra.length || (flag !== undefined && (flag !== '--bundle-id' || !expectedBundleIdentifier))) {
      throw Error('Usage: node verify-ios-app-identity.mjs <built Info.plist | app.app | app.xcarchive> [--bundle-id <expected-identifier>]');
    }
    verifyAppIdentity(readPlist(resolveInfoPlistPath(inputPath)), expectedBundleIdentifier);
    console.log('Built app bundle identifier, display name, marketing version and build number are valid.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
