package ch.ethy.recipes.security;

import ch.ethy.recipes.user.Role;
import java.util.Set;

/**
 * Returned to the client after a successful login.
 *
 * <p>The {@code roles} field is a convenience hint for UI rendering only (e.g., deciding which
 * navigation items to show). It is <strong>not</strong> authoritative — every protected request is
 * authorized server-side by re-parsing the signed JWT, so a tampered or stale client copy of the
 * roles cannot grant access.
 */
public record LoginResponse(String token, Set<Role> roles) {}
