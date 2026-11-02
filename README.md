
# HOSPITRACK â€” Hospital Referral & Patient Record Management Platform

> **"Connected Care. Smarter Referrals. Better Patient Journeys."**

Hospitrack is a modern, enterprise-ready, role-based healthcare coordination platform connecting medical institutions, clinicians, and patients with real-time inter-hospital referrals, clinical consultations, prescription safety verification, emergency inpatient transfers, and tamper-evident audit ledgers.

---

## ðŸ—ï¸ Master System Architecture

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

## ðŸŒŸ Security & Authentication Features

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

## ðŸš€ Quick Local Startup

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

## ðŸ§ª Automated Testing

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

## ðŸŒ Production Cloud Deployment (Render)

Hospitrack is configured for zero-friction multi-service deployment on **Render**:

```text
Frontend  --> Render Static Site (or Node SPA)
Backend   --> Render Web Service (Docker / Java 17)
Database  --> Render Managed PostgreSQL
```

### Deployment Configuration (`render.yaml`)

1. Connect your repository to Render via Blueprint.
2. Provide the following environment variables in the Render Dashboard:
   - `JWT_SECRET`: High-entropy secret key (min 32 characters)
   - `FRONTEND_URL`: URL of deployed frontend
   - `BREVO_API_KEY`: API key from your Brevo dashboard
   - `INITIAL_ADMIN_EMAIL`: `admin@yourdomain.com`
   - `INITIAL_ADMIN_PASSWORD`: Strong administrator password

---

## ðŸ”‘ Demonstration Accounts

For local evaluation, see [DEMO_CREDENTIALS.md](file:///s:/hospitrack-project/DEMO_CREDENTIALS.md).

---

## ðŸ“œ Presentation Explanation for College Evaluation

> *"Hospitrack uses a role-based authentication architecture. Users authenticate through the Spring Boot backend. Passwords are stored as BCrypt hashes rather than plaintext passwords. Spring Security determines authorization based on the user's role and hospital relationship. PostgreSQL stores the application data, while Brevo is used for transactional emails such as account verification and password reset. The application is deployed using Render."*
