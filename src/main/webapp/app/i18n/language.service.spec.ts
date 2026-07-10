import { signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { Mock, Mocked } from 'vitest';
import { of } from 'rxjs';

import { AuthService } from '../security/auth.service';
import { LocalStorage } from '../utility/local-storage';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let translate: Mocked<Pick<TranslateService, 'use'>>;
  let storage: Mocked<Pick<LocalStorage, 'getItem' | 'setItem'>>;
  let http: { put: Mock };
  let auth: { profileLanguage: WritableSignal<string | null>; isLoggedIn: WritableSignal<boolean> };

  function withBrowserLanguages(languages: string[]): void {
    Object.defineProperty(navigator, 'languages', { value: languages, configurable: true });
  }

  function createService(): LanguageService {
    translate = { use: vi.fn().mockReturnValue(of({})) };
    storage = { getItem: vi.fn().mockReturnValue(null), setItem: vi.fn() };
    http = { put: vi.fn().mockReturnValue(of(undefined)) };
    auth = { profileLanguage: signal<string | null>(null), isLoggedIn: signal(false) };
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: translate },
        { provide: LocalStorage, useValue: storage },
        { provide: HttpClient, useValue: http },
        { provide: AuthService, useValue: auth },
      ],
    });
    return TestBed.inject(LanguageService);
  }

  it('exposes the four supported languages', () => {
    expect(createService().available.map((language) => language.code)).toEqual([
      'de',
      'en',
      'fr',
      'it',
    ]);
  });

  it('applies a supported language, reflects it in current(), and persists the choice', async () => {
    const service = createService();

    await service.use('fr');

    expect(translate.use).toHaveBeenCalledWith('fr');
    expect(service.current()).toBe('fr');
    expect(storage.setItem).toHaveBeenCalledWith('language', 'fr');
  });

  it('reflects the active language on the document lang attribute', async () => {
    const service = createService();

    await service.use('fr');

    expect(document.documentElement.lang).toBe('fr');
  });

  it('exposes the active language by its own name', async () => {
    const service = createService();
    expect(service.currentEndonym()).toBe('Deutsch');

    await service.use('fr');
    expect(service.currentEndonym()).toBe('Français');
  });

  it('ignores an unsupported language and neither switches nor persists', async () => {
    const service = createService();

    await service.use('es');

    expect(translate.use).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(service.current()).toBe('de');
  });

  it('initialises from a valid stored choice', async () => {
    const service = createService();
    storage.getItem.mockReturnValue('it');

    await service.initialize();

    expect(translate.use).toHaveBeenCalledWith('it');
    expect(service.current()).toBe('it');
  });

  it('initialises from the browser language when nothing is stored', async () => {
    const service = createService();
    withBrowserLanguages(['fr-FR', 'en']);

    await service.initialize();

    expect(translate.use).toHaveBeenCalledWith('fr');
  });

  it('initialises to German when the browser language is unsupported', async () => {
    const service = createService();
    withBrowserLanguages(['es-ES']);

    await service.initialize();

    expect(translate.use).toHaveBeenCalledWith('de');
  });

  it('ignores a poisoned stored value and falls back to detection', async () => {
    const service = createService();
    storage.getItem.mockReturnValue('<script>');
    withBrowserLanguages(['en-GB']);

    await service.initialize();

    expect(translate.use).toHaveBeenCalledWith('en');
  });

  it('applies the account language when a session provides one, without persisting it locally', () => {
    const service = createService();

    auth.profileLanguage.set('it');
    TestBed.flushEffects();

    expect(translate.use).toHaveBeenCalledWith('it');
    expect(service.current()).toBe('it');
    // The account preference drives the UI but must not overwrite the anonymous local choice.
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('ignores a poisoned account language value', () => {
    const service = createService();

    auth.profileLanguage.set('<script>');
    TestBed.flushEffects();

    expect(translate.use).not.toHaveBeenCalled();
    expect(service.current()).toBe('de');
  });

  it('writes a manual change back to the account when logged in', async () => {
    const service = createService();
    auth.isLoggedIn.set(true);

    await service.use('fr');

    expect(http.put).toHaveBeenCalledWith('/api/account/language', { language: 'fr' });
  });

  it('does not call the account endpoint when logged out', async () => {
    const service = createService();

    await service.use('fr');

    expect(http.put).not.toHaveBeenCalled();
  });

  it('restores the account language on re-login even after an anonymous switch while logged out', async () => {
    const service = createService();

    // Signed in to a French account.
    auth.isLoggedIn.set(true);
    auth.profileLanguage.set('fr');
    TestBed.flushEffects();
    expect(service.current()).toBe('fr');

    // Logout clears the account language (the effect ignores null, so the UI stays put)...
    auth.isLoggedIn.set(false);
    auth.profileLanguage.set(null);
    TestBed.flushEffects();
    expect(service.current()).toBe('fr');

    // ...then an anonymous switch to German.
    await service.use('de');
    expect(service.current()).toBe('de');

    // Signing back in to the same French account must restore French — this relies on the logout
    // reset so the effect sees a genuine change and re-applies the account language.
    auth.isLoggedIn.set(true);
    auth.profileLanguage.set('fr');
    TestBed.flushEffects();
    expect(service.current()).toBe('fr');
  });

  it('does not revert a manual switch to the stale account value', async () => {
    const service = createService();
    auth.isLoggedIn.set(true);
    auth.profileLanguage.set('fr');
    TestBed.flushEffects();
    expect(service.current()).toBe('fr');

    await service.use('it');
    TestBed.flushEffects();

    expect(service.current()).toBe('it');
  });
});
