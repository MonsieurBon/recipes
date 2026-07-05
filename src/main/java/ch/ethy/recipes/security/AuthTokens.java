package ch.ethy.recipes.security;

import ch.ethy.recipes.user.Role;
import java.util.Set;

/**
 * Internal result of authentication: the tokens to hand back plus the user's identity (username,
 * email) and roles.
 */
public record AuthTokens(
    String accessToken, String refreshToken, String username, String email, Set<Role> roles) {}
