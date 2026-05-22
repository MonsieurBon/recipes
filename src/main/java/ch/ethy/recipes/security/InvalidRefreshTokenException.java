package ch.ethy.recipes.security;

/** Thrown when a presented refresh token is missing, malformed, of the wrong type, or revoked. */
public class InvalidRefreshTokenException extends RuntimeException {
  public InvalidRefreshTokenException(String message) {
    super(message);
  }
}
