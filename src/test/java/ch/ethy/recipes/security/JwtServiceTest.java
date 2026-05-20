package ch.ethy.recipes.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ch.ethy.recipes.user.Role;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import java.util.Arrays;
import java.util.Base64;
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

  private final JwtService jwtService = new JwtService(TEST_ENCODED_KEY);

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
            .signWith(SIGNING_KEY)
            .compact();

    assertThrows(JwtException.class, () -> jwtService.parseToken(tokenMissingUsername));
  }

  @Test
  void constructorRejectsMissingSecret() {
    JwtSecretMisconfigurationException thrown =
        assertThrows(JwtSecretMisconfigurationException.class, () -> new JwtService(""));

    assertTrue(thrown.getMessage().toLowerCase().contains("jwt.secret"));
    assertTrue(thrown.getMessage().toLowerCase().contains("jwt_secret"));
  }

  @Test
  void constructorRejectsShortSecret() {
    String shortKey = Base64.getEncoder().encodeToString(new byte[16]);

    JwtSecretMisconfigurationException thrown =
        assertThrows(JwtSecretMisconfigurationException.class, () -> new JwtService(shortKey));

    assertTrue(thrown.getMessage().contains("32 bytes"));
  }

  @Test
  void constructorRejectsInvalidBase64() {
    assertThrows(
        JwtSecretMisconfigurationException.class, () -> new JwtService("not valid base64 !@#$"));
  }

  @Test
  void parseTokenRejectsTokenWithWrongSubject() {
    String tampered =
        Jwts.builder()
            .subject("Not User Details")
            .claim("usernameOrEmail", "alice")
            .issuer("recipes")
            .signWith(SIGNING_KEY)
            .compact();

    assertThrows(
        io.jsonwebtoken.IncorrectClaimException.class, () -> jwtService.parseToken(tampered));
  }
}
