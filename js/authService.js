/**
 * Hospitrack — Production Authentication & Session Service
 * Manages JWT tokens, session lifecycle, role state, and Spring Boot backend communication.
 */

class AuthService {
  constructor() {
    this.config = window.HOSPITRACK_CONFIG || {
      API_BASE_URL: 'http://localhost:8080',
      STORAGE_KEYS: {
        ACCESS_TOKEN: 'hospitrack_access_token',
        REFRESH_TOKEN: 'hospitrack_refresh_token',
        AUTH_USER: 'hospitrack_auth_user'
      }
    };

    const keys = this.config.STORAGE_KEYS;
    this.accessToken = sessionStorage.getItem(keys.ACCESS_TOKEN) || localStorage.getItem(keys.ACCESS_TOKEN) || null;
    this.refreshToken = localStorage.getItem(keys.REFRESH_TOKEN) || null;
    this.currentUser = this.loadStoredUser();
  }

  getApiBaseUrl() {
    if (window.HOSPITRACK_CONFIG && typeof window.HOSPITRACK_CONFIG.getApiUrl === 'function') {
      return window.HOSPITRACK_CONFIG.getApiUrl('');
    }
    const base = (window.HOSPITRACK_CONFIG && window.HOSPITRACK_CONFIG.API_BASE_URL) || 'http://localhost:8080';
    return String(base).replace(/\/+$/, '');
  }

  getApiUrl(path) {
    if (window.HOSPITRACK_CONFIG && typeof window.HOSPITRACK_CONFIG.getApiUrl === 'function') {
      return window.HOSPITRACK_CONFIG.getApiUrl(path);
    }
    const base = this.getApiBaseUrl();
    if (!path) return base;
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return `${base}${cleanPath}`;
  }

