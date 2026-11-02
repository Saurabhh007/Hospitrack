/**
 * HOSPITRACK SEARCH & WORKSPACE VERIFICATION SUITE
 */
const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const payload = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : null;
    const headers = { ...options.headers };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = http.request({ ...options, headers }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(body);
        } catch (e) {
          parsed = body;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function login(email, password) {
  const res = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/login',
    method: 'POST'
  }, { email, password });
  return res.body?.data?.accessToken || res.body?.accessToken;
}

async function run() {
  console.log('====================================================');
  console.log('  TESTING SEARCH & WORKSPACE ENDPOINTS');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, extra = '') {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name} ${extra}`);
      failed++;
    }
  }

  // 1. Authenticate as Super Admin
  const adminToken = await login('admin@hospitrack.com', 'Admin@Hospitrack2026!');
  assert('Admin login successful', !!adminToken);

  // 2. Test Global Search for Patient
  const searchPat = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/search?q=John',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const patResults = searchPat.body?.data || searchPat.body;
  assert('Search for "John" returns 200', searchPat.status === 200);
  assert('Search returns items with proper structure', Array.isArray(patResults) && patResults.length > 0 && patResults[0].id && patResults[0].type && patResults[0].title);
  
  // 3. Test Global Search for Doctor
  const searchDoc = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/search?q=Sarah&type=DOCTORS',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const docResults = searchDoc.body?.data || searchDoc.body;
  assert('Search for "Sarah" with type=DOCTORS returns 200', searchDoc.status === 200);
  assert('Search results have type DOCTOR', Array.isArray(docResults) && docResults.some(r => r.type === 'DOCTOR'));

  // 4. Test Global Search for Hospital
  const searchHosp = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/search?q=City',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const hospResults = searchHosp.body?.data || searchHosp.body;
  assert('Search for "City" returns 200', searchHosp.status === 200);
  assert('Search results contain HOSPITAL', Array.isArray(hospResults) && hospResults.some(r => r.type === 'HOSPITAL'));

  // 5. Test Nonexistent Search
  const searchNone = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/search?q=zzzzzz_nonexistent',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const noneResults = searchNone.body?.data || searchNone.body;
  assert('Nonexistent search returns 200 with empty array', searchNone.status === 200 && Array.isArray(noneResults) && noneResults.length === 0);

  // 6. Test Patient detail endpoint
  const patList = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/patients',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const patients = patList.body?.data || patList.body;
  const firstPat = Array.isArray(patients) ? patients[0] : null;
  if (firstPat && firstPat.id) {
    const patDetail = await request({
      hostname: 'localhost',
      port: 8080,
      path: `/api/patients/${firstPat.id}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(`Patient detail for ${firstPat.id} returns 200`, patDetail.status === 200);
  }

  // 7. Test 404 for invalid patient ID
  const invalidPat = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/patients/PAT-99999999',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert('Invalid patient ID returns 404', invalidPat.status === 404);

  // 8. Test Doctor by ID
  const docList = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/doctors',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const doctors = docList.body?.data || docList.body;
  const firstDoc = Array.isArray(doctors) ? doctors[0] : null;
  if (firstDoc && firstDoc.id) {
    const docDetail = await request({
      hostname: 'localhost',
      port: 8080,
      path: `/api/doctors/${firstDoc.id}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(`Doctor detail for ${firstDoc.id} returns 200`, docDetail.status === 200);
  }

  // 9. Test Hospital by ID
  const hospList = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/hospitals',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const hospitals = hospList.body?.data || hospList.body;
  const firstHosp = Array.isArray(hospitals) ? hospitals[0] : null;
  if (firstHosp && firstHosp.id) {
    const hospDetail = await request({
      hostname: 'localhost',
      port: 8080,
      path: `/api/hospitals/${firstHosp.id}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(`Hospital detail for ${firstHosp.id} returns 200`, hospDetail.status === 200);
  }

  // 10. Test Referral by ID
  const refList = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/referrals',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const referrals = refList.body?.data || refList.body;
  const firstRef = Array.isArray(referrals) ? referrals[0] : null;
  if (firstRef && firstRef.id) {
    const refDetail = await request({
      hostname: 'localhost',
      port: 8080,
      path: `/api/referrals/${firstRef.id}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(`Referral detail for ${firstRef.id} returns 200`, refDetail.status === 200);
  }

  // 11. Test Transfer by ID
  const trfList = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/transfers',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const transfers = trfList.body?.data || trfList.body;
  const firstTrf = Array.isArray(transfers) ? transfers[0] : null;
  if (firstTrf && firstTrf.id) {
    const trfDetail = await request({
      hostname: 'localhost',
      port: 8080,
      path: `/api/transfers/${firstTrf.id}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(`Transfer detail for ${firstTrf.id} returns 200`, trfDetail.status === 200);
  }

  // 12. Security Test: Patient cannot view admin overview
  const patientToken = await login('john.doe@email.com', 'Patient@123!');
  assert('Patient login successful', !!patientToken);
  const patientAdminCheck = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/admin/overview',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${patientToken}` }
  });
  assert('Patient accessing admin endpoint is blocked with 403', patientAdminCheck.status === 403);

  console.log('====================================================');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
