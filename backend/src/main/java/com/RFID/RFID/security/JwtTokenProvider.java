package com.RFID.RFID.security;

import com.RFID.RFID.model.Role;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {

    private final JwtService jwtService;

    public JwtTokenProvider(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    public String generateToken(Long userId, String email, Role role) {
        return jwtService.generateToken(userId, email, role);
    }

    public boolean validateToken(String token) {
        return jwtService.validateToken(token);
    }

    public String getEmailFromToken(String token) {
        return jwtService.getEmailFromToken(token);
    }

    public Long getUserIdFromToken(String token) {
        return jwtService.getUserIdFromToken(token);
    }

    public Role getRoleFromToken(String token) {
        return jwtService.getRoleFromToken(token);
    }
}
