import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatMenuTrigger } from '@angular/material/menu';
import { Mocked } from 'vitest';

import { LanguageService } from '../language.service';
import { LanguageCode, LANGUAGES } from '../languages';
import { provideTranslateTesting } from '../../testing/provide-translate-testing';
import { LanguageMenu } from './language-menu';

@Component({
  imports: [LanguageMenu, MatMenuTrigger],
  template: `
    <button [matMenuTriggerFor]="picker.menu()" data-test-id="trigger">open</button>
    <app-language-menu #picker />
  `,
})
class Host {}

describe('LanguageMenu', () => {
  let fixture: ComponentFixture<Host>;
  let language: Mocked<Pick<LanguageService, 'use'>> & {
    available: typeof LANGUAGES;
    current: () => LanguageCode;
  };

  async function open(): Promise<void> {
    fixture.nativeElement.querySelector('[data-test-id="trigger"]').click();
    await fixture.whenStable();
  }

  const options = (): HTMLElement[] =>
    Array.from(document.querySelectorAll('[data-test-id="languageOption"]'));

  beforeEach(async () => {
    language = {
      available: LANGUAGES,
      use: vi.fn().mockResolvedValue(undefined),
      current: () => LanguageCode.German,
    };

    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideTranslateTesting(), { provide: LanguageService, useValue: language }],
    }).compileComponents();

    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  it('lists the four languages by their own name once opened', async () => {
    await open();

    expect(
      options().map((option) =>
        option.querySelector('[data-test-id="languageOptionName"]')!.textContent!.trim(),
      ),
    ).toEqual(['Deutsch', 'English', 'Français', 'Italiano']);
  });

  it('marks the active language as current', async () => {
    await open();

    const german = options().find((o) => o.textContent!.includes('Deutsch'))!;
    const french = options().find((o) => o.textContent!.includes('Français'))!;

    expect(german.getAttribute('aria-current')).toBe('true');
    expect(french.getAttribute('aria-current')).toBeNull();
  });

  it('switches to the picked language', async () => {
    await open();

    options()
      .find((o) => o.textContent!.includes('Italiano'))!
      .click();

    expect(language.use).toHaveBeenCalledWith(LanguageCode.Italian);
  });
});
