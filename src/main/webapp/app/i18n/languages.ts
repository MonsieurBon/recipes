/**
 * The closed set of languages the UI ships. This enum is the whitelist: every language value that
 * enters from an untrusted source (localStorage, the browser, a future URL param) is narrowed to a
 * {@link LanguageCode} before it is trusted, and the backend enforces the same set on the stored
 * preference. Adding a language is one member here, one entry in {@link LANGUAGES}, and one JSON
 * bundle in {@code assets/i18n}.
 */
export enum LanguageCode {
  German = 'de',
  English = 'en',
  French = 'fr',
  Italian = 'it',
}

/**
 * A shipped language: its code plus its {@code endonym} — the language's own name, shown in the
 * picker so a user stranded in the wrong language still finds theirs.
 */
export interface Language {
  readonly code: LanguageCode;
  readonly endonym: string;
}

export const LANGUAGES: readonly Language[] = [
  { code: LanguageCode.German, endonym: 'Deutsch' },
  { code: LanguageCode.English, endonym: 'English' },
  { code: LanguageCode.French, endonym: 'Français' },
  { code: LanguageCode.Italian, endonym: 'Italiano' },
];

/** German is the default and the fallback: unsupported locales and missing keys resolve to it. */
export const DEFAULT_LANGUAGE = LanguageCode.German;

export const SUPPORTED_LANGUAGE_CODES: readonly LanguageCode[] = Object.values(LanguageCode);

/** Whitelist guard for any language value entering from an untrusted source (localStorage, URL). */
export function isSupportedLanguage(value: unknown): value is LanguageCode {
  return (
    typeof value === 'string' && (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(value)
  );
}
