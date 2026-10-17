# Comparar as instalações 0.9.1 e 0.10.0 no GitHub Actions

O workflow manual **Comparar instalacao Windows** investiga o bloqueio observado depois da atualização para 0.10.0. Ele usa os instaladores exatos já publicados, com hashes fixados a partir dos candidatos verificados. Não recompila o aplicativo, não gera outra versão e não envia amostras para um portal de análise.

Cada versão recebe um runner Windows 2022 hospedado pelo GitHub, separado e temporário. O script recusa execução local, runners próprios e outros repositórios. Não precisa de chave de assinatura, credenciais pessoais ou configuração de uma máquina virtual pelo desenvolvedor.

## Executar

Envie os scripts para `main` no repositório privado. Em Actions, execute **Comparar instalacao Windows**. A comparação tem dois jobs paralelos, um para cada versão, e não exige a compilação Rust das releases. As etapas têm limites de espera; cada job tem limite total de 15 minutos.

O teste:

1. Solicita a ativação das proteções existentes em tempo real, comportamental e de arquivos, atualiza as definições e exige confirmação de que as proteções estão ativas. Não cria exclusões, muda ações de remediação, configura envio de amostras ou altera proteção contra adulteração.
2. Baixa o instalador da versão fixada do repositório público e verifica o hash exato antes de executá-lo. Se o Defender já bloquear o download ou a leitura, registra a etapa da falha e os eventos disponíveis.
3. Instala silenciosamente em uma pasta nova dentro de `RUNNER_TEMP`, verifica o executável instalado contra o hash original do payload, a versão e o registro criado pelo instalador.
4. Abre o app com uma pasta temporária para a sessão, exige observar uma janela e acompanha o processo durante 60 segundos. Verifica novamente as proteções, a presença e o hash do executável.
5. Salva o estado das proteções, as configurações de nuvem existentes, o resultado de cada etapa e os eventos de detecção/remediação do Lume. Encerra somente os processos criados pelo teste.

Somente relatórios são anexados, em artefatos privados `lume-installed-check-0.9.1-<run-id>` e `lume-installed-check-0.10.0-<run-id>`. Não há upload de instaladores, dados pessoais, chave ou sessão do computador do usuário. Não existe etapa de publicação.

## Interpretar

- `startup-observed`: instalação e janela observadas durante o intervalo, com proteção ativa. Isso não constitui prova de ausência de malware nem garantia de que o bloqueio não apareça depois.
- `defender-event-observed`: eventos de detecção/remediação relacionados ao Lume foram encontrados; comparar nome, recurso e fase nas duas versões.
- `inconclusive-or-failed`: o teste não concluiu. O campo `stage` e a mensagem `error` distinguem falha no download, instalação, abertura ou ambiente. Se o runner não permitir ativar a proteção ou não oferecer uma sessão gráfica utilizável, isso não deve ser interpretado como detecção nem aprovação do aplicativo.

`protection-check.json` registra a preparação; `installed-check.json` registra o download, instalação e abertura, se essa etapa for atingida. Um runner pode continuar diferente do Windows do usuário, inclusive na política de nuvem e nas definições. Um resultado sem eventos exige investigação adicional se a ocorrência local persistir. O bloqueio de distribuição da 0.10.0 não é removido automaticamente.

A preparação aguarda até 45 segundos pela ativação das proteções e atualiza as definições por `MpCmdRun -SignatureUpdate`, com limite de 120 segundos e saída em `defender-update.txt`. Esse é o mesmo método dos workflows anteriores; o cmdlet `Update-MpSignature` falhou com erro RPC nessa imagem. Erros e limites de espera continuam interrompendo o teste. O resumo agora informa a etapa e a mensagem de erro, mesmo quando a consulta ao histórico também falha.

Os testes locais dos guardas usam somente dados simulados, sem iniciar o Defender ou qualquer instalador:

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File ".\scripts\installation-check.checks.ps1"
```

Referências: [proteção em tempo real da Microsoft](https://learn.microsoft.com/en-us/defender-endpoint/configure-real-time-protection-microsoft-defender-antivirus), [ambiente do runner GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/variables) e [parâmetros do NSIS](https://nsis.sourceforge.io/Docs/Chapter3.html).
