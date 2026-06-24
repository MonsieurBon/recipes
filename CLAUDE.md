# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A recipe management web application with a Spring Boot (Java) backend and Angular frontend, using MySQL with Flyway migrations and JWT-based authentication.

## Build & Development Commands

### Backend (Maven)
- `./mvnw spring-boot:run` — run the Spring Boot app
- `SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run` — run locally with the `dev` profile (Hibernate `ddl-auto: update`, SQL logging on). The default profile uses prod-safe values.
- `./mvnw clean package` — full build (includes frontend build, lint, format check, and tests via frontend-maven-plugin)
- `./mvnw test` — run backend tests + frontend lint/format/tests
- `./mvnw spotless:apply` — auto-format Java code (Google Java Format)
- `./mvnw spotless:check` — check Java formatting

### Frontend (npm)
- `npm start` — dev server (ng serve)
- `npm test` — run Angular tests (vitest, watch mode)
- `npm run test:ci` — run tests once (no watch)
- `npm run lint` — ESLint with auto-fix
- `npm run lint:check` — ESLint check only
- `npm run format` — Prettier format (ts, html)
- `npm run format:check` — Prettier check only

## Architecture

### Backend
- **Package**: `ch.ethy.recipes`
- **Security**: JWT-based stateless auth with `JWTFilter` → `JwtService` → Spring Security. Endpoints under `/api/(!auth)/**` require authentication; everything else is public.
- **Auth flow**: `AuthController` handles login/register, `AuthService` coordinates, `DbUserDetailsService` loads users, BCrypt for passwords.
- **Database**: MySQL with Flyway migrations in `src/main/resources/db/migration/`. JPA entities extend `BaseEntity`.
- **Frontend serving**: `AngularForwardController` forwards non-API routes to `index.html` for Angular routing. Static files served from `classpath:/static/browser/`.

### Frontend
- **Source root**: `src/main/webapp/` (not standard `src/`)
- **Build output**: `target/classes/static` (served by Spring Boot)
- **UI framework**: Angular Material with SCSS, custom Material theme in `material-theme.scss`
- **Components use class-based selectors** (e.g., `app-login` as kebab-case element)
- **HTTP auth**: `authenticationInterceptor` attaches JWT tokens to requests
- **Testing**: Vitest (not Karma/Jasmine). Test files are co-located as `*.spec.ts`.

## Development Workflow

- **TDD**: When developing code, write a failing test first, then implement the functionality to make it pass.
- **Browser verification**: Every change is additionally verified end-to-end in the browser via the Playwright MCP server (registered project-wide in `.mcp.json`; pinned through the `@playwright/mcp` devDependency so every dev runs the same version, and driving the system Chrome by default). This is a manual step performed locally during development — it is **not** gated in CI.
  - Start the backend and the frontend dev server, then drive the browser through the Playwright MCP tools against them. The dev server watches and hot-reloads frontend changes, so it only needs starting if it isn't already running; the backend needs a restart only when backend code changed.
  - JetBrains specifics: the backend runs as the `RecipesApplication` run configuration (IntelliJ IDEA), the dev server as the `start` run configuration (WebStorm). **Always build first** — launching through the JetBrains MCP tools (`execute_run_configuration` or a debug session) skips the run configuration's before-launch Build step, so trigger `build_project` first or the restart runs stale classes. There is no MCP stop tool for plain run configurations; free the port by killing the old process (debug sessions started via `xdebug_start_debugger_session` can be stopped with `xdebug_control_session(STOP)`).
- **Small, deployable steps**: Each step is one reviewable unit — at least one test plus the implementation that satisfies it. Every step must leave the app green: compiles, all tests pass, no style violations. Prefer several small commits over one large one.
- **Thin components**: Keep Angular components as simple as possible; move logic (subscriptions, navigation, side effects) into services.
- **Architecture docs**: Keep the arc42 documentation in `docs/arc42/` up to date when implementing new features.

## Code Style

- **Java**: Google Java Format enforced via Spotless
- **TypeScript/HTML**: Prettier (100 char width, single quotes, Angular HTML parser)
- **ESLint**: angular-eslint with `app` prefix for components (kebab-case elements) and directives (camelCase attributes)
- **Angular components**: Use standalone components (no NgModules) and `ChangeDetectionStrategy.OnPush`
- **Backend DTOs**: Use Jakarta Bean Validation annotations on request DTOs; invalid input yields a 400 with field-level errors

## Configuration

Runtime config is supplied via environment variables. `src/main/resources/application.yaml`
is the source of truth; the README lists every variable with its default. Don't re-document
the full list or defaults here — keep them in one place to avoid drift.

Behavioral facts worth keeping in mind when touching auth (canonical detail in arc42 §8.1):

- **Access token** (`JWT_ACCESS_TTL`): sent on every request; rejected once expired, missing
  its `exp` claim, or once its embedded per-user **token version** no longer matches the user's
  current version (this is the revocation mechanism).
- **Refresh token** (`JWT_REFRESH_TTL`): `HttpOnly` cookie exchanged at `POST /api/auth/refresh`
  for a fresh access token and a rotated cookie. Refresh **re-reads the user**, so a role change
  takes effect on the next refresh. Lifetime is rolling (each refresh restarts it).
- **`REFRESH_COOKIE_SECURE`**: the `dev` profile sets it `false` for plain-HTTP localhost; keep
  it `true` in production (still applies behind an HTTPS-terminating reverse proxy).
- **`LOGIN_FAILURE_DELAY`**: failed logins are held before the 401; the wait is asynchronous, so
  it holds no request thread and can't be turned into a thread-pool exhaustion lever.
