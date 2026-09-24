package com.RFID.RFID.auth.service;

import com.RFID.RFID.auth.dto.LoginRequest;
import com.RFID.RFID.auth.dto.LoginResponse;
import com.RFID.RFID.dto.DTOs.ChangePasswordRequest;
import com.RFID.RFID.exception.BadRequestException;
import com.RFID.RFID.exception.ResourceNotFoundException;
import com.RFID.RFID.model.StaffUser;
import com.RFID.RFID.repository.StaffUserRepository;
import com.RFID.RFID.security.JwtService;
import com.RFID.RFID.security.TokenBlacklistService;
import com.RFID.RFID.service.AuditService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final StaffUserRepository staffUserRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final TokenBlacklistService tokenBlacklistService;

    public AuthService(StaffUserRepository staffUserRepository,
                       JwtService jwtService,
                       PasswordEncoder passwordEncoder,
                       AuditService auditService,
                       TokenBlacklistService tokenBlacklistService) {
        this.staffUserRepository = staffUserRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.tokenBlacklistService = tokenBlacklistService;
    }

    public LoginResponse login(LoginRequest request) {
        String email = (request != null && request.getEmail() != null) ? request.getEmail().trim() : "";
        String password = (request != null && request.getPassword() != null) ? request.getPassword().trim() : "";

        StaffUser user = staffUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> {
                    auditService.logSystemAction("LOGIN_FAILED", "USER", email);
                    return new BadRequestException("Invalid email or password.");
                });

        if (!user.isActive()) {
            auditService.logSystemAction("LOGIN_FAILED", "USER", email);
            throw new BadRequestException("User account is inactive.");
        }

        if (!passwordEncoder.matches(password, user.getPassword())) {
            auditService.logSystemAction("LOGIN_FAILED", "USER", email);
            throw new BadRequestException("Invalid email or password.");
        }

        String token = jwtService.generateToken(user.getUserId(), user.getEmail(), user.getRole());
        auditService.logUserAction(user.getUserId(), user.getRole().name(), "LOGIN_SUCCESS", "USER", user.getUserId().toString(), null);

        return new LoginResponse(token, user.getUserId(), user.getEmail(), user.getRole(), user.isPasswordChangeRequired());
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        StaffUser user = staffUserRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new BadRequestException("Incorrect current password.");
        }

        if (request.getNewPassword() == null || request.getNewPassword().trim().length() < 6) {
            throw new BadRequestException("New password must be at least 6 characters.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword().trim()));
        user.setPasswordChangeRequired(false);
        staffUserRepository.save(user);

        auditService.logUserAction(user.getUserId(), user.getRole().name(), "CHANGE_PASSWORD", "USER", user.getUserId().toString(), null);
    }

    public void logout(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            tokenBlacklistService.blacklistToken(token);
        }
    }
}
