// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { check } from '@tauri-apps/plugin-updater';
import { isInstalled, openStoreLibrary, setOpenWith, openDefaultApps } from './platform';
import { useUpdates, type UpdateController } from './useUpdates';
import { SettingsDialog } from './components/SettingsDialog';
vi.mock('./distribution', () => ({ STORE_BUILD: true }));
vi.mock('./platform', () => ({
  native: true,
  isInstalled: vi.fn(),
  openStoreLibrary: vi.fn(),
  openWithStatus: vi.fn().mockResolvedValue(true),
  setOpenWith: vi.fn(),
  openDefaultApps: vi.fn().mockResolvedValue(undefined),
  openReleaseDownloads: vi.fn(),
  openProjectPage: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-updater', () => ({ check: vi.fn() }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement, root: ReturnType<typeof createRoot>, controller: UpdateController;
const install = vi.fn();
function Harness() {
  controller = useUpdates({ enabled: true, automatic: true, onInstall: install });
  return (
    <SettingsDialog
      open
      locale="pt-BR"
      automaticTheme={false}
      onAutomaticTheme={vi.fn()}
      onLanguage={vi.fn()}
      onClose={vi.fn()}
      updates={controller}
    />
  );
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.mocked(openStoreLibrary).mockResolvedValue(undefined);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});
it('keeps Store updates out of the GitHub updater even through manual calls', async () => {
  await act(async () => root.render(<Harness />));
  await act(async () => vi.advanceTimersByTimeAsync(15000));
  await act(async () => {
    await controller.checkNow();
    await controller.install();
  });
  expect(controller.store).toBe(true);
  expect(controller.installed).toBe(true);
  expect(check).not.toHaveBeenCalled();
  expect(isInstalled).not.toHaveBeenCalled();
  expect(install).not.toHaveBeenCalled();
  expect(host.querySelector('.version-chip')?.textContent).toBe('v0.11.0');
  const buttons = [...host.querySelectorAll('button')];
  expect(
    buttons.some((button) =>
      /Reparar integração|Remover do Abrir com|Verificar atualizações/.test(button.textContent!),
    ),
  ).toBe(false);
  await act(async () =>
    buttons.find((button) => button.textContent?.includes('Abrir Microsoft Store'))!.click(),
  );
  expect(openStoreLibrary).toHaveBeenCalledOnce();
  await act(async () =>
    buttons.find((button) => button.textContent?.includes('Escolher padrões'))!.click(),
  );
  expect(openDefaultApps).toHaveBeenCalledOnce();
  expect(setOpenWith).not.toHaveBeenCalled();
});
it('reports a Store launch failure and allows retrying', async () => {
  vi.mocked(openStoreLibrary).mockRejectedValueOnce(new Error('Store unavailable'));
  await act(async () => root.render(<Harness />));
  const button = [...host.querySelectorAll('button')].find((button) =>
    button.textContent?.includes('Abrir Microsoft Store'),
  )!;
  await act(async () => button.click());
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(
    'Não foi possível abrir a Microsoft Store',
  );
  await act(async () => button.click());
  expect(host.querySelector('[role="alert"]')).toBeNull();
});
