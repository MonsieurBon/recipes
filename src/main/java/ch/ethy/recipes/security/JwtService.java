package ch.ethy.recipes.security;

import ch.ethy.recipes.user.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.IncorrectClaimException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.MissingClaimException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.SignatureException;
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

  private final SecretKey key;

  public JwtService(@Value("${jwt.secret:}") String encodedKey) {
    if (encodedKey == null || encodedKey.isBlank()) {
      throw new JwtSecretMisconfigurationException(
          "jwt.secret is not configured. Set the JWT_SECRET environment variable to a"
              + " base64-encoded HMAC-SHA256 key.");
    }
    byte[] decoded;
    try {
      decoded = Decoders.BASE64.decode(encodedKey);
    } catch (RuntimeException e) {
      throw new JwtSecretMisconfigurationException(
          "jwt.secret (JWT_SECRET) is not valid base64.", e);
    }
    if (decoded.length < MIN_KEY_BYTES) {
      throw new JwtSecretMisconfigurationException(
          "jwt.secret (JWT_SECRET) must decode to at least 32 bytes (256 bits) for HMAC-SHA256;"
              + " got "
              + decoded.length
              + " byte(s).");
    }
    this.key = new SecretKeySpec(decoded, "HmacSHA256");
  }

  public String generateToken(String username, Set<Role> roles) {
    return Jwts.builder()
        .subject("User Details")
        .claim("usernameOrEmail", username)
        .claim("roles", roles.stream().map(Role::name).toList())
        .issuedAt(new Date())
        .issuer("recipes")
        .signWith(key)
        .compact();
  }

  public TokenData parseToken(String token)
      throws SignatureException,
          MalformedJwtException,
          ExpiredJwtException,
          UnsupportedJwtException,
          IncorrectClaimException,
          MissingClaimException {
    Claims claims =
        Jwts.parser()
            .verifyWith(this.key)
            .requireSubject("User Details")
            .build()
            .parseSignedClaims(token)
            .getPayload();
    String username = claims.get("usernameOrEmail", String.class);
    if (username == null) {
      throw new JwtException("Required claim 'usernameOrEmail' is missing");
    }
    return new TokenData(username, toRoles(claims.get("roles")));
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

  public record TokenData(String username, Set<Role> roles) {}
}
