# This diagnostic is never a release approval and must never run on the user's PC.
param(
  [Parameter(Mandatory=$true)][ValidateSet('Prepare','Install')][string]$Phase,
  [Parameter(Mandatory=$true)][ValidateSet('0.9.1','0.10.0')][string]$Version
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'installation-check-helpers.ps1')
Assert-LumeHostedCheck @{ Actions=$env:GITHUB_ACTIONS; Runner=$env:RUNNER_ENVIRONMENT; OS=$env:RUNNER_OS; Repository=$env:GITHUB_REPOSITORY }
$lumeRoot = Split-Path $PSScriptRoot -Parent
$reports = Join-Path $lumeRoot 'diagnostics/reports'
[IO.Directory]::CreateDirectory($reports) | Out-Null
$reportName = if ($Phase -eq 'Prepare') {'protection-check.json'} else {'installed-check.json'}
$reportPath = Join-Path $reports $reportName
# Exact artifacts already published, not rebuilds that could produce new bytes.
$packages = @{
  '0.9.1'=@{ commit='084e1c8b9af4bfe82c834682022c26ef051e2ea5'; installer='0180f39cae0f49b101993dc0acbb1bcd9310a8986de270377b57a8499e3434bb'; payload='bebf80c948db39af7700e754daee248a05c9ab6b855f607b37cfd1d67ba93caa' }
  '0.10.0'=@{ commit='a47bc86ccb8b5ab0f8c28c0035c29411e6529a33'; installer='50f8bfcdfffd2114f7db98296636c6a93802637078a991d83fcd6ff100ed2041'; payload='e0ce3d5ad7557a8cc1ab6442d0ab419de2bd8dffbd53ddc60022912829030314' }
}
$package = $packages[$Version]
$report = [ordered]@{
  diagnosticOnly=$true; verdict='inconclusive'; phase=$Phase
  sourceCommit=$package.commit; version=$Version
  controllerCommit=$env:GITHUB_SHA; runId=$env:GITHUB_RUN_ID
  startedUtc=[DateTime]::UtcNow.ToString('o'); protectionBefore=$null; protectionAfter=$null
  cloudSettings=$null; stage='protection'; definitionsUpdate=$null; installer=$null; installed=$null
  windowObserved=$false; observedSeconds=0; events=@(); eventError=$null; error=$null
}
$appProcess = $null
$installerProcess = $null
$eventStart = Get-Date
function Get-LumeProtectionSnapshot {
  Get-MpComputerStatus -ErrorAction Stop | Select-Object AMProductVersion, AMEngineVersion, AMServiceEnabled, AntivirusEnabled, RealTimeProtectionEnabled, BehaviorMonitorEnabled, OnAccessProtectionEnabled, AntivirusSignatureVersion, AntivirusSignatureLastUpdated
}
try {
  $report.cloudSettings=Get-MpPreference -ErrorAction Stop | Select-Object MAPSReporting, SubmitSamplesConsent, DisableBlockAtFirstSeen
  if ($Phase -eq 'Prepare') {
    # Only strengthen the hosted runner's existing protection. No exclusions,
    # remediation changes, cloud sample settings or tamper-protection changes.
    Set-MpPreference -DisableRealtimeMonitoring $false -DisableBehaviorMonitoring $false -DisableIOAVProtection $false -ErrorAction Stop
    $deadline = [DateTime]::UtcNow.AddSeconds(45)
    do {
      try {
        $report.protectionBefore = Get-LumeProtectionSnapshot
        Assert-LumeProtection $report.protectionBefore
        break
      } catch {
        if ([DateTime]::UtcNow -ge $deadline) { throw }
        Start-Sleep -Seconds 2
      }
    } while ($true)
    # Enabling protection can restart the service. Wait for it before updating.
    # Use the same official CLI used by the earlier successful release workflows;
    # Update-MpSignature failed with RPC errors on this hosted image.
    $report.stage='definitions-update'
    $platform=Join-Path $env:ProgramData 'Microsoft/Windows Defender/Platform'
    $tools=@(Get-ChildItem -Path "$platform/*/MpCmdRun.exe" -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Directory.Name -match '^\d' } |
      Sort-Object { [version]($_.VersionInfo.FileVersion -replace '[^0-9.].*$','') } -Descending)
    $updater=if ($tools.Count) {$tools[0].FullName} else {Join-Path $env:ProgramFiles 'Windows Defender/MpCmdRun.exe'}
    if (-not (Test-Path -LiteralPath $updater -PathType Leaf)) { throw 'MpCmdRun oficial indisponivel; teste inconclusivo.' }
    $report.definitionsUpdate=Invoke-LumeDiagnosticProcess -FilePath $updater -Arguments '-SignatureUpdate' -LogPath (Join-Path $reports 'defender-update.txt') -TimeoutSeconds 120
    $report.protectionAfter=Get-LumeProtectionSnapshot
    Assert-LumeProtection $report.protectionAfter
    $report.stage='ready'
    $report.verdict='protection-ready'
    Write-Host 'Protecao em tempo real, comportamental e de acesso confirmada no runner.'
  } else {
    $report.protectionBefore = Get-LumeProtectionSnapshot
    Assert-LumeProtection $report.protectionBefore
    $installRoot = Join-Path $env:RUNNER_TEMP ('lume-installed-check-' + [Guid]::NewGuid().ToString('N'))
    Assert-LumeTemporaryPath $installRoot $env:RUNNER_TEMP
    if (Test-Path -LiteralPath $installRoot) { throw 'Pasta de teste ja existe.' }
    $downloadRoot = $installRoot + '-download'
    Assert-LumeTemporaryPath $downloadRoot $env:RUNNER_TEMP
    [IO.Directory]::CreateDirectory($downloadRoot) | Out-Null
    $installerName="Lume-Notes-$Version-Windows-x64-setup.exe"
    $installerPath=Join-Path $downloadRoot $installerName
    $report.stage='download'
    Invoke-WebRequest -Uri "https://github.com/educastro100/lume-notes-releases/releases/download/v$Version/$installerName" -OutFile $installerPath -TimeoutSec 120 -MaximumRedirection 5
    $installer=Get-Item -LiteralPath $installerPath
    $installerHash = (Get-FileHash -LiteralPath $installer.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($installerHash -cne $package.installer) { throw 'Hash do instalador publicado difere da evidencia local fixada.' }
    $report.installer=@{ sha256=$installerHash; bytes=$installer.Length; version=$Version }
    $report.stage='installation'
    # NSIS /D is intentionally last and unquoted, as specified by NSIS.
    $installerProcess = Start-Process -FilePath $installer.FullName -ArgumentList @('/S', "/D=$installRoot") -PassThru -WindowStyle Hidden
    if (-not $installerProcess.WaitForExit(180000)) { throw 'Instalacao nao concluiu em 180 segundos.' }
    if ($installerProcess.ExitCode -ne 0) { throw "Instalador retornou $($installerProcess.ExitCode)." }
    $executable = Join-Path $installRoot 'lume-notes.exe'
    if (-not (Test-Path -LiteralPath $executable -PathType Leaf)) { throw 'Aplicativo instalado ausente; verificar eventos de protecao.' }
    $installedHash = (Get-FileHash -LiteralPath $executable -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($installedHash -cne $package.payload) { throw 'Aplicativo instalado difere do payload examinado.' }
    $registered = (Get-ItemProperty -LiteralPath 'HKCU:\Software\LumeNotes\Install' -Name Executable -ErrorAction Stop).Executable
    if (-not $registered.Equals($executable, [StringComparison]::OrdinalIgnoreCase)) { throw 'Registro do instalador nao aponta ao aplicativo instalado.' }
    $report.installed=@{ path=$executable; sha256=$installedHash; version=[Diagnostics.FileVersionInfo]::GetVersionInfo($executable).ProductVersion }
    if ($report.installed.version -cne $Version) { throw 'Versao instalada divergente.' }
    $report.stage='startup'
    $startInfo = [Diagnostics.ProcessStartInfo]::new($executable)
    $startInfo.UseShellExecute=$false
    $startInfo.WorkingDirectory=$installRoot
    $startInfo.Environment['LUME_DATA_DIR'] = Join-Path $installRoot 'test-session'
    # The only GUI opened is the app under test on the disposable hosted runner.
    $appProcess = [Diagnostics.Process]::Start($startInfo)
    $timer = [Diagnostics.Stopwatch]::StartNew()
    while ($timer.Elapsed.TotalSeconds -lt 60) {
      Start-Sleep -Seconds 2
      $appProcess.Refresh()
      if ($appProcess.HasExited) { throw "Aplicativo encerrou durante o teste (codigo $($appProcess.ExitCode))." }
      if (-not (Test-Path -LiteralPath $executable -PathType Leaf)) { throw 'Executavel desapareceu durante o teste.' }
      if ($appProcess.MainWindowHandle -ne [IntPtr]::Zero) { $report.windowObserved=$true }
    }
    $report.observedSeconds=[int]$timer.Elapsed.TotalSeconds
    if (-not $report.windowObserved) { throw 'Nao foi possivel observar a janela; o runner pode nao oferecer uma sessao grafica utilizavel. Teste inconclusivo.' }
    $report.protectionAfter = Get-LumeProtectionSnapshot
    Assert-LumeProtection $report.protectionAfter
    if ((Get-FileHash -LiteralPath $executable -Algorithm SHA256).Hash.ToLowerInvariant() -cne $installedHash) { throw 'Aplicativo instalado mudou durante o teste.' }
    $report.verdict='startup-observed'
    Write-Host 'Instalacao e janela observadas por 60 segundos com protecao ativa. Diagnostico; nao libera uma release.'
  }
} catch {
  $report.error=$_.Exception.Message
  $report.verdict='inconclusive-or-failed'
  throw
} finally {
  foreach ($ownedProcess in @($appProcess,$installerProcess)) {
    if ($ownedProcess) {
      try { if (-not $ownedProcess.HasExited) { $ownedProcess.Kill($true); $ownedProcess.WaitForExit(10000) | Out-Null } } catch { Write-Warning 'Nao foi possivel encerrar um processo de teste no runner.' }
      $ownedProcess.Dispose()
    }
  }
  # Query readability separately: an empty event list is valid; access failure is not.
  try {
    $null = Get-WinEvent -ListLog 'Microsoft-Windows-Windows Defender/Operational' -ErrorAction Stop
    $events = @(Get-WinEvent -FilterHashtable @{ LogName='Microsoft-Windows-Windows Defender/Operational'; Id=1116,1117; StartTime=$eventStart } -ErrorAction SilentlyContinue)
    $report.events = @($events | Where-Object { $_.Message -match '(?i)lume-notes\.exe|Lume Notes|Lume-Notes' } | Select-Object TimeCreated, Id, Message)
    if ($report.events.Count) {
      $report.verdict='defender-event-observed'
      $report.error='Defender registrou deteccao ou remediacao relacionada ao Lume.'
    }
  } catch {
    $report.verdict='inconclusive-or-failed'
    $report.eventError='Historico de protecao indisponivel: ' + $_.Exception.Message
    if (-not $report.error) { $report.error=$report.eventError }
  }
  $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding utf8
  if ($env:GITHUB_STEP_SUMMARY) {
    @("Teste instalado ($($report.sourceCommit)): $($report.verdict)", "Fase: $Phase. Etapa: $($report.stage). Janela observada: $($report.windowObserved).", "Erro: $($report.error)", 'Diagnostico privado; nenhuma release foi assinada ou publicada.') | Add-Content -LiteralPath $env:GITHUB_STEP_SUMMARY
  }
}
if ($report.verdict -notin @('protection-ready','startup-observed')) { throw $report.error }
