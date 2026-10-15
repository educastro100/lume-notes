import { t } from './i18n';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { Underline } from '@tiptap/extension-underline';
import { TableKit } from '@tiptap/extension-table';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import type { Editor } from '@tiptap/core';
import type { FormatAction } from './formatting';
import { VisualSearch, visualMatches } from './visualSearch';
import { VisualInput } from './visualInput';

export function visualExtensions() {
  return [
    VisualInput,
    VisualSearch,
    StarterKit.configure({
      underline: false,
      trailingNode: false,
      undoRedo: { depth: 2000, newGroupDelay: 0 },
      link: { openOnClick: false, autolink: false },
    }),
    Underline.extend({
      renderMarkdown: (node, helpers) => `<u>${helpers.renderChildren(node)}</u>`,
    }),
    TableKit.configure({ table: { resizable: false } }),
    TaskList,
    TaskItem.configure({
      nested: true,
      a11y: {
        checkboxLabel: (node) => t('Tarefa: {name}', { name: node.textContent || t('Sem título') }),
      },
    }),
    Markdown.configure({ markedOptions: { gfm: true } }),
  ];
}

// Preserve uncommon syntax in the source editor instead of silently discarding it on a visual edit.
export function needsSourceEditing(text: string) {
  const prose = text
    .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, '')
    .replace(/`[^`\n]*`/g, '');
  return (
    /^---\n[\s\S]*?\n---(?:\n|$)/.test(prose) ||
    /!\[|^\s*\[[^\]]+\]:|\[\^[^\]]+\]|\$\$|<!--|<(?!\/?u\s*>)[A-Za-z/][^>]*>/m.test(prose)
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
