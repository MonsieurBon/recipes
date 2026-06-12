import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

// On a 401 for a protected request, obtain a usable access token and retry the request once. Auth
// endpoints are excluded so a failed login/refresh is not retried. A failed refresh, or a retry
// that still 401s, logs the user out and routes to the login page.
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
            if (isUnauthorized(retryError)) {
              logoutToLogin();
            }
            return throwError(() => retryError);
          }),
        );

      const current = authService.getAccessToken();
      if (current && `Bearer ${current}` !== sentToken) {
        return retryWith(current);
      }

      return authService.refresh().pipe(
        catchError((refreshError: unknown) => {
          logoutToLogin();
          return throwError(() => refreshError);
        }),
        switchMap(retryWith),
      );
    }),
  );
};

function isUnauthorized(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 401;
}
