// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import { visualExtensions } from './visualMarkdown';
import { indentVisual } from './visualInput';
const editors: Editor[] = [];
function create(content = '') {
  const editor = new Editor({
    element: document.createElement('div'),
    extensions: visualExtensions(),
    content,
    contentType: 'markdown',
  });
  editors.push(editor);
  return editor;
}
afterEach(() => editors.splice(0).forEach((editor) => editor.destroy()));
describe('visual typing history and indentation', () => {
  it('undoes and redoes digits 1 through 6 and their paragraph breaks one action at a time', () => {
    const editor = create();
    const snapshots = [''];
    for (let i = 1; i <= 6; i++) {
      editor.commands.insertContent(String(i));
      snapshots.push(editor.getText({ blockSeparator: '\n' }));
      if (i < 6) {
        editor.commands.splitBlock();
        snapshots.push(editor.getText({ blockSeparator: '\n' }));
      }
    }
    for (let index = snapshots.length - 2; index >= 0; index--) {
      expect(editor.commands.undo()).toBe(true);
      expect(editor.getText({ blockSeparator: '\n' })).toBe(snapshots[index]);
    }
    for (let index = 1; index < snapshots.length; index++) {
      expect(editor.commands.redo()).toBe(true);
      expect(editor.getText({ blockSeparator: '\n' })).toBe(snapshots[index]);
    }
  });
  it('keeps a pasted phrase as one undo action', () => {
    const editor = create();
    editor.commands.insertContent('texto colado 🌻');
    editor.commands.undo();
    expect(editor.getText()).toBe('');
    editor.commands.redo();
    expect(editor.getText()).toBe('texto colado 🌻');
  });
  it('indents paragraphs with Tab and reverses with Shift+Tab without becoming a code block on reload', () => {
    const editor = create('Uma ideia');
    editor.commands.setTextSelection(1);
    indentVisual(editor);
    expect(editor.getText()).toBe('\u00a0'.repeat(4) + 'Uma ideia');
    expect(create(editor.getMarkdown()).getJSON()).toEqual(editor.getJSON());
    indentVisual(editor, true);
    expect(editor.getMarkdown()).toBe('Uma ideia');
  });
  it('indents and outdents the selected paragraphs together', () => {
    const editor = create('um\n\ndois');
    editor.commands.selectAll();
    indentVisual(editor);
    editor.state.doc.forEach((node) =>
      expect(node.textContent.startsWith('\u00a0'.repeat(4))).toBe(true),
    );
    indentVisual(editor, true);
    expect(editor.getMarkdown()).toBe('um\n\ndois');
  });
  it('nests the second list item and lifts it back', () => {
    const editor = create('- Um\n- Dois');
    let position = 1;
    editor.state.doc.descendants((node, pos) => {
      if (node.text === 'Dois') position = pos;
    });
    editor.commands.setTextSelection(position);
    indentVisual(editor);
    expect(editor.state.doc.firstChild!.firstChild!.child(1).type.name).toBe('bulletList');
    indentVisual(editor, true);
    expect(editor.state.doc.firstChild!.childCount).toBe(2);
  });
  it('indents code lines with real tabs and removes them', () => {
    const editor = create('```ts\nconst a = 1;\nconst b = 2;\n```');
    editor.commands.selectAll();
    indentVisual(editor);
    expect(editor.getText()).toBe('\tconst a = 1;\n\tconst b = 2;');
    indentVisual(editor, true);
    expect(editor.getText()).toBe('const a = 1;\nconst b = 2;');
  });
});
