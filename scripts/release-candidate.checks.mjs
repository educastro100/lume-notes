import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  candidateNames,
  createCandidate,
  releaseVersion,
  validateCandidate,
  validateReleaseEvidence,
} from './release-candidate.mjs';
import { prepareRelease } from './prepare-release.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const currentVersion = JSON.parse(await readFile(path.join(projectRoot, 'package.json'))).version;
const commit = 'a'.repeat(40);
const provenance = { repository: 'educastro100/lume-notes', commit, runId: '123' };
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'lume-release-check-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const directory of [
    'scripts',
    'src-tauri',
    'docs',
    'build/bundle/nsis',
    'build/examples',
    'diagnostics/extracted',
  ])
    await mkdir(path.join(root, directory), { recursive: true });
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ version: currentVersion }));
  await writeFile(
    path.join(root, 'package-lock.json'),
    JSON.stringify({ version: currentVersion, packages: { '': { version: currentVersion } } }),
  );
  await writeFile(
    path.join(root, 'src-tauri/tauri.conf.json'),
    JSON.stringify({
      version: currentVersion,
      plugins: {
        updater: {
          endpoints: [
            'https://github.com/educastro100/lume-notes-releases/releases/latest/download/latest.json',
          ],
          requireSignedVersion: true,
        },
      },
    }),
  );
  await writeFile(
    path.join(root, 'src-tauri/Cargo.toml'),
    `[package]\r\nname = "lume-notes"\r\nversion = "${currentVersion}"\r\n`,
  );
  await writeFile(
    path.join(root, 'src-tauri/Cargo.lock'),
    `[[package]]\r\nname = "lume-notes"\r\nversion = "${currentVersion}"\r\n`,
  );
  await writeFile(path.join(root, 'scripts/release-security-holds.json'), '{}');
  await writeFile(path.join(root, `docs/release-notes-${currentVersion}.md`), 'Release notes');
  const binaries = [
    [
      `build/bundle/nsis/Lume Notes_${currentVersion}_x64-setup.exe`,
      Buffer.from('installer bytes'),
    ],
    ['diagnostics/extracted/lume-notes.exe', Buffer.from('packaged app bytes')],
    ['build/examples/verify-release.exe', Buffer.from('verifier bytes')],
    ['diagnostics/extracted/uninstall.exe', Buffer.from('uninstaller bytes')],
  ];
  for (const [file, bytes] of binaries) await writeFile(path.join(root, file), bytes);
  const files = binaries.map(([file, bytes]) => ({
    path: file,
    bytes: bytes.length,
    sha256: hash(bytes),
  }));
  const inspection = {
    commit,
    contentsVerified: true,
    defenderVerdict: 'no-threats-reported',
    errors: [],
    defenderStatus: { AMServiceEnabled: true, AntivirusEnabled: true },
    files,
    scans: files.map((file) => ({ path: file.path, exitCode: 0 })),
    binaryComparison: {
      matches: true,
      payload: { sha256: files[1].sha256 },
      expectedPayloadSha256: files[1].sha256,
    },
  };
  const out = path.join(root, 'candidate');
  await createCandidate(root, path.join(root, 'build'), inspection, out, provenance);
  return { root, out, inspection };
}

test('creates an exact candidate and accepts consistent Windows CRLF version files', async (t) => {
  const { root, out } = await fixture(t);
  const candidate = await validateCandidate(root, out, commit);
  assert.equal(candidate.version, currentVersion);
  assert.deepEqual(
    candidate.files.map((file) => file.name),
    candidateNames(currentVersion),
  );
  assert.equal(await releaseVersion(root), currentVersion);
});

test('rejects changed executables and files outside the candidate allowlist', async (t) => {
  const { root, out } = await fixture(t);
  await writeFile(path.join(out, 'unexpected.key'), 'not a real key');
  await assert.rejects(validateCandidate(root, out, commit), /inesperados/);
  await rm(path.join(out, 'unexpected.key'));
  await writeFile(path.join(out, 'lume-notes.exe'), 'modified');
  await assert.rejects(validateCandidate(root, out, commit), /Hash/);
});

