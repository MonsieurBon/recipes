import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';

import { LanguageService } from '../language.service';
import { LanguageCode } from '../languages';

/**
 * The language picker as a {@code mat-menu}, used from 600 px up — opened under the signed-out
 * globe and fanned out as the account menu's Sprache submenu. Exposes its {@link MatMenu} so a
 * trigger elsewhere in the shell can open it. Picking a language switches the UI immediately.
 */
@Component({
  selector: 'app-language-menu',
  imports: [MatMenu, MatMenuItem, MatIcon, TranslatePipe],
  templateUrl: './language-menu.html',
  styleUrl: './language-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageMenu {
  private readonly language = inject(LanguageService);

  /** The menu instance, referenced by triggers via {@code [matMenuTriggerFor]="picker.menu()"}. */
  readonly menu = viewChild.required(MatMenu);

  protected readonly languages = this.language.available;
  protected readonly current = this.language.current;

  select(code: LanguageCode): void {
    this.language.use(code);
  }
}
