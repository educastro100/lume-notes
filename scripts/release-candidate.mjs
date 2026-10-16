import { createHash } from 'node:crypto';
import { copyFile, lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repository = 'educastro100/lume-notes';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = async (file) => JSON.parse(await readFile(file, 'utf8'));
export function assertPreparationChanges(paths) {
  // These files are not build inputs for this project's npm/Tauri build commands.
  // Any other change (source, assets, manifests, locks or compiler config) requires a new CI build.
  if (paths.some((file) => !/^(scripts\/|docs\/|\.github\/|README\.md$|CHANGELOG\.md$)/.test(file)))
    throw new Error(
      'Arquivos de compilacao mudaram desde o candidato. Execute um novo build no CI.',
    );
}
export const candidateNames = (version) => [
  `Lume-Notes-${version}-Windows-x64-setup.exe`,
  'lume-notes.exe',
  'verify-release.exe',
];

export async function releaseVersion(root) {
  const pkg = await json(path.join(root, 'package.json'));
  const config = await json(path.join(root, 'src-tauri/tauri.conf.json'));
  const lock = await json(path.join(root, 'package-lock.json'));
  const cargo = (await readFile(path.join(root, 'src-tauri/Cargo.toml'), 'utf8')).replace(
    /\r\n/g,
    '\n',
  );
  const cargoLock = (await readFile(path.join(root, 'src-tauri/Cargo.lock'), 'utf8')).replace(
    /\r\n/g,
    '\n',
  );
  const policy = await json(path.join(root, 'scripts/release-security-holds.json'));
  const version = pkg.version;
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Versao estavel invalida.');
  if (
    config.version !== version ||
    lock.version !== version ||
    lock.packages[''].version !== version ||
    cargo.match(/^\[package\][\s\S]*?^version = "([^"]+)"/m)?.[1] !== version ||
    !cargoLock.includes(`name = "lume-notes"\nversion = "${version}"`)
  )
    throw new Error('Versoes do projeto e arquivos de lock divergentes.');
  if (policy[version]?.status === 'blocked') throw new Error('Versao bloqueada para distribuicao.');
  return version;
}

function checkInspection(inspection) {
  if (
    !inspection.contentsVerified ||
    !inspection.binaryComparison?.matches ||
    inspection.defenderVerdict !== 'no-threats-reported' ||
    inspection.errors?.length ||
    !inspection.defenderStatus?.AntivirusEnabled ||
    !inspection.defenderStatus?.AMServiceEnabled ||
    !Array.isArray(inspection.files) ||
    !Array.isArray(inspection.scans) ||
    inspection.files.length < 4 ||
    inspection.scans.length !== inspection.files.length
  )
    throw new Error('Inspecao incompleta, sem Defender ou sem resultado negativo.');
  if (new Set(inspection.files.map((file) => file.path)).size !== inspection.files.length)
    throw new Error('Inventario de varredura duplicado.');
  for (const file of inspection.files) {
    const scans = inspection.scans.filter((scan) => scan.path === file.path);
    if (scans.length !== 1 || scans[0].exitCode !== 0)
      throw new Error('Varredura ausente ou falhou.');
  }
}

export async function createCandidate(root, releaseDirectory, inspection, out, provenance) {
  const version = await releaseVersion(root);
  checkInspection(inspection);
  if (provenance.repository !== repository || !/^[a-f0-9]{40}$/.test(provenance.commit))
    throw new Error('Procedencia do workflow invalida.');
  if (inspection.commit !== provenance.commit) throw new Error('Commit do relatorio divergente.');
  const installers = (await readdir(path.join(releaseDirectory, 'bundle/nsis'))).filter(
    (name) => name.endsWith('-setup.exe') && name.includes(`_${version}_`),
  );
  if (installers.length !== 1) throw new Error('Instalador ausente ou ambiguo.');
  const sources = [
    path.join(releaseDirectory, 'bundle/nsis', installers[0]),
    path.join(root, 'diagnostics/extracted/lume-notes.exe'),
    path.join(releaseDirectory, 'examples/verify-release.exe'),
  ];
  await mkdir(out, { recursive: true });
  const files = [];
  for (const [index, name] of candidateNames(version).entries()) {
    const bytes = await readFile(sources[index]);
    const sha256 = hash(bytes);
    if (!inspection.files.some((entry) => entry.sha256 === sha256 && entry.bytes === bytes.length))
      throw new Error('Arquivo nao corresponde ao conteudo examinado pelo Defender.');
    await copyFile(sources[index], path.join(out, name));
    files.push({ name, bytes: bytes.length, sha256 });
  }
  const manifest = { schemaVersion: 1, version, ...provenance, files, inspection };
  await writeFile(path.join(out, 'candidate.json'), JSON.stringify(manifest, null, 2) + '\n');
  await validateCandidate(root, out, provenance.commit);
  return manifest;
}