test('rejects mismatched commits, blocked versions and inconsistent locks', async (t) => {
  const { root, out } = await fixture(t);
  await assert.rejects(validateCandidate(root, out, 'b'.repeat(40)), /commit/);
  await writeFile(
    path.join(root, 'scripts/release-security-holds.json'),
    JSON.stringify({ [currentVersion]: { status: 'blocked' } }),
  );
  await assert.rejects(validateCandidate(root, out, commit), /bloqueada/);
  await writeFile(path.join(root, 'scripts/release-security-holds.json'), '{}');
  await writeFile(path.join(root, 'src-tauri/Cargo.lock'), 'wrong lock');
  await assert.rejects(releaseVersion(root), /divergentes/);
});

test('rejects absent Defender, detection, scan errors and duplicate scan paths', async (t) => {
  const { root, out, inspection } = await fixture(t);
  const original = JSON.parse(await readFile(path.join(out, 'candidate.json'), 'utf8'));
  for (const mutate of [
    (value) => {
      value.defenderVerdict = 'unavailable';
    },
    (value) => {
      value.defenderVerdict = 'detected';
    },
    (value) => {
      value.defenderStatus.AntivirusEnabled = false;
    },
    (value) => {
      value.scans[0].exitCode = 2;
    },
    (value) => {
      value.scans.pop();
    },
    (value) => {
      value.files[1].path = value.files[0].path;
    },
  ]) {
    const changed = structuredClone(inspection);
    mutate(changed);
    await writeFile(
      path.join(out, 'candidate.json'),
      JSON.stringify({ ...original, inspection: changed }),
    );
    await assert.rejects(validateCandidate(root, out, commit));
  }
});

test('signs unchanged candidate bytes with a temporary test key and binds the version', async (t) => {
  const { root, out } = await fixture(t);
  const keyPath = path.join(root, 'temporary-test-only.key');
  const cli = path.join(projectRoot, 'node_modules/@tauri-apps/cli/tauri.js');
  const environment = { ...process.env, CI: 'true', TAURI_SIGNING_PRIVATE_KEY_PASSWORD: '' };
  delete environment.TAURI_SIGNING_PRIVATE_KEY;
  const generate = spawnSync(
    process.execPath,
    [cli, 'signer', 'generate', '--ci', '--password', '', '-w', keyPath],
    { env: environment, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 },
  );
  assert.equal(generate.status, 0, 'Temporary signing key generation failed; output withheld.');
  const installerPath = path.join(out, candidateNames(currentVersion)[0]);
  const before = await readFile(installerPath);
  const sign = spawnSync(
    process.execPath,
    [path.join(projectRoot, 'scripts/release-candidate.mjs'), 'sign', out, commit, keyPath],
    { env: environment, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 },
  );
  assert.equal(sign.status, 0, 'Signing test failed; child output withheld.');
  assert.deepEqual(await readFile(installerPath), before);
  const signature = await readFile(installerPath + '.sig', 'utf8');
  assert.ok(
    Buffer.from(signature.trim(), 'base64')
      .toString('utf8')
      .includes(`\tversion:${currentVersion}`),
  );
  const output = await prepareRelease(root, out);
  const manifest = JSON.parse(await readFile(path.join(output, 'latest.json'), 'utf8'));
  assert.equal(manifest.version, currentVersion);
  assert.deepEqual(await readFile(path.join(output, candidateNames(currentVersion)[0])), before);
});

test('publication requires matching CI and local verification evidence for the exact installer', async (t) => {
  const { root, out } = await fixture(t);
  const installer = await readFile(path.join(out, candidateNames(currentVersion)[0]));
  const evidence = {
    version: currentVersion,
    ...provenance,
    defender: 'no-threats-reported',
    signedVersionVerified: true,
    installerSha256: hash(installer),
  };
  const evidencePath = path.join(out, 'release-verification.json');
  await assert.rejects(validateReleaseEvidence(root, out, currentVersion));
  await writeFile(evidencePath, JSON.stringify(evidence));
  assert.equal((await validateReleaseEvidence(root, out, currentVersion)).commit, commit);
  for (const change of [
    { signedVersionVerified: false },
    { runId: null },
    { defender: 'unavailable' },
    { installerSha256: '0'.repeat(64) },
  ]) {
    await writeFile(evidencePath, JSON.stringify({ ...evidence, ...change }));
    await assert.rejects(validateReleaseEvidence(root, out, currentVersion));
  }
  await writeFile(evidencePath, JSON.stringify(evidence));
  await writeFile(
    path.join(root, 'scripts/release-security-holds.json'),
    JSON.stringify({ [currentVersion]: { status: 'blocked' } }),
  );
  await assert.rejects(validateReleaseEvidence(root, out, currentVersion), /bloqueada/);
});
