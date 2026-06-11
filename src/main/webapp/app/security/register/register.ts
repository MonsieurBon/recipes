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
import { AuthService } from '../auth.service';

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
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  private authService = inject(AuthService);
  private router = inject(Router);

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

  private readonly errorMessages: Record<string, Record<string, string>> = {
    username: {
      required: 'Benutzername ist erforderlich',
      maxlength: `Darf höchstens ${Register.MAX_FIELD_LENGTH} Zeichen lang sein`,
      duplicate: 'Benutzername ist bereits vergeben',
    },
    email: {
      required: 'Email ist erforderlich',
      invalid: 'Email ist ungültig',
      maxlength: `Darf höchstens ${Register.MAX_FIELD_LENGTH} Zeichen lang sein`,
      duplicate: 'Email ist bereits vergeben',
    },
    password: {
      required: 'Passwort ist erforderlich',
      minlength: `Muss mindestens ${Register.MIN_PASSWORD_LENGTH} Zeichen lang sein`,
      maxlength: `Darf höchstens ${Register.MAX_PASSWORD_BYTES} Zeichen lang sein`,
      maxbytes: `Darf höchstens ${Register.MAX_PASSWORD_BYTES} Bytes lang sein (Umlaute und Sonderzeichen zählen mehrfach)`,
    },
  };

  registerModel = signal({
    username: '',
    email: '',
    password: '',
  });

  registerForm = form(
    this.registerModel,
    (schemaPath) => {
      disabled(schemaPath, (ctx) => ctx.fieldTree().submitting());
      required(schemaPath.username, { message: this.errorMessages['username']['required'] });
      maxLength(schemaPath.username, Register.MAX_FIELD_LENGTH, {
        message: this.errorMessages['username']['maxlength'],
      });
      required(schemaPath.email, { message: this.errorMessages['email']['required'] });
      email(schemaPath.email, { message: this.errorMessages['email']['invalid'] });
      maxLength(schemaPath.email, Register.MAX_FIELD_LENGTH, {
        message: this.errorMessages['email']['maxlength'],
      });
      required(schemaPath.password, { message: this.errorMessages['password']['required'] });
      minLength(schemaPath.password, Register.MIN_PASSWORD_LENGTH, {
        message: this.errorMessages['password']['minlength'],
      });
      maxLength(schemaPath.password, Register.MAX_PASSWORD_BYTES, {
        message: this.errorMessages['password']['maxlength'],
      });
      validate(schemaPath.password, (ctx) =>
        new TextEncoder().encode(ctx.value()).length > Register.MAX_PASSWORD_BYTES
          ? { kind: 'maxBytes', message: this.errorMessages['password']['maxbytes'] }
          : undefined,
      );
    },
    {
      submission: {
        action: async (field) => {
          const error = await this.authService.register(this.registerModel());
          if (!error) {
            await this.router.navigate(['register', 'success']);
            return;
          }

          return error.conflictingFields.map((f) => ({
            kind: 'duplicate',
            message: this.errorMessages[f]['duplicate'],
            fieldTree: field[f as keyof typeof field] as never,
          }));
        },
      },
    },
  );
}
