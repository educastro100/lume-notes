$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'release-process.ps1')
$lumeTestPowerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
function Invoke-LumeFakeCredential {
 param([string]$Code, [string]$InputText, [int]$TimeoutSeconds = 10)
 $lumeEncoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($Code))
 Invoke-LumeReleaseProcess -FilePath $lumeTestPowerShell -Arguments "-NoProfile -NonInteractive -EncodedCommand $lumeEncoded" -InputText $InputText -TimeoutSeconds $TimeoutSeconds
}
# The fixture must see EOF; no real credential manager or credential store is used.
$lumeActual = Invoke-LumeFakeCredential -Code '$value = [Console]::In.ReadToEnd(); [Console]::Out.Write($value)' -InputText "fixture`n`n"
if ($lumeActual -cne "fixture`n`n") {throw 'Redirected input/output or stdin closure failed.'}
Write-Host 'PASS: stdin closes and output is returned without alteration.'

$lumeFailed = $false
try {
 $null = Invoke-LumeFakeCredential -Code '[Console]::Error.Write("fake-secret-do-not-echo"); exit 7'
} catch {
 $lumeFailed = $true
 if ($_.Exception.Message -like '*fake-secret-do-not-echo*') {throw 'Child stderr leaked.'}
 if ($_.Exception.Message -notlike '*gerenciador de credenciais falhou*') {throw}
}
if (-not $lumeFailed) {throw 'Nonzero exit was accepted.'}
Write-Host 'PASS: failed process is rejected without leaking stderr.'

$lumeTimer = [Diagnostics.Stopwatch]::StartNew()
$lumeTimedOut = $false
try {
 $null = Invoke-LumeFakeCredential -Code 'Start-Sleep -Seconds 30' -TimeoutSeconds 2
} catch {
 $lumeTimedOut = $true
 if ($_.Exception.Message -notlike '*nao respondeu em 2 segundos*') {throw}
}
if (-not $lumeTimedOut -or $lumeTimer.Elapsed.TotalSeconds -gt 10) {throw 'Process timeout was not enforced.'}
Write-Host 'PASS: unresponsive process is stopped within the configured deadline.'
