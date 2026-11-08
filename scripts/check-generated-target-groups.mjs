#!/usr/bin/env node
// Checks generated Xcode projects, not the template metadata that produced them.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function sharedSynchronizedGroups(project) {
  const objects = project.objects ?? {};
  const targets = Object.entries(objects).filter(([, item]) => item.isa === 'PBXNativeTarget');
  const apps = targets.filter(([, item]) => item.productType === 'com.apple.product-type.application');
  const tests = targets.filter(([, item]) => item.productType === 'com.apple.product-type.bundle.unit-test');
  const uiTests = targets.filter(([, item]) => item.productType === 'com.apple.product-type.bundle.ui-testing');
  const appIds = new Set(apps.map(([id]) => id));
  const linkedTests = tests.filter(([, target]) => (target.dependencies ?? []).some(id => appIds.has(objects[id]?.target)));
  const shared = [];
  // Unlinked unit tests and UI tests can also leak into an app target.
  for (const [, app] of apps) for (const [, test] of [...tests, ...uiTests]) {
    for (const appId of app.fileSystemSynchronizedGroups ?? []) {
      for (const testId of test.fileSystemSynchronizedGroups ?? []) {
        const a = objects[appId];
        const b = objects[testId];
        const sameRoot = appId === testId;
        // SOURCE_ROOT paths share a known base. Group-relative paths can have
        // different parents, so their text alone cannot establish overlap.
        const sameTree = a?.path && b?.path && a.sourceTree === 'SOURCE_ROOT' && b.sourceTree === 'SOURCE_ROOT';
        const left = sameTree ? path.posix.normalize(a.path) : '';
        const right = sameTree ? path.posix.normalize(b.path) : '';
        const overlappingPaths = sameTree && (left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`));
        if (sameRoot || overlappingPaths) {
          shared.push({app: app.name, test: test.name, group: sameRoot ? (a?.path ?? appId) : `${a.path} ↔ ${b.path}`});
        }
      }
    }
  }
  return { apps: apps.length, tests: tests.length, linkedTests: linkedTests.length, shared };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const project = process.argv[2];
  if (!project) {
    console.error('Usage: node scripts/check-generated-target-groups.mjs path/to/App.xcodeproj');
    process.exitCode = 2;
  } else {
    try {
      const json = execFileSync('plutil', ['-convert', 'json', '-o', '-', path.join(project, 'project.pbxproj')], {encoding: 'utf8'});
      const result = sharedSynchronizedGroups(JSON.parse(json));
      if (!result.apps || !result.tests) {
        console.error('The project must have an app target and a unit-test target.');
        process.exitCode = 1;
      } else if (!result.linkedTests) {
        console.error('No unit-test target declares a dependency on an app target; inspect the test host and target configuration.');
        process.exitCode = 1;
      } else if (result.shared.length) {
        console.error('App and test targets share synchronized folders; inspect target membership and exceptions:', result.shared);
        process.exitCode = 1;
      } else {
        console.log('No shared synchronized root detected. Check group-relative and explicit file membership, then run the tests.');
      }
    } catch (error) {
      console.error(`Could not read generated project: ${error.message}`);
      process.exitCode = 2;
    }
  }
}
