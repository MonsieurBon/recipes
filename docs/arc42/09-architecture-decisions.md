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

## ADR-5: Guarding Admin Self-Modification and the Last Active Admin

**Status:** Accepted

**Context:** Admins can deactivate accounts (and, in later slices, change roles and delete accounts). Two ways to lose administrative access to the system must be prevented: an admin locking themselves out, and the set of active admins dropping to zero. The second is a race: two admins deactivating (or demoting/deleting) each other in overlapping transactions each read the other as still active and both commit, leaving none.

**Decision:** Forbid an admin from applying a state-changing action to their **own** account, checked server-side against the authenticated principal's immutable id and reflected by a disabled control in the UI. Independently, refuse any action that would leave **no active admin**, enforced atomically by taking a pessimistic write lock (`SELECT ... FOR UPDATE`) on the active-admin rows before deciding, so concurrent actions serialize instead of both succeeding. A read-then-write count check is deliberately rejected because it does not close the race.

**Consequences:** The two rules are independent and both required -- forbidding self-modification alone does not prevent the concurrent last-two-admins case. Because the guarantee rests on database-level row locking, it cannot be covered by the mocked-repository unit tests and is verified by a Testcontainers-backed integration test against real MySQL. Refusals surface as HTTP `409` with a reason code so the client shows a specific message rather than a generic error. Admin membership is stored per user and is not separately indexed, so the locking read scans broadly -- acceptable given how rare admin state changes are.
