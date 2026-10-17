$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'release-payload.ps1')
$lumeFixturePath = Join-Path ([IO.Path]::GetTempPath()) ("lume-[payload]-" + [Guid]::NewGuid().ToString('N') + '.md')
try {
 # Include Unicode and JSON escapes without requiring a UTF-8 BOM in PS 5.1.
 $lumeExpected = '# Lume ' + [char]0x00E7 + [char]0x00E3 + [char]0x1F + "`r`n" + 'A "quoted" path C:\Lume\notes.md'
 [IO.File]::WriteAllText($lumeFixturePath, $lumeExpected, [Text.Encoding]::UTF8)
 $lumeTimer = [Diagnostics.Stopwatch]::StartNew()
 $lumeBody = New-LumeReleaseDraftBody -Version '0.9.1' -NotesPath $lumeFixturePath
 $lumeSerialized = $lumeBody | ConvertTo-Json -Depth 12
 $lumeResult = $lumeSerialized | ConvertFrom-Json
 if ($lumeResult.body -isnot [string] -or $lumeResult.body -cne $lumeExpected) {throw 'Notes must round-trip as a plain JSON string.'}
 if (@($lumeResult.PSObject.Properties).Count -ne 5 -or $lumeResult.tag_name -cne 'v0.9.1' -or $lumeResult.name -cne 'Lume Notes 0.9.1' -or $lumeResult.draft -ne $true -or $lumeResult.prerelease -ne $false) {throw 'Draft release fields changed.'}
 if ($lumeSerialized -match 'PSProvider|PSDrive|PSParentPath|PSChildName' -or $lumeSerialized.Length -gt 1000) {throw 'File metadata leaked into the release request.'}
 if ($lumeTimer.Elapsed.TotalSeconds -gt 5) {throw 'Release JSON preparation is unexpectedly slow.'}
 Write-Host 'PASS: notes serialize quickly as a plain JSON string with Unicode, escapes and a literal bracket path.'
 $lumeMissingRejected = $false
 try {$null = New-LumeReleaseDraftBody -Version '0.9.1' -NotesPath ($lumeFixturePath + '.missing')}
 catch {$lumeMissingRejected = $true}
 if (-not $lumeMissingRejected) {throw 'Missing release notes were accepted.'}
 Write-Host 'PASS: missing release notes fail before credentials or network requests.'
} finally {
 if (Test-Path -LiteralPath $lumeFixturePath) {Remove-Item -LiteralPath $lumeFixturePath}
}
