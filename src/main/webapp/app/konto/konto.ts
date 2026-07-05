import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import {
  MatActionList,
  MatListItem,
  MatListItemIcon,
  MatListItemMeta,
  MatListItemTitle,
} from '@angular/material/list';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../security/auth.service';

@Component({
  selector: 'app-konto',
  imports: [
    MatActionList,
    MatIcon,
    MatListItem,
    MatListItemIcon,
    MatListItemMeta,
    MatListItemTitle,
    RouterLink,
  ],
  templateUrl: './konto.html',
  styleUrl: './konto.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Konto {
  private authService = inject(AuthService);
  private router = inject(Router);

  protected readonly isAdmin = this.authService.isAdmin;
  protected readonly user = this.authService.currentUser;

  protected readonly initial = computed(() => this.user()?.username.charAt(0).toUpperCase() ?? '');

  async logout(): Promise<void> {
    const confirmed = await this.authService.logout();
    await this.router.navigate([confirmed ? 'login' : 'logout-failed']);
  }
}
