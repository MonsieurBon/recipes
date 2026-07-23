import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, ErrorHandler, inject, Injectable, signal } from '@angular/core';
import {
  catchError,
  finalize,
  firstValueFrom,
  map,
  Observable,
  of,
  shareReplay,
  tap,
  throwError,
} from 'rxjs';
import { LocalStorage } from '../utility/local-storage';

export interface RegistrationDetails {
  username: string;
  email: string;
  password: string;
  // The language the visitor picked while anonymous, so the new account keeps it. Optional: the
  // backend falls back to the default when it is absent.
  preferredLanguage?: string;
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
  id: number;
  username: string;
  email: string;
  roles: string[];
  preferredLanguage: string;
}

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
}

/**
 * Signals that a refresh was deliberately aborted because the user had explicitly logged out, as
 * opposed to a transport or server failure. Its own type lets the startup restore tell this
 * expected "stay anonymous" outcome apart from an unexpected error worth notifying about.
 */
class SessionEndedError extends Error {
  constructor() {
    super('Session was ended by an explicit logout');
    this.name = 'SessionEndedError';
  }
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // The HttpOnly refresh cookie cannot be cleared by JavaScript, so when the backend logout call
  // fails the cookie outlives the logout. This marker remembers the user's explicit logout across
  // reloads and keeps every refresh — the startup restore as well as 401-triggered ones — from
  // silently resurrecting the session with the leftover cookie; the next successful login lifts
  // it. Set only on user-initiated logout, never by automatic session cleanup.
  private static readonly LOGGED_OUT_KEY = 'loggedOut';

  private errorHandler = inject(ErrorHandler);
  private http = inject(HttpClient);
  private localStorage = inject(LocalStorage);

  constructor() {
    // The storage event fires only in the tabs that did not perform the write, so this mirrors an
    // explicit logout from another tab: without it, this tab's in-memory access token would stay
    // usable until it expires.
    window.addEventListener('storage', (event) => {
      if (event.key === AuthService.LOGGED_OUT_KEY && event.newValue) {
        this.clearLocalSession();
      }
    });
  }

  // The access token lives only in memory: it is never written to localStorage, so an XSS payload
  // cannot exfiltrate it. After a page reload it starts null until restoreSession() re-acquires it
  // from the refresh cookie. A signal, so auth-state-dependent UI reacts to it.
  private readonly accessToken = signal<string | null>(null);

  // The user's roles, refreshed from every login and refresh response (the access token holds the
  // authoritative copy server-side; this is only a UI hint for gating admin-only navigation). Like
  // the token it lives in memory and starts empty after a reload until restoreSession() runs.
  private readonly roles = signal<readonly string[]>([]);

  // The signed-in user's identity for display (e.g. the account page's profile header). Like roles
  // it is a UI hint from the login/refresh response, held in memory only.
  private readonly user = signal<CurrentUser | null>(null);

  readonly currentUser = this.user.asReadonly();

  // The account's stored language preference, taken from the login/refresh response. Null while
  // anonymous; the LanguageService watches it so the profile choice wins over a local one on login.
  private readonly profileLanguageSignal = signal<string | null>(null);

  readonly profileLanguage = this.profileLanguageSignal.asReadonly();

  readonly isLoggedIn = computed(() => this.accessToken() !== null);

  readonly isAdmin = computed(() => this.roles().includes('ADMIN'));

  // Holds the in-flight refresh so a burst of simultaneous 401s (e.g. several requests firing
  // after a reload) shares one POST /api/auth/refresh instead of each rotating the cookie. Reset
  // when the request settles so the next burst starts fresh.
  private refreshInFlight$: Observable<string> | null = null;

  // Resolves once the startup session restore has settled (whether it found a session or not), so
  // route guards can await it before deciding — a hard navigation straight to a guarded route can
  // otherwise outrun the restore and judge a legitimate user against the empty pre-restore state.
  // Starts resolved so awaiting before restoreSession() ran never blocks.
  private sessionRestored: Promise<void> = Promise.resolve();

