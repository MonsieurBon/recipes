import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideTranslateTesting } from '../../testing/provide-translate-testing';
import { RegisterSuccess } from './register-success';

describe('RegisterSuccess', () => {
  let fixture: ComponentFixture<RegisterSuccess>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterSuccess],
      providers: [provideRouter([]), provideTranslateTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterSuccess);
    await fixture.whenStable();
  });

  it('should show a success message', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Registrierung erfolgreich');
  });

  it('should contain a link to the login page', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a[href="/login"]');
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Login');
  });
});
