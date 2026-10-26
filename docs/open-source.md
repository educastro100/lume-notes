# Publicar o código do Lume

O código próprio está licenciado sob MIT. A versão local preparada é 0.11.0; não se trata de um novo instalador publicado. O canal de atualização continua em educastro100/lume-notes-releases, portanto não é necessário mudar a URL do atualizador.

## Enviar o histórico preparado

O mantenedor autorizou substituir o e-mail profissional dos commits pelo e-mail noreply do GitHub. Foram preservados os arquivos, mensagens, datas e a estrutura dos 15 commits. Os hashes dos commits mudaram; o histórico original foi guardado em um bundle local fora do projeto, junto ao mapa de correspondência. Novos commits usam a mesma identidade noreply.

No PowerShell normal do Windows, com a conta GitHub já autenticada, execute:

```powershell
git -C "C:\Users\Eduardo\Documents\Projetos Pessoais\[FINISHED] Lume" push --force-with-lease origin main
```

O force-with-lease é necessário para substituir o histórico reescrito e impede sobrescrever um avanço remoto não conhecido pela referência local. Se for recusado por divergência, pare e compare os commits; não troque por --force. Não faça merge ou pull do histórico antigo, pois isso recolocaria os e-mails anteriores na branch preparada.

## Tornar o repositório público

Depois de confirmar o envio da branch preparada, abra [as configurações do repositório de código](https://github.com/educastro100/lume-notes/settings). Em General → Danger Zone → Change repository visibility, escolha Public e confirme o repositório. Mantenha lume-notes-releases como canal de instaladores.

A mudança também torna o histórico de Actions e seus logs visíveis. Antes de confirmar, confira os runs antigos na conta autenticada; nesta preparação local não houve acesso autenticado para inspecionar ou apagar esses registros. Não publique relatórios locais do Defender, notas ou chaves. Os workflows antigos de diagnóstico ficam ignorados no repositório público.

A reescrita da branch não elimina caches do GitHub, referências de pull requests ou cópias antigas. Outros clones devem ser substituídos ou tratados separadamente antes de novos pushes. Consulte a [documentação oficial sobre histórico](https://docs.github.com/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

## Certificado Windows

Com o código e a licença visíveis, o projeto pode solicitar avaliação de um provedor como a SignPath Foundation. A aprovação e a integração Authenticode ainda estão pendentes. Consulte a [política de assinatura](code-signing.md). Abrir o código não assina o instalador e não remove automaticamente detecções do Defender.
