import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatError, MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { disabled, form, FormField, FormRoot, maxLength, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  imports: [
    MatCardContent,
    MatCardTitle,
    MatCardHeader,
    MatCard,
    MatError,
    MatFormField,
    MatInput,
    FormField,
    FormRoot,
    MatLabel,
    MatButton,
    MatProgressSpinner,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private translate = inject(TranslateService);

  // Mirrors the backend @Size cap on LoginCredentials so an over-long value can never be submitted,
  // however it reaches the model (typing, paste, autofill, or a programmatic set).
  private static readonly MAX_FIELD_LENGTH = 256;

  // The backend answers a wrong username/password with a single 401; there is no field-level
  // detail to attach, so the failure surfaces as one form-level message instead.
  readonly loginFailed = signal(false);

  readonly loginModel = signal({
    usernameOrEmail: '',
    password: '',
  });

  readonly loginForm = form(
    this.loginModel,
    (schemaPath) => {
      disabled(schemaPath, (ctx) => ctx.fieldTree().submitting());
      // Messages resolve through TranslateService inside the validator, so they follow a live
      // language switch: the reactive read re-runs the validator when the active language changes.
      required(schemaPath.usernameOrEmail, {
        message: () => this.translate.instant('validation.usernameOrEmailRequired'),
      });
      maxLength(schemaPath.usernameOrEmail, Login.MAX_FIELD_LENGTH, {
        message: () =>
          this.translate.instant('validation.maxLength', { max: Login.MAX_FIELD_LENGTH }),
      });
      required(schemaPath.password, {
        message: () => this.translate.instant('validation.passwordRequired'),
      });
      maxLength(schemaPath.password, Login.MAX_FIELD_LENGTH, {
        message: () =>
          this.translate.instant('validation.maxLength', { max: Login.MAX_FIELD_LENGTH }),
      });
    },
    {
      submission: {
        action: async () => {
          this.loginFailed.set(false);
          const success = await this.authService.login(this.loginModel());
          if (success) {
            await this.router.navigateByUrl(this.returnUrl());
          } else {
            this.loginFailed.set(true);
          }
        },
      },
    },
  );

  // The post-login destination: the URL a guard captured when it bounced an anonymous visitor here
  // (the returnUrl query param), or the home page otherwise. The value is resolved against the
  // current origin and only accepted while it stays on it, so a crafted returnUrl — an absolute,
  // protocol-relative, or backslash-obscured URL — cannot turn the login into an open redirect.
  private returnUrl(): string {
    const requested = this.route.snapshot.queryParamMap.get('returnUrl');
    if (!requested) {
      return '/';
    }
    const resolved = new URL(requested, window.location.origin);
    return resolved.origin === window.location.origin
      ? resolved.pathname + resolved.search + resolved.hash
      : '/';
  }

  constructor() {
    // A rejected-credentials message is form-level state; clear it as soon as the user edits either
    // field so a stale "invalid credentials" error doesn't linger while they correct their input.
    effect(() => {
      this.loginModel();
      this.loginFailed.set(false);
    });
  }
}
