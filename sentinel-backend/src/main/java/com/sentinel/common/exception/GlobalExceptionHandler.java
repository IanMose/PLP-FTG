package com.sentinel.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import com.sentinel.capa.QualificationMismatchException;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(NoSuchElementException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("Not Found", ex.getMessage()));
    }

    /** Invalid credentials or duplicate email */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error("Bad Request", ex.getMessage()));
    }

    /** Technician does not hold required qualification */
    @ExceptionHandler(QualificationMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleQualificationMismatch(QualificationMismatchException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error("Qualification Mismatch", ex.getMessage()));
    }

    /** Account suspended/deactivated */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleForbidden(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error("Forbidden", ex.getMessage()));
    }

    /** Bean validation failures */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error("Validation Failed", message));
    }

    /** RBAC — accessing endpoints without the required role */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error("Forbidden", "Insufficient permissions"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(error("Internal Server Error", ex.getMessage() != null ? ex.getMessage() : "Unknown error"));
    }

    private Map<String, Object> error(String type, String message) {
        return Map.of(
                "error", type,
                "message", message,
                "timestamp", LocalDateTime.now().toString()
        );
    }
}
