import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

import { AuthService } from '../security/auth.service';
import { ErrorNotification, ErrorNotificationData } from './error-notification/error-notification';
import { LayoutService } from './layout.service';

/**
 * Central producer of the app's shared error notification. The global {@code ErrorHandler} routes
 * through here so there is a single owner of the message text, timing, and placement — the message
 * is fixed and generic on purpose, so an error's own text is never surfaced to the user.
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  // Resolved in the active language when the notice is shown. Kept deliberately generic: never
  // interpolate an error's message, response body, or stack — those belong in the console/log only.
  private static readonly GENERIC_ERROR_KEY = 'errors.generic';

  // Auto-dismiss window; a ✕ in the content component closes it sooner. MatSnackBar shows one
  // notice at a time and replaces the visible one when a newer error arrives, so they never stack.
  private static readonly DURATION_MS = 6000;

  private readonly auth = inject(AuthService);
  private readonly layout = inject(LayoutService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  /** Surfaces the one generic notification for any error the user cannot act on. */
  showGenericError(): void {
    // The fixed bottom navigation — shown only to a signed-in user on a phone — owns the bottom
    // edge, so lift the toast clear of it exactly when that nav is present.
    const aboveBottomNav = this.layout.isCompact() && this.auth.isLoggedIn();
    this.snackBar.openFromComponent(ErrorNotification, {
      data: {
        message: this.translate.instant(NotificationService.GENERIC_ERROR_KEY),
      } satisfies ErrorNotificationData,
      duration: NotificationService.DURATION_MS,
      panelClass: aboveBottomNav ? ['notification-above-bottom-nav'] : [],
    });
  }
}
