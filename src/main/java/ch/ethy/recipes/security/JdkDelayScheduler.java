package ch.ethy.recipes.security;

import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.springframework.stereotype.Component;

/**
 * {@link DelayScheduler} backed by {@link CompletableFuture#delayedExecutor}.
 *
 * <p>Pending delays share the JDK's single daemon timer thread, so any number of waiting tasks
 * costs one thread in total — no pool to size or shut down. The timer thread only triggers
 * execution: once a delay elapses, the task itself (and anything composed on it) runs on {@link
 * java.util.concurrent.ForkJoinPool#commonPool()}, so tasks scheduled here must stay short and
 * non-blocking.
 */
@Component
public class JdkDelayScheduler implements DelayScheduler {
  @Override
  public void schedule(Runnable task, Duration delay) {
    CompletableFuture.delayedExecutor(delay.toNanos(), TimeUnit.NANOSECONDS).execute(task);
  }
}
