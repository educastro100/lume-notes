import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { verifyNsisPayload } from './verify-nsis-payload.mjs';

const build = Buffer.from('prefix\0__TAURI_BUNDLE_TYPE_VAR_UNK\0suffix');
const payload = Buffer.from('prefix\0__TAURI_BUNDLE_TYPE_VAR_NSS\0suffix');

test('accepts only the NSIS marker change and leaves both inputs unchanged', () => {
  const before = Buffer.from(build);
  const packaged = Buffer.from(payload);
  const result = verifyNsisPayload(build, payload);
  assert.equal(result.matches, true);
  assert.equal(result.changedBytes, 3);
  assert.equal(result.expectedPayloadSha256, result.payload.sha256);
  assert.notEqual(result.build.sha256, result.payload.sha256);
  assert.deepEqual(build, before);
  assert.deepEqual(payload, packaged);
});

test('rejects unchanged UNK, wrong bundle type, truncation and appended content', () => {
  for (const invalid of [
    build,
    Buffer.from(payload.toString().replace('_NSS', '_MSI')),
    payload.subarray(0, -1),
    Buffer.concat([payload, Buffer.from('extra')]),
  ]) {
    assert.equal(verifyNsisPayload(build, invalid).matches, false);
  }
});

test('rejects an extra changed byte even when the package marker is correct', () => {
  const altered = Buffer.from(payload);
  altered[0] ^= 1;
  assert.equal(verifyNsisPayload(build, altered).matches, false);
});

test('rejects absent and ambiguous build markers', () => {
  for (const invalid of [Buffer.from('no marker'), Buffer.concat([build, build])]) {
    const result = verifyNsisPayload(invalid, payload);
    assert.equal(result.matches, false);
    assert.equal(result.expectedPayloadSha256, null);
  }
});

test('CLI records hashes on mismatch, fails closed and does not change files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lume-payload-check-'));
  try {
    const buildPath = join(directory, 'build.bin');
    const payloadPath = join(directory, 'payload.bin');
    const reportPath = join(directory, 'comparison.json');
    const checker = fileURLToPath(new URL('./verify-nsis-payload.mjs', import.meta.url));
    await writeFile(buildPath, build);
    await writeFile(payloadPath, payload);
    const run = () => spawnSync(process.execPath, [checker, buildPath, payloadPath, reportPath]);
    assert.equal(run().status, 0);
    assert.equal(JSON.parse(await readFile(reportPath, 'utf8')).matches, true);
    const altered = Buffer.concat([payload, Buffer.from('extra')]);
    await writeFile(payloadPath, altered);
    assert.equal(run().status, 1);
    const report = JSON.parse(await readFile(reportPath, 'utf8'));
    assert.equal(report.matches, false);
    assert.match(report.payload.sha256, /^[a-f0-9]{64}$/);
    assert.match(report.expectedPayloadSha256, /^[a-f0-9]{64}$/);
    assert.deepEqual(await readFile(buildPath), build);
    assert.deepEqual(await readFile(payloadPath), altered);
    await rm(buildPath);
    assert.equal(run().status, 1);
    assert.equal(JSON.parse(await readFile(reportPath, 'utf8')).matches, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
