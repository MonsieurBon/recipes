package ch.ethy.recipes.security;

import ch.ethy.recipes.user.Role;
import ch.ethy.recipes.user.User;
import ch.ethy.recipes.user.UserRepository;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
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

  public String login(LoginCredentials credentials) {
    UsernamePasswordAuthenticationToken authToken =
        new UsernamePasswordAuthenticationToken(
            credentials.usernameOrEmail(), credentials.password());

    Authentication authentication = authenticationManager.authenticate(authToken);
    if (!(authentication.getPrincipal()
        instanceof org.springframework.security.core.userdetails.User user)) {
      log.error(
          "Authentication returned unexpected principal type: {}",
          authentication.getPrincipal().getClass().getName());
      throw new IllegalStateException("Authentication principal has unexpected type");
    }
    Set<Role> roles =
        user.getAuthorities().stream()
            .filter(Role.class::isInstance)
            .map(Role.class::cast)
            .collect(Collectors.toCollection(() -> EnumSet.noneOf(Role.class)));
    return jwtService.generateToken(user.getUsername(), roles);
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
