package ch.ethy.recipes.security;

import ch.ethy.recipes.user.SupportedLanguage;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Registration request. {@code preferredLanguage} is optional — it carries the language the visitor
 * picked before signing up so their new account keeps it; when omitted the account defaults to the
 * fallback language. Any supplied value must name a shipped language.
 */
public record RegistrationDetails(
    @NotBlank @Size(max = 255) String username,
    @NotBlank @Size(max = 255) @Email String email,
    @NotBlank @Size(min = 12) @MaxUtf8Bytes(72) String password,
    @SupportedLanguage String preferredLanguage) {}
