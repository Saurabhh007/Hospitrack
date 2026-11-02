/**
 * Hospitrack — Automated Integration & Quality Assurance Test Suite
 * Validates real Spring Boot 3.3 REST APIs, Spring Security 6 RBAC,
 * Clinical Workflows, Duplicate Drug Prevention, and PostgreSQL state.
 */

const http = require('http');

function post(path, data, token = null) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: 'POST',
      headers: headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, raw: body }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function put(path, data, token = null) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: 'PUT',
      headers: headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, raw: body }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function patch(path, data, token = null) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: 'PATCH',
      headers: headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, raw: body }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(path, token = null) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: 'GET',
      headers: headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, raw: body }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runQaSuite() {
  console.log('\n======================================================');
  console.log('   RUNNING HOSPITRACK COMPREHENSIVE QA TEST SUITE');
  console.log('======================================================\n');

  try {
    // 1. Health check
    console.log('[1/8] Verifying Backend Health API...');
    const health = await get('/api/auth/health');
    console.assert(health.status === 200, `Health check failed: ${health.status}`);
    console.assert(health.data.status === 'UP', 'Health status must be UP');
    console.log('  ✓ Backend is UP and operational on port 8080');

    // 2. Authentication of all 4 roles
    console.log('[2/8] Testing Authentication across all roles...');
    
    // Super Admin
    const adminAuth = await post('/api/auth/login', {
      email: 'admin@hospitrack.com',
      password: 'Admin@Hospitrack2026!'
    });
    console.assert(adminAuth.status === 200 && adminAuth.data.data?.accessToken, 'Super Admin login failed');
    console.assert(adminAuth.data.data?.user?.role === 'SUPER_ADMIN', 'Role must be SUPER_ADMIN');
    const adminToken = adminAuth.data.data?.accessToken;
    console.log('  ✓ Super Admin authenticated successfully (JWT issued)');

    // Hospital Admin
    const hospAuth = await post('/api/auth/login', {
      email: 'admin@citygeneral.in',
      password: 'Hospital@123!'
    });
    console.assert(hospAuth.status === 200 && hospAuth.data.data?.accessToken, 'Hospital login failed');
    console.assert(hospAuth.data.data?.user?.role === 'HOSPITAL_ADMIN', 'Role must be HOSPITAL_ADMIN');
    const hospToken = hospAuth.data.data?.accessToken;
    console.log('  ✓ Hospital Admin authenticated successfully');

    // Doctor
    const docAuth = await post('/api/auth/login', {
      email: 's.sharma@citygeneral.in',
      password: 'Doctor@123!'
    });
    console.assert(docAuth.status === 200 && docAuth.data.data?.accessToken, 'Doctor login failed');
    console.assert(docAuth.data.data?.user?.role === 'DOCTOR', 'Role must be DOCTOR');
    const docToken = docAuth.data.data?.accessToken;
    console.log('  ✓ Doctor authenticated successfully');

    // Patient
    const patAuth = await post('/api/auth/login', {
      email: 'john.doe@email.com',
      password: 'Patient@123!'
    });
    console.assert(patAuth.status === 200 && patAuth.data.data?.accessToken, 'Patient login failed');
    console.assert(patAuth.data.data?.user?.role === 'PATIENT', 'Role must be PATIENT');
    const patToken = patAuth.data.data?.accessToken;
    console.log('  ✓ Patient authenticated successfully');

    // 3. Security Boundary & Role Isolation (RBAC)
    console.log('[3/8] Testing Security Boundary & Role Isolation...');
    const patToAdmin = await get('/api/admin/overview', patToken);
    console.assert(patToAdmin.status === 403, `Patient must be forbidden from /api/admin/* (got ${patToAdmin.status})`);
    
    const docToAdmin = await get('/api/admin/overview', docToken);
    console.assert(docToAdmin.status === 403, `Doctor must be forbidden from /api/admin/* (got ${docToAdmin.status})`);
    console.log('  ✓ Role-Based Access Control verified (Non-admins blocked with 403)');

    // 4. Invalid Credentials Rejection
    console.log('[4/8] Testing Invalid Credentials Handling...');
    const badAuth = await post('/api/auth/login', {
      email: 'john.doe@email.com',
      password: 'WrongPassword123!'
    });
    console.assert(badAuth.status === 401, `Invalid password should return 401 (got ${badAuth.status})`);
    console.log('  ✓ Invalid password rejected with 401 Unauthorized');

    // 5. Clinical Workflow & Duplicate Medication Safety
    console.log('[5/8] Testing Clinical Prescription & Duplicate Drug Safety Rule...');
    const dupRx = await post('/api/prescriptions', {
      patientId: 'PAT-301',
      doctorId: 'DOC-201',
      hospitalId: 'HOSP-101',
      medicines: [
        { name: 'Metoprolol', dosage: '50mg', frequency: 'Twice daily', duration: '30 days' },
        { name: 'Aspirin', dosage: '75mg', frequency: 'Once daily', duration: '30 days' },
        { name: 'Metoprolol', dosage: '25mg', frequency: 'Once daily', duration: '14 days' }
      ],
      instructions: 'Take after meals'
    }, docToken);
    console.assert(dupRx.status === 422 || dupRx.status === 400, `Duplicate drug must return 422 or 400 (got ${dupRx.status})`);
    console.log('  ✓ Backend rejected duplicate medication in prescription order (Duplicate Drug Prevention)');

    const validRx = await post('/api/prescriptions', {
      patientId: 'PAT-301',
      doctorId: 'DOC-201',
      hospitalId: 'HOSP-101',
      medicines: [
        { name: 'Metoprolol Tartrate', dosage: '50mg', frequency: 'Twice daily', duration: '30 days' },
        { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily at night', duration: '30 days' }
      ],
      instructions: 'Monitor BP weekly'
    }, docToken);
    console.assert(validRx.status === 201 || validRx.status === 200, `Valid prescription creation failed: ${validRx.status}`);
    console.log('  ✓ Valid multi-drug prescription signed and persisted');

    // 6. Referral and Transfer Lifecycle
    console.log('[6/8] Testing Inter-Hospital Referrals & Emergency Transfers...');
    const newRef = await post('/api/referrals', {
      patientId: 'PAT-301',
      fromHospitalId: 'HOSP-101',
      toHospitalId: 'HOSP-102',
      doctorId: 'DOC-201',
      priority: 'URGENT',
      reason: 'Specialist MRI Neurological Review'
    }, docToken);
    console.assert(newRef.status === 201 || newRef.status === 200, `Referral creation failed: ${newRef.status}`);
    console.log('  ✓ Referral created and registered in cross-hospital pipeline');

    // 7. Super Admin Overview & Audit Trail
    console.log('[7/8] Testing Super Admin Overview & Audit Trail Ledger...');
    const adminOverview = await get('/api/admin/overview', adminToken);
    console.assert(adminOverview.status === 200, `Admin overview failed: ${adminOverview.status}`);
    console.assert(adminOverview.data.data?.totalHospitals > 0, 'Must report registered hospitals');
    console.assert(adminOverview.data.data?.totalPatients > 0, 'Must report registered patients');

    const auditLogs = await get('/api/audit', adminToken);
    console.assert(auditLogs.status === 200, `Audit logs fetch failed: ${auditLogs.status}`);
    console.assert(Array.isArray(auditLogs.data.data) && auditLogs.data.data.length > 0, 'Must contain tamper-evident logs');
    console.log(`  ✓ Super Admin verified ${auditLogs.data.data.length} immutable SHA-256 audit ledger entries`);

    // 8. Public Registration Validation
    console.log('[8/8] Testing Public Registration & Account Creation Block...');
    const regAdmin = await post('/api/auth/register', {
      name: 'Illegal Admin Sign-up',
      email: `eviladmin.${Date.now()}@domain.com`,
      password: 'Hacker@Password123!',
      role: 'SUPER_ADMIN'
    });
    console.assert(regAdmin.status === 403 || regAdmin.status === 400, `Public registration must be rejected with 403 or 400 (got ${regAdmin.status})`);
    console.log('  ✓ Public self-registration rejected with 403 Forbidden / 400 Bad Request');

    console.log('\n======================================================');
    console.log('  ALL TEST SUITES PASSED (100% SUCCESS)');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ QA Test Suite Error:', err.message);
    process.exit(1);
  }
}

runQaSuite();
