import type { DocumentTab } from './documents';
import { t } from './i18n';

export function noteNameParts(name: string) {
  const index = name.lastIndexOf('.');
  return index > 0
    ? { title: name.slice(0, index), extension: name.slice(index) }
    : { title: name, extension: '' };
}
export function renamedNoteName(tab: DocumentTab, title: string) {
  const { extension } = noteNameParts(tab.name);
  const trimmed = title.trim();
  const name =
    extension && !trimmed.toLowerCase().endsWith(extension.toLowerCase())
      ? trimmed + extension
      : trimmed;
  if (
    !trimmed ||
    /[<>:"/\\|?*\u0000-\u001f]/u.test(trimmed) ||
    /[. ]$/.test(trimmed) ||
    name.length > 255 ||
    /^(?:CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³])$/iu.test(name.split('.')[0].trimEnd())
  ) {
    throw new Error(t('Escolha um título válido, sem caracteres reservados de arquivo.'));
  }
  return name;
}

export function isUiTextField(target: EventTarget | null) {
  return (
    target instanceof Element && !!target.closest('input, textarea, select, [data-title-editor]')
  );
}
