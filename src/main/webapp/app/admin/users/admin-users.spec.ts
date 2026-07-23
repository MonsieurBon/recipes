import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatPaginator } from '@angular/material/paginator';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { of, throwError } from 'rxjs';
import { Mock } from 'vitest';

import { AuthService, CurrentUser } from '../../security/auth.service';
import { LayoutService } from '../../utility/layout.service';
import { NotificationService } from '../../utility/notification.service';
import { provideTranslateTesting } from '../../testing/provide-translate-testing';
import { AdminService, AdminUser, UserPage } from '../admin.service';
import { AdminUsers } from './admin-users';
import { UserEditSheet } from './user-edit-sheet';

describe('AdminUsers', () => {
  let fixture: ComponentFixture<AdminUsers>;
  let isCompact: WritableSignal<boolean>;
  let currentUser: WritableSignal<CurrentUser | null>;
  let getUsers: Mock<(page: number, size: number) => ReturnType<AdminService['getUsers']>>;
  let setEnabled: Mock<(id: number, enabled: boolean) => ReturnType<AdminService['setEnabled']>>;
  let open: Mock;
  let showNotice: Mock<(key: string) => void>;
  let handleError: Mock<(error: unknown) => void>;

  const page = (
    content: UserPage['content'],
    totalElements: number,
    number: number,
    size: number,
  ): UserPage => ({ content, totalElements, number, size });

  const twoUsers: AdminUser[] = [
    {
      id: 1,
      username: 'alice',
      email: 'alice@example.com',
      enabled: true,
      roles: ['USER', 'ADMIN'],
    },
    { id: 2, username: 'bob', email: 'bob@example.com', enabled: true, roles: ['USER'] },
  ];

  beforeEach(async () => {
    isCompact = signal(false);
    currentUser = signal<CurrentUser | null>(null);
    handleError = vi.fn();
    // The server echoes back the page it actually served, so the mock mirrors the request.
    getUsers = vi.fn((number: number, size: number) => of(page(twoUsers, 42, number, size)));
    setEnabled = vi.fn((id: number, enabled: boolean) =>
      of({ id, username: 'x', email: 'x@example.com', enabled, roles: ['USER'] }),
    );
    open = vi.fn(() => ({ afterDismissed: () => of(undefined) }));
    showNotice = vi.fn();

    await TestBed.configureTestingModule({
      imports: [AdminUsers],
      providers: [
        provideTranslateTesting(),
        { provide: AdminService, useValue: { getUsers, setEnabled } },
        { provide: LayoutService, useValue: { isCompact } },
        { provide: AuthService, useValue: { currentUser } },
        { provide: MatBottomSheet, useValue: { open } },
        { provide: NotificationService, useValue: { showNotice } },
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

  const toggleDebugElements = () => fixture.debugElement.queryAll(By.directive(MatSlideToggle));

  // Forces a fresh fetch with the given content by changing the page size (which re-runs the
  // request), so a test can render users other than the default pair.
  const reloadWith = async (content: AdminUser[]) => {
    getUsers.mockReturnValue(of(page(content, content.length, 0, 20)));
    paginator().page.emit({ pageIndex: 0, pageSize: 20, length: 42, previousPageIndex: 0 });
    await fixture.whenStable();
  };

  it('marks a disabled account with a Deaktiviert tag and dims it on compact viewports', async () => {
    isCompact.set(true);
    await reloadWith([
      { id: 3, username: 'mytest', email: 'my@test.ch', enabled: false, roles: ['USER'] },
    ]);

    const row: HTMLElement = fixture.nativeElement.querySelector('[data-test-id="userRows"] li');
    expect(tags(row)).toEqual(['Deaktiviert']);
    expect(row.querySelector('.dis')).not.toBeNull();
  });

  it('opens the edit sheet for the tapped row, flagging the signed-in admin’s own row', async () => {
    currentUser.set({ id: 1, username: 'alice', email: 'alice@example.com' });
    isCompact.set(true);
    await fixture.whenStable();

    const rowButton: HTMLElement = fixture.nativeElement.querySelector('[data-test-id="userRow"]');
    rowButton.click();

    expect(open).toHaveBeenCalledWith(UserEditSheet, {
      data: { user: twoUsers[0], isOwn: true },
    });
  });

  it('re-fetches the current page after the edit sheet closes', async () => {
    isCompact.set(true);
    await fixture.whenStable();
    getUsers.mockClear();

    fixture.nativeElement.querySelector('[data-test-id="userRow"]').click();
    await fixture.whenStable();

    expect(getUsers).toHaveBeenCalled();
  });

  it('disables only the signed-in admin’s own toggle in the expanded table', () => {
    currentUser.set({ id: 1, username: 'alice', email: 'alice@example.com' });
    fixture.detectChanges();

    const toggles = toggleDebugElements().map((d) => d.componentInstance as MatSlideToggle);
    expect(toggles[0].disabled).toBe(true); // alice is the signed-in admin
    expect(toggles[1].disabled).toBe(false);
  });

  it('gives each expanded-table toggle an accessible name naming its account', () => {
    const button: HTMLElement = fixture.nativeElement.querySelector(
      'tr[mat-row] [data-test-id="activeToggle"] button[role="switch"]',
    );
    expect(button.getAttribute('aria-label')).toContain('alice');
  });

  it('persists an inline toggle and re-fetches to reconcile', async () => {
    getUsers.mockClear();

    toggleDebugElements()[1].triggerEventHandler('change', { checked: false });
    await fixture.whenStable();

    expect(setEnabled).toHaveBeenCalledWith(2, false);
    expect(getUsers).toHaveBeenCalled();
  });

  it('shows a dedicated notice and does not log a conflict, then reconciles', async () => {
    setEnabled.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 409, error: { reason: 'lastActiveAdmin' } }),
      ),
    );
    getUsers.mockClear();

    toggleDebugElements()[1].triggerEventHandler('change', { checked: false });
    await fixture.whenStable();

    expect(showNotice).toHaveBeenCalledWith('admin.userConflict.lastActiveAdmin');
    expect(handleError).not.toHaveBeenCalled();
    expect(getUsers).toHaveBeenCalled(); // reload snaps the toggle back
  });
});
