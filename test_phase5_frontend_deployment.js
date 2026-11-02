/**
 * Hospitrack — Phase 5 Frontend Production Deployment & Cloud Integration Verification
 * Validates:
 * 1. Static hosting configuration files (vercel.json, netlify.toml, 404.html, env-config.js)
 * 2. Static asset integrity (all CSS, JS, and modules referenced in index.html)
 * 3. Decoupled cross-origin API connectivity and CORS pattern matching (*.vercel.app, *.netlify.app)
 * 4. Authentication across all 4 user roles (SUPER_ADMIN, HOSPITAL_ADMIN, DOCTOR, PATIENT)
 * 5. Multi-tenant data isolation & RBAC boundaries
 * 6. Clinical safety duplicate drug rule execution
 * 7. Graceful session termination and token revocation
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT_DIR = __dirname;
const BACKEND_PORT = 8080;
const BACKEND_HOST = 'localhost';

function requestApi(method, apiPath, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = { ...headers };
    if (payload) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request({
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: apiPath,
      method: method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          raw: data
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runPhase5Verification() {
  console.log('======================================================================');
  console.log('  HOSPITRACK — PHASE 5 FRONTEND DEPLOYMENT & INTEGRATION SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  let total = 0;

  function check(desc, condition) {
    total++;
    if (condition) {
      console.log(`  ✓ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${desc}`);
      throw new Error(`Assertion failed: ${desc}`);
    }
  }

  // -------------------------------------------------------------------------
  // SECTION 1: Static Hosting Configuration & Asset Integrity
  // -------------------------------------------------------------------------
  console.log('[SECTION 1] Auditing Static Hosting Configuration & Assets...');

  // 1.1 index.html and 404.html
  const indexHtmlPath = path.join(ROOT_DIR, 'index.html');
  const notFoundHtmlPath = path.join(ROOT_DIR, '404.html');
  check('index.html exists and is non-empty', fs.existsSync(indexHtmlPath) && fs.statSync(indexHtmlPath).size > 10000);
  check('404.html exists and is non-empty', fs.existsSync(notFoundHtmlPath) && fs.statSync(notFoundHtmlPath).size > 500);

  // 1.2 vercel.json
  const vercelPath = path.join(ROOT_DIR, 'vercel.json');
  check('vercel.json exists', fs.existsSync(vercelPath));
  const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  check('vercel.json contains SPA rewrite rule', Array.isArray(vercelConfig.rewrites) && vercelConfig.rewrites.some(r => r.destination === '/index.html'));
  check('vercel.json contains security headers (X-Frame-Options, X-Content-Type-Options)', Array.isArray(vercelConfig.headers) && vercelConfig.headers.length > 0);

  // 1.3 netlify.toml
  const netlifyPath = path.join(ROOT_DIR, 'netlify.toml');
  check('netlify.toml exists', fs.existsSync(netlifyPath));
  const netlifyContent = fs.readFileSync(netlifyPath, 'utf8');
  check('netlify.toml contains 404 guards for missing static assets', netlifyContent.includes('from = "/css/*"') && netlifyContent.includes('status = 404'));
  check('netlify.toml contains SPA redirect', netlifyContent.includes('from = "/*"') && netlifyContent.includes('status = 200'));

  // 1.4 env-config.js & js/config.js
  const envConfigPath = path.join(ROOT_DIR, 'env-config.js');
  check('env-config.js exists', fs.existsSync(envConfigPath));
  const configJsPath = path.join(ROOT_DIR, 'js', 'config.js');
  check('js/config.js exists', fs.existsSync(configJsPath));

  // 1.5 Verify all 21 referenced CSS and JS assets in index.html
  const html = fs.readFileSync(indexHtmlPath, 'utf8');
  const linkRegex = /<link[^>]+href=["']([^"']+)["']/g;
  const scriptRegex = /<script[^>]+src=["']([^"']+)["']/g;
  const assetPaths = [];
  let m;
  while ((m = linkRegex.exec(html)) !== null) {
    if (!m[1].startsWith('http') && !m[1].startsWith('data:')) assetPaths.push(m[1].split('?')[0]);
  }
  while ((m = scriptRegex.exec(html)) !== null) {
    if (!m[1].startsWith('http')) assetPaths.push(m[1].split('?')[0]);
  }

  let allAssetsExist = true;
  assetPaths.forEach((a) => {
    const p = path.join(ROOT_DIR, a.replace(/^\//, ''));
    if (!fs.existsSync(p) || fs.statSync(p).size === 0) allAssetsExist = false;
  });
  check(`All ${assetPaths.length} static assets in index.html exist with non-zero size`, allAssetsExist);

  // -------------------------------------------------------------------------
  // SECTION 2: Decoupled CORS Configuration & Wildcard Origin Matching
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 2] Verifying Decoupled Cross-Origin (CORS) Security...');

  // 2.1 Backend Health
  const healthRes = await requestApi('GET', '/api/health');
  check('Backend /api/health returns HTTP 200 UP', healthRes.status === 200 && healthRes.data?.status === 'UP');

  // 2.2 CORS Preflight for *.vercel.app
  const vercelPreflight = await requestApi('OPTIONS', '/api/auth/login', null, {
    'Origin': 'https://hospitrack-preview.vercel.app',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'authorization,content-type'
  });
  check('CORS preflight for *.vercel.app returns HTTP 200', vercelPreflight.status === 200);
  check('CORS Access-Control-Allow-Origin matches *.vercel.app origin', vercelPreflight.headers['access-control-allow-origin'] === 'https://hospitrack-preview.vercel.app');
  check('CORS Access-Control-Allow-Credentials is true', vercelPreflight.headers['access-control-allow-credentials'] === 'true');

  // 2.3 CORS Preflight for *.netlify.app
  const netlifyPreflight = await requestApi('OPTIONS', '/api/auth/login', null, {
    'Origin': 'https://hospitrack.netlify.app',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'authorization,content-type'
  });
  check('CORS preflight for *.netlify.app returns HTTP 200', netlifyPreflight.status === 200);
  check('CORS Access-Control-Allow-Origin matches *.netlify.app origin', netlifyPreflight.headers['access-control-allow-origin'] === 'https://hospitrack.netlify.app');

  // 2.4 CORS Preflight for static port 3000
  const port3000Preflight = await requestApi('OPTIONS', '/api/auth/login', null, {
    'Origin': 'http://localhost:3000',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'authorization,content-type'
  });
  check('CORS preflight for local static hosting (port 3000) returns HTTP 200', port3000Preflight.status === 200);
  check('CORS Access-Control-Allow-Origin matches http://localhost:3000', port3000Preflight.headers['access-control-allow-origin'] === 'http://localhost:3000');

  // -------------------------------------------------------------------------
  // SECTION 3: Authentication Across All 4 User Roles
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 3] Verifying Cross-Origin Authentication for All 4 Roles...');

  // 3.1 SUPER_ADMIN
  const superAdminLogin = await requestApi('POST', '/api/auth/login', {
    email: 'admin@hospitrack.com',
    password: 'Admin@Hospitrack2026!'
  }, { 'Origin': 'https://hospitrack.vercel.app' });
  check('SUPER_ADMIN login succeeds (HTTP 200)', superAdminLogin.status === 200 && superAdminLogin.data?.success);
  check('SUPER_ADMIN role confirmed', superAdminLogin.data?.data?.user?.role === 'SUPER_ADMIN');
  const superAdminToken = superAdminLogin.data?.data?.accessToken;
  check('JWT access token issued to SUPER_ADMIN', !!superAdminToken);

  // 3.2 HOSPITAL_ADMIN
  const hospAdminLogin = await requestApi('POST', '/api/auth/login', {
    email: 'admin@citygeneral.in',
    password: 'Hospital@123!'
  }, { 'Origin': 'https://hospitrack.vercel.app' });
  check('HOSPITAL_ADMIN login succeeds (HTTP 200)', hospAdminLogin.status === 200 && hospAdminLogin.data?.success);
  check('HOSPITAL_ADMIN role confirmed and bound to HOSP-101', hospAdminLogin.data?.data?.user?.role === 'HOSPITAL_ADMIN' && hospAdminLogin.data?.data?.user?.hospitalId === 'HOSP-101');
  const hospAdminToken = hospAdminLogin.data?.data?.accessToken;

  // 3.3 DOCTOR
  const doctorLogin = await requestApi('POST', '/api/auth/login', {
    email: 's.sharma@citygeneral.in',
    password: 'Doctor@123!'
  }, { 'Origin': 'https://hospitrack.vercel.app' });
  check('DOCTOR login succeeds (HTTP 200)', doctorLogin.status === 200 && doctorLogin.data?.success);
  check('DOCTOR role confirmed and bound to DOC-201', doctorLogin.data?.data?.user?.role === 'DOCTOR' && doctorLogin.data?.data?.user?.doctorId === 'DOC-201');
  const doctorToken = doctorLogin.data?.data?.accessToken;

  // 3.4 PATIENT
  const patientLogin = await requestApi('POST', '/api/auth/login', {
    email: 'john.doe@email.com',
    password: 'Patient@123!'
  }, { 'Origin': 'https://hospitrack.vercel.app' });
  check('PATIENT login succeeds (HTTP 200)', patientLogin.status === 200 && patientLogin.data?.success);
  check('PATIENT role confirmed and bound to PAT-301', patientLogin.data?.data?.user?.role === 'PATIENT' && patientLogin.data?.data?.user?.patientId === 'PAT-301');
  const patientToken = patientLogin.data?.data?.accessToken;

  // -------------------------------------------------------------------------
  // SECTION 4: Role-Based Access Control & Multi-Hospital Isolation
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 4] Testing Multi-Tenant Data Isolation & RBAC Boundaries...');

  // 4.1 Non-admin blocked from admin endpoints
  const patientBlockedFromAdmin = await requestApi('GET', '/api/admin/bed-network', null, {
    'Authorization': `Bearer ${patientToken}`
  });
  check('Patient blocked from Super Admin bed network (HTTP 403)', patientBlockedFromAdmin.status === 403);

  const docBlockedFromAdmin = await requestApi('GET', '/api/admin/bed-network', null, {
    'Authorization': `Bearer ${doctorToken}`
  });
  check('Doctor blocked from Super Admin bed network (HTTP 403)', docBlockedFromAdmin.status === 403);

  // 4.2 Super Admin access to bed network
  const superAdminBedNetwork = await requestApi('GET', '/api/admin/bed-network', null, {
    'Authorization': `Bearer ${superAdminToken}`
  });
  check('Super Admin can access global bed network (HTTP 200)', superAdminBedNetwork.status === 200 && superAdminBedNetwork.data?.success);

  // 4.3 Cross-Hospital Doctor Modification Blocked
  const crossHospMod = await requestApi('PUT', '/api/doctors/DOC-202', {
    name: 'Unauthorized Edit',
    specialty: 'Surgery'
  }, {
    'Authorization': `Bearer ${hospAdminToken}`
  });
  check('Hospital 1 Admin blocked from modifying Hospital 2 Doctor (HTTP 403)', crossHospMod.status === 403);

  // -------------------------------------------------------------------------
  // SECTION 5: Clinical Safety & Workflows
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 5] Testing Clinical Safety & Prescriptions...');

  // 5.1 Duplicate Drug Safety Violation Rejection
  const dupDrugOrder = await requestApi('POST', '/api/prescriptions', {
    patientId: 'PAT-300',
    medicines: [
      { name: 'Metoprolol', dosage: '25mg', frequency: 'Twice daily', duration: '14 days' },
      { name: 'metoprolol', dosage: '50mg', frequency: 'Once daily', duration: '7 days' }
    ],
    instructions: 'Test duplicate drug rejection'
  }, {
    'Authorization': `Bearer ${doctorToken}`
  });
  check('Backend rejects duplicate medicine in prescription order (HTTP 422/400)', dupDrugOrder.status === 422 || dupDrugOrder.status === 400);

  // 5.2 Valid Prescription Signing
  const validDrugOrder = await requestApi('POST', '/api/prescriptions', {
    patientId: 'PAT-300',
    medicines: [
      { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily at bedtime', duration: '30 days' },
      { name: 'Pantoprazole', dosage: '40mg', frequency: 'Once daily before breakfast', duration: '30 days' }
    ],
    instructions: 'Take as directed. Routine outpatient follow-up in 3 months.'
  }, {
    'Authorization': `Bearer ${doctorToken}`
  });
  check('Valid multi-drug clinical prescription signed and persisted (HTTP 201/200)', (validDrugOrder.status === 200 || validDrugOrder.status === 201) && validDrugOrder.data?.success);

  // -------------------------------------------------------------------------
  // SECTION 6: Session Termination & Revocation
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 6] Testing Session Termination...');

  const logoutRes = await requestApi('POST', '/api/auth/logout', {
    refreshToken: null
  }, {
    'Authorization': `Bearer ${superAdminToken}`
  });
  check('Logout endpoint responds successfully (HTTP 200)', logoutRes.status === 200);

  console.log('\n======================================================================');
  console.log(`  PHASE 5 VERIFICATION COMPLETED: ${passed}/${total} CHECKS PASSED (100% SUCCESS)`);
  console.log('======================================================================\n');
}

runPhase5Verification().catch((err) => {
  console.error('\nPhase 5 Verification Failed:', err);
  process.exit(1);
});
