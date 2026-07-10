package ch.ethy.recipes.user;

import jakarta.validation.constraints.NotNull;

/**
 * Request body for updating the authenticated user's preferred UI language. The {@code language}
 * field is the two-letter wire code and must name a shipped language; anything else is a 400.
 */
public record LanguagePreference(@NotNull @SupportedLanguage String language) {}
