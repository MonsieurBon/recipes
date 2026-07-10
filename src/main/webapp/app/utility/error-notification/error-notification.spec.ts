import { TestBed } from '@angular/core/testing';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { Mock } from 'vitest';

import { provideTranslateTesting } from '../../testing/provide-translate-testing';
import { ErrorNotification } from './error-notification';

describe('ErrorNotification', () => {
  let dismiss: Mock;

  function createComponent(message = 'Etwas ist schiefgelaufen. Bitte versuche es erneut.') {
    dismiss = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideTranslateTesting(),
        { provide: MatSnackBarRef, useValue: { dismiss } },
        { provide: MAT_SNACK_BAR_DATA, useValue: { message } },
      ],
    });
    const fixture = TestBed.createComponent(ErrorNotification);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the message from the injected data via text binding', () => {
    const fixture = createComponent('Boom');

    expect(fixture.nativeElement.textContent).toContain('Boom');
  });

  it('labels the close button so screen readers announce it', () => {
    const fixture = createComponent();

    const closeButton: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(closeButton.getAttribute('aria-label')).toBe('Schliessen');
  });

  it('dismisses the snackbar when the close button is clicked', () => {
    const fixture = createComponent();

    fixture.nativeElement.querySelector('button').click();

    expect(dismiss).toHaveBeenCalledOnce();
  });
});
