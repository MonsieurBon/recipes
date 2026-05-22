package ch.ethy.recipes.security;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * Builds the {@code Set-Cookie} for the refresh token. The cookie is {@code HttpOnly} (invisible to
 * JavaScript, so an XSS payload cannot read it), {@code SameSite=Strict} (not sent on cross-site
 * requests), and scoped to {@code /api/auth} so it travels only to the auth endpoints. {@code
 * Secure} is configurable so local development over plain HTTP still works.
 */
@Component
public class RefreshTokenCookieFactory {
  public static final String NAME = "refreshToken";
  private static final String PATH = "/api/auth";

  private final Duration refreshTtl;
  private final boolean secure;

  public RefreshTokenCookieFactory(
      @Value("${auth.jwt.refresh-ttl}") Duration refreshTtl,
      @Value("${auth.refresh-cookie.secure}") boolean secure) {
    this.refreshTtl = refreshTtl;
    this.secure = secure;
  }

  public ResponseCookie issue(String token) {
    // maxAge is the full refresh TTL on every issuance, so each refresh restarts the clock:
    // sessions are rolling (sliding), not absolute. An active user stays logged in indefinitely;
    // only inactivity longer than the TTL forces re-authentication.
    return base(token).maxAge(refreshTtl).build();
  }

  public ResponseCookie clear() {
    return base("").maxAge(0).build();
  }

  private ResponseCookie.ResponseCookieBuilder base(String value) {
    return ResponseCookie.from(NAME, value)
        .httpOnly(true)
        .secure(secure)
        .sameSite("Strict")
        .path(PATH);
  }
}
