// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { it, expect, vi } from 'vitest';
import { SettingsDialog } from './SettingsDialog';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
it('keeps the closing dialog mounted for animation, returns focus, then removes it', () => {
  vi.useFakeTimers();
  const opener = document.createElement('button');
  document.body.append(opener);
  opener.focus();
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const props = { locale: 'pt-BR' as const, onLanguage: vi.fn(), onClose: vi.fn() };
  act(() => root.render(<SettingsDialog {...props} open />));
  expect(document.activeElement).toBe(host.querySelector('select'));
  act(() => root.render(<SettingsDialog {...props} open={false} />));
  expect(host.querySelector('[data-state="closed"]')).not.toBeNull();
  expect(host.querySelector('.settings-backdrop')?.getAttribute('aria-hidden')).toBe('true');
  expect(document.activeElement).toBe(opener);
  act(() => vi.advanceTimersByTime(180));
  expect(host.querySelector('[role=dialog]')).toBeNull();
  act(() => root.unmount());
  host.remove();
  opener.remove();
  vi.useRealTimers();
});
it('cancels the closing timer when reopened quickly', () => {
  vi.useFakeTimers();
  const host = document.createElement('div'),
    root = createRoot(host);
  const props = { locale: 'pt-BR' as const, onLanguage: vi.fn(), onClose: vi.fn() };
  act(() => root.render(<SettingsDialog {...props} open />));
  act(() => root.render(<SettingsDialog {...props} open={false} />));
  act(() => vi.advanceTimersByTime(100));
  act(() => root.render(<SettingsDialog {...props} open />));
  act(() => vi.advanceTimersByTime(300));
  expect(host.querySelector('[data-state="open"]')).not.toBeNull();
  act(() => root.unmount());
  vi.useRealTimers();
});
