# Static inspection only: never launch the Lume installer or its extracted executables.
param([switch]$ReleaseCandidate)
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
if ($env:GITHUB_ACTIONS -ne 'true') { throw 'Este coletor deve rodar somente no workflow de diagnostico do GitHub.' }
$lumeRoot = Split-Path $PSScriptRoot -Parent
$lumeBase = Join-Path $lumeRoot 'diagnostics'
$lumeReports = Join-Path $lumeBase 'reports'
$lumeExtracted = Join-Path $lumeBase 'extracted'
[IO.Directory]::CreateDirectory($lumeReports) | Out-Null
$lumeReport = [ordered]@{
  commit = $env:GITHUB_SHA
  createdUtc = [DateTime]::UtcNow.ToString('o')
  diagnosticOnly = -not [bool]$ReleaseCandidate
  defenderVerdict = 'unavailable'
  defenderStatus = $null
  contentsVerified = $false
  binaryComparison = $null
  files = @()
  scans = @()
  errors = @()
}
$lumeReady = $false
try {
  $lumeRelease = Join-Path $lumeRoot 'src-tauri/target/x86_64-pc-windows-msvc/release'
  if ($ReleaseCandidate) {
    & node --input-type=module -e "import { releaseVersion } from './scripts/release-candidate.mjs'; await releaseVersion(process.cwd());"
    if ($LASTEXITCODE -ne 0) { throw 'Versao bloqueada ou inconsistente.' }
  }
  $lumeInstallers = @(Get-ChildItem -LiteralPath (Join-Path $lumeRelease 'bundle/nsis') -Filter '*-setup.exe' -File)
  if ($lumeInstallers.Count -ne 1) { throw 'Esperado um instalador NSIS em um target novo.' }
  $lumeInstaller = $lumeInstallers[0]
  $lumeApp = Join-Path $lumeRelease 'lume-notes.exe'
  # Tauri restores the UNK build file after embedding the NSS copy in the installer.
  $lumeInstallerHash = (Get-FileHash -LiteralPath $lumeInstaller.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  $lumeSevenZip = Join-Path $env:ProgramFiles '7-Zip/7z.exe'
  if (-not (Test-Path -LiteralPath $lumeSevenZip -PathType Leaf)) { throw '7-Zip da imagem oficial indisponivel.' }
  & $lumeSevenZip x -y "-o$lumeExtracted" $lumeInstaller.FullName *> (Join-Path $lumeReports 'extraction.txt')
  if ($LASTEXITCODE -ne 0) { throw 'Extracao estatica incompleta. Nenhum resultado foi liberado.' }
  $lumePayloads = @(Get-ChildItem -LiteralPath $lumeExtracted -Filter 'lume-notes.exe' -File -Recurse)
  if ($lumePayloads.Count -ne 1) { throw 'Executavel final ausente ou ambiguo; pode ter ocorrido bloqueio/quarentena.' }
  $lumePayload = $lumePayloads[0]
  $lumeComparisonPath = Join-Path $lumeReports 'payload-comparison.json'
  & node (Join-Path $PSScriptRoot 'verify-nsis-payload.mjs') $lumeApp $lumePayload.FullName $lumeComparisonPath
  $lumeComparisonExit = $LASTEXITCODE
  $lumeReport.binaryComparison = Get-Content -LiteralPath $lumeComparisonPath -Raw | ConvertFrom-Json
  if ($lumeComparisonExit -ne 0 -or -not $lumeReport.binaryComparison.matches) {
    throw 'O executavel do pacote difere da transformacao NSIS esperada. Consulte payload-comparison.json.'
  }
  $lumePayloadHash = $lumeReport.binaryComparison.payload.sha256
  $lumeReport.contentsVerified = $true
  $lumeFiles = @($lumeInstaller) + @(Get-ChildItem -LiteralPath $lumeExtracted -File -Recurse | Where-Object {$_.Extension -in '.exe','.dll'})
  if ($ReleaseCandidate) { $lumeFiles += Get-Item -LiteralPath (Join-Path $lumeRelease 'examples/verify-release.exe') }
  foreach ($lumeFile in $lumeFiles) {
    if ($lumeFile.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Conteudo extraido contem um link inesperado.' }
    $lumeReport.files += [ordered]@{
      path = [IO.Path]::GetRelativePath($lumeBase,$lumeFile.FullName)
      bytes = $lumeFile.Length
      sha256 = (Get-FileHash -LiteralPath $lumeFile.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
  }
  try {
    $lumeStatus = Get-MpComputerStatus -ErrorAction Stop
    $lumeReport.defenderStatus = $lumeStatus | Select-Object AMProductVersion,AMEngineVersion,AMServiceEnabled,AntivirusEnabled,RealTimeProtectionEnabled,AntivirusSignatureVersion,AntivirusSignatureLastUpdated
  } catch { $lumeReport.errors += ('Estado do Defender: ' + $_.Exception.Message) }
  $lumeScanner = $null
  if ($lumeStatus -and $lumeStatus.AMServiceEnabled -and $lumeStatus.AntivirusEnabled) {
    $lumePlatform = Join-Path $env:ProgramData 'Microsoft/Windows Defender/Platform'
    $lumeCandidates = @(Get-ChildItem -Path "$lumePlatform/*/MpCmdRun.exe" -File -ErrorAction SilentlyContinue | Sort-Object {[version]($_.VersionInfo.FileVersion -replace '[^0-9.].*$','')} -Descending)
    if ($lumeCandidates.Count) { $lumeScanner = $lumeCandidates[0].FullName }
    elseif (Test-Path -LiteralPath (Join-Path $env:ProgramFiles 'Windows Defender/MpCmdRun.exe')) { $lumeScanner = Join-Path $env:ProgramFiles 'Windows Defender/MpCmdRun.exe' }
  }
  if ($lumeScanner) {
    & $lumeScanner -SignatureUpdate *> (Join-Path $lumeReports 'defender-update.txt')
    if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel atualizar a inteligencia do Defender; varredura inconclusiva.' }
    $lumeReport.defenderStatus = Get-MpComputerStatus | Select-Object AMProductVersion,AMEngineVersion,AMServiceEnabled,AntivirusEnabled,RealTimeProtectionEnabled,AntivirusSignatureVersion,AntivirusSignatureLastUpdated
    $lumeReport.defenderVerdict = 'no-threats-reported'
    $lumeScanIndex = 0
    foreach ($lumeFile in $lumeFiles) {
      $lumeScanIndex++
      $lumeScanOutput = (& $lumeScanner -Scan -ScanType 3 -File $lumeFile.FullName -DisableRemediation 2>&1 | Out-String)
      $lumeScanExit = $LASTEXITCODE
      $lumeLogName = 'scan-{0:d2}.txt' -f $lumeScanIndex
      $lumeScanOutput | Set-Content -LiteralPath (Join-Path $lumeReports $lumeLogName)
      $lumeDetected = $lumeScanOutput -match '(?im)^\s*Threat\s*:|found [1-9][0-9]* threats?'
      if ($lumeDetected) { $lumeReport.defenderVerdict = 'detected' }
      elseif (($lumeScanExit -ne 0 -or ($ReleaseCandidate -and $lumeScanOutput -notmatch 'found no threats')) -and $lumeReport.defenderVerdict -ne 'detected') { $lumeReport.defenderVerdict = 'scan-error' }
      $lumeReport.scans += [ordered]@{path=[IO.Path]::GetRelativePath($lumeBase,$lumeFile.FullName);exitCode=$lumeScanExit;log=$lumeLogName}
    }
    if ($lumeReport.defenderVerdict -ne 'no-threats-reported') { throw 'Defender detectou uma ameaca ou falhou. Amostras nao serao anexadas.' }
  } else {
    if ($ReleaseCandidate) { throw 'Defender indisponivel: nenhum candidato a release sera gerado.' }
    $lumeReport.errors += 'Defender indisponivel na imagem do GitHub. Isto nao representa um resultado limpo. Analise local obrigatoria antes de qualquer execucao.'
    Write-Warning $lumeReport.errors[-1]
  }
  if ($ReleaseCandidate) {
    $lumeCandidateFolder = Join-Path $lumeBase 'release-candidate'
    $lumeReport | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $lumeReports 'diagnostic.json')
    & node (Join-Path $PSScriptRoot 'release-candidate.mjs') create $lumeRelease (Join-Path $lumeReports 'diagnostic.json') $lumeCandidateFolder
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar o candidato privado.' }
    $lumeReady = $true
  } else {
  # Only these two samples are attached, in the private repository. Never upload the source tree or keys.
  $lumePrivate = Join-Path $lumeBase 'private-binaries'
  [IO.Directory]::CreateDirectory($lumePrivate) | Out-Null
  Copy-Item -LiteralPath $lumeInstaller.FullName -Destination (Join-Path $lumePrivate 'Lume-DIAGNOSTIC-DO-NOT-INSTALL-setup.exe')
  Copy-Item -LiteralPath $lumePayload.FullName -Destination (Join-Path $lumePrivate 'lume-notes.exe')
  "DIAGNOSTICO PRIVADO. NAO INSTALAR NEM EXECUTAR. Defender: $($lumeReport.defenderVerdict). Consulte o relatorio e mantenha a versao 0.9.0 bloqueada. A ausencia de deteccoes nao comprova ausencia de malware." | Set-Content (Join-Path $lumePrivate 'WARNING.txt')
  if ((Get-FileHash -LiteralPath (Join-Path $lumePrivate 'lume-notes.exe')).Hash.ToLowerInvariant() -cne $lumePayloadHash -or (Get-FileHash -LiteralPath (Join-Path $lumePrivate 'Lume-DIAGNOSTIC-DO-NOT-INSTALL-setup.exe')).Hash.ToLowerInvariant() -cne $lumeInstallerHash) { throw 'As amostras anexadas nao correspondem aos hashes examinados.' }
  $lumeReady = $true
  }
} catch {
  if ($lumeReport.defenderVerdict -ne 'detected') { $lumeReport.defenderVerdict = 'error' }
  $lumeReport.errors += $_.Exception.Message
  throw
} finally {
  $lumeReport | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $lumeReports 'diagnostic.json')
  @('Diagnostico do Lume (sem publicacao)',"Commit: $env:GITHUB_SHA","Conteudo conferido: $($lumeReport.contentsVerified)","Defender: $($lumeReport.defenderVerdict)",'Amostras somente para analise. Nao instalar. A versao 0.9.0 continua bloqueada.') | Add-Content -LiteralPath $env:GITHUB_STEP_SUMMARY
  "artifacts_ready=$($lumeReady.ToString().ToLowerInvariant())" | Add-Content -LiteralPath $env:GITHUB_OUTPUT
  if ($ReleaseCandidate) { 'Candidato privado: exige assinatura e verificacao local antes da publicacao. Nenhuma chave privada foi utilizada no CI.' | Add-Content -LiteralPath $env:GITHUB_STEP_SUMMARY }
}
