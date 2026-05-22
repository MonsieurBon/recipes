package ch.ethy.recipes.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
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
import java.util.HashSet;
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

  private static final Duration ACCESS_TTL = Duration.ofMinutes(15);
  private static final Duration REFRESH_TTL = Duration.ofDays(7);

  private final JwtService jwtService = new JwtService(TEST_ENCODED_KEY, ACCESS_TTL, REFRESH_TTL);

  @Test
  void accessTokenCarriesUserIdUsernameRolesAndVersion() {
    String token = jwtService.generateAccessToken(42L, "alice", Set.of(Role.USER, Role.ADMIN), 3);

    JwtService.TokenData data = jwtService.parseToken(token);
    assertEquals(42L, data.userId());
    assertEquals("alice", data.username());
    assertEquals(Set.of(Role.USER, Role.ADMIN), data.roles());
    assertEquals(3, data.version());
    assertEquals(TokenType.ACCESS, data.type());
  }

  @Test
  void refreshTokenCarriesNoRolesAndIsTypedRefresh() {
    String token = jwtService.generateRefreshToken(42L, "alice");

    JwtService.TokenData data = jwtService.parseToken(token);
    assertEquals(42L, data.userId());
    assertEquals("alice", data.username());
    assertTrue(data.roles().isEmpty());
    assertEquals(TokenType.REFRESH, data.type());
  }

  @Test
  void refreshTokenOmitsRolesAndVersionClaims() {
    // The refresh path re-reads the user from the DB, so neither claim is read off the token;
    // omitting them keeps the wire format honest about what is actually trusted.
    String token = jwtService.generateRefreshToken(42L, "alice");

    Claims claims = claimsOf(token);
    assertNull(claims.get("roles"));
    assertNull(claims.get("ver"));
  }

  @Test
  void accessTokenSerializesRolesAsEnumNameStrings() {
    // Pins the JWT wire format: 'roles' is a JSON array of Role.name() strings, not authorities.
    String token = jwtService.generateAccessToken(1L, "alice", Set.of(Role.USER, Role.ADMIN), 0);

    List<?> rolesClaim =
        Jwts.parser()
            .verifyWith(SIGNING_KEY)
            .build()
            .parseSignedClaims(token)
            .getPayload()
            .get("roles", List.class);

    assertEquals(Set.of("USER", "ADMIN"), new HashSet<>(rolesClaim));
  }

  @Test
  void parseTokenIgnoresUnknownRoleStrings() {
    String tokenWithBogusRole =
        baseToken().claim("roles", Arrays.asList("USER", "X", null)).compact();

    assertEquals(Set.of(Role.USER), jwtService.parseToken(tokenWithBogusRole).roles());
  }

  @Test
  void parseTokenRejectsTokenMissingUsernameClaim() {
    String token =
        Jwts.builder()
            .subject("User Details")
            .claim("uid", 1L)
            .claim("ver", 0)
            .claim("type", "ACCESS")
            .issuer("recipes")
            .expiration(Date.from(Instant.now().plus(ACCESS_TTL)))
            .signWith(SIGNING_KEY)
            .compact();

    assertThrows(MalformedJwtException.class, () -> jwtService.parseToken(token));
  }

  @Test
  void parseTokenRejectsTokenMissingUserId() {
    String token =
        Jwts.builder()
            .subject("User Details")
            .claim("usernameOrEmail", "alice")
            .claim("ver", 0)
            .claim("type", "ACCESS")
            .issuer("recipes")
            .expiration(Date.from(Instant.now().plus(ACCESS_TTL)))
            .signWith(SIGNING_KEY)
            .compact();

    assertThrows(MalformedJwtException.class, () -> jwtService.parseToken(token));
  }

  @Test
  void parseTokenRejectsTokenMissingVersion() {
    String token =
        Jwts.builder()
            .subject("User Details")
            .claim("uid", 1L)
            .claim("usernameOrEmail", "alice")
            .claim("type", "ACCESS")
            .issuer("recipes")
            .expiration(Date.from(Instant.now().plus(ACCESS_TTL)))
            .signWith(SIGNING_KEY)
            .compact();

    assertThrows(MalformedJwtException.class, () -> jwtService.parseToken(token));
  }

  @Test
  void parseTokenRejectsTokenMissingType() {
    String token =
        Jwts.builder()
            .subject("User Details")
            .claim("uid", 1L)
            .claim("usernameOrEmail", "alice")
            .claim("ver", 0)
            .issuer("recipes")
            .expiration(Date.from(Instant.now().plus(ACCESS_TTL)))
            .signWith(SIGNING_KEY)
            .compact();

    assertThrows(MalformedJwtException.class, () -> jwtService.parseToken(token));
  }

  @Test
  void parseTokenRejectsUnknownType() {
    String token = baseToken().claim("type", "BOGUS").compact();

    assertThrows(MalformedJwtException.class, () -> jwtService.parseToken(token));
  }

  @Test
  void constructorRejectsMissingSecret() {
    JwtMisconfigurationException thrown =
        assertThrows(
            JwtMisconfigurationException.class, () -> new JwtService("", ACCESS_TTL, REFRESH_TTL));

    assertTrue(thrown.getMessage().toLowerCase().contains("jwt.secret"));
    assertTrue(thrown.getMessage().toLowerCase().contains("jwt_secret"));
  }

  @Test
  void constructorRejectsShortSecret() {
    String shortKey = Base64.getEncoder().encodeToString(new byte[16]);

    JwtMisconfigurationException thrown =
        assertThrows(
            JwtMisconfigurationException.class,
            () -> new JwtService(shortKey, ACCESS_TTL, REFRESH_TTL));

    assertTrue(thrown.getMessage().contains("32 bytes"));
  }

  @Test
  void constructorRejectsInvalidBase64() {
    assertThrows(
        JwtMisconfigurationException.class,
        () -> new JwtService("not valid base64 !@#$", ACCESS_TTL, REFRESH_TTL));
  }

  @Test
  void constructorRejectsNonPositiveAccessTtl() {
    JwtMisconfigurationException thrown =
        assertThrows(
            JwtMisconfigurationException.class,
            () -> new JwtService(TEST_ENCODED_KEY, Duration.ZERO, REFRESH_TTL));

    assertTrue(thrown.getMessage().toLowerCase().contains("access"));
  }

  @Test
  void constructorRejectsNonPositiveRefreshTtl() {
    JwtMisconfigurationException thrown =
        assertThrows(
            JwtMisconfigurationException.class,
            () -> new JwtService(TEST_ENCODED_KEY, ACCESS_TTL, Duration.ofSeconds(-1)));

    assertTrue(thrown.getMessage().toLowerCase().contains("refresh"));
  }

  @Test
  void constructorRejectsAccessTtlAboveCeiling() {
    JwtMisconfigurationException thrown =
        assertThrows(
            JwtMisconfigurationException.class,
            () -> new JwtService(TEST_ENCODED_KEY, Duration.ofDays(31), REFRESH_TTL));

    assertTrue(thrown.getMessage().contains("P30D"));
  }

  @Test
  void constructorRejectsRefreshTtlAboveCeiling() {
    JwtMisconfigurationException thrown =
        assertThrows(
            JwtMisconfigurationException.class,
            () -> new JwtService(TEST_ENCODED_KEY, ACCESS_TTL, Duration.ofDays(31)));

    assertTrue(thrown.getMessage().contains("P30D"));
  }

  @Test
  void constructorAcceptsRefreshTtlAtCeiling() {
    new JwtService(TEST_ENCODED_KEY, ACCESS_TTL, Duration.ofDays(30));
  }

  @Test
  void accessTokenExpiresByAccessTtl() {
    Instant before = Instant.now();
    String token = jwtService.generateAccessToken(1L, "alice", Set.of(), 0);
    Instant after = Instant.now();

    Date exp = claimsOf(token).getExpiration();
    assertNotNull(exp);
    Instant expInstant = exp.toInstant();
    assertTrue(!expInstant.isBefore(before.plus(ACCESS_TTL).minusSeconds(1)));
    assertTrue(!expInstant.isAfter(after.plus(ACCESS_TTL).plusSeconds(1)));
  }

  @Test
  void refreshTokenExpiresByRefreshTtl() {
    Instant before = Instant.now();
    String token = jwtService.generateRefreshToken(1L, "alice");
    Instant after = Instant.now();

    Date exp = claimsOf(token).getExpiration();
    assertNotNull(exp);
    Instant expInstant = exp.toInstant();
    assertTrue(!expInstant.isBefore(before.plus(REFRESH_TTL).minusSeconds(1)));
    assertTrue(!expInstant.isAfter(after.plus(REFRESH_TTL).plusSeconds(1)));
  }

  @Test
  void parseTokenRejectsExpiredToken() {
    String expired = baseToken().expiration(Date.from(Instant.now().minusSeconds(60))).compact();

    assertThrows(ExpiredJwtException.class, () -> jwtService.parseToken(expired));
  }

  @Test
  void parseTokenRejectsTokenWithoutExpClaim() {
    String token =
        Jwts.builder()
            .subject("User Details")
            .claim("uid", 1L)
            .claim("usernameOrEmail", "alice")
            .claim("ver", 0)
            .claim("type", "ACCESS")
            .issuer("recipes")
            .signWith(SIGNING_KEY)
            .compact();

    assertThrows(MalformedJwtException.class, () -> jwtService.parseToken(token));
  }

  @Test
  void parseTokenRejectsTokenWithWrongSubject() {
    String tampered = baseToken().subject("Not User Details").compact();

    assertThrows(
        io.jsonwebtoken.IncorrectClaimException.class, () -> jwtService.parseToken(tampered));
  }

  private static io.jsonwebtoken.JwtBuilder baseToken() {
    return Jwts.builder()
        .subject("User Details")
        .claim("uid", 1L)
        .claim("usernameOrEmail", "alice")
        .claim("ver", 0)
        .claim("type", "ACCESS")
        .issuer("recipes")
        .expiration(Date.from(Instant.now().plus(ACCESS_TTL)))
        .signWith(SIGNING_KEY);
  }

  private static Claims claimsOf(String token) {
    return Jwts.parser().verifyWith(SIGNING_KEY).build().parseSignedClaims(token).getPayload();
  }
}
