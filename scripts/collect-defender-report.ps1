param([string]$OutputPath)
$ErrorActionPreference = 'Stop'
$lumeProject = Split-Path $PSScriptRoot -Parent
if (-not $OutputPath) {
 $OutputPath = Join-Path $lumeProject ('security-reports\Defender-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.json')
}
$lumeReport = [ordered]@{
 generatedUtc = [DateTime]::UtcNow.ToString('o')
 scope = 'Somente leitura de eventos e detecções relacionados a Lume/NSIS nos últimos sete dias. Sem envio de dados ou alteração de proteção.'
 status = $null
 detections = @()
 threats = @()
 events = @()
 errors = @()
}
try {
 $lumeReport.status = Get-MpComputerStatus | Select-Object AMProductVersion,AMEngineVersion,AntivirusSignatureVersion,AntivirusSignatureLastUpdated
} catch {$lumeReport.errors += ('Status: ' + $_.Exception.Message)}
try {
 $lumeReport.detections = @(Get-MpThreatDetection | Where-Object {($_.Resources -join ' ') -match 'lume|nsis|makensis'} | Select-Object ThreatID,DetectionID,InitialDetectionTime,LastThreatStatusChangeTime,ActionSuccess,ThreatStatusID,ProcessName,Resources)
 $lumeIds = @($lumeReport.detections | ForEach-Object {$_.ThreatID})
 if ($lumeIds.Count) {$lumeReport.threats = @(Get-MpThreat | Where-Object {$_.ThreatID -in $lumeIds} | Select-Object ThreatID,ThreatName,SeverityID,CategoryID,IsActive,DidThreatExecute)}
} catch {$lumeReport.errors += ('Detecções: ' + $_.Exception.Message)}
try {
 $lumeReport.events = @(Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Windows Defender/Operational';Id=1116,1117;StartTime=(Get-Date).AddDays(-7)} -ErrorAction Stop | Where-Object {$_.Message -match 'lume|nsis|makensis'} | Select-Object TimeCreated,Id,Message)
} catch {$lumeReport.errors += ('Eventos: ' + $_.Exception.Message)}
$lumeReportDirectory = Split-Path ([IO.Path]::GetFullPath($OutputPath)) -Parent
[IO.Directory]::CreateDirectory($lumeReportDirectory) | Out-Null
$lumeReport | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath $OutputPath -Encoding UTF8
Write-Host "Relatório local: $OutputPath"
if ($lumeReport.errors.Count) {Write-Warning 'Parte do histórico não pôde ser lida. Os motivos estão no relatório; ausência de registros não significa ausência de ameaça.'}
