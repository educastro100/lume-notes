import { t } from './i18n';
export type Encoding = 'utf8' | 'utf8-bom' | 'utf16le' | 'utf16be';
export type Newline = 'LF' | 'CRLF' | 'CR';
export const DOCUMENT_ICONS = {
  file: 'Documento',
  work: 'Trabalho',
  study: 'Estudos',
  idea: 'Ideias',
  code: 'Código',
  tasks: 'Tarefas',
  personal: 'Pessoal',
  music: 'Música',
  script: 'Roteiro',
  film: 'Filme',
  video: 'Vídeo',
  incident: 'Incidente',
  request: 'Requisição',
  project: 'Projeto',
  meeting: 'Reunião',
  calendar: 'Calendário',
  shopping: 'Compras',
  process: 'Processo',
} as const;
export type DocumentIcon = keyof typeof DOCUMENT_ICONS;
export const GROUP_COLORS = {
  sage: '#78906a',
  blue: '#7396bb',
  rose: '#b77f91',
  amber: '#b39154',
  violet: '#9581b6',
  teal: '#609f98',
  orange: '#c58b51',
  coral: '#c87f72',
  olive: '#98a45e',
  cyan: '#5fa8b4',
  lavender: '#a89ac7',
  stone: '#99918a',
} as const;
export type GroupColor = keyof typeof GROUP_COLORS;
export interface TabGroup {
  id: string;
  name: string;
  color: GroupColor;
  collapsed: boolean;
}
export type GroupPlacement = 'before' | 'after';
export function reorderGroups(
  groups: TabGroup[],
  sourceId: string,
  targetId: string,
  placement: GroupPlacement,
): TabGroup[] {
  const source = groups.find((group) => group.id === sourceId);
  if (!source || sourceId === targetId || !groups.some((group) => group.id === targetId))
    return groups;
  const result = groups.filter((group) => group.id !== sourceId);
  const index = result.findIndex((group) => group.id === targetId);
  result.splice(index + (placement === 'after' ? 1 : 0), 0, source);
  return result.every((group, index) => group === groups[index]) ? groups : result;
}
export interface DocumentTab {
  id: string;
  name: string;
  path: string | null;
  content: string;
  savedContent: string;
  encoding: Encoding;
  newline: Newline;
  digest: string | null;
  groupId: string | null;
  mode: 'text' | 'markdown';
  icon: DocumentIcon;
  presentation: 'visual' | 'source';
  split: boolean;
}
export const isDirty = (tab: DocumentTab) => tab.content !== tab.savedContent;
export function newDocument(name = 'Sem título.md', content = ''): DocumentTab {
  return {
    id: crypto.randomUUID(),
    name,
    path: null,
    content,
    savedContent: content,
    encoding: 'utf8',
    newline: 'LF',
    digest: null,
    groupId: null,
    mode: /\.md$/i.test(name) ? 'markdown' : 'text',
    icon: 'file',
    presentation: 'visual',
    split: true,
  };
}
export const basename = (path: string) => path.split(/[\\/]/).pop() || path;
export function decodeBytes(bytes: Uint8Array): {
  content: string;
  encoding: Encoding;
  newline: Newline;
} {
  let encoding: Encoding = 'utf8';
  let skip = 0;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    encoding = 'utf8-bom';
    skip = 3;
  } else if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    encoding = 'utf16le';
    skip = 2;
  } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    encoding = 'utf16be';
    skip = 2;
  }
  const decoder = encoding.startsWith('utf16')
    ? encoding === 'utf16le'
      ? 'utf-16le'
      : 'utf-16be'
    : 'utf-8';
  let raw: string;
  try {
    raw = new TextDecoder(decoder, { fatal: true }).decode(bytes.subarray(skip));
  } catch {
    throw new Error(
      t('O arquivo não está em UTF-8 ou UTF-16 válido. Converta a codificação antes de abrir.'),
    );
  }
  if (raw.includes('\0'))
    throw new Error(t('Este arquivo parece ser binário. Abra um arquivo de texto.'));
  const match = raw.match(/\r\n|\r|\n/);
  const newline: Newline = match?.[0] === '\r\n' ? 'CRLF' : match?.[0] === '\r' ? 'CR' : 'LF';
  return { content: raw.replace(/\r\n|\r/g, '\n'), encoding, newline };
}
export function encodeText(content: string, encoding: Encoding, newline: Newline): Uint8Array {
  const text = content
    .replace(/\r\n|\r/g, '\n')
    .replace(/\n/g, newline === 'CRLF' ? '\r\n' : newline === 'CR' ? '\r' : '\n');
  if (encoding === 'utf8') return new TextEncoder().encode(text);
  if (encoding === 'utf8-bom')
    return new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(text)]);
  const bytes = new Uint8Array(2 + text.length * 2);
  const little = encoding === 'utf16le';
  bytes[0] = little ? 0xff : 0xfe;
  bytes[1] = little ? 0xfe : 0xff;
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < text.length; i++) view.setUint16(2 + i * 2, text.charCodeAt(i), little);
  return bytes;
}
export function restoreSession(
  raw: string | null,
): { tabs: DocumentTab[]; activeId: string; groups: TabGroup[] } | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (![1, 2].includes(data.version) || !Array.isArray(data.tabs)) return null;
    const groupIds = new Set<string>();
    const groups: TabGroup[] = [];
    for (const group of Array.isArray(data.groups) ? data.groups : []) {
      if (
        group &&
        typeof group.id === 'string' &&
        group.id &&
        !groupIds.has(group.id) &&
        typeof group.name === 'string' &&
        group.name.trim() &&
        typeof group.color === 'string' &&
        Object.hasOwn(GROUP_COLORS, group.color)
      ) {
        groups.push({
          id: group.id,
          name: group.name.trim().slice(0, 60),
          color: group.color,
          collapsed: group.collapsed === true,
        });
        groupIds.add(group.id);
      }
    }
    const ids = new Set<string>();
    for (const t of data.tabs) {
      if (
        !t ||
        typeof t.id !== 'string' ||
        ids.has(t.id) ||
        typeof t.name !== 'string' ||
        typeof t.content !== 'string' ||
        typeof t.savedContent !== 'string' ||
        !(t.path === null || typeof t.path === 'string') ||
        !(t.digest === null || typeof t.digest === 'string') ||
        !['utf8', 'utf8-bom', 'utf16le', 'utf16be'].includes(t.encoding) ||
        !['LF', 'CRLF', 'CR'].includes(t.newline)
      )
        return null;
      ids.add(t.id);
    }
    const tabs: DocumentTab[] = data.tabs.map((t: DocumentTab) => ({
      ...t,
      groupId: groupIds.has(t.groupId || '') ? t.groupId : null,
      mode: t.mode === 'markdown' || /\.md$/i.test(t.name) ? 'markdown' : 'text',
      icon: typeof t.icon === 'string' && Object.hasOwn(DOCUMENT_ICONS, t.icon) ? t.icon : 'file',
      presentation: t.presentation === 'source' ? 'source' : 'visual',
      split: t.split !== false,
    }));
    return { tabs, activeId: ids.has(data.activeId) ? data.activeId : tabs[0]?.id || '', groups };
  } catch {
    return null;
  }
}
