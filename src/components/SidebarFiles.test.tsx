// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { it, expect, vi } from 'vitest';
import { SidebarFiles } from './SidebarFiles';
import { newDocument } from '../documents';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
it('shows Save for unsaved drafts and modified files, hides it for clean saved files and restores it after editing', () => {
  const host = document.createElement('div'),
    root = createRoot(host);
  const clean = { ...newDocument('saved.md', 'text'), path: 'C:/saved.md', digest: 'hash' };
  const draft = newDocument('draft.md');
  const dirty = { ...clean, id: 'dirty', name: 'dirty.md', content: 'changed' };
  const actions = {
    onSelect: vi.fn(),
    onClose: vi.fn(),
    onSave: vi.fn(),
    onAssign: vi.fn(),
    onNewGroup: vi.fn(),
    onToggleGroup: vi.fn(),
    onEditGroup: vi.fn(),
    onRemoveGroup: vi.fn(),
    onChooseIcon: vi.fn(),
  };
  const render = (saved = clean) =>
    act(() =>
      root.render(
        <SidebarFiles
          {...actions}
          tabs={[saved, draft, dirty]}
          groups={[]}
          activeId={clean.id}
          selectedIds={[clean.id]}
          busy={false}
        />,
      ),
    );
  render();
  expect(host.querySelector('[aria-label="Salvar saved.md pelo painel"]')).toBeNull();
  expect(host.querySelector('[aria-label="Salvar draft.md pelo painel"]')).not.toBeNull();
  expect(host.querySelector('[aria-label="Salvar dirty.md pelo painel"]')).not.toBeNull();
  render({ ...clean, content: 'edited' });
  expect(host.querySelector('[aria-label="Salvar saved.md pelo painel"]')).not.toBeNull();
  expect(host.querySelectorAll('.file-row-actions button:last-child')).toHaveLength(3);
  act(() => root.unmount());
});
