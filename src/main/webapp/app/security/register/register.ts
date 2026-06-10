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
  required,
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
      maxlength: `Darf höchstens ${Register.MAX_FIELD_LENGTH} Zeichen lang sein`,
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
      maxLength(schemaPath.password, Register.MAX_FIELD_LENGTH, {
        message: this.errorMessages['password']['maxlength'],
      });
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
