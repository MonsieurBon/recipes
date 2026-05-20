package ch.ethy.recipes.security;

import org.springframework.boot.diagnostics.AbstractFailureAnalyzer;
import org.springframework.boot.diagnostics.FailureAnalysis;

public class JwtSecretFailureAnalyzer
    extends AbstractFailureAnalyzer<JwtSecretMisconfigurationException> {

  @Override
  protected FailureAnalysis analyze(
      Throwable rootFailure, JwtSecretMisconfigurationException cause) {
    String action =
        "Set the JWT_SECRET environment variable to a base64-encoded HMAC-SHA256 key. Generate"
            + " one with: openssl rand -base64 48";
    return new FailureAnalysis(cause.getMessage(), action, cause);
  }
}
