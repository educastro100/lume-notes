param(
  [Parameter(Mandatory=$true)][string]$ArtifactZip,
  [string]$KeyFile = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Codex\Lume Signing\lume-notes.key')
)
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$lumeRoot = Split-Path $PSScriptRoot -Parent
Push-Location -LiteralPath $lumeRoot
try {
  $lumeVersion = (Get-Content -LiteralPath package.json -Raw -Encoding UTF8 | ConvertFrom-Json).version
  $lumeHead = (& git rev-parse HEAD | Out-String).Trim()
  if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel identificar o commit local.' }
  $lumeDirty = (& git status --porcelain | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $lumeDirty) { throw 'Finalize as alteracoes locais antes de conferir um candidato.' }
  $lumeStage = Join-Path $lumeRoot ('releases\' + $lumeVersion + '\candidate-' + [Guid]::NewGuid().ToString('N'))
  [IO.Directory]::CreateDirectory($lumeStage) | Out-Null
  $lumeInstallerName = "Lume-Notes-$lumeVersion-Windows-x64-setup.exe"
  $lumeAllowed = @('candidate.json','lume-notes.exe','verify-release.exe',$lumeInstallerName)
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $lumeZip = [IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $ArtifactZip).Path)
  try {
    $lumeEntries = @($lumeZip.Entries)
    if ($lumeEntries.Count -ne $lumeAllowed.Count) { throw 'ZIP com conteudo inesperado.' }
    $lumeSeen = @{}
    foreach ($lumeEntry in $lumeEntries) {
      if ($lumeEntry.FullName -cnotin $lumeAllowed -or $lumeSeen.ContainsKey($lumeEntry.FullName)) { throw 'ZIP contem um caminho inesperado ou duplicado.' }
      if ($lumeEntry.Length -gt 64MB) { throw 'Arquivo do candidato excede o tamanho permitido.' }
      $lumeSeen[$lumeEntry.FullName] = $true
      [IO.Compression.ZipFileExtensions]::ExtractToFile($lumeEntry,(Join-Path $lumeStage $lumeEntry.FullName),$false)
    }
  } finally { $lumeZip.Dispose() }
  $lumeManifest = Get-Content -LiteralPath (Join-Path $lumeStage 'candidate.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  $lumeBuildCommit = $lumeManifest.commit
  & node (Join-Path $PSScriptRoot 'release-candidate.mjs') compatible $lumeBuildCommit $lumeHead
  if ($LASTEXITCODE -ne 0) { throw 'Os arquivos de compilacao locais diferem do candidato. Nenhuma chave foi aberta.' }
  & node (Join-Path $PSScriptRoot 'release-candidate.mjs') validate $lumeStage $lumeBuildCommit
  if ($LASTEXITCODE -ne 0) { throw 'Candidato nao confere. Nenhuma chave foi aberta nem binario executado.' }
  $lumeScanners = @(Get-ChildItem -Path "$env:ProgramData/Microsoft/Windows Defender/Platform/*/MpCmdRun.exe" -File -ErrorAction SilentlyContinue | Where-Object { $_.Directory.Name -match '^\d' } | Sort-Object { [version]($_.VersionInfo.FileVersion -replace '[^0-9.].*$','') } -Descending)
  $lumeScanner = if ($lumeScanners.Count) { $lumeScanners[0].FullName } else { Join-Path $env:ProgramFiles 'Windows Defender/MpCmdRun.exe' }
  if (-not (Test-Path -LiteralPath $lumeScanner -PathType Leaf)) { throw 'Defender local indisponivel. Assinatura cancelada.' }
  $lumeScanLogs = $lumeStage + '-scan-logs'
  [IO.Directory]::CreateDirectory($lumeScanLogs) | Out-Null
  $lumeUpdateOutput = (& $lumeScanner -SignatureUpdate 2>&1 | Out-String)
  $lumeUpdateExit = $LASTEXITCODE
  $lumeUpdateOutput | Set-Content -LiteralPath (Join-Path $lumeScanLogs 'defender-update.txt') -Encoding UTF8
  if ($lumeUpdateExit -ne 0) { throw 'Falha ao atualizar o Defender. Assinatura cancelada.' }
  foreach ($lumeFile in $lumeManifest.files) {
    $lumePath = Join-Path $lumeStage $lumeFile.name
    $lumeLog = Join-Path $lumeScanLogs ($lumeFile.name + '.scan.txt')
    $lumeScanOutput = (& $lumeScanner -Scan -ScanType 3 -File $lumePath -DisableRemediation 2>&1 | Out-String)
    $lumeScanExit = $LASTEXITCODE
    $lumeScanOutput | Set-Content -LiteralPath $lumeLog -Encoding UTF8
    if ($lumeScanExit -ne 0 -or $lumeScanOutput -notmatch 'found no threats') { throw 'Defender detectou ou nao concluiu a varredura. Assinatura cancelada.' }
    if ((Get-FileHash -LiteralPath $lumePath -Algorithm SHA256).Hash.ToLowerInvariant() -cne $lumeFile.sha256) { throw 'O arquivo examinado mudou.' }
  }
  # Only the official Tauri CLI opens the key, after validating and scanning all input files.
  & node (Join-Path $PSScriptRoot 'release-candidate.mjs') sign $lumeStage $lumeBuildCommit (Resolve-Path -LiteralPath $KeyFile).Path
  if ($LASTEXITCODE -ne 0) { throw 'Assinatura local falhou.' }
  & node (Join-Path $PSScriptRoot 'prepare-release.mjs') $lumeStage
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar o manifesto.' }
  $lumeOutput = Join-Path $lumeRoot "releases/$lumeVersion"
  Copy-Item -LiteralPath (Join-Path $lumeStage 'verify-release.exe') -Destination (Join-Path $lumeOutput 'verify-release.exe')
  & (Join-Path $PSScriptRoot 'publish-release.ps1') -Version $lumeVersion -PrepareOnly
  if (-not $?) { throw 'Falha na verificacao final do pacote.' }
  $lumeInstallerRecord = $lumeManifest.files | Where-Object { $_.name -ceq $lumeInstallerName }
  [ordered]@{ version=$lumeVersion;repository=$lumeManifest.repository;commit=$lumeBuildCommit;preparationCommit=$lumeHead;runId=$lumeManifest.runId;defender='no-threats-reported';installerSha256=$lumeInstallerRecord.sha256;signedVersionVerified=$true;published=$false } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $lumeOutput 'release-verification.json')
  Write-Host "Release $lumeVersion preparada e verificada em $lumeOutput. Nenhum arquivo foi publicado."
} finally { Pop-Location }
