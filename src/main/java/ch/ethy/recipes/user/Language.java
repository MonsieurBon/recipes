package ch.ethy.recipes.user;

import java.util.Arrays;
import java.util.Optional;
import org.jspecify.annotations.Nullable;

/**
 * A UI language the application ships translations for.
 *
 * <p>Each constant carries its ISO 639-1 {@link #code()} — the two-letter wire form ({@code "de"},
 * {@code "en"}, {@code "fr"}, {@code "it"}) used by the API, persisted in the database, and matched
 * against the frontend's {@code LanguageCode}. The enum is the single source of truth for the
 * whitelist: {@link #fromCode(String)} is the only accepted way to turn an untrusted string into a
 * {@code Language}, rejecting anything outside the supported set.
 */
public enum Language {
  GERMAN("de"),
  ENGLISH("en"),
  FRENCH("fr"),
  ITALIAN("it");

  /** The default and fallback language, matching the frontend's default. */
  public static final Language DEFAULT = GERMAN;

  private final String code;

  Language(String code) {
    this.code = code;
  }

  /** The ISO 639-1 wire code for this language, e.g. {@code "de"}. */
  public String code() {
    return code;
  }

  /**
   * Resolves a wire code to its language, whitelisting the input. Returns empty for {@code null} or
   * any string that is not exactly one of the supported codes, so untrusted input can never yield a
   * language outside the shipped set.
   */
  public static Optional<Language> fromCode(@Nullable String code) {
    return Arrays.stream(values()).filter(language -> language.code.equals(code)).findFirst();
  }
}
