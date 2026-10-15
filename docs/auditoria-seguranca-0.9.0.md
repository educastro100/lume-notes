# Auditoria do Lume 0.9.0 — 15/10/2026

**Situação: distribuição bloqueada. A detecção foi reproduzida. Não reinstalar nem publicar a versão 0.9.0.**

## Resultado principal

O Microsoft Defender identificou `Trojan:Win32/Bearfoos.A!ml` no executável `lume-notes.exe` contido no instalador. A análise descompactou o pacote sem executá-lo e a varredura do executável extraído retornou uma ameaça e código de saída 2. A amostra não foi instalada nem executada durante esta investigação.

- Instalador: `Lume-Notes-0.9.0-Windows-x64-setup.exe`, 2.539.098 bytes.
- SHA-256 do instalador: `5562cbc3133010fa7403408916863737d92f48df1950e75765862fa135044559`.
- SHA-256 do executável distribuído: `a98cb06b80530cecb77f052bf17f147b95307cd1c8f8b9ffc145dc326ad33483`.
- Executável distribuído: 5.757.952 bytes. O hash coincide com a cópia instalada no teste anterior.
- Ferramenta: Microsoft `MpCmdRun.exe`, plataforma `4.18.26090.9-0`.

Comando de análise utilizado: `-Scan -ScanType 3 -File <arquivo> -DisableRemediation`. Esse modo é uma varredura personalizada que relata detecções na saída, ignora exclusões e não aplica ações após detectar. Ele não desliga a proteção em tempo real. A proteção normal do Windows continuou ativa e posteriormente bloqueou a leitura da amostra extraída. Nenhuma exclusão ou restauração da quarentena foi feita.

Saída relevante:

```text
found 1 threats.
Threat : Trojan:Win32/Bearfoos.A!ml
Exact payload scan exit: 2
```

## Por que os testes anteriores não bastavam

A varredura direta do instalador compactado retornou ausência de ameaças. A varredura do executável de build antes da marcação do tipo de pacote também retornou ausência de ameaças. O executável efetivamente distribuído, extraído do instalador, foi detectado. Portanto, esses resultados negativos não liberam o pacote.

O executável de build e o distribuído diferem somente nos três bytes do marcador interno de tipo de pacote do Tauri (`UNK` / `NSS`). Essa diferença corresponde ao processamento normal do bundler NSIS; não foi modificada para contornar o antivírus. A comparação demonstra que os testes consultavam artefatos diferentes, mas não estabelece a causa da classificação do Defender.

Assinatura de atualização válida, testes funcionais e ausência de Authenticode são fatos distintos. A assinatura do atualizador não é uma certificação antimalware. O instalador está sem assinatura Windows Authenticode; isso, isoladamente, não explica uma classificação de Trojan. A validação anterior ficou incompleta ao não verificar a amostra final extraída.

## Fontes e instalação examinados

A revisão estática dos arquivos `src-tauri/src/main.rs`, `src-tauri/src/open_with.rs`, `src-tauri/windows/hooks.nsh`, configurações/capabilities, `scripts/build-release.ps1`, `scripts/publish-release.ps1` e updater frontend não encontrou comportamento malicioso concreto.

- Os hooks registram o Lume em HKCU para Abrir com e aplicativos padrão; não criam serviço, tarefa agendada ou inicialização automática, nem alteram o Defender.
- Aberturas externas no código próprio usam URIs fixas das configurações de aplicativos padrão e releases do projeto.
- O instalador gerado inclui o aplicativo, WebView2Loader e os plugins NSIS esperados. O template prevê baixar o bootstrapper WebView2 de `go.microsoft.com` se necessário; não há download de scripts de terceiros no hook próprio.
- O script de publicação acessa o Git Credential Manager somente para a publicação de desenvolvedor. Ele não é instalado com o Lume. Nenhuma credencial ou chave foi lida nesta auditoria.
- Os pacotes npm resolvidos no lock usam `registry.npmjs.org`, com integrity; Cargo.lock usa crates.io. Isso não equivale a auditar todos os fontes das dependências.

