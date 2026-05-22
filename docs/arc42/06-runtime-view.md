# 6. Runtime View

## 6.1 User Login

```
Browser                  AuthController      AuthService       JwtService          DB
  |-- POST /api/auth/login -->|                   |                   |             |
  |                           |-- authenticate -->|                   |             |
  |                           |                   |--- loadUser ------|------------>|
  |                           |                   |<--- User ---------|-------------|
  |                           |                   |-- issue tokens -->|             |
  |                           |<- access+refresh -|<------------------|             |
  |<-- 200 { token, roles } + Set-Cookie: refreshToken (HttpOnly) ----|             |
```

The access token is returned in the body; the refresh token is delivered out-of-band as an
`HttpOnly` cookie, so it is never readable by JavaScript.

## 6.2 Token Refresh

```
Browser                  AuthController      AuthService       JwtService          DB
  |-- POST /api/auth/refresh ->|                  |                   |             |
  |   Cookie: refreshToken     |-- refresh ------>|                   |             |
  |                            |                  |-- parse/verify -->|             |
  |                            |                  |--- loadUser ------|------------>|
  |                            |                  |<--- User ---------|-------------|
  |                            |                  |-- issue tokens -->|             |
  |                            |<- access+refresh-|<------------------|             |
  |<-- 200 { token, roles } + Set-Cookie: refreshToken (HttpOnly) ----|             |
```

The refresh token arrives as a cookie (not a request body) and a rotated one is set on the
response. A missing cookie yields 401.

## 6.3 Generate Meal Plan Suggestions

```
Browser                       MealPlanController    MealPlanService            SuggestionService       DB
  |-- POST /api/meal-plans/suggest -->|                    |                           |               |
  |                                   |--- generate ------>|                           |               |
  |                                   |                    |--- getSlotConfig ---------|-------------->|
  |                                   |                    |<-- slots -----------------|---------------|
  |                                   |                    |--- getFavorites ----------|-------------->|
  |                                   |                    |<-- favorites -------------|---------------|
  |                                   |                    |--- getRecent -------------|-------------->|
  |                                   |                    |<-- recent ----------------|---------------|
  |                                   |                    |--- suggest -------------->|               |
  |                                   |                    |  (filter by ingredient    |               |
  |                                   |                    |   seasonality,            |               |
  |                                   |                    |   exclude recent,         |               |
  |                                   |                    |   mix favorites + others) |               |
  |                                   |                    |<-- suggestions -----------|               |
  |                                   |<-- plan draft -----|                           |               |
  |<-- 200 { plan } ------------------|                    |                           |               |
```

## 6.4 Adjust Meal Plan

```
Browser                              MealPlanController  MealPlanService         DB
  |--- PATCH /api/meal-plans/{id} --------->|                   |                |
  |   { replace: [slotId], with: recipeId } |                   |                |
  |                                         |--- update ------->|                |
  |                                         |                   |--- save ------>|
  |                                         |                   |<-- ok ---------|
  |                                         |<-- updated plan --|                |
  |<-- 200 { plan } ------------------------|                   |                |
```
