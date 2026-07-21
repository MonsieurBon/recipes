package ch.ethy.recipes.user;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

class UserServiceTest {

  private UserRepository userRepository;
  private UserService userService;

  @BeforeEach
  void setUp() {
    userRepository = mock(UserRepository.class);
    userService = new UserService(userRepository);
  }

  @Test
  void rolesAreReturnedInDeclarationOrder() {
    User admin = new User();
    admin.setUsername("alice");
    admin.setEmail("alice@example.com");
    admin.addRole(Role.ADMIN);
    when(userRepository.findAll()).thenReturn(List.of(admin));

    UserDto dto = userService.getAllUsers().getFirst();

    assertEquals(List.of(Role.USER, Role.ADMIN), List.copyOf(dto.roles()));
  }

  @Test
  void rolesAreDetachedFromLaterEntityChanges() {
    User user = new User();
    user.setUsername("bob");
    user.setEmail("bob@example.com");
    when(userRepository.findAll()).thenReturn(List.of(user));

    UserDto dto = userService.getAllUsers().getFirst();
    user.addRole(Role.ADMIN);

    assertEquals(List.of(Role.USER), List.copyOf(dto.roles()));
  }

  @Test
  void preferredLanguageIsReturnedAsItsWireCode() {
    User user = new User();
    user.setUsername("carol");
    user.setEmail("carol@example.com");
    user.setPreferredLanguage(Language.FRENCH);
    when(userRepository.findAll()).thenReturn(List.of(user));

    UserDto dto = userService.getAllUsers().getFirst();

    assertEquals("fr", dto.preferredLanguage());
  }

  @Test
  void getUsersSortsByIdAndPreservesPagingMetadata() {
    User user = new User();
    user.setUsername("alice");
    user.setEmail("alice@example.com");
    ArgumentCaptor<Pageable> applied = ArgumentCaptor.forClass(Pageable.class);
    when(userRepository.findAll(any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(user), PageRequest.of(1, 10), 25));

    Page<UserDto> page = userService.getUsers(PageRequest.of(1, 10));

    verify(userRepository).findAll(applied.capture());
    assertEquals(Sort.by("id"), applied.getValue().getSort());
    assertEquals(1, applied.getValue().getPageNumber());
    assertEquals(10, applied.getValue().getPageSize());
    assertEquals(25, page.getTotalElements());
    assertEquals(List.of("alice"), page.getContent().stream().map(UserDto::username).toList());
  }

  @Test
  void updatePreferredLanguageResolvesTheCallerByIdAndSaves() {
    User user = new User();
    user.setUsername("alice");
    user.setEmail("alice@example.com");
    when(userRepository.findById(7L)).thenReturn(Optional.of(user));

    userService.updatePreferredLanguage(7L, Language.FRENCH);

    assertEquals(Language.FRENCH, user.getPreferredLanguage());
    verify(userRepository).save(user);
  }

  @Test
  void preferredLanguageDefaultsToGermanForANewUser() {
    User user = new User();
    user.setUsername("dave");
    user.setEmail("dave@example.com");
    when(userRepository.findAll()).thenReturn(List.of(user));

    UserDto dto = userService.getAllUsers().getFirst();

    assertEquals("de", dto.preferredLanguage());
  }
}
