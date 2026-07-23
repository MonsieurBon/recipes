package ch.ethy.recipes.user;

/**
 * Thrown when deactivating a user would leave no active admin, which would lock everyone out of
 * administration. Surfaces as a 409.
 */
public class LastActiveAdminException extends RuntimeException {}
