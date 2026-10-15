export type Theme = 'light' | 'sunset' | 'dark' | 'midnight';
export const THEME_NAMES: Record<Theme, string> = {
  light: 'Dia',
  sunset: 'Tarde',
  dark: 'Noite',
  midnight: 'Madrugada',
};
export const FONT_MIN = 11,
  FONT_MAX = 28;
export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
export interface Preferences {
  fontSize: number;
  sidebarWidth: number;
  splitRatio: number;
  wrap: boolean;
}
export const DEFAULT_PREFERENCES: Preferences = {
  fontSize: 15,
  sidebarWidth: 246,
  splitRatio: 54,
  wrap: true,
};
export function parsePreferences(raw: string | null): Preferences {
  try {
    const value = JSON.parse(raw || '{}');
    const number = (key: 'fontSize' | 'sidebarWidth' | 'splitRatio', min: number, max: number) =>
      typeof value?.[key] === 'number' && Number.isFinite(value[key])
        ? clamp(value[key], min, max)
        : DEFAULT_PREFERENCES[key];
    return {
      fontSize: number('fontSize', FONT_MIN, FONT_MAX),
      sidebarWidth: number('sidebarWidth', 200, 440),
      splitRatio: number('splitRatio', 20, 80),
      wrap: typeof value?.wrap === 'boolean' ? value.wrap : true,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}
export function parseTheme(raw: string | null): Theme {
  return raw === 'dark' || raw === 'sunset' || raw === 'midnight' ? raw : 'light';
}
