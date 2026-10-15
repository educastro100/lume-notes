import { DOCUMENT_ICONS, type DocumentIcon } from './documents';
export type FileIcons = Record<string, DocumentIcon>;
export const fileKey = (path: string) => path.replace(/\\/g, '/').toLowerCase();
export function parseFileIcons(raw: string | null): FileIcons {
  try {
    const data = JSON.parse(raw || '{}');
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    return Object.fromEntries(
      Object.entries(data)
        .slice(-2000)
        .filter(
          ([key, icon]) =>
            key.length > 0 && typeof icon === 'string' && Object.hasOwn(DOCUMENT_ICONS, icon),
        )
        .map(([key, icon]) => [fileKey(key), icon as DocumentIcon]),
    );
  } catch {
    return {};
  }
}
export function rememberIcon(
  icons: FileIcons,
  path: string,
  icon: DocumentIcon,
  oldPath?: string | null,
): FileIcons {
  const result = { ...icons };
  if (oldPath && fileKey(oldPath) !== fileKey(path)) delete result[fileKey(oldPath)];
  result[fileKey(path)] = icon;
  return Object.fromEntries(Object.entries(result).slice(-2000));
}
