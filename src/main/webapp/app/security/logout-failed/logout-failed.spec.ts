import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Mocked } from 'vitest';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

import { LogoutFailed } from './logout-failed';

describe('LogoutFailed', () => {
  let fixture: ComponentFixture<LogoutFailed>;
  let authServiceSpy: Mocked<Pick<AuthService, 'logout'>>;
  let routerSpy: Mocked<Pick<Router, 'navigate'>>;

  beforeEach(async () => {
    authServiceSpy = { logout: vi.fn() };
    routerSpy = { navigate: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [LogoutFailed],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LogoutFailed);
    await fixture.whenStable();
  });

  it('explains the failed logout and how to clear the cookies', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Logout fehlgeschlagen');
    expect(text).toContain('Cookies');
  });

  it('retries the logout and routes to the login page on success', async () => {
    authServiceSpy.logout.mockResolvedValue(true);

    fixture.nativeElement.querySelector('[data-test-id="retryLogout"]').click();
    await fixture.whenStable();

    expect(authServiceSpy.logout).toHaveBeenCalledOnce();
    expect(routerSpy.navigate).toHaveBeenCalledExactlyOnceWith(['login']);
  });

  it('stays on the page and shows a hint when the retry fails again', async () => {
    authServiceSpy.logout.mockResolvedValue(false);
    expect(fixture.nativeElement.querySelector('[data-test-id="retryFailed"]')).toBeNull();

    fixture.nativeElement.querySelector('[data-test-id="retryLogout"]').click();
    await fixture.whenStable();

    expect(authServiceSpy.logout).toHaveBeenCalledOnce();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[data-test-id="retryFailed"]')).toBeTruthy();
  });

  it('does not show the failure hint when the retry succeeds', async () => {
    authServiceSpy.logout.mockResolvedValue(true);

    fixture.nativeElement.querySelector('[data-test-id="retryLogout"]').click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[data-test-id="retryFailed"]')).toBeNull();
  });

  it('disables the retry button while the logout call is in flight', async () => {
    let resolveLogout!: (confirmed: boolean) => void;
    authServiceSpy.logout.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveLogout = resolve;
      }),
    );

    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-test-id="retryLogout"]',
    );
    button.click();
    await fixture.whenStable();

    expect(button.disabled).toBe(true);

    resolveLogout(false);
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();

    expect(button.disabled).toBe(false);
  });
});
