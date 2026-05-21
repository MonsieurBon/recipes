# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A recipe management web application with a Spring Boot 4 (Java 21) backend and Angular 21 frontend, using MySQL with Flyway migrations and JWT-based authentication.

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
- **Small, deployable steps**: Each step is one reviewable unit — at least one test plus the implementation that satisfies it. Every step must leave the app green: compiles, all tests pass, no style violations. Prefer several small commits over one large one.
- **Thin components**: Keep Angular components as simple as possible; move logic (subscriptions, navigation, side effects) into services.
- **Architecture docs**: Keep the arc42 documentation in `docs/arc42/` up to date when implementing new features.

## Code Style

- **Java**: Google Java Format enforced via Spotless
- **TypeScript/HTML**: Prettier (100 char width, single quotes, Angular HTML parser)
- **ESLint**: angular-eslint with `app` prefix for components (kebab-case elements) and directives (camelCase attributes)
- **Angular components**: Use standalone components (no NgModules) and `ChangeDetectionStrategy.OnPush`
- **Backend DTOs**: Use Jakarta Bean Validation annotations on request DTOs; invalid input yields a 400 with field-level errors

## Environment Variables

- `DB_HOST` / `DB_PORT` — MySQL connection (defaults: localhost:3306)
- `DB_PASSWORD` — MySQL app user password
- `FLYWAY_PASSWORD` — Flyway migration user password
- `JWT_SECRET` — Base64-encoded HMAC-SHA256 signing key for JWTs (required; minimum 32 bytes / 256 bits, but generate with `openssl rand -base64 48` for headroom)
- `JWT_TTL` — Access-token lifetime as an ISO-8601 duration (default `PT24H`, maximum `P30D`). Tokens are rejected on parse once expired or missing the `exp` claim.
