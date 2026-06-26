import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminUsers } from './admin-users';

describe('AdminUsers', () => {
  let fixture: ComponentFixture<AdminUsers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminUsers],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUsers);
    await fixture.whenStable();
  });

  it('shows the users heading', () => {
    const heading: HTMLElement = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent).toContain('Benutzer');
  });
});
