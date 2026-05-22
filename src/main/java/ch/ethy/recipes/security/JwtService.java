package ch.ethy.recipes.security;

import ch.ethy.recipes.user.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.io.Decoders;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.Date;
import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private static final int MIN_KEY_BYTES = 32;
  private static final Duration MAX_TTL = Duration.ofDays(30);

  private static final String SUBJECT = "User Details";
  private static final String CLAIM_USER_ID = "uid";
  private static final String CLAIM_USERNAME = "usernameOrEmail";
  private static final String CLAIM_ROLES = "roles";
  private static final String CLAIM_VERSION = "ver";
  private static final String CLAIM_TYPE = "type";

  private final SecretKey key;
  private final Duration accessTtl;
  private final Duration refreshTtl;

  public JwtService(
      @Value("${auth.jwt.secret}") String encodedKey,
      @Value("${auth.jwt.access-ttl}") Duration accessTtl,
      @Value("${auth.jwt.refresh-ttl}") Duration refreshTtl) {
    if (encodedKey == null || encodedKey.isBlank()) {
      throw new JwtMisconfigurationException(
          "jwt.secret is not configured. Set the JWT_SECRET environment variable to a"
              + " base64-encoded HMAC-SHA256 key.");
    }
    byte[] decoded;
    try {
      decoded = Decoders.BASE64.decode(encodedKey);
    } catch (RuntimeException e) {
      throw new JwtMisconfigurationException("jwt.secret (JWT_SECRET) is not valid base64.", e);
    }
    if (decoded.length < MIN_KEY_BYTES) {
      throw new JwtMisconfigurationException(
          "jwt.secret (JWT_SECRET) must decode to at least 32 bytes (256 bits) for HMAC-SHA256;"
              + " got "
              + decoded.length
              + " byte(s).");
    }
    this.key = new SecretKeySpec(decoded, "HmacSHA256");
    this.accessTtl = validateTtl(accessTtl, "jwt.access-ttl (JWT_ACCESS_TTL)");
    this.refreshTtl = validateTtl(refreshTtl, "jwt.refresh-ttl (JWT_REFRESH_TTL)");
  }

  private static Duration validateTtl(Duration ttl, String label) {
    if (ttl == null || !ttl.isPositive()) {
      throw new JwtMisconfigurationException(
          label + " must be a positive ISO-8601 duration (e.g. PT15M); got " + ttl + ".");
    }
    if (ttl.compareTo(MAX_TTL) > 0) {
      throw new JwtMisconfigurationException(
          label + " must not exceed P30D (30 days); got " + ttl + ".");
    }
    return ttl;
  }

  public String generateAccessToken(long userId, String username, Set<Role> roles, int version) {
    return build(userId, username, roles, version, TokenType.ACCESS, accessTtl);
  }

  public String generateRefreshToken(long userId, String username) {
    // Refresh tokens carry neither a roles nor a version claim: the refresh path re-reads the user
    // from the database rather than trusting the token, so either stamp would be dead, misleading
    // data.
    return build(userId, username, null, null, TokenType.REFRESH, refreshTtl);
  }

  private String build(
      long userId,
      String username,
      Set<Role> roles,
      Integer version,
      TokenType type,
      Duration ttl) {
    Instant now = Instant.now();
    var builder =
        Jwts.builder()
            .subject(SUBJECT)
            .claim(CLAIM_USER_ID, userId)
            .claim(CLAIM_USERNAME, username)
            .claim(CLAIM_TYPE, type.name())
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(ttl)))
            .issuer("recipes")
            .signWith(key);
    if (roles != null) {
      builder.claim(CLAIM_ROLES, roles.stream().map(Role::name).toList());
    }
    if (version != null) {
      builder.claim(CLAIM_VERSION, version);
    }
    return builder.compact();
  }

  public TokenData parseToken(String token) {
    Claims claims = parseClaims(token);
    validateRequiredClaims(claims);
    TokenType type = requireType(claims);
    Integer version = claims.get(CLAIM_VERSION, Integer.class);
    if (type == TokenType.ACCESS && version == null) {
      throw new MalformedJwtException("Required claim 'ver' is missing");
    }
    return new TokenData(
        claims.get(CLAIM_USER_ID, Long.class),
        claims.get(CLAIM_USERNAME, String.class),
        toRoles(claims.get(CLAIM_ROLES)),
        version == null ? 0 : version,
        type);
  }

  private Claims parseClaims(String token) {
    return Jwts.parser()
        .verifyWith(this.key)
        .requireSubject(SUBJECT)
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }

  private static void validateRequiredClaims(Claims claims) {
    if (claims.getExpiration() == null) {
      throw new MalformedJwtException("Required claim 'exp' is missing");
    }
    requireClaim(claims, CLAIM_USERNAME, String.class);
    requireClaim(claims, CLAIM_USER_ID, Long.class);
  }

  private static <T> void requireClaim(Claims claims, String name, Class<T> type) {
    if (claims.get(name, type) == null) {
      throw new MalformedJwtException("Required claim '" + name + "' is missing");
    }
  }

  private static TokenType requireType(Claims claims) {
    String raw = claims.get(CLAIM_TYPE, String.class);
    if (raw != null) {
      try {
        return TokenType.valueOf(raw);
      } catch (IllegalArgumentException e) {
        // fall through to the malformed-token error below
      }
    }
    throw new MalformedJwtException("Required claim 'type' is missing or invalid");
  }

  private static Set<Role> toRoles(Object raw) {
    if (!(raw instanceof Collection<?> collection)) {
      return Set.of();
    }
    return collection.stream()
        .filter(item -> item instanceof String)
        .map(item -> toRole((String) item))
        .filter(Objects::nonNull)
        .collect(Collectors.toCollection(() -> EnumSet.noneOf(Role.class)));
  }

  private static Role toRole(String name) {
    for (Role role : Role.values()) {
      if (role.name().equals(name)) {
        return role;
      }
    }
    return null;
  }

  public record TokenData(
      long userId, String username, Set<Role> roles, int version, TokenType type) {}
}
