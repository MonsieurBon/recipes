package ch.ethy.recipes.user;

/**
 * Thrown when an admin tries to deactivate their own account. Deactivating yourself is a footgun
 * with no use case and is refused server-side regardless of the client state. Surfaces as a 409.
 */
public class SelfDeactivationException extends RuntimeException {}
