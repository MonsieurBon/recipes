# 6. Runtime View

## 6.1 User Login

```
Browser                 Auth API                 Tokens                  DB
  |- POST /api/auth/login ---->                       |                   |
  |                           |- verify credentials -->                   |
  |                           |                       |- load user ------->
  |                           |                       <- user ------------|
  |                           |- issue tokens -------->                   |
  |                           <- access + refresh ----|                   |
  |<- 200 { token, roles } + Set-Cookie: refreshToken (HttpOnly)          |
```

The access token is returned in the body; the refresh token is delivered out-of-band as an
`HttpOnly` cookie, so it is never readable by JavaScript. Invalid credentials yield 401; a request
missing or blanking either field is rejected with 400 before authentication is attempted.

## 6.2 Token Refresh

```
Browser                 Auth API                 Tokens                  DB
  |- POST /api/auth/refresh -->                       |                   |
  |  Cookie: refreshToken     |                       |                   |
  |                           |- parse / verify token >                   |
  |                           |                       |- load user ------->
  |                           |                       <- user ------------|
  |                           |- issue tokens -------->                   |
  |                           <- access + refresh ----|                   |
  |<- 200 { token, roles } + Set-Cookie: refreshToken (HttpOnly)          |
```

The refresh token arrives as a cookie (not a request body) and a rotated one is set on the
response. A missing cookie yields 401.

## 6.3 Generate Meal Plan Suggestions

```
Browser                   Meal-plan API            Plan logic             Suggestions                  DB
  |- POST /api/meal-plans/suggest >                       |                       |                     |
  |                               |- generate ------------>                       |                     |
  |                               |                       |- read slot config -------------------------->
  |                               |                       <- slots -------------------------------------|
  |                               |                       |- read favorites ---------------------------->
  |                               |                       <- favorites ---------------------------------|
  |                               |                       |- read recent history ----------------------->
  |                               |                       <- recent ------------------------------------|
  |                               |                       |- rank candidates ----->                     |
  |                               |                       | (filter by seasonality,                     |
  |                               |                       |  exclude recent,      |                     |
  |                               |                       |  mix favorites + others)                    |
  |                               |                       <- suggestions ---------|                     |
  |                               <- plan draft ----------|                       |                     |
  |<- 200 { plan }                |                       |                       |                     |
```

## 6.4 Adjust Meal Plan

```
Browser                         Meal-plan API            Plan logic                DB
  |- PATCH /api/meal-plans/{id} -------->                       |                   |
  |  { replace: [slotId], with: recipeId }                      |                   |
  |                                     |- update -------------->                   |
  |                                     |                       |- save ------------>
  |                                     |                       <- ok --------------|
  |                                     <- updated plan --------|                   |
  |<- 200 { plan }                      |                       |                   |
```
