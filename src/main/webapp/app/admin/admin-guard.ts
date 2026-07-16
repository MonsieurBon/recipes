import { createAuthGuard } from '../security/auth-guard';

/**
 * Restricts {@code /admin} routes to signed-in administrators. Anonymous visitors are sent to the
 * login page (and returned to the requested URL afterwards); signed-in non-admins are sent to the
 * home page with a brief not-authorized notice. See {@link createAuthGuard} for the shared guarding
 * behaviour.
 */
export const adminGuard = createAuthGuard((auth) => auth.isAdmin());
