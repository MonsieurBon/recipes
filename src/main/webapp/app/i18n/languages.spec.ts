import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
} from './languages';

describe('languages', () => {
  it('offers German, English, French and Italian, each named in its own language', () => {
    expect(LANGUAGES.map((language) => language.code)).toEqual(['de', 'en', 'fr', 'it']);
    expect(LANGUAGES.map((language) => language.endonym)).toEqual([
      'Deutsch',
      'English',
      'Français',
      'Italiano',
    ]);
  });

  it('defaults to German, and German is one of the supported codes', () => {
    expect(DEFAULT_LANGUAGE).toBe('de');
    expect(SUPPORTED_LANGUAGE_CODES).toContain(DEFAULT_LANGUAGE);
  });

  it('accepts every supported code as a supported language', () => {
    for (const code of SUPPORTED_LANGUAGE_CODES) {
      expect(isSupportedLanguage(code)).toBe(true);
    }
  });

  it.each([
    ['an unsupported code', 'es'],
    ['an empty string', ''],
    ['a non-string', 42],
    ['null', null],
    ['undefined', undefined],
  ])('rejects %s', (_label, value) => {
    expect(isSupportedLanguage(value)).toBe(false);
  });
});
