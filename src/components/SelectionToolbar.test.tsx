// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Editor } from '@tiptap/core';
import { expect, it, vi } from 'vitest';
import { visualExtensions, visualFormat } from '../visualMarkdown';
import { SelectionToolbar } from './SelectionToolbar';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
it('formats the retained visual selection and hides on collapse or Escape dismissal', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const area = document.createElement('div');
  area.className = 'visual-editor';
  document.body.append(area);
  const editor = new Editor({
    element: area,
    extensions: visualExtensions(),
    content: 'Uma ideia boa',
    contentType: 'markdown',
  });
  const root = createRoot(host);
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => new DOMRect(40, 100, 80, 20),
  });
  Object.defineProperty(Range.prototype, 'getClientRects', {
    configurable: true,
    value: () => [new DOMRect(40, 100, 80, 20)],
  });
  vi.spyOn(area, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 800, 600));
  try {
    editor.view.dom.focus();
    editor.commands.setTextSelection({ from: 5, to: 10 });
    act(() =>
      root.render(
        <SelectionToolbar
          visual={editor}
          enabled
          revision={1}
          onFormat={(action) => visualFormat(editor, action)}
        />,
      ),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    const bold = document.querySelector<HTMLButtonElement>('[aria-label="Negrito na seleção"]')!;
    expect(bold).not.toBeNull();
    const mouse = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    await act(async () => {
      bold.dispatchEvent(mouse);
      bold.click();
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    expect(mouse.defaultPrevented).toBe(true);
    expect(editor.getMarkdown()).toBe('Uma **ideia** boa');
    await act(async () => window.dispatchEvent(new Event('lume-dismiss-formatting')));
    expect(document.querySelector('.selection-toolbar')).toBeNull();
    await act(async () => {
      editor.commands.setTextSelection(1);
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    await act(async () => {
      editor.commands.setTextSelection({ from: 5, to: 10 });
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    expect(document.querySelector('.selection-toolbar')).not.toBeNull();
  } finally {
    act(() => root.unmount());
    editor.destroy();
    host.remove();
    area.remove();
    vi.restoreAllMocks();
  }
});
