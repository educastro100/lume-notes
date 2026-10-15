// @vitest-environment jsdom
import { Editor } from '@tiptap/core';
import { describe, it, expect } from 'vitest';
import { visualExtensions, findVisual } from './visualMarkdown';
import { visualMatches, visualSearchKey } from './visualSearch';

describe('visual search', () => {
  it('highlights every occurrence while typing, including across formatting, without changing the note or its undo history', () => {
    const editor = new Editor({
      extensions: visualExtensions(),
      content: 'Hello **world**, hello world.',
      contentType: 'markdown',
    });
    const before = editor.getMarkdown();
    editor.view.dispatch(
      editor.state.tr.setMeta(visualSearchKey, 'hello world').setMeta('addToHistory', false),
    );
    const matches = visualMatches(editor.state.doc, 'hello world');
    expect(matches).toHaveLength(2);
    expect(editor.view.dom.querySelectorAll('.search-match').length).toBeGreaterThanOrEqual(2);
    expect(editor.getMarkdown()).toBe(before);
    expect(editor.can().undo()).toBe(false);
    expect(findVisual(editor, 'hello world')).toBe(true);
    expect(editor.view.dom.querySelector('.current-search-match')).not.toBeNull();
    editor.commands.insertContent('Changed');
    expect(visualMatches(editor.state.doc, 'hello world')).toHaveLength(1);
    editor.view.dispatch(editor.state.tr.setMeta(visualSearchKey, ''));
    expect(editor.view.dom.querySelector('.search-match')).toBeNull();
    editor.destroy();
  });
  it('treats regular-expression symbols as literal text and does not span separate paragraphs', () => {
    const editor = new Editor({
      extensions: visualExtensions(),
      content: '<p>[a.*] test</p><p>next</p>',
    });
    expect(visualMatches(editor.state.doc, '[a.*]')).toHaveLength(1);
    expect(visualMatches(editor.state.doc, 'testnext')).toHaveLength(0);
    expect(findVisual(editor, 'missing')).toBe(false);
    editor.destroy();
  });
  it('wraps forward and backward through matches and handles Unicode offsets', () => {
    const editor = new Editor({ extensions: visualExtensions(), content: '<p>İ 👋 αλφα αλφα</p>' });
    const matches = visualMatches(editor.state.doc, 'αλφα');
    editor.commands.setTextSelection(1);
    findVisual(editor, 'αλφα');
    expect(editor.state.selection.from).toBe(matches[0].from);
    findVisual(editor, 'αλφα');
    expect(editor.state.selection.from).toBe(matches[1].from);
    findVisual(editor, 'αλφα');
    expect(editor.state.selection.from).toBe(matches[0].from);
    findVisual(editor, 'αλφα', true);
    expect(editor.state.selection.from).toBe(matches[1].from);
    expect(
      editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to),
    ).toBe('αλφα');
    editor.destroy();
  });
});
