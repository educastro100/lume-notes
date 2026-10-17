// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { HelpSection, ShortcutsSection } from './HelpSection';
import { openProjectPage } from '../platform';
vi.mock('../platform', () => ({ openProjectPage: vi.fn().mockResolvedValue(undefined) }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
it('opens only the requested public project pages and keeps shortcuts in their own section', async () => {
  const host = document.createElement('div'),
    root = createRoot(host);
  act(() => root.render(<HelpSection />));
  expect(host.textContent).not.toContain('Ctrl + S');
  const [issues, project] = host.querySelectorAll('button');
  await act(async () => issues.click());
  expect(openProjectPage).toHaveBeenLastCalledWith('issues');
  await act(async () => project.click());
  expect(openProjectPage).toHaveBeenLastCalledWith('project');
  vi.mocked(openProjectPage).mockRejectedValueOnce(new Error('offline'));
  await act(async () => issues.click());
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível abrir');
  act(() => root.unmount());
});
it('shows the keyboard reference without the help links', () => {
  const host = document.createElement('div'),
    root = createRoot(host);
  act(() => root.render(<ShortcutsSection />));
  expect(host.textContent).toContain('Ctrl + S');
  expect(host.textContent).toContain('F8');
  expect(host.querySelectorAll('.help-links')).toHaveLength(0);
  act(() => root.unmount());
});