  async fetchWithTimeout(url, options = {}, timeoutMs = null) {
    const timeout = timeoutMs || (window.HOSPITRACK_CONFIG && window.HOSPITRACK_CONFIG.TIMEOUT_MS) || 15000;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort(new Error(`Request timed out after ${Math.round(timeout / 1000)}s`));
    }, timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } catch (err) {
      if (err.name === 'AbortError' || err.message?.includes('timed out')) {
        const timeoutErr = new Error(`Connection timed out after ${Math.round(timeout / 1000)} seconds. Please verify your network connection.`);
        timeoutErr.isTimeout = true;
        throw timeoutErr;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  loadStoredUser() {
    try {
      const keys = this.config.STORAGE_KEYS;
      const raw = sessionStorage.getItem(keys.AUTH_USER) || localStorage.getItem(keys.AUTH_USER);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  isAuthenticated() {
    return !!this.getAccessToken() && !!this.getCurrentUser();
  }

  getAccessToken() {
    if (!this.accessToken) {
      const keys = this.config?.STORAGE_KEYS || { ACCESS_TOKEN: 'hospitrack_access_token' };
      this.accessToken = sessionStorage.getItem(keys.ACCESS_TOKEN) || localStorage.getItem(keys.ACCESS_TOKEN) || null;
    }
    return this.accessToken;
  }

  getCurrentUser() {
    if (!this.currentUser) {
      this.currentUser = this.loadStoredUser();
    }
    return this.currentUser;
  }

  hasRole(expectedRole) {
    if (!this.currentUser || !this.currentUser.role) return false;
    return this.currentUser.role === expectedRole;
  }

  async login(identifier, password, rememberMe = false) {
    const payload = {
      identifier: identifier ? identifier.trim() : '',
      email: identifier ? identifier.trim() : '',
      password: password,
      rememberMe: !!rememberMe
    };

    try {
      const response = await this.fetchWithTimeout(this.getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let json = {};
      try {
        json = await response.json();
      } catch (e) {
        json = {};
      }

      if (!response.ok || !json.success) {
        let errorMsg = json.message;
        if (!errorMsg) {
          if (response.status === 401) {
            errorMsg = 'Invalid username or password.';
          } else if (response.status === 403) {
            errorMsg = 'Access denied. Account may be locked or pending approval.';
          } else if (response.status === 400) {
            errorMsg = 'Please check the entered information.';
          } else if (response.status === 409) {
            errorMsg = 'An account with this identifier already exists.';
          } else if (response.status >= 500) {
            errorMsg = 'Something went wrong on the server. Please try again.';
          } else {
            errorMsg = 'Authentication failed. Please verify your credentials.';
          }
        }
        const error = new Error(errorMsg);
        error.status = response.status;
        error.data = json;
        throw error;
      }

      const authData = json.data;
      this.accessToken = authData.accessToken;
      this.refreshToken = authData.refreshToken;
      this.currentUser = authData.user;

      const keys = this.config.STORAGE_KEYS;
      const primaryStorage = rememberMe ? localStorage : sessionStorage;
      const secondaryStorage = rememberMe ? sessionStorage : localStorage;

      // Clean secondary storage to prevent conflicting states
      secondaryStorage.removeItem(keys.ACCESS_TOKEN);
      secondaryStorage.removeItem(keys.AUTH_USER);

      primaryStorage.setItem(keys.ACCESS_TOKEN, this.accessToken);
      primaryStorage.setItem(keys.AUTH_USER, JSON.stringify(this.currentUser));
      if (rememberMe) {
        localStorage.setItem(keys.REMEMBER_ME, 'true');
      } else {
        localStorage.removeItem(keys.REMEMBER_ME);
      }

      if (this.refreshToken) {
        localStorage.setItem(keys.REFRESH_TOKEN, this.refreshToken);
      }

      const returnUser = {
        ...authData.user,
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken,
        user: authData.user
      };
      return returnUser;
    } catch (err) {
      if (err.status || err.isTimeout) {
        // Backend responded with HTTP status error or request timed out
        throw err;
      }
      // True network/connection failure
      throw new Error('Unable to connect to Hospitrack API services. Please ensure the backend server is running.');
    }
  }

  async registerPatient(data) {
    try {
      const response = await this.fetchWithTimeout(this.getApiUrl('/api/auth/register/patient'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'PATIENT',
          name: data.name,
          username: data.username || data.email,
          email: data.email,
          password: data.password,
          phone: data.phone,
          dateOfBirth: data.dateOfBirth,
          age: data.age || 30,
          gender: data.gender,
          bloodGroup: data.bloodGroup,
          address: data.address,
          emergencyContact: data.emergencyContact
        })
      });

      let json = {};
      try {
        json = await response.json();
      } catch (e) {
        json = {};
      }

      if (!response.ok || !json.success) {
        let errorMsg = json.message;
        if (!errorMsg) {
          if (response.status === 409) {
            errorMsg = 'An account with this email already exists.';
          } else if (response.status === 400) {
            errorMsg = 'Please check the entered information.';
          } else if (response.status >= 500) {
            errorMsg = 'Something went wrong on the server. Please try again.';
          } else {
            errorMsg = 'Patient registration failed.';
          }
        }
        const error = new Error(errorMsg);
        error.status = response.status;
        error.data = json;
        throw error;
      }
      return json;
    } catch (err) {
      if (err.status || err.isTimeout) {
        throw err;
      }
      throw new Error('Unable to connect to Hospitrack API services. Please ensure the backend server is running.');
    }
  }

  async registerHospital(data) {
    try {
      const response = await this.fetchWithTimeout(this.getApiUrl('/api/auth/register/hospital'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'HOSPITAL_ADMIN',
          hospitalName: data.hospitalName || data.name,
          name: data.adminName || data.hospitalName || data.name,
          email: data.email,
          password: data.password,
          registrationNumber: data.registrationNumber || data.code,
          hospitalType: data.hospitalType,
          totalBeds: parseInt(data.totalBeds || '100', 10),
          phone: data.phone,
          address: data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode
        })
      });

      let json = {};
      try {
        json = await response.json();
      } catch (e) {
        json = {};
      }

      if (!response.ok || !json.success) {
        let errorMsg = json.message;
        if (!errorMsg) {
          if (response.status === 409) {
            errorMsg = 'An account with this email already exists.';
          } else if (response.status === 400) {
            errorMsg = 'Please check the entered information.';
          } else if (response.status >= 500) {
            errorMsg = 'Something went wrong on the server. Please try again.';
          } else {
            errorMsg = 'Hospital registration failed.';
          }
        }
        const error = new Error(errorMsg);
        error.status = response.status;
        error.data = json;
        throw error;
      }
      return json;
    } catch (err) {
      if (err.status || err.isTimeout) {
        throw err;
      }
      throw new Error('Unable to connect to Hospitrack API services. Please ensure the backend server is running.');
    }
  }

  async register(data) {
    if (data.role === 'HOSPITAL_ADMIN') {
      return this.registerHospital(data);
    }
    return this.registerPatient(data);
  }

  async updateProfile(profileData) {
    if (!this.accessToken) throw new Error('Not authenticated.');
    const response = await this.fetchWithTimeout(this.getApiUrl('/api/auth/profile'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: JSON.stringify(profileData)
    });

    let json = {};
    try { json = await response.json(); } catch (e) {}

    if (!response.ok || !json.success) {
      const errorMsg = json.message || 'Failed to update profile details.';
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = json;
      throw error;
    }

    if (json.data) {
      this.currentUser = json.data;
      const keys = this.config.STORAGE_KEYS;
      const storage = localStorage.getItem(keys.AUTH_USER) ? localStorage : sessionStorage;
      storage.setItem(keys.AUTH_USER, JSON.stringify(this.currentUser));
    }
    return json.data;
  }

  async uploadProfilePhoto(photoDataUrl) {
    if (!this.accessToken) throw new Error('Not authenticated.');
    const response = await this.fetchWithTimeout(this.getApiUrl('/api/auth/profile/photo'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: JSON.stringify({ photo: photoDataUrl })
    });

    let json = {};
    try { json = await response.json(); } catch (e) {}

    if (!response.ok || !json.success) {
      const errorMsg = json.message || 'Failed to upload profile photo.';
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = json;
      throw error;
    }

    if (json.data) {
      this.currentUser = json.data;
      const keys = this.config.STORAGE_KEYS;
      const storage = localStorage.getItem(keys.AUTH_USER) ? localStorage : sessionStorage;
      storage.setItem(keys.AUTH_USER, JSON.stringify(this.currentUser));
    }
    return json.data;
  }

  async removeProfilePhoto() {
    if (!this.accessToken) throw new Error('Not authenticated.');
    const response = await this.fetchWithTimeout(this.getApiUrl('/api/auth/profile/photo'), {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    let json = {};
    try { json = await response.json(); } catch (e) {}

    if (!response.ok || !json.success) {
      const errorMsg = json.message || 'Failed to remove profile photo.';
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = json;
      throw error;
    }

    if (json.data) {
      this.currentUser = json.data;
      const keys = this.config.STORAGE_KEYS;
      const storage = localStorage.getItem(keys.AUTH_USER) ? localStorage : sessionStorage;
      storage.setItem(keys.AUTH_USER, JSON.stringify(this.currentUser));
    }
    return json.data;
  }

  async refreshCurrentUser() {
    if (!this.accessToken) return null;
    try {
      const response = await this.fetchWithTimeout(this.getApiUrl('/api/auth/me'), {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          this.currentUser = json.data;
          const keys = this.config.STORAGE_KEYS;
          const storage = localStorage.getItem(keys.AUTH_USER) ? localStorage : sessionStorage;
          storage.setItem(keys.AUTH_USER, JSON.stringify(this.currentUser));
          return this.currentUser;
        }
      }
    } catch (e) {}
    return this.currentUser;
  }

  async changePassword(currentPassword, newPassword) {
    if (!this.accessToken) {
      throw new Error('Not authenticated.');
    }
    const response = await this.fetchWithTimeout(this.getApiUrl('/api/auth/change-password'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    let json = {};
    try { json = await response.json(); } catch (e) {}

    if (!response.ok || !json.success) {
      const errorMsg = json.message || 'Failed to update password.';
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = json;
      throw error;
    }
    return json;
  }

  async logout() {
    try {
      if (this.accessToken) {
        await this.fetchWithTimeout(this.getApiUrl('/api/auth/logout'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          },
          body: JSON.stringify({ refreshToken: this.refreshToken })
        }, 5000).catch(() => {});
      }
    } finally {
      this.clearSession();
    }
  }

  clearSession() {
    this.accessToken = null;
    this.refreshToken = null;
    this.currentUser = null;
    const keys = this.config.STORAGE_KEYS;
    sessionStorage.removeItem(keys.ACCESS_TOKEN);
    sessionStorage.removeItem(keys.AUTH_USER);
    localStorage.removeItem(keys.ACCESS_TOKEN);
    localStorage.removeItem(keys.AUTH_USER);
    localStorage.removeItem(keys.REFRESH_TOKEN);
    localStorage.removeItem(keys.REMEMBER_ME);
    if (window.hospitrackStore && typeof window.hospitrackStore.stopRealtimeCareStream === 'function') {
      window.hospitrackStore.stopRealtimeCareStream();
    }
    if (window.hospitrackStore && typeof window.hospitrackStore.clearAll === 'function') {
      window.hospitrackStore.clearAll();
    }
  }

  async checkHealth() {
    try {
      const res = await this.fetchWithTimeout(this.getApiUrl('/api/health'), {}, 5000);
      return res.ok;
    } catch (e) {
      return false;
    }
  }
}

window.hospitrackAuth = new AuthService();

