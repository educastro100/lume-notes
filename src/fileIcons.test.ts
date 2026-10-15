import { expect, it } from 'vitest';
import { parseFileIcons, rememberIcon } from './fileIcons';
it('restores a selected icon across Windows path aliases and rejects invalid entries', () => {
  const memory = rememberIcon({}, 'C:\\Notas\\Filme.md', 'film');
  expect(parseFileIcons(JSON.stringify(memory))['c:/notas/filme.md']).toBe('film');
  expect(parseFileIcons('{"a":"bad","b":"script","c":null}')).toEqual({ b: 'script' });
  expect(parseFileIcons('{')).toEqual({});
});
it('moves the remembered icon on rename and keeps other files', () => {
  const memory = rememberIcon(
    { 'c:/old.md': 'film', 'c:/other.md': 'video' },
    'C:/New.md',
    'script',
    'C:/old.md',
  );
  expect(memory).toEqual({ 'c:/new.md': 'script', 'c:/other.md': 'video' });
});
