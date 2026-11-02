package com.hospitrack.controller;

import com.hospitrack.dto.*;
import com.hospitrack.security.UserPrincipal;
import com.hospitrack.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response
    ) {
        AuthResponse authResponse = authService.login(request);

        // Optionally set HttpOnly cookie for web security
        Cookie cookie = new Cookie("hospitrack_token", authResponse.getAccessToken());
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge((int) (authResponse.getExpiresInMs() / 1000));
        response.addCookie(cookie);

        return ResponseEntity.ok(ApiResponse.success("Authentication successful.", authResponse));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserDto>> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.status(403).body(ApiResponse.error("Public self-registration is disabled. Healthcare accounts must be provisioned by authorized Hospital Administrators or Super Administrators."));
    }

    @PostMapping("/register/patient")
    public ResponseEntity<ApiResponse<UserDto>> registerPatient(@RequestBody RegisterRequest request) {
        return ResponseEntity.status(403).body(ApiResponse.error("Public self-registration is disabled. Patient accounts are created during hospital admission and verified by hospital staff."));
    }

    @PostMapping("/register/hospital")
    public ResponseEntity<ApiResponse<UserDto>> registerHospital(@RequestBody RegisterRequest request) {
        return ResponseEntity.status(403).body(ApiResponse.error("Public hospital self-registration is disabled. New healthcare facilities must be onboarded by the Super Administrator."));
    }

    @PostMapping("/register/doctor")
    public ResponseEntity<ApiResponse<UserDto>> registerDoctor(@RequestBody RegisterRequest request) {
        return ResponseEntity.status(403).body(ApiResponse.error("Public doctor self-registration is disabled. Doctors must be provisioned and assigned by their Hospital Administrator."));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse<String>> verifyEmail(@RequestBody VerifyEmailRequest request) {
        return ResponseEntity.status(403).body(ApiResponse.error("Email verification is managed by hospital administrators."));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<String>> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        return ResponseEntity.status(403).body(ApiResponse.error("Public self-service password recovery is disabled. Please contact your Hospital Administrator or Super Administrator for authorized password recovery."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<String>> resetPassword(@RequestBody ResetPasswordRequest request) {
        return ResponseEntity.status(403).body(ApiResponse.error("Public self-service password reset is disabled. Please contact your Hospital Administrator or Super Administrator for authorized credential recovery."));
    }

    @PostMapping("/admin/reset-password")
    public ResponseEntity<ApiResponse<String>> adminResetPassword(
            @Valid @RequestBody AdminResetPasswordRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthenticated."));
        }
        if (principal.getRole() != com.hospitrack.entity.Role.SUPER_ADMIN && principal.getRole() != com.hospitrack.entity.Role.HOSPITAL_ADMIN) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied: Only Super Administrators and Hospital Administrators can perform administrative password resets."));
        }
        ApiResponse<String> response = authService.adminResetPassword(request, principal);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@RequestBody TokenRefreshRequest request) {
        AuthResponse authResponse = authService.refreshToken(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success("Token refreshed successfully.", authResponse));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthenticated."));
        }
        UserDto userDto = authService.getCurrentUserDto(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Current user profile retrieved.", userDto));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserDto>> updateProfile(
            @Valid @RequestBody UserProfileUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthenticated."));
        }
        ApiResponse<UserDto> response = authService.updateProfile(principal.getId(), request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/profile/photo")
    public ResponseEntity<ApiResponse<UserDto>> updateProfilePhoto(
            @Valid @RequestBody ProfilePhotoRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthenticated."));
        }
        if (principal.getRole() == com.hospitrack.entity.Role.PATIENT) {
            return ResponseEntity.status(403).body(ApiResponse.error("Patient profile photo is managed by your hospital administration."));
        }
        ApiResponse<UserDto> response = authService.updateProfilePhoto(principal.getId(), request.getPhoto());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/profile/photo")
    public ResponseEntity<ApiResponse<UserDto>> removeProfilePhoto(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthenticated."));
        }
        if (principal.getRole() == com.hospitrack.entity.Role.PATIENT) {
            return ResponseEntity.status(403).body(ApiResponse.error("Patient profile photo is managed by your hospital administration."));
        }
        ApiResponse<UserDto> response = authService.removeProfilePhoto(principal.getId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<String>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthenticated."));
        }
        if (principal.getRole() == com.hospitrack.entity.Role.DOCTOR || principal.getRole() == com.hospitrack.entity.Role.PATIENT) {
            return ResponseEntity.status(403).body(ApiResponse.error("Credential Governance Policy: Doctor and Patient self-service password changes are disabled. Please contact your Hospital Administrator."));
        }
        ApiResponse<String> response = authService.changePassword(principal.getId(), request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody(required = false) TokenRefreshRequest request,
            HttpServletResponse response
    ) {
        String userId = principal != null ? principal.getId() : null;
        String refreshToken = request != null ? request.getRefreshToken() : null;
        ApiResponse<String> apiResponse = authService.logout(userId, refreshToken);

        // Clear cookie
        Cookie cookie = new Cookie("hospitrack_token", null);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);

        return ResponseEntity.ok(apiResponse);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "UP");
        status.put("service", "hospitrack-backend");
        status.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(status);
    }
}
