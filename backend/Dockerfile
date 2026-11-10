# ==============================================================================
# HOSPITRACK HEALTHCARE PLATFORM — DEDICATED SPRING BOOT BACKEND DOCKERFILE
# Multi-stage production container build (Maven 3.9.6 + Java 25 -> Eclipse Temurin JRE 25)
# Non-root user, memory-optimized, healthcheck enabled, graceful termination safe
# ==============================================================================

# ------------------------------------------------------------------------------
# STAGE 1: Build Spring Boot Application Artifact
# ------------------------------------------------------------------------------
FROM maven:3.9.6-eclipse-temurin-25 AS builder

WORKDIR /build

# Cache Maven dependencies layer
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy application source code and compile production executable fat JAR
COPY src ./src
RUN mvn clean package -DskipTests

# ------------------------------------------------------------------------------
# STAGE 2: Lightweight Production Runtime Image
# ------------------------------------------------------------------------------
FROM eclipse-temurin:25-jre-jammy

# Install curl for container healthcheck probe and clean package manager cache
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated non-root application user and group (UID/GID 1001)
RUN groupadd -g 1001 hospitrack \
    && useradd -u 1001 -g hospitrack -s /bin/sh -d /app -m hospitrack

WORKDIR /app

# Copy compiled Spring Boot JAR from builder stage with proper non-root ownership
COPY --from=builder --chown=hospitrack:hospitrack /build/target/hospitrack-backend-1.0.0.jar /app/hospitrack-backend.jar

# Standard production environment variables
ENV SPRING_PROFILES_ACTIVE=prod \
    PORT=8080 \
    SERVER_PORT=8080 \
    JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=25.0 -XX:+ExitOnOutOfMemoryError"

# Expose default Spring Boot service port
EXPOSE 8080

# Switch to non-root application user
USER hospitrack:hospitrack

# Container healthcheck probe targeting public /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://127.0.0.1:${PORT:-8080}/api/health || exit 1

# Launch Spring Boot with exec form so Java receives SIGTERM directly for graceful shutdown
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Dserver.port=${PORT:-8080} -jar /app/hospitrack-backend.jar"]
