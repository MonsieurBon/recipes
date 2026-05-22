package ch.ethy.recipes.security;

import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
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

  @PostMapping("/login")
  public LoginResponse login(
      @RequestBody LoginCredentials credentials, HttpServletResponse response) {
    try {
      return respondWithTokens(authService.login(credentials), response);
    } catch (AuthenticationException e) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
    }
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
  public ResponseEntity<?> register(@RequestBody RegistrationDetails registrationDetails) {
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
    return new LoginResponse(tokens.accessToken(), tokens.roles());
  }
}
