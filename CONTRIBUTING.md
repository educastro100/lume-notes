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

Mudanças na sessão precisam manter a recuperação das versões anteriores. Alterações em formatação precisam preservar a seleção e o histórico de desfazer. Confira a rolagem com um documento longo e teste os quatro temas na janela desktop.

Não inclua rascunhos pessoais, sessões locais, dependências instaladas ou executáveis de compilação no repositório. Os arquivos de lock fazem parte do código-fonte.
