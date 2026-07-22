package com.RFID.RFID.security;

import com.RFID.RFID.dto.Envelope;
import com.RFID.RFID.service.AuditService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import java.io.IOException;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final AuditService auditService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter, AuditService auditService) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.auditService = auditService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/login").permitAll()
                .requestMatchers("/api/taps").permitAll()
                .requestMatchers("/api/health").permitAll()
                .requestMatchers("/api/auth/forgot-password").permitAll()
                .requestMatchers("/swagger-ui/**").permitAll()
                .requestMatchers("/v3/api-docs/**").permitAll()
                .requestMatchers("/swagger-ui.html").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    // Send uniform error envelope for unauthorized access
                    sendErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "UNAUTHORIZED", "Full authentication is required to access this resource.");
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    // Log the unauthorized access attempt
                    auditService.log("UNAUTHORIZED_ACCESS_ATTEMPT", "API", request.getRequestURI());
                    
                    // Send uniform error envelope for access denied
                    sendErrorResponse(response, HttpServletResponse.SC_FORBIDDEN, "FORBIDDEN", "You do not have permission to access this resource.");
                })
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private void sendErrorResponse(HttpServletResponse response, int statusCode, String errorCode, String errorMessage) throws IOException {
        response.setStatus(statusCode);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        Envelope envelope = Envelope.error(errorCode, errorMessage);
        response.getWriter().write(objectMapper.writeValueAsString(envelope));
    }
}
