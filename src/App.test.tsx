// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { newDocument } from './documents';
import {
  loadDrafts,
  storeDrafts,
  saveDocument,
  openDocuments,
  renameDocument,
  copyContent,
} from './platform';
import { setLanguage } from './i18n';
import App from './App';
vi.mock('./platform', () => ({
  native: false,
  copyContent: vi.fn().mockResolvedValue(undefined),
  loadDrafts: vi.fn(),
  storeDrafts: vi.fn().mockResolvedValue(undefined),
  openDocuments: vi.fn().mockResolvedValue([]),
  saveDocument: vi.fn(),
  renameDocument: vi.fn(async (tab, name) => ({ name, path: tab.path, digest: tab.digest })),
}));
vi.mock('@uiw/react-codemirror', () => ({ default: () => <div data-editor="source" /> }));
const editorHarness = vi.hoisted(() => ({ change: null as null | ((value: string) => void) }));
vi.mock('./components/VisualEditor', () => ({
  VisualEditor: (props: { active: boolean; onChange: (value: string) => void }) => {
    if (props.active) editorHarness.change = props.onChange;
    return <div data-editor="visual" />;
  },
}));
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.clearAllMocks();
  localStorage.clear();
  setLanguage('pt-BR');
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const persistDrafts = async () => {
  await act(async () => vi.advanceTimersByTimeAsync(500));
};
const click = async (label: string) => {
  const button = Array.from(host.querySelectorAll('button')).find(
    (node) => node.getAttribute('aria-label') === label || node.textContent === label,
  );
  expect(button, label).toBeDefined();
  await act(async () => button!.click());
};
it('allows closing the last note, confirms an unsaved note, persists zero tabs and can create another', async () => {
  const tab = newDocument('draft.md', 'keep until confirmed');
  vi.mocked(loadDrafts).mockResolvedValue(
    JSON.stringify({ version: 2, tabs: [tab], activeId: tab.id, groups: [] }),
  );
  await act(async () => root.render(<App />));
  await click('Fechar documento atual');
  expect(host.querySelector('[role="dialog"]')).not.toBeNull();
  await click('Cancelar');
  expect(host.querySelector('.empty-workspace')).toBeNull();
  await click('Fechar documento atual');
  await click('Descartar');
  expect(host.querySelector('.empty-workspace')).not.toBeNull();
  expect(host.querySelector('[data-editor]')).toBeNull();
  await act(async () => vi.advanceTimersByTimeAsync(499));
  expect(storeDrafts).not.toHaveBeenCalled();
  await act(async () => vi.advanceTimersByTimeAsync(1));
  expect(storeDrafts).toHaveBeenCalledTimes(1);
  const saved = JSON.parse(vi.mocked(storeDrafts).mock.calls.at(-1)![0]);
  expect(saved.tabs).toEqual([]);
  expect(saved.activeId).toBe('');
  await act(async () => host.querySelector<HTMLButtonElement>('.new-note')!.click());
  expect(host.querySelector('.empty-workspace')).toBeNull();
});
it('restores an empty workspace and switches languages live in settings without changing notes', async () => {
  vi.mocked(loadDrafts).mockResolvedValue(
    JSON.stringify({ version: 2, tabs: [], activeId: '', groups: [] }),
  );
  await act(async () => root.render(<App />));
  expect(host.querySelector('.empty-workspace')).not.toBeNull();
  await click('Configurações');
  await act(async () => {
    const select = host.querySelector<HTMLSelectElement>('#interface-language')!;
    select.value = 'de';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(host.querySelector('#settings-title')?.textContent).toBe('Einstellungen');
  expect(host.querySelector('.empty-workspace h1')?.textContent).toBe('Keine Notiz geöffnet');
  expect(document.documentElement.lang).toBe('de');
  await click('Fertig');
  await act(async () => host.querySelector<HTMLButtonElement>('.new-note')!.click());
  expect(host.querySelector('.document-title-row h1')?.textContent).toBe('Unbenannt');
  await click('Fokusmodus aktivieren');
  expect(host.querySelector('.focus-mode')).not.toBeNull();
  await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
  expect(host.querySelector('.focus-mode')).toBeNull();
});

it('does not format the document when a formatting shortcut is pressed in the search field', async () => {
  const tab = newDocument('draft.md', 'Text');
  vi.mocked(loadDrafts).mockResolvedValue(
    JSON.stringify({ version: 2, tabs: [tab], activeId: tab.id, groups: [] }),
  );
  await act(async () => root.render(<App />));
  await click('Buscar e substituir');
  const input = host.querySelector<HTMLInputElement>('[aria-label="Buscar no documento"]')!;
  for (const key of ['b', 'i', 'u']) {
    const event = new KeyboardEvent('keydown', {
      key,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    await act(async () => input.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(false);
  }
});
it('keeps edits made during a pending save when closing an unsaved note', async () => {
  const tab = newDocument('draft.md', 'first');
  tab.savedContent = '';
  vi.mocked(loadDrafts).mockResolvedValue(
    JSON.stringify({ version: 2, tabs: [tab], activeId: tab.id, groups: [] }),
  );
  let finish!: (result: { name: string; path: null; digest: null }) => void;
  vi.mocked(saveDocument).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await act(async () => root.render(<App />));
  await click('Fechar documento atual');
  await click('Salvar');
  await act(async () => editorHarness.change!('first + typed while saving'));
  await act(async () => finish({ name: 'draft.md', path: null, digest: null }));
  expect(host.querySelector('.empty-workspace')).toBeNull();
  expect(host.querySelector('.toast')?.textContent).toContain('Há novas alterações');
  await persistDrafts();
  const saved = JSON.parse(vi.mocked(storeDrafts).mock.calls.at(-1)![0]);
  expect(saved.tabs[0].content).toBe('first + typed while saving');
  expect(saved.tabs[0].savedContent).toBe('first');
});
it('persists a custom title without changing text, identity or extension', async () => {
  const tab = newDocument('Sem título.md', 'my text');
  vi.mocked(loadDrafts).mockResolvedValue(
    JSON.stringify({ version: 2, tabs: [tab], activeId: tab.id, groups: [] }),
  );
  await act(async () => root.render(<App />));
  await click('Editar título da nota');
  await act(async () => {
    const input = host.querySelector<HTMLInputElement>('[aria-label="Título da nota"]')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
      input,
      'Meu projeto',
    );
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await click('Confirmar título');
  expect(vi.mocked(renameDocument)).toHaveBeenCalledWith(
    expect.objectContaining({ id: tab.id }),
    'Meu projeto.md',
  );
  expect(host.querySelector('.document-title-row h1')?.textContent).toBe('Meu projeto');
  await persistDrafts();
  const saved = JSON.parse(vi.mocked(storeDrafts).mock.calls.at(-1)![0]);
  expect(saved.tabs[0]).toEqual({ ...tab, name: 'Meu projeto.md' });
});
it('deduplicates aliases selected in one open operation and reveals an existing collapsed group', async () => {
  const tab = {
    ...newDocument('first.md', 'first'),
    path: 'C:/notes/first.md',
    digest: 'hash',
    groupId: 'g',
  };
  vi.mocked(loadDrafts).mockResolvedValue(
    JSON.stringify({
      version: 2,
      tabs: [tab],
      activeId: tab.id,
      groups: [{ id: 'g', name: 'Group', color: 'sage', collapsed: true }],
    }),
  );
  vi.mocked(openDocuments).mockResolvedValue([{ ...tab, id: 'alias' }]);
  await act(async () => root.render(<App />));
  await click('Abrir arquivo');
  expect(host.querySelectorAll('[role="tab"]')).toHaveLength(1);
  expect(host.querySelector('[aria-label="Recolher grupo Group"]')).not.toBeNull();
  const next = { ...newDocument('next.md'), path: 'C:/notes/next.md', digest: 'hash' };
  vi.mocked(openDocuments).mockResolvedValue([next, { ...next, id: 'another-alias' }]);
  await click('Abrir arquivo');
  expect(host.querySelectorAll('[role="tab"]')).toHaveLength(2);
});

it('keeps the old title and content when renaming fails', async () => {
  const tab = {
    ...newDocument('original.md', 'unsaved work'),
    path: 'C:/notes/original.md',
    digest: 'old',
  };
  vi.mocked(loadDrafts).mockResolvedValue(
    JSON.stringify({ version: 2, tabs: [tab], activeId: tab.id, groups: [] }),
  );
  vi.mocked(renameDocument).mockRejectedValueOnce(
    new Error('Já existe um arquivo com esse nome nesta pasta.'),
  );
  await act(async () => root.render(<App />));
  await click('Editar título da nota');
  await act(async () => {
    const input = host.querySelector<HTMLInputElement>('[aria-label="Título da nota"]')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
      input,
      'conflict',
    );
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await click('Confirmar título');
  expect(host.querySelector('[aria-label="Título da nota"]')).not.toBeNull();
  expect(host.querySelector('.toast')?.textContent).toContain('Já existe');
  await click('Cancelar edição do título');
  expect(host.querySelector('.document-title-row h1')?.textContent).toBe('original');
  await persistDrafts();
  expect(JSON.parse(vi.mocked(storeDrafts).mock.calls.at(-1)![0]).tabs[0]).toEqual(tab);
});

it('creates tab-strip notes outside the active group and closes empty drafts without a prompt', async () => {
  const tab = { ...newDocument('Grouped.md', 'text'), groupId: 'g' };
  vi.mocked(loadDrafts).mockResolvedValue(
    JSON.stringify({
      version: 2,
      tabs: [tab],
      activeId: tab.id,
      groups: [{ id: 'g', name: 'Group', color: 'mint', collapsed: false }],
    }),
  );
  await act(async () => root.render(<App />));
  await act(async () => host.querySelector<HTMLButtonElement>('.tabbar .add-tab')!.click());
  await persistDrafts();
  const saved = JSON.parse(vi.mocked(storeDrafts).mock.calls.at(-1)![0]);
  expect(saved.tabs.find((item: any) => item.id === saved.activeId).groupId).toBeNull();
  await click('Fechar documento atual');
  expect(host.querySelector('[role="dialog"]')).toBeNull();
  expect(host.querySelectorAll('[role="tab"]')).toHaveLength(1);
});
it('still confirms an emptied saved file and copies the current complete source', async () => {
  const tab = {
    ...newDocument('Saved.md', ''),
    path: 'C:/notes/saved.md',
    savedContent: 'previous',
    digest: 'hash',
  };
  vi.mocked(loadDrafts).mockResolvedValue(
    JSON.stringify({ version: 2, tabs: [tab], activeId: tab.id, groups: [] }),
  );
  await act(async () => root.render(<App />));
  await click('Copiar todo o conteúdo');
  expect(copyContent).toHaveBeenCalledWith('');
  await click('Fechar documento atual');
  expect(host.querySelector('[role="dialog"]')).not.toBeNull();
});
it('reuses the remembered file icon after the tab has been closed', async () => {
  localStorage.setItem('lume.file-icons.v1', JSON.stringify({ 'c:/notes/movie.md': 'film' }));
  vi.mocked(loadDrafts).mockResolvedValue(
    JSON.stringify({ version: 2, tabs: [], activeId: '', groups: [] }),
  );
  vi.mocked(openDocuments).mockResolvedValue([
    { ...newDocument('movie.md', 'text'), path: 'C:/Notes/Movie.md', digest: 'hash' },
  ]);
  await act(async () => root.render(<App />));
  await click('Abrir arquivo');
  await persistDrafts();
  const saved = JSON.parse(vi.mocked(storeDrafts).mock.calls.at(-1)![0]);
  expect(saved.tabs[0].icon).toBe('film');
});
