package ch.ethy.recipes.security;

import ch.ethy.recipes.user.Role;
import java.util.Set;

/**
 * Internal result of authentication: the tokens to hand back plus the user's identity (immutable
 * id, username, email), roles and preferred UI language (ISO 639-1 wire code).
 */
public record AuthTokens(
    long id,
    String accessToken,
    String refreshToken,
    String username,
    String email,
    Set<Role> roles,
    String preferredLanguage) {}
