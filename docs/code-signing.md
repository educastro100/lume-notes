# Code signing policy

Estado em 27/10/2026: código público sob MIT. A SignPath Foundation recusou a candidatura por insuficiência de sinais públicos de adoção e reputação. Não há certificado Authenticode provisionado. O caminho escolhido agora é o [MSIX para Microsoft Store](microsoft-store.md), cuja assinatura é realizada pela Microsoft após a certificação.

## Histórico da proposta SignPath

A [SignPath Foundation](https://signpath.org/) oferece assinatura gratuita a projetos open source aprovados. Ela verifica o projeto e a origem dos binários; abrir um repositório não concede automaticamente o serviço. Os [termos](https://signpath.org/terms) exigem licença aprovada pela OSI, manutenção ativa, documentação, reputação verificável, autenticação multifator e aprovação manual das solicitações de assinatura. A candidatura do Lume foi recusada em 27/10/2026; uma nova avaliação depende de maior reconhecimento público. Não existe aprovação pendente para esta candidatura.

Responsável proposto por desenvolvimento, revisão e aprovação: [educastro100](https://github.com/educastro100). Contribuições externas devem ser revisadas antes da integração. O provedor deve aprovar essa estrutura e o fluxo de build. Não usamos badge ou afirmação de assinatura concedida antes dessa aprovação.

A [Microsoft](https://learn.microsoft.com/windows/apps/package-and-deploy/code-signing-options) também descreve certificados de autoridades certificadoras e distribuição pela Store. A [elegibilidade atual do Azure Artifact Signing](https://learn.microsoft.com/azure/artifact-signing/quickstart) limita desenvolvedores individuais de Public Trust aos EUA e Canadá; a região Azure Brazil South não significa que uma pessoa física brasileira seja elegível. Não é necessário contratar um serviço nesta preparação.

## Duas assinaturas diferentes

- **Authenticode:** identifica o editor do executável para o Windows e protege sua integridade. Deve ser verificada no aplicativo e no instalador final, com cadeia confiável e carimbo de tempo.
- **Assinatura Tauri do atualizador:** protege o pacote baixado e a versão autenticada. Continua obrigatória e usa a chave já existente, mantida fora do Git e do CI público.

A [documentação do Tauri](https://v2.tauri.app/distribute/sign/windows/) permite integrar serviços por um comando de assinatura. A configuração real depende do cadastro e dos identificadores fornecidos pelo provedor; não há um comando fictício configurado para simular esse estado.

## Ordem de distribuição a integrar após aprovação

1. Compilar a partir de um commit revisado, com dependências travadas, no Actions oficial.
2. Obter assinatura Authenticode dos executáveis finais e do instalador que os contém, segundo a integração do provedor. Nenhuma alteração de recursos ou bytes pode ocorrer após a assinatura correspondente.
3. Extrair e conferir o pacote, validar Authenticode no executável e no instalador e executar as verificações de segurança e de instalação.
4. Gerar a assinatura do atualizador, o manifesto e os hashes **somente sobre o instalador final já assinado**. Conferir assinatura, versão, rejeição de adulterações e os arquivos publicados.
5. Publicar no canal de releases após aprovação. Até configurar e validar esse fluxo, os candidatos do workflow continuam marcados como não instaláveis.

O comparador atual da distribuição foi desenvolvido para binários sem Authenticode. Sua validação do marcador NSIS e do executável extraído precisará ser adaptada e testada quando a assinatura Windows for integrada; assinar depois e reutilizar metadados antigos invalidaria hashes e assinaturas.

Assinatura não é um laudo de ausência de malware. Não remove automaticamente uma classificação Trojan nem assegura reputação imediata no SmartScreen. Os bloqueios já registrados de 0.9.0 e 0.10.0 continuam preservados.

## Privacidade

O Lume mantém textos, rascunhos e preferências no computador. Na edição NSIS, consultas de atualização usam o canal público do GitHub; na edição MSIX, a Microsoft Store gerencia as atualizações. Abertura de links ocorre por ação do usuário. Textos e nomes de arquivos não são enviados pelo aplicativo a esses serviços. Serviços de terceiros podem receber os dados normais de conexão quando essas funções são utilizadas. O WebView2 segue as políticas da plataforma Microsoft. Chaves de assinatura e relatórios locais do Defender não fazem parte do código público.

## Workflows públicos

O workflow manual de candidato está limitado a main no repositório oficial e não recebe chaves de assinatura. Em um repositório público, seus logs e artefatos também são públicos: eles não devem conter notas, chaves, sessões ou relatórios da máquina pessoal. Os workflows antigos de diagnóstico mantêm a exigência de repositório privado e serão ignorados após a mudança de visibilidade. Não são uma etapa necessária para abrir o código.
