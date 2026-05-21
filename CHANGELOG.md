## [2.0.3](https://github.com/MonsieurBon/recipes/compare/v2.0.2...v2.0.3) (2026-05-21)


### Bug Fixes

* **security:** require exp claim on JWTs and reject expired tokens ([d89474a](https://github.com/MonsieurBon/recipes/commit/d89474a653d6788272a8a797a95f9f29a625e379)), closes [#143](https://github.com/MonsieurBon/recipes/issues/143) [#142](https://github.com/MonsieurBon/recipes/issues/142)

## [2.0.2](https://github.com/MonsieurBon/recipes/compare/v2.0.1...v2.0.2) (2026-05-20)


### Bug Fixes

* **security:** default Hibernate ddl-auto to validate ([a8dc930](https://github.com/MonsieurBon/recipes/commit/a8dc9306e15679377953a427415ffec5faa54540))
* **security:** drop show-sql from default profile ([1b68d24](https://github.com/MonsieurBon/recipes/commit/1b68d243d588c788d36aee50045ea2102e1383e4))

## [2.0.1](https://github.com/MonsieurBon/recipes/compare/v2.0.0...v2.0.1) (2026-05-20)


### Bug Fixes

* **security:** restrict user lookup endpoints to admins ([e58b633](https://github.com/MonsieurBon/recipes/commit/e58b633bb2511340724c1195160d7e341e21aa8a))

# [2.0.0](https://github.com/MonsieurBon/recipes/compare/v1.5.0...v2.0.0) (2026-05-20)


* fix(security)!: externalize JWT signing key with startup validation ([a36f7c8](https://github.com/MonsieurBon/recipes/commit/a36f7c82396f87855770cc410afefa295770792d))


### BREAKING CHANGES

* The application now requires a JWT_SECRET environment
variable at startup. Generate one with `openssl rand -base64 48` and
set it in the deployment environment before upgrading. Existing tokens
issued with the previous (now-rotated) key will be invalidated.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>

# [1.5.0](https://github.com/MonsieurBon/recipes/compare/v1.4.0...v1.5.0) (2026-05-20)


### Features

* include user role in JWT and authorize from the token claim ([3843c52](https://github.com/MonsieurBon/recipes/commit/3843c521cdef827b73d6e3a8b3b8f59a1c3aa53d))

# [1.4.0](https://github.com/MonsieurBon/recipes/compare/v1.3.0...v1.4.0) (2026-03-27)


### Features

* prevent duplicate usernames and emails ([d6f8565](https://github.com/MonsieurBon/recipes/commit/d6f85652df0139ebc264f25cb5cd1510924ca60e))

# [1.3.0](https://github.com/MonsieurBon/recipe/compare/v1.2.0...v1.3.0) (2026-03-18)


### Bug Fixes

* formatting ([4bc72c7](https://github.com/MonsieurBon/recipe/commit/4bc72c771e14cc6493f6448bd9ea816c8ff2e7e3))
* update package-lock.json ([4a33e2e](https://github.com/MonsieurBon/recipe/commit/4a33e2e04d8b951d5dcc7a83b4dd3e36692d206a))


### Features

* add register functionality ([007d0fd](https://github.com/MonsieurBon/recipe/commit/007d0fd05eb0c2418cc74613f880c49784664223))

# [1.2.0](https://github.com/MonsieurBon/recipe/compare/v1.1.0...v1.2.0) (2026-02-04)


### Features

* add toolbar to top of UI ([191651b](https://github.com/MonsieurBon/recipe/commit/191651bd9efa0a26de5e06bc9a812fcf69ce9790))
* load fonts locally ([f23af95](https://github.com/MonsieurBon/recipe/commit/f23af955e28518951b94880b7c2a4b4b96fbe52e))

# [1.1.0](https://github.com/MonsieurBon/recipe/compare/v1.0.0...v1.1.0) (2026-01-23)


### Features

* make database host and port configurable ([641383a](https://github.com/MonsieurBon/recipe/commit/641383a3ba7e3007a8b6d85348163d36e6cb7559))
