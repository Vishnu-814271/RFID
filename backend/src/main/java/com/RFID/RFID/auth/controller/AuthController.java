package com.RFID.RFID.auth.controller;

import com.RFID.RFID.auth.dto.LoginRequest;
import com.RFID.RFID.auth.dto.LoginResponse;
import com.RFID.RFID.auth.service.AuthService;
import com.RFID.RFID.dto.DTOs.ChangePasswordRequest;
import com.RFID.RFID.dto.DTOs.ForgotPasswordRequest;
import com.RFID.RFID.dto.Envelope;
import com.RFID.RFID.model.StaffUser;
import com.RFID.RFID.repository.StaffUserRepository;
import com.RFID.RFID.service.AuditService;
import com.RFID.RFID.service.EmailService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final AuthService authService;
    private final StaffUserRepository staffUserRepository;
    private final AuditService auditService;
    private final EmailService emailService;
    private final com.RFID.RFID.repository.AppNotificationRepository notificationRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public AuthController(AuthService authService,
                          StaffUserRepository staffUserRepository,
                          AuditService auditService,
                          EmailService emailService,
                          com.RFID.RFID.repository.AppNotificationRepository notificationRepository,
                          org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.authService = authService;
        this.staffUserRepository = staffUserRepository;
        this.auditService = auditService;
        this.emailService = emailService;
        this.notificationRepository = notificationRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping({"/login", "/auth/login"})
    public Envelope login(@RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return Envelope.ok(response);
    }

    @PostMapping("/auth/change-password")
    public Envelope changePassword(@RequestBody ChangePasswordRequest request, HttpServletRequest httpRequest) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        StaffUser user = staffUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        authService.changePassword(user.getUserId(), request);
        return Envelope.ok("Password updated successfully.");
    }

    @PostMapping("/auth/logout")
    public Envelope logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        authService.logout(authHeader);
        return Envelope.ok("Logged out successfully.");
    }

    @PostMapping("/auth/forgot-password")
    public Envelope forgotPassword(@RequestBody ForgotPasswordRequest request) {
        if (request == null || request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new RuntimeException("Email is required.");
        }

        String email = request.getEmail().trim();
        Optional<StaffUser> userOpt = staffUserRepository.findByEmailIgnoreCase(email);

        if (userOpt.isPresent()) {
            StaffUser user = userOpt.get();
            String tempPassword = generateTemporaryPassword();
            user.setPassword(passwordEncoder.encode(tempPassword));
            user.setPasswordChangeRequired(true);
            staffUserRepository.save(user);

            emailService.sendPasswordResetEmail(user.getEmail(), tempPassword);
            auditService.logSystemAction("FORGOT_PASSWORD_REQUEST", "USER", user.getEmail());
            notificationRepository.save(new com.RFID.RFID.model.AppNotification(
                    "Temporary password generated for user: " + user.getEmail(),
                    "SECURITY",
                    "ADMIN"
            ));
        }

        return Envelope.ok("If an account exists with this email, instructions have been sent.");
    }

    private String generateTemporaryPassword() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
        StringBuilder sb = new StringBuilder();
        java.security.SecureRandom random = new java.security.SecureRandom();
        for (int i = 0; i < 10; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
