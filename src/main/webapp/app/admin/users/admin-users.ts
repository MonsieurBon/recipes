import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsers {}
