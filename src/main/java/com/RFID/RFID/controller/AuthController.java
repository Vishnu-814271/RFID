package com.RFID.RFID.controller;

import com.RFID.RFID.dto.DTOs.ChangePasswordRequest;
import com.RFID.RFID.dto.DTOs.LoginRequest;
import com.RFID.RFID.dto.DTOs.LoginResponse;
import com.RFID.RFID.dto.Envelope;
import com.RFID.RFID.dto.DTOs.ForgotPasswordRequest;
import com.RFID.RFID.model.StaffUser;
import com.RFID.RFID.repository.StaffUserRepository;
import com.RFID.RFID.security.JwtTokenProvider;
import com.RFID.RFID.service.AuditService;
import com.RFID.RFID.service.EmailService;
import com.RFID.RFID.security.TokenBlacklistService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final StaffUserRepository staffUserRepository;
    private final JwtTokenProvider tokenProvider;
    private final AuditService auditService;
    private final TokenBlacklistService tokenBlacklistService;
    private final EmailService emailService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);

    public AuthController(StaffUserRepository staffUserRepository, JwtTokenProvider tokenProvider, AuditService auditService, TokenBlacklistService tokenBlacklistService, EmailService emailService) {
        this.staffUserRepository = staffUserRepository;
        this.tokenProvider = tokenProvider;
        this.auditService = auditService;
        this.tokenBlacklistService = tokenBlacklistService;
        this.emailService = emailService;
    }

    @PostMapping("/login")
    public Envelope login(@RequestBody LoginRequest request) {
        Optional<StaffUser> userOpt = staffUserRepository.findByEmail(request.getEmail());

        if (userOpt.isEmpty()) {
            auditService.logSystemAction("LOGIN_FAILED", "USER", request.getEmail());
            throw new RuntimeException("invalid mail doesn't exist");
        }

        StaffUser user = userOpt.get();
        
        if (!user.isActive()) {
            auditService.logSystemAction("LOGIN_FAILED", "USER", request.getEmail());
            throw new RuntimeException("User is inactive.");
        }
        
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            auditService.logSystemAction("LOGIN_FAILED", "USER", request.getEmail());
            throw new RuntimeException("invalid pasword");
        }

        String token = tokenProvider.generateToken(user.getUserId(), user.getEmail(), user.getRole());
        LoginResponse response = new LoginResponse(
                token, user.getUserId(), user.getEmail(), user.getRole(), user.isPasswordChangeRequired()
        );
        return Envelope.ok(response);
    }

    @PostMapping("/logout")
    public Envelope logout(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            tokenBlacklistService.blacklistToken(token);
        }
        SecurityContextHolder.clearContext();
        return Envelope.ok("Logged out successfully.");
    }

    @GetMapping("/auth/me")
    public Envelope me() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof StaffUser)) {
            throw new RuntimeException("Unauthorized context.");
        }
        StaffUser currentUser = (StaffUser) principal;
        
        java.util.Map<String, Object> data = new java.util.HashMap<>();
        data.put("userId", currentUser.getUserId());
        data.put("email", currentUser.getEmail());
        data.put("role", currentUser.getRole());
        data.put("passwordChangeRequired", currentUser.isPasswordChangeRequired());
        
        return Envelope.ok(data);
    }

    @PostMapping("/auth/change-password")
    public Envelope changePassword(@RequestBody ChangePasswordRequest request) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof StaffUser)) {
            throw new RuntimeException("Unauthorized context.");
        }

        StaffUser currentUser = (StaffUser) principal;
        // Reload to prevent stale entity issues
        StaffUser user = staffUserRepository.findById(currentUser.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found."));

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new RuntimeException("Incorrect old password.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordChangeRequired(false);
        staffUserRepository.save(user);

        auditService.log("PASSWORD_CHANGED", "USER", user.getUserId().toString());
        return Envelope.ok("Password changed successfully.");
    }

    @PostMapping("/auth/forgot-password")
    public Envelope forgotPassword(@RequestBody ForgotPasswordRequest request) {
        Optional<StaffUser> userOpt = staffUserRepository.findByEmail(request.getEmail());

        if (userOpt.isPresent()) {
            StaffUser user = userOpt.get();
            
            // Generate an 8-character temporary password
            String tempPassword = java.util.UUID.randomUUID().toString().substring(0, 8);
            
            user.setPassword(passwordEncoder.encode(tempPassword));
            user.setPasswordChangeRequired(true);
            staffUserRepository.save(user);

            emailService.sendEmail(
                user.getEmail(), 
                "Temporary Password", 
                "Your temporary password is: " + tempPassword + "\n\nPlease login and change it immediately."
            );
            
            auditService.logSystemAction("FORGOT_PASSWORD", "USER", request.getEmail());
        }

        // Always return success to prevent email enumeration
        return Envelope.ok("Temp password delivered by email");
    }
}
