import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { Mocked, MockInstance } from 'vitest';
import { AuthService } from './security/auth.service';
import { LayoutService } from './utility/layout.service';
import { PendingRequestsService } from './utility/pending-requests.service';
import { App } from './app';

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let authServiceSpy: Mocked<Pick<AuthService, 'logout'>> & {
    isLoggedIn: WritableSignal<boolean>;
    isAdmin: WritableSignal<boolean>;
  };
  let isCompact: WritableSignal<boolean>;
  let activityVisible: WritableSignal<boolean>;
  let navigateSpy: MockInstance;

  beforeEach(async () => {
    authServiceSpy = { isLoggedIn: signal(false), isAdmin: signal(false), logout: vi.fn() };
    isCompact = signal(false);
    activityVisible = signal(false);

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: LayoutService, useValue: { isCompact } },
        { provide: PendingRequestsService, useValue: { visible: activityVisible } },
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
