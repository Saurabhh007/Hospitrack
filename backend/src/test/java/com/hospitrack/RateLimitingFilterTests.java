package com.hospitrack;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospitrack.security.RateLimitingFilter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@SuppressWarnings("null")
public class RateLimitingFilterTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RateLimitingFilter activeTestRateLimitingFilter;

    @Autowired
    private ObjectMapper objectMapper;

    private static final class MutableClock extends Clock {
        private final AtomicLong currentMillis;
        private final ZoneId zone;

        MutableClock(long initialMillis) {
            this(initialMillis, ZoneOffset.UTC);
        }

        private MutableClock(long initialMillis, ZoneId zone) {
            this.currentMillis = new AtomicLong(initialMillis);
            this.zone = zone;
        }

        void advanceMillis(long deltaMillis) {
            currentMillis.addAndGet(deltaMillis);
        }

        @Override
        public ZoneId getZone() {
            return zone;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return new MutableClock(currentMillis.get(), zone);
        }

        @Override
        public Instant instant() {
            return Instant.ofEpochMilli(currentMillis.get());
        }

        @Override
        public long millis() {
            return currentMillis.get();
        }
    }

    @Test
    @DisplayName("Configuration rejects zero or negative thresholds and Spring property binding preserves defaults")
    void testConfigurationValidationAndPropertyBinding() {
        assertThrows(IllegalArgumentException.class, () -> new RateLimitingFilter(0, Clock.systemUTC()));
        assertThrows(IllegalArgumentException.class, () -> new RateLimitingFilter(-10, Clock.systemUTC()));

        ApplicationContextRunner runner = new ApplicationContextRunner()
                .withBean(RateLimitingFilter.class);

        runner.run(context -> {
            assertNull(context.getStartupFailure());
            RateLimitingFilter filter = context.getBean(RateLimitingFilter.class);
            assertEquals(60, filter.getMaxRequestsPerMinute(), "Production default must remain 60 req/min");
        });

        runner.withPropertyValues("app.rate-limit.max-requests-per-minute=15")
                .run(context -> {
                    assertNull(context.getStartupFailure());
                    assertEquals(15, context.getBean(RateLimitingFilter.class).getMaxRequestsPerMinute());
                });

        runner.withPropertyValues("app.rate-limit.max-requests-per-minute=0")
                .run(context -> assertNotNull(context.getStartupFailure(), "Zero threshold must fail context startup"));

        runner.withPropertyValues("app.rate-limit.max-requests-per-minute=-1")
                .run(context -> assertNotNull(context.getStartupFailure(), "Negative threshold must fail context startup"));

        assertTrue(activeTestRateLimitingFilter.getMaxRequestsPerMinute() >= 1000,
                "Test profile must configure an elevated threshold while keeping the filter active");
    }

    @Test
    @DisplayName("Default threshold allows 60 requests and returns structured HTTP 429 JSON on the 61st request")
    void testProductionDefaultThresholdSixtyRequests() throws Exception {
        MutableClock clock = new MutableClock(1_700_000_000_000L);
        RateLimitingFilter filter = new RateLimitingFilter(RateLimitingFilter.DEFAULT_MAX_REQUESTS_PER_MINUTE, clock);

        for (int i = 1; i <= 60; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/login");
            req.setRemoteAddr("10.10.0.5");
            MockHttpServletResponse res = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();

            filter.doFilter(req, res, chain);
            assertNotNull(chain.getRequest(), "Request #" + i + " within limit must pass through filter chain");
            assertEquals(200, res.getStatus());
        }

        MockHttpServletRequest blockedReq = new MockHttpServletRequest("POST", "/api/auth/login");
        blockedReq.setRemoteAddr("10.10.0.5");
        MockHttpServletResponse blockedRes = new MockHttpServletResponse();
        MockFilterChain blockedChain = new MockFilterChain();

        filter.doFilter(blockedReq, blockedRes, blockedChain);
        assertNull(blockedChain.getRequest(), "61st request must be stopped before downstream filter chain");
        assertEquals(429, blockedRes.getStatus());
        assertNotNull(blockedRes.getContentType());
        assertTrue(blockedRes.getContentType().startsWith(MediaType.APPLICATION_JSON_VALUE));

        JsonNode json = objectMapper.readTree(blockedRes.getContentAsString());
        assertFalse(json.get("success").asBoolean());
        assertEquals("Too many authentication requests. Please wait a minute and try again.", json.get("message").asText());
    }

    @Test
    @DisplayName("Protected auth endpoints enforce rate limit while non-auth endpoints stay unaffected")
    void testProtectedEndpointsAndNonAuthPassThrough() throws Exception {
        MutableClock clock = new MutableClock(1_700_000_000_000L);
        RateLimitingFilter filter = new RateLimitingFilter(3, clock);

        String[] protectedPaths = {
                "/api/auth/login",
                "/api/auth/forgot-password",
                "/api/auth/register"
        };

        for (int i = 0; i < 3; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", protectedPaths[i]);
            req.setRemoteAddr("192.0.2.10");
            MockHttpServletResponse res = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();
            filter.doFilter(req, res, chain);
            assertNotNull(chain.getRequest(), "Protected auth request within limit should pass");
        }

        // Fourth request hitting any protected auth route from same IP must return HTTP 429
        for (String path : new String[]{"/api/auth/login", "/api/auth/forgot-password", "/api/auth/register", "/api/auth/register/patient"}) {
            MockHttpServletRequest blockedReq = new MockHttpServletRequest("POST", path);
            blockedReq.setRemoteAddr("192.0.2.10");
            MockHttpServletResponse blockedRes = new MockHttpServletResponse();
            MockFilterChain blockedChain = new MockFilterChain();
            filter.doFilter(blockedReq, blockedRes, blockedChain);

            assertNull(blockedChain.getRequest(), "Expected rate limit enforcement for " + path);
            assertEquals(429, blockedRes.getStatus());
        }

        // Non-auth / health / resource endpoints remain unblocked by auth rate limiter
        for (String openPath : new String[]{"/api/auth/health", "/api/health", "/api/patients/PAT-301"}) {
            MockHttpServletRequest req = new MockHttpServletRequest("GET", openPath);
            req.setRemoteAddr("192.0.2.10");
            MockHttpServletResponse res = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();
            filter.doFilter(req, res, chain);

            assertNotNull(chain.getRequest(), "Endpoint " + openPath + " must not be rate-limited");
            assertEquals(200, res.getStatus());
        }
    }

    @Test
    @DisplayName("Counters remain active during the 60s window and reset immediately after window expiry")
    void testCounterWindowResetAfterOneMinute() throws Exception {
        MutableClock clock = new MutableClock(1_700_000_000_000L);
        RateLimitingFilter filter = new RateLimitingFilter(2, clock);

        for (int i = 0; i < 2; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/login");
            req.setRemoteAddr("192.0.2.44");
            MockHttpServletResponse res = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();
            filter.doFilter(req, res, chain);
            assertNotNull(chain.getRequest());
        }

        // 3rd request at t = 0 -> 429
        MockHttpServletRequest stillBlocked = new MockHttpServletRequest("POST", "/api/auth/login");
        stillBlocked.setRemoteAddr("192.0.2.44");
        MockHttpServletResponse stillBlockedRes = new MockHttpServletResponse();
        filter.doFilter(stillBlocked, stillBlockedRes, new MockFilterChain());
        assertEquals(429, stillBlockedRes.getStatus());

        // Exactly at 60_000 ms (now == resetTime, not yet past window) -> still 429
        clock.advanceMillis(RateLimitingFilter.WINDOW_MILLIS);
        MockHttpServletRequest boundaryReq = new MockHttpServletRequest("POST", "/api/auth/login");
        boundaryReq.setRemoteAddr("192.0.2.44");
        MockHttpServletResponse boundaryRes = new MockHttpServletResponse();
        filter.doFilter(boundaryReq, boundaryRes, new MockFilterChain());
        assertEquals(429, boundaryRes.getStatus());

        // 1 ms past the 60s window -> bucket resets and request passes
        clock.advanceMillis(1);
        MockHttpServletRequest afterResetReq = new MockHttpServletRequest("POST", "/api/auth/login");
        afterResetReq.setRemoteAddr("192.0.2.44");
        MockHttpServletResponse afterResetRes = new MockHttpServletResponse();
        MockFilterChain afterResetChain = new MockFilterChain();
        filter.doFilter(afterResetReq, afterResetRes, afterResetChain);

        assertNotNull(afterResetChain.getRequest(), "Bucket must reset after 60s window elapses");
        assertEquals(200, afterResetRes.getStatus());
    }

    @Test
    @DisplayName("Client IP counters are isolated across X-Forwarded-For and direct remoteAddr values")
    void testClientIpIsolationAndForwardedHeader() throws Exception {
        MutableClock clock = new MutableClock(1_700_000_000_000L);
        RateLimitingFilter filter = new RateLimitingFilter(2, clock);

        // Exhaust IP A using X-Forwarded-For
        for (int i = 0; i < 2; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/login");
            req.setRemoteAddr("10.0.0.1");
            req.addHeader("X-Forwarded-For", "203.0.113.10");
            MockHttpServletResponse res = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();
            filter.doFilter(req, res, chain);
            assertNotNull(chain.getRequest());
        }

        // Proxy multi-hop header sharing same originating IP 203.0.113.10 hits limit
        MockHttpServletRequest proxyReqA = new MockHttpServletRequest("POST", "/api/auth/login");
        proxyReqA.setRemoteAddr("10.0.0.2");
        proxyReqA.addHeader("X-Forwarded-For", "203.0.113.10, 10.0.0.2");
        MockHttpServletResponse proxyResA = new MockHttpServletResponse();
        MockFilterChain proxyChainA = new MockFilterChain();
        filter.doFilter(proxyReqA, proxyResA, proxyChainA);
        assertNull(proxyChainA.getRequest());
        assertEquals(429, proxyResA.getStatus());

        // Distinct client IP B behind same proxy must succeed
        MockHttpServletRequest reqB = new MockHttpServletRequest("POST", "/api/auth/login");
        reqB.setRemoteAddr("10.0.0.1");
        reqB.addHeader("X-Forwarded-For", "198.51.100.20, 10.0.0.1");
        MockHttpServletResponse resB = new MockHttpServletResponse();
        MockFilterChain chainB = new MockFilterChain();
        filter.doFilter(reqB, resB, chainB);
        assertNotNull(chainB.getRequest(), "Different client IP must not share rate limit bucket");
        assertEquals(200, resB.getStatus());

        // Direct request from distinct remoteAddr without X-Forwarded-For must succeed
        MockHttpServletRequest directReq = new MockHttpServletRequest("POST", "/api/auth/login");
        directReq.setRemoteAddr("192.0.2.99");
        MockHttpServletResponse directRes = new MockHttpServletResponse();
        MockFilterChain directChain = new MockFilterChain();
        filter.doFilter(directReq, directRes, directChain);
        assertNotNull(directChain.getRequest());
        assertEquals(200, directRes.getStatus());
    }

    @Test
    @DisplayName("Existing Spring Security and auth endpoint protections remain intact in the web filter chain")
    void testSecurityRulesPreservedOnAuthAndProtectedEndpoints() throws Exception {
        // Protected admin and clinical endpoints still require authentication
        mockMvc.perform(get("/api/admin/overview"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/patients/PAT-301"))
                .andExpect(status().isUnauthorized());

        // Public health remains accessible
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));

        // Invalid credentials return 401 rather than 429 or accidental permit
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"unknown@hospitrack.com\",\"password\":\"WrongPass123!\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));

        // Disabled public registration & password reset still return 403
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test\",\"email\":\"test@hospitrack.com\",\"password\":\"Pass123!\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"john.doe@email.com\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }
}

