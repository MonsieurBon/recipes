import { createAuthGuard } from './auth-guard';

/**
 * Admits any signed-in user; anonymous visitors are sent to the login page (and returned to the
 * requested URL afterwards). For routes that additionally require a role, build a dedicated guard
 * via {@link createAuthGuard} instead. See {@link createAuthGuard} for the shared guarding
 * behaviour.
 */
export const loggedInGuard = createAuthGuard(() => true);
