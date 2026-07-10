import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { LanguageService } from '../language.service';
import { LanguageCode } from '../languages';

/**
 * Bottom-sheet content for the language picker on compact viewports. Lists the shipped languages by
 * their own name with the active one checked; a tap applies the language and dismisses the sheet.
 */
@Component({
  selector: 'app-language-sheet',
  imports: [MatIcon, TranslatePipe],
  templateUrl: './language-sheet.html',
  styleUrl: './language-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSheet {
  private readonly language = inject(LanguageService);
  private readonly sheetRef = inject(MatBottomSheetRef);

  protected readonly languages = this.language.available;
  protected readonly current = this.language.current;

  select(code: LanguageCode): void {
    this.language.use(code);
    this.sheetRef.dismiss();
  }

  close(): void {
    this.sheetRef.dismiss();
  }
}
