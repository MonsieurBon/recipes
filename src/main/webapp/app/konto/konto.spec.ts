import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { Mocked, MockInstance } from 'vitest';
import { AuthService, CurrentUser } from '../security/auth.service';
import { LanguagePickerService } from '../i18n/language-picker.service';
import { provideTranslateTesting } from '../testing/provide-translate-testing';
import { Konto } from './konto';

describe('Konto', () => {
  let fixture: ComponentFixture<Konto>;
  let authServiceSpy: Mocked<Pick<AuthService, 'logout'>> & {
    currentUser: WritableSignal<CurrentUser | null>;
    isAdmin: WritableSignal<boolean>;
    isLoggedIn: WritableSignal<boolean>;
    profileLanguage: WritableSignal<string | null>;
  };
  let navigateSpy: MockInstance;
  let pickerSpy: Mocked<Pick<LanguagePickerService, 'openSheet'>>;

  beforeEach(async () => {
    authServiceSpy = {
      currentUser: signal<CurrentUser | null>({
        id: 42,
        username: 'alice',
        email: 'alice@example.com',
      }),
      isAdmin: signal(false),
      isLoggedIn: signal(true),
      profileLanguage: signal<string | null>(null),
      logout: vi.fn(),
    };
    pickerSpy = { openSheet: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Konto],
      providers: [
        provideRouter([]),
        provideTranslateTesting(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: LanguagePickerService, useValue: pickerSpy },
      ],
    }).compileComponents();

    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(Konto);
    await fixture.whenStable();
  });

  const query = <T extends HTMLElement>(testId: string) =>
    fixture.nativeElement.querySelector(`[data-test-id="${testId}"]`) as T | null;

  it('shows the profile header with the username and email', () => {
    expect(query('kontoUsername')!.textContent).toContain('alice');
    expect(query('kontoEmail')!.textContent).toContain('alice@example.com');
  });

  it('shows the initial of the username in the avatar', () => {
    expect(query('kontoAvatar')!.textContent!.trim()).toBe('A');
  });

  it('hides the administration entry from non-admins', () => {
    expect(query('kontoAdminEntry')).toBeNull();
  });

  it('shows the current language and opens the picker from the Sprache row', () => {
    expect(query('kontoLanguageValue')!.textContent).toContain('Deutsch');

    query('kontoLanguage')!.click();
    expect(pickerSpy.openSheet).toHaveBeenCalledOnce();
  });

  it('shows the administration entry with a badge to admins', async () => {
    authServiceSpy.isAdmin.set(true);
    await fixture.whenStable();

    const entry = query<HTMLAnchorElement>('kontoAdminEntry');
    expect(entry).toBeTruthy();
    expect(entry!.getAttribute('href')).toContain('admin');
    expect(query('kontoAdminBadge')).toBeTruthy();
  });

  it('logs out and routes to the login page', async () => {
    authServiceSpy.logout.mockResolvedValue(true);

    query('kontoLogout')!.click();
    await fixture.whenStable();

    expect(authServiceSpy.logout).toHaveBeenCalledOnce();
    expect(navigateSpy).toHaveBeenCalledExactlyOnceWith(['login']);
  });

  it('routes to the logout-failed page when the backend cannot confirm the logout', async () => {
    authServiceSpy.logout.mockResolvedValue(false);

    query('kontoLogout')!.click();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledExactlyOnceWith(['logout-failed']);
  });
});
