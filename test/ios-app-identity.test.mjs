import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyAppIdentity } from '../scripts/verify-ios-app-identity.mjs';

const validInfo = () => ({
  CFBundleIdentifier: 'com.3DaysOfSwiftConcurrency.PhoneDrive',
  CFBundleDisplayName: 'Phone Drive',
  CFBundleShortVersionString: '1.0',
  CFBundleVersion: '1'
});

test('accepts a complete iOS app identity', () => {
  assert.equal(verifyAppIdentity(validInfo()), true);
});

test('rejects each missing identity value', () => {
  for (const key of ['CFBundleIdentifier', 'CFBundleDisplayName', 'CFBundleShortVersionString', 'CFBundleVersion']) {
    const info = validInfo();
    delete info[key];
    assert.throws(() => verifyAppIdentity(info), /Missing/);
  }
});

test('rejects unresolved bundle and template placeholders', () => {
  const bundlePlaceholder = validInfo();
  bundlePlaceholder.CFBundleIdentifier = '$(PRODUCT_BUNDLE_IDENTIFIER)';
  assert.throws(() => verifyAppIdentity(bundlePlaceholder), /placeholder/);

  const displayNamePlaceholder = validInfo();
  displayNamePlaceholder.CFBundleDisplayName = '___PROJECTNAME___';
  assert.throws(() => verifyAppIdentity(displayNamePlaceholder), /placeholder/);
});

test('rejects a non reverse-DNS bundle identifier', () => {
  const invalidBundleIdentifier = validInfo();
  invalidBundleIdentifier.CFBundleIdentifier = 'Phone Drive';
  assert.throws(() => verifyAppIdentity(invalidBundleIdentifier), /reverse-DNS/);
});
