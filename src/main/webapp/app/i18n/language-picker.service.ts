import { inject, Injectable } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';

import { LanguageSheet } from './language-sheet/language-sheet';

/**
 * Opens the compact language picker. On phone-width viewports the picker is a bottom sheet in thumb
 * reach; the shell calls this from the signed-out globe and the Konto Sprache row. From 600 px up
 * the picker is a {@code mat-menu} instead and is wired declaratively, so it does not go through here.
 */
@Injectable({
  providedIn: 'root',
})
export class LanguagePickerService {
  private readonly bottomSheet = inject(MatBottomSheet);

  openSheet(): void {
    this.bottomSheet.open(LanguageSheet);
  }
}
