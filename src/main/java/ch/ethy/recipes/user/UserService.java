package ch.ethy.recipes.user;

import java.util.Collections;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

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

  private static UserDto toDto(User user) {
    // EnumSet iterates in declaration order, giving the roles a stable order everywhere they are
    // serialized; copying also detaches the DTO from the entity's mutable set.
    EnumSet<Role> roles = EnumSet.noneOf(Role.class);
    roles.addAll(user.getRoles());
    return new UserDto(
        user.getId(), user.getUsername(), user.getEmail(), Collections.unmodifiableSet(roles));
  }
}
