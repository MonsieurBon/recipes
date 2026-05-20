package ch.ethy.recipes.security;

class JwtSecretMisconfigurationException extends RuntimeException {
  JwtSecretMisconfigurationException(String message) {
    super(message);
  }

  JwtSecretMisconfigurationException(String message, Throwable cause) {
    super(message, cause);
  }
}
