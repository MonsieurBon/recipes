import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
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

  it('logout clears the in-memory token and asks the backend to drop the cookie', () => {
    service.logout();

    const req = httpMock.expectOne('/api/auth/logout');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);

    expect(service.getAccessToken()).toBeNull();
  });
});
