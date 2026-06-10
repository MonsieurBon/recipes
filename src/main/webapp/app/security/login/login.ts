import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatError, MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { disabled, form, FormField, FormRoot, maxLength, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
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
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Mirrors the backend @Size cap on LoginCredentials so an over-long value can never be submitted,
  // however it reaches the model (typing, paste, autofill, or a programmatic set).
  private static readonly MAX_FIELD_LENGTH = 256;

  private readonly errorMessages = {
    usernameOrEmail: {
      required: 'Benutzername oder Email ist erforderlich',
      maxlength: `Darf höchstens ${Login.MAX_FIELD_LENGTH} Zeichen lang sein`,
    },
    password: {
      required: 'Passwort ist erforderlich',
      maxlength: `Darf höchstens ${Login.MAX_FIELD_LENGTH} Zeichen lang sein`,
    },
  };

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
      required(schemaPath.usernameOrEmail, {
        message: this.errorMessages.usernameOrEmail.required,
      });
      maxLength(schemaPath.usernameOrEmail, Login.MAX_FIELD_LENGTH, {
        message: this.errorMessages.usernameOrEmail.maxlength,
      });
      required(schemaPath.password, { message: this.errorMessages.password.required });
      maxLength(schemaPath.password, Login.MAX_FIELD_LENGTH, {
        message: this.errorMessages.password.maxlength,
      });
    },
    {
      submission: {
        action: async () => {
          this.loginFailed.set(false);
          const success = await this.authService.login(this.loginModel());
          if (success) {
            await this.router.navigate(['/']);
          } else {
            this.loginFailed.set(true);
          }
        },
      },
    },
  );

  constructor() {
    // A rejected-credentials message is form-level state; clear it as soon as the user edits either
    // field so a stale "invalid credentials" error doesn't linger while they correct their input.
    effect(() => {
      this.loginModel();
      this.loginFailed.set(false);
    });
  }
}
