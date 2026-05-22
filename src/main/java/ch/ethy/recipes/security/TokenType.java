package ch.ethy.recipes.security;

/** Distinguishes a short-lived access token from a long-lived refresh token. */
public enum TokenType {
  ACCESS,
  REFRESH
}
