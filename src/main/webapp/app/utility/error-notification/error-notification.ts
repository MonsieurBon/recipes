import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  MAT_SNACK_BAR_DATA,
  MatSnackBarAction,
  MatSnackBarLabel,
  MatSnackBarRef,
} from '@angular/material/snack-bar';

/** Payload the {@link NotificationService} hands to the snackbar content component. */
export interface ErrorNotificationData {
  message: string;
}

/**
 * Content component for the shared error snackbar. The string-based {@code MatSnackBar} API only
 * renders a text action, so the ✕ dismiss control needs a custom component. The message is bound
 * as plain text (never {@code innerHTML}) so nothing from an error can be interpolated as markup.
 */
@Component({
  selector: 'app-error-notification',
  imports: [MatSnackBarLabel, MatSnackBarAction, MatIconButton, MatIcon],
  templateUrl: './error-notification.html',
  styleUrl: './error-notification.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorNotification {
  private readonly snackBarRef = inject(MatSnackBarRef);

  readonly data = inject<ErrorNotificationData>(MAT_SNACK_BAR_DATA);

  dismiss(): void {
    this.snackBarRef.dismiss();
  }
}
