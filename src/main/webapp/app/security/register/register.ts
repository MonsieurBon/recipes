import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatError, MatFormField, MatInput, MatLabel } from '@angular/material/input';
import {
  disabled,
  email,
  form,
  FormField,
  FormRoot,
  maxLength,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../auth.service';
import { LanguageService } from '../../i18n/language.service';

@Component({
  selector: 'app-register',
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
    TranslatePipe,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  private authService = inject(AuthService);
  private language = inject(LanguageService);
  private router = inject(Router);
  private translate = inject(TranslateService);

  // Mirrors the backend @Size cap on RegistrationDetails (itself aligned to the VARCHAR(255)
  // column width) so an over-long value can never be submitted, however it reaches the model
  // (typing, paste, autofill, or a programmatic set).
  private static readonly MAX_FIELD_LENGTH = 255;

  // Mirrors the backend @Size(min) on RegistrationDetails.password: short passwords are the
  // attack path for online guessing, so registration enforces a 12-character floor.
  private static readonly MIN_PASSWORD_LENGTH = 12;

  // Mirrors the backend @MaxUtf8Bytes cap: BCrypt rejects inputs over 72 bytes, and multibyte
  // characters (umlauts, emoji) hit that ceiling below 72 characters, so the byte length is
  // validated separately from the character count.
  private static readonly MAX_PASSWORD_BYTES = 72;

  registerModel = signal({
    username: '',
    email: '',
    password: '',
  });

  // Messages resolve through TranslateService inside the validators, so they follow a live language
  // switch: the reactive read re-runs the validator when the active language changes.
  registerForm = form(
    this.registerModel,
    (schemaPath) => {
      disabled(schemaPath, (ctx) => ctx.fieldTree().submitting());
      required(schemaPath.username, {
        message: () => this.translate.instant('validation.usernameRequired'),
      });
      maxLength(schemaPath.username, Register.MAX_FIELD_LENGTH, {
        message: () =>
          this.translate.instant('validation.maxLength', { max: Register.MAX_FIELD_LENGTH }),
      });
      required(schemaPath.email, {
        message: () => this.translate.instant('validation.emailRequired'),
      });
      email(schemaPath.email, {
        message: () => this.translate.instant('validation.emailInvalid'),
      });
      maxLength(schemaPath.email, Register.MAX_FIELD_LENGTH, {
        message: () =>
          this.translate.instant('validation.maxLength', { max: Register.MAX_FIELD_LENGTH }),
      });
      required(schemaPath.password, {
        message: () => this.translate.instant('validation.passwordRequired'),
      });
      minLength(schemaPath.password, Register.MIN_PASSWORD_LENGTH, {
        message: () =>
          this.translate.instant('validation.minLength', { min: Register.MIN_PASSWORD_LENGTH }),
      });
      maxLength(schemaPath.password, Register.MAX_PASSWORD_BYTES, {
        message: () =>
          this.translate.instant('validation.maxLength', { max: Register.MAX_PASSWORD_BYTES }),
      });
      validate(schemaPath.password, (ctx) =>
        new TextEncoder().encode(ctx.value()).length > Register.MAX_PASSWORD_BYTES
          ? {
              kind: 'maxBytes',
              message: this.translate.instant('validation.maxBytes', {
                max: Register.MAX_PASSWORD_BYTES,
              }),
            }
          : undefined,
      );
    },
    {
      submission: {
        action: async (field) => {
          // Carry the language the visitor picked while anonymous so their new account keeps it.
          const error = await this.authService.register({
            ...this.registerModel(),
            preferredLanguage: this.language.current(),
          });
          if (!error) {
            await this.router.navigate(['register', 'success']);
            return;
          }

          return error.conflictingFields.map((f) => ({
            kind: 'duplicate',
            message: this.translate.instant(`validation.${f}Duplicate`),
            fieldTree: field[f as keyof typeof field] as never,
          }));
        },
      },
    },
  );
}
