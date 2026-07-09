import { TestBed } from '@angular/core/testing';
import { ErrorHandler } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { Mock } from 'vitest';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let errorHandler: { handleError: Mock };

  beforeEach(() => {
    localStorage.clear();
    errorHandler = { handleError: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ErrorHandler, useValue: errorHandler },
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

  it('login sends credentials and holds the access token in memory', async () => {
    const promise = service.login({ usernameOrEmail: 'alice', password: 'pw' });

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({ usernameOrEmail: 'alice', password: 'pw' });
    req.flush({ token: 'access-1', roles: ['USER'] });

    expect(await promise).toBe(true);
    expect(service.getAccessToken()).toBe('access-1');
  });

  it('login returns false on invalid credentials without storing a token', async () => {
    const promise = service.login({ usernameOrEmail: 'alice', password: 'wrong' });

    httpMock.expectOne('/api/auth/login').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(await promise).toBe(false);
    expect(service.getAccessToken()).toBeNull();
  });

  it('login propagates non-401 errors instead of swallowing them', async () => {
    const promise = service.login({ usernameOrEmail: 'alice', password: 'pw' });

    httpMock.expectOne('/api/auth/login').flush(null, { status: 500, statusText: 'Server Error' });

    await expect(promise).rejects.toBeTruthy();
    expect(service.getAccessToken()).toBeNull();
  });

  it('register resolves null on success', async () => {
    const promise = service.register({ username: 'u', email: 'u@example.com', password: 'pw' });

    const req = httpMock.expectOne('/api/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'u', email: 'u@example.com', password: 'pw' });
    req.flush(null);

    expect(await promise).toBeNull();
  });

  it('register surfaces a 409 as the conflicting fields', async () => {
    const promise = service.register({ username: 'taken', email: 'u@example.com', password: 'pw' });

    httpMock
      .expectOne('/api/auth/register')
      .flush({ conflictingFields: ['username'] }, { status: 409, statusText: 'Conflict' });

    expect(await promise).toEqual({ conflictingFields: ['username'] });
  });

  it('register propagates non-409 errors instead of swallowing them', async () => {
    const promise = service.register({ username: 'u', email: 'u@example.com', password: 'pw' });

    httpMock
      .expectOne('/api/auth/register')
      .flush(null, { status: 500, statusText: 'Server Error' });

    await expect(promise).rejects.toBeTruthy();
  });

  it('register propagates a 409 whose body lacks the conflicting fields instead of treating it as duplicates', async () => {
    const promise = service.register({ username: 'u', email: 'u@example.com', password: 'pw' });

    httpMock
      .expectOne('/api/auth/register')
      .flush({ message: 'conflict' }, { status: 409, statusText: 'Conflict' });

    await expect(promise).rejects.toBeTruthy();
  });

  it('refresh fails without a request while an explicit logout is in effect', async () => {
    // The marker must guard every refresh, not just the startup restore: a 401-triggered refresh
    // from the interceptor would otherwise resurrect the session a failed logout left alive.
    const loggedOut = service.logout();
    httpMock.expectOne('/api/auth/logout').flush(null, { status: 500, statusText: 'Server Error' });
    expect(await loggedOut).toBe(false);

    const promise = firstValueFrom(service.refresh());

    httpMock.expectNone('/api/auth/refresh');
    await expect(promise).rejects.toBeTruthy();
    expect(service.isLoggedIn()).toBe(false);
  });

  it('rejects a refresh that was still in flight when the user logged out', async () => {
    // The marker guard at call time cannot catch this: the refresh request is already on the wire
    // when the logout happens. The late token must not flip the UI back to logged in, and must
    // not reach callers either — the interceptor would retry a request with it.
    const refreshed = firstValueFrom(service.refresh());

    const loggedOut = service.logout();
    httpMock.expectOne('/api/auth/logout').flush(null);
    expect(await loggedOut).toBe(true);

    httpMock.expectOne('/api/auth/refresh').flush({ token: 'too-late', roles: ['USER'] });

    await expect(refreshed).rejects.toBeTruthy();
    expect(service.getAccessToken()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });

  it('clearLocalSession drops the token without marking an explicit logout', async () => {
    const refreshed = firstValueFrom(service.refresh());
    httpMock.expectOne('/api/auth/refresh').flush({ token: 'access-1', roles: ['USER'] });
    expect(await refreshed).toBe('access-1');

    service.clearLocalSession();

    expect(service.getAccessToken()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
    httpMock.expectNone('/api/auth/logout');

    // No marker was set, so the session may still be restored later (e.g. after a transient
    // refresh failure logged the user out automatically).
    service.restoreSession();
    httpMock.expectOne('/api/auth/refresh').flush({ token: 'recovered', roles: ['USER'] });
    expect(service.isLoggedIn()).toBe(true);
  });

  it('drops the in-memory token when another tab logs out', async () => {
    const refreshed = firstValueFrom(service.refresh());
    httpMock.expectOne('/api/auth/refresh').flush({ token: 'access-1', roles: ['USER'] });
    expect(await refreshed).toBe('access-1');

    // The storage event only fires in tabs that did not perform the write themselves.
    window.dispatchEvent(new StorageEvent('storage', { key: 'loggedOut', newValue: 'true' }));

    expect(service.getAccessToken()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });

  it('keeps the token on storage events for unrelated keys', async () => {
    const refreshed = firstValueFrom(service.refresh());
    httpMock.expectOne('/api/auth/refresh').flush({ token: 'access-1', roles: ['USER'] });
    expect(await refreshed).toBe('access-1');

    window.dispatchEvent(new StorageEvent('storage', { key: 'somethingElse', newValue: 'true' }));

    expect(service.getAccessToken()).toBe('access-1');
    expect(service.isLoggedIn()).toBe(true);
  });

  it('logout clears the in-memory token and resolves true when the backend drops the cookie', async () => {
    const promise = service.logout();

    const req = httpMock.expectOne('/api/auth/logout');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);

    expect(await promise).toBe(true);
    expect(service.getAccessToken()).toBeNull();
  });

  it('exposes a logged-in signal that follows login and logout', async () => {
    expect(service.isLoggedIn()).toBe(false);

    const promise = service.login({ usernameOrEmail: 'alice', password: 'pw' });
    httpMock.expectOne('/api/auth/login').flush({ token: 'access-1', roles: ['USER'] });
    expect(await promise).toBe(true);
    expect(service.isLoggedIn()).toBe(true);

    service.logout();
    httpMock.expectOne('/api/auth/logout').flush(null);
    expect(service.isLoggedIn()).toBe(false);
  });

  it('restoreSession restores the session from the refresh cookie', () => {
    service.restoreSession();

    httpMock.expectOne('/api/auth/refresh').flush({ token: 'restored', roles: ['USER'] });

    expect(service.isLoggedIn()).toBe(true);
    expect(service.getAccessToken()).toBe('restored');
  });

  it('restoreSession leaves the user anonymous — and stays silent — when no session exists', () => {
    service.restoreSession();

    httpMock
      .expectOne('/api/auth/refresh')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(service.isLoggedIn()).toBe(false);
    expect(service.getAccessToken()).toBeNull();
    // A missing session is the expected outcome, not an error to notify about.
    expect(errorHandler.handleError).not.toHaveBeenCalled();
  });

  it('restoreSession reports an unexpected failure so the user is notified, staying anonymous', async () => {
    service.restoreSession();
    const settled = service.whenSessionRestored();

    httpMock
      .expectOne('/api/auth/refresh')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await settled;

    expect(errorHandler.handleError).toHaveBeenCalledOnce();
    expect(service.isLoggedIn()).toBe(false);
  });

  it('restoreSession does not resurrect a session ended by an explicit logout', () => {
    // The failed backend call leaves the HttpOnly refresh cookie alive in the browser; the local
    // logout marker must keep the silent startup restore from logging the user back in with it.
    service.logout();
    httpMock.expectOne('/api/auth/logout').flush(null, { status: 500, statusText: 'Server Error' });

    service.restoreSession();

    httpMock.expectNone('/api/auth/refresh');
    expect(service.isLoggedIn()).toBe(false);
  });

  it('a successful login lifts the logout marker so the next restoreSession works again', async () => {
    service.logout();
    httpMock.expectOne('/api/auth/logout').flush(null);

    const promise = service.login({ usernameOrEmail: 'alice', password: 'pw' });
    httpMock.expectOne('/api/auth/login').flush({ token: 'access-1', roles: ['USER'] });
    expect(await promise).toBe(true);

    service.restoreSession();

    httpMock.expectOne('/api/auth/refresh').flush({ token: 'restored', roles: ['USER'] });
    expect(service.isLoggedIn()).toBe(true);
  });

  it('a rejected login leaves the logout marker in place', async () => {
    service.logout();
    httpMock.expectOne('/api/auth/logout').flush(null);

    const promise = service.login({ usernameOrEmail: 'alice', password: 'wrong' });
    httpMock.expectOne('/api/auth/login').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(await promise).toBe(false);

    service.restoreSession();

    httpMock.expectNone('/api/auth/refresh');
    expect(service.isLoggedIn()).toBe(false);
  });

  it('whenSessionRestored resolves once a successful startup restore settles', async () => {
    service.restoreSession();
    const settled = service.whenSessionRestored();

    httpMock.expectOne('/api/auth/refresh').flush({ token: 'restored', roles: ['USER'] });
    await settled;

    expect(service.isLoggedIn()).toBe(true);
  });

  it('whenSessionRestored resolves (does not reject) when the startup restore fails', async () => {
    service.restoreSession();
    const settled = service.whenSessionRestored();

    httpMock
      .expectOne('/api/auth/refresh')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    await settled;

    expect(service.isLoggedIn()).toBe(false);
  });

  it('is not admin before authenticating', () => {
    expect(service.isAdmin()).toBe(false);
  });

  it('exposes an admin signal that follows a login carrying the ADMIN role', async () => {
    const promise = service.login({ usernameOrEmail: 'root', password: 'pw' });
    httpMock.expectOne('/api/auth/login').flush({ token: 'access-1', roles: ['USER', 'ADMIN'] });
    expect(await promise).toBe(true);

    expect(service.isAdmin()).toBe(true);
  });

  it('stays non-admin after a login that carries no ADMIN role', async () => {
    const promise = service.login({ usernameOrEmail: 'alice', password: 'pw' });
    httpMock.expectOne('/api/auth/login').flush({ token: 'access-1', roles: ['USER'] });
    expect(await promise).toBe(true);

    expect(service.isAdmin()).toBe(false);
  });

  it('restores the admin state from the refresh cookie', async () => {
    const refreshed = firstValueFrom(service.refresh());
    httpMock.expectOne('/api/auth/refresh').flush({ token: 'restored', roles: ['ADMIN'] });
    await refreshed;

    expect(service.isAdmin()).toBe(true);
  });

  it('drops the admin state when the local session is cleared', async () => {
    const refreshed = firstValueFrom(service.refresh());
    httpMock.expectOne('/api/auth/refresh').flush({ token: 'access-1', roles: ['ADMIN'] });
    await refreshed;
    expect(service.isAdmin()).toBe(true);

    service.clearLocalSession();

    expect(service.isAdmin()).toBe(false);
  });

  it('drops the admin state on logout', async () => {
    const promise = service.login({ usernameOrEmail: 'root', password: 'pw' });
    httpMock.expectOne('/api/auth/login').flush({ token: 'access-1', roles: ['ADMIN'] });
    await promise;
    expect(service.isAdmin()).toBe(true);

    service.logout();
    httpMock.expectOne('/api/auth/logout').flush(null);

    expect(service.isAdmin()).toBe(false);
  });

  it('exposes no user before authenticating', () => {
    expect(service.currentUser()).toBeNull();
  });

  it('exposes the user from a login response', async () => {
    const promise = service.login({ usernameOrEmail: 'alice', password: 'pw' });
    httpMock.expectOne('/api/auth/login').flush({
      token: 'access-1',
      username: 'alice',
      email: 'alice@example.com',
      roles: ['USER'],
    });
    expect(await promise).toBe(true);

    expect(service.currentUser()).toEqual({ username: 'alice', email: 'alice@example.com' });
  });

  it('restores the user from the refresh cookie', async () => {
    const refreshed = firstValueFrom(service.refresh());
    httpMock.expectOne('/api/auth/refresh').flush({
      token: 'restored',
      username: 'alice',
      email: 'alice@example.com',
      roles: ['USER'],
    });
    await refreshed;

    expect(service.currentUser()).toEqual({ username: 'alice', email: 'alice@example.com' });
  });

  it('drops the user when the local session is cleared', async () => {
    const refreshed = firstValueFrom(service.refresh());
    httpMock.expectOne('/api/auth/refresh').flush({
      token: 'access-1',
      username: 'alice',
      email: 'alice@example.com',
      roles: ['USER'],
    });
    await refreshed;
    expect(service.currentUser()).not.toBeNull();

    service.clearLocalSession();

    expect(service.currentUser()).toBeNull();
  });

  it('logout drops the token but resolves false when the backend call fails', async () => {
    const refreshed = firstValueFrom(service.refresh());
    httpMock.expectOne('/api/auth/refresh').flush({ token: 'access-1', roles: ['USER'] });
    expect(await refreshed).toBe('access-1');

    const promise = service.logout();

    httpMock.expectOne('/api/auth/logout').flush(null, { status: 500, statusText: 'Server Error' });

    expect(await promise).toBe(false);
    expect(service.getAccessToken()).toBeNull();
  });
});
