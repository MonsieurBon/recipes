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

  public JWTFilter(JwtService jwtService) {
    this.jwtService = jwtService;
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
        UserDetails userDetails = new User(tokenData.username(), "", tokenData.roles());
        Authentication authentication = new JWTAuthenticationToken(userDetails, token);

        if (SecurityContextHolder.getContext().getAuthentication() == null) {
          SecurityContextHolder.getContext().setAuthentication(authentication);
        }
      } catch (JwtException e) {
        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token");
        return;
      }
    }

    // Requests without a Bearer header pass through unauthenticated; Spring Security's
    // authorizeHttpRequests rules decide whether the target endpoint requires auth.
    filterChain.doFilter(request, response);
  }
}
