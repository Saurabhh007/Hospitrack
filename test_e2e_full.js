const http = require('http');
const assert = require('assert');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch(e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          json
        });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('  HOSPITRACK END-TO-END VALIDATION SUITE');
  console.log('====================================================\n');

  let passCount = 0;
  let totalCount = 0;

  async function test(name, fn) {
    totalCount++;
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passCount++;
    } catch (e) {
      console.error(`[FAIL] ${name}:`, e.message);
    }
  }

  // 1. Health endpoint GET /api/health
  await test('1. Health endpoint GET /api/health directly on backend port 8080', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/health',
      method: 'GET'
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.status, 'UP');
  });

  // 2. Health endpoint GET /api/auth/health
  await test('2. Health endpoint GET /api/auth/health', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/health',
      method: 'GET'
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.status, 'UP');
  });

  // 3. Frontend server GET / on port 8000
  await test('3. Frontend server serving index.html on port 8000', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8000,
      path: '/',
      method: 'GET'
    });
    assert.strictEqual(res.statusCode, 200);
    assert(res.body.includes('Hospitrack'));
  });

  // 4. Frontend proxy GET /api/health on port 8000
  await test('4. Frontend proxy forwarding /api/health on port 8000', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8000,
      path: '/api/health',
      method: 'GET'
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.status, 'UP');
  });

  // 5. CORS Preflight OPTIONS request on /api/auth/login
  await test('5. CORS Preflight OPTIONS from origin http://localhost:8000', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/login',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:8000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['access-control-allow-origin'], 'http://localhost:8000');
    assert.strictEqual(res.headers['access-control-allow-credentials'], 'true');
  });

  // 6. CORS Preflight OPTIONS request from Vite port 5173
  await test('6. CORS Preflight OPTIONS from Vite origin http://localhost:5173', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/login',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['access-control-allow-origin'], 'http://localhost:5173');
    assert.strictEqual(res.headers['access-control-allow-credentials'], 'true');
  });

  // 7. Login with valid SUPER_ADMIN credentials
  let adminToken = null;
  await test('7. Login with seeded SUPER_ADMIN credentials', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:8000'
      }
    }, {
      identifier: 'admin@hospitrack.com',
      password: 'Admin@Hospitrack2026!'
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.success, true);
    assert(res.json.data.accessToken, 'Access token missing');
    assert.strictEqual(res.json.data.user.role, 'SUPER_ADMIN');
    adminToken = res.json.data.accessToken;
  });

  // 8. Login with invalid credentials returns 401 and error message
  await test('8. Login with invalid credentials returns 401 with proper message', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      identifier: 'admin@hospitrack.com',
      password: 'WrongPassword123!'
    });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.json.success, false);
    assert.strictEqual(res.json.message, 'Invalid email or password.');
  });

  // 9. Reject public self-registration with 403 Forbidden
  await test('9. Public patient registration via /api/auth/register/patient is rejected with 403 Forbidden', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/register/patient',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      name: 'Unauthorized Self Register',
      email: `unauth_${Date.now()}@example.com`,
      password: 'PatientPass123!'
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.json.success, false);
  });

  // 10. Hospital Admin onboards patient and provisions credentials -> Patient logs in
  const testPatientEmail = `testpatient_${Date.now()}@example.com`;
  let patientToken = null;
  await test('10. Hospital Admin onboards patient and provisions login credentials', async () => {
    // Authenticate Hospital Admin first
    const hospAuthRes = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      identifier: 'admin@citygeneral.in',
      password: 'Hospital@123!'
    });
    assert.strictEqual(hospAuthRes.statusCode, 200);
    const hospToken = hospAuthRes.json.data.accessToken;

    // Hospital Admin onboards patient
    const createPatRes = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/patients',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hospToken}`
      }
    }, {
      name: 'Aarav Sharma',
      contact: '+91 98765 43210',
      phone: '+91 98765 43210',
      email: testPatientEmail,
      age: 28,
      gender: 'Male',
      bloodGroup: 'B+',
      address: '123 Test Street, New Delhi',
      emergencyContact: '+91 98765 00000',
      primaryDoctorId: 'DOC-201',
      password: 'PatientPass123!'
    });
    assert(createPatRes.statusCode === 200 || createPatRes.statusCode === 201, `Expected 200 or 201, got ${createPatRes.statusCode}`);
    assert.strictEqual(createPatRes.json.success, true);

    // Patient logs in with provisioned credentials
    const patLoginRes = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      identifier: testPatientEmail,
      password: 'PatientPass123!'
    });
    assert.strictEqual(patLoginRes.statusCode, 200);
    assert.strictEqual(patLoginRes.json.success, true);
    assert(patLoginRes.json.data.accessToken);
    assert.strictEqual(patLoginRes.json.data.user.role, 'PATIENT');
    patientToken = patLoginRes.json.data.accessToken;
  });

  // 11. Reject public hospital facility registration with 403
  await test('11. Public hospital facility registration via /api/auth/register/hospital is rejected with 403 Forbidden', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/register/hospital',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      hospitalName: 'Illegal Hospital Sign-up',
      registrationNumber: `REG-${Date.now()}`,
      email: `illegal_${Date.now()}@facility.com`,
      password: 'HospitalAdminPass123!'
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.json.success, false);
  });

  // 12. Super Admin creates and manages hospital facility
  const testHospitalEmail = `testhosp_${Date.now()}@facility.com`;
  await test('12. Super Admin onboards authorized hospital facility via /api/hospitals', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/hospitals',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, {
      name: 'St. Jude Memorial Hospital',
      code: `SJM-${Date.now().toString().slice(-4)}`,
      email: testHospitalEmail,
      contact: '+91 98200 11223',
      location: '77 Medical Park, Mumbai',
      totalBeds: 350,
      availableBeds: 50,
      status: 'ACTIVE',
      initialPassword: 'HospitalAdminPass123!'
    });
    assert(res.statusCode === 200 || res.statusCode === 201, `Expected 200 or 201, got ${res.statusCode}`);
    assert.strictEqual(res.json.success, true);
    const hospObj = res.json.data.hospital || res.json.data;
    assert.strictEqual(hospObj.name, 'St. Jude Memorial Hospital');
  });

  // 13. Access protected /api/auth/me with JWT
  await test('13. Access protected /api/auth/me using JWT Bearer token', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/me',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${patientToken}`
      }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.success, true);
    assert.strictEqual(res.json.data.email, testPatientEmail);
  });

  // 14. Access protected API without token returns 403 / 401
  await test('14. Access protected endpoint without token is rejected', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/admin/overview',
      method: 'GET'
    });
    assert(res.statusCode === 401 || res.statusCode === 403);
  });

  // 15. Access admin endpoint with SUPER_ADMIN JWT
  await test('15. Access admin endpoint with valid SUPER_ADMIN JWT', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/admin/overview',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.success, true);
    assert(res.json.data.totalHospitals >= 0);
  });

  // 16. Test doctor login and data retrieval
  await test('16. Login as Doctor (Dr. Sarah Sharma) and fetch authorized clinical data', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      identifier: 's.sharma@citygeneral.in',
      password: 'Doctor@123!'
    });
    assert.strictEqual(res.statusCode, 200);
    const doctorToken = res.json.data.accessToken;

    const patListRes = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/patients',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${doctorToken}`
      }
    });
    assert.strictEqual(patListRes.statusCode, 200);
    assert.strictEqual(patListRes.json.success, true);
    assert(Array.isArray(patListRes.json.data));
  });

  console.log('\n====================================================');
  console.log(`  TEST RESULTS: ${passCount}/${totalCount} TESTS PASSED`);
  console.log('====================================================');

  if (passCount !== totalCount) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
