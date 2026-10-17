# Validação de desenvolvimento — Lume Notes 0.10.0

## Verificações

- `npm run test:ci`: 106 testes Vitest em 24 arquivos e 14 testes Node de preparação, assinatura e inspeção de releases passaram.
- Testes Rust de release: dez passaram, incluindo a lista restrita de páginas públicas que a ajuda pode abrir. Execução local com a ferramenta GNU já disponível, sem criar ou assinar instalador. O pacote distribuível continua sendo compilado com MSVC pelo Actions.
- `npm run build`: TypeScript e Vite concluídos. Mantido o aviso de tamanho do bundle já existente.
- `npm run format:check`: arquivos verificados com Prettier.

## Regressões cobertas

- Código em linha combinado com negrito, itálico ou sublinhado, nas duas ordens de aplicação; seleção parcial e três estilos simultâneos; remoção do estilo sem remover código.
- Salvamento e recarga do Markdown preservam os estilos, espaços nas bordas, crases e caracteres literais.
- Formatar um `.txt` ativa Markdown e mostra um aviso, sem renomear o arquivo nem salvar silenciosamente.
- Cinco temas persistidos e fronteiras de horário local verificadas em cada transição. Os períodos cobrem as 24 horas, com durações de quatro ou cinco horas.
- Seletor de idiomas com seis bandeiras locais, teclado e clique externo; Escape fecha primeiro a lista e mantém as configurações abertas.
- Ajuda apresenta os atalhos e encaminha apenas aos destinos públicos definidos. Falha ao abrir o navegador mostra mensagem no diálogo.

## Conferência na prévia

Prévia da compilação de produção em navegador, separada do aplicativo instalado. Conferidos o tema Manhã, posição do botão Abrir, bandeiras, ajuda e formatação visual de código. No exemplo com fonte de 15 px, cada item de lista teve 27,75 px de altura e margens de parágrafo iguais a zero. Um quarto item criado com Enter manteve a mesma medida e o mesmo intervalo dos anteriores.

## Distribuição

A 0.10.0 ainda precisa ser compilada e examinada pelo workflow **Preparar release Windows**, assinada localmente e publicada após a conferência dos relatórios. O instalador público 0.9.1 não foi substituído por este trabalho de desenvolvimento. O bloqueio do pacote antigo 0.9.0 permanece.
