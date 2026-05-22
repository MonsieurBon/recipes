package ch.ethy.recipes.user;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ch.ethy.recipes.security.JwtService;
import ch.ethy.recipes.security.TokenVersionService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(UserController.class)
class UserControllerSecurityTest {

  @TestConfiguration
  @EnableMethodSecurity(jsr250Enabled = true)
  static class SecurityTestConfig {
    // Mirror the parts of the production SecurityConfig that determine the
    // status code: anonymous is disabled and unauthenticated requests are
    // answered with 401 (not the Spring default of 403 via anonymous + access
    // denied).
    @Bean
    SecurityFilterChain testSecurityFilterChain(HttpSecurity http) throws Exception {
      return http.csrf(AbstractHttpConfigurer::disable)
          .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
          .anonymous(AbstractHttpConfigurer::disable)
          .exceptionHandling(
              eh -> eh.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
          .build();
    }
  }

  @Autowired private MockMvc mockMvc;
  @MockitoBean private UserService userService;

  // JWTFilter is pulled into the @WebMvcTest slice as a servlet filter and
  // declares JwtService and TokenVersionService dependencies. We use
  // @WithMockUser to set the security context directly, so the real JWT path is
  // not exercised here — mocking the dependencies keeps the slice context wireable.
  @MockitoBean private JwtService jwtService;
  @MockitoBean private TokenVersionService tokenVersionService;

  @BeforeEach
  void stubExistingUser() {
    when(userService.findUser(1L))
        .thenReturn(Optional.of(new UserDto(1L, "alice", "alice@example.com")));
  }

  @Test
  void getUserByIdRejectsUnauthenticated() throws Exception {
    mockMvc.perform(get("/api/users/1")).andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(roles = "USER")
  void getUserByIdRejectsNonAdmin() throws Exception {
    mockMvc.perform(get("/api/users/1")).andExpect(status().isForbidden());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void getUserByIdAllowsAdmin() throws Exception {
    mockMvc.perform(get("/api/users/1")).andExpect(status().isOk());
  }

  @Test
  void getAllUsersRejectsUnauthenticated() throws Exception {
    mockMvc.perform(get("/api/users")).andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(roles = "USER")
  void getAllUsersRejectsNonAdmin() throws Exception {
    mockMvc.perform(get("/api/users")).andExpect(status().isForbidden());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void getAllUsersAllowsAdmin() throws Exception {
    when(userService.getAllUsers()).thenReturn(List.of());
    mockMvc.perform(get("/api/users")).andExpect(status().isOk());
  }
}
