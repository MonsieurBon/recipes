# 5. Building Block View

## 5.1 Level 1 -- System Overview

```
+------------------------------------------------------+
|                 Recipe & Meal Planner                |
|                                                      |
|  +----------------+          +--------------------+  |
|  |   Angular SPA  |  REST    |  Spring Boot       |  |
|  |   (Frontend)   | ------>  |  (Backend)         |  |
|  +----------------+          +--------------------+  |
|                                      |               |
|                                      | JPA           |
|                                      v               |
|                              +--------------------+  |
|                              |   MySQL Database   |  |
|                              +--------------------+  |
+------------------------------------------------------+
```

## 5.2 Level 2 -- Backend Components

```
ch.ethy.recipes
+--------------------------------------------------------+
|  security/                                             |
|    Authentication endpoints (REST: /api/auth/**)       |
|    Login / registration logic                          |
|    Token issuance and validation                       |
|    Per-request token check populates security context  |
|    Spring Security configuration                       |
|                                                        |
|  user/                                                 |
|    User-management endpoints (REST: /api/users/**)     |
|    User persistence                                    |
|                                                        |
|  recipe/ (planned)                                     |
|    Recipe endpoints (REST: /api/recipes/**)            |
|    Recipe CRUD and search, persistence                 |
|                                                        |
|  favorite/ (planned)                                   |
|    Favorite endpoints (REST: /api/favorites)           |
|    Favorite management, persistence                    |
|                                                        |
|  mealplan/ (planned)                                   |
|    Meal-plan endpoints (REST: /api/meal-plans)         |
|    Plan CRUD, persistence                              |
|    Meal-suggestion logic                               |
|                                                        |
|  admin/ (planned)                                      |
|    Admin endpoints (REST: /api/admin/**)               |
|    ADMIN role required; reuses domain services         |
|                                                        |
|  db/                                                   |
|    Shared JPA base for entities                        |
|                                                        |
|  SPA route forwarding for non-API routes               |
+--------------------------------------------------------+
```

## 5.3 Level 2 -- Frontend Components

```
src/main/webapp/app/
+------------------------------------------------+
|  security/                                     |
|    Login form                                  |
|    Registration form and success view          |
|    Token management                            |
|    JWT attachment on outgoing requests         |
|                                                |
|  recipe/ (planned)                             |
|    Recipe list (search and filter)             |
|    Read-only cooking view                      |
|    Add / edit recipe form                      |
|    API communication                           |
|                                                |
|  favorite/ (planned)                           |
|    Favorite toggling                           |
|                                                |
|  meal-plan/ (planned)                          |
|    Weekly plan view                            |
|    Slot configuration                          |
|    Suggestion handling                         |
|    API communication                           |
|                                                |
|  admin/ (planned)                              |
|    Admin area layout and navigation            |
|    User list and edit                          |
|    Recipe list and edit                        |
|    Ingredient list and edit                    |
|    Route guard restricting area to ADMIN role  |
|    API communication                           |
|                                                |
|  utility/                                      |
|    Browser storage                             |
+------------------------------------------------+
```
