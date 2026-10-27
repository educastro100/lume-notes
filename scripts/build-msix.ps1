param([Parameter(Mandatory=$true)][string]$Executable, [string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
$lumeRoot = Split-Path $PSScriptRoot -Parent
if (!$OutputDirectory) { $OutputDirectory = Join-Path $lumeRoot 'store-artifacts' }
$lumeExe = (Get-Item -LiteralPath $Executable).FullName
$lumeOutput = [IO.Path]::GetFullPath($OutputDirectory)
if ($env:VITE_LUME_DISTRIBUTION -cne 'microsoft-store') { throw 'Exige a compilacao especifica da Microsoft Store.' }
$lumeVersion = ([IO.File]::ReadAllText((Join-Path $lumeRoot 'package.json')) | ConvertFrom-Json).version
$lumeFileVersion = [Diagnostics.FileVersionInfo]::GetVersionInfo($lumeExe)
if ($lumeFileVersion.ProductVersion -notmatch ('^' + [regex]::Escape($lumeVersion) + '([.+-]|$)')) { throw 'O executavel nao corresponde a versao do projeto.' }
$lumeSdkRoot = Join-Path ([Environment]::GetFolderPath('ProgramFilesX86')) 'Windows Kits\10\bin'
$lumeSdk = Get-ChildItem -LiteralPath $lumeSdkRoot -Directory |
    Where-Object { $_.Name -match '^10\.0\.\d+\.\d+$' } |
    Sort-Object { [version]$_.Name } -Descending |
    Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'x64\makeappx.exe') } |
    Select-Object -First 1
if (!$lumeSdk) { throw 'MakeAppx x64 do Windows SDK nao encontrado.' }
$lumeMakeAppx = Join-Path $lumeSdk.FullName 'x64\makeappx.exe'
& node (Join-Path $PSScriptRoot 'prepare-msix.mjs') $lumeRoot $lumeExe $lumeOutput
if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar os arquivos do MSIX.' }
$lumeStage = Join-Path $lumeOutput 'stage'
$lumePackage = Join-Path $lumeOutput "Lume-Notes-$lumeVersion-Windows-x64-store.msix"
if (Test-Path -LiteralPath $lumePackage) { throw 'O pacote ja existe; escolha outra pasta de saida.' }
# Keep schema validation enabled: do not use /nv. Store signs after certification.
& $lumeMakeAppx pack /d $lumeStage /p $lumePackage
if ($LASTEXITCODE -ne 0) { throw 'MakeAppx rejeitou o pacote ou o manifesto.' }
$lumeExtract = Join-Path $lumeOutput 'unpacked-verification'
& $lumeMakeAppx unpack /p $lumePackage /d $lumeExtract
if ($LASTEXITCODE -ne 0) { throw 'Falha ao conferir o pacote MSIX final.' }
$lumeReport = [IO.File]::ReadAllText((Join-Path $lumeOutput 'msix-staging.json')) | ConvertFrom-Json
foreach ($lumeEntry in $lumeReport.files.PSObject.Properties) {
    $lumeExtractedFile = Join-Path $lumeExtract $lumeEntry.Name
    if (!(Test-Path -LiteralPath $lumeExtractedFile -PathType Leaf)) { throw "Arquivo ausente no pacote: $($lumeEntry.Name)" }
    if ((Get-FileHash -LiteralPath $lumeExtractedFile -Algorithm SHA256).Hash.ToLowerInvariant() -cne $lumeEntry.Value.sha256) { throw "Conteudo do pacote diverge: $($lumeEntry.Name)" }
}
$lumeDeliver = Join-Path $lumeOutput 'submission'
[IO.Directory]::CreateDirectory($lumeDeliver) | Out-Null
Copy-Item -LiteralPath $lumePackage -Destination $lumeDeliver
Copy-Item -LiteralPath (Join-Path $lumeOutput 'msix-staging.json') -Destination $lumeDeliver
$lumeHash = (Get-FileHash -LiteralPath $lumePackage -Algorithm SHA256).Hash.ToLowerInvariant()
"$lumeHash  $([IO.Path]::GetFileName($lumePackage))" | Set-Content -LiteralPath (Join-Path $lumeDeliver 'SHA256SUMS.txt') -Encoding utf8
@"
Lume Notes $lumeVersion - MSIX sem assinatura local, para submissao a Microsoft Store.
Enviar SOMENTE o .msix em Partner Center > Lume Notes > Submissao > Pacotes.
Nao instalar por duplo clique nem adicionar certificado autoassinado.
A Microsoft assina depois da certificacao. Este artefato nao comprova aprovacao.
MakeAppx: $($lumeSdk.Name); estrutura e arquivos extraidos conferidos.
Instalacao, Abrir com e recuperacao de dados na edicao Store ainda precisam ser validados.
"@ | Set-Content -LiteralPath (Join-Path $lumeDeliver 'LEIA-ME.txt') -Encoding utf8
Write-Output "Pacote preparado para envio: $lumePackage"
if ($env:GITHUB_STEP_SUMMARY) {
    @("Lume Notes $lumeVersion - MSIX para Microsoft Store", "Identity: $($lumeReport.identity.name)", "Publisher: $($lumeReport.identity.publisher)", "MakeAppx e conteudo extraido: conferidos", "SHA256: $lumeHash", 'Sem assinatura local, instalacao ou publicacao automatica. Aguardando certificacao da Store.') | Add-Content -LiteralPath $env:GITHUB_STEP_SUMMARY
}