// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { newDocument } from './documents';
import { loadDrafts, storeDrafts } from './platform';
import { check } from '@tauri-apps/plugin-updater';
import App from './App';
vi.mock('./platform', () => ({
  native: true,
  isInstalled: vi.fn().mockResolvedValue(true),
  loadDrafts: vi.fn(),
  storeDrafts: vi.fn().mockResolvedValue(undefined),
  subscribeOpenRequests: vi.fn().mockResolvedValue(() => {}),
  takePendingFiles: vi.fn().mockResolvedValue([]),
  openWithStatus: vi.fn().mockResolvedValue(true),
  setOpenWith: vi.fn(),
  openDefaultApps: vi.fn(),
  openReleaseDownloads: vi.fn(),
  openDocuments: vi.fn(),
  saveDocument: vi.fn(),
  renameDocument: vi.fn(),
  copyContent: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-updater', () => ({ check: vi.fn() }));
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    setTitle: vi.fn().mockResolvedValue(undefined),
    onCloseRequested: vi.fn().mockResolvedValue(() => {}),
    destroy: vi.fn(),
  }),
}));
vi.mock('./components/NativeTitlebar', () => ({ NativeTitlebar: () => null }));
vi.mock('@uiw/react-codemirror', () => ({ default: () => null }));
const harness = vi.hoisted(() => ({ change: null as null | ((text: string) => void) }));
vi.mock('./components/VisualEditor', () => ({
  VisualEditor: (props: any) => {
    harness.change = props.onChange;
    return <div />;
  },
}));
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  const tab = newDocument('Draft.md', 'Original');
  vi.mocked(loadDrafts).mockResolvedValue(
    JSON.stringify({ version: 2, tabs: [tab], activeId: tab.id, groups: [] }),
  );
  vi.mocked(storeDrafts).mockResolvedValue(undefined);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
const click = async (label: string) => {
  const button = Array.from(host.querySelectorAll('button')).find(
    (b) => b.getAttribute('aria-label') === label || b.textContent === label,
  );
  expect(button).toBeDefined();
  await act(async () => button!.click());
};
async function start() {
  await act(async () => root.render(<App />));
  await click('Configurações');
  await click('Verificar atualizações');
}
it('downloads first, then persists the latest session before launching the installer', async () => {
  let finish!: () => void;
  const candidate = {
    version: '0.10.0',
    body: 'Novidades',
    close: vi.fn().mockResolvedValue(undefined),
    download: vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    ),
    install: vi.fn().mockResolvedValue(undefined),
  };
  vi.mocked(check).mockResolvedValue(candidate as any);
  await start();
  await click('Atualizar e reiniciar');
  expect(candidate.install).not.toHaveBeenCalled();
  await click('Concluído');
  await act(async () => harness.change!('Typed while the download was running'));
  await act(async () => finish());
  const saved = JSON.parse(vi.mocked(storeDrafts).mock.calls.at(-1)![0]);
  expect(saved.tabs[0].content).toBe('Typed while the download was running');
  expect(candidate.install).toHaveBeenCalledOnce();
  expect(vi.mocked(storeDrafts).mock.invocationCallOrder.at(-1)).toBeLessThan(
    candidate.install.mock.invocationCallOrder[0],
  );
  expect(host.querySelector('main')?.hasAttribute('inert')).toBe(true);
});
it('never launches the installer if the current session cannot be persisted', async () => {
  const candidate = {
    version: '0.10.0',
    body: 'Novidades',
    close: vi.fn().mockResolvedValue(undefined),
    download: vi.fn().mockResolvedValue(undefined),
    install: vi.fn(),
  };
  vi.mocked(check).mockResolvedValue(candidate as any);
  await start();
  vi.mocked(storeDrafts).mockRejectedValue(new Error('disk unavailable'));
  await click('Atualizar e reiniciar');
  expect(candidate.install).not.toHaveBeenCalled();
  expect(host.textContent).toContain(
    'Atualização cancelada: não foi possível guardar seus rascunhos',
  );
  expect(host.querySelector('.empty-workspace')).toBeNull();
  expect(
    Array.from(host.querySelectorAll('button')).find((b) => b.textContent === 'Concluído')
      ?.disabled,
  ).toBe(false);
});
it('shows a network failure instead of claiming the installed version is current', async () => {
  vi.mocked(check).mockRejectedValue(new Error('offline'));
  await start();
  expect(host.textContent).toContain('Não foi possível verificar atualizações');
  expect(host.textContent).not.toContain('Você está usando a versão mais recente');
});
