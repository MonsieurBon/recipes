import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AdminShell } from './admin-shell';

describe('AdminShell', () => {
  let fixture: ComponentFixture<AdminShell>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminShell],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminShell);
    await fixture.whenStable();
  });

  it('links to the users page', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector(
      '[data-test-id="adminNavUsers"]',
    );
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toContain('users');
    expect(link.textContent).toContain('Benutzer');
  });

  it('renders an outlet for the child pages', () => {
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });
});
