import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Mocked } from 'vitest';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

import { Register } from './register';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let authServiceSpy: Mocked<Pick<AuthService, 'register'>>;
  let routerSpy: Mocked<Pick<Router, 'navigate'>>;

  beforeEach(async () => {
    authServiceSpy = { register: vi.fn() };
    routerSpy = { navigate: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should require all fields', () => {
    const form = component.registerForm;
    expect(form.username().errors().length).toBeGreaterThan(0);
    expect(form.email().errors().length).toBeGreaterThan(0);
    expect(form.password().errors().length).toBeGreaterThan(0);
  });

  it('should validate email format', () => {
    component.registerModel.set({
      username: 'user',
      email: 'not-an-email',
      password: 'long-enough-pw',
    });
    TestBed.flushEffects();
    expect(component.registerForm.email().errors().length).toBeGreaterThan(0);

    component.registerModel.set({
      username: 'user',
      email: 'user@example.com',
      password: 'long-enough-pw',
    });
    TestBed.flushEffects();
    expect(component.registerForm.email().errors().length).toBe(0);
  });

  it('caps every field in the DOM, mirroring the backend limits', () => {
    // Signal forms emit a generated name like "ng.form0.username"; match the stable leaf suffix so
    // the assertion targets each field explicitly rather than relying on DOM order.
    const field = (name: string): HTMLInputElement =>
      fixture.nativeElement.querySelector(`input[name$=".${name}"]`);

    expect(field('username').maxLength).toBe(255);
    expect(field('email').maxLength).toBe(255);
    expect(field('password').maxLength).toBe(72);
  });

  it('rejects values over 255 characters with a maxlength error set through the model', () => {
    component.registerModel.set({
      username: 'a'.repeat(256),
      email: 'a'.repeat(249) + '@ex.com',
      password: 'b'.repeat(256),
    });
    TestBed.flushEffects();

    const maxLengthFired = (errors: { kind: string }[]): boolean =>
      errors.some((e) => e.kind === 'maxLength');

    expect(maxLengthFired(component.registerForm.username().errors())).toBe(true);
    expect(maxLengthFired(component.registerForm.email().errors())).toBe(true);
    expect(maxLengthFired(component.registerForm.password().errors())).toBe(true);
    expect(component.registerForm().valid()).toBe(false);
  });

  it('rejects a password under 12 characters with a minlength error set through the model', () => {
    component.registerModel.set({
      username: 'user',
      email: 'user@example.com',
      password: 'a'.repeat(11),
    });
    TestBed.flushEffects();

    const errors = component.registerForm.password().errors();
    expect(errors.some((e) => e.kind === 'minLength')).toBe(true);
    expect(component.registerForm().valid()).toBe(false);
  });

  it('rejects a password over 72 UTF-8 bytes even when under 72 characters', () => {
    component.registerModel.set({
      username: 'user',
      email: 'user@example.com',
      // 37 characters — passes the length checks — but exactly one byte over the 72-byte ceiling
      password: 'ä'.repeat(36) + 'a',
    });
    TestBed.flushEffects();

    const errors = component.registerForm.password().errors();
    expect(errors.some((e) => e.kind === 'maxBytes')).toBe(true);
    expect(component.registerForm().valid()).toBe(false);
  });

  it('accepts a password of exactly 72 UTF-8 bytes', () => {
    component.registerModel.set({
      username: 'user',
      email: 'user@example.com',
      // 36 characters at 2 bytes each — exactly the 72-byte BCrypt ceiling
      password: 'ä'.repeat(36),
    });
    TestBed.flushEffects();

    expect(component.registerForm.password().errors()).toEqual([]);
    expect(component.registerForm().valid()).toBe(true);
  });

  it('should be valid when all fields are filled with valid data', () => {
    component.registerModel.set({
      username: 'user',
      email: 'user@example.com',
      password: 'long-enough-pw',
    });
    TestBed.flushEffects();
    expect(component.registerForm().valid()).toBe(true);
  });

  it('should show error messages for empty required fields', () => {
    component.registerForm.username().markAsTouched();
    component.registerForm.email().markAsTouched();
    component.registerForm.password().markAsTouched();
    fixture.detectChanges();

    const errorElements = fixture.nativeElement.querySelectorAll('mat-error');
    expect(errorElements.length).toBe(3);
    expect(errorElements[0].textContent).toContain('Benutzername ist erforderlich');
    expect(errorElements[1].textContent).toContain('Email ist erforderlich');
    expect(errorElements[2].textContent).toContain('Passwort ist erforderlich');
  });

  it('should show email format error when email is invalid', () => {
    component.registerModel.set({
      username: 'user',
      email: 'not-an-email',
      password: 'long-enough-pw',
    });
    component.registerForm.email().markAsTouched();
    TestBed.flushEffects();
    fixture.detectChanges();

    const errorElements = fixture.nativeElement.querySelectorAll('mat-error');
    expect(errorElements.length).toBe(1);
    expect(errorElements[0].textContent).toContain('Email ist ungültig');
  });

  it('should disable form fields and button and show spinner during submission', async () => {
    let resolveRegister!: () => void;
    authServiceSpy.register.mockReturnValue(
      new Promise((resolve) => {
        resolveRegister = () => resolve(null);
      }),
    );

    component.registerModel.set({
      username: 'user',
      email: 'user@example.com',
      password: 'long-enough-pw',
    });
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

    resolveRegister();
    await new Promise((r) => setTimeout(r));
    TestBed.flushEffects();
    fixture.detectChanges();

    inputs.forEach((input: HTMLInputElement) => {
      expect(input.disabled).toBe(false);
    });
    expect(submitButton.disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('mat-spinner')).toBeNull();
  });

  it('should show duplicate username error from server', async () => {
    authServiceSpy.register.mockResolvedValue({
      conflictingFields: ['username'],
    });

    component.registerModel.set({
      username: 'taken',
      email: 'user@example.com',
      password: 'long-enough-pw',
    });
    TestBed.flushEffects();
    fixture.detectChanges();

    const submitButton: HTMLButtonElement =
      fixture.nativeElement.querySelector('button[type="submit"]');
    submitButton.click();
    await new Promise((r) => setTimeout(r));
    TestBed.flushEffects();
    fixture.detectChanges();

    const errorElements = fixture.nativeElement.querySelectorAll('mat-error');
    expect(errorElements.length).toBe(1);
    expect(errorElements[0].textContent).toContain('Benutzername ist bereits vergeben');
  });

  it('should show duplicate email error from server', async () => {
    authServiceSpy.register.mockResolvedValue({
      conflictingFields: ['email'],
    });

    component.registerModel.set({
      username: 'user',
      email: 'taken@example.com',
      password: 'long-enough-pw',
    });
    TestBed.flushEffects();
    fixture.detectChanges();

    const submitButton: HTMLButtonElement =
      fixture.nativeElement.querySelector('button[type="submit"]');
    submitButton.click();
    await new Promise((r) => setTimeout(r));
    TestBed.flushEffects();
    fixture.detectChanges();

    const errorElements = fixture.nativeElement.querySelectorAll('mat-error');
    expect(errorElements.length).toBe(1);
    expect(errorElements[0].textContent).toContain('Email ist bereits vergeben');
  });

  it('navigates to the success page on successful registration', async () => {
    authServiceSpy.register.mockResolvedValue(null);

    component.registerModel.set({
      username: 'user',
      email: 'user@example.com',
      password: 'long-enough-pw',
    });
    TestBed.flushEffects();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button[type="submit"]').click();
    await new Promise((r) => setTimeout(r));
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(authServiceSpy.register).toHaveBeenCalledWith({
      username: 'user',
      email: 'user@example.com',
      password: 'long-enough-pw',
    });
    expect(routerSpy.navigate).toHaveBeenCalledExactlyOnceWith(['register', 'success']);
    expect(fixture.nativeElement.querySelectorAll('mat-error').length).toBe(0);
  });

  it('should hide error messages when fields become valid', () => {
    component.registerForm.username().markAsTouched();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('mat-error').length).toBe(1);

    component.registerModel.set({ username: 'user', email: '', password: '' });
    TestBed.flushEffects();
    fixture.detectChanges();
    const usernameErrors = fixture.nativeElement.querySelector(
      'mat-form-field:first-of-type mat-error',
    );
    expect(usernameErrors).toBeNull();
  });
});
