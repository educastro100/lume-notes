function New-LumeReleaseDraftBody {
 param([string]$Version, [string]$NotesPath)
 # Windows PowerShell 5.1 serializes Get-Content's ETS properties (PSDrive,
 # PSProvider, etc.) along with strings. Read a plain CLR string instead.
 return @{
  tag_name = "v$Version"
  name = "Lume Notes $Version"
  draft = $true
  prerelease = $false
  body = [IO.File]::ReadAllText($NotesPath, [Text.Encoding]::UTF8)
 }
}
