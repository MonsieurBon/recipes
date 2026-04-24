package ch.ethy.recipes.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import ch.ethy.recipes.user.Role;
import ch.ethy.recipes.user.UserRepository;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
  @Mock private AuthenticationManager authenticationManager;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private UserRepository userRepository;

  private final JwtService jwtService = new JwtService();

  @Test
  void loginProducesTokenCarryingAuthenticatedUsernameAndRoles() {
    var principal =
        new org.springframework.security.core.userdetails.User(
            "alice", "pw", Set.of(Role.USER, Role.ADMIN));
    Authentication authenticated =
        new UsernamePasswordAuthenticationToken(principal, "pw", principal.getAuthorities());
    when(authenticationManager.authenticate(any())).thenReturn(authenticated);

    AuthService authService =
        new AuthService(authenticationManager, jwtService, passwordEncoder, userRepository);

    String token = authService.login(new LoginCredentials("alice", "pw"));

    JwtService.TokenData parsed = jwtService.parseToken(token);
    assertEquals("alice", parsed.username());
    assertEquals(Set.of(Role.USER, Role.ADMIN), parsed.roles());
  }

  @Test
  void loginThrowsWhenPrincipalIsNotAUserDetailsUser() {
    Authentication authenticated =
        new UsernamePasswordAuthenticationToken("not-a-user-object", "pw", Set.of());
    when(authenticationManager.authenticate(any())).thenReturn(authenticated);

    AuthService authService =
        new AuthService(authenticationManager, jwtService, passwordEncoder, userRepository);

    assertThrows(
        IllegalStateException.class, () -> authService.login(new LoginCredentials("alice", "pw")));
  }

  @Test
  void loginExceptionMessageDoesNotLeakPrincipalDetailsOrClassName() {
    String sensitivePrincipal = "alice@sensitive.example";
    Authentication authenticated =
        new UsernamePasswordAuthenticationToken(sensitivePrincipal, "pw", Set.of());
    when(authenticationManager.authenticate(any())).thenReturn(authenticated);

    AuthService authService =
        new AuthService(authenticationManager, jwtService, passwordEncoder, userRepository);

    IllegalStateException thrown =
        assertThrows(
            IllegalStateException.class,
            () -> authService.login(new LoginCredentials("alice", "pw")));

    assertFalse(thrown.getMessage().contains(sensitivePrincipal));
    assertFalse(thrown.getMessage().contains(String.class.getName()));
  }
}
