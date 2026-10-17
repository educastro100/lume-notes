// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { visualExtensions, visualFormat, needsSourceEditing, findVisual } from './visualMarkdown';
const editors: Editor[] = [];
function create(content: string) {
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
describe('visual Markdown editing', () => {
  it('combines inline code with emphasis in either order and preserves the result on reload', () => {
    for (const action of ['bold', 'italic', 'underline'] as const) {
      for (const codeFirst of [true, false]) {
        const editor = create('Palavra');
        editor.commands.selectAll();
        visualFormat(editor, codeFirst ? 'code' : action);
        visualFormat(editor, codeFirst ? action : 'code');
        expect(editor.isActive('code')).toBe(true);
        expect(editor.isActive(action)).toBe(true);
        const reopened = create(editor.getMarkdown());
        expect(reopened.getJSON()).toEqual(editor.getJSON());
        visualFormat(editor, action);
        expect(editor.isActive('code')).toBe(true);
        expect(editor.isActive(action)).toBe(false);
      }
    }
  });
  it('keeps bold, italic and underline together on code, including part of a code span', () => {
    const editor = create('`Uma palavra aqui`');
    editor.commands.setTextSelection({ from: 5, to: 12 });
    for (const action of ['bold', 'italic', 'underline'] as const) visualFormat(editor, action);
    expect(editor.isActive('code')).toBe(true);
    expect(create(editor.getMarkdown()).getJSON()).toEqual(editor.getJSON());
  });
  it('preserves literal code characters, backticks and edge spaces when combining styles', () => {
    for (const text of [' a ', ' a', 'a ', '   ', '`tick`', '**literal** <u>x</u>', 'x & y']) {
      const editor = create('');
      editor.commands.setContent({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text, marks: [{ type: 'code' }] }] },
        ],
      });
      editor.commands.selectAll();
      visualFormat(editor, 'bold');
      expect(create(editor.getMarkdown()).getJSON()).toEqual(editor.getJSON());
    }
  });
  it('renders source markers as editable semantic content', () => {
    const editor = create(
      '**Forte** e *suave* com `código`\n\n---\n\n- um\n- dois\n\n1. primeiro\n2. segundo',
    );
    expect(editor.getHTML()).toContain('<strong>Forte</strong>');
    expect(editor.getHTML()).toContain('<em>suave</em>');
    expect(editor.getHTML()).toContain('<code>código</code>');
    expect(editor.getHTML()).toContain('<ul>');
    expect(editor.getHTML()).toContain('<ol>');
    expect(editor.getHTML()).toContain('<hr>');
  });
  it('keeps underline through visual edits and Markdown reload', () => {
    const editor = create('Uma <u>ideia</u> boa');
    expect(editor.getHTML()).toContain('<u>ideia</u>');
    editor.commands.setTextSelection({ from: 5, to: 10 });
    visualFormat(editor, 'bold');
    const saved = editor.getMarkdown();
    expect(saved).toContain('<u>');
    const reopened = create(saved);
    expect(reopened.getJSON()).toEqual(editor.getJSON());
  });
  it('formats the selection, saves Markdown and supports undo/redo', () => {
    const editor = create('Olá mundo 🌻');
    editor.commands.setTextSelection({ from: 5, to: 10 });
    visualFormat(editor, 'bold');
    expect(editor.getMarkdown()).toBe('Olá **mundo** 🌻');
    editor.commands.undo();
    expect(editor.getMarkdown()).toBe('Olá mundo 🌻');
    editor.commands.redo();
    expect(editor.getMarkdown()).toBe('Olá **mundo** 🌻');
  });
  it('creates bullet and numbered lists with real editor commands', () => {
    const editor = create('Item');
    editor.commands.selectAll();
    visualFormat(editor, 'bullet');
    expect(editor.getMarkdown()).toMatch(/^[-*] Item/);
    visualFormat(editor, 'ordered');
    expect(editor.getMarkdown()).toMatch(/^1\. Item/);
  });
  it('preserves task lists, tables and fenced code', () => {
    const editor = create(
      '- [x] Feito\n- [ ] Pendente\n\n| A | B |\n| --- | --- |\n| um | dois |\n\n```ts\nconst x = 1;\n```',
    );
    const md = editor.getMarkdown();
    expect(md).toContain('[x] Feito');
    expect(md).toContain('[ ] Pendente');
    expect(md).toContain('dois');
    expect(md).toContain('```ts');
    expect(create(md).getJSON()).toEqual(editor.getJSON());
  });
  it('finds a word spanning inline formatting and selects its true document positions', () => {
    const editor = create('Olá **mun**do');
    expect(findVisual(editor, 'mundo')).toBe(true);
    const { from, to } = editor.state.selection;
    expect(editor.state.doc.textBetween(from, to)).toBe('mundo');
    expect(findVisual(editor, 'ausente')).toBe(false);
  });
  it('keeps advanced syntax in the source editor while permitting underline and code', () => {
    expect(needsSourceEditing('![imagem](foto.png)')).toBe(true);
    expect(needsSourceEditing('---\ntitle: Nota\n---\nTexto')).toBe(true);
    expect(needsSourceEditing('<section>não perder</section>')).toBe(true);
    expect(needsSourceEditing('Uma <u>ideia</u>\n\n```html\n<div>código</div>\n```')).toBe(false);
  });
});

it('keeps repeated dollar signs in visual editing and round-trips them unchanged', () => {
  for (const content of ['Preço: R$ 40 e $$$$', '$$\ntexto\n$$', 'Cifrões $$$ no meio']) {
    expect(needsSourceEditing(content)).toBe(false);
    const editor = create(content);
    expect(create(editor.getMarkdown()).getJSON()).toEqual(editor.getJSON());
    expect(editor.getText()).toContain('$$');
  }
  const editor = create('Valor ');
  editor.commands.insertContentAt(editor.state.doc.content.size - 1, '$$$$');
  expect(needsSourceEditing(editor.getMarkdown())).toBe(false);
  expect(editor.getText()).toContain('$$$$');
  editor.commands.undo();
  expect(editor.getText()).not.toContain('$');
});
