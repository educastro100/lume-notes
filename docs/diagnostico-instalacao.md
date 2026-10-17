# Comparar as instalações 0.9.1 e 0.10.0 no GitHub Actions

O workflow manual **Comparar instalacao Windows** investiga o bloqueio observado depois da atualização para 0.10.0. Ele usa os instaladores exatos já publicados, com hashes fixados a partir dos candidatos verificados. Não recompila o aplicativo, não gera outra versão e não realiza submissão manual a um portal de análise. O Defender do runner utiliza proteção em nuvem e envio automático de amostras seguras; esses serviços podem analisar os binários públicos durante o teste.

Cada versão recebe um runner Windows 2022 hospedado pelo GitHub, separado e temporário. O script recusa execução local, runners próprios e outros repositórios. Não precisa de chave de assinatura, credenciais pessoais ou configuração de uma máquina virtual pelo desenvolvedor.

## Executar

Envie os scripts para `main` no repositório privado. Em Actions, execute **Comparar instalacao Windows**. A comparação tem dois jobs paralelos, um para cada versão, e não exige a compilação Rust das releases. As etapas têm limites de espera; cada job tem limite total de 15 minutos.

O teste:

1. Registra as exclusões do runner, remove somente as exclusões de unidade `C:\` e `D:\` configuradas no preparo oficial da imagem e rejeita quaisquer exclusões restantes de caminho, extensão ou processo. Solicita a ativação das proteções em tempo real, comportamental e de arquivos e atualiza as definições. No runner, ativa MAPS Advanced, envio automático de amostras seguras e bloqueio à primeira vista conforme a configuração oficial da Microsoft. Exige confirmar essas opções e testar a conexão com a nuvem por `MpCmdRun -ValidateMapsConnection`. Não cria exclusões, muda ações de remediação ou altera proteção contra adulteração. O checkout inclui somente os dois scripts de teste; código do editor, chave e notas do usuário não são copiados para o runner.
2. Baixa o instalador da versão fixada do repositório público, marca sua origem como Internet no fluxo NTFS `Zone.Identifier` e verifica o hash exato dos bytes do instalador antes de executá-lo. Essa marcação torna a condição de origem explícita para a proteção; não altera o conteúdo do pacote. Se o Defender já bloquear o download ou a leitura, registra a etapa da falha e os eventos disponíveis.
3. Instala silenciosamente em uma pasta nova dentro de `RUNNER_TEMP`, verifica o executável instalado contra o hash original do payload, a versão e o registro criado pelo instalador.
4. Abre o app com uma pasta temporária para a sessão, exige observar uma janela e acompanha o processo durante 60 segundos. Verifica novamente as proteções, a presença e o hash do executável.
5. Salva o estado das proteções, as configurações de nuvem anteriores e efetivas, os testes de conexão, o resultado de cada etapa e os eventos de detecção/remediação do Lume. Encerra somente os processos criados pelo teste.

Somente relatórios são anexados, em artefatos privados `lume-installed-check-0.9.1-<run-id>` e `lume-installed-check-0.10.0-<run-id>`. Não há upload de instaladores, dados pessoais, chave ou sessão do computador do usuário. Não existe etapa de publicação.

## Interpretar

- `startup-observed`: instalação e janela observadas durante o intervalo, com proteção ativa. Isso não constitui prova de ausência de malware nem garantia de que o bloqueio não apareça depois.
- `defender-event-observed`: eventos de detecção/remediação relacionados ao Lume foram encontrados; comparar nome, recurso e fase nas duas versões.
- `inconclusive-or-failed`: o teste não concluiu. O campo `stage` e a mensagem `error` distinguem falha no download, instalação, abertura ou ambiente. Se o runner não permitir ativar a proteção ou não oferecer uma sessão gráfica utilizável, isso não deve ser interpretado como detecção nem aprovação do aplicativo.

`protection-check.json` registra a preparação; `installed-check.json` registra o download, instalação e abertura, se essa etapa for atingida. Um runner pode continuar diferente do Windows do usuário, inclusive na política de nuvem e nas definições. Um resultado sem eventos exige investigação adicional se a ocorrência local persistir. O bloqueio de distribuição da 0.10.0 não é removido automaticamente.

A preparação aguarda até 45 segundos pela ativação das proteções e atualiza as definições por `MpCmdRun -SignatureUpdate`, com limite de 120 segundos e saída em `defender-update.txt`. Esse é o mesmo método dos workflows anteriores; o cmdlet `Update-MpSignature` falhou com erro RPC nessa imagem. Erros e limites de espera continuam interrompendo o teste. O resumo agora informa a etapa e a mensagem de erro, mesmo quando a consulta ao histórico também falha.

No run `38995686741`, ambos os instaladores originais abriram durante 60 segundos com motor `1.1.26090.9` e definições `1.461.64.0`, sem eventos de detecção. Porém, os relatórios registraram `MAPSReporting=0`, `SubmitSamplesConsent=2` e `DisableBlockAtFirstSeen=true`: a proteção em nuvem estava desligada. Isso limita aquele resultado e não estabelece a causa do bloqueio local. A configuração anterior agora é rejeitada pelos guardas do teste. Se a política do runner impedir ativar ou conectar a proteção em nuvem, o diagnóstico falha como inconclusivo, sem executar o app.

O run `38996366055` confirmou Internet disponível, atualização de definições concluída e as opções MAPS ativadas, mas os dois jobs falharam na conexão com a nuvem (`0x80508015`) antes de baixar o Lume. A saída não contém o motivo interno detalhado e referencia `MpCmdRun.log`, que não estava nos artefatos daquela execução. O script agora preserva as últimas 400 linhas desse log, se disponível, sem substituir o erro original.

O [preparo oficial da imagem](https://github.com/actions/runner-images/blob/main/images/windows/scripts/build/Configure-WindowsDefender.ps1) adiciona exclusões para as unidades C e D. Os relatórios anteriores não registravam exclusões; portanto, eles também não demonstram cobertura antimalware efetiva dos caminhos utilizados. A instalação e a abertura observadas continuam sendo evidência funcional limitada, não liberação de segurança. Não foi iniciada outra execução para esta alteração.

Para correlacionar a ocorrência real, `scripts/collect-defender-report.ps1` lê status, preferências de nuvem e histórico de detecções/eventos relacionados a Lume/NSIS e grava um JSON local. Não inicia varredura, executa o editor, restaura quarentena, altera configurações ou envia dados. Neste ambiente automatizado, a leitura do histórico foi negada; a coleta depende do contexto normal do usuário com permissão para ler o histórico. O nome da ameaça já foi informado; faltam principalmente os recursos afetados, horários e ações registrados nessa ocorrência.

Os testes locais dos guardas usam somente dados simulados, sem iniciar o Defender ou qualquer instalador:

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File ".\scripts\installation-check.checks.ps1"
```

Referências: [proteção em tempo real da Microsoft](https://learn.microsoft.com/en-us/defender-endpoint/configure-real-time-protection-microsoft-defender-antivirus), [ambiente do runner GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/variables) e [parâmetros do NSIS](https://nsis.sourceforge.io/Docs/Chapter3.html).
