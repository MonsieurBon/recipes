package ch.ethy.recipes.security;

import org.springframework.boot.diagnostics.AbstractFailureAnalyzer;
import org.springframework.boot.diagnostics.FailureAnalysis;

public class JwtFailureAnalyzer extends AbstractFailureAnalyzer<JwtMisconfigurationException> {

  @Override
  protected FailureAnalysis analyze(Throwable rootFailure, JwtMisconfigurationException cause) {
    String action =
        "Check JWT configuration. JWT_SECRET must be a base64-encoded HMAC-SHA256 key (generate"
            + " one with: openssl rand -base64 48). JWT_TTL must be a positive ISO-8601 duration"
            + " no longer than P30D (default: PT24H).";
    return new FailureAnalysis(cause.getMessage(), action, cause);
  }
}
