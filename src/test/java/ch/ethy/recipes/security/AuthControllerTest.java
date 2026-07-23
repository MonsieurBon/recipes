package ch.ethy.recipes.security;

import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ch.ethy.recipes.user.Role;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
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
        .thenReturn(
            CompletableFuture.completedFuture(
                new AuthTokens(
                    42L,
                    "access-1",
                    "refresh-1",
                    "alice",
                    "alice@example.com",
                    Set.of(Role.USER),
                    "fr")));

    MvcResult suspended =
        mockMvc
            .perform(
                post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"usernameOrEmail\":\"alice\",\"password\":\"pw\"}"))
            .andExpect(request().asyncStarted())
            .andReturn();

    MvcResult result =
        mockMvc
            .perform(asyncDispatch(suspended))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").value("access-1"))
            .andExpect(jsonPath("$.id").value(42))
            .andExpect(jsonPath("$.username").value("alice"))
            .andExpect(jsonPath("$.email").value("alice@example.com"))
            .andExpect(jsonPath("$.preferredLanguage").value("fr"))
            .andReturn();

    String setCookie = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
    assertNotNull(setCookie);
    assertTrue(setCookie.contains("refreshToken=refresh-1"), setCookie);
    assertTrue(setCookie.contains("HttpOnly"), setCookie);
  }

  @Test
  void loginWithBadCredentialsReturns401() throws Exception {
    when(authService.login(any()))
        .thenReturn(CompletableFuture.failedFuture(new BadCredentialsException("nope")));

    MvcResult suspended =
        mockMvc
            .perform(
                post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"usernameOrEmail\":\"alice\",\"password\":\"wrong\"}"))
            .andExpect(request().asyncStarted())
            .andReturn();

    mockMvc.perform(asyncDispatch(suspended)).andExpect(status().isUnauthorized());
  }

  @Test
  void loginWithAnUnexpectedFailureIsNotMaskedAsInvalidCredentials() throws Exception {
    when(authService.login(any()))
        .thenReturn(CompletableFuture.failedFuture(new IllegalStateException("user vanished")));

    MvcResult suspended =
        mockMvc
            .perform(
                post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"usernameOrEmail\":\"alice\",\"password\":\"pw\"}"))
            .andExpect(request().asyncStarted())
            .andReturn();

    // No resolver maps IllegalStateException, so MockMvc surfaces it as a ServletException where
    // a real container would render a 500 — the point is it must not become a 401.
    ServletException thrown =
        assertThrows(ServletException.class, () -> mockMvc.perform(asyncDispatch(suspended)));
    assertInstanceOf(IllegalStateException.class, thrown.getRootCause());
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
        // Validation rejects the request before the handler runs, so the 400 is synchronous —
        // malformed requests never enter the delayed (suspended) failure path.
        .andExpect(request().asyncNotStarted())
        .andExpect(status().isBadRequest());
  }

  @Test
  void loginAtTheMaxLengthBoundaryIsAccepted() throws Exception {
    when(authService.login(any()))
        .thenReturn(
            CompletableFuture.completedFuture(
                new AuthTokens(
                    42L,
                    "access-1",
                    "refresh-1",
                    "alice",
                    "alice@example.com",
                    Set.of(Role.USER),
                    "de")));
    String maxLength = "a".repeat(256); // exactly the @Size(max) cap — must pass, not 400

    MvcResult suspended =
        mockMvc
            .perform(
                post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"usernameOrEmail\":\""
                            + maxLength
                            + "\",\"password\":\""
                            + maxLength
                            + "\"}"))
            .andExpect(request().asyncStarted())
            .andReturn();

    mockMvc.perform(asyncDispatch(suspended)).andExpect(status().isOk());
  }

  static Stream<String> invalidRegisterInputs() {
    String overlong = "a".repeat(256); // one over the 255 cap (and the VARCHAR(255) column width)
    String overlongEmail = "a".repeat(249) + "@ex.com"; // 256 chars, still a valid address shape
    return Stream.of(
        "{\"username\":\"\",\"email\":\"\",\"password\":\"\"}", // blank fields
        "{}", // fields missing entirely (null)
        "{\"username\":\"alice\",\"email\":\"not-an-email\",\"password\":\"long-enough-pw\"}", // malformed email
        "{\"username\":\""
            + overlong
            + "\",\"email\":\"a@b.com\",\"password\":\"long-enough-pw\"}", // username too long
        "{\"username\":\"alice\",\"email\":\""
            + overlongEmail
            + "\",\"password\":\"long-enough-pw\"}", // email too long
        "{\"username\":\"alice\",\"email\":\"a@b.com\",\"password\":\""
            + "a".repeat(73)
            + "\"}", // password one over the 72-byte BCrypt ceiling
        "{\"username\":\"alice\",\"email\":\"a@b.com\",\"password\":\""
            + ("ä".repeat(36) + "a")
            + "\"}", // 37 chars but 73 UTF-8 bytes — one over the ceiling despite under 72 chars
        "{\"username\":\"alice\",\"email\":\"a@b.com\",\"password\":\""
            + "a".repeat(11)
            + "\"}"); // password one under the 12-char minimum
  }

  @ParameterizedTest
  @MethodSource("invalidRegisterInputs")
  void registerWithInvalidInputReturns400(String body) throws Exception {
    mockMvc
        .perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isBadRequest());
  }

  @Test
  void registerWithValidInputReturns200() throws Exception {
    mockMvc
        .perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"username\":\"alice\",\"email\":\"alice@example.com\",\"password\":\"long-enough-pw\"}"))
        .andExpect(status().isOk());
  }

  @Test
  void registerAtTheMinPasswordLengthBoundaryIsAccepted() throws Exception {
    String minPassword = "a".repeat(12); // exactly the @Size(min) floor — must pass, not 400

    mockMvc
        .perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"username\":\"alice\",\"email\":\"alice@example.com\",\"password\":\""
                        + minPassword
                        + "\"}"))
        .andExpect(status().isOk());
  }

  @Test
  void registerAtTheMaxPasswordLengthBoundaryIsAccepted() throws Exception {
    String maxPassword = "a".repeat(72); // exactly the BCrypt byte ceiling — must pass, not 400

    mockMvc
        .perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"username\":\"alice\",\"email\":\"alice@example.com\",\"password\":\""
                        + maxPassword
                        + "\"}"))
        .andExpect(status().isOk());
  }

  @Test
  void registerCarriesTheChosenPreferredLanguage() throws Exception {
    mockMvc
        .perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"username\":\"alice\",\"email\":\"alice@example.com\",\"password\":\"long-enough-pw\",\"preferredLanguage\":\"fr\"}"))
        .andExpect(status().isOk());
  }

  @Test
  void registerWithAnUnsupportedPreferredLanguageReturns400() throws Exception {
    mockMvc
        .perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"username\":\"alice\",\"email\":\"alice@example.com\",\"password\":\"long-enough-pw\",\"preferredLanguage\":\"es\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void registerWithDuplicateUserReturns409() throws Exception {
    doThrow(new DuplicateUserException(List.of("username"))).when(authService).register(any());

    mockMvc
        .perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"username\":\"taken\",\"email\":\"alice@example.com\",\"password\":\"long-enough-pw\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.conflictingFields[0]").value("username"));
  }

  @Test
  void registerAtTheMaxLengthBoundaryIsAccepted() throws Exception {
    String maxUsername = "a".repeat(255); // exactly the @Size(max) cap — must pass, not 400

    mockMvc
        .perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"username\":\""
                        + maxUsername
                        + "\",\"email\":\"alice@example.com\",\"password\":\"long-enough-pw\"}"))
        .andExpect(status().isOk());
  }

  @Test
  void refreshWithoutACookieReturns401() throws Exception {
    when(authService.refresh(null)).thenThrow(new InvalidRefreshTokenException("missing"));

    mockMvc.perform(post("/api/auth/refresh")).andExpect(status().isUnauthorized());
  }

  @Test
  void refreshWithACookieRotatesItAndReturnsTheAccessToken() throws Exception {
    when(authService.refresh("old-refresh"))
        .thenReturn(
            new AuthTokens(
                42L,
                "access-2",
                "refresh-2",
                "alice",
                "alice@example.com",
                Set.of(Role.USER),
                "it"));

    MvcResult result =
        mockMvc
            .perform(post("/api/auth/refresh").cookie(new Cookie("refreshToken", "old-refresh")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").value("access-2"))
            .andExpect(jsonPath("$.username").value("alice"))
            .andExpect(jsonPath("$.email").value("alice@example.com"))
            .andExpect(jsonPath("$.preferredLanguage").value("it"))
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
