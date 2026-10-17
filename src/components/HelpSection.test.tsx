// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { HelpSection } from './HelpSection';
import { openProjectPage } from '../platform';
vi.mock('../platform', () => ({ openProjectPage: vi.fn().mockResolvedValue(undefined) }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
it('documents common shortcuts and opens only the requested public project pages', async () => {
  const host = document.createElement('div'),
    root = createRoot(host);
  act(() => root.render(<HelpSection />));
  expect(host.textContent).toContain('Ctrl + S');
  expect(host.textContent).toContain('F8');
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
