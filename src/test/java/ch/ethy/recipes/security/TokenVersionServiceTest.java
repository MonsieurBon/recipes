package ch.ethy.recipes.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ch.ethy.recipes.user.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TokenVersionServiceTest {
  @Mock private UserRepository userRepository;

  private TokenVersionService newService() {
    return new TokenVersionService(userRepository);
  }

  @Test
  void getCurrentVersionReturnsTheStoredVersion() {
    when(userRepository.findTokenVersionById(1L)).thenReturn(Optional.of(7));

    assertEquals(7, newService().getCurrentVersion(1L));
  }

  @Test
  void getCurrentVersionCachesAcrossCallsToAvoidRepeatedLookups() {
    when(userRepository.findTokenVersionById(1L)).thenReturn(Optional.of(7));
    TokenVersionService service = newService();

    assertEquals(7, service.getCurrentVersion(1L));
    assertEquals(7, service.getCurrentVersion(1L));

    verify(userRepository, times(1)).findTokenVersionById(1L);
  }

  @Test
  void revokeTokensIncrementsInTheDatabaseAndInvalidatesTheCachedEntry() {
    when(userRepository.findTokenVersionById(1L)).thenReturn(Optional.of(7), Optional.of(8));
    when(userRepository.incrementTokenVersion(1L)).thenReturn(1);
    TokenVersionService service = newService();

    assertEquals(7, service.getCurrentVersion(1L));
    service.revokeTokens(1L);
    assertEquals(8, service.getCurrentVersion(1L));

    verify(userRepository, times(1)).incrementTokenVersion(1L);
    verify(userRepository, times(2)).findTokenVersionById(1L);
  }

  @Test
  void getCurrentVersionRejectsAnUnknownUser() {
    when(userRepository.findTokenVersionById(99L)).thenReturn(Optional.empty());
    TokenVersionService service = newService();

    assertThrows(UnknownUserException.class, () -> service.getCurrentVersion(99L));
  }

  @Test
  void revokeTokensRejectsAnUnknownUser() {
    when(userRepository.incrementTokenVersion(99L)).thenReturn(0);
    TokenVersionService service = newService();

    assertThrows(UnknownUserException.class, () -> service.revokeTokens(99L));
  }
}
