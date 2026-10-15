param(
 [string]$Target,
 [string]$KeyFile = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Codex\Lume Signing\lume-notes.key')
)
$ErrorActionPreference = 'Stop'
$lumeProject = Split-Path $PSScriptRoot -Parent
$lumeOldKey = $env:TAURI_SIGNING_PRIVATE_KEY
if (-not $env:TAURI_SIGNING_PRIVATE_KEY) {
 if (-not (Test-Path -LiteralPath $KeyFile -PathType Leaf)) {throw 'Chave de assinatura ausente. Consulte docs/distribuicao.md. Não gere outra chave para um aplicativo já distribuído.'}
 $env:TAURI_SIGNING_PRIVATE_KEY = (Resolve-Path -LiteralPath $KeyFile).Path
}
Push-Location -LiteralPath $lumeProject
try {
 $lumeArguments = @('run','tauri','--','build','--bundles','nsis')
 if ($Target) {$lumeArguments += @('--target',$Target)}
 & npm.cmd @lumeArguments
 if ($LASTEXITCODE -ne 0) {throw 'Falha ao compilar o instalador.'}
 $lumeTargetDirectory = if ($env:CARGO_TARGET_DIR) {[IO.Path]::GetFullPath($env:CARGO_TARGET_DIR)} else {Join-Path $lumeProject 'src-tauri\target'}
 $lumeReleaseDirectory = if ($Target) {Join-Path $lumeTargetDirectory "$Target\release"} else {Join-Path $lumeTargetDirectory 'release'}
 & node (Join-Path $PSScriptRoot 'prepare-release.mjs') (Join-Path $lumeReleaseDirectory 'bundle\nsis')
 if ($LASTEXITCODE -ne 0) {throw 'Falha ao preparar os arquivos de publicação.'}
 $lumeVersion = (Get-Content -LiteralPath package.json -Raw -Encoding UTF8 | ConvertFrom-Json).version
 $lumeOutput = Join-Path $lumeProject "releases\$lumeVersion"
 $lumeVerifyArguments = @('run','--manifest-path','src-tauri/Cargo.toml','--example','verify-release','--release')
 if ($Target) {$lumeVerifyArguments += @('--target',$Target)}
 $lumeVerifyArguments += @('--',(Join-Path $lumeOutput 'latest.json'),(Join-Path $lumeOutput "Lume-Notes-$lumeVersion-Windows-x64-setup.exe"))
 & cargo @lumeVerifyArguments
 if ($LASTEXITCODE -ne 0) {throw 'O instalador não passou pela verificação criptográfica.'}
 Copy-Item -LiteralPath (Join-Path $lumeReleaseDirectory 'examples\verify-release.exe') -Destination (Join-Path $lumeOutput 'verify-release.exe')
 Write-Host "Instalador assinado e validado em $lumeOutput"
} finally {
 $env:TAURI_SIGNING_PRIVATE_KEY = $lumeOldKey
 Pop-Location
}
