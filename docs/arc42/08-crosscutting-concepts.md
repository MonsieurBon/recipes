# 8. Crosscutting Concepts

## 8.1 Authentication and Authorization

- Stateless JWT-based authentication
- Every request is intercepted, its token validated, and the Spring Security context populated before the request reaches application code
- Public endpoints: `/api/auth/**` and all static resources
- All other `/api/**` endpoints require a valid JWT
- Role-based authorization: every endpoint under `/api/admin/**` additionally requires the `ADMIN` role; enforced server-side in the security configuration and mirrored by a guard in the frontend router
- Frontend route guarding defers its decision until the startup session restore has settled, so a hard navigation or refresh straight to a guarded route is judged against the real auth state rather than the empty pre-restore one. The two rejection cases are distinguished: an anonymous visitor is redirected to the login page carrying the originally requested URL and returned to it after a successful login, while a signed-in but unauthorized user is sent to the home page and shown a brief not-authorized notice, so the redirect away from the requested URL is explained rather than silent. Only same-origin paths are honoured as a return target, so a crafted return URL cannot redirect login to another site. This is a UX gate only — server-side authorization is unaffected
- The user's role is included as a claim in the JWT so the frontend can render admin navigation without an extra API call
- The HMAC-SHA256 signing key is supplied via the `JWT_SECRET` environment variable (no default); a startup check surfaces missing or undersized keys as a Spring Boot `APPLICATION FAILED TO START` banner
- Two token types are issued: a short-lived **access token** sent on every request and a longer-lived **refresh token** the client exchanges for a new pair at `/api/auth/refresh`. Lifetimes come from `JWT_ACCESS_TTL` (default `PT15M`) and `JWT_REFRESH_TTL` (default `P7D`), each an ISO-8601 duration capped at `P30D`
- The refresh token is delivered as an `HttpOnly`, `SameSite=Strict` cookie scoped to `/api/auth`, so it is never readable by JavaScript; the access token is returned in the response body and held only in memory on the client. `Secure` is on by default (configurable via `REFRESH_COOKIE_SECURE`; off only for local plain-HTTP development). Logout clears the cookie via `/api/auth/logout`
- The client derives its login state reactively from the presence of the in-memory access token and renders auth-dependent UI (such as the user menu) from it — login/register affordances while anonymous, logout while authenticated, never both. Because the refresh cookie is invisible to JavaScript, a page reload starts without a client-visible session; the app attempts one silent, non-blocking token refresh at startup to restore it, staying anonymous if none exists. A user-initiated logout always drops local session state, propagates immediately to other open tabs, and is remembered locally so no silent refresh — neither the startup restore nor a 401-triggered one — can resurrect a deliberately ended session; the next successful login lifts that marker. Automatic cleanup after a rejected session sets no such marker, since the user did not ask to leave. If the backend cannot confirm clearing the refresh cookie, the user is sent to a page explaining that the session may still be alive on the device, with instructions to clear the site's cookies and a retry option
- Every token carries an `exp` claim and is rejected on parse if expired or if `exp` is missing
- Each user has a server-side **token version** embedded in their tokens; it is bumped whenever the user's access must be revoked (e.g. a role change). A request authenticates only while the access token's version still matches the user's current version, so revocation invalidates outstanding access tokens within a short, bounded window. The current version is read through a short-lived local cache to avoid a database lookup on every request
- Refresh is not version-gated: it re-reads the user, so a mid-session role change is reflected in the next access token — a demotion downgrades the session on the next refresh rather than forcing an immediate re-login
- The refresh lifetime is **rolling (sliding)**: every successful refresh issues a new refresh token whose lifetime restarts from `JWT_REFRESH_TTL`. A continuously active session therefore never expires from age alone; only an inactivity gap longer than the refresh lifetime forces re-authentication
- Passwords are stored as BCrypt hashes. Registration enforces a minimum password length of 12 characters (validated on both backend and frontend) with no composition rules, following NIST guidance that length, not character classes, is what measurably resists guessing. The upper bound is 72 UTF-8 **bytes** — BCrypt's hard input ceiling — validated on both layers so a long passphrase (or one with multibyte characters) gets a field-level validation error instead of a server error from the hash function. Login is intentionally not length-gated so credentials registered under earlier policies keep working
- A failed login is answered only after a configurable delay (default 1 s, via `LOGIN_FAILURE_DELAY`), raising the cost of online brute-force and credential-stuffing; successful logins and validation errors are unaffected. The wait is asynchronous — the request is suspended without holding a request thread — so the delay cannot be turned into a thread-pool exhaustion lever, and it is capped at 10 s. This is a lightweight mitigation, not a replacement for rate limiting or account lockout

## 8.2 Domain Model

