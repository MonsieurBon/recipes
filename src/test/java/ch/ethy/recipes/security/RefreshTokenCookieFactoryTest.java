package ch.ethy.recipes.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;

class RefreshTokenCookieFactoryTest {
  private final RefreshTokenCookieFactory factory =
      new RefreshTokenCookieFactory(Duration.ofDays(7), true);

  @Test
  void issueProducesAnHttpOnlySecureStrictCookieScopedToAuth() {
    ResponseCookie c = factory.issue("the-token");

    assertEquals("refreshToken", c.getName());
    assertEquals("the-token", c.getValue());
    assertTrue(c.isHttpOnly());
    assertTrue(c.isSecure());
    assertEquals("Strict", c.getSameSite());
    assertEquals("/api/auth", c.getPath());
    assertEquals(Duration.ofDays(7), c.getMaxAge());
  }

  @Test
  void clearProducesAnImmediatelyExpiredCookieWithTheSameAttributes() {
    ResponseCookie c = factory.clear();

    assertEquals("refreshToken", c.getName());
    assertEquals("", c.getValue());
    assertEquals(Duration.ZERO, c.getMaxAge());
    assertTrue(c.isHttpOnly());
    assertEquals("/api/auth", c.getPath());
  }

  @Test
  void secureFlagFollowsConfiguration() {
    ResponseCookie insecure = new RefreshTokenCookieFactory(Duration.ofDays(7), false).issue("t");

    assertFalse(insecure.isSecure());
  }
}
