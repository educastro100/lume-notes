import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const originalMarker = Buffer.from('__TAURI_BUNDLE_TYPE_VAR_UNK');
const nsisMarker = Buffer.from('__TAURI_BUNDLE_TYPE_VAR_NSS');
const describe = (bytes) => ({
  bytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
});

// Tauri CLI 2.12.3 patches the first marker for NSIS, then restores the build file.
// https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.12.3/crates/tauri-bundler/src/bundle.rs
// Construct the expected bytes in memory only. Never modify either executable.
export function verifyNsisPayload(build, payload) {
  const result = {
    matches: false,
    rule: 'tauri-cli-2.12.3-nsis-marker-only',
    build: describe(build),
    payload: describe(payload),
    expectedPayloadSha256: null,
    markerOffset: build.indexOf(originalMarker),
    changedBytes: 0,
    error: null,
  };
  if (result.markerOffset < 0 || build.indexOf(originalMarker, result.markerOffset + 1) !== -1) {
    result.error = 'Marcador UNK ausente ou ambiguo no executavel de build.';
    return result;
  }
  const expected = Buffer.from(build);
  nsisMarker.copy(expected, result.markerOffset);
  result.expectedPayloadSha256 = describe(expected).sha256;
  for (let index = 0; index < Math.max(build.length, payload.length); index++) {
    if (build[index] !== payload[index]) result.changedBytes++;
  }
  result.matches = expected.equals(payload);
  if (!result.matches) {
    result.error = 'O pacote difere da transformacao UNK -> NSS esperada do Tauri.';
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [buildPath, payloadPath, reportPath] = process.argv.slice(2);
  if (!buildPath || !payloadPath || !reportPath) {
    throw new Error('Uso: node verify-nsis-payload.mjs <build> <payload> <report.json>');
  }
  let result;
  try {
    result = verifyNsisPayload(await readFile(buildPath), await readFile(payloadPath));
  } catch (error) {
    result = { matches: false, error: error.message };
  }
  await writeFile(reportPath, `${JSON.stringify(result, null, 2)}\n`);
  if (!result.matches) process.exitCode = 1;
}
