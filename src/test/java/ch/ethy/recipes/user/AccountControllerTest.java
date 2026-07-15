package ch.ethy.recipes.user;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ch.ethy.recipes.security.AuthenticatedUser;
import ch.ethy.recipes.security.JwtService;
import ch.ethy.recipes.security.TokenVersionService;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.Authentication;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AccountController.class)
class AccountControllerTest {

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
  void storesTheChosenLanguageForTheAuthenticatedUser() throws Exception {
    mockMvc
        .perform(
            put("/api/account/language")
                .with(authentication(authenticatedAs(7L, "alice")))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"language\":\"fr\"}"))
        .andExpect(status().isNoContent());

    verify(userService).updatePreferredLanguage(7L, Language.FRENCH);
  }

  private static Authentication authenticatedAs(long userId, String username) {
    AuthenticatedUser principal = new AuthenticatedUser(userId, username, List.of());
    return new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
  }

  static Stream<String> unsupportedLanguageBodies() {
    return Stream.of(
        "{\"language\":\"es\"}", // not a shipped language
        "{\"language\":\"DE\"}", // wrong case — the whitelist is exact
        "{\"language\":\"de-CH\"}", // a full BCP 47 tag, not the bare code
        "{\"language\":\"<script>\"}", // an injection attempt
        "{\"language\":\"\"}", // blank
        "{}"); // language omitted entirely
  }

  @ParameterizedTest
  @MethodSource("unsupportedLanguageBodies")
  @WithMockUser(username = "alice")
  void rejectsAnythingOutsideTheWhitelistWithoutTouchingTheUser(String body) throws Exception {
    mockMvc
        .perform(put("/api/account/language").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isBadRequest());

    verifyNoInteractions(userService);
  }
}
