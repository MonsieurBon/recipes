package ch.ethy.recipes.security;

import ch.ethy.recipes.user.User;
import ch.ethy.recipes.user.UserRepository;
import java.util.Optional;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class DbUserDetailsService implements UserDetailsService {
  private final UserRepository userRepository;

  public DbUserDetailsService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @Override
  public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
    Optional<User> userRes = userRepository.findByUsernameOrEmail(usernameOrEmail);

    if (userRes.isEmpty()) {
      throw new UsernameNotFoundException("No user found with this email: " + usernameOrEmail);
    }

    User user = userRes.get();
    // enabled feeds Spring Security's built-in disabled check, so a deactivated account is rejected
    // at authentication (DisabledException) rather than being issued fresh tokens.
    return new org.springframework.security.core.userdetails.User(
        user.getUsername(),
        user.getPassword(),
        user.isEnabled(),
        true,
        true,
        true,
        user.getRoles());
  }
}
