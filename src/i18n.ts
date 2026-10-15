import { useSyncExternalStore } from 'react';
import translations from './translations.json';

export const LANGUAGES = {
  'pt-BR': 'Português (Brasil)',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  el: 'Ελληνικά',
  'zh-Hans': '简体中文',
} as const;
export type Locale = keyof typeof LANGUAGES;
export function parseLocale(value: string | null): Locale {
  return value && Object.hasOwn(LANGUAGES, value) ? (value as Locale) : 'pt-BR';
}
let current: Locale = (() => {
  try {
    return parseLocale(localStorage.getItem('lume.language'));
  } catch {
    return 'pt-BR';
  }
})();
const listeners = new Set<() => void>();
export function setLanguage(value: Locale) {
  current = parseLocale(value);
  try {
    localStorage.setItem('lume.language', current);
  } catch {
    /* Keep the in-memory preference. */
  }
  listeners.forEach((listener) => listener());
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export function useLanguage() {
  return [useSyncExternalStore(subscribe, () => current), setLanguage] as const;
}
export function t(source: string, values: Record<string, string | number> = {}): string {
  const index = ['en', 'fr', 'de', 'el', 'zh-Hans'].indexOf(current);
  const rows = translations as Record<string, string[]>;
  const result = index < 0 ? source : rows[source]?.[index] || source;
  return result.replace(/\{(\w+)\}/g, (token, key: string) => String(values[key] ?? token));
}
