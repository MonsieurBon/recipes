package ch.ethy.recipes.user;

import ch.ethy.recipes.security.TokenVersionService;
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
  private final TokenVersionService tokenVersionService;
  private final UserRepository userRepository;

  public UserService(TokenVersionService tokenVersionService, UserRepository userRepository) {
    this.tokenVersionService = tokenVersionService;
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
   * Enables or disables a user, enforcing two rules that protect access to administration. An admin
   * may never deactivate their own account (a footgun with no use case). Deactivating a user must
   * never leave zero active admins; the last-active-admin check locks the active-admin rows so
   * concurrent deactivations cannot both slip through. Enabling is always safe and skips the guard.
   *
   * @param targetId the user to change
   * @param enabled the desired enabled state
   * @param principalId the authenticated admin performing the change, resolved from the token
   * @return the updated user
   */
  @Transactional
  public UserDto updateEnabled(long targetId, boolean enabled, long principalId) {
    User user =
        userRepository.findById(targetId).orElseThrow(() -> new UserNotFoundException(targetId));
    if (user.isEnabled() == enabled) {
      return toDto(user);
    }
    if (!enabled) {
      if (targetId == principalId) {
        throw new SelfDeactivationException();
      }
      if (user.getRoles().contains(Role.ADMIN) && isLastActiveAdmin(targetId)) {
        throw new LastActiveAdminException();
      }
    }
    user.setEnabled(enabled);
    userRepository.save(user);
    if (!enabled) {
      // A disable is a hard revocation: bump the token version so outstanding access tokens are
      // rejected at once instead of lingering until they expire. Refresh is refused separately, on
      // the refresh path.
      tokenVersionService.revokeTokens(targetId);
    }
    return toDto(user);
  }

  private boolean isLastActiveAdmin(long targetId) {
    return userRepository.findActiveAdminsForUpdate().stream()
        .noneMatch(admin -> admin.getId() != targetId);
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
        user.isEnabled(),
        Collections.unmodifiableSet(roles),
        user.getPreferredLanguage().code());
  }
}
