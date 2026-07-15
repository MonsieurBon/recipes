package ch.ethy.recipes.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import java.util.List;
import org.junit.jupiter.api.Test;

class AuthenticatedUserTest {

  @Test
  void principalsWithTheSameIdAreEqualEvenIfTheUsernameDiffers() {
    AuthenticatedUser renamed = new AuthenticatedUser(7L, "alice", List.of());
    AuthenticatedUser sameUser = new AuthenticatedUser(7L, "alice-new", List.of());

    assertEquals(renamed, sameUser);
    assertEquals(renamed.hashCode(), sameUser.hashCode());
  }

  @Test
  void principalsWithDifferentIdsAreUnequalEvenIfTheUsernameMatches() {
    AuthenticatedUser one = new AuthenticatedUser(7L, "alice", List.of());
    AuthenticatedUser another = new AuthenticatedUser(8L, "alice", List.of());

    assertNotEquals(one, another);
  }
}