```
+------------------+        +-------------------+
|     User         |        |    Recipe         |
|------------------|        |-------------------|
| username         |        | title             |
| email            |        | description       |
| password (hash)  |        | servings          |
| role             |        | prepTime          |
+-------+----------+        | cookTime          |
        |                   +--------+----------+
        | 1                     | 1          | 1
        |                       |            |
        | favorites *           |            | steps *
        v                       |            v
+------------------+            |   +-------------------+
|    Favorite      |            |   |   Step            |
|------------------|            |   |-------------------|
| user             |            |   | recipe            |
| recipe           |            |   | orderIndex        |
+------------------+            |   | instruction       |
                                |   +--------+----------+
        +                       |            | *
        |                       |            | ingredients (many-to-many)
        | 1                     |            v
        |                   +--------+----------+
+-------+-----------+       | RecipeIngredient  |
|    MealPlan       |       |-------------------|
|-------------------|       | recipe            |
| user              |       | ingredient        |
| weekStartDate     |       | amount            |
+--------+----------+       | unit              |
         | 1                | orderIndex        |
         |                  +--------+----------+
         | slots *                   | *
         v                           v
+-------------------+       +-------------------+
|   MealSlot        |       |   Ingredient      |
|-------------------|       |-------------------|
| dayOfWeek         |       | name              |
| mealType          |       | seasonMonths      |
| recipe            |       +-------------------+
+-------------------+
```

## 8.3 Error Handling

- Backend returns structured JSON error responses with appropriate HTTP status codes. Request payloads use bean validation; validation failures are returned as 400 with field-level details.
- The frontend follows one rule — **catch only what you can act on; let everything else bubble to a single global handler** — which yields two layers:
  - **Contextual, actionable errors stay where they happen.** Failures the user can act on — wrong credentials on login, an already-taken username or email on registration, field validation — are caught and shown inline by the form that made the request. Because they are caught, they never reach the global layer.
  - **A single global handler catches everything else.** Anything that no one caught — an uncaught runtime error, a template failure, or an HTTP failure (5xx, network outage, or a status a form failed to handle) — is logged and surfaces one shared, transient, generic notification. Each unhandled error therefore produces exactly one notification. The message is deliberately generic and never includes the error's own text or response body — details are logged only.
- Components and services deliberately narrow their own `catch`/error handling to the cases they can resolve and let the rest propagate, so a genuine failure is never silently swallowed. The passive startup session-restore is the one background caller: it treats "no session" as its normal outcome (stay anonymous, silently) but routes an unexpected transport/server failure to the same global handler.

## 8.4 Activity Feedback

- User-initiated actions keep their own local feedback (for example a button spinner and disabled fields during login). Passive, non-interactive work — page-load data fetches, lazy-loaded route chunks, and the silent token refresh — is surfaced instead by a single global indicator: a slim indeterminate progress bar pinned to the top edge of the app shell.
- The indicator reflects a count of in-flight HTTP requests. The count settles on completion, error, and cancellation alike, so a failed or aborted request never leaves the bar stuck on. The mechanism only observes requests — it neither swallows nor re-orders their errors, which matters because it also spans the silent refresh flow.
- A short show-delay suppresses the bar for requests that settle quickly, and once shown the bar stays up for a minimum duration so a request settling just past that delay does not flash it on and off. Together these avoid flicker on both fast and borderline responses. The UI stays fully interactive throughout — the indicator is peripheral, never a blocking overlay.

## 8.5 Testing Strategy

- **TDD**: Write a failing test first, then implement
- **Backend**: JUnit 5 + Spring Boot Test; integration tests with Testcontainers for MySQL
- **Frontend**: Vitest for unit tests; co-located `*.spec.ts` files

## 8.6 Internationalization (i18n)

- The UI is fully **runtime-internationalized**: all user-facing text is externalized to translation keys, and the active language can be switched live without a rebuild or reload. Each language is a single JSON bundle resolved at runtime, so adding a language to the UI is dropping in one file and registering it — no other UI code change. The bundles are the clean, single-file-per-language layout a future continuous-localization workflow expects. (Persisting a new language as a user *preference* additionally needs a backend language-enum constant and a migration to widen the stored set — see the profile-backed preference below.)
- The shipped set is German, English, French and Italian. German is both the default and the fallback: a missing key or an unsupported locale falls back to German rather than showing a raw key. All bundles are kept in sync in-repo — any change that adds or alters a string updates every language file so they never drift.
- Route titles are translated through the same mechanism and re-translate on a live language switch, so the browser tab title follows the active language.
- **Language resolution** for an anonymous visitor is: a previously stored choice, then the browser's preferred languages, then the default. An anonymous choice is persisted locally so it survives a reload. A reactive language picker lets the user switch at any time.
- **Profile-backed preference:** a signed-in user's language is stored on their account. It is carried on the login and refresh responses and applied on sign-in, where it **wins over any local choice** so the language follows the user across devices. A change made while signed in is written back to the account through an authenticated endpoint. Registration carries the language the visitor picked while anonymous, so a new account keeps it. The local choice is left intact underneath, so it still applies after logout.
- **Trust boundary:** the language is treated as a fixed whitelist (the shipped set) everywhere it enters. The account-update endpoint and registration reject anything outside the set with a validation error, and client-side values from untrusted sources (local storage, the browser) are validated before use — local storage is attacker-writable under XSS and is never trusted as clean input. Translated output is rendered as text, never bound as HTML, so interpolated data inside a translation string cannot introduce markup.
