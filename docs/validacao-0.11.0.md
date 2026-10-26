# Validação da 0.11.0

Data: 26/10/2026. Verificação do código e da interface no navegador; nenhum instalador de produção foi gerado ou instalado nesta etapa.

- Vitest: 25 arquivos, 113 testes aprovados.
- Scripts de distribuição: 14 testes Node aprovados, incluindo versão consistente, assinatura de teste, adulterações e lista explícita de arquivos. A chave temporária dessas fixtures não é a chave real do atualizador.
- Build TypeScript/Vite aprovado. O aviso já existente de tamanho do bundle permanece.
- Teste de interface em origem separada da sessão do aplicativo instalado: seleção de Español, conteúdo das notas preservado, criação de grupos, arraste real na lateral e na faixa superior, tema Noite com ponto azul, seleção de Processo e recuperação do ícone após a gravação automática e recarga.
- Reordenação e persistência também cobertas por regressão com notas existentes, grupo recolhido, grupo vazio e recuperação da sessão. Os testes verificam que conteúdo, grupo de cada nota e seleção ativa não são alterados.
- Os novos ícones passam pela mesma validação de sessão e memória por caminho dos anteriores. As traduções preservam os parâmetros de substituição.
- Os movimentos do brilho respeitam prefers-reduced-motion. A barra nativa usa o mesmo componente do pontinho; a integração visual na janela Windows ainda requer a próxima compilação desktop.

## Abertura do código

Licença MIT escolhida pelo mantenedor; metadados npm, Cargo e Tauri alinhados. Os arquivos de lock mantêm as mesmas versões de dependências, exceto a versão do próprio Lume.

Uma busca por padrões conhecidos em 233 blobs de texto do histórico local não encontrou chaves privadas, tokens GitHub, chaves AWS, URLs com senha ou arquivos de segredo versionados. Essa busca automatizada não prova ausência de qualquer dado sensível.

O histórico foi reescrito para usar o e-mail noreply do GitHub, conforme autorização do mantenedor. Os arquivos e datas dos commits foram preservados. Backup privado em bundle e mapa de hashes ficaram fora do repositório. Essa mudança é local; o envio ao GitHub e a mudança de visibilidade precisam ser confirmados separadamente. Referências ou caches antigos do GitHub podem exigir tratamento adicional; reescrever main não apaga esses registros do servidor.

## Assinatura e distribuição

A assinatura Authenticode ainda não foi obtida. As condições da SignPath Foundation foram verificadas e estão documentadas em [Code signing policy](code-signing.md). Nenhum segredo foi adicionado ao CI. Os bloqueios históricos de 0.9.0 e 0.10.0 foram preservados; o relato visual posterior da 0.10.0 identifica Bearfoos.B!ml no instalador de Downloads.

O workflow de candidato aceita o repositório oficial público em main. Logs e artefatos desse workflow serão públicos após a abertura. Os dois workflows antigos de diagnóstico continuam desabilitados em repositórios públicos. Uma nova versão final não foi publicada.
