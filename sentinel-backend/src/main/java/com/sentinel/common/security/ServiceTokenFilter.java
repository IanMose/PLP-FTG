package com.sentinel.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Set;

/**
 * Filter for service-to-service authentication via X-Service-Token header.
 * Used by Python ML scripts (retrain.py, load.py) to call backend APIs.
 *
 * If the token matches ${SERVICE_TOKEN} env var, grants ML_ADMIN role.
 * If token is blank/missing, falls through to JWT filter (normal auth).
 *
 * Applied only to specific endpoints:
 * - GET /api/ml/feedback-export
 * - POST /api/ml/model-registry
 * - POST /api/ml/training-run
 */
@Component
@Slf4j
public class ServiceTokenFilter extends OncePerRequestFilter {

    private static final String HEADER_NAME = "X-Service-Token";
    
    /** Endpoints that accept service token auth */
    private static final Set<String> SERVICE_TOKEN_PATHS = Set.of(
        "/api/ml/feedback-export",
        "/api/ml/model-registry",
        "/api/ml/training-run"
    );

    @Value("${SERVICE_TOKEN:}")
    private String serviceToken;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        
        String path = request.getRequestURI();
        String token = request.getHeader(HEADER_NAME);
        
        // Only apply to specific endpoints
        if (isServiceTokenPath(path) && token != null && !token.isBlank()) {
            if (serviceToken != null && !serviceToken.isBlank() && serviceToken.equals(token)) {
                // Valid service token — grant ML_ADMIN + ADMIN roles
                log.debug("ServiceTokenFilter: valid service token for path {}", path);
                
                List<SimpleGrantedAuthority> authorities = List.of(
                    new SimpleGrantedAuthority("ROLE_ML_ADMIN"),
                    new SimpleGrantedAuthority("ROLE_ADMIN"),
                    new SimpleGrantedAuthority("ROLE_SERVICE")
                );
                
                UsernamePasswordAuthenticationToken auth = 
                    new UsernamePasswordAuthenticationToken("service-account", null, authorities);
                SecurityContextHolder.getContext().setAuthentication(auth);
            } else {
                log.warn("ServiceTokenFilter: invalid service token for path {}", path);
                // Don't block — let the JWT filter handle it (might have valid JWT)
            }
        }
        
        filterChain.doFilter(request, response);
    }
    
    private boolean isServiceTokenPath(String path) {
        return SERVICE_TOKEN_PATHS.stream().anyMatch(path::startsWith);
    }
}
