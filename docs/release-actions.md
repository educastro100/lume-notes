> Atualização de 26/10/2026: o projeto está preparando a abertura sob MIT. O workflow de candidato também aceita o repositório oficial público em main; nessa situação, logs e artefatos são públicos. As instruções históricas abaixo que os chamam de privados se referem ao fluxo anterior. A assinatura Authenticode ainda está pendente; veja [Code signing policy](code-signing.md). Os bloqueios de 0.9.0 e 0.10.0 continuam válidos.

# Preparar uma release pelo GitHub Actions

O workflow manual **Preparar release Windows** gera um candidato no repositório privado. Usa Windows 2022, MSVC x64, NSIS oficial e as mesmas versões travadas do diagnóstico aprovado. Não recebe chave privada, não utiliza credenciais do usuário e não publica arquivos. A versão anterior 0.9.0 continua bloqueada na política versionada.

## 1. Compilar e examinar no GitHub

Envie o commit para `main`. Em [Actions](https://github.com/educastro100/lume-notes/actions), selecione **Preparar release Windows → Run workflow → main**. Inicie uma execução nova após cada correção; não reutilize uma execução de outro commit.

O job verifica a consistência das versões, executa testes JavaScript/Rust, compila o verificador de assinatura a partir dos fontes e gera o NSIS sem acessar chaves. Extrai o pacote sem executá-lo, confere a transformação exata do marcador Tauri e exige que o Defender esteja disponível e conclua a análise de todos os EXEs/DLLs, incluindo o verificador. Falha ou detecção impede a geração do candidato. A proteção em tempo real da imagem não é alterada.

Ao concluir, baixe `lume-release-reports-<run-id>` e `lume-release-candidate-<run-id>`. O segundo ZIP contém exatamente quatro arquivos: instalador, aplicativo extraído, verificador e `candidate.json` com commit, run, hashes e registros da inspeção. Eles ficam privados e expiram em sete dias; os relatórios ficam por 14 dias. Não compartilhe o ZIP candidato no repositório público.

## 2. Conferir e assinar localmente

No mesmo checkout, sem alterações pendentes e com os mesmos arquivos de compilação do workflow:

```powershell
Set-Location -LiteralPath 'C:\Users\Eduardo\Documents\Projetos Pessoais\[DOING] Lume'
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File ".\scripts\finish-release.ps1" -ArtifactZip 'C:\Users\Eduardo\Downloads\lume-release-candidate-<run-id>.zip'
```

O script extrai somente os quatro nomes permitidos em uma pasta nova, rejeita caminhos extras/duplicados e confere versão, commit, política de segurança e hashes. Correções posteriores limitadas a scripts operacionais, documentação e workflows podem preparar o mesmo candidato; qualquer mudança em código do app, assets, manifestos, dependências ou configuração de compilação exige um novo build. O commit compilado e o commit de preparação são registrados separadamente.

Atualiza a inteligência do Defender local e analisa os três executáveis. Só então a CLI oficial abre a chave existente e cria a assinatura com `--app-version`. A chave permanece em `Documents\Codex\Lume Signing\lume-notes.key`, fora do repositório; seu conteúdo não é impresso ou enviado ao GitHub. Para uma chave protegida, a senha deve estar apenas na variável `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` do processo local. Não informe chave ou senha no chat, em argumentos ou em commits.

Depois da assinatura, prepara `latest.json` e os hashes, copia o verificador privado e executa o preflight de publicação. O verificador usa o plugin atualizador do aplicativo para conferir a assinatura, a versão assinada e a rejeição de bytes ou versões adulterados. Ele não executa o instalador, não abre o editor e não altera o registro. A assinatura do atualizador é um arquivo separado; o instalador não é reempacotado e deve manter o hash do CI. A assinatura Windows Authenticode continua ausente.

Os resultados ficam em `releases/<versão>/`, ignorado pelo Git. Logs, executáveis auxiliares, candidato e relatório de verificação permanecem privados. Se a assinatura falhar, nenhum pacote é publicado. Não gere outra chave para corrigir uma falha: preserve a chave pública já utilizada pelas instalações.

## 3. Revisar e publicar

Conclua a conferência dos relatórios e o teste do pacote final antes de publicar. A assinatura e a varredura não confirmam por si só que o alerta do pacote antigo era falso positivo. O teste de atualização pela rede só pode ser concluído quando o feed e o pacote estiverem disponíveis para a instalação de teste.

Quando a publicação estiver autorizada e os arquivos finais revisados, no PowerShell normal do Windows com sua autenticação GitHub existente:

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File ".\scripts\publish-release.ps1" -Version 0.10.0
```

Somente instalador, `.sig`, `latest.json` e `SHA256SUMS.txt` são enviados ao repositório público de releases. A publicação cria um rascunho e só o libera após anexar os arquivos. Código-fonte, notas, chave, candidato, logs e verificador não fazem parte da lista pública. Este ambiente de automação não acessa o Gerenciador de Credenciais; por isso o envio Git e a publicação autenticada são feitos pelo usuário no terminal normal.

O comando acima usa `RemoteSigned` somente nesse processo, sem mudar a política persistente do Windows. O publicador identifica cada etapa e mostra uma mensagem a cada dez segundos de espera. A consulta da autenticação tem limite de 45 segundos; cada requisição ao GitHub tem limite de 120 segundos. Falhas não exibem tokens nem a saída de erro do gerenciador de credenciais. Um rascunho parcial pode ser retomado pelo mesmo comando: os arquivos existentes só são aceitos quando seus hashes coincidem. Uma release já publicada nunca é substituída. A conclusão é indicada por `Publicado: <link>`.

O teste isolado do limite de espera, sem consultar credenciais reais, pode ser executado com `powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File ".\scripts\release-process.checks.ps1"`.

As notas da release são lidas como texto simples pela API de arquivos do .NET. No Windows PowerShell 5.1, `Get-Content` acrescenta propriedades como `PSDrive` e `PSProvider` à string; serializar esse objeto com profundidade alta pode bloquear a criação do JSON antes de qualquer pedido HTTP. O teste `powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File ".\scripts\release-payload.checks.ps1"` verifica o JSON sem acessar credenciais ou a rede.

Referências: [assinatura do updater Tauri](https://v2.tauri.app/plugin/updater/#signing-updates), [GitHub Actions no Tauri](https://v2.tauri.app/distribute/pipelines/github/) e [CLI Tauri](https://v2.tauri.app/reference/cli/).
