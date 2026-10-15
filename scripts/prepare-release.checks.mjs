import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releaseMetadata, RELEASE_REPO } from './prepare-release.mjs';
const signature = Buffer.from(
  'untrusted comment: test\nsignature\ntrusted comment: timestamp:1\tfile:setup.exe\tversion:0.9.0\nglobal signature',
).toString('base64');
test('the public manifest contains only signed installers from the public release channel', () => {
  const value = releaseMetadata('0.9.0', signature, 'Notes', '2026-10-15T00:00:00Z');
  assert.equal(
    value.platforms['windows-x86_64'].url,
    `https://github.com/${RELEASE_REPO}/releases/download/v0.9.0/Lume-Notes-0.9.0-Windows-x64-setup.exe`,
  );
  assert.equal(value.platforms['windows-x86_64'].signature, signature);
  assert.equal(value.version, '0.9.0');
});
test('refuses mismatched, missing and unversioned signatures before publishing', () => {
  for (const input of [
    'invalid',
    Buffer.from('trusted comment: timestamp:1').toString('base64'),
    signature,
  ])
    assert.throws(() => releaseMetadata('0.9.1', input));
  assert.throws(() => releaseMetadata('../private-source', signature));
});
