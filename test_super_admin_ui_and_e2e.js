/**
 * Hospitrack — Super Admin Workspace, Audit Trail & Bed Network Comprehensive Test Suite
 */

const http = require('http');
const fs = require('fs');
const vm = require('vm');

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

async function runVerification() {
  console.log('======================================================================');
  console.log('HOSPITRACK — SUPER ADMIN & AUDIT TRAIL MASTER VERIFICATION');
  console.log('======================================================================\n');

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
    // -----------------------------------------------------------------------
    // 1. Super Admin Authentication & Real Audit Trail Endpoint
    // -----------------------------------------------------------------------
    console.log('[SECTION 1] Authenticating Super Admin & Querying Global Audit Trail...');
    const adminLogin = await request(`${API_BASE}/api/auth/login`, { method: 'POST' }, {
      identifier: 'admin@hospitrack.com',
      password: 'Admin@Hospitrack2026!'
    });
    assert(adminLogin.status === 200 && adminLogin.data.success, 'Super Admin login successful with JWT');
    const adminToken = adminLogin.data.data.accessToken;

    const auditRes = await request(`${API_BASE}/api/audit`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(auditRes.status === 200 && auditRes.data.success, 'GET /api/audit returns HTTP 200 with real database records');
    assert(Array.isArray(auditRes.data.data) && auditRes.data.data.length > 0, 'Audit records list contains real events');
    
    // Test alias
    const aliasRes = await request(`${API_BASE}/api/admin/audit`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(aliasRes.status === 200 && aliasRes.data.success, 'GET /api/admin/audit alias returns HTTP 200');

    // -----------------------------------------------------------------------
    // 2. Real Bed Network Endpoint & Capacity Ledger
    // -----------------------------------------------------------------------
    console.log('\n[SECTION 2] Verifying Bed Network Live Capacity Endpoint...');
    const bedNetworkRes = await request(`${API_BASE}/api/admin/bed-network`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(bedNetworkRes.status === 200 && bedNetworkRes.data.success, 'GET /api/admin/bed-network returns HTTP 200');
    assert(bedNetworkRes.data.data.networkTotalBeds > 0, 'Network total beds count is > 0');
    assert(Array.isArray(bedNetworkRes.data.data.hospitals), 'Hospital bed capacity summaries list returned');

    // -----------------------------------------------------------------------
    // 3. Hospital Onboarding Mandatory Password Validation (Backend)
    // -----------------------------------------------------------------------
    console.log('\n[SECTION 3] Verifying Hospital Onboarding Mandatory Password Policy...');
    const testCode = 'MED-' + (Date.now() % 10000);
    const testEmail = `admin@${testCode.toLowerCase()}.in`;

    // Missing password
    const noPass = await request(`${API_BASE}/api/admin/hospitals`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: 'Medicity Hospital',
      code: testCode,
      location: 'Sector 38, Gurugram',
      contact: '+91 124 4141 414',
      email: testEmail,
      totalBeds: 180,
      availableBeds: 120,
      initialPassword: ''
    });
    assert(noPass.status === 400 && !noPass.data.success, 'Empty initial password rejected with HTTP 400');

    // Short password
    const shortPass = await request(`${API_BASE}/api/admin/hospitals`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: 'Medicity Hospital',
      code: testCode,
      location: 'Sector 38, Gurugram',
      contact: '+91 124 4141 414',
      email: testEmail,
      totalBeds: 180,
      availableBeds: 120,
      initialPassword: 'short'
    });
    assert(shortPass.status === 400 && !shortPass.data.success, 'Password < 8 characters rejected with HTTP 400');

    // Mismatched confirmation password
    const mismatchPass = await request(`${API_BASE}/api/admin/hospitals`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: 'Medicity Hospital',
      code: testCode,
      location: 'Sector 38, Gurugram',
      contact: '+91 124 4141 414',
      email: testEmail,
      totalBeds: 180,
      availableBeds: 120,
      initialPassword: 'MedicityPass2026!',
      confirmPassword: 'DifferentPass123!'
    });
    assert(mismatchPass.status === 400 && !mismatchPass.data.success, 'Password confirmation mismatch rejected with HTTP 400');

    // Valid creation
    const validPass = 'Medicity@Admin2026!';
    const createRes = await request(`${API_BASE}/api/admin/hospitals`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: 'Medicity Multi Speciality Hospital',
      code: testCode,
      type: 'Super Specialty',
      location: 'Sector 38, Gurugram, Haryana',
      contact: '+91 124 4141 414',
      email: testEmail,
      totalBeds: 220,
      availableBeds: 180,
      initialPassword: validPass,
      confirmPassword: validPass
    });
    assert(createRes.status === 200 && createRes.data.success, 'Hospital successfully onboarded with mandatory password');
    const newHospId = createRes.data.data.hospital.id;

    // -----------------------------------------------------------------------
    // 4. Hospital Admin Login & Data Isolation Verification
    // -----------------------------------------------------------------------
    console.log('\n[SECTION 4] Created Hospital Admin Login & Isolation Check...');
    const hospAdminLogin = await request(`${API_BASE}/api/auth/login`, { method: 'POST' }, {
      identifier: testEmail,
      password: validPass
    });
    assert(hospAdminLogin.status === 200 && hospAdminLogin.data.success, 'Hospital Admin logs in with provisioned credentials');
    const hospAdminToken = hospAdminLogin.data.data.accessToken;

    // Cross-hospital access blocked with 403
    const crossBed = await request(`${API_BASE}/api/admin/bed-network`, {
      headers: { Authorization: `Bearer ${hospAdminToken}` }
    });
    assert(crossBed.status === 403, 'Hospital Admin blocked from global Bed Network endpoint with HTTP 403');

    // -----------------------------------------------------------------------
    // 5. Audit Trail Recorded Hospital Creation Event
    // -----------------------------------------------------------------------
    console.log('\n[SECTION 5] Verifying Audit Trail Logging of Hospital Creation...');
    const updatedAuditRes = await request(`${API_BASE}/api/audit`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const onboardingLogs = (updatedAuditRes.data.data || []).filter(l => 
      l.targetId === newHospId || (l.details && l.details.includes(testCode))
    );
    assert(onboardingLogs.length > 0, 'Hospital creation event verified in global audit trail');

    // -----------------------------------------------------------------------
    // 6. Frontend Normalization & UI Renderers Runtime Safety
    // -----------------------------------------------------------------------
    console.log('\n[SECTION 6] Simulating Frontend Component Execution & Normalization Safety...');
    
    // Setup clean sandbox environment
    const sandbox = {
      window: {},
      document: {
        getElementById: () => ({ innerHTML: '', value: '', style: {}, classList: { add: () => {}, remove: () => {} } }),
        createElement: () => ({ href: '', click: () => {} })
      },
      console: { log: () => {}, warn: () => {}, error: (msg) => console.error('  Sandbox Error:', msg) },
      Date: Date,
      String: String,
      Number: Number,
      Math: Math,
      Array: Array,
      Object: Object,
      URL: URL,
      URLSearchParams: URLSearchParams,
      setTimeout: (fn) => fn(),
      Blob: class {},
      navigator: {}
    };
    sandbox.window = sandbox;

    // Load store.js, auditLogger.js, adminDashboard.js in VM
    vm.createContext(sandbox);
    const storeCode = fs.readFileSync('js/store.js', 'utf8');
    const auditLoggerCode = fs.readFileSync('js/components/auditLogger.js', 'utf8');
    const adminDashboardCode = fs.readFileSync('js/components/adminDashboard.js', 'utf8');

    vm.runInContext(storeCode, sandbox);
    vm.runInContext(auditLoggerCode, sandbox);
    vm.runInContext(adminDashboardCode, sandbox);

    assert(typeof sandbox.normalizeAuditEvent === 'function', 'normalizeAuditEvent loaded and callable');
    assert(typeof sandbox.normalizeString === 'function', 'normalizeString loaded and callable');
    assert(typeof sandbox.safeLowerCase === 'function', 'safeLowerCase loaded and callable');
    assert(typeof sandbox.safeUpperCase === 'function', 'safeUpperCase loaded and callable');
    assert(typeof sandbox.safeIncludes === 'function', 'safeIncludes loaded and callable');

    // Test normalizeAuditEvent with malicious/null/undefined inputs
    const testCases = [
      null,
      undefined,
      {},
      { action: null, actorRole: null, actorName: null },
      { id: undefined, details: undefined, hospitalId: null },
      { eventType: 'TEST_EVENT', timestamp: null, status: null }
    ];

    for (const tc of testCases) {
      const norm = sandbox.normalizeAuditEvent(tc);
      assert(typeof norm.action === 'string' && norm.action.length > 0, 'Safe action string generated');
      assert(typeof norm.actorRole === 'string' && norm.actorRole.length > 0, 'Safe actorRole string generated');
      assert(typeof norm.details === 'string', 'Safe details string generated');
      assert(typeof norm.timestamp === 'string', 'Safe timestamp string generated');
    }

    // Test renderAdminDashboard across all registered sections
    const sectionsToTest = [
      'overview',
      'hospitals',
      'doctors',
      'patients',
      'referrals',
      'transfers',
      'beds',
      'bed-network',
      'reviews',
      'quality',
      'audit',
      'audit-trail',
      'reports',
      'settings',
      'notifications',
      'profile'
    ];

    sandbox.window.hospitrackAuth = {
      getCurrentUser: () => ({ id: 'ADMIN-001', role: 'SUPER_ADMIN', name: 'Super Admin', email: 'admin@hospitrack.com' })
    };
    sandbox.window.hospitrackStore = {
      getHospitals: () => [{ id: 'HOSP-101', name: 'City General', totalBeds: 100, availableBeds: 20, status: 'ACTIVE' }],
      getDoctors: () => [{ id: 'DOC-1', name: 'Dr. Sarah', specialty: 'Cardiology' }],
      getPatients: () => [{ id: 'PAT-1', name: 'John Doe', status: 'ACTIVE' }],
      getReferrals: () => [],
      getTransfers: () => [],
      getReviews: () => [],
      getAuditLogs: () => [sandbox.normalizeAuditEvent(null)],
      getNotifications: () => [],
      getLowRatingHospitals: () => [],
      getBedNetwork: () => ({ networkTotalBeds: 100, networkAvailableBeds: 20, networkOccupiedBeds: 80, hospitals: [] })
    };

    for (const sec of sectionsToTest) {
      let dummyContainer = { innerHTML: '' };
      sandbox.window.renderAdminDashboard(dummyContainer, sec);
      assert(dummyContainer.innerHTML.length > 0, `Section '${sec}' renders valid HTML with zero runtime errors`);
      assert(!dummyContainer.innerHTML.includes('Cannot read properties of undefined'), `Section '${sec}' contains no undefined property errors`);
      assert(!dummyContainer.innerHTML.includes('Select a section from the navigation bar above'), `Section '${sec}' renders directly without generic placeholder`);
    }

    console.log('\n======================================================================');
    console.log(`ALL VERIFICATION CHECKS PASSED: ${passed}/${total} (100% SUCCESS)`);
    console.log('======================================================================');
    process.exit(0);
  } catch (err) {
    console.error('\nVerification failed with error:', err);
    process.exit(1);
  }
}

runVerification();
