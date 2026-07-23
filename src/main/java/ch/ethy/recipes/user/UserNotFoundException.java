package ch.ethy.recipes.user;

/** Thrown when an admin action targets a user id that does not exist. Surfaces as a 404. */
public class UserNotFoundException extends RuntimeException {
  public UserNotFoundException(long id) {
    super("No user with id " + id);
  }
}
