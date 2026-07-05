import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { BottomNav } from './bottom-nav/bottom-nav';
import { AuthService } from './security/auth.service';
import { LayoutService } from './utility/layout.service';

@Component({
  selector: 'app-root',
  imports: [
    BottomNav,
    MatToolbar,
    MatIcon,
    MatButton,
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
  private layoutService = inject(LayoutService);
  private router = inject(Router);

  protected readonly loggedIn = this.authService.isLoggedIn;
  protected readonly isAdmin = this.authService.isAdmin;
  protected readonly isCompact = this.layoutService.isCompact;

  protected readonly showBottomNav = computed(() => this.loggedIn() && this.isCompact());

  async logout(): Promise<void> {
    const confirmed = await this.authService.logout();
    await this.router.navigate([confirmed ? 'login' : 'logout-failed']);
  }
}
