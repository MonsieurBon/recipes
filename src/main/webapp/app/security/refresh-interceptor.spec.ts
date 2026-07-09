import { TestBed } from '@angular/core/testing';
import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpHeaders,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { Mocked } from 'vitest';
import { Router } from '@angular/router';

import { refreshInterceptor } from './refresh-interceptor';
import { AuthService } from './auth.service';

// Observes a stream to its end without rejecting on completion, so a "completes silently" outcome
// (which firstValueFrom would turn into an EmptyError) can be asserted directly.
async function settle(
  source: Observable<unknown>,
): Promise<{ error: unknown; emitted: boolean; completed: boolean }> {
  const seen = { error: undefined as unknown, emitted: false, completed: false };
  await new Promise<void>((resolve) => {
    source.subscribe({
      next: () => (seen.emitted = true),
      error: (e) => {
        seen.error = e;
        resolve();
      },
      complete: () => {
        seen.completed = true;
        resolve();
      },
    });
  });
  return seen;
}

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

  it('drops the local session, routes to login, and completes silently when the refresh itself fails', async () => {
    // logoutToLogin's redirect is the whole response — including a deliberate cross-tab logout — so
    // the aborted request must complete without an error the global handler would toast.
    authServiceSpy.refresh.mockReturnValue(throwError(() => new Error('refresh failed')));
    const next: HttpHandlerFn = () => throwError(() => new HttpErrorResponse({ status: 401 }));

    const seen = await settle(interceptor(new HttpRequest('GET', '/api/recipes'), next));

    expect(seen.error).toBeUndefined();
    expect(seen.emitted).toBe(false);
    expect(seen.completed).toBe(true);
    expect(authServiceSpy.clearLocalSession).toHaveBeenCalledOnce();
    expect(routerSpy.navigate).toHaveBeenCalledExactlyOnceWith(['login']);
  });

  it('drops the local session, routes to login, and completes silently when the retried request also returns 401', async () => {
    authServiceSpy.refresh.mockReturnValue(of('new-access'));
    // next always rejects with 401, including the retry.
    const next: HttpHandlerFn = () => throwError(() => new HttpErrorResponse({ status: 401 }));

    const seen = await settle(interceptor(new HttpRequest('GET', '/api/recipes'), next));

    expect(seen.error).toBeUndefined();
    expect(seen.completed).toBe(true);
    expect(authServiceSpy.clearLocalSession).toHaveBeenCalledOnce();
    expect(routerSpy.navigate).toHaveBeenCalledExactlyOnceWith(['login']);
  });

  it('propagates a non-401 failure of the retried request instead of swallowing it', async () => {
    authServiceSpy.refresh.mockReturnValue(of('new-access'));
    const next: HttpHandlerFn = (r) =>
      throwError(() =>
        r.headers.get('Authorization') === 'Bearer new-access'
          ? new HttpErrorResponse({ status: 500 })
          : new HttpErrorResponse({ status: 401 }),
      );

    await expect(
      firstValueFrom(interceptor(new HttpRequest('GET', '/api/recipes'), next)),
    ).rejects.toMatchObject({ status: 500 });
    expect(routerSpy.navigate).not.toHaveBeenCalled();
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
