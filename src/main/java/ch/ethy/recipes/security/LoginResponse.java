package ch.ethy.recipes.security;

import ch.ethy.recipes.user.Role;
import java.util.Set;

/**
 * Returned to the client after a successful login or token refresh.
 *
 * <p>{@code token} is the short-lived access token sent on every request. The refresh token is not
 * in the body — it is delivered as an {@code HttpOnly} cookie so it is never exposed to JavaScript.
 *
 * <p>The {@code roles} field is a convenience hint for UI rendering only (e.g., deciding which
 * navigation items to show). It is <strong>not</strong> authoritative — every protected request is
 * authorized server-side by re-parsing the signed JWT, so a tampered or stale client copy of the
 * roles cannot grant access.
 */
public record LoginResponse(String token, Set<Role> roles) {}
