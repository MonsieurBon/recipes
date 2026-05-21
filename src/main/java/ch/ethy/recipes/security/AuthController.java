package ch.ethy.recipes.security;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/login")
  public LoginResponse login(@RequestBody LoginCredentials credentials) {
    try {
      return authService.login(credentials);
    } catch (AuthenticationException e) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
    }
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
}
