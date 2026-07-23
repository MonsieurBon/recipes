import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatSlideToggle, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, EMPTY } from 'rxjs';

import { NotificationService } from '../../utility/notification.service';
import { AdminService, AdminUser } from '../admin.service';
import { conflictNoticeKey } from './user-conflict';

export interface UserEditSheetData {
  user: AdminUser;
  isOwn: boolean;
}

/**
 * Compact-viewport editor for a single user, opened by tapping a row. It currently holds only the
 * Aktiv toggle (role and delete controls join it in later slices). The toggle persists on change;
 * the list behind refreshes when the sheet closes. An admin cannot deactivate their own account, so
 * the toggle is disabled on the signed-in admin's own row (the server enforces the same rule).
 */
@Component({
  selector: 'app-user-edit-sheet',
  imports: [MatSlideToggle, TranslatePipe],
  templateUrl: './user-edit-sheet.html',
  styleUrl: './user-edit-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserEditSheet {
  private readonly adminService = inject(AdminService);
  private readonly notification = inject(NotificationService);
  private readonly sheetRef = inject(MatBottomSheetRef);
  protected readonly data = inject<UserEditSheetData>(MAT_BOTTOM_SHEET_DATA);

  protected readonly enabled = signal(this.data.user.enabled);

  toggleEnabled(change: MatSlideToggleChange): void {
    const target = change.checked;
    this.enabled.set(target);
    this.adminService
      .setEnabled(this.data.user.id, target)
      .pipe(
        catchError((error: unknown) => {
          // Undo the optimistic flip; a recognized conflict shows its dedicated message, anything
          // else rethrows to the global handler as an unexpected failure.
          this.enabled.set(!target);
          const noticeKey = conflictNoticeKey(error);
          if (noticeKey) {
            this.notification.showNotice(noticeKey);
            return EMPTY;
          }
          throw error;
        }),
      )
      .subscribe((updated) => this.enabled.set(updated.enabled));
  }

  close(): void {
    this.sheetRef.dismiss();
  }
}
