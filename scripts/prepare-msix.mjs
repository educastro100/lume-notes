import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { releaseVersion } from './release-candidate.mjs';

export function publisherId(publisher) {
  const hash = createHash('sha256').update(publisher, 'utf16le').digest().subarray(0, 8);
  const bits = [...hash].map((byte) => byte.toString(2).padStart(8, '0')).join('') + '0';
  return bits
    .match(/.{5}/g)
    .map((part) => '0123456789abcdefghjkmnpqrstvwxyz'[parseInt(part, 2)])
    .join('');
}
export function validateIdentity(value) {
  if (
    value.name !== 'EduardoJunqueira.LumeNotes' ||
    value.publisher !== 'CN=E5933B3E-48A8-4F93-BF1C-57211F27FF86' ||
    value.publisherDisplayName !== 'Eduardo Junqueira' ||
    value.applicationId !== 'Lume' ||
    value.packageFamilyName !== value.name + '_' + publisherId(value.publisher)
  )
    throw new Error('A identidade nao corresponde ao Partner Center e ao PFN informado.');
  return value;
}
export function msixVersion(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version) || version.split('.').some((part) => Number(part) > 65535))
    throw new Error('Versao MSIX invalida.');
  return version + '.0';
}
export function manifest(identity, version) {
  validateIdentity(identity);
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"',
    ' xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"',
    ' xmlns:uap3="http://schemas.microsoft.com/appx/manifest/uap/windows10/3"',
    ' xmlns:uap10="http://schemas.microsoft.com/appx/manifest/uap/windows10/10"',
    ' xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"',
    ' IgnorableNamespaces="uap uap3 uap10 rescap">',
    ' <Identity Name="' +
      identity.name +
      '" Publisher="' +
      identity.publisher +
      '" Version="' +
      msixVersion(version) +
      '" ProcessorArchitecture="x64"/>',
    ' <Properties><DisplayName>Lume Notes</DisplayName><PublisherDisplayName>' +
      identity.publisherDisplayName +
      '</PublisherDisplayName><Description>Editor local de texto e Markdown.</Description><Logo>Assets/StoreLogo.png</Logo></Properties>',
    ' <Resources><Resource Language="pt-BR"/><Resource Language="en-US"/><Resource Language="es-ES"/><Resource Language="fr-FR"/><Resource Language="de-DE"/><Resource Language="el-GR"/><Resource Language="zh-CN"/></Resources>',
    ' <Dependencies><TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.19041.0" MaxVersionTested="10.0.26100.0"/></Dependencies>',
    ' <Applications>',
    '  <Application Id="' +
      identity.applicationId +
      '" Executable="lume-notes.exe" uap10:RuntimeBehavior="packagedClassicApp" uap10:TrustLevel="mediumIL">',
    '   <uap:VisualElements DisplayName="Lume Notes" Description="Editor local de texto e Markdown." BackgroundColor="transparent" Square150x150Logo="Assets/Square150x150Logo.png" Square44x44Logo="Assets/Square44x44Logo.png"/>',
    '   <Extensions><uap3:Extension Category="windows.fileTypeAssociation">',
    '    <uap3:FileTypeAssociation Name="lumetext" Parameters="&quot;%1&quot;" MultiSelectModel="Document">',
    '     <uap:DisplayName>Documento do Lume</uap:DisplayName><uap:SupportedFileTypes>' +
      ['.txt', '.md', '.json', '.log', '.csv']
        .map((extension) => '<uap:FileType>' + extension + '</uap:FileType>')
        .join('') +
      '</uap:SupportedFileTypes>',
    '    </uap3:FileTypeAssociation></uap3:Extension></Extensions>',
    '  </Application>',
    ' </Applications><Capabilities><rescap:Capability Name="runFullTrust"/></Capabilities>',
    '</Package>',
    '',
  ].join('\n');
}
export function assertX64(bytes) {
  if (bytes.length < 64 || bytes.toString('ascii', 0, 2) !== 'MZ')
    throw new Error('Executavel PE ausente ou invalido.');
  const offset = bytes.readUInt32LE(0x3c);
  if (
    offset + 6 > bytes.length ||
    bytes.readUInt32LE(offset) !== 0x4550 ||
    bytes.readUInt16LE(offset + 4) !== 0x8664
  )
    throw new Error('O pacote da Store requer PE Windows x64.');
}
async function copyFile(source, destination, pe = false) {
  const stat = await fs.lstat(source);
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error('A origem deve ser um arquivo regular.');
  const bytes = await fs.readFile(source);
  if (pe) assertX64(bytes);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, bytes, { flag: 'wx' });
  return { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}
export async function prepareMsix(root, executable, output) {
  root = path.resolve(root);
  executable = path.resolve(executable);
  output = path.resolve(output);
  if (process.env.VITE_LUME_DISTRIBUTION !== 'microsoft-store')
    throw new Error('Exige compilacao Microsoft Store.');
  const version = await releaseVersion(root);
  const identity = validateIdentity(
    JSON.parse(await fs.readFile(path.join(root, 'packaging/msix/identity.json'), 'utf8')),
  );
  // Fresh staging prevents accidental distribution of source, notes, keys or stale builds.
  const stage = path.join(output, 'stage');
  await fs.mkdir(output, { recursive: true });
  await fs.mkdir(stage);
  const files = {};
  files['lume-notes.exe'] = await copyFile(executable, path.join(stage, 'lume-notes.exe'), true);
  try {
    const loader = path.join(path.dirname(executable), 'WebView2Loader.dll');
    await fs.access(loader);
    files['WebView2Loader.dll'] = await copyFile(
      loader,
      path.join(stage, 'WebView2Loader.dll'),
      true,
    );
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  files.LICENSE = await copyFile(path.join(root, 'LICENSE'), path.join(stage, 'LICENSE'));
  for (const [name, size] of [
    ['StoreLogo.png', 50],
    ['Square44x44Logo.png', 44],
    ['Square150x150Logo.png', 150],
  ]) {
    const source = path.join(root, 'src-tauri/icons', name);
    const png = await fs.readFile(source);
    if (
      png.length < 24 ||
      png.toString('hex', 0, 8) !== '89504e470d0a1a0a' ||
      png.readUInt32BE(16) !== size ||
      png.readUInt32BE(20) !== size
    )
      throw new Error('Dimensoes de imagem invalidas: ' + name);
    files['Assets/' + name] = await copyFile(source, path.join(stage, 'Assets', name));
  }
  const data = manifest(identity, version);
  await fs.writeFile(path.join(stage, 'AppxManifest.xml'), data, { flag: 'wx' });
  files['AppxManifest.xml'] = {
    bytes: Buffer.byteLength(data),
    sha256: createHash('sha256').update(data).digest('hex'),
  };
  const report = {
    version,
    packageVersion: msixVersion(version),
    identity,
    files,
    commit: process.env.GITHUB_SHA || null,
    runId: process.env.GITHUB_RUN_ID || null,
    signed: false,
    purpose: 'Microsoft Store submission; not a locally installable signed release.',
  };
  await fs.writeFile(
    path.join(output, 'msix-staging.json'),
    JSON.stringify(report, null, 2) + '\n',
    { flag: 'wx' },
  );
  return { stage, report, filename: 'Lume-Notes-' + version + '-Windows-x64-store.msix' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [root, executable, output] = process.argv.slice(2);
    if (!root || !executable || !output)
      throw new Error('Uso: node scripts/prepare-msix.mjs <raiz> <executavel> <saida>');
    console.log(JSON.stringify(await prepareMsix(root, executable, output)));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
