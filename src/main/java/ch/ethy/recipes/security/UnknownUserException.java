package ch.ethy.recipes.security;

/** Thrown when a token references a user that no longer exists. */
public class UnknownUserException extends RuntimeException {
  public UnknownUserException() {
    super("Token references a user that no longer exists");
  }
}
