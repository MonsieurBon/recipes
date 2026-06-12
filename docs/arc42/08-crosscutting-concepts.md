# 8. Crosscutting Concepts

## 8.1 Authentication and Authorization

- Stateless JWT-based authentication
- `JWTFilter` intercepts every request, validates the token, and sets the Spring Security context
- Public endpoints: `/api/auth/**` and all static resources
- All other `/api/**` endpoints require a valid JWT
- Role-based authorization: every endpoint under `/api/admin/**` additionally requires the `ADMIN` role; enforced in `SecurityConfig` and mirrored in the frontend by `AdminGuard`
- The user's role is included as a claim in the JWT so the frontend can render admin navigation without an extra API call
- The HMAC-SHA256 signing key is supplied via the `JWT_SECRET` environment variable (no default); a `FailureAnalyzer` surfaces missing or undersized keys as a Spring Boot `APPLICATION FAILED TO START` banner at startup
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

- Backend returns structured JSON error responses with appropriate HTTP status codes
- Frontend shows user-friendly error messages via Angular Material snackbar/toast
- Request DTOs use Jakarta Bean Validation annotations; validation failures are returned as 400 with field-level details

## 8.4 Testing Strategy

- **TDD**: Write a failing test first, then implement
- **Backend**: JUnit 5 + Spring Boot Test; integration tests with Testcontainers for MySQL
- **Frontend**: Vitest for unit tests; co-located `*.spec.ts` files
