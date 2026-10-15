// @vitest-environment jsdom
import { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { VisualEditor } from './VisualEditor';
import { newDocument } from '../documents';
import type { Editor } from '@tiptap/core';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
it('does not rewrite Markdown merely by opening/focusing and keeps undo while hidden', async () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const tab = newDocument('nota.md', '# Título\n\n__texto__\n');
  const onChange = vi.fn();
  let editor: Editor | null = null;
  const props = {
    tab,
    fontSize: 15,
    onChange,
    onEditor: (value: Editor | null) => {
      editor = value;
    },
    onSelection: vi.fn(),
  };
  await act(async () => {
    root.render(
      <StrictMode>
        <VisualEditor {...props} active />
      </StrictMode>,
    );
  });
  await act(async () => {
    await vi.waitFor(() => expect(editor).not.toBeNull());
  });
  expect(onChange).not.toHaveBeenCalled();
  act(() => {
    editor!.commands.selectAll();
    editor!.commands.toggleItalic();
  });
  expect(onChange).toHaveBeenCalled();
  const first = editor;
  await act(async () => {
    root.render(
      <StrictMode>
        <VisualEditor {...props} active={false} />
      </StrictMode>,
    );
  });
  expect(editor).toBe(first);
  expect(editor!.can().undo()).toBe(true);
  act(() => root.unmount());
  container.remove();
});
