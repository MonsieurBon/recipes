package ch.ethy.recipes.user;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import org.junit.jupiter.api.Test;

class RoleTest {
  @Test
  void roleEnumNamesPinTheJwtWireFormat() {
    // The strings written to / read from the JWT 'roles' claim are Role.name().
    // Renaming an enum constant is a breaking change to the token payload — this test
    // forces the rename to be intentional rather than silent.
    assertEquals("USER", Role.USER.name());
    assertEquals("ADMIN", Role.ADMIN.name());
  }

  @Test
  void roleAuthoritiesUseSpringRolePrefix() {
    // getAuthority() feeds Spring Security's hasRole(...) / @PreAuthorize("hasRole('ADMIN')"),
    // which strip the "ROLE_" prefix. Drift here silently breaks authorization checks.
    assertEquals("ROLE_USER", Role.USER.getAuthority());
    assertEquals("ROLE_ADMIN", Role.ADMIN.getAuthority());
  }

  @Test
  void noRoleNameStartsWithRolePrefix() {
    // getAuthority() prepends "ROLE_" to name(). A constant named e.g. ROLE_OWNER would
    // produce getAuthority() == "ROLE_ROLE_OWNER" and silently fail hasRole('OWNER') checks.
    for (Role role : Role.values()) {
      assertFalse(
          role.name().startsWith("ROLE_"),
          "Role."
              + role.name()
              + " — names starting with ROLE_ break getAuthority(); use bare"
              + " name");
    }
  }
}
