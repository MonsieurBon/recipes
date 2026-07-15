package ch.ethy.recipes.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import ch.ethy.recipes.user.Role;
import io.jsonwebtoken.MalformedJwtException;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

@ExtendWith(MockitoExtension.class)
class JWTFilterTest {
  @Mock private JwtService jwtService;
  @Mock private TokenVersionService tokenVersionService;
  @InjectMocks private JWTFilter filter;

  private static JwtService.TokenData accessToken(long userId, int version) {
    return new JwtService.TokenData(userId, "alice", Set.of(Role.ADMIN), version, TokenType.ACCESS);
  }

  @AfterEach
  void clearSecurityContext() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void populatesAuthoritiesFromTokenRoles() throws Exception {
    when(jwtService.parseToken("opaque-token")).thenReturn(accessToken(42L, 5));
    when(tokenVersionService.getCurrentVersion(42L)).thenReturn(5);
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader("Authorization", "Bearer opaque-token");
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain chain = new MockFilterChain();

    filter.doFilter(request, response, chain);

    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    assertNotNull(auth);
    assertEquals("alice", ((UserDetails) auth.getPrincipal()).getUsername());
    assertTrue(auth.getAuthorities().contains(Role.ADMIN));
  }

  @Test
  void carriesTheTokenUserIdOnThePrincipal() throws Exception {
    when(jwtService.parseToken("opaque-token")).thenReturn(accessToken(42L, 5));
    when(tokenVersionService.getCurrentVersion(42L)).thenReturn(5);
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader("Authorization", "Bearer opaque-token");
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain chain = new MockFilterChain();

    filter.doFilter(request, response, chain);

    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    assertNotNull(auth);
    assertEquals(42L, ((AuthenticatedUser) auth.getPrincipal()).getUserId());
  }

  @Test
  void rejectsAccessTokenWhoseVersionIsStale() throws Exception {
    when(jwtService.parseToken("stale-token")).thenReturn(accessToken(42L, 5));
    when(tokenVersionService.getCurrentVersion(42L)).thenReturn(6);
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader("Authorization", "Bearer stale-token");
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain chain = new MockFilterChain();

    filter.doFilter(request, response, chain);

    assertEquals(401, response.getStatus());
    assertNull(SecurityContextHolder.getContext().getAuthentication());
    assertNull(chain.getRequest());
  }

  @Test
  void rejectsRefreshTokenPresentedAsAccessToken() throws Exception {
    when(jwtService.parseToken("refresh-token"))
        .thenReturn(new JwtService.TokenData(42L, "alice", Set.of(), 5, TokenType.REFRESH));
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader("Authorization", "Bearer refresh-token");
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain chain = new MockFilterChain();

    filter.doFilter(request, response, chain);

    assertEquals(401, response.getStatus());
    assertNull(SecurityContextHolder.getContext().getAuthentication());
    assertNull(chain.getRequest());
  }

  @Test
  void skipsAuthenticationWhenHeaderMissing() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest();
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain chain = new MockFilterChain();

    filter.doFilter(request, response, chain);

    assertNull(SecurityContextHolder.getContext().getAuthentication());
  }

  @Test
  void respondsUnauthorizedOnInvalidSignature() throws Exception {
    when(jwtService.parseToken("not-a-real-token"))
        .thenThrow(new MalformedJwtException("bad signature"));
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader("Authorization", "Bearer not-a-real-token");
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain chain = new MockFilterChain();

    filter.doFilter(request, response, chain);

    assertEquals(401, response.getStatus());
    assertNull(SecurityContextHolder.getContext().getAuthentication());
  }

  @Test
  void doesNotContinueFilterChainAfterInvalidTokenError() throws Exception {
    when(jwtService.parseToken("not-a-real-token"))
        .thenThrow(new MalformedJwtException("bad signature"));
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader("Authorization", "Bearer not-a-real-token");
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain chain = new MockFilterChain();

    filter.doFilter(request, response, chain);

    assertNull(chain.getRequest());
  }

  @Test
  void treatsAuthHeaderWithoutSpaceAfterBearerAsAbsent() throws Exception {
    // RFC 6750 requires the prefix to be exactly "Bearer " with a trailing space.
    // "Bearertoken_value" must not be sliced into a token.
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader("Authorization", "Bearertoken_value_here");
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain chain = new MockFilterChain();

    filter.doFilter(request, response, chain);

    assertNull(SecurityContextHolder.getContext().getAuthentication());
    assertEquals(200, response.getStatus());
    assertNotNull(chain.getRequest());
  }

  @Test
  void doesNotContinueFilterChainAfterBlankBearerToken() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader("Authorization", "Bearer ");
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain chain = new MockFilterChain();

    filter.doFilter(request, response, chain);

    assertNull(chain.getRequest());
    assertEquals(400, response.getStatus());
  }
}
