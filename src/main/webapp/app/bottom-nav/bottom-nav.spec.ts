import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BottomNav } from './bottom-nav';

describe('BottomNav', () => {
  let fixture: ComponentFixture<BottomNav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomNav],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomNav);
    await fixture.whenStable();
  });

  it('offers the Konto section', () => {
    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector(
      '[data-test-id="bottomNavKonto"]',
    );

    expect(link).toBeTruthy();
    expect(link!.getAttribute('href')).toContain('konto');
    expect(link!.textContent).toContain('Konto');
  });
});
