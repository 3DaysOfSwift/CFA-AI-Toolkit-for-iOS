import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { verifyOrientations, verifyTemplateOrientations } from '../scripts/verify-ios-orientations.mjs';

const portrait = 'UIInterfaceOrientationPortrait';
const all = [portrait, 'UIInterfaceOrientationPortraitUpsideDown', 'UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight'];
const universal = () => ({ UIDeviceFamily: [1, 2], UISupportedInterfaceOrientations: [portrait], 'UISupportedInterfaceOrientations~ipad': all });

test('accepts explicit portrait iPhone and all-orientation iPad declarations', () => {
  assert.equal(verifyOrientations(universal()), true);
});
test('rejects the missing-orientations upload failure', () => {
  assert.throws(() => verifyOrientations({ UIDeviceFamily: [1, 2] }), /Missing or invalid/);
});
test('rejects incomplete iPad support and string values in the built plist', () => {
  assert.throws(() => verifyOrientations({ UIDeviceFamily: [1, 2], UISupportedInterfaceOrientations: [portrait] }), /all four/);
  assert.throws(() => verifyOrientations({ UIDeviceFamily: [1], UISupportedInterfaceOrientations: portrait }), /array/);
});
test('honours valid device-specific overrides and explicit full-screen apps', () => {
  const info = universal();
  info['UISupportedInterfaceOrientations~ipad'] = [portrait];
  info.UIRequiresFullScreen = true;
  assert.equal(verifyOrientations(info), true);
  assert.equal(verifyOrientations({ UIDeviceFamily: [1], 'UISupportedInterfaceOrientations~iphone': [portrait] }), true);
});
test('all native templates and blueprint app configurations declare valid defaults', { skip: process.platform !== 'darwin' }, () => {
  verifyTemplateOrientations(path.resolve(import.meta.dirname, '..'));
});
