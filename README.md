
# HOSPITRACK Hospital Referral & Patient Record Management Platform

> **"Connected Care. Smarter Referrals. Better Patient Journeys."**

Hospitrack is a modern, enterprise-ready, role-based healthcare coordination platform connecting medical institutions, clinicians, and patients with real-time inter-hospital referrals, clinical consultations, prescription safety verification, emergency inpatient transfers, and tamper-evident audit ledgers.

---

## Master System Architecture

```text
               +-------------------------------------------------+
               |        React / Vanilla JS + CSS Client          |
               |        (Modern Healthcare SaaS Portal)          |
               +-------------------------------------------------+
                                       |
                                HTTPS REST + JWT
                                       v
               +-------------------------------------------------+
               |           Spring Boot 3.3.x (Java 17)           |
               |              Spring Security 6                  |
               |     [BCrypt Hashing] â€¢ [RBAC] â€¢ [Rate Limit]    |
               +-------------------------------------------------+
                        |                                |
        Transactional Email API               JPA / Hibernate ORM
                        v                                v
               +------------------+             +-----------------+
               |  Brevo (Sendinblue)|             |   PostgreSQL    |
               | Transactional    |             | Production DB   |
               | Email Service    |             | (Entities/Audit)|
               +------------------+             +-----------------+
```

---

## Security & Authentication Features

1. **Spring Security 6 & BCrypt Hashing**: Passwords stored solely as BCrypt hashes (`passwordHash`). Plaintext passwords never stored, logged, or returned in API responses.
2. **Short-Lived Access & Single-Use Refresh Tokens**: Cryptographically secure token generation with SHA-256 token hashing for email verification and password reset workflows.
3. **Strict Domain & Role-Based Authorization (RBAC)**:
   - `SUPER_ADMIN`: National healthcare directory oversight, facility onboarding, immutable audit ledger inspection.
   - `HOSPITAL_ADMIN`: Scoped strictly to own facility for inpatient admissions, bed capacity management, and triage.
   - `DOCTOR`: Scoped to assigned patients and clinical consultations.
   - `PATIENT`: Strictly isolated to their own longitudinal health records (`403 Forbidden` if Patient A queries Patient B).
4. **Duplicate Drug Safety Enforcement**: Real-time validation preventing duplicate medication items within the same prescription order (`422 Unprocessable Entity`).
5. **Tamper-Evident Audit Trail**: Immutable event logging with SHA-256 integrity hashes for all clinical and authentication actions.
6. **Brevo Email Verification & Password Reset**: Backend-driven transactional email dispatch for account verification and password recovery.
7. **Rate Limiting & Security Headers**: Protection against brute-force attacks on auth endpoints, strict CORS, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`.

---

## Quick Local Startup

### Prerequisites

- **Java 17** (OpenJDK / Eclipse Temurin)
- **Node.js 18+**

### Launching Local Environment

```bash
# Double-click launch-hospitrack.bat or run:
./launch-hospitrack.bat
```

This automatically starts the Spring Boot backend on `http://localhost:8080` and the web interface on `http://localhost:8000`.

### Stopping All Services

```bash
# Double-click stop-hospitrack.bat or run:
./stop-hospitrack.bat
```

---

## Automated Testing

### 1. Spring Boot Backend Security & Workflow Tests (17/17 PASS)

```bash
cd backend
./mvnw clean test
# On Windows:
mvnw.cmd test
```

**Test Coverage Includes:**

- BCrypt password hashing & matching
- Valid login returning JWT and UserDto
- Invalid password rejection (401)
- Unknown email rejection (401)
- SUPER_ADMIN registration block (400)
- Health endpoint secret protection
- Patient data isolation (Patient A denied Patient B record - 403)
- Doctor and Patient blocked from Admin endpoints (403)
- Duplicate medication safety rejection in prescriptions (422)
- Emergency transfer lifecycle & facility reallocation
- Single-use hashed email verification & password reset replay protection.

### 2. Frontend QA Integration Test Suite (7/7 PASS)

```bash
node test.js
```

Verifies initial seed integrity, hospital onboarding, inpatient admission, dynamic bed math, referrals, transfers, duplicate drug safety rules, and database reset.

---

## Production Cloud Deployment

Hospitrack is configured for zero-friction modern decoupled cloud deployment:

```text
Frontend  --> Vercel Edge Network (Static Hosting via vercel.json)
Backend   --> Railway Container Service (Docker / Java 17 via railway.json)
Database  --> Managed PostgreSQL 16 (Encrypted connection pool)
CI/CD     --> GitHub Actions (.github/workflows/ci-cd.yml)
```

### 1. Backend & Database Deployment (Railway)

1. Create a new project on [Railway](https://railway.app) and provision a **PostgreSQL** database.
2. Add a new service from your GitHub repository pointing to `backend/Dockerfile`.
3. Configure the following environment variables in Railway:
   - `SPRING_PROFILES_ACTIVE`: `prod`
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`
   - `JWT_SECRET`: High-entropy 256-bit key (e.g. `openssl rand -base64 48`)
   - `FRONTEND_URL`: URL of deployed frontend (e.g. `https://hospitrack.vercel.app`)
   - `INITIAL_ADMIN_EMAIL`: `admin@yourdomain.com`
   - `INITIAL_ADMIN_PASSWORD`: Strong administrator password (must be changed before production)
   - `BREVO_API_KEY`: API key from your Brevo dashboard (optional for transactional emails)

### 2. Frontend Deployment (Vercel)

1. Import your GitHub repository into [Vercel](https://vercel.com).
2. Set Root Directory to `./` and Framework Preset to `Other`.
3. Update `env-config.js` or configure your build step to inject the backend URL:
   ```javascript
   window.ENV = {
     API_BASE_URL: 'https://your-railway-backend.up.railway.app'
   };
   ```
4. Deploy to Vercel. Static routing, SPA fallback, and security headers are automatically managed via `vercel.json`.

### 3. Alternative Single-Service Deployment (Render)

Hospitrack also supports multi-service blueprint deployment on Render using `render.yaml`.

---

## Demonstration Accounts

For local evaluation, see [DEMO_CREDENTIALS.md](DEMO_CREDENTIALS.md).

---

## Presentation Explanation for Evaluation

> *"Hospitrack uses a decoupled, role-based healthcare architecture. The frontend is served as a high-performance Vanilla JavaScript Single Page Application from Vercel's global edge network, communicating securely over HTTPS REST with a containerized Java 17 Spring Boot backend hosted on Railway. Passwords are encrypted using BCrypt, and API communications are secured via stateless JWT Bearer tokens with strict role-based access control and multi-tenant hospital data isolation. PostgreSQL stores clinical and audit records, while GitHub Actions provides continuous integration and deployment."*
