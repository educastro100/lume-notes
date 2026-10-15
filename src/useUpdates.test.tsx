// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { check } from '@tauri-apps/plugin-updater';
import { isInstalled } from './platform';
import { useUpdates, type UpdateController } from './useUpdates';
vi.mock('./platform', () => ({ native: true, isInstalled: vi.fn() }));
vi.mock('@tauri-apps/plugin-updater', () => ({ check: vi.fn() }));
let controller: UpdateController;
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const beforeInstall = vi.fn(async (install: () => Promise<void>) => install());
function Harness({ automatic = true }: { automatic?: boolean }) {
  controller = useUpdates({ enabled: true, automatic, onInstall: beforeInstall });
  return <span>{controller.phase}</span>;
}
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-15T12:00:00Z'));
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(isInstalled).mockResolvedValue(true);
  vi.mocked(check).mockResolvedValue(null);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});
it('checks after startup, remembers a successful check for 24 hours and never installs automatically', async () => {
  await act(async () => root.render(<Harness />));
  await act(async () => vi.advanceTimersByTimeAsync(9999));
  expect(check).not.toHaveBeenCalled();
  await act(async () => vi.advanceTimersByTimeAsync(1));
  expect(check).toHaveBeenCalledOnce();
  expect(controller.phase).toBe('current');
  expect(beforeInstall).not.toHaveBeenCalled();
  await act(async () => root.render(<Harness automatic={false} />));
  await act(async () => root.render(<Harness />));
  await act(async () => vi.advanceTimersByTimeAsync(10000));
  expect(check).toHaveBeenCalledOnce();
});
it('requires installed mode and respects the automatic-check toggle', async () => {
  vi.mocked(isInstalled).mockResolvedValue(false);
  await act(async () => root.render(<Harness />));
  await act(async () => vi.advanceTimersByTimeAsync(10000));
  await act(async () => controller.checkNow());
  expect(check).not.toHaveBeenCalled();
  expect(controller.installed).toBe(false);
});
it('allows manual checks with automatic checks disabled and refuses a failed signature/download', async () => {
  const candidate = {
    version: '0.10.0',
    body: 'Notes',
    close: vi.fn().mockResolvedValue(undefined),
    download: vi.fn().mockRejectedValue(new Error('invalid signature')),
    install: vi.fn(),
  };
  vi.mocked(check).mockResolvedValue(candidate as any);
  await act(async () => root.render(<Harness automatic={false} />));
  await act(async () => vi.advanceTimersByTimeAsync(10000));
  expect(check).not.toHaveBeenCalled();
  await act(async () => controller.checkNow());
  expect(controller.phase).toBe('available');
  await act(async () => controller.install());
  expect(controller.phase).toBe('error');
  expect(controller.error).toContain('baixar ou validar');
  expect(beforeInstall).not.toHaveBeenCalled();
  expect(candidate.install).not.toHaveBeenCalled();
});
