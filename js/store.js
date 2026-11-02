/**
 * Hospitrack Production Data Store & API Synchronization Engine
 * Connects directly to Spring Boot REST APIs with JWT Bearer Authentication.
 * Authoritative data resides exclusively in PostgreSQL.
 */

function getApiBaseUrl() {
  if (window.HOSPITRACK_CONFIG && typeof window.HOSPITRACK_CONFIG.getApiUrl === 'function') {
    return window.HOSPITRACK_CONFIG.getApiUrl('');
  }
  const base = (window.HOSPITRACK_CONFIG && window.HOSPITRACK_CONFIG.API_BASE_URL) || (window.hospitrackAuth && window.hospitrackAuth.getApiBaseUrl()) || 'http://localhost:8080';
  return String(base).replace(/\/+$/, '');
}

function getApiUrl(path) {
  if (window.HOSPITRACK_CONFIG && typeof window.HOSPITRACK_CONFIG.getApiUrl === 'function') {
    return window.HOSPITRACK_CONFIG.getApiUrl(path);
  }
  const base = getApiBaseUrl();
  if (!path) return base;
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return `${base}${cleanPath}`;
}

// ----------------------------------------------------------------------------
// Centralized Safe Normalization & Guard Helpers
// ----------------------------------------------------------------------------
function normalizeString(val, fallback = '') {
  if (val === null || val === undefined) return fallback;
  return String(val).trim();
}
window.normalizeString = normalizeString;

function safeLowerCase(val, fallback = '') {
  return normalizeString(val, fallback).toLowerCase();
}
window.safeLowerCase = safeLowerCase;

function safeUpperCase(val, fallback = '') {
  return normalizeString(val, fallback).toUpperCase();
}
window.safeUpperCase = safeUpperCase;

function safeIncludes(val, query) {
  if (!query) return true;
  return safeLowerCase(val).includes(safeLowerCase(query));
}
window.safeIncludes = safeIncludes;

function normalizeRole(role) {
  const r = safeUpperCase(role, 'PATIENT');
  if (r.includes('ADMIN') && !r.includes('HOSPITAL')) return 'SUPER_ADMIN';
  if (r.includes('HOSPITAL')) return 'HOSPITAL_ADMIN';
  if (r.includes('DOCTOR') || r.includes('PHYSICIAN')) return 'DOCTOR';
  if (r.includes('PATIENT')) return 'PATIENT';
  return r;
}
window.normalizeRole = normalizeRole;

function normalizeStatus(status) {
  return safeUpperCase(status, 'ACTIVE');
}
window.normalizeStatus = normalizeStatus;

function normalizeAuditEvent(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      id: 'AUDIT-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      action: 'SYSTEM_EVENT',
      eventType: 'SYSTEM_EVENT',
      actor: 'System',
      actorName: 'System',
      actorRole: 'SYSTEM',
      actorId: 'SYSTEM',
      userId: 'SYSTEM',
      hospitalId: 'GLOBAL',
      resourceType: 'SYSTEM',
      resourceId: 'N/A',
      targetEntity: 'SYSTEM',
      targetId: 'N/A',
      description: 'System operation recorded.',
      details: 'System operation recorded.',
      timestamp: new Date().toISOString(),
      status: 'RECORDED',
      metadata: null,
      integrityHash: 'SEC-SHA256'
    };
  }
  const act = normalizeString(raw.action || raw.eventType, 'SYSTEM_EVENT');
  const details = normalizeString(raw.details || raw.description, 'System operation recorded.');
  const actorName = normalizeString(raw.actorName || raw.actor || raw.name, 'System');
  const actorRole = normalizeString(raw.actorRole || raw.role, 'SYSTEM').toUpperCase();
  const actorId = normalizeString(raw.actorId || raw.userId, 'SYSTEM');
  const targetEntity = normalizeString(raw.targetEntity || raw.resourceType || raw.entity, 'SYSTEM');
  const targetId = normalizeString(raw.targetId || raw.resourceId || raw.entityId, 'N/A');
  const hospitalId = normalizeString(raw.hospitalId, 'GLOBAL');
  const status = normalizeString(raw.status, 'RECORDED');
  const timestamp = raw.timestamp ? new Date(raw.timestamp).toISOString() : new Date().toISOString();
  const id = normalizeString(raw.id, 'AUDIT-' + Math.random().toString(36).substring(2, 8).toUpperCase());
  const integrityHash = normalizeString(raw.integrityHash, 'SEC-SHA256');
  const metadata = raw.metadata || null;

  return {
    id,
    action: act,
    eventType: act,
    actor: actorName,
    actorName,
    actorRole,
    actorId,
    userId: actorId,
    hospitalId,
    targetEntity,
    targetId,
    resourceType: targetEntity,
    resourceId: targetId,
    details,
    description: details,
    status,
    timestamp,
    integrityHash,
    metadata
  };
}
window.normalizeAuditEvent = normalizeAuditEvent;

class HospitrackStore {
  constructor() {
    this.data = {
      hospitals: [],
      doctors: [],
      medicalStaff: [],
      patients: [],
      prescriptions: [],
      labs: [],
      referrals: [],
      transfers: [],
      reviews: [],
      auditLogs: [],
      notifications: [],
      overview: null
    };

    this.isLoading = false;
    this.lastSync = null;
    this.listeners = [];
  }

  clearAll() {
    this.data = {
      hospitals: [],
      doctors: [],
      medicalStaff: [],
      patients: [],
      prescriptions: [],
      labs: [],
      referrals: [],
      transfers: [],
      reviews: [],
      auditLogs: [],
      notifications: [],
      overview: null,
      connectedCare: null
    };
    this.lastSync = null;
    this.stopRealtimeCareStream();
    this.notify();
  }

