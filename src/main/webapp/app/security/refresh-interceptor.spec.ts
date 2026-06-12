import { TestBed } from '@angular/core/testing';
import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpHeaders,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { firstValueFrom, of, throwError } from 'rxjs';
import { Mocked } from 'vitest';
import { Router } from '@angular/router';

import { refreshInterceptor } from './refresh-interceptor';
import { AuthService } from './auth.service';

describe('refreshInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => refreshInterceptor(req, next));
  let authServiceSpy: Mocked<Pick<AuthService, 'refresh' | 'clearLocalSession' | 'getAccessToken'>>;
  let routerSpy: Mocked<Pick<Router, 'navigate'>>;

  beforeEach(() => {
    authServiceSpy = { refresh: vi.fn(), clearLocalSession: vi.fn(), getAccessToken: vi.fn() };
    routerSpy = { navigate: vi.fn().mockResolvedValue(true) };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });
  });

  it('refreshes and retries the original request with the new token on 401', async () => {
    authServiceSpy.refresh.mockReturnValue(of('new-access'));
    const req = new HttpRequest('GET', '/api/recipes');
    let retried: HttpRequest<unknown> | undefined;
    const next: HttpHandlerFn = (r) => {
      if (r.headers.get('Authorization') === 'Bearer new-access') {
        retried = r;
        return of(new HttpResponse({ status: 200 }));
      }
      return throwError(() => new HttpErrorResponse({ status: 401 }));
    };

    const result = await firstValueFrom(interceptor(req, next));

    expect(authServiceSpy.refresh).toHaveBeenCalledOnce();
    expect(retried).toBeDefined();
    expect((result as HttpResponse<unknown>).status).toBe(200);
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('retries with the current token without refreshing when it advanced since the request was sent', async () => {
    authServiceSpy.getAccessToken.mockReturnValue('fresh');
    const req = new HttpRequest('GET', '/api/recipes', {
      headers: new HttpHeaders({ Authorization: 'Bearer stale' }),
    });
    let retried: HttpRequest<unknown> | undefined;
    const next: HttpHandlerFn = (r) => {
      if (r.headers.get('Authorization') === 'Bearer fresh') {
        retried = r;
        return of(new HttpResponse({ status: 200 }));
      }
      return throwError(() => new HttpErrorResponse({ status: 401 }));
    };

    const result = await firstValueFrom(interceptor(req, next));

    expect(authServiceSpy.refresh).not.toHaveBeenCalled();
    expect(retried).toBeDefined();
    expect((result as HttpResponse<unknown>).status).toBe(200);
  });

  it('drops the local session, routes to login, and propagates the error when the refresh itself fails', async () => {
    authServiceSpy.refresh.mockReturnValue(throwError(() => new Error('refresh failed')));
    const next: HttpHandlerFn = () => throwError(() => new HttpErrorResponse({ status: 401 }));

    await expect(
      firstValueFrom(interceptor(new HttpRequest('GET', '/api/recipes'), next)),
    ).rejects.toBeTruthy();
    expect(authServiceSpy.clearLocalSession).toHaveBeenCalledOnce();
    expect(routerSpy.navigate).toHaveBeenCalledExactlyOnceWith(['login']);
  });

  it('drops the local session and routes to login when the retried request also returns 401', async () => {
    authServiceSpy.refresh.mockReturnValue(of('new-access'));
    // next always rejects with 401, including the retry.
    const next: HttpHandlerFn = () => throwError(() => new HttpErrorResponse({ status: 401 }));

    await expect(
      firstValueFrom(interceptor(new HttpRequest('GET', '/api/recipes'), next)),
    ).rejects.toBeTruthy();
    expect(authServiceSpy.clearLocalSession).toHaveBeenCalledOnce();
    expect(routerSpy.navigate).toHaveBeenCalledExactlyOnceWith(['login']);
  });

  it('does not attempt a refresh for auth endpoints', async () => {
    const next: HttpHandlerFn = () => throwError(() => new HttpErrorResponse({ status: 401 }));

    await expect(
      firstValueFrom(interceptor(new HttpRequest('POST', '/api/auth/login', {}), next)),
    ).rejects.toBeTruthy();
    expect(authServiceSpy.refresh).not.toHaveBeenCalled();
  });

  it('passes non-401 errors through untouched', async () => {
    const next: HttpHandlerFn = () => throwError(() => new HttpErrorResponse({ status: 500 }));

    await expect(
      firstValueFrom(interceptor(new HttpRequest('GET', '/api/recipes'), next)),
    ).rejects.toBeTruthy();
    expect(authServiceSpy.refresh).not.toHaveBeenCalled();
  });
});
