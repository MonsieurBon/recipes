import { ErrorHandler, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatPaginator } from '@angular/material/paginator';
import { of, throwError } from 'rxjs';
import { Mock } from 'vitest';

import { LayoutService } from '../../utility/layout.service';
import { provideTranslateTesting } from '../../testing/provide-translate-testing';
import { AdminService, UserPage } from '../admin.service';
import { AdminUsers } from './admin-users';

describe('AdminUsers', () => {
  let fixture: ComponentFixture<AdminUsers>;
  let isCompact: WritableSignal<boolean>;
  let getUsers: Mock<(page: number, size: number) => ReturnType<AdminService['getUsers']>>;
  let handleError: Mock<(error: unknown) => void>;

  const page = (
    content: UserPage['content'],
    totalElements: number,
    number: number,
    size: number,
  ): UserPage => ({ content, totalElements, number, size });

  const twoUsers = [
    { id: 1, username: 'alice', email: 'alice@example.com', roles: ['USER', 'ADMIN'] },
    { id: 2, username: 'bob', email: 'bob@example.com', roles: ['USER'] },
  ];

  beforeEach(async () => {
    isCompact = signal(false);
    handleError = vi.fn();
    // The server echoes back the page it actually served, so the mock mirrors the request.
    getUsers = vi.fn((number: number, size: number) => of(page(twoUsers, 42, number, size)));

    await TestBed.configureTestingModule({
      imports: [AdminUsers],
      providers: [
        provideTranslateTesting(),
        { provide: AdminService, useValue: { getUsers } },
        { provide: LayoutService, useValue: { isCompact } },
        { provide: ErrorHandler, useValue: { handleError } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUsers);
    await fixture.whenStable();
  });

  const tags = (row: HTMLElement) =>
    Array.from(row.querySelectorAll('.tag')).map((tag) => tag.textContent!.trim());

  const paginator = () => fixture.debugElement.query(By.directive(MatPaginator)).componentInstance;

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

  it('loads the first page on init', () => {
    expect(getUsers).toHaveBeenCalledWith(0, 10);
  });

  it('exposes the total count to the paginator', () => {
    expect(paginator().length).toBe(42);
    expect(paginator().pageSize).toBe(10);
  });

  it('re-queries the server when the page changes', async () => {
    getUsers.mockClear();

    paginator().page.emit({ pageIndex: 2, pageSize: 10, length: 42, previousPageIndex: 0 });
    await fixture.whenStable();

    expect(getUsers).toHaveBeenCalledWith(2, 10);
  });

  it('reflects the page size the server actually used, not the requested one', async () => {
    // Server caps the size below what was asked for.
    getUsers.mockImplementation((number: number) => of(page(twoUsers, 42, number, 100)));

    paginator().page.emit({ pageIndex: 0, pageSize: 200, length: 42, previousPageIndex: 0 });
    await fixture.whenStable();

    expect(paginator().pageSize).toBe(100);
  });

  it('keeps the last successfully loaded page on screen when a fetch fails', async () => {
    getUsers.mockReturnValueOnce(throwError(() => new Error('boom')));

    paginator().page.emit({ pageIndex: 1, pageSize: 10, length: 42, previousPageIndex: 0 });
    await fixture.whenStable();

    const rows: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('tr[mat-row]');
    expect(rows.length).toBe(2);
    expect(paginator().pageIndex).toBe(0);
    expect(paginator().length).toBe(42);
  });

  it('does not refetch endlessly when requests keep failing', async () => {
    getUsers.mockReturnValue(throwError(() => new Error('down')));
    getUsers.mockClear();

    paginator().page.emit({ pageIndex: 1, pageSize: 10, length: 42, previousPageIndex: 0 });
    await fixture.whenStable();

    // The failed target page plus a single re-sync of the last-good page, then it settles.
    expect(getUsers.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('reports the error and keeps paging working after a failed request', async () => {
    getUsers.mockReturnValueOnce(throwError(() => new Error('boom')));

    paginator().page.emit({ pageIndex: 1, pageSize: 10, length: 42, previousPageIndex: 0 });
    await fixture.whenStable();

    expect(handleError).toHaveBeenCalled();

    getUsers.mockClear();
    paginator().page.emit({ pageIndex: 2, pageSize: 10, length: 42, previousPageIndex: 1 });
    await fixture.whenStable();

    expect(getUsers).toHaveBeenCalledWith(2, 10);
  });

  it('hides the page-size select on compact viewports only', async () => {
    expect(paginator().hidePageSize).toBe(false);

    isCompact.set(true);
    await fixture.whenStable();

    expect(paginator().hidePageSize).toBe(true);
  });
});
