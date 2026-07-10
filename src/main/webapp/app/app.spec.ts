import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { Mocked, MockInstance } from 'vitest';
import { AuthService } from './security/auth.service';
import { LayoutService } from './utility/layout.service';
import { PendingRequestsService } from './utility/pending-requests.service';
import { LanguagePickerService } from './i18n/language-picker.service';
import { provideTranslateTesting } from './testing/provide-translate-testing';
import { App } from './app';

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let authServiceSpy: Mocked<Pick<AuthService, 'logout'>> & {
    isLoggedIn: WritableSignal<boolean>;
    isAdmin: WritableSignal<boolean>;
    profileLanguage: WritableSignal<string | null>;
  };
  let isCompact: WritableSignal<boolean>;
  let activityVisible: WritableSignal<boolean>;
  let navigateSpy: MockInstance;
  let pickerSpy: Mocked<Pick<LanguagePickerService, 'openSheet'>>;

  beforeEach(async () => {
    authServiceSpy = {
      isLoggedIn: signal(false),
      isAdmin: signal(false),
      profileLanguage: signal<string | null>(null),
      logout: vi.fn(),
    };
    isCompact = signal(false);
    activityVisible = signal(false);
    pickerSpy = { openSheet: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideTranslateTesting(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: LayoutService, useValue: { isCompact } },
        { provide: PendingRequestsService, useValue: { visible: activityVisible } },
        { provide: LanguagePickerService, useValue: pickerSpy },
      ],
    }).compileComponents();

    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(App);
    await fixture.whenStable();
  });

  const query = (testId: string) =>
    fixture.nativeElement.querySelector(`[data-test-id="${testId}"]`) as HTMLElement | null;

  const openAccountMenu = async () => {
    query('accountMenuTrigger')!.click();
    await fixture.whenStable();
  };

  // Menu items render in the CDK overlay, outside the component's own DOM.
  const menuItem = (testId: string) =>
    document.querySelector<HTMLElement>(`[data-test-id="${testId}"]`);

  it('should render the navbar', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled).toBeTruthy();
  });

  it('shows the activity bar only while requests are in flight', async () => {
    expect(query('activityBar')).toBeNull();

    activityVisible.set(true);
    await fixture.whenStable();
    expect(query('activityBar')).toBeTruthy();

    activityVisible.set(false);
    await fixture.whenStable();
    expect(query('activityBar')).toBeNull();
  });

  it('offers only a login action while signed out', () => {
    const loginAction = query('loginAction');
    expect(loginAction).toBeTruthy();
    expect(loginAction!.getAttribute('href')).toContain('login');
    expect(query('accountMenuTrigger')).toBeNull();
  });

  it('opens the language picker from the signed-out globe on a compact viewport', async () => {
    isCompact.set(true);
    await fixture.whenStable();

    const globe = query('languageGlobe');
    expect(globe).toBeTruthy();

    globe!.click();
    expect(pickerSpy.openSheet).toHaveBeenCalledOnce();
  });

  it('offers the language globe next to login on larger viewports', async () => {
    await fixture.whenStable();

    expect(query('languageGlobe')).toBeTruthy();
    expect(query('loginAction')).toBeTruthy();
  });

  it('keeps the language globe out of the signed-in toolbar', async () => {
    authServiceSpy.isLoggedIn.set(true);
    await fixture.whenStable();

    expect(query('languageGlobe')).toBeNull();
  });

  it('offers a language entry inside the account menu showing the current language', async () => {
    authServiceSpy.isLoggedIn.set(true);
    await fixture.whenStable();
    await openAccountMenu();

    const entry = menuItem('accountMenuLanguage');
    expect(entry).toBeTruthy();
    expect(entry!.textContent).toContain('Deutsch');
  });

  it('keeps the top-right corner empty for a signed-in user on a compact viewport', async () => {
    authServiceSpy.isLoggedIn.set(true);
    isCompact.set(true);
    await fixture.whenStable();

    expect(query('loginAction')).toBeNull();
    expect(query('accountMenuTrigger')).toBeNull();
  });

  it('shows the account menu for a signed-in user on larger viewports', async () => {
    authServiceSpy.isLoggedIn.set(true);
    await fixture.whenStable();

    expect(query('loginAction')).toBeNull();
    expect(query('accountMenuTrigger')).toBeTruthy();
  });

  it('hides the administration entry from non-admins', async () => {
    authServiceSpy.isLoggedIn.set(true);
    await fixture.whenStable();
    await openAccountMenu();

    expect(menuItem('accountMenuLogout')).toBeTruthy();
    expect(menuItem('accountMenuAdmin')).toBeNull();
  });

  it('offers the administration entry to admins', async () => {
    authServiceSpy.isLoggedIn.set(true);
    authServiceSpy.isAdmin.set(true);
    await fixture.whenStable();
    await openAccountMenu();

    const adminEntry = menuItem('accountMenuAdmin');
    expect(adminEntry).toBeTruthy();
    expect(adminEntry!.getAttribute('href')).toContain('admin');
  });

  const bottomNav = () => fixture.nativeElement.querySelector('app-bottom-nav');

  it('shows the bottom nav to a signed-in user on a compact viewport', async () => {
    authServiceSpy.isLoggedIn.set(true);
    isCompact.set(true);
    await fixture.whenStable();

    expect(bottomNav()).toBeTruthy();
  });

  it('hides the bottom nav while signed out', async () => {
    isCompact.set(true);
    await fixture.whenStable();

    expect(bottomNav()).toBeNull();
  });

  it('hides the bottom nav on larger viewports', async () => {
    authServiceSpy.isLoggedIn.set(true);
    isCompact.set(false);
    await fixture.whenStable();

    expect(bottomNav()).toBeNull();
  });

  it('logs out via the account menu and routes to the login page', async () => {
    authServiceSpy.logout.mockResolvedValue(true);
    authServiceSpy.isLoggedIn.set(true);
    await fixture.whenStable();
    await openAccountMenu();

    menuItem('accountMenuLogout')!.click();
    await fixture.whenStable();

    expect(authServiceSpy.logout).toHaveBeenCalledOnce();
    expect(navigateSpy).toHaveBeenCalledExactlyOnceWith(['login']);
  });

  it('routes to the logout-failed page when the backend cannot confirm the logout', async () => {
    authServiceSpy.logout.mockResolvedValue(false);
    authServiceSpy.isLoggedIn.set(true);
    await fixture.whenStable();
    await openAccountMenu();

    menuItem('accountMenuLogout')!.click();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledExactlyOnceWith(['logout-failed']);
  });
});
