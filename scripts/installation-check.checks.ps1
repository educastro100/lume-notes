$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'installation-check-helpers.ps1')
function Assert-Rejected {
  param([scriptblock]$Action)
  $rejected=$false
  try { & $Action } catch { $rejected=$true }
  if (-not $rejected) { throw 'Unsafe diagnostic input accepted.' }
}
$context=@{ Actions='true'; Runner='github-hosted'; OS='Windows'; Repository='educastro100/lume-notes' }
Assert-LumeHostedCheck $context
foreach ($key in @('Actions','Runner','OS','Repository')) {
  $invalid=$context.Clone(); $invalid[$key]='unexpected'
  Assert-Rejected { Assert-LumeHostedCheck $invalid }
}
Write-Host 'PASS: local machines, self-hosted runners and other repositories are rejected.'
$status=[pscustomobject]@{AMServiceEnabled=$true;AntivirusEnabled=$true;RealTimeProtectionEnabled=$true;BehaviorMonitorEnabled=$true;OnAccessProtectionEnabled=$true}
Assert-LumeProtection $status
foreach ($name in $status.PSObject.Properties.Name) {
  $invalid=$status.PSObject.Copy(); $invalid.$name=$false
  Assert-Rejected { Assert-LumeProtection $invalid }
}
Assert-Rejected { Assert-LumeProtection $null }
Assert-Rejected { Assert-LumeProtection ([pscustomobject]@{AMServiceEnabled='true'}) }
Write-Host 'PASS: disabled or unavailable protection cannot become a clean result.'
Assert-LumeTemporaryPath 'C:\runner\temp\Lume Notes' 'C:\runner\temp'
Assert-Rejected { Assert-LumeTemporaryPath 'C:\runner\temp-other\app' 'C:\runner\temp' }
Assert-Rejected { Assert-LumeTemporaryPath 'C:\runner\temp\..\user-app' 'C:\runner\temp' }
Assert-Rejected { Assert-LumeTemporaryPath 'C:\runner\temp' 'C:\runner\temp' }
Assert-Rejected { Assert-LumeTemporaryPath 'relative\app' 'C:\runner\temp' }
Write-Host 'PASS: install destinations must remain strictly inside the runner temporary directory.'
# The entry point must reject this PC before invoking any Defender cmdlet or installer.
if ($env:GITHUB_ACTIONS -ne 'true') {
  Assert-Rejected { & (Join-Path $PSScriptRoot 'check-installed-windows.ps1') -Phase Prepare -Version '0.10.0' }
  Assert-Rejected { & (Join-Path $PSScriptRoot 'check-installed-windows.ps1') -Phase Install -Version '0.10.0' }
  Write-Host 'PASS: diagnostic entry point refuses local execution.'
}

# Only a fixture PowerShell process is executed. Never call Defender in tests.
$fixturePowerShell=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$fixtureDirectory=Join-Path ([IO.Path]::GetTempPath()) ('lume-update-fixture-'+[Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($fixtureDirectory) | Out-Null
function Invoke-UpdateFixture {
  param([string]$Code,[string]$Log,[int]$Timeout=10)
  $encoded=[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($Code))
  Invoke-LumeDiagnosticProcess -FilePath $fixturePowerShell -Arguments "-NoProfile -NonInteractive -EncodedCommand $encoded" -LogPath $Log -TimeoutSeconds $Timeout
}
$successLog=Join-Path $fixtureDirectory 'success.txt'
$result=Invoke-UpdateFixture '[Console]::Out.Write("fixture-out"); [Console]::Error.Write("fixture-err"); exit 0' $successLog
$log=[IO.File]::ReadAllText($successLog)
if ($result.exitCode -ne 0 -or $log -notlike '*fixture-out*' -or $log -notlike '*fixture-err*') {throw 'Update process output or exit status lost.'}
$failureLog=Join-Path $fixtureDirectory 'failure.txt'
Assert-Rejected { Invoke-UpdateFixture '[Console]::Error.Write("fixture-rpc-failure"); exit 7' $failureLog }
if ([IO.File]::ReadAllText($failureLog) -notlike '*fixture-rpc-failure*') {throw 'Failed update log lost.'}
$timeoutLog=Join-Path $fixtureDirectory 'timeout.txt'
$timer=[Diagnostics.Stopwatch]::StartNew()
Assert-Rejected { Invoke-UpdateFixture 'Start-Sleep -Seconds 30' $timeoutLog 2 }
if ($timer.Elapsed.TotalSeconds -gt 10 -or -not (Test-Path -LiteralPath $timeoutLog)) {throw 'Update timeout or failure log missing.'}
Write-Host 'PASS: simulated update success, nonzero exit and timeout preserve logs and fail safely.'
# Delete only these fixture-owned regular files; no recursive filesystem operation.
foreach ($fixtureLog in @($successLog,$failureLog,$timeoutLog)) { [IO.File]::Delete($fixtureLog) }
[IO.Directory]::Delete($fixtureDirectory)
