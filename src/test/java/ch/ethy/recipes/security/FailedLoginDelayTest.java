package ch.ethy.recipes.security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FailedLoginDelayTest {
  private static final Duration MAX_DELAY = Duration.ofSeconds(10);

  @Mock private DelayScheduler scheduler;

  @Test
  void theFutureFailsWithTheCauseOnlyOnceTheScheduledDelayElapses() {
    FailedLoginDelay delay = new FailedLoginDelay(Duration.ofSeconds(1), scheduler);
    RuntimeException cause = new RuntimeException("bad credentials");

    CompletableFuture<Object> future = delay.failAfterDelay(cause);

    ArgumentCaptor<Runnable> elapsed = ArgumentCaptor.forClass(Runnable.class);
    verify(scheduler).schedule(elapsed.capture(), eq(Duration.ofSeconds(1)));
    assertFalse(future.isDone());

    elapsed.getValue().run();

    assertTrue(future.isCompletedExceptionally());
    ExecutionException thrown = assertThrows(ExecutionException.class, future::get);
    assertSame(cause, thrown.getCause());
  }

  @Test
  void aZeroDelayFailsTheFutureImmediatelyWithoutScheduling() {
    FailedLoginDelay delay = new FailedLoginDelay(Duration.ZERO, scheduler);
    RuntimeException cause = new RuntimeException("bad credentials");

    CompletableFuture<Object> future = delay.failAfterDelay(cause);

    verifyNoInteractions(scheduler);
    assertTrue(future.isCompletedExceptionally());
    ExecutionException thrown = assertThrows(ExecutionException.class, future::get);
    assertSame(cause, thrown.getCause());
  }

  @Test
  void aDelayAtTheMaximumIsAccepted() {
    new FailedLoginDelay(MAX_DELAY, scheduler);
  }

  @Test
  void aDelayOverTheMaximumIsRejected() {
    Duration oneOverMax = MAX_DELAY.plusNanos(1);

    assertThrows(IllegalArgumentException.class, () -> new FailedLoginDelay(oneOverMax, scheduler));
  }

  @Test
  void aNegativeDelayIsRejected() {
    Duration oneUnderZero = Duration.ZERO.minusNanos(1);

    assertThrows(
        IllegalArgumentException.class, () -> new FailedLoginDelay(oneUnderZero, scheduler));
  }

  @Test
  void aNullDelayIsRejected() {
    assertThrows(IllegalArgumentException.class, () -> new FailedLoginDelay(null, scheduler));
  }
}
