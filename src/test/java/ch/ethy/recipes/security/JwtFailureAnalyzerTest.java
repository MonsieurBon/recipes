package ch.ethy.recipes.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.boot.diagnostics.FailureAnalysis;

class JwtFailureAnalyzerTest {

  private final JwtFailureAnalyzer analyzer = new JwtFailureAnalyzer();

  @Test
  void describesSecretMisconfigurationAndSuggestsTheGenerationCommand() {
    JwtMisconfigurationException cause = new JwtMisconfigurationException("jwt.secret is missing");

    FailureAnalysis analysis = analyzer.analyze(cause);

    assertNotNull(analysis);
    assertEquals("jwt.secret is missing", analysis.getDescription());
    assertTrue(analysis.getAction().contains("openssl rand -base64 48"));
    assertEquals(cause, analysis.getCause());
  }

  @Test
  void describesTtlMisconfigurationAndMentionsIsoDuration() {
    JwtMisconfigurationException cause =
        new JwtMisconfigurationException("jwt.ttl must be a positive duration");

    FailureAnalysis analysis = analyzer.analyze(cause);

    assertNotNull(analysis);
    assertEquals("jwt.ttl must be a positive duration", analysis.getDescription());
    assertTrue(analysis.getAction().contains("JWT_TTL"));
    assertTrue(analysis.getAction().contains("PT24H"));
    assertTrue(analysis.getAction().contains("P30D"));
  }

  @Test
  void ignoresUnrelatedExceptions() {
    FailureAnalysis analysis = analyzer.analyze(new RuntimeException("not our problem"));

    assertNull(analysis);
  }
}
