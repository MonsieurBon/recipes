import { TestBed } from '@angular/core/testing';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { Mock } from 'vitest';

import { LanguagePickerService } from './language-picker.service';
import { LanguageSheet } from './language-sheet/language-sheet';

describe('LanguagePickerService', () => {
  let bottomSheet: { open: Mock };

  function createService(): LanguagePickerService {
    bottomSheet = { open: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: MatBottomSheet, useValue: bottomSheet }],
    });
    return TestBed.inject(LanguagePickerService);
  }

  it('opens the language bottom sheet', () => {
    createService().openSheet();

    expect(bottomSheet.open).toHaveBeenCalledWith(LanguageSheet);
  });
});