## Conteúdo do pacote e ferramentas

A análise do fluxo NSIS/LZMA identificou onze blocos de dados, sem bytes restantes no fluxo descompactado. Os executáveis/DLLs encontrados correspondem ao Lume, WebView2Loader e plugins `System`, `nsDialogs`, `nsis_tauri_utils`, `StartMenu`, `LangDLL` e `NSISdl`. Os hashes dos plugins coincidem com o cache utilizado; WebView2Loader tem assinatura Authenticode válida da Microsoft.

Foi baixado, somente para comparação e sem executar, o pacote NSIS oficial apontado pelo Tauri CLI 2.12.3. O SHA-1 corresponde ao valor fixado no código dessa versão; o SHA-256 observado foi `ba63dffc4410ee89193e1cb5a41989991bd77c61068da17e3156d136b7b0b3d8`. O plugin adicional Tauri também corresponde ao hash fixado.

439 arquivos do cache NSIS coincidem com esse pacote oficial. As duas diferenças são `makensis.exe` e `Bin/makensis.exe`: o compilador foi recompilado em x64 e recebeu um lançador local para funcionar neste ambiente, que não conseguia iniciar o compilador x86 original. A seção de código `.text` do instalador gerado coincide com o stub NSIS oficial. Essas comparações reduzem uma lacuna de procedência, mas não demonstram ausência de comprometimento de toda a cadeia de compilação.

Evidências locais adicionais: `work/qa/lume-nsis-payload-audit.json`, `work/qa/lume-supply-chain-audit.json` no workspace de desenvolvimento original. REA: recursos PE `ev_84b70fb36624261bf51638dcc165224e6a8e1afdf69c2a615ee8a6b02fb2bd68`; metadados Rust do build `ev_d361e2cabfa7be7b6b8b163323131db4303f0f55a09f4ef76fd9a96d5f2a1db2`. A inspeção de recursos/metadados não é uma análise completa de comportamento.

## Contenção e pendências

A publicação foi bloqueada antes de executar o verificador local ou acessar credenciais. A política versionada `scripts/release-security-holds.json` bloqueia 0.9.0 mesmo em outro checkout; há também um marcador local no diretório de releases. A consulta pública à API do repositório de instaladores retornou `[]`: nenhuma release pública estava disponível no momento da verificação.

O histórico original do Defender não ficou acessível ao ambiente (CIM/eventos negados). O nome acima foi obtido pela reprodução com a amostra do instalador. Não foram analisados todos os fontes das dependências nem feito exame forense completo do computador. Não é possível concluir ainda se é falso positivo ou comprometimento real.

Próximas etapas para resolver: análise da amostra exata pela Microsoft; comparação com uma compilação em ambiente Windows limpo, com MSVC e ferramentas NSIS oficiais; e verificação antimalware do executável final extraído, DLLs, desinstalador e instalador antes de qualquer distribuição. Uma recompilação ou assinatura por si só não resolve a detecção. Não renomear, alterar marcadores ou enfraquecer proteções para fazê-la desaparecer.

O script opcional `scripts/collect-defender-report.ps1` coleta apenas histórico local relacionado a Lume/NSIS e registra falhas de acesso. Os relatórios ficam em `security-reports/`, ignorado pelo Git. Ele não restaura arquivos, altera proteção ou envia dados. A coleta original pode ajudar no caso da Microsoft, mas o nome da detecção já foi reproduzido.

Referências oficiais: [envio para análise da Microsoft](https://www.microsoft.com/en-us/wdsi/filesubmission), [opções do MpCmdRun](https://learn.microsoft.com/en-us/defender-endpoint/command-line-arguments-microsoft-defender-antivirus), [NSIS no Tauri CLI 2.12.3](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.12.3/crates/tauri-bundler/src/bundle/windows/nsis/mod.rs).
