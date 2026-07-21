import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';

import { routes } from './app.routes';
import { TranslatedTitleStrategy } from './i18n/translated-title-strategy';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { AuthService } from './security/auth.service';
import { authenticationInterceptor } from './security/authentication-interceptor';
import { refreshInterceptor } from './security/refresh-interceptor';
import { DEFAULT_LANGUAGE } from './i18n/languages';
import { LanguageService } from './i18n/language.service';
import { GlobalErrorHandler } from './utility/global-error-handler';
import { pendingRequestsInterceptor } from './utility/pending-requests-interceptor';
import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormFieldDefaultOptions,
} from '@angular/material/form-field';
import { MAT_CARD_CONFIG, MatCardConfig } from '@angular/material/card';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslatedPaginatorIntl } from './i18n/translated-paginator-intl';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideHttpClient(
      withInterceptors([pendingRequestsInterceptor, authenticationInterceptor, refreshInterceptor]),
    ),
    provideTranslateService({
      loader: provideTranslateHttpLoader({ prefix: '/assets/i18n/', suffix: '.json' }),
      fallbackLang: DEFAULT_LANGUAGE,
    }),
    // Block first render on the initial bundle so the UI never flashes untranslated keys; it is a
    // small local JSON fetch. The language is resolved (stored choice, browser, then German) here.
    provideAppInitializer(() => inject(LanguageService).initialize()),
    // Fire-and-forget so app startup is not blocked on the network: the UI renders immediately
    // and flips to the logged-in state when the restore resolves.
    provideAppInitializer(() => inject(AuthService).restoreSession()),
    provideRouter(routes),
    { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline' } as MatFormFieldDefaultOptions,
    },
    {
      provide: MAT_CARD_CONFIG,
      useValue: { appearance: 'outlined' } as MatCardConfig,
    },
    { provide: MatPaginatorIntl, useClass: TranslatedPaginatorIntl },
  ],
};
