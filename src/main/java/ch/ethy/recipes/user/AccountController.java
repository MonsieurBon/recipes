package ch.ethy.recipes.user;

import ch.ethy.recipes.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Self-service endpoints for the authenticated user's own account. Unlike {@code /api/users/**}
 * (admin-only), these act on the caller identified by the validated access token, so any logged-in
 * user may reach them.
 */
@RestController
@RequestMapping("/api/account")
public class AccountController {
  private final UserService userService;

  public AccountController(UserService userService) {
    this.userService = userService;
  }

  /**
   * Stores the caller's preferred UI language so it follows them across devices. The code is
   * whitelisted to the shipped set by validation; the caller is taken from the authenticated
   * principal by immutable id, never from the request body, so one user cannot change another's
   * preference.
   */
  @PutMapping("/language")
  public ResponseEntity<Void> updateLanguage(
      @RequestBody @Valid LanguagePreference preference,
      @AuthenticationPrincipal AuthenticatedUser principal) {
    Language language =
        Language.fromCode(preference.language())
            .orElseThrow(() -> new IllegalStateException("Validated language was not supported"));
    userService.updatePreferredLanguage(principal.getUserId(), language);
    return ResponseEntity.noContent().build();
  }
}
