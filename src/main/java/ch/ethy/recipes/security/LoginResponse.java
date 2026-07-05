package ch.ethy.recipes.security;

import ch.ethy.recipes.user.Role;
import java.util.Set;

/**
 * Returned to the client after a successful login or token refresh.
 *
 * <p>{@code token} is the short-lived access token sent on every request. The refresh token is not
 * in the body — it is delivered as an {@code HttpOnly} cookie so it is never exposed to JavaScript.
 *
 * <p>The {@code username}, {@code email} and {@code roles} fields are convenience hints for UI
 * rendering only (e.g., the account page's profile header, or deciding which navigation items to
 * show). They are <strong>not</strong> authoritative — every protected request is authorized
 * server-side by re-parsing the signed JWT, so a tampered or stale client copy cannot grant access.
 */
public record LoginResponse(String token, String username, String email, Set<Role> roles) {}
