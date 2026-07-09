import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, EMPTY, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

// On a 401 for a protected request, obtain a usable access token and retry the request once. Auth
// endpoints are excluded so a failed login/refresh is not retried. A failed refresh, or a retry
// that still 401s, logs the user out and routes to the login page.
//
// Contract: when the session cannot be renewed, the redirect to login is the whole outcome, so the
// request's stream COMPLETES WITHOUT EMITTING rather than erroring — an errored abort would reach
// the global handler and toast on a plain logout. Consume protected requests accordingly: read them
// via `toSignal`/`subscribe`, or if a promise is needed pass a `defaultValue` to `firstValueFrom`.
// A bare `firstValueFrom`/`lastValueFrom` rejects an empty completion with `EmptyError`, which would
// itself surface the generic error notification.
//
// Two paths avoid redundant refreshes when several requests 401 around the same time:
//  - if a concurrent refresh already minted a newer token while this request was in flight (the
//    current token differs from the one the request was sent with), retry with it directly;
//  - otherwise exchange the refresh cookie for a fresh token. The cookie is HttpOnly and invisible
//    to JS, so we cannot pre-check for a session: with none this costs one extra round-trip (the
//    refresh also 401s) before logout — an accepted trade-off for keeping the cookie opaque.
//    AuthService collapses simultaneous refreshes into a single request.
export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const sentToken = req.headers.get('Authorization');

  // Deliberately not authService.logout(): the user did not ask to leave, so no logged-out marker
  // is set and the cookie is left alone — after a merely transient refresh failure the session is
  // still valid and may be silently restored on the next load.
  const logoutToLogin = () => {
    authService.clearLocalSession();
    void router.navigate(['login']);
  };

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!isUnauthorized(error) || req.url.includes('/api/auth/')) {
        return throwError(() => error);
      }

      const retryWith = (accessToken: string) =>
        next(
          req.clone({ headers: req.headers.set('Authorization', `Bearer ${accessToken}`) }),
        ).pipe(
          catchError((retryError: unknown) => {
            // A retry that still 401s means the session is truly gone: logoutToLogin handles it by
            // redirecting to login, so complete silently. Any other failure is the real request
            // failing — let it surface.
            if (isUnauthorized(retryError)) {
              logoutToLogin();
              return EMPTY;
            }
            return throwError(() => retryError);
          }),
        );

      const current = authService.getAccessToken();
      if (current && `Bearer ${current}` !== sentToken) {
        return retryWith(current);
      }

      return authService.refresh().pipe(
        // Any failure to renew the session — it expired, was revoked, or the user logged out — is
        // handled by logoutToLogin redirecting to login, so complete silently rather than surfacing
        // it as an error the global handler would toast.
        catchError(() => {
          logoutToLogin();
          return EMPTY;
        }),
        switchMap(retryWith),
      );
    }),
  );
};

function isUnauthorized(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 401;
}
