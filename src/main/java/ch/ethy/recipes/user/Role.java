package ch.ethy.recipes.user;

import org.springframework.security.core.GrantedAuthority;

/**
 * User roles, used in two distinct serialization contexts:
 *
 * <ul>
 *   <li><strong>JWT wire format</strong> — the {@code roles} claim contains the bare enum {@link
 *       #name()} (e.g. {@code "USER"}, {@code "ADMIN"}). The token is read back by matching these
 *       names to enum constants.
 *   <li><strong>Spring Security authority</strong> — {@link #getAuthority()} returns {@code "ROLE_"
 *       + name()} (e.g. {@code "ROLE_ADMIN"}), the prefix Spring's {@code hasRole(...)} and
 *       {@code @PreAuthorize("hasRole('ADMIN')")} expect.
 * </ul>
 *
 * <p>Do not add a constant whose {@link #name()} starts with {@code ROLE_} — {@link
 * #getAuthority()} would then yield {@code "ROLE_ROLE_…"} and silently fail authorization checks.
 * Tests in {@code RoleTest} and {@code JwtServiceTest} pin these two wire formats so a rename or
 * authority-format change breaks the build loudly.
 */
public enum Role implements GrantedAuthority {
  USER,
  ADMIN;

  @Override
  public String getAuthority() {
    return "ROLE_" + this.name();
  }
}
