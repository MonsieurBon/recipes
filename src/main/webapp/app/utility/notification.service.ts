import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

import { AuthService } from '../security/auth.service';
import { ErrorNotification, ErrorNotificationData } from './error-notification/error-notification';
import { LayoutService } from './layout.service';

/**
 * Central owner of the app's transient snackbar notices, so their text, timing, and placement live
 * in one place. It surfaces the generic error notification (which the global {@code ErrorHandler}
 * routes through here) as well as the not-authorized notice a route guard raises when it turns a
 * signed-in user away. Every message is a fixed translation key: nothing from an error — its own
 * text, response body, or stack — is ever interpolated into what the user sees.
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  // Resolved in the active language when the notice is shown. Kept deliberately generic: never
  // interpolate an error's message, response body, or stack — those belong in the console/log only.
  private static readonly GENERIC_ERROR_KEY = 'errors.generic';

  // Shown when a route guard turns away a signed-in user who lacks permission for the page.
  private static readonly ACCESS_DENIED_KEY = 'access.denied';

  // Auto-dismiss window; a ✕ in the content component closes it sooner. MatSnackBar shows one
  // notice at a time and replaces the visible one when a newer error arrives, so they never stack.
  private static readonly DURATION_MS = 6000;

  private readonly auth = inject(AuthService);
  private readonly layout = inject(LayoutService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  /** Surfaces the one generic notification for any error the user cannot act on. */
  showGenericError(): void {
    this.show(NotificationService.GENERIC_ERROR_KEY);
  }

  /** Tells a signed-in user, briefly, that they lack access to the page they requested. */
  showAccessDenied(): void {
    this.show(NotificationService.ACCESS_DENIED_KEY);
  }

  /**
   * Surfaces a specific, actionable notice by its translation key — e.g. the reason an expected
   * conflict was refused. The key is always a fixed code constant; no error content is interpolated.
   */
  showNotice(messageKey: string): void {
    this.show(messageKey);
  }

  private show(messageKey: string): void {
    // The fixed bottom navigation — shown only to a signed-in user on a phone — owns the bottom
    // edge, so lift the toast clear of it exactly when that nav is present.
    const aboveBottomNav = this.layout.isCompact() && this.auth.isLoggedIn();
    this.snackBar.openFromComponent(ErrorNotification, {
      data: {
        message: this.translate.instant(messageKey),
      } satisfies ErrorNotificationData,
      duration: NotificationService.DURATION_MS,
      panelClass: aboveBottomNav ? ['notification-above-bottom-nav'] : [],
    });
  }
}
