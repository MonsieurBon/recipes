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

  it('getUsers fetches the user list from the admin API', async () => {
    const promise = firstValueFrom(service.getUsers());

    const req = httpMock.expectOne('/api/admin/users');
    expect(req.request.method).toBe('GET');
    req.flush([
      { id: 1, username: 'alice', email: 'alice@example.com', roles: ['USER', 'ADMIN'] },
      { id: 2, username: 'bob', email: 'bob@example.com', roles: ['USER'] },
    ]);

    const users = await promise;
    expect(users).toEqual([
      { id: 1, username: 'alice', email: 'alice@example.com', roles: ['USER', 'ADMIN'] },
      { id: 2, username: 'bob', email: 'bob@example.com', roles: ['USER'] },
    ]);
  });
});
