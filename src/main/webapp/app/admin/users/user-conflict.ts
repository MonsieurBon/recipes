import { HttpErrorResponse } from '@angular/common/http';

// The reason codes the backend returns in a 409 body when it refuses a user change, mapped to the
// fixed translation keys for the dedicated notice each one shows.
const CONFLICT_KEYS: Record<string, string> = {
  selfDeactivation: 'admin.userConflict.selfDeactivation',
  lastActiveAdmin: 'admin.userConflict.lastActiveAdmin',
};

/**
 * Translation key for an expected, reason-coded admin conflict (a 409), or null when the error is
 * not a recognized conflict and should fall through to the global error handler. A conflict is an
 * expected outcome the user can act on, so it gets a dedicated message rather than the console.
 */
export function conflictNoticeKey(error: unknown): string | null {
  if (error instanceof HttpErrorResponse && error.status === 409) {
    const reason = (error.error as { reason?: string } | null)?.reason;
    if (reason && reason in CONFLICT_KEYS) {
      return CONFLICT_KEYS[reason];
    }
  }
  return null;
}
