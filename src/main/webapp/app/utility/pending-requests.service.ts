import { Injectable, signal } from '@angular/core';

/**
 * Tracks the number of in-flight HTTP requests so the shell can surface a global activity
 * indicator. Two timers keep the bar from flickering: it only appears once a request has been
 * pending past a short show-delay (so fast responses never show it), and once shown it stays up
 * for a minimum duration (so a request that settles just past the show-delay does not flash the
 * bar on and immediately off). It hides as soon as nothing is in flight and that minimum has
 * elapsed.
 */
@Injectable({
  providedIn: 'root',
})
export class PendingRequestsService {
  /** How long a request must stay pending before the indicator appears. */
  private static readonly SHOW_DELAY_MS = 250;
  /** Once shown, the indicator stays up at least this long so it never flashes. */
  private static readonly MIN_VISIBLE_MS = 500;

  private readonly inFlight = signal(0);
  private readonly visibleState = signal(false);
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private shownAt = 0;

  /** Whether the activity indicator should currently be shown. */
  readonly visible = this.visibleState.asReadonly();

  /** Records a request that has just started. */
  increment(): void {
    if (this.inFlight() === 0) {
      // A fresh burst. If the bar is lingering through its minimum-visible tail, keep it up;
      // otherwise arm the show-delay.
      this.cancelHideTimer();
      if (!this.visibleState() && this.showTimer === null) {
        this.showTimer = setTimeout(() => {
          this.showTimer = null;
          if (this.inFlight() > 0) {
            this.visibleState.set(true);
            this.shownAt = Date.now();
          }
        }, PendingRequestsService.SHOW_DELAY_MS);
      }
    }
    this.inFlight.update((count) => count + 1);
  }

  /** Records a request that has just settled (completed, errored, or been cancelled). */
  decrement(): void {
    this.inFlight.update((count) => Math.max(0, count - 1));
    if (this.inFlight() > 0) {
      return;
    }

    // Nothing left in flight.
    this.cancelShowTimer();
    if (!this.visibleState()) {
      return; // Settled within the show-delay — the bar never appeared.
    }

    const remaining = PendingRequestsService.MIN_VISIBLE_MS - (Date.now() - this.shownAt);
    if (remaining <= 0) {
      this.hide();
    } else {
      this.hideTimer = setTimeout(() => this.hide(), remaining);
    }
  }

  private hide(): void {
    this.hideTimer = null;
    this.visibleState.set(false);
  }

  private cancelShowTimer(): void {
    if (this.showTimer !== null) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }

  private cancelHideTimer(): void {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
