package ch.ethy.recipes.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
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
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
  void listsUsersAsAPageWithTotalCount() throws Exception {
    Pageable pageable = PageRequest.of(0, 20);
    when(userService.getUsers(any()))
        .thenReturn(
            new PageImpl<>(
                List.of(
                    new UserDto(
                        1L, "alice", "alice@example.com", Set.of(Role.USER, Role.ADMIN), "de"),
                    new UserDto(2L, "bob", "bob@example.com", Set.of(Role.USER), "en")),
                pageable,
                42));

    mockMvc
        .perform(get("/api/admin/users"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content.length()").value(2))
        .andExpect(jsonPath("$.content[0].id").value(1))
        .andExpect(jsonPath("$.content[0].username").value("alice"))
        .andExpect(jsonPath("$.content[0].email").value("alice@example.com"))
        .andExpect(jsonPath("$.content[0].roles.length()").value(2))
        .andExpect(jsonPath("$.content[1].username").value("bob"))
        .andExpect(jsonPath("$.content[1].roles[0]").value("USER"))
        .andExpect(jsonPath("$.page.totalElements").value(42));
  }

  @Test
  void defaultsToTenUsersPerPageWhenNoSizeIsGiven() throws Exception {
    when(userService.getUsers(any()))
        .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));
    ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);

    mockMvc.perform(get("/api/admin/users")).andExpect(status().isOk());

    verify(userService).getUsers(pageable.capture());
    assertEquals(10, pageable.getValue().getPageSize());
  }

  @Test
  void capsRequestedPageSizeAtTheConfiguredMaximum() throws Exception {
    when(userService.getUsers(any()))
        .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 100), 0));
    ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);

    mockMvc.perform(get("/api/admin/users").param("size", "100")).andExpect(status().isOk());
    mockMvc.perform(get("/api/admin/users").param("size", "101")).andExpect(status().isOk());

    verify(userService, times(2)).getUsers(pageable.capture());
    assertEquals(100, pageable.getAllValues().get(0).getPageSize());
    assertEquals(100, pageable.getAllValues().get(1).getPageSize());
  }
}