  // Resolves null on success (the endpoint returns an empty body) and the conflicting fields on a
  // duplicate (409) so the form can flag them. Other failures propagate.
  async register(details: RegistrationDetails): Promise<DuplicateUserError | null> {
    return firstValueFrom(
      this.http.post<null>('/api/auth/register', details).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 409 && Array.isArray(error.error?.conflictingFields)) {
            return of(error.error as DuplicateUserError);
          }
          throw error;
        }),
      ),
    );
  }

  // Resolves true on success (token stored) and false on invalid credentials (401) so the form can
  // show an inline error. Other failures propagate.
  async login(credentials: LoginCredentials): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>('/api/auth/login', credentials, { withCredentials: true }),
      );
      this.accessToken.set(response.token);
      this.roles.set(response.roles);
      this.user.set({ id: response.id, username: response.username, email: response.email });
      this.profileLanguageSignal.set(response.preferredLanguage ?? null);
      this.localStorage.removeItem(AuthService.LOGGED_OUT_KEY);
      return true;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return false;
      }
      throw error;
    }
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }

  // Called once at startup: the refresh cookie is HttpOnly and invisible to JS, so attempting a
  // refresh is the only way to learn whether a session survived the reload. An expected failure —
  // a 401 because there is no session, or the logged-out marker blocking the refresh after an
  // explicit logout — leaves the user anonymous silently. An unexpected one (server error, network
  // outage) is handed to the global ErrorHandler so the user gets the generic notification, but the
  // restore still settles as anonymous so route guards awaiting it are never left hanging.
  restoreSession(): void {
    this.sessionRestored = firstValueFrom(
      this.refresh().pipe(
        map(() => undefined),
        catchError((error: unknown) => {
          if (!AuthService.isExpectedRestoreFailure(error)) {
            this.errorHandler.handleError(error);
          }
          return of(undefined);
        }),
      ),
    );
  }

  private static isExpectedRestoreFailure(error: unknown): boolean {
    return (
      error instanceof SessionEndedError ||
      (error instanceof HttpErrorResponse && error.status === 401)
    );
  }

  // Awaited by route guards so a deep-link or refresh into a guarded route decides against the
  // real auth state rather than the empty pre-restore one. Resolves on success or failure alike.
  whenSessionRestored(): Promise<void> {
    return this.sessionRestored;
  }

  // Automatic cleanup when the server has rejected the session (or a refresh failed): drops only
  // this tab's in-memory token. Unlike logout(), it sets no logged-out marker — the user did not
  // ask to leave, so a still-valid session may be silently restored on the next load.
  clearLocalSession(): void {
    this.accessToken.set(null);
    this.roles.set([]);
    this.user.set(null);
    this.profileLanguageSignal.set(null);
  }

  refresh(): Observable<string> {
    if (this.localStorage.getItem(AuthService.LOGGED_OUT_KEY)) {
      return throwError(() => new SessionEndedError());
    }
    // The refresh token rides along as an HttpOnly cookie; withCredentials lets the browser send it.
    this.refreshInFlight$ ??= this.http
      .post<LoginResponse>('/api/auth/refresh', {}, { withCredentials: true })
      .pipe(
        // Re-checked mid-stream: a logout performed while this refresh was in flight (in this tab
        // or, via the shared marker, in another one) must win. Erroring discards the late response
        // for every consumer — neither token nor roles are stored below, and the token is not
        // handed to callers such as the interceptor's retry.
        map((response) => {
          if (this.localStorage.getItem(AuthService.LOGGED_OUT_KEY)) {
            throw new SessionEndedError();
          }
          return response;
        }),
        tap((response) => {
          this.accessToken.set(response.token);
          this.roles.set(response.roles);
          this.user.set({ id: response.id, username: response.username, email: response.email });
          this.profileLanguageSignal.set(response.preferredLanguage ?? null);
        }),
        map((response) => response.token),
        finalize(() => (this.refreshInFlight$ = null)),
        shareReplay(1),
      );
    return this.refreshInFlight$;
  }

  // Local session state is dropped up front regardless of the backend result — the user asked to
  // leave. Resolves whether the backend confirmed clearing the refresh cookie, so the caller can
  // warn the user that the session may still be alive on this machine when it did not.
  async logout(): Promise<boolean> {
    this.clearLocalSession();
    this.localStorage.setItem(AuthService.LOGGED_OUT_KEY, true);
    try {
      await firstValueFrom(this.http.post('/api/auth/logout', {}, { withCredentials: true }));
      return true;
    } catch {
      return false;
    }
  }
}
