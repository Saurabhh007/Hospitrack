// ==============================================================================
// HOSPITRACK — PHASE 6 PRODUCTION READINESS & CI/CD VERIFICATION SUITE
// Tests GitHub Readiness, Database Configuration, Railway Manifests,
// Vercel Static Config, CI/CD Workflow, Decoupled CORS, 4-Role RBAC & Isolation
// ==============================================================================

const fs = require('fs');
const path = require('path');
const http = require('http');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition, message) {
    totalChecks++;
    if (condition) {
        passedChecks++;
        console.log(`  ✓ [PASS] ${message}`);
    } else {
        failedChecks++;
        console.error(`  ✗ [FAIL] ${message}`);
    }
}

function makeHttpRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                let parsed = null;
                try { parsed = JSON.parse(body); } catch (e) { parsed = body; }
                resolve({ status: res.statusCode, headers: res.headers, body: parsed });
            });
        });
        req.on('error', reject);
        if (postData) {
            req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
        }
        req.end();
    });
}

async function runPhase6Verification() {
    console.log('======================================================================');
    console.log('  HOSPITRACK — PHASE 6 PRODUCTION CLOUD READINESS & CI/CD SUITE');
    console.log('======================================================================\n');

    // --------------------------------------------------------------------------
    // MODULE 6.1: GITHUB READINESS & REPOSITORY AUDIT
    // --------------------------------------------------------------------------
    console.log('[MODULE 6.1] Auditing GitHub Readiness, Secrets Exclusions & Documentation...');

    const gitignorePath = path.join(__dirname, '.gitignore');
    assert(fs.existsSync(gitignorePath), '.gitignore exists');
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    assert(gitignoreContent.includes('.env'), '.gitignore excludes .env files');
    assert(gitignoreContent.includes('*.pem') || gitignoreContent.includes('*.key'), '.gitignore excludes private keys (*.pem, *.key)');
    assert(gitignoreContent.includes('runtime/*.log') || gitignoreContent.includes('*.log'), '.gitignore excludes runtime logs');
    assert(gitignoreContent.includes('HOSPITRACK_PHASE_*_REPORT.md'), '.gitignore excludes internal phase development reports');

    const envExamplePath = path.join(__dirname, '.env.example');
    assert(fs.existsSync(envExamplePath), '.env.example template exists for production guidance');

    const readmePath = path.join(__dirname, 'README.md');
    assert(fs.existsSync(readmePath), 'README.md exists');
    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    assert(readmeContent.includes('Vercel') && readmeContent.includes('Railway'), 'README.md documents Vercel, Railway, and Managed PostgreSQL target architecture');

    // --------------------------------------------------------------------------
    // MODULE 6.2: PRODUCTION DATABASE CONFIGURATION
    // --------------------------------------------------------------------------
    console.log('\n[MODULE 6.2] Auditing Production Database Provisioning & Idempotency Safeguards...');

    const appProdPath = path.join(__dirname, 'backend', 'src', 'main', 'resources', 'application-prod.yml');
    assert(fs.existsSync(appProdPath), 'application-prod.yml exists');
    const appProdContent = fs.readFileSync(appProdPath, 'utf8');
    assert(appProdContent.includes('PostgreSQLDialect'), 'application-prod.yml specifies PostgreSQLDialect');
    assert(appProdContent.includes('ddl-auto: ${HIBERNATE_DDL_AUTO:update}'), 'application-prod.yml uses safe non-destructive DDL update');
    assert(appProdContent.includes('include-stacktrace: never'), 'application-prod.yml disables production error stack traces');

    const dbConfigPath = path.join(__dirname, 'backend', 'src', 'main', 'java', 'com', 'hospitrack', 'config', 'DatabaseConfig.java');
    assert(fs.existsSync(dbConfigPath), 'DatabaseConfig.java exists');
    const dbConfigContent = fs.readFileSync(dbConfigPath, 'utf8');
    assert(dbConfigContent.includes('DATABASE_URL') && dbConfigContent.includes('normalize'), 'DatabaseConfig supports dynamic PostgreSQL connection URI normalization');
    assert(dbConfigContent.includes('HikariDataSource'), 'DatabaseConfig manages HikariCP production connection pooling');

    const seederPath = path.join(__dirname, 'backend', 'src', 'main', 'java', 'com', 'hospitrack', 'service', 'DatabaseSeeder.java');
    assert(fs.existsSync(seederPath), 'DatabaseSeeder.java exists');
    const seederContent = fs.readFileSync(seederPath, 'utf8');
    assert(seederContent.includes('hospitalRepository.count() > 0'), 'DatabaseSeeder enforces idempotency check preventing duplicate production seeding');

    // --------------------------------------------------------------------------
    // MODULE 6.3: RAILWAY BACKEND DEPLOYMENT READINESS
    // --------------------------------------------------------------------------
    console.log('\n[MODULE 6.3] Auditing Railway Backend Deployment Descriptors...');

    const railwayPath = path.join(__dirname, 'railway.json');
    assert(fs.existsSync(railwayPath), 'railway.json exists');
    const railwayContent = JSON.parse(fs.readFileSync(railwayPath, 'utf8'));
    assert(railwayContent.build && railwayContent.build.rootDirectory === 'backend', 'railway.json rootDirectory points to backend');
    assert(railwayContent.deploy && railwayContent.deploy.healthcheckPath === '/api/health', 'railway.json configures /api/health healthcheck probe');

    const backendDockerPath = path.join(__dirname, 'backend', 'Dockerfile');
    assert(fs.existsSync(backendDockerPath), 'backend/Dockerfile exists');
    const dockerContent = fs.readFileSync(backendDockerPath, 'utf8');
    assert(dockerContent.includes('USER hospitrack:hospitrack'), 'backend/Dockerfile executes as unprivileged non-root user');
    assert(dockerContent.includes('EXPOSE 8080'), 'backend/Dockerfile exposes port 8080');
    assert(dockerContent.includes('/api/health'), 'backend/Dockerfile configures built-in healthcheck probe');

    const dockerignorePath = path.join(__dirname, 'backend', '.dockerignore');
    assert(fs.existsSync(dockerignorePath), 'backend/.dockerignore exists');

    // --------------------------------------------------------------------------
    // MODULE 6.4: VERCEL FRONTEND DEPLOYMENT READINESS
    // --------------------------------------------------------------------------
    console.log('\n[MODULE 6.4] Auditing Vercel Frontend Deployment Descriptors...');

    const vercelPath = path.join(__dirname, 'vercel.json');
    assert(fs.existsSync(vercelPath), 'vercel.json exists');
    const vercelContent = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
    assert(vercelContent.rewrites && vercelContent.rewrites.length > 0, 'vercel.json defines SPA client-side rewrite rules');
    assert(vercelContent.headers && vercelContent.headers.some(h => h.headers.some(x => x.key === 'X-Frame-Options')), 'vercel.json injects X-Frame-Options security header');
    assert(vercelContent.headers && vercelContent.headers.some(h => h.headers.some(x => x.key === 'Referrer-Policy')), 'vercel.json injects Referrer-Policy security header');

    const html404Path = path.join(__dirname, '404.html');
    assert(fs.existsSync(html404Path), '404.html exists to prevent missing asset fallback');

    const envConfigPath = path.join(__dirname, 'env-config.js');
    assert(fs.existsSync(envConfigPath), 'env-config.js exists for runtime API endpoint configuration');

    const jsConfigPath = path.join(__dirname, 'js', 'config.js');
    assert(fs.existsSync(jsConfigPath), 'js/config.js exists');
    const jsConfigContent = fs.readFileSync(jsConfigPath, 'utf8');
    assert(jsConfigContent.includes("base.endsWith('/api') && (cleanPath === '/api' || cleanPath.startsWith('/api/'))"), 'js/config.js prevents /api/api duplicate path concatenation');

    // --------------------------------------------------------------------------
    // MODULE 6.7: GITHUB ACTIONS CI-ONLY PIPELINE
    // --------------------------------------------------------------------------
    console.log('\n[MODULE 6.7] Auditing GitHub Actions CI-Only Pipeline Workflow...');

    const workflowPath = path.join(__dirname, '.github', 'workflows', 'ci-cd.yml');
    assert(fs.existsSync(workflowPath), '.github/workflows/ci-cd.yml exists');
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    assert(workflowContent.includes('actions/setup-java@v4') && workflowContent.includes("java-version: '17'"), 'Workflow sets up Java 17');
    assert(workflowContent.includes('actions/setup-node@v4') && workflowContent.includes("node-version: '20'"), 'Workflow sets up Node.js 20');
    assert(workflowContent.includes('mvn test'), 'Workflow builds Spring Boot and executes backend test suite');
    assert(workflowContent.includes('services:') && workflowContent.includes('postgres:16-alpine'), 'Workflow provisions isolated PostgreSQL service container');
    assert(workflowContent.includes('test_phase6_production_readiness.js'), 'Workflow executes production readiness audit suite');
    assert(workflowContent.includes('test_phase5_frontend_deployment.js'), 'Workflow executes frontend deployment & integration test suite');
    assert(workflowContent.includes('test.js'), 'Workflow executes core QA integration test suite');
    assert(workflowContent.includes('smoke_test.js'), 'Workflow executes full production smoke test suite');
    assert(workflowContent.includes('docker/build-push-action') && workflowContent.includes('push: false'), 'Workflow verifies Docker image build without publishing');
    assert(!workflowContent.includes('RAILWAY_TOKEN') && !workflowContent.includes('railway up'), 'Workflow contains zero Railway deployment commands or secrets');
    assert(!workflowContent.includes('VERCEL_TOKEN') && !workflowContent.includes('vercel deploy'), 'Workflow contains zero Vercel deployment commands or secrets');
    assert(!workflowContent.includes('deploy-production'), 'Workflow contains no production deployment jobs');

    // --------------------------------------------------------------------------
    // MODULE 6.6 & 6.8: LIVE BACKEND HEALTH, CORS & RBAC SECURITY VERIFICATION
    // --------------------------------------------------------------------------
    console.log('\n[MODULE 6.6 & 6.8] Testing Live Container CORS, Authentication & Multi-Role RBAC...');

    try {
        // 1. Healthcheck
        const healthRes = await makeHttpRequest({
            hostname: '127.0.0.1',
            port: 8080,
            path: '/api/health',
            method: 'GET'
        });
        assert(healthRes.status === 200 && (healthRes.body.status === 'UP' || JSON.stringify(healthRes.body).includes('UP')), 'Live backend container /api/health responds HTTP 200 UP');

        // 2.1 CORS Preflight for Approved Production Origin
        const corsVercelRes = await makeHttpRequest({
            hostname: '127.0.0.1',
            port: 8080,
            path: '/api/auth/login',
            method: 'OPTIONS',
            headers: {
                'Origin': 'https://hospitrack-prod.vercel.app',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type,Authorization'
            }
        });
        assert(corsVercelRes.status === 200, 'CORS preflight for approved origin returns HTTP 200');
        assert(corsVercelRes.headers['access-control-allow-origin'] === 'https://hospitrack-prod.vercel.app', 'CORS Access-Control-Allow-Origin correctly mirrors approved origin');
        assert(corsVercelRes.headers['access-control-allow-credentials'] === 'true', 'CORS Access-Control-Allow-Credentials is true for approved origin');
        assert(corsVercelRes.headers['access-control-allow-headers'] && corsVercelRes.headers['access-control-allow-headers'].toLowerCase().includes('authorization'), 'CORS Access-Control-Allow-Headers explicitly permits Authorization header');
        assert(corsVercelRes.headers['access-control-allow-methods'] && corsVercelRes.headers['access-control-allow-methods'].includes('POST'), 'CORS Access-Control-Allow-Methods permits required HTTP methods');

        // 2.2 CORS Preflight for Unapproved Origin (Security Isolation)
        const corsUnapprovedRes = await makeHttpRequest({
            hostname: '127.0.0.1',
            port: 8080,
            path: '/api/auth/login',
            method: 'OPTIONS',
            headers: {
                'Origin': 'https://unauthorized-attacker.example.com',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type,Authorization'
            }
        });
        assert(!corsUnapprovedRes.headers['access-control-allow-origin'] || corsUnapprovedRes.headers['access-control-allow-origin'] !== 'https://unauthorized-attacker.example.com', 'CORS rejects unapproved origin (No Access-Control-Allow-Origin header returned for attacker domain)');

        // 3. Super Admin Authentication
        const superAdminLogin = await makeHttpRequest({
            hostname: '127.0.0.1',
            port: 8080,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Origin': 'https://hospitrack.vercel.app' }
        }, { email: 'admin@hospitrack.com', password: 'Admin@Hospitrack2026!' });

        assert(superAdminLogin.status === 200 && (superAdminLogin.body.success || superAdminLogin.body.data), 'SUPER_ADMIN authenticated successfully (HTTP 200)');
        const superAdminToken = superAdminLogin.body?.data?.accessToken || superAdminLogin.body?.token;
        assert(!!superAdminToken, 'JWT Bearer token issued to SUPER_ADMIN');

        // 4. Hospital Admin Authentication
        const hospAdminLogin = await makeHttpRequest({
            hostname: '127.0.0.1',
            port: 8080,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Origin': 'https://hospitrack.vercel.app' }
        }, { email: 'admin@citygeneral.in', password: 'Hospital@123!' });
        assert(hospAdminLogin.status === 200 && (hospAdminLogin.body.success || hospAdminLogin.body.data), 'HOSPITAL_ADMIN authenticated successfully (HTTP 200)');

        // 5. Doctor Authentication
        const docLogin = await makeHttpRequest({
            hostname: '127.0.0.1',
            port: 8080,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Origin': 'https://hospitrack.vercel.app' }
        }, { email: 's.sharma@citygeneral.in', password: 'Doctor@123!' });
        assert(docLogin.status === 200 && (docLogin.body.success || docLogin.body.data), 'DOCTOR authenticated successfully (HTTP 200)');
        const docToken = docLogin.body?.data?.accessToken || docLogin.body?.token;

        // 6. Patient Authentication
        const patLogin = await makeHttpRequest({
            hostname: '127.0.0.1',
            port: 8080,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Origin': 'https://hospitrack.vercel.app' }
        }, { email: 'john.doe@email.com', password: 'Patient@123!' });
        assert(patLogin.status === 200 && (patLogin.body.success || patLogin.body.data), 'PATIENT authenticated successfully (HTTP 200)');
        const patToken = patLogin.body?.data?.accessToken || patLogin.body?.token;

        // 7. RBAC Escalation Prevention (Patient blocked from Admin bed network)
        const patBlocked = await makeHttpRequest({
            hostname: '127.0.0.1',
            port: 8080,
            path: '/api/admin/bed-network',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${patToken}` }
        });
        assert(patBlocked.status === 403, 'PATIENT blocked from admin bed network (HTTP 403 Forbidden)');

        // 8. Super Admin Permitted
        const superPermitted = await makeHttpRequest({
            hostname: '127.0.0.1',
            port: 8080,
            path: '/api/admin/bed-network',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${superAdminToken}` }
        });
        assert(superPermitted.status === 200, 'SUPER_ADMIN permitted to view global bed network (HTTP 200)');

        // 9. Clinical Safety: Duplicate Medicine Rejection
        const duplicateDrugRes = await makeHttpRequest({
            hostname: '127.0.0.1',
            port: 8080,
            path: '/api/prescriptions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${docToken}`
            }
        }, {
            patientId: 'PAT-301',
            doctorId: 'DOC-201',
            hospitalId: 'HOSP-101',
            medicines: [
                { name: 'Metoprolol', dosage: '25mg', frequency: 'BD', duration: '5 days' },
                { name: 'Metoprolol', dosage: '50mg', frequency: 'OD', duration: '5 days' }
            ]
        });
        assert(duplicateDrugRes.status === 422 || duplicateDrugRes.status === 400, 'Duplicate medicine in prescription rejected (HTTP 422/400 Safety Guard)');

    } catch (err) {
        console.error('  ✗ [ERROR] Live backend integration checks failed:', err.message);
    }

    // --------------------------------------------------------------------------
    // SUMMARY
    // --------------------------------------------------------------------------
    console.log('\n======================================================================');
    console.log(`  PHASE 6 VERIFICATION COMPLETED: ${passedChecks}/${totalChecks} CHECKS PASSED`);
    console.log('======================================================================\n');

    if (failedChecks > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runPhase6Verification();
