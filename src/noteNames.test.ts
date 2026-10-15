import { expect, it } from 'vitest';
import { newDocument } from './documents';
import { noteNameParts, renamedNoteName } from './noteNames';
it('keeps the extension, Unicode titles and custom names through draft serialization', () => {
  const tab = newDocument('Sem título.md');
  expect(renamedNoteName(tab, ' Ideias de amanhã ')).toBe('Ideias de amanhã.md');
  expect(renamedNoteName(tab, 'Ideias.md')).toBe('Ideias.md');
  expect(noteNameParts('relatório.v2.json')).toEqual({ title: 'relatório.v2', extension: '.json' });
  expect(noteNameParts('.gitignore')).toEqual({ title: '.gitignore', extension: '' });
});
it('rejects invalid Windows filenames and directory changes before touching disk', () => {
  for (const value of [
    '',
    '  ',
    '.',
    '..',
    '../x',
    'a/b',
    'a\\b',
    'CON',
    'nul.txt',
    'LPT1',
    'COM²',
    'CON .md',
    'a.',
    'x:y',
    'x?y',
    'x\u0000y',
    'a'.repeat(256),
  ]) {
    expect(() => renamedNoteName(newDocument(), value), value).toThrow();
  }
});
