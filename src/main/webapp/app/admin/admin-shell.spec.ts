import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MockInstance } from 'vitest';

import { LayoutService } from '../utility/layout.service';
import { provideTranslateTesting } from '../testing/provide-translate-testing';
import { AdminShell } from './admin-shell';

describe('AdminShell', () => {
  let fixture: ComponentFixture<AdminShell>;
  let isCompact: WritableSignal<boolean>;
  let navigateSpy: MockInstance;

  beforeEach(async () => {
    isCompact = signal(true);

    await TestBed.configureTestingModule({
      imports: [AdminShell],
      providers: [
        provideRouter([]),
        provideTranslateTesting(),
        { provide: LayoutService, useValue: { isCompact } },
      ],
    }).compileComponents();

    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(AdminShell);
    await fixture.whenStable();
  });

  const back = () =>
    fixture.nativeElement.querySelector('[data-test-id="adminBack"]') as HTMLButtonElement | null;

  it('offers the users page as a tab', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector(
      '[data-test-id="adminTabUsers"]',
    );
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toContain('users');
    expect(link.textContent).toContain('Benutzer');
  });

  it('labels the tab navigation for assistive technology', () => {
    const nav: HTMLElement = fixture.nativeElement.querySelector('nav[mat-tab-nav-bar]');
    expect(nav.getAttribute('aria-label')).toBe('Administrationsbereiche');
  });

  it('returns to the Konto page via the back control on compact viewports', () => {
    back()!.click();

    expect(navigateSpy).toHaveBeenCalledExactlyOnceWith(['/konto']);
  });

  it('hides the back control on larger viewports', async () => {
    isCompact.set(false);
    await fixture.whenStable();

    expect(back()).toBeNull();
  });

  it('renders an outlet for the child pages', () => {
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });
});
