package ch.ethy.recipes.user;

import java.util.Collections;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
  private final UserRepository userRepository;

  public UserService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  public List<UserDto> getAllUsers() {
    return userRepository.findAll().stream().map(UserService::toDto).toList();
  }

  public Optional<UserDto> findUser(long id) {
    return userRepository.findById(id).map(UserService::toDto);
  }

  /**
   * Stores a user's preferred UI language. The username comes from the authenticated principal (the
   * token's {@code username} claim), so the lookup is by exact username — never the email column —
   * and a valid token guarantees the user exists; a missing row therefore signals corrupted state
   * rather than bad input.
   */
  @Transactional
  public void updatePreferredLanguage(String username, Language language) {
    User user =
        userRepository
            .findByUsername(username)
            .orElseThrow(
                () ->
                    new IllegalStateException("Authenticated user no longer exists: " + username));
    user.setPreferredLanguage(language);
    userRepository.save(user);
  }

  private static UserDto toDto(User user) {
    // EnumSet iterates in declaration order, giving the roles a stable order everywhere they are
    // serialized; copying also detaches the DTO from the entity's mutable set.
    EnumSet<Role> roles = EnumSet.noneOf(Role.class);
    roles.addAll(user.getRoles());
    return new UserDto(
        user.getId(),
        user.getUsername(),
        user.getEmail(),
        Collections.unmodifiableSet(roles),
        user.getPreferredLanguage().code());
  }
}
