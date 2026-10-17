function Assert-LumeHostedCheck {
  param([hashtable]$Context)
  if ($Context.Actions -cne 'true' -or $Context.Runner -cne 'github-hosted' -or
      $Context.OS -cne 'Windows' -or $Context.Repository -cne 'educastro100/lume-notes') {
    throw 'Teste de instalacao permitido somente no runner Windows hospedado pelo GitHub deste repositorio.'
  }
}

function Assert-LumeProtection {
  param($Status)
  foreach ($name in @('AMServiceEnabled', 'AntivirusEnabled', 'RealTimeProtectionEnabled', 'BehaviorMonitorEnabled', 'OnAccessProtectionEnabled')) {
    if ($Status.$name -isnot [bool] -or -not $Status.$name) {
      throw "Protecao indisponivel: $name. Teste inconclusivo; nenhum resultado limpo pode ser anunciado."
    }
  }
}

function Assert-LumeTemporaryPath {
  param([string]$Path, [string]$TemporaryRoot)
  if (-not [IO.Path]::IsPathRooted($Path) -or -not [IO.Path]::IsPathRooted($TemporaryRoot)) {
    throw 'O teste exige caminhos absolutos.'
  }
  $root = [IO.Path]::GetFullPath($TemporaryRoot).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
  $resolved = [IO.Path]::GetFullPath($Path)
  if (-not $resolved.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'A instalacao de teste deve ficar dentro de RUNNER_TEMP.'
  }
}

function Invoke-LumeDiagnosticProcess {
  param(
    [Parameter(Mandatory=$true)][string]$FilePath,
    [Parameter(Mandatory=$true)][string]$Arguments,
    [Parameter(Mandatory=$true)][string]$LogPath,
    [ValidateRange(1,180)][int]$TimeoutSeconds=120
  )
  $process=[Diagnostics.Process]::new()
  $process.StartInfo=[Diagnostics.ProcessStartInfo]::new()
  $process.StartInfo.FileName=$FilePath
  $process.StartInfo.Arguments=$Arguments
  $process.StartInfo.UseShellExecute=$false
  $process.StartInfo.CreateNoWindow=$true
  $process.StartInfo.WindowStyle=[Diagnostics.ProcessWindowStyle]::Hidden
  $process.StartInfo.RedirectStandardOutput=$true
  $process.StartInfo.RedirectStandardError=$true
  $started=$false; $exitCode=$null; $stdout=$null; $stderr=$null
  $timer=[Diagnostics.Stopwatch]::StartNew()
  $nextProgress=10
  try {
    $started=$process.Start()
    if (-not $started) { throw 'Nao foi possivel iniciar o processo de diagnostico.' }
    $stdout=$process.StandardOutput.ReadToEndAsync()
    $stderr=$process.StandardError.ReadToEndAsync()
    while (-not $process.WaitForExit(200)) {
      if ($timer.Elapsed.TotalSeconds -ge $TimeoutSeconds) { throw "Processo de diagnostico excedeu $TimeoutSeconds segundos. Consulte o log de atualizacao." }
      if ($timer.Elapsed.TotalSeconds -ge $nextProgress) {
        Write-Host "Aguardando atualizacao das definicoes... ($([int]$timer.Elapsed.TotalSeconds)s; limite: ${TimeoutSeconds}s)"
        $nextProgress+=10
      }
    }
    $exitCode=$process.ExitCode
    if ($exitCode -ne 0) { throw "Atualizacao das definicoes falhou com codigo $exitCode. Consulte o log de atualizacao." }
    return [pscustomobject]@{ exitCode=$exitCode; elapsedSeconds=[int]$timer.Elapsed.TotalSeconds }
  } finally {
    if ($started -and -not $process.HasExited) {
      $process.Kill()
      $null=$process.WaitForExit(5000)
    }
    if ($stdout -and $stderr) {
      # Bound stream draining too: inherited pipe handles must not hang the job.
      try { $null=[Threading.Tasks.Task]::WaitAll([Threading.Tasks.Task[]]@($stdout,$stderr),1000) } catch {}
    }
    $outText=if ($stdout -and $stdout.Status -eq 'RanToCompletion') {$stdout.Result} else {'[stdout unavailable]'}
    $errText=if ($stderr -and $stderr.Status -eq 'RanToCompletion') {$stderr.Result} else {'[stderr unavailable]'}
    [IO.File]::WriteAllText($LogPath,"exitCode=$exitCode`nelapsedSeconds=$([int]$timer.Elapsed.TotalSeconds)`nSTDOUT:`n$outText`nSTDERR:`n$errText",[Text.UTF8Encoding]::new($false))
    $process.Dispose()
  }
}
