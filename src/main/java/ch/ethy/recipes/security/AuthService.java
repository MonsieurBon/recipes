package ch.ethy.recipes.security;

import ch.ethy.recipes.user.Role;
import ch.ethy.recipes.user.User;
import ch.ethy.recipes.user.UserRepository;
import io.jsonwebtoken.JwtException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
  private static final Logger log = LoggerFactory.getLogger(AuthService.class);

  private final AuthenticationManager authenticationManager;
  private final JwtService jwtService;
  private final PasswordEncoder passwordEncoder;
  private final UserRepository userRepository;

  public AuthService(
      AuthenticationManager authenticationManager,
      JwtService jwtService,
      PasswordEncoder passwordEncoder,
      UserRepository userRepository) {
    this.authenticationManager = authenticationManager;
    this.jwtService = jwtService;
    this.passwordEncoder = passwordEncoder;
    this.userRepository = userRepository;
  }

  public AuthTokens login(LoginCredentials credentials) {
    UsernamePasswordAuthenticationToken authToken =
        new UsernamePasswordAuthenticationToken(
            credentials.usernameOrEmail(), credentials.password());

    Authentication authentication = authenticationManager.authenticate(authToken);
    if (!(authentication.getPrincipal()
        instanceof org.springframework.security.core.userdetails.User principal)) {
      log.error(
          "Authentication returned unexpected principal type: {}",
          authentication.getPrincipal().getClass().getName());
      throw new IllegalStateException("Authentication principal has unexpected type");
    }
    User user =
        userRepository
            .findByUsernameOrEmail(principal.getUsername())
            .orElseThrow(() -> new IllegalStateException("Authenticated user no longer exists"));
    return issueTokens(user);
  }

  public AuthTokens refresh(String refreshToken) {
    if (refreshToken == null || refreshToken.isBlank()) {
      throw new InvalidRefreshTokenException("No refresh token provided");
    }
    JwtService.TokenData tokenData;
    try {
      tokenData = jwtService.parseToken(refreshToken);
    } catch (JwtException e) {
      throw new InvalidRefreshTokenException("Refresh token is malformed or expired");
    }
    if (tokenData.type() != TokenType.REFRESH) {
      throw new InvalidRefreshTokenException("Token is not a refresh token");
    }
    // Only the access token is version-gated. A refresh always re-reads the user, so the new
    // access token reflects the current role and token version even if the role changed since
    // this refresh token was issued (e.g. a mid-session demotion is picked up here).
    User user =
        userRepository
            .findById(tokenData.userId())
            .orElseThrow(() -> new InvalidRefreshTokenException("User no longer exists"));
    return issueTokens(user);
  }

  private AuthTokens issueTokens(User user) {
    Set<Role> roles = user.getRoles();
    String accessToken =
        jwtService.generateAccessToken(
            user.getId(), user.getUsername(), roles, user.getTokenVersion());
    String refreshToken = jwtService.generateRefreshToken(user.getId(), user.getUsername());
    return new AuthTokens(accessToken, refreshToken, roles);
  }

  public void register(RegistrationDetails registrationDetails) {
    List<String> conflicts = new ArrayList<>();
    if (userRepository.existsByUsername(registrationDetails.username())) {
      conflicts.add("username");
    }
    if (userRepository.existsByEmail(registrationDetails.email())) {
      conflicts.add("email");
    }
    if (!conflicts.isEmpty()) {
      throw new DuplicateUserException(conflicts);
    }

    String encodedPassword = passwordEncoder.encode(registrationDetails.password());
    User user = new User();
    user.setUsername(registrationDetails.username());
    user.setEmail(registrationDetails.email());
    user.setPassword(encodedPassword);
    userRepository.save(user);
  }
}
