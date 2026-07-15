package ch.ethy.recipes.security;

import java.util.Collection;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

/**
 * Authenticated principal backed by a validated access token. Extends Spring's {@link User} with
 * the token's user id — the only stable, immutable identifier — so self-service endpoints can
 * resolve the caller by id rather than by a mutable username or email.
 */
public class AuthenticatedUser extends User {
  private final long userId;

  public AuthenticatedUser(
      long userId, String username, Collection<? extends GrantedAuthority> authorities) {
    // The principal authenticates solely via the validated JWT, so its password is never checked.
    // The {noop} prefix keeps that explicit and degrades gracefully (a non-match, not a
    // DelegatingPasswordEncoder parse failure) if it ever reaches a password check.
    super(username, "{noop}NONE", authorities);
    this.userId = userId;
  }

  public long getUserId() {
    return userId;
  }

  /**
   * Two principals are the same caller when they share the immutable user id — the whole point of
   * resolving callers by id. Identity deliberately ignores the mutable username that {@link User}
   * keys on, so a principal isn't mistaken for a different account that merely reused its name.
   */
  @Override
  public boolean equals(Object o) {
    return o instanceof AuthenticatedUser other && userId == other.userId;
  }

  @Override
  public int hashCode() {
    return Long.hashCode(userId);
  }
}
