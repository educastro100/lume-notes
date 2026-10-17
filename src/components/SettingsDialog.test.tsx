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
  const props = {
    locale: 'pt-BR' as const,
    automaticTheme: false,
    onAutomaticTheme: vi.fn(),
    onLanguage: vi.fn(),
    onClose: vi.fn(),
  };
  act(() => root.render(<SettingsDialog {...props} open />));
  expect(document.activeElement).toBe(host.querySelector('[role="tab"][aria-selected="true"]'));
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
  const props = {
    locale: 'pt-BR' as const,
    automaticTheme: false,
    onAutomaticTheme: vi.fn(),
    onLanguage: vi.fn(),
    onClose: vi.fn(),
  };
  act(() => root.render(<SettingsDialog {...props} open />));
  act(() => root.render(<SettingsDialog {...props} open={false} />));
  act(() => vi.advanceTimersByTime(100));
  act(() => root.render(<SettingsDialog {...props} open />));
  act(() => vi.advanceTimersByTime(300));
  expect(host.querySelector('[data-state="open"]')).not.toBeNull();
  act(() => root.unmount());
  vi.useRealTimers();
});
it('separates settings, help and shortcuts, with keyboard tab navigation and a stable footer', () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const props = {
    locale: 'pt-BR' as const,
    automaticTheme: false,
    onAutomaticTheme: vi.fn(),
    onLanguage: vi.fn(),
    onClose: vi.fn(),
  };
  act(() => root.render(<SettingsDialog {...props} open />));
  const tab = (id: string) => host.querySelector<HTMLButtonElement>(`#settings-tab-${id}`)!;
  expect(host.querySelectorAll('[role="tab"]')).toHaveLength(3);
  expect(host.querySelector('[role="tabpanel"] [role="combobox"]')).not.toBeNull();
  expect(host.querySelector('.shortcut-table')).toBeNull();
  const footer = host.querySelector('.modal-actions');
  act(() => tab('help').click());
  expect(tab('help').getAttribute('aria-selected')).toBe('true');
  expect(host.querySelector('[role="tabpanel"]')?.textContent).toContain('Como podemos ajudar?');
  expect(host.querySelector('.shortcut-table')).toBeNull();
  expect(host.querySelector('[role="combobox"]')).toBeNull();
  act(() =>
    tab('help').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    ),
  );
  expect(tab('shortcuts').getAttribute('aria-selected')).toBe('true');
  expect(document.activeElement).toBe(tab('shortcuts'));
  expect(host.querySelector('[role="tabpanel"]')?.textContent).toContain('Ctrl + S');
  expect(host.querySelector('.help-links')).toBeNull();
  expect(host.querySelector('.modal-actions')).toBe(footer);
  act(() =>
    tab('shortcuts').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }),
    ),
  );
  expect(tab('settings').getAttribute('aria-selected')).toBe('true');
  act(() => root.unmount());
  host.remove();
});
it('reopens at settings and prevents tab changes or dismissal during installation', () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host),
    close = vi.fn();
  const props = {
    locale: 'pt-BR' as const,
    automaticTheme: false,
    onAutomaticTheme: vi.fn(),
    onLanguage: vi.fn(),
    onClose: close,
  };
  act(() => root.render(<SettingsDialog {...props} open />));
  act(() => host.querySelector<HTMLButtonElement>('#settings-tab-shortcuts')!.click());
  act(() => root.render(<SettingsDialog {...props} open={false} />));
  act(() => root.render(<SettingsDialog {...props} open />));
  expect(host.querySelector('[role="tab"][aria-selected="true"]')?.id).toBe(
    'settings-tab-settings',
  );
  act(() =>
    root.render(<SettingsDialog {...props} open updates={{ phase: 'installing' } as any} />),
  );
  expect(
    [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].every(
      (button) => button.disabled,
    ),
  ).toBe(true);
  act(() =>
    host
      .querySelector('[role="dialog"]')!
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      ),
  );
  expect(close).not.toHaveBeenCalled();
  act(() => root.unmount());
  host.remove();
});
