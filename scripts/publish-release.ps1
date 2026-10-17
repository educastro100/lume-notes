param([string]$Version, [switch]$PrepareOnly)
$ErrorActionPreference = 'Stop'
$lumeProject = Split-Path $PSScriptRoot -Parent
if (-not $Version) {$Version = (Get-Content -LiteralPath (Join-Path $lumeProject 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version}
if ($Version -notmatch '^\d+\.\d+\.\d+$') {throw 'Versão inválida. Use X.Y.Z.'}
$lumeRepo = 'educastro100/lume-notes-releases'
$lumeFolder = Join-Path $lumeProject "releases\$Version"
$lumeSecurityPolicy = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'release-security-holds.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$lumeBlockedVersion = $lumeSecurityPolicy.PSObject.Properties[$Version]
if ($lumeBlockedVersion -and $lumeBlockedVersion.Value.status -eq 'blocked') {
 throw ('Publicação suspensa: ' + $lumeBlockedVersion.Value.reason + ' Consulte ' + $lumeBlockedVersion.Value.report)
}
$lumeSecurityHold = Join-Path $lumeFolder 'SECURITY-HOLD.txt'
if (Test-Path -LiteralPath $lumeSecurityHold) {
 throw 'Publicação suspensa: esta versão está sob investigação de um alerta antivírus. Consulte docs/auditoria-seguranca-0.9.0.md. Nenhum binário foi executado e nenhum dado foi enviado.'
}
$lumeInstaller = "Lume-Notes-$Version-Windows-x64-setup.exe"
# An explicit allowlist prevents accidentally publishing source code, keys or notes.
$lumeAssets = @($lumeInstaller, "$lumeInstaller.sig", 'latest.json', 'SHA256SUMS.txt')
$lumeFiles = @{}
foreach ($lumeName in $lumeAssets) {
 $lumeFile = Get-Item -LiteralPath (Join-Path $lumeFolder $lumeName)
 if ($lumeFile.PSIsContainer -or ($lumeFile.Attributes -band [IO.FileAttributes]::ReparsePoint)) {throw "Arquivo de publicação inválido: $lumeName"}
 $lumeFiles[$lumeName] = $lumeFile
}
$lumeManifest = Get-Content -LiteralPath $lumeFiles['latest.json'].FullName -Raw -Encoding UTF8 | ConvertFrom-Json
$lumeExpectedUrl = "https://github.com/$lumeRepo/releases/download/v$Version/$lumeInstaller"
if ($lumeManifest.version -ne $Version -or $lumeManifest.platforms.'windows-x86_64'.url -ne $lumeExpectedUrl) {throw 'O manifesto não corresponde a esta versão ou ao canal público.'}
$lumeSignature = (Get-Content -LiteralPath $lumeFiles["$lumeInstaller.sig"].FullName -Raw).Trim()
if ($lumeManifest.platforms.'windows-x86_64'.signature -cne $lumeSignature) {throw 'A assinatura do manifesto não corresponde ao pacote.'}
$lumeComment = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($lumeSignature)).Split("`n") | Where-Object {$_ -like 'trusted comment:*'}
if (-not ($lumeComment.Split("`t") -ccontains "version:$Version")) {throw 'A assinatura não está vinculada à versão anunciada.'}
foreach ($lumeLine in (Get-Content -LiteralPath $lumeFiles['SHA256SUMS.txt'].FullName)) {
 if ($lumeLine -notmatch '^([a-f0-9]{64})  (.+)$') {throw 'Arquivo de hashes inválido.'}
 $lumeDigest=$Matches[1];$lumeName=$Matches[2]
 if ($lumeName -notin @($lumeInstaller,"$lumeInstaller.sig",'latest.json')) {throw 'Nome não permitido no arquivo de hashes.'}
 if ((Get-FileHash -LiteralPath $lumeFiles[$lumeName].FullName -Algorithm SHA256).Hash.ToLowerInvariant() -cne $lumeDigest) {throw "Hash incorreto: $lumeName"}
}
Write-Host "Publicação preparada: $lumeRepo, versão $Version"
foreach ($lumeName in $lumeAssets) {Write-Host "  $lumeName ($($lumeFiles[$lumeName].Length) bytes)"}
$lumeVerifier=Join-Path $lumeFolder 'verify-release.exe'
if (-not (Test-Path -LiteralPath $lumeVerifier -PathType Leaf)) {throw 'Verificador local ausente. Execute o build completo antes de publicar.'}
& $lumeVerifier $lumeFiles['latest.json'].FullName $lumeFiles[$lumeInstaller].FullName
if ($LASTEXITCODE -ne 0) {throw 'Não foi possível validar o pacote com o verificador local. Nenhum dado foi enviado.'}
if ($PrepareOnly) {Write-Host 'Verificação local concluída. Nenhum dado enviado.';return}

# Publishing requires the record produced after CI checks, local scans and signature verification.
& node (Join-Path $PSScriptRoot 'release-candidate.mjs') publication $lumeFolder $Version
if ($LASTEXITCODE -ne 0) {throw 'Evidencia de release ausente ou divergente. Use scripts/finish-release.ps1 antes de publicar. Nenhuma credencial foi acessada.'}

. (Join-Path $PSScriptRoot 'release-payload.ps1')
$lumeDraftBody = New-LumeReleaseDraftBody -Version $Version -NotesPath (Join-Path $lumeFolder 'RELEASE-NOTES.md')

# Retrieve the existing GitHub credential directly, without printing or persisting it.
. (Join-Path $PSScriptRoot 'release-process.ps1')
$lumeGit = (Get-Command git.exe).Source
$lumeManager = Join-Path (Split-Path (Split-Path $lumeGit -Parent) -Parent) 'mingw64\bin\git-credential-manager.exe'
if (-not (Test-Path -LiteralPath $lumeManager)) {
 $lumeManager = Join-Path $env:ProgramFiles 'Git\mingw64\bin\git-credential-manager.exe'
}
if (-not (Test-Path -LiteralPath $lumeManager)) {throw 'Instale o Git for Windows com Git Credential Manager e autentique sua conta GitHub antes de publicar.'}
$lumeOldInteractive=$env:GCM_INTERACTIVE
$env:GCM_INTERACTIVE='never'
try {
 Write-Host 'Lendo autenticacao GitHub (limite: 45 segundos)...'
 $lumeCredentialText = Invoke-LumeReleaseProcess -FilePath $lumeManager -InputText "protocol=https`nhost=github.com`nusername=educastro100`n`n"
 $lumeCredentialLines = $lumeCredentialText -split '\r?\n'
} finally {$env:GCM_INTERACTIVE=$lumeOldInteractive}
$lumeCredentials=@{}
foreach ($lumeLine in $lumeCredentialLines) {if ($lumeLine -match '^([^=]+)=(.*)$') {$lumeCredentials[$Matches[1]]=$Matches[2]}}
if (-not $lumeCredentials['password']) {throw 'Credencial GitHub indisponível. Autentique o Git no Windows e tente novamente.'}
Add-Type -AssemblyName System.Net.Http
$lumeClient=[Net.Http.HttpClient]::new()
$lumeClient.Timeout=[TimeSpan]::FromSeconds(120)
$lumeClient.DefaultRequestHeaders.UserAgent.ParseAdd('Lume-Release-Publisher/1.0')
$lumeClient.DefaultRequestHeaders.Authorization=[Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer',$lumeCredentials['password'])
$lumeClient.DefaultRequestHeaders.Add('X-GitHub-Api-Version','2022-11-28')
$lumeClient.DefaultRequestHeaders.Accept.ParseAdd('application/vnd.github+json')
$lumeCredentials.Clear();$lumeCredentialLines=$null;$lumeCredentialText=$null;$lumeLine=$null
Write-Host 'Autenticacao obtida. Conectando ao GitHub...'
function Invoke-LumeGitHub {
 param([string]$Method,[string]$Url,$Body,[IO.FileInfo]$File,[int[]]$Allow=@())
 $lumeRequest=[Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::new($Method),$Url)
 try {
  Write-Host "Preparando requisicao: $Method $Url"
  if ($File) {$lumeRequest.Content=[Net.Http.StreamContent]::new($File.OpenRead());$lumeRequest.Content.Headers.ContentType=[Net.Http.Headers.MediaTypeHeaderValue]::new('application/octet-stream')}
  elseif ($null -ne $Body) {$lumeRequest.Content=[Net.Http.StringContent]::new(($Body|ConvertTo-Json -Depth 12),[Text.Encoding]::UTF8,'application/json')}
  Write-Host "GitHub: $Method $Url"
  $lumePending=$lumeClient.SendAsync($lumeRequest)
  $lumeRequestTimer=[Diagnostics.Stopwatch]::StartNew()
  $lumeNextRequestProgress=10
  while (-not $lumePending.IsCompleted) {
   if ($lumeRequestTimer.Elapsed.TotalSeconds -ge $lumeNextRequestProgress) {
    Write-Host "Aguardando resposta do GitHub... ($([int]$lumeRequestTimer.Elapsed.TotalSeconds)s; limite: 120s)"
    $lumeNextRequestProgress+=10
   }
   Start-Sleep -Milliseconds 200
  }
  try {$lumeResponse=$lumePending.GetAwaiter().GetResult()}
  catch {throw 'A conexao com o GitHub falhou ou excedeu 120 segundos. Confira sua conexao e tente novamente; um rascunho parcial pode ser retomado.'}
  try {
   $lumeResponseText=$lumeResponse.Content.ReadAsStringAsync().GetAwaiter().GetResult()
   if (-not $lumeResponse.IsSuccessStatusCode) {
    if ([int]$lumeResponse.StatusCode -in $Allow) {return $null}
    throw "GitHub HTTP $([int]$lumeResponse.StatusCode). A operação não foi concluída. Verifique sua conta e tente novamente."
   }
   if ($lumeResponseText) {return $lumeResponseText|ConvertFrom-Json}
  } finally {$lumeResponse.Dispose()}
 } finally {$lumeRequest.Dispose()}
}
try {
 $lumeApi="https://api.github.com/repos/$lumeRepo"
 $lumeRepository=Invoke-LumeGitHub GET $lumeApi
 if ($lumeRepository.private -ne $false) {throw 'O canal de instaladores precisa ser público. Nenhuma visibilidade será alterada pelo script.'}
 $lumeCommits=Invoke-LumeGitHub GET "$lumeApi/commits?per_page=1" -Allow @(409)
 if ($null -eq $lumeCommits) {
  Write-Host 'Inicializando o canal publico de instaladores...'
  $lumeReadme="# Lume Notes`n`nCanal público de instaladores e atualizações do Lume Notes para Windows x64.`n`n[Baixar a versão mais recente](https://github.com/$lumeRepo/releases/latest)`n`nEste repositório contém somente os pacotes distribuíveis e seus metadados. O código-fonte é mantido em repositório privado.`n"
  $null=Invoke-LumeGitHub PUT "$lumeApi/contents/README.md" -Body @{message='Initialize public Lume release channel';content=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($lumeReadme))}
 }
 $lumeRelease=Invoke-LumeGitHub GET "$lumeApi/releases/tags/v$Version" -Allow @(404)
 if ($lumeRelease -and -not $lumeRelease.draft) {throw 'Esta versão já foi publicada. Use um número de versão novo; pacotes publicados não são substituídos.'}
 if (-not $lumeRelease) {
  Write-Host "Criando rascunho v$Version..."
  $lumeRelease=Invoke-LumeGitHub POST "$lumeApi/releases" -Body $lumeDraftBody
 }
 foreach ($lumeName in $lumeAssets) {
  $lumeExisting=@($lumeRelease.assets|Where-Object {$_.name -ceq $lumeName})
  if ($lumeExisting.Count) {
   $lumeHash='sha256:'+(Get-FileHash -LiteralPath $lumeFiles[$lumeName].FullName -Algorithm SHA256).Hash.ToLowerInvariant()
   if ($lumeExisting[0].digest -cne $lumeHash) {throw "O rascunho já contém outro arquivo chamado $lumeName. Nenhum arquivo remoto foi substituído."}
   Write-Host "Arquivo ja conferido no rascunho: $lumeName"
   continue
  }
  $lumeUpload=$lumeRelease.upload_url.Split('{')[0]+'?name='+[Uri]::EscapeDataString($lumeName)
  Write-Host "Enviando $lumeName ($($lumeFiles[$lumeName].Length) bytes)..."
  $null=Invoke-LumeGitHub POST $lumeUpload -File $lumeFiles[$lumeName]
  Write-Host "Enviado: $lumeName"
 }
 Write-Host 'Liberando a release publica...'
 $lumePublished=Invoke-LumeGitHub PATCH "$lumeApi/releases/$($lumeRelease.id)" -Body @{draft=$false;make_latest='true'}
 Write-Host "Publicado: $($lumePublished.html_url)"
} finally {$lumeClient.Dispose()}
