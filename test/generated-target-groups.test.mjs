import test from 'node:test';
import assert from 'node:assert/strict';
import { sharedSynchronizedGroups } from '../scripts/check-generated-target-groups.mjs';

test('detects an app and unit tests assigned the same generated folder', () => {
  const project = {objects: {
    app: {isa: 'PBXNativeTarget', name: 'Example', productType: 'com.apple.product-type.application', fileSystemSynchronizedGroups: ['root']},
    tests: {isa: 'PBXNativeTarget', name: 'ExampleTests', productType: 'com.apple.product-type.bundle.unit-test', fileSystemSynchronizedGroups: ['root'], dependencies: ['dependency']},
    dependency: {isa: 'PBXTargetDependency', target: 'app'},
    root: {isa: 'PBXFileSystemSynchronizedRootGroup', path: 'Example'}
  }};
  assert.deepEqual(sharedSynchronizedGroups(project), {apps: 1, tests: 1, linkedTests: 1, shared: [{app: 'Example', test: 'ExampleTests', group: 'Example'}]});
  project.objects.tests.fileSystemSynchronizedGroups = ['testRoot'];
  project.objects.testRoot = {isa: 'PBXFileSystemSynchronizedRootGroup', path: 'ExampleTests'};
  assert.deepEqual(sharedSynchronizedGroups(project), {apps: 1, tests: 1, linkedTests: 1, shared: []});
  project.objects.dependency.target = 'unrelatedTarget';
  assert.equal(sharedSynchronizedGroups(project).linkedTests, 0);
});

test('does not mistake a UI-test target for the required unit-test target', () => {
  const project = {objects: {
    app: {isa: 'PBXNativeTarget', name: 'Example', productType: 'com.apple.product-type.application'},
    ui: {isa: 'PBXNativeTarget', name: 'ExampleUITests', productType: 'com.apple.product-type.bundle.ui-testing'}
  }};
  assert.equal(sharedSynchronizedGroups(project).tests, 0);
});

test('detects shared folders for an unlinked test even when another test is linked', () => {
  const project = {objects: {
    app: {isa: 'PBXNativeTarget', name: 'App', productType: 'com.apple.product-type.application', fileSystemSynchronizedGroups: ['root']},
    linked: {isa: 'PBXNativeTarget', name: 'LinkedTests', productType: 'com.apple.product-type.bundle.unit-test', dependencies: ['dependency']},
    unlinked: {isa: 'PBXNativeTarget', name: 'OtherTests', productType: 'com.apple.product-type.bundle.unit-test', fileSystemSynchronizedGroups: ['root']},
    dependency: {isa: 'PBXTargetDependency', target: 'app'},
    root: {isa: 'PBXFileSystemSynchronizedRootGroup', path: 'App'}
  }};
  const result = sharedSynchronizedGroups(project);
  assert.equal(result.linkedTests, 1);
  assert.deepEqual(result.shared, [{app: 'App', test: 'OtherTests', group: 'App'}]);
});

test('detects UI-test folders shared with an app', () => {
  const project = {objects: {
    app: {isa: 'PBXNativeTarget', name: 'App', productType: 'com.apple.product-type.application', fileSystemSynchronizedGroups: ['root']},
    ui: {isa: 'PBXNativeTarget', name: 'AppUITests', productType: 'com.apple.product-type.bundle.ui-testing', fileSystemSynchronizedGroups: ['root']},
    root: {isa: 'PBXFileSystemSynchronizedRootGroup', path: 'App'}
  }};
  assert.deepEqual(sharedSynchronizedGroups(project).shared, [{app: 'App', test: 'AppUITests', group: 'App'}]);
});

test('detects separate folder references whose paths overlap', () => {
  const project = {objects: {
    app: {isa: 'PBXNativeTarget', name: 'Example', productType: 'com.apple.product-type.application', fileSystemSynchronizedGroups: ['appRoot']},
    tests: {isa: 'PBXNativeTarget', name: 'ExampleTests', productType: 'com.apple.product-type.bundle.unit-test', fileSystemSynchronizedGroups: ['testRoot'], dependencies: ['dependency']},
    dependency: {isa: 'PBXTargetDependency', target: 'app'},
    appRoot: {isa: 'PBXFileSystemSynchronizedRootGroup', path: 'Example', sourceTree: 'SOURCE_ROOT'},
    testRoot: {isa: 'PBXFileSystemSynchronizedRootGroup', path: 'Example/Tests', sourceTree: 'SOURCE_ROOT'}
  }};
  assert.equal(sharedSynchronizedGroups(project).shared.length, 1);
  project.objects.testRoot.path = 'ExampleTests';
  assert.equal(sharedSynchronizedGroups(project).shared.length, 0);
});

