package ch.ethy.recipes.security;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.web.filter.OncePerRequestFilter;

@Service
public class JWTFilter extends OncePerRequestFilter {
  private final JwtService jwtService;
  private final TokenVersionService tokenVersionService;

  public JWTFilter(JwtService jwtService, TokenVersionService tokenVersionService) {
    this.jwtService = jwtService;
    this.tokenVersionService = tokenVersionService;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String authHeader = request.getHeader("Authorization");
    if (authHeader != null && authHeader.startsWith("Bearer ")) {
      String token = authHeader.substring("Bearer ".length());
      if (token.isBlank()) {
        response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid token");
        return;
      }
      try {
        JwtService.TokenData tokenData = jwtService.parseToken(token);
        if (!isUsableAccessToken(tokenData)) {
          response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token");
          return;
        }
        // The principal authenticates solely via the validated JWT, so its password is never
        // checked. The {noop} prefix keeps that explicit and degrades gracefully (a non-match,
        // not a DelegatingPasswordEncoder parse failure) if it ever reaches a password check.
        UserDetails userDetails =
            User.withUsername(tokenData.username())
                .password("{noop}NONE")
                .authorities(tokenData.roles())
                .build();
        Authentication authentication = new JWTAuthenticationToken(userDetails, token);

        if (SecurityContextHolder.getContext().getAuthentication() == null) {
          SecurityContextHolder.getContext().setAuthentication(authentication);
        }
      } catch (JwtException | UnknownUserException e) {
        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token");
        return;
      }
    }

    // Requests without a Bearer header pass through unauthenticated; Spring Security's
    // authorizeHttpRequests rules decide whether the target endpoint requires auth.
    filterChain.doFilter(request, response);
  }

  // Only access tokens authenticate requests, and only while their version still matches the
  // user's current token version — a revocation bumps that version and invalidates the token.
  private boolean isUsableAccessToken(JwtService.TokenData tokenData) {
    return tokenData.type() == TokenType.ACCESS
        && tokenData.version() == tokenVersionService.getCurrentVersion(tokenData.userId());
  }
}
