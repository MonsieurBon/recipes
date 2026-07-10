package ch.ethy.recipes.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import ch.ethy.recipes.user.Language;
import ch.ethy.recipes.user.Role;
import ch.ethy.recipes.user.User;
import ch.ethy.recipes.user.UserRepository;
import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import io.jsonwebtoken.MalformedJwtException;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
  @Mock private AuthenticationManager authenticationManager;
  @Mock private FailedLoginDelay failedLoginDelay;
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
  void loginIssuesAccessAndRefreshTokensForTheAuthenticatedUser() {
    var principal =
        new org.springframework.security.core.userdetails.User(
            "alice", "pw", Set.of(Role.USER, Role.ADMIN));
    Authentication authenticated =
        new UsernamePasswordAuthenticationToken(principal, "pw", principal.getAuthorities());
    when(authenticationManager.authenticate(any())).thenReturn(authenticated);

    User user = new User();
    user.setId(42L);
    user.setUsername("alice");
    user.setEmail("alice@example.com");
    user.addRole(Role.ADMIN);
    user.setPreferredLanguage(Language.FRENCH);
    when(userRepository.findByUsernameOrEmail("alice")).thenReturn(Optional.of(user));
    when(jwtService.generateAccessToken(42L, "alice", user.getRoles(), 0)).thenReturn("access-xyz");
    when(jwtService.generateRefreshToken(42L, "alice")).thenReturn("refresh-xyz");

    AuthTokens response = authService.login(new LoginCredentials("alice", "pw")).join();

    assertEquals("access-xyz", response.accessToken());
    assertEquals("refresh-xyz", response.refreshToken());
    assertEquals("alice", response.username());
    assertEquals("alice@example.com", response.email());
    assertEquals(user.getRoles(), response.roles());
    assertEquals("fr", response.preferredLanguage());
  }

  @Test
  void loginDoesNotDelayASuccessfulLogin() {
    var principal = new org.springframework.security.core.userdetails.User("alice", "pw", Set.of());
    Authentication authenticated =
        new UsernamePasswordAuthenticationToken(principal, "pw", principal.getAuthorities());
    when(authenticationManager.authenticate(any())).thenReturn(authenticated);
    when(userRepository.findByUsernameOrEmail("alice"))
        .thenReturn(Optional.of(userEntity(42L, "alice")));

    CompletableFuture<AuthTokens> result = authService.login(new LoginCredentials("alice", "pw"));

    assertTrue(result.isDone());
    verifyNoInteractions(failedLoginDelay);
  }

  @Test
  void loginFailsThroughTheConfiguredDelayWhenAuthenticationFails() {
    BadCredentialsException failure = new BadCredentialsException("nope");
    when(authenticationManager.authenticate(any())).thenThrow(failure);
    CompletableFuture<AuthTokens> delayed = new CompletableFuture<>();
    when(failedLoginDelay.<AuthTokens>failAfterDelay(failure)).thenReturn(delayed);

    CompletableFuture<AuthTokens> result =
        authService.login(new LoginCredentials("alice", "wrong"));

    assertSame(delayed, result);
  }

  @Test
  void loginFailsTheFutureAndLogsPrincipalClassWhenPrincipalIsNotAUserDetailsUser() {
    Authentication authenticated =
        new UsernamePasswordAuthenticationToken("not-a-user-object", "pw", Set.of());
    when(authenticationManager.authenticate(any())).thenReturn(authenticated);

    CompletableFuture<AuthTokens> result = authService.login(new LoginCredentials("alice", "pw"));

    ExecutionException thrown = assertThrows(ExecutionException.class, result::get);
    assertInstanceOf(IllegalStateException.class, thrown.getCause());

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

    CompletableFuture<AuthTokens> result = authService.login(new LoginCredentials("alice", "pw"));

    ExecutionException thrown = assertThrows(ExecutionException.class, result::get);
    assertFalse(thrown.getCause().getMessage().contains(sensitivePrincipal));
    assertFalse(thrown.getCause().getMessage().contains(String.class.getName()));
  }

  @Test
  void loginFailsTheFutureWhenTheAuthenticatedUserNoLongerExists() {
    var principal = new org.springframework.security.core.userdetails.User("alice", "pw", Set.of());
    Authentication authenticated =
        new UsernamePasswordAuthenticationToken(principal, "pw", principal.getAuthorities());
    when(authenticationManager.authenticate(any())).thenReturn(authenticated);
    when(userRepository.findByUsernameOrEmail("alice")).thenReturn(Optional.empty());

    CompletableFuture<AuthTokens> result = authService.login(new LoginCredentials("alice", "pw"));

    ExecutionException thrown = assertThrows(ExecutionException.class, result::get);
    assertInstanceOf(IllegalStateException.class, thrown.getCause());
  }

  @Test
  void refreshIssuesNewTokensFromAValidRefreshToken() {
    when(jwtService.parseToken("refresh-abc"))
        .thenReturn(new JwtService.TokenData(42L, "alice", Set.of(), 0, TokenType.REFRESH));
    User user = userEntity(42L, "alice");
    when(userRepository.findById(42L)).thenReturn(Optional.of(user));
    when(jwtService.generateAccessToken(42L, "alice", user.getRoles(), 0)).thenReturn("new-access");
    when(jwtService.generateRefreshToken(42L, "alice")).thenReturn("new-refresh");

    AuthTokens response = authService.refresh("refresh-abc");

    assertEquals("new-access", response.accessToken());
    assertEquals("new-refresh", response.refreshToken());
    assertEquals("alice", response.username());
    assertEquals("alice@example.com", response.email());
    assertEquals(user.getRoles(), response.roles());
  }

  @Test
  void refreshRejectsAnAccessTokenPresentedAsRefreshToken() {
    when(jwtService.parseToken("access-abc"))
        .thenReturn(new JwtService.TokenData(42L, "alice", Set.of(Role.USER), 0, TokenType.ACCESS));

    assertThrows(InvalidRefreshTokenException.class, () -> authService.refresh("access-abc"));
  }

  @Test
  void refreshIgnoresTheRefreshTokensVersionAndMintsFromCurrentState() {
    // A refresh token minted at an older version still works; the new tokens reflect the
    // user's current state rather than the (possibly stale) claims in the refresh token.
    when(jwtService.parseToken("stale"))
        .thenReturn(new JwtService.TokenData(42L, "alice", Set.of(), 5, TokenType.REFRESH));
    User user = userEntity(42L, "alice");
    when(userRepository.findById(42L)).thenReturn(Optional.of(user));
    when(jwtService.generateAccessToken(42L, "alice", user.getRoles(), 0)).thenReturn("fresh");
    when(jwtService.generateRefreshToken(42L, "alice")).thenReturn("fresh-refresh");

    AuthTokens response = authService.refresh("stale");

    assertEquals("fresh", response.accessToken());
    assertEquals("fresh-refresh", response.refreshToken());
  }

  @Test
  void refreshRejectsATokenForAnUnknownUser() {
    when(jwtService.parseToken("orphan"))
        .thenReturn(new JwtService.TokenData(99L, "ghost", Set.of(), 0, TokenType.REFRESH));
    when(userRepository.findById(99L)).thenReturn(Optional.empty());

    assertThrows(InvalidRefreshTokenException.class, () -> authService.refresh("orphan"));
  }

  @Test
  void refreshRejectsAnUnparseableToken() {
    when(jwtService.parseToken("garbage")).thenThrow(new MalformedJwtException("bad"));

    assertThrows(InvalidRefreshTokenException.class, () -> authService.refresh("garbage"));
  }

  @Test
  void refreshRejectsAMissingToken() {
    assertThrows(InvalidRefreshTokenException.class, () -> authService.refresh(null));
    assertThrows(InvalidRefreshTokenException.class, () -> authService.refresh("  "));
  }

  @Test
  void registerStoresTheChosenPreferredLanguage() {
    when(userRepository.existsByUsername("alice")).thenReturn(false);
    when(userRepository.existsByEmail("alice@example.com")).thenReturn(false);
    when(passwordEncoder.encode("long-enough-pw")).thenReturn("hashed");

    authService.register(
        new RegistrationDetails("alice", "alice@example.com", "long-enough-pw", "fr"));

    ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
    verify(userRepository).save(saved.capture());
    assertEquals(Language.FRENCH, saved.getValue().getPreferredLanguage());
  }

  @Test
  void registerDefaultsToGermanWhenNoLanguageIsChosen() {
    when(userRepository.existsByUsername("bob")).thenReturn(false);
    when(userRepository.existsByEmail("bob@example.com")).thenReturn(false);
    when(passwordEncoder.encode("long-enough-pw")).thenReturn("hashed");

    authService.register(new RegistrationDetails("bob", "bob@example.com", "long-enough-pw", null));

    ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
    verify(userRepository).save(saved.capture());
    assertEquals(Language.GERMAN, saved.getValue().getPreferredLanguage());
  }

  private static User userEntity(long id, String username) {
    User user = new User();
    user.setId(id);
    user.setUsername(username);
    user.setEmail(username + "@example.com");
    user.addRole(Role.ADMIN);
    return user;
  }
}
