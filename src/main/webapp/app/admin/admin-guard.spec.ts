import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthService } from '../security/auth.service';
import { adminGuard } from './admin-guard';

describe('adminGuard', () => {
  let isAdmin: WritableSignal<boolean>;

  const run = () =>
    TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  beforeEach(() => {
    isAdmin = signal(false);

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { isAdmin } }],
    });
  });

  it('admits an admin', () => {
    isAdmin.set(true);

    expect(run()).toBe(true);
  });

  it('redirects a non-admin to the home page', () => {
    const result = run();

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/');
  });
});
