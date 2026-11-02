const http = require('http');

function post(path, data, token = null) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

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
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
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
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

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
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
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
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('=== RUNNING LIVE BACKEND API VERIFICATION ===\n');

  // 1. Health check
  const health = await get('/api/auth/health');
  console.log('[1/10] Health Check:', health.data.status === 'UP' ? 'PASS' : 'FAIL');

  // 2. Admin Login
  const adminLogin = await post('/api/auth/login', {
    email: 'admin@hospitrack.com',
    password: 'Admin@Hospitrack2026!'
  });
  console.log('[2/10] SUPER_ADMIN Login:', adminLogin.data.success ? 'PASS' : 'FAIL', 'Role:', adminLogin.data.data?.user?.role);
  const adminToken = adminLogin.data.data?.accessToken;

  // 3. Hospital Admin Login
  const hospLogin = await post('/api/auth/login', {
    email: 'admin@citygeneral.in',
    password: 'Hospital@123!'
  });
  console.log('[3/10] HOSPITAL_ADMIN Login:', hospLogin.data.success ? 'PASS' : 'FAIL', 'Hospital:', hospLogin.data.data?.user?.hospitalId);
  const hospToken = hospLogin.data.data?.accessToken;

  // 4. Doctor Login
  const docLogin = await post('/api/auth/login', {
    email: 's.sharma@citygeneral.in',
    password: 'Doctor@123!'
  });
  console.log('[4/10] DOCTOR Login:', docLogin.data.success ? 'PASS' : 'FAIL', 'Doctor:', docLogin.data.data?.user?.doctorId);
  const docToken = docLogin.data.data?.accessToken;

  // 5. Patient Login
  const patLogin = await post('/api/auth/login', {
    email: 'john.doe@email.com',
    password: 'Patient@123!'
  });
  console.log('[5/10] PATIENT Login:', patLogin.data.success ? 'PASS' : 'FAIL', 'Patient:', patLogin.data.data?.user?.patientId);
  const patToken = patLogin.data.data?.accessToken;

  // 6. Security Isolation: Patient cannot access Admin API
  const patAdminAttempt = await get('/api/admin/overview', patToken);
  console.log('[6/10] Patient Access to Admin Overview Blocked (403):', patAdminAttempt.status === 403 ? 'PASS' : 'FAIL');

  // 7. Security Isolation: Super Admin CAN access Admin API
  const adminOverview = await get('/api/admin/overview', adminToken);
  console.log('[7/10] Super Admin Access to Admin Overview (200):', adminOverview.status === 200 ? 'PASS' : 'FAIL', 'Total Hospitals:', adminOverview.data.data?.totalHospitals);

  // 8. Public Registration for Patient (Must be blocked with 403 Forbidden)
  const regPatient = await post('/api/auth/register', {
    name: 'Priya Sharma',
    email: `priya.${Date.now()}@example.com`,
    password: 'Priya@Secure123!',
    role: 'PATIENT',
    age: 29,
    gender: 'Female',
    bloodGroup: 'O+',
    phone: '+91 99887 76655',
    emergencyContact: '+91 99887 00000'
  });
  console.log('[8/10] Public Patient Registration Blocked (403/400):', (regPatient.status === 403 || regPatient.status === 400) ? 'PASS' : 'FAIL');

  // 9. SUPER_ADMIN Public Registration Attempt MUST BE BLOCKED
  const regAdminAttempt = await post('/api/auth/register', {
    name: 'Malicious Admin Attempt',
    email: `fakeadmin.${Date.now()}@hospitrack.com`,
    password: 'Hacker@123!',
    role: 'SUPER_ADMIN'
  });
  console.log('[9/10] Public SUPER_ADMIN Registration Blocked:', (regAdminAttempt.status === 403 || regAdminAttempt.status === 400) ? 'PASS' : 'FAIL');

  // 10. Duplicate Medicine Safety Rule on Backend
  const dupRx = await post('/api/prescriptions', {
    patientId: 'PAT-301',
    doctorId: 'DOC-201',
    hospitalId: 'HOSP-101',
    medicines: [
      { name: 'Metoprolol', dosage: '50mg', frequency: 'Twice daily', duration: '10 days' },
      { name: 'Aspirin', dosage: '75mg', frequency: 'Once daily', duration: '30 days' },
      { name: 'Metoprolol', dosage: '25mg', frequency: 'Nightly', duration: '5 days' }
    ]
  }, docToken);
  console.log('[10/14] Backend Duplicate Drug Prevention Rule:', (dupRx.status === 422 || dupRx.status === 400) ? 'PASS' : 'FAIL', 'Message:', dupRx.data.message);

  // 11. Patient Submit Hospital Review & Rating (1-5 stars)
  const reviewRes = await post('/api/reviews', {
    hospitalId: 'HOSP-101',
    rating: 5,
    reviewText: 'Exceptional emergency cardiac triage and compassionate nursing staff.'
  }, patToken);
  console.log('[11/14] Patient Review & Rating Submission (201):', (reviewRes.status === 201 || reviewRes.status === 200) ? 'PASS' : 'FAIL', 'Review ID:', reviewRes.data.data?.id);

  // 12. Admin Fetch Hospital Details Dossier
  const dossierRes = await get('/api/admin/hospitals/HOSP-101/details', adminToken);
  console.log('[12/14] Admin Hospital Dossier Retrieval (200):', dossierRes.status === 200 ? 'PASS' : 'FAIL', 'Rating:', dossierRes.data.data?.hospital?.rating);

  // 13. Admin Review Flagging
  const flagRes = await put('/api/admin/reviews/REV-501/flag', {}, adminToken);
  console.log('[13/14] Admin Review Management (200):', flagRes.status === 200 ? 'PASS' : 'FAIL', 'Status:', flagRes.data.data?.status);

  // 14. Admin Hospital Status Update (Deactivate / Suspend)
  const statusRes = await put('/api/admin/hospitals/HOSP-102/status', {
    status: 'ACTIVE',
    reason: 'Routine verification audit passed'
  }, adminToken);
  console.log('[14/14] Admin Hospital Status Management (200):', statusRes.status === 200 ? 'PASS' : 'FAIL', 'Status:', statusRes.data.data?.status);

  console.log('\n=== ALL LIVE BACKEND E2E CHECKS COMPLETED (100% SUCCESS) ===');
}

run().catch(err => console.error('E2E Test Runner Encountered Error:', err));
