# Distribuição e atualizações do Lume

> **Distribuição 0.9.0 suspensa:** detecção `Trojan:Win32/Bearfoos.A!ml` reproduzida no executável extraído do instalador. Consulte [a auditoria](auditoria-seguranca-0.9.0.md). A assinatura criptográfica e os testes funcionais não substituem a validação antimalware do executável final.

## Organização

- Código privado: https://github.com/educastro100/lume-notes
- Pacotes públicos: https://github.com/educastro100/lume-notes-releases/releases
- Feed do aplicativo: https://github.com/educastro100/lume-notes-releases/releases/latest/download/latest.json

O repositório público não recebe o código, arquivos de usuário, chaves, ZIP de fontes ou dependências. Uma release contém somente o instalador, sua assinatura, latest.json e SHA256SUMS.txt. O ZIP de fontes gerado automaticamente pelo GitHub pertence apenas ao repositório público de pacotes, cujo conteúdo inicial é um README.

## Instalação e dados

O NSIS instala por usuário em `%LOCALAPPDATA%\Lume Notes`, com menu Iniciar, atalho opcional e desinstalador. O aplicativo exige Windows x64 e WebView2; o instalador baixa o bootstrapper da Microsoft somente quando necessário. As notas existentes ficam em `%APPDATA%\com.lume.notes\session.json` e as preferências permanecem no perfil local do WebView2. O identificador do aplicativo continua `com.lume.notes`.

Feche versões portáteis antigas antes de instalar. O desinstalador mantém os dados por padrão; a caixa opcional de remoção de dados deve ser usada somente quando o usuário deseja apagar rascunhos e preferências locais. Atualizações usam o modo UPDATE do NSIS, que preserva esses dados.

O hook do instalador registra ProgID, Applications, OpenWithProgids e RegisteredApplications/Capabilities para .txt, .md, .json, .log e .csv. Ele não escreve o valor padrão das extensões ou UserChoice. Aplicativo padrão é uma escolha por extensão nas configurações do Windows. A desinstalação só remove os registros próprios correspondentes ao caminho daquela instalação.

## Assinatura

A chave privada de atualização deve ficar fora do repositório, com backup seguro. A cópia local deste ambiente está em `Documents\Codex\Lume Signing\lume-notes.key`, acompanhada da chave pública `.key.pub`. Apenas a chave pública consta em tauri.conf.json. Nunca adicione a chave privada a commits, anexos públicos ou mensagens. O .gitignore também exclui formatos usuais de chaves e certificados.

Preserve essa chave nas próximas versões. Trocar ou perder a chave impede que as instalações existentes validem as atualizações assinadas por outra chave. Para usar uma chave protegida por senha, forneça TAURI_SIGNING_PRIVATE_KEY_PASSWORD no ambiente de build.

Assinatura do atualizador é diferente de um certificado comercial Authenticode do Windows. Esta distribuição ainda não usa Authenticode comercial.

## Gerar uma release

Para a versão 0.9.1 e seguintes, siga [Preparar release pelo Actions](release-actions.md). O candidato é compilado e examinado no GitHub sem chave privada, e assinado localmente após nova conferência. Esse é o fluxo adotado após a investigação da versão 0.9.0. O build local descrito a seguir permanece como ferramenta de desenvolvimento e não substitui as verificações do fluxo oficial.

Mantenha package.json, package-lock.json, Cargo.toml e tauri.conf.json com a mesma versão X.Y.Z. Atualize CHANGELOG.md e crie docs/release-notes-X.Y.Z.md. Os arquivos de lock devem acompanhar a versão e as dependências.

Em um Windows com os pré-requisitos de desenvolvimento do README:

```powershell
npm ci
npm test
.\scripts\build-release.ps1
```

O script aceita -Target e -KeyFile. A chave também pode ser fornecida por TAURI_SIGNING_PRIVATE_KEY. O build gera o instalador e a assinatura, prepara o manifesto e os hashes e verifica o pacote com o próprio plugin atualizador do Tauri, sem iniciar uma instalação. Também comprova a rejeição de bytes alterados e de uma versão anunciada diferente da assinatura.

Ferramentas temporárias deste ambiente (GNU, NSIS nativo e caches) ficam fora do código-fonte. O fluxo padrão em outras máquinas usa a toolchain Windows MSVC e o NSIS fornecido pelo Tauri. useLocalToolsDir mantém o cache no diretório target.

## Publicar os pacotes

Para revisar os arquivos, sem enviar nada:

```powershell
.\scripts\publish-release.ps1 -PrepareOnly
```

Para publicar, execute em um PowerShell normal do Windows com sua autenticação existente do GitHub no Git Credential Manager:

```powershell
.\scripts\publish-release.ps1
```

O script usa a credencial apenas em memória. Confirma que o canal é público, inicializa um README se o repositório estiver vazio, cria uma release em rascunho, envia somente os quatro arquivos permitidos e publica após concluir os anexos. Uma release já publicada não é sobrescrita; incremente a versão. Rascunhos interrompidos podem ser retomados quando os anexos existentes têm os mesmos hashes. O parâmetro -Version permite publicar um pacote preparado anteriormente.

Este ambiente de automação não consegue ler o Gerenciador de Credenciais do Windows. Nessa situação, o código e os pacotes podem ser preparados aqui, mas o comando de publicação precisa ser executado pelo usuário no terminal normal.

## Fluxo no aplicativo

Em uma instalação, a consulta automática começa dez segundos após a abertura, respeitando a última consulta bem-sucedida das 24 horas anteriores. O botão manual funciona independentemente dessa preferência. Sem internet ou com feed indisponível, o app informa a falha, sem declarar que a versão está atualizada.

O usuário escolhe Atualizar e reiniciar. Pode continuar editando enquanto o pacote é baixado. Após validar assinatura e versão, o editor é bloqueado, a fila de rascunhos recebe uma cópia da sessão mais recente e só então o instalador inicia. Se a persistência falhar, a instalação é cancelada. O instalador substitui o programa e o reabre; a recuperação da sessão usa o mesmo armazenamento.

Referências: [Instalador Windows do Tauri](https://v2.tauri.app/distribute/windows-installer/), [Updater do Tauri](https://v2.tauri.app/plugin/updater/) e [Aplicativos padrão no Windows](https://learn.microsoft.com/en-us/windows/apps/develop/windows-integration/default-apps-platform).

## Compilação isolada para investigação

Consulte [Diagnóstico Windows](diagnostico-windows.md) para o workflow manual no repositório privado e o texto preparado para análise da Microsoft. Esse fluxo não publica releases e não remove o bloqueio da versão 0.9.0.
