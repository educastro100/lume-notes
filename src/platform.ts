import { t } from './i18n';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { listen } from '@tauri-apps/api/event';
import { open, save } from '@tauri-apps/plugin-dialog';
import { basename, decodeBytes, encodeText, newDocument, type DocumentTab } from './documents';
export const native = isTauri();
const filters = () => [
  {
    name: t('Arquivos de texto'),
    extensions: [
      'txt',
      'md',
      'json',
      'js',
      'ts',
      'css',
      'html',
      'csv',
      'log',
      'xml',
      'yaml',
      'yml',
      'ini',
      'toml',
    ],
  },
  { name: t('Todos os arquivos'), extensions: ['*'] },
];
export async function openDocuments(): Promise<DocumentTab[]> {
  if (native) {
    const paths = await open({ multiple: true, filters: filters() });
    if (!paths) return [];
    const results: DocumentTab[] = [];
    for (const path of Array.isArray(paths) ? paths : [paths]) {
      const file = await invoke<{ bytes: number[]; digest: string; path: string }>('read_file', {
        path,
      });
      const decoded = decodeBytes(new Uint8Array(file.bytes));
      results.push({
        ...newDocument(basename(file.path), decoded.content),
        ...decoded,
        path: file.path,
        digest: file.digest,
      });
    }
    return results;
  }
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.oncancel = () => resolve([]);
    input.onchange = async () => {
      try {
        const tabs: DocumentTab[] = [];
        for (const file of Array.from(input.files || [])) {
          if (file.size > 16 * 1024 * 1024)
            throw new Error(t('O limite desta versão é de 16 MB por arquivo.'));
          const decoded = decodeBytes(new Uint8Array(await file.arrayBuffer()));
          tabs.push({ ...newDocument(file.name, decoded.content), ...decoded });
        }
        resolve(tabs);
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
}
export async function saveDocument(
  tab: DocumentTab,
  saveAs = false,
  force = false,
): Promise<{ path: string | null; digest: string | null; name: string } | null> {
  const bytes = encodeText(tab.content, tab.encoding, tab.newline);
  const defaultName = /\.[^./\\]+$/.test(tab.name)
    ? tab.name
    : tab.name + (tab.mode === 'markdown' ? '.md' : '.txt');
  if (native) {
    let path = tab.path;
    if (!path || saveAs)
      path = await save({ defaultPath: tab.path || defaultName, filters: filters() });
    if (!path) return null;
    const samePath = tab.path && path.toLocaleLowerCase() === tab.path.toLocaleLowerCase();
    const result = await invoke<{ digest: string; path: string }>('save_file', {
      path,
      bytes: Array.from(bytes),
      expectedDigest: samePath ? tab.digest : null,
      force,
    });
    return { ...result, name: basename(result.path) };
  }
  const blob = new Blob([new Uint8Array(bytes).buffer], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = defaultName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { path: null, digest: null, name: anchor.download };
}
export async function loadDrafts(): Promise<string | null> {
  return native ? invoke<string | null>('load_session') : localStorage.getItem('lume.session.v1');
}
export async function storeDrafts(value: string): Promise<void> {
  if (native) await invoke('store_session', { value });
  else localStorage.setItem('lume.session.v1', value);
}

export async function renameDocument(
  tab: DocumentTab,
  name: string,
): Promise<{ name: string; path: string | null; digest: string | null }> {
  if (!native || !tab.path) return { name, path: tab.path, digest: tab.digest };
  try {
    const result = await invoke<{ path: string; digest: string }>('rename_file', {
      path: tab.path,
      name,
      expectedDigest: tab.digest,
    });
    return { ...result, name: basename(result.path) };
  } catch (error) {
    const message = String(error);
    if (message.includes('NAME_EXISTS'))
      throw new Error(t('Já existe um arquivo com esse nome nesta pasta.'));
    if (message.includes('FILE_CHANGED'))
      throw new Error(
        t('O arquivo mudou fora do Lume. Reabra-o ou salve uma cópia antes de renomear.'),
      );
    if (message.includes('INVALID_NAME'))
      throw new Error(t('Escolha um título válido, sem caracteres reservados de arquivo.'));
    throw error;
  }
}

export async function copyContent(content: string): Promise<void> {
  if (native) await writeText(content);
  else await navigator.clipboard.writeText(content);
}
export async function readDocumentsFromPaths(paths: string[]): Promise<DocumentTab[]> {
  const tabs: DocumentTab[] = [];
  for (const path of paths) {
    const file = await invoke<{ bytes: number[]; digest: string; path: string }>('read_file', {
      path,
    });
    const decoded = decodeBytes(new Uint8Array(file.bytes));
    tabs.push({
      ...newDocument(basename(file.path), decoded.content),
      ...decoded,
      path: file.path,
      digest: file.digest,
    });
  }
  return tabs;
}
export const takePendingFiles = () => invoke<string[]>('take_pending_files');
export const subscribeOpenRequests = (callback: () => void) => listen('lume-open-files', callback);
export const openStoreLibrary = () => invoke<void>('open_store_library');
export const openWithStatus = () => invoke<boolean>('open_with_status');
export const setOpenWith = (enabled: boolean) => invoke<boolean>('set_open_with', { enabled });

export const isInstalled = () => invoke<boolean>('is_installed');
export const openDefaultApps = () => invoke<void>('open_default_apps');
export const openReleaseDownloads = () => invoke<void>('open_release_downloads');
export const PROJECT_PAGES = {
  issues: 'https://github.com/educastro100/lume-notes-releases/issues',
  project: 'https://github.com/educastro100/lume-notes-releases',
} as const;
export async function openProjectPage(page: keyof typeof PROJECT_PAGES): Promise<void> {
  if (!Object.hasOwn(PROJECT_PAGES, page)) throw new Error('Invalid project page');
  if (native) await invoke<void>('open_project_page', { page });
  else window.open(PROJECT_PAGES[page], '_blank', 'noopener,noreferrer');
}
