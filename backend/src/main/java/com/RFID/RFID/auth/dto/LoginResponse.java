package com.RFID.RFID.auth.dto;

import com.RFID.RFID.model.Role;

public class LoginResponse {
    private String token;
    private Long userId;
    private String email;
    private Role role;
    private boolean passwordChangeRequired;

    public LoginResponse() {}

    public LoginResponse(String token, Long userId, String email, Role role, boolean passwordChangeRequired) {
        this.token = token;
        this.userId = userId;
        this.email = email;
        this.role = role;
        this.passwordChangeRequired = passwordChangeRequired;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public boolean isPasswordChangeRequired() {
        return passwordChangeRequired;
    }

    public void setPasswordChangeRequired(boolean passwordChangeRequired) {
        this.passwordChangeRequired = passwordChangeRequired;
    }
}
