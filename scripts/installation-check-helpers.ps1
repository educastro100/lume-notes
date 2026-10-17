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
