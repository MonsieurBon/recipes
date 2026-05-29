package ch.ethy.recipes.security;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ch.ethy.recipes.user.Role;
import jakarta.servlet.http.Cookie;
import java.util.Set;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@WebMvcTest(AuthController.class)
@Import(RefreshTokenCookieFactory.class)
class AuthControllerTest {

  @TestConfiguration
  static class SecurityTestConfig {
    @Bean
    SecurityFilterChain testSecurityFilterChain(HttpSecurity http) throws Exception {
      return http.csrf(AbstractHttpConfigurer::disable)
          .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
          .build();
    }
  }

  @Autowired private MockMvc mockMvc;
  @MockitoBean private AuthService authService;

  // JWTFilter is pulled into the slice and needs these collaborators.
  @MockitoBean private JwtService jwtService;
  @MockitoBean private TokenVersionService tokenVersionService;

  @Test
  void loginSetsTheRefreshCookieAndReturnsTheAccessToken() throws Exception {
    when(authService.login(any()))
        .thenReturn(new AuthTokens("access-1", "refresh-1", Set.of(Role.USER)));

    MvcResult result =
        mockMvc
            .perform(
                post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"usernameOrEmail\":\"alice\",\"password\":\"pw\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").value("access-1"))
            .andReturn();

    String setCookie = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
    assertNotNull(setCookie);
    assertTrue(setCookie.contains("refreshToken=refresh-1"), setCookie);
    assertTrue(setCookie.contains("HttpOnly"), setCookie);
  }

  @Test
  void loginWithBadCredentialsReturns401() throws Exception {
    when(authService.login(any())).thenThrow(new BadCredentialsException("nope"));

    mockMvc
        .perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"usernameOrEmail\":\"alice\",\"password\":\"wrong\"}"))
        .andExpect(status().isUnauthorized());
  }

  static Stream<String> invalidLoginInputs() {
    String overlong = "a".repeat(257);
    return Stream.of(
        "{\"usernameOrEmail\":\"\",\"password\":\"\"}", // blank fields
        "{}", // fields missing entirely (null)
        "{\"usernameOrEmail\":\"alice\",\"password\":\"" + overlong + "\"}", // password too long
        "{\"usernameOrEmail\":\"" + overlong + "\",\"password\":\"pw\"}"); // username too long
  }

  @ParameterizedTest
  @MethodSource("invalidLoginInputs")
  void loginWithInvalidInputReturns400(String body) throws Exception {
    mockMvc
        .perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isBadRequest());
  }

  @Test
  void refreshWithoutACookieReturns401() throws Exception {
    when(authService.refresh(null)).thenThrow(new InvalidRefreshTokenException("missing"));

    mockMvc.perform(post("/api/auth/refresh")).andExpect(status().isUnauthorized());
  }

  @Test
  void refreshWithACookieRotatesItAndReturnsTheAccessToken() throws Exception {
    when(authService.refresh("old-refresh"))
        .thenReturn(new AuthTokens("access-2", "refresh-2", Set.of(Role.USER)));

    MvcResult result =
        mockMvc
            .perform(post("/api/auth/refresh").cookie(new Cookie("refreshToken", "old-refresh")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").value("access-2"))
            .andReturn();

    String setCookie = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
    assertNotNull(setCookie);
    assertTrue(setCookie.contains("refreshToken=refresh-2"), setCookie);
  }

  @Test
  void logoutClearsTheRefreshCookie() throws Exception {
    MvcResult result =
        mockMvc.perform(post("/api/auth/logout")).andExpect(status().isNoContent()).andReturn();

    String setCookie = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
    assertNotNull(setCookie);
    assertTrue(setCookie.contains("refreshToken="), setCookie);
    assertTrue(setCookie.contains("Max-Age=0"), setCookie);
  }
}
