import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Mock } from 'vitest';
import { AuthService } from '../security/auth.service';
import { adminGuard } from './admin-guard';

describe('adminGuard', () => {
  let isLoggedIn: WritableSignal<boolean>;
  let isAdmin: WritableSignal<boolean>;
  let whenSessionRestored: Mock<() => Promise<void>>;

  const run = (url = '/admin') =>
    TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );

  beforeEach(() => {
    isLoggedIn = signal(false);
    isAdmin = signal(false);
    whenSessionRestored = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isLoggedIn, isAdmin, whenSessionRestored } },
      ],
    });
  });

  it('admits an admin', async () => {
    isLoggedIn.set(true);
    isAdmin.set(true);

    expect(await run()).toBe(true);
  });

  it('redirects a logged-in non-admin to the home page', async () => {
    isLoggedIn.set(true);

    const result = await run();

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/');
  });

  it('sends an anonymous visitor to login carrying the requested URL', async () => {
    const result = await run('/admin/users');

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/login?returnUrl=%2Fadmin%2Fusers');
  });

  it('awaits the in-flight session restore before deciding', async () => {
    let resolveRestore!: () => void;
    whenSessionRestored.mockReturnValue(new Promise<void>((resolve) => (resolveRestore = resolve)));

    const resultPromise = run();
    // The role only becomes known once the restore settles; a guard that decided eagerly would
    // have already bounced this user as anonymous.
    isLoggedIn.set(true);
    isAdmin.set(true);
    resolveRestore();

    expect(await resultPromise).toBe(true);
  });
});
