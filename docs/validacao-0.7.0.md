# Validação — Lume Notes 0.7.0

## Resultado

- 82 testes TypeScript/React em 17 arquivos: passaram.
- 7 testes Rust em Windows x64: passaram, incluindo renomeação real com MoveFileExW, mudança apenas de maiúsculas/minúsculas, conflito de nome e alteração externa.
- TypeScript, build de produção e Prettier: concluídos.
- Nenhuma dependência adicionada ou atualizada; arquivos de lock só alteram a versão do app.

## Funcionalidades revisadas

- Edição visual e código, formatação, recuo, listas, desfazer/refazer, preservação ao alternar editores, busca e substituição.
- Fechamento da última nota e confirmação de notas não salvas.
- Salvamento assíncrono e manutenção do texto digitado durante uma operação de salvar/fechar.
- Agrupamento, seleção múltipla, destinos de arraste, abertura de arquivos e deduplicação de aliases.
- Recuperação de sessões, migração de grupos, nomes, ícones e preferências.
- Novo título: Enter/check confirma, Esc cancela; valida nomes reservados do Windows e preserva a extensão. Nome personalizado reaparece ao recarregar. Nome original é preservado em caso de erro.
- Botão lateral Salvar aparece em rascunhos novos e arquivos alterados; fica oculto em arquivos salvos sem alterações e reaparece ao editar.
- Modo foco ao lado de Salvar, desfoque de 380 ms, cursor no editor e retorno com Esc/F8. Movimento reduzido desativa animações.
- Configurações com entrada/saída suave, restauração de foco e reabertura rápida que cancela o timer de saída.
- UTF-8/UTF-16, bytes exatos, mudança externa e arquivo removido.

## Bugs encontrados e corrigidos

1. Ctrl+B/I/U na busca interceptava a tecla e formatava a nota. Atalhos de formatação agora respeitam os campos da interface.
2. Ao fechar com Salvar, texto digitado durante o salvamento podia ser descartado. O fechamento compara com o conteúdo realmente enviado para salvar e mantém a nota aberta se houver novas alterações.
3. Selecionar aliases do mesmo arquivo em uma única abertura criava abas duplicadas. A deduplicação agora considera também os arquivos daquela operação. Abrir uma aba existente revela seu grupo se estiver recolhido.

## Limites

A revisão cobriu os fluxos principais e os casos de regressão automatizados; não equivale a garantia de ausência de bugs. As imagens de demonstração usam apenas notas sintéticas no navegador, em armazenamento separado dos dados do aplicativo. O aviso de tamanho do pacote JavaScript continua e não impede o build.

## Conferência adicional no aplicativo Windows

A versão 0.7.0 abriu e recuperou as notas existentes. Foi aberto um arquivo sintético UTF-8 com BOM e CRLF. O botão Salvar lateral ficou oculto com o arquivo limpo. O título foi alterado para “renomeado” pela interface: o arquivo mudou de nome na mesma pasta, sem mudar nenhum byte. O arquivo sintético foi fechado sem confirmação de alterações, e as notas, grupos e nota ativa do usuário permaneceram idênticos à cópia anterior à atualização. O app 0.7.0 ficou aberto.

SHA-256 do executável: `e03e26a0208dd837fecd0d9672ec753c9ce557efcd7c6fbf8d57308a1d16ccd6`.
