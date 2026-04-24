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
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private static final String ENCODED_KEY = "tFwpdBXfdVp5ri4doCZdu8dKlFEl3+YgTI/aYiOQAmE=";

  private final SecretKey key;

  public JwtService() {
    this.key = new SecretKeySpec(Decoders.BASE64.decode(ENCODED_KEY), "HmacSHA256");
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
