package ch.ethy.recipes.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ch.ethy.recipes.user.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.io.Decoders;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.Set;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;

class JwtServiceTest {
  private static final String TEST_ENCODED_KEY =
      "sPYf4F91EbSV6mfc+ZoqZhVuZih8mTiyx1jjPCq8qeuBaCnOlpq8gm3XwFPFo8Sj";
  private static final SecretKey SIGNING_KEY =
      new SecretKeySpec(Decoders.BASE64.decode(TEST_ENCODED_KEY), "HmacSHA256");

  private static final Duration TEST_TTL = Duration.ofHours(1);

  private final JwtService jwtService = new JwtService(TEST_ENCODED_KEY, TEST_TTL);

  @Test
  void generateTokenEncodesUsername() {
    String token = jwtService.generateToken("alice", Set.of());

    assertEquals("alice", jwtService.parseToken(token).username());
  }

  @Test
  void generateTokenEncodesRoles() {
    String token = jwtService.generateToken("alice", Set.of(Role.USER, Role.ADMIN));

    assertEquals(Set.of(Role.USER, Role.ADMIN), jwtService.parseToken(token).roles());
  }

  @Test
  void parseTokenReturnsEmptyRolesWhenNoneEncoded() {
    String token = jwtService.generateToken("alice", Set.of());

    assertTrue(jwtService.parseToken(token).roles().isEmpty());
  }

  @Test
  void parseTokenIgnoresUnknownRoleStrings() {
    String tokenWithBogusRole =
        Jwts.builder()
            .subject("User Details")
            .claim("usernameOrEmail", "alice")
            .claim("roles", Arrays.asList("USER", "SUPERUSER", "ADMIN", null))
            .issuer("recipes")
            .expiration(Date.from(Instant.now().plus(TEST_TTL)))
            .signWith(SIGNING_KEY)
            .compact();

    assertEquals(Set.of(Role.USER, Role.ADMIN), jwtService.parseToken(tokenWithBogusRole).roles());
  }

  @Test
  void parseTokenRejectsTokenMissingUsernameClaim() {
    String tokenMissingUsername =
        Jwts.builder()
            .subject("User Details")
            .claim("roles", List.of("USER"))
            .issuer("recipes")
            .expiration(Date.from(Instant.now().plus(TEST_TTL)))
            .signWith(SIGNING_KEY)
            .compact();

    assertThrows(MalformedJwtException.class, () -> jwtService.parseToken(tokenMissingUsername));
  }

  @Test
  void constructorRejectsMissingSecret() {
    JwtMisconfigurationException thrown =
        assertThrows(JwtMisconfigurationException.class, () -> new JwtService("", TEST_TTL));

    assertTrue(thrown.getMessage().toLowerCase().contains("jwt.secret"));
    assertTrue(thrown.getMessage().toLowerCase().contains("jwt_secret"));
  }

  @Test
  void constructorRejectsShortSecret() {
    String shortKey = Base64.getEncoder().encodeToString(new byte[16]);

    JwtMisconfigurationException thrown =
        assertThrows(JwtMisconfigurationException.class, () -> new JwtService(shortKey, TEST_TTL));

    assertTrue(thrown.getMessage().contains("32 bytes"));
  }

  @Test
  void constructorRejectsInvalidBase64() {
    assertThrows(
        JwtMisconfigurationException.class,
        () -> new JwtService("not valid base64 !@#$", TEST_TTL));
  }

  @Test
  void constructorRejectsZeroTtl() {
    JwtMisconfigurationException thrown =
        assertThrows(
            JwtMisconfigurationException.class,
            () -> new JwtService(TEST_ENCODED_KEY, Duration.ZERO));

    assertTrue(thrown.getMessage().toLowerCase().contains("jwt.ttl"));
  }

  @Test
  void constructorRejectsNegativeTtl() {
    assertThrows(
        JwtMisconfigurationException.class,
        () -> new JwtService(TEST_ENCODED_KEY, Duration.ofSeconds(-1)));
  }

  @Test
  void constructorRejectsTtlAboveCeiling() {
    JwtMisconfigurationException thrown =
        assertThrows(
            JwtMisconfigurationException.class,
            () -> new JwtService(TEST_ENCODED_KEY, Duration.ofDays(31)));

    assertTrue(thrown.getMessage().toLowerCase().contains("jwt.ttl"));
    assertTrue(thrown.getMessage().contains("P30D"));
  }

  @Test
  void constructorAcceptsTtlAtCeiling() {
    new JwtService(TEST_ENCODED_KEY, Duration.ofDays(30));
  }

  @Test
  void generateTokenSetsExpClaimInFuture() {
    Instant before = Instant.now();
    String token = jwtService.generateToken("alice", Set.of());
    Instant after = Instant.now();

    Claims claims =
        Jwts.parser().verifyWith(SIGNING_KEY).build().parseSignedClaims(token).getPayload();
    Date exp = claims.getExpiration();
    assertNotNull(exp);
    // exp should fall in [before+TTL, after+TTL]
    Instant expInstant = exp.toInstant();
    assertTrue(
        !expInstant.isBefore(before.plus(TEST_TTL).minusSeconds(1)),
        "exp " + expInstant + " is earlier than before+TTL " + before.plus(TEST_TTL));
    assertTrue(
        !expInstant.isAfter(after.plus(TEST_TTL).plusSeconds(1)),
        "exp " + expInstant + " is later than after+TTL " + after.plus(TEST_TTL));
  }

  @Test
  void parseTokenRejectsExpiredToken() {
    String expired =
        Jwts.builder()
            .subject("User Details")
            .claim("usernameOrEmail", "alice")
            .issuer("recipes")
            .expiration(Date.from(Instant.now().minusSeconds(60)))
            .signWith(SIGNING_KEY)
            .compact();

    assertThrows(ExpiredJwtException.class, () -> jwtService.parseToken(expired));
  }

  @Test
  void parseTokenRejectsTokenWithoutExpClaim() {
    String tokenWithoutExp =
        Jwts.builder()
            .subject("User Details")
            .claim("usernameOrEmail", "alice")
            .issuer("recipes")
            .signWith(SIGNING_KEY)
            .compact();

    assertThrows(MalformedJwtException.class, () -> jwtService.parseToken(tokenWithoutExp));
  }

  @Test
  void parseTokenRejectsTokenWithWrongSubject() {
    String tampered =
        Jwts.builder()
            .subject("Not User Details")
            .claim("usernameOrEmail", "alice")
            .issuer("recipes")
            .expiration(Date.from(Instant.now().plus(TEST_TTL)))
            .signWith(SIGNING_KEY)
            .compact();

    assertThrows(
        io.jsonwebtoken.IncorrectClaimException.class, () -> jwtService.parseToken(tampered));
  }
}
