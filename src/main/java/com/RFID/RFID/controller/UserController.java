package com.RFID.RFID.controller;

import com.RFID.RFID.dto.DTOs.StaffUserRequest;
import com.RFID.RFID.dto.Envelope;
import com.RFID.RFID.model.Role;
import com.RFID.RFID.model.StaffUser;
import com.RFID.RFID.repository.StaffUserRepository;
import com.RFID.RFID.service.AuditService;
import com.RFID.RFID.service.EmailService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
public class UserController {

    private final StaffUserRepository staffUserRepository;
    private final AuditService auditService;
    private final EmailService emailService;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public UserController(StaffUserRepository staffUserRepository, AuditService auditService, EmailService emailService, org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.staffUserRepository = staffUserRepository;
        this.auditService = auditService;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public Envelope listUsers() {
        Object principal = (SecurityContextHolder.getContext().getAuthentication() != null) ?
                SecurityContextHolder.getContext().getAuthentication().getPrincipal() : null;
        StaffUser currentUser = (principal instanceof StaffUser) ? (StaffUser) principal : null;
        List<StaffUser> users = staffUserRepository.findAll();

        if (currentUser != null && currentUser.getRole() == Role.MANAGER) {
            // Managers can only list OPERATORs
            List<StaffUser> operators = users.stream()
                    .filter(u -> u.getRole() == Role.OPERATOR)
                    .collect(Collectors.toList());
            return Envelope.ok(operators);
        }

        // Admins see all
        return Envelope.ok(users);
    }

    @PostMapping
    public Envelope createUser(@RequestBody StaffUserRequest request) {
        Object principal = (SecurityContextHolder.getContext().getAuthentication() != null) ?
                SecurityContextHolder.getContext().getAuthentication().getPrincipal() : null;
        StaffUser currentUser = (principal instanceof StaffUser) ? (StaffUser) principal : null;

        // Role constraint validation
        if (currentUser != null && currentUser.getRole() == Role.MANAGER && request.getRole() != Role.OPERATOR) {
            throw new RuntimeException("Managers are only permitted to create Operator accounts.");
        }

        if (staffUserRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email is already registered.");
        }

        String tempPassword = java.util.UUID.randomUUID().toString().substring(0, 8);

        StaffUser newUser = new StaffUser();
        newUser.setEmail(request.getEmail());
        newUser.setRole(request.getRole());
        newUser.setPassword(passwordEncoder.encode(tempPassword));
        newUser.setPasswordChangeRequired(true);
        newUser.setActive(true);
        newUser.setAddedBy(currentUser);

        StaffUser saved = staffUserRepository.save(newUser);

        // Audit Trail
        auditService.log("STAFF_REGISTERED", "USER", saved.getUserId().toString());

        // Send email with the temporary password
        emailService.sendEmail(
            request.getEmail(),
            "Welcome to Zencube Access-Track",
            "An account has been created for you.\n\nYour temporary password is: " + tempPassword + "\n\nPlease login and change it immediately."
        );

        Map<String, Object> data = new HashMap<>();
        data.put("userId", saved.getUserId());
        data.put("email", saved.getEmail());
        data.put("role", saved.getRole());
        data.put("tempPassword", tempPassword); // Send back to client to display to operator

        return Envelope.ok(data);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Envelope updateUser(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
        StaffUser user = staffUserRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Staff user not found."));

        if (updates.containsKey("role")) {
            String roleStr = (String) updates.get("role");
            user.setRole(Role.valueOf(roleStr));
            auditService.log("STAFF_ROLE_CHANGED", "USER", id.toString());
        }

        if (updates.containsKey("active")) {
            Boolean active = (Boolean) updates.get("active");
            user.setActive(active);
            if (active) {
                auditService.log("STAFF_ACTIVATED", "USER", id.toString());
            } else {
                auditService.log("STAFF_DEACTIVATED", "USER", id.toString());
            }
        }

        if (updates.containsKey("resetPassword") && (Boolean) updates.get("resetPassword")) {
            user.setPassword(passwordEncoder.encode(user.getEmail()));
            user.setPasswordChangeRequired(true);
            auditService.log("STAFF_PASSWORD_RESET", "USER", id.toString());
            
            // Optionally we could return the new temp password, but since it's their email, we don't need to.
        }

        StaffUser saved = staffUserRepository.save(user);
        return Envelope.ok(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Envelope deleteUser(@PathVariable Long id) {
        StaffUser user = staffUserRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Staff user not found."));

        Object principal = (SecurityContextHolder.getContext().getAuthentication() != null) ?
                SecurityContextHolder.getContext().getAuthentication().getPrincipal() : null;
        StaffUser currentUser = (principal instanceof StaffUser) ? (StaffUser) principal : null;
        if (currentUser != null && currentUser.getUserId().equals(user.getUserId())) {
            throw new RuntimeException("Cannot delete your own account.");
        }

        List<StaffUser> allUsers = staffUserRepository.findAll();
        for (StaffUser u : allUsers) {
            if (u.getAddedBy() != null && u.getAddedBy().getUserId().equals(id)) {
                u.setAddedBy(null);
                staffUserRepository.save(u);
            }
        }

        staffUserRepository.delete(user);
        auditService.log("STAFF_DELETED", "USER", id.toString());
        return Envelope.ok("Staff user deleted successfully.");
    }
}
