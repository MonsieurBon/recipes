# Recipes

[![Build](https://github.com/MonsieurBon/recipes/actions/workflows/build.yml/badge.svg)](https://github.com/MonsieurBon/recipes/actions/workflows/build.yml)
[![Release](https://img.shields.io/github/v/release/MonsieurBon/recipes)](https://github.com/MonsieurBon/recipes/releases)

A recipe management web application: browse and manage recipes, mark favorites, and plan
meals for the week.

> [!NOTE]
> This project is under active development. Recipe management, favorites, and meal planning
> are being built out incrementally — see the [architecture docs](docs/arc42/) for the target
> design and current status.

---

## Getting Started

### Prerequisites

- **Docker**
- A reachable **MySQL 8** instance with a `recipes` database

### Database Setup

Flyway runs the migrations as a dedicated `recipes-flyway` user and, on first migration,
creates the lower-privilege `recipes` application user that the app uses at runtime. Create
the database and the migration user once:

```sql
CREATE DATABASE recipes;

CREATE USER 'recipes-flyway' IDENTIFIED BY 'your-flyway-password';
GRANT ALL PRIVILEGES ON recipes.* TO 'recipes-flyway';
-- The first migration creates the runtime 'recipes' user AND grants it privileges, so the
-- migration user needs CREATE USER plus GRANT OPTION to delegate them. Omitting GRANT OPTION
-- makes the migration fail with a non-obvious "access denied" error.
GRANT CREATE USER ON *.* TO 'recipes-flyway' WITH GRANT OPTION;
```

The runtime `recipes` user is created automatically with `SELECT, INSERT, UPDATE, DELETE` on
the `recipes` schema; its password is set from `DB_PASSWORD` (see below).

### Running the Application

A container image is published to the GitHub Container Registry on each release. Provide the
required environment variables (see [Configuration](#configuration)) and run it:

```bash
docker run -p 8080:8080 \
  -e DB_HOST=host.docker.internal \
  -e DB_PASSWORD='your-app-password' \
  -e FLYWAY_PASSWORD='your-flyway-password' \
  -e JWT_SECRET="$(openssl rand -base64 48)" \
  ghcr.io/monsieurbon/recipe:latest
```

The application starts on <http://localhost:8080>. Use a specific release tag in place of
`latest` to pin a version.

> [!TIP]
> Behind an SSL-terminating reverse proxy the refresh-token cookie's `Secure` attribute works
> as-is. If you expose the app over plain HTTP (no HTTPS proxy), also set
> `-e REFRESH_COOKIE_SECURE=false` so the cookie is accepted.

### Configuration

All configuration is supplied through environment variables. Durations use
[ISO-8601 duration](https://en.wikipedia.org/wiki/ISO_8601#Durations) format (e.g. `PT15M`,
`P7D`).

| Variable                | Description                                                                                                   | Default     | Required |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- | ----------- | :------: |
| `DB_HOST`               | MySQL host                                                                                                     | `localhost` |          |
| `DB_PORT`               | MySQL port                                                                                                     | `3306`      |          |
| `DB_PASSWORD`           | Password for the runtime `recipes` application user                                                           | —           |    ✅    |
| `FLYWAY_PASSWORD`       | Password for the `recipes-flyway` migration user                                                              | —           |    ✅    |
| `JWT_SECRET`            | Base64-encoded HMAC-SHA256 signing key for JWTs. Minimum 32 bytes; generate with `openssl rand -base64 48`     | —           |    ✅    |
| `JWT_ACCESS_TTL`        | Access-token lifetime (sent on every request, rejected once expired or revoked). Max `P30D`                    | `PT15M`     |          |
| `JWT_REFRESH_TTL`       | Refresh-token lifetime (`HttpOnly` cookie exchanged at `POST /api/auth/refresh`; rolling). Max `P30D`          | `P7D`       |          |
| `REFRESH_COOKIE_SECURE` | Whether the refresh-token cookie carries the `Secure` attribute. Keep `true` behind an HTTPS reverse proxy     | `true`      |          |
| `LOGIN_FAILURE_DELAY`   | Delay before a failed login returns its 401, slowing brute-force. Max `PT10S`; `PT0S` disables                 | `PT1S`      |          |

> [!IMPORTANT]
> `JWT_SECRET` has no default and the app **will not start** without a valid key of at least
> 32 bytes. Generate one with `openssl rand -base64 48` for headroom.

## Documentation

Architecture and design decisions are documented using the
[arc42](https://arc42.org/) template in [`docs/arc42/`](docs/arc42/).
