import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Builds a route guard that admits only signed-in users for whom {@code authorize} holds. The two
 * rejection cases are distinguished: an anonymous visitor is sent to {@code /login} carrying the
 * originally requested URL (so login can return them to it), while a signed-in but unauthorized
 * user is sent to the home page. The decision is deferred until the startup session restore has
 * settled, so a hard navigation or refresh straight to a guarded route is judged against the real
 * auth state rather than the empty pre-restore one. All of this is a UX gate only; the backend
 * independently enforces authorization on every API call.
 */
export function createAuthGuard(authorize: (auth: AuthService) => boolean): CanActivateFn {
  return async (_route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    await authService.whenSessionRestored();

    if (!authService.isLoggedIn()) {
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    return authorize(authService) || router.parseUrl('/');
  };
}
