import { describe, expect, it } from 'vitest';
import { formatEdit } from './formatting';
function apply(text: string, from: number, to: number, action: Parameters<typeof formatEdit>[3]) {
  const edit = formatEdit(text, from, to, action);
  return { text: text.slice(0, edit.from) + edit.insert + text.slice(edit.to), edit };
}
describe('Markdown formatting', () => {
  it('turns selected lines into a list and can toggle it off', () => {
    expect(apply('um\ndois', 0, 7, 'bullet').text).toBe('- um\n- dois');
    expect(apply('- um\n- dois', 0, 11, 'bullet').text).toBe('um\ndois');
    expect(apply('- um\n- dois', 0, 11, 'ordered').text).toBe('1. um\n2. dois');
  });
  it('uses the whole current line for a list at an empty cursor', () => {
    expect(apply('antes\nitem\ndepois', 8, 8, 'ordered').text).toBe('antes\n1. item\ndepois');
  });
  it('roundtrips underline without using nonstandard Markdown markers', () => {
    const result = apply('café', 0, 4, 'underline');
    expect(result.text).toBe('<u>café</u>');
    expect(apply(result.text, result.edit.anchor, result.edit.head, 'underline').text).toBe('café');
  });
  it('wraps selected text without touching surrounding content', () => {
    const result = apply('Olá mundo!', 4, 9, 'bold');
    expect(result.text).toBe('Olá **mundo**!');
    expect(result.text.slice(result.edit.anchor, result.edit.head)).toBe('mundo');
  });
  it('toggles bold off for an already wrapped selection', () =>
    expect(apply('Olá **mundo**!', 6, 11, 'bold').text).toBe('Olá mundo!'));
  it('adds and toggles italic without destroying bold markers', () => {
    const italic = apply('**texto**', 2, 7, 'italic');
    expect(italic.text).toBe('***texto***');
    expect(apply(italic.text, italic.edit.anchor, italic.edit.head, 'italic').text).toBe(
      '**texto**',
    );
  });
  it('inserts a selected placeholder at an empty cursor', () => {
    const result = apply('', 0, 0, 'italic');
    expect(result.text).toBe('*texto*');
    expect(result.text.slice(result.edit.anchor, result.edit.head)).toBe('texto');
  });
  it('uses longer code delimiters for text containing backticks', () =>
    expect(apply('a`b', 0, 3, 'code').text).toBe('``a`b``'));
  it('fences multiline code without terminating nested fences', () => {
    const source = 'const x=1;\n```';
    const result = apply(source, 0, source.length, 'code');
    expect(result.text).toBe('````\nconst x=1;\n```\n````\n');
  });
  it('separates a horizontal rule from both paragraphs', () =>
    expect(apply('AntesDepois', 5, 5, 'rule').text).toBe('Antes\n\n---\n\nDepois'));
  it('keeps accent and emoji bytes unchanged outside a formatting edit', () =>
    expect(apply('🌻 café', 3, 7, 'bold').text).toBe('🌻 **café**'));
});
