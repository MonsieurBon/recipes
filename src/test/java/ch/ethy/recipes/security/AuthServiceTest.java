package ch.ethy.recipes.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import ch.ethy.recipes.user.Role;
import ch.ethy.recipes.user.UserRepository;
import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
  @Mock private AuthenticationManager authenticationManager;
  @Mock private JwtService jwtService;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private UserRepository userRepository;

  @InjectMocks private AuthService authService;

  private Logger authServiceLogger;
  private ListAppender<ILoggingEvent> logAppender;

  @BeforeEach
  void captureAuthServiceLogs() {
    authServiceLogger = (Logger) LoggerFactory.getLogger(AuthService.class);
    logAppender = new ListAppender<>();
    logAppender.start();
    authServiceLogger.addAppender(logAppender);
    authServiceLogger.setAdditive(false);
  }

  @AfterEach
  void restoreAuthServiceLogs() {
    authServiceLogger.detachAppender(logAppender);
    authServiceLogger.setAdditive(true);
  }

  @Test
  void loginAsksJwtServiceToTokenizeAuthenticatedUsernameAndRoles() {
    var principal =
        new org.springframework.security.core.userdetails.User(
            "alice", "pw", Set.of(Role.USER, Role.ADMIN));
    Authentication authenticated =
        new UsernamePasswordAuthenticationToken(principal, "pw", principal.getAuthorities());
    when(authenticationManager.authenticate(any())).thenReturn(authenticated);
    when(jwtService.generateToken("alice", Set.of(Role.USER, Role.ADMIN))).thenReturn("token-xyz");

    LoginResponse response = authService.login(new LoginCredentials("alice", "pw"));

    assertEquals("token-xyz", response.token());
    assertEquals(Set.of(Role.USER, Role.ADMIN), response.roles());
  }

  @Test
  void loginThrowsAndLogsPrincipalClassWhenPrincipalIsNotAUserDetailsUser() {
    Authentication authenticated =
        new UsernamePasswordAuthenticationToken("not-a-user-object", "pw", Set.of());
    when(authenticationManager.authenticate(any())).thenReturn(authenticated);

    assertThrows(
        IllegalStateException.class, () -> authService.login(new LoginCredentials("alice", "pw")));

    assertEquals(1, logAppender.list.size());
    ILoggingEvent logged = logAppender.list.get(0);
    assertEquals(Level.ERROR, logged.getLevel());
    assertTrue(
        logged.getFormattedMessage().contains(String.class.getName()),
        "Diagnostic log should name the unexpected principal class for operators: "
            + logged.getFormattedMessage());
  }

  @Test
  void loginExceptionMessageDoesNotLeakPrincipalDetailsOrClassName() {
    String sensitivePrincipal = "alice@sensitive.example";
    Authentication authenticated =
        new UsernamePasswordAuthenticationToken(sensitivePrincipal, "pw", Set.of());
    when(authenticationManager.authenticate(any())).thenReturn(authenticated);

    IllegalStateException thrown =
        assertThrows(
            IllegalStateException.class,
            () -> authService.login(new LoginCredentials("alice", "pw")));

    assertFalse(thrown.getMessage().contains(sensitivePrincipal));
    assertFalse(thrown.getMessage().contains(String.class.getName()));
  }
}
