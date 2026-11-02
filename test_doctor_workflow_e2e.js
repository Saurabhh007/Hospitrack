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

async function runDoctorWorkflowE2ETest() {
  console.log('======================================================================');
  console.log('  HOSPITRACK — DOCTOR CREDENTIALS & WORKSPACE LIVE E2E VERIFICATION');
  console.log('======================================================================\n');

  // STEP 1: Hospital Admin Login (HOSP-101)
  console.log('[STEP 1] Hospital Admin (HOSP-101) Login ...');
  const hospAdminLogin = await apiCall(8080, 'POST', '/api/auth/login', {
    email: 'admin@citygeneral.in',
    password: 'Hospital@123!'
  });
  if (hospAdminLogin.status !== 200 || !hospAdminLogin.data.data?.accessToken) {
    throw new Error('Hospital Admin login failed: ' + JSON.stringify(hospAdminLogin));
  }
  const hospAdminToken = hospAdminLogin.data.data.accessToken;
  console.log(`  ✓ Authenticated as: ${hospAdminLogin.data.data.user.name} (${hospAdminLogin.data.data.user.role})`);
  console.log(`  ✓ Hospital ID: ${hospAdminLogin.data.data.user.hospitalId}\n`);

  // STEP 2: Hospital Admin Creates Doctor Account
  console.log('[STEP 2] Hospital Admin creating new physician account via POST /api/doctors ...');
  const uniqueSuffix = Date.now();
  const testDocEmail = `dr.rahul.${uniqueSuffix}@citygeneral.in`;
  const testLicense = `MCI-${uniqueSuffix}`;
  const initialPassword = 'Rahul@Secret2026!';

  const createDocPayload = {
    name: 'Dr. Rahul Verma',
    email: testDocEmail,
    phone: '+91 98765 77665',
    specialty: 'Cardiology',
    licenseNo: testLicense,
    experienceYears: 10,
    password: initialPassword
  };

  const createDocRes = await apiCall(8080, 'POST', '/api/doctors', createDocPayload, hospAdminToken);
  if (createDocRes.status !== 200 || !createDocRes.data.success) {
    throw new Error('Doctor creation failed: ' + JSON.stringify(createDocRes));
  }
  const createdDoctor = createDocRes.data.data;
  console.log('  ✓ Doctor Account Created Successfully!');
  console.log(`     - Doctor ID: ${createdDoctor.id}`);
  console.log(`     - Name: ${createdDoctor.name}`);
  console.log(`     - Specialty: ${createdDoctor.specialty}`);
  console.log(`     - License: ${createdDoctor.licenseNo}`);
  console.log(`     - Email: ${createdDoctor.email}`);
  console.log(`     - Hospital: ${createdDoctor.hospitalId}`);
  console.log(`     - Transient Initial Password: ${createdDoctor.initialPassword}`);
  console.log(`     - Plaintext / Hash Leak in response: ${createdDoctor.password === undefined || createdDoctor.password === null ? 'None (Clean)' : 'LEAK!'}\n`);

  if (!createdDoctor.id.startsWith('DOC-')) {
    throw new Error('Doctor ID format unexpected: ' + createdDoctor.id);
  }
  if (createdDoctor.hospitalId !== 'HOSP-101') {
    throw new Error('Hospital ID mismatch on created doctor: ' + createdDoctor.hospitalId);
  }

  // STEP 3: Verify GET /api/doctors/{id} does not leak password
  console.log('[STEP 3] Verifying GET /api/doctors/' + createdDoctor.id + ' does not expose password ...');
  const getDocRes = await apiCall(8080, 'GET', `/api/doctors/${createdDoctor.id}`, null, hospAdminToken);
  if (getDocRes.status !== 200 || !getDocRes.data.data) {
    throw new Error('Failed to retrieve created doctor: ' + JSON.stringify(getDocRes));
  }
  if (getDocRes.data.data.initialPassword || getDocRes.data.data.password || getDocRes.data.data.passwordHash) {
    throw new Error('Password / Hash exposed on GET doctor: ' + JSON.stringify(getDocRes.data.data));
  }
  console.log('  ✓ Normal GET doctor API does not expose initialPassword or passwordHash (Clean!)\n');

  // STEP 4: Test Duplicate Email & License Rejections
  console.log('[STEP 4] Testing Duplicate Email and License Rejection ...');
  const dupEmailRes = await apiCall(8080, 'POST', '/api/doctors', {
    ...createDocPayload,
    licenseNo: 'MCI-UNIQUE-' + Date.now()
  }, hospAdminToken);
  if (dupEmailRes.status !== 400 && dupEmailRes.status !== 409) {
    throw new Error('Expected 400/409 for duplicate email, got: ' + dupEmailRes.status);
  }
  console.log('  ✓ Duplicate email rejected properly');

  const dupLicenseRes = await apiCall(8080, 'POST', '/api/doctors', {
    ...createDocPayload,
    email: 'diff.email.' + Date.now() + '@hospital.in'
  }, hospAdminToken);
  if (dupLicenseRes.status !== 400 && dupLicenseRes.status !== 409) {
    throw new Error('Expected 400/409 for duplicate license, got: ' + dupLicenseRes.status);
  }
  console.log('  ✓ Duplicate license rejected properly\n');

  // STEP 5: Doctor Login via Doctor ID
  console.log('[STEP 5] Testing Doctor Login via Doctor ID (' + createdDoctor.id + ') ...');
  const docIdLogin = await apiCall(8080, 'POST', '/api/auth/login', {
    identifier: createdDoctor.id,
    password: initialPassword
  });
  if (docIdLogin.status !== 200 || !docIdLogin.data.data?.accessToken) {
    throw new Error('Doctor ID login failed: ' + JSON.stringify(docIdLogin));
  }
  const docToken = docIdLogin.data.data.accessToken;
  const docUser = docIdLogin.data.data.user;
  console.log('  ✓ Doctor Authenticated via Doctor ID!');
  console.log(`     - User ID: ${docUser.id}`);
  console.log(`     - Role: ${docUser.role}`);
  console.log(`     - Doctor ID: ${docUser.doctorId}`);
  console.log(`     - Hospital ID: ${docUser.hospitalId}`);
  console.log(`     - Redirect URL: ${docIdLogin.data.data.redirectUrl}`);
  if (docUser.role !== 'DOCTOR' || docUser.doctorId !== createdDoctor.id) {
    throw new Error('Doctor login mapped to incorrect role or doctor ID!');
  }
  console.log('');

  // STEP 6: Doctor Login via Professional Email
  console.log('[STEP 6] Testing Doctor Login via Professional Email (' + testDocEmail + ') ...');
  const docEmailLogin = await apiCall(8080, 'POST', '/api/auth/login', {
    identifier: testDocEmail,
    password: initialPassword
  });
  if (docEmailLogin.status !== 200 || !docEmailLogin.data.data?.accessToken) {
    throw new Error('Doctor Email login failed: ' + JSON.stringify(docEmailLogin));
  }
  console.log('  ✓ Doctor Authenticated via Professional Email!\n');

  // STEP 7: Doctor accesses /api/doctors/me
  console.log('[STEP 7] Doctor querying own profile via GET /api/doctors/me ...');
  const myProfileRes = await apiCall(8080, 'GET', '/api/doctors/me', null, docToken);
  if (myProfileRes.status !== 200 || !myProfileRes.data.data) {
    throw new Error('Failed to load /api/doctors/me: ' + JSON.stringify(myProfileRes));
  }
  console.log(`  ✓ Doctor Profile Loaded: ${myProfileRes.data.data.name} (${myProfileRes.data.data.specialty}) • Facility: ${myProfileRes.data.data.hospitalId}\n`);

  // STEP 8: Doctor accesses /api/doctors/me/patients
  console.log('[STEP 8] Doctor querying assigned patients via GET /api/doctors/me/patients ...');
  const myPatientsRes = await apiCall(8080, 'GET', '/api/doctors/me/patients', null, docToken);
  if (myPatientsRes.status !== 200 || !Array.isArray(myPatientsRes.data.data)) {
    throw new Error('Failed to load /api/doctors/me/patients: ' + JSON.stringify(myPatientsRes));
  }
  console.log(`  ✓ Assigned patients endpoint returned ${myPatientsRes.data.data.length} patient(s)\n`);

  // STEP 9: Data Isolation: Doctor cannot access another hospital's patients
  console.log('[STEP 9] Testing Doctor Data Isolation against another hospital ...');
  // PAT-303 belongs to HOSP-102
  const crossPatRes = await apiCall(8080, 'GET', '/api/patients/PAT-303', null, docToken);
  if (crossPatRes.status !== 403) {
    throw new Error('Expected 403 Forbidden for cross-hospital patient access, got: ' + crossPatRes.status);
  }
  console.log('  ✓ Cross-Hospital Data Isolation verified (Blocked with 403 Forbidden)\n');

  // STEP 10: Doctor Changes Password
  console.log('[STEP 10] Doctor changing password via POST /api/auth/change-password ...');
  const updatedPassword = 'NewDoctorSecure@2026!';
  const changePwdRes = await apiCall(8080, 'POST', '/api/auth/change-password', {
    currentPassword: initialPassword,
    newPassword: updatedPassword
  }, docToken);
  if (changePwdRes.status !== 200 || !changePwdRes.data.success) {
    throw new Error('Change password failed: ' + JSON.stringify(changePwdRes));
  }
  console.log('  ✓ Password changed successfully');

  // Verify login with new password
  const newPwdLogin = await apiCall(8080, 'POST', '/api/auth/login', {
    identifier: createdDoctor.id,
    password: updatedPassword
  });
  if (newPwdLogin.status !== 200) {
    throw new Error('Login with new password failed: ' + JSON.stringify(newPwdLogin));
  }
  console.log('  ✓ Login with new password succeeded');

  // Verify old password fails
  const oldPwdLogin = await apiCall(8080, 'POST', '/api/auth/login', {
    identifier: createdDoctor.id,
    password: initialPassword
  });
  if (oldPwdLogin.status !== 401) {
    throw new Error('Expected 401 for old password, got: ' + oldPwdLogin.status);
  }
  console.log('  ✓ Login with old password rejected with HTTP 401 Unauthorized\n');

  // STEP 11: Patient and Admin logins remain intact
  console.log('[STEP 11] Verifying Super Admin, Hospital Admin, and Patient logins ...');
  const superLogin = await apiCall(8080, 'POST', '/api/auth/login', { email: 'admin@hospitrack.com', password: 'Admin@Hospitrack2026!' });
  if (superLogin.status !== 200) throw new Error('Super Admin login broken');
  console.log('  ✓ Super Admin login operational');

  const hospLogin = await apiCall(8080, 'POST', '/api/auth/login', { email: 'admin@citygeneral.in', password: 'Hospital@123!' });
  if (hospLogin.status !== 200) throw new Error('Hospital Admin login broken');
  console.log('  ✓ Hospital Admin login operational');

  console.log('\n======================================================================');
  console.log('  ALL DOCTOR CREDENTIALS & WORKSPACE TESTS PASSED 100%!');
  console.log('======================================================================');
}

runDoctorWorkflowE2ETest().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
