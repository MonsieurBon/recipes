import { TitleCasePipe, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { LayoutService } from '../../utility/layout.service';
import { AdminService } from '../admin.service';

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
    MatRow,
    MatRowDef,
    MatTable,
    TitleCasePipe,
    UpperCasePipe,
  ],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsers {
  private adminService = inject(AdminService);
  private layoutService = inject(LayoutService);

  protected readonly isCompact = this.layoutService.isCompact;
  protected readonly users = toSignal(this.adminService.getUsers(), { initialValue: [] });
  protected readonly columns = ['username', 'email', 'roles'];
}
