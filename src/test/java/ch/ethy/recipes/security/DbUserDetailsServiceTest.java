package ch.ethy.recipes.security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import ch.ethy.recipes.user.User;
import ch.ethy.recipes.user.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UserDetails;

class DbUserDetailsServiceTest {

  private final UserRepository userRepository = mock(UserRepository.class);
  private final DbUserDetailsService service = new DbUserDetailsService(userRepository);

  private static User user(String username, boolean enabled) {
    User user = new User();
    user.setUsername(username);
    user.setEmail(username + "@example.com");
    user.setPassword("hash");
    user.setEnabled(enabled);
    return user;
  }

  @Test
  void anEnabledUserLoadsAsEnabled() {
    when(userRepository.findByUsernameOrEmail("alice"))
        .thenReturn(Optional.of(user("alice", true)));

    UserDetails details = service.loadUserByUsername("alice");

    assertTrue(details.isEnabled());
  }

  @Test
  void aDisabledUserLoadsAsDisabledSoTheFrameworkRejectsLogin() {
    when(userRepository.findByUsernameOrEmail("bob")).thenReturn(Optional.of(user("bob", false)));

    UserDetails details = service.loadUserByUsername("bob");

    assertFalse(details.isEnabled());
  }
}
