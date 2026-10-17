import { describe, it, expect } from 'vitest';
import { parsePreferences, parseTheme, DEFAULT_PREFERENCES, themeForTime } from './preferences';
describe('appearance and layout preferences', () => {
  it('keeps the old day/night themes and accepts sunset', () => {
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('sunset')).toBe('sunset');
    expect(parseTheme('midnight')).toBe('midnight');
    expect(parseTheme('morning')).toBe('morning');
    expect(parseTheme('invalid')).toBe('light');
  });
  it('restores font, wrap and the two pane sizes', () => {
    const value = { fontSize: 20, sidebarWidth: 380, splitRatio: 65, wrap: false };
    expect(parsePreferences(JSON.stringify(value))).toEqual({
      ...value,
      automaticTheme: false,
      automaticUpdates: true,
    });
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
      automaticUpdates: true,
    });
  });
});

it('uses local clock boundaries for all five automatic themes', () => {
  for (const [hour, minute, theme] of [
    [0, 0, 'midnight'],
    [4, 59, 'midnight'],
    [5, 0, 'morning'],
    [9, 59, 'morning'],
    [10, 0, 'light'],
    [14, 59, 'light'],
    [15, 0, 'sunset'],
    [18, 59, 'sunset'],
    [19, 0, 'dark'],
    [23, 59, 'dark'],
  ] as const) {
    expect(themeForTime(new Date(2026, 9, 15, hour, minute))).toBe(theme);
  }
  expect(parsePreferences('{"automaticTheme":true}').automaticTheme).toBe(true);
  expect(parsePreferences('{"automaticTheme":"true"}').automaticTheme).toBe(false);
});
it('keeps every automatic period between four and five hours without gaps', () => {
  const durations = new Map<string, number>();
  for (let minute = 0; minute < 24 * 60; minute++) {
    const theme = themeForTime(new Date(2026, 9, 16, 0, minute));
    durations.set(theme, (durations.get(theme) || 0) + 1);
  }
  expect(durations.size).toBe(5);
  expect([...durations.values()].sort()).toEqual([240, 300, 300, 300, 300]);
});
