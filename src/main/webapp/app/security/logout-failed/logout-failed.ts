import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-logout-failed',
  imports: [MatCard, MatCardContent, MatCardHeader, MatCardTitle, MatButton],
  templateUrl: './logout-failed.html',
  styleUrl: './logout-failed.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoutFailed {
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly retrying = signal(false);
  readonly retryFailed = signal(false);

  async retry(): Promise<void> {
    this.retrying.set(true);
    this.retryFailed.set(false);
    const confirmed = await this.authService.logout();
    this.retrying.set(false);
    if (confirmed) {
      await this.router.navigate(['login']);
    } else {
      this.retryFailed.set(true);
    }
  }
}
