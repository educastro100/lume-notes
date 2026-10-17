# Keep credential output in memory and never include child stderr in an error.
function Invoke-LumeReleaseProcess {
 param(
  [Parameter(Mandatory=$true)][string]$FilePath,
  [string]$Arguments = 'get',
  [string]$InputText,
  [int]$TimeoutSeconds = 45
 )
 $lumeProcess = [Diagnostics.Process]::new()
 $lumeProcess.StartInfo.FileName = $FilePath
 $lumeProcess.StartInfo.Arguments = $Arguments
 $lumeProcess.StartInfo.UseShellExecute = $false
 $lumeProcess.StartInfo.CreateNoWindow = $true
 $lumeProcess.StartInfo.RedirectStandardInput = $true
 $lumeProcess.StartInfo.RedirectStandardOutput = $true
 $lumeProcess.StartInfo.RedirectStandardError = $true
 $lumeTimer = [Diagnostics.Stopwatch]::StartNew()
 $lumeStarted = $false
 $lumeNextProgress = 10
 try {
  $lumeStarted = $lumeProcess.Start()
  $lumeOutputTask = $lumeProcess.StandardOutput.ReadToEndAsync()
  $lumeErrorTask = $lumeProcess.StandardError.ReadToEndAsync()
  $lumeProcess.StandardInput.Write($InputText)
  $lumeProcess.StandardInput.Close()
  while (-not ($lumeProcess.HasExited -and $lumeOutputTask.IsCompleted -and $lumeErrorTask.IsCompleted)) {
   if ($lumeTimer.Elapsed.TotalSeconds -ge $TimeoutSeconds) {
    throw "Autenticacao nao respondeu em $TimeoutSeconds segundos. Nenhum token foi exibido. Verifique sua autenticacao do Git no terminal normal do Windows."
   }
   if ($lumeTimer.Elapsed.TotalSeconds -ge $lumeNextProgress) {
    Write-Host "Aguardando autenticacao GitHub... ($([int]$lumeTimer.Elapsed.TotalSeconds)s)"
    $lumeNextProgress += 10
   }
   Start-Sleep -Milliseconds 200
  }
  if ($lumeProcess.ExitCode -ne 0) {
   throw 'O gerenciador de credenciais falhou. Verifique sua autenticacao do Git no terminal normal do Windows.'
  }
  return $lumeOutputTask.GetAwaiter().GetResult()
 } finally {
  if ($lumeStarted -and -not $lumeProcess.HasExited) {$lumeProcess.Kill()}
  $lumeProcess.Dispose()
  $lumeOutputTask = $null
  $lumeErrorTask = $null
 }
}
