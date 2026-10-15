import { describe, it, expect } from 'vitest';
import { parsePreferences, parseTheme, DEFAULT_PREFERENCES, themeForTime } from './preferences';
describe('appearance and layout preferences', () => {
  it('keeps the old day/night themes and accepts sunset', () => {
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('sunset')).toBe('sunset');
    expect(parseTheme('midnight')).toBe('midnight');
    expect(parseTheme('invalid')).toBe('light');
  });
  it('restores font, wrap and the two pane sizes', () => {
    const value = { fontSize: 20, sidebarWidth: 380, splitRatio: 65, wrap: false };
    expect(parsePreferences(JSON.stringify(value))).toEqual({ ...value, automaticTheme: false });
  });
  it('limits oversized panes and fonts and ignores corrupt settings', () => {
    expect(parsePreferences('{')).toEqual(DEFAULT_PREFERENCES);
    expect(
      parsePreferences(
        JSON.stringify({ fontSize: 100, sidebarWidth: 1000, splitRatio: -1, wrap: 'false' }),
      ),
    ).toEqual({
      fontSize: 28,
      sidebarWidth: 440,
      splitRatio: 20,
      wrap: true,
      automaticTheme: false,
    });
  });
});

it('uses local clock boundaries for all four automatic themes', () => {
  for (const [hour, minute, theme] of [
    [0, 0, 'midnight'],
    [5, 59, 'midnight'],
    [6, 0, 'light'],
    [15, 59, 'light'],
    [16, 0, 'sunset'],
    [18, 59, 'sunset'],
    [19, 0, 'dark'],
    [23, 59, 'dark'],
  ] as const) {
    expect(themeForTime(new Date(2026, 9, 15, hour, minute))).toBe(theme);
  }
  expect(parsePreferences('{"automaticTheme":true}').automaticTheme).toBe(true);
  expect(parsePreferences('{"automaticTheme":"true"}').automaticTheme).toBe(false);
});
