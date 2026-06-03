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
  tap,
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

export interface LoginCredentials {
  usernameOrEmail: string;
  password: string;
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

  // Resolves true on success (routed to the success page) and the conflicting fields on a duplicate
  // (409) so the form can flag them. Other failures propagate.
  async register(details: RegistrationDetails): Promise<DuplicateUserError | boolean> {
    return firstValueFrom(
      this.http.post('/api/auth/register', details).pipe(
        switchMap(() => this.router.navigate(['register', 'success'])),
        // Resolve a definite "registration succeeded" rather than navigate()'s result, so a
        // navigation hiccup can't masquerade as a failed registration.
        map(() => true),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 409) {
            return of(error.error as DuplicateUserError);
          }
          throw error;
        }),
      ),
    );
  }

  // Resolves true on success (token stored, routed to the landing page) and false on invalid
  // credentials (401) so the form can show an inline error. Other failures propagate.
  async login(credentials: LoginCredentials): Promise<boolean> {
    return firstValueFrom(
      this.http.post<LoginResponse>('/api/auth/login', credentials, { withCredentials: true }).pipe(
        tap((response) => (this.accessToken = response.token)),
        switchMap(() => this.router.navigate(['/'])),
        // Resolve a definite "auth succeeded" rather than navigate()'s result, so a navigation
        // hiccup can't masquerade as bad credentials.
        map(() => true),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
            return of(false);
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
