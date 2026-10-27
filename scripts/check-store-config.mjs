import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const marker = 'LUME_STORE_CONFIG_VALIDATED';
// Stop in the frontend hook, after Tauri merges and validates all configuration,
// before frontend/native compilation. Use the same target and overlay as the workflow.
function probe(extra = []) {
  const result = spawnSync(
    process.execPath,
    [
      path.join(root, 'node_modules/@tauri-apps/cli/tauri.js'),
      'build',
      '--ci',
      '--no-bundle',
      '--features',
      'microsoft-store',
      '--target',
      'x86_64-pc-windows-msvc',
      '--config',
      'src-tauri/tauri.microsoft-store.conf.json',
      '--config',
      JSON.stringify({ build: { beforeBuildCommand: 'node scripts/store-config-probe.cjs' } }),
      ...extra,
    ],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: 60000,
      env: { ...process.env, VITE_LUME_DISTRIBUTION: 'microsoft-store' },
    },
  );
  if (result.error) throw result.error;
  return result;
}
const broken = probe([
  '--config',
  JSON.stringify({
    bundle: { windows: { webviewInstallMode: { silent: true } } },
  }),
]);
if (
  broken.status === 0 ||
  !/error on .*webviewInstallMode/.test(broken.stderr || '') ||
  (broken.stdout || '').split(/\r?\n/).includes(marker)
) {
  throw new Error('Tauri regression probe did not reject skip with inherited silent.');
}
const result = probe(),
  stdout = result.stdout || '',
  stderr = result.stderr || '';
if (
  result.status === 0 ||
  !stdout.split(/\r?\n/).includes(marker) ||
  !/failed with exit code 42/.test(stderr)
) {
  console.error(stdout + stderr);
  throw new Error(
    'Tauri did not validate the merged Microsoft Store configuration and stop at the probe.',
  );
}
console.log(
  'Tauri rejected the original skip/silent conflict and validated the corrected configuration; stopped before compilation.',
);
