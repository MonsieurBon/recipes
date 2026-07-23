import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  enabled: boolean;
  roles: string[];
}

export interface UserPage {
  content: AdminUser[];
  totalElements: number;
  number: number;
  size: number;
}

interface PagedResponse {
  content: AdminUser[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private http = inject(HttpClient);

  getUsers(page: number, size: number): Observable<UserPage> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PagedResponse>('/api/admin/users', { params }).pipe(
      map((response) => ({
        content: response.content,
        totalElements: response.page.totalElements,
        number: response.page.number,
        size: response.page.size,
      })),
    );
  }

  setEnabled(id: number, enabled: boolean): Observable<AdminUser> {
    return this.http.put<AdminUser>(`/api/admin/users/${id}`, { enabled });
  }
}
