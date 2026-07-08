import { TestBed } from '@angular/core/testing';

import { PendingRequestsService } from './pending-requests.service';

describe('PendingRequestsService', () => {
  let service: PendingRequestsService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(PendingRequestsService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays hidden until a request has been pending past the show-delay', () => {
    service.increment();
    expect(service.visible()).toBe(false);

    vi.advanceTimersByTime(249);
    expect(service.visible()).toBe(false);

    vi.advanceTimersByTime(1);
    expect(service.visible()).toBe(true);
  });

  it('never shows for a request that settles within the show-delay', () => {
    service.increment();
    vi.advanceTimersByTime(200);
    service.decrement();

    vi.advanceTimersByTime(1000);
    expect(service.visible()).toBe(false);
  });

  it('keeps the bar up for the minimum duration when a request settles right after it appears', () => {
    service.increment();
    vi.advanceTimersByTime(250);
    expect(service.visible()).toBe(true);

    // Settles immediately after showing — the bar must linger, not flash off.
    service.decrement();
    expect(service.visible()).toBe(true);

    vi.advanceTimersByTime(499);
    expect(service.visible()).toBe(true);

    vi.advanceTimersByTime(1);
    expect(service.visible()).toBe(false);
  });

  it('hides immediately once a request that outlived the minimum settles', () => {
    service.increment();
    vi.advanceTimersByTime(250 + 500);
    expect(service.visible()).toBe(true);

    service.decrement();
    expect(service.visible()).toBe(false);
  });

  it('keeps the show-delay running while one of several requests settles before it', () => {
    service.increment();
    service.increment();

    // One settles before the show-delay; the other keeps the bar on track to appear.
    vi.advanceTimersByTime(100);
    service.decrement();
    expect(service.visible()).toBe(false);

    vi.advanceTimersByTime(150);
    expect(service.visible()).toBe(true);
  });

  it('stays visible while any request is still in flight', () => {
    service.increment();
    service.increment();
    vi.advanceTimersByTime(250 + 500);
    expect(service.visible()).toBe(true);

    service.decrement();
    expect(service.visible()).toBe(true);

    service.decrement();
    expect(service.visible()).toBe(false);
  });

  it('keeps the bar up across a fresh burst that arrives during the minimum-visible tail', () => {
    service.increment();
    vi.advanceTimersByTime(250);
    expect(service.visible()).toBe(true);

    // Settles, then a new request arrives before the minimum elapses.
    service.decrement();
    vi.advanceTimersByTime(100);
    service.increment();

    // The pending hide is cancelled; the bar stays up while the new request runs.
    vi.advanceTimersByTime(1000);
    expect(service.visible()).toBe(true);

    service.decrement();
    expect(service.visible()).toBe(false);
  });

  it('restarts the delay for a fresh burst after everything settled', () => {
    service.increment();
    service.decrement();

    service.increment();
    expect(service.visible()).toBe(false);
    vi.advanceTimersByTime(250);
    expect(service.visible()).toBe(true);
  });
});
