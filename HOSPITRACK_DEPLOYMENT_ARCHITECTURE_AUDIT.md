# HOSPITRACK — COMPLETE FRONTEND & BACKEND DEPLOYMENT ARCHITECTURE AUDIT

**Document Identifier:** `HOSPITRACK_DEPLOYMENT_ARCHITECTURE_AUDIT.md`  
**Platform Version:** 2.4.0  
**Audit Date:** November 1, 2026  
**Auditor:** Senior Full-Stack Developer, DevOps Engineer & Deployment Architect  
**Scope:** Complete Codebase Inspection, Configuration Audit, Runtime Diagnostics, and Root-Cause Analysis  
**Mode:** AUDIT-ONLY (Zero source code modifications made)

---

## EXECUTIVE SUMMARY

Hospitrack is an enterprise healthcare platform designed with a **Java 17 Spring Boot 3.3.3 REST API backend** and a **Vanilla HTML5 / CSS3 / JavaScript single-page application frontend**.

The critical failure observed during deployment—where **only basic unstyled HTML renders without CSS, JavaScript, or backend communication**—is caused by the convergence of **six distinct architectural and deployment configuration defects**:

1. **Static Platform vs. Dynamic Backend Mismatch:** The repository contains deployment descriptors for static/serverless hosts ([`netlify.toml`](file:///d:/Hospitrack-main/Hospitrack-main/netlify.toml) and [`vercel.json`](file:///d:/Hospitrack-main/Hospitrack-main/vercel.json)). When deployed to Netlify or Vercel, the platform only publishes static files. The Java Spring Boot backend and Node orchestrator are **never deployed or executed**.
2. **Relative Asset Paths & SPA Catch-All Rewrites:** In [`index.html`](file:///d:/Hospitrack-main/Hospitrack-main/index.html#L11-L12), stylesheets and scripts are linked via relative URLs without leading slashes (e.g., `href="css/styles.css?v=4.8"`, `src="js/config.js"`). When deployed or navigated to any path other than root `/`, relative asset requests resolve to subpaths (e.g., `/login/css/styles.css`). The server's SPA fallback rewrites these 404s to `index.html` with MIME type `text/html`. Because strict `X-Content-Type-Options: nosniff` is enforced, modern browsers abort stylesheet and script execution with strict MIME type errors.
3. **Missing Pre-compiled JAR & Git-Ignored Binaries:** [`.gitignore`](file:///d:/Hospitrack-main/Hospitrack-main/.gitignore#L17-L20) explicitly excludes `*.jar` and `backend/target/`. No pre-compiled JAR exists anywhere in the repository. Furthermore, [`package.json`](file:///d:/Hospitrack-main/Hospitrack-main/package.json) contains no Java compilation build script.
4. **Corrupted Local Maven Wrapper:** In the embedded Maven directory ([`backend/.mvn/apache-maven-3.9.6`](file:///d:/Hospitrack-main/Hospitrack-main/backend/.mvn/apache-maven-3.9.6)), git-exclusion stripped all internal `.jar` files (`plexus-classworlds-*.jar`, `lib/*.jar`), causing [`mvnw.cmd`](file:///d:/Hospitrack-main/Hospitrack-main/backend/mvnw.cmd) to crash with `Error: -classpath requires class path specification`.
5. **Node.js Orchestrator JAR Search Abort:** [`server.js`](file:///d:/Hospitrack-main/Hospitrack-main/server.js#L396-L417) looks for `hospitrack-backend-1.0.0.jar` across five candidate paths. Finding none, it prints `[Backend] Spring Boot JAR not found in candidate paths` and **aborts backend startup completely**, leaving internal port 8080 unallocated and returning `502 Bad Gateway` on all `/api/*` proxies.
6. **Production Profile Strict Database Requirement:** In [`server.js`](file:///d:/Hospitrack-main/Hospitrack-main/server.js#L420), running without `NODE_ENV=development` automatically triggers the `prod` Spring profile. In `prod` profile ([`application-prod.yml`](file:///d:/Hospitrack-main/Hospitrack-main/backend/src/main/resources/application-prod.yml)), Spring Boot demands a valid external PostgreSQL `DATABASE_URL` and `JWT_SECRET`. Without them, Spring Boot terminates immediately.

---

## PHASE 1 — COMPLETE PROJECT ARCHITECTURE AUDIT

A thorough verification of the codebase source files reveals the real functional roles of each component:

| Component | Physical Location | Actual Technology | Intended Role | Verification Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Web App** | Root directory (`index.html`, `css/`, `js/`) | Vanilla HTML5, CSS3, JavaScript (ES6 Modules) | Client UI & Healthcare Portal | [`index.html`](file:///d:/Hospitrack-main/Hospitrack-main/index.html) loads styles and 18 modular scripts; no build/bundle step required. |
| **Active Backend API** | [`backend/`](file:///d:/Hospitrack-main/Hospitrack-main/backend) | Java 17, Spring Boot 3.3.3, Spring Security 6, Spring Data JPA | Authoritative Healthcare REST API & Database Models | [`backend/pom.xml`](file:///d:/Hospitrack-main/Hospitrack-main/backend/pom.xml), 16 `@RestController` classes, 18 JPA entities. |
| **Node.js Server** | [`server.js`](file:///d:/Hospitrack-main/Hospitrack-main/server.js) | Pure Node.js (Zero external npm dependencies) | Static File Server + Reverse Proxy + Java Child Process Supervisor | Uses `http.createServer`, proxies `/api/*` to `:8080`, attempts `spawn('java', ...)` to start Spring Boot. |
| **Python Server** | [`server.py`](file:///d:/Hospitrack-main/Hospitrack-main/server.py) | Python 3 `http.server.SimpleHTTPRequestHandler` | Local Static File Server (Development only) | 38 lines of code; has no API endpoints, no database layer, and no proxy capabilities. |
| **Prototype TSX Files** | [`js/modules/*.tsx`](file:///d:/Hospitrack-main/Hospitrack-main/js/modules) | React / TypeScript Source Files | Inactive Prototypes / Reference Designs | 6 `.tsx` files (`ClinicalReferralDispatchForm.tsx`, `SuperadminDashboard.tsx`, etc.) are completely unreferenced in `index.html`. |

### Architectural Findings

1. **Actual Frontend:**
   The frontend is **not React or Vite**. It is a pure, zero-bundler Vanilla Single Page Application (SPA) driven by [`index.html`](file:///d:/Hospitrack-main/Hospitrack-main/index.html), [`css/styles.css`](file:///d:/Hospitrack-main/Hospitrack-main/css/styles.css), and modular vanilla JS scripts in [`js/`](file:///d:/Hospitrack-main/Hospitrack-main/js).
2. **Actual Backend:**
   The application backend is **exclusively Java Spring Boot 3.3.3**. There is no Node.js backend logic (Express/Fastify) and no Python backend logic (FastAPI/Django/Flask).
3. **Frontend File Server:**
   In local development and containerized production, [`server.js`](file:///d:/Hospitrack-main/Hospitrack-main/server.js) serves static assets from `PUBLIC_DIR = __dirname`. On static hosts (Netlify/Vercel), their CDN edge servers serve these files.
4. **API Request Handler:**
   The Spring Boot application handles all REST endpoints under `/api/*` on port 8080.
5. **Service Decoupling & Orchestration:**
   The frontend and backend were written as decoupled components that communicate strictly via REST APIs and JSON Web Tokens. However, [`server.js`](file:///d:/Hospitrack-main/Hospitrack-main/server.js) and the root [`Dockerfile`](file:///d:/Hospitrack-main/Hospitrack-main/Dockerfile) attempt to merge them into a single-process supervisor model.

---

## PHASE 2 — INVESTIGATE THE CSS AND FRONTEND DEPLOYMENT PROBLEM

### Root Cause Analysis: Why Only Basic HTML Appears Without Styling

When deploying Hospitrack to a cloud platform, users experience raw, unstyled HTML. This behavior has three verified causes:

```
Browser Request: GET /css/styles.css?v=4.8
       │
       ▼
Hosting Server / Router (Netlify / Vercel / server.js SPA Catch-All)
       │
       ├─► File Not Found at requested path (due to Relative URL or Publish Dir mismatch)
       │
       ├─► Fallback Rule triggers: rewrites request to /index.html with status 200
       │
       ▼
Response: HTTP 200 OK | Content-Type: text/html | Body: <!DOCTYPE html>...
       │
       ▼
Browser parses response against: <link rel="stylesheet" href="...">
       │
       ├─► Header: "X-Content-Type-Options: nosniff"
       │
       ▼
BROWSER SECURITY BLOCK:
"Refused to apply style from '...' because its MIME type ('text/html')
 is not a supported stylesheet MIME type, and strict MIME checking is enabled."
```

#### 1. Relative Asset Paths in `index.html`
In [`index.html`](file:///d:/Hospitrack-main/Hospitrack-main/index.html#L11-L12) and [`index.html:1268-1285`](file:///d:/Hospitrack-main/Hospitrack-main/index.html#L1268-L1285):
```html
<link rel="stylesheet" href="css/styles.css?v=4.8">
<link rel="stylesheet" href="css/print.css?v=1.0">
...
<script src="js/config.js"></script>
<script src="js/authService.js"></script>
```
* **The Flaw:** None of these asset paths have a leading slash (`/`).
* **The Consequence:** If the user accesses any URL with a path segment (e.g., `https://hospitrack.com/login`, `https://hospitrack.com/patient/`, or if a hosting provider serves the site from a subpath/preview domain), the browser resolves assets relative to that subfolder (e.g., `https://hospitrack.com/login/css/styles.css`).
* **The Failure:** The file does not exist at `/login/css/styles.css`. The server falls back to returning `index.html`. The browser rejects the stylesheet due to strict MIME checks, rendering plain unstyled HTML.

#### 2. SPA Catch-All Rewriting Static Asset 404s to HTML
In [`server.js`](file:///d:/Hospitrack-main/Hospitrack-main/server.js#L325-L338):
```javascript
fs.stat(filePath, (err, stats) => {
  if (err || !stats.isFile()) {
    // Fallback to index.html for SPA client-side routing
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    fs.readFile(indexPath, (readErr, content) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    });
    return;
  }
```
And in [`netlify.toml`](file:///d:/Hospitrack-main/Hospitrack-main/netlify.toml#L4-L7):
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```
Any missing stylesheet or script request is answered with HTTP 200 and the HTML body of `index.html`. This turns a standard 404 error into a fatal MIME rejection in the browser.

#### 3. Strict Security Headers Prevent Styling Fallback
Both [`netlify.toml`](file:///d:/Hospitrack-main/Hospitrack-main/netlify.toml#L14), [`vercel.json`](file:///d:/Hospitrack-main/Hospitrack-main/vercel.json#L17-L18), and [`SecurityConfig.java`](file:///d:/Hospitrack-main/Hospitrack-main/backend/src/main/java/com/hospitrack/security/SecurityConfig.java#L59) configure:
```http
X-Content-Type-Options: nosniff
```
This header explicitly instructs modern browsers (Chrome, Edge, Firefox, Safari) to never execute or render a stylesheet or script whose MIME type is not `text/css` or `application/javascript`.

#### 4. Nested Repository Root Directory Mismatch
The local workspace has nested directories: `d:\Hospitrack-main\Hospitrack-main`. When pushing to Git or deploying via GitHub ZIP extraction:
* If the root directory on Netlify/Vercel/Render is not set to the inner folder, the host cannot find `css/` or `js/` at the root.
* All requests fall back to 404 / index.html, stripping the page of all styles and scripts.

---

## PHASE 3 — BACKEND DEPLOYMENT INVESTIGATION

### Root Cause Analysis: The Spring Boot JAR Warning

The warning logged in the console:
```text
[Backend] Spring Boot JAR not found in candidate paths:
  - d:\Hospitrack-main\Hospitrack-main\backend\target\hospitrack-backend-1.0.0.jar
  - d:\Hospitrack-main\Hospitrack-main\hospitrack-backend-1.0.0.jar
  - d:\Hospitrack-main\Hospitrack-main\app.jar
  - d:\Hospitrack-main\Hospitrack-main\backend.jar
```

#### Detailed Breakdown of Causes

1. **`.gitignore` Excludes All JAR Files:**
   In [`.gitignore`](file:///d:/Hospitrack-main/Hospitrack-main/.gitignore#L17-L20):
   ```gitignore
   backend/target/
   target/
   *.class
   *.jar
   ```
   Because `*.jar` is ignored, any compiled `.jar` file on a developer's local machine is blocked from being committed to source control. When the repository is cloned by a cloud deployment platform (Render, Railway, VPS), no JAR file exists.

2. **No Maven Build Step in `package.json`:**
   In [`package.json`](file:///d:/Hospitrack-main/Hospitrack-main/package.json#L6-L14):
   ```json
   "scripts": {
     "start": "node server.js",
     "dev": "node server.js",
     "serve": "node server.js",
     "py-serve": "python server.py",
     "test": "node test.js"
   }
   ```
   There is no `"build"` command. Cloud hosts deploying Node applications run `npm install` followed by `npm start`. They never invoke Maven to compile the Java backend.

3. **Missing Java / Maven on Standard Node Hosts:**
   Standard PaaS Node.js environments (Render Native Node service, Heroku Node buildpack, Railway Node template) provide only Node.js in their container images. The `java` command and Maven compiler are completely absent.

4. **Corrupted Local Maven Wrapper Due to Blanket `*.jar` Git-Ignore:**
   In [`backend/.mvn/apache-maven-3.9.6`](file:///d:/Hospitrack-main/Hospitrack-main/backend/.mvn/apache-maven-3.9.6):
   * The `boot/` directory contains `plexus-classworlds.license`, but `plexus-classworlds-2.6.0.jar` is missing.
   * The `lib/` directory contains only `.license` files; all Maven runtime JARs (`maven-core.jar`, etc.) were stripped when the repository was added to Git because `.gitignore` contained `*.jar` without an exclusion for `.mvn/`.
   * When [`mvnw.cmd`](file:///d:/Hospitrack-main/Hospitrack-main/backend/mvnw.cmd) executes:
     ```cmd
     -classpath %CLASSWORLDS_JAR%
     ```
     `CLASSWORLDS_JAR` evaluates to empty, immediately failing with:
     ```text
     Error: -classpath requires class path specification
     ```
   * *Note:* The compressed binary archive [`backend/.mvn/apache-maven-3.9.6-bin.zip`](file:///d:/Hospitrack-main/Hospitrack-main/backend/.mvn/apache-maven-3.9.6-bin.zip) (9.5 MB) is intact on disk because `.zip` was not ignored, but it has not been unpacked to restore the stripped JARs.

5. **Port 8080 Collision in `.env.example`:**
   In [`.env.example`](file:///d:/Hospitrack-main/Hospitrack-main/.env.example#L10):
   ```env
   PORT=8080
   ```
   In [`server.js`](file:///d:/Hospitrack-main/Hospitrack-main/server.js#L11-L28), `PORT` controls the frontend web server (default 8000), while `BACKEND_PORT` controls the Spring Boot backend (default 8080).
   If a user copies `.env.example` to `.env` or sets `PORT=8080` in cloud environment variables, Node.js binds port 8080 first. If Spring Boot subsequently attempts to start, Tomcat crashes with `java.net.BindException: Address already in use: bind`.

---

## PHASE 4 — HOSTING COMPATIBILITY AUDIT

A rigorous evaluation of hosting providers against Hospitrack's multi-technology architecture:

| Hosting Platform | Static Frontend? | Node Server? | Python Backend? | Spring Boot (Java 17)? | Multi-Process Support? | Deployment Model | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Vercel** | **YES** | Partial (Serverless only) | Partial (Serverless only) | **NO** (No JVM support) | **NO** | Frontend Only | **Incompatible** for monolithic deployment. Cannot run Spring Boot. |
| **Netlify** | **YES** | Partial (Serverless only) | **NO** | **NO** (No JVM support) | **NO** | Frontend Only | **Incompatible** for monolithic deployment. Cannot run Spring Boot. |
| **Render** | **YES** | **YES** (Web Service) | **YES** (Web Service) | **YES** (via Docker Web Service) | **YES** (Single Docker container or multi-service Blueprint) | Unified Docker or Multi-Service | **Compatible**, but free tier 512MB RAM constraint requires strict JVM memory tuning. |
| **Railway** | **YES** | **YES** (Node Service) | **YES** | **YES** (Native Java 17 Nixpacks / Docker) | **YES** (Multi-service projects) | Decoupled Multi-Service | **Highly Compatible**. Best platform for decoupling Frontend, Backend & Database. |
| **VPS / Cloud Server** (DigitalOcean / AWS / Hetzner) | **YES** (Nginx / Caddy) | **YES** (PM2 / systemd) | **YES** | **YES** (`systemd` Java service) | **YES** (Full root OS access) | Decoupled or Reverse Proxied | **Production Standard**. Highest stability, no RAM throttling, no sleep timeouts. |

### Platform-Specific Limitations & Analysis

#### 1. Netlify & Vercel
* **Why Hospitrack fails here:** Both platforms are strictly static/serverless hosting platforms. They cannot run long-running background daemon processes (Tomcat/Spring Boot).
* **Observed Symptom:** Only static HTML is served. All API calls either return 404 or fall back to `index.html` (MIME syntax error `Unexpected token '<'`).

#### 2. Render
* **Unified Docker Architecture ([`Dockerfile`](file:///d:/Hospitrack-main/Hospitrack-main/Dockerfile)):**
  The repository already includes a multi-stage Dockerfile that builds the Spring Boot JAR with Maven in Stage 1, then installs Node.js and Java 17 JRE in Stage 2 to run `node server.js`.
* **The 512MB RAM Cgroup Trap:**
  Render's Free Tier web service provides exactly 512MB of RAM. Spring Boot with Hibernate, Tomcat, and Spring Security typically consumes 300MB–450MB of RSS memory. Combined with Node.js (80MB–120MB), the unified container frequently hits the 512MB ceiling and is terminated by the Linux Out-Of-Memory (OOM) killer with `Exit code 137`.
* **Cold Starts:**
  Render spins down free web services after 15 minutes of inactivity. When a request arrives, booting both Node.js and Spring Boot takes 45–60 seconds, during which users experience request timeouts or 502 errors.

#### 3. Railway
* Supports connecting a single GitHub repository into multiple linked services:
  * Service A: Static Frontend or Node.js web server.
  * Service B: Spring Boot Backend (built natively via Railway Nixpacks or `backend/Dockerfile`).
  * Service C: Dedicated PostgreSQL database.
* Provides scalable memory limits that prevent JVM OOM crashes.

---

## PHASE 5 — API COMMUNICATION AND PRODUCTION CONFIGURATION

### 1. API Base URL Resolution in `js/config.js`
In [`js/config.js`](file:///d:/Hospitrack-main/Hospitrack-main/js/config.js#L8-L15):
```javascript
const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
let defaultApi = (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:'))
  ? window.location.origin
  : 'http://localhost:8080';

if (isLocalHost && window.location.port !== '8000' && window.location.port !== '8080' && window.location.port !== '') {
  defaultApi = 'http://localhost:8080';
}
```
* **Production Behavior:** On any deployed domain, `defaultApi` resolves to `window.location.origin` (e.g., `https://hospitrack.onrender.com` or `https://my-app.netlify.app`).
* **The Problem:** If the frontend is deployed to Netlify (`https://my-app.netlify.app`), it makes API calls to `https://my-app.netlify.app/api/...`. Because Netlify has no backend, the request fails.
* **Fallback Trap:** If `config.js` fails to load (due to relative path MIME errors), [`authService.js`](file:///d:/Hospitrack-main/Hospitrack-main/js/authService.js#L9) and [`store.js`](file:///d:/Hospitrack-main/Hospitrack-main/js/store.js#L8) fall back to hardcoded `http://localhost:8080`, causing production users' browsers to attempt connecting to their own local machines (`ERR_CONNECTION_REFUSED`).

### 2. CORS Cross-Origin Restrictions
In [`backend/src/main/java/com/hospitrack/security/SecurityConfig.java`](file:///d:/Hospitrack-main/Hospitrack-main/backend/src/main/java/com/hospitrack/security/SecurityConfig.java#L106-L122):
```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    ...
    configuration.setAllowCredentials(true);
```
* **Security Rule:** Because `allowCredentials(true)` is enabled for secure HTTP cookies and session headers, the CORS specification **strictly forbids** wildcard origins (`*`).
* **The Conflict:** Allowed origins are loaded from `${app.cors.allowed-origins}`.
* In [`application-prod.yml`](file:///d:/Hospitrack-main/Hospitrack-main/backend/src/main/resources/application-prod.yml#L39):
  ```yaml
  allowed-origins: ${FRONTEND_URL:http://localhost:8000,http://127.0.0.1:8000,http://localhost:10000,http://127.0.0.1:10000}
  ```
* In [`render.yaml`](file:///d:/Hospitrack-main/Hospitrack-main/render.yaml#L39-L40):
  ```yaml
  - key: FRONTEND_URL
    value: http://localhost:8000,http://127.0.0.1:8000,http://localhost:10000,http://127.0.0.1:10000
  ```
* **The Impact:** If the frontend is hosted on a separate domain (e.g., Vercel, Netlify, or a custom domain), the Spring Boot backend will reject every cross-origin request with a CORS policy violation error unless `FRONTEND_URL` is updated in the backend environment.

### 3. Production PostgreSQL Connection URL Configuration
In [`server.js`](file:///d:/Hospitrack-main/Hospitrack-main/server.js#L35-L193):
* The function `normalizeDatabaseUrl()` parses standard PostgreSQL URIs (such as Supabase connection strings `postgresql://postgres.[ref]:[pass]@[host]:6543/postgres?sslmode=require`) and converts them to JDBC URLs (`jdbc:postgresql://...`).
* However, if `DATABASE_URL` is omitted, unresolved (`${DATABASE_URL}`), or invalid, `server.js` prints a notice and spawns Spring Boot with no database parameters.
* In the `prod` profile, Spring Boot refuses to fall back to H2 memory; it attempts to connect using `org.postgresql.Driver` to an empty URL and crashes on startup.

---

## PHASE 6 — ROOT CAUSE REPORT & DEFECT MATRIX

| Defect ID | Description | Affected Files | Why It Occurs | Deployment Impact | Recommended Architectural Fix |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | Relative Asset Paths causing MIME Type Style Rejection | [`index.html:11-12`](file:///d:/Hospitrack-main/Hospitrack-main/index.html#L11-L12), [`index.html:1268-1285`](file:///d:/Hospitrack-main/Hospitrack-main/index.html#L1268-L1285) | Asset links omit leading slash (`css/...` instead of `/css/...`). Non-root routes request subpaths that 404 and return HTML. | Browsers block styles and scripts under `nosniff`. Unstyled HTML displays. | Change all asset URLs to absolute root paths (`/css/styles.css`, `/js/config.js`). |
| **DEF-02** | Static PaaS Host Selection for Dynamic Java App | [`netlify.toml`](file:///d:/Hospitrack-main/Hospitrack-main/netlify.toml), [`vercel.json`](file:///d:/Hospitrack-main/Hospitrack-main/vercel.json) | Netlify/Vercel are static hosts; they cannot execute `server.js` or Java Spring Boot. | Only basic static files deploy. All backend features fail with 404 or HTML JSON errors. | Deploy backend to a container-capable runtime (Render Docker, Railway, or VPS). |
| **DEF-03** | Missing Pre-compiled Spring Boot JAR | [`.gitignore:17-20`](file:///d:/Hospitrack-main/Hospitrack-main/.gitignore#L17-L20), [`server.js:396-417`](file:///d:/Hospitrack-main/Hospitrack-main/server.js#L396-L417) | `*.jar` is in `.gitignore`, and `package.json` lacks a build script to compile the JAR. | `server.js` aborts backend startup. Port 8080 never opens; all APIs return 502. | Compile JAR via multi-stage Docker build or build pipeline before running `server.js`. |
| **DEF-04** | Broken Embedded Maven Wrapper | [`backend/.mvn/apache-maven-3.9.6`](file:///d:/Hospitrack-main/Hospitrack-main/backend/.mvn/apache-maven-3.9.6) | Blanket `*.jar` in `.gitignore` deleted Plexus classworlds JARs inside `.mvn/`. | `mvnw.cmd` crashes locally with `-classpath requires class path specification`. | Unpack [`apache-maven-3.9.6-bin.zip`](file:///d:/Hospitrack-main/Hospitrack-main/backend/.mvn/apache-maven-3.9.6-bin.zip) or whitelist `.mvn/**/*.jar` in `.gitignore`. |
| **DEF-05** | Production Profile Missing PostgreSQL Config | [`server.js:420`](file:///d:/Hospitrack-main/Hospitrack-main/server.js#L420), [`application-prod.yml`](file:///d:/Hospitrack-main/Hospitrack-main/backend/src/main/resources/application-prod.yml) | Defaulting to `prod` profile when `NODE_ENV` is unset requires external PostgreSQL. | Spring Boot fails on startup if `DATABASE_URL` or `JWT_SECRET` is unset. | Supply valid PostgreSQL credentials or set `SPRING_PROFILES_ACTIVE=dev` for standalone demos. |
| **DEF-06** | CORS Mismatch on Separated Deployments | [`SecurityConfig.java:34`](file:///d:/Hospitrack-main/Hospitrack-main/backend/src/main/java/com/hospitrack/security/SecurityConfig.java#L34), [`render.yaml:39`](file:///d:/Hospitrack-main/Hospitrack-main/render.yaml#L39) | `allowCredentials=true` prevents wildcard `*`. Allowed origins default to localhost. | Browser blocks API calls from deployed frontend domains with CORS errors. | Configure `FRONTEND_URL` environment variable to match the deployed frontend domain. |
| **DEF-07** | Git Conflict Markers in README | [`README.md:1`](file:///d:/Hospitrack-main/Hospitrack-main/README.md#L1), [`README.md:145-149`](file:///d:/Hospitrack-main/Hospitrack-main/README.md#L145-L149) | Unresolved merge conflict markers (`<<<<<<< HEAD`, `=======`, `>>>>>>>`). | Documentation corruption. | Clean git conflict markers from [`README.md`](file:///d:/Hospitrack-main/Hospitrack-main/README.md). |

---

## FINAL DEPLOYMENT RECOMMENDATION

### 1. What Exactly Is Broken?
* **Hosting Paradigm:** You are attempting to deploy a dual-tier full-stack application (Vanilla JS Frontend + Spring Boot Java Backend + PostgreSQL Database) using deployment profiles designed for static websites (Netlify/Vercel).
* **Binary Distribution:** The Spring Boot backend executable JAR does not exist in the repository because git ignores all `.jar` files.
* **Build Chain:** The local Maven wrapper is missing its internal execution JARs, preventing local command-line compilation.
* **Asset Addressing:** Relative asset URLs fail when requested from any path other than root `/`.

### 2. Why Is Only Basic HTML Appearing?
When the application is deployed to a static host (or served through `server.js` with deep routing):
1. The browser requests relative paths like `css/styles.css?v=4.8`.
2. The server cannot resolve the relative path from the subroute and falls back to serving `index.html`.
3. The server sends `Content-Type: text/html` alongside `X-Content-Type-Options: nosniff`.
4. The browser refuses to execute or apply HTML as CSS or JavaScript.
5. Without stylesheets or script execution, the browser renders the unstyled, raw HTML skeleton.

### 3. Why Are CSS and JavaScript Not Loading?
1. **Leading Slashes Omitted:** [`index.html`](file:///d:/Hospitrack-main/Hospitrack-main/index.html) references `css/styles.css` and `js/*.js` instead of `/css/styles.css` and `/js/*.js`.
2. **SPA Redirect Catch-All:** The fallback in [`netlify.toml`](file:///d:/Hospitrack-main/Hospitrack-main/netlify.toml) and [`server.js`](file:///d:/Hospitrack-main/Hospitrack-main/server.js) treats missing static assets as client-side page transitions, masking 404 errors with HTML payloads.

### 4. Why Is the Backend Not Starting?
1. **Absence of JAR File:** `server.js` explicitly checks for `hospitrack-backend-1.0.0.jar`. Because no JAR is committed to Git, the check fails and `server.js` skips the startup command.
2. **Missing Build Automation:** There is no npm build script to compile the backend prior to starting the web server.
3. **No Java in Static Runtimes:** Netlify and Vercel environments do not contain Java 17.

### 5. Should Frontend and Backend Be Deployed Separately?
**YES (Architecturally Recommended) or Unified via Docker Only.**

* **Option A: Decoupled Multi-Service Architecture (RECOMMENDED FOR STABILITY)**
  * **Frontend:** Deploy `index.html`, `css/`, `js/`, `assets/` to **Vercel**, **Netlify**, or **Cloudflare Pages**.
  * **Backend:** Deploy `backend/` to **Render (Docker Web Service)** or **Railway (Java Service)**.
  * **Database:** **Supabase PostgreSQL** or **Neon PostgreSQL** (Free, permanent cloud database).
  * *Why:* Prevents the Java backend from running out of memory on free-tier servers, gives the frontend instant global CDN edge distribution, and eliminates port-proxy orchestration issues.

* **Option B: Unified Single-Service Docker Architecture (ZERO-COST ALL-IN-ONE)**
  * Deploy the existing [`Dockerfile`](file:///d:/Hospitrack-main/Hospitrack-main/Dockerfile) to **Render Web Service** (Environment: Docker) using [`render.yaml`](file:///d:/Hospitrack-main/Hospitrack-main/render.yaml).
  * *Requirement:* Must configure `DATABASE_URL` with external PostgreSQL and ensure JVM memory flags (`-Xmx256m`) remain within Render's 512MB limit.

### 6. Which Hosting Platform Is Most Suitable?

1. **Top Recommendation: Railway (Decoupled Full-Stack Project)**
   * Native Java 17 support, instant PostgreSQL provisioning, and separate static frontend serving. Eliminates 512MB RAM OOM crashes.
2. **Alternative: Render (Using Existing Dockerfile Blueprint)**
   * If you prefer an all-in-one free deployment, use Render **Docker Web Service** (not Render Static Site, and not Render Node Service).
3. **Avoid for Full-Stack: Netlify / Vercel**
   * Do not deploy the entire Hospitrack repository to Netlify or Vercel expecting the backend to work; they are static hosts and cannot run Spring Boot.

### 7. What Should Be Fixed First? (Prioritized Implementation Plan)

* **Step 1: Fix Asset Paths in [`index.html`](file:///d:/Hospitrack-main/Hospitrack-main/index.html)**
  Change all relative paths (`css/...`, `js/...`) to absolute paths with leading slashes (`/css/styles.css`, `/js/config.js`). This permanently resolves the CSS and JavaScript loading failures.
* **Step 2: Restore Local Maven Wrapper & Whitelist Wrapper JARs in [`.gitignore`](file:///d:/Hospitrack-main/Hospitrack-main/.gitignore)**
  Unpack `apache-maven-3.9.6-bin.zip` so `mvnw.cmd` can compile `hospitrack-backend-1.0.0.jar` locally. Add `!.mvn/**/*.jar` to `.gitignore`.
* **Step 3: Fix Port Collisions in [`.env.example`](file:///d:/Hospitrack-main/Hospitrack-main/.env.example)**
  Set `PORT=8000` (Frontend) and `BACKEND_PORT=8080` (Spring Boot).
* **Step 4: Update CORS Origins in [`application-prod.yml`](file:///d:/Hospitrack-main/Hospitrack-main/backend/src/main/resources/application-prod.yml)**
  Configure `FRONTEND_URL` to include the live deployed production domain.
* **Step 5: Configure Production Hosting Target**
  Select either Decoupled (Vercel Frontend + Render/Railway Backend) or Unified Docker (Render Docker Service).

---

> **AUDIT STATUS: COMPLETE**  
> In accordance with the Strict Development Rules, no source files have been modified. All findings are verified directly against the active codebase. Awaiting your approval before proceeding with fixes.
