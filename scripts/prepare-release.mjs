import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const RELEASE_REPO = 'educastro100/lume-notes-releases';
export function releaseMetadata(version, signature, notes = '', date = new Date().toISOString()) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Use uma versão estável no formato X.Y.Z.');
  const decoded = Buffer.from(signature.trim(), 'base64').toString('utf8');
  const trusted = decoded.split('\n').find((line) => line.startsWith('trusted comment:')) || '';
  if (!trusted.split('\t').includes('version:' + version))
    throw new Error(
      'A assinatura não está vinculada à versão do aplicativo. Recompile com uma CLI Tauri compatível.',
    );
  const name = `Lume-Notes-${version}-Windows-x64-setup.exe`;
  return {
    version,
    notes,
    pub_date: date,
    platforms: {
      'windows-x86_64': {
        url: `https://github.com/${RELEASE_REPO}/releases/download/v${version}/${name}`,
        signature: signature.trim(),
      },
    },
  };
}
export async function prepareRelease(root, bundleDirectory) {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const config = JSON.parse(await readFile(path.join(root, 'src-tauri/tauri.conf.json'), 'utf8'));
  if (pkg.version !== config.version)
    throw new Error('As versões do app e do instalador não coincidem.');
  const expectedKey =
    'https://github.com/' + RELEASE_REPO + '/releases/latest/download/latest.json';
  if (
    config.plugins.updater.endpoints[0] !== expectedKey ||
    !config.plugins.updater.requireSignedVersion
  )
    throw new Error(
      'Canal de atualização ou validação da assinatura não corresponde à distribuição oficial.',
    );
  const files = (await readdir(bundleDirectory)).filter(
    (name) =>
      name === `Lume-Notes-${pkg.version}-Windows-x64-setup.exe` ||
      (name.endsWith('-setup.exe') && name.includes('_' + pkg.version + '_')),
  );
  if (files.length !== 1) throw new Error('Esperado exatamente um instalador NSIS desta versão.');
  const original = path.join(bundleDirectory, files[0]);
  const signature = await readFile(original + '.sig', 'utf8');
  const out = path.join(root, 'releases', pkg.version);
  await mkdir(out, { recursive: true });
  const notesPath = path.join(root, 'docs', 'release-notes-' + pkg.version + '.md');
  const notes = await readFile(notesPath, 'utf8');
  const manifest = releaseMetadata(pkg.version, signature, notes);
  const name = path.basename(manifest.platforms['windows-x86_64'].url);
  await copyFile(original, path.join(out, name));
  await copyFile(original + '.sig', path.join(out, name + '.sig'));
  await writeFile(path.join(out, 'latest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(path.join(out, 'RELEASE-NOTES.md'), notes);
  const sums = [];
  for (const asset of [name, name + '.sig', 'latest.json'])
    sums.push(
      createHash('sha256')
        .update(await readFile(path.join(out, asset)))
        .digest('hex') +
        '  ' +
        asset,
    );
  await writeFile(path.join(out, 'SHA256SUMS.txt'), sums.join('\n') + '\n');
  console.log('Pacote e manifesto preparados em ' + out);
  return out;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  if (!process.argv[2]) throw new Error('Informe a pasta bundle/nsis como argumento.');
  await prepareRelease(root, path.resolve(process.argv[2]));
}
