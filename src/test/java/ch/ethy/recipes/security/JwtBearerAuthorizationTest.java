package ch.ethy.recipes.security;

import static org.mockito.Mockito.when;
import static org.springframework.security.config.http.SessionCreationPolicy.STATELESS;
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
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * End-to-end test of the access-token authorization path: a real token is minted, presented in the
 * {@code Authorization} header, parsed and validated by the real {@code JWTFilter}, and the
 * resulting authorities are checked against a {@code @RolesAllowed("ADMIN")} endpoint. The
 * role-string encoding crosses the JWT wire format, the filter, and Spring's method security with
 * no other test guarding the full path.
 */
@WebMvcTest(
    controllers = UserController.class,
    // The production JWTFilter is a Filter bean, so the slice would otherwise auto-register it as a
    // top-level servlet filter. We exclude it and add our own instance inside the security chain
    // (mirroring SecurityConfig) so it runs at the right point, after the context-holder filter.
    excludeFilters =
        @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JWTFilter.class))
class JwtBearerAuthorizationTest {

  private static final String TEST_ENCODED_KEY =
      "sPYf4F91EbSV6mfc+ZoqZhVuZih8mTiyx1jjPCq8qeuBaCnOlpq8gm3XwFPFo8Sj";

  @TestConfiguration
  @EnableMethodSecurity(jsr250Enabled = true)
  static class SecurityTestConfig {
    @Bean
    JwtService jwtService() {
      return new JwtService(TEST_ENCODED_KEY, Duration.ofMinutes(15), Duration.ofDays(7));
    }

    @Bean
    SecurityFilterChain testSecurityFilterChain(
        HttpSecurity http, JwtService jwtService, TokenVersionService tokenVersionService)
        throws Exception {
      return http.csrf(AbstractHttpConfigurer::disable)
          .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
          .anonymous(AbstractHttpConfigurer::disable)
          .exceptionHandling(
              eh -> eh.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
          .sessionManagement(sm -> sm.sessionCreationPolicy(STATELESS))
          .addFilterBefore(
              new JWTFilter(jwtService, tokenVersionService),
              UsernamePasswordAuthenticationFilter.class)
          .build();
    }
  }

  @Autowired private MockMvc mockMvc;
  @Autowired private JwtService jwtService;
  @MockitoBean private UserService userService;
  @MockitoBean private TokenVersionService tokenVersionService;

  @BeforeEach
  void stubExistingUser() {
    when(userService.findUser(1L))
        .thenReturn(Optional.of(new UserDto(1L, "alice", "alice@example.com")));
    when(tokenVersionService.getCurrentVersion(1L)).thenReturn(0);
  }

  @Test
  void adminTokenReachesRolesAllowedEndpoint() throws Exception {
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
}
