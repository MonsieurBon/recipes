package ch.ethy.recipes.security;

import ch.ethy.recipes.user.UserRepository;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import org.springframework.stereotype.Service;

/**
 * Reads and revokes the per-user token version that gates access-token validity.
 *
 * <p>The current version is cached locally (Caffeine) so the common path — validating a request —
 * does not hit the database every time. Cache entries expire shortly after they are written, which
 * bounds how long a stale version can be served after another instance revokes a user's tokens;
 * {@link #revokeTokens} also evicts the local entry so the revoking instance sees the change
 * immediately.
 */
@Service
public class TokenVersionService {
  private static final Duration CACHE_TTL = Duration.ofSeconds(10);
  private static final long CACHE_MAX_SIZE = 100_000;

  private final UserRepository userRepository;
  private final Cache<Long, Integer> versionCache =
      Caffeine.newBuilder().expireAfterWrite(CACHE_TTL).maximumSize(CACHE_MAX_SIZE).build();

  public TokenVersionService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  public int getCurrentVersion(long userId) {
    return versionCache.get(
        userId,
        id -> userRepository.findTokenVersionById(id).orElseThrow(UnknownUserException::new));
  }

  /**
   * Increments the user's token version, invalidating their outstanding <em>access</em> tokens.
   * Refresh tokens are not version-gated and stay usable until they expire (hard revocation of a
   * refresh token comes from disabling the user, handled by the admin flow).
   *
   * @throws UnknownUserException if no user has the given id, so a revocation that affected nothing
   *     fails fast rather than silently no-opping
   */
  public void revokeTokens(long userId) {
    if (userRepository.incrementTokenVersion(userId) == 0) {
      throw new UnknownUserException();
    }
    versionCache.invalidate(userId);
  }
}
