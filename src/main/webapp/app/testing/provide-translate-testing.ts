import { EnvironmentProviders, Provider } from '@angular/core';
import { provideTranslateService, TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import de from '../../assets/i18n/de.json';
import en from '../../assets/i18n/en.json';
import fr from '../../assets/i18n/fr.json';
import it from '../../assets/i18n/it.json';

const BUNDLES: Record<string, TranslationObject> = { de, en, fr, it };

/**
 * Loader that returns the real shipped bundles synchronously, so specs render the same text the app
 * ships and stay in sync with the JSON without hitting the network. Because it is synchronous,
 * {@code translate.use(...)} resolves within the same change-detection pass — no {@code whenStable}.
 */
class StaticBundleLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<TranslationObject> {
    return of(BUNDLES[lang] ?? de);
  }
}

/** Test providers wiring ngx-translate with the real bundles, starting in German. */
export function provideTranslateTesting(): (Provider | EnvironmentProviders)[] {
  return provideTranslateService({
    loader: { provide: TranslateLoader, useClass: StaticBundleLoader },
    lang: 'de',
    fallbackLang: 'de',
  });
}
