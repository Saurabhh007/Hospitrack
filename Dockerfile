# ==============================================================================
# HOSPITRACK HEALTHCARE PLATFORM — PRODUCTION UNIFIED SINGLE-SERVICE DOCKERFILE
# Multi-stage build: Maven (Java 17) -> Node.js 20 (with Java 17 JRE)
# ==============================================================================

# ------------------------------------------------------------------------------
# STAGE 1: Build Spring Boot Backend Artifact (Maven + Eclipse Temurin JDK 17)
# ------------------------------------------------------------------------------
FROM maven:3.9.6-eclipse-temurin-17 AS backend-builder

WORKDIR /build/backend

# Cache Maven dependencies
COPY backend/pom.xml .
RUN mvn dependency:go-offline -B

# Copy backend source code and compile production executable JAR
COPY backend/src ./src
RUN mvn clean package -DskipTests

# ------------------------------------------------------------------------------
# STAGE 2: Production Unified Single-Service Runtime (Node.js 20 + Java 17 JRE)
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim

# Install OpenJDK 17 headless JRE and curl for container health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jre-headless \
    curl \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Standard production environment defaults
ENV NODE_ENV=production
ENV SPRING_PROFILES_ACTIVE=prod
ENV HOST=0.0.0.0
ENV PORT=10000
ENV BACKEND_HOST=127.0.0.1
ENV BACKEND_PORT=8080
ENV JAVA_OPTS="-Xms96m -Xmx256m -XX:MaxMetaspaceSize=112m -XX:ReservedCodeCacheSize=48m -Xss512k -XX:+UseSerialGC"

# Copy root package descriptor
COPY package*.json ./

# Install only production dependencies if any exist
RUN if [ -f package.json ]; then npm install --omit=dev --ignore-scripts; fi

# Copy frontend web application and server files
COPY index.html ./
COPY server.js ./
COPY css/ ./css/
COPY js/ ./js/
COPY assets/ ./assets/
RUN mkdir -p data

# Copy compiled Spring Boot JAR from build stage into candidate locations
RUN mkdir -p backend/target
COPY --from=backend-builder /build/backend/target/hospitrack-backend-1.0.0.jar ./backend/target/hospitrack-backend-1.0.0.jar
COPY --from=backend-builder /build/backend/target/hospitrack-backend-1.0.0.jar ./hospitrack-backend-1.0.0.jar

# Expose Render web port and internal backend proxy port
EXPOSE 10000 8080

# Container health probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD curl -f http://127.0.0.1:${PORT}/health || exit 1

# Start the unified Node.js supervisor server which orchestrates the Spring Boot backend
CMD ["node", "server.js"]

