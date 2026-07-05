import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { LayoutService } from '../../utility/layout.service';
import { AdminService } from '../admin.service';
import { AdminUsers } from './admin-users';

describe('AdminUsers', () => {
  let fixture: ComponentFixture<AdminUsers>;
  let isCompact: WritableSignal<boolean>;

  beforeEach(async () => {
    isCompact = signal(false);

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
        { provide: LayoutService, useValue: { isCompact } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUsers);
    await fixture.whenStable();
  });

  const tags = (row: HTMLElement) =>
    Array.from(row.querySelectorAll('.tag')).map((tag) => tag.textContent!.trim());

  it('renders one table row per user with username, email and role tags on larger viewports', () => {
    const rows: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('tr[mat-row]');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('alice');
    expect(rows[0].textContent).toContain('alice@example.com');
    expect(tags(rows[0])).toEqual(['User', 'Admin']);
    expect(rows[1].textContent).toContain('bob');
    expect(rows[1].textContent).toContain('bob@example.com');
    expect(tags(rows[1])).toEqual(['User']);

    expect(fixture.nativeElement.querySelector('[data-test-id="userRows"]')).toBeNull();
  });

  it('renders one list row per user with avatar, username, email and role tags on compact viewports', async () => {
    isCompact.set(true);
    await fixture.whenStable();

    const rows: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll(
      '[data-test-id="userRows"] li',
    );
    expect(rows.length).toBe(2);
    expect(rows[0].querySelector('.avatar')!.textContent!.trim()).toBe('A');
    expect(rows[0].textContent).toContain('alice');
    expect(rows[0].textContent).toContain('alice@example.com');
    expect(tags(rows[0])).toEqual(['User', 'Admin']);
    expect(rows[1].querySelector('.avatar')!.textContent!.trim()).toBe('B');
    expect(rows[1].textContent).toContain('bob');
    expect(rows[1].textContent).toContain('bob@example.com');
    expect(tags(rows[1])).toEqual(['User']);

    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });
});
