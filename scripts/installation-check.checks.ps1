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
