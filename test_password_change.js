const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('Testing Password Change API Endpoint...');
  
  // 1. Register a dedicated test user
  const uniqueId = Date.now();
  const testEmail = `pwtest_${uniqueId}@example.com`;
  const initialPassword = 'InitialPassword123!';
  const updatedPassword = 'UpdatedSecurePassword123!';

  // 1. Authenticate Hospital Admin to provision a test patient
  const hospAdminLogin = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { identifier: 'admin@citygeneral.in', password: 'Hospital@123!' });

  if (hospAdminLogin.status !== 200 || !hospAdminLogin.body.data?.accessToken) {
    console.error('Failed to authenticate hospital admin:', hospAdminLogin);
    process.exit(1);
  }
  const hospAdminToken = hospAdminLogin.body.data.accessToken;

  const regRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/patients',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${hospAdminToken}`
    }
  }, {
    name: 'Password Tester',
    email: testEmail,
    contact: '+91 99999 88888',
    password: initialPassword,
    initialPassword: initialPassword,
    age: 30,
    gender: 'Other',
    bloodGroup: 'O+',
    address: 'Testing Lab',
    emergencyContact: '+91 99999 77777',
    primaryDoctorId: 'DOC-201'
  });

  if ((regRes.status !== 200 && regRes.status !== 201) || !regRes.body.success) {
    console.error('Failed to register test user:', regRes);
    process.exit(1);
  }
  console.log('✓ Test user registered successfully:', testEmail);

  // 2. Login to get token
  const loginRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { identifier: testEmail, password: initialPassword });

  if (loginRes.status !== 200 || !loginRes.body.data.accessToken) {
    console.error('Failed to login test user:', loginRes);
    process.exit(1);
  }

  const token = loginRes.body.data.accessToken;
  console.log('✓ Test user authenticated with JWT');

  // 3. Try changing with wrong current password
  const badOldPassRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/change-password',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, { currentPassword: 'WrongPassword123!', newPassword: updatedPassword });

  if (badOldPassRes.status === 400) {
    console.log('✓ Wrong current password properly rejected with 400 Bad Request');
  } else {
    console.error('✗ Expected 400 for wrong current password, got:', badOldPassRes.status, badOldPassRes.body);
    process.exit(1);
  }

  // 4. Try changing with too short new password (< 8 chars)
  const shortPassRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/change-password',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, { currentPassword: initialPassword, newPassword: 'short' });

  if (shortPassRes.status === 400) {
    console.log('✓ Short password properly rejected with 400 Validation Error');
  } else {
    console.error('✗ Expected 400 for short password, got:', shortPassRes.status, shortPassRes.body);
    process.exit(1);
  }

  // 5. Successful password change
  const successChangeRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/change-password',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, { currentPassword: initialPassword, newPassword: updatedPassword });

  if (successChangeRes.status === 200 && successChangeRes.body.success) {
    console.log('✓ Password successfully changed in PostgreSQL backend');
  } else {
    console.error('✗ Password change failed:', successChangeRes);
    process.exit(1);
  }

  // 6. Verify old password fails
  const oldLoginRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { identifier: testEmail, password: initialPassword });

  if (oldLoginRes.status === 401) {
    console.log('✓ Old password rejected as expected (401 Unauthorized)');
  } else {
    console.error('✗ Old password was unexpectedly accepted:', oldLoginRes);
    process.exit(1);
  }

  // 7. Verify login with new password
  const newLoginRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { identifier: testEmail, password: updatedPassword });

  if (newLoginRes.status === 200 && newLoginRes.body.data.accessToken) {
    console.log('✓ Successfully logged in with newly updated password');
  } else {
    console.error('✗ Login with new password failed:', newLoginRes);
    process.exit(1);
  }

  console.log('====================================================');
  console.log('ALL PASSWORD CHANGE VERIFICATION TESTS PASSED!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
