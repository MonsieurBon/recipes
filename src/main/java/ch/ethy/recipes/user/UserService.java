package ch.ethy.recipes.user;

import java.util.Collections;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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

  public Page<UserDto> getUsers(Pageable pageable) {
    // A stable, immutable sort key keeps page boundaries consistent across requests and prevents a
    // caller from ordering by a sensitive column via the sort parameter.
    Pageable byId = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by("id"));
    return userRepository.findAll(byId).map(UserService::toDto);
  }

  public Optional<UserDto> findUser(long id) {
    return userRepository.findById(id).map(UserService::toDto);
  }

  /**
   * Stores a user's preferred UI language. The id comes from the authenticated principal (the
   * token's {@code uid} claim) — the stable, immutable key — and a valid token guarantees the user
   * exists; a missing row therefore signals corrupted state rather than bad input.
   */
  @Transactional
  public void updatePreferredLanguage(long userId, Language language) {
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(
                () -> new IllegalStateException("Authenticated user no longer exists: " + userId));
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
