import { TitleCasePipe, UpperCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ErrorHandler,
  inject,
  linkedSignal,
  Signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
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
import { catchError, of, switchMap } from 'rxjs';
import { LayoutService } from '../../utility/layout.service';
import { AdminService, UserPage } from '../admin.service';

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
    MatPaginator,
    MatRow,
    MatRowDef,
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
  private errorHandler = inject(ErrorHandler);
  private layoutService = inject(LayoutService);

  protected readonly isCompact = this.layoutService.isCompact;
  protected readonly columns = ['username', 'email', 'roles'];
  protected readonly pageSizeOptions = [10, 20, 50];

  private readonly request = computed(() => ({ page: this.pageIndex(), size: this.pageSize() }));
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
}
