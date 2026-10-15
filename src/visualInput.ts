import { Extension, type Editor } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { closeHistory, isHistoryTransaction } from '@tiptap/pm/history';

export function indentVisual(editor: Editor, backwards = false) {
  if (editor.isActive('listItem')) {
    backwards ? editor.commands.liftListItem('listItem') : editor.commands.sinkListItem('listItem');
    return true;
  }
  if (editor.isActive('taskItem')) {
    backwards ? editor.commands.liftListItem('taskItem') : editor.commands.sinkListItem('taskItem');
    return true;
  }
  const { from, to } = editor.state.selection;
  const changes: { from: number; to: number; text: string }[] = [];
  editor.state.doc.nodesBetween(from, to, (node, pos) => {
    if (!['paragraph', 'heading', 'codeBlock'].includes(node.type.name)) return;
    if (node.type.name === 'codeBlock') {
      const text = node.textContent;
      const lineStart = text.slice(0, Math.max(0, from - pos - 1)).lastIndexOf('\n') + 1;
      const end = Math.min(text.length, Math.max(lineStart, to - pos - 1));
      let index = lineStart;
      do {
        const at = pos + 1 + index;
        const remove = text.slice(index).match(/^(?:\t| {1,2})/)?.[0].length || 0;
        if (!backwards || remove)
          changes.push({
            from: at,
            to: at + (backwards ? remove : 0),
            text: backwards ? '' : '\t',
          });
        index = text.indexOf('\n', index) + 1;
      } while (index > 0 && index <= end);
      return false;
    }
    // NBSP indentation survives Markdown reload without turning paragraphs into code blocks.
    const prefix = node.textContent.match(/^\u00a0*/)?.[0].length || 0;
    if (backwards && prefix)
      changes.push({ from: pos + 1, to: pos + 1 + Math.min(4, prefix), text: '' });
    else if (!backwards && prefix < 24)
      changes.push({ from: pos + 1, to: pos + 1, text: '\u00a0'.repeat(4) });
    return false;
  });
  if (changes.length) {
    const transaction = editor.state.tr;
    for (const change of changes.reverse()) {
      if (change.text) transaction.insertText(change.text, change.from, change.to);
      else transaction.delete(change.from, change.to);
    }
    editor.view.dispatch(transaction.scrollIntoView());
  }
  return true;
}

export const VisualInput = Extension.create({
  name: 'lumeVisualInput',
  priority: 1100,
  addKeyboardShortcuts() {
    return {
      Tab: () => indentVisual(this.editor),
      'Shift-Tab': () => indentVisual(this.editor, true),
    };
  },
  addProseMirrorPlugins() {
    let composition: number | undefined;
    return [
      new Plugin({
        filterTransaction(transaction) {
          if (
            transaction.docChanged &&
            !isHistoryTransaction(transaction) &&
            transaction.getMeta('addToHistory') !== false
          ) {
            const next = transaction.getMeta('composition');
            if (next === undefined || next !== composition) closeHistory(transaction);
            composition = next;
          }
          return true;
        },
      }),
    ];
  },
});
