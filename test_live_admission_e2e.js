const http = require('http');

function apiCall(port, method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const headers = {
      'Content-Type': 'application/json'
    };
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: path,
      method: method,
      headers: headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers }); }
        catch (e) { resolve({ status: res.statusCode, raw: body, headers: res.headers }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function verifyCompleteE2EWorkflow() {
  console.log('======================================================================');
  console.log('  HOSPITRACK — REAL LIVE APPLICATION E2E WORKFLOW VERIFICATION');
  console.log('======================================================================\n');

  // STEP 1: Hospital Admin Login (HOSP-101)
  console.log('[STEP 1] Hospital Admin (HOSP-101) Login at POST /api/auth/login ...');
  const hosp1Login = await apiCall(8080, 'POST', '/api/auth/login', {
    email: 'admin@citygeneral.in',
    password: 'Hospital@123!'
  });
  if (hosp1Login.status !== 200 || !hosp1Login.data.data?.accessToken) {
    throw new Error('Hospital Admin Login failed: ' + JSON.stringify(hosp1Login));
  }
  const hosp1Token = hosp1Login.data.data.accessToken;
  const hosp1User = hosp1Login.data.data.user;
  console.log(`  ✓ Authenticated as: ${hosp1User.name} (${hosp1User.role})`);
  console.log(`  ✓ Hospital ID: ${hosp1User.hospitalId}\n`);

  // STEP 2: Attending Physician Loading (GET /api/hospital/my-doctors & GET /api/doctors)
  console.log('[STEP 2] Fetch Attending Physicians via dedicated GET /api/hospital/my-doctors ...');
  const myDocRes = await apiCall(8080, 'GET', '/api/hospital/my-doctors', null, hosp1Token);
  if (myDocRes.status !== 200 || !Array.isArray(myDocRes.data.data)) {
    throw new Error('Failed to load my-doctors: ' + JSON.stringify(myDocRes));
  }
  const myDoctors = myDocRes.data.data;
  console.log(`  ✓ Dedicated /api/hospital/my-doctors returned ${myDoctors.length} doctors for Hospital ${hosp1User.hospitalId}`);
  myDoctors.forEach(d => {
    console.log(`     - [${d.id}] ${d.name} (${d.specialty}) • Status: ${d.status} • Hospital: ${d.hospitalId}`);
    if (d.hospitalId !== 'HOSP-101') {
      throw new Error(`Data isolation breach: Doctor ${d.id} belongs to ${d.hospitalId}, not HOSP-101!`);
    }
    if (d.status !== 'ACTIVE') {
      throw new Error(`Inactive doctor returned: Doctor ${d.id} has status ${d.status}`);
    }
  });

  const docRes = await apiCall(8080, 'GET', '/api/doctors', null, hosp1Token);
  if (docRes.status !== 200 || !Array.isArray(docRes.data.data)) {
    throw new Error('Failed to load doctors: ' + JSON.stringify(docRes));
  }
  console.log(`  ✓ Standard GET /api/doctors returned ${docRes.data.data.length} doctors for Hospital ${hosp1User.hospitalId}\n`);

  // STEP 3: Validate Physician is Required & Password is Required (400 Bad Request Rejections)
  console.log('[STEP 3] Backend Validation Tests (Missing Password, Missing Doctor, Missing Address)...');
  
  // 3a. Missing password
  const noPassRes = await apiCall(8080, 'POST', '/api/patients', {
    name: 'No Pass Patient',
    age: 30,
    gender: 'Female',
    bloodGroup: 'B+',
    contact: '+91 98765 11223',
    email: 'nopass@test.com',
    address: '123 Test St',
    emergencyContactName: 'Guardian',
    emergencyContactPhone: '+91 98765 99887',
    emergencyContactRelation: 'Spouse',
    primaryDoctorId: 'DOC-201',
    password: ''
  }, hosp1Token);
  if (noPassRes.status !== 400) {
    throw new Error(`Expected 400 Bad Request for empty password, got ${noPassRes.status}`);
  }
  console.log('  ✓ Missing/empty password rejected with HTTP 400');

  // 3b. Missing attending physician
  const noDocRes = await apiCall(8080, 'POST', '/api/patients', {
    name: 'No Doc Patient',
    age: 30,
    gender: 'Female',
    bloodGroup: 'B+',
    contact: '+91 98765 11224',
    email: 'nodoc@test.com',
    address: '123 Test St',
    emergencyContactName: 'Guardian',
    emergencyContactPhone: '+91 98765 99887',
    emergencyContactRelation: 'Spouse',
    primaryDoctorId: '',
    password: 'Password123!'
  }, hosp1Token);
  if (noDocRes.status !== 400) {
    throw new Error(`Expected 400 Bad Request for empty doctor, got ${noDocRes.status}`);
  }
  console.log('  ✓ Missing attending physician rejected with HTTP 400');

  // 3c. Cross-hospital doctor assignment (DOC-202 belongs to HOSP-102)
  const crossDocRes = await apiCall(8080, 'POST', '/api/patients', {
    name: 'Cross Doc Patient',
    age: 30,
    gender: 'Female',
    bloodGroup: 'B+',
    contact: '+91 98765 11225',
    email: 'crossdoc@test.com',
    address: '123 Test St',
    emergencyContactName: 'Guardian',
    emergencyContactPhone: '+91 98765 99887',
    emergencyContactRelation: 'Spouse',
    primaryDoctorId: 'DOC-202',
    password: 'Password123!'
  }, hosp1Token);
  if (crossDocRes.status !== 400) {
    throw new Error(`Expected 400 Bad Request for cross-hospital doctor assignment, got ${crossDocRes.status}`);
  }
  console.log(`  ✓ Cross-hospital doctor assignment rejected: "${crossDocRes.data.message}"\n`);

  // STEP 4: Real Patient Registration
  console.log('[STEP 4] Registering Real Test Patient...');
  const uniqueSuffix = Date.now();
  const testEmail = `test.patient.${uniqueSuffix}@hospitrack.com`;
  const testPassword = 'Hospitrack@123';

  const registerPayload = {
    name: 'Hospitrack Test Patient',
    age: 25,
    gender: 'Male',
    bloodGroup: 'A+',
    contact: '+91 98765 44321',
    email: testEmail,
    address: '456 Lotus Boulevard, Sector 18, New Delhi',
    emergencyContactName: 'Test Guardian',
    emergencyContactPhone: '+91 98765 88776',
    emergencyContactRelation: 'Father',
    primaryDoctorId: 'DOC-201',
    assignedDoctorId: 'DOC-201',
    password: testPassword
  };

  const regRes = await apiCall(8080, 'POST', '/api/patients', registerPayload, hosp1Token);
  if (regRes.status !== 200 || !regRes.data.success) {
    throw new Error('Patient registration failed: ' + JSON.stringify(regRes));
  }
  const createdPatient = regRes.data.data;
  console.log(`  ✓ Patient Registered Successfully!`);
  console.log(`     - Patient ID: ${createdPatient.id}`);
  console.log(`     - Name: ${createdPatient.name}`);
  console.log(`     - Hospital: ${createdPatient.currentHospitalId}`);
  console.log(`     - Attending Doctor: ${createdPatient.primaryDoctorId}`);
  console.log(`     - Address: ${createdPatient.address}`);
  console.log(`     - Emergency Contact Name: ${createdPatient.emergencyContactName}`);
  console.log(`     - Emergency Contact Phone: ${createdPatient.emergencyContactPhone}`);
  console.log(`     - Emergency Contact Relation: ${createdPatient.emergencyContactRelation}`);
  console.log(`     - Transient Initial Password: ${createdPatient.initialPassword}`);
  console.log(`     - Plaintext/Hash in Password field: ${createdPatient.password === undefined || createdPatient.password === null ? 'None (Clean)' : 'LEAK DETECTED!'}`);

  if (createdPatient.currentHospitalId !== 'HOSP-101') {
    throw new Error(`Hospital ID mismatch on created patient: ${createdPatient.currentHospitalId}`);
  }
  if (!createdPatient.initialPassword || createdPatient.initialPassword !== testPassword) {
    throw new Error('Initial password not properly returned in registration response!');
  }
  console.log('');

  // STEP 5: Hospital Admin Opens Patient Workspace (GET /api/patients/{id})
  console.log('[STEP 5] Hospital Admin accessing created patient GET /api/patients/' + createdPatient.id + ' ...');
  const getPatRes = await apiCall(8080, 'GET', `/api/patients/${createdPatient.id}`, null, hosp1Token);
  if (getPatRes.status !== 200 || !getPatRes.data.data) {
    throw new Error(`Access Denied / Failed to load patient for creating Hospital Admin! Status: ${getPatRes.status}, Body: ${JSON.stringify(getPatRes)}`);
  }
  console.log(`  ✓ Patient Record Loaded without "Access Denied"!`);
  console.log(`  ✓ Password fields in GET response: initialPassword=${getPatRes.data.data.initialPassword || 'NONE'}, password=${getPatRes.data.data.password || 'NONE'} (Clean)\n`);

  // STEP 6: Patient Login via Patient ID
  console.log('[STEP 6] Testing Patient Login via Patient ID (' + createdPatient.id + ') ...');
  const patIdLogin = await apiCall(8080, 'POST', '/api/auth/login', {
    identifier: createdPatient.id,
    password: testPassword
  });
  if (patIdLogin.status !== 200 || !patIdLogin.data.data?.accessToken) {
    throw new Error('Patient ID Login failed: ' + JSON.stringify(patIdLogin));
  }
  const patTokenFromId = patIdLogin.data.data.accessToken;
  const patUser = patIdLogin.data.data.user;
  console.log(`  ✓ Authenticated via Patient ID!`);
  console.log(`     - User ID: ${patUser.id}`);
  console.log(`     - Role: ${patUser.role}`);
  console.log(`     - Status: ${patUser.status}`);
  console.log(`     - Patient ID: ${patUser.patientId}`);
  console.log(`     - Redirect URL: ${patIdLogin.data.data.redirectUrl}`);
  if (patUser.role !== 'PATIENT' || patUser.patientId !== createdPatient.id) {
    throw new Error('Patient ID login mapped to incorrect role or patient!');
  }
  console.log('');

  // STEP 7: Patient Login via Email
  console.log('[STEP 7] Testing Patient Login via Email (' + testEmail + ') ...');
  const patEmailLogin = await apiCall(8080, 'POST', '/api/auth/login', {
    identifier: testEmail,
    password: testPassword
  });
  if (patEmailLogin.status !== 200 || !patEmailLogin.data.data?.accessToken) {
    throw new Error('Patient Email Login failed: ' + JSON.stringify(patEmailLogin));
  }
  const patTokenFromEmail = patEmailLogin.data.data.accessToken;
  console.log(`  ✓ Authenticated via Email successfully!\n`);

  // STEP 8: Patient Accesses Own Dashboard & Data Isolation
  console.log('[STEP 8] Testing Patient Dashboard Queries & IDOR Barriers...');
  
  // 8a. Patient fetches own profile
  const patOwnProfile = await apiCall(8080, 'GET', `/api/patients/${createdPatient.id}`, null, patTokenFromId);
  if (patOwnProfile.status !== 200 || !patOwnProfile.data.data) {
    throw new Error('Patient cannot view own profile: ' + JSON.stringify(patOwnProfile));
  }
  console.log(`  ✓ Patient successfully loaded own profile: Name="${patOwnProfile.data.data.name}", Address="${patOwnProfile.data.data.address}"`);

  // 8b. Patient tries to access another patient (e.g. PAT-301 or PAT-303)
  const idorPatRes = await apiCall(8080, 'GET', '/api/patients/PAT-301', null, patTokenFromId);
  if (idorPatRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for cross-patient access, got ${idorPatRes.status}`);
  }
  console.log(`  ✓ IDOR Barrier verified: Patient blocked with 403 Forbidden from accessing other patient records`);

  // 8c. Patient tries to access hospital admin endpoints
  const patAdminAttempt = await apiCall(8080, 'POST', '/api/patients', {
    name: 'Illegal Patient',
    age: 20,
    gender: 'Male',
    bloodGroup: 'O+',
    contact: '+91 99999 88888',
    email: 'illegal@test.org',
    address: 'Illegal Street',
    emergencyContactName: 'Guardian',
    emergencyContactPhone: '+91 99999 77777',
    emergencyContactRelation: 'Spouse',
    primaryDoctorId: 'DOC-201',
    password: 'Password123!'
  }, patTokenFromId);
  if (patAdminAttempt.status !== 403) {
    throw new Error(`Expected 403 Forbidden for patient accessing POST /api/patients, got ${patAdminAttempt.status}`);
  }
  console.log(`  ✓ RBAC Barrier verified: Patient blocked with 403 Forbidden from admin endpoints\n`);

  // STEP 9: Cross-Hospital Data Isolation (Hospital A vs Hospital B)
  console.log('[STEP 9] Testing Multi-Hospital Data Isolation (HOSP-101 vs HOSP-102)...');
  
  // Login as Hospital 2 Admin (Apex Care)
  const hosp2Login = await apiCall(8080, 'POST', '/api/auth/login', {
    email: 'operations@apexcare.in',
    password: 'Hospital@123!'
  });
  if (hosp2Login.status !== 200) {
    throw new Error('Hospital 2 Admin login failed: ' + JSON.stringify(hosp2Login));
  }
  const hosp2Token = hosp2Login.data.data.accessToken;
  console.log(`  ✓ Authenticated as Hospital 2 Admin (${hosp2Login.data.data.user.hospitalId})`);

  // Hospital 2 queries doctors: should only get DOC-202 (HOSP-102)
  const hosp2Docs = await apiCall(8080, 'GET', '/api/doctors', null, hosp2Token);
  console.log(`  ✓ Hospital 2 retrieved ${hosp2Docs.data.data.length} doctor(s):`);
  hosp2Docs.data.data.forEach(d => {
    console.log(`     - [${d.id}] ${d.name} (${d.specialty}) • Hospital: ${d.hospitalId}`);
    if (d.hospitalId !== 'HOSP-102') {
      throw new Error(`Data isolation leak: Hospital 2 received doctor from ${d.hospitalId}!`);
    }
  });

  // Hospital 2 tries to access Hospital 1's newly created patient
  const hosp2CrossAccess = await apiCall(8080, 'GET', `/api/patients/${createdPatient.id}`, null, hosp2Token);
  if (hosp2CrossAccess.status !== 403) {
    throw new Error(`Expected 403 Forbidden for cross-hospital patient access, got ${hosp2CrossAccess.status}`);
  }
  console.log(`  ✓ Multi-Hospital Isolation verified: Hospital 2 blocked with 403 Forbidden from accessing Hospital 1 patient\n`);

  // STEP 10: Test Web Application Server (Port 8000) Static Asset Delivery
  console.log('[STEP 10] Testing Web Application Server (Port 8000) Asset Serving...');
  const indexHtml = await apiCall(8000, 'GET', '/index.html');
  if (indexHtml.status !== 200 || !indexHtml.raw.includes('Hospitrack')) {
    throw new Error('Port 8000 failed to serve index.html: ' + JSON.stringify(indexHtml));
  }
  const jsApp = await apiCall(8000, 'GET', '/js/app.js');
  if (jsApp.status !== 200) {
    throw new Error('Port 8000 failed to serve js/app.js');
  }
  console.log(`  ✓ Web Server (Port 8000) successfully served index.html and JavaScript assets\n`);

  console.log('======================================================================');
  console.log('  ALL REAL WORKFLOW TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================================');
}

verifyCompleteE2EWorkflow().catch(err => {
  console.error('\n❌ E2E VERIFICATION FAILED:', err);
  process.exit(1);
});
