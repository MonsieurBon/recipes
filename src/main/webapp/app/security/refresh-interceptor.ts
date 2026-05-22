import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

// On a 401 for a protected request, obtain a usable access token and retry the request once. Auth
// endpoints are excluded so a failed login/refresh is not retried. A failed refresh, or a retry
// that still 401s, logs the user out.
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
  const sentToken = req.headers.get('Authorization');

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
              authService.logout();
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
          authService.logout();
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
