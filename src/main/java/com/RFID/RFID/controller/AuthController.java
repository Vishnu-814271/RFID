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
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public AuthController(StaffUserRepository staffUserRepository, JwtTokenProvider tokenProvider, AuditService auditService, TokenBlacklistService tokenBlacklistService, EmailService emailService, org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.staffUserRepository = staffUserRepository;
        this.tokenProvider = tokenProvider;
        this.auditService = auditService;
        this.tokenBlacklistService = tokenBlacklistService;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public Envelope login(@RequestBody LoginRequest request) {
        String email = (request != null && request.getEmail() != null) ? request.getEmail().trim() : "";
        String password = (request != null && request.getPassword() != null) ? request.getPassword().trim() : "";

        System.out.println("[AUTH LOGIN] Attempt for: '" + email + "'");
        Optional<StaffUser> userOpt = staffUserRepository.findByEmailIgnoreCase(email);

        if (userOpt.isEmpty()) {
            auditService.logSystemAction("LOGIN_FAILED", "USER", email);
            System.err.println("[AUTH LOGIN] User not found: " + email);
            throw new RuntimeException("Invalid email or password.");
        }

        StaffUser user = userOpt.get();
        
        if (!user.isActive()) {
            auditService.logSystemAction("LOGIN_FAILED", "USER", email);
            throw new RuntimeException("User account is inactive.");
        }
        
        boolean matches = passwordEncoder.matches(password, user.getPassword()) || 
                          passwordEncoder.matches(request.getPassword(), user.getPassword());

        if (!matches) {
            auditService.logSystemAction("LOGIN_FAILED", "USER", email);
            System.err.println("[AUTH LOGIN] Password mismatch for: " + email);
            throw new RuntimeException("Invalid email or password.");
        }

        String token = tokenProvider.generateToken(user.getUserId(), user.getEmail(), user.getRole());
        LoginResponse response = new LoginResponse(
                token, user.getUserId(), user.getEmail(), user.getRole(), user.isPasswordChangeRequired()
        );
        System.out.println("[AUTH LOGIN SUCCESS] Logged in: " + user.getEmail() + " (Password change required: " + user.isPasswordChangeRequired() + ")");
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
        data.put("name", currentUser.getEmail());
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
        String email = (request != null && request.getEmail() != null) ? request.getEmail().trim() : "";
        System.out.println("[AUTH] Forgot-password requested for: '" + email + "'");

        if (email.isEmpty()) {
            throw new RuntimeException("Email address is required.");
        }

        Optional<StaffUser> userOpt = staffUserRepository.findByEmailIgnoreCase(email);

        if (userOpt.isEmpty()) {
            System.err.println("[AUTH] Forgot-password rejected: '" + email + "' is not registered.");
            throw new RuntimeException("This email address is not registered in the staff directory. Please enter a valid registered email.");
        }

        StaffUser user = userOpt.get();

        if (!user.isActive()) {
            System.err.println("[AUTH] Forgot-password rejected: '" + email + "' is inactive.");
            throw new RuntimeException("Your staff account is currently deactivated. Please contact your system administrator.");
        }

        System.out.println("[AUTH] User validated in DB: " + user.getEmail() + " (ID: " + user.getUserId() + ")");
        
        // Generate an 8-character temporary password without hyphens
        String tempPassword = java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        System.out.println("[AUTH] Generated temp password for " + user.getEmail() + ": " + tempPassword);
        
        user.setPassword(passwordEncoder.encode(tempPassword));
        user.setPasswordChangeRequired(true);
        staffUserRepository.save(user);

        emailService.sendPasswordResetEmail(
            user.getEmail(),
            user.getEmail(),
            "ZenCube Security Portal",
            "Administrator",
            tempPassword,
            15
        );
        
        auditService.logSystemAction("FORGOT_PASSWORD", "USER", user.getEmail());

        return Envelope.ok("Temporary password sent to " + user.getEmail() + ". Please check your inbox.");
    }
}
