import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  publisherId,
  validateIdentity,
  msixVersion,
  manifest,
  assertX64,
  prepareMsix,
} from './prepare-msix.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const identity = JSON.parse(
  await fs.readFile(path.join(root, 'packaging/msix/identity.json'), 'utf8'),
);
test('Store identity exactly matches the publisher-derived package family', () => {
  assert.equal(publisherId(identity.publisher), '2m6y48kycrkep');
  assert.equal(validateIdentity(identity), identity);
  assert.throws(() =>
    validateIdentity({ ...identity, publisher: identity.publisher.replace('FF86', 'FE86') }),
  );
  assert.throws(() =>
    validateIdentity({ ...identity, packageFamilyName: identity.name + '_wrong' }),
  );
});
test('Store version reserves the final component and rejects invalid versions', () => {
  assert.equal(msixVersion('0.11.0'), '0.11.0.0');
  for (const value of ['0.11.0.1', '0.11.0-beta', '65536.0.0', '1.2', '../x'])
    assert.throws(() => msixVersion(value));
  const xml = manifest(identity, '0.11.0');
  assert.match(xml, /packagedClassicApp/);
  assert.match(xml, /runFullTrust/);
  assert.match(xml, /Parameters="&quot;%1&quot;"/);
  assert.doesNotMatch(xml, /autoUpdate|StartupTask|broadFileSystemAccess|allowElevation/i);
});
function executable() {
  const bytes = Buffer.alloc(128);
  bytes.write('MZ');
  bytes.writeUInt32LE(64, 0x3c);
  bytes.writeUInt32LE(0x4550, 64);
  bytes.writeUInt16LE(0x8664, 68);
  return bytes;
}
test('rejects non-x64 or truncated payloads', () => {
  assertX64(executable());
  assert.throws(() => assertX64(Buffer.from('not PE')));
  const wrong = executable();
  wrong.writeUInt16LE(0x14c, 68);
  assert.throws(() => assertX64(wrong));
  const truncated = executable();
  truncated.writeUInt32LE(127, 0x3c);
  assert.throws(() => assertX64(truncated));
});
test('stages only approved files, preserves executable bytes and refuses reused output', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'lume-msix-check-'));
  const previous = process.env.VITE_LUME_DISTRIBUTION;
  try {
    const source = path.join(temporary, 'build');
    await fs.mkdir(source);
    const exe = path.join(source, 'lume-notes.exe'),
      bytes = executable();
    await fs.writeFile(exe, bytes);
    await fs.writeFile(path.join(source, 'private-key.pem'), 'must not ship');
    await fs.writeFile(path.join(source, 'session.json'), 'must not ship');
    await fs.writeFile(path.join(source, 'lume-notes.pdb'), 'must not ship');
    delete process.env.VITE_LUME_DISTRIBUTION;
    await assert.rejects(prepareMsix(root, exe, path.join(temporary, 'wrong-mode')), /Store/);
    process.env.VITE_LUME_DISTRIBUTION = 'microsoft-store';
    const output = path.join(temporary, 'output');
    const { stage, report } = await prepareMsix(root, exe, output);
    assert.deepEqual(await fs.readFile(path.join(stage, 'lume-notes.exe')), bytes);
    assert.deepEqual(
      Object.keys(report.files).sort(),
      [
        'AppxManifest.xml',
        'Assets/Square150x150Logo.png',
        'Assets/Square44x44Logo.png',
        'Assets/StoreLogo.png',
        'LICENSE',
        'lume-notes.exe',
      ].sort(),
    );
    assert.deepEqual((await fs.readdir(stage)).sort(), [
      'AppxManifest.xml',
      'Assets',
      'LICENSE',
      'lume-notes.exe',
    ]);
    await assert.rejects(prepareMsix(root, exe, output), /EEXIST/);
  } finally {
    if (previous === undefined) delete process.env.VITE_LUME_DISTRIBUTION;
    else process.env.VITE_LUME_DISTRIBUTION = previous;
    // Only this test's freshly created OS temporary directory is removed.
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
