import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Mock } from 'vitest';
import { NotificationService } from '../utility/notification.service';
import { AuthService } from './auth.service';
import { loggedInGuard } from './logged-in-guard';

describe('loggedInGuard', () => {
  let isLoggedIn: WritableSignal<boolean>;
  let whenSessionRestored: Mock<() => Promise<void>>;

  const run = (url = '/konto') =>
    TestBed.runInInjectionContext(() =>
      loggedInGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );

  beforeEach(() => {
    isLoggedIn = signal(false);
    whenSessionRestored = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isLoggedIn, whenSessionRestored } },
        { provide: NotificationService, useValue: { showAccessDenied: vi.fn() } },
      ],
    });
  });

  it('admits any signed-in user', async () => {
    isLoggedIn.set(true);

    expect(await run()).toBe(true);
  });

  it('sends an anonymous visitor to login carrying the requested URL', async () => {
    const result = await run('/konto');

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/login?returnUrl=%2Fkonto');
  });
});