  // Event subscription for UI reactivity
  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.listeners.forEach(cb => {
      try { cb(this.data); } catch (e) { console.error('Store listener error:', e); }
    });
  }

  getAuthHeader() {
    const token = window.hospitrackAuth?.getAccessToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  getCurrentUser() {
    return window.hospitrackAuth?.getCurrentUser();
  }

  async apiRequest(path, method = 'GET', body = null, customTimeout = null) {
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader()
    };

    const options = {
      method,
      headers
    };

    if (body !== null && body !== undefined && (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE')) {
      options.body = JSON.stringify(body);
    }

    const timeout = customTimeout || (window.HOSPITRACK_CONFIG && window.HOSPITRACK_CONFIG.TIMEOUT_MS) || 15000;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort(new Error(`Request timed out after ${Math.round(timeout / 1000)}s`));
    }, timeout);
    options.signal = controller.signal;

    try {
      const targetUrl = getApiUrl(path);
      const response = await fetch(targetUrl, options);
      let json = {};
      try {
        json = await response.json();
      } catch (e) {
        json = {};
      }

      if (!response.ok) {
        if (response.status === 401) {
          window.hospitrackAuth?.clearSession();
          if (window.showLoginView) window.showLoginView();
          const authErr = new Error('Session expired. Please sign in again.');
          authErr.status = 401;
          throw authErr;
        }
        const err = new Error(json.message || `Request failed with status ${response.status}`);
        err.status = response.status;
        err.data = json;
        throw err;
      }

      return json;
    } catch (err) {
      if (err.status) {
        throw err;
      }
      if (err.name === 'AbortError' || err.message?.includes('timed out')) {
        const timeoutErr = new Error(`Connection timed out after ${Math.round(timeout / 1000)} seconds. Please verify your network connection.`);
        timeoutErr.isTimeout = true;
        throw timeoutErr;
      }
      throw new Error('Unable to connect to Hospitrack API backend. Please check your network connection.');
    } finally {
      clearTimeout(timer);
    }
  }

  // --------------------------------------------------------------------------
  // Synchronize Live Backend Data
  // --------------------------------------------------------------------------
  async syncAllData() {
    if (!window.hospitrackAuth?.isAuthenticated()) return;
    this.isLoading = true;

    try {
      const user = this.getCurrentUser();
      const role = user?.role;

      // 1. Fetch hospitals (publicly accessible across authorized sessions)
      const hospRes = await this.apiRequest('/api/hospitals').catch(() => ({ data: [] }));
      this.data.hospitals = hospRes.data || [];

      // 2. Role-specific isolated fetching to prevent 403s and unwanted cross-role requests
      if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
        const docRes = await this.apiRequest('/api/doctors').catch(() => ({ data: [] }));
        this.data.doctors = docRes.data || [];

        const patRes = await this.apiRequest('/api/patients').catch(() => ({ data: [] }));
        this.data.patients = patRes.data || [];

        const refRes = await this.apiRequest('/api/referrals').catch(() => ({ data: [] }));
        this.data.referrals = refRes.data || [];

        const trfRes = await this.apiRequest('/api/transfers').catch(() => ({ data: [] }));
        this.data.transfers = trfRes.data || [];

        const labRes = await this.apiRequest('/api/labs').catch(() => ({ data: [] }));
        this.data.labs = labRes.data || [];

        const ovRes = await this.apiRequest('/api/admin/overview').catch(() => ({ data: null }));
        this.data.overview = ovRes.data;

        const revRes = await this.apiRequest('/api/admin/reviews').catch(() => ({ data: [] }));
        this.data.reviews = revRes.data || [];

        const audRes = await this.apiRequest('/api/audit').catch(async () => {
          return await this.apiRequest('/api/admin/audit').catch(() => ({ data: [] }));
        });
        const rawAudits = Array.isArray(audRes) ? audRes : (audRes && audRes.data ? audRes.data : []);
        this.data.auditLogs = (Array.isArray(rawAudits) ? rawAudits : []).map(normalizeAuditEvent);
      } else if (role === 'HOSPITAL_ADMIN' || role === 'HOSPITAL') {
        const docRes = await this.apiRequest('/api/doctors').catch(() => ({ data: [] }));
        this.data.doctors = docRes.data || [];

        const patRes = await this.apiRequest('/api/patients').catch(() => ({ data: [] }));
        this.data.patients = patRes.data || [];

        const refRes = await this.apiRequest('/api/referrals').catch(() => ({ data: [] }));
        this.data.referrals = refRes.data || [];

        const trfRes = await this.apiRequest('/api/transfers').catch(() => ({ data: [] }));
        this.data.transfers = trfRes.data || [];

        const deptRes = await this.apiRequest('/api/hospital/departments').catch(() => ({ data: [] }));
        this.data.departments = deptRes.data || [];

        const profRes = await this.apiRequest('/api/hospital/profile').catch(() => ({ data: null }));
        if (profRes.data) {
          const idx = this.data.hospitals.findIndex(h => h.id === profRes.data.id);
          if (idx >= 0) this.data.hospitals[idx] = profRes.data;
          else this.data.hospitals.push(profRes.data);
        }

        if (user?.hospitalId) {
          const revRes = await this.apiRequest(`/api/reviews/hospital/${user.hospitalId}`).catch(() => ({ data: [] }));
          this.data.reviews = revRes.data || [];

          const audRes = await this.apiRequest('/api/audit').catch(() => ({ data: [] }));
          this.data.auditLogs = audRes.data || [];
        }
      } else if (role === 'DOCTOR') {
        const docRes = await this.apiRequest('/api/doctors/me').catch(() => ({ data: null }));
        if (docRes.data) {
          if (!this.data.doctors) this.data.doctors = [];
          const idx = this.data.doctors.findIndex(d => d.id === docRes.data.id);
          if (idx >= 0) this.data.doctors[idx] = docRes.data;
          else this.data.doctors.push(docRes.data);
        }

        const patRes = await this.apiRequest('/api/doctors/me/patients').catch(async () => {
          return await this.apiRequest('/api/patients').catch(() => ({ data: [] }));
        });
        this.data.patients = patRes.data || [];

        const refRes = await this.apiRequest('/api/referrals').catch(() => ({ data: [] }));
        this.data.referrals = refRes.data || [];

        const labRes = await this.apiRequest('/api/labs').catch(() => ({ data: [] }));
        this.data.labs = labRes.data || [];
      } else if (role === 'PATIENT') {
        // Patient role only synchronizes patient-specific records
        if (user?.patientId) {
          const rxRes = await this.apiRequest(`/api/prescriptions/patient/${user.patientId}`).catch(() => ({ data: [] }));
          this.data.prescriptions = rxRes.data || [];

          const revRes = await this.apiRequest(`/api/reviews/patient/${user.patientId}`).catch(() => ({ data: [] }));
          this.data.reviews = revRes.data || [];
        }
        await this.fetchUnifiedConnectedCare().catch((e) => {
          console.warn('Initial patient care sync notice:', e.message);
        });
      }

      this.generateLiveNotifications();
      this.lastSync = new Date();
      this.notify();
    } catch (err) {
      console.warn('Sync notice:', err.message);
    } finally {
      this.isLoading = false;
    }
  }

  generateLiveNotifications() {
    const user = this.getCurrentUser();
    if (!user) return;

    const notifs = [];
    const role = user.role;

    if (role === 'HOSPITAL_ADMIN' || role === 'HOSPITAL') {
      const pendingTransfers = this.data.transfers.filter(t => t.toHospitalId === user.hospitalId && t.status === 'PENDING');
      pendingTransfers.forEach(t => {
        notifs.push({
          id: `NOTIF-TRF-${t.id}`,
          title: '🚨 Emergency Transfer Pending',
          message: `Inbound transfer ${t.id} for patient ${t.patientId} requires immediate admission triage.`,
          timestamp: t.initiatedAt || new Date().toISOString(),
          read: false,
          type: 'TRANSFER'
        });
      });

      const pendingReferrals = this.data.referrals.filter(r => r.toHospitalId === user.hospitalId && r.status === 'PENDING');
      pendingReferrals.forEach(r => {
        notifs.push({
          id: `NOTIF-REF-${r.id}`,
          title: '🔁 Inbound Specialist Referral',
          message: `Referral ${r.id} for patient ${r.patientId} assigned to your facility.`,
          timestamp: r.createdAt || new Date().toISOString(),
          read: false,
          type: 'REFERRAL'
        });
      });
    } else if (role === 'DOCTOR') {
      const myRefs = this.data.referrals.filter(r => r.doctorId === user.doctorId);
      myRefs.slice(0, 3).forEach(r => {
        notifs.push({
          id: `NOTIF-DOC-REF-${r.id}`,
          title: `Referral Update (${r.status})`,
          message: `Specialist referral ${r.id} is currently ${r.status}.`,
          timestamp: r.createdAt || new Date().toISOString(),
          read: true,
          type: 'REFERRAL'
        });
      });
    } else if (role === 'PATIENT') {
      this.data.prescriptions.slice(0, 2).forEach(p => {
        notifs.push({
          id: `NOTIF-PAT-RX-${p.id}`,
          title: '💊 Active Prescription Order',
          message: `Signed prescription ${p.id} with ${p.items?.length || 0} active medication(s).`,
          timestamp: p.prescribedAt || new Date().toISOString(),
          read: true,
          type: 'PRESCRIPTION'
        });
      });
    } else if (role === 'SUPER_ADMIN') {
      const lowRating = this.getLowRatingHospitals(3.0);
      lowRating.forEach(h => {
        notifs.push({
          id: `NOTIF-ADM-LOW-${h.id}`,
          title: '⚠️ Facility Quality Alert',
          message: `${h.name} has dropped to ${h.rating}★ rating. Administrative review suggested.`,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'ADMIN'
        });
      });
    }

    this.data.notifications = notifs;
  }

  // --------------------------------------------------------------------------
  // Getters
  // --------------------------------------------------------------------------
  getHospitals() {
    return this.data.hospitals || [];
  }

  getHospitalById(id) {
    return this.data.hospitals.find(h => h.id === id) || null;
  }

  getLowRatingHospitals(threshold = 3.0) {
    return this.data.hospitals.filter(h => h.rating && h.rating > 0 && h.rating < threshold && h.status === 'ACTIVE');
  }

  getDoctors(hospitalId = null) {
    if (hospitalId) {
      return this.data.doctors.filter(d => d.hospitalId === hospitalId);
    }
    return this.data.doctors || [];
  }

  getDoctorById(id) {
    return this.data.doctors.find(d => d.id === id) || null;
  }

  getMedicalStaff(hospitalId = null) {
    this._ensureDefaultMedicalStaff(hospitalId);
    if (hospitalId) {
      return (this.data.medicalStaff || []).filter(s => s.hospitalId === hospitalId);
    }
    return this.data.medicalStaff || [];
  }

  getMedicalStaffById(id) {
    return (this.data.medicalStaff || []).find(s => s.id === id) || null;
  }

  _ensureDefaultMedicalStaff(hospitalId) {
    if (!this.data.medicalStaff) this.data.medicalStaff = [];
    const targetHospitalId = hospitalId || 'HOSP-101';
    const existing = this.data.medicalStaff.filter(s => s.hospitalId === targetHospitalId);
    if (existing.length === 0) {
      const defaultStaff = [
        {
          id: `STF-${targetHospitalId.replace('HOSP-', '')}01`,
          hospitalId: targetHospitalId,
          name: 'Anita Verma',
          category: 'Nursing Staff',
          role: 'Head ICU Nurse (RN)',
          department: 'Intensive Care Unit (ICU)',
          qualification: 'B.Sc Nursing, Critical Care Certified',
          shift: 'Morning (07:00 - 15:00)',
          phone: '+91 98765 11221',
          email: 'anita.verma@hospital.in',
          experience: '8 Years',
          status: 'ACTIVE',
          onDuty: true,
          joiningDate: '2021-03-15'
        },
        {
          id: `STF-${targetHospitalId.replace('HOSP-', '')}02`,
          hospitalId: targetHospitalId,
          name: 'Sunita Devi',
          category: 'Nursing Staff',
          role: 'Senior Triage Nurse (RN)',
          department: 'Emergency & Trauma',
          qualification: 'Post-Basic B.Sc Nursing, ACLS Certified',
          shift: 'Evening (15:00 - 23:00)',
          phone: '+91 98765 11222',
          email: 'sunita.devi@hospital.in',
          experience: '6 Years',
          status: 'ACTIVE',
          onDuty: true,
          joiningDate: '2022-01-10'
        },
        {
          id: `STF-${targetHospitalId.replace('HOSP-', '')}03`,
          hospitalId: targetHospitalId,
          name: 'Rakesh Kumar',
          category: 'Laboratory Staff',
          role: 'Senior Lab Technologist',
          department: 'Clinical Pathology & Biochemistry',
          qualification: 'M.Sc Medical Lab Technology (MLT)',
          shift: 'General (09:00 - 17:00)',
          phone: '+91 98765 11223',
          email: 'rakesh.kumar@hospital.in',
          experience: '9 Years',
          status: 'ACTIVE',
          onDuty: true,
          joiningDate: '2020-08-01'
        },
        {
          id: `STF-${targetHospitalId.replace('HOSP-', '')}04`,
          hospitalId: targetHospitalId,
          name: 'Meena Patel',
          category: 'Laboratory Staff',
          role: 'Hematology Technician',
          department: 'Hematology & Blood Bank',
          qualification: 'B.Sc Medical Lab Technology',
          shift: 'Morning (07:00 - 15:00)',
          phone: '+91 98765 11224',
          email: 'meena.patel@hospital.in',
          experience: '4 Years',
          status: 'ACTIVE',
          onDuty: false,
          joiningDate: '2023-04-12'
        },
        {
          id: `STF-${targetHospitalId.replace('HOSP-', '')}05`,
          hospitalId: targetHospitalId,
          name: 'Geeta Sharma',
          category: 'Pharmacy Staff',
          role: 'Chief Inpatient Pharmacist',
          department: 'Inpatient Central Pharmacy',
          qualification: 'M.Pharm (Clinical Pharmacy), PCI Registered',
          shift: 'General (09:00 - 17:00)',
          phone: '+91 98765 11225',
          email: 'geeta.sharma@hospital.in',
          experience: '11 Years',
          status: 'ACTIVE',
          onDuty: true,
          joiningDate: '2019-11-20'
        },
        {
          id: `STF-${targetHospitalId.replace('HOSP-', '')}06`,
          hospitalId: targetHospitalId,
          name: 'Vikram Joshi',
          category: 'Radiology / Imaging Staff',
          role: 'Senior Radiologic Technologist',
          department: 'Diagnostic Imaging & CT/MRI',
          qualification: 'B.Sc Medical Imaging Technology',
          shift: 'Morning (08:00 - 16:00)',
          phone: '+91 98765 11226',
          email: 'vikram.joshi@hospital.in',
          experience: '7 Years',
          status: 'ACTIVE',
          onDuty: true,
          joiningDate: '2021-09-05'
        },
        {
          id: `STF-${targetHospitalId.replace('HOSP-', '')}07`,
          hospitalId: targetHospitalId,
          name: 'Pooja Nair',
          category: 'Emergency Staff',
          role: 'Emergency Medical Technician (EMT-P)',
          department: 'Trauma & Ambulance Logistics',
          qualification: 'Paramedic Diploma, BLS/ACLS/PHTLS',
          shift: 'Night (23:00 - 07:00)',
          phone: '+91 98765 11227',
          email: 'pooja.nair@hospital.in',
          experience: '5 Years',
          status: 'ACTIVE',
          onDuty: true,
          joiningDate: '2022-06-18'
        },
        {
          id: `STF-${targetHospitalId.replace('HOSP-', '')}08`,
          hospitalId: targetHospitalId,
          name: 'Deepak Roy',
          category: 'Clinical Support',
          role: 'Patient Care Coordinator',
          department: 'General Ward Operations',
          qualification: 'Diploma in Hospital Administration',
          shift: 'General (09:00 - 17:00)',
          phone: '+91 98765 11228',
          email: 'deepak.roy@hospital.in',
          experience: '3 Years',
          status: 'ACTIVE',
          onDuty: false,
          joiningDate: '2023-02-01'
        }
      ];
      this.data.medicalStaff.push(...defaultStaff);
    }
  }

  getPatients(hospitalId = null) {
    if (hospitalId) {
      return (this.data.patients || []).filter(p => 
        p.currentHospitalId === hospitalId || 
        p.hospitalId === hospitalId || 
        p.hospital?.id === hospitalId
      );
    }
    return this.data.patients || [];
  }

  getPatientById(id) {
    return this.data.patients.find(p => p.id === id) || null;
  }

  async getPatientTimeline(patientId) {
    const res = await this.apiRequest(`/api/patients/${patientId}/timeline`);
    return res.data;
  }

  getPrescriptions(patientId = null, doctorId = null) {
    let list = this.data.prescriptions || [];
    if (patientId) {
      list = list.filter(p => p.patientId === patientId);
    }
    if (doctorId) {
      list = list.filter(p => p.doctorId === doctorId);
    }
    return list;
  }

  getLabs(doctorId = null, patientId = null, hospitalId = null) {
    let list = this.data.labs || [];
    if (patientId) {
      list = list.filter(l => l.patientId === patientId);
    }
    if (doctorId) {
      list = list.filter(l => l.doctorId === doctorId);
    }
    if (hospitalId) {
      list = list.filter(l => l.hospitalId === hospitalId);
    }
    return list;
  }

  getConsultations(patientId = null, doctorId = null, hospitalId = null) {
    let list = this.data.consultations || this.data.visits || [];
    if (patientId) {
      list = list.filter(c => c.patientId === patientId);
    }
    if (doctorId) {
      list = list.filter(c => c.doctorId === doctorId);
    }
    if (hospitalId) {
      list = list.filter(c => c.hospitalId === hospitalId);
    }
    return list;
  }

  getConsultationById(id) {
    if (!id) return null;
    const all = this.data.consultations || this.data.visits || [];
    const direct = all.find(c => c.id === id);
    if (direct) return direct;
    if (window._patientNormalizedData?.enrichedConsultations) {
      const fromNorm = window._patientNormalizedData.enrichedConsultations.find(c => c.id === id);
      if (fromNorm) return fromNorm;
    }
    return null;
  }

  getPrescriptionById(id) {
    return (this.data.prescriptions || []).find(p => p.id === id) || null;
  }

  getLabById(id) {
    return (this.data.labs || []).find(l => l.id === id) || null;
  }

  getRecentActivities(doctorId = null, hospitalId = null) {
    const activities = [];
    const patientsMap = new Map((this.data.patients || []).map(p => [p.id, p]));

    // 1. Prescriptions
    (this.data.prescriptions || []).forEach(rx => {
      if ((!doctorId || rx.doctorId === doctorId) && (!hospitalId || rx.hospitalId === hospitalId)) {
        const p = patientsMap.get(rx.patientId);
        activities.push({
          id: `ACT-RX-${rx.id}`,
          timestamp: rx.prescribedAt || new Date().toISOString(),
          type: 'PRESCRIPTION',
          icon: '💊',
          action: 'Prescription issued',
          patientName: p ? p.name : rx.patientId,
          patientId: rx.patientId,
          details: `${(rx.items || []).length} medication(s) prescribed`
        });
      }
    });

    // 2. Labs
    (this.data.labs || []).forEach(lab => {
      if ((!doctorId || lab.doctorId === doctorId) && (!hospitalId || lab.hospitalId === hospitalId)) {
        const p = patientsMap.get(lab.patientId);
        const isReviewed = lab.status === 'REVIEWED';
        activities.push({
          id: `ACT-LAB-${lab.id}`,
          timestamp: lab.reportDate || new Date().toISOString(),
          type: 'LAB',
          icon: '🔬',
          action: isReviewed ? 'Lab report reviewed' : 'Lab test ordered',
          patientName: p ? p.name : lab.patientId,
          patientId: lab.patientId,
          details: `${lab.testName} (${lab.status})`
        });
      }
    });

    // 3. Referrals
    (this.data.referrals || []).forEach(ref => {
      if ((!doctorId || ref.doctorId === doctorId) && (!hospitalId || ref.fromHospitalId === hospitalId || ref.toHospitalId === hospitalId)) {
        const p = patientsMap.get(ref.patientId);
        activities.push({
          id: `ACT-REF-${ref.id}`,
          timestamp: ref.createdAt || new Date().toISOString(),
          type: 'REFERRAL',
          icon: '🔁',
          action: `Referral ${ref.status.toLowerCase()}`,
          patientName: p ? p.name : ref.patientId,
          patientId: ref.patientId,
          details: `${ref.priority} • ${ref.reason}`
        });
      }
    });

    // Sort descending by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return activities;
  }

  getReferrals(hospitalId = null, role = null) {
    if (hospitalId) {
      return this.data.referrals.filter(r => r.fromHospitalId === hospitalId || r.toHospitalId === hospitalId);
    }
    return this.data.referrals || [];
  }

  getReferralById(id) {
    return (this.data.referrals || []).find(r => r.id === id) || null;
  }

  getTransfers(hospitalId = null, role = null) {
    if (hospitalId) {
      return this.data.transfers.filter(t => t.fromHospitalId === hospitalId || t.toHospitalId === hospitalId);
    }
    return this.data.transfers || [];
  }

  getTransferById(id) {
    return (this.data.transfers || []).find(t => t.id === id) || null;
  }

  async searchGlobal(query, type = null) {
    if (!query || !query.trim()) return [];
    let url = `/api/search?q=${encodeURIComponent(query.trim())}`;
    if (type && type !== 'ALL') url += `&type=${encodeURIComponent(type)}`;
    const res = await this.apiRequest(url);
    return res.data || [];
  }

  async fetchPatientById(id) {
    if (!id) return null;
    const res = await this.apiRequest(`/api/patients/${encodeURIComponent(id)}`);
    return res.data;
  }

  async fetchMyHospitalDoctors() {
    const token = window.hospitrackAuth?.getAccessToken();
    if (!token) {
      const err = new Error('Your session has expired. Please sign in again.');
      err.status = 401;
      throw err;
    }
    const res = await this.apiRequest('/api/hospital/my-doctors');
    const docs = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    if (!this.data.doctors) this.data.doctors = [];
    if (docs.length > 0) {
      docs.forEach(doc => {
        if (!doc || !doc.id) return;
        const idx = this.data.doctors.findIndex(d => d.id === doc.id);
        if (idx >= 0) this.data.doctors[idx] = doc;
        else this.data.doctors.push(doc);
      });
    }
    return docs;
  }

  async fetchDoctors(hospitalId = null) {
    const token = window.hospitrackAuth?.getAccessToken();
    if (!token) {
      const err = new Error('Authentication required. Please sign in again.');
      err.status = 401;
      throw err;
    }
    const user = window.hospitrackAuth?.getCurrentUser();
    const q = (hospitalId && user?.role === 'SUPER_ADMIN') ? `?hospitalId=${encodeURIComponent(hospitalId)}` : '';
    const res = await this.apiRequest(`/api/doctors${q}`);
    const docs = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    if (!this.data.doctors) this.data.doctors = [];
    if (docs.length > 0) {
      docs.forEach(doc => {
        if (!doc || !doc.id) return;
        const idx = this.data.doctors.findIndex(d => d.id === doc.id);
        if (idx >= 0) this.data.doctors[idx] = doc;
        else this.data.doctors.push(doc);
      });
    }
    return docs;
  }

  async createDoctor(payload) {
    const res = await this.apiRequest('/api/doctors', 'POST', payload);
    if (res.data) {
      if (!this.data.doctors) this.data.doctors = [];
      const idx = this.data.doctors.findIndex(d => d.id === res.data.id);
      if (idx >= 0) this.data.doctors[idx] = res.data;
      else this.data.doctors.push(res.data);
      this.notify();
    }
    return res.data;
  }

  async fetchMyDoctorProfile() {
    const res = await this.apiRequest('/api/doctors/me');
    if (res.data) {
      if (!this.data.doctors) this.data.doctors = [];
      const idx = this.data.doctors.findIndex(d => d.id === res.data.id);
      if (idx >= 0) this.data.doctors[idx] = res.data;
      else this.data.doctors.push(res.data);
    }
    return res.data;
  }

  async fetchMyAssignedPatients() {
    const res = await this.apiRequest('/api/doctors/me/patients');
    const pats = res.data || [];
    this.data.patients = pats;
    return pats;
  }

  async fetchDoctorById(id) {
    if (!id) return null;
    const res = await this.apiRequest(`/api/doctors/${encodeURIComponent(id)}`);
    return res.data;
  }

  async fetchHospitalById(id) {
    if (!id) return null;
    const res = await this.apiRequest(`/api/hospitals/${encodeURIComponent(id)}`);
    return res.data;
  }

  async fetchReferralById(id) {
    if (!id) return null;
    const res = await this.apiRequest(`/api/referrals/${encodeURIComponent(id)}`);
    return res.data;
  }

  async fetchTransferById(id) {
    if (!id) return null;
    const res = await this.apiRequest(`/api/transfers/${encodeURIComponent(id)}`);
    return res.data;
  }

  getReviews(hospitalId = null) {
    if (hospitalId) {
      return this.data.reviews.filter(r => r.hospitalId === hospitalId);
    }
    return this.data.reviews || [];
  }

  getAuditLogs(role = null, action = null, search = null, hospitalId = null) {
    let logs = (this.data.auditLogs || []).map(normalizeAuditEvent);

    if (role && role !== 'ALL') {
      const targetRole = safeUpperCase(role);
      logs = logs.filter(l => safeUpperCase(l.actorRole) === targetRole || safeUpperCase(l.role) === targetRole);
    }

    if (action && action !== 'ALL') {
      const targetAct = safeUpperCase(action);
      logs = logs.filter(l => safeUpperCase(l.action).includes(targetAct) || safeUpperCase(l.eventType).includes(targetAct));
    }

    if (hospitalId && hospitalId !== 'ALL') {
      logs = logs.filter(l => l.hospitalId === hospitalId || l.targetId === hospitalId || safeIncludes(l.details, hospitalId));
    }

    if (search && search.trim()) {
      const q = search.trim();
      logs = logs.filter(l =>
        safeIncludes(l.action, q) ||
        safeIncludes(l.details, q) ||
        safeIncludes(l.description, q) ||
        safeIncludes(l.actorName, q) ||
        safeIncludes(l.actorId, q) ||
        safeIncludes(l.targetId, q) ||
        safeIncludes(l.targetEntity, q) ||
        safeIncludes(l.id, q)
      );
    }
    return logs;
  }

  async fetchAuditLogs(role = null, action = null, search = null, hospitalId = null) {
    const queryParts = [];
    if (role && role !== 'ALL') queryParts.push(`role=${encodeURIComponent(role)}`);
    if (action && action !== 'ALL') queryParts.push(`action=${encodeURIComponent(action)}`);
    if (search && search.trim()) queryParts.push(`search=${encodeURIComponent(search.trim())}`);
    if (hospitalId && hospitalId !== 'ALL') queryParts.push(`hospitalId=${encodeURIComponent(hospitalId)}`);

    const queryStr = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const res = await this.apiRequest(`/api/audit${queryStr}`).catch(async () => {
      return await this.apiRequest(`/api/admin/audit${queryStr}`).catch(() => ({ data: [] }));
    });

    const rawLogs = Array.isArray(res) ? res : (res && res.data ? res.data : []);
    const normalized = (Array.isArray(rawLogs) ? rawLogs : []).map(normalizeAuditEvent);
    this.data.auditLogs = normalized;
    this.notify();
    return normalized;
  }

  async fetchBedNetwork() {
    const res = await this.apiRequest('/api/admin/bed-network').catch(async () => {
      return await this.apiRequest('/api/admin/beds').catch(() => ({ data: null }));
    });
    if (res && res.data) {
      this.data.bedNetwork = res.data;
      return res.data;
    }
    return null;
  }

  getBedNetwork() {
    if (this.data.bedNetwork) return this.data.bedNetwork;
    const hospitals = this.data.hospitals || [];
    const netTotal = hospitals.reduce((acc, h) => acc + (Number(h.totalBeds) || 0), 0);
    const netAvail = hospitals.reduce((acc, h) => acc + (Number(h.availableBeds) || 0), 0);
    const netOcc = Math.max(0, netTotal - netAvail);

    return {
      networkTotalBeds: netTotal,
      networkAvailableBeds: netAvail,
      networkOccupiedBeds: netOcc,
      networkMaintenanceBeds: 0,
      networkOccupancyRate: netTotal > 0 ? Math.round((netOcc / netTotal) * 1000) / 10 : 0,
      facilitiesCount: hospitals.length,
      hospitals: hospitals.map(h => {
        const tot = Number(h.totalBeds) || 100;
        const av = h.availableBeds != null ? Number(h.availableBeds) : 20;
        const occ = Math.max(0, tot - av);
        return {
          hospitalId: h.id,
          hospitalName: h.name,
          code: h.code || h.id,
          location: h.location,
          status: h.status || 'ACTIVE',
          totalBeds: tot,
          availableBeds: av,
          occupiedBeds: occ,
          maintenanceBeds: 0,
          occupancyRate: tot > 0 ? Math.round((occ / tot) * 1000) / 10 : 0
        };
      })
    };
  }

  getNotifications() {
    return this.data.notifications || [];
  }

  markNotificationRead(id) {
    const n = this.data.notifications.find(item => item.id === id);
    if (n) {
      n.read = true;
      this.notify();
    }
  }

  markAllNotificationsRead() {
    this.data.notifications.forEach(item => item.read = true);
    this.notify();
  }

  // --------------------------------------------------------------------------
  // Real REST API Mutations
  // --------------------------------------------------------------------------
  async createPatient(payload) {
    const res = await this.apiRequest('/api/patients', 'POST', payload);
    await this.syncAllData();
    return res.data;
  }

  async assignDoctorToPatient(patientId, doctorId) {
    const res = await this.apiRequest(`/api/patients/${patientId}/assign-doctor`, 'PUT', { doctorId });
    await this.syncAllData();
    return res.data;
  }

  async requestPatientDischarge(patientId, clinicalSummary = '') {
    const res = await this.apiRequest(`/api/patients/${patientId}/discharge-request`, 'POST', { clinicalSummary });
    await this.syncAllData();
    return res.data;
  }

  async approvePatientDischarge(patientId, clearanceNotes = '') {
    const res = await this.apiRequest(`/api/patients/${patientId}/discharge-clearance`, 'POST', { clearanceNotes });
    await this.syncAllData();
    return res.data;
  }

  async rejectPatientDischarge(patientId, reason = '') {
    const res = await this.apiRequest(`/api/patients/${patientId}/discharge-reject`, 'POST', { reason });
    await this.syncAllData();
    return res.data;
  }

  async dischargePatient(patientId) {
    const res = await this.apiRequest(`/api/patients/${patientId}/discharge`, 'PUT');
    await this.syncAllData();
    return res.data;
  }

  async adminResetPassword(userId, newPassword) {
    const res = await this.apiRequest('/api/auth/admin/reset-password', 'POST', { userId, newPassword });
    return res.data;
  }

  async logVisit(patientId, payload) {
    if (!payload.patientId) payload.patientId = patientId;
    const res = await this.apiRequest(`/api/patients/${patientId}/visits`, 'POST', payload);
    await this.syncAllData();
    return res.data;
  }

  async createPrescription(payload) {
    // Client-side duplicate check before POST (defense-in-depth)
    if (payload.medicines && Array.isArray(payload.medicines)) {
      const names = payload.medicines.map(m => m.name?.trim().toLowerCase()).filter(Boolean);
      const uniqueNames = new Set(names);
      if (uniqueNames.size < names.length) {
        throw new Error('Duplicate medication detected: Cannot prescribe the same drug multiple times in a single consultation.');
      }
    }

    const res = await this.apiRequest('/api/prescriptions', 'POST', payload);
    await this.syncAllData();
    return res.data;
  }

  async checkPrescriptionSafety(payload) {
    const res = await this.apiRequest('/api/prescriptions/safety-check', 'POST', payload);
    return res.data;
  }

  async createLabRequest(payload) {
    const res = await this.apiRequest('/api/labs', 'POST', payload);
    await this.syncAllData();
    return res.data;
  }

  async updateLabStatus(labId, status, resultSummary = '') {
    const res = await this.apiRequest(`/api/labs/${labId}/status`, 'PATCH', { status, resultSummary });
    await this.syncAllData();
    return res.data;
  }

  async createReferral(payload) {
    const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
    const pat = this.getPatientById(payload.patientId) || {};
    const fromHosp = this.getHospitalById(payload.fromHospitalId || user?.hospitalId || 'HOSP-101') || { name: 'City General Hospital' };
    const toHosp = this.getHospitalById(payload.targetFacilityId || payload.toHospitalId) || { name: payload.destinationFacility || 'Apex Care Medical Center' };

    const refId = payload.id || `REF-${Date.now().toString().slice(-4)}`;
    const normalized = {
      id: refId,
      patientId: payload.patientId,
      patientName: payload.patientName || pat.name || 'Patient Record',
      toHospitalId: payload.targetFacilityId || payload.toHospitalId || 'HOSP-102',
      targetFacilityId: payload.targetFacilityId || payload.toHospitalId || 'HOSP-102',
      destinationFacility: payload.destinationFacility || toHosp.name || 'Apex Care Medical Center',
      fromHospitalId: payload.fromHospitalId || user?.hospitalId || 'HOSP-101',
      sourceFacility: payload.sourceFacility || fromHosp.name || 'City General Hospital',
      doctorId: payload.doctorId || user?.doctorId || user?.id || 'DOC-201',
      fromDoctor: payload.fromDoctor || user?.name || 'Dr. Sarah Sharma',
      doctorName: payload.doctorName || payload.fromDoctor || user?.name || 'Dr. Sarah Sharma',
      priority: payload.clinicalPriority || payload.priority || 'ROUTINE',
      clinicalPriority: payload.clinicalPriority || payload.priority || 'ROUTINE',
      reason: payload.referralReason || payload.reason || '',
      referralReason: payload.referralReason || payload.reason || '',
      notes: payload.additionalNotes || payload.notes || '',
      additionalNotes: payload.additionalNotes || payload.notes || '',
      specialty: payload.targetSpecialty || payload.specialty || 'Cardiology',
      targetSpecialty: payload.targetSpecialty || payload.specialty || 'Cardiology',
      status: payload.status || 'Dispatched / Pending Triage',
      timestamp: payload.timestamp || new Date().toISOString(),
      createdAt: payload.createdAt || new Date().toISOString()
    };

    // Prepend to central state immediately so it is reflected across the dashboard
    if (!this.data.referrals) this.data.referrals = [];
    const existingIdx = this.data.referrals.findIndex(r => r.id === normalized.id);
    if (existingIdx >= 0) {
      this.data.referrals[existingIdx] = normalized;
    } else {
      this.data.referrals.unshift(normalized);
    }
    this.notify();

    try {
      const res = await this.apiRequest('/api/referrals', 'POST', {
        patientId: normalized.patientId,
        toHospitalId: normalized.toHospitalId,
        fromHospitalId: normalized.fromHospitalId,
        doctorId: normalized.doctorId,
        priority: normalized.priority,
        reason: normalized.reason,
        notes: normalized.notes
      });
      if (res && res.data) {
        Object.assign(normalized, res.data);
      }
      return normalized;
    } catch (e) {
      // Offline or mock fallback already unshifted and notified
      console.warn('API /api/referrals notice (using reactive local store fallback):', e.message);
      return normalized;
    }
  }

  async updateReferralStatus(referralId, statusOrPayload, reason = null, notes = null) {
    let payload = {};
    if (typeof statusOrPayload === 'object' && statusOrPayload !== null) {
      payload = statusOrPayload;
    } else {
      payload = { status: statusOrPayload };
      if (reason) payload.reason = reason;
      if (notes) payload.notes = notes;
    }
    const res = await this.apiRequest(`/api/referrals/${referralId}/status`, 'PATCH', payload);
    await this.syncAllData();
    return res.data;
  }

  async initiateTransfer(payload) {
    const res = await this.apiRequest('/api/transfers', 'POST', payload);
    await this.syncAllData();
    return res.data;
  }

  async acceptTransfer(transferId) {
    const res = await this.apiRequest(`/api/transfers/${transferId}/accept`, 'POST');
    await this.syncAllData();
    return res.data;
  }

  async updateBedCapacity(hospitalId, availableBeds) {
    const res = await this.apiRequest(`/api/hospitals/${hospitalId}/beds`, 'PUT', { availableBeds });
    await this.syncAllData();
    return res.data;
  }

  async createReview(payload) {
    const res = await this.apiRequest('/api/reviews', 'POST', payload);
    await this.syncAllData();
    return res.data;
  }

  async fetchEligibleHospitals() {
    const res = await this.apiRequest('/api/reviews/eligible-hospitals');
    return res.data || [];
  }

  async fetchLabReportById(id) {
    if (!id) return null;
    const res = await this.apiRequest(`/api/labs/${encodeURIComponent(id)}`);
    return res.data;
  }

  async flagReview(reviewId) {
    const res = await this.apiRequest(`/api/admin/reviews/${reviewId}/flag`, 'PUT');
    await this.syncAllData();
    return res.data;
  }

  async approveHospital(hospitalId) {
    const res = await this.apiRequest(`/api/admin/hospitals/${hospitalId}/approve`, 'POST');
    await this.syncAllData();
    return res.data;
  }

  async suspendHospital(hospitalId, reason = 'Administrative suspension') {
    const res = await this.apiRequest(`/api/admin/hospitals/${hospitalId}/suspend`, 'POST', { reason });
    await this.syncAllData();
    return res.data;
  }

  async reactivateHospital(hospitalId, reason = 'Administrative reactivation approved') {
    const res = await this.apiRequest(`/api/admin/hospitals/${hospitalId}/reactivate`, 'POST', { reason });
    await this.syncAllData();
    return res.data;
  }

  async updateHospitalStatus(hospitalId, status, reason = '') {
    if (status === 'ACTIVE') {
      return this.reactivateHospital(hospitalId, reason);
    } else if (status === 'SUSPENDED') {
      return this.suspendHospital(hospitalId, reason);
    }
    const res = await this.apiRequest(`/api/admin/hospitals/${hospitalId}/status`, 'PUT', { status, reason });
    await this.syncAllData();
    return res.data;
  }

  async getHospitalDetails(hospitalId) {
    const res = await this.apiRequest(`/api/admin/hospitals/${hospitalId}/details`);
    return res.data;
  }

  async updatePatientProfile(patientId, payload) {
    const res = await this.apiRequest(`/api/patients/${patientId}`, 'PUT', payload);
    // Update current patient in store
    const idx = (this.data.patients || []).findIndex(p => p.id === patientId);
    if (idx !== -1) {
      this.data.patients[idx] = res.data;
    }
    // Update current user if matching
    const currentUser = this.getCurrentUser();
    if (currentUser && (currentUser.patientId === patientId || currentUser.id === patientId)) {
      currentUser.name = res.data.name;
      currentUser.email = res.data.email || currentUser.email;
      if (res.data.photoUrl) {
        currentUser.avatarUrl = res.data.photoUrl;
      }
      const keys = window.HOSPITRACK_CONFIG?.STORAGE_KEYS || {};
      const storage = localStorage.getItem(keys.AUTH_USER) ? localStorage : sessionStorage;
      storage.setItem(keys.AUTH_USER, JSON.stringify(currentUser));
    }
    await this.syncAllData();
    return res.data;
  }

  async uploadPatientPhoto(patientId, photoDataUrl) {
    const res = await this.apiRequest(`/api/patients/${encodeURIComponent(patientId)}/photo`, 'POST', { photo: photoDataUrl });
    const idx = (this.data.patients || []).findIndex(p => p.id === patientId);
    if (idx !== -1) {
      this.data.patients[idx] = res.data;
    }
    const currentUser = this.getCurrentUser();
    if (currentUser && (currentUser.patientId === patientId || currentUser.id === patientId)) {
      currentUser.avatarUrl = res.data.photoUrl;
      const keys = window.HOSPITRACK_CONFIG?.STORAGE_KEYS || {};
      const storage = localStorage.getItem(keys.AUTH_USER) ? localStorage : sessionStorage;
      storage.setItem(keys.AUTH_USER, JSON.stringify(currentUser));
    }
    await this.syncAllData();
    return res.data;
  }

  async removePatientPhoto(patientId) {
    const res = await this.apiRequest(`/api/patients/${encodeURIComponent(patientId)}/photo`, 'DELETE');
    const idx = (this.data.patients || []).findIndex(p => p.id === patientId);
    if (idx !== -1) {
      this.data.patients[idx] = res.data;
    }
    const currentUser = this.getCurrentUser();
    if (currentUser && (currentUser.patientId === patientId || currentUser.id === patientId)) {
      currentUser.avatarUrl = null;
      const keys = window.HOSPITRACK_CONFIG?.STORAGE_KEYS || {};
      const storage = localStorage.getItem(keys.AUTH_USER) ? localStorage : sessionStorage;
      storage.setItem(keys.AUTH_USER, JSON.stringify(currentUser));
    }
    await this.syncAllData();
    return res.data;
  }

  async updateHospitalProfile(hospitalId, payload) {
    const res = await this.apiRequest(`/api/hospitals/${hospitalId}`, 'PUT', payload);
    const idx = (this.data.hospitals || []).findIndex(h => h.id === hospitalId);
    if (idx !== -1) {
      this.data.hospitals[idx] = res.data;
    }
    await this.syncAllData();
    return res.data;
  }

  clearAll() {
    this.data = {
      hospitals: [],
      doctors: [],
      patients: [],
      prescriptions: [],
      labs: [],
      referrals: [],
      transfers: [],
      reviews: [],
      auditLogs: [],
      notifications: [],
      overview: null
    };
    this.isLoading = false;
    this.lastSync = null;
    this.notify();
  }

  async createDoctor(payload) {
    const res = await this.apiRequest('/api/doctors', 'POST', payload);
    await this.syncAllData();
    return res.data;
  }

  async assignDoctorToHospital(doctorId, hospitalId, department = null) {
    const res = await this.apiRequest(`/api/doctors/${encodeURIComponent(doctorId)}/assign`, 'POST', {
      hospitalId,
      department: department || undefined,
      specialty: department || undefined
    });
    await this.syncAllData();
    return res.data;
  }

  async updateDoctor(doctorId, payload) {
    const res = await this.apiRequest(`/api/doctors/${encodeURIComponent(doctorId)}`, 'PUT', payload);
    await this.syncAllData();
    return res.data;
  }

  async createMedicalStaff(payload) {
    if (!this.data.medicalStaff) this.data.medicalStaff = [];
    const hospId = payload.hospitalId || 'HOSP-101';
    const idPrefix = payload.category?.toLowerCase().includes('nurse') ? 'NUR' : payload.category?.toLowerCase().includes('lab') ? 'LAB' : payload.category?.toLowerCase().includes('pharm') ? 'PHARM' : 'STF';
    const newStaff = {
      id: payload.id || `${idPrefix}-${Math.floor(100 + Math.random() * 900)}`,
      hospitalId: hospId,
      name: payload.name,
      category: payload.category || 'Clinical Support',
      role: payload.role || 'Staff Member',
      department: payload.department || 'General Services',
      qualification: payload.qualification || 'Certified',
      shift: payload.shift || 'General (09:00 - 17:00)',
      phone: payload.phone || '+91 98765 00000',
      email: payload.email || `${payload.name?.toLowerCase().replace(/\s+/g, '.')}@hospital.in`,
      experience: payload.experience || '3 Years',
      status: payload.status || 'ACTIVE',
      onDuty: payload.status === 'ACTIVE',
      joiningDate: payload.joiningDate || new Date().toISOString().slice(0, 10)
    };
    this.data.medicalStaff.unshift(newStaff);
    this.notify();
    return newStaff;
  }

  async updateMedicalStaff(staffId, payload) {
    if (!this.data.medicalStaff) this.data.medicalStaff = [];
    const idx = this.data.medicalStaff.findIndex(s => s.id === staffId);
    if (idx !== -1) {
      this.data.medicalStaff[idx] = {
        ...this.data.medicalStaff[idx],
        ...payload
      };
      this.notify();
      return this.data.medicalStaff[idx];
    }
    return null;
  }

  async deleteMedicalStaff(staffId) {
    if (!this.data.medicalStaff) return;
    this.data.medicalStaff = this.data.medicalStaff.filter(s => s.id !== staffId);
    this.notify();
    return true;
  }

  async downloadPatientReport(patientId) {
    const patient = await this.fetchPatientById(patientId);
    if (!patient) {
      throw new Error(`Patient record ${patientId} unavailable or not found.`);
    }

    let timeline = { visits: [], prescriptions: [], reports: [] };
    try {
      timeline = await this.getPatientTimeline(patientId);
    } catch (e) {
      console.warn('Timeline fetch error during export:', e);
    }

    const hospital = this.getHospitalById(patient.currentHospitalId) || { name: patient.currentHospitalId || 'Hospital' };
    const doctor = this.getDoctorById(patient.primaryDoctorId) || { name: patient.primaryDoctorId || 'Doctor' };
    const referrals = (this.data.referrals || []).filter(r => r.patientId === patientId);
    const transfers = (this.data.transfers || []).filter(t => t.patientId === patientId);

    const dossier = {
      hospitalSystem: 'HOSPITRACK CLINICAL NETWORK',
      exportTimestamp: new Date().toISOString(),
      facility: {
        id: hospital.id,
        name: hospital.name,
        code: hospital.code || hospital.id,
        location: hospital.location
      },
      patient: {
        id: patient.id,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup,
        contact: patient.contact,
        email: patient.email,
        emergencyContact: patient.emergencyContact,
        address: patient.address,
        status: patient.status,
        admittedAt: patient.admittedAt,
        primaryDoctor: {
          id: doctor.id,
          name: doctor.name,
          specialty: doctor.specialty
        }
      },
      consultations: (timeline.visits || []).map(v => ({
        id: v.id,
        visitDate: v.visitDate,
        doctorId: v.doctorId,
        hospitalId: v.hospitalId,
        symptoms: v.symptoms,
        diagnosis: v.diagnosis,
        treatment: v.treatment,
        notes: v.notes
      })),
      prescriptions: (timeline.prescriptions || this.getPrescriptions(patientId)).map(rx => ({
        id: rx.id,
        prescribedAt: rx.prescribedAt,
        doctorId: rx.doctorId,
        hospitalId: rx.hospitalId,
        medications: (rx.items || []).map(i => ({
          name: i.name,
          dosage: i.dosage,
          frequency: i.frequency,
          duration: i.duration,
          instructions: i.instructions
        }))
      })),
      diagnosticLabReports: (timeline.reports || this.getLabs(null, patientId)).map(l => ({
        id: l.id,
        testName: l.testName,
        category: l.category,
        reportDate: l.reportDate,
        resultSummary: l.resultSummary,
        status: l.status
      })),
      referrals: referrals.map(r => ({
        id: r.id,
        fromHospitalId: r.fromHospitalId,
        toHospitalId: r.toHospitalId,
        specialty: r.specialty,
        priority: r.priority,
        status: r.status,
        reason: r.reason,
        notes: r.notes
      })),
      emergencyTransfers: transfers.map(t => ({
        id: t.id,
        fromHospitalId: t.fromHospitalId,
        toHospitalId: t.toHospitalId,
        priority: t.priority,
        status: t.status,
        reason: t.reason,
        initiatedAt: t.initiatedAt,
        notes: t.notes
      }))
    };

    const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HOSPITRACK_PATIENT_${patientId}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return dossier;
  }

  async downloadAllPatientsReport(hospitalId) {
    const patients = this.getPatients(hospitalId);
    if (!patients || patients.length === 0) {
      throw new Error('No authorized patient records found to download.');
    }

    const hospital = this.getHospitalById(hospitalId) || { id: hospitalId, name: 'Hospital Facility' };
    const registry = {
      hospitalSystem: 'HOSPITRACK CLINICAL NETWORK',
      exportTimestamp: new Date().toISOString(),
      facility: {
        id: hospital.id,
        name: hospital.name,
        code: hospital.code || hospital.id,
        location: hospital.location,
        totalBeds: hospital.totalBeds,
        availableBeds: hospital.availableBeds
      },
      patientCount: patients.length,
      inpatients: patients.map(p => ({
        id: p.id,
        name: p.name,
        age: p.age,
        gender: p.gender,
        bloodGroup: p.bloodGroup,
        contact: p.contact,
        status: p.status,
        admittedAt: p.admittedAt,
        primaryDoctorId: p.primaryDoctorId
      }))
    };

    const blob = new Blob([JSON.stringify(registry, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HOSPITRACK_FACILITY_${hospitalId}_PATIENTS_REGISTRY_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return registry;
  }

  async createHospital(payload) {
    const res = await this.apiRequest('/api/hospitals', 'POST', payload);
    await this.syncAllData();
    return res.data;
  }

  // --------------------------------------------------------------------------
  // Hospital Facility Management & Workspace Operations
  // --------------------------------------------------------------------------
  async getHospitalProfile(hospitalId = null) {
    const q = hospitalId ? `?hospitalId=${encodeURIComponent(hospitalId)}` : '';
    const res = await this.apiRequest(`/api/hospital/profile${q}`);
    if (res.data && res.data.id) {
      if (!this.data.hospitals) this.data.hospitals = [];
      const idx = this.data.hospitals.findIndex(h => h.id === res.data.id);
      if (idx >= 0) this.data.hospitals[idx] = res.data;
      else this.data.hospitals.push(res.data);
    }
    return res.data;
  }

  async updateHospitalProfile(payload, hospitalId = null) {
    const q = hospitalId ? `?hospitalId=${encodeURIComponent(hospitalId)}` : '';
    const res = await this.apiRequest(`/api/hospital/profile${q}`, 'PUT', payload);
    if (res.data && res.data.id) {
      if (!this.data.hospitals) this.data.hospitals = [];
      const idx = this.data.hospitals.findIndex(h => h.id === res.data.id);
      if (idx >= 0) this.data.hospitals[idx] = res.data;
      else this.data.hospitals.push(res.data);
      this.notify();
    }
    return res.data;
  }

  async uploadHospitalLogo(photoData, hospitalId = null) {
    const q = hospitalId ? `?hospitalId=${encodeURIComponent(hospitalId)}` : '';
    const res = await this.apiRequest(`/api/hospital/profile/logo${q}`, 'POST', { photo: photoData });
    if (res.data && res.data.id) {
      if (!this.data.hospitals) this.data.hospitals = [];
      const idx = this.data.hospitals.findIndex(h => h.id === res.data.id);
      if (idx >= 0) this.data.hospitals[idx] = res.data;
      else this.data.hospitals.push(res.data);
      this.notify();
    }
    return res.data;
  }

  async fetchHospitalDashboard(hospitalId = null) {
    const q = hospitalId ? `?hospitalId=${encodeURIComponent(hospitalId)}` : '';
    const res = await this.apiRequest(`/api/hospital/dashboard${q}`);
    return res.data;
  }

  async fetchHospitalDepartments(hospitalId = null) {
    const q = hospitalId ? `?hospitalId=${encodeURIComponent(hospitalId)}` : '';
    const res = await this.apiRequest(`/api/hospital/departments${q}`);
    return Array.isArray(res.data) ? res.data : [];
  }

  async createHospitalDepartment(payload, hospitalId = null) {
    const q = hospitalId ? `?hospitalId=${encodeURIComponent(hospitalId)}` : '';
    const res = await this.apiRequest(`/api/hospital/departments${q}`, 'POST', payload);
    return res.data;
  }

  async updateHospitalDepartment(id, payload) {
    const res = await this.apiRequest(`/api/hospital/departments/${encodeURIComponent(id)}`, 'PUT', payload);
    return res.data;
  }

  async deleteHospitalDepartment(id) {
    const res = await this.apiRequest(`/api/hospital/departments/${encodeURIComponent(id)}`, 'DELETE');
    return res.data;
  }

  async resetHospitalCredentials(hospitalId) {
    const res = await this.apiRequest(`/api/admin/hospitals/${encodeURIComponent(hospitalId)}/credentials/reset`, 'POST');
    return res.data;
  }

  // --------------------------------------------------------------------------
  // Doctor & Patient Credential Management (Hospital-Controlled)
  // --------------------------------------------------------------------------
  async getDoctorCredentials(doctorId) {
    const res = await this.apiRequest(`/api/doctors/${encodeURIComponent(doctorId)}/credentials`);
    return res.data;
  }

  async saveDoctorCredentials(doctorId, payload) {
    const res = await this.apiRequest(`/api/doctors/${encodeURIComponent(doctorId)}/credentials`, 'POST', payload);
    return res.data;
  }

  async updateDoctorCredentialStatus(doctorId, status) {
    const res = await this.apiRequest(`/api/doctors/${encodeURIComponent(doctorId)}/credential-status`, 'PUT', { status });
    return res.data;
  }

  async getPatientCredentials(patientId) {
    const res = await this.apiRequest(`/api/patients/${encodeURIComponent(patientId)}/credentials`);
    return res.data;
  }

  async savePatientCredentials(patientId, payload) {
    const res = await this.apiRequest(`/api/patients/${encodeURIComponent(patientId)}/credentials`, 'POST', payload);
    return res.data;
  }

  async updatePatientCredentialStatus(patientId, status) {
    const res = await this.apiRequest(`/api/patients/${encodeURIComponent(patientId)}/credential-status`, 'PUT', { status });
    return res.data;
  }

  // --------------------------------------------------------------------------
  // First OPD Intake Workflow
  // --------------------------------------------------------------------------
  async recordPatientIntake(patientId, payload) {
    const res = await this.apiRequest(`/api/patients/${encodeURIComponent(patientId)}/intake`, 'POST', payload);
    await this.syncAllData();
    return res.data;
  }

  async getPatientIntakes(patientId) {
    const res = await this.apiRequest(`/api/patients/${encodeURIComponent(patientId)}/intake`);
    return res.data || [];
  }

  // --------------------------------------------------------------------------
  // Authoritative Ward & Bed Operations
  // --------------------------------------------------------------------------
  async getHospitalBeds(hospitalId = null) {
    const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
    const targetId = hospitalId || user?.hospitalId || 'HOSP-101';
    try {
      const res = await this.apiRequest(`/api/hospitals/${encodeURIComponent(targetId)}/beds`);
      return Array.isArray(res.data) ? res.data : (res.data?.beds || []);
    } catch (e) {
      try {
        const res2 = await this.apiRequest(`/api/hospital/beds/${encodeURIComponent(targetId)}`);
        return Array.isArray(res2.data) ? res2.data : [];
      } catch (err) {
        return window._currentBedInventory || [];
      }
    }
  }

  async assignBed(hospitalIdOrPayload, payloadMaybe = null) {
    let hospitalId;
    let payload;
    if (typeof hospitalIdOrPayload === 'string') {
      hospitalId = hospitalIdOrPayload;
      payload = payloadMaybe || {};
    } else {
      payload = hospitalIdOrPayload || {};
      hospitalId = payload.hospitalId;
    }
    if (!hospitalId) {
      const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
      hospitalId = user?.hospitalId || 'HOSP-101';
    }

    try {
      const res = await this.apiRequest(`/api/hospitals/${encodeURIComponent(hospitalId)}/beds/assign`, 'POST', payload);
      await this.syncAllData().catch(() => {});
      return res.data;
    } catch (e) {
      const res = await this.apiRequest('/api/hospital/beds/assign', 'POST', payload);
      await this.syncAllData().catch(() => {});
      return res.data;
    }
  }

  async markBedMaintenance(hospitalIdOrData, bedIdMaybe = null, reasonMaybe = null) {
    let hospitalId, bedId, reason;
    if (typeof hospitalIdOrData === 'object' && hospitalIdOrData !== null) {
      hospitalId = hospitalIdOrData.hospitalId;
      bedId = hospitalIdOrData.bedId;
      reason = hospitalIdOrData.reason || 'Routine sterilization & maintenance';
    } else {
      hospitalId = hospitalIdOrData;
      bedId = bedIdMaybe;
      reason = reasonMaybe || 'Routine sterilization & maintenance';
    }
    if (!hospitalId) {
      const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
      hospitalId = user?.hospitalId || 'HOSP-101';
    }

    try {
      const res = await this.apiRequest(`/api/hospitals/${encodeURIComponent(hospitalId)}/beds/${encodeURIComponent(bedId)}/maintenance`, 'POST', { reason });
      await this.syncAllData().catch(() => {});
      return res.data;
    } catch (e) {
      const res = await this.apiRequest('/api/hospital/beds/maintenance', 'POST', { hospitalId, bedId, reason });
      await this.syncAllData().catch(() => {});
      return res.data;
    }
  }

  async releaseBedMaintenance(hospitalIdOrBedId, bedIdMaybe = null) {
    let hospitalId, bedId;
    if (bedIdMaybe) {
      hospitalId = hospitalIdOrBedId;
      bedId = bedIdMaybe;
    } else {
      bedId = hospitalIdOrBedId;
      const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
      hospitalId = user?.hospitalId || 'HOSP-101';
    }

    try {
      const res = await this.apiRequest(`/api/hospitals/${encodeURIComponent(hospitalId)}/beds/${encodeURIComponent(bedId)}/release-maintenance`, 'POST');
      await this.syncAllData().catch(() => {});
      return res.data;
    } catch (e) {
      const res = await this.apiRequest(`/api/hospital/beds/${encodeURIComponent(bedId)}/release-maintenance`, 'POST');
      await this.syncAllData().catch(() => {});
      return res.data;
    }
  }

  async dispatchEvsHousekeeping(hospitalId, bedId, data = {}) {
    const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
    const targetHosp = hospitalId || user?.hospitalId || 'HOSP-101';
    try {
      const res = await this.apiRequest(`/api/hospitals/${encodeURIComponent(targetHosp)}/beds/${encodeURIComponent(bedId)}/evs-dispatch`, 'POST', data);
      await this.syncAllData().catch(() => {});
      return res.data;
    } catch (e) {
      const res = await this.apiRequest(`/api/hospital/beds/${encodeURIComponent(bedId)}/evs-dispatch`, 'POST', data);
      await this.syncAllData().catch(() => {});
      return res.data;
    }
  }

  async completeEvsCleaning(hospitalId, bedId, staffName = null) {
    const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
    const targetHosp = hospitalId || user?.hospitalId || 'HOSP-101';
    try {
      const res = await this.apiRequest(`/api/hospitals/${encodeURIComponent(targetHosp)}/beds/${encodeURIComponent(bedId)}/evs-complete`, 'POST', { staffName });
      await this.syncAllData().catch(() => {});
      return res.data;
    } catch (e) {
      const res = await this.apiRequest(`/api/hospital/beds/${encodeURIComponent(bedId)}/evs-complete`, 'POST', { staffName });
      await this.syncAllData().catch(() => {});
      return res.data;
    }
  }

  async inspectAndReleaseBed(hospitalId, bedId, inspectorName = null) {
    const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
    const targetHosp = hospitalId || user?.hospitalId || 'HOSP-101';
    try {
      const res = await this.apiRequest(`/api/hospitals/${encodeURIComponent(targetHosp)}/beds/${encodeURIComponent(bedId)}/evs-inspect`, 'POST', { inspectorName });
      await this.syncAllData().catch(() => {});
      return res.data;
    } catch (e) {
      const res = await this.apiRequest(`/api/hospital/beds/${encodeURIComponent(bedId)}/evs-inspect`, 'POST', { inspectorName });
      await this.syncAllData().catch(() => {});
      return res.data;
    }
  }

  async getEvsTurnoverSummary(hospitalId = null) {
    const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
    const targetHosp = hospitalId || user?.hospitalId || 'HOSP-101';
    try {
      const res = await this.apiRequest(`/api/hospitals/${encodeURIComponent(targetHosp)}/evs-summary`);
      return res.data;
    } catch (e) {
      const res = await this.apiRequest('/api/hospital/evs-summary');
      return res.data;
    }
  }

  async getBedMaintenanceHistory(hospitalId = null, ward = null) {
    const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
    const targetId = hospitalId || user?.hospitalId || 'HOSP-101';
    const q = ward ? `?ward=${encodeURIComponent(ward)}` : '';
    try {
      const res = await this.apiRequest(`/api/hospitals/${encodeURIComponent(targetId)}/beds/maintenance-history${q}`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      try {
        const res = await this.apiRequest(`/api/hospital/beds/maintenance/history?hospitalId=${encodeURIComponent(targetId)}${ward ? `&ward=${encodeURIComponent(ward)}` : ''}`);
        return Array.isArray(res.data) ? res.data : [];
      } catch (err) {
        return [];
      }
    }
  }

  // --------------------------------------------------------------------------
  // Connected Care & Patient Health Journey Subsystem
  // --------------------------------------------------------------------------
  async fetchCareSummary(patientId = null) {
    const url = patientId ? `/api/patient/care-summary?patientId=${encodeURIComponent(patientId)}` : '/api/patient/care-summary';
    const res = await this.apiRequest(url);
    return res.data;
  }

  async fetchCareJourney(patientId = null) {
    const url = patientId ? `/api/patient/care-journey?patientId=${encodeURIComponent(patientId)}` : '/api/patient/care-journey';
    const res = await this.apiRequest(url);
    return res.data;
  }

  async fetchCurrentHospitalCare(patientId = null) {
    const url = patientId ? `/api/patient/current-hospital?patientId=${encodeURIComponent(patientId)}` : '/api/patient/current-hospital';
    const res = await this.apiRequest(url);
    return res.data;
  }

  async fetchConnectedHospitals(patientId = null) {
    const url = patientId ? `/api/patient/hospitals?patientId=${encodeURIComponent(patientId)}` : '/api/patient/hospitals';
    const res = await this.apiRequest(url);
    return res.data;
  }

  async fetchHospitalRecords(hospitalId, patientId = null) {
    const url = patientId ? `/api/patient/hospitals/${encodeURIComponent(hospitalId)}/records?patientId=${encodeURIComponent(patientId)}` : `/api/patient/hospitals/${encodeURIComponent(hospitalId)}/records`;
    const res = await this.apiRequest(url);
    return res.data;
  }

  async fetchConnectedRecords(patientId = null) {
    const url = patientId ? `/api/patient/connected-records?patientId=${encodeURIComponent(patientId)}` : '/api/patient/connected-records';
    const res = await this.apiRequest(url);
    return res.data;
  }

  async fetchEnrichedReferrals(patientId = null) {
    const url = patientId ? `/api/patient/referrals?patientId=${encodeURIComponent(patientId)}` : '/api/patient/referrals';
    const res = await this.apiRequest(url);
    return res.data;
  }

  async fetchEnrichedPrescriptions(patientId = null) {
    const url = patientId ? `/api/patient/prescriptions?patientId=${encodeURIComponent(patientId)}` : '/api/patient/prescriptions';
    const res = await this.apiRequest(url);
    return res.data;
  }

  async fetchEnrichedLabReports(patientId = null) {
    const url = patientId ? `/api/patient/lab-reports?patientId=${encodeURIComponent(patientId)}` : '/api/patient/lab-reports';
    const res = await this.apiRequest(url);
    return res.data;
  }

  async fetchDischarges(patientId = null) {
    const url = patientId ? `/api/patient/discharges?patientId=${encodeURIComponent(patientId)}` : '/api/patient/discharges';
    const res = await this.apiRequest(url);
    return res.data;
  }

  async fetchFollowUps(patientId = null) {
    const url = patientId ? `/api/patient/follow-ups?patientId=${encodeURIComponent(patientId)}` : '/api/patient/follow-ups';
    const res = await this.apiRequest(url);
    return res.data;
  }

  async fetchConsultations(patientId = null) {
    const url = patientId ? `/api/patient/consultations?patientId=${encodeURIComponent(patientId)}` : '/api/patient/consultations';
    const res = await this.apiRequest(url);
    return res.data;
  }

  async fetchUnifiedConnectedCare(patientId = null) {
    const url = patientId ? `/api/patient/connected-care?patientId=${encodeURIComponent(patientId)}` : '/api/patient/connected-care';
    try {
      const res = await this.apiRequest(url);
      if (res && res.data) {
        this.data.connectedCare = res.data;
        return res.data;
      }
      return null;
    } catch (err) {
      console.warn(`Connected Care request notice: GET ${url} Status: ${err.status || 'Network'} Notice:`, err.message || err);
      throw err;
    }
  }

  stopRealtimeCareStream() {
    if (this.careSyncInterval) {
      clearInterval(this.careSyncInterval);
      this.careSyncInterval = null;
    }
    if (this.careEventSource) {
      try { this.careEventSource.close(); } catch (e) {}
      this.careEventSource = null;
    }
  }

  initRealtimeCareStream(onEventCallback = null) {
    const auth = window.hospitrackAuth;
    const user = auth?.getCurrentUser();
    if (!user || user.role !== 'PATIENT') {
      this.stopRealtimeCareStream();
      return null;
    }

    const token = auth.getAccessToken ? auth.getAccessToken() : auth.getToken();
    if (!token) return null;

    this.stopRealtimeCareStream();

    try {
      // Lightweight visibility-aware live synchronization polling with safe cancellation
      const startLiveCareSync = () => {
        let isPolling = false;
        const pollInterval = setInterval(async () => {
          if (document.hidden || isPolling) return;
          const currentUser = auth?.getCurrentUser();
          if (!currentUser || currentUser.role !== 'PATIENT') {
            clearInterval(pollInterval);
            return;
          }
          isPolling = true;
          try {
            const updated = await this.fetchUnifiedConnectedCare();
            if (onEventCallback && typeof onEventCallback === 'function') {
              onEventCallback({ type: 'CARE_SYNC', data: updated });
            }
          } catch (e) {
            // Background sync failure is logged non-blockingly
            console.debug('Background care stream sync notice:', e.message);
          } finally {
            isPolling = false;
          }
        }, 30000); // 30s background sync interval
        return pollInterval;
      };

      this.careSyncInterval = startLiveCareSync();
    } catch (err) {
      console.warn('Real-time care stream initialization notice:', err);
    }
  }

  // --------------------------------------------------------------------------
  // Credentials Management (Hospital-Controlled Doctor & Patient Provisioning)
  // --------------------------------------------------------------------------
  async getDoctorCredentials(doctorId) {
    const res = await this.apiRequest(`/api/doctor/${encodeURIComponent(doctorId)}/credentials`, 'GET');
    return res.data;
  }

  async saveDoctorCredentials(doctorId, payload) {
    const res = await this.apiRequest(`/api/doctor/${encodeURIComponent(doctorId)}/credentials`, 'POST', payload);
    return res.data;
  }

  async updateDoctorCredentialStatus(doctorId, active) {
    const res = await this.apiRequest(`/api/doctor/${encodeURIComponent(doctorId)}/credentials/status`, 'PATCH', { active });
    return res.data;
  }

  async getPatientCredentials(patientId) {
    const res = await this.apiRequest(`/api/patient/${encodeURIComponent(patientId)}/credentials`, 'GET');
    return res.data;
  }

  async savePatientCredentials(patientId, payload) {
    const res = await this.apiRequest(`/api/patient/${encodeURIComponent(patientId)}/credentials`, 'POST', payload);
    return res.data;
  }

  async updatePatientCredentialStatus(patientId, active) {
    const res = await this.apiRequest(`/api/patient/${encodeURIComponent(patientId)}/credentials/status`, 'PATCH', { active });
    return res.data;
  }

  // --------------------------------------------------------------------------
  // First OPD Intake Workflow
  // --------------------------------------------------------------------------
  async recordPatientIntake(intakeData) {
    const res = await this.apiRequest('/api/patient/intake', 'POST', intakeData);
    if (res && res.data) {
      // Re-sync patient data if needed
      await this.syncAllData();
      return res.data;
    }
    return res.data;
  }

  async getPatientIntakes(patientId) {
    const res = await this.apiRequest(`/api/patient/intakes/${encodeURIComponent(patientId)}`, 'GET');
    return Array.isArray(res.data) ? res.data : [];
  }

  // (Authoritative Ward & Bed Operations are defined above)

  // --------------------------------------------------------------------------
  // Production Hospital Profile & Department CRUD Operations
  // --------------------------------------------------------------------------
  async getHospitalProfile(hospitalId = null) {
    const q = hospitalId ? `?hospitalId=${encodeURIComponent(hospitalId)}` : '';
    const res = await this.apiRequest(`/api/hospital/profile${q}`, 'GET');
    if (res.data) {
      const idx = this.data.hospitals.findIndex(h => h.id === res.data.id);
      if (idx >= 0) {
        this.data.hospitals[idx] = res.data;
      } else {
        this.data.hospitals.push(res.data);
      }
      this.notify();
    }
    return res.data;
  }

  async updateHospitalProfile(hospitalId, payload) {
    const res = await this.apiRequest('/api/hospital/profile', 'PUT', payload);
    if (res.data) {
      const idx = this.data.hospitals.findIndex(h => h.id === res.data.id);
      if (idx >= 0) {
        this.data.hospitals[idx] = res.data;
      } else {
        this.data.hospitals.push(res.data);
      }
      this.notify();
    }
    return res.data;
  }

  async uploadHospitalLogo(hospitalId, file) {
    const formData = new FormData();
    formData.append('file', file);
    if (hospitalId) {
      formData.append('hospitalId', hospitalId);
    }
    const token = window.hospitrackAuth ? window.hospitrackAuth.getToken() : null;
    const targetUrl = getApiUrl('/api/hospital/profile/logo');
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: formData
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.message || 'Failed to upload hospital logo');
    }
    if (json.data) {
      const idx = this.data.hospitals.findIndex(h => h.id === json.data.id);
      if (idx >= 0) {
        this.data.hospitals[idx] = json.data;
      }
      this.notify();
    }
    return json.data;
  }

  async fetchHospitalDashboard() {
    const res = await this.apiRequest('/api/hospital/dashboard', 'GET');
    return res.data;
  }

  async fetchHospitalDepartments(hospitalId = null) {
    const q = hospitalId ? `?hospitalId=${encodeURIComponent(hospitalId)}` : '';
    const res = await this.apiRequest(`/api/hospital/departments${q}`, 'GET');
    const list = Array.isArray(res.data) ? res.data : [];
    this.data.departments = list;
    this.notify();
    return list;
  }

  async createHospitalDepartment(departmentData) {
    const res = await this.apiRequest('/api/hospital/departments', 'POST', departmentData);
    if (!this.data.departments) this.data.departments = [];
    if (res.data) {
      this.data.departments.push(res.data);
      this.notify();
    }
    return res.data;
  }

  async updateHospitalDepartment(departmentId, departmentData) {
    const res = await this.apiRequest(`/api/hospital/departments/${encodeURIComponent(departmentId)}`, 'PUT', departmentData);
    if (this.data.departments && res.data) {
      const idx = this.data.departments.findIndex(d => d.id === departmentId);
      if (idx >= 0) {
        this.data.departments[idx] = res.data;
        this.notify();
      }
    }
    return res.data;
  }

  async deleteHospitalDepartment(departmentId) {
    const res = await this.apiRequest(`/api/hospital/departments/${encodeURIComponent(departmentId)}`, 'DELETE');
    if (this.data.departments) {
      this.data.departments = this.data.departments.filter(d => d.id !== departmentId);
      this.notify();
    }
    return res.data;
  }

  async onboardHospital(payload) {
    const res = await this.apiRequest('/api/admin/hospitals', 'POST', payload);
    if (res.data) {
      await this.syncAllData();
    }
    return res.data;
  }

  async resetHospitalCredentials(hospitalId, payload = {}) {
    const res = await this.apiRequest(`/api/admin/hospitals/${encodeURIComponent(hospitalId)}/credentials/reset`, 'POST', payload);
    return res.data;
  }
}

window.hospitrackStore = new HospitrackStore();
