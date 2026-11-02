package com.hospitrack.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final Map<String, RequestBucket> ipBuckets = new ConcurrentHashMap<>();
    private static final int MAX_REQUESTS_PER_MINUTE = 60; // generous for test & demo, protects against DoS/bruteforce

    private static class RequestBucket {
        long resetTime;
        AtomicInteger count;

        RequestBucket() {
            this.resetTime = System.currentTimeMillis() + 60000;
            this.count = new AtomicInteger(1);
        }
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        if (path != null && (path.startsWith("/api/auth/login") || path.startsWith("/api/auth/forgot-password") || path.startsWith("/api/auth/register"))) {
            String clientIp = getClientIp(request);
            long now = System.currentTimeMillis();

            RequestBucket bucket = ipBuckets.compute(clientIp, (key, current) -> {
                if (current == null || now > current.resetTime) {
                    return new RequestBucket();
                }
                current.count.incrementAndGet();
                return current;
            });

            if (bucket.count.get() > MAX_REQUESTS_PER_MINUTE) {
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.getWriter().write("{\"success\":false,\"message\":\"Too many authentication requests. Please wait a minute and try again.\"}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty()) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }
}
