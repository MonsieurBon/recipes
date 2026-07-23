package ch.ethy.recipes.user;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ch.ethy.recipes.security.TokenVersionService;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;
import org.testcontainers.utility.MountableFile;

/**
 * Exercises the enabled-flag guard against a real MySQL: the native {@code JSON_CONTAINS ... FOR
 * UPDATE} admin query and the last-active-admin / self-deactivation rules the mocked-repo unit
 * tests cannot cover.
 *
 * <p>The full production migration chain runs, V1 included. V1 needs {@code CREATE USER}/{@code
 * GRANT} privileges, which in production belong to the provisioned {@code recipes-flyway} account;
 * a root-run init script grants the container's user the same elevated rights so
 * {@code @ServiceConnection} can drive the whole chain unchanged. The V1 password placeholder and
 * the prod Flyway credential are stubbed so startup resolves without those environment variables.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
@Import({UserService.class, TokenVersionService.class})
@TestPropertySource(
    properties = {
      "spring.jpa.hibernate.ddl-auto=validate",
      "FLYWAY_PASSWORD=unused",
      "DB_PASSWORD=unused",
    })
class UserEnabledGuardIT {

  @Container @ServiceConnection
  static MySQLContainer mysql =
      new MySQLContainer("mysql:8.4")
          .withCopyFileToContainer(
              MountableFile.forClasspathResource("db/it-mysql-init.sql"),
              "/docker-entrypoint-initdb.d/it-mysql-init.sql");

  @Autowired private UserRepository userRepository;
  @Autowired private UserService userService;

  private User save(String username, boolean enabled, Role... roles) {
    User user = new User();
    user.setUsername(username);
    user.setEmail(username + "@example.com");
    user.setPassword("irrelevant");
    user.setEnabled(enabled);
    for (Role role : roles) {
      user.addRole(role);
    }
    return userRepository.save(user);
  }

  @Test
  void findActiveAdminsForUpdateReturnsOnlyEnabledAdmins() {
    User activeAdmin = save("active-admin", true, Role.USER, Role.ADMIN);
    save("disabled-admin", false, Role.USER, Role.ADMIN);
    save("plain-user", true, Role.USER);

    List<Long> ids = userRepository.findActiveAdminsForUpdate().stream().map(User::getId).toList();

    assertEquals(List.of(activeAdmin.getId()), ids);
  }

  @Test
  void disablingTheLastActiveAdminIsRefusedAndLeavesItEnabled() {
    User onlyAdmin = save("only-admin", true, Role.USER, Role.ADMIN);
    save("plain-user", true, Role.USER);

    assertThrows(
        LastActiveAdminException.class,
        () -> userService.updateEnabled(onlyAdmin.getId(), false, 999L));

    assertTrue(userRepository.findById(onlyAdmin.getId()).orElseThrow().isEnabled());
  }

  @Test
  void disablingAnAdminWhileAnotherActiveAdminRemainsPersists() {
    User first = save("first-admin", true, Role.USER, Role.ADMIN);
    save("second-admin", true, Role.USER, Role.ADMIN);

    UserDto updated = userService.updateEnabled(first.getId(), false, 999L);

    assertFalse(updated.enabled());
    assertFalse(userRepository.findById(first.getId()).orElseThrow().isEnabled());
  }

  @Test
  void anAdminCannotDisableTheirOwnAccount() {
    User admin = save("self-admin", true, Role.USER, Role.ADMIN);
    save("other-admin", true, Role.USER, Role.ADMIN);

    assertThrows(
        SelfDeactivationException.class,
        () -> userService.updateEnabled(admin.getId(), false, admin.getId()));

    assertTrue(userRepository.findById(admin.getId()).orElseThrow().isEnabled());
  }

  @Test
  void disablingPersistsAndRevokesTheUsersTokens() {
    User user = save("roundtrip", true, Role.USER);

    userService.updateEnabled(user.getId(), false, 999L);

    UserDto reloaded = userService.findUser(user.getId()).orElseThrow();
    assertEquals(Set.of(Role.USER), reloaded.roles());
    assertFalse(reloaded.enabled());
    // The disable hard-revokes outstanding access tokens by bumping the token version.
    assertEquals(1, userRepository.findTokenVersionById(user.getId()).orElseThrow());
  }
}
