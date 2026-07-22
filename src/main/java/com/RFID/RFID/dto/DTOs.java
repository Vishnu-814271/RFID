package com.RFID.RFID.dto;

import com.RFID.RFID.model.Role;
import com.RFID.RFID.model.MemberType;
import java.time.LocalDateTime;

public class DTOs {

    public static class LoginRequest {
        private String email;
        private String password;

        public LoginRequest() {}

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class LoginResponse {
        private String token;
        private Long userId;
        private String email;
        private Role role;
        private boolean passwordChangeRequired;

        public LoginResponse(String token, Long userId, String email, Role role, boolean passwordChangeRequired) {
            this.token = token;
            this.userId = userId;
            this.email = email;
            this.role = role;
            this.passwordChangeRequired = passwordChangeRequired;
        }

        public String getToken() { return token; }
        public Long getUserId() { return userId; }
        public String getEmail() { return email; }
        public Role getRole() { return role; }
        public boolean isPasswordChangeRequired() { return passwordChangeRequired; }
    }

    public static class ChangePasswordRequest {
        private String oldPassword;
        private String newPassword;

        public ChangePasswordRequest() {}

        public String getOldPassword() { return oldPassword; }
        public void setOldPassword(String oldPassword) { this.oldPassword = oldPassword; }
        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
    }

    public static class TapRequest {
        private String cardUid;
        private String readerId;
        private String occurredAt; // optional ISO-8601 string for simulation

        public TapRequest() {}

        public String getCardUid() { return cardUid; }
        public void setCardUid(String cardUid) { this.cardUid = cardUid; }
        public String getReaderId() { return readerId; }
        public void setReaderId(String readerId) { this.readerId = readerId; }
        public String getOccurredAt() { return occurredAt; }
        public void setOccurredAt(String occurredAt) { this.occurredAt = occurredAt; }
    }

    public static class TapResponse {
        private String decision;
        private String eventType;
        private String reason;
        private Boolean isLate;
        private LocalDateTime occurredAt;

        public TapResponse(String decision, String eventType, String reason, Boolean isLate, LocalDateTime occurredAt) {
            this.decision = decision;
            this.eventType = eventType;
            this.reason = reason;
            this.isLate = isLate;
            this.occurredAt = occurredAt;
        }

        public String getDecision() { return decision; }
        public String getEventType() { return eventType; }
        public String getReason() { return reason; }
        public Boolean getIsLate() { return isLate; }
        public LocalDateTime getOccurredAt() { return occurredAt; }
    }

    public static class PersonRequest {
        private String fullName;
        private MemberType memberType;
        private String externalRef;
        private String groupLabel;
        private String email;
        private String phone;

        public PersonRequest() {}

        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }
        public MemberType getMemberType() { return memberType; }
        public void setMemberType(MemberType memberType) { this.memberType = memberType; }
        public String getExternalRef() { return externalRef; }
        public void setExternalRef(String externalRef) { this.externalRef = externalRef; }
        public String getGroupLabel() { return groupLabel; }
        public void setGroupLabel(String groupLabel) { this.groupLabel = groupLabel; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
    }

    public static class CardRequest {
        private String cardUid;

        public CardRequest() {}

        public String getCardUid() { return cardUid; }
        public void setCardUid(String cardUid) { this.cardUid = cardUid; }
    }

    public static class MappingRequest {
        private Long cardId;
        private Long personId;

        public MappingRequest() {}

        public Long getCardId() { return cardId; }
        public void setCardId(Long cardId) { this.cardId = cardId; }
        public Long getPersonId() { return personId; }
        public void setPersonId(Long personId) { this.personId = personId; }
    }

    public static class CorrectionRequest {
        private String checkInAt; // ISO timestamp
        private String checkOutAt; // ISO timestamp
        private String correctionReason;

        public CorrectionRequest() {}

        public String getCheckInAt() { return checkInAt; }
        public void setCheckInAt(String checkInAt) { this.checkInAt = checkInAt; }
        public String getCheckOutAt() { return checkOutAt; }
        public void setCheckOutAt(String checkOutAt) { this.checkOutAt = checkOutAt; }
        public String getCorrectionReason() { return correctionReason; }
        public void setCorrectionReason(String correctionReason) { this.correctionReason = correctionReason; }
    }

    public static class ConfigRequest {
        private String expectedStartTime;
        private Integer lateGraceMinutes;
        private String autoCheckoutTime;
        private String workingDays;
        private Integer tapDebounceSeconds;
        private Integer sessionTimeoutMinutes;
        private Integer minWorkingMinutes;
        private String overnightSessionAttribution;

        public ConfigRequest() {}

        public String getExpectedStartTime() { return expectedStartTime; }
        public void setExpectedStartTime(String expectedStartTime) { this.expectedStartTime = expectedStartTime; }
        public Integer getLateGraceMinutes() { return lateGraceMinutes; }
        public void setLateGraceMinutes(Integer lateGraceMinutes) { this.lateGraceMinutes = lateGraceMinutes; }
        public String getAutoCheckoutTime() { return autoCheckoutTime; }
        public void setAutoCheckoutTime(String autoCheckoutTime) { this.autoCheckoutTime = autoCheckoutTime; }
        public String getWorkingDays() { return workingDays; }
        public void setWorkingDays(String workingDays) { this.workingDays = workingDays; }
        public Integer getTapDebounceSeconds() { return tapDebounceSeconds; }
        public void setTapDebounceSeconds(Integer tapDebounceSeconds) { this.tapDebounceSeconds = tapDebounceSeconds; }
        public Integer getSessionTimeoutMinutes() { return sessionTimeoutMinutes; }
        public void setSessionTimeoutMinutes(Integer sessionTimeoutMinutes) { this.sessionTimeoutMinutes = sessionTimeoutMinutes; }
        public Integer getMinWorkingMinutes() { return minWorkingMinutes; }
        public void setMinWorkingMinutes(Integer minWorkingMinutes) { this.minWorkingMinutes = minWorkingMinutes; }
        public String getOvernightSessionAttribution() { return overnightSessionAttribution; }
        public void setOvernightSessionAttribution(String overnightSessionAttribution) { this.overnightSessionAttribution = overnightSessionAttribution; }
    }

    public static class StaffUserRequest {
        private String email;
        private Role role;

        public StaffUserRequest() {}

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public Role getRole() { return role; }
        public void setRole(Role role) { this.role = role; }
    }

    public static class ForgotPasswordRequest {
        private String email;

        public ForgotPasswordRequest() {}

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }
}
