package ch.ethy.recipes.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import ch.ethy.recipes.user.Role;
import ch.ethy.recipes.user.User;
import ch.ethy.recipes.user.UserRepository;
import java.time.Duration;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * Regression test pinning the bounded role-revocation guarantee (#145): once a user's tokens are
 * revoked (token version bumped), their outstanding access token stops authenticating, and the next
 * refresh hands back a token carrying the user's current — reduced — role.
 */
@ExtendWith(MockitoExtension.class)
class RoleRevocationTest {
  private static final String TEST_ENCODED_KEY =
      "sPYf4F91EbSV6mfc+ZoqZhVuZih8mTiyx1jjPCq8qeuBaCnOlpq8gm3XwFPFo8Sj";

  @Mock private UserRepository userRepository;
  @Mock private AuthenticationManager authenticationManager;
  @Mock private PasswordEncoder passwordEncoder;

  private final JwtService jwtService =
      new JwtService(TEST_ENCODED_KEY, Duration.ofMinutes(15), Duration.ofDays(7));
  private TokenVersionService tokenVersionService;
  private JWTFilter filter;
  private AuthService authService;

  @BeforeEach
  void setUp() {
    tokenVersionService = new TokenVersionService(userRepository);
    filter = new JWTFilter(jwtService, tokenVersionService);
    // This test only exercises refresh, so the login failure delay is wired inert.
    FailedLoginDelay noDelay = new FailedLoginDelay(Duration.ZERO, (task, delay) -> task.run());
    authService =
        new AuthService(
            authenticationManager, noDelay, jwtService, passwordEncoder, userRepository);
  }

  @AfterEach
  void clearSecurityContext() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void demotionRejectsTheStaleAccessTokenAndRefreshDowngradesTheSession() throws Exception {
    // Given an admin holding tokens minted at version 0.
    when(userRepository.findTokenVersionById(42L)).thenReturn(Optional.of(0));
    String accessToken =
        jwtService.generateAccessToken(42L, "alice", Set.of(Role.USER, Role.ADMIN), 0);
    String refreshToken = jwtService.generateRefreshToken(42L, "alice");

    Authentication asAdmin = authenticate(accessToken);
    assertNotNull(asAdmin);
    assertTrue(asAdmin.getAuthorities().contains(Role.ADMIN));

    // When the user is demoted to USER and their tokens are revoked (version -> 1).
    User demoted = new User();
    demoted.setId(42L);
    demoted.setUsername("alice");
    ReflectionTestUtils.setField(demoted, "tokenVersion", 1);
    when(userRepository.findById(42L)).thenReturn(Optional.of(demoted));
    when(userRepository.findTokenVersionById(42L)).thenReturn(Optional.of(1));
    when(userRepository.incrementTokenVersion(42L)).thenReturn(1);
    tokenVersionService.revokeTokens(42L);

    // Then the stale access token no longer authenticates.
    MockHttpServletResponse rejected = runFilter(accessToken);
    assertEquals(401, rejected.getStatus());
    assertNull(SecurityContextHolder.getContext().getAuthentication());

    // And refreshing yields a usable access token carrying only the reduced role.
    AuthTokens refreshed = authService.refresh(refreshToken);
    JwtService.TokenData newAccess = jwtService.parseToken(refreshed.accessToken());
    assertEquals(Set.of(Role.USER), newAccess.roles());
    assertEquals(1, newAccess.version());

    Authentication asUser = authenticate(refreshed.accessToken());
    assertNotNull(asUser);
    assertTrue(asUser.getAuthorities().contains(Role.USER));
    assertFalse(asUser.getAuthorities().contains(Role.ADMIN));
  }

  private Authentication authenticate(String token) throws Exception {
    runFilter(token);
    return SecurityContextHolder.getContext().getAuthentication();
  }

  private MockHttpServletResponse runFilter(String token) throws Exception {
    SecurityContextHolder.clearContext();
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader("Authorization", "Bearer " + token);
    MockHttpServletResponse response = new MockHttpServletResponse();
    filter.doFilter(request, response, new MockFilterChain());
    return response;
  }
}
