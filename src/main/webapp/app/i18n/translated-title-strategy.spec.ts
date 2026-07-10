import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslateService } from '@ngx-translate/core';

import { provideTranslateTesting } from '../testing/provide-translate-testing';
import { TranslatedTitleStrategy } from './translated-title-strategy';

@Component({ template: '' })
class Dummy {}

describe('TranslatedTitleStrategy', () => {
  async function navigate(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideTranslateTesting(),
        provideRouter([{ path: 'konto', component: Dummy, title: 'app.account' }]),
        { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/konto');
  }

  it('sets the document title from the route key, prefixed with the app name', async () => {
    await navigate();

    expect(TestBed.inject(Title).getTitle()).toBe('Rezepte - Konto');
  });

  it('retranslates the title when the language changes', async () => {
    await navigate();

    TestBed.inject(TranslateService).use('en');

    expect(TestBed.inject(Title).getTitle()).toBe('Recipes - Account');
  });
});
