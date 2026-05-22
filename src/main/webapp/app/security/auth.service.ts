import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  catchError,
  finalize,
  firstValueFrom,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';
import { Router } from '@angular/router';

export interface RegistrationDetails {
  username: string;
  email: string;
  password: string;
}

export interface DuplicateUserError {
  conflictingFields: string[];
}

export interface LoginResponse {
  token: string;
  roles: string[];
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // The access token lives only in memory: it is never written to localStorage, so an XSS payload
  // cannot exfiltrate it. After a page reload it starts null, so the first protected request 401s
  // and the refresh interceptor transparently re-acquires it from the refresh cookie.
  private accessToken: string | null = null;

  // Holds the in-flight refresh so a burst of simultaneous 401s (e.g. several requests firing
  // after a reload) shares one POST /api/auth/refresh instead of each rotating the cookie. Reset
  // when the request settles so the next burst starts fresh.
  private refreshInFlight$: Observable<string> | null = null;

  async register(details: RegistrationDetails): Promise<DuplicateUserError | boolean> {
    return firstValueFrom(
      this.http.post('/api/auth/register', details).pipe(
        switchMap(() => this.router.navigate(['register', 'success'])),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 409) {
            return of(error.error as DuplicateUserError);
          }
          throw error;
        }),
      ),
    );
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  refresh(): Observable<string> {
    // The refresh token rides along as an HttpOnly cookie; withCredentials lets the browser send it.
    this.refreshInFlight$ ??= this.http
      .post<LoginResponse>('/api/auth/refresh', {}, { withCredentials: true })
      .pipe(
        map((response) => {
          this.accessToken = response.token;
          return response.token;
        }),
        finalize(() => (this.refreshInFlight$ = null)),
        shareReplay(1),
      );
    return this.refreshInFlight$;
  }

  logout(): void {
    // Best-effort cookie clear; local state is dropped regardless of the backend result.
    this.http
      .post('/api/auth/logout', {}, { withCredentials: true })
      .pipe(catchError(() => of(null)))
      .subscribe();
    this.accessToken = null;
    this.router.navigate(['login']);
  }
}
