import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Mocked, MockInstance } from 'vitest';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { AuthService } from '../auth.service';

import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let authServiceSpy: Mocked<Pick<AuthService, 'login'>>;
  let navigateByUrlSpy: MockInstance;
  let returnUrl: string | null;

  beforeEach(async () => {
    authServiceSpy = { login: vi.fn() };
    returnUrl = null;

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => returnUrl } } },
        },
      ],
    }).compileComponents();

    navigateByUrlSpy = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should require both fields', () => {
    const form = component.loginForm;
    expect(form.usernameOrEmail().errors().length).toBeGreaterThan(0);
    expect(form.password().errors().length).toBeGreaterThan(0);
  });

  it('caps both fields at 256 characters in the DOM, mirroring the backend', () => {
    const inputs: HTMLInputElement[] = Array.from(fixture.nativeElement.querySelectorAll('input'));
    expect(inputs.length).toBe(2);
    inputs.forEach((input) => expect(input.maxLength).toBe(256));
  });

  it('rejects a value over 256 characters set through the model, not just typed', () => {
    component.loginModel.set({ usernameOrEmail: 'a'.repeat(257), password: 'b'.repeat(257) });
    TestBed.flushEffects();

    expect(component.loginForm.usernameOrEmail().errors().length).toBeGreaterThan(0);
    expect(component.loginForm.password().errors().length).toBeGreaterThan(0);
    expect(component.loginForm().valid()).toBe(false);
  });

  it('should be valid when both fields are filled', () => {
    component.loginModel.set({ usernameOrEmail: 'alice', password: 'pw' });
    TestBed.flushEffects();
    expect(component.loginForm().valid()).toBe(true);
  });

  it('should show error messages for empty required fields', () => {
    component.loginForm.usernameOrEmail().markAsTouched();
    component.loginForm.password().markAsTouched();
    fixture.detectChanges();

    const errorElements = fixture.nativeElement.querySelectorAll('mat-error');
    expect(errorElements.length).toBe(2);
    expect(errorElements[0].textContent).toContain('Benutzername oder Email ist erforderlich');
    expect(errorElements[1].textContent).toContain('Passwort ist erforderlich');
  });

  it('should submit credentials to the auth service', async () => {
    authServiceSpy.login.mockResolvedValue(true);

    component.loginModel.set({ usernameOrEmail: 'alice', password: 'pw' });
    TestBed.flushEffects();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button[type="submit"]').click();
    await new Promise((r) => setTimeout(r));
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(authServiceSpy.login).toHaveBeenCalledWith({ usernameOrEmail: 'alice', password: 'pw' });
    expect(navigateByUrlSpy).toHaveBeenCalledExactlyOnceWith('/');
    expect(fixture.nativeElement.querySelector('[data-test-id="loginError"]')).toBeNull();
  });

  it('navigates to the captured returnUrl after a successful login', async () => {
    returnUrl = '/admin/users';
    authServiceSpy.login.mockResolvedValue(true);

    component.loginModel.set({ usernameOrEmail: 'alice', password: 'pw' });
    TestBed.flushEffects();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button[type="submit"]').click();
    await new Promise((r) => setTimeout(r));

    expect(navigateByUrlSpy).toHaveBeenCalledExactlyOnceWith('/admin/users');
  });

  it.each([
    ['an absolute URL', 'https://evil.example/phish'],
    ['a protocol-relative URL', '//evil.example/phish'],
    ['a backslash-obscured URL', '/\\evil.example/phish'],
  ])('ignores an off-site returnUrl (%s) and falls back to home', async (_label, value) => {
    returnUrl = value;
    authServiceSpy.login.mockResolvedValue(true);

    component.loginModel.set({ usernameOrEmail: 'alice', password: 'pw' });
    TestBed.flushEffects();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button[type="submit"]').click();
    await new Promise((r) => setTimeout(r));

    expect(navigateByUrlSpy).toHaveBeenCalledExactlyOnceWith('/');
  });

  it('links to the registration page', () => {
    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector(
      '[data-test-id="registerLink"]',
    );

    expect(link).toBeTruthy();
    expect(link!.getAttribute('href')).toContain('register');
  });

  it('should show an error message when credentials are rejected', async () => {
    authServiceSpy.login.mockResolvedValue(false);

    component.loginModel.set({ usernameOrEmail: 'alice', password: 'wrong' });
    TestBed.flushEffects();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button[type="submit"]').click();
    await new Promise((r) => setTimeout(r));
    TestBed.flushEffects();
    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector('[data-test-id="loginError"]');
    expect(error).toBeTruthy();
    expect(error.textContent).toContain('Ungültige Anmeldedaten');
    expect(navigateByUrlSpy).not.toHaveBeenCalled();
  });

  it('should hide the rejected-credentials error once the user edits a field', async () => {
    authServiceSpy.login.mockResolvedValue(false);

    component.loginModel.set({ usernameOrEmail: 'alice', password: 'wrong' });
    TestBed.flushEffects();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button[type="submit"]').click();
    await new Promise((r) => setTimeout(r));
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-test-id="loginError"]')).toBeTruthy();

    // The user starts correcting their password.
    component.loginModel.set({ usernameOrEmail: 'alice', password: 'corrected' });
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-test-id="loginError"]')).toBeNull();
  });

  it('should disable fields and button and show spinner during submission', async () => {
    let resolveLogin!: () => void;
    authServiceSpy.login.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveLogin = () => resolve(true);
      }),
    );

    component.loginModel.set({ usernameOrEmail: 'alice', password: 'pw' });
    TestBed.flushEffects();
    fixture.detectChanges();

    const submitButton: HTMLButtonElement =
      fixture.nativeElement.querySelector('button[type="submit"]');
    submitButton.click();
    fixture.detectChanges();

    const inputs = fixture.nativeElement.querySelectorAll('input');
    inputs.forEach((input: HTMLInputElement) => {
      expect(input.disabled).toBe(true);
    });
    expect(submitButton.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('mat-spinner')).toBeTruthy();

    resolveLogin();
    await new Promise((r) => setTimeout(r));
    TestBed.flushEffects();
    fixture.detectChanges();

    inputs.forEach((input: HTMLInputElement) => {
      expect(input.disabled).toBe(false);
    });
    expect(submitButton.disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('mat-spinner')).toBeNull();
  });
});
