# Microsoft Store — Lume Notes

O canal da Store usa MSIX, separado do instalador NSIS e do atualizador do GitHub. A Microsoft assina o pacote aprovado e a Store entrega suas atualizações. O workflow prepara o arquivo para submissão; não publica o aplicativo nem instala certificados.

## Identidade reservada

Valores confirmados no Partner Center em 27/10/2026:

| Campo                    | Valor                                    |
| ------------------------ | ---------------------------------------- |
| Name                     | EduardoJunqueira.LumeNotes               |
| Publisher                | CN=E5933B3E-48A8-4F93-BF1C-57211F27FF86  |
| PublisherDisplayName     | Eduardo Junqueira                        |
| Package Family Name      | EduardoJunqueira.LumeNotes_2m6y48kycrkep |
| Application Id           | Lume                                     |
| Versão inicial do pacote | 0.11.0.0                                 |

A fonte desses valores é packaging/msix/identity.json. O preparador verifica também o sufixo do PFN calculado a partir do Publisher. Não substitua esse GUID pelo nome pessoal ou por um certificado de teste.

## Gerar pelo GitHub Actions

1. Envie as alterações para main no repositório oficial.
2. Abra Actions → Preparar Microsoft Store → Run workflow → main.
3. Aguarde o job terminar. Ele instala dependências travadas, executa testes JavaScript e Rust, compila com MSVC x64, gera o MSIX com MakeAppx e compara os arquivos extraídos com os originais.
4. Baixe o artefato lume-store-msix-<run_id> e extraia o ZIP.
5. No Partner Center, crie/continue a submissão do Lume Notes e envie **somente Lume-Notes-0.11.0-Windows-x64-store.msix** na seção Pacotes. O ZIP do Actions não é o pacote da Store.

O artefato também contém SHA256SUMS.txt, o inventário msix-staging.json e LEIA-ME.txt. O MSIX não tem assinatura local e se destina ao envio à Store. Não instale certificados autoassinados para utilizá-lo como distribuição final.

Após enviar o pacote, complete propriedades, classificação etária, disponibilidade, política de privacidade e a listagem. Resolva os avisos do Partner Center antes de enviar para certificação. A identidade reservada, por si só, não é aprovação.

## Comportamento desta edição

- Windows Desktop x64, Windows 10 build 19041 ou posterior e Windows 11.
- Exige Microsoft Edge WebView2 Evergreen Runtime, presente no Windows 11 e na maioria dos Windows 10 atualizados. Se faltar, uma mensagem oferece abrir a página oficial; o aplicativo não baixa nem executa instaladores.
- Rascunhos e textos continuam locais. Não exige conta no Lume, não inclui anúncios, sincronização ou telemetria própria.
- Abrir com para .txt, .md, .json, .log e .csv declarado no manifesto. O usuário escolhe os padrões nas configurações do Windows.
- O plugin atualizador do GitHub não é inicializado. Configurações mostra a versão e abre a biblioteca da Microsoft Store.
- A instalação da Store não remove nem atualiza automaticamente uma instalação NSIS anterior. Feche a outra edição antes de usar o Lume.

O executável mantém o identificador Tauri com.lume.notes, mas o Windows pode virtualizar dados de aplicativos MSIX. **A recuperação dos dados da instalação NSIS ainda precisa de validação na edição entregue pela Store.** Antes de migrar, salve os documentos importantes em arquivos e mantenha uma cópia do session.json existente em %APPDATA%\com.lume.notes. Não apague a instalação ou os dados anteriores para testar a recuperação.

## Notas para certificação

Texto sugerido, a adaptar apenas se o comportamento mudar:

Lume Notes is a local-first text and Markdown editor built with Tauri. The runFullTrust capability is required for its packaged Win32 desktop process to open and save user-selected documents, display native file dialogs and maintain local drafts. It runs as the current user without administrator privileges. It does not install services, drivers, scheduled tasks or executable updates. Updates for this edition are managed by Microsoft Store. Microsoft Edge WebView2 Evergreen Runtime is required.

Teste pela distribuição de teste da Store antes da liberação geral: iniciar e fechar, recuperar notas/grupos/tema, abrir um arquivo com espaços pelo Explorer, salvar e renomear, escolher padrões do Windows e confirmar que a edição não consulta o feed de atualização do GitHub. Não declarar esses testes concluídos apenas porque o MakeAppx aceitou o pacote.

## Referências

- [Gerar componentes MSIX](https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-manual-conversion)
- [Identidade do aplicativo](https://learn.microsoft.com/en-us/windows/apps/publish/view-app-identity-details)
- [Publicar na Store](https://learn.microsoft.com/en-us/windows/apps/publish/get-started)
- [Distribuir WebView2](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution)
