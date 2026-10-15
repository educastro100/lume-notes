# Compilação de diagnóstico do Windows

O workflow **Diagnostico Windows** executa somente por acionamento manual, no repositório privado `educastro100/lume-notes`. O repositório público `lume-notes-releases` permanece sem publicações. A versão 0.9.0 continua bloqueada pela política de segurança.

## O que o workflow faz

Usa uma máquina nova `windows-2022`, Rust 1.99.0 para MSVC x64, Node 24.21.0 e o NSIS oficial baixado pelo Tauri CLI travado no package-lock. Não reutiliza o compilador NSIS adaptado localmente nem caches de compilação de outras execuções. As três actions GitHub estão fixadas por hash de commit. A versão Rust coincide com a compilação GNU investigada; a toolchain e o ambiente são diferentes.

Executa `npm ci`, os testes JavaScript, build do frontend, testes Rust com `--locked` e build NSIS. O único override Tauri desativa a geração dos arquivos de atualização assinados. O código do aplicativo, o identificador e a lógica normal de empacotamento permanecem iguais. Não utiliza chave privada, certificado, secrets, script de publicação ou permissão de escrita no conteúdo do GitHub. Não executa o aplicativo nem o instalador, não altera configurações de proteção do Defender e não tenta iniciar serviços de proteção indisponíveis.

O coletor usa o 7-Zip da imagem oficial para extrair o instalador sem executá-lo. Compara o hash do executável extraído com o executável que o bundler acabou de marcar como NSIS e inventaria os EXEs/DLLs encontrados. Se o Defender estiver disponível, atualiza a inteligência de segurança, registra suas versões e consulta cada arquivo com varredura personalizada sem aplicar remediação. A proteção em tempo real da imagem não é alterada.

## Ler o resultado corretamente

- `detected`: detecção identificada na saída do Defender. Job falha; amostras não são anexadas.
- `scan-error`/`error`: análise falhou ou um arquivo sumiu/bloqueou durante o processo. Job falha; ausência de arquivo não é tratada como aprovação.
- `unavailable`: o Defender da imagem não estava disponível. A compilação pode concluir e anexar amostras privadas **sem varredura**, exclusivamente para análise local. Esse resultado não significa que o arquivo está limpo.
- `no-threats-reported`: o Defender não relatou ameaça nos arquivos consultados naquela execução. Isso não comprova ausência de malware e não libera a versão 0.9.0.

Os relatórios `lume-diagnostic-reports-<run-id>` ficam por 14 dias e incluem commit, ambiente, hashes, versões disponíveis do Defender, resultados e logs. As amostras `lume-diagnostic-DO-NOT-INSTALL-<run-id>` ficam por sete dias, apenas no repositório privado, com aviso de não instalar/executar. São anexadas somente quando o conteúdo foi conferido e não houve uma detecção ou falha de análise; Defender indisponível é explicitamente indicado como amostra não examinada. Não são releases, não alimentam o atualizador e não contêm a chave privada ou a árvore de fontes. A extração e os arquivos do CI ficam em `diagnostics/`, ignorado pelo Git.

## Executar

As alterações foram preparadas localmente. Após o commit ser enviado à branch padrão:

1. Abra `https://github.com/educastro100/lume-notes/actions`.
2. Escolha **Diagnostico Windows**.
3. Clique **Run workflow**, escolha **main** e confirme a execução.
4. Ao concluir, abra a execução e leia primeiro o resumo e o artifact de relatórios.

O acesso aos artifacts exige autenticação e permissão de leitura no repositório privado. A execução usa a franquia de Actions dessa conta. Nenhuma publicação automática está configurada.

Se for necessário baixar uma amostra para análise, não dê duplo clique nem instale. Compare o hash com `diagnostic.json` e faça a varredura local do executável final, das DLLs extraídas e do instalador antes de qualquer teste de execução. A ausência de detecção no ambiente do GitHub, isoladamente, não encerra o incidente.

## Análise da Microsoft

O texto em [microsoft-submission-0.9.0.txt](microsoft-submission-0.9.0.txt) está pronto para preencher o [portal de análise da Microsoft](https://www.microsoft.com/en-us/wdsi/filesubmission) como desenvolvedor. O envio requer a conta do usuário e não é realizado pelo workflow.

O arquivo de referência é o instalador original `releases/0.9.0/Lume-Notes-0.9.0-Windows-x64-setup.exe`, com hash registrado na auditoria. O texto identifica o hash do executável interno detectado. Não restaure a cópia em quarentena ou crie exclusões para anexá-la; o instalador original permite que a equipe de análise examine o conteúdo. Nenhum código-fonte, nota pessoal ou chave precisa ser enviado.

Compare o resultado da Microsoft com o build limpo e a análise local antes de escolher a próxima versão distribuível. Mudar o compilador ou obter uma varredura negativa não comprova, por si só, que o alerta anterior era falso positivo.

Referências: [Tauri no GitHub Actions](https://v2.tauri.app/distribute/pipelines/github/), [imagem Windows do GitHub](https://github.com/actions/runner-images/blob/main/images/windows/Windows2022-Readme.md), [acesso a artifacts](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts).
