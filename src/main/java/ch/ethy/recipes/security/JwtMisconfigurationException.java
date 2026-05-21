package ch.ethy.recipes.security;

class JwtMisconfigurationException extends RuntimeException {
  JwtMisconfigurationException(String message) {
    super(message);
  }

  JwtMisconfigurationException(String message, Throwable cause) {
    super(message, cause);
  }
}
