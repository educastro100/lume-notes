# Desenvolvimento

O Lume Notes usa Tauri 2 e Rust no desktop, React e TypeScript na interface Tiptap para edição visual e CodeMirror 6 para edição de código. Consulte os pré-requisitos de instalação no README.

```powershell
npm ci
npm run tauri -- dev
```

Antes de entregar uma alteração:

```powershell
npm test
npm run build
npm run format:check
cargo test --manifest-path src-tauri/Cargo.toml --release
```

Mudanças na sessão precisam manter a recuperação das versões anteriores. Alterações em formatação precisam preservar a seleção e o histórico de desfazer. Confira a rolagem com um documento longo e teste os cinco temas na janela desktop.

Não inclua rascunhos pessoais, sessões locais, dependências instaladas ou executáveis de compilação no repositório. Os arquivos de lock fazem parte do código-fonte.

## Contribuições e licença

As contribuições ao código próprio do Lume seguem a licença MIT do projeto. Dependências mantêm seus avisos originais. Abra um pull request com uma descrição do comportamento alterado e da validação realizada. Não adicione tokens, chaves de assinatura ou relatórios pessoais a issues e commits.

Para adicionar um idioma, confira todos os textos e preserve os marcadores como `{name}` e `{count}`. Espanhol usa `src/translations.es.json`; os demais idiomas adicionais estão em `src/translations.json`.

Grupos usam o formato de sessão existente: a ordem do array é a ordem visual. Reordenar não deve modificar a associação das notas nem o estado de recolhimento.
