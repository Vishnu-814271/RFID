package com.RFID.RFID.security;

import com.RFID.RFID.dto.Envelope;
import com.RFID.RFID.model.StaffUser;
import com.RFID.RFID.repository.StaffUserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.Collections;
import java.util.Optional;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final StaffUserRepository staffUserRepository;
    private final TokenBlacklistService tokenBlacklistService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider, StaffUserRepository staffUserRepository, TokenBlacklistService tokenBlacklistService) {
        this.tokenProvider = tokenProvider;
        this.staffUserRepository = staffUserRepository;
        this.tokenBlacklistService = tokenBlacklistService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();

        // 1. Bypass public paths
        if ("/api/login".equals(path) || "/api/auth/forgot-password".equals(path) || "/api/taps".equals(path) || "/api/health".equals(path)
                || path.startsWith("/swagger-ui") || path.startsWith("/v3/api-docs") || "/swagger-ui.html".equals(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        // 2. Extract Bearer Token
        String token = getJwtFromRequest(request);

        if (token != null && !tokenBlacklistService.isBlacklisted(token) && tokenProvider.validateToken(token)) {
            String email = tokenProvider.getEmailFromToken(token);
            Optional<StaffUser> userOpt = staffUserRepository.findByEmail(email);

            if (userOpt.isPresent()) {
                StaffUser user = userOpt.get();

                if (!user.isActive()) {
                    sendErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "INACTIVE_USER", "Staff account is deactivated.");
                    return;
                }

                // Forced Password Change logic:
                // If password change is required, block all requests except the change-password and logout endpoints.
                if (user.isPasswordChangeRequired() && !"/api/auth/change-password".equals(path) && !"/api/logout".equals(path)) {
                    sendErrorResponse(response, HttpServletResponse.SC_FORBIDDEN, "PASSWORD_CHANGE_REQUIRED", 
                            "Password change is forced on first login. You must update your password.");
                    return;
                }

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        user, null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
                );
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    private void sendErrorResponse(HttpServletResponse response, int statusCode, String errorCode, String errorMessage) throws IOException {
        response.setStatus(statusCode);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        Envelope envelope = Envelope.error(errorCode, errorMessage);
        response.getWriter().write(objectMapper.writeValueAsString(envelope));
    }
}
