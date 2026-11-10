package com.hospitrack.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Clock;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    public static final int DEFAULT_MAX_REQUESTS_PER_MINUTE = 60;
    public static final long WINDOW_MILLIS = 60_000L;

    private final Map<String, RequestBucket> ipBuckets = new ConcurrentHashMap<>();
    private final int maxRequestsPerMinute;
    private final Clock clock;

    @Autowired
    public RateLimitingFilter(
            @Value("${app.rate-limit.max-requests-per-minute:" + DEFAULT_MAX_REQUESTS_PER_MINUTE + "}") int maxRequestsPerMinute
    ) {
        this(maxRequestsPerMinute, Clock.systemUTC());
    }

    public RateLimitingFilter(int maxRequestsPerMinute, Clock clock) {
        if (maxRequestsPerMinute <= 0) {
            throw new IllegalArgumentException(
                    "app.rate-limit.max-requests-per-minute must be positive, got: " + maxRequestsPerMinute
            );
        }
        this.maxRequestsPerMinute = maxRequestsPerMinute;
        this.clock = Objects.requireNonNull(clock, "clock must not be null");
    }

    public int getMaxRequestsPerMinute() {
        return maxRequestsPerMinute;
    }

    private static class RequestBucket {
        final long resetTime;
        final AtomicInteger count;

        RequestBucket(long now) {
            this.resetTime = now + WINDOW_MILLIS;
            this.count = new AtomicInteger(1);
        }
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        if (isRateLimitedPath(path)) {
            String clientIp = getClientIp(request);
            long now = clock.millis();

            RequestBucket bucket = ipBuckets.compute(clientIp, (key, current) -> {
                if (current == null || now > current.resetTime) {
                    return new RequestBucket(now);
                }
                current.count.incrementAndGet();
                return current;
            });

            if (bucket.count.get() > maxRequestsPerMinute) {
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.getWriter().write("{\"success\":false,\"message\":\"Too many authentication requests. Please wait a minute and try again.\"}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isRateLimitedPath(String path) {
        return path != null && (
                path.startsWith("/api/auth/login")
                        || path.startsWith("/api/auth/forgot-password")
                        || path.startsWith("/api/auth/register")
        );
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader != null && !xfHeader.isBlank()) {
            String firstIp = xfHeader.split(",")[0].trim();
            if (!firstIp.isEmpty()) {
                return firstIp;
            }
        }
        String remoteAddr = request.getRemoteAddr();
        return (remoteAddr != null && !remoteAddr.isBlank()) ? remoteAddr : "unknown";
    }
}
