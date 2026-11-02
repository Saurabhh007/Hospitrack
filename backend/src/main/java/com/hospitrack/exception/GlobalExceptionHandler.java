package com.hospitrack.exception;

import com.hospitrack.dto.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiResponse<Object>> handleBadRequest(BadRequestException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ApiResponse<Object>> handleDuplicate(DuplicateResourceException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(PrescriptionSafetyViolationException.class)
    public ResponseEntity<ApiResponse<Object>> handlePrescriptionSafety(PrescriptionSafetyViolationException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Object>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Invalid email or password."));
    }

    @ExceptionHandler(LockedException.class)
    public ResponseEntity<ApiResponse<Object>> handleLocked(LockedException ex) {
        String msg = ex.getMessage() != null && !ex.getMessage().isEmpty() ? ex.getMessage() : "Your account is currently locked or pending approval.";
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(msg));
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ApiResponse<Object>> handleDisabled(DisabledException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error("Your account is currently unavailable."));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Object>> handleAccessDenied(AccessDeniedException ex) {
        String msg = (ex.getMessage() != null && !ex.getMessage().isBlank() && !ex.getMessage().equalsIgnoreCase("Access Denied"))
                ? ex.getMessage()
                : "Access denied: You do not have permission to access this healthcare resource.";
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(msg));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        String firstError = errors.values().stream().findFirst().orElse("Validation failed.");
        ApiResponse<Map<String, String>> response = new ApiResponse<>(false, firstError, errors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Object>> handleHttpMessageNotReadable(org.springframework.http.converter.HttpMessageNotReadableException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error("Malformed request payload or payload exceeds processing limits."));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(ex.getMessage() != null ? ex.getMessage() : "Invalid argument provided."));
    }

    @ExceptionHandler(jakarta.servlet.ServletException.class)
    public ResponseEntity<ApiResponse<Object>> handleServletException(jakarta.servlet.ServletException ex) {
        Throwable cause = ex.getRootCause() != null ? ex.getRootCause() : ex.getCause();
        if (cause instanceof BadRequestException) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(cause.getMessage()));
        }
        if (cause instanceof ResourceNotFoundException) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(cause.getMessage()));
        }
        if (cause instanceof DuplicateResourceException) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(cause.getMessage()));
        }
        if (cause instanceof PrescriptionSafetyViolationException) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(ApiResponse.error(cause.getMessage()));
        }
        if (cause instanceof AccessDeniedException) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error("Access denied: You do not have permission to access this healthcare resource."));
        }
        logger.error("Unhandled ServletException: ", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(ex.getMessage() != null ? ex.getMessage() : "An unexpected error occurred. Please try again later."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGlobalException(Exception ex) {
        Throwable cause = ex;
        while (cause != null) {
            if (cause instanceof BadRequestException) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(cause.getMessage()));
            }
            if (cause instanceof ResourceNotFoundException) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(cause.getMessage()));
            }
            if (cause instanceof DuplicateResourceException) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(cause.getMessage()));
            }
            if (cause instanceof PrescriptionSafetyViolationException) {
                return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(ApiResponse.error(cause.getMessage()));
            }
            if (cause instanceof AccessDeniedException) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error("Access denied: You do not have permission to access this healthcare resource."));
            }
            if (cause == cause.getCause()) {
                break;
            }
            cause = cause.getCause();
        }

        logger.error("Unhandled application exception: ", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("An unexpected error occurred. Please try again later."));
    }
}
