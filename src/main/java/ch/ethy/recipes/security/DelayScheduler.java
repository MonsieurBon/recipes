package ch.ethy.recipes.security;

import java.time.Duration;

/**
 * Runs a task once a delay has elapsed, without blocking the calling thread.
 *
 * <p>Exists so components that need a deliberate delay stay testable: production wires the {@link
 * JdkDelayScheduler} bean, tests inject a mock and assert on the requested delay — and trigger the
 * captured task themselves — instead of waiting.
 */
@FunctionalInterface
public interface DelayScheduler {
  void schedule(Runnable task, Duration delay);
}
