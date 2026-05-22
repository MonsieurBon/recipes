import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Mocked } from 'vitest';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: Mocked<Pick<Router, 'navigate'>>;

  beforeEach(() => {
    routerSpy = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('has no access token before authenticating', () => {
    expect(service.getAccessToken()).toBeNull();
  });

  it('refresh sends credentials, holds the access token in memory, and returns it', async () => {
    const promise = firstValueFrom(service.refresh());

    const req = httpMock.expectOne('/api/auth/refresh');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ token: 'new-access', roles: ['USER'] });

    const token = await promise;
    expect(token).toBe('new-access');
    expect(service.getAccessToken()).toBe('new-access');
  });

  it('dedupes concurrent refreshes into a single request and reuses none afterwards', async () => {
    const first = firstValueFrom(service.refresh());
    const second = firstValueFrom(service.refresh());

    // expectOne fails if a second POST was issued: concurrent callers must share one request.
    httpMock.expectOne('/api/auth/refresh').flush({ token: 'shared', roles: ['USER'] });

    expect(await first).toBe('shared');
    expect(await second).toBe('shared');

    // Once the in-flight refresh settles, the next call starts a fresh request.
    const third = firstValueFrom(service.refresh());
    httpMock.expectOne('/api/auth/refresh').flush({ token: 'again', roles: ['USER'] });
    expect(await third).toBe('again');
  });

  it('logout clears the in-memory token, asks the backend to drop the cookie, and routes to login', () => {
    service.logout();

    const req = httpMock.expectOne('/api/auth/logout');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);

    expect(service.getAccessToken()).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['login']);
  });
});
