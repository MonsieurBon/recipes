import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { Mock } from 'vitest';

import { AuthService } from '../security/auth.service';
import { ErrorNotification } from './error-notification/error-notification';
import { LayoutService } from './layout.service';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let snackBar: { openFromComponent: Mock };
  const isCompact = signal(false);
  const isLoggedIn = signal(true);

  function createService(): NotificationService {
    snackBar = { openFromComponent: vi.fn() };
    isCompact.set(false);
    isLoggedIn.set(true);
    TestBed.configureTestingModule({
      providers: [
        { provide: MatSnackBar, useValue: snackBar },
        { provide: LayoutService, useValue: { isCompact } },
        { provide: AuthService, useValue: { isLoggedIn } },
      ],
    });
    return TestBed.inject(NotificationService);
  }

  function lastConfig(): MatSnackBarConfig {
    return snackBar.openFromComponent.mock.calls[0][1] as MatSnackBarConfig;
  }

  it('opens the error content component with the fixed generic German message', () => {
    createService().showGenericError();

    expect(snackBar.openFromComponent).toHaveBeenCalledOnce();
    expect(snackBar.openFromComponent.mock.calls[0][0]).toBe(ErrorNotification);
    expect(lastConfig().data).toEqual({
      message: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',
    });
  });

  it('auto-dismisses after about six seconds', () => {
    createService().showGenericError();

    expect(lastConfig().duration).toBe(6000);
  });

  it('does not offset the snackbar on non-compact layouts', () => {
    createService().showGenericError();

    expect(lastConfig().panelClass).toEqual([]);
  });

  it('lifts the snackbar above the bottom nav when compact and logged in', () => {
    const service = createService();
    isCompact.set(true);
    isLoggedIn.set(true);

    service.showGenericError();

    expect(lastConfig().panelClass).toEqual(['notification-above-bottom-nav']);
  });

  it('does not offset the snackbar when compact but logged out (no bottom nav)', () => {
    const service = createService();
    isCompact.set(true);
    isLoggedIn.set(false);

    service.showGenericError();

    expect(lastConfig().panelClass).toEqual([]);
  });
});
