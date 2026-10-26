// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import translations from './translations.json';
import spanish from './translations.es.json';
import { LANGUAGES, parseLocale, setLanguage, t } from './i18n';

afterEach(() => setLanguage('pt-BR'));
it('provides every message in all five additional languages', () => {
  for (const row of Object.values(translations)) {
    expect(row).toHaveLength(5);
    expect(row.every((value) => value.trim().length > 0)).toBe(true);
  }
});
it('persists language choice, validates stored values and leaves document names intact', () => {
  setLanguage('fr');
  expect(localStorage.getItem('lume.language')).toBe('fr');
  expect(t('Salvar')).toBe('Enregistrer');
  expect(t('Fechar {name}', { name: 'My **notes** {count}.md' })).toBe(
    'Fermer My **notes** {count}.md',
  );
  expect(parseLocale('__proto__')).toBe('pt-BR');
  for (const locale of Object.keys(LANGUAGES)) expect(parseLocale(locale)).toBe(locale);
});

it('translates every interface message to Spanish, preserving substitution tokens and saved language', () => {
  const rows = spanish as Record<string, string>;
  for (const source of Object.keys(translations)) {
    expect(rows[source], source).toBeTruthy();
    expect((rows[source].match(/\{\w+\}/g) || []).sort(), source).toEqual(
      (source.match(/\{\w+\}/g) || []).sort(),
    );
  }
  setLanguage('es');
  expect(localStorage.getItem('lume.language')).toBe('es');
  expect(parseLocale('es')).toBe('es');
  expect(t('Salvar')).toBe('Guardar');
  expect(t('Fechar {name}', { name: 'Minhas notas.md' })).toBe('Cerrar Minhas notas.md');
  expect(t('Compras')).toBe('Compras');
  expect(t('Processo')).toBe('Proceso');
});
