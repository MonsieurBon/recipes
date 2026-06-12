import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AuthService } from './security/auth.service';
import { authenticationInterceptor } from './security/authentication-interceptor';
import { refreshInterceptor } from './security/refresh-interceptor';
import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormFieldDefaultOptions,
} from '@angular/material/form-field';
import { MAT_CARD_CONFIG, MatCardConfig } from '@angular/material/card';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authenticationInterceptor, refreshInterceptor])),
    // Fire-and-forget so app startup is not blocked on the network: the UI renders immediately
    // and flips to the logged-in state when the restore resolves.
    provideAppInitializer(() => inject(AuthService).restoreSession()),
    provideRouter(routes),
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline' } as MatFormFieldDefaultOptions,
    },
    {
      provide: MAT_CARD_CONFIG,
      useValue: { appearance: 'outlined' } as MatCardConfig,
    },
  ],
};
