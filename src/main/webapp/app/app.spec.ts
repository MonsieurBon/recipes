import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { Mocked, MockInstance } from 'vitest';
import { AuthService } from './security/auth.service';
import { App } from './app';

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let authServiceSpy: Mocked<Pick<AuthService, 'logout'>> & {
    isLoggedIn: WritableSignal<boolean>;
    isAdmin: WritableSignal<boolean>;
  };
  let navigateSpy: MockInstance;

  beforeEach(async () => {
    authServiceSpy = { isLoggedIn: signal(false), isAdmin: signal(false), logout: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceSpy }],
    }).compileComponents();

    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(App);
    await fixture.whenStable();
  });

  const openUserMenu = async () => {
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-test-id="profileIcon"]',
    );
    trigger.click();
    await fixture.whenStable();
  };

  // Menu items render in the CDK overlay, outside the component's own DOM.
  const menuItem = (testId: string) =>
    document.querySelector<HTMLButtonElement>(`[data-test-id="${testId}"]`);

  it('should render the navbar', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled).toBeTruthy();
  });

  it('offers register and login but no logout while logged out', async () => {
    await openUserMenu();

    expect(menuItem('register')).toBeTruthy();
    expect(menuItem('login')).toBeTruthy();
    expect(menuItem('logout')).toBeNull();
  });

  it('offers logout but neither register nor login while logged in', async () => {
    authServiceSpy.isLoggedIn.set(true);

    await openUserMenu();

    expect(menuItem('logout')).toBeTruthy();
    expect(menuItem('register')).toBeNull();
    expect(menuItem('login')).toBeNull();
  });

  const adminLink = () =>
    fixture.nativeElement.querySelector('[data-test-id="adminLink"]') as HTMLAnchorElement | null;

  it('hides the admin link from non-admins', () => {
    authServiceSpy.isAdmin.set(false);
    fixture.detectChanges();

    expect(adminLink()).toBeNull();
  });

  it('shows the admin link to admins', () => {
    authServiceSpy.isAdmin.set(true);
    fixture.detectChanges();

    const link = adminLink();
    expect(link).toBeTruthy();
    expect(link!.getAttribute('href')).toContain('admin');
  });

  it('logs out via the user menu and routes to the login page', async () => {
    authServiceSpy.logout.mockResolvedValue(true);
    authServiceSpy.isLoggedIn.set(true);
    await openUserMenu();

    menuItem('logout')!.click();
    await fixture.whenStable();

    expect(authServiceSpy.logout).toHaveBeenCalledOnce();
    expect(navigateSpy).toHaveBeenCalledExactlyOnceWith(['login']);
  });

  it('routes to the logout-failed page when the backend cannot confirm the logout', async () => {
    authServiceSpy.logout.mockResolvedValue(false);
    authServiceSpy.isLoggedIn.set(true);
    await openUserMenu();

    menuItem('logout')!.click();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledExactlyOnceWith(['logout-failed']);
  });
});
