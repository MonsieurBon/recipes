import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../security/auth.service';

/**
 * Restricts {@code /admin} routes to signed-in administrators. Non-admins (including anonymous
 * visitors) are redirected to the home page. This is a UX gate only; the backend independently
 * enforces authorization on every admin API call.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAdmin() || router.parseUrl('/');
};
