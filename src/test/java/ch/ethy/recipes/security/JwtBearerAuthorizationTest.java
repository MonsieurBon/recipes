package ch.ethy.recipes.security;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ch.ethy.recipes.user.Role;
import ch.ethy.recipes.user.UserController;
import ch.ethy.recipes.user.UserDto;
import ch.ethy.recipes.user.UserService;
import java.time.Duration;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * End-to-end test of the access-token authorization path: a real token is minted, presented in the
 * {@code Authorization} header, parsed and validated by the real {@code JWTFilter}, and the
 * resulting authorities are checked against the production {@link SecurityConfig} rule that gates
 * {@code /api/users/**} on the {@code ADMIN} role. The role-string encoding crosses the JWT wire
 * format, the filter, and Spring Security's authorization with no other test minting a real token
 * over the full path.
 */
@WebMvcTest(controllers = UserController.class)
@Import(SecurityConfig.class)
class JwtBearerAuthorizationTest {

  private static final String TEST_ENCODED_KEY =
      "sPYf4F91EbSV6mfc+ZoqZhVuZih8mTiyx1jjPCq8qeuBaCnOlpq8gm3XwFPFo8Sj";

  /**
   * Supplies the production security collaborators the web slice does not component-scan. {@link
   * JwtService} is real (with a test key) so tokens are genuinely minted and parsed.
   */
  @TestConfiguration
  static class SecurityCollaborators {
    @Bean
    JwtService jwtService() {
      return new JwtService(TEST_ENCODED_KEY, Duration.ofMinutes(15), Duration.ofDays(7));
    }

    @Bean
    AccessDeniedHandler accessDeniedHandler() {
      return new AccessDeniedHandler();
    }

    @Bean
    AuthenticationEntryPoint authenticationEntryPoint() {
      return new AuthenticationEntryPoint();
    }

    @Bean
    JWTFilter jwtFilter(JwtService jwtService, TokenVersionService tokenVersionService) {
      return new JWTFilter(jwtService, tokenVersionService);
    }
  }

  @Autowired private MockMvc mockMvc;
  @Autowired private JwtService jwtService;
  @MockitoBean private UserService userService;
  @MockitoBean private UserDetailsService userDetailsService;
  @MockitoBean private TokenVersionService tokenVersionService;

  @BeforeEach
  void stubExistingUser() {
    when(userService.findUser(1L))
        .thenReturn(Optional.of(new UserDto(1L, "alice", "alice@example.com", Set.of(Role.USER))));
    when(tokenVersionService.getCurrentVersion(1L)).thenReturn(0);
  }

  @Test
  void adminTokenReachesAdminEndpoint() throws Exception {
    String token = jwtService.generateAccessToken(1L, "alice", Set.of(Role.ADMIN), 0);

    mockMvc
        .perform(get("/api/users/1").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());
  }

  @Test
  void userTokenIsForbiddenFromAdminEndpoint() throws Exception {
    String token = jwtService.generateAccessToken(1L, "alice", Set.of(Role.USER), 0);

    mockMvc
        .perform(get("/api/users/1").header("Authorization", "Bearer " + token))
        .andExpect(status().isForbidden());
  }

  @Test
  void requestWithoutTokenIsUnauthorized() throws Exception {
    mockMvc.perform(get("/api/users/1")).andExpect(status().isUnauthorized());
  }

  // The list endpoint sits at the bare /api/users path (no trailing segment); guard that the
  // /api/users/** rule still gates it, so a non-admin cannot enumerate users.
  @Test
  void userTokenIsForbiddenFromUserListEndpoint() throws Exception {
    String token = jwtService.generateAccessToken(1L, "alice", Set.of(Role.USER), 0);

    mockMvc
        .perform(get("/api/users").header("Authorization", "Bearer " + token))
        .andExpect(status().isForbidden());
  }
}
