# Lume Notes 0.9.1

- Instalador Windows x64 compilado com MSVC e NSIS oficiais no GitHub Actions, em ambiente novo e com dependências travadas.
- Conferência do executável realmente empacotado e varredura do instalador, aplicativo, desinstalador e DLLs antes de preparar a distribuição.
- Assinatura do atualizador vinculada à versão, com a chave privada mantida localmente. O conteúdo do instalador permanece igual após a assinatura.
- Código-fonte privado e canal público separado para instaladores e metadados de atualização.
- Mantidos a instalação por usuário, os dados locais, os temas, os grupos e a integração com Abrir com sem alterar os aplicativos padrão.

A versão 0.9.0 anterior permanece bloqueada e não é substituída por esta publicação. A assinatura do atualizador não é uma assinatura Windows Authenticode. A preparação do candidato e suas verificações não publicam uma release automaticamente.
