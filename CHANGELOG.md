# Lume Notes 0.7.0

- Botão de foco ao lado de Salvar, com transição breve de desfoque e suporte a movimento reduzido.
- Configurações com entrada/saída suave, foco de teclado restaurado e reabertura rápida sem desmontagem indevida.
- Botão Salvar na lateral apenas para notas novas ou arquivos com alterações pendentes.
- Título editável no cabeçalho: Enter/check confirma, Esc cancela. Rascunhos recuperam o título e o usam como nome sugerido ao salvar. Arquivos locais são renomeados na mesma pasta, preservando extensão, codificação, conteúdo e alterações ainda não salvas. Nomes inválidos, conflitos e mudanças externas são bloqueados.
- Corrigidos atalhos de formatação interferindo na busca e fechamento que podia descartar edições feitas durante um salvamento.
- Abertura de aliases do mesmo arquivo é deduplicada; abrir um arquivo existente em grupo recolhido revela seu grupo.

# Lume Notes 0.6.0

- Fechamento da última nota permite uma sessão vazia, restaurada na próxima abertura.
- Busca visual destaca todas as ocorrências ao digitar, inclusive através de negrito e itálico; próximo/anterior mantém o destaque atual sem exigir foco no editor.
- Configurações no canto inferior esquerdo, com idiomas Português, English, Français, Deutsch, Ελληνικά e 简体中文. Preferência persistida; nomes e textos das notas preservados.
- Modo foco com transição suave: botão no topo ou F8; Esc/F8 ou botão discreto para sair. Mantém editores e histórico montados.
- Tema Madrugada em azul e lavanda, transição gradual das cores e ícones que deslizam entre fases do dia. Respeita a preferência do sistema por movimento reduzido.
- Menu Arquivo com documento e pequena engrenagem.

# Changelog

## 0.5.0

- Tab e Shift+Tab na edição visual: recuo de parágrafos, níveis de lista e tabulação em código. Parágrafos usam espaços inseparáveis para preservar o recuo sem virar blocos de código ao reabrir Markdown.
- Desfazer/refazer separa teclas e quebras de linha nos dois editores. Colagens e formatações continuam como ações únicas; composição de texto é preservada.
- Quebra automática de linha passa a controlar também a edição visual e a prévia. Desativada, permite rolagem horizontal.
- Seleção de texto acompanha a paleta do tema. X menor no canto superior do cabeçalho e engrenagem no menu Arquivo.
- Destinos de arraste usam um fundo suave da cor do grupo, sem pontilhado sobre a linha colorida.
- Temas Dia, Tarde (pôr do sol) e Noite; paleta de grupos ampliada para 12 cores.
- Scroll sobre o controle de fonte ajusta seu tamanho entre 11 e 28 px.
- Divisórias redimensionam o painel lateral e o split com limites adaptados à janela, suporte ao teclado e duplo clique para restaurar.
- Fonte, quebra de linha e proporções dos painéis ficam salvas, junto ao tema escolhido.

## 0.4.0

- Edição visual de Markdown como padrão, com Tiptap/ProseMirror. Negrito, itálico, código, sublinhado, listas com marcadores e listas numeradas são editados com a formatação visível.
- Modo Código Markdown com opção de split. A escolha de modo e split fica salva por documento. Sublinhado é gravado como `<u>…</u>`.
- Conteúdo com sintaxe adicional (como imagens, HTML personalizado e notas de rodapé) permanece no editor de código para preservar os detalhes. Apenas abrir ou trocar de modo não reescreve o texto; uma edição visual pode normalizar os marcadores e espaços do Markdown.
- Busca e substituição no editor visual, com histórico de desfazer/refazer por aba durante a sessão. O editor de código mantém sua busca avançada.
- Desfazer e refazer como ícones ao lado da busca; menu Arquivo compacto e X no cabeçalho do documento, com confirmação para notas ainda não salvas.
- Seleção com Shift (intervalo) e Ctrl (individual), com criação e movimentação de grupos em lote pelo menu ⋯. O arraste carrega os arquivos selecionados.
- Destaque de arraste apenas sobre o destino sob o ponteiro, com transições suaves para abrir e recolher grupos, inclusive nas abas superiores. Respeita movimento reduzido do sistema.
- Testes de conversão e interação com o editor visual, seleção, arraste e migração. Atualização do runner de testes.

## 0.3.0

- Novas notas sem salvar já usam Markdown (.md), com a prévia aberta. Formatar também abre a prévia.
- Arrastar uma aba para fora dos grupos, na área sem grupo da faixa de abas ou do painel, remove sua associação. Durante o arraste, a área de destino fica destacada.
- Oito ícones por documento: Documento, Trabalho, Estudos, Ideias, Código, Tarefas, Pessoal e Música. Escolha pelo ícone ao lado do título ou pelo menu ⋯ da nota. A seleção acompanha as abas e fica na sessão, sem alterar o conteúdo do arquivo.
- Compatibilidade com sessões anteriores, com ícone padrão para documentos antigos.
- Número completo da versão no painel e no título da janela para facilitar a identificação do executável.

## 0.2.0

- Botões de salvar e fechar ao lado de cada arquivo no painel lateral. Fechar uma nota alterada mantém o aviso de salvar, descartar ou cancelar.
- Rolagem vertical do editor corrigida, com barra visível e suporte ao scroll do mouse em textos grandes.
- Barra de formatação Markdown: negrito, itálico, código em linha ou bloco e linha divisória. A prévia mostra o resultado formatado ao lado do texto.
- Grupos de abas com nome, cor, recolhimento, edição e desagrupamento. Mover arquivos pelo menu do painel ou arrastando as abas para um grupo.
- Grupos e associações são recuperados com os rascunhos. Sessões da versão 0.1 são migradas sem alterar o conteúdo dos documentos.
- Nomes distintos para notas sem título, melhor contraste no tema escuro e código organizado em componentes.

## 0.1.0

- Primeira versão: editor local com abas, abertura e gravação de texto, busca/substituição, temas e recuperação de rascunhos.
