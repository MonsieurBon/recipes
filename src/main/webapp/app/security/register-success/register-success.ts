import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-register-success',
  imports: [
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatButton,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './register-success.html',
  styleUrl: './register-success.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterSuccess {}
