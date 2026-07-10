import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from './app.routes';
import { AuthService } from './security/auth.service';
import { provideTranslateTesting } from './testing/provide-translate-testing';

describe('admin routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideTranslateTesting(),
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: signal(true),
            isAdmin: signal(true),
            whenSessionRestored: () => Promise.resolve(),
          },
        },
      ],
    });
  });

  it('redirects an unknown /admin/* path to the users page', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/admin/nonsense');

    expect(TestBed.inject(Router).url).toBe('/admin/users');
  });
});
