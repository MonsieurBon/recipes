package ch.ethy.recipes.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.boot.diagnostics.FailureAnalysis;

class JwtSecretFailureAnalyzerTest {

  private final JwtSecretFailureAnalyzer analyzer = new JwtSecretFailureAnalyzer();

  @Test
  void describesTheMisconfigurationAndSuggestsTheGenerationCommand() {
    JwtSecretMisconfigurationException cause =
        new JwtSecretMisconfigurationException("jwt.secret is missing");

    FailureAnalysis analysis = analyzer.analyze(cause);

    assertNotNull(analysis);
    assertEquals("jwt.secret is missing", analysis.getDescription());
    assertTrue(analysis.getAction().contains("openssl rand -base64 48"));
    assertEquals(cause, analysis.getCause());
  }

  @Test
  void ignoresUnrelatedExceptions() {
    FailureAnalysis analysis = analyzer.analyze(new RuntimeException("not our problem"));

    assertNull(analysis);
  }
}
