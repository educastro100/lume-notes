// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { copyContent, readDocumentsFromPaths, openProjectPage } from './platform';
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true, invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
  writeText: vi.fn().mockResolvedValue(undefined),
}));
it('opens public help pages by identifier and rejects arbitrary URLs before invoking the native bridge', async () => {
  vi.mocked(invoke).mockResolvedValue(undefined);
  await openProjectPage('issues');
  expect(invoke).toHaveBeenLastCalledWith('open_project_page', { page: 'issues' });
  const count = vi.mocked(invoke).mock.calls.length;
  await expect(openProjectPage('https://example.com' as any)).rejects.toThrow();
  expect(vi.mocked(invoke).mock.calls.length).toBe(count);
});
it('copies the full Markdown source through the native clipboard bridge', async () => {
  const content = '# Roteiro\n\n**Cena** $$$$';
  await copyContent(content);
  expect(writeText).toHaveBeenCalledWith(content);
});
it('decodes files received from the system with their canonical path and digest', async () => {
  vi.mocked(invoke).mockResolvedValue({
    bytes: [0xff, 0xfe, 0x61, 0, 13, 0, 10, 0],
    path: 'C:/Notas/cena.md',
    digest: 'sha256',
  });
  const [tab] = await readDocumentsFromPaths(['C:/Notas/cena.md']);
  expect(invoke).toHaveBeenCalledWith('read_file', { path: 'C:/Notas/cena.md' });
  expect(tab).toMatchObject({
    content: 'a\n',
    encoding: 'utf16le',
    newline: 'CRLF',
    path: 'C:/Notas/cena.md',
    digest: 'sha256',
  });
});
