import { TitleCasePipe, UpperCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ErrorHandler,
  inject,
  linkedSignal,
  signal,
  Signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatIcon } from '@angular/material/icon';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSlideToggle, MatSlideToggleChange } from '@angular/material/slide-toggle';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable,
} from '@angular/material/table';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, EMPTY, finalize, of, switchMap } from 'rxjs';
import { AuthService } from '../../security/auth.service';
import { LayoutService } from '../../utility/layout.service';
import { NotificationService } from '../../utility/notification.service';
import { AdminService, AdminUser, UserPage } from '../admin.service';
import { conflictNoticeKey } from './user-conflict';
import { UserEditSheet } from './user-edit-sheet';

const DEFAULT_PAGE_SIZE = 10;

@Component({
  selector: 'app-admin-users',
  imports: [
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderCellDef,
    MatHeaderRow,
    MatHeaderRowDef,
    MatIcon,
    MatPaginator,
    MatRow,
    MatRowDef,
    MatSlideToggle,
    MatTable,
    TitleCasePipe,
    UpperCasePipe,
    TranslatePipe,
  ],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsers {
  private adminService = inject(AdminService);
  private authService = inject(AuthService);
  private bottomSheet = inject(MatBottomSheet);
  private errorHandler = inject(ErrorHandler);
  private layoutService = inject(LayoutService);
  private notification = inject(NotificationService);

  protected readonly isCompact = this.layoutService.isCompact;
  protected readonly columns = ['username', 'email', 'active', 'roles'];
  protected readonly pageSizeOptions = [10, 20, 50];

  // Bumped to force a re-fetch of the current page after a change (an enabled toggle, or the edit
  // sheet closing), so the list reconciles with what the server actually stored.
  private readonly reload = signal(0);

  private readonly request = computed(() => ({
    page: this.pageIndex(),
    size: this.pageSize(),
    reload: this.reload(),
  }));
  private readonly result: Signal<UserPage> = toSignal(
    toObservable(this.request).pipe(
      switchMap((request) =>
        this.adminService.getUsers(request.page, request.size).pipe(
          // Keep the long-lived stream alive when a fetch fails; otherwise a single error would end
          // it and silently stop all further paging. Re-emit the last successfully loaded page (a
          // fresh copy, so the reconcile re-runs and snaps the paginator back to it) rather than
          // blanking the table. The reconcile converges — it only refetches while the reconciled
          // page differs from the failed request — so a persistent failure settles, it does not
          // loop. The error still reaches the global handler (log + toast).
          catchError((error: unknown) => {
            this.errorHandler.handleError(error);
            return of<UserPage>({ ...this.result() });
          }),
        ),
      ),
    ),
    { initialValue: { content: [], totalElements: 0, number: 0, size: DEFAULT_PAGE_SIZE } },
  );

  // User-settable, but linked to the server's response: a page change writes these to drive the
  // fetch, and once the server answers they snap back to the page it actually served (e.g. a size
  // the backend capped), so the paginator can never drift from the response.
  protected readonly pageIndex = linkedSignal(() => this.result().number);
  protected readonly pageSize = linkedSignal(() => this.result().size);
  protected readonly users = computed(() => this.result().content);
  protected readonly total = computed(() => this.result().totalElements);

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  // The signed-in admin cannot deactivate their own account, so their own row's toggle is disabled.
  // Identity is the immutable id; the server enforces the same rule regardless of the client.
  protected isOwn(user: AdminUser): boolean {
    return user.id === this.authService.currentUser()?.id;
  }

  protected onToggle(user: AdminUser, change: MatSlideToggleChange): void {
    this.setEnabled(user.id, change.checked);
  }

  private setEnabled(id: number, enabled: boolean): void {
    this.adminService
      .setEnabled(id, enabled)
      .pipe(
        catchError((error: unknown) => {
          // A recognized conflict is expected and shows its dedicated message; anything else
          // rethrows to the global handler. Either way the reload below snaps the row back to the
          // server's truth.
          const noticeKey = conflictNoticeKey(error);
          if (noticeKey) {
            this.notification.showNotice(noticeKey);
            return EMPTY;
          }
          throw error;
        }),
        finalize(() => this.reload.update((n) => n + 1)),
      )
      .subscribe();
  }

  protected openEditSheet(user: AdminUser): void {
    this.bottomSheet
      .open(UserEditSheet, { data: { user, isOwn: this.isOwn(user) } })
      .afterDismissed()
      .subscribe(() => this.reload.update((n) => n + 1));
  }
}
