// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { LanguagePicker } from './LanguagePicker';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
it('shows local flags for every language, supports keyboard choice and dismisses without closing settings', () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host),
    change = vi.fn(),
    escape = vi.fn();
  act(() =>
    root.render(
      <div onKeyDown={escape}>
        <LanguagePicker value="pt-BR" onChange={change} />
      </div>,
    ),
  );
  const combo = host.querySelector<HTMLButtonElement>('[role="combobox"]')!;
  const key = (key: string) =>
    act(() =>
      combo.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })),
    );
  act(() => combo.click());
  expect(combo.getAttribute('aria-expanded')).toBe('true');
  expect(host.querySelectorAll('[role="option"] .country-flag')).toHaveLength(7);
  key('End');
  key('Enter');
  expect(change).toHaveBeenCalledWith('zh-Hans');
  expect(combo.getAttribute('aria-expanded')).toBe('false');
  act(() => combo.click());
  escape.mockClear();
  key('Escape');
  expect(escape).not.toHaveBeenCalled();
  expect(combo.getAttribute('aria-expanded')).toBe('false');
  act(() => combo.click());
  act(() => document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })));
  expect(combo.getAttribute('aria-expanded')).toBe('false');
  act(() => root.unmount());
  host.remove();
});
