package ch.ethy.recipes.security;

import ch.ethy.recipes.user.Role;
import java.util.Set;

/** Internal result of authentication: the tokens to hand back plus the user's roles. */
public record AuthTokens(String accessToken, String refreshToken, Set<Role> roles) {}
