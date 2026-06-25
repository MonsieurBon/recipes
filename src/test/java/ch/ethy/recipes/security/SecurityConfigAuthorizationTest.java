package ch.ethy.recipes.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Verifies the URL-based authorization rules in the production {@link SecurityConfig} end to end:
 * the admin and user areas require the {@code ADMIN} role, the auth area is public, any other
 * {@code /api/**} endpoint requires authentication, and non-API routes (the Angular app and its
 * static assets) are public. The rules are decided in the filter chain before dispatch, so the test
 * mounts throwaway endpoints under each prefix purely to give authorized requests something to
 * return.
 */
@WebMvcTest(controllers = AuthorizationProbeController.class)
@Import(SecurityConfig.class)
class SecurityConfigAuthorizationTest {

  /**
   * Supplies the production security collaborators that {@link SecurityConfig} injects but the web
   * slice does not component-scan. {@link JWTFilter} is real so the chain wires as in production;
   * with no {@code Authorization} header it passes the request through and authorization is decided
   * from the {@code @WithMockUser} context.
   */
  @TestConfiguration
  static class SecurityCollaborators {
    @Bean
    AccessDeniedHandler accessDeniedHandler() {
      return new AccessDeniedHandler();
    }

    @Bean
    AuthenticationEntryPoint authenticationEntryPoint() {
      return new AuthenticationEntryPoint();
    }

    @Bean
    JWTFilter jwtFilter(JwtService jwtService, TokenVersionService tokenVersionService) {
      return new JWTFilter(jwtService, tokenVersionService);
    }
  }

  @Autowired private MockMvc mockMvc;
  @MockitoBean private UserDetailsService userDetailsService;
  @MockitoBean private JwtService jwtService;
  @MockitoBean private TokenVersionService tokenVersionService;

  @Test
  @WithMockUser(roles = "ADMIN")
  void adminAreaAllowsAdmin() throws Exception {
    mockMvc.perform(get("/api/admin/probe")).andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "USER")
  void adminAreaForbidsNonAdmin() throws Exception {
    mockMvc.perform(get("/api/admin/probe")).andExpect(status().isForbidden());
  }

  @Test
  void adminAreaRejectsUnauthenticated() throws Exception {
    mockMvc.perform(get("/api/admin/probe")).andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void userAreaAllowsAdmin() throws Exception {
    mockMvc.perform(get("/api/users/probe")).andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "USER")
  void userAreaForbidsNonAdmin() throws Exception {
    mockMvc.perform(get("/api/users/probe")).andExpect(status().isForbidden());
  }

  @Test
  void userAreaRejectsUnauthenticated() throws Exception {
    mockMvc.perform(get("/api/users/probe")).andExpect(status().isUnauthorized());
  }

  @Test
  void authAreaIsPublic() throws Exception {
    mockMvc.perform(get("/api/auth/probe")).andExpect(status().isOk());
  }

  @Test
  void otherApiEndpointsRejectUnauthenticated() throws Exception {
    mockMvc.perform(get("/api/misc/probe")).andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(roles = "USER")
  void otherApiEndpointsAllowAnyAuthenticatedUser() throws Exception {
    mockMvc.perform(get("/api/misc/probe")).andExpect(status().isOk());
  }

  @Test
  void nonApiRoutesArePublic() throws Exception {
    mockMvc.perform(get("/app/route")).andExpect(status().isOk());
  }
}

/**
 * Throwaway endpoints, one per authorization area, so authorized requests have a handler to return
 * 200 from. Declared top-level (not nested) so the {@code @WebMvcTest} component scan picks it up;
 * the {@code controllers} attribute then narrows the slice to this one controller.
 */
@RestController
class AuthorizationProbeController {
  @GetMapping("/api/admin/probe")
  String admin() {
    return "admin";
  }

  @GetMapping("/api/users/probe")
  String users() {
    return "users";
  }

  @GetMapping("/api/auth/probe")
  String auth() {
    return "auth";
  }

  @GetMapping("/api/misc/probe")
  String misc() {
    return "misc";
  }

  @GetMapping("/app/route")
  String nonApi() {
    return "app";
  }
}
