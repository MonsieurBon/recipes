# 9. Architecture Decisions

## ADR-1: Monolithic Architecture

**Status:** Accepted

**Context:** Single-developer project with a well-defined, bounded domain.

**Decision:** Build as a single deployable Spring Boot application serving both the API and the Angular SPA.

**Consequences:** Simple deployment and operations. No inter-service communication overhead. If scaling becomes necessary, the monolith can be split later.

## ADR-2: Suggestion Logic on the Server

**Status:** Accepted

**Context:** Meal suggestions require access to the user's favorites, recent meal history, and seasonal data.

**Decision:** Implement suggestion logic server-side rather than in the frontend.

**Consequences:** The algorithm has direct access to all required data without extra API calls. The logic can be tested with unit tests against the service. The frontend remains a thin presentation layer.

## ADR-3: Shared Recipe Library with User-Scoped Preferences

**Status:** Accepted

**Context:** Recipes are a shared resource that any user can browse, edit, and use. User-specific data such as favorites and meal plans reference this shared pool.

**Decision:** Recipes are globally accessible to all authenticated users. Favorites and meal plans are scoped to the individual user but can reference any recipe in the database.

**Consequences:** Any user can open, edit, favorite, and plan meals with any recipe. No per-recipe ownership or visibility controls are needed. User-specific features (favorites, meal plans) remain scoped to the authenticated user.

## ADR-4: Integrated Administration Backend

**Status:** Accepted

**Context:** Administrators need to curate the shared recipe/ingredient library and manage user accounts (e.g. promote to admin, disable, delete). The role model already distinguishes `USER` and `ADMIN`.

**Decision:** Ship the administration UI as an `/admin` area inside the same Angular SPA, backed by dedicated REST endpoints under `/api/admin/**` that require the `ADMIN` role. Admin endpoints delegate to the existing user, recipe, and ingredient domain services rather than introducing parallel data-access code.

**Consequences:** One deployment, one codebase, one auth mechanism. Role-based access control is enforced server-side in the security configuration and by a guard in the frontend router. Admin operations share validation, mapping, and persistence with the regular endpoints, so behavior stays consistent. The downside is that a compromised admin account has full access through the same UI as normal users -- acceptable for a single-operator deployment.
