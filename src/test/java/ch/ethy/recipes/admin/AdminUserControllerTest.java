package ch.ethy.recipes.admin;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ch.ethy.recipes.security.JwtService;
import ch.ethy.recipes.security.TokenVersionService;
import ch.ethy.recipes.user.Role;
import ch.ethy.recipes.user.UserDto;
import ch.ethy.recipes.user.UserService;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AdminUserController.class)
class AdminUserControllerTest {

  @TestConfiguration
  static class SecurityTestConfig {
    @Bean
    SecurityFilterChain testSecurityFilterChain(HttpSecurity http) throws Exception {
      return http.csrf(AbstractHttpConfigurer::disable)
          .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
          .build();
    }
  }

  @Autowired private MockMvc mockMvc;
  @MockitoBean private UserService userService;

  // JWTFilter is pulled into the slice and needs these collaborators.
  @MockitoBean private JwtService jwtService;
  @MockitoBean private TokenVersionService tokenVersionService;

  @Test
  void listsAllUsers() throws Exception {
    when(userService.getAllUsers())
        .thenReturn(
            List.of(
                new UserDto(1L, "alice", "alice@example.com", Set.of(Role.USER, Role.ADMIN)),
                new UserDto(2L, "bob", "bob@example.com", Set.of(Role.USER))));

    mockMvc
        .perform(get("/api/admin/users"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].id").value(1))
        .andExpect(jsonPath("$[0].username").value("alice"))
        .andExpect(jsonPath("$[0].email").value("alice@example.com"))
        .andExpect(jsonPath("$[0].roles.length()").value(2))
        .andExpect(jsonPath("$[1].username").value("bob"))
        .andExpect(jsonPath("$[1].roles[0]").value("USER"));
  }
}
