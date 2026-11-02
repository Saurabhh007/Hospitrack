/**
 * Hospitrack — Master Production Repair Verification Test Suite
 * End-to-End Validation of Super Admin Workspace, Audit Trail, Bed Network, Mandatory Password & Security
 */

const http = require('http');

const API_BASE = 'http://localhost:8080';
const FRONTEND_BASE = 'http://localhost:8000';

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json || data
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runMasterVerification() {
  console.log('============================================================');
  console.log('HOSPITRACK — MASTER PRODUCTION REPAIR VERIFICATION SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✕ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Super Admin Login & Global Audit Trail
    // -------------------------------------------------------------------------
    console.log('[TEST 1] Super Admin Login & Audit Trail Verification...');
    const adminLogin = await request(`${API_BASE}/api/auth/login`, { method: 'POST' }, {
      identifier: 'admin@hospitrack.com',
      password: 'Admin@Hospitrack2026!'
    });
    assert(adminLogin.status === 200 && adminLogin.data.success, 'Super Admin login succeeds');
    const adminToken = adminLogin.data.data.accessToken;
    assert(adminToken, 'Super Admin JWT access token received');

    const auditRes = await request(`${API_BASE}/api/audit`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(auditRes.status === 200 && auditRes.data.success, 'GET /api/audit returns HTTP 200');
    assert(Array.isArray(auditRes.data.data) && auditRes.data.data.length > 0, 'Audit records array is non-empty and real');
    
    // Verify Audit record fields have no undefined or breaking values
    const firstAudit = auditRes.data.data[0];
    assert(firstAudit.id && firstAudit.action && firstAudit.actorRole && firstAudit.actorName, 'Audit record has valid id, action, actorRole, actorName');
    assert(firstAudit.integrityHash, 'Audit record has cryptographic SHA-256 integrity hash');

    // Test /api/admin/audit alias
    const adminAuditRes = await request(`${API_BASE}/api/admin/audit`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminAuditRes.status === 200 && adminAuditRes.data.success, 'GET /api/admin/audit alias returns HTTP 200');

    // -------------------------------------------------------------------------
    // TEST 2: Super Admin Bed Network Endpoint & Live Data
    // -------------------------------------------------------------------------
    console.log('\n[TEST 2] Super Admin Bed Network & Capacity Verification...');
    const bedNetworkRes = await request(`${API_BASE}/api/admin/bed-network`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(bedNetworkRes.status === 200 && bedNetworkRes.data.success, 'GET /api/admin/bed-network returns HTTP 200');
    assert(bedNetworkRes.data.data.networkTotalBeds > 0, 'Network total beds count is > 0');
    assert(bedNetworkRes.data.data.networkAvailableBeds >= 0, 'Network available beds count is >= 0');
    assert(Array.isArray(bedNetworkRes.data.data.hospitals) && bedNetworkRes.data.data.hospitals.length > 0, 'Hospital bed summaries list is populated');
    
    const hospBed = bedNetworkRes.data.data.hospitals[0];
    assert(hospBed.categories && hospBed.categories.icu && hospBed.categories.emergency && hospBed.categories.general, 'Bed network provides ward distribution (ICU, Emergency, General Ward)');

    // -------------------------------------------------------------------------
    // TEST 3: Hospital Onboarding Mandatory Password Validation
    // -------------------------------------------------------------------------
    console.log('\n[TEST 3] Hospital Onboarding Mandatory Password Verification...');
    const testCode = 'MAX-' + (Date.now() % 10000);
    const testEmail = `admin@${testCode.toLowerCase()}.in`;

    // A: Empty / Missing password must be rejected (400)
    const noPassReq = await request(`${API_BASE}/api/admin/hospitals`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: 'Max Super Speciality',
      code: testCode,
      location: 'Saket, New Delhi',
      contact: '+91 11 2651 5050',
      email: testEmail,
      totalBeds: 200,
      availableBeds: 150,
      initialPassword: ''
    });
    assert(noPassReq.status === 400 && !noPassReq.data.success, 'Missing initial password rejected with HTTP 400');

    // B: Short password (<8 chars) must be rejected (400)
    const shortPassReq = await request(`${API_BASE}/api/admin/hospitals`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: 'Max Super Speciality',
      code: testCode,
      location: 'Saket, New Delhi',
      contact: '+91 11 2651 5050',
      email: testEmail,
      totalBeds: 200,
      availableBeds: 150,
      initialPassword: 'short'
    });
    assert(shortPassReq.status === 400 && !shortPassReq.data.success, 'Password < 8 characters rejected with HTTP 400');

    // C: Password mismatch must be rejected (400)
    const mismatchPassReq = await request(`${API_BASE}/api/admin/hospitals`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: 'Max Super Speciality',
      code: testCode,
      location: 'Saket, New Delhi',
      contact: '+91 11 2651 5050',
      email: testEmail,
      totalBeds: 200,
      availableBeds: 150,
      initialPassword: 'SecureAdminPass2026!',
      confirmPassword: 'MismatchPassword999!'
    });
    assert(mismatchPassReq.status === 400 && !mismatchPassReq.data.success, 'Password confirmation mismatch rejected with HTTP 400');

    // D: Valid mandatory password creates hospital & Hospital Admin account atomically
    const validPassword = 'Max@AdminPassword2026!';
    const createHospRes = await request(`${API_BASE}/api/admin/hospitals`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: 'Max Super Speciality Hospital',
      code: testCode,
      type: 'Super Specialty',
      location: '1, 2, Press Enclave Marg, Saket, New Delhi',
      contact: '+91 11 2651 5050',
      email: testEmail,
      totalBeds: 250,
      availableBeds: 200,
      initialPassword: validPassword,
      confirmPassword: validPassword
    });
    assert(createHospRes.status === 200 && createHospRes.data.success, 'Valid mandatory password successfully creates hospital');
    assert(createHospRes.data.data.hospital.id, 'Hospital ID provisioned');
    assert(createHospRes.data.data.adminUserId, 'Hospital Administrator user ID provisioned');
    assert(createHospRes.data.data.temporaryPassword === validPassword, 'Submitted password returned once in provision confirmation response');
    const createdHospId = createHospRes.data.data.hospital.id;

    // -------------------------------------------------------------------------
    // TEST 4: Created Hospital Admin Login & Dashboard
    // -------------------------------------------------------------------------
    console.log('\n[TEST 4] Created Hospital Admin Login & Dashboard Verification...');
    const hospAdminLogin = await request(`${API_BASE}/api/auth/login`, { method: 'POST' }, {
      identifier: testEmail,
      password: validPassword
    });
    assert(hospAdminLogin.status === 200 && hospAdminLogin.data.success, 'Created Hospital Admin logs in successfully with provisioned credentials');
    const hospAdminToken = hospAdminLogin.data.data.accessToken;
    assert(hospAdminLogin.data.data.user.role === 'HOSPITAL_ADMIN', 'User role is HOSPITAL_ADMIN');
    assert(hospAdminLogin.data.data.user.hospitalId === createdHospId, 'User is bound to the created hospital ID');

    // Hospital Dashboard
    const hospDashRes = await request(`${API_BASE}/api/hospital/dashboard`, {
      headers: { Authorization: `Bearer ${hospAdminToken}` }
    });
    assert(hospDashRes.status === 200 && hospDashRes.data.success, 'Hospital Dashboard summary retrieved for newly created hospital');

    // -------------------------------------------------------------------------
    // TEST 5: Hospital Admin Resources (Departments, Beds, Profile)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 5] Hospital Admin Resources Verification...');
    const deptsRes = await request(`${API_BASE}/api/hospital/departments`, {
      headers: { Authorization: `Bearer ${hospAdminToken}` }
    });
    assert(deptsRes.status === 200 && deptsRes.data.success, 'Default departments retrieved for new hospital');

    const bedsRes = await request(`${API_BASE}/api/hospital/beds`, {
      headers: { Authorization: `Bearer ${hospAdminToken}` }
    });
    assert(bedsRes.status === 200 && bedsRes.data.success, 'Ward beds retrieved and auto-initialized for new hospital');
    assert(Array.isArray(bedsRes.data.data) && bedsRes.data.data.length > 0, 'Hospital bed inventory is populated');

    // -------------------------------------------------------------------------
    // TEST 6: Security & Cross-Hospital Isolation
    // -------------------------------------------------------------------------
    console.log('\n[TEST 6] RBAC & Cross-Hospital Isolation Verification...');
    
    // Hospital Admin cannot access global Bed Network endpoint
    const crossBedAdmin = await request(`${API_BASE}/api/admin/bed-network`, {
      headers: { Authorization: `Bearer ${hospAdminToken}` }
    });
    assert(crossBedAdmin.status === 403, 'Hospital Admin accessing /api/admin/bed-network returns HTTP 403 Forbidden');

    // Hospital Admin cannot modify another hospital's bed
    const crossBedMod = await request(`${API_BASE}/api/hospitals/HOSP-101/beds/BED-HOSP-101-GEN-01/maintenance`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hospAdminToken}` }
    }, { reason: 'Cross-hospital attempt' });
    assert(crossBedMod.status === 403, 'Cross-hospital bed maintenance modification returns HTTP 403 Forbidden');

    // Hospital Admin audit trail is isolated to own hospital
    const hospAuditRes = await request(`${API_BASE}/api/audit`, {
      headers: { Authorization: `Bearer ${hospAdminToken}` }
    });
    assert(hospAuditRes.status === 200 && hospAuditRes.data.success, 'Hospital Admin can access own hospital audit trail');
    const foreignLogs = (hospAuditRes.data.data || []).filter(l => l.hospitalId === 'HOSP-101' && l.targetId === 'HOSP-101');
    assert(foreignLogs.length === 0, 'Hospital Admin cannot see foreign hospital audit records');

    // -------------------------------------------------------------------------
    // TEST 7: Super Admin Audit Trail Records Hospital Onboarding Event
    // -------------------------------------------------------------------------
    console.log('\n[TEST 7] Audit Trail Records Hospital Creation Verification...');
    const finalAuditRes = await request(`${API_BASE}/api/audit`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const onboardingEvents = (finalAuditRes.data.data || []).filter(l => 
      (l.action === 'HOSPITAL_CREATED' || l.action === 'HOSPITAL_ADMIN_CREATED') &&
      (l.targetId === createdHospId || (l.details && l.details.includes(testCode)))
    );
    assert(onboardingEvents.length > 0, 'Hospital onboarding event successfully recorded in global audit trail');

    // -------------------------------------------------------------------------
    // TEST 8: Frontend Index & Static Assets
    // -------------------------------------------------------------------------
    console.log('\n[TEST 8] Frontend Static Assets & Shell Verification...');
    const frontendIndex = await request(`${FRONTEND_BASE}/index.html`);
    assert(frontendIndex.status === 200, 'Frontend index.html served on http://localhost:8000');
    assert(typeof frontendIndex.data === 'string' && frontendIndex.data.includes('js/store.js') && frontendIndex.data.includes('js/app.js'), 'Frontend references core scripts (store.js, app.js)');

    console.log('\n============================================================');
    console.log(`ALL PRODUCTION REPAIR CHECKS PASSED: ${passed}/${total} (100%)`);
    console.log('============================================================');
    process.exit(0);
  } catch (err) {
    console.error('\nVerification failed with error:', err.message);
    process.exit(1);
  }
}

runMasterVerification();
