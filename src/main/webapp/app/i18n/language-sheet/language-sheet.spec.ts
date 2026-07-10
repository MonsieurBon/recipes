import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { Mocked } from 'vitest';

import { LanguageService } from '../language.service';
import { LanguageCode, LANGUAGES } from '../languages';
import { provideTranslateTesting } from '../../testing/provide-translate-testing';
import { LanguageSheet } from './language-sheet';

describe('LanguageSheet', () => {
  let fixture: ComponentFixture<LanguageSheet>;
  let language: Mocked<Pick<LanguageService, 'use'>> & {
    available: typeof LANGUAGES;
    current: () => LanguageCode;
  };
  let sheetRef: Mocked<Pick<MatBottomSheetRef, 'dismiss'>>;

  beforeEach(async () => {
    language = {
      available: LANGUAGES,
      use: vi.fn().mockResolvedValue(undefined),
      current: () => LanguageCode.German,
    };
    sheetRef = { dismiss: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [LanguageSheet],
      providers: [
        provideTranslateTesting(),
        { provide: LanguageService, useValue: language },
        { provide: MatBottomSheetRef, useValue: sheetRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageSheet);
    await fixture.whenStable();
  });

  const rows = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('[data-test-id="languageOption"]'));

  const names = (): string[] =>
    Array.from(fixture.nativeElement.querySelectorAll('[data-test-id="languageOptionName"]')).map(
      (name) => (name as HTMLElement).textContent!.trim(),
    );

  it('lists the four languages by their own name', () => {
    expect(names()).toEqual(['Deutsch', 'English', 'Français', 'Italiano']);
  });

  it('marks the active language as selected', () => {
    const german = rows().find((row) => row.textContent!.includes('Deutsch'))!;
    const french = rows().find((row) => row.textContent!.includes('Français'))!;

    expect(german.getAttribute('aria-selected')).toBe('true');
    expect(french.getAttribute('aria-selected')).toBe('false');
  });

  it('switches to the tapped language and dismisses the sheet', () => {
    rows()
      .find((row) => row.textContent!.includes('Italiano'))!
      .click();

    expect(language.use).toHaveBeenCalledWith(LanguageCode.Italian);
    expect(sheetRef.dismiss).toHaveBeenCalledOnce();
  });

  it('dismisses the sheet when the handle is tapped', () => {
    fixture.nativeElement.querySelector('[data-test-id="sheetHandle"]').click();

    expect(sheetRef.dismiss).toHaveBeenCalledOnce();
  });
});