export async function validateCandidate(root, directory, expectedCommit) {
  const version = await releaseVersion(root);
  const candidate = await json(path.join(directory, 'candidate.json'));
  if (
    candidate.schemaVersion !== 1 ||
    candidate.version !== version ||
    candidate.repository !== repository ||
    !/^[a-f0-9]{40}$/.test(expectedCommit) ||
    candidate.commit !== expectedCommit ||
    candidate.inspection?.commit !== expectedCommit ||
    !/^\d+$/.test(String(candidate.runId))
  )
    throw new Error('Candidato nao corresponde a versao, repositorio ou commit local.');
  checkInspection(candidate.inspection);
  const names = candidateNames(version);
  const actualNames = (await readdir(directory)).sort();
  if (JSON.stringify(actualNames) !== JSON.stringify([...names, 'candidate.json'].sort()))
    throw new Error('Arquivos inesperados ou ausentes no candidato.');
  if (!Array.isArray(candidate.files) || candidate.files.length !== names.length)
    throw new Error('Inventario do candidato invalido.');
  for (const name of names) {
    const entries = candidate.files.filter((entry) => entry.name === name);
    const info = await lstat(path.join(directory, name));
    if (entries.length !== 1 || !info.isFile() || info.isSymbolicLink())
      throw new Error('Arquivo de candidato invalido.');
    const bytes = await readFile(path.join(directory, name));
    const sha256 = hash(bytes);
    if (
      sha256 !== entries[0].sha256 ||
      bytes.length !== entries[0].bytes ||
      !candidate.inspection.files.some(
        (entry) => entry.sha256 === sha256 && entry.bytes === bytes.length,
      )
    )
      throw new Error('Hash ou tamanho diverge da inspecao do CI.');
  }
  const app = candidate.files.find((file) => file.name === 'lume-notes.exe');
  if (
    app.sha256 !== candidate.inspection.binaryComparison.payload.sha256 ||
    app.sha256 !== candidate.inspection.binaryComparison.expectedPayloadSha256
  )
    throw new Error('Executavel nao corresponde a comparacao do pacote NSIS.');
  return candidate;
}

export async function validateReleaseEvidence(root, directory, version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Versao de publicacao invalida.');
  const policy = await json(path.join(root, 'scripts/release-security-holds.json'));
  if (policy[version]?.status === 'blocked') throw new Error('Versao bloqueada para distribuicao.');
  const evidence = await json(path.join(directory, 'release-verification.json'));
  const installer = await readFile(path.join(directory, candidateNames(version)[0]));
  if (
    evidence.version !== version ||
    evidence.repository !== repository ||
    !/^[a-f0-9]{40}$/.test(evidence.commit) ||
    !/^\d+$/.test(String(evidence.runId)) ||
    evidence.defender !== 'no-threats-reported' ||
    evidence.signedVersionVerified !== true ||
    evidence.installerSha256 !== hash(installer)
  )
    throw new Error('Evidencia da compilacao e verificacao da release ausente ou divergente.');
  return evidence;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const [mode, directory, third, fourth] = process.argv.slice(2);
  if (mode === 'compatible') {
    if (!/^[a-f0-9]{40}$/.test(directory) || !/^[a-f0-9]{40}$/.test(third))
      throw new Error('Commit de compilacao ou preparacao invalido.');
    const difference = spawnSync('git', ['diff', '--name-only', directory, third, '--'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (difference.error || difference.status !== 0)
      throw new Error('Nao foi possivel comparar os commits.');
    assertPreparationChanges(difference.stdout.trim().split(/\r?\n/).filter(Boolean));
    console.log('Arquivos de compilacao identicos aos do candidato.');
  } else if (mode === 'publication') {
    await validateReleaseEvidence(root, directory, third);
    console.log('Evidencia da release conferida.');
  } else if (mode === 'create') {
    await createCandidate(root, directory, await json(third), fourth, {
      repository: process.env.GITHUB_REPOSITORY,
      commit: process.env.GITHUB_SHA,
      runId: process.env.GITHUB_RUN_ID,
    });
  } else if (mode === 'validate' || mode === 'sign') {
    const candidate = await validateCandidate(root, directory, third);
    if (mode === 'sign') {
      if (!fourth) throw new Error('Informe o caminho da chave local.');
      // Only the official CLI opens the key. Never print child output or put secrets in arguments.
      const signingEnvironment = {
        ...process.env,
        TAURI_SIGNING_PRIVATE_KEY_PASSWORD: process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ?? '',
      };
      delete signingEnvironment.TAURI_SIGNING_PRIVATE_KEY;
      const result = spawnSync(
        process.execPath,
        [
          path.join(root, 'node_modules/@tauri-apps/cli/tauri.js'),
          'signer',
          'sign',
          '--private-key-path',
          path.resolve(fourth),
          '--app-version',
          candidate.version,
          path.join(path.resolve(directory), candidateNames(candidate.version)[0]),
        ],
        { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: signingEnvironment },
      );
      if (result.error || result.status !== 0)
        throw new Error(
          'Falha ao assinar com a chave local. Confira o arquivo e a senha no ambiente.',
        );
      console.log('Assinatura local criada para a versao ' + candidate.version);
    } else
      console.log('Candidato conferido: ' + candidate.version + ', commit ' + candidate.commit);
  } else throw new Error('Use create, validate, sign, compatible ou publication.');
}
