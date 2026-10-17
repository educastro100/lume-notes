import { t } from './i18n';
import StarterKit from '@tiptap/starter-kit';
import { Code } from '@tiptap/extension-code';
import { Markdown } from '@tiptap/markdown';
import { Underline } from '@tiptap/extension-underline';
import { TableKit } from '@tiptap/extension-table';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { Mark, type Editor, type JSONContent } from '@tiptap/core';
import type { FormatAction } from './formatting';
import { VisualSearch, visualMatches } from './visualSearch';
import { VisualInput } from './visualInput';

// Serialize code as a complete literal span inside its emphasis. The upstream
// mark-boundary serializer otherwise places emphasis markers inside a longer
// code span and moves its leading/trailing spaces outside the backticks.
const CodeLiteral = Mark.create({
  name: 'lumeCodeLiteral',
  code: true,
  renderHTML: () => ['code', 0],
  renderMarkdown: (node, helpers) => helpers.renderChildren(node.content || []),
});
function literalCode(node: JSONContent): JSONContent {
  if (node.type === 'text' && node.marks?.some((mark) => mark.type === 'code')) {
    const text = node.text || '';
    const fence = '`'.repeat(
      Math.max(0, ...Array.from(text.matchAll(/`+/g), (match) => match[0].length)) + 1,
    );
    const padding = text.trim() && /^[ `]|[ `]$/.test(text) ? ' ' : '';
    return {
      ...node,
      text: `${fence}${padding}${text}${padding}${fence}`,
      marks: node.marks.map((mark) => (mark.type === 'code' ? { type: 'lumeCodeLiteral' } : mark)),
    };
  }
  return {
    ...node,
    ...(node.content && { content: node.content.map(literalCode) }),
  };
}
const LumeMarkdown = Markdown.extend({
  onBeforeCreate(event) {
    this.parent?.(event);
    this.editor.getMarkdown = () =>
      this.storage.manager.serialize(literalCode(this.editor.getJSON()));
  },
});

export function visualExtensions() {
  return [
    VisualInput,
    VisualSearch,
    StarterKit.configure({
      code: false,
      underline: false,
      trailingNode: false,
      undoRedo: { depth: 2000, newGroupDelay: 0 },
      link: { openOnClick: false, autolink: false },
    }),
    Code.extend({ excludes: '', priority: 50 }),
    CodeLiteral,
    Underline.extend({
      renderMarkdown: (node, helpers) => `<u>${helpers.renderChildren(node)}</u>`,
      markdownTokenizer: {
        name: 'underline',
        level: 'inline',
        start: (source) => {
          const starts = [source.indexOf('<u>'), source.indexOf('++')].filter((at) => at >= 0);
          return starts.length ? Math.min(...starts) : -1;
        },
        tokenize(source, _tokens, lexer) {
          const match = /^(?:<u>([\s\S]+?)<\/u>|\+\+([\s\S]+?)\+\+)/.exec(source);
          if (!match) return undefined;
          const text = match[1] ?? match[2];
          return { type: 'underline', raw: match[0], text, tokens: lexer.inlineTokens(text) };
        },
      },
    }),
    TableKit.configure({ table: { resizable: false } }),
    TaskList,
    TaskItem.configure({
      nested: true,
      a11y: {
        checkboxLabel: (node) => t('Tarefa: {name}', { name: node.textContent || t('Sem título') }),
      },
    }),
    LumeMarkdown.configure({ markedOptions: { gfm: true } }),
  ];
}

// Preserve uncommon syntax in the source editor instead of silently discarding it on a visual edit.
export function needsSourceEditing(text: string) {
  const prose = text
    .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, '')
    .replace(/`[^`\n]*`/g, '');
  return (
    /^---\n[\s\S]*?\n---(?:\n|$)/.test(prose) ||
    /!\[|^\s*\[[^\]]+\]:|\[\^[^\]]+\]|<!--|<(?!\/?u\s*>)[A-Za-z/][^>]*>/m.test(prose)
  );
}

export function visualFormat(editor: Editor, action: FormatAction) {
  const chain = editor.chain().focus();
  if (action === 'bold') return chain.toggleBold().run();
  if (action === 'italic') return chain.toggleItalic().run();
  if (action === 'underline') return chain.toggleUnderline().run();
  if (action === 'bullet') return chain.toggleBulletList().run();
  if (action === 'ordered') return chain.toggleOrderedList().run();
  if (action === 'rule') return chain.setHorizontalRule().run();
  const { from, to } = editor.state.selection;
  return editor.state.doc.textBetween(from, to, '\n').includes('\n') || editor.isActive('codeBlock')
    ? chain.toggleCodeBlock().run()
    : chain.toggleCode().run();
}

export function findVisual(editor: Editor, query: string, backwards = false) {
  const matches = visualMatches(editor.state.doc, query);
  if (!matches.length) return false;
  const { from, to } = editor.state.selection;
  const match = backwards
    ? [...matches].reverse().find((match) => match.to <= from) || matches.at(-1)!
    : matches.find((match) => match.from >= to) || matches[0];
  editor.commands.setTextSelection(match);
  editor.commands.scrollIntoView();
  return true;
}
