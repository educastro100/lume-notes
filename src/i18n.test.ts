// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import translations from './translations.json';
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
