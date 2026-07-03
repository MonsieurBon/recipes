import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminService } from '../admin.service';
import { AdminUsers } from './admin-users';

describe('AdminUsers', () => {
  let fixture: ComponentFixture<AdminUsers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminUsers],
      providers: [
        {
          provide: AdminService,
          useValue: {
            getUsers: () =>
              of([
                { id: 1, username: 'alice', email: 'alice@example.com', roles: ['USER', 'ADMIN'] },
                { id: 2, username: 'bob', email: 'bob@example.com', roles: ['USER'] },
              ]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUsers);
    await fixture.whenStable();
  });

  it('shows the users heading', () => {
    const heading: HTMLElement = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent).toContain('Benutzer');
  });

  it('renders one table row per user with username, email and roles', () => {
    const rows: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('tr[mat-row]');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('alice');
    expect(rows[0].textContent).toContain('alice@example.com');
    expect(rows[0].textContent).toContain('USER, ADMIN');
    expect(rows[1].textContent).toContain('bob');
    expect(rows[1].textContent).toContain('bob@example.com');
    expect(rows[1].textContent).toContain('USER');
  });
});
