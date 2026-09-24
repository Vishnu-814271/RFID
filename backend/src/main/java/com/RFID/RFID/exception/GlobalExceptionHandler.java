package com.RFID.RFID.exception;

import com.RFID.RFID.dto.Envelope;
import com.RFID.RFID.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

    private final AuditService auditService;

    public GlobalExceptionHandler(AuditService auditService) {
        this.auditService = auditService;
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Envelope> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        auditService.log("UNAUTHORIZED_ACCESS_ATTEMPT", "API", request.getRequestURI());
        Envelope envelope = Envelope.error("ACCESS_DENIED", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(envelope);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Envelope> handleRuntime(RuntimeException ex) {
        Envelope envelope = Envelope.error("BAD_REQUEST", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(envelope);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Envelope> handleGeneric(Exception ex) {
        Envelope envelope = Envelope.error("INTERNAL_SERVER_ERROR", ex.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(envelope);
    }
}
