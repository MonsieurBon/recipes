package ch.ethy.recipes.security;

import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Deliberate response delay for failed authentications.
 *
 * <p>Slows online brute-force and credential-stuffing by making every bad-credentials response cost
 * the configured delay, while successful logins are unaffected. The delay is asynchronous: a
 * failure is surfaced as a future that completes exceptionally only once the delay has elapsed, so
 * the suspended request holds no request thread while it waits.
 *
 * <p>The delay is capped at 10 seconds: beyond raising the per-guess cost it only grows the queue
 * of suspended requests an attacker can build up. A zero delay disables the feature.
 */
@Component
public class FailedLoginDelay {
  // Must stay below the MVC async request timeout (spring.mvc.async.request-timeout, Tomcat
  // default 30 s), or delayed logins would surface as async timeouts instead of 401s.
  private static final Duration MAX_DELAY = Duration.ofSeconds(10);

  private final Duration delay;
  private final DelayScheduler scheduler;

  public FailedLoginDelay(
      @Value("${auth.login.failure-delay}") Duration delay, DelayScheduler scheduler) {
    if (delay == null || delay.isNegative()) {
      throw new IllegalArgumentException(
          "auth.login.failure-delay (LOGIN_FAILURE_DELAY) must be a non-negative ISO-8601"
              + " duration (e.g. PT1S); got "
              + delay
              + ".");
    }
    if (delay.compareTo(MAX_DELAY) > 0) {
      throw new IllegalArgumentException(
          "auth.login.failure-delay (LOGIN_FAILURE_DELAY) must not exceed PT10S (10 seconds); got "
              + delay
              + ".");
    }
    this.delay = delay;
    this.scheduler = scheduler;
  }

  /**
   * Returns a future that completes exceptionally with {@code cause} once the configured delay has
   * elapsed; immediately if the delay is zero.
   */
  public <T> CompletableFuture<T> failAfterDelay(RuntimeException cause) {
    CompletableFuture<T> future = new CompletableFuture<>();
    if (delay.isZero()) {
      future.completeExceptionally(cause);
    } else {
      scheduler.schedule(() -> future.completeExceptionally(cause), delay);
    }
    return future;
  }
}
