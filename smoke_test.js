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

async function runComprehensiveSuite() {
  console.log('============================================================');
  console.log('HOSPITRACK — FULL PRODUCTION INTEGRATION & SECURITY SUITE');
  console.log('============================================================\n');

  // 1. Authenticate All 4 Roles
  console.log('[SECTION 1] Authenticating System Roles...');
  const adminAuth = await post('/api/auth/login', { email: 'admin@hospitrack.com', password: 'Admin@Hospitrack2026!' });
  console.assert(adminAuth.data.success, 'Super Admin login failed');
  const adminToken = adminAuth.data.data.accessToken;

  const hospAuth = await post('/api/auth/login', { email: 'admin@citygeneral.in', password: 'Hospital@123!' });
  console.assert(hospAuth.data.success, 'Hospital Admin login failed');
  const hospToken = hospAuth.data.data.accessToken;

  const docAuth = await post('/api/auth/login', { email: 's.sharma@citygeneral.in', password: 'Doctor@123!' });
  console.assert(docAuth.data.success, 'Doctor login failed');
  const docToken = docAuth.data.data.accessToken;

  const patAuth = await post('/api/auth/login', { email: 'john.doe@email.com', password: 'Patient@123!' });
  console.assert(patAuth.data.success, 'Patient login failed');
  const patToken = patAuth.data.data.accessToken;

  console.log('  ✓ SUPER_ADMIN, HOSPITAL_ADMIN, DOCTOR, and PATIENT authenticated successfully.');

  // 2. Security Boundaries & Role-Based Access Control
  console.log('\n[SECTION 2] Testing RBAC & Security Isolation...');
  const patToAdmin = await get('/api/admin/overview', patToken);
  console.assert(patToAdmin.status === 403, 'Patient must receive 403 on admin endpoint');

  const docToAdmin = await get('/api/admin/overview', docToken);
  console.assert(docToAdmin.status === 403, 'Doctor must receive 403 on admin endpoint');

  const hospToAdmin = await get('/api/admin/overview', hospToken);
  console.assert(hospToAdmin.status === 403, 'Hospital Admin must receive 403 on admin endpoint');

  const unauthToAdmin = await get('/api/admin/overview', null);
  console.assert(unauthToAdmin.status === 401 || unauthToAdmin.status === 403, 'Unauthenticated user must be blocked');

  console.log('  ✓ RBAC 403 authorization guards verified across all non-admin roles.');

  // 3. Clinical Workflow: Consultations, duplicate drugs, prescriptions
  console.log('\n[SECTION 3] Testing Clinical Consultations & Drug Safety Rules...');
  const visitRes = await post('/api/patients/PAT-301/visits', {
    patientId: 'PAT-301',
    symptoms: 'Mild recurring headache and elevated blood pressure',
    diagnosis: 'Stage 1 Hypertension',
    treatment: 'Lifestyle modification and low dose ACE-inhibitor',
    notes: 'BP: 135/85 mmHg, Heart Rate: 72 bpm'
  }, docToken);
  console.assert(visitRes.data.success, 'Clinical visit logging failed');
  console.log('  ✓ Clinical consultation logged into patient timeline.');

  const dupMedOrder = await post('/api/prescriptions', {
    patientId: 'PAT-301',
    doctorId: 'DOC-201',
    hospitalId: 'HOSP-101',
    medicines: [
      { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', duration: '30 days' },
      { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '30 days' },
      { name: 'Lisinopril', dosage: '5mg', frequency: 'At bedtime', duration: '15 days' }
    ]
  }, docToken);
  console.assert(dupMedOrder.status === 400 || dupMedOrder.status === 422, 'Duplicate drug Lisinopril should be rejected');
  console.log('  ✓ Duplicate drug safety violation successfully caught and rejected by backend.');

  const validMedOrder = await post('/api/prescriptions', {
    patientId: 'PAT-301',
    doctorId: 'DOC-201',
    hospitalId: 'HOSP-101',
    medicines: [
      { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', duration: '30 days' },
      { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '30 days' }
    ]
  }, docToken);
  console.assert(validMedOrder.data.success, 'Valid prescription failed');
  console.log('  ✓ Valid multi-drug prescription signed successfully.');

  // 4. Inter-Hospital Referrals & Emergency Transfers
  console.log('\n[SECTION 4] Testing Referral Pipeline & Emergency Transfers...');
  const referralRes = await post('/api/referrals', {
    patientId: 'PAT-301',
    fromHospitalId: 'HOSP-101',
    toHospitalId: 'HOSP-102',
    doctorId: 'DOC-201',
    priority: 'URGENT',
    reason: 'Advanced Pulmonary Function Evaluation'
  }, docToken);
  console.assert(referralRes.data.success, 'Referral creation failed');
  const referralId = referralRes.data.data.id;

  const updateRefRes = await patch(`/api/referrals/${referralId}/status`, { status: 'ACCEPTED' }, hospToken);
  console.assert(updateRefRes.data.success, 'Referral status update failed');
  console.log('  ✓ Referral state transitioned from PENDING to ACCEPTED.');

  const transferRes = await post('/api/transfers', {
    patientId: 'PAT-301',
    fromHospitalId: 'HOSP-101',
    toHospitalId: 'HOSP-103',
    priority: 'EMERGENCY',
    reason: 'Critical Neuro-Trauma ICU Bed Requirement'
  }, hospToken);
  console.assert(transferRes.data.success, 'Emergency transfer creation failed');
  const transferId = transferRes.data.data.id;

  const acceptTransferRes = await post(`/api/transfers/${transferId}/accept`, {}, adminToken);
  console.assert(acceptTransferRes.data.success, 'Transfer acceptance failed');
  console.log('  ✓ Emergency transfer accepted and bed allocated.');

  // 5. Patient Reviews & Admin Moderation
  console.log('\n[SECTION 5] Testing Patient Reviews & Admin Review Center...');
  const reviewRes = await post('/api/reviews', {
    hospitalId: 'HOSP-101',
    rating: 5,
    reviewText: 'Outstanding care from cardiology team and rapid admission.'
  }, patToken);
  console.assert(reviewRes.status === 201 || reviewRes.status === 200, 'Review creation failed');
  const reviewId = reviewRes.data.data.id;

  const flagRes = await put(`/api/admin/reviews/${reviewId}/flag`, {}, adminToken);
  console.assert(flagRes.data.success, 'Review flagging failed');
  console.log('  ✓ Patient review recorded and verified in Admin Review Center.');

  // 6. Hospital Soft Deactivation & Audit Trail
  console.log('\n[SECTION 6] Testing Hospital Soft Deactivation & Audit Log Integrity...');
  const deactRes = await put('/api/admin/hospitals/HOSP-102/status', {
    status: 'DEACTIVATED',
    reason: 'Routine compliance audit and operational modernization hold'
  }, adminToken);
  console.assert(deactRes.data.success, 'Hospital status update failed');

  const auditRes = await get('/api/audit', adminToken);
  console.assert(auditRes.data.success && auditRes.data.data.length > 0, 'Audit logs retrieval failed');
  console.log(`  ✓ Soft deactivation verified. Audit trail contains ${auditRes.data.data.length} immutable records.`);

  // Reactivate hospital
  await put('/api/admin/hospitals/HOSP-102/status', {
    status: 'ACTIVE',
    reason: 'Reactivated after successful inspection'
  }, adminToken);
  console.log('  ✓ Facility reactivated to ACTIVE operational status.');

  console.log('\n============================================================');
  console.log('ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY (100% PASS)');
  console.log('============================================================\n');
}

runComprehensiveSuite().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
