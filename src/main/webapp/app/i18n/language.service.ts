import { HttpClient } from '@angular/common/http';
import { computed, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../security/auth.service';
import { LocalStorage } from '../utility/local-storage';
import { DEFAULT_LANGUAGE, isSupportedLanguage, LanguageCode, LANGUAGES } from './languages';

/**
 * Owns the active UI language. Resolves the initial language on startup (a stored choice, then the
 * browser's preference, then German), switches it live, and persists an explicit choice so it
 * survives a reload. Every value that enters from an untrusted source — localStorage, the browser —
 * is whitelisted against {@link LanguageCode} before it is trusted.
 */
@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private static readonly STORAGE_KEY = 'language';
  private static readonly PREFERENCE_ENDPOINT = '/api/account/language';

  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly http = inject(HttpClient);
  private readonly storage = inject(LocalStorage);
  private readonly translate = inject(TranslateService);

  readonly available = LANGUAGES;

  // The last account preference the profile effect acted on. Tracked as a plain field (not read
  // reactively) so the effect fires only when the account value itself changes — a manual switch
  // afterwards moves current() but leaves this untouched, so the effect never reverts it.
  private lastAppliedProfile: string | null = null;

  private readonly _current = signal<LanguageCode>(DEFAULT_LANGUAGE);
  /** The active language code; the picker marks it and templates react to it. */
  readonly current = this._current.asReadonly();

  /** The active language's own name, shown as the value on the Sprache row and account entry. */
  readonly currentEndonym = computed(
    () => this.available.find((language) => language.code === this.current())?.endonym ?? '',
  );

  constructor() {
    // Profile wins over the local choice: once a session reports the account's stored language,
    // switch to it. It is applied but never written to localStorage, so an anonymous user's local
    // choice stays intact for after they log out. Fires only on a genuine change to the account
    // value, so it never fights a manual switch the user makes while logged in.
    effect(() => {
      const profile = this.auth.profileLanguage();
      if (profile === this.lastAppliedProfile) {
        return;
      }
      this.lastAppliedProfile = profile;
      if (isSupportedLanguage(profile)) {
        this.apply(profile);
      }
    });
  }

  /** Resolves the initial language and applies it. Awaited on startup so nothing renders untranslated. */
  initialize(): Promise<void> {
    return this.apply(this.resolveInitial());
  }

  /**
   * Switches to the given language when supported and persists the choice; ignores anything else.
   * While logged in the choice is also written back to the account so it follows the user across
   * devices.
   */
  use(code: string): Promise<void> {
    if (!isSupportedLanguage(code)) {
      return Promise.resolve();
    }
    this.storage.setItem(LanguageService.STORAGE_KEY, code);
    if (this.auth.isLoggedIn()) {
      this.persistToAccount(code);
    }
    return this.apply(code);
  }

  private persistToAccount(code: LanguageCode): void {
    // Fire-and-forget: the UI has already switched, so a failed write-back is nothing to act on
    // here. Left unhandled, it reaches the global ErrorHandler like any other request error.
    this.http.put(LanguageService.PREFERENCE_ENDPOINT, { language: code }).subscribe();
  }

  private apply(code: LanguageCode): Promise<void> {
    this._current.set(code);
    // Keep the document language in step with the UI so assistive tech and the browser announce
    // content in the active language. This is the single choke point every switch flows through.
    this.document.documentElement.lang = code;
    return firstValueFrom(this.translate.use(code)).then(() => undefined);
  }

  private resolveInitial(): LanguageCode {
    const stored = this.storage.getItem(LanguageService.STORAGE_KEY);
    if (isSupportedLanguage(stored)) {
      return stored;
    }
    return this.detectBrowserLanguage() ?? DEFAULT_LANGUAGE;
  }

  private detectBrowserLanguage(): LanguageCode | null {
    for (const tag of navigator.languages ?? []) {
      const primary = tag.split('-')[0].toLowerCase();
      if (isSupportedLanguage(primary)) {
        return primary;
      }
    }
    return null;
  }
}
