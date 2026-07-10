import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LayoutService } from '../utility/layout.service';

@Component({
  selector: 'app-admin-shell',
  imports: [
    MatIcon,
    MatIconButton,
    MatTabLink,
    MatTabNav,
    MatTabNavPanel,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TranslatePipe,
  ],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShell {
  private layoutService = inject(LayoutService);
  private router = inject(Router);

  protected readonly isCompact = this.layoutService.isCompact;

  // A fixed destination rather than history.back(): on a deep link or hard refresh there is
  // no in-app history entry, and the Konto page is where the compact admin entry lives.
  back(): void {
    this.router.navigate(['/konto']);
  }
}
