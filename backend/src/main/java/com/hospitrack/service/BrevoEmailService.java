package com.hospitrack.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Service
public class BrevoEmailService {

    private static final Logger logger = LoggerFactory.getLogger(BrevoEmailService.class);

    @Value("${app.brevo.api-key:}")
    private String apiKey;

    @Value("${app.brevo.sender-email:no-reply@hospitrack.com}")
    private String senderEmail;

    @Value("${app.brevo.sender-name:Hospitrack Healthcare}")
    private String senderName;

    @Value("${app.cors.allowed-origins:http://localhost:8000}")
    private String allowedOrigins;

    private final RestTemplate restTemplate = new RestTemplate();

    @Async
    public void sendVerificationEmail(String recipientEmail, String recipientName, String rawToken) {
        String frontendUrl = allowedOrigins.split(",")[0].trim();
        String verificationUrl = frontendUrl + "/#verify-email=" + rawToken;

        String subject = "Verify your Hospitrack account";
        String htmlContent = "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;'>"
                + "<div style='text-align: center; margin-bottom: 24px;'>"
                + "<h2 style='color: #0284c7; margin: 0;'>🏥 HOSPITRACK</h2>"
                + "<p style='color: #64748b; font-size: 14px; margin: 4px 0 0 0;'>Hospital Referral & Patient Record Management System</p>"
                + "</div>"
                + "<p>Hello <strong>" + recipientName + "</strong>,</p>"
                + "<p>Your Hospitrack account has been created. Please verify your email address to activate your secure access.</p>"
                + "<div style='text-align: center; margin: 32px 0;'>"
                + "<a href='" + verificationUrl + "' style='background-color: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>Verify Email Address</a>"
                + "</div>"
                + "<p style='font-size: 13px; color: #64748b;'>Verification Token: <code style='background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold;'>" + rawToken + "</code></p>"
                + "<p style='font-size: 13px; color: #94a3b8;'>This verification link will expire in 24 hours. If you did not expect this email, please contact your hospital administrator.</p>"
                + "<hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'/>"
                + "<p style='font-size: 12px; color: #94a3b8; text-align: center;'>Hospitrack • Secure Role-Based Healthcare Access</p>"
                + "</div>";

        sendEmail(recipientEmail, recipientName, subject, htmlContent);
    }

    @Async
    public void sendPasswordResetEmail(String recipientEmail, String recipientName, String rawToken) {
        String frontendUrl = allowedOrigins.split(",")[0].trim();
        String resetUrl = frontendUrl + "/#reset-password=" + rawToken;

        String subject = "Reset your Hospitrack password";
        String htmlContent = "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;'>"
                + "<div style='text-align: center; margin-bottom: 24px;'>"
                + "<h2 style='color: #0284c7; margin: 0;'>🏥 HOSPITRACK</h2>"
                + "<p style='color: #64748b; font-size: 14px; margin: 4px 0 0 0;'>Hospital Referral & Patient Record Management System</p>"
                + "</div>"
                + "<p>Hello <strong>" + (recipientName != null ? recipientName : "Healthcare Professional") + "</strong>,</p>"
                + "<p>We received a request to reset your Hospitrack account password.</p>"
                + "<div style='text-align: center; margin: 32px 0;'>"
                + "<a href='" + resetUrl + "' style='background-color: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>Reset Password</a>"
                + "</div>"
                + "<p style='font-size: 13px; color: #64748b;'>Reset Token: <code style='background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold;'>" + rawToken + "</code></p>"
                + "<p style='font-size: 13px; color: #94a3b8;'>This link will expire in 1 hour and can only be used once. If you did not request this, please notify security immediately.</p>"
                + "<hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'/>"
                + "<p style='font-size: 12px; color: #94a3b8; text-align: center;'>Hospitrack • Secure Role-Based Healthcare Access</p>"
                + "</div>";

        sendEmail(recipientEmail, recipientName, subject, htmlContent);
    }

    @Async
    public void sendAccountCreatedEmail(String recipientEmail, String recipientName, String roleName) {
        String subject = "Welcome to Hospitrack — Account Provisioned";
        String htmlContent = "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;'>"
                + "<div style='text-align: center; margin-bottom: 24px;'>"
                + "<h2 style='color: #0284c7; margin: 0;'>🏥 HOSPITRACK</h2>"
                + "</div>"
                + "<p>Hello <strong>" + recipientName + "</strong>,</p>"
                + "<p>Your Hospitrack account has been successfully provisioned with role: <strong>" + roleName + "</strong>.</p>"
                + "<p>You can now log in securely using your registered email address.</p>"
                + "<hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'/>"
                + "<p style='font-size: 12px; color: #94a3b8; text-align: center;'>Hospitrack • Secure Role-Based Healthcare Access</p>"
                + "</div>";

        sendEmail(recipientEmail, recipientName, subject, htmlContent);
    }

    private void sendEmail(String recipientEmail, String recipientName, String subject, String htmlContent) {
        if (apiKey == null || apiKey.trim().isEmpty() || apiKey.startsWith("mock-")) {
            logger.info("[MOCK BREVO] Transactional email queued for: {} | Subject: {}", recipientEmail, subject);
            return;
        }

        try {
            String url = "https://api.brevo.com/v3/smtp/email";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey);

            Map<String, Object> body = new HashMap<>();
            Map<String, String> sender = new HashMap<>();
            sender.put("name", senderName);
            sender.put("email", senderEmail);
            body.put("sender", sender);

            Map<String, String> to = new HashMap<>();
            to.put("email", recipientEmail);
            to.put("name", recipientName != null ? recipientName : recipientEmail);
            body.put("to", Collections.singletonList(to));

            body.put("subject", subject);
            body.put("htmlContent", htmlContent);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(url, entity, String.class);
            logger.info("Successfully dispatched Brevo email to {}", recipientEmail);
        } catch (Exception e) {
            logger.error("Failed to dispatch Brevo email to {}: {}", recipientEmail, e.getMessage());
        }
    }
}
