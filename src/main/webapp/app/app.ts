import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './security/auth.service';

@Component({
  selector: 'app-root',
  imports: [
    MatToolbar,
    MatIcon,
    MatIconButton,
    MatMenu,
    MatMenuTrigger,
    MatMenuItem,
    RouterOutlet,
    RouterLink,
  ],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.scss',
})
export class App {
  private authService = inject(AuthService);
  private router = inject(Router);

  protected readonly loggedIn = this.authService.isLoggedIn;

  async logout(): Promise<void> {
    const confirmed = await this.authService.logout();
    await this.router.navigate([confirmed ? 'login' : 'logout-failed']);
  }
}
