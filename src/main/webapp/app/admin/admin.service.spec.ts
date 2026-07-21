import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getUsers requests the given page and maps content plus total count', async () => {
    const promise = firstValueFrom(service.getUsers(1, 20));

    const req = httpMock.expectOne('/api/admin/users?page=1&size=20');
    expect(req.request.method).toBe('GET');
    req.flush({
      content: [
        { id: 1, username: 'alice', email: 'alice@example.com', roles: ['USER', 'ADMIN'] },
        { id: 2, username: 'bob', email: 'bob@example.com', roles: ['USER'] },
      ],
      page: { size: 20, number: 1, totalElements: 42, totalPages: 3 },
    });

    const result = await promise;
    expect(result.totalElements).toBe(42);
    expect(result.number).toBe(1);
    expect(result.size).toBe(20);
    expect(result.content).toEqual([
      { id: 1, username: 'alice', email: 'alice@example.com', roles: ['USER', 'ADMIN'] },
      { id: 2, username: 'bob', email: 'bob@example.com', roles: ['USER'] },
    ]);
  });
});
