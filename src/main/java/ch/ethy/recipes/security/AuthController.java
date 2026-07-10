package ch.ethy.recipes.security;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthService authService;
  private final RefreshTokenCookieFactory refreshTokenCookieFactory;

  public AuthController(
      AuthService authService, RefreshTokenCookieFactory refreshTokenCookieFactory) {
    this.authService = authService;
    this.refreshTokenCookieFactory = refreshTokenCookieFactory;
  }

  /**
   * Logs the user in.
   *
   * <p>Returning a future lets Spring MVC suspend the request instead of blocking a request thread:
   * a failed login completes only once the configured failure delay has elapsed, and the 401 is
   * dispatched then. A successful login completes immediately.
   */
  @PostMapping("/login")
  public CompletableFuture<LoginResponse> login(
      @RequestBody @Valid LoginCredentials credentials, HttpServletResponse response) {
    return authService
        .login(credentials)
        .handle(
            (tokens, failure) -> {
              if (failure == null) {
                return respondWithTokens(tokens, response);
              }
              if (unwrap(failure) instanceof AuthenticationException) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
              }
              throw new CompletionException(failure);
            });
  }

  private static Throwable unwrap(Throwable failure) {
    return failure instanceof CompletionException && failure.getCause() != null
        ? failure.getCause()
        : failure;
  }

  @PostMapping("/refresh")
  public LoginResponse refresh(
      @CookieValue(value = RefreshTokenCookieFactory.NAME, required = false) String refreshToken,
      HttpServletResponse response) {
    try {
      return respondWithTokens(authService.refresh(refreshToken), response);
    } catch (InvalidRefreshTokenException e) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
    }
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout(HttpServletResponse response) {
    response.addHeader(HttpHeaders.SET_COOKIE, refreshTokenCookieFactory.clear().toString());
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/register")
  public ResponseEntity<?> register(@RequestBody @Valid RegistrationDetails registrationDetails) {
    try {
      this.authService.register(registrationDetails);
      return ResponseEntity.ok().build();
    } catch (DuplicateUserException e) {
      return ResponseEntity.status(HttpStatus.CONFLICT)
          .body(Map.of("conflictingFields", e.getConflictingFields()));
    }
  }

  private LoginResponse respondWithTokens(AuthTokens tokens, HttpServletResponse response) {
    response.addHeader(
        HttpHeaders.SET_COOKIE, refreshTokenCookieFactory.issue(tokens.refreshToken()).toString());
    return new LoginResponse(
        tokens.accessToken(),
        tokens.username(),
        tokens.email(),
        tokens.roles(),
        tokens.preferredLanguage());
  }
}
