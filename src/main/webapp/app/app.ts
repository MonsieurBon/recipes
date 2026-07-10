import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatProgressBar } from '@angular/material/progress-bar';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { BottomNav } from './bottom-nav/bottom-nav';
import { LanguageMenu } from './i18n/language-menu/language-menu';
import { LanguagePickerService } from './i18n/language-picker.service';
import { LanguageService } from './i18n/language.service';
import { AuthService } from './security/auth.service';
import { LayoutService } from './utility/layout.service';
import { PendingRequestsService } from './utility/pending-requests.service';

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
    MatProgressBar,
    RouterOutlet,
    RouterLink,
    TranslatePipe,
    LanguageMenu,
  ],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.scss',
})
export class App {
  private authService = inject(AuthService);
  private language = inject(LanguageService);
  private languagePicker = inject(LanguagePickerService);
  private layoutService = inject(LayoutService);
  private pendingRequests = inject(PendingRequestsService);
  private router = inject(Router);

  protected readonly loggedIn = this.authService.isLoggedIn;
  protected readonly isAdmin = this.authService.isAdmin;
  protected readonly isCompact = this.layoutService.isCompact;
  protected readonly activityVisible = this.pendingRequests.visible;
  protected readonly currentLanguageEndonym = this.language.currentEndonym;

  protected readonly showBottomNav = computed(() => this.loggedIn() && this.isCompact());

  openLanguagePicker(): void {
    this.languagePicker.openSheet();
  }

  async logout(): Promise<void> {
    const confirmed = await this.authService.logout();
    await this.router.navigate([confirmed ? 'login' : 'logout-failed']);
  }
}
