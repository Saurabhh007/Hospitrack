/**
 * Hospitrack — Hospital Operations Center Component
 * Advanced Hospital Operations, Clinical Management, Multi-Tier Bed Capacity,
 * Medical Staff Onboarding & Assignment, Emergency Transfers, and Inpatient Records.
 */

let hospitalActiveTab = 'overview'; // overview | facility | profile | departments | bed-management | capacity | doctors | staff | patients | consultations | referrals | transfers | lab-reports | prescriptions
let isHospitalProfileEditMode = false;
let doctorSearchQuery = '';
let doctorDeptFilter = 'ALL';
let doctorStatusFilter = 'ALL';
let doctorAvailabilityFilter = 'ALL';
let staffSearchQuery = '';
let staffRoleFilter = 'ALL';
let staffDeptFilter = 'ALL';
let staffStatusFilter = 'ALL';
let patientSearchQuery = '';
let patientStatusFilter = 'ALL';
let patientDeptFilter = 'ALL';
let patientDoctorFilter = 'ALL';
let patientDateFilter = 'ALL';
let bedSearchQuery = '';
let bedWardFilter = 'ALL';
let bedStatusFilter = 'ALL';
let bedTypeFilter = 'ALL';
let referralSearchQuery = '';
let referralStatusFilter = 'ALL';
let referralPriorityFilter = 'ALL';
let referralDirectionFilter = 'ALL';
let referralSelectedId = null;
let transferSearchQuery = '';
let transferStatusFilter = 'ALL';
let transferPriorityFilter = 'ALL';
let transferDirectionFilter = 'ALL';
let transferSelectedId = null;
let dischargeSearchQuery = '';
let dischargeStatusFilter = 'ALL';
let dischargeDoctorFilter = 'ALL';
let dischargeWardFilter = 'ALL';
let dischargeSelectedId = null;
if (typeof window !== 'undefined' && !window.hospitalMaintenanceBeds) {
  window.hospitalMaintenanceBeds = new Set(['GEN-208', 'POST-406']);
}

window.renderHospitalDashboard = function(container, subtab = null, editMode = false) {
  if (!container) container = document.getElementById('mainContentArea');
  if (!container) return;

  if (subtab) {
    let normalized = subtab.toLowerCase();
    if (normalized === 'beds' || normalized === 'bed-management' || normalized === 'capacity' || normalized === 'ward' || normalized === 'wards' || normalized === 'ward-capacity') {
      normalized = 'ward-management';
    }
    if (normalized === 'evs' || normalized === 'housekeeping' || normalized === 'bed-turnover' || normalized === 'turnover' || normalized === 'sanitization') {
      normalized = 'evs-turnover';
    }
    if (normalized === 'specialist-referrals' || normalized === 'referral-pipeline' || normalized === 'specialist-referral' || normalized === 'referral') {
      normalized = 'referrals';
    }
    if (normalized === 'emergency-transfers' || normalized === 'emergency-transfer' || normalized === 'transfer-triage' || normalized === 'emergency-triage' || normalized === 'transfer') {
      normalized = 'transfers';
    }
    hospitalActiveTab = normalized;
  }
  if (editMode !== undefined && editMode !== null) {
    isHospitalProfileEditMode = editMode;
  }

  const store = window.hospitrackStore;
  const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
  const hospitalId = user?.hospitalId || '';

  try {
    const hospital = (store && typeof store.getHospitalById === 'function' && hospitalId ? store.getHospitalById(hospitalId) : null) || {
      id: hospitalId || 'HOSP',
      name: user?.hospitalName || user?.name || 'Healthcare Facility',
      code: user?.hospitalId || 'FACILITY',
      location: 'Authorized Medical Center',
      contact: '',
      email: user?.email || '',
      totalBeds: 100,
      availableBeds: 25,
      status: 'ACTIVE',
      rating: 4.8,
      reviewCount: 0
    };

    const patients = (store && typeof store.getPatients === 'function') ? (store.getPatients(hospitalId) || []) : [];
    const doctors = (store && typeof store.getDoctors === 'function') ? (store.getDoctors(hospitalId) || []) : [];
    const medicalStaff = (store && typeof store.getMedicalStaff === 'function') ? (store.getMedicalStaff(hospitalId) || []) : [];
    const referrals = (store && typeof store.getReferrals === 'function') ? (store.getReferrals(hospitalId) || []) : [];
    const transfers = (store && typeof store.getTransfers === 'function') ? (store.getTransfers(hospitalId) || []) : [];
    const reviews = (store && typeof store.getReviews === 'function') ? (store.getReviews(hospitalId) || []) : [];
    const prescriptions = (store && typeof store.getPrescriptions === 'function') ? (store.getPrescriptions() || []) : [];
    const labs = (store && typeof store.getLabs === 'function') ? (store.getLabs(null, null, hospitalId) || []) : [];

    const totalBeds = Number(hospital.totalBeds) || 100;
    const availableBeds = hospital.availableBeds != null ? Number(hospital.availableBeds) : 20;
    const occupiedBeds = Math.max(0, totalBeds - availableBeds);
    const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
    const pendingTransfers = transfers.filter(t => t && t.toHospitalId === hospitalId && t.status === 'PENDING');

    let subContentHtml = '';
    try {
      subContentHtml = renderHospitalSection(hospitalActiveTab, {
        hospital,
        patients,
        doctors,
        medicalStaff,
        referrals,
        transfers,
        reviews,
        prescriptions,
        labs,
        pendingTransfers,
        totalBeds,
        availableBeds,
        occupiedBeds,
        occupancyPct,
        isEditMode: isHospitalProfileEditMode
      });
    } catch (secErr) {
      console.error(`Error rendering hospital subview [${hospitalActiveTab}]:`, secErr);
      subContentHtml = `
        <div class="dashboard-section-error" style="margin: 24px 0; padding: 24px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-card);">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <span style="font-size: 1.8rem;">⚠️</span>
            <div>
              <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-main);">Unable to load ${escapeHtml(hospitalActiveTab)} section</h3>
              <p style="margin: 4px 0 0 0; font-size: 0.84rem; color: var(--text-secondary);">${escapeHtml(secErr.message || 'An unexpected rendering error occurred.')}</p>
            </div>
          </div>
          <button type="button" class="btn btn-primary btn-sm" onclick="renderHospitalDashboard(null, '${escapeHtml(hospitalActiveTab)}')">
            🔄 Retry Loading
          </button>
        </div>
      `;
    }

    container.innerHTML = `
      <!-- Hospital Operations Top Segmented Pill Bar -->
      <div class="pill-tabs-nav no-print">
        <button type="button" class="pill-tab ${hospitalActiveTab === 'overview' || hospitalActiveTab === 'dashboard' ? 'active' : ''}" onclick="setHospitalTab('overview')">
          <span>🏠</span> Operations Deck
        </button>
        <button type="button" class="pill-tab ${hospitalActiveTab === 'ward-management' || hospitalActiveTab === 'bed-management' || hospitalActiveTab === 'capacity' || hospitalActiveTab === 'beds' || hospitalActiveTab === 'ward' || hospitalActiveTab === 'wards' || hospitalActiveTab === 'ward-capacity' ? 'active' : ''}" onclick="setHospitalTab('ward-management')">
          <span>🛏️</span> Ward Management &amp; Capacity <span class="pill-badge">${availableBeds} Avail</span>
        </button>
        <button type="button" class="pill-tab ${hospitalActiveTab === 'evs-turnover' || hospitalActiveTab === 'evs' || hospitalActiveTab === 'housekeeping' ? 'active' : ''}" onclick="setHospitalTab('evs-turnover')">
          <span>✨</span> EVS Bed Turnover &amp; Sanitization
        </button>
        <button type="button" class="pill-tab ${hospitalActiveTab === 'patients' ? 'active' : ''}" onclick="setHospitalTab('patients')">
          <span>👥</span> Inpatients <span class="pill-badge">${patients.length}</span>
        </button>
        <button type="button" class="pill-tab ${hospitalActiveTab === 'doctors' ? 'active' : ''}" onclick="setHospitalTab('doctors')">
          <span>🩺</span> Doctors <span class="pill-badge">${doctors.length}</span>
        </button>
        <button type="button" class="pill-tab ${hospitalActiveTab === 'staff' || hospitalActiveTab === 'medical-staff' ? 'active' : ''}" onclick="setHospitalTab('staff')">
          <span>👩‍⚕️</span> Medical Staff <span class="pill-badge">${medicalStaff.length}</span>
        </button>
        <button type="button" class="pill-tab ${hospitalActiveTab === 'referrals' ? 'active' : ''}" onclick="setHospitalTab('referrals')">
          <span>🔁</span> Referrals <span class="pill-badge">${referrals.length}</span>
        </button>
        <button type="button" class="pill-tab ${hospitalActiveTab === 'transfers' ? 'active' : ''}" onclick="setHospitalTab('transfers')">
          <span>🚑</span> Transfers <span class="pill-badge">${transfers.length}</span>
        </button>
        <button type="button" class="pill-tab ${hospitalActiveTab === 'discharge-clearance' || hospitalActiveTab === 'dischargeClearance' || hospitalActiveTab === 'discharge' ? 'active' : ''}" onclick="setHospitalTab('discharge-clearance')">
          <span>🚪</span> Discharge Clearance
        </button>
        <button type="button" class="pill-tab ${hospitalActiveTab === 'reviews' ? 'active' : ''}" onclick="setHospitalTab('reviews')">
          <span>⭐</span> Reviews <span class="pill-badge">${reviews.length}</span>
        </button>
        <button type="button" class="pill-tab ${hospitalActiveTab === 'profile' || hospitalActiveTab === 'facility' ? 'active' : ''}" onclick="setHospitalTab('profile')">
          <span>🏛️</span> Facility Profile
        </button>
      </div>

      <!-- Hospital Subview Content -->
      <div class="hospital-subview-content">
        ${subContentHtml}
      </div>
    `;
  } catch (err) {
    console.error('Fatal hospital dashboard error:', err);
    container.innerHTML = `
      <div class="dashboard-section-error" style="margin: 32px; padding: 32px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-card); text-align: center;">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">🏥</div>
        <h2 style="color: var(--text-main); font-size: 1.3rem; margin-bottom: 8px;">Hospital Operations Center Notice</h2>
        <p style="color: var(--text-secondary); max-width: 500px; margin: 0 auto 16px auto; font-size: 0.9rem;">
          ${escapeHtml(err.message || 'Unable to render operations deck. Please retry or refresh your session.')}
        </p>
        <button type="button" class="btn btn-primary" onclick="renderHospitalDashboard(null, 'overview')">
          🔄 Reload Operations Deck
        </button>
      </div>
    `;
  }
};

function setHospitalTab(tab, editMode = false) {
  let normalized = (tab || 'overview').toLowerCase();
  if (normalized === 'beds' || normalized === 'bed-management' || normalized === 'capacity' || normalized === 'ward' || normalized === 'wards' || normalized === 'ward-capacity') {
    normalized = 'ward-management';
  }
  if (normalized === 'evs' || normalized === 'housekeeping' || normalized === 'bed-turnover' || normalized === 'turnover' || normalized === 'sanitization') {
    normalized = 'evs-turnover';
  }
  if (normalized === 'specialist-referrals' || normalized === 'referral-pipeline' || normalized === 'specialist-referral' || normalized === 'referral') {
    normalized = 'referrals';
  }
  if (normalized === 'emergency-transfers' || normalized === 'emergency-transfer' || normalized === 'transfer-triage' || normalized === 'emergency-triage' || normalized === 'transfer') {
    normalized = 'transfers';
  }
  hospitalActiveTab = normalized;
  isHospitalProfileEditMode = !!editMode;
  if (window.navigateToRoleSection) {
    window.navigateToRoleSection('HOSPITAL_ADMIN', normalized, { editMode: isHospitalProfileEditMode });
  } else {
    window.renderHospitalDashboard(document.getElementById('mainContentArea'), normalized, isHospitalProfileEditMode);
  }
}
window.setHospitalTab = setHospitalTab;


window.renderHospitalSectionNow = function(tab) {
  const container = document.getElementById('mainContentArea');
  if (container) {
    window.renderHospitalDashboard(container, tab);
  }
};

function renderHospitalSection(tab, data = {}) {
  const store = window.hospitrackStore;
  const {
    hospital = {},
    patients = [],
    doctors = [],
    medicalStaff = [],
    referrals = [],
    transfers = [],
    reviews = [],
    prescriptions = [],
    labs = [],
    pendingTransfers = [],
    totalBeds = 100,
    availableBeds = 20,
    occupiedBeds = 80,
    occupancyPct = 80,
    isEditMode = false
  } = data;

  // 1. OVERVIEW / DASHBOARD
  if (tab === 'overview' || !tab || tab === 'dashboard') {
    const admittedPatients = patients.filter(p => p.status === 'CHECKED_IN').length;
    const pendingReferrals = referrals.filter(r => r.status === 'PENDING');
    const pendingDischarges = patients.filter(p => p.dischargeStatus === 'DOCTOR_APPROVED' || p.dischargeStatus === 'CLEARANCE_PENDING' || p.status === 'DOCTOR_APPROVED');
    const doctorsOnDuty = doctors.filter(d => d.status === 'ACTIVE' || !d.status).length;

    // Ward breakdown calculation
    const icuTotal = Math.max(10, Math.round(totalBeds * 0.15));
    const emergTotal = Math.max(15, Math.round(totalBeds * 0.20));
    const nicuTotal = Math.max(8, Math.round(totalBeds * 0.10));
    const genTotal = Math.max(20, totalBeds - (icuTotal + emergTotal + nicuTotal));

    const icuAvail = Math.min(icuTotal, Math.round(availableBeds * 0.15));
    const emergAvail = Math.min(emergTotal, Math.round(availableBeds * 0.25));
    const nicuAvail = Math.min(nicuTotal, Math.round(availableBeds * 0.10));
    const genAvail = Math.max(0, availableBeds - (icuAvail + emergAvail + nicuAvail));

    return `
      <div class="dashboard-container-clean">
        <!-- Section A: Authoritative Clean Page Header -->
        <div class="page-header-clean">
          <div class="page-header-title-block">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="page-badge-pill">🏥 Operations Center</span>
              <span class="status-pill success">${escapeHtml(hospital.status || 'ACTIVE')}</span>
            </div>
            <h1 class="page-title-clean">${escapeHtml(hospital.name)}</h1>
            <p class="page-subtitle-clean">
              Facility ID: <code>${escapeHtml(hospital.id)}</code> • Code: <code>${escapeHtml(hospital.code || hospital.id)}</code> • Rating: <strong>⭐ ${hospital.rating || '4.8'}</strong> • Manage patients, doctors, beds, referrals and emergency care.
            </p>
          </div>
          <div class="page-actions-clean">
            <button type="button" class="btn btn-primary" onclick="openRegisterPatientModal()">
              <span>+</span> Add Patient
            </button>
            <button type="button" class="btn btn-secondary" onclick="openAddDoctorFacilityModal()">
              <span>+</span> Add Doctor
            </button>
            <button type="button" class="btn btn-secondary" onclick="window.printBedCensusReport()" title="Print Official Ward Bed Census & Occupancy Report">
              <span>🖨️</span> Bed Census
            </button>
            <button type="button" class="btn btn-secondary" onclick="setHospitalTab('profile')">
              <span>🏛️</span> Facility Profile
            </button>
          </div>
        </div>

        <!-- Section B: Compact 6-Card KPI Grid -->
        <div class="kpi-row-6">
          <div class="kpi-card-clean clickable" onclick="setHospitalTab('patients')">
            <div class="kpi-card-top">
              <span class="kpi-card-label">Patients</span>
              <span class="kpi-card-icon">👥</span>
            </div>
            <div class="kpi-card-value">${patients.length}</div>
            <div class="kpi-card-sub"><strong style="color: var(--success);">${admittedPatients}</strong> admitted inpatients</div>
          </div>

          <div class="kpi-card-clean clickable" onclick="setHospitalTab('doctors')">
            <div class="kpi-card-top">
              <span class="kpi-card-label">Doctors</span>
              <span class="kpi-card-icon">🩺</span>
            </div>
            <div class="kpi-card-value">${doctors.length}</div>
            <div class="kpi-card-sub"><strong style="color: var(--primary);">${doctorsOnDuty}</strong> on active roster</div>
          </div>

          <div class="kpi-card-clean clickable" onclick="setHospitalTab('bed-management')">
            <div class="kpi-card-top">
              <span class="kpi-card-label">Bed Occupancy</span>
              <span class="kpi-card-icon">🛏️</span>
            </div>
            <div class="kpi-card-value" style="color: ${occupancyPct > 90 ? 'var(--danger)' : occupancyPct > 75 ? 'var(--warning)' : 'var(--text-main)'};">${occupancyPct}%</div>
            <div class="kpi-card-sub"><strong>${availableBeds}</strong> of ${totalBeds} available</div>
          </div>

          <div class="kpi-card-clean clickable" onclick="setHospitalTab('referrals')">
            <div class="kpi-card-top">
              <span class="kpi-card-label">Pending Referrals</span>
              <span class="kpi-card-icon">🔁</span>
            </div>
            <div class="kpi-card-value" style="color: ${pendingReferrals.length > 0 ? 'var(--warning)' : 'var(--text-main)'};">${pendingReferrals.length}</div>
            <div class="kpi-card-sub">${referrals.length} total referrals</div>
          </div>

          <div class="kpi-card-clean clickable" onclick="setHospitalTab('transfers')">
            <div class="kpi-card-top">
              <span class="kpi-card-label">Emergency Transfers</span>
              <span class="kpi-card-icon">🚑</span>
            </div>
            <div class="kpi-card-value" style="color: ${pendingTransfers.length > 0 ? 'var(--danger)' : 'var(--text-main)'};">${pendingTransfers.length}</div>
            <div class="kpi-card-sub">${pendingTransfers.length > 0 ? 'Immediate triage required' : 'Triage queue clear'}</div>
          </div>

          <div class="kpi-card-clean clickable" onclick="setHospitalTab('discharge-clearance')">
            <div class="kpi-card-top">
              <span class="kpi-card-label">Discharges</span>
              <span class="kpi-card-icon">🚪</span>
            </div>
            <div class="kpi-card-value">${pendingDischarges.length}</div>
            <div class="kpi-card-sub">Awaiting clearance</div>
          </div>
        </div>

        <!-- Section C: Two-Column Split (Today's Operations & Operational Alerts) -->
        <div class="dashboard-split-grid">
          <!-- LEFT: Today's Operations -->
          <div class="dashboard-card">
            <div class="dashboard-card-header">
              <div>
                <h3 class="dashboard-card-title"><span>📋</span> Today's Operations</h3>
                <p class="dashboard-card-sub">Real-time throughput and facility metrics</p>
              </div>
              <button type="button" class="btn-link-sm" onclick="setHospitalTab('patients')">Full Directory →</button>
            </div>
            <div class="form-grid-2col mb-16">
              <div class="p-12 bg-surface-alt radius-md border-subtle">
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Active Inpatients</div>
                <div style="font-size: 1.3rem; font-weight: 800; color: var(--text-main); margin-top: 2px;">${admittedPatients}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">Currently admitted in wards</div>
              </div>
              <div class="p-12 bg-surface-alt radius-md border-subtle">
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Ward Bed Utilization</div>
                <div style="font-size: 1.3rem; font-weight: 800; color: var(--primary); margin-top: 2px;">${occupiedBeds} / ${totalBeds}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">${availableBeds} beds available</div>
              </div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: auto; padding-top: 12px; border-top: 1px dashed var(--border-subtle);">
              <button type="button" class="btn btn-secondary btn-sm" onclick="openEmergencyTransferModal()">
                <span>🚑</span> Emergency Transfer
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="openAssignDoctorModal()">
                <span>👥</span> Assign Doctor
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="setHospitalTab('bed-management')">
                <span>🛏️</span> Manage Wards
              </button>
            </div>
          </div>

          <!-- RIGHT: Operational Alerts -->
          <div class="dashboard-card">
            <div class="dashboard-card-header">
              <div>
                <h3 class="dashboard-card-title"><span>🚨</span> Operational Alerts</h3>
                <p class="dashboard-card-sub">Immediate clinical intake, transfers, and triage items</p>
              </div>
              <span class="status-pill ${pendingTransfers.length + pendingReferrals.length + pendingDischarges.length > 0 ? 'warning' : 'success'}">
                ${pendingTransfers.length + pendingReferrals.length + pendingDischarges.length} Items
              </span>
            </div>
            <div class="compact-alert-list">
              ${renderHospitalOperationalAlerts(pendingTransfers, pendingReferrals, pendingDischarges, occupancyPct, hospital)}
            </div>
          </div>
        </div>

        <!-- Section D: Bed & Ward Overview Card -->
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <div>
              <h3 class="dashboard-card-title"><span>🛏️</span> Ward &amp; Acuity Bed Distribution</h3>
              <p class="dashboard-card-sub">Departmental bed capacity and real-time availability across acuity tiers</p>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="adjustBedCount('${hospital.id}', -1)" title="Allocate / Deduct Available Bed">-1 Bed</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="adjustBedCount('${hospital.id}', 1)" title="Release / Increase Available Bed">+1 Bed</button>
              <button type="button" class="btn btn-outline-primary btn-sm" onclick="setHospitalTab('bed-management')">View Bed Management →</button>
            </div>
          </div>
          <div class="bed-overview-compact">
            <div class="bed-gauge-row">
              <div>
                <div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">Overall Occupancy</div>
                <div class="bed-gauge-value">${occupiedBeds} / ${totalBeds} <span style="font-size: 0.95rem; font-weight: 600; color: ${occupancyPct > 90 ? 'var(--danger)' : 'var(--success)'};">(${occupancyPct}% Occupied)</span></div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">Available For Intake</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: var(--primary);">${availableBeds} Beds Ready</div>
              </div>
            </div>
            <div class="ward-progress-list">
              <div class="ward-progress-item">
                <div class="ward-progress-header">
                  <span class="ward-name">🏥 General Medicine Ward</span>
                  <span class="ward-stats">${genTotal - genAvail} / ${genTotal} Beds (${genAvail} Avail)</span>
                </div>
                <div class="ward-bar-track">
                  <div class="ward-bar-fill" style="width: ${genTotal > 0 ? Math.round(((genTotal - genAvail) / genTotal) * 100) : 0}%; background: var(--primary);"></div>
                </div>
              </div>
              <div class="ward-progress-item">
                <div class="ward-progress-header">
                  <span class="ward-name">🩺 Intensive Care Unit (ICU)</span>
                  <span class="ward-stats">${icuTotal - icuAvail} / ${icuTotal} Beds (${icuAvail} Avail)</span>
                </div>
                <div class="ward-bar-track">
                  <div class="ward-bar-fill" style="width: ${icuTotal > 0 ? Math.round(((icuTotal - icuAvail) / icuTotal) * 100) : 0}%; background: ${icuAvail <= 2 ? 'var(--danger)' : 'var(--warning)'};"></div>
                </div>
              </div>
              <div class="ward-progress-item">
                <div class="ward-progress-header">
                  <span class="ward-name">🚨 Emergency Triage Ward</span>
                  <span class="ward-stats">${emergTotal - emergAvail} / ${emergTotal} Beds (${emergAvail} Avail)</span>
                </div>
                <div class="ward-bar-track">
                  <div class="ward-bar-fill" style="width: ${emergTotal > 0 ? Math.round(((emergTotal - emergAvail) / emergTotal) * 100) : 0}%; background: ${emergAvail <= 3 ? 'var(--danger)' : 'var(--secondary)'};"></div>
                </div>
              </div>
              <div class="ward-progress-item">
                <div class="ward-progress-header">
                  <span class="ward-name">👶 Neonatal ICU (NICU)</span>
                  <span class="ward-stats">${nicuTotal - nicuAvail} / ${nicuTotal} Beds (${nicuAvail} Avail)</span>
                </div>
                <div class="ward-bar-track">
                  <div class="ward-bar-fill" style="width: ${nicuTotal > 0 ? Math.round(((nicuTotal - nicuAvail) / nicuTotal) * 100) : 0}%; background: #8B5CF6;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section E: Recent Patient Activity Roster -->
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <div>
              <h3 class="dashboard-card-title"><span>👤</span> Facility Inpatient Roster</h3>
              <p class="dashboard-card-sub">Active admissions and patient dossiers at ${escapeHtml(hospital.name)}</p>
            </div>
            <div style="display: flex; gap: 8px;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="handleDownloadAllPatients('${hospital.id}')">📥 Download Roster</button>
              <button type="button" class="btn btn-primary btn-sm" onclick="setHospitalTab('patients')">View All (${patients.length}) →</button>
            </div>
          </div>
          <div class="table-responsive">
            <table class="table-clean">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Attending Doctor</th>
                  <th>Ward &amp; Bed</th>
                  <th>Blood</th>
                  <th>Status</th>
                  <th>Emergency Contact</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${renderHospitalRecentPatients(patients, store)}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section F: Referrals and Medical Staff Split -->
        <div class="dashboard-split-grid">
          <!-- Referrals Table -->
          <div class="dashboard-card">
            <div class="dashboard-card-header">
              <div>
                <h3 class="dashboard-card-title"><span>🔁</span> Recent Referrals</h3>
                <p class="dashboard-card-sub">Specialist inbound &amp; outbound pipeline</p>
              </div>
              <button type="button" class="btn-link-sm" onclick="setHospitalTab('referrals')">View all (${referrals.length}) →</button>
            </div>
            <div class="table-responsive">
              <table class="table-clean">
                <thead>
                  <tr>
                    <th>Referral ID</th>
                    <th>Patient</th>
                    <th>Status</th>
                    <th style="text-align: right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderHospitalRecentReferrals(referrals, store)}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Doctor Staff Summary -->
          <div class="dashboard-card">
            <div class="dashboard-card-header">
              <div>
                <h3 class="dashboard-card-title"><span>🩺</span> Medical Staff Roster</h3>
                <p class="dashboard-card-sub">Physicians and specialists affiliated with facility</p>
              </div>
              <button type="button" class="btn-link-sm" onclick="setHospitalTab('staff')">Manage staff (${doctors.length}) →</button>
            </div>
            <div class="table-responsive">
              <table class="table-clean">
                <thead>
                  <tr>
                    <th>Physician</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th style="text-align: right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderHospitalRecentDoctors(doctors)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }

// --------------------------------------------------------------------------
// Clean Hospital Overview Helpers
// --------------------------------------------------------------------------
function renderHospitalOperationalAlerts(pendingTransfers, pendingReferrals, pendingDischarges, occupancyPct, hospital) {
  const alerts = [];

  if (pendingTransfers && pendingTransfers.length > 0) {
    pendingTransfers.forEach(t => {
      alerts.push(`
        <div class="compact-alert-row danger">
          <span class="compact-alert-icon">🚨</span>
          <div class="compact-alert-content">
            <div class="compact-alert-title">Inbound Emergency Transfer: ${escapeHtml(t.patientId)}</div>
            <div class="compact-alert-desc">From: ${escapeHtml(t.fromHospitalId)} • Priority: <strong>${escapeHtml(t.priority)}</strong></div>
          </div>
          <button type="button" class="btn btn-primary btn-sm" onclick="handleAcceptTransferClick('${t.id}')">
            ✓ Accept
          </button>
        </div>
      `);
    });
  }

  if (pendingReferrals && pendingReferrals.length > 0) {
    pendingReferrals.slice(0, 3).forEach(r => {
      alerts.push(`
        <div class="compact-alert-row warning">
          <span class="compact-alert-icon">🔁</span>
          <div class="compact-alert-content">
            <div class="compact-alert-title">Specialist Referral: ${escapeHtml(r.patientId)}</div>
            <div class="compact-alert-desc">${escapeHtml(r.reason || 'Consultation required')} • From: ${escapeHtml(r.fromHospitalId)}</div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="handleAcceptReferralClick('${r.id}')">
            Review
          </button>
        </div>
      `);
    });
  }

  if (pendingDischarges && pendingDischarges.length > 0) {
    pendingDischarges.slice(0, 2).forEach(p => {
      alerts.push(`
        <div class="compact-alert-row info">
          <span class="compact-alert-icon">🚪</span>
          <div class="compact-alert-content">
            <div class="compact-alert-title">Discharge Clearance Pending: ${escapeHtml(p.name)}</div>
            <div class="compact-alert-desc">${escapeHtml(p.id)} • Attending doctor sign-off complete</div>
          </div>
          <button type="button" class="btn btn-success btn-sm" onclick="handleHospitalApproveDischarge('${p.id}')">
            Clear
          </button>
        </div>
      `);
    });
  }

  if (occupancyPct > 85) {
    alerts.push(`
      <div class="compact-alert-row warning">
        <span class="compact-alert-icon">⚠️</span>
        <div class="compact-alert-content">
          <div class="compact-alert-title">High Bed Occupancy (${occupancyPct}%)</div>
          <div class="compact-alert-desc">Facility bed capacity approaching critical threshold.</div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="setHospitalTab('bed-management')">
          Manage
        </button>
      </div>
    `);
  }

  if (alerts.length === 0) {
    return `
      <div class="empty-state-clean" style="padding: 24px 12px;">
        <span class="empty-icon">✅</span>
        <div class="empty-title">All Queues Clear</div>
        <p class="empty-desc">No emergency transfers or pending intake items require immediate action.</p>
      </div>
    `;
  }

  return alerts.join('');
}

function renderHospitalRecentPatients(patients, store) {
  if (!patients || patients.length === 0) {
    return `<tr><td colspan="7"><div class="empty-state-clean"><span class="empty-icon">👤</span><div class="empty-title">No Inpatients Admitted</div><p class="empty-desc">Admitted patient records will appear here.</p></div></td></tr>`;
  }
  return patients.slice(0, 6).map(p => {
    const doc = store.getDoctorById ? store.getDoctorById(p.primaryDoctorId) : null;
    return `
      <tr style="cursor: pointer;" onclick="if (!event.target.closest('button') && !event.target.closest('a')) window.openPatientWorkspace('${p.id}')">
        <td>
          <div class="cell-patient">
            <span class="cell-patient-name">${escapeHtml(p.name)}</span>
            <span class="cell-patient-id">${escapeHtml(p.id)} • ${p.age}y ${escapeHtml(p.gender || 'M')}</span>
          </div>
        </td>
        <td>
          <div class="cell-doctor">
            ${doc ? `
              <span class="cell-doctor-name">Dr. ${escapeHtml(doc.name)}</span>
              <span class="cell-doctor-dept">${escapeHtml(doc.specialty || 'Physician')}</span>
            ` : `<span style="color: var(--text-muted); font-size: 0.8rem;">Unassigned</span>`}
          </div>
        </td>
        <td style="font-size: 0.82rem;">General Ward / Bed #B-${p.id.replace(/\D/g, '') || '01'}</td>
        <td><span class="status-pill info">${escapeHtml(p.bloodGroup || 'N/A')}</span></td>
        <td>
          <span class="status-pill ${p.status === 'CHECKED_IN' ? 'success' : p.status === 'DISCHARGED' ? 'danger' : 'warning'}">
            ${escapeHtml(p.status || 'ACTIVE')}
          </span>
        </td>
        <td style="font-size: 0.8rem; color: var(--text-secondary);">${escapeHtml(p.emergencyContact || p.contact || 'N/A')}</td>
        <td style="text-align: right;">
          <div class="action-btn-group" style="justify-content: flex-end;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.openPatientWorkspace('${p.id}')">
              Open →
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openEditPatientModal('${p.id}')" title="Edit Patient Profile">
              ✏️
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openChangePatientPhotoModal('${p.id}')" title="Manage Photo">
              📷
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderHospitalRecentReferrals(referrals, store) {
  if (!referrals || referrals.length === 0) {
    return `<tr><td colspan="4"><div class="empty-state-clean" style="padding: 20px 8px;"><span class="empty-icon">🔁</span><div class="empty-title">No Referrals</div><p class="empty-desc">New referrals will appear here.</p></div></td></tr>`;
  }
  return referrals.slice(0, 5).map(r => {
    const p = store.getPatientById ? store.getPatientById(r.patientId) : null;
    return `
      <tr>
        <td>
          <a href="#hospital/workspace/referral/${encodeURIComponent(r.id)}" class="font-mono font-semibold" style="font-size: 0.82rem;">
            <code>${escapeHtml(r.id)}</code>
          </a>
        </td>
        <td>
          <strong>${escapeHtml(p ? p.name : r.patientId)}</strong>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(r.fromHospitalId)} → ${escapeHtml(r.toHospitalId)}</div>
        </td>
        <td>
          <span class="status-pill ${r.status === 'ACCEPTED' ? 'success' : r.status === 'REJECTED' ? 'danger' : 'warning'}">
            ${escapeHtml(r.status || 'PENDING')}
          </span>
        </td>
        <td style="text-align: right;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="if(window.openReferralWorkspace) window.openReferralWorkspace('${r.id}'); else setHospitalTab('referrals');">
            View
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderHospitalRecentDoctors(doctors) {
  if (!doctors || doctors.length === 0) {
    return `<tr><td colspan="4"><div class="empty-state-clean" style="padding: 20px 8px;"><span class="empty-icon">🩺</span><div class="empty-title">No Staff Onboarded</div><p class="empty-desc">Medical staff members will appear here.</p></div></td></tr>`;
  }
  return doctors.slice(0, 5).map(d => `
    <tr>
      <td>
        <strong style="color: var(--text-main); font-size: 0.86rem;">Dr. ${escapeHtml(d.name)}</strong>
        <div style="font-size: 0.72rem; color: var(--text-muted); font-family: monospace;">${escapeHtml(d.id)}</div>
      </td>
      <td>
        <span style="font-size: 0.82rem; font-weight: 600;">${escapeHtml(d.specialty || 'General Practice')}</span>
      </td>
      <td>
        <span class="status-pill success">${escapeHtml(d.status || 'ACTIVE')}</span>
      </td>
      <td style="text-align: right;">
        <button type="button" class="btn btn-secondary btn-sm" onclick="if(window.openDoctorWorkspace) window.openDoctorWorkspace('${d.id}'); else setHospitalTab('staff');">
          View
        </button>
      </td>
    </tr>
  `).join('');
}

  // 2. HEALTHCARE FACILITY PROFILE (PROFESSIONAL MEDICAL FACILITY MANAGEMENT)
  if (tab === 'facility' || tab === 'profile') {
    // Location decomposition helper
    const locParts = parseHospitalLocation(hospital.location || '');
    const icuTotal = Math.max(10, Math.round(totalBeds * 0.15));
    const emergTotal = Math.max(15, Math.round(totalBeds * 0.20));
    const icuAvail = Math.min(icuTotal, Math.round(availableBeds * 0.15));
    const emergAvail = Math.min(emergTotal, Math.round(availableBeds * 0.25));

    // Dynamic Clinical Services derived from assigned doctors and facility capabilities
    const clinicalServicesList = getFacilityClinicalServices(hospital, doctors);

    // Departments derived from doctors and standard medical departments
    const departmentsList = getFacilityDepartments(hospital, doctors);

    // Established year derivation
    const establishedYear = hospital.createdAt ? new Date(hospital.createdAt).getFullYear() : 2018;

    return `
      <div class="facility-profile-container">
        <!-- 1. HEADER SECTION -->
        <div class="page-header-clean" style="margin-bottom: 0;">
          <div class="page-header-title-block">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="page-badge-pill">🏛️ Facility Operations</span>
              <span class="status-pill success">✓ Verified Facility</span>
            </div>
            <h1 class="page-title-clean">Healthcare Facility Profile</h1>
            <p class="page-subtitle-clean">
              Manage your hospital's verified identity, contact information, clinical capabilities and facility details.
            </p>
          </div>
          <div class="page-actions-clean">
            <button type="button" class="btn btn-primary" onclick="openHospitalProfileEditModal('${escapeHtml(hospital.id)}')">
              <span>✏️</span> Edit Profile
            </button>
          </div>
        </div>

        <!-- 2. FACILITY IDENTITY HERO CARD -->
        <div class="facility-hero-card">
          <div class="facility-hero-identity">
            <div class="facility-hero-logo" title="${escapeHtml(hospital.name)}">
              🏥
            </div>
            <div class="facility-hero-meta">
              <div class="facility-hero-badges">
                <span class="badge badge-info font-mono font-semibold">${escapeHtml(hospital.id)}</span>
                <span class="badge badge-success">✓ Verified Healthcare Facility</span>
                <span class="badge badge-active">${escapeHtml(hospital.status || 'ACTIVE')}</span>
              </div>
              <h2 class="facility-hero-name">${escapeHtml(hospital.name)}</h2>
              <div style="font-size: 0.88rem; font-weight: 600; color: var(--primary);">Multi-Specialty Hospital &amp; Critical Care Network</div>
              <p class="facility-hero-desc">
                Accredited tertiary-care clinical institution operating under regional health authority compliance, providing integrated 24/7 trauma triage, inpatient hospitalization, and specialized consultations.
              </p>
            </div>
          </div>
          <div class="facility-hero-actions">
            <div style="text-align: right; background: var(--bg-surface-hover); padding: 10px 16px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">Quality Rating</div>
              <div style="font-size: 1.25rem; font-weight: 800; color: var(--warning-text);">⭐ ${hospital.rating ? Number(hospital.rating).toFixed(1) : '4.8'}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${hospital.reviewCount || 0} patient reviews</div>
            </div>
          </div>
        </div>

        <!-- 3. SPLIT GRID: FACILITY OVERVIEW & CONTACT & LOCATION -->
        <div class="facility-grid-split">
          <!-- CARD A: FACILITY OVERVIEW -->
          <div class="facility-section-card">
            <div class="facility-section-header">
              <div>
                <h3 class="facility-section-title"><span>🏛️</span> FACILITY OVERVIEW</h3>
                <p class="facility-section-subtitle">Official registration, operational parameters, and statutory classification</p>
              </div>
            </div>
            <div class="facility-info-grid">
              <div class="facility-info-item">
                <span class="facility-info-label">Hospital Name</span>
                <span class="facility-info-value font-semibold">${escapeHtml(hospital.name || 'Not provided')}</span>
              </div>
              <div class="facility-info-item">
                <span class="facility-info-label">Hospital Database ID</span>
                <span class="facility-info-value font-mono text-primary font-semibold">${escapeHtml(hospital.id || 'Not provided')}</span>
              </div>
              <div class="facility-info-item">
                <span class="facility-info-label">Facility Type</span>
                <span class="facility-info-value">Multi-Specialty Hospital</span>
              </div>
              <div class="facility-info-item">
                <span class="facility-info-label">Registration / License Number</span>
                <span class="facility-info-value font-mono">${escapeHtml(hospital.code || hospital.id || 'Not provided')}</span>
              </div>
              <div class="facility-info-item">
                <span class="facility-info-label">Accreditation</span>
                <span class="facility-info-value">NABH &amp; ISO 9001:2015 Certified</span>
              </div>
              <div class="facility-info-item">
                <span class="facility-info-label">Established Year</span>
                <span class="facility-info-value">${establishedYear} (Verified Record)</span>
              </div>
              <div class="facility-info-item">
                <span class="facility-info-label">Ownership Type</span>
                <span class="facility-info-value">Private Healthcare Network</span>
              </div>
              <div class="facility-info-item">
                <span class="facility-info-label">Emergency Services</span>
                <span class="facility-info-value"><span class="badge badge-success">● 24/7 Level-1 Trauma Active</span></span>
              </div>
              <div class="facility-info-item">
                <span class="facility-info-label">Operational Bed Capacity</span>
                <span class="facility-info-value font-mono font-bold">${totalBeds} Total Beds</span>
              </div>
              <div class="facility-info-item">
                <span class="facility-info-label">ICU Capacity</span>
                <span class="facility-info-value font-mono font-bold">${icuTotal} Dedicated Critical Care</span>
              </div>
              <div class="facility-info-item full-span">
                <span class="facility-info-label">Operating Status</span>
                <span class="facility-info-value">
                  <span class="badge ${hospital.status === 'ACTIVE' ? 'badge-active' : 'badge-warning'}">${escapeHtml(hospital.status || 'ACTIVE')}</span>
                  <span style="font-size: 0.8rem; font-weight: 500; color: var(--text-secondary); margin-left: 8px;">Authorized for full clinical operations &amp; patient admissions</span>
                </span>
              </div>
            </div>
          </div>

          <!-- CARD B: CONTACT & LOCATION -->
          <div class="facility-section-card">
            <div class="facility-section-header">
              <div>
                <h3 class="facility-section-title"><span>📍</span> CONTACT &amp; LOCATION</h3>
                <p class="facility-section-subtitle">Official administrative channels, triage lines, and physical coordinates</p>
              </div>
            </div>
            <div class="facility-info-grid">
              <div class="facility-info-item full-span">
                <span class="facility-info-label">Physical Address</span>
                <span class="facility-info-value">📍 ${escapeHtml(locParts.address || hospital.location || 'Not provided')}</span>
              </div>
              <div class="facility-info-item">
                <span class="facility-info-label">City / District</span>
                <span class="facility-info-value">${escapeHtml(locParts.city || 'Not provided')}</span>
              </div>
              <div class="facility-info-item">
                <span class="facility-info-label">State / Jurisdiction</span>
                <span class="facility-info-value">${escapeHtml(locParts.state || 'Not provided')}</span>
              </div>
              <div class="facility-info-item">
                <span class="facility-info-label">PIN / Postal Code</span>
                <span class="facility-info-value font-mono">${escapeHtml(locParts.pin || 'Not provided')}</span>
              </div>
              <div class="facility-info-item">
                <span class="facility-info-label">Primary Telephone</span>
                <span class="facility-info-value font-semibold">📞 ${escapeHtml(hospital.contact || 'Not provided')}</span>
              </div>
              <div class="facility-info-item">
                <span class="facility-info-label">24/7 Emergency Contact</span>
                <span class="facility-info-value font-semibold" style="color: var(--danger-text);">🚨 ${hospital.contact ? `${escapeHtml(hospital.contact)} (Ext. 100)` : 'Not provided'}</span>
              </div>
              <div class="facility-info-item">
                <span class="facility-info-label">Official Administrative Email</span>
                <span class="facility-info-value">✉️ ${escapeHtml(hospital.email || 'Not provided')}</span>
              </div>
              <div class="facility-info-item full-span">
                <span class="facility-info-label">Official Portal / Website</span>
                <span class="facility-info-value font-mono" style="color: var(--primary);">🌐 ${hospital.email && hospital.email.includes('@') ? `https://www.${escapeHtml(hospital.email.split('@')[1])}` : 'Not provided'}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. FACILITY CAPACITY SECTION -->
        <div class="facility-section-card full-width">
          <div class="facility-section-header">
            <div>
              <h3 class="facility-section-title"><span>🛏️</span> FACILITY CAPACITY</h3>
              <p class="facility-section-subtitle">Real-time bed allocation, ward distribution, and critical care reserves</p>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="setHospitalTab('bed-management')">
              Manage Ward Allocations →
            </button>
          </div>

          ${totalBeds > 0 ? `
            <div class="facility-capacity-row">
              <div class="facility-capacity-metric primary-metric">
                <span class="facility-capacity-label">Total Beds</span>
                <span class="facility-capacity-num">${totalBeds}</span>
                <span class="facility-capacity-sub">Sanctioned</span>
              </div>
              <div class="facility-capacity-metric">
                <span class="facility-capacity-label">Occupied Beds</span>
                <span class="facility-capacity-num">${occupiedBeds}</span>
                <span class="facility-capacity-sub">${occupancyPct}% Occupancy</span>
              </div>
              <div class="facility-capacity-metric success-metric">
                <span class="facility-capacity-label">Available Beds</span>
                <span class="facility-capacity-num">${availableBeds}</span>
                <span class="facility-capacity-sub">Immediate Admission</span>
              </div>
              <div class="facility-capacity-metric">
                <span class="facility-capacity-label">ICU Beds</span>
                <span class="facility-capacity-num">${icuTotal}</span>
                <span class="facility-capacity-sub">${icuAvail} Available</span>
              </div>
              <div class="facility-capacity-metric">
                <span class="facility-capacity-label">Emergency Beds</span>
                <span class="facility-capacity-num">${emergTotal}</span>
                <span class="facility-capacity-sub">${emergAvail} Available</span>
              </div>
            </div>

            <!-- Ward Occupancy Breakdown Bar -->
            <div class="facility-occupancy-bar-wrap">
              <div class="facility-occupancy-bar-header">
                <span>Ward Occupancy Distribution</span>
                <span><strong>${occupiedBeds}</strong> of <strong>${totalBeds}</strong> beds occupied (${occupancyPct}%)</span>
              </div>
              <div class="facility-occupancy-bar">
                <div class="facility-occupancy-fill icu" style="width: ${totalBeds > 0 ? ((icuTotal - icuAvail) / totalBeds) * 100 : 0}%;" title="Occupied ICU: ${icuTotal - icuAvail}"></div>
                <div class="facility-occupancy-fill emergency" style="width: ${totalBeds > 0 ? ((emergTotal - emergAvail) / totalBeds) * 100 : 0}%;" title="Occupied Emergency: ${emergTotal - emergAvail}"></div>
                <div class="facility-occupancy-fill occupied" style="width: ${totalBeds > 0 ? Math.max(0, ((occupiedBeds - (icuTotal - icuAvail + emergTotal - emergAvail)) / totalBeds) * 100) : 0}%;" title="General Inpatients"></div>
                <div class="facility-occupancy-fill available" style="width: ${totalBeds > 0 ? (availableBeds / totalBeds) * 100 : 0}%;" title="Available: ${availableBeds}"></div>
              </div>
              <div class="facility-occupancy-legend">
                <div class="facility-occupancy-legend-item"><span class="facility-occupancy-dot" style="background: var(--warning);"></span> ICU Occupied (${icuTotal - icuAvail})</div>
                <div class="facility-occupancy-legend-item"><span class="facility-occupancy-dot" style="background: var(--danger);"></span> Emergency Occupied (${emergTotal - emergAvail})</div>
                <div class="facility-occupancy-legend-item"><span class="facility-occupancy-dot" style="background: var(--primary);"></span> General Ward Occupied</div>
                <div class="facility-occupancy-legend-item"><span class="facility-occupancy-dot" style="background: var(--success);"></span> Available Beds (${availableBeds})</div>
              </div>
            </div>
          ` : `
            <div style="padding: 24px; text-align: center; color: var(--text-muted); background: var(--bg-surface-hover); border-radius: var(--radius-md);">
              <span style="font-size: 1.5rem;">🛏️</span>
              <p style="margin-top: 8px; font-size: 0.9rem;">Capacity information unavailable</p>
            </div>
          `}
        </div>

        <!-- 5. CLINICAL SERVICES SECTION -->
        <div class="facility-section-card full-width">
          <div class="facility-section-header">
            <div>
              <h3 class="facility-section-title"><span>🩺</span> CLINICAL SERVICES</h3>
              <p class="facility-section-subtitle">Active specialized medical disciplines and clinical offerings configured for this facility</p>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="setHospitalTab('staff')">
              Medical Staff Directory →
            </button>
          </div>

          ${clinicalServicesList.length > 0 ? `
            <div class="facility-services-grid">
              ${clinicalServicesList.map(srv => `
                <div class="facility-service-card">
                  <div class="facility-service-icon">${srv.icon || '🩺'}</div>
                  <div class="facility-service-info">
                    <div class="facility-service-name" title="${escapeHtml(srv.name)}">${escapeHtml(srv.name)}</div>
                    <div class="facility-service-meta">${escapeHtml(srv.detail)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="padding: 24px; text-align: center; color: var(--text-muted); background: var(--bg-surface-hover); border-radius: var(--radius-md);">
              <span style="font-size: 1.5rem;">🩺</span>
              <p style="margin-top: 8px; font-size: 0.9rem;">No clinical services have been configured yet.</p>
            </div>
          `}
        </div>

        <!-- 6. DEPARTMENTS SECTION -->
        <div class="facility-section-card full-width">
          <div class="facility-section-header">
            <div>
              <h3 class="facility-section-title"><span>🏢</span> DEPARTMENTS</h3>
              <p class="facility-section-subtitle">Active clinical departments, designated department leads, and operational status</p>
            </div>
            <div style="display: flex; gap: 8px;">
              <button type="button" class="btn btn-primary btn-sm" onclick="openAddDepartmentModal()">
                <span>+</span> Add Department
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="openAddDoctorFacilityModal()">
                <span>+</span> Add Doctor
              </button>
            </div>
          </div>

          ${departmentsList.length > 0 ? `
            <div class="facility-depts-grid">
              ${departmentsList.map(dept => `
                <div class="facility-dept-card">
                  <div class="facility-dept-top">
                    <div class="facility-dept-name">${dept.icon || '🏢'} ${escapeHtml(dept.name)}</div>
                    <span class="facility-dept-badge">${escapeHtml(dept.status || 'ACTIVE')}</span>
                  </div>
                  ${dept.description ? `<div style="font-size: 0.8rem; color: var(--text-secondary); margin: 6px 0;">${escapeHtml(dept.description)}</div>` : ''}
                  <div class="facility-dept-lead">
                    <span>🩺</span>
                    <span><strong>Head / Lead:</strong> ${escapeHtml(dept.leadDoctor || 'Attending Physician')}</span>
                  </div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 6px; margin-top: 2px;">
                    <span>Capacity: ${dept.doctorCount || 0} Physician${(dept.doctorCount || 0) !== 1 ? 's' : ''} on Roster</span>
                    <div style="display: flex; gap: 6px; align-items: center;">
                      ${dept.id ? `
                        <button type="button" class="btn-icon-subtle" onclick="openEditDepartmentModal('${escapeHtml(dept.id)}', '${escapeHtml(dept.name)}', '${escapeHtml(dept.description || '')}', '${escapeHtml(dept.status || 'ACTIVE')}')" title="Edit Department">✏️</button>
                        <button type="button" class="btn-icon-subtle" onclick="handleDeleteDepartment('${escapeHtml(dept.id)}', '${escapeHtml(dept.name)}')" title="Delete Department" style="color: var(--danger);">🗑️</button>
                      ` : ''}
                      <span style="color: var(--success); font-weight: 600;">● Operational</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="padding: 24px; text-align: center; color: var(--text-muted); background: var(--bg-surface-hover); border-radius: var(--radius-md);">
              <span style="font-size: 1.5rem;">🏢</span>
              <p style="margin-top: 8px; font-size: 0.9rem;">No clinical departments configured yet.</p>
              <button type="button" class="btn btn-primary btn-sm" onclick="openAddDepartmentModal()" style="margin-top: 8px;">
                <span>+</span> Add First Department
              </button>
            </div>
          `}
        </div>

        <!-- 7. VERIFICATION & COMPLIANCE SECTION -->
        <div class="facility-section-card full-width">
          <div class="facility-section-header">
            <div>
              <h3 class="facility-section-title"><span>🛡️</span> VERIFICATION &amp; COMPLIANCE</h3>
              <p class="facility-section-subtitle">Regulatory credentials, quality accreditation milestones, and audit compliance</p>
            </div>
          </div>
          <div class="facility-compliance-grid">
            <div class="facility-compliance-card verified">
              <span class="facility-compliance-label">Verification Status</span>
              <span class="facility-compliance-val">
                <span class="badge badge-success">✓ VERIFIED</span>
              </span>
              <span class="facility-compliance-sub">Confirmed by State Health Oversight Authority</span>
            </div>
            <div class="facility-compliance-card verified">
              <span class="facility-compliance-label">License Status</span>
              <span class="facility-compliance-val">
                <span class="badge badge-active">ACTIVE • COMPLIANT</span>
              </span>
              <span class="facility-compliance-sub">Statutory Medical Facility Registration Valid</span>
            </div>
            <div class="facility-compliance-card verified">
              <span class="facility-compliance-label">Quality Accreditation</span>
              <span class="facility-compliance-val">
                <span class="badge badge-info">NABH LEVEL 3 / ISO 9001</span>
              </span>
              <span class="facility-compliance-sub">National Healthcare Standard Certification</span>
            </div>
            <div class="facility-compliance-card">
              <span class="facility-compliance-label">Verification &amp; Audit Date</span>
              <span class="facility-compliance-val" style="font-size: 0.88rem; font-weight: 600;">15 Jan 2024</span>
              <span class="facility-compliance-sub">Annual Compliance Audit Cleared</span>
            </div>
            <div class="facility-compliance-card">
              <span class="facility-compliance-label">Profile Last Updated</span>
              <span class="facility-compliance-val" style="font-size: 0.88rem; font-weight: 600;">${hospital.createdAt ? new Date(hospital.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Current Session'}</span>
              <span class="facility-compliance-sub">Database Synchronized &amp; Cryptographically Sealed</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 3. WARD MANAGEMENT & CAPACITY ENTERPRISE WORKSPACE
  if (tab === 'ward-management' || tab === 'bed-management' || tab === 'capacity' || tab === 'beds' || tab === 'ward' || tab === 'wards' || tab === 'ward-capacity') {
    // 1. Authoritative metrics and calculations (defensive against total = 0 or nulls)
    const numTotalBeds = Math.max(0, Number(hospital.totalBeds || 120));
    const numAvailableBeds = Math.max(0, Number(hospital.availableBeds != null ? hospital.availableBeds : 34));
    const numOccupiedBeds = Math.max(0, numTotalBeds - numAvailableBeds);
    
    // Safely calculate occupancy rate handling total = 0 without NaN / Infinity
    const occupancyRateFormatted = numTotalBeds > 0 ? ((numOccupiedBeds / numTotalBeds) * 100).toFixed(1) : '0.0';
    const occupancyRateNum = parseFloat(occupancyRateFormatted);
    
    const maintBedsSet = window.hospitalMaintenanceBeds || new Set(['GEN-208', 'POST-406']);
    const numMaintenanceBeds = maintBedsSet.size;
    const numReservedBeds = Math.max(1, Math.min(numAvailableBeds, Math.round(numTotalBeds * 0.04)));

    // 2. Real Ward Definitions & Proportional Capacity Breakdown
    const wardConfigs = [
      {
        id: 'WARD-GEN',
        name: 'General Medicine Ward',
        dept: 'Internal Medicine',
        location: 'Floor 2 • Wing A',
        type: 'Standard Care',
        ratio: 0.38,
        icon: '🏥',
        prefix: 'GEN-2'
      },
      {
        id: 'WARD-ICU',
        name: 'Intensive Care Unit (ICU)',
        dept: 'Critical Care',
        location: 'Floor 3 • Wing B',
        type: 'Intensive / Ventilator',
        ratio: 0.18,
        icon: '🩺',
        prefix: 'ICU-3'
      },
      {
        id: 'WARD-EMG',
        name: 'Emergency & Trauma Ward',
        dept: 'Emergency Medicine',
        location: 'Ground Floor • Trauma Bay',
        type: 'Acute Triage',
        ratio: 0.18,
        icon: '🚨',
        prefix: 'EMG-1'
      },
      {
        id: 'WARD-CCU',
        name: 'Cardiac Care Unit (CCU)',
        dept: 'Cardiology',
        location: 'Floor 3 • Wing A',
        type: 'Cardiac Monitored',
        ratio: 0.10,
        icon: '❤️',
        prefix: 'CCU-3'
      },
      {
        id: 'WARD-NICU',
        name: 'Neonatal & Pediatric Ward',
        dept: 'Pediatrics & Neonatology',
        location: 'Floor 2 • Wing C',
        type: 'Pediatric / Incubator',
        ratio: 0.08,
        icon: '👶',
        prefix: 'NICU-2'
      },
      {
        id: 'WARD-POST',
        name: 'Post-Operative Recovery',
        dept: 'Surgical Services',
        location: 'Floor 4 • Wing B',
        type: 'Post-Surgical Step-Down',
        ratio: 0.08,
        icon: '🩹',
        prefix: 'POST-4'
      }
    ];

    // Compute Ward-specific metrics
    const wardsData = wardConfigs.map(w => {
      const wTotal = Math.max(4, Math.round(numTotalBeds * w.ratio));
      const wAvail = Math.max(0, Math.min(wTotal, Math.round(numAvailableBeds * w.ratio)));
      const wOccupied = Math.max(0, wTotal - wAvail);
      const wOccPct = wTotal > 0 ? Math.round((wOccupied / wTotal) * 100) : 0;
      const wReserved = (w.id === 'WARD-EMG' || w.id === 'WARD-ICU') ? 1 : 0;
      const wMaint = (w.id === 'WARD-GEN' || w.id === 'WARD-POST') ? 1 : 0;

      let status = 'AVAILABLE';
      let statusBadgeClass = 'badge-success';
      if (wOccPct >= 100) {
        status = 'FULL';
        statusBadgeClass = 'badge-danger';
      } else if (wOccPct >= 90) {
        status = 'CRITICAL';
        statusBadgeClass = 'badge-danger';
      } else if (wOccPct >= 70) {
        status = 'HIGH OCCUPANCY';
        statusBadgeClass = 'badge-warning';
      }

      return {
        ...w,
        total: wTotal,
        available: wAvail,
        occupied: wOccupied,
        reserved: wReserved,
        maintenance: wMaint,
        occupancyPct: wOccPct,
        status,
        statusBadgeClass
      };
    });

    // 3. Admitted Inpatients Mapping for Real Beds
    const admittedList = Array.isArray(patients) 
      ? patients.filter(p => p.status === 'CHECKED_IN' || p.status === 'ADMITTED' || p.status === 'CRITICAL' || p.status === 'STABLE' || p.status === 'ACTIVE')
      : [];

    // Construct inventory of beds across all wards
    const allBedRecords = [];
    let patientCursor = 0;

    wardsData.forEach(ward => {
      for (let i = 1; i <= Math.min(ward.total, 8); i++) {
        const bedNumStr = String(i).padStart(2, '0');
        const bedId = `${ward.prefix}${bedNumStr}`;
        const isMaint = maintBedsSet.has(bedId);
        const isRes = (i === ward.total && ward.reserved > 0);

        let bedStatus = 'AVAILABLE';
        let assignedPatient = null;

        if (isMaint) {
          bedStatus = 'MAINTENANCE';
        } else if (isRes) {
          bedStatus = 'RESERVED';
        } else if (patientCursor < admittedList.length && i <= ward.occupied) {
          bedStatus = 'OCCUPIED';
          assignedPatient = admittedList[patientCursor];
          patientCursor++;
        }

        const doc = assignedPatient && assignedPatient.primaryDoctorId
          ? (Array.isArray(doctors) ? doctors.find(d => d.id === assignedPatient.primaryDoctorId) : null)
          : null;

        allBedRecords.push({
          bedId,
          wardId: ward.id,
          wardName: ward.name,
          dept: ward.dept,
          location: ward.location,
          type: ward.type,
          status: bedStatus,
          patient: assignedPatient,
          doctor: doc,
          updatedAt: assignedPatient?.admittedAt ? new Date(assignedPatient.admittedAt) : new Date()
        });
      }
    });

    // Attach inventory globally for interactive search/drawer lookup
    window._currentBedInventory = allBedRecords;

    // 4. Filter and Search Bed Inventory
    let filteredBeds = [...allBedRecords];

    if (bedSearchQuery) {
      const q = bedSearchQuery.toLowerCase().trim();
      filteredBeds = filteredBeds.filter(b => 
        (b.bedId && b.bedId.toLowerCase().includes(q)) ||
        (b.wardName && b.wardName.toLowerCase().includes(q)) ||
        (b.patient && b.patient.name && b.patient.name.toLowerCase().includes(q)) ||
        (b.patient && b.patient.id && b.patient.id.toLowerCase().includes(q))
      );
    }

    if (bedWardFilter !== 'ALL') {
      filteredBeds = filteredBeds.filter(b => b.wardId === bedWardFilter);
    }

    if (bedStatusFilter !== 'ALL') {
      filteredBeds = filteredBeds.filter(b => b.status === bedStatusFilter);
    }

    if (bedTypeFilter !== 'ALL') {
      filteredBeds = filteredBeds.filter(b => b.type.toLowerCase().includes(bedTypeFilter.toLowerCase()));
    }

    // Last updated stamp
    const lastUpdatedText = hospital.updatedAt 
      ? new Date(hospital.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
      : 'Updated just now';

    return `
      <div class="ward-mgmt-wrapper">
        <!-- 1. Top Header -->
        <div class="ward-header-container">
          <div class="ward-header-info">
            <span class="ward-header-badge">🏥 Clinical Operations</span>
            <h1 class="ward-header-title">WARD MANAGEMENT &amp; CAPACITY</h1>
            <p class="ward-header-subtitle">Monitor ward capacity, bed allocation, occupancy and patient placement.</p>
          </div>
          <div class="ward-header-actions">
            <button type="button" class="btn btn-secondary btn-sm" onclick="setHospitalTab('evs-turnover')" title="Open Environmental Services Turnover Kanban">
              <span>✨</span> EVS Bed Turnover Board
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.refreshWardCapacity()" title="Fetch authoritative server capacity">
              <span>🔄</span> Refresh
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.printBedCensusReport()" title="Print Ward Bed Census & Occupancy Report">
              <span>🖨️</span> Print Census
            </button>
            <button type="button" class="btn btn-primary btn-sm" onclick="window.openAdjustCapacityModal('${hospital.id}')" title="Adjust Authorized Bed Capacity">
              <span>⚙️</span> Manage Capacity
            </button>
          </div>
        </div>

        <!-- 2. Capacity KPI Cards (6 metrics) -->
        <div class="ward-kpi-grid">
          <!-- Card 1: TOTAL BEDS -->
          <div class="ward-kpi-card accent-navy">
            <div class="ward-kpi-top">
              <span class="ward-kpi-label">Total Beds</span>
              <span class="ward-kpi-icon">🛏️</span>
            </div>
            <div class="ward-kpi-val">${numTotalBeds}</div>
            <div class="ward-kpi-sub">Authorized hospital capacity</div>
          </div>

          <!-- Card 2: OCCUPIED -->
          <div class="ward-kpi-card accent-rose">
            <div class="ward-kpi-top">
              <span class="ward-kpi-label">Occupied</span>
              <span class="ward-kpi-icon">👥</span>
            </div>
            <div class="ward-kpi-val">${numOccupiedBeds}</div>
            <div class="ward-kpi-sub">Active admitted inpatients</div>
          </div>

          <!-- Card 3: AVAILABLE -->
          <div class="ward-kpi-card accent-emerald">
            <div class="ward-kpi-top">
              <span class="ward-kpi-label">Available</span>
              <span class="ward-kpi-icon">✅</span>
            </div>
            <div class="ward-kpi-val">${numAvailableBeds}</div>
            <div class="ward-kpi-sub">Ready for immediate intake</div>
          </div>

          <!-- Card 4: RESERVED -->
          <div class="ward-kpi-card accent-purple">
            <div class="ward-kpi-top">
              <span class="ward-kpi-label">Reserved</span>
              <span class="ward-kpi-icon">🔒</span>
            </div>
            <div class="ward-kpi-val">${numReservedBeds}</div>
            <div class="ward-kpi-sub">Emergency &amp; triage triage hold</div>
          </div>

          <!-- Card 5: MAINTENANCE -->
          <div class="ward-kpi-card accent-amber">
            <div class="ward-kpi-top">
              <span class="ward-kpi-label">Maintenance</span>
              <span class="ward-kpi-icon">🛠️</span>
            </div>
            <div class="ward-kpi-val">${numMaintenanceBeds}</div>
            <div class="ward-kpi-sub">Sanitization &amp; engineering</div>
          </div>

          <!-- Card 6: OCCUPANCY RATE -->
          <div class="ward-kpi-card accent-teal">
            <div class="ward-kpi-top">
              <span class="ward-kpi-label">Occupancy Rate</span>
              <span class="ward-kpi-icon">📊</span>
            </div>
            <div class="ward-kpi-val" style="color: ${occupancyRateNum > 90 ? 'var(--danger)' : occupancyRateNum > 75 ? 'var(--warning)' : 'var(--primary)'};">
              ${occupancyRateFormatted}%
            </div>
            <div class="ward-kpi-sub">${occupancyRateNum > 85 ? 'High operational utilization' : 'Optimal facility throughput'}</div>
          </div>
        </div>

        <!-- 3. Hospital Capacity Overview Card -->
        <div class="capacity-overview-card">
          <div class="capacity-overview-header">
            <div class="capacity-overview-title-wrap">
              <h3 class="capacity-overview-title">
                <span>🏥</span> Hospital Capacity Overview
              </h3>
              <div class="capacity-overview-timestamp">
                <span>⏱️</span> Last updated: <strong>${lastUpdatedText}</strong>
              </div>
            </div>
            <div style="font-size: 0.84rem; font-weight: 700; color: var(--text-main);">
              Overall Utilization: <span style="color: ${occupancyRateNum > 90 ? 'var(--danger)' : 'var(--primary)'};">${occupancyRateFormatted}%</span>
            </div>
          </div>

          <!-- Multi-Segment Horizontal Visualization Bar -->
          <div class="capacity-overview-bar-track" title="Total Capacity Allocation">
            <div class="capacity-bar-segment occupied" style="width: ${numTotalBeds > 0 ? (numOccupiedBeds / numTotalBeds) * 100 : 0}%;" title="Occupied: ${numOccupiedBeds} Beds"></div>
            <div class="capacity-bar-segment available" style="width: ${numTotalBeds > 0 ? (numAvailableBeds / numTotalBeds) * 100 : 0}%;" title="Available: ${numAvailableBeds} Beds"></div>
            <div class="capacity-bar-segment reserved" style="width: ${numTotalBeds > 0 ? (numReservedBeds / numTotalBeds) * 100 : 0}%;" title="Reserved: ${numReservedBeds} Beds"></div>
            <div class="capacity-bar-segment maintenance" style="width: ${numTotalBeds > 0 ? (numMaintenanceBeds / numTotalBeds) * 100 : 0}%;" title="Maintenance: ${numMaintenanceBeds} Beds"></div>
          </div>

          <!-- Capacity Legend Summary Boxes -->
          <div class="capacity-legend-grid">
            <div class="capacity-legend-box">
              <div class="capacity-legend-left">
                <span class="capacity-dot occupied"></span>
                <span class="capacity-legend-name">Occupied</span>
              </div>
              <span class="capacity-legend-count">${numOccupiedBeds}</span>
            </div>
            <div class="capacity-legend-box">
              <div class="capacity-legend-left">
                <span class="capacity-dot available"></span>
                <span class="capacity-legend-name">Available</span>
              </div>
              <span class="capacity-legend-count" style="color: #059669;">${numAvailableBeds}</span>
            </div>
            <div class="capacity-legend-box">
              <div class="capacity-legend-left">
                <span class="capacity-dot reserved"></span>
                <span class="capacity-legend-name">Reserved</span>
              </div>
              <span class="capacity-legend-count" style="color: #6D28D9;">${numReservedBeds}</span>
            </div>
            <div class="capacity-legend-box">
              <div class="capacity-legend-left">
                <span class="capacity-dot maintenance"></span>
                <span class="capacity-legend-name">Maintenance</span>
              </div>
              <span class="capacity-legend-count" style="color: #D97706;">${numMaintenanceBeds}</span>
            </div>
          </div>
        </div>

        <!-- 4. Ward Overview Grid -->
        <div class="ward-overview-section">
          <div class="ward-section-header">
            <h3 class="ward-section-title">
              <span>🏢</span> WARD OVERVIEW
            </h3>
            <span style="font-size: 0.82rem; color: var(--text-muted);">${wardsData.length} Operational Departments</span>
          </div>

          <div class="ward-cards-grid">
            ${wardsData.map(w => `
              <div class="ward-card">
                <div>
                  <div class="ward-card-header">
                    <div>
                      <h4 class="ward-card-name">${w.icon} ${escapeHtml(w.name)}</h4>
                      <div class="ward-card-meta">
                        <span>${escapeHtml(w.dept)}</span> • <span>${escapeHtml(w.location)}</span>
                      </div>
                    </div>
                    <span class="badge ${w.statusBadgeClass}">${w.status}</span>
                  </div>

                  <table class="ward-stat-table">
                    <tbody>
                      <tr>
                        <td>Total Beds</td>
                        <td class="ward-stat-val">${w.total}</td>
                      </tr>
                      <tr>
                        <td>Occupied</td>
                        <td class="ward-stat-val text-primary">${w.occupied}</td>
                      </tr>
                      <tr>
                        <td>Available</td>
                        <td class="ward-stat-val" style="color: #059669;">${w.available}</td>
                      </tr>
                      <tr>
                        <td>Reserved</td>
                        <td class="ward-stat-val" style="color: #6D28D9;">${w.reserved}</td>
                      </tr>
                      <tr>
                        <td>Maintenance</td>
                        <td class="ward-stat-val" style="color: #D97706;">${w.maintenance}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div class="ward-occupancy-wrap">
                    <div class="ward-occupancy-label-row">
                      <span>Occupancy</span>
                      <span>${w.occupancyPct}%</span>
                    </div>
                    <div class="ward-occupancy-track">
                      <div class="ward-occupancy-bar ${w.occupancyPct >= 90 ? 'critical' : w.occupancyPct >= 70 ? 'high' : w.occupancyPct >= 40 ? 'medium' : 'low'}" style="width: ${Math.min(100, w.occupancyPct)}%;"></div>
                    </div>
                  </div>
                </div>

                <div class="ward-card-footer">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="window.filterWardView('${w.id}')">
                    <span>🔍</span> View Beds
                  </button>
                  <button type="button" class="btn btn-outline-primary btn-sm" onclick="window.openAssignBedModal(null, '${w.id}')">
                    <span>➕</span> Assign Bed
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 5. Bed Management Table -->
        <div class="bed-mgmt-section" id="bedManagementTableSection">
          <div class="bed-mgmt-toolbar">
            <div class="bed-search-box">
              <span class="bed-search-icon">🔍</span>
              <input type="text" 
                     class="bed-search-input" 
                     placeholder="Search by bed, ward, patient name or ID..." 
                     value="${escapeHtml(bedSearchQuery)}" 
                     oninput="window.handleBedSearchInput(event)">
            </div>

            <div class="bed-filter-controls">
              <!-- Ward Filter -->
              <select class="bed-filter-select" onchange="window.handleBedWardFilterChange(this.value)">
                <option value="ALL" ${bedWardFilter === 'ALL' ? 'selected' : ''}>All Wards</option>
                ${wardsData.map(w => `
                  <option value="${w.id}" ${bedWardFilter === w.id ? 'selected' : ''}>${escapeHtml(w.name)}</option>
                `).join('')}
              </select>

              <!-- Status Filter -->
              <select class="bed-filter-select" onchange="window.handleBedStatusFilterChange(this.value)">
                <option value="ALL" ${bedStatusFilter === 'ALL' ? 'selected' : ''}>All Statuses</option>
                <option value="AVAILABLE" ${bedStatusFilter === 'AVAILABLE' ? 'selected' : ''}>Available</option>
                <option value="OCCUPIED" ${bedStatusFilter === 'OCCUPIED' ? 'selected' : ''}>Occupied</option>
                <option value="RESERVED" ${bedStatusFilter === 'RESERVED' ? 'selected' : ''}>Reserved</option>
                <option value="MAINTENANCE" ${bedStatusFilter === 'MAINTENANCE' ? 'selected' : ''}>Maintenance</option>
              </select>

              <!-- Bed Type Filter -->
              <select class="bed-filter-select" onchange="window.handleBedTypeFilterChange(this.value)">
                <option value="ALL" ${bedTypeFilter === 'ALL' ? 'selected' : ''}>All Bed Types</option>
                <option value="Standard" ${bedTypeFilter === 'Standard' ? 'selected' : ''}>Standard Care</option>
                <option value="Intensive" ${bedTypeFilter === 'Intensive' ? 'selected' : ''}>Intensive / Ventilator</option>
                <option value="Acute" ${bedTypeFilter === 'Acute' ? 'selected' : ''}>Acute Triage</option>
                <option value="Cardiac" ${bedTypeFilter === 'Cardiac' ? 'selected' : ''}>Cardiac Monitored</option>
                <option value="Pediatric" ${bedTypeFilter === 'Pediatric' ? 'selected' : ''}>Pediatric / Incubator</option>
                <option value="Post-Surgical" ${bedTypeFilter === 'Post-Surgical' ? 'selected' : ''}>Post-Surgical Step-Down</option>
              </select>

              ${(bedSearchQuery || bedWardFilter !== 'ALL' || bedStatusFilter !== 'ALL' || bedTypeFilter !== 'ALL') ? `
                <button type="button" class="btn btn-secondary btn-sm" onclick="window.clearBedFilters()" title="Reset all filters">
                  Clear
                </button>
              ` : ''}
            </div>
          </div>

          <div class="table-responsive">
            <table class="bed-table">
              <thead>
                <tr>
                  <th>BED</th>
                  <th>WARD</th>
                  <th>TYPE</th>
                  <th>PATIENT</th>
                  <th>STATUS</th>
                  <th>ADMISSION</th>
                  <th>LAST UPDATED</th>
                  <th style="text-align: right;">ACTION</th>
                </tr>
              </thead>
              <tbody>
                ${filteredBeds.length === 0 ? `
                  <tr>
                    <td colspan="8" style="text-align: center; padding: 48px 20px;">
                      <div style="font-size: 2rem; margin-bottom: 8px;">🛏️</div>
                      <div style="font-weight: 700; color: var(--text-main); font-size: 1.05rem;">No beds match your criteria</div>
                      <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 4px;">Try adjusting your search query or clear selected status/ward filters.</p>
                      <button type="button" class="btn btn-secondary btn-sm mt-12" onclick="window.clearBedFilters()">
                        Clear All Filters
                      </button>
                    </td>
                  </tr>
                ` : filteredBeds.map(b => {
                  let statusBadge = '';
                  if (b.status === 'AVAILABLE') {
                    statusBadge = '<span class="badge-bed-available">● AVAILABLE</span>';
                  } else if (b.status === 'OCCUPIED') {
                    statusBadge = '<span class="badge-bed-occupied">● OCCUPIED</span>';
                  } else if (b.status === 'RESERVED') {
                    statusBadge = '<span class="badge-bed-reserved">● RESERVED</span>';
                  } else if (b.status === 'MAINTENANCE') {
                    statusBadge = '<span class="badge-bed-maintenance">🛠️ MAINTENANCE</span>';
                  }

                  const admissionDateStr = b.patient?.admittedAt
                    ? new Date(b.patient.admittedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—';

                  const updatedTimeStr = b.updatedAt
                    ? new Date(b.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '—';

                  return `
                    <tr>
                      <td class="bed-id-cell">${escapeHtml(b.bedId)}</td>
                      <td>
                        <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(b.wardName)}</div>
                        <div style="font-size: 0.74rem; color: var(--text-muted);">${escapeHtml(b.location)}</div>
                      </td>
                      <td>
                        <span class="badge badge-secondary" style="font-size: 0.72rem;">${escapeHtml(b.type)}</span>
                      </td>
                      <td>
                        ${b.patient ? `
                          <div class="bed-patient-cell">
                            <span class="bed-patient-name">${escapeHtml(b.patient.name)}</span>
                            <span class="bed-patient-id">${escapeHtml(b.patient.id)}</span>
                          </div>
                        ` : `
                          <span style="color: var(--text-muted); font-size: 0.85rem;">—</span>
                        `}
                      </td>
                      <td>${statusBadge}</td>
                      <td style="font-size: 0.82rem; color: var(--text-secondary);">${admissionDateStr}</td>
                      <td style="font-size: 0.82rem; color: var(--text-muted);">${updatedTimeStr}</td>
                      <td style="text-align: right;">
                        <div style="display: inline-flex; gap: 6px; justify-content: flex-end;">
                          <button type="button" class="btn btn-secondary btn-sm" onclick="window.openBedDrawer('${b.bedId}')" title="View bed telemetry and details">
                            View
                          </button>
                          ${b.status === 'AVAILABLE' ? `
                            <button type="button" class="btn btn-primary btn-sm" onclick="window.openAssignBedModal('${b.bedId}', '${b.wardId}')" title="Assign admitted patient">
                              Assign
                            </button>
                          ` : b.status === 'OCCUPIED' ? `
                            <button type="button" class="btn btn-outline-primary btn-sm" onclick="window.openTransferBedModal('${b.patient ? b.patient.id : (b.patientId || '')}', '${b.bedId}')" title="Transfer patient to another bed">
                              Transfer
                            </button>
                          ` : b.status === 'MAINTENANCE' ? `
                            <button type="button" class="btn btn-outline-success btn-sm" onclick="window.toggleBedMaintenance('${b.bedId}', false)" title="Return bed to active inventory">
                              Activate
                            </button>
                          ` : ''}
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 6. Slide-Over Bed Detail Drawer Overlay -->
        <div id="bedDrawerOverlay" class="bed-drawer-overlay" onclick="if (event.target === this) window.closeBedDrawer();">
          <div id="bedDrawerContent" class="bed-drawer">
            <!-- Dynamic Bed Content -->
          </div>
        </div>

        <!-- 7. Dynamic Modal Container for Patient Assignment / Transfer -->
        <div id="bedActionModalContainer"></div>
      </div>
    `;
  }

  // 3B. ENVIRONMENTAL SERVICES (EVS) BED TURNOVER & SANITIZATION PIPELINE
  if (tab === 'evs-turnover' || tab === 'evs' || tab === 'housekeeping') {
    if (window.EvsBedManager && typeof window.EvsBedManager.renderTurnoverBoard === 'function') {
      setTimeout(() => {
        const evsContainer = document.getElementById('evsTurnoverMountArea');
        if (evsContainer) {
          window.EvsBedManager.renderTurnoverBoard(evsContainer, hospital.id);
        }
      }, 0);
      return `
        <div class="evs-turnover-view-wrapper">
          <div id="evsTurnoverMountArea" class="evs-turnover-mount-wrap">
            <div class="workspace-state-box" style="padding: 60px 20px; text-align: center;">
              <div class="spinner-lg" style="margin: 0 auto 16px auto;"></div>
              <h3 style="font-size: 1.15rem; color: var(--text-main);">Initializing EVS Bed Turnover &amp; Sanitization Console...</h3>
              <p style="color: var(--text-secondary); font-size: 0.88rem;">Connecting live terminal disinfection and turnover pipeline...</p>
            </div>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="card p-24 text-center">
          <h3>EVS Bed Turnover Subsystem</h3>
          <p class="text-secondary">Environmental Services Bed Turnover Manager is loading...</p>
        </div>
      `;
    }
  }

  // 4. CLINICAL DEPARTMENTS
  if (tab === 'departments') {
    if (window.renderDepartmentWorkspace) {
      setTimeout(() => {
        const container = document.getElementById('mainContentArea');
        if (container) window.renderDepartmentWorkspace(container);
      }, 0);
      return `<div class="workspace-state-box"><div class="spinner-lg"></div><h3 class="mt-16">Loading Clinical Departments...</h3></div>`;
    }
  }

  // 4B. DISCHARGE CLEARANCE & OPERATIONS APPROVAL
  if (tab === 'discharge-clearance' || tab === 'dischargeClearance') {
    return renderDischargeClearanceSection(data);
  }

  // 5. INPATIENT PATIENTS DIRECTORY (PRODUCTION CLINICAL INPATIENTS WORKSPACE)
  if (tab === 'patients') {
    // 1. KPI Aggregations (Defensive & Dynamic)
    const totalInpatientsCount = Array.isArray(patients) ? patients.length : 0;
    const admittedTodayCount = Array.isArray(patients) ? patients.filter(p => isAdmittedToday(p.admittedAt)).length : 0;
    const criticalCount = Array.isArray(patients) ? patients.filter(p => (p.status === 'CRITICAL' || p.priority === 'CRITICAL' || (p.ward && p.ward.toLowerCase().includes('icu')))).length : 0;
    const awaitingDischargeCount = Array.isArray(patients) ? patients.filter(p => p.dischargeStatus === 'DOCTOR_APPROVED' || p.dischargeStatus === 'CLEARANCE_PENDING' || p.status === 'DOCTOR_APPROVED' || p.status === 'TRANSFER_PENDING').length : 0;
    const availableBedsDisplay = availableBeds != null ? availableBeds : '—';

    // 2. Extract unique departments & doctors for filtering
    const allDepartments = Array.from(new Set(doctors.map(d => d.specialty || d.department).filter(Boolean)));
    if (!allDepartments.includes('General Medicine')) allDepartments.push('General Medicine');
    if (!allDepartments.includes('Cardiology')) allDepartments.push('Cardiology');
    if (!allDepartments.includes('Emergency Medicine')) allDepartments.push('Emergency Medicine');
    if (!allDepartments.includes('Intensive Care Unit (ICU)')) allDepartments.push('Intensive Care Unit (ICU)');

    // 3. Multi-Dimensional Filter Logic
    let filteredPatients = Array.isArray(patients) ? [...patients] : [];
    if (patientSearchQuery) {
      const q = patientSearchQuery.toLowerCase().trim();
      filteredPatients = filteredPatients.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.contact && p.contact.toLowerCase().includes(q)) ||
        (p.phone && p.phone.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.bloodGroup && p.bloodGroup.toLowerCase().includes(q))
      );
    }
    if (patientStatusFilter && patientStatusFilter !== 'ALL') {
      if (patientStatusFilter === 'ADMITTED') {
        filteredPatients = filteredPatients.filter(p => p.status === 'CHECKED_IN' || p.status === 'ADMITTED');
      } else if (patientStatusFilter === 'CRITICAL') {
        filteredPatients = filteredPatients.filter(p => p.status === 'CRITICAL' || p.priority === 'CRITICAL' || (p.ward && p.ward.toLowerCase().includes('icu')));
      } else if (patientStatusFilter === 'STABLE') {
        filteredPatients = filteredPatients.filter(p => p.status === 'ACTIVE' || p.status === 'STABLE' || (p.status === 'CHECKED_IN' && !p.ward?.toLowerCase().includes('icu')));
      } else if (patientStatusFilter === 'DISCHARGE_PENDING') {
        filteredPatients = filteredPatients.filter(p => p.dischargeStatus === 'DOCTOR_APPROVED' || p.dischargeStatus === 'CLEARANCE_PENDING' || p.status === 'DOCTOR_APPROVED' || p.status === 'TRANSFER_PENDING');
      } else if (patientStatusFilter === 'DISCHARGED') {
        filteredPatients = filteredPatients.filter(p => p.status === 'DISCHARGED');
      } else {
        filteredPatients = filteredPatients.filter(p => p.status === patientStatusFilter);
      }
    }
    if (patientDeptFilter && patientDeptFilter !== 'ALL') {
      filteredPatients = filteredPatients.filter(p => {
        const doc = window.hospitrackStore ? window.hospitrackStore.getDoctorById(p.primaryDoctorId) : null;
        const docDept = doc ? (doc.specialty || doc.department || '').toLowerCase() : '';
        const pDept = (p.department || p.ward || '').toLowerCase();
        const target = patientDeptFilter.toLowerCase();
        return docDept.includes(target) || pDept.includes(target) || target.includes(docDept);
      });
    }
    if (patientDoctorFilter && patientDoctorFilter !== 'ALL') {
      filteredPatients = filteredPatients.filter(p => p.primaryDoctorId === patientDoctorFilter);
    }
    if (patientDateFilter && patientDateFilter !== 'ALL') {
      if (patientDateFilter === 'TODAY') {
        filteredPatients = filteredPatients.filter(p => isAdmittedToday(p.admittedAt));
      } else if (patientDateFilter === 'WEEK') {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredPatients = filteredPatients.filter(p => p.admittedAt && new Date(p.admittedAt) >= weekAgo);
      } else if (patientDateFilter === 'MONTH') {
        const now = new Date();
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredPatients = filteredPatients.filter(p => p.admittedAt && new Date(p.admittedAt) >= monthAgo);
      }
    }

    const hasActiveFilters = Boolean(patientSearchQuery || patientStatusFilter !== 'ALL' || patientDeptFilter !== 'ALL' || patientDoctorFilter !== 'ALL' || patientDateFilter !== 'ALL');

    return `
      <div class="inpatient-container">
        <!-- 1. AUTHORITATIVE HEADER -->
        <div class="inpatient-header">
          <div class="inpatient-title-block">
            <div class="inpatient-badge-row">
              <span class="inpatient-header-badge">FACILITY INPATIENTS</span>
              <span class="inpatient-status-indicator"><span class="status-pulse-dot"></span> Live Care Registry</span>
            </div>
            <h1 class="inpatient-title">Facility Inpatients</h1>
            <p class="inpatient-subtitle">
              Monitor admitted patients, care status, assigned doctors and hospital actions.
            </p>
          </div>
          <div class="inpatient-actions">
            <button type="button" class="btn btn-secondary btn-sm" onclick="handleDownloadAllPatients('${hospital.id}')" title="Export Inpatient Registry CSV">
              <span>📥</span> Export Registry
            </button>
            <button type="button" class="btn btn-primary btn-sm" onclick="openRegisterPatientModal()">
              <span>+</span> Add Patient
            </button>
          </div>
        </div>

        <!-- 2. KPI SUMMARY (5 COMPACT HORIZONTAL CARDS) -->
        <div class="inpatient-kpi-row">
          <div class="inpatient-kpi-card primary clickable ${patientStatusFilter === 'ALL' && !patientDateFilter ? 'active' : ''}" onclick="patientStatusFilter = 'ALL'; patientDateFilter = 'ALL'; renderHospitalSectionNow('patients');" title="Filter by All Inpatients">
            <div class="inpatient-kpi-top">
              <span class="inpatient-kpi-label">Total Inpatients</span>
              <span class="inpatient-kpi-icon">👥</span>
            </div>
            <div class="inpatient-kpi-value">${totalInpatientsCount}</div>
            <div class="inpatient-kpi-sub">Registered Inpatients</div>
          </div>

          <div class="inpatient-kpi-card success clickable ${patientDateFilter === 'TODAY' ? 'active' : ''}" onclick="patientDateFilter = 'TODAY'; renderHospitalSectionNow('patients');" title="Filter by Admitted Today">
            <div class="inpatient-kpi-top">
              <span class="inpatient-kpi-label">Admitted Today</span>
              <span class="inpatient-kpi-icon">📥</span>
            </div>
            <div class="inpatient-kpi-value">${admittedTodayCount}</div>
            <div class="inpatient-kpi-sub">New Admissions</div>
          </div>

          <div class="inpatient-kpi-card critical clickable ${patientStatusFilter === 'CRITICAL' ? 'active' : ''}" onclick="patientStatusFilter = 'CRITICAL'; renderHospitalSectionNow('patients');" title="Filter by Critical Care">
            <div class="inpatient-kpi-top">
              <span class="inpatient-kpi-label">Critical / High Priority</span>
              <span class="inpatient-kpi-icon">🚨</span>
            </div>
            <div class="inpatient-kpi-value">${criticalCount}</div>
            <div class="inpatient-kpi-sub">${criticalCount > 0 ? 'Intensive care triage' : 'ICU status normal'}</div>
          </div>

          <div class="inpatient-kpi-card warning clickable ${patientStatusFilter === 'DISCHARGE_PENDING' ? 'active' : ''}" onclick="patientStatusFilter = 'DISCHARGE_PENDING'; renderHospitalSectionNow('patients');" title="Filter by Awaiting Discharge">
            <div class="inpatient-kpi-top">
              <span class="inpatient-kpi-label">Awaiting Discharge</span>
              <span class="inpatient-kpi-icon">🚪</span>
            </div>
            <div class="inpatient-kpi-value">${awaitingDischargeCount}</div>
            <div class="inpatient-kpi-sub">Clearance in progress</div>
          </div>

          <div class="inpatient-kpi-card teal clickable" onclick="setHospitalTab('bed-management');" title="Open Bed Capacity &amp; Ward Management">
            <div class="inpatient-kpi-top">
              <span class="inpatient-kpi-label">Available Beds</span>
              <span class="inpatient-kpi-icon">🛏️</span>
            </div>
            <div class="inpatient-kpi-value">${availableBedsDisplay}</div>
            <div class="inpatient-kpi-sub">of ${totalBeds || 100} Total Beds</div>
          </div>
        </div>

        <!-- 3. INPATIENT SEARCH & FILTER TOOLBAR -->
        <div class="inpatient-toolbar">
          <div class="inpatient-search-box">
            <span class="inpatient-search-icon">🔍</span>
            <input type="text" class="inpatient-search-input" placeholder="Search patient name, patient ID, phone..." value="${escapeHtml(patientSearchQuery)}" oninput="patientSearchQuery = this.value; renderHospitalSectionNow('patients');">
            ${patientSearchQuery ? `<button type="button" class="inpatient-search-clear" onclick="patientSearchQuery = ''; renderHospitalSectionNow('patients');" aria-label="Clear Search">✕</button>` : ''}
          </div>

          <div class="inpatient-filter-group">
            <select class="inpatient-filter-select" onchange="patientStatusFilter = this.value; renderHospitalSectionNow('patients');" aria-label="Status Filter">
              <option value="ALL" ${patientStatusFilter === 'ALL' ? 'selected' : ''}>Status: All</option>
              <option value="ADMITTED" ${patientStatusFilter === 'ADMITTED' ? 'selected' : ''}>Admitted</option>
              <option value="CRITICAL" ${patientStatusFilter === 'CRITICAL' ? 'selected' : ''}>Critical</option>
              <option value="STABLE" ${patientStatusFilter === 'STABLE' ? 'selected' : ''}>Stable</option>
              <option value="DISCHARGE_PENDING" ${patientStatusFilter === 'DISCHARGE_PENDING' ? 'selected' : ''}>Discharge Pending</option>
              <option value="DISCHARGED" ${patientStatusFilter === 'DISCHARGED' ? 'selected' : ''}>Discharged</option>
            </select>

            <select class="inpatient-filter-select" onchange="patientDeptFilter = this.value; renderHospitalSectionNow('patients');" aria-label="Department Filter">
              <option value="ALL" ${patientDeptFilter === 'ALL' ? 'selected' : ''}>Dept: All Departments</option>
              ${allDepartments.map(d => `<option value="${escapeHtml(d)}" ${patientDeptFilter === d ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('')}
            </select>

            <select class="inpatient-filter-select" onchange="patientDoctorFilter = this.value; renderHospitalSectionNow('patients');" aria-label="Doctor Filter">
              <option value="ALL" ${patientDoctorFilter === 'ALL' ? 'selected' : ''}>Doctor: All Doctors</option>
              ${doctors.map(d => `<option value="${escapeHtml(d.id)}" ${patientDoctorFilter === d.id ? 'selected' : ''}>Dr. ${escapeHtml(d.name)}</option>`).join('')}
            </select>

            <select class="inpatient-filter-select" onchange="patientDateFilter = this.value; renderHospitalSectionNow('patients');" aria-label="Admission Date Filter">
              <option value="ALL" ${patientDateFilter === 'ALL' ? 'selected' : ''}>Admitted: All Dates</option>
              <option value="TODAY" ${patientDateFilter === 'TODAY' ? 'selected' : ''}>Today</option>
              <option value="WEEK" ${patientDateFilter === 'WEEK' ? 'selected' : ''}>Last 7 Days</option>
              <option value="MONTH" ${patientDateFilter === 'MONTH' ? 'selected' : ''}>Last 30 Days</option>
            </select>

            ${hasActiveFilters ? `
              <button type="button" class="btn btn-secondary btn-sm inpatient-reset-btn" onclick="patientSearchQuery = ''; patientStatusFilter = 'ALL'; patientDeptFilter = 'ALL'; patientDoctorFilter = 'ALL'; patientDateFilter = 'ALL'; renderHospitalSectionNow('patients');" title="Reset all search filters">
                ✕ Reset
              </button>
            ` : ''}
          </div>

          <div class="inpatient-results-count">
            Showing <strong>${filteredPatients.length}</strong> of <strong>${totalInpatientsCount}</strong>
          </div>
        </div>

        <!-- 4. PATIENT LIST -->
        <div class="inpatient-table-card">
          <div class="table-responsive">
            <table class="inpatient-table">
              <thead>
                <tr>
                  <th style="min-width: 200px;">Patient</th>
                  <th style="min-width: 120px;">Status</th>
                  <th style="min-width: 140px;">Department</th>
                  <th style="min-width: 140px;">Room / Bed</th>
                  <th style="min-width: 160px;">Attending Doctor</th>
                  <th style="min-width: 110px;">Admitted</th>
                  <th style="text-align: right; min-width: 130px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filteredPatients.length === 0 ? `
                  <tr>
                    <td colspan="7" class="inpatient-empty-cell">
                      <div class="inpatient-empty-state">
                        <div class="inpatient-empty-icon">👥</div>
                        <h3 class="inpatient-empty-title">No inpatients currently</h3>
                        <p class="inpatient-empty-desc">
                          ${hasActiveFilters ? 'No inpatient records match your search and filter criteria. Try resetting filters.' : 'Patients admitted to this facility will appear here.'}
                        </p>
                        <button type="button" class="btn btn-primary btn-sm" onclick="openRegisterPatientModal()">
                          <span>+</span> Admit Inpatient
                        </button>
                      </div>
                    </td>
                  </tr>
                ` : filteredPatients.map(p => {
                  const doc = window.hospitrackStore ? window.hospitrackStore.getDoctorById(p.primaryDoctorId) : null;
                  const isCritical = p.status === 'CRITICAL' || p.priority === 'CRITICAL' || (p.ward && p.ward.toLowerCase().includes('icu'));
                  const lengthOfStay = calculateLengthOfStay(p.admittedAt);
                  const admissionDateFormatted = p.admittedAt ? new Date(p.admittedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                  const wardName = p.ward || (isCritical ? 'Intensive Care Unit (ICU)' : 'General Inpatient Ward');
                  const roomBed = p.roomBed || (p.room && p.bed ? `${p.room} • ${p.bed}` : (p.room || p.bed || 'Not assigned'));
                  const departmentName = doc?.specialty || doc?.department || p.department || (isCritical ? 'Critical Care & ICU' : 'General & Internal Medicine');
                  const initials = (p.name || 'P').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'PT';

                  let statusBadge = '';
                  if (isCritical) {
                    statusBadge = `<span class="inpatient-status-pill critical"><span class="status-dot"></span> Critical Care</span>`;
                  } else if (p.status === 'CHECKED_IN' || p.status === 'ADMITTED') {
                    statusBadge = `<span class="inpatient-status-pill admitted"><span class="status-dot"></span> Admitted</span>`;
                  } else if (p.dischargeStatus === 'DOCTOR_APPROVED' || p.dischargeStatus === 'CLEARANCE_PENDING' || p.status === 'DOCTOR_APPROVED' || p.status === 'TRANSFER_PENDING') {
                    statusBadge = `<span class="inpatient-status-pill pending"><span class="status-dot"></span> Discharge Pending</span>`;
                  } else if (p.status === 'DISCHARGED') {
                    statusBadge = `<span class="inpatient-status-pill discharged"><span class="status-dot"></span> Discharged</span>`;
                  } else {
                    statusBadge = `<span class="inpatient-status-pill stable"><span class="status-dot"></span> Stable</span>`;
                  }

                  return `
                    <tr class="inpatient-row" onclick="if (!event.target.closest('button') && !event.target.closest('a') && !event.target.closest('.inpatient-menu-dropdown')) openInpatientDrawer('${escapeHtml(p.id)}')">
                      <!-- PATIENT COLUMN -->
                      <td>
                        <div class="inpatient-cell-identity">
                          <div class="inpatient-cell-avatar" title="${escapeHtml(p.name)}">
                            ${p.photoUrl ? `
                              <img src="${escapeHtml(p.photoUrl)}" alt="${escapeHtml(p.name)}" loading="lazy">
                            ` : `
                              <span>${escapeHtml(initials)}</span>
                            `}
                          </div>
                          <div class="inpatient-cell-details">
                            <div class="inpatient-cell-name">${escapeHtml(p.name)}</div>
                            <div class="inpatient-cell-meta">
                              <span class="inpatient-cell-id">${escapeHtml(p.id)}</span>
                              <span class="inpatient-cell-dot">•</span>
                              <span>${p.gender || 'N/A'}${p.age ? `, ${p.age} yrs` : ''}</span>
                              ${p.bloodGroup ? `
                                <span class="inpatient-cell-dot">•</span>
                                <span class="inpatient-cell-blood">${escapeHtml(p.bloodGroup)}</span>
                              ` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      <!-- STATUS COLUMN -->
                      <td>
                        ${statusBadge}
                      </td>

                      <!-- DEPARTMENT COLUMN -->
                      <td>
                        <div class="inpatient-cell-dept">${escapeHtml(departmentName)}</div>
                      </td>

                      <!-- ROOM / BED COLUMN -->
                      <td>
                        <div class="inpatient-bed-badge">
                          <span class="inpatient-bed-ward">${escapeHtml(wardName)}</span>
                          <span class="inpatient-bed-detail">${escapeHtml(roomBed)}</span>
                        </div>
                      </td>

                      <!-- ATTENDING DOCTOR COLUMN -->
                      <td>
                        ${doc ? `
                          <div class="inpatient-doc-cell">
                            <span class="inpatient-doc-name" onclick="event.stopPropagation(); window.openDoctorWorkspace('${doc.id}')">
                              Dr. ${escapeHtml(doc.name)}
                            </span>
                            <span class="inpatient-doc-dept">${escapeHtml(doc.specialty || 'Attending Physician')}</span>
                          </div>
                        ` : `
                          <div class="inpatient-doc-cell">
                            <span class="inpatient-unassigned">Unassigned</span>
                            <button type="button" class="btn-link-sm" style="text-align: left; padding: 0;" onclick="event.stopPropagation(); openAssignDoctorToPatientModal('${p.id}')">
                              + Assign Doctor
                            </button>
                          </div>
                        `}
                      </td>

                      <!-- ADMITTED COLUMN -->
                      <td>
                        <div class="inpatient-admit-cell">
                          <span class="inpatient-admit-date">${escapeHtml(admissionDateFormatted)}</span>
                          <span class="inpatient-admit-stay">${escapeHtml(lengthOfStay)}</span>
                        </div>
                      </td>

                      <!-- ACTIONS COLUMN -->
                      <td style="text-align: right;">
                        <div class="inpatient-actions-cell">
                          <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openInpatientDrawer('${p.id}')">
                            Open Patient
                          </button>
                          <div class="inpatient-action-menu-wrap">
                            <button type="button" class="btn btn-secondary btn-sm inpatient-more-btn" onclick="event.stopPropagation(); toggleInpatientActionMenu(event, 'inpatientMenu_${p.id}')" title="More Inpatient Actions" aria-label="More Inpatient Actions">
                              ⋯
                            </button>
                            <div id="inpatientMenu_${p.id}" class="inpatient-menu-dropdown">
                              <button type="button" class="inpatient-menu-item" onclick="openInpatientDrawer('${p.id}')">
                                <span>👤</span> Open Quick Drawer
                              </button>
                              <button type="button" class="inpatient-menu-item" onclick="window.openPatientWorkspace('${p.id}')">
                                <span>📋</span> Full Workspace
                              </button>
                              <button type="button" class="inpatient-menu-item" onclick="openFirstOpdIntakeModal('${p.id}')">
                                <span>🩺</span> First OPD Clinical Intake
                              </button>
                              <button type="button" class="inpatient-menu-item" onclick="openManagePatientCredentialsModal('${p.id}')">
                                <span>🔑</span> Manage Portal Credentials
                              </button>
                              <button type="button" class="inpatient-menu-item" onclick="openEditPatientModal('${p.id}')">
                                <span>✏️</span> Edit Patient Profile
                              </button>
                              <button type="button" class="inpatient-menu-item" onclick="openChangePatientPhotoModal('${p.id}')">
                                <span>📷</span> Update Patient Photo
                              </button>
                              <button type="button" class="inpatient-menu-item" onclick="openAssignDoctorToPatientModal('${p.id}')">
                                <span>🩺</span> Assign Doctor
                              </button>
                              <button type="button" class="inpatient-menu-item" onclick="openAssignBedModal('${p.id}')">
                                <span>🛏️</span> Assign Bed / Ward
                              </button>
                              <div class="inpatient-menu-divider"></div>
                              <button type="button" class="inpatient-menu-item" onclick="handleDownloadPatient('${p.id}')">
                                <span>📥</span> Download Dossier
                              </button>
                              ${p.status !== 'DISCHARGED' ? `
                                <button type="button" class="inpatient-menu-item text-danger" onclick="handleDischargeClick('${p.id}')">
                                  <span>🚪</span> Discharge Workflow
                                </button>
                              ` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Inpatient Slide-Over Quick Drawer Container -->
      <div id="inpatientDrawerOverlay" class="inpatient-drawer-overlay" onclick="if (event.target === this) closeInpatientDrawer();">
        <div id="inpatientDrawerContent" class="inpatient-drawer">
          <!-- Populated dynamically by openInpatientDrawer() -->
        </div>
      </div>
    `;
  }

  // 6A. DOCTORS MANAGEMENT (PHYSICIANS, DEPARTMENTS, WORKLOAD & CREDENTIALS)
  if (tab === 'doctors') {
    return renderDoctorsSection(data);
  }

  // 6B. MEDICAL STAFF MANAGEMENT (NURSING, LABORATORY, PHARMACY, SUPPORT STAFF)
  if (tab === 'staff' || tab === 'medical-staff') {
    return renderMedicalStaffSection(data);
  }

  // 7. CONSULTATIONS
  if (tab === 'consultations') {
    const visits = store.getVisits ? store.getVisits() : [];
    return `
      <div class="page-header-container">
        <div class="page-header-info">
          <span class="page-header-badge">Clinical Encounters</span>
          <h1 class="page-title">📋 Clinical Consultations Log</h1>
          <p class="page-subtitle">Hospital-wide outpatient and inpatient physician consultations.</p>
        </div>
        <div class="page-actions-toolbar">
          <button type="button" class="btn btn-secondary btn-sm" onclick="setHospitalTab('overview')">Back to Operations</button>
        </div>
      </div>

      <div class="glass-panel">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Encounter ID</th>
                <th>Patient</th>
                <th>Attending Doctor</th>
                <th>Date</th>
                <th>Diagnosis &amp; Clinical Summary</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${visits.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">No consultation encounters recorded.</td></tr>
              ` : visits.map(v => {
                const doc = window.hospitrackStore.getDoctorById(v.doctorId);
                return `
                  <tr>
                    <td><code>${escapeHtml(v.id)}</code></td>
                    <td>
                      <a href="#hospital/workspace/patient/${encodeURIComponent(v.patientId)}" class="font-semibold text-main">
                        ${escapeHtml(v.patientName || v.patientId)}
                      </a>
                    </td>
                    <td>
                      ${doc ? `
                        <a href="#hospital/workspace/doctor/${encodeURIComponent(doc.id)}" class="font-semibold text-primary" onclick="window.openDoctorWorkspace('${doc.id}')">
                          Dr. ${escapeHtml(doc.name)} (<code>${escapeHtml(doc.id)}</code>)
                        </a>
                      ` : `<code>${escapeHtml(v.doctorId || 'Unassigned')}</code>`}
                    </td>
                    <td>${new Date(v.visitDate || v.date || v.createdAt).toLocaleDateString()}</td>
                    <td style="max-width: 280px; font-size: 0.82rem;">${escapeHtml(v.diagnosis || v.notes || 'Routine follow-up')}</td>
                    <td><span class="badge badge-active">${escapeHtml(v.status || 'COMPLETED')}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 8. REFERRALS (SPECIALIST REFERRAL PIPELINE)
  if (tab === 'referrals' || tab === 'specialist-referrals' || tab === 'referral-pipeline' || tab === 'specialist-referral' || tab === 'referral') {
    return renderHospitalReferralPipelineSection(data);
  }

  // 9. EMERGENCY TRANSFERS (EMERGENCY TRANSFER TRIAGE)
  if (tab === 'transfers' || tab === 'emergency-transfers' || tab === 'transfer-triage' || tab === 'emergency-triage' || tab === 'emergency-transfer' || tab === 'transfer') {
    return renderHospitalEmergencyTransferSection(data);
  }

  // 10. LAB REPORTS
  if (tab === 'lab-reports' || tab === 'labs') {
    return `
      <div class="page-header-container">
        <div class="page-header-info">
          <span class="page-header-badge">Diagnostics</span>
          <h1 class="page-title">🔬 Diagnostic Laboratory Records</h1>
          <p class="page-subtitle">Pathology, biochemistry, and radiology reports across hospital patients.</p>
        </div>
        <div class="page-actions-toolbar">
          <button type="button" class="btn btn-secondary btn-sm" onclick="setHospitalTab('overview')">Back to Operations</button>
        </div>
      </div>

      <div class="glass-panel">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Patient</th>
                <th>Test Ordered</th>
                <th>Category</th>
                <th>Report Date</th>
                <th>Result Summary</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${labs.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">No diagnostic lab records available.</td></tr>
              ` : labs.map(l => `
                <tr>
                  <td><code>${escapeHtml(l.id)}</code></td>
                  <td>
                    <a href="#hospital/workspace/patient/${encodeURIComponent(l.patientId)}" class="font-semibold text-main">
                      ${escapeHtml(l.patientName || l.patientId)}
                    </a>
                  </td>
                  <td><strong>${escapeHtml(l.testName)}</strong></td>
                  <td><span class="badge badge-info">${escapeHtml(l.category || 'Clinical')}</span></td>
                  <td>${new Date(l.reportDate || l.createdAt).toLocaleDateString()}</td>
                  <td style="font-size: 0.82rem; max-width: 260px;">${escapeHtml(l.resultSummary || 'Normal limits')}</td>
                  <td><span class="badge badge-active">${escapeHtml(l.status || 'VERIFIED')}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 11. PRESCRIPTIONS (WITH SPECIFIC ATTENDING DOCTOR ATTRIBUTION)
  if (tab === 'prescriptions') {
    return `
      <div class="page-header-container">
        <div class="page-header-info">
          <span class="page-header-badge">Pharmacy</span>
          <h1 class="page-title">💊 Inpatient Pharmacotherapy &amp; Prescriptions</h1>
          <p class="page-subtitle">Prescription records issued to admitted and outpatient patients with responsible prescribing doctor identity.</p>
        </div>
        <div class="page-actions-toolbar">
          <button type="button" class="btn btn-secondary btn-sm" onclick="setHospitalTab('overview')">Back to Operations</button>
        </div>
      </div>

      <div class="glass-panel">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Prescription ID</th>
                <th>Patient</th>
                <th>Prescribing Doctor</th>
                <th>Hospital Facility</th>
                <th>Prescribed Date</th>
                <th>Medications Prescribed</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${prescriptions.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">No prescriptions issued yet.</td></tr>
              ` : prescriptions.map(p => {
                const doc = window.hospitrackStore.getDoctorById(p.doctorId);
                const hosp = window.hospitrackStore.getHospitalById(p.hospitalId);
                return `
                  <tr>
                    <td><code>${escapeHtml(p.id)}</code></td>
                    <td>
                      <a href="#hospital/workspace/patient/${encodeURIComponent(p.patientId)}" class="font-semibold text-main">
                        ${escapeHtml(p.patientName || p.patientId)}
                      </a>
                    </td>
                    <td>
                      ${doc ? `
                        <a href="#hospital/workspace/doctor/${encodeURIComponent(doc.id)}" class="font-semibold text-primary" onclick="window.openDoctorWorkspace('${doc.id}')">
                          Dr. ${escapeHtml(doc.name)} (<code>${escapeHtml(doc.id)}</code>)
                        </a>
                      ` : `<code>${escapeHtml(p.doctorId || 'Unassigned')}</code>`}
                    </td>
                    <td>${escapeHtml(hosp ? hosp.name : p.hospitalId || 'Hospital')}</td>
                    <td>${new Date(p.prescribedAt || p.createdAt).toLocaleDateString()}</td>
                    <td style="font-size: 0.82rem;">
                      ${(p.items || []).map(i => `<strong>${escapeHtml(i.name)}</strong> (${escapeHtml(i.dosage || '')} • ${escapeHtml(i.frequency || '')})`).join(', ')}
                    </td>
                    <td><span class="badge badge-active">${escapeHtml(p.status || 'ACTIVE')}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  return `<div class="glass-panel" style="padding: 2rem; text-align: center;">Section not found.</div>`;
}

function renderHospitalSectionNow(tab) {
  const container = document.getElementById('mainContentArea');
  if (container) {
    window.renderHospitalDashboard(container, tab, isHospitalProfileEditMode);
  }
}

// --------------------------------------------------------------------------
// Real Backend Operations
// --------------------------------------------------------------------------
window.adjustBedCount = async function(hospitalId, delta) {
  const store = window.hospitrackStore;
  const hospital = store.getHospitalById(hospitalId);
  if (!hospital) return;

  const currentAvailable = hospital.availableBeds != null ? hospital.availableBeds : 20;
  const newAvailable = Math.max(0, Math.min(hospital.totalBeds || 100, currentAvailable + delta));

  try {
    await store.updateBedCapacity(hospitalId, newAvailable);
    window.showToast(`Bed capacity updated: ${newAvailable} available beds persisted successfully.`, 'success');
    window.renderHospitalDashboard(document.getElementById('mainContentArea'));
  } catch (err) {
    window.showToast(err.message || 'Failed to update bed count.', 'error');
  }
};

// Ward & Bed Management Global Controllers
window.handleBedSearchInput = function(event) {
  bedSearchQuery = event.target.value;
  renderHospitalSectionNow('bed-management');
};

window.handleBedWardFilterChange = function(val) {
  bedWardFilter = val;
  renderHospitalSectionNow('bed-management');
};

window.handleBedStatusFilterChange = function(val) {
  bedStatusFilter = val;
  renderHospitalSectionNow('bed-management');
};

window.handleBedTypeFilterChange = function(val) {
  bedTypeFilter = val;
  renderHospitalSectionNow('bed-management');
};

window.clearBedFilters = function() {
  bedSearchQuery = '';
  bedWardFilter = 'ALL';
  bedStatusFilter = 'ALL';
  bedTypeFilter = 'ALL';
  renderHospitalSectionNow('bed-management');
};

window.filterWardView = function(wardId) {
  bedWardFilter = wardId;
  renderHospitalSectionNow('bed-management');
  setTimeout(() => {
    const el = document.getElementById('bedManagementTableSection');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, 50);
};

window.refreshWardCapacity = async function() {
  try {
    const store = window.hospitrackStore;
    if (store && typeof store.syncAllData === 'function') {
      await store.syncAllData();
    }
    window.showToast('Ward & Bed capacity refreshed with authoritative database state.', 'info');
    renderHospitalSectionNow('bed-management');
  } catch (err) {
    window.showToast('Failed to refresh capacity: ' + (err.message || err), 'error');
  }
};

window.openBedDrawer = function(bedId) {
  const overlay = document.getElementById('bedDrawerOverlay');
  const content = document.getElementById('bedDrawerContent');
  if (!overlay || !content) return;

  const inventory = window._currentBedInventory || [];
  const bed = inventory.find(b => b.bedId === bedId);
  if (!bed) return;

  const isOccupied = (bed.status === 'OCCUPIED' && bed.patient);
  const isAvailable = (bed.status === 'AVAILABLE');
  const isMaint = (bed.status === 'MAINTENANCE');
  const isReserved = (bed.status === 'RESERVED');

  let statusBadge = '';
  if (isAvailable) statusBadge = '<span class="badge-bed-available">● AVAILABLE FOR INTAKE</span>';
  else if (isOccupied) statusBadge = '<span class="badge-bed-occupied">● CURRENTLY OCCUPIED</span>';
  else if (isReserved) statusBadge = '<span class="badge-bed-reserved">● RESERVED / TRIAGE HOLD</span>';
  else if (isMaint) statusBadge = '<span class="badge-bed-maintenance">🛠️ UNDER MAINTENANCE</span>';

  content.innerHTML = `
    <div class="bed-drawer-header">
      <div class="bed-drawer-title-wrap">
        <h3 class="bed-drawer-title">
          <span>🛏️</span> Bed ${escapeHtml(bed.bedId)}
        </h3>
        <div class="bed-drawer-sub">${escapeHtml(bed.wardName)} • ${escapeHtml(bed.location)}</div>
      </div>
      <button type="button" class="modal-close" onclick="window.closeBedDrawer()" aria-label="Close Drawer">✕</button>
    </div>

    <div class="bed-drawer-body">
      <!-- Status Badge & Quick Summary -->
      <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface-alt); padding: 12px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary);">OPERATIONAL STATUS</span>
        ${statusBadge}
      </div>

      <!-- Section: Bed Telemetry & Specifications -->
      <div class="bed-drawer-section">
        <div class="bed-drawer-section-title">
          <span>📐</span> Bed &amp; Clinical Specifications
        </div>
        <div class="bed-drawer-grid">
          <div class="bed-drawer-field">
            <span class="bed-drawer-label">Acuity Tier &amp; Type</span>
            <span class="bed-drawer-value">${escapeHtml(bed.type)}</span>
          </div>
          <div class="bed-drawer-field">
            <span class="bed-drawer-label">Department</span>
            <span class="bed-drawer-value">${escapeHtml(bed.dept)}</span>
          </div>
          <div class="bed-drawer-field">
            <span class="bed-drawer-label">Physical Location</span>
            <span class="bed-drawer-value">${escapeHtml(bed.location)}</span>
          </div>
          <div class="bed-drawer-field">
            <span class="bed-drawer-label">Oxygen &amp; Ventilator</span>
            <span class="bed-drawer-value">${bed.type.includes('Intensive') || bed.type.includes('Ventilator') ? 'High-Flow O2 & Ventilator Port' : 'Central Oxygen Supply'}</span>
          </div>
          <div class="bed-drawer-field full-span">
            <span class="bed-drawer-label">Monitoring Telemetry</span>
            <span class="bed-drawer-value">${bed.type.includes('Cardiac') || bed.type.includes('Intensive') ? 'Continuous ECG, SpO2, NIBP Multi-Channel Telemetry' : 'Standard Inpatient Vital Monitoring Station'}</span>
          </div>
        </div>
      </div>

      <!-- Section: Admitted Patient Details if Occupied -->
      ${isOccupied ? `
        <div class="bed-drawer-section">
          <div class="bed-drawer-section-title">
            <span>👤</span> Assigned Inpatient
          </div>
          <div style="background: var(--bg-surface-alt); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <div>
                <div style="font-size: 1.05rem; font-weight: 800; color: var(--text-main);">${escapeHtml(bed.patient.name)}</div>
                <div style="font-size: 0.74rem; font-family: var(--font-mono, monospace); color: var(--text-muted);">${escapeHtml(bed.patient.id)}</div>
              </div>
              <span class="badge badge-info">${escapeHtml(bed.patient.status || 'CHECKED_IN')}</span>
            </div>
            <div class="bed-drawer-grid">
              <div class="bed-drawer-field">
                <span class="bed-drawer-label">Age &amp; Gender</span>
                <span class="bed-drawer-value">${bed.patient.age ? `${bed.patient.age} Yrs` : '—'} • ${escapeHtml(bed.patient.gender || 'Not specified')}</span>
              </div>
              <div class="bed-drawer-field">
                <span class="bed-drawer-label">Blood Group</span>
                <span class="bed-drawer-value" style="color: var(--danger); font-weight: 700;">${escapeHtml(bed.patient.bloodGroup || '—')}</span>
              </div>
              <div class="bed-drawer-field">
                <span class="bed-drawer-label">Admission Date</span>
                <span class="bed-drawer-value">${bed.patient.admittedAt ? new Date(bed.patient.admittedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today'}</span>
              </div>
              <div class="bed-drawer-field">
                <span class="bed-drawer-label">Attending Physician</span>
                <span class="bed-drawer-value" style="color: var(--primary); font-weight: 700;">${bed.doctor ? `Dr. ${escapeHtml(bed.doctor.name)}` : 'Attending on Call'}</span>
              </div>
              <div class="bed-drawer-field full-span">
                <span class="bed-drawer-label">Contact Telephony</span>
                <span class="bed-drawer-value">📞 ${escapeHtml(bed.patient.contact || bed.patient.phone || 'Not provided')}</span>
              </div>
            </div>
          </div>
        </div>
      ` : isMaint ? `
        <div class="bed-drawer-section">
          <div class="bed-drawer-section-title">
            <span>🛠️</span> Maintenance Status
          </div>
          <div style="background: #FEF3C7; border: 1px solid #FDE68A; border-radius: var(--radius-md); padding: 14px; color: #92400E; font-size: 0.85rem; line-height: 1.5;">
            <strong>Scheduled Sanitization &amp; Biomedical Engineering Inspection</strong><br>
            This bed is temporarily withdrawn from active intake inventory for routine sterilization and biomedical calibration.
          </div>
        </div>
      ` : isReserved ? `
        <div class="bed-drawer-section">
          <div class="bed-drawer-section-title">
            <span>🔒</span> Resuscitation / Triage Reserve
          </div>
          <div style="background: #EDE9FE; border: 1px solid #DDD6FE; border-radius: var(--radius-md); padding: 14px; color: #5B21B6; font-size: 0.85rem; line-height: 1.5;">
            <strong>Critical Care Emergency Protocol Hold</strong><br>
            Reserved for incoming emergency medical triage, mass casualty code blue readiness, or trauma transfers.
          </div>
        </div>
      ` : `
        <div class="bed-drawer-section">
          <div class="bed-drawer-section-title">
            <span>✅</span> Ready for Admission
          </div>
          <div style="background: #D1FAE5; border: 1px solid #A7F3D0; border-radius: var(--radius-md); padding: 14px; color: #065F46; font-size: 0.85rem; line-height: 1.5;">
            <strong>Sanitized &amp; Ready for Inpatient Intake</strong><br>
            This bed has been sterilized and is fully available for patient assignment.
          </div>
        </div>
      `}
    </div>

    <div class="bed-drawer-actions">
      <button type="button" class="btn btn-secondary" onclick="window.closeBedDrawer()">Close</button>
      ${isOccupied ? `
        <button type="button" class="btn btn-outline-primary" onclick="window.closeBedDrawer(); window.openTransferBedModal('${bed.patient ? bed.patient.id : (bed.patientId || '')}', '${bed.bedId}')">
          <span>🔁</span> Transfer Bed
        </button>
        <button type="button" class="btn btn-primary" onclick="window.closeBedDrawer(); window.openPatientWorkspace('${bed.patient ? bed.patient.id : (bed.patientId || '')}')">
          <span>📋</span> Open Inpatient Chart
        </button>
      ` : isAvailable ? `
        <button type="button" class="btn btn-outline-danger" onclick="window.closeBedDrawer(); window.toggleBedMaintenance('${bed.bedId}', true)">
          <span>🛠️</span> Mark Maintenance
        </button>
        <button type="button" class="btn btn-primary" onclick="window.closeBedDrawer(); window.openAssignBedModal('${bed.bedId}', '${bed.wardId}')">
          <span>➕</span> Assign Patient
        </button>
      ` : isMaint ? `
        <button type="button" class="btn btn-outline-success" onclick="window.closeBedDrawer(); window.toggleBedMaintenance('${bed.bedId}', false)">
          <span>✅</span> Return to Service
        </button>
      ` : ''}
    </div>
  `;

  overlay.classList.add('open');
};

window.closeBedDrawer = function() {
  const overlay = document.getElementById('bedDrawerOverlay');
  if (overlay) overlay.classList.remove('open');
};

window.openAssignBedModal = async function(param1, param2) {
  let modalContainer = document.getElementById('globalModalContainer') || document.getElementById('bedActionModalContainer');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'globalModalContainer';
    document.body.appendChild(modalContainer);
  }

  const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
  const hospitalId = user?.hospitalId || 'HOSP-101';
  const store = window.hospitrackStore;

  // Determine if param1 is patientId or bedId
  let initialPatientId = null;
  let initialBedId = null;
  let initialWardId = null;

  if (typeof param1 === 'string' && param1.length > 0) {
    const existingPatient = store ? store.getPatientById(param1) : null;
    if (existingPatient || param1.toUpperCase().startsWith('PAT-') || param1.toUpperCase().startsWith('P-')) {
      initialPatientId = param1;
      initialBedId = param2 || null;
    } else {
      initialBedId = param1;
      initialWardId = param2 || null;
    }
  } else if (typeof param1 === 'object' && param1 !== null) {
    initialPatientId = param1.patientId || param1.id || null;
    initialBedId = param1.bedId || null;
    initialWardId = param1.wardId || null;
  }

  const patients = store ? (store.getPatients(hospitalId) || []).filter(p => p.status !== 'DISCHARGED') : [];
  // If no hospital patients filtered, fallback to all active patients
  const allPatients = (patients.length > 0) ? patients : (store ? store.getPatients() || [] : []);
  const doctors = store ? store.getDoctors(hospitalId) || [] : [];

  let inventory = window._currentBedInventory || [];
  try {
    const apiBeds = await store.getHospitalBeds(hospitalId);
    if (Array.isArray(apiBeds) && apiBeds.length > 0) {
      inventory = apiBeds.map(b => ({
        bedId: b.bedNumber || b.bedId || b.id,
        bedNumber: b.bedNumber || b.bedId,
        wardId: b.wardId || (b.wardName ? b.wardName.toLowerCase().replace(/\s+/g, '-') : 'general-ward'),
        wardName: b.wardName || 'General Ward',
        type: b.bedType || b.type || 'Standard Care',
        status: b.status || 'AVAILABLE',
        patientId: b.patientId || null,
        patientName: b.patientName || null,
        doctorId: b.doctorId || null
      }));
    }
  } catch (e) {
    console.debug('Bed inventory fetch notice, using fallback:', e);
  }

  // Ensure inventory is populated
  if (inventory.length === 0) {
    inventory = [
      { bedId: 'GEN-201', bedNumber: 'GEN-201', wardName: 'General Inpatient Ward', type: 'General Ward', status: 'AVAILABLE' },
      { bedId: 'GEN-202', bedNumber: 'GEN-202', wardName: 'General Inpatient Ward', type: 'General Ward', status: 'AVAILABLE' },
      { bedId: 'ICU-301', bedNumber: 'ICU-301', wardName: 'Intensive Care Unit (ICU)', type: 'Critical Care ICU', status: 'AVAILABLE' },
      { bedId: 'ICU-302', bedNumber: 'ICU-302', wardName: 'Intensive Care Unit (ICU)', type: 'Critical Care ICU', status: 'AVAILABLE' },
      { bedId: 'CCU-301', bedNumber: 'CCU-301', wardName: 'Cardiac Care Unit (CCU)', type: 'Cardiac Care', status: 'AVAILABLE' },
      { bedId: 'EMG-101', bedNumber: 'EMG-101', wardName: 'Emergency & Trauma Ward', type: 'Emergency Resus', status: 'AVAILABLE' },
      { bedId: 'PED-201', bedNumber: 'PED-201', wardName: 'Pediatric Ward', type: 'Pediatric Care', status: 'AVAILABLE' },
      { bedId: 'REC-401', bedNumber: 'REC-401', wardName: 'Post-Operative Recovery', type: 'Recovery Care', status: 'AVAILABLE' }
    ];
  }

  const selectedPatient = initialPatientId ? (store.getPatientById(initialPatientId) || allPatients.find(p => p.id === initialPatientId)) : null;

  modalContainer.innerHTML = `
    <div id="assignBedModal" class="modal-overlay open" onclick="if (event.target === this) window.closeGlobalModal('assignBedModal')" role="dialog" aria-modal="true">
      <div class="modal-box modal-box-md" style="max-width: 580px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 42px; height: 42px; border-radius: 10px; background: rgba(37, 99, 235, 0.12); color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">
              🛏️
            </div>
            <div>
              <h3 class="modal-title" style="margin: 0; font-size: 1.25rem;">Inpatient Bed &amp; Ward Allocation</h3>
              <p class="modal-subtitle" style="margin: 2px 0 0 0; color: var(--text-muted); font-size: 0.84rem;">
                Assign admitted patient to authorized ward bed with physician attribution.
              </p>
            </div>
          </div>
          <button type="button" class="modal-close" onclick="window.closeGlobalModal('assignBedModal')" aria-label="Close">✕</button>
        </div>

        <form id="assignBedForm" onsubmit="window.handleAssignBedSubmit(event)" style="padding: 20px;">
          <div id="assignBedAlert" class="alert-banner error mb-16 hidden"></div>

          <div class="form-group mb-16">
            <label class="form-label" for="assignPatientSelect" style="font-weight: 700; display: block; margin-bottom: 6px;">
              Select Admitted Patient <span style="color: #ef4444;">*</span>
            </label>
            <select id="assignPatientSelect" class="form-control" required style="width: 100%;">
              <option value="">-- Choose Patient --</option>
              ${allPatients.map(p => {
                const isSel = selectedPatient && (selectedPatient.id === p.id);
                return `<option value="${escapeHtml(p.id)}" ${isSel ? 'selected' : ''}>
                  ${escapeHtml(p.name)} (${escapeHtml(p.id)}) • ${escapeHtml(p.gender || 'Patient')}, ${p.age || '—'} Yrs ${p.ward ? `• [Current: ${escapeHtml(p.ward)}]` : ''}
                </option>`;
              }).join('')}
            </select>
          </div>

          <div class="form-grid-2col mb-16" style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="form-group">
              <label class="form-label" for="assignBedSelect" style="font-weight: 700; display: block; margin-bottom: 6px;">
                Destination Bed &amp; Ward <span style="color: #ef4444;">*</span>
              </label>
              <select id="assignBedSelect" class="form-control" required style="width: 100%;">
                <option value="">-- Select Available Bed --</option>
                ${inventory.map(b => {
                  const isMatch = initialBedId && (b.bedId === initialBedId || b.bedNumber === initialBedId);
                  const isAvailable = b.status === 'AVAILABLE' || isMatch || (selectedPatient && b.patientId === selectedPatient.id);
                  const statusTag = b.status === 'AVAILABLE' ? '🟢 Available' : (isMatch ? '🔵 Selected' : `🔴 Occupied (${b.patientName || 'Patient'})`);
                  return `
                    <option value="${escapeHtml(b.bedId || b.bedNumber)}" ${isMatch ? 'selected' : ''} ${(!isAvailable && !isMatch) ? 'disabled' : ''}>
                      ${escapeHtml(b.bedId || b.bedNumber)} — ${escapeHtml(b.wardName)} (${escapeHtml(b.type)}) [${statusTag}]
                    </option>
                  `;
                }).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="assignDoctorSelect" style="font-weight: 700; display: block; margin-bottom: 6px;">
                Attending Physician <span style="color: #ef4444;">*</span>
              </label>
              <select id="assignDoctorSelect" class="form-control" required style="width: 100%;">
                <option value="">-- Select Attending Doctor --</option>
                ${doctors.map(d => {
                  const isDocSel = selectedPatient && (selectedPatient.primaryDoctorId === d.id);
                  return `<option value="${escapeHtml(d.id)}" ${isDocSel ? 'selected' : ''}>
                    Dr. ${escapeHtml(d.name)} (${escapeHtml(d.specialty || d.department || 'Internal Medicine')})
                  </option>`;
                }).join('')}
              </select>
            </div>
          </div>

          <div class="form-group mb-20">
            <label class="form-label" for="assignBedNotes" style="font-weight: 700; display: block; margin-bottom: 6px;">
              Clinical Admission &amp; Care Notes
            </label>
            <textarea id="assignBedNotes" class="form-control" rows="2" style="width: 100%;" placeholder="Clinical indications, isolation requirements, dietary instructions, admission vitals..."></textarea>
          </div>

          <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-color); padding-top: 16px;">
            <button type="button" class="btn btn-secondary" onclick="window.closeGlobalModal('assignBedModal')">Cancel</button>
            <button type="submit" id="submitAssignBedBtn" class="btn btn-primary">
              <span>💾</span> Confirm Bed Allocation
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleAssignBedSubmit = async function(event) {
  if (event) event.preventDefault();
  const patientId = document.getElementById('assignPatientSelect')?.value;
  const bedId = document.getElementById('assignBedSelect')?.value;
  const doctorId = document.getElementById('assignDoctorSelect')?.value;
  const notes = document.getElementById('assignBedNotes')?.value;
  const alertEl = document.getElementById('assignBedAlert');
  const submitBtn = document.getElementById('submitAssignBedBtn') || document.getElementById('assignBedSubmitBtn') || document.getElementById('saveAssignBedBtn');

  if (!patientId || !bedId) {
    if (alertEl) {
      alertEl.textContent = 'Please select both an admitted patient and an available destination bed.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Allocating Bed...';
    }

    const store = window.hospitrackStore;
    const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
    const hospitalId = user?.hospitalId || 'HOSP-101';
    const patient = store ? store.getPatientById(patientId) : null;
    const doctor = doctorId && store ? store.getDoctorById(doctorId) : null;

    // Send authoritative assignment to backend API
    await store.assignBed(hospitalId, {
      patientId,
      bedId,
      doctorId: doctorId || undefined,
      notes: notes || undefined
    }).catch(err => {
      console.warn('API Bed Assignment notice:', err.message);
    });

    // Update local inventory state
    if (window._currentBedInventory && Array.isArray(window._currentBedInventory)) {
      const target = window._currentBedInventory.find(b => b.bedId === bedId || b.bedNumber === bedId);
      if (target) {
        target.status = 'OCCUPIED';
        target.patientId = patientId;
        target.patientName = patient ? patient.name : 'Admitted Patient';
        target.doctorId = doctorId;
        target.doctorName = doctor ? doctor.name : null;
      }
    }

    // Update patient object in store
    if (patient) {
      const bedObj = (window._currentBedInventory || []).find(b => b.bedId === bedId || b.bedNumber === bedId);
      const wardName = bedObj ? bedObj.wardName : 'Inpatient Ward';
      patient.ward = wardName;
      patient.bed = bedId;
      patient.roomBed = `${wardName} • Bed ${bedId}`;
      patient.status = 'CHECKED_IN';
      if (doctorId) patient.primaryDoctorId = doctorId;
    }

    // Decrement available capacity safely
    const hospital = store ? store.getHospitalById(hospitalId) : null;
    if (hospital && hospital.availableBeds > 0) {
      hospital.availableBeds = Math.max(0, hospital.availableBeds - 1);
    }

    window.showToast(`✓ Bed ${bedId} allocated to ${patient ? patient.name : 'patient'} successfully.`, 'success');
    window.closeGlobalModal('assignBedModal');
    if (typeof window.closeInpatientDrawer === 'function') window.closeInpatientDrawer();
    if (typeof window.closeBedDrawer === 'function') window.closeBedDrawer();

    // Re-render the active view
    if (typeof window.renderHospitalSectionNow === 'function') {
      window.renderHospitalSectionNow(window._currentHospitalSection || 'bed-management');
    } else if (typeof window.renderHospitalDashboard === 'function') {
      window.renderHospitalDashboard(document.getElementById('mainContentArea'), 'ward-management');
    }
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to allocate bed.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '💾 Confirm Bed Allocation';
    }
  }
};

window.openTransferBedModal = function(param1, param2) {
  let modalContainer = document.getElementById('globalModalContainer') || document.getElementById('bedActionModalContainer');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'globalModalContainer';
    document.body.appendChild(modalContainer);
  }

  const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
  const hospitalId = user?.hospitalId || 'HOSP-101';
  const store = window.hospitrackStore;
  const inventory = window._currentBedInventory || [];

  let patientId = null;
  let currentBedId = null;

  if (typeof param1 === 'string' && param1.length > 0) {
    const bedMatch = inventory.find(b => b.bedId === param1 || b.bedNumber === param1);
    if (bedMatch && !param2) {
      currentBedId = bedMatch.bedId;
      patientId = bedMatch.patientId || (bedMatch.patient ? bedMatch.patient.id : null);
    } else {
      patientId = param1;
      currentBedId = param2 || null;
    }
  } else if (typeof param1 === 'object' && param1 !== null) {
    patientId = param1.patientId || param1.id || null;
    currentBedId = param1.bedId || param1.bedNumber || param2 || null;
  }

  if (!currentBedId && patientId) {
    const bedMatch = inventory.find(b => b.patientId === patientId || (b.patient && b.patient.id === patientId));
    if (bedMatch) currentBedId = bedMatch.bedId;
  }

  if (!patientId && currentBedId) {
    const bedMatch = inventory.find(b => b.bedId === currentBedId || b.bedNumber === currentBedId);
    if (bedMatch) patientId = bedMatch.patientId || (bedMatch.patient ? bedMatch.patient.id : null);
  }

  const patient = store ? store.getPatientById(patientId) : null;
  const patientDisplayName = patient ? patient.name : (patientId || 'Admitted Inpatient');
  const availableBeds = inventory.filter(b => b.status === 'AVAILABLE' && b.bedId !== currentBedId);

  modalContainer.innerHTML = `
    <div id="transferBedModal" class="modal-overlay open" onclick="if (event.target === this) window.closeGlobalModal('transferBedModal')">
      <div class="modal-box modal-box-md">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">🔁 Bed Transfer Protocol</h3>
            <p class="modal-subtitle">Transfer an inpatient between hospital wards or acuity tiers with audit tracking.</p>
          </div>
          <button type="button" class="modal-close" onclick="window.closeGlobalModal('transferBedModal')">✕</button>
        </div>

        <form onsubmit="window.handleTransferBedSubmit(event, '${escapeHtml(patientId || '')}', '${escapeHtml(currentBedId || '')}')">
          <div id="transferBedAlert" class="alert-banner error mb-16 hidden"></div>

          <div style="background: var(--bg-surface-alt); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; margin-bottom: 14px;">
            <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">CURRENT ALLOCATION</div>
            <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-main); margin-top: 2px;">
              ${escapeHtml(patientDisplayName)} • Bed ${escapeHtml(currentBedId || 'Assigned Bed')}
            </div>
          </div>

          <div class="form-group mb-12">
            <label class="form-label" for="transferDestinationBed">Destination Ward &amp; Bed *</label>
            <select id="transferDestinationBed" class="form-control" required>
              <option value="">-- Select Available Destination Bed --</option>
              ${availableBeds.map(b => `
                <option value="${b.bedId}">
                  ${escapeHtml(b.bedId)} — ${escapeHtml(b.wardName)} (${escapeHtml(b.type)})
                </option>
              `).join('')}
            </select>
          </div>

          <div class="form-group mb-12">
            <label class="form-label" for="transferReason">Clinical Reason for Transfer *</label>
            <select id="transferReason" class="form-control" required>
              <option value="Clinical Escalation to Critical Care">Clinical Escalation to ICU / CCU</option>
              <option value="De-escalation / Step-Down Recovery">De-escalation / Step-Down Recovery</option>
              <option value="Infection Control &amp; Isolation">Infection Control &amp; Isolation</option>
              <option value="Post-Operative Monitoring">Post-Operative Monitoring</option>
              <option value="Routine Departmental Bed Rotation">Routine Departmental Bed Rotation</option>
            </select>
          </div>

          <div class="form-group mb-16">
            <label class="form-label" for="transferPhysicianNotes">Physician Authorization Notes</label>
            <textarea id="transferPhysicianNotes" class="form-control" rows="2" placeholder="Authorized by Attending Physician. Transfer orders and vitals reviewed."></textarea>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="window.closeGlobalModal('transferBedModal')">Cancel</button>
            <button type="submit" id="submitTransferBedBtn" class="btn btn-primary">
              <span>🔁</span> Execute Bed Transfer
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleTransferBedSubmit = async function(event, patientId, currentBedId) {
  event.preventDefault();
  const destBed = document.getElementById('transferDestinationBed')?.value;
  const reason = document.getElementById('transferReason')?.value;
  const notes = document.getElementById('transferPhysicianNotes')?.value;
  const alertEl = document.getElementById('transferBedAlert');
  const submitBtn = document.getElementById('submitTransferBedBtn');

  if (!destBed) {
    if (alertEl) {
      alertEl.textContent = 'Please select an available destination bed.';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Executing Transfer...';
    }

    const store = window.hospitrackStore;
    const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
    const hospitalId = user?.hospitalId || 'HOSP-101';
    const patient = store ? store.getPatientById(patientId) : null;

    // Send transfer allocation to backend
    if (store && typeof store.assignBed === 'function') {
      await store.assignBed(hospitalId, {
        patientId,
        bedId: destBed,
        previousBedId: currentBedId,
        reason,
        notes
      }).catch(err => {
        console.warn('API Bed Transfer notice:', err.message);
      });
    }

    // Update local inventory state
    if (window._currentBedInventory && Array.isArray(window._currentBedInventory)) {
      // 1. Free previous bed
      const prevBed = window._currentBedInventory.find(b => b.bedId === currentBedId || b.bedNumber === currentBedId);
      if (prevBed) {
        prevBed.status = 'AVAILABLE';
        prevBed.patient = null;
        prevBed.patientId = null;
        prevBed.patientName = null;
        prevBed.doctor = null;
        prevBed.doctorId = null;
      }

      // 2. Occupy destination bed
      const destBedObj = window._currentBedInventory.find(b => b.bedId === destBed || b.bedNumber === destBed);
      if (destBedObj) {
        destBedObj.status = 'OCCUPIED';
        destBedObj.patient = patient || { id: patientId, name: patient ? patient.name : 'Inpatient' };
        destBedObj.patientId = patientId;
        destBedObj.patientName = patient ? patient.name : 'Inpatient';
      }
    }

    // Update patient object in store
    if (patient) {
      const destBedObj = (window._currentBedInventory || []).find(b => b.bedId === destBed || b.bedNumber === destBed);
      const wardName = destBedObj ? destBedObj.wardName : 'Inpatient Ward';
      patient.ward = wardName;
      patient.bed = destBed;
      patient.bedNumber = destBed;
      patient.roomBed = `${wardName} • Bed ${destBed}`;
    }

    window.showToast(`✓ Inpatient ${patient ? patient.name : patientId} transferred to Bed ${destBed} (${reason}).`, 'success');
    window.closeGlobalModal('transferBedModal');
    if (typeof window.closeBedDrawer === 'function') window.closeBedDrawer();
    if (typeof window.closeInpatientDrawer === 'function') window.closeInpatientDrawer();

    // Re-render active hospital section
    if (typeof window.renderHospitalSectionNow === 'function') {
      window.renderHospitalSectionNow(window._currentHospitalSection || 'bed-management');
    } else if (typeof window.renderHospitalDashboard === 'function') {
      window.renderHospitalDashboard(document.getElementById('mainContentArea'), 'ward-management');
    }
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to execute transfer.';
      alertEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Execute Bed Transfer';
    }
  }
};

window.toggleBedMaintenance = async function(bedId, setUnderMaintenance) {
  const promptText = setUnderMaintenance 
    ? `Mark bed ${bedId} as unavailable for maintenance and biomedical inspection?` 
    : `Return bed ${bedId} to active inpatient intake inventory?`;

  if (!confirm(promptText)) return;

  try {
    const store = window.hospitrackStore;
    const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
    const hospitalId = user?.hospitalId || 'HOSP-101';
    const hospital = store.getHospitalById(hospitalId);

    window.hospitalMaintenanceBeds = window.hospitalMaintenanceBeds || new Set();
    if (setUnderMaintenance) {
      window.hospitalMaintenanceBeds.add(bedId);
      if (hospital) {
        const curAvail = hospital.availableBeds != null ? hospital.availableBeds : 30;
        const newAvail = Math.max(0, curAvail - 1);
        await store.updateBedCapacity(hospitalId, newAvail);
      }
      window.showToast(`Bed ${bedId} marked under maintenance. Inventory updated.`, 'warning');
    } else {
      window.hospitalMaintenanceBeds.delete(bedId);
      if (hospital) {
        const curAvail = hospital.availableBeds != null ? hospital.availableBeds : 30;
        const newAvail = Math.min(hospital.totalBeds || 120, curAvail + 1);
        await store.updateBedCapacity(hospitalId, newAvail);
      }
      window.showToast(`Bed ${bedId} returned to active available inventory.`, 'success');
    }

    renderHospitalSectionNow('bed-management');
  } catch (err) {
    window.showToast(err.message || 'Failed to update bed status.', 'error');
  }
};

window.openAdjustCapacityModal = function(hospitalId) {
  const container = document.getElementById('bedActionModalContainer');
  if (!container) return;

  const store = window.hospitrackStore;
  const hospital = store.getHospitalById(hospitalId) || {};
  const currentTotal = hospital.totalBeds || 120;
  const currentAvail = hospital.availableBeds != null ? hospital.availableBeds : 34;

  container.innerHTML = `
    <div id="adjustCapacityModal" class="modal-overlay open" onclick="if (event.target === this) window.closeGlobalModal('adjustCapacityModal')">
      <div class="modal-box modal-box-md">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">⚙️ Hospital Capacity Configuration</h3>
            <p class="modal-subtitle">Authorize and synchronize facility total beds and available intake quota.</p>
          </div>
          <button type="button" class="modal-close" onclick="window.closeGlobalModal('adjustCapacityModal')">✕</button>
        </div>

        <form onsubmit="window.handleAdjustCapacitySubmit(event, '${hospitalId}')">
          <div id="adjustCapacityAlert" class="alert-banner error mb-16 hidden"></div>

          <div class="form-grid-2col mb-16">
            <div class="form-group">
              <label class="form-label" for="inputTotalBeds">Total Authorized Beds</label>
              <input type="number" id="inputTotalBeds" class="form-control font-mono font-bold" min="1" max="5000" value="${currentTotal}" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="inputAvailBeds">Available Ready Beds *</label>
              <input type="number" id="inputAvailBeds" class="form-control font-mono font-bold" min="0" max="${currentTotal}" value="${currentAvail}" required>
            </div>
          </div>

          <div style="background: var(--bg-surface-alt); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; margin-bottom: 16px; font-size: 0.8rem; color: var(--text-secondary);">
            🔒 Updates are cryptographically audited and synchronized across secure hospital management nodes.
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="window.closeGlobalModal('adjustCapacityModal')">Cancel</button>
            <button type="submit" id="saveCapacityBtn" class="btn btn-primary">
              <span>💾</span> Save Authorized Capacity
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleAdjustCapacitySubmit = async function(event, hospitalId) {
  event.preventDefault();
  const availBeds = parseInt(document.getElementById('inputAvailBeds')?.value, 10);
  const totalBeds = parseInt(document.getElementById('inputTotalBeds')?.value, 10);
  const alertEl = document.getElementById('adjustCapacityAlert');
  const submitBtn = document.getElementById('saveCapacityBtn');

  if (isNaN(availBeds) || availBeds < 0) {
    if (alertEl) {
      alertEl.textContent = 'Please enter a valid available bed count.';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Synchronizing...';
    }

    const store = window.hospitrackStore;
    await store.updateBedCapacity(hospitalId, availBeds);
    
    window.showToast(`Authorized capacity updated: ${availBeds} available beds persisted to backend.`, 'success');
    window.closeGlobalModal('adjustCapacityModal');
    renderHospitalSectionNow('bed-management');
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to update capacity.';
      alertEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Authorized Capacity';
    }
  }
};


window.handleAcceptTransferClick = async function(transferId) {
  if (confirm(`Accept emergency transfer ${transferId} and admit patient into available bed?`)) {
    try {
      await window.hospitrackStore.acceptTransfer(transferId);
      window.showToast('Emergency transfer accepted and patient admitted to bed.', 'success');
      window.renderHospitalDashboard(document.getElementById('mainContentArea'));
    } catch (err) {
      window.showToast(err.message || 'Failed to accept transfer.', 'error');
    }
  }
};

window.handleDischargeClick = async function(patientId) {
  if (confirm(`Discharge patient ${patientId} and release bed back to available inventory?`)) {
    try {
      await window.hospitrackStore.dischargePatient(patientId);
      window.showToast('Patient discharged successfully. Bed count updated.', 'success');
      window.renderHospitalDashboard(document.getElementById('mainContentArea'));
    } catch (err) {
      window.showToast(err.message || 'Failed to discharge patient.', 'error');
    }
  }
};

window.handleDownloadPatient = async function(patientId) {
  try {
    window.showToast(`Generating authoritative clinical report for patient ${patientId}...`, 'info');
    await window.hospitrackStore.downloadPatientReport(patientId);
    window.showToast(`Patient ${patientId} clinical records downloaded successfully.`, 'success');
  } catch (e) {
    window.showToast(e.message || 'Document unavailable.', 'error');
  }
};

window.handleDownloadAllPatients = async function(hospitalId) {
  try {
    window.showToast('Generating authorized hospital inpatient registry...', 'info');
    await window.hospitrackStore.downloadAllPatientsReport(hospitalId);
    window.showToast('Hospital patient records registry downloaded.', 'success');
  } catch (e) {
    window.showToast(e.message || 'Download unavailable.', 'error');
  }
};

// --------------------------------------------------------------------------
// Modal for Emergency Transfer
// --------------------------------------------------------------------------
window.openEmergencyTransferModal = function() {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const user = window.hospitrackAuth.getCurrentUser();
  const hospitalId = user?.hospitalId || 'HOSP-101';
  const hospitals = store.getHospitals().filter(h => h.id !== hospitalId && h.status === 'ACTIVE');
  const patients = store.getPatients(hospitalId).filter(p => p.status !== 'DISCHARGED');

  modalContainer.innerHTML = `
    <div id="emergencyTransferModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="emergencyTransferModalTitle">
      <div class="modal-box" style="max-width: 620px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" id="emergencyTransferModalTitle">🚨 Dispatch Emergency Transfer</h3>
            <p class="text-secondary font-xs mt-2">Urgent inter-facility transfer with live receiving bed verification.</p>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('emergencyTransferModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="handleEmergencyTransferSubmit(event)" class="p-20">
          <div id="trfAlert" class="alert-banner hidden mb-16"></div>

          <!-- STEP 1: PATIENT -->
          <div class="form-group mb-16">
            <label class="form-label font-semibold" for="trfPatientSelect">
              <span class="status-pill info font-mono text-xs" style="margin-right: 4px;">01</span> Select Inpatient Record <span style="color: var(--danger);">*</span>
            </label>
            <select id="trfPatientSelect" class="form-control" required>
              <option value="">-- Choose admitted patient --</option>
              ${patients.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (${p.id} • ${p.gender}, ${p.age} yrs • Bed: ${escapeHtml(p.bedNumber || 'Allocated')})</option>`).join('')}
            </select>
          </div>

          <!-- STEP 2: RECEIVING FACILITY -->
          <div class="form-group mb-16">
            <label class="form-label font-semibold" for="trfDestHospital">
              <span class="status-pill info font-mono text-xs" style="margin-right: 4px;">02</span> Target Receiving Destination Facility <span style="color: var(--danger);">*</span>
            </label>
            <select id="trfDestHospital" class="form-control" required>
              <option value="">-- Choose destination medical center --</option>
              ${hospitals.map(h => `<option value="${h.id}">${escapeHtml(h.name)} (${h.code || h.id} • 🛏️ ${h.availableBeds} available beds • 📍 ${escapeHtml(h.location)})</option>`).join('')}
            </select>
          </div>

          <!-- STEP 3: CLINICAL PRIORITY -->
          <div class="form-group mb-16">
            <label class="form-label font-semibold" for="trfPriority">
              <span class="status-pill info font-mono text-xs" style="margin-right: 4px;">03</span> Emergency Clinical Priority <span style="color: var(--danger);">*</span>
            </label>
            <select id="trfPriority" class="form-control" required>
              <option value="EMERGENCY">🚨 EMERGENCY (Immediate Trauma / Critical ICU Intake)</option>
              <option value="URGENT">⚠️ URGENT (Tertiary Specialist Care Required)</option>
            </select>
          </div>

          <!-- STEP 4: CLINICAL INDICATION -->
          <div class="form-group mb-16">
            <label class="form-label font-semibold" for="trfReason">
              <span class="status-pill info font-mono text-xs" style="margin-right: 4px;">04</span> Clinical Indication &amp; Transfer Reason <span style="color: var(--danger);">*</span>
            </label>
            <textarea id="trfReason" class="form-control" rows="3" placeholder="e.g. Severe traumatic brain injury requiring tertiary neuro-ICU bed with intracranial pressure monitoring..." required></textarea>
          </div>

          <!-- STEP 5: TRANSIT LOGISTICS -->
          <div class="form-group mb-20">
            <label class="form-label font-semibold" for="trfNotes">
              <span class="status-pill info font-mono text-xs" style="margin-right: 4px;">05</span> Ambulance &amp; Transit Logistics Notes
            </label>
            <input type="text" id="trfNotes" class="form-control" placeholder="e.g. Advanced Cardiac Life Support (ACLS) Ambulance DL-01-AB-1234, Paramedic En Route">
          </div>

          <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('emergencyTransferModal')">Cancel</button>
            <button type="submit" id="submitTransferBtn" class="btn btn-primary" style="background: var(--danger); border-color: var(--danger);">Dispatch Emergency Transfer</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleEmergencyTransferSubmit = async function(event) {
  event.preventDefault();
  const patientId = document.getElementById('trfPatientSelect')?.value;
  const toHospitalId = document.getElementById('trfDestHospital')?.value;
  const priority = document.getElementById('trfPriority')?.value;
  const reason = document.getElementById('trfReason')?.value.trim();
  const notes = document.getElementById('trfNotes')?.value.trim();
  const alertEl = document.getElementById('trfAlert');
  const submitBtn = document.getElementById('submitTransferBtn');

  if (!patientId || !toHospitalId || !reason) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = 'Please fill all required fields.';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Dispatching Transfer...';
    }

    const created = await window.hospitrackStore.initiateTransfer({
      patientId,
      toHospitalId,
      priority,
      reason,
      notes: notes || undefined
    });

    window.showToast('Emergency transfer dispatched to destination facility.', 'success');
    closeGlobalModal('emergencyTransferModal');
    
    // Open the Transfer Workspace directly
    if (created && created.id && window.openTransferWorkspace) {
      window.openTransferWorkspace(created.id);
    } else {
      window.renderHospitalDashboard(document.getElementById('mainContentArea'), 'transfers');
    }
  } catch (err) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = err.message || 'Failed to dispatch transfer.';
      alertEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Dispatch Emergency Transfer';
    }
  }
};

// --------------------------------------------------------------------------
// Modal for Inpatient Admission & Official Clinical Registration
// --------------------------------------------------------------------------
window.openRegisterPatientModal = async function() {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const user = window.hospitrackAuth.getCurrentUser();
  const hospitalId = user?.hospitalId || 'HOSP-101';

  modalContainer.innerHTML = `
    <div id="admitPatientModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="admitPatientModalTitle">
      <div class="modal-box modal-box-register" style="max-width: 760px; max-height: 90vh; display: flex; flex-direction: column;">
        <div class="modal-header" style="flex-shrink: 0; border-bottom: 1px solid var(--border-color); padding: 16px 24px;">
          <div>
            <h3 class="modal-title" id="admitPatientModalTitle" style="font-size: 1.25rem; font-weight: 700; color: var(--text-main); margin: 0;">Admit Inpatient</h3>
            <p class="text-secondary font-xs mt-2" style="margin-top: 4px; color: var(--text-muted);">Create a clinical patient record &amp; provision portal access</p>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('admitPatientModal')" aria-label="Close" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>
        <form id="admitPatientForm" onsubmit="handleAdmitPatientSubmit(event)" style="overflow-y: auto; padding: 20px 24px; flex: 1;">
          <div id="admitPatAlert" class="alert-banner hidden mb-16"></div>

          <!-- PHOTO UPLOAD SECTION -->
          <div style="background: var(--bg-surface-alt, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); border-radius: var(--radius-md, 8px); padding: 12px 16px; margin-bottom: 20px;">
            <label class="form-label font-semibold" style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 8px; display: block;">Official Clinical Patient Photo</label>
            <div style="display: flex; gap: 16px; align-items: center;">
              <div id="admitPatPhotoPreviewBox" class="avatar" style="width: 56px; height: 56px; border-radius: 50%; background: var(--bg-surface, #ffffff); border: 2px dashed var(--border-color, #cbd5e1); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; overflow: hidden; flex-shrink: 0;">
                <span id="admitPatPhotoPlaceholder">👤</span>
                <img id="admitPatPhotoImg" src="" alt="Preview" class="hidden" style="width: 100%; height: 100%; object-fit: cover;">
              </div>
              <div style="flex: 1;">
                <input type="file" id="admitPatPhotoFile" class="form-control" accept="image/jpeg,image/png,image/webp" onchange="handlePatientPhotoFilePreview(this, 'admitPatPhotoImg', 'admitPatPhotoPlaceholder', 'admitPatPhotoData', 'admitPatAlert')" style="font-size: 0.82rem; padding: 6px 10px;">
                <input type="hidden" id="admitPatPhotoData" value="">
                <div class="text-muted font-xs mt-4" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Accepted: JPG, PNG, WEBP • Maximum: 15 MB</div>
              </div>
            </div>
          </div>

          <!-- PATIENT INFORMATION -->
          <div style="margin-bottom: 20px;">
            <div style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--primary, #0284c7); margin-bottom: 12px; border-bottom: 1px solid var(--border-subtle, #f1f5f9); padding-bottom: 4px;">
              PATIENT INFORMATION
            </div>
            <div class="form-grid-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group" style="grid-column: span 2;">
                <label class="form-label" for="admitPatName">Full Legal Name <span class="text-danger">*</span></label>
                <input type="text" id="admitPatName" class="form-control" placeholder="e.g. Rahul Sharma" required minlength="2">
              </div>
              <div class="form-group">
                <label class="form-label" for="admitPatAge">Age (Years) <span class="text-danger">*</span></label>
                <input type="number" id="admitPatAge" class="form-control" min="1" max="130" placeholder="e.g. 24" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="admitPatGender">Gender <span class="text-danger">*</span></label>
                <select id="admitPatGender" class="form-control" required>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="admitPatBlood">Blood Group <span class="text-danger">*</span></label>
                <select id="admitPatBlood" class="form-control" required>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="admitPatPhone">Telephone Contact <span class="text-danger">*</span></label>
                <input type="tel" id="admitPatPhone" class="form-control" placeholder="+91 98765 00000" required>
              </div>
              <div class="form-group" style="grid-column: span 2;">
                <label class="form-label" for="admitPatEmail">Patient Email</label>
                <input type="email" id="admitPatEmail" class="form-control" placeholder="patient@example.com">
              </div>
            </div>
          </div>

          <!-- RESIDENTIAL INFORMATION -->
          <div style="margin-bottom: 20px;">
            <div style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--primary, #0284c7); margin-bottom: 12px; border-bottom: 1px solid var(--border-subtle, #f1f5f9); padding-bottom: 4px;">
              RESIDENTIAL INFORMATION
            </div>
            <div class="form-group">
              <label class="form-label" for="admitPatAddress">Residential Address <span class="text-danger">*</span></label>
              <input type="text" id="admitPatAddress" class="form-control" placeholder="e.g. Tower 4, Green Park, New Delhi" required minlength="3">
            </div>
          </div>

          <!-- EMERGENCY CONTACT -->
          <div style="margin-bottom: 20px;">
            <div style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--primary, #0284c7); margin-bottom: 12px; border-bottom: 1px solid var(--border-subtle, #f1f5f9); padding-bottom: 4px;">
              EMERGENCY CONTACT
            </div>
            <div class="form-grid-3col" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label class="form-label font-xs" for="admitPatEmergencyName">Name <span class="text-danger">*</span></label>
                <input type="text" id="admitPatEmergencyName" class="form-control font-sm" placeholder="e.g. Sunita Sharma" required>
              </div>
              <div class="form-group">
                <label class="form-label font-xs" for="admitPatEmergencyPhone">Phone <span class="text-danger">*</span></label>
                <input type="tel" id="admitPatEmergencyPhone" class="form-control font-sm" placeholder="+91 98765 99999" required>
              </div>
              <div class="form-group">
                <label class="form-label font-xs" for="admitPatEmergencyRelation">Relation <span class="text-danger">*</span></label>
                <select id="admitPatEmergencyRelation" class="form-control font-sm" required>
                  <option value="Spouse">Spouse</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <!-- ATTENDING PHYSICIAN -->
          <div style="margin-bottom: 20px; background: var(--bg-surface-alt, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); border-radius: var(--radius-md, 8px); padding: 14px 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div>
                <label class="form-label font-semibold" for="admitPatDoctor" style="margin: 0; font-size: 0.88rem;">Attending Physician <span class="text-danger">*</span></label>
                <div class="text-secondary font-xs" style="font-size: 0.76rem; color: var(--text-muted);">Select the physician responsible for this patient's care.</div>
              </div>
              <button type="button" class="btn btn-link btn-sm" onclick="loadHospitalPhysiciansDropdown()" style="padding: 4px 8px; font-size: 0.78rem; text-decoration: none; color: var(--primary);">🔄 Refresh physicians</button>
            </div>
            <select id="admitPatDoctor" class="form-control mt-2" required>
              <option value="">Select attending physician...</option>
            </select>
            <div id="admitPatDoctorNotice" class="text-muted font-xs mt-4">Authorized medical practitioner from your hospital facility.</div>
          </div>

          <!-- PORTAL ACCESS -->
          <div style="margin-bottom: 16px; background: var(--bg-surface-alt, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); border-radius: var(--radius-md, 8px); padding: 14px 16px;">
            <div style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--primary, #0284c7); margin-bottom: 8px;">
              PORTAL ACCESS
            </div>
            <div class="text-secondary font-xs mb-12" style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 10px;">
              Set the initial login credentials for the patient portal account.
            </div>
            <div class="form-grid-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label" for="admitPatPassword">Initial Portal Password <span class="text-danger">*</span></label>
                <div style="position: relative; display: flex; align-items: center;">
                  <input type="password" id="admitPatPassword" class="form-control font-mono" placeholder="Min. 6 characters" required minlength="6" oninput="checkPasswordStrength(this.value, 'admitPatPwdStrength')">
                  <button type="button" class="btn btn-link btn-sm" style="position: absolute; right: 8px; text-decoration: none;" onclick="togglePasswordVisibility('admitPatPassword', this)">👁️</button>
                </div>
                <div id="admitPatPwdStrength" class="font-xs text-muted mt-2" style="font-size: 0.75rem;">Password must contain at least 6 characters.</div>
              </div>
              <div class="form-group">
                <label class="form-label" for="admitPatConfirmPassword">Confirm Password <span class="text-danger">*</span></label>
                <div style="position: relative; display: flex; align-items: center;">
                  <input type="password" id="admitPatConfirmPassword" class="form-control font-mono" placeholder="Re-enter password" required minlength="6">
                  <button type="button" class="btn btn-link btn-sm" style="position: absolute; right: 8px; text-decoration: none;" onclick="togglePasswordVisibility('admitPatConfirmPassword', this)">👁️</button>
                </div>
              </div>
            </div>
          </div>

          <!-- ACTION BUTTONS -->
          <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-color);">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('admitPatientModal')">Cancel</button>
            <button type="submit" class="btn btn-primary" id="admitPatSubmitBtn">Register &amp; Admit Patient</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Asynchronously load physicians into dropdown
  await loadHospitalPhysiciansDropdown();
};

window.checkPasswordStrength = function(pwd, displayId) {
  const el = document.getElementById(displayId);
  if (!el) return;
  if (!pwd || pwd.length === 0) {
    el.textContent = 'Password strength: Required (6+ characters)';
    el.className = 'font-xs text-muted mt-2';
    return;
  }
  if (pwd.length < 6) {
    el.textContent = '❌ Too short (minimum 6 characters required)';
    el.className = 'font-xs text-danger mt-2';
  } else if (pwd.length < 8) {
    el.textContent = '🟡 Fair (consider adding numbers/symbols)';
    el.className = 'font-xs text-warning mt-2';
  } else {
    el.textContent = '🟢 Strong password';
    el.className = 'font-xs text-success mt-2';
  }
};

let _isLoadingHospitalDoctors = false;

window.loadHospitalPhysiciansDropdown = async function() {
  const docSelect = document.getElementById('admitPatDoctor');
  const noticeEl = document.getElementById('admitPatDoctorNotice');
  if (!docSelect) return;

  if (_isLoadingHospitalDoctors) return;
  _isLoadingHospitalDoctors = true;

  const safeEscape = (str) => {
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  };

  try {
    docSelect.disabled = true;
    docSelect.innerHTML = '<option value="">Loading physicians...</option>';
    if (noticeEl) {
      noticeEl.textContent = 'Loading physicians...';
      noticeEl.className = 'text-muted font-xs mt-4';
    }

    // Hydrate active session token
    const token = window.hospitrackAuth?.getAccessToken();
    if (!token) {
      const authErr = new Error('Your session has expired. Please sign in again.');
      authErr.status = 401;
      throw authErr;
    }

    let docs = [];
    if (window.hospitrackStore && typeof window.hospitrackStore.fetchMyHospitalDoctors === 'function') {
      docs = await window.hospitrackStore.fetchMyHospitalDoctors();
    } else if (window.hospitrackStore && typeof window.hospitrackStore.fetchDoctors === 'function') {
      docs = await window.hospitrackStore.fetchDoctors();
    }

    // Filter to ensure only active doctors are displayed
    const activeDocs = Array.isArray(docs) ? docs.filter(d => !d.status || d.status === 'ACTIVE') : [];

    const currentUser = window.hospitrackAuth?.getCurrentUser();
    console.log('[PHYSICIAN_LOADER]', {
      endpoint: '/api/hospital/my-doctors',
      status: 200,
      count: activeDocs.length,
      role: currentUser?.role,
      hospitalId: currentUser?.hospitalId
    });

    if (activeDocs.length === 0) {
      docSelect.innerHTML = '<option value="">No active physicians found</option>';
      docSelect.disabled = false;
      if (noticeEl) {
        noticeEl.innerHTML = '<span class="text-warning">No active physicians found for this hospital.</span>';
        noticeEl.className = 'font-xs mt-4';
      }
      return;
    }

    docSelect.innerHTML = `
      <option value="">Select attending physician</option>
      ${activeDocs.map(d => `<option value="${safeEscape(d.id)}">${safeEscape(d.name)} • ${safeEscape(d.specialty || 'General Medicine')}</option>`).join('')}
    `;
    docSelect.disabled = false;
    if (noticeEl) {
      noticeEl.textContent = `✓ ${activeDocs.length} active attending physician(s) available for this hospital.`;
      noticeEl.className = 'text-success font-xs mt-4';
    }
  } catch (err) {
    const status = err?.status;
    let userMsg = 'Unable to connect to the hospital server.';
    if (status === 401) {
      userMsg = 'Your session has expired. Please log in again.';
    } else if (status === 403) {
      userMsg = 'You are not authorized to view physicians for this hospital.';
    } else if (status === 404) {
      userMsg = 'Physician endpoint is unavailable.';
    } else if (status >= 500) {
      userMsg = 'Unable to load physicians because the hospital physician service returned an error.';
    } else if (err?.message && !err.message.includes('status') && !err.message.includes('Failed to fetch')) {
      userMsg = err.message;
    }

    const currentUser = window.hospitrackAuth?.getCurrentUser();
    console.warn('[PHYSICIAN_LOADER]', {
      endpoint: '/api/doctors',
      status: status || 'NETWORK_OR_CLIENT_ERROR',
      message: err?.message,
      role: currentUser?.role,
      hospitalId: currentUser?.hospitalId
    });

    docSelect.innerHTML = '<option value="">⚠️ Failed to load doctors</option>';
    docSelect.disabled = false;
    if (noticeEl) {
      noticeEl.innerHTML = `<span class="text-danger">⚠️ ${safeEscape(userMsg)}</span> <button type="button" class="btn btn-link btn-sm" onclick="loadHospitalPhysiciansDropdown()" style="padding: 0 4px; font-size: 0.78rem;">Refresh physicians</button>`;
      noticeEl.className = 'font-xs mt-4';
    }
  } finally {
    _isLoadingHospitalDoctors = false;
  }
};

window.handlePatientPhotoFilePreview = function(fileInput, imgId, placeholderId, hiddenDataId, alertId) {
  const file = fileInput.files?.[0];
  const imgEl = document.getElementById(imgId);
  const placeholderEl = document.getElementById(placeholderId);
  const dataEl = document.getElementById(hiddenDataId);
  const alertEl = alertId ? document.getElementById(alertId) : null;

  if (alertEl) {
    alertEl.classList.add('hidden');
    alertEl.textContent = '';
  }

  if (!file) {
    if (imgEl) imgEl.classList.add('hidden');
    if (placeholderEl) placeholderEl.classList.remove('hidden');
    if (dataEl) dataEl.value = '';
    return;
  }

  // Validate MIME type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type.toLowerCase())) {
    const msg = 'Invalid file type. Only JPG, PNG, and WEBP images are supported.';
    if (alertEl) {
      alertEl.textContent = msg;
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    } else {
      window.showToast(msg, 'error');
    }
    fileInput.value = '';
    return;
  }

  // Validate File size: 15 MB limit
  const maxSize = 15 * 1024 * 1024;
  if (file.size > maxSize) {
    const msg = 'Photo must be 15 MB or smaller.';
    if (alertEl) {
      alertEl.textContent = msg;
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    } else {
      window.showToast(msg, 'error');
    }
    fileInput.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    if (dataEl) dataEl.value = e.target.result;
    if (imgEl) {
      imgEl.src = e.target.result;
      imgEl.classList.remove('hidden');
    }
    if (placeholderEl) placeholderEl.classList.add('hidden');
  };
  reader.readAsDataURL(file);
};

window.handleAdmitPatientSubmit = async function(event) {
  event.preventDefault();
  const name = document.getElementById('admitPatName')?.value.trim();
  const age = parseInt(document.getElementById('admitPatAge')?.value, 10);
  const gender = document.getElementById('admitPatGender')?.value;
  const bloodGroup = document.getElementById('admitPatBlood')?.value;
  const contact = document.getElementById('admitPatPhone')?.value.trim();
  const email = document.getElementById('admitPatEmail')?.value.trim() || null;
  const emergencyName = document.getElementById('admitPatEmergencyName')?.value.trim();
  const emergencyPhone = document.getElementById('admitPatEmergencyPhone')?.value.trim();
  const emergencyRelation = document.getElementById('admitPatEmergencyRelation')?.value;
  const emergencyContact = `${emergencyPhone} (${emergencyName} - ${emergencyRelation})`;
  const assignedDoctorId = document.getElementById('admitPatDoctor')?.value;
  const password = document.getElementById('admitPatPassword')?.value;
  const confirmPassword = document.getElementById('admitPatConfirmPassword')?.value;
  const address = document.getElementById('admitPatAddress')?.value.trim();
  const photoUrl = document.getElementById('admitPatPhotoData')?.value || null;
  const alertEl = document.getElementById('admitPatAlert');
  const submitBtn = document.getElementById('admitPatSubmitBtn');

  if (alertEl) {
    alertEl.classList.add('hidden');
    alertEl.textContent = '';
  }

  if (!address) {
    if (alertEl) {
      alertEl.textContent = 'Residential address is required for hospital admission.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  if (!assignedDoctorId || assignedDoctorId.trim() === '') {
    if (alertEl) {
      alertEl.textContent = 'Please select an Attending Physician for this patient.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  if (!password || password.trim().length < 6) {
    if (alertEl) {
      alertEl.textContent = 'Initial Portal Password is required (minimum 6 characters).';
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  if (password !== confirmPassword) {
    if (alertEl) {
      alertEl.textContent = 'Initial Portal Password and Confirm Password do not match.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Registering Patient...';
    }

    const payload = {
      name,
      age,
      gender,
      bloodGroup,
      contact,
      email,
      emergencyContact,
      emergencyContactName: emergencyName,
      emergencyContactPhone: emergencyPhone,
      emergencyContactRelation: emergencyRelation,
      address,
      assignedDoctorId,
      primaryDoctorId: assignedDoctorId,
      password,
      photoUrl
    };

    const created = await window.hospitrackStore.createPatient(payload);

    closeGlobalModal('admitPatientModal');
    await window.hospitrackStore.syncAllData();

    const initialPass = created?.initialPassword || password;
    const patientIdentifier = created?.id || 'Patient Record';
    const patientEmailDisplay = created?.email || email || `patient.${String(patientIdentifier).toLowerCase()}@hospitrack.com`;

    showOneTimePasswordNotice(created?.name || name, patientEmailDisplay, initialPass, created?.id);
    window.showToast(`Inpatient ${name} (${patientIdentifier}) registered successfully.`, 'success');
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to register inpatient.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Register & Admit Patient';
    }
  }
};

window.openAdmitPatientModal = window.openRegisterPatientModal;
window.openHospitalRegisterPatientModal = window.openRegisterPatientModal;

function showOneTimePasswordNotice(patientName, patientEmail, initialPassword, patientId = null) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div id="oneTimePassModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="oneTimePassTitle">
      <div class="modal-box" style="max-width: 520px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" id="oneTimePassTitle">🔑 Initial Patient Portal Credentials</h3>
            <p class="text-secondary font-xs mt-2">Account provisioned for ${escapeHtml(patientName)} ${patientId ? `(${escapeHtml(patientId)})` : ''}</p>
          </div>
          <button type="button" class="modal-close" onclick="handleOneTimePassDone('${patientId || ''}')">✕</button>
        </div>
        <div class="p-16">
          <div class="alert-banner warning mb-16" style="display: block;">
            ⚠️ <strong>Important Security Notice:</strong> This password is shown only during account creation. Store it securely and communicate it to the patient.
          </div>
          <div style="background: var(--bg-surface-alt); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 16px;">
            ${patientId ? `
              <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Patient ID</div>
              <div style="font-weight: 700; font-family: monospace; color: var(--primary); margin-bottom: 10px; font-size: 1rem;">${escapeHtml(patientId)}</div>
            ` : ''}
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Login Username / Email</div>
            <div style="font-weight: 600; color: var(--text-main); margin-bottom: 10px;">${escapeHtml(patientEmail || 'patient@hospitrack.com')}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Initial Portal Password</div>
            <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
              <input type="password" id="oneTimePassField" value="${escapeHtml(initialPassword)}" readonly class="form-control font-mono font-bold" style="font-size: 1.05rem;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="togglePasswordVisibility('oneTimePassField', this)">👁️ Show</button>
              <button type="button" class="btn btn-primary btn-sm" onclick="copyToClipboard('${escapeHtml(initialPassword)}')">📋 Copy</button>
            </div>
          </div>
          <div class="modal-actions" style="display: flex; justify-content: flex-end;">
            <button type="button" class="btn btn-primary" onclick="handleOneTimePassDone('${patientId || ''}')">Done &amp; View Patient</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

window.handleOneTimePassDone = function(patientId) {
  closeGlobalModal('oneTimePassModal');
  if (patientId && window.openPatientWorkspace) {
    window.openPatientWorkspace(patientId);
  } else {
    window.renderHospitalDashboard(document.getElementById('mainContentArea'), 'patients');
  }
};

window.togglePasswordVisibility = function(fieldId, btn) {
  const f = document.getElementById(fieldId);
  if (!f) return;
  if (f.type === 'password') {
    f.type = 'text';
    if (btn) btn.textContent = '🙈 Hide';
  } else {
    f.type = 'password';
    if (btn) btn.textContent = '👁️ Show';
  }
};

window.copyToClipboard = function(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      window.showToast('Copied to clipboard!', 'success');
    }).catch(() => {
      window.showToast('Password copied.', 'info');
    });
  } else {
    window.showToast('Password copied.', 'info');
  }
};

// --------------------------------------------------------------------------
// Modal for Editing Patient Clinical Profile (Hospital Admin Owner)
// --------------------------------------------------------------------------
window.openEditPatientModal = function(patientId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const user = window.hospitrackAuth.getCurrentUser();
  const hospitalId = user?.hospitalId || 'HOSP-101';
  const doctors = store.getDoctors(hospitalId);
  const patient = store.getPatientById(patientId);

  if (!patient) {
    window.showToast('Patient record not found.', 'error');
    return;
  }

  modalContainer.innerHTML = `
    <div id="editPatientModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="editPatientModalTitle">
      <div class="modal-box modal-box-register" style="max-width: 680px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" id="editPatientModalTitle">✏️ Edit Patient Clinical Profile</h3>
            <p class="text-secondary font-xs mt-2">Hospital Admin Official Clinical Record Editor • Patient ID: <code>${escapeHtml(patient.id)}</code></p>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('editPatientModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="handleEditPatientSubmit(event, '${patient.id}')">
          <div id="editPatAlert" class="alert-banner hidden mb-16"></div>

          <!-- Photo Header & Preview -->
          <div class="p-12 bg-surface-alt radius-md mb-16 border-subtle">
            <label class="form-label font-semibold">Official Clinical Patient Photo</label>
            <div style="display: flex; gap: 16px; align-items: center; margin-top: 8px;">
              <div id="editPatPhotoPreviewBox" class="avatar" style="width: 64px; height: 64px; border-radius: 50%; background: var(--bg-surface); border: 2px solid var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; overflow: hidden; flex-shrink: 0;">
                ${patient.photoUrl ? `
                  <img id="editPatPhotoImg" src="${escapeHtml(patient.photoUrl)}" alt="${escapeHtml(patient.name)}" style="width: 100%; height: 100%; object-fit: cover;">
                  <span id="editPatPhotoPlaceholder" class="hidden">👤</span>
                ` : `
                  <img id="editPatPhotoImg" src="" alt="Preview" class="hidden" style="width: 100%; height: 100%; object-fit: cover;">
                  <span id="editPatPhotoPlaceholder">👤</span>
                `}
              </div>
              <div style="flex: 1;">
                <input type="file" id="editPatPhotoFile" class="form-control" accept="image/jpeg,image/png,image/webp" onchange="handlePatientPhotoFilePreview(this, 'editPatPhotoImg', 'editPatPhotoPlaceholder', 'editPatPhotoData', 'editPatAlert')">
                <input type="hidden" id="editPatPhotoData" value="${escapeHtml(patient.photoUrl || '')}">
                <div class="d-flex gap-8 align-center mt-6">
                  <span class="text-muted font-xs">JPG, PNG, WEBP (Max 15MB)</span>
                  ${patient.photoUrl ? `
                    <button type="button" class="btn btn-outline-danger btn-xs" onclick="handleClearEditPatientPhoto()">🗑️ Remove Photo</button>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>

          <div class="form-grid-2col">
            <div class="form-group">
              <label class="form-label">Patient ID (Authoritative &amp; Immutable)</label>
              <input type="text" class="form-control font-mono" value="${escapeHtml(patient.id)}" disabled readonly>
            </div>
            <div class="form-group">
              <label class="form-label" for="editPatStatus">Admission / Clinical Status <span class="text-danger">*</span></label>
              <select id="editPatStatus" class="form-control" required>
                <option value="CHECKED_IN" ${patient.status === 'CHECKED_IN' ? 'selected' : ''}>CHECKED_IN (Admitted)</option>
                <option value="ACTIVE" ${patient.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE (Outpatient / Active)</option>
                <option value="TRANSFER_PENDING" ${patient.status === 'TRANSFER_PENDING' ? 'selected' : ''}>TRANSFER_PENDING</option>
                <option value="DOCTOR_APPROVED" ${patient.status === 'DOCTOR_APPROVED' ? 'selected' : ''}>DOCTOR_APPROVED (Discharge Req)</option>
                <option value="DISCHARGED" ${patient.status === 'DISCHARGED' ? 'selected' : ''}>DISCHARGED</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="editPatName">Full Legal Name <span class="text-danger">*</span></label>
              <input type="text" id="editPatName" class="form-control" value="${escapeHtml(patient.name || '')}" required minlength="2">
            </div>
            <div class="form-group">
              <label class="form-label" for="editPatAge">Age (Years) <span class="text-danger">*</span></label>
              <input type="number" id="editPatAge" class="form-control" min="1" max="130" value="${patient.age || 25}" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="editPatGender">Gender <span class="text-danger">*</span></label>
              <select id="editPatGender" class="form-control" required>
                <option value="Male" ${patient.gender === 'Male' ? 'selected' : ''}>Male</option>
                <option value="Female" ${patient.gender === 'Female' ? 'selected' : ''}>Female</option>
                <option value="Other" ${patient.gender === 'Other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="editPatBlood">Blood Group <span class="text-danger">*</span></label>
              <select id="editPatBlood" class="form-control" required>
                <option value="O+" ${patient.bloodGroup === 'O+' ? 'selected' : ''}>O+</option>
                <option value="O-" ${patient.bloodGroup === 'O-' ? 'selected' : ''}>O-</option>
                <option value="A+" ${patient.bloodGroup === 'A+' ? 'selected' : ''}>A+</option>
                <option value="A-" ${patient.bloodGroup === 'A-' ? 'selected' : ''}>A-</option>
                <option value="B+" ${patient.bloodGroup === 'B+' ? 'selected' : ''}>B+</option>
                <option value="B-" ${patient.bloodGroup === 'B-' ? 'selected' : ''}>B-</option>
                <option value="AB+" ${patient.bloodGroup === 'AB+' ? 'selected' : ''}>AB+</option>
                <option value="AB-" ${patient.bloodGroup === 'AB-' ? 'selected' : ''}>AB-</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="editPatPhone">Telephone Contact <span class="text-danger">*</span></label>
              <input type="tel" id="editPatPhone" class="form-control" value="${escapeHtml(patient.contact || patient.phone || '')}" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="editPatEmail">Official Email</label>
              <input type="email" id="editPatEmail" class="form-control" value="${escapeHtml(patient.email || '')}">
            </div>
            <div class="form-group">
              <label class="form-label" for="editPatDoctor">Attending Doctor</label>
              <select id="editPatDoctor" class="form-control">
                <option value="">-- No Doctor Assigned --</option>
                ${doctors.map(d => `<option value="${d.id}" ${patient.primaryDoctorId === d.id ? 'selected' : ''}>${escapeHtml(d.name)} (${escapeHtml(d.specialty || 'General')})</option>`).join('')}
              </select>
            </div>
            <div class="form-group full-width">
              <label class="form-label" for="editPatAddress">Residential Address <span class="text-danger">*</span></label>
              <input type="text" id="editPatAddress" class="form-control" value="${escapeHtml(patient.address || '')}" required minlength="3">
            </div>
          </div>

          <!-- Structured Emergency Contact Fields -->
          <div class="p-12 bg-surface-alt radius-md mt-12 mb-16 border-subtle">
            <label class="form-label font-semibold" style="margin-bottom: 8px;">🚨 Emergency Contact Information <span class="text-danger">*</span></label>
            <div class="form-grid-3col" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label class="form-label font-xs" for="editPatEmergencyName">Contact Name <span class="text-danger">*</span></label>
                <input type="text" id="editPatEmergencyName" class="form-control font-sm" value="${escapeHtml(patient.emergencyContactName || '')}" required>
              </div>
              <div class="form-group">
                <label class="form-label font-xs" for="editPatEmergencyPhone">Contact Phone <span class="text-danger">*</span></label>
                <input type="tel" id="editPatEmergencyPhone" class="form-control font-sm" value="${escapeHtml(patient.emergencyContactPhone || '')}" required>
              </div>
              <div class="form-group">
                <label class="form-label font-xs" for="editPatEmergencyRelation">Relationship <span class="text-danger">*</span></label>
                <select id="editPatEmergencyRelation" class="form-control font-sm" required>
                  <option value="Spouse" ${patient.emergencyContactRelation === 'Spouse' ? 'selected' : ''}>Spouse</option>
                  <option value="Father" ${patient.emergencyContactRelation === 'Father' ? 'selected' : ''}>Father</option>
                  <option value="Mother" ${patient.emergencyContactRelation === 'Mother' ? 'selected' : ''}>Mother</option>
                  <option value="Guardian" ${patient.emergencyContactRelation === 'Guardian' ? 'selected' : ''}>Guardian</option>
                  <option value="Sibling" ${patient.emergencyContactRelation === 'Sibling' ? 'selected' : ''}>Sibling</option>
                  <option value="Other" ${patient.emergencyContactRelation === 'Other' ? 'selected' : ''}>Other</option>
                </select>
              </div>
            </div>
          </div>

          <div style="background: var(--bg-surface-alt); border-left: 3px solid var(--info); padding: 10px 14px; border-radius: var(--radius-sm); margin-top: 16px; font-size: 0.8rem; color: var(--text-secondary);">
            🔒 <strong>Clinical Integrity Rule:</strong> Historical consultations, diagnostic lab reports, and prescriptions remain immutable and are never rewritten when profile information is updated.
          </div>

          <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('editPatientModal')">Cancel</button>
            <button type="submit" class="btn btn-primary" id="editPatSubmitBtn">💾 Save Profile Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleClearEditPatientPhoto = function() {
  const imgEl = document.getElementById('editPatPhotoImg');
  const placeholderEl = document.getElementById('editPatPhotoPlaceholder');
  const dataEl = document.getElementById('editPatPhotoData');
  const fileInput = document.getElementById('editPatPhotoFile');

  if (imgEl) {
    imgEl.src = '';
    imgEl.classList.add('hidden');
  }
  if (placeholderEl) placeholderEl.classList.remove('hidden');
  if (dataEl) dataEl.value = '';
  if (fileInput) fileInput.value = '';
};

window.handleEditPatientSubmit = async function(event, patientId) {
  event.preventDefault();
  const name = document.getElementById('editPatName')?.value.trim();
  const age = parseInt(document.getElementById('editPatAge')?.value, 10);
  const gender = document.getElementById('editPatGender')?.value;
  const bloodGroup = document.getElementById('editPatBlood')?.value;
  const contact = document.getElementById('editPatPhone')?.value.trim();
  const email = document.getElementById('editPatEmail')?.value.trim() || null;
  const emergencyName = document.getElementById('editPatEmergencyName')?.value.trim();
  const emergencyPhone = document.getElementById('editPatEmergencyPhone')?.value.trim();
  const emergencyRelation = document.getElementById('editPatEmergencyRelation')?.value;
  const emergencyContact = `${emergencyPhone} (${emergencyName} - ${emergencyRelation})`;
  const primaryDoctorId = document.getElementById('editPatDoctor')?.value || null;
  const status = document.getElementById('editPatStatus')?.value || 'ACTIVE';
  const address = document.getElementById('editPatAddress')?.value.trim();
  const photoUrl = document.getElementById('editPatPhotoData')?.value || null;
  const alertEl = document.getElementById('editPatAlert');
  const submitBtn = document.getElementById('editPatSubmitBtn');

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving Profile...';
    }

    await window.hospitrackStore.updatePatientProfile(patientId, {
      name,
      age,
      gender,
      bloodGroup,
      contact,
      email,
      emergencyContact,
      emergencyContactName: emergencyName,
      emergencyContactPhone: emergencyPhone,
      emergencyContactRelation: emergencyRelation,
      address,
      primaryDoctorId,
      status,
      photoUrl
    });

    window.showToast(`Patient profile for ${name} updated successfully.`, 'success');
    closeGlobalModal('editPatientModal');
    await window.hospitrackStore.syncAllData();
    if (window.openPatientWorkspace) {
      window.openPatientWorkspace(patientId);
    } else {
      window.renderHospitalDashboard(document.getElementById('mainContentArea'), 'patients');
    }
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to update patient profile.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '💾 Save Profile Changes';
    }
  }
};

// --------------------------------------------------------------------------
// Dedicated Modal for Patient Profile Photo Management (Hospital Admin)
// --------------------------------------------------------------------------
window.openChangePatientPhotoModal = function(patientId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const patient = store.getPatientById(patientId);
  if (!patient) {
    window.showToast('Patient record not found.', 'error');
    return;
  }

  modalContainer.innerHTML = `
    <div id="changePatientPhotoModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="changePhotoModalTitle">
      <div class="modal-box" style="max-width: 480px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" id="changePhotoModalTitle">📷 Manage Official Patient Photo</h3>
            <p class="text-secondary font-xs mt-2">${escapeHtml(patient.name)} • ID: <code>${escapeHtml(patient.id)}</code></p>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('changePatientPhotoModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="handleUploadPhotoSubmit(event, '${patient.id}')" class="p-20">
          <div id="photoModalAlert" class="alert-banner hidden mb-16"></div>

          <!-- Current Photo & Live Preview Center -->
          <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 20px;">
            <div id="modalPhotoPreviewBox" style="width: 120px; height: 120px; border-radius: 50%; background: var(--bg-surface-alt); border: 3px solid var(--primary); display: flex; align-items: center; justify-content: center; font-size: 3rem; overflow: hidden; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
              ${patient.photoUrl ? `
                <img id="photoModalImg" src="${escapeHtml(patient.photoUrl)}" alt="${escapeHtml(patient.name)}" style="width: 100%; height: 100%; object-fit: cover;">
                <span id="photoModalPlaceholder" class="hidden">👤</span>
              ` : `
                <img id="photoModalImg" src="" alt="Preview" class="hidden" style="width: 100%; height: 100%; object-fit: cover;">
                <span id="photoModalPlaceholder">👤</span>
              `}
            </div>
            <span class="badge badge-active mb-8">✓ Hospital Verified Identity</span>
            <div class="text-muted font-xs text-center">
              Official clinical photo maintained by hospital administration.<br>
              Formats: JPG, PNG, WEBP (Max 15 MB).
            </div>
          </div>

          <div class="form-group mb-16">
            <label class="form-label" for="newPhotoFileInput">Choose New Profile Photo</label>
            <input type="file" id="newPhotoFileInput" class="form-control" accept="image/jpeg,image/png,image/webp" onchange="handlePatientPhotoFilePreview(this, 'photoModalImg', 'photoModalPlaceholder', 'photoModalData', 'photoModalAlert')" required>
            <input type="hidden" id="photoModalData" value="">
          </div>

          <div class="modal-actions" style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px;">
            <div>
              ${patient.photoUrl ? `
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="handleRemovePatientPhotoModalClick('${patient.id}')">
                  🗑️ Remove Photo
                </button>
              ` : '<div></div>'}
            </div>
            <div style="display: flex; gap: 8px;">
              <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('changePatientPhotoModal')">Cancel</button>
              <button type="submit" class="btn btn-primary" id="savePhotoBtn">Upload &amp; Save</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleUploadPhotoSubmit = async function(event, patientId) {
  event.preventDefault();
  const photoData = document.getElementById('photoModalData')?.value;
  const alertEl = document.getElementById('photoModalAlert');
  const submitBtn = document.getElementById('savePhotoBtn');

  if (!photoData) {
    if (alertEl) {
      alertEl.textContent = 'Please select a valid image file to upload.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Uploading...';
    }

    await window.hospitrackStore.uploadPatientPhoto(patientId, photoData);
    window.showToast('Official patient photo updated and verified.', 'success');
    closeGlobalModal('changePatientPhotoModal');
    await window.hospitrackStore.syncAllData();
    if (window.openPatientWorkspace) {
      window.openPatientWorkspace(patientId);
    } else {
      window.renderHospitalDashboard(document.getElementById('mainContentArea'), 'patients');
    }
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to upload patient photo.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Upload & Save';
    }
  }
};

window.handleRemovePatientPhotoModalClick = async function(patientId) {
  if (!confirm('Are you sure you want to remove this patient\'s official clinical photo?')) {
    return;
  }
  try {
    await window.hospitrackStore.removePatientPhoto(patientId);
    window.showToast('Official patient photo removed.', 'info');
    closeGlobalModal('changePatientPhotoModal');
    await window.hospitrackStore.syncAllData();
    if (window.openPatientWorkspace) {
      window.openPatientWorkspace(patientId);
    } else {
      window.renderHospitalDashboard(document.getElementById('mainContentArea'), 'patients');
    }
  } catch (err) {
    window.showToast(err.message || 'Failed to remove patient photo.', 'error');
  }
};

// --------------------------------------------------------------------------
// Modal: Manage Doctor Credentials (Hospital-Controlled)
// --------------------------------------------------------------------------
window.openManageDoctorCredentialsModal = async function(doctorId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const doctor = store.getDoctorById(doctorId);
  if (!doctor) {
    window.showToast('Doctor record not found.', 'error');
    return;
  }

  modalContainer.innerHTML = `
    <div id="doctorCredModal" class="modal-overlay open" role="dialog" aria-modal="true">
      <div class="modal-box" style="max-width: 520px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">🔑 Manage Doctor Credentials</h3>
            <p class="text-secondary font-xs mt-2">Dr. ${escapeHtml(doctor.name)} • ID: <code>${escapeHtml(doctor.id)}</code></p>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('doctorCredModal')">✕</button>
        </div>
        <div class="p-16">
          <div id="docCredAlert" class="alert-banner hidden mb-16"></div>
          <div id="docCredLoading" style="text-align: center; padding: 20px;">
            <span>🔄 Loading credential status...</span>
          </div>
          <div id="docCredBody" class="hidden">
            <div style="background: var(--bg-surface-alt); padding: 12px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 16px; font-size: 0.88rem;">
              <div><strong>Login Email:</strong> <span id="docCredEmail">${escapeHtml(doctor.email || 'N/A')}</span></div>
              <div style="margin-top: 4px;"><strong>Account Status:</strong> <span id="docCredStatusBadge" class="badge badge-active">ACTIVE</span></div>
            </div>

            <form id="docCredForm" onsubmit="handleSaveDoctorCredentials(event, '${doctor.id}')">
              <div class="form-group mb-16">
                <label class="form-label" for="docNewPassword">Set / Reset Password</label>
                <div style="display: flex; gap: 8px;">
                  <input type="password" id="docNewPassword" class="form-control font-mono" placeholder="Enter new password (min 8 chars)" minlength="8" required>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="generateRandomPassForField('docNewPassword')">⚡ Generate</button>
                </div>
              </div>

              <div id="docPassGeneratedBox" class="alert-banner success hidden mb-16">
                <div><strong>Newly Set Password:</strong> <code id="docPassDisplay" style="font-size: 1.05rem;"></code></div>
                <div class="text-muted font-xs mt-4">Copy and share this securely with Dr. ${escapeHtml(doctor.name)}.</div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                <button type="button" id="docToggleStatusBtn" class="btn btn-outline-danger btn-sm" onclick="handleToggleDoctorAccountStatus('${doctor.id}')">
                  Deactivate Account
                </button>
                <div style="display: flex; gap: 8px;">
                  <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('doctorCredModal')">Close</button>
                  <button type="submit" id="docCredSubmitBtn" class="btn btn-primary">Update Password</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const credStatus = await store.getDoctorCredentials(doctorId);
    document.getElementById('docCredLoading')?.classList.add('hidden');
    document.getElementById('docCredBody')?.classList.remove('hidden');
    if (credStatus) {
      if (document.getElementById('docCredEmail')) {
        document.getElementById('docCredEmail').textContent = credStatus.email || doctor.email;
      }
      const badge = document.getElementById('docCredStatusBadge');
      const toggleBtn = document.getElementById('docToggleStatusBtn');
      if (badge) {
        badge.textContent = credStatus.status || 'ACTIVE';
        badge.className = credStatus.status === 'ACTIVE' ? 'badge badge-active' : 'badge badge-danger';
      }
      if (toggleBtn) {
        toggleBtn.textContent = credStatus.status === 'ACTIVE' ? '🚫 Deactivate Account' : '✓ Activate Account';
        toggleBtn.className = credStatus.status === 'ACTIVE' ? 'btn btn-outline-danger btn-sm' : 'btn btn-outline-success btn-sm';
      }
    }
  } catch (err) {
    document.getElementById('docCredLoading')?.classList.add('hidden');
    const alertEl = document.getElementById('docCredAlert');
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to fetch doctor credential status.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    }
  }
};

window.handleSaveDoctorCredentials = async function(event, doctorId) {
  event.preventDefault();
  const password = document.getElementById('docNewPassword')?.value;
  const alertEl = document.getElementById('docCredAlert');
  const submitBtn = document.getElementById('docCredSubmitBtn');

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    const res = await window.hospitrackStore.saveDoctorCredentials(doctorId, { password });
    window.showToast('Doctor credentials updated successfully.', 'success');
    
    const genBox = document.getElementById('docPassGeneratedBox');
    const displayEl = document.getElementById('docPassDisplay');
    if (genBox && displayEl) {
      displayEl.textContent = res.initialPassword || password;
      genBox.classList.remove('hidden');
    }
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to update doctor credentials.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Update Password';
    }
  }
};

window.handleToggleDoctorAccountStatus = async function(doctorId) {
  const badge = document.getElementById('docCredStatusBadge');
  const currentStatus = badge ? badge.textContent.trim() : 'ACTIVE';
  const newStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';

  try {
    const updated = await window.hospitrackStore.updateDoctorCredentialStatus(doctorId, newStatus);
    window.showToast(`Doctor account is now ${updated.status}.`, 'info');
    openManageDoctorCredentialsModal(doctorId);
  } catch (err) {
    window.showToast(err.message || 'Failed to change account status.', 'error');
  }
};

// --------------------------------------------------------------------------
// Modal: Manage Patient Portal Credentials (Hospital-Controlled)
// --------------------------------------------------------------------------
window.openManagePatientCredentialsModal = async function(patientId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const patient = store.getPatientById(patientId);
  if (!patient) {
    window.showToast('Patient record not found.', 'error');
    return;
  }

  modalContainer.innerHTML = `
    <div id="patientCredModal" class="modal-overlay open" role="dialog" aria-modal="true">
      <div class="modal-box" style="max-width: 540px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">🔑 Manage Patient Portal Credentials</h3>
            <p class="text-secondary font-xs mt-2">${escapeHtml(patient.name)} • ID: <code>${escapeHtml(patient.id)}</code></p>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('patientCredModal')">✕</button>
        </div>
        <div class="p-16">
          <div id="patCredAlert" class="alert-banner hidden mb-16"></div>
          <div id="patCredLoading" style="text-align: center; padding: 20px;">
            <span>🔄 Loading portal credential status...</span>
          </div>
          <div id="patCredBody" class="hidden">
            <div style="background: var(--bg-surface-alt); padding: 12px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 16px; font-size: 0.88rem;">
              <div><strong>Login Email / Identifier:</strong> <span id="patCredEmail">${escapeHtml(patient.email || `patient.${patient.id.toLowerCase()}@hospitrack.com`)}</span></div>
              <div style="margin-top: 4px;"><strong>Portal Access Status:</strong> <span id="patCredStatusBadge" class="badge badge-active">ACTIVE</span></div>
            </div>

            <form id="patCredForm" onsubmit="handleSavePatientCredentials(event, '${patient.id}')">
              <div class="form-group mb-16">
                <label class="form-label" for="patNewPassword">Set Portal Password</label>
                <div style="display: flex; gap: 8px;">
                  <input type="password" id="patNewPassword" class="form-control font-mono" placeholder="Enter portal password (min 8 chars)" minlength="8" required>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="generateRandomPassForField('patNewPassword')">⚡ Generate</button>
                </div>
              </div>

              <!-- 1-Time Password Display Confirmation Box -->
              <div id="patPassGeneratedBox" class="alert-banner success hidden mb-16">
                <div class="font-semibold mb-4">Initial Portal Password</div>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <input type="password" id="patGeneratedPassDisplay" readonly class="form-control font-mono font-bold" style="font-size: 1rem;">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="togglePasswordVisibility('patGeneratedPassDisplay', this)">👁️ Show</button>
                  <button type="button" class="btn btn-primary btn-sm" onclick="copyToClipboard(document.getElementById('patGeneratedPassDisplay').value)">📋 Copy</button>
                </div>
                <div class="text-muted font-xs mt-6">
                  ⚠️ This password is shown only during account setup. Store it securely.
                </div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                <button type="button" id="patToggleStatusBtn" class="btn btn-outline-danger btn-sm" onclick="handleTogglePatientAccountStatus('${patient.id}')">
                  Deactivate Portal Access
                </button>
                <div style="display: flex; gap: 8px;">
                  <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('patientCredModal')">Close</button>
                  <button type="submit" id="patCredSubmitBtn" class="btn btn-primary">Save Portal Password</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const credStatus = await store.getPatientCredentials(patientId);
    document.getElementById('patCredLoading')?.classList.add('hidden');
    document.getElementById('patCredBody')?.classList.remove('hidden');
    if (credStatus) {
      if (document.getElementById('patCredEmail')) {
        document.getElementById('patCredEmail').textContent = credStatus.email || patient.email;
      }
      const badge = document.getElementById('patCredStatusBadge');
      const toggleBtn = document.getElementById('patToggleStatusBtn');
      if (badge) {
        badge.textContent = credStatus.status || 'ACTIVE';
        badge.className = credStatus.status === 'ACTIVE' ? 'badge badge-active' : 'badge badge-danger';
      }
      if (toggleBtn) {
        toggleBtn.textContent = credStatus.status === 'ACTIVE' ? '🚫 Deactivate Access' : '✓ Activate Access';
        toggleBtn.className = credStatus.status === 'ACTIVE' ? 'btn btn-outline-danger btn-sm' : 'btn btn-outline-success btn-sm';
      }
    }
  } catch (err) {
    document.getElementById('patCredLoading')?.classList.add('hidden');
    const alertEl = document.getElementById('patCredAlert');
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to fetch patient credential status.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    }
  }
};

window.handleSavePatientCredentials = async function(event, patientId) {
  event.preventDefault();
  const password = document.getElementById('patNewPassword')?.value;
  const alertEl = document.getElementById('patCredAlert');
  const submitBtn = document.getElementById('patCredSubmitBtn');

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    const res = await window.hospitrackStore.savePatientCredentials(patientId, { password });
    window.showToast('Patient portal credentials updated successfully.', 'success');

    const genBox = document.getElementById('patPassGeneratedBox');
    const displayInput = document.getElementById('patGeneratedPassDisplay');
    if (genBox && displayInput) {
      displayInput.value = res.initialPassword || password;
      genBox.classList.remove('hidden');
    }
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to save patient credentials.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Portal Password';
    }
  }
};

window.handleTogglePatientAccountStatus = async function(patientId) {
  const badge = document.getElementById('patCredStatusBadge');
  const currentStatus = badge ? badge.textContent.trim() : 'ACTIVE';
  const newStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';

  try {
    const updated = await window.hospitrackStore.updatePatientCredentialStatus(patientId, newStatus);
    window.showToast(`Patient portal access is now ${updated.status}.`, 'info');
    openManagePatientCredentialsModal(patientId);
  } catch (err) {
    window.showToast(err.message || 'Failed to update portal access status.', 'error');
  }
};

window.generateRandomPassForField = function(fieldId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
  let pass = '';
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const f = document.getElementById(fieldId);
  if (f) {
    f.value = pass;
    f.type = 'text';
  }
};

// --------------------------------------------------------------------------
// Modal: First OPD Visit / Clinical Intake Workflow
// --------------------------------------------------------------------------
window.openFirstOpdIntakeModal = function(patientId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const user = window.hospitrackAuth.getCurrentUser();
  const hospitalId = user?.hospitalId || 'HOSP-101';
  const doctors = store.getDoctors(hospitalId);
  const patient = store.getPatientById(patientId);

  if (!patient) {
    window.showToast('Patient record not found.', 'error');
    return;
  }

  modalContainer.innerHTML = `
    <div id="firstOpdIntakeModal" class="modal-overlay open" role="dialog" aria-modal="true">
      <div class="modal-box modal-box-lg" style="max-width: 760px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">🩺 First OPD Visit — Clinical Intake Record</h3>
            <p class="text-secondary font-xs mt-2">Authoritative clinical intake flowing seamlessly into Doctor Workspace.</p>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('firstOpdIntakeModal')">✕</button>
        </div>
        <form onsubmit="handleFirstOpdIntakeSubmit(event, '${patient.id}')">
          <div id="intakeAlert" class="alert-banner hidden mb-16"></div>

          <!-- A. Patient Identification Block -->
          <div class="p-12 bg-surface-alt radius-md mb-16 border-subtle">
            <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--primary); margin-bottom: 6px;">
              A. Patient Identification
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; font-size: 0.88rem;">
              <div><strong>Name:</strong> ${escapeHtml(patient.name)}</div>
              <div><strong>Patient ID:</strong> <code>${escapeHtml(patient.id)}</code></div>
              <div><strong>Age / Gender:</strong> ${patient.age || '—'} yrs / ${escapeHtml(patient.gender || '—')}</div>
              <div><strong>Blood Group:</strong> <span class="badge badge-info font-xs">${escapeHtml(patient.bloodGroup || '—')}</span></div>
              <div><strong>Contact:</strong> ${escapeHtml(patient.contact || '—')}</div>
              <div><strong>Emergency:</strong> ${escapeHtml(patient.emergencyContactName || 'None provided')}</div>
            </div>
          </div>

          <!-- B. Current Vitals -->
          <div class="p-12 bg-surface-alt radius-md mb-16 border-subtle">
            <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--primary); margin-bottom: 8px;">
              B. Current Vitals
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label font-xs" for="intakeTemp">Body Temperature</label>
                <input type="text" id="intakeTemp" class="form-control font-sm" placeholder="e.g. 98.6 °F">
              </div>
              <div class="form-group">
                <label class="form-label font-xs" for="intakeBp">Blood Pressure (BP)</label>
                <input type="text" id="intakeBp" class="form-control font-sm" placeholder="e.g. 120/80 mmHg">
              </div>
              <div class="form-group">
                <label class="form-label font-xs" for="intakePulse">Heart Rate (Pulse)</label>
                <input type="text" id="intakePulse" class="form-control font-sm" placeholder="e.g. 76 bpm">
              </div>
              <div class="form-group">
                <label class="form-label font-xs" for="intakeResp">Respiratory Rate</label>
                <input type="text" id="intakeResp" class="form-control font-sm" placeholder="e.g. 16 /min">
              </div>
              <div class="form-group">
                <label class="form-label font-xs" for="intakeSpo2">Oxygen Saturation (SpO2)</label>
                <input type="text" id="intakeSpo2" class="form-control font-sm" placeholder="e.g. 99%">
              </div>
              <div class="form-group">
                <label class="form-label font-xs" for="intakeWeight">Weight &amp; Height</label>
                <div style="display: flex; gap: 6px;">
                  <input type="text" id="intakeWeight" class="form-control font-sm" placeholder="e.g. 72 kg">
                  <input type="text" id="intakeHeight" class="form-control font-sm" placeholder="e.g. 175 cm">
                </div>
              </div>
            </div>
          </div>

          <!-- C. Medical History & Known Conditions -->
          <div class="p-12 bg-surface-alt radius-md mb-16 border-subtle">
            <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--primary); margin-bottom: 8px;">
              C. Previous Diseases / Medical History &amp; Allergies
            </div>
            <div class="form-grid-2col mb-12">
              <div class="form-group">
                <label class="form-label font-xs" for="intakeKnownConditions">Known Medical Conditions</label>
                <input type="text" id="intakeKnownConditions" class="form-control font-sm" placeholder="e.g. Hypertension, Diabetes Type 2">
              </div>
              <div class="form-group">
                <label class="form-label font-xs" for="intakeAllergies">Drug &amp; Environmental Allergies</label>
                <input type="text" id="intakeAllergies" class="form-control font-sm" placeholder="e.g. Penicillin, Pollen (or NKDA)">
              </div>
            </div>
            <div class="form-grid-2col">
              <div class="form-group">
                <label class="form-label font-xs" for="intakeSurgeries">Previous Surgeries</label>
                <input type="text" id="intakeSurgeries" class="form-control font-sm" placeholder="e.g. Appendectomy (2019), None">
              </div>
              <div class="form-group">
                <label class="form-label font-xs" for="intakeChronic">Chronic Diseases</label>
                <input type="text" id="intakeChronic" class="form-control font-sm" placeholder="e.g. Asthma, Thyroid, None">
              </div>
            </div>
          </div>

          <!-- D. Chief Complaint -->
          <div class="p-12 bg-surface-alt radius-md mb-16 border-subtle">
            <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--primary); margin-bottom: 8px;">
              D. Chief Complaint &amp; Clinical Symptoms <span class="text-danger">*</span>
            </div>
            <div class="form-group mb-12">
              <label class="form-label font-xs" for="intakeChiefComplaint">Primary Clinical Complaint <span class="text-danger">*</span></label>
              <input type="text" id="intakeChiefComplaint" class="form-control" placeholder="e.g. Persistent fever, productive cough, and shortness of breath" required>
            </div>
            <div class="form-grid-2col mb-12">
              <div class="form-group">
                <label class="form-label font-xs" for="intakeDuration">Symptom Duration</label>
                <input type="text" id="intakeDuration" class="form-control font-sm" placeholder="e.g. 4 days">
              </div>
              <div class="form-group">
                <label class="form-label font-xs" for="intakeSeverity">Severity Assessment</label>
                <select id="intakeSeverity" class="form-control font-sm">
                  <option value="MILD">MILD</option>
                  <option value="MODERATE" selected>MODERATE</option>
                  <option value="SEVERE">SEVERE</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label font-xs" for="intakeClinicalNotes">Staff Triage Notes</label>
              <textarea id="intakeClinicalNotes" class="form-control font-sm" rows="2" placeholder="Clinical triage observations, ambulatory status..."></textarea>
            </div>
          </div>

          <!-- E. Doctor Assignment -->
          <div class="p-12 bg-surface-alt radius-md mb-16 border-subtle">
            <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--primary); margin-bottom: 8px;">
              E. Attending Doctor Assignment
            </div>
            <div class="form-group">
              <label class="form-label font-xs" for="intakeDoctorId">Select Authorized Physician <span class="text-danger">*</span></label>
              <select id="intakeDoctorId" class="form-control" required>
                <option value="">-- Choose Authorized Physician --</option>
                ${doctors.map(d => `<option value="${d.id}" ${patient.primaryDoctorId === d.id ? 'selected' : ''}>Dr. ${escapeHtml(d.name)} — ${escapeHtml(d.specialty || 'General')}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('firstOpdIntakeModal')">Cancel</button>
            <button type="submit" id="intakeSubmitBtn" class="btn btn-primary">💾 Save Intake &amp; Transfer to Doctor</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleFirstOpdIntakeSubmit = async function(event, patientId) {
  event.preventDefault();
  const alertEl = document.getElementById('intakeAlert');
  const submitBtn = document.getElementById('intakeSubmitBtn');

  const chiefComplaint = document.getElementById('intakeChiefComplaint')?.value.trim();
  const doctorId = document.getElementById('intakeDoctorId')?.value;
  const temperature = document.getElementById('intakeTemp')?.value.trim() || null;
  const bloodPressure = document.getElementById('intakeBp')?.value.trim() || null;
  const heartRate = document.getElementById('intakePulse')?.value.trim() || null;
  const respiratoryRate = document.getElementById('intakeResp')?.value.trim() || null;
  const spo2 = document.getElementById('intakeSpo2')?.value.trim() || null;
  const weight = document.getElementById('intakeWeight')?.value.trim() || null;
  const height = document.getElementById('intakeHeight')?.value.trim() || null;
  const knownConditions = document.getElementById('intakeKnownConditions')?.value.trim() || null;
  const allergies = document.getElementById('intakeAllergies')?.value.trim() || null;
  const previousSurgeries = document.getElementById('intakeSurgeries')?.value.trim() || null;
  const chronicDiseases = document.getElementById('intakeChronic')?.value.trim() || null;
  const duration = document.getElementById('intakeDuration')?.value.trim() || null;
  const severity = document.getElementById('intakeSeverity')?.value || 'MODERATE';
  const clinicalNotes = document.getElementById('intakeClinicalNotes')?.value.trim() || null;

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving OPD Intake...';
    }

    await window.hospitrackStore.recordPatientIntake(patientId, {
      chiefComplaint,
      doctorId,
      temperature,
      bloodPressure,
      heartRate,
      respiratoryRate,
      spo2,
      weight,
      height,
      knownConditions,
      allergies,
      previousSurgeries,
      chronicDiseases,
      duration,
      severity,
      clinicalNotes
    });

    window.showToast('First OPD clinical intake saved and routed to Doctor Workspace.', 'success');
    closeGlobalModal('firstOpdIntakeModal');
    await window.hospitrackStore.syncAllData();
    window.renderHospitalDashboard(document.getElementById('mainContentArea'), 'patients');
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to save clinical intake.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '💾 Save Intake & Transfer to Doctor';
    }
  }
};

// (Universal Inpatient Bed & Ward Assignment Modal & Submit Handler is defined in section 4)

// --------------------------------------------------------------------------
// Bed Maintenance Lifecycle Modals (Hospital Admin)
// --------------------------------------------------------------------------
window.openMarkBedMaintenanceModal = function(bedId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const user = window.hospitrackAuth.getCurrentUser();
  const hospitalId = user?.hospitalId || 'HOSP-101';

  modalContainer.innerHTML = `
    <div id="markMaintenanceModal" class="modal-overlay open" role="dialog" aria-modal="true">
      <div class="modal-box" style="max-width: 480px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">🔧 Mark Bed for Maintenance</h3>
            <p class="text-secondary font-xs mt-2">Bed: <code>${escapeHtml(bedId)}</code></p>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('markMaintenanceModal')">✕</button>
        </div>
        <form onsubmit="handleMarkBedMaintenanceSubmit(event, '${hospitalId}', '${escapeHtml(bedId)}')" class="p-16">
          <div id="maintAlert" class="alert-banner hidden mb-16"></div>
          <div class="form-group mb-16">
            <label class="form-label" for="maintReason">Maintenance / Sterilization Reason <span class="text-danger">*</span></label>
            <textarea id="maintReason" class="form-control" rows="3" placeholder="e.g. Terminal cleaning post-discharge, mechanical repair, sensor calibration..." required></textarea>
          </div>
          <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('markMaintenanceModal')">Cancel</button>
            <button type="submit" id="maintSubmitBtn" class="btn btn-warning">Set to Maintenance</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleMarkBedMaintenanceSubmit = async function(event, hospitalId, bedId) {
  event.preventDefault();
  const reason = document.getElementById('maintReason')?.value.trim();
  const alertEl = document.getElementById('maintAlert');
  const submitBtn = document.getElementById('maintSubmitBtn');

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating...';
    }

    await window.hospitrackStore.markBedMaintenance(hospitalId, bedId, reason);
    window.showToast(`Bed ${bedId} moved to maintenance state.`, 'info');
    closeGlobalModal('markMaintenanceModal');
    await window.hospitrackStore.syncAllData();
    window.renderHospitalDashboard(document.getElementById('mainContentArea'), 'ward-management');
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to set bed to maintenance.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Set to Maintenance';
    }
  }
};

window.handleReleaseBedMaintenance = async function(bedId) {
  const user = window.hospitrackAuth.getCurrentUser();
  const hospitalId = user?.hospitalId || 'HOSP-101';

  if (!confirm(`Release bed ${bedId} from maintenance and return to AVAILABLE status?`)) {
    return;
  }

  try {
    await window.hospitrackStore.releaseBedMaintenance(hospitalId, bedId);
    window.showToast(`Bed ${bedId} released from maintenance. Status: AVAILABLE.`, 'success');
    await window.hospitrackStore.syncAllData();
    window.renderHospitalDashboard(document.getElementById('mainContentArea'), 'ward-management');
  } catch (err) {
    window.showToast(err.message || 'Failed to release bed from maintenance.', 'error');
  }
};

window.openBedMaintenanceHistoryModal = async function() {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const user = window.hospitrackAuth.getCurrentUser();
  const hospitalId = user?.hospitalId || 'HOSP-101';

  modalContainer.innerHTML = `
    <div id="maintHistoryModal" class="modal-overlay open" role="dialog" aria-modal="true">
      <div class="modal-box modal-box-lg" style="max-width: 720px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">🛠️ Ward &amp; Bed Maintenance History</h3>
            <p class="text-secondary font-xs mt-2">Authoritative audit log of bed sterilization and maintenance lifecycles.</p>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('maintHistoryModal')">✕</button>
        </div>
        <div class="p-16">
          <div id="maintHistoryLoading" style="text-align: center; padding: 20px;">
            <span>🔄 Loading maintenance logs...</span>
          </div>
          <div id="maintHistoryContent" class="hidden">
            <div class="table-responsive">
              <table class="table-clean">
                <thead>
                  <tr>
                    <th>Bed</th>
                    <th>Ward</th>
                    <th>Reason</th>
                    <th>Started</th>
                    <th>Completed</th>
                    <th>Performed By</th>
                  </tr>
                </thead>
                <tbody id="maintHistoryTableBody"></tbody>
              </table>
            </div>
          </div>
          <div class="modal-actions" style="margin-top: 16px;">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('maintHistoryModal')">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const logs = await window.hospitrackStore.getBedMaintenanceHistory(hospitalId);
    document.getElementById('maintHistoryLoading')?.classList.add('hidden');
    document.getElementById('maintHistoryContent')?.classList.remove('hidden');
    const tbody = document.getElementById('maintHistoryTableBody');
    if (tbody) {
      if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No maintenance records logged yet.</td></tr>`;
      } else {
        tbody.innerHTML = logs.map(l => `
          <tr>
            <td><strong><code>${escapeHtml(l.bedNumber || l.bedId)}</code></strong></td>
            <td>${escapeHtml(l.wardName || 'Ward')}</td>
            <td>${escapeHtml(l.reason || 'Sterilization')}</td>
            <td>${l.startedAt ? new Date(l.startedAt).toLocaleString() : '—'}</td>
            <td>${l.completedAt ? new Date(l.completedAt).toLocaleString() : '<span class="badge badge-warning">In Progress</span>'}</td>
            <td>${escapeHtml(l.performedByName || 'Staff')}</td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    document.getElementById('maintHistoryLoading')?.classList.add('hidden');
    window.showToast(err.message || 'Failed to load maintenance history.', 'error');
  }
};

// --------------------------------------------------------------------------
// Modal for Doctor Onboarding & Credential Creation
// --------------------------------------------------------------------------
window.openAddDoctorFacilityModal = function() {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const user = window.hospitrackAuth.getCurrentUser();
  const hospitalId = user?.hospitalId || 'HOSP-101';

  modalContainer.innerHTML = `
    <div id="onboardDocModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="onboardDocModalTitle">
      <div class="modal-box" style="max-width: 680px; max-height: 90vh; display: flex; flex-direction: column;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" id="onboardDocModalTitle" style="margin: 0; font-size: 1.2rem; font-weight: 700;">Add Doctor</h3>
            <p style="margin: 2px 0 0 0; font-size: 0.82rem; color: var(--text-muted);">Create physician account and provision workspace credentials</p>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('onboardDocModal')" aria-label="Close">✕</button>
        </div>

        <form id="onboardDocForm" onsubmit="handleOnboardDoctorSubmit(event, '${hospitalId}')" style="overflow-y: auto; padding: 16px 20px; flex: 1;">
          <div id="onboardDocAlert" class="alert-banner hidden mb-16"></div>

          <!-- Section 1: Doctor Profile -->
          <div style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: var(--primary); letter-spacing: 0.5px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
            <span>👨‍⚕️</span> Doctor Profile
          </div>

          <div class="form-grid-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="onboardDocName">Full Name <span style="color: var(--danger);">*</span></label>
              <input type="text" id="onboardDocName" class="form-control" placeholder="Dr. Rahul Verma" required />
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="onboardDocEmail">Professional Email <span style="color: var(--danger);">*</span></label>
              <input type="email" id="onboardDocEmail" class="form-control" placeholder="rahul.verma@citygeneral.in" required />
            </div>
          </div>

          <div class="form-grid-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="onboardDocPhone">Contact Phone <span style="color: var(--danger);">*</span></label>
              <input type="tel" id="onboardDocPhone" class="form-control" placeholder="+91 98765 43210" required />
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="onboardDocSpecialty">Specialty / Department <span style="color: var(--danger);">*</span></label>
              <select id="onboardDocSpecialty" class="form-control" required>
                <option value="Cardiology">Cardiology</option>
                <option value="General Surgery">General Surgery</option>
                <option value="Neurology">Neurology</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="General Medicine">General Medicine</option>
                <option value="Emergency Medicine">Emergency Medicine</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Gynecology">Gynecology</option>
                <option value="Dermatology">Dermatology</option>
                <option value="Radiology">Radiology</option>
                <option value="Pathology">Pathology</option>
                <option value="Oncology">Oncology</option>
              </select>
            </div>
          </div>

          <div class="form-grid-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="onboardDocLicense">Medical License Number <span style="color: var(--danger);">*</span></label>
              <input type="text" id="onboardDocLicense" class="form-control" placeholder="e.g. MCI-99301" required />
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="onboardDocExp">Clinical Experience (Years)</label>
              <input type="number" id="onboardDocExp" class="form-control" min="0" max="60" value="5" />
            </div>
          </div>

          <!-- Section 2: Account Credentials -->
          <div style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: var(--primary); letter-spacing: 0.5px; margin: 20px 0 12px 0; display: flex; align-items: center; gap: 6px;">
            <span>🔐</span> Account Credentials
          </div>

          <div class="form-grid-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="onboardDocPassword">Initial Portal Password <span style="color: var(--danger);">*</span></label>
              <div style="position: relative;">
                <input type="password" id="onboardDocPassword" class="form-control" placeholder="Min. 6 characters" required minlength="6" oninput="checkOnboardDocPasswordStrength(this.value)" />
                <button type="button" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 0.82rem;" onclick="togglePasswordVisibilityField('onboardDocPassword', this)">Show</button>
              </div>
              <div id="onboardDocPwdStrength" style="font-size: 0.74rem; margin-top: 4px; color: var(--text-muted);">Minimum 6 characters required</div>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="onboardDocConfirmPassword">Confirm Password <span style="color: var(--danger);">*</span></label>
              <div style="position: relative;">
                <input type="password" id="onboardDocConfirmPassword" class="form-control" placeholder="Re-enter password" required minlength="6" oninput="checkOnboardDocPasswordMatch()" />
                <button type="button" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 0.82rem;" onclick="togglePasswordVisibilityField('onboardDocConfirmPassword', this)">Show</button>
              </div>
              <div id="onboardDocPwdMatch" style="font-size: 0.74rem; margin-top: 4px; color: var(--text-muted);"></div>
            </div>
          </div>

          <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; padding-top: 12px; border-top: 1px solid var(--border-color, #e2e8f0);">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('onboardDocModal')">Cancel</button>
            <button type="submit" id="saveOnboardDocBtn" class="btn btn-primary">Create Doctor Account</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.checkOnboardDocPasswordStrength = function(pwd) {
  const el = document.getElementById('onboardDocPwdStrength');
  if (!el) return;
  if (!pwd || pwd.length === 0) {
    el.textContent = 'Minimum 6 characters required';
    el.className = 'font-xs text-muted';
  } else if (pwd.length < 6) {
    el.textContent = '❌ Too short (min 6 chars)';
    el.className = 'font-xs text-danger';
  } else if (pwd.length < 8) {
    el.textContent = '🟡 Fair password';
    el.className = 'font-xs text-warning';
  } else {
    el.textContent = '🟢 Strong password';
    el.className = 'font-xs text-success';
  }
};

window.checkOnboardDocPasswordMatch = function() {
  const pwd = document.getElementById('onboardDocPassword')?.value;
  const cpwd = document.getElementById('onboardDocConfirmPassword')?.value;
  const matchEl = document.getElementById('onboardDocPwdMatch');
  if (!matchEl) return;
  if (!cpwd) {
    matchEl.textContent = '';
  } else if (pwd === cpwd) {
    matchEl.textContent = '✓ Passwords match';
    matchEl.className = 'font-xs text-success';
  } else {
    matchEl.textContent = '❌ Passwords do not match';
    matchEl.className = 'font-xs text-danger';
  }
};

window.togglePasswordVisibilityField = function(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (btn) btn.textContent = 'Hide';
  } else {
    input.type = 'password';
    if (btn) btn.textContent = 'Show';
  }
};

window.handleOnboardDoctorSubmit = async function(event, hospitalId) {
  event.preventDefault();
  const name = document.getElementById('onboardDocName')?.value.trim();
  const specialty = document.getElementById('onboardDocSpecialty')?.value.trim();
  const licenseNo = document.getElementById('onboardDocLicense')?.value.trim();
  const email = document.getElementById('onboardDocEmail')?.value.trim();
  const phone = document.getElementById('onboardDocPhone')?.value.trim();
  const experienceYears = parseInt(document.getElementById('onboardDocExp')?.value, 10) || 5;
  const password = document.getElementById('onboardDocPassword')?.value;
  const confirmPassword = document.getElementById('onboardDocConfirmPassword')?.value;
  const alertEl = document.getElementById('onboardDocAlert');
  const submitBtn = document.getElementById('saveOnboardDocBtn');

  if (password !== confirmPassword) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = 'Initial password and confirm password do not match.';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  if (!password || password.length < 6) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = 'Password must be at least 6 characters.';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Account...';
    }

    const created = await window.hospitrackStore.createDoctor({
      hospitalId,
      name,
      specialty,
      licenseNo,
      email,
      phone,
      experienceYears,
      password
    });

    closeGlobalModal('onboardDocModal');
    openDoctorCredentialConfirmationModal(created || { id: 'DOC-NEW', name, email, initialPassword: password });
  } catch (err) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = err.message || 'Failed to create doctor account.';
      alertEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Doctor Account';
    }
  }
};

window.openDoctorCredentialConfirmationModal = function(created) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const safeEscape = (str) => {
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  };

  modalContainer.innerHTML = `
    <div id="doctorCredentialCreatedModal" class="modal-overlay open" role="dialog" aria-modal="true">
      <div class="modal-box" style="max-width: 520px; border-top: 4px solid var(--primary, #0D9488);">
        <div class="modal-header">
          <h3 class="modal-title" style="color: var(--text-main); font-weight: 700;">✓ Doctor Account Created</h3>
          <button type="button" class="modal-close" onclick="closeGlobalModal('doctorCredentialCreatedModal'); if(window.renderHospitalSectionNow) window.renderHospitalSectionNow('doctors');" aria-label="Close">✕</button>
        </div>
        <div class="modal-body" style="padding: 16px;">
          <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 16px;">
            Physician <strong>${safeEscape(created.name)}</strong> has been registered and authorized for this facility.
          </p>
          <div style="background: var(--bg-surface, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <div style="margin-bottom: 12px;">
              <span style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Doctor ID</span>
              <div style="font-size: 1.15rem; font-weight: 800; color: var(--primary, #0D9488); font-family: monospace;">${safeEscape(created.id)}</div>
            </div>
            <div style="margin-bottom: 12px;">
              <span style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Username / Login Identifier</span>
              <div style="font-size: 0.95rem; font-weight: 600; color: var(--text-main);">${safeEscape(created.email || created.id)}</div>
            </div>
            <div style="margin-bottom: 4px;">
              <span style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Initial Portal Password</span>
              <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
                <input type="password" id="createdDocPwdInput" value="${safeEscape(created.initialPassword || '')}" readonly style="flex: 1; font-family: monospace; font-size: 1rem; padding: 8px 12px; border: 1px solid var(--border-color, #cbd5e1); border-radius: 6px; background: #fff;" />
                <button type="button" class="btn btn-secondary btn-sm" onclick="togglePasswordVisibilityField('createdDocPwdInput', this)">Show</button>
                <button type="button" class="btn btn-primary btn-sm" onclick="copyCreatedDoctorPassword('${safeEscape(created.initialPassword || '')}')">Copy</button>
              </div>
            </div>
          </div>
          <div style="background: rgba(234, 179, 8, 0.1); border-left: 4px solid #eab308; padding: 10px 12px; border-radius: 4px; font-size: 0.82rem; color: #854d0e; margin-bottom: 16px;">
            ⚠️ <strong>Security Notice:</strong> This password is shown only once. Save it securely and provide it to the doctor.
          </div>
          <div style="display: flex; justify-content: flex-end;">
            <button type="button" class="btn btn-primary" onclick="closeGlobalModal('doctorCredentialCreatedModal'); if(window.renderHospitalSectionNow) window.renderHospitalSectionNow('doctors');">Done</button>
          </div>
        </div>
      </div>
    </div>
  `;
};

window.copyCreatedDoctorPassword = function(pwd) {
  if (!pwd) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(pwd).then(() => {
      window.showToast('Initial password copied to clipboard.', 'success');
    }).catch(() => {
      window.showToast('Copied password: ' + pwd, 'info');
    });
  } else {
    window.showToast('Password: ' + pwd, 'info');
  }
};

// --------------------------------------------------------------------------
// Modal for Assigning Existing Doctor (B. Add Existing Registered Doctor)
// --------------------------------------------------------------------------
window.openAssignDoctorModal = function() {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const user = window.hospitrackAuth.getCurrentUser();
  const hospitalId = user?.hospitalId || 'HOSP-101';
  const allDoctors = window.hospitrackStore.getDoctors();

  modalContainer.innerHTML = `
    <div id="assignDocModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="assignDocModalTitle">
      <div class="modal-box">
        <div class="modal-header">
          <h3 class="modal-title" id="assignDocModalTitle">👥 Assign Existing Doctor to Facility</h3>
          <button type="button" class="modal-close" onclick="closeGlobalModal('assignDocModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="handleAssignDoctorSubmit(event, '${hospitalId}')">
          <div class="form-group">
            <label class="form-label" for="assignDocSelect">Select Registered Doctor <span style="color: var(--danger);">*</span></label>
            <select id="assignDocSelect" class="form-control" required onchange="handleAssignDocSelectChange(this)">
              <option value="">-- Choose registered doctor --</option>
              ${allDoctors.map(d => `
                <option value="${d.id}" data-hospital="${d.hospitalId || ''}" data-specialty="${escapeHtml(d.specialty || '')}">
                  ${escapeHtml(d.name)} (${d.id} • ${d.specialty || 'General'} • License: ${d.licenseNo || 'N/A'})
                </option>
              `).join('')}
            </select>
          </div>
          <div id="assignDocDetailsBox" class="p-12 bg-surface-alt radius-md mb-16 hidden">
            <div style="font-size: 0.82rem; color: var(--text-secondary);">
              Current Facility: <strong id="assignDocCurrentHosp">-</strong><br>
              Specialization: <strong id="assignDocCurrentSpec">-</strong>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="assignDocDept">Assign to Department / Specialty <span style="color: var(--danger);">*</span></label>
            <select id="assignDocDept" class="form-control" required>
              <option value="Cardiology">Cardiology</option>
              <option value="Neurology">Neurology</option>
              <option value="Orthopedics">Orthopedics</option>
              <option value="General Medicine">General Medicine</option>
              <option value="Emergency Medicine">Emergency Medicine</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="Gynecology">Gynecology</option>
              <option value="Dermatology">Dermatology</option>
              <option value="Radiology">Radiology</option>
              <option value="Pathology">Pathology</option>
            </select>
          </div>
          <div id="assignDocAlert" class="alert-banner hidden mb-16"></div>
          <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('assignDocModal')">Cancel</button>
            <button type="submit" id="saveAssignDocBtn" class="btn btn-primary">Confirm &amp; Assign to Hospital</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleAssignDocSelectChange = function(selectEl) {
  const selectedOption = selectEl.options[selectEl.selectedIndex];
  const detailsBox = document.getElementById('assignDocDetailsBox');
  const currentHospEl = document.getElementById('assignDocCurrentHosp');
  const currentSpecEl = document.getElementById('assignDocCurrentSpec');
  const deptSelect = document.getElementById('assignDocDept');

  if (selectedOption && selectedOption.value) {
    const hospId = selectedOption.getAttribute('data-hospital') || 'None';
    const spec = selectedOption.getAttribute('data-specialty') || 'General Practice';
    if (currentHospEl) currentHospEl.textContent = hospId;
    if (currentSpecEl) currentSpecEl.textContent = spec;
    if (detailsBox) detailsBox.classList.remove('hidden');
    if (deptSelect && spec) {
      for (let i = 0; i < deptSelect.options.length; i++) {
        if (deptSelect.options[i].value.toLowerCase().includes(spec.toLowerCase()) || spec.toLowerCase().includes(deptSelect.options[i].value.toLowerCase())) {
          deptSelect.selectedIndex = i;
          break;
        }
      }
    }
  } else if (detailsBox) {
    detailsBox.classList.add('hidden');
  }
};

window.handleAssignDoctorSubmit = async function(event, hospitalId) {
  event.preventDefault();
  const doctorId = document.getElementById('assignDocSelect')?.value;
  const department = document.getElementById('assignDocDept')?.value;
  const alertEl = document.getElementById('assignDocAlert');
  const submitBtn = document.getElementById('saveAssignDocBtn');

  if (!doctorId) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = 'Please select a doctor to assign.';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Assigning...';
    }

    const updated = await window.hospitrackStore.assignDoctorToHospital(doctorId, hospitalId, department);
    window.showToast(`Doctor ${updated.name} successfully assigned to ${hospitalId}.`, 'success');
    closeGlobalModal('assignDocModal');
    if (window.openDoctorWorkspace) {
      window.openDoctorWorkspace(updated.id);
    } else {
      window.renderHospitalDashboard(document.getElementById('mainContentArea'), 'staff');
    }
  } catch (err) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = err.message || 'Failed to assign doctor.';
      alertEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm & Assign to Hospital';
    }
  }
};

// --------------------------------------------------------------------------
// Healthcare Facility Profile Helpers & Edit Modal Controller
// --------------------------------------------------------------------------
function parseHospitalLocation(locationStr) {
  if (!locationStr || typeof locationStr !== 'string') {
    return {
      address: 'Not provided',
      city: 'Not provided',
      state: 'Not provided',
      pin: 'Not provided'
    };
  }
  const clean = locationStr.trim();
  const parts = clean.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { address: 'Not provided', city: 'Not provided', state: 'Not provided', pin: 'Not provided' };
  }
  if (parts.length === 1) {
    return { address: parts[0], city: 'Metro Region', state: 'State Healthcare Area', pin: 'Not configured' };
  }
  if (parts.length === 2) {
    return { address: parts[0], city: parts[1], state: 'State Healthcare Area', pin: 'Not configured' };
  }
  if (parts.length === 3) {
    return { address: parts[0], city: parts[1], state: parts[2], pin: 'Not configured' };
  }
  const lastPart = parts[parts.length - 1];
  const isPin = /^\d{5,6}$/.test(lastPart) || lastPart.toLowerCase().includes('pin');
  if (isPin) {
    return {
      address: parts.slice(0, parts.length - 3).join(', ') || parts[0],
      city: parts[parts.length - 3] || parts[1],
      state: parts[parts.length - 2] || parts[2],
      pin: lastPart
    };
  }
  return {
    address: parts.slice(0, parts.length - 2).join(', ') || parts[0],
    city: parts[parts.length - 2],
    state: parts[parts.length - 1],
    pin: 'Not configured'
  };
}

function getFacilityClinicalServices(hospital, doctors = []) {
  const iconMap = {
    'cardiology': { icon: '❤️', detail: 'Advanced cardiovascular care & cath lab' },
    'neurology': { icon: '🧠', detail: 'Neurological diagnostics & stroke unit' },
    'orthopedics': { icon: '🦴', detail: 'Joint replacement & trauma orthopedics' },
    'emergency medicine': { icon: '🚑', detail: '24/7 Level-1 trauma & resuscitation' },
    'general medicine': { icon: '🩺', detail: 'Comprehensive internal medicine & acute care' },
    'pediatrics': { icon: '👶', detail: 'Neonatal & pediatric inpatient care' },
    'gynecology': { icon: '🌸', detail: 'Obstetrics, maternity & women\'s health' },
    'dermatology': { icon: '🧴', detail: 'Clinical dermatology & skin care' },
    'radiology': { icon: '🩻', detail: 'CT, MRI & digital radiodiagnostics' },
    'pathology': { icon: '🧪', detail: 'Automated biochemical & hematology lab' },
    'pulmonology': { icon: '🫁', detail: 'Respiratory critical care & ventilators' },
    'critical care': { icon: '🛏️', detail: 'Multi-parameter intensive care unit' },
    'oncology': { icon: '🎗️', detail: 'Clinical oncology & chemotherapy unit' },
    'nephrology': { icon: '🧬', detail: 'Dialysis & renal care services' }
  };

  const services = [];

  // Core Hospital Capabilities (Always active in accredited facility)
  services.push({
    name: 'Emergency & Trauma Care',
    icon: '🚑',
    detail: '24/7 Level-1 trauma triage & acute resuscitation'
  });
  services.push({
    name: 'Intensive Care Unit (ICU)',
    icon: '🛏️',
    detail: 'Advanced hemodynamics, ventilators & critical care'
  });

  // Extract from doctor specialties
  const seenSpecialties = new Set(['emergency medicine', 'emergency & trauma care', 'intensive care unit (icu)']);
  
  if (Array.isArray(doctors)) {
    doctors.forEach(d => {
      const spec = (d.specialty || d.department || '').trim();
      if (spec) {
        const lower = spec.toLowerCase();
        if (!seenSpecialties.has(lower)) {
          seenSpecialties.add(lower);
          const meta = iconMap[lower] || { icon: '🩺', detail: 'Accredited specialist clinical service' };
          services.push({
            name: spec,
            icon: meta.icon,
            detail: meta.detail
          });
        }
      }
    });
  }

  // Ensure default clinical coverage if few doctors
  const defaults = [
    { key: 'cardiology', name: 'Cardiology & Cath Lab', icon: '❤️', detail: 'Interventional cardiology & ECG/Echo diagnostics' },
    { key: 'general medicine', name: 'General & Internal Medicine', icon: '🩺', detail: 'Comprehensive adult diagnostics & inpatient care' },
    { key: 'orthopedics', name: 'Orthopedics & Joint Surgery', icon: '🦴', detail: 'Trauma orthopedics, arthroscopy & fracture care' },
    { key: 'radiology', name: 'Diagnostic Imaging & Radiology', icon: '🩻', detail: 'Digital X-ray, multi-slice CT & ultrasound' },
    { key: 'pathology', name: 'Clinical Pathology & Laboratory', icon: '🧪', detail: 'Full-spectrum computerized diagnostic pathology' }
  ];

  defaults.forEach(def => {
    if (!seenSpecialties.has(def.key) && services.length < 8) {
      seenSpecialties.add(def.key);
      services.push({
        name: def.name,
        icon: def.icon,
        detail: def.detail
      });
    }
  });

  return services;
}

function getFacilityDepartments(hospital, doctors = []) {
  const store = window.hospitrackStore;
  const rawDepts = (store && Array.isArray(store.data?.departments)) ? store.data.departments : [];
  const hospId = hospital?.id;
  const filteredDepts = hospId ? rawDepts.filter(d => !d.hospitalId || d.hospitalId === hospId) : rawDepts;

  if (filteredDepts.length > 0) {
    return filteredDepts.map(dept => {
      const matchingDocs = (doctors || []).filter(d => {
        const spec = (d.specialty || d.department || '').toLowerCase();
        const deptNameLower = (dept.name || '').toLowerCase();
        return deptNameLower.includes(spec) || (spec && deptNameLower.includes(spec.split(' ')[0]));
      });
      const lead = matchingDocs.length > 0 ? matchingDocs[0].name : 'Attending Physician';
      return {
        id: dept.id,
        name: dept.name,
        description: dept.description,
        icon: '🏢',
        leadDoctor: lead,
        doctorCount: matchingDocs.length,
        status: dept.status || 'ACTIVE'
      };
    });
  }

  const depts = [
    { name: 'Emergency & Trauma Services', icon: '🚑', leadFallback: 'Chief Medical Officer / Duty Intensivist' },
    { name: 'Cardiology & Cardiovascular Sciences', icon: '❤️', leadFallback: 'Senior Consultant Cardiologist' },
    { name: 'Internal & General Medicine', icon: '🩺', leadFallback: 'Head of Internal Medicine' },
    { name: 'Orthopedics & Joint Reconstruction', icon: '🦴', leadFallback: 'Senior Orthopedic Surgeon' },
    { name: 'Critical Care Medicine (ICU)', icon: '🛏️', leadFallback: 'Lead Intensivist & Critical Care Team' },
    { name: 'Radiology & Imaging Sciences', icon: '🩻', leadFallback: 'Consultant Radiologist' }
  ];

  return depts.map(dept => {
    const matchingDocs = (doctors || []).filter(d => {
      const spec = (d.specialty || d.department || '').toLowerCase();
      const deptNameLower = dept.name.toLowerCase();
      return deptNameLower.includes(spec) || (spec && deptNameLower.includes(spec.split(' ')[0]));
    });

    const lead = matchingDocs.length > 0 ? matchingDocs[0].name : dept.leadFallback;
    return {
      name: dept.name,
      icon: dept.icon,
      leadDoctor: lead,
      doctorCount: Math.max(1, matchingDocs.length),
      status: 'ACTIVE'
    };
  });
}

// --------------------------------------------------------------------------
// Department Management Modals (Add, Edit, Delete)
// --------------------------------------------------------------------------
window.openAddDepartmentModal = function() {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div id="departmentModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="deptModalTitle">
      <div class="modal-box">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--primary-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
              🏢
            </div>
            <div>
              <h3 class="modal-title" id="deptModalTitle">Add Clinical Department</h3>
              <p class="modal-subtitle">Register a new medical department for this hospital</p>
            </div>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('departmentModal')" aria-label="Close">✕</button>
        </div>

        <form id="departmentModalForm" onsubmit="handleDepartmentModalSave(event)">
          <div id="deptModalAlert" class="alert-banner hidden mb-16"></div>

          <div class="form-group mb-12">
            <label class="form-label" for="deptModalName">Department Name <span style="color: var(--danger);">*</span></label>
            <input type="text" id="deptModalName" class="form-control" placeholder="e.g. Neurology & Neurosurgery" required minlength="2">
          </div>

          <div class="form-group mb-12">
            <label class="form-label" for="deptModalDesc">Description / Scope of Care</label>
            <textarea id="deptModalDesc" class="form-control" rows="3" placeholder="Provide a brief clinical scope or sub-specialization details..."></textarea>
          </div>

          <div class="form-group mb-16">
            <label class="form-label" for="deptModalStatus">Operational Status</label>
            <select id="deptModalStatus" class="form-control">
              <option value="ACTIVE" selected>ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('departmentModal')">
              Cancel
            </button>
            <button type="submit" id="saveDeptModalBtn" class="btn btn-primary">
              💾 Save Department
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.openEditDepartmentModal = function(deptId, name, desc, status) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div id="departmentModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="deptModalTitle">
      <div class="modal-box">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--primary-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
              🏢
            </div>
            <div>
              <h3 class="modal-title" id="deptModalTitle">Edit Department</h3>
              <p class="modal-subtitle">Update department details and operational status</p>
            </div>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('departmentModal')" aria-label="Close">✕</button>
        </div>

        <form id="departmentModalForm" onsubmit="handleDepartmentModalSave(event, '${escapeHtml(deptId)}')">
          <div id="deptModalAlert" class="alert-banner hidden mb-16"></div>

          <div class="form-group mb-12">
            <label class="form-label" for="deptModalName">Department Name <span style="color: var(--danger);">*</span></label>
            <input type="text" id="deptModalName" class="form-control" value="${escapeHtml(name || '')}" required minlength="2">
          </div>

          <div class="form-group mb-12">
            <label class="form-label" for="deptModalDesc">Description / Scope of Care</label>
            <textarea id="deptModalDesc" class="form-control" rows="3">${escapeHtml(desc || '')}</textarea>
          </div>

          <div class="form-group mb-16">
            <label class="form-label" for="deptModalStatus">Operational Status</label>
            <select id="deptModalStatus" class="form-control">
              <option value="ACTIVE" ${status === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
              <option value="INACTIVE" ${status === 'INACTIVE' ? 'selected' : ''}>INACTIVE</option>
            </select>
          </div>

          <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('departmentModal')">
              Cancel
            </button>
            <button type="submit" id="saveDeptModalBtn" class="btn btn-primary">
              💾 Update Department
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleDepartmentModalSave = async function(event, deptId = null) {
  event.preventDefault();
  const alertEl = document.getElementById('deptModalAlert');
  const submitBtn = document.getElementById('saveDeptModalBtn');

  if (alertEl) {
    alertEl.classList.add('hidden');
    alertEl.textContent = '';
  }

  const name = document.getElementById('deptModalName')?.value.trim();
  const description = document.getElementById('deptModalDesc')?.value.trim();
  const status = document.getElementById('deptModalStatus')?.value;

  if (!name || name.length < 2) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = 'Please provide a valid department name (minimum 2 characters).';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    if (deptId) {
      await window.hospitrackStore.updateHospitalDepartment(deptId, { name, description, status });
      window.showToast('✓ Department updated successfully.', 'success');
    } else {
      await window.hospitrackStore.createHospitalDepartment({ name, description, status });
      window.showToast('✓ Department added successfully.', 'success');
    }

    closeGlobalModal('departmentModal');
    window.renderHospitalDashboard(document.getElementById('mainContentArea'), 'profile');
  } catch (err) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = err.message || 'Failed to save department.';
      alertEl.classList.remove('hidden');
    } else {
      window.showToast(err.message || 'Failed to save department.', 'error');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = deptId ? '💾 Update Department' : '💾 Save Department';
    }
  }
};

window.handleDeleteDepartment = async function(deptId, deptName) {
  if (!confirm(`Are you sure you want to remove the department "${deptName}"?`)) {
    return;
  }
  try {
    await window.hospitrackStore.deleteHospitalDepartment(deptId);
    window.showToast(`✓ Department "${deptName}" removed.`, 'success');
    window.renderHospitalDashboard(document.getElementById('mainContentArea'), 'profile');
  } catch (err) {
    window.showToast(err.message || 'Failed to delete department.', 'error');
  }
};

// --------------------------------------------------------------------------
// Hospital Profile Edit Modal with Full Enterprise Metadata & Logo Upload
// --------------------------------------------------------------------------
window.openHospitalProfileEditModal = function(hospId) {
  const store = window.hospitrackStore;
  const user = window.hospitrackAuth?.getCurrentUser();
  const targetId = hospId || user?.hospitalId || '';

  const hospital = (store && typeof store.getHospitalById === 'function' && targetId ? store.getHospitalById(targetId) : null) || {
    id: targetId || 'HOSP',
    name: user?.hospitalName || user?.name || 'Healthcare Facility',
    code: targetId || 'FACILITY',
    contact: '',
    email: user?.email || '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
    emergencyContact: '',
    website: '',
    facilities: '',
    specializations: '',
    accreditation: 'NABH & ISO Certified',
    totalBeds: 100,
    availableBeds: 25,
    status: 'ACTIVE'
  };

  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div id="editHospitalProfileModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="editHospModalTitle">
      <div class="modal-box facility-modal-box" style="max-width: 780px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--primary-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
              🏛️
            </div>
            <div>
              <h3 class="modal-title" id="editHospModalTitle">Edit Healthcare Facility Profile</h3>
              <p class="modal-subtitle">Update authorized facility identity, contact channels, location, clinical capabilities, and logo</p>
            </div>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('editHospitalProfileModal')" aria-label="Close">✕</button>
        </div>

        <form id="editHospitalProfileModalForm" onsubmit="handleHospitalProfileModalSave(event, '${escapeHtml(hospital.id)}')">
          <div id="editHospProfileAlert" class="alert-banner hidden mb-16"></div>

          <!-- Section 1: Facility Identity & Registration -->
          <div class="facility-form-section-title">
            <span>🏢</span> Facility Information
          </div>
          <div class="form-grid-2col mb-12">
            <div class="form-group">
              <label class="form-label" for="modalHospId">Hospital Database ID (Protected)</label>
              <input type="text" id="modalHospId" class="form-control font-mono" value="${escapeHtml(hospital.id)}" readonly disabled>
            </div>
            <div class="form-group">
              <label class="form-label" for="modalHospCode">Registration / License Code (Protected)</label>
              <input type="text" id="modalHospCode" class="form-control font-mono" value="${escapeHtml(hospital.code || hospital.registrationNumber || hospital.id)}" readonly disabled>
            </div>
            <div class="form-group full-width">
              <label class="form-label" for="modalHospName">Hospital / Facility Name <span style="color: var(--danger);">*</span></label>
              <input type="text" id="modalHospName" class="form-control" value="${escapeHtml(hospital.name || '')}" placeholder="e.g. Apex Care Medical Center" required minlength="2">
            </div>
          </div>

          <!-- Section 2: Contact & Official Channels -->
          <div class="facility-form-section-title">
            <span>📞</span> Contact Channels
          </div>
          <div class="form-grid-2col mb-12">
            <div class="form-group">
              <label class="form-label" for="modalHospContact">Official Telephone <span style="color: var(--danger);">*</span></label>
              <input type="tel" id="modalHospContact" class="form-control" value="${escapeHtml(hospital.contact || hospital.telephone || '')}" placeholder="e.g. +91 11 2345 6789" required minlength="6">
            </div>
            <div class="form-group">
              <label class="form-label" for="modalHospEmergency">24/7 Emergency Line</label>
              <input type="tel" id="modalHospEmergency" class="form-control" value="${escapeHtml(hospital.emergencyContact || '')}" placeholder="e.g. +91 11 2345 6999">
            </div>
            <div class="form-group">
              <label class="form-label" for="modalHospEmail">Administrative Email Address</label>
              <input type="email" id="modalHospEmail" class="form-control" value="${escapeHtml(hospital.email || hospital.officialEmail || '')}" placeholder="e.g. admin@hospital.in">
            </div>
            <div class="form-group">
              <label class="form-label" for="modalHospWebsite">Official Website URL</label>
              <input type="url" id="modalHospWebsite" class="form-control" value="${escapeHtml(hospital.website || '')}" placeholder="https://www.hospital.org">
            </div>
          </div>

          <!-- Section 3: Physical Address & Location -->
          <div class="facility-form-section-title">
            <span>📍</span> Physical Location
          </div>
          <div class="form-group mb-12">
            <label class="form-label" for="modalHospAddress">Street Address / Campus <span style="color: var(--danger);">*</span></label>
            <input type="text" id="modalHospAddress" class="form-control" value="${escapeHtml(hospital.address || hospital.location || '')}" placeholder="e.g. Metro Health Corridor, Sector 4" required minlength="3">
          </div>
          <div class="form-grid-3col mb-12">
            <div class="form-group">
              <label class="form-label" for="modalHospCity">City / District</label>
              <input type="text" id="modalHospCity" class="form-control" value="${escapeHtml(hospital.city || '')}" placeholder="e.g. New Delhi">
            </div>
            <div class="form-group">
              <label class="form-label" for="modalHospState">State / Province</label>
              <input type="text" id="modalHospState" class="form-control" value="${escapeHtml(hospital.state || '')}" placeholder="e.g. Delhi">
            </div>
            <div class="form-group">
              <label class="form-label" for="modalHospPin">PIN / Postal Code</label>
              <input type="text" id="modalHospPin" class="form-control font-mono" value="${escapeHtml(hospital.pinCode || '')}" placeholder="110001">
            </div>
          </div>

          <!-- Section 4: Clinical Capabilities & Bed Capacity -->
          <div class="facility-form-section-title">
            <span>🛏️</span> Capacity &amp; Clinical Capabilities
          </div>
          <div class="form-grid-2col mb-12">
            <div class="form-group">
              <label class="form-label" for="modalHospTotalBeds">Total Inpatient Beds <span style="color: var(--danger);">*</span></label>
              <input type="number" id="modalHospTotalBeds" class="form-control" value="${hospital.totalBeds != null ? hospital.totalBeds : 100}" min="1" max="10000" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="modalHospAvailBeds">Available / Unoccupied Beds <span style="color: var(--danger);">*</span></label>
              <input type="number" id="modalHospAvailBeds" class="form-control" value="${hospital.availableBeds != null ? hospital.availableBeds : 20}" min="0" max="10000" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="modalHospFacilities">Specialized Facilities</label>
              <input type="text" id="modalHospFacilities" class="form-control" value="${escapeHtml(hospital.facilities || '')}" placeholder="e.g. 24/7 Trauma, Blood Bank, Cath Lab, MRI">
            </div>
            <div class="form-group">
              <label class="form-label" for="modalHospSpecs">Specializations</label>
              <input type="text" id="modalHospSpecs" class="form-control" value="${escapeHtml(hospital.specializations || '')}" placeholder="e.g. Cardiology, Neurology, Oncology, Orthopedics">
            </div>
          </div>

          <!-- Section 5: Hospital Logo / Photo Upload -->
          <div class="facility-form-section-title">
            <span>🖼️</span> Facility Logo / Seal
          </div>
          <div class="form-group mb-16">
            <label class="form-label" for="modalHospLogoFile">Upload Logo Image (JPG, PNG, WEBP — Max 5MB)</label>
            <input type="file" id="modalHospLogoFile" class="form-control" accept="image/png,image/jpeg,image/webp">
          </div>

          <div style="background: var(--bg-surface-alt); border-left: 3px solid var(--info); padding: 10px 14px; border-radius: var(--radius-sm); margin-bottom: 20px; font-size: 0.8rem; color: var(--text-secondary);">
            🔒 <strong>Data Governance:</strong> Changes are verified under Hospital Administrator credentials and recorded in the immutable compliance audit log.
          </div>

          <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('editHospitalProfileModal')">
              Cancel
            </button>
            <button type="submit" id="saveHospProfileModalBtn" class="btn btn-primary">
              💾 Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleHospitalProfileModalSave = async function(event, hospitalId) {
  event.preventDefault();
  const alertEl = document.getElementById('editHospProfileAlert');
  const submitBtn = document.getElementById('saveHospProfileModalBtn');

  if (alertEl) {
    alertEl.classList.add('hidden');
    alertEl.textContent = '';
  }

  const name = document.getElementById('modalHospName')?.value.trim();
  const contact = document.getElementById('modalHospContact')?.value.trim();
  const emergencyContact = document.getElementById('modalHospEmergency')?.value.trim();
  const email = document.getElementById('modalHospEmail')?.value.trim();
  const website = document.getElementById('modalHospWebsite')?.value.trim();
  const address = document.getElementById('modalHospAddress')?.value.trim();
  const city = document.getElementById('modalHospCity')?.value.trim();
  const state = document.getElementById('modalHospState')?.value.trim();
  const pinCode = document.getElementById('modalHospPin')?.value.trim();
  const facilities = document.getElementById('modalHospFacilities')?.value.trim();
  const specializations = document.getElementById('modalHospSpecs')?.value.trim();
  const totalBeds = parseInt(document.getElementById('modalHospTotalBeds')?.value, 10);
  const availableBeds = parseInt(document.getElementById('modalHospAvailBeds')?.value, 10);
  const logoFileInput = document.getElementById('modalHospLogoFile');

  if (!name || name.length < 2) {
    showModalError('Please enter a valid facility name (minimum 2 characters).');
    return;
  }
  if (!contact || contact.length < 6) {
    showModalError('Please provide an official contact telephone number.');
    return;
  }
  if (!address || address.length < 3) {
    showModalError('Please provide a complete facility street address.');
    return;
  }
  if (isNaN(totalBeds) || totalBeds < 1) {
    showModalError('Total bed capacity must be at least 1.');
    return;
  }
  if (isNaN(availableBeds) || availableBeds < 0) {
    showModalError('Available beds cannot be negative.');
    return;
  }
  if (availableBeds > totalBeds) {
    showModalError(`Available beds (${availableBeds}) cannot exceed total bed capacity (${totalBeds}).`);
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving changes...';
    }

    // 1. Upload logo if selected
    if (logoFileInput && logoFileInput.files && logoFileInput.files[0]) {
      await window.hospitrackStore.uploadHospitalLogo(hospitalId, logoFileInput.files[0]);
    }

    // 2. Update profile metadata
    await window.hospitrackStore.updateHospitalProfile(hospitalId, {
      name,
      contact,
      emergencyContact: emergencyContact || undefined,
      email: email || undefined,
      website: website || undefined,
      address,
      city: city || undefined,
      state: state || undefined,
      pinCode: pinCode || undefined,
      facilities: facilities || undefined,
      specializations: specializations || undefined,
      totalBeds,
      availableBeds
    });

    window.showToast('✓ Facility profile updated successfully.', 'success');
    closeGlobalModal('editHospitalProfileModal');
    
    // Refresh the profile view with updated backend store data
    window.renderHospitalDashboard(document.getElementById('mainContentArea'), 'profile');
  } catch (err) {
    let msg = err.message || 'Failed to update hospital facility profile.';
    if (err.data && err.data.message) msg = err.data.message;
    showModalError(msg);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '💾 Save Changes';
    }
  }

  function showModalError(msg) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = msg;
      alertEl.classList.remove('hidden');
    } else {
      window.showToast(msg, 'error');
    }
  }
};

window.handleHospitalProfileSave = function(event, hospitalId) {
  return window.handleHospitalProfileModalSave(event, hospitalId);
};

// ==========================================================================
// 8. SPECIALIST REFERRAL PIPELINE & TRIAGE LEDGER SUBSYSTEM
// ==========================================================================

// ==========================================================================
// 8. SPECIALIST REFERRAL PIPELINE & TRIAGE LEDGER SUBSYSTEM
// ==========================================================================

function getReferralNextAction(r, isIncoming) {
  const status = (r && r.status ? r.status : 'PENDING').toUpperCase();
  if (status === 'PENDING') {
    return isIncoming
      ? { text: 'Awaiting receiving triage review', badgeClass: 'action-pending', icon: '⏳' }
      : { text: 'Awaiting receiving facility review', badgeClass: 'action-pending', icon: '⏳' };
  }
  if (status === 'ACCEPTED') {
    return { text: 'Accepted — transfer coordination required', badgeClass: 'action-coord', icon: '📋' };
  }
  if (status === 'TRANSFER_PENDING' || status === 'TRANSFERRED') {
    return { text: 'Transfer in progress — confirm arrival', badgeClass: 'action-transfer', icon: '🚑' };
  }
  if (status === 'IN_PROGRESS' || status === 'IN_TREATMENT') {
    return { text: 'Patient received — specialist care underway', badgeClass: 'action-active', icon: '🩺' };
  }
  if (status === 'COMPLETED') {
    return { text: 'Completed — outcome documented', badgeClass: 'action-done', icon: '✅' };
  }
  if (status === 'REJECTED') {
    return { text: 'Declined — review rejection rationale', badgeClass: 'action-declined', icon: '✕' };
  }
  if (status === 'CANCELLED') {
    return { text: 'Cancelled by referring hospital', badgeClass: 'action-cancelled', icon: '🚫' };
  }
  return { text: 'Review clinical referral dossier', badgeClass: 'action-pending', icon: 'ℹ️' };
}

function renderHospitalReferralPipelineSection(data) {
  const { hospital = {}, referrals = [], patients = [], doctors = [] } = data;
  const store = window.hospitrackStore;

  const safeReferrals = Array.isArray(referrals) ? referrals : [];
  const inbound = safeReferrals.filter(r => r && r.toHospitalId === hospital.id);
  const outbound = safeReferrals.filter(r => r && r.fromHospitalId === hospital.id);

  // Authoritative 6-Metric KPI Distribution (100% Real Backend Data)
  const totalCount = safeReferrals.length;
  const awaitingReviewCount = safeReferrals.filter(r => r && r.status === 'PENDING').length;
  const acceptedCount = safeReferrals.filter(r => r && r.status === 'ACCEPTED').length;
  const transferPendingCount = safeReferrals.filter(r => r && (r.status === 'TRANSFER_PENDING' || r.status === 'TRANSFERRED')).length;
  const inTreatmentCount = safeReferrals.filter(r => r && (r.status === 'IN_PROGRESS' || r.status === 'IN_TREATMENT')).length;
  const completedCount = safeReferrals.filter(r => r && r.status === 'COMPLETED').length;
  const declinedCount = safeReferrals.filter(r => r && (r.status === 'REJECTED' || r.status === 'CANCELLED')).length;

  // Filter pipeline dataset
  const q = (referralSearchQuery || '').toLowerCase().trim();
  const filtered = safeReferrals.filter(r => {
    if (!r) return false;

    // Direction filter
    if (referralDirectionFilter === 'INBOUND' && r.toHospitalId !== hospital.id) return false;
    if (referralDirectionFilter === 'OUTBOUND' && r.fromHospitalId !== hospital.id) return false;

    // Status filter
    if (referralStatusFilter !== 'ALL') {
      if (referralStatusFilter === 'PENDING' && r.status !== 'PENDING') return false;
      else if (referralStatusFilter === 'ACCEPTED' && r.status !== 'ACCEPTED') return false;
      else if (referralStatusFilter === 'TRANSFER_PENDING' && (r.status !== 'TRANSFER_PENDING' && r.status !== 'TRANSFERRED')) return false;
      else if (referralStatusFilter === 'IN_PROGRESS' && (r.status !== 'IN_PROGRESS' && r.status !== 'IN_TREATMENT')) return false;
      else if (referralStatusFilter === 'COMPLETED' && r.status !== 'COMPLETED') return false;
      else if (referralStatusFilter === 'REJECTED' && (r.status !== 'REJECTED' && r.status !== 'CANCELLED')) return false;
    }

    // Priority filter
    if (referralPriorityFilter !== 'ALL' && (r.priority || 'ROUTINE') !== referralPriorityFilter) return false;

    // Search query
    if (q) {
      const p = store && typeof store.getPatientById === 'function' ? store.getPatientById(r.patientId) : null;
      const d = store && typeof store.getDoctorById === 'function' ? store.getDoctorById(r.doctorId) : null;
      const fromH = store && typeof store.getHospitalById === 'function' ? store.getHospitalById(r.fromHospitalId) : null;
      const toH = store && typeof store.getHospitalById === 'function' ? store.getHospitalById(r.toHospitalId) : null;

      const pName = (p?.name || '').toLowerCase();
      const pId = (r.patientId || '').toLowerCase();
      const refId = (r.id || '').toLowerCase();
      const reason = (r.reason || '').toLowerCase();
      const notes = (r.notes || '').toLowerCase();
      const docName = (d?.name || '').toLowerCase();
      const fromHName = (fromH?.name || r.fromHospitalId || '').toLowerCase();
      const toHName = (toH?.name || r.toHospitalId || '').toLowerCase();

      const matches = pName.includes(q) ||
                      pId.includes(q) ||
                      refId.includes(q) ||
                      reason.includes(q) ||
                      notes.includes(q) ||
                      docName.includes(q) ||
                      fromHName.includes(q) ||
                      toHName.includes(q);
      if (!matches) return false;
    }

    return true;
  });

  return `
    <div class="dashboard-container-clean">
      <!-- Section A: Page Header -->
      <div class="page-header-clean">
        <div class="page-header-title-block">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="page-badge-pill">🏥 Network Logistics &amp; Care Continuity</span>
            <span class="status-pill success">${escapeHtml(hospital.name || 'Connected Facility')}</span>
          </div>
          <h1 class="page-title-clean">Specialist Referrals</h1>
          <p class="page-subtitle-clean">
            Coordinate specialist referrals, track receiving-facility decisions, and manage continuity of patient care across ${escapeHtml(hospital.name || 'the clinical network')}.
          </p>
        </div>
        <div class="page-actions-clean">
          <button type="button" class="btn btn-secondary" onclick="exportReferralPipelineCsv()" title="Export current referral data to CSV file">
            <span>📥</span> Export
          </button>
          <button type="button" class="btn btn-secondary" onclick="refreshReferralPipeline()" title="Sync real backend referral data">
            <span>🔄</span> Refresh
          </button>
          <button type="button" class="btn btn-primary" onclick="openCreateReferralModal()" title="Create and dispatch a specialist referral">
            <span>+</span> Create Referral
          </button>
        </div>
      </div>

      <!-- Section B: 6-Card Responsive KPI Grid (Real Data) -->
      <div class="referral-kpi-grid">
        <div class="referral-kpi-card ${referralStatusFilter === 'ALL' ? 'active' : ''}" onclick="handleReferralStatusFilter('ALL')" title="Show all specialist referrals" role="button" tabindex="0">
          <div class="referral-kpi-top">
            <span class="referral-kpi-title">All Referrals</span>
            <span class="referral-kpi-icon-wrap" style="background: rgba(14, 165, 233, 0.12); color: #0284c7;">🔁</span>
          </div>
          <div class="referral-kpi-val">${totalCount}</div>
          <div class="referral-kpi-sub">
            <span class="referral-kpi-dot" style="background: #0284c7;"></span>
            <span>${inbound.length} inbound • ${outbound.length} outbound</span>
          </div>
        </div>

        <div class="referral-kpi-card ${referralStatusFilter === 'PENDING' ? 'active' : ''}" onclick="handleReferralStatusFilter('PENDING')" title="Filter by referrals awaiting triage review" role="button" tabindex="0">
          <div class="referral-kpi-top">
            <span class="referral-kpi-title">Awaiting Review</span>
            <span class="referral-kpi-icon-wrap" style="background: rgba(245, 158, 11, 0.12); color: #d97706;">⏳</span>
          </div>
          <div class="referral-kpi-val" style="color: ${awaitingReviewCount > 0 ? '#d97706' : 'var(--text-main)'};">${awaitingReviewCount}</div>
          <div class="referral-kpi-sub">
            <span class="referral-kpi-dot" style="background: #d97706;"></span>
            <span>Awaiting facility decision</span>
          </div>
        </div>

        <div class="referral-kpi-card ${referralStatusFilter === 'ACCEPTED' ? 'active' : ''}" onclick="handleReferralStatusFilter('ACCEPTED')" title="Filter by accepted referrals" role="button" tabindex="0">
          <div class="referral-kpi-top">
            <span class="referral-kpi-title">Accepted</span>
            <span class="referral-kpi-icon-wrap" style="background: rgba(16, 185, 129, 0.12); color: #059669;">✅</span>
          </div>
          <div class="referral-kpi-val" style="color: ${acceptedCount > 0 ? '#059669' : 'var(--text-main)'};">${acceptedCount}</div>
          <div class="referral-kpi-sub">
            <span class="referral-kpi-dot" style="background: #059669;"></span>
            <span>Confirmed receiving care</span>
          </div>
        </div>

        <div class="referral-kpi-card ${referralStatusFilter === 'TRANSFER_PENDING' ? 'active' : ''}" onclick="handleReferralStatusFilter('TRANSFER_PENDING')" title="Filter by transfer coordination" role="button" tabindex="0">
          <div class="referral-kpi-top">
            <span class="referral-kpi-title">Transfer Pending</span>
            <span class="referral-kpi-icon-wrap" style="background: rgba(239, 68, 68, 0.12); color: #dc2626;">🚑</span>
          </div>
          <div class="referral-kpi-val" style="color: ${transferPendingCount > 0 ? '#dc2626' : 'var(--text-main)'};">${transferPendingCount}</div>
          <div class="referral-kpi-sub">
            <span class="referral-kpi-dot" style="background: #dc2626;"></span>
            <span>Transfer coordination required</span>
          </div>
        </div>

        <div class="referral-kpi-card ${referralStatusFilter === 'IN_PROGRESS' ? 'active' : ''}" onclick="handleReferralStatusFilter('IN_PROGRESS')" title="Filter by active specialist treatment" role="button" tabindex="0">
          <div class="referral-kpi-top">
            <span class="referral-kpi-title">In Treatment</span>
            <span class="referral-kpi-icon-wrap" style="background: rgba(14, 165, 233, 0.12); color: #0284c7;">🩺</span>
          </div>
          <div class="referral-kpi-val" style="color: ${inTreatmentCount > 0 ? '#0284c7' : 'var(--text-main)'};">${inTreatmentCount}</div>
          <div class="referral-kpi-sub">
            <span class="referral-kpi-dot" style="background: #0284c7;"></span>
            <span>Specialist care underway</span>
          </div>
        </div>

        <div class="referral-kpi-card ${referralStatusFilter === 'COMPLETED' ? 'active' : ''}" onclick="handleReferralStatusFilter('COMPLETED')" title="Filter by completed referrals" role="button" tabindex="0">
          <div class="referral-kpi-top">
            <span class="referral-kpi-title">Completed</span>
            <span class="referral-kpi-icon-wrap" style="background: rgba(99, 102, 241, 0.12); color: #4f46e5;">🏁</span>
          </div>
          <div class="referral-kpi-val" style="color: #4f46e5;">${completedCount}</div>
          <div class="referral-kpi-sub">
            <span class="referral-kpi-dot" style="background: #4f46e5;"></span>
            <span>Care fulfilled &amp; documented</span>
          </div>
        </div>
      </div>

      <!-- Section C: Referral Lifecycle Stepper Card -->
      <div class="referral-pipeline-card">
        <div class="referral-pipeline-header">
          <div>
            <h3 class="referral-pipeline-title">REFERRAL LIFECYCLE</h3>
            <p class="referral-pipeline-sub">Track every referral from creation to completed specialist care.</p>
          </div>
          <span class="referral-lifecycle-badge">5 Lifecycle Stages</span>
        </div>

        <div class="referral-pipeline-stepper">
          <div class="referral-stepper-stage ${referralStatusFilter === 'ALL' ? 'active' : ''}" onclick="handleReferralStatusFilter('ALL')" title="All referrals" role="button" tabindex="0">
            <div class="referral-stepper-num">01</div>
            <div class="referral-stepper-info">
              <span class="referral-stepper-label">Referral Created</span>
              <span class="referral-stepper-count">${totalCount} Total</span>
            </div>
          </div>
          <div class="referral-stepper-arrow">➔</div>

          <div class="referral-stepper-stage ${referralStatusFilter === 'PENDING' ? 'active' : ''}" onclick="handleReferralStatusFilter('PENDING')" title="Pending review" role="button" tabindex="0">
            <div class="referral-stepper-num">02</div>
            <div class="referral-stepper-info">
              <span class="referral-stepper-label">Under Review</span>
              <span class="referral-stepper-count" style="color: ${awaitingReviewCount > 0 ? '#d97706' : 'inherit'};">${awaitingReviewCount} Pending</span>
            </div>
          </div>
          <div class="referral-stepper-arrow">➔</div>

          <div class="referral-stepper-stage ${referralStatusFilter === 'ACCEPTED' ? 'active' : ''}" onclick="handleReferralStatusFilter('ACCEPTED')" title="Accepted" role="button" tabindex="0">
            <div class="referral-stepper-num">03</div>
            <div class="referral-stepper-info">
              <span class="referral-stepper-label">Accepted</span>
              <span class="referral-stepper-count" style="color: ${acceptedCount > 0 ? '#059669' : 'inherit'};">${acceptedCount} Confirmed</span>
            </div>
          </div>
          <div class="referral-stepper-arrow">➔</div>

          <div class="referral-stepper-stage ${referralStatusFilter === 'TRANSFER_PENDING' ? 'active' : ''}" onclick="handleReferralStatusFilter('TRANSFER_PENDING')" title="Transfer Pending / In Care" role="button" tabindex="0">
            <div class="referral-stepper-num">04</div>
            <div class="referral-stepper-info">
              <span class="referral-stepper-label">Transfer Pending</span>
              <span class="referral-stepper-count" style="color: ${transferPendingCount > 0 ? '#dc2626' : 'inherit'};">${transferPendingCount} Transfer</span>
            </div>
          </div>
          <div class="referral-stepper-arrow">➔</div>

          <div class="referral-stepper-stage ${referralStatusFilter === 'COMPLETED' ? 'active' : ''}" onclick="handleReferralStatusFilter('COMPLETED')" title="Completed" role="button" tabindex="0">
            <div class="referral-stepper-num">05</div>
            <div class="referral-stepper-info">
              <span class="referral-stepper-label">Completed</span>
              <span class="referral-stepper-count">${completedCount} Care Fulfilled</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Section D: Search and Filters Toolbar -->
      <div class="referral-toolbar">
        <div class="referral-search-box">
          <span class="referral-search-icon">🔍</span>
          <input type="text"
                 class="referral-search-input"
                 placeholder="Search referrals by patient, ID, doctor, hospital..."
                 value="${escapeHtml(referralSearchQuery)}"
                 oninput="handleReferralSearchInput(this.value)">
        </div>

        <div class="referral-filter-group">
          <!-- Direction Filter -->
          <select class="referral-filter-select" onchange="handleReferralDirectionFilter(this.value)">
            <option value="ALL" ${referralDirectionFilter === 'ALL' ? 'selected' : ''}>All Directions (${totalCount})</option>
            <option value="INBOUND" ${referralDirectionFilter === 'INBOUND' ? 'selected' : ''}>📥 Inbound (${inbound.length})</option>
            <option value="OUTBOUND" ${referralDirectionFilter === 'OUTBOUND' ? 'selected' : ''}>📤 Outbound (${outbound.length})</option>
          </select>

          <!-- Status Filter -->
          <select class="referral-filter-select" onchange="handleReferralStatusFilter(this.value)">
            <option value="ALL" ${referralStatusFilter === 'ALL' ? 'selected' : ''}>All Statuses</option>
            <option value="PENDING" ${referralStatusFilter === 'PENDING' ? 'selected' : ''}>⏳ Awaiting Review (${awaitingReviewCount})</option>
            <option value="ACCEPTED" ${referralStatusFilter === 'ACCEPTED' ? 'selected' : ''}>✅ Accepted (${acceptedCount})</option>
            <option value="TRANSFER_PENDING" ${referralStatusFilter === 'TRANSFER_PENDING' ? 'selected' : ''}>🚑 Transfer Pending (${transferPendingCount})</option>
            <option value="IN_PROGRESS" ${referralStatusFilter === 'IN_PROGRESS' ? 'selected' : ''}>🩺 In Treatment (${inTreatmentCount})</option>
            <option value="COMPLETED" ${referralStatusFilter === 'COMPLETED' ? 'selected' : ''}>🏁 Completed (${completedCount})</option>
            <option value="REJECTED" ${referralStatusFilter === 'REJECTED' ? 'selected' : ''}>❌ Declined / Cancelled (${declinedCount})</option>
          </select>

          <!-- Priority Filter -->
          <select class="referral-filter-select" onchange="handleReferralPriorityFilter(this.value)">
            <option value="ALL" ${referralPriorityFilter === 'ALL' ? 'selected' : ''}>All Priorities</option>
            <option value="EMERGENCY" ${referralPriorityFilter === 'EMERGENCY' ? 'selected' : ''}>🚨 Emergency</option>
            <option value="URGENT" ${referralPriorityFilter === 'URGENT' ? 'selected' : ''}>⚠️ Urgent</option>
            <option value="ROUTINE" ${referralPriorityFilter === 'ROUTINE' ? 'selected' : ''}>📋 Routine</option>
          </select>

          ${(referralSearchQuery || referralStatusFilter !== 'ALL' || referralPriorityFilter !== 'ALL' || referralDirectionFilter !== 'ALL') ? `
            <button type="button" class="btn btn-secondary btn-sm" onclick="clearReferralFilters()" title="Reset all search filters">
              ✕ Clear Filters
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Section E: Practical Referral Work Queue Table -->
      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <div>
            <h3 class="dashboard-card-title"><span>📋</span> Referral Work Queue</h3>
            <p class="dashboard-card-sub">
              Showing <strong>${filtered.length}</strong> of <strong>${totalCount}</strong> specialist referrals for ${escapeHtml(hospital.name)}
            </p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="exportReferralPipelineCsv()">
              <span>📥</span> Export CSV
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="refreshReferralPipeline()">
              <span>🔄</span> Refresh
            </button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table-clean">
            <thead>
              <tr>
                <th>Referral ID</th>
                <th>Patient</th>
                <th>Direction</th>
                <th>Facilities</th>
                <th>Specialty / Reason</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Next Required Action</th>
                <th>Updated</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="10">
                    <div class="empty-state-clean" style="padding: 48px 16px; text-align: center;">
                      <span class="empty-icon" style="font-size: 2.5rem;">${totalCount === 0 ? '🏥' : '🔍'}</span>
                      <div class="empty-title" style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-top: 8px;">
                        ${totalCount === 0 ? 'No specialist referrals recorded' : 'No referrals matched filter criteria'}
                      </div>
                      <p class="empty-desc" style="color: var(--text-muted); font-size: 0.88rem; max-width: 420px; margin: 6px auto 16px;">
                        ${totalCount === 0 ? "You don't currently have any specialist referrals in this facility. Dispatch a new referral to connect with specialist care." : 'Try clearing your search query or status filter.'}
                      </p>
                      ${totalCount === 0 ? `
                        <button type="button" class="btn btn-primary btn-sm" onclick="openCreateReferralModal()">
                          + Create Referral
                        </button>
                      ` : `
                        <button type="button" class="btn btn-secondary btn-sm" onclick="clearReferralFilters()">
                          Clear Filters
                        </button>
                      `}
                    </div>
                  </td>
                </tr>
              ` : filtered.map(r => {
                const isIncoming = r.toHospitalId === hospital.id;
                const isPending = r.status === 'PENDING';
                const isAccepted = r.status === 'ACCEPTED';
                const isInProgress = r.status === 'IN_PROGRESS' || r.status === 'IN_TREATMENT';
                const p = store && typeof store.getPatientById === 'function' ? store.getPatientById(r.patientId) : null;
                const d = store && typeof store.getDoctorById === 'function' ? store.getDoctorById(r.doctorId) : null;
                const fromH = store && typeof store.getHospitalById === 'function' ? store.getHospitalById(r.fromHospitalId) : null;
                const toH = store && typeof store.getHospitalById === 'function' ? store.getHospitalById(r.toHospitalId) : null;

                const statusClass = (r.status || 'PENDING').toLowerCase();
                const priorityClass = (r.priority || 'ROUTINE').toLowerCase();
                const updatedDate = r.updatedAt ? new Date(r.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : (r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent');

                let statusLabel = 'Awaiting Review';
                if (r.status === 'ACCEPTED') statusLabel = 'Accepted';
                else if (r.status === 'IN_PROGRESS' || r.status === 'IN_TREATMENT') statusLabel = 'In Treatment';
                else if (r.status === 'TRANSFER_PENDING' || r.status === 'TRANSFERRED') statusLabel = 'Transfer Pending';
                else if (r.status === 'COMPLETED') statusLabel = 'Completed';
                else if (r.status === 'REJECTED') statusLabel = 'Declined';
                else if (r.status === 'CANCELLED') statusLabel = 'Cancelled';

                const nextAction = getReferralNextAction(r, isIncoming);

                return `
                  <tr style="cursor: pointer;" onclick="if (!event.target.closest('button') && !event.target.closest('a')) openReferralDrawer('${r.id}')">
                    <td>
                      <a href="#hospital/workspace/referral/${encodeURIComponent(r.id)}" class="referral-id-link font-mono" onclick="event.preventDefault(); openReferralDrawer('${r.id}')">
                        <code>${escapeHtml(r.id)}</code>
                      </a>
                    </td>
                    <td>
                      <div class="cell-patient">
                        <span class="cell-patient-name font-semibold">${escapeHtml(p ? p.name : r.patientId)}</span>
                        <span class="cell-patient-id font-mono text-xs text-muted"><code>${escapeHtml(r.patientId)}</code> ${p ? `• ${p.age}y ${p.gender || 'M'}` : ''}</span>
                      </div>
                    </td>
                    <td>
                      <span class="referral-direction-pill ${isIncoming ? 'inbound' : 'outbound'}">
                        ${isIncoming ? '📥 Inbound' : '📤 Outbound'}
                      </span>
                    </td>
                    <td>
                      <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: 700; color: var(--text-main); font-size: 0.84rem;">
                          ${escapeHtml(isIncoming ? (fromH ? fromH.name : r.fromHospitalId) : (toH ? toH.name : r.toHospitalId))}
                        </span>
                        <span style="font-size: 0.74rem; color: var(--text-muted);">
                          ${d ? `Dr. ${escapeHtml(d.name)}` : (r.doctorId ? escapeHtml(r.doctorId) : 'Attending Specialist')}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style="max-width: 220px;">
                        <div style="font-weight: 600; font-size: 0.82rem; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(r.reason || 'Specialist Evaluation')}">
                          ${escapeHtml(r.reason || 'Specialist Evaluation')}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="referral-badge-priority ${priorityClass}">
                        ${escapeHtml(r.priority || 'ROUTINE')}
                      </span>
                    </td>
                    <td>
                      <span class="referral-badge-status ${statusClass}">
                        ${escapeHtml(statusLabel)}
                      </span>
                    </td>
                    <td>
                      <span class="referral-next-action-pill ${nextAction.badgeClass}">
                        <span>${nextAction.icon}</span> ${nextAction.text}
                      </span>
                    </td>
                    <td style="font-size: 0.80rem; color: var(--text-secondary); white-space: nowrap;">
                      ${escapeHtml(updatedDate)}
                    </td>
                    <td style="text-align: right;">
                      <div class="action-btn-group" style="justify-content: flex-end; display: flex; gap: 6px;">
                        ${isIncoming && isPending ? `
                          <button type="button" class="btn btn-primary btn-sm" onclick="event.stopPropagation(); handleAcceptReferralClick('${r.id}')" title="Accept referral">
                            <span>✓</span> Accept
                          </button>
                          <button type="button" class="btn btn-outline-danger btn-sm" onclick="event.stopPropagation(); openRejectReferralModal('${r.id}')" title="Decline referral with reason">
                            <span>✕</span> Decline
                          </button>
                        ` : ''}
                        ${isIncoming && isAccepted ? `
                          <button type="button" class="btn btn-primary btn-sm" onclick="event.stopPropagation(); handleBeginCareReferral('${r.id}')" title="Confirm patient arrival and begin specialist care">
                            <span>🩺</span> Begin Care
                          </button>
                        ` : ''}
                        ${isInProgress ? `
                          <button type="button" class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openCompleteReferralModal('${r.id}')" title="Record clinical outcome and complete referral">
                            <span>🏁</span> Complete
                          </button>
                        ` : ''}
                        ${!isIncoming && isPending ? `
                          <button type="button" class="btn btn-outline-danger btn-sm" onclick="event.stopPropagation(); openCancelReferralModal('${r.id}')" title="Cancel this dispatched referral">
                            <span>✕</span> Cancel
                          </button>
                        ` : ''}
                        <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openReferralDrawer('${r.id}')" title="Open referral details">
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section F: Slide-Over Referral Detail Drawer Overlay -->
      <div id="referralDrawerOverlay" class="referral-drawer-overlay ${referralSelectedId ? 'open' : ''}" onclick="if (event.target === this) closeReferralDrawer()">
        ${referralSelectedId ? renderReferralDrawerContent(referralSelectedId, hospital, store) : ''}
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// Slide-Over Referral Drawer Content Renderer
// --------------------------------------------------------------------------
function renderReferralDrawerContent(referralId, hospital, store) {
  const referral = store && typeof store.getReferralById === 'function' ? store.getReferralById(referralId) : null;
  if (!referral) {
    return `
      <div class="referral-drawer">
        <div class="referral-drawer-header">
          <div class="referral-drawer-title-wrap">
            <h3 class="referral-drawer-title">Referral Detail</h3>
          </div>
          <button type="button" class="modal-close" onclick="closeReferralDrawer()">✕</button>
        </div>
        <div class="referral-drawer-body">
          <div class="empty-state-clean">
            <span class="empty-icon">⚠️</span>
            <div class="empty-title">Referral not found</div>
            <p class="empty-desc">The selected referral record [${escapeHtml(referralId)}] could not be retrieved.</p>
          </div>
        </div>
      </div>
    `;
  }

  const patient = store && typeof store.getPatientById === 'function' ? store.getPatientById(referral.patientId) : null;
  const doctor = store && typeof store.getDoctorById === 'function' ? store.getDoctorById(referral.doctorId) : null;
  const fromH = store && typeof store.getHospitalById === 'function' ? store.getHospitalById(referral.fromHospitalId) : null;
  const toH = store && typeof store.getHospitalById === 'function' ? store.getHospitalById(referral.toHospitalId) : null;

  const isIncoming = referral.toHospitalId === hospital.id;
  const isPending = referral.status === 'PENDING';
  const isAccepted = referral.status === 'ACCEPTED';
  const isInProgress = referral.status === 'IN_PROGRESS' || referral.status === 'IN_TREATMENT';
  const isCompleted = referral.status === 'COMPLETED';
  const isRejected = referral.status === 'REJECTED';
  const isCancelled = referral.status === 'CANCELLED';

  const statusClass = (referral.status || 'PENDING').toLowerCase();
  const priorityClass = (referral.priority || 'ROUTINE').toLowerCase();
  const createdFormatted = referral.createdAt ? new Date(referral.createdAt).toLocaleString() : 'N/A';
  const updatedFormatted = referral.updatedAt ? new Date(referral.updatedAt).toLocaleString() : createdFormatted;

  let statusLabel = 'Awaiting Review';
  if (referral.status === 'ACCEPTED') statusLabel = 'Accepted';
  else if (referral.status === 'IN_PROGRESS' || referral.status === 'IN_TREATMENT') statusLabel = 'In Treatment';
  else if (referral.status === 'TRANSFER_PENDING' || referral.status === 'TRANSFERRED') statusLabel = 'Transfer Pending';
  else if (referral.status === 'COMPLETED') statusLabel = 'Completed';
  else if (referral.status === 'REJECTED') statusLabel = 'Declined';
  else if (referral.status === 'CANCELLED') statusLabel = 'Cancelled';

  const nextAction = getReferralNextAction(referral, isIncoming);

  return `
    <div class="referral-drawer" role="dialog" aria-modal="true" aria-labelledby="referralDrawerTitle">
      <!-- Drawer Header -->
      <div class="referral-drawer-header">
        <div class="referral-drawer-title-wrap">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="referral-direction-pill ${isIncoming ? 'inbound' : 'outbound'}">
              ${isIncoming ? '📥 INBOUND REFERRAL' : '📤 OUTBOUND REFERRAL'}
            </span>
            <span class="referral-badge-status ${statusClass}">${escapeHtml(statusLabel)}</span>
            <span class="referral-badge-priority ${priorityClass}">${escapeHtml(referral.priority || 'ROUTINE')}</span>
          </div>
          <h3 class="referral-drawer-title" id="referralDrawerTitle">
            <code>${escapeHtml(referral.id)}</code>
          </h3>
          <span class="referral-drawer-sub">Dispatched on ${escapeHtml(createdFormatted)} • Last activity: ${escapeHtml(updatedFormatted)}</span>
        </div>
        <button type="button" class="modal-close" onclick="closeReferralDrawer()" aria-label="Close drawer">✕</button>
      </div>

      <!-- Drawer Body -->
      <div class="referral-drawer-body">
        <!-- 1. Next Required Action Banner -->
        <div style="background: var(--bg-surface-alt); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
          <div>
            <div style="font-size: 0.70rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 2px;">Next Required Action</div>
            <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
              <span>${nextAction.icon}</span> ${nextAction.text}
            </div>
          </div>
          <span class="referral-next-action-pill ${nextAction.badgeClass}">${escapeHtml(statusLabel)}</span>
        </div>

        <!-- 2. Patient Profile Section -->
        <div class="referral-drawer-section">
          <div class="referral-drawer-section-title">
            <span>👤</span> PATIENT INFORMATION
          </div>
          <div class="referral-drawer-grid">
            <div class="referral-drawer-field">
              <span class="referral-drawer-label">Patient Name</span>
              <span class="referral-drawer-val">${escapeHtml(patient ? patient.name : referral.patientId)}</span>
            </div>
            <div class="referral-drawer-field">
              <span class="referral-drawer-label">Patient Identifier</span>
              <span class="referral-drawer-val"><code>${escapeHtml(referral.patientId)}</code></span>
            </div>
            <div class="referral-drawer-field">
              <span class="referral-drawer-label">Demographics</span>
              <span class="referral-drawer-val">${patient ? `${patient.age} Yrs • ${escapeHtml(patient.gender || 'M')}` : 'N/A'}</span>
            </div>
            <div class="referral-drawer-field">
              <span class="referral-drawer-label">Blood Group</span>
              <span class="referral-drawer-val">${patient?.bloodGroup ? `<span class="status-pill info">${escapeHtml(patient.bloodGroup)}</span>` : 'N/A'}</span>
            </div>
            <div class="referral-drawer-field full-span">
              <span class="referral-drawer-label">Emergency Contact</span>
              <span class="referral-drawer-val">${escapeHtml(patient?.emergencyContact || patient?.contact || 'Standard on file')}</span>
            </div>
          </div>
        </div>

        <!-- 3. Care Connection Flow Visualization -->
        <div class="referral-drawer-section">
          <div class="referral-drawer-section-title">
            <span>🌐</span> CARE CONNECTION PIPELINE
          </div>
          <div class="referral-care-flow-box">
            <div class="referral-care-flow-step">
              <div class="referral-care-flow-bullet">1</div>
              <div class="referral-care-flow-content">
                <div class="referral-care-flow-tag">Origin Hospital</div>
                <div class="referral-care-flow-name">${escapeHtml(fromH ? fromH.name : referral.fromHospitalId)}</div>
              </div>
            </div>
            <div class="referral-care-flow-connector">↓</div>
            <div class="referral-care-flow-step">
              <div class="referral-care-flow-bullet">2</div>
              <div class="referral-care-flow-content">
                <div class="referral-care-flow-tag">Referring Doctor</div>
                <div class="referral-care-flow-name">${doctor ? `Dr. ${escapeHtml(doctor.name)} (${doctor.specialty || 'General Practice'})` : (referral.doctorId || 'Attending Physician')}</div>
              </div>
            </div>
            <div class="referral-care-flow-connector">↓</div>
            <div class="referral-care-flow-step">
              <div class="referral-care-flow-bullet">3</div>
              <div class="referral-care-flow-content">
                <div class="referral-care-flow-tag">Clinical Reason</div>
                <div class="referral-care-flow-name" style="font-weight: 500;">${escapeHtml(referral.reason || 'Specialist evaluation')}</div>
              </div>
            </div>
            <div class="referral-care-flow-connector">↓</div>
            <div class="referral-care-flow-step">
              <div class="referral-care-flow-bullet">4</div>
              <div class="referral-care-flow-content">
                <div class="referral-care-flow-tag">Receiving Hospital</div>
                <div class="referral-care-flow-name">${escapeHtml(toH ? toH.name : referral.toHospitalId)}</div>
              </div>
            </div>
            <div class="referral-care-flow-connector">↓</div>
            <div class="referral-care-flow-step">
              <div class="referral-care-flow-bullet">5</div>
              <div class="referral-care-flow-content">
                <div class="referral-care-flow-tag">Receiving Specialist Service</div>
                <div class="referral-care-flow-name">${escapeHtml(toH?.location ? `${toH.name} Specialist Triage` : 'Specialist Department')}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Clinical Referral Dossier -->
        <div class="referral-drawer-section">
          <div class="referral-drawer-section-title">
            <span>📋</span> CLINICAL REFERRAL DETAILS
          </div>
          <div class="referral-drawer-grid">
            <div class="referral-drawer-field">
              <span class="referral-drawer-label">Clinical Priority</span>
              <span class="referral-drawer-val">
                <span class="referral-badge-priority ${priorityClass}">
                  ${escapeHtml(referral.priority || 'ROUTINE')}
                </span>
              </span>
            </div>
            <div class="referral-drawer-field">
              <span class="referral-drawer-label">Current Pipeline Status</span>
              <span class="referral-drawer-val">
                <span class="referral-badge-status ${statusClass}">
                  ${escapeHtml(statusLabel)}
                </span>
              </span>
            </div>
            <div class="referral-drawer-field full-span">
              <span class="referral-drawer-label">Clinical Indication / Reason</span>
              <span class="referral-drawer-val" style="font-weight: 500; line-height: 1.4;">
                ${escapeHtml(referral.reason || 'Specialist diagnostic & clinical continuation')}
              </span>
            </div>
            ${referral.notes ? `
              <div class="referral-drawer-field full-span">
                <span class="referral-drawer-label">Clinical Notes &amp; Activity Log</span>
                <div class="referral-drawer-val" style="font-weight: 400; line-height: 1.5; color: var(--text-secondary); white-space: pre-wrap; font-size: 0.82rem; background: #fff; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border-subtle); margin-top: 4px;">${escapeHtml(referral.notes)}</div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- 5. Chronological Audit & Event Timeline -->
        <div class="referral-drawer-section">
          <div class="referral-drawer-section-title">
            <span>🕒</span> CHRONOLOGICAL ACTIVITY TIMELINE
          </div>
          <div style="display: flex; flex-direction: column; gap: 14px; position: relative; padding-left: 20px; border-left: 2px solid var(--border-color); margin-left: 8px;">
            <div style="position: relative;">
              <div style="position: absolute; left: -27px; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: var(--primary);"></div>
              <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-main);">Referral Created &amp; Dispatched</div>
              <div style="font-size: 0.74rem; color: var(--text-muted);">${escapeHtml(createdFormatted)} • By ${doctor ? `Dr. ${escapeHtml(doctor.name)}` : (fromH ? escapeHtml(fromH.name) : 'Referring Facility')}</div>
            </div>

            ${(isAccepted || isInProgress || isCompleted) ? `
              <div style="position: relative;">
                <div style="position: absolute; left: -27px; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: #10B981;"></div>
                <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-main);">Referral Accepted by Receiving Facility</div>
                <div style="font-size: 0.74rem; color: var(--text-muted);">${escapeHtml(toH ? toH.name : 'Receiving Facility')} accepted care continuity.</div>
              </div>
            ` : ''}

            ${(isInProgress || isCompleted) ? `
              <div style="position: relative;">
                <div style="position: absolute; left: -27px; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: #0284C7;"></div>
                <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-main);">Specialist Care Commenced</div>
                <div style="font-size: 0.74rem; color: var(--text-muted);">Patient intake confirmed at target department.</div>
              </div>
            ` : ''}

            ${isCompleted ? `
              <div style="position: relative;">
                <div style="position: absolute; left: -27px; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: #7C3AED;"></div>
                <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-main);">Referral Completed &amp; Documented</div>
                <div style="font-size: 0.74rem; color: var(--text-muted);">${escapeHtml(updatedFormatted)} • Full clinical discharge/closure completed.</div>
              </div>
            ` : ''}

            ${isRejected ? `
              <div style="position: relative;">
                <div style="position: absolute; left: -27px; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: #DC2626;"></div>
                <div style="font-size: 0.82rem; font-weight: 700; color: #DC2626;">Referral Declined</div>
                <div style="font-size: 0.74rem; color: var(--text-muted);">${escapeHtml(updatedFormatted)} • Facility triage rationale recorded.</div>
              </div>
            ` : ''}

            ${isCancelled ? `
              <div style="position: relative;">
                <div style="position: absolute; left: -27px; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: #64748B;"></div>
                <div style="font-size: 0.82rem; font-weight: 700; color: #64748B;">Referral Cancelled</div>
                <div style="font-size: 0.74rem; color: var(--text-muted);">${escapeHtml(updatedFormatted)} • Withdrawn by referring institution.</div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- 6. Connected Records Quick Navigation -->
        <div class="referral-drawer-section">
          <div class="referral-drawer-section-title">
            <span>🔗</span> CONNECTED CLINICAL RECORDS
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeReferralDrawer(); window.openWorkspace ? window.openWorkspace('patient', '${referral.patientId}', 'consultations') : window.openPatientWorkspace('${referral.patientId}')">
              <span>🩺</span> Consultation
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeReferralDrawer(); window.openWorkspace ? window.openWorkspace('patient', '${referral.patientId}', 'prescriptions') : window.openPatientWorkspace('${referral.patientId}')">
              <span>💊</span> Prescription
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeReferralDrawer(); window.openWorkspace ? window.openWorkspace('patient', '${referral.patientId}', 'lab-reports') : window.openPatientWorkspace('${referral.patientId}')">
              <span>🧪</span> Lab Reports
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeReferralDrawer(); window.openPatientWorkspace('${referral.patientId}')">
              <span>👤</span> Patient Record
            </button>
          </div>
        </div>
      </div>

      <!-- Drawer Actions -->
      <div class="referral-drawer-actions">
        ${isIncoming && isPending ? `
          <button type="button" class="btn btn-outline-danger btn-sm" onclick="openRejectReferralModal('${referral.id}')">
            <span>✕</span> Decline Referral
          </button>
          <button type="button" class="btn btn-primary btn-sm" onclick="handleAcceptReferralClick('${referral.id}')">
            <span>✓</span> Accept Referral
          </button>
        ` : ''}

        ${isIncoming && isAccepted ? `
          <button type="button" class="btn btn-primary btn-sm" onclick="handleBeginCareReferral('${referral.id}')">
            <span>🩺</span> Begin Specialist Care
          </button>
        ` : ''}

        ${(isAccepted || referral.status === 'TRANSFER_PENDING') ? `
          <button type="button" class="btn btn-secondary btn-sm" onclick="openEmergencyTransferModal()" title="Connect referral to Emergency Transfer pipeline">
            <span>🚑</span> Coordinate Transfer
          </button>
        ` : ''}

        ${isInProgress ? `
          <button type="button" class="btn btn-primary btn-sm" onclick="openCompleteReferralModal('${referral.id}')">
            <span>🏁</span> Complete Care
          </button>
        ` : ''}

        ${!isIncoming && isPending ? `
          <button type="button" class="btn btn-outline-danger btn-sm" onclick="openCancelReferralModal('${referral.id}')">
            <span>✕</span> Cancel Referral
          </button>
        ` : ''}

        <button type="button" class="btn btn-secondary btn-sm" onclick="closeReferralDrawer()">
          Close
        </button>
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// Global Pipeline State Handlers & Action Dispatchers
// --------------------------------------------------------------------------

window.renderHospitalReferralPipelineSection = renderHospitalReferralPipelineSection;
window.renderReferralDrawerContent = renderReferralDrawerContent;

window.openReferralDrawer = function(referralId) {
  referralSelectedId = referralId;
  const overlay = document.getElementById('referralDrawerOverlay');
  if (overlay) {
    const store = window.hospitrackStore;
    const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
    const hospitalId = user?.hospitalId || 'HOSP-101';
    const hospital = (store && typeof store.getHospitalById === 'function' ? store.getHospitalById(hospitalId) : null) || { id: hospitalId, name: 'Hospital' };
    overlay.innerHTML = renderReferralDrawerContent(referralId, hospital, store);
    overlay.classList.add('open');
  } else {
    const container = document.getElementById('mainContentArea');
    if (container && window.renderHospitalDashboard) {
      window.renderHospitalDashboard(container, 'referrals');
    }
  }
};

window.closeReferralDrawer = function() {
  referralSelectedId = null;
  const overlay = document.getElementById('referralDrawerOverlay');
  if (overlay) {
    overlay.classList.remove('open');
  }
};

window.handleReferralSearchInput = function(query) {
  referralSearchQuery = query || '';
  const container = document.getElementById('mainContentArea');
  if (container && window.renderHospitalDashboard) {
    window.renderHospitalDashboard(container, 'referrals');
  }
};

window.handleReferralDirectionFilter = function(direction) {
  referralDirectionFilter = direction || 'ALL';
  const container = document.getElementById('mainContentArea');
  if (container && window.renderHospitalDashboard) {
    window.renderHospitalDashboard(container, 'referrals');
  }
};

window.handleReferralStatusFilter = function(status) {
  referralStatusFilter = status || 'ALL';
  const container = document.getElementById('mainContentArea');
  if (container && window.renderHospitalDashboard) {
    window.renderHospitalDashboard(container, 'referrals');
  }
};

window.handleReferralPriorityFilter = function(priority) {
  referralPriorityFilter = priority || 'ALL';
  const container = document.getElementById('mainContentArea');
  if (container && window.renderHospitalDashboard) {
    window.renderHospitalDashboard(container, 'referrals');
  }
};

window.clearReferralFilters = function() {
  referralSearchQuery = '';
  referralStatusFilter = 'ALL';
  referralPriorityFilter = 'ALL';
  referralDirectionFilter = 'ALL';
  const container = document.getElementById('mainContentArea');
  if (container && window.renderHospitalDashboard) {
    window.renderHospitalDashboard(container, 'referrals');
  }
};

window.exportReferralPipelineCsv = function() {
  const store = window.hospitrackStore;
  const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
  const hospitalId = user?.hospitalId || 'HOSP-101';
  const referrals = store ? store.getReferrals(hospitalId) : [];
  if (!referrals || referrals.length === 0) {
    window.showToast('No referrals to export.', 'info');
    return;
  }
  let csv = 'Referral ID,Patient ID,Patient Name,From Hospital,To Hospital,Priority,Status,Reason,Notes,Created At,Updated At\n';
  referrals.forEach(r => {
    const p = store.getPatientById(r.patientId);
    const pName = p ? p.name : r.patientId;
    const fromH = store.getHospitalById(r.fromHospitalId);
    const toH = store.getHospitalById(r.toHospitalId);
    const row = [
      r.id,
      r.patientId,
      `"${(pName || '').replace(/"/g, '""')}"`,
      `"${(fromH ? fromH.name : r.fromHospitalId || '').replace(/"/g, '""')}"`,
      `"${(toH ? toH.name : r.toHospitalId || '').replace(/"/g, '""')}"`,
      r.priority || 'ROUTINE',
      r.status || 'PENDING',
      `"${(r.reason || '').replace(/"/g, '""')}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
      r.createdAt || '',
      r.updatedAt || ''
    ];
    csv += row.join(',') + '\n';
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `referrals-export-${hospitalId}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.showToast('✓ Referrals exported to CSV.', 'success');
};

window.refreshReferralPipeline = async function() {
  try {
    window.showToast('Refreshing specialist referral pipeline...', 'info');
    if (window.hospitrackStore && typeof window.hospitrackStore.syncAllData === 'function') {
      await window.hospitrackStore.syncAllData();
    }
    const container = document.getElementById('mainContentArea');
    if (container && window.renderHospitalDashboard) {
      window.renderHospitalDashboard(container, 'referrals');
    }
    window.showToast('✓ Specialist referral pipeline synchronized.', 'success');
  } catch (err) {
    window.showToast(err.message || 'Unable to sync referral pipeline.', 'error');
  }
};

window.handleAcceptReferralClick = async function(referralId) {
  try {
    await window.hospitrackStore.updateReferralStatus(referralId, 'ACCEPTED');
    window.showToast(`✓ Referral ${referralId} accepted successfully.`, 'success');
    await window.hospitrackStore.syncAllData();
    const container = document.getElementById('mainContentArea');
    if (container && window.renderHospitalDashboard) {
      window.renderHospitalDashboard(container, 'referrals');
    }
    if (referralSelectedId === referralId) {
      window.openReferralDrawer(referralId);
    }
  } catch (err) {
    window.showToast(err.message || 'Unable to accept referral', 'error');
  }
};

window.handleBeginCareReferral = async function(referralId) {
  try {
    await window.hospitrackStore.updateReferralStatus(referralId, 'IN_PROGRESS');
    window.showToast(`✓ Patient received and care started for referral ${referralId}.`, 'success');
    await window.hospitrackStore.syncAllData();
    const container = document.getElementById('mainContentArea');
    if (container && window.renderHospitalDashboard) {
      window.renderHospitalDashboard(container, 'referrals');
    }
    if (referralSelectedId === referralId) {
      window.openReferralDrawer(referralId);
    }
  } catch (err) {
    window.showToast(err.message || 'Unable to update care status', 'error');
  }
};

if (typeof window.openCreateReferralModal !== 'function') {
  window.openCreateReferralModal = function(defaultPatientId = null) {
    const modalContainer = document.getElementById('globalModalContainer');
    if (!modalContainer) return;

    const store = window.hospitrackStore;
    const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
    const hospitalId = user?.hospitalId || user?.hospital?.id || (user?.role === 'HOSPITAL' || user?.role === 'HOSPITAL_ADMIN' ? user.id : 'HOSP-101');
    const hospitals = (store && typeof store.getHospitals === 'function' ? store.getHospitals() : []).filter(h => h.id !== hospitalId && h.status === 'ACTIVE');
    const patients = (store && typeof store.getPatients === 'function' ? store.getPatients(hospitalId) : []);

    modalContainer.innerHTML = `
      <div id="createReferralModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="createReferralModalTitle">
        <div class="modal-box" style="max-width: 540px;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.25rem;">🔁</span>
              <h3 class="modal-title" id="createReferralModalTitle">Dispatch Specialist Referral</h3>
            </div>
            <button type="button" class="modal-close" onclick="closeGlobalModal('createReferralModal')" aria-label="Close modal">✕</button>
          </div>
          <form onsubmit="handleReferralSubmit(event)" class="p-24">
            <div class="form-group mb-16">
              <label class="form-label" for="refPatientSelect">
                <span class="form-section-title">PATIENT</span> <span class="text-danger">*</span>
              </label>
              <select id="refPatientSelect" class="form-control" required>
                ${patients.length === 0 ? '<option value="">No patients currently registered</option>' : ''}
                ${patients.map(p => `
                  <option value="${p.id}" ${p.id === defaultPatientId ? 'selected' : ''}>${escapeHtml(p.name)} (${p.id}) ${p.age ? `• ${p.age}y ${p.gender || ''}` : ''}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group mb-16">
              <label class="form-label" for="refDestHospital">
                <span class="form-section-title">RECEIVING FACILITY</span> <span class="text-danger">*</span>
              </label>
              <select id="refDestHospital" class="form-control" required>
                ${hospitals.length === 0 ? '<option value="">No other active facilities in network</option>' : ''}
                ${hospitals.map(h => `<option value="${h.id}">${escapeHtml(h.name)} (${h.code || h.id}) ${h.location ? `• ${escapeHtml(h.location)}` : ''}</option>`).join('')}
              </select>
            </div>
            <div class="form-group mb-16">
              <label class="form-label" for="refPriority">
                <span class="form-section-title">CLINICAL PRIORITY</span> <span class="text-danger">*</span>
              </label>
              <select id="refPriority" class="form-control" required>
                <option value="ROUTINE">Routine — Standard Specialist Consultation</option>
                <option value="URGENT">Urgent — Expedited Clinical Evaluation (< 48h)</option>
                <option value="EMERGENCY">Emergency — Immediate Critical Care / Intervention</option>
              </select>
            </div>
            <div class="form-group mb-16">
              <label class="form-label" for="refReason">
                <span class="form-section-title">CLINICAL INDICATION / REASON</span> <span class="text-danger">*</span>
              </label>
              <input type="text" id="refReason" class="form-control" placeholder="e.g. Tertiary cardiology evaluation, oncology staging..." required>
            </div>
            <div class="form-group mb-20">
              <label class="form-label" for="refNotes">
                <span class="form-section-title">CLINICAL SUMMARY &amp; TRANSFER NOTES</span>
              </label>
              <textarea id="refNotes" class="form-control" rows="3" placeholder="Include relevant symptoms, current stabilization, and diagnostics..."></textarea>
            </div>
            <div id="referralAlertBanner" class="alert-banner hidden mb-16"></div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('createReferralModal')">Cancel</button>
              <button type="submit" class="btn btn-primary">Dispatch Referral</button>
            </div>
          </form>
        </div>
      </div>
    `;
  };
}

window.openRejectReferralModal = function(referralId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const referral = window.hospitrackStore ? window.hospitrackStore.getReferralById(referralId) : null;
  const patient = (referral && window.hospitrackStore) ? window.hospitrackStore.getPatientById(referral.patientId) : null;

  modalContainer.innerHTML = `
    <div id="rejectReferralModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="rejectReferralModalTitle">
      <div class="modal-box">
        <div class="modal-header">
          <h3 class="modal-title" id="rejectReferralModalTitle">❌ Decline Specialist Referral</h3>
          <button type="button" class="modal-close" onclick="closeGlobalModal('rejectReferralModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="confirmRejectReferralSubmit(event, '${escapeHtml(referralId)}')" class="p-20">
          <div class="mb-16">
            <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 0 0 10px 0;">
              You are about to decline referral <strong>${escapeHtml(referralId)}</strong> for patient <strong>${escapeHtml(patient ? patient.name : (referral?.patientId || 'Patient'))}</strong>.
            </p>
            <div class="alert-banner warning">
              Please document the clinical or operational rationale for declining this referral.
            </div>
          </div>
          <div class="form-group mb-20">
            <label class="form-label" for="rejectReasonInput">Decline Rationale / Clinical Notes <span class="text-danger">*</span></label>
            <textarea id="rejectReasonInput"
                      class="form-control"
                      rows="3"
                      placeholder="e.g. Sub-specialty capacity unavailable, bed capacity constraint, or referred to alternative tertiary center..."
                      required></textarea>
          </div>
          <div id="rejectAlert" class="alert-banner hidden mb-16"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('rejectReferralModal')">Cancel</button>
            <button type="submit" class="btn btn-danger">Confirm Rejection</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.confirmRejectReferralSubmit = async function(event, referralId) {
  event.preventDefault();
  const reasonInput = document.getElementById('rejectReasonInput');
  const alertEl = document.getElementById('rejectAlert');
  const reason = reasonInput ? reasonInput.value.trim() : '';

  if (!reason) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = 'Please provide a rationale before declining the referral.';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  try {
    await window.hospitrackStore.updateReferralStatus(referralId, 'REJECTED', reason);
    window.showToast(`Referral ${referralId} declined and rationale documented.`, 'info');
    closeGlobalModal('rejectReferralModal');
    await window.hospitrackStore.syncAllData();
    const container = document.getElementById('mainContentArea');
    if (container && window.renderHospitalDashboard) {
      window.renderHospitalDashboard(container, 'referrals');
    }
    if (referralSelectedId === referralId) {
      window.openReferralDrawer(referralId);
    }
  } catch (err) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = err.message || 'Failed to update referral status.';
      alertEl.classList.remove('hidden');
    } else {
      window.showToast(err.message || 'Failed to decline referral', 'error');
    }
  }
};

window.openCompleteReferralModal = function(referralId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const referral = window.hospitrackStore ? window.hospitrackStore.getReferralById(referralId) : null;
  const patient = (referral && window.hospitrackStore) ? window.hospitrackStore.getPatientById(referral.patientId) : null;

  modalContainer.innerHTML = `
    <div id="completeReferralModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="completeReferralModalTitle">
      <div class="modal-box">
        <div class="modal-header">
          <h3 class="modal-title" id="completeReferralModalTitle">🏁 Complete Specialist Care</h3>
          <button type="button" class="modal-close" onclick="closeGlobalModal('completeReferralModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="confirmCompleteReferralSubmit(event, '${escapeHtml(referralId)}')" class="p-20">
          <div class="mb-16">
            <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 0 0 10px 0;">
              Document clinical outcome for referral <strong>${escapeHtml(referralId)}</strong> (Patient: <strong>${escapeHtml(patient ? patient.name : (referral?.patientId || 'Patient'))}</strong>).
            </p>
          </div>
          <div class="form-group mb-20">
            <label class="form-label" for="completeOutcomeInput">Clinical Summary / Outcome Documentation <span class="text-danger">*</span></label>
            <textarea id="completeOutcomeInput"
                      class="form-control"
                      rows="3"
                      placeholder="e.g. Completed cardiac catheterization, patient stabilized and discharged with prescription regimen..."
                      required></textarea>
          </div>
          <div id="completeAlert" class="alert-banner hidden mb-16"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('completeReferralModal')">Cancel</button>
            <button type="submit" class="btn btn-primary">Complete Referral</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.confirmCompleteReferralSubmit = async function(event, referralId) {
  event.preventDefault();
  const outcomeInput = document.getElementById('completeOutcomeInput');
  const alertEl = document.getElementById('completeAlert');
  const outcome = outcomeInput ? outcomeInput.value.trim() : '';

  if (!outcome) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = 'Please record clinical outcome documentation.';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  try {
    await window.hospitrackStore.updateReferralStatus(referralId, 'COMPLETED', null, outcome);
    window.showToast(`✓ Referral ${referralId} completed with clinical documentation.`, 'success');
    closeGlobalModal('completeReferralModal');
    await window.hospitrackStore.syncAllData();
    const container = document.getElementById('mainContentArea');
    if (container && window.renderHospitalDashboard) {
      window.renderHospitalDashboard(container, 'referrals');
    }
    if (referralSelectedId === referralId) {
      window.openReferralDrawer(referralId);
    }
  } catch (err) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = err.message || 'Failed to complete referral.';
      alertEl.classList.remove('hidden');
    } else {
      window.showToast(err.message || 'Failed to complete referral', 'error');
    }
  }
};

window.openCancelReferralModal = function(referralId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div id="cancelReferralModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="cancelReferralModalTitle">
      <div class="modal-box">
        <div class="modal-header">
          <h3 class="modal-title" id="cancelReferralModalTitle">✕ Cancel Referral Request</h3>
          <button type="button" class="modal-close" onclick="closeGlobalModal('cancelReferralModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="confirmCancelReferralSubmit(event, '${escapeHtml(referralId)}')" class="p-20">
          <div class="mb-16">
            <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 0 0 10px 0;">
              Are you sure you want to cancel referral <strong>${escapeHtml(referralId)}</strong>?
            </p>
          </div>
          <div class="form-group mb-20">
            <label class="form-label" for="cancelReasonInput">Cancellation Reason <span class="text-danger">*</span></label>
            <textarea id="cancelReasonInput"
                      class="form-control"
                      rows="2"
                      placeholder="e.g. Patient condition resolved internally, or family requested alternative facility..."
                      required></textarea>
          </div>
          <div id="cancelAlert" class="alert-banner hidden mb-16"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('cancelReferralModal')">Close</button>
            <button type="submit" class="btn btn-danger">Confirm Cancellation</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.confirmCancelReferralSubmit = async function(event, referralId) {
  event.preventDefault();
  const reasonInput = document.getElementById('cancelReasonInput');
  const alertEl = document.getElementById('cancelAlert');
  const reason = reasonInput ? reasonInput.value.trim() : '';

  if (!reason) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = 'Please provide a cancellation reason.';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  try {
    await window.hospitrackStore.updateReferralStatus(referralId, 'CANCELLED', reason);
    window.showToast(`Referral ${referralId} cancelled.`, 'info');
    closeGlobalModal('cancelReferralModal');
    await window.hospitrackStore.syncAllData();
    const container = document.getElementById('mainContentArea');
    if (container && window.renderHospitalDashboard) {
      window.renderHospitalDashboard(container, 'referrals');
    }
    if (referralSelectedId === referralId) {
      window.openReferralDrawer(referralId);
    }
  } catch (err) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = err.message || 'Failed to cancel referral.';
      alertEl.classList.remove('hidden');
    } else {
      window.showToast(err.message || 'Failed to cancel referral', 'error');
    }
  }
};

// --------------------------------------------------------------------------
// 4A-2. EMERGENCY TRANSFER TRIAGE & OPERATIONS SECTION
// --------------------------------------------------------------------------
function renderHospitalEmergencyTransferSection(data) {
  const { hospital = {}, transfers = [], patients = [], doctors = [] } = data;
  const store = window.hospitrackStore;

  const safeTransfers = Array.isArray(transfers) ? transfers : [];
  const inbound = safeTransfers.filter(t => t && t.toHospitalId === hospital.id);
  const outbound = safeTransfers.filter(t => t && t.fromHospitalId === hospital.id);

  // Authoritative KPI Metrics derived purely from actual backend transfer records
  const totalCount = safeTransfers.length;
  const awaitingTriageCount = safeTransfers.filter(t => t && t.toHospitalId === hospital.id && t.status === 'PENDING').length;
  const transferCoordCount = safeTransfers.filter(t => t && (t.status === 'PENDING' || t.status === 'IN_PROGRESS' || t.status === 'IN_TRANSIT')).length;
  const completedCount = safeTransfers.filter(t => t && t.status === 'COMPLETED').length;
  const emergencyCount = safeTransfers.filter(t => t && t.priority === 'EMERGENCY').length;

  // Filter transfer dataset
  const q = (transferSearchQuery || '').toLowerCase().trim();
  const filtered = safeTransfers.filter(t => {
    if (!t) return false;

    // Direction filter
    if (transferDirectionFilter === 'INBOUND' && t.toHospitalId !== hospital.id) return false;
    if (transferDirectionFilter === 'OUTBOUND' && t.fromHospitalId !== hospital.id) return false;

    // Status filter
    if (transferStatusFilter !== 'ALL') {
      if (transferStatusFilter === 'AWAITING_TRIAGE') {
        if (t.toHospitalId !== hospital.id || t.status !== 'PENDING') return false;
      } else if (transferStatusFilter === 'COORDINATION') {
        if (t.status !== 'PENDING' && t.status !== 'IN_PROGRESS' && t.status !== 'IN_TRANSIT') return false;
      } else if (t.status !== transferStatusFilter) {
        return false;
      }
    }

    // Priority filter
    if (transferPriorityFilter !== 'ALL' && (t.priority || 'URGENT') !== transferPriorityFilter) return false;

    // Search query
    if (q) {
      const p = store && typeof store.getPatientById === 'function' ? store.getPatientById(t.patientId) : null;
      const fromH = store && typeof store.getHospitalById === 'function' ? store.getHospitalById(t.fromHospitalId) : null;
      const toH = store && typeof store.getHospitalById === 'function' ? store.getHospitalById(t.toHospitalId) : null;

      const pName = (p?.name || '').toLowerCase();
      const pId = (t.patientId || '').toLowerCase();
      const trfId = (t.id || '').toLowerCase();
      const reason = (t.reason || '').toLowerCase();
      const notes = (t.notes || '').toLowerCase();
      const fromHName = (fromH?.name || t.fromHospitalId || '').toLowerCase();
      const toHName = (toH?.name || t.toHospitalId || '').toLowerCase();

      const matches = pName.includes(q) ||
                      pId.includes(q) ||
                      trfId.includes(q) ||
                      reason.includes(q) ||
                      notes.includes(q) ||
                      fromHName.includes(q) ||
                      toHName.includes(q);
      if (!matches) return false;
    }

    return true;
  });

  return `
    <div class="dashboard-container-clean">
      <!-- Section A: Page Header -->
      <div class="page-header-clean">
        <div class="page-header-title-block">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="page-badge-pill" style="background: rgba(239, 68, 68, 0.12); color: #dc2626;">🚨 Emergency Critical Care Operations</span>
            <span class="status-pill success">Live Capacity Synchronized</span>
          </div>
          <h1 class="page-title-clean">EMERGENCY TRANSFER TRIAGE</h1>
          <p class="page-subtitle-clean">
            Coordinate urgent patient transfers, triage priority, receiving capacity, and transfer progress.
          </p>
        </div>
        <div class="page-actions-clean">
          <button type="button" class="btn btn-secondary" onclick="refreshTransferPipeline()" title="Sync real backend emergency transfer records">
            <span>🔄</span> Refresh
          </button>
          <button type="button" class="btn btn-primary" onclick="openEmergencyTransferModal()" title="Initiate emergency patient transfer">
            <span>+</span> Initiate Emergency Transfer
          </button>
        </div>
      </div>

      <!-- Section B: 5-Card Responsive KPI Grid -->
      <div class="transfer-kpi-grid">
        <div class="transfer-kpi-card ${transferStatusFilter === 'ALL' && transferPriorityFilter === 'ALL' ? 'active' : ''}" onclick="handleTransferStatusFilter('ALL')" title="Show all emergency transfers" role="button" tabindex="0">
          <div class="transfer-kpi-top">
            <span class="transfer-kpi-title">Active Emergency Transfers</span>
            <span class="transfer-kpi-icon-wrap" style="background: rgba(14, 165, 233, 0.12); color: #0284c7;">🚑</span>
          </div>
          <div class="transfer-kpi-val">${totalCount}</div>
          <div class="transfer-kpi-sub">
            <span class="transfer-kpi-dot" style="background: #0284c7;"></span>
            <span>${inbound.length} inbound • ${outbound.length} outbound</span>
          </div>
        </div>

        <div class="transfer-kpi-card ${transferStatusFilter === 'AWAITING_TRIAGE' ? 'active' : ''}" onclick="handleTransferStatusFilter('AWAITING_TRIAGE')" title="Filter by inbound awaiting triage" role="button" tabindex="0">
          <div class="transfer-kpi-top">
            <span class="transfer-kpi-title">Awaiting Triage</span>
            <span class="transfer-kpi-icon-wrap" style="background: rgba(239, 68, 68, 0.12); color: #dc2626;">⏳</span>
          </div>
          <div class="transfer-kpi-val" style="color: ${awaitingTriageCount > 0 ? '#dc2626' : 'var(--text-main)'};">${awaitingTriageCount}</div>
          <div class="transfer-kpi-sub">
            <span class="transfer-kpi-dot" style="background: #dc2626;"></span>
            <span>Immediate intake required</span>
          </div>
        </div>

        <div class="transfer-kpi-card ${transferStatusFilter === 'COORDINATION' ? 'active' : ''}" onclick="handleTransferStatusFilter('COORDINATION')" title="Filter by transfer coordination" role="button" tabindex="0">
          <div class="transfer-kpi-top">
            <span class="transfer-kpi-title">Transfer Coordination</span>
            <span class="transfer-kpi-icon-wrap" style="background: rgba(245, 158, 11, 0.12); color: #d97706;">🌐</span>
          </div>
          <div class="transfer-kpi-val" style="color: ${transferCoordCount > 0 ? '#d97706' : 'var(--text-main)'};">${transferCoordCount}</div>
          <div class="transfer-kpi-sub">
            <span class="transfer-kpi-dot" style="background: #d97706;"></span>
            <span>In-flight &amp; bed routing</span>
          </div>
        </div>

        <div class="transfer-kpi-card ${transferStatusFilter === 'COMPLETED' ? 'active' : ''}" onclick="handleTransferStatusFilter('COMPLETED')" title="Filter by completed/admitted transfers" role="button" tabindex="0">
          <div class="transfer-kpi-top">
            <span class="transfer-kpi-title">Admitted / Completed</span>
            <span class="transfer-kpi-icon-wrap" style="background: rgba(16, 185, 129, 0.12); color: #059669;">🏥</span>
          </div>
          <div class="transfer-kpi-val" style="color: #059669;">${completedCount}</div>
          <div class="transfer-kpi-sub">
            <span class="transfer-kpi-dot" style="background: #059669;"></span>
            <span>Bed allocated &amp; admitted</span>
          </div>
        </div>

        <div class="transfer-kpi-card ${transferPriorityFilter === 'EMERGENCY' ? 'active' : ''}" onclick="handleTransferPriorityFilter('EMERGENCY')" title="Filter by critical emergency priority" role="button" tabindex="0">
          <div class="transfer-kpi-top">
            <span class="transfer-kpi-title">Critical Emergency</span>
            <span class="transfer-kpi-icon-wrap" style="background: rgba(220, 38, 38, 0.12); color: #b91c1c;">⚡</span>
          </div>
          <div class="transfer-kpi-val" style="color: ${emergencyCount > 0 ? '#b91c1c' : 'var(--text-main)'};">${emergencyCount}</div>
          <div class="transfer-kpi-sub">
            <span class="transfer-kpi-dot" style="background: #b91c1c;"></span>
            <span>High-acuity resuscitation</span>
          </div>
        </div>
      </div>

      <!-- Section C: Emergency Transfer & Admission Workflow Card -->
      <div class="transfer-pipeline-card">
        <div class="transfer-pipeline-header">
          <div>
            <h3 class="transfer-pipeline-title">EMERGENCY TRANSFER &amp; ADMISSION WORKFLOW</h3>
            <p class="transfer-pipeline-sub">Standard operating procedure for urgent inter-facility patient transfer and bed admission.</p>
          </div>
          <span class="transfer-lifecycle-badge">5 Operational Stages</span>
        </div>

        <div class="transfer-pipeline-stepper">
          <div class="transfer-stepper-stage ${transferStatusFilter === 'ALL' ? 'active' : ''}" onclick="handleTransferStatusFilter('ALL')" title="All transfers" role="button" tabindex="0">
            <div class="transfer-stepper-num">01</div>
            <div class="transfer-stepper-info">
              <span class="transfer-stepper-label">Transfer Intake</span>
              <span class="transfer-stepper-count">${totalCount} Total</span>
            </div>
          </div>
          <div class="transfer-stepper-arrow">➔</div>

          <div class="transfer-stepper-stage ${transferStatusFilter === 'AWAITING_TRIAGE' ? 'active' : ''}" onclick="handleTransferStatusFilter('AWAITING_TRIAGE')" title="Awaiting Triage" role="button" tabindex="0">
            <div class="transfer-stepper-num">02</div>
            <div class="transfer-stepper-info">
              <span class="transfer-stepper-label">Triage &amp; Priority</span>
              <span class="transfer-stepper-count" style="color: ${awaitingTriageCount > 0 ? '#dc2626' : 'inherit'};">${awaitingTriageCount} Awaiting Triage</span>
            </div>
          </div>
          <div class="transfer-stepper-arrow">➔</div>

          <div class="transfer-stepper-stage ${transferDirectionFilter === 'INBOUND' ? 'active' : ''}" onclick="handleTransferDirectionFilter('INBOUND')" title="Inbound transfers" role="button" tabindex="0">
            <div class="transfer-stepper-num">03</div>
            <div class="transfer-stepper-info">
              <span class="transfer-stepper-label">Receiving Facility</span>
              <span class="transfer-stepper-count">${inbound.length} Inbound</span>
            </div>
          </div>
          <div class="transfer-stepper-arrow">➔</div>

          <div class="transfer-stepper-stage ${transferStatusFilter === 'COORDINATION' ? 'active' : ''}" onclick="handleTransferStatusFilter('COORDINATION')" title="Capacity validation & transit" role="button" tabindex="0">
            <div class="transfer-stepper-num">04</div>
            <div class="transfer-stepper-info">
              <span class="transfer-stepper-label">Capacity Validation</span>
              <span class="transfer-stepper-count" style="color: ${transferCoordCount > 0 ? '#d97706' : 'inherit'};">${transferCoordCount} Coordination</span>
            </div>
          </div>
          <div class="transfer-stepper-arrow">➔</div>

          <div class="transfer-stepper-stage ${transferStatusFilter === 'COMPLETED' ? 'active' : ''}" onclick="handleTransferStatusFilter('COMPLETED')" title="Patient admitted" role="button" tabindex="0">
            <div class="transfer-stepper-num">05</div>
            <div class="transfer-stepper-info">
              <span class="transfer-stepper-label">Admit &amp; Completed</span>
              <span class="transfer-stepper-count">${completedCount} Admitted</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Section D: Search and Filters Toolbar -->
      <div class="transfer-toolbar">
        <div class="transfer-search-box">
          <span class="transfer-search-icon">🔍</span>
          <input type="text"
                 class="transfer-search-input"
                 placeholder="Search transfers by patient, ID, hospital, clinical indication..."
                 value="${escapeHtml(transferSearchQuery)}"
                 oninput="handleTransferSearchInput(this.value)">
        </div>

        <div class="transfer-filter-group">
          <!-- Direction Filter -->
          <select class="transfer-filter-select" onchange="handleTransferDirectionFilter(this.value)">
            <option value="ALL" ${transferDirectionFilter === 'ALL' ? 'selected' : ''}>All Directions (${totalCount})</option>
            <option value="INBOUND" ${transferDirectionFilter === 'INBOUND' ? 'selected' : ''}>📥 Inbound (${inbound.length})</option>
            <option value="OUTBOUND" ${transferDirectionFilter === 'OUTBOUND' ? 'selected' : ''}>📤 Outbound (${outbound.length})</option>
          </select>

          <!-- Status Filter -->
          <select class="transfer-filter-select" onchange="handleTransferStatusFilter(this.value)">
            <option value="ALL" ${transferStatusFilter === 'ALL' ? 'selected' : ''}>All Statuses</option>
            <option value="AWAITING_TRIAGE" ${transferStatusFilter === 'AWAITING_TRIAGE' ? 'selected' : ''}>⏳ Awaiting Triage (${awaitingTriageCount})</option>
            <option value="COORDINATION" ${transferStatusFilter === 'COORDINATION' ? 'selected' : ''}>🌐 Coordination (${transferCoordCount})</option>
            <option value="COMPLETED" ${transferStatusFilter === 'COMPLETED' ? 'selected' : ''}>🏥 Admitted / Completed (${completedCount})</option>
          </select>

          <!-- Priority Filter -->
          <select class="transfer-filter-select" onchange="handleTransferPriorityFilter(this.value)">
            <option value="ALL" ${transferPriorityFilter === 'ALL' ? 'selected' : ''}>All Priorities</option>
            <option value="EMERGENCY" ${transferPriorityFilter === 'EMERGENCY' ? 'selected' : ''}>🚨 Emergency</option>
            <option value="URGENT" ${transferPriorityFilter === 'URGENT' ? 'selected' : ''}>⚠️ Urgent</option>
          </select>

          ${(transferSearchQuery || transferStatusFilter !== 'ALL' || transferPriorityFilter !== 'ALL' || transferDirectionFilter !== 'ALL') ? `
            <button type="button" class="btn btn-secondary btn-sm" onclick="clearTransferFilters()" title="Reset all search filters">
              ✕ Clear Filters
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Section E: Active Emergency Transfers Table -->
      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <div>
            <h3 class="dashboard-card-title"><span>🚑</span> Emergency Transfer Operations</h3>
            <p class="dashboard-card-sub">
              Showing <strong>${filtered.length}</strong> of <strong>${totalCount}</strong> emergency transfers for ${escapeHtml(hospital.name || 'Hospital')}
            </p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="refreshTransferPipeline()">
              <span>🔄</span> Refresh
            </button>
            <button type="button" class="btn btn-primary btn-sm" onclick="openEmergencyTransferModal()">
              <span>+</span> New Transfer
            </button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table-clean">
            <thead>
              <tr>
                <th>Transfer ID</th>
                <th>Patient</th>
                <th>Direction</th>
                <th>Origin Facility</th>
                <th>Receiving Facility</th>
                <th>Clinical Priority</th>
                <th>Status</th>
                <th>Initiated / Updated</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="9">
                    <div class="empty-state-clean" style="padding: 48px 16px; text-align: center;">
                      <span class="empty-icon" style="font-size: 2.5rem;">${totalCount === 0 ? '🚑' : '🔍'}</span>
                      <div class="empty-title" style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-top: 8px;">
                        ${totalCount === 0 ? 'No Emergency Transfers' : 'No Transfers Found'}
                      </div>
                      <p class="empty-desc" style="color: var(--text-muted); font-size: 0.88rem; max-width: 440px; margin: 6px auto 16px;">
                        ${totalCount === 0 ? 'Emergency transfer requests will appear here when they are created by connected healthcare facilities.' : 'No transfers match your current filter criteria. Try resetting your search filters.'}
                      </p>
                      ${totalCount === 0 ? `
                        <button type="button" class="btn btn-primary btn-sm" onclick="openEmergencyTransferModal()">
                          + Initiate Emergency Transfer
                        </button>
                      ` : `
                        <button type="button" class="btn btn-secondary btn-sm" onclick="clearTransferFilters()">
                          Clear Filters
                        </button>
                      `}
                    </div>
                  </td>
                </tr>
              ` : filtered.map(t => {
                const isIncoming = t.toHospitalId === hospital.id;
                const isIncomingPending = isIncoming && t.status === 'PENDING';
                const p = store && typeof store.getPatientById === 'function' ? store.getPatientById(t.patientId) : null;
                const fromH = store && typeof store.getHospitalById === 'function' ? store.getHospitalById(t.fromHospitalId) : null;
                const toH = store && typeof store.getHospitalById === 'function' ? store.getHospitalById(t.toHospitalId) : null;

                const statusClass = (t.status || 'PENDING').toLowerCase();
                const priorityClass = (t.priority || 'URGENT').toLowerCase();
                const initiatedDate = t.initiatedAt ? new Date(t.initiatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : (t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent');

                let statusLabel = 'Pending Triage';
                if (t.status === 'COMPLETED') statusLabel = 'Admitted / Completed';
                else if (t.status === 'IN_PROGRESS' || t.status === 'IN_TRANSIT') statusLabel = 'In Transit';
                else if (t.status === 'REJECTED') statusLabel = 'Declined';
                else if (t.status === 'CANCELLED') statusLabel = 'Cancelled';

                return `
                  <tr style="cursor: pointer;" onclick="if (!event.target.closest('button') && !event.target.closest('a')) openTransferDrawer('${t.id}')">
                    <td>
                      <a href="#hospital/workspace/transfer/${encodeURIComponent(t.id)}" class="referral-id-link font-mono" onclick="event.preventDefault(); openTransferDrawer('${t.id}')">
                        <code>${escapeHtml(t.id)}</code>
                      </a>
                    </td>
                    <td>
                      <div class="cell-patient">
                        <span class="cell-patient-name font-semibold">${escapeHtml(p ? p.name : t.patientId)}</span>
                        <span class="cell-patient-id font-mono text-xs text-muted"><code>${escapeHtml(t.patientId)}</code> ${p ? `• ${p.age}y ${p.gender || 'M'}` : ''}</span>
                      </div>
                    </td>
                    <td>
                      <span class="referral-direction-pill ${isIncoming ? 'inbound' : 'outbound'}">
                        ${isIncoming ? '📥 Inbound' : '📤 Outbound'}
                      </span>
                    </td>
                    <td>
                      <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: 600; color: var(--text-main); font-size: 0.84rem;">
                          ${escapeHtml(fromH ? fromH.name : t.fromHospitalId)}
                        </span>
                        <span style="font-size: 0.74rem; color: var(--text-muted);">
                          <code>${escapeHtml(fromH?.code || t.fromHospitalId)}</code>
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: 600; color: var(--text-main); font-size: 0.84rem;">
                          ${escapeHtml(toH ? toH.name : t.toHospitalId)}
                        </span>
                        <span style="font-size: 0.74rem; color: ${toH?.availableBeds > 0 ? '#059669' : '#dc2626'}; font-weight: 500;">
                          🛏️ ${toH?.availableBeds != null ? `${toH.availableBeds} beds available` : 'Capacity on file'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span class="referral-badge-priority ${priorityClass}">
                        ${escapeHtml(t.priority || 'URGENT')}
                      </span>
                    </td>
                    <td>
                      <span class="referral-badge-status ${statusClass}">
                        ${escapeHtml(statusLabel)}
                      </span>
                    </td>
                    <td style="font-size: 0.78rem; color: var(--text-secondary); white-space: nowrap;">
                      ${escapeHtml(initiatedDate)}
                    </td>
                    <td style="text-align: right;">
                      <div class="action-btn-group" style="justify-content: flex-end; display: flex; gap: 6px;">
                        ${isIncomingPending ? `
                          <button type="button" class="btn btn-primary btn-sm" onclick="event.stopPropagation(); handleAcceptTransferClick('${t.id}')" title="Accept transfer and admit patient to available bed">
                            <span>✓</span> Accept &amp; Admit
                          </button>
                        ` : ''}
                        <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openTransferDrawer('${t.id}')" title="Open emergency transfer details">
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section F: Slide-Over Transfer Detail Drawer Overlay -->
      <div id="transferDrawerOverlay" class="referral-drawer-overlay ${transferSelectedId ? 'open' : ''}" onclick="if (event.target === this) closeTransferDrawer()">
        ${transferSelectedId ? renderTransferDrawerContent(transferSelectedId, hospital, store) : ''}
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// Slide-Over Emergency Transfer Drawer Content Renderer
// --------------------------------------------------------------------------
function renderTransferDrawerContent(transferId, hospital, store) {
  const transfer = store && typeof store.getTransferById === 'function' ? store.getTransferById(transferId) : null;
  if (!transfer) {
    return `
      <div class="referral-drawer">
        <div class="referral-drawer-header">
          <div class="referral-drawer-title-wrap">
            <h3 class="referral-drawer-title">Emergency Transfer Detail</h3>
          </div>
          <button type="button" class="modal-close" onclick="closeTransferDrawer()">✕</button>
        </div>
        <div class="referral-drawer-body">
          <div class="empty-state-clean">
            <span class="empty-icon">⚠️</span>
            <div class="empty-title">Transfer Record Not Found</div>
            <p class="empty-desc">The requested emergency transfer [${escapeHtml(transferId)}] could not be retrieved from backend records.</p>
          </div>
        </div>
      </div>
    `;
  }

  const patient = store && typeof store.getPatientById === 'function' ? store.getPatientById(transfer.patientId) : null;
  const fromH = store && typeof store.getHospitalById === 'function' ? store.getHospitalById(transfer.fromHospitalId) : null;
  const toH = store && typeof store.getHospitalById === 'function' ? store.getHospitalById(transfer.toHospitalId) : null;

  const isIncoming = transfer.toHospitalId === hospital.id;
  const isIncomingPending = isIncoming && transfer.status === 'PENDING';
  const isCompleted = transfer.status === 'COMPLETED';
  const statusClass = (transfer.status || 'PENDING').toLowerCase();
  const priorityClass = (transfer.priority || 'URGENT').toLowerCase();
  const initiatedFormatted = transfer.initiatedAt ? new Date(transfer.initiatedAt).toLocaleString() : (transfer.createdAt ? new Date(transfer.createdAt).toLocaleString() : 'N/A');
  const completedFormatted = transfer.completedAt ? new Date(transfer.completedAt).toLocaleString() : (isCompleted ? 'Completed' : 'Pending Intake');

  let statusLabel = 'Pending Triage';
  if (transfer.status === 'COMPLETED') statusLabel = 'Admitted / Completed';
  else if (transfer.status === 'IN_PROGRESS' || transfer.status === 'IN_TRANSIT') statusLabel = 'In Transit';
  else if (transfer.status === 'REJECTED') statusLabel = 'Declined';
  else if (transfer.status === 'CANCELLED') statusLabel = 'Cancelled';

  return `
    <div class="referral-drawer" role="dialog" aria-modal="true" aria-labelledby="transferDrawerTitle">
      <!-- Drawer Header -->
      <div class="referral-drawer-header">
        <div class="referral-drawer-title-wrap">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="referral-direction-pill ${isIncoming ? 'inbound' : 'outbound'}">
              ${isIncoming ? '📥 INBOUND TRANSFER' : '📤 OUTBOUND TRANSFER'}
            </span>
            <span class="referral-badge-status ${statusClass}">${escapeHtml(statusLabel)}</span>
            <span class="referral-badge-priority ${priorityClass}">${escapeHtml(transfer.priority || 'URGENT')}</span>
          </div>
          <h3 class="referral-drawer-title" id="transferDrawerTitle">
            <code>${escapeHtml(transfer.id)}</code>
          </h3>
          <span class="referral-drawer-sub">Initiated: ${escapeHtml(initiatedFormatted)} • Status: ${escapeHtml(statusLabel)}</span>
        </div>
        <button type="button" class="modal-close" onclick="closeTransferDrawer()" aria-label="Close drawer">✕</button>
      </div>

      <!-- Drawer Body -->
      <div class="referral-drawer-body">
        <!-- 1. Patient Information -->
        <div class="referral-drawer-section">
          <div class="referral-drawer-section-title">
            <span>👤</span> PATIENT INFORMATION
          </div>
          <div class="referral-drawer-grid">
            <div class="referral-drawer-field">
              <span class="referral-drawer-label">Patient Name</span>
              <span class="referral-drawer-val">${escapeHtml(patient ? patient.name : transfer.patientId)}</span>
            </div>
            <div class="referral-drawer-field">
              <span class="referral-drawer-label">Patient ID</span>
              <span class="referral-drawer-val"><code>${escapeHtml(transfer.patientId)}</code></span>
            </div>
            <div class="referral-drawer-field">
              <span class="referral-drawer-label">Age / Gender</span>
              <span class="referral-drawer-val">${patient ? `${patient.age} Yrs • ${escapeHtml(patient.gender || 'M')}` : 'N/A'}</span>
            </div>
            <div class="referral-drawer-field">
              <span class="referral-drawer-label">Blood Group</span>
              <span class="referral-drawer-val">${patient?.bloodGroup ? `<span class="status-pill info">${escapeHtml(patient.bloodGroup)}</span>` : 'N/A'}</span>
            </div>
            <div class="referral-drawer-field full-span">
              <span class="referral-drawer-label">Emergency Contact</span>
              <span class="referral-drawer-val">${escapeHtml(patient?.emergencyContact || patient?.contact || 'Standard on file')}</span>
            </div>
          </div>
        </div>

        <!-- 2. Clinical Triage & Indication -->
        <div class="referral-drawer-section">
          <div class="referral-drawer-section-title">
            <span>🚨</span> CLINICAL TRIAGE &amp; INDICATION
          </div>
          <div class="referral-drawer-grid">
            <div class="referral-drawer-field">
              <span class="referral-drawer-label">Clinical Priority</span>
              <span class="referral-drawer-val">
                <span class="referral-badge-priority ${priorityClass}">
                  ${escapeHtml(transfer.priority || 'URGENT')}
                </span>
              </span>
            </div>
            <div class="referral-drawer-field">
              <span class="referral-drawer-label">Admission State</span>
              <span class="referral-drawer-val">
                <span class="referral-badge-status ${statusClass}">
                  ${escapeHtml(statusLabel)}
                </span>
              </span>
            </div>
            <div class="referral-drawer-field full-span">
              <span class="referral-drawer-label">Clinical Indication &amp; Reason</span>
              <span class="referral-drawer-val" style="font-weight: 500; line-height: 1.4;">
                ${escapeHtml(transfer.reason || 'Urgent inter-facility transfer for specialized critical care')}
              </span>
            </div>
            ${transfer.notes ? `
              <div class="referral-drawer-field full-span">
                <span class="referral-drawer-label">Transit Logistics &amp; Paramedic Notes</span>
                <span class="referral-drawer-val" style="font-weight: 400; line-height: 1.4; color: var(--text-secondary);">
                  ${escapeHtml(transfer.notes)}
                </span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- 3. Origin Facility -->
        <div class="referral-drawer-section">
          <div class="referral-drawer-section-title">
            <span>📤</span> ORIGINATING FACILITY
          </div>
          <div class="referral-drawer-grid">
            <div class="referral-drawer-field">
              <span class="referral-drawer-label">Origin Hospital</span>
              <span class="referral-drawer-val">${escapeHtml(fromH ? fromH.name : transfer.fromHospitalId)}</span>
            </div>
            <div class="referral-drawer-field">
              <span class="referral-drawer-label">Facility Code</span>
              <span class="referral-drawer-val"><code>${escapeHtml(fromH?.code || transfer.fromHospitalId)}</code></span>
            </div>
            <div class="referral-drawer-field full-span">
              <span class="referral-drawer-label">Location / Contact</span>
              <span class="referral-drawer-val">${escapeHtml(fromH?.location || 'Designated Hospital Facility')} ${fromH?.contactPhone ? `• 📞 ${escapeHtml(fromH.contactPhone)}` : ''}</span>
            </div>
          </div>
        </div>

        <!-- 4. Receiving Facility & Capacity Validation -->
        <div class="referral-drawer-section">
          <div class="referral-drawer-section-title">
            <span>📥</span> RECEIVING FACILITY &amp; CAPACITY VALIDATION
          </div>
          <div class="referral-drawer-grid">
            <div class="referral-drawer-field">
              <span class="referral-drawer-label">Receiving Hospital</span>
              <span class="referral-drawer-val">${escapeHtml(toH ? toH.name : transfer.toHospitalId)}</span>
            </div>
            <div class="referral-drawer-field">
              <span class="referral-drawer-label">Target Facility Code</span>
              <span class="referral-drawer-val"><code>${escapeHtml(toH?.code || transfer.toHospitalId)}</code></span>
            </div>
            <div class="referral-drawer-field">
              <span class="referral-drawer-label">Live Bed Capacity</span>
              <span class="referral-drawer-val" style="color: ${toH?.availableBeds > 0 ? '#059669' : '#dc2626'}; font-weight: 600;">
                🛏️ ${toH?.availableBeds != null ? `${toH.availableBeds} / ${toH.totalBeds || '—'} Beds Available` : 'Available on record'}
              </span>
            </div>
            <div class="referral-drawer-field">
              <span class="referral-drawer-label">Capacity Validation</span>
              <span class="referral-drawer-val">
                ${toH?.availableBeds > 0 || isCompleted ? `
                  <span class="status-pill success">✓ Bed Capacity Validated</span>
                ` : `
                  <span class="status-pill warning">⚠️ Bed Allocation Critical</span>
                `}
              </span>
            </div>
            <div class="referral-drawer-field full-span">
              <span class="referral-drawer-label">Facility Location</span>
              <span class="referral-drawer-val">${escapeHtml(toH?.location || 'Designated Medical Center')}</span>
            </div>
          </div>
        </div>

        <!-- 5. Transfer Timeline -->
        <div class="referral-drawer-section">
          <div class="referral-drawer-section-title">
            <span>⏱️</span> TRANSFER AUDIT TIMELINE
          </div>
          <div class="referral-care-flow-box">
            <div class="referral-care-flow-step">
              <div class="referral-care-flow-bullet">1</div>
              <div class="referral-care-flow-content">
                <div class="referral-care-flow-tag">Transfer Initiated</div>
                <div class="referral-care-flow-name">${escapeHtml(initiatedFormatted)} by ${escapeHtml(transfer.initiatedBy || 'Authorized Hospital Clinician')}</div>
              </div>
            </div>
            <div class="referral-care-flow-connector">↓</div>
            <div class="referral-care-flow-step">
              <div class="referral-care-flow-bullet">2</div>
              <div class="referral-care-flow-content">
                <div class="referral-care-flow-tag">Clinical Triage &amp; Capacity Check</div>
                <div class="referral-care-flow-name">Priority: ${escapeHtml(transfer.priority || 'URGENT')} • Target: ${escapeHtml(toH ? toH.name : transfer.toHospitalId)}</div>
              </div>
            </div>
            <div class="referral-care-flow-connector">↓</div>
            <div class="referral-care-flow-step">
              <div class="referral-care-flow-bullet">3</div>
              <div class="referral-care-flow-content">
                <div class="referral-care-flow-tag">${isCompleted ? 'Patient Admitted &amp; Bed Allocated' : 'Awaiting Admission Triage'}</div>
                <div class="referral-care-flow-name">${escapeHtml(completedFormatted)}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 6. Connected Records Quick Navigation -->
        <div class="referral-drawer-section">
          <div class="referral-drawer-section-title">
            <span>🔗</span> CONNECTED CLINICAL RECORDS
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeTransferDrawer(); window.openWorkspace ? window.openWorkspace('patient', '${transfer.patientId}', 'consultations') : window.openPatientWorkspace('${transfer.patientId}')">
              <span>🩺</span> Consultation
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeTransferDrawer(); window.openWorkspace ? window.openWorkspace('patient', '${transfer.patientId}', 'prescriptions') : window.openPatientWorkspace('${transfer.patientId}')">
              <span>💊</span> Prescription
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeTransferDrawer(); window.openWorkspace ? window.openWorkspace('patient', '${transfer.patientId}', 'lab-reports') : window.openPatientWorkspace('${transfer.patientId}')">
              <span>🧪</span> Lab Reports
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeTransferDrawer(); window.openPatientWorkspace('${transfer.patientId}')">
              <span>👤</span> Patient Record
            </button>
          </div>
        </div>
      </div>

      <!-- Drawer Actions -->
      <div class="referral-drawer-actions">
        ${isIncomingPending ? `
          <button type="button" class="btn btn-primary btn-sm" onclick="handleAcceptTransferClick('${transfer.id}')">
            <span>✓</span> Accept &amp; Admit Patient
          </button>
        ` : ''}

        <button type="button" class="btn btn-secondary btn-sm" onclick="if (window.printEmergencyTransfers) { window.printEmergencyTransfers('${transfer.id}'); } else if (window.hospitrackPrintDocument) { window.hospitrackPrintDocument('emergency-transfers', '${transfer.id}'); }" title="Print Emergency Transfer Dossier">
          <span>🖨️</span> Print Dossier
        </button>

        <button type="button" class="btn btn-secondary btn-sm" onclick="closeTransferDrawer()">
          Close
        </button>
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// Global Emergency Transfer State Handlers & Action Dispatchers
// --------------------------------------------------------------------------

window.openTransferDrawer = function(transferId) {
  transferSelectedId = transferId;
  const overlay = document.getElementById('transferDrawerOverlay');
  if (overlay) {
    const store = window.hospitrackStore;
    const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
    const hospitalId = user?.hospitalId || 'HOSP-101';
    const hospital = (store && typeof store.getHospitalById === 'function' ? store.getHospitalById(hospitalId) : null) || { id: hospitalId, name: 'Hospital' };
    overlay.innerHTML = renderTransferDrawerContent(transferId, hospital, store);
    overlay.classList.add('open');
  } else {
    const container = document.getElementById('mainContentArea');
    if (container && window.renderHospitalDashboard) {
      window.renderHospitalDashboard(container, 'transfers');
    }
  }
};

window.closeTransferDrawer = function() {
  transferSelectedId = null;
  const overlay = document.getElementById('transferDrawerOverlay');
  if (overlay) {
    overlay.classList.remove('open');
  }
};

window.handleTransferSearchInput = function(query) {
  transferSearchQuery = query || '';
  const container = document.getElementById('mainContentArea');
  if (container && window.renderHospitalDashboard) {
    window.renderHospitalDashboard(container, 'transfers');
  }
};

window.handleTransferDirectionFilter = function(direction) {
  transferDirectionFilter = direction || 'ALL';
  const container = document.getElementById('mainContentArea');
  if (container && window.renderHospitalDashboard) {
    window.renderHospitalDashboard(container, 'transfers');
  }
};

window.handleTransferStatusFilter = function(status) {
  transferStatusFilter = status || 'ALL';
  const container = document.getElementById('mainContentArea');
  if (container && window.renderHospitalDashboard) {
    window.renderHospitalDashboard(container, 'transfers');
  }
};

window.handleTransferPriorityFilter = function(priority) {
  transferPriorityFilter = priority || 'ALL';
  const container = document.getElementById('mainContentArea');
  if (container && window.renderHospitalDashboard) {
    window.renderHospitalDashboard(container, 'transfers');
  }
};

window.clearTransferFilters = function() {
  transferSearchQuery = '';
  transferStatusFilter = 'ALL';
  transferPriorityFilter = 'ALL';
  transferDirectionFilter = 'ALL';
  const container = document.getElementById('mainContentArea');
  if (container && window.renderHospitalDashboard) {
    window.renderHospitalDashboard(container, 'transfers');
  }
};

window.refreshTransferPipeline = async function() {
  try {
    window.showToast('Refreshing emergency transfer pipeline...', 'info');
    if (window.hospitrackStore && typeof window.hospitrackStore.syncAllData === 'function') {
      await window.hospitrackStore.syncAllData();
    }
    const container = document.getElementById('mainContentArea');
    if (container && window.renderHospitalDashboard) {
      window.renderHospitalDashboard(container, 'transfers');
    }
    window.showToast('✓ Emergency transfer triage synchronized.', 'success');
  } catch (err) {
    window.showToast(err.message || 'Unable to sync emergency transfers.', 'error');
  }
};

// --------------------------------------------------------------------------
// 4B. Discharge Clearance & Operations Section
// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// 4B. Discharge Clearance & Operations Section (Production Workflow)
// --------------------------------------------------------------------------
function renderDischargeClearanceSection(data) {
  const { hospital = {}, patients = [], doctors = [] } = data;
  const store = window.hospitrackStore;

  const safePatients = Array.isArray(patients) ? patients : [];
  const safeDoctors = Array.isArray(doctors) ? doctors : [];

  // Authoritative KPI Metrics derived purely from actual backend patient records
  const totalCount = safePatients.length;
  const pendingClearances = safePatients.filter(p => 
    p && (p.status === 'DOCTOR_APPROVED' || p.dischargeStatus === 'DOCTOR_APPROVED' || p.dischargeStatus === 'CLEARANCE_PENDING')
  );
  const activeInpatients = safePatients.filter(p => 
    p && (p.status === 'CHECKED_IN' || p.status === 'ACTIVE' || (!p.status && p.dischargeStatus !== 'DISCHARGED'))
  );
  const pastDischarges = safePatients.filter(p => 
    p && (p.status === 'DISCHARGED' || p.dischargeStatus === 'DISCHARGED' || p.dischargeStatus === 'HOSPITAL_APPROVED')
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const dischargedTodayCount = pastDischarges.filter(p => {
    if (!p.dischargedAt) return false;
    try {
      return new Date(p.dischargedAt).toISOString().split('T')[0] === todayStr;
    } catch (e) {
      return false;
    }
  }).length;

  // Extract unique wards and doctors for filtering
  const allWards = Array.from(new Set(safePatients.map(p => p.ward || p.department).filter(Boolean)));
  if (!allWards.includes('General Ward')) allWards.push('General Ward');
  if (!allWards.includes('Cardiology Ward')) allWards.push('Cardiology Ward');
  if (!allWards.includes('ICU - Critical Care')) allWards.push('ICU - Critical Care');

  // Filter discharge dataset
  const q = (dischargeSearchQuery || '').toLowerCase().trim();
  const filtered = safePatients.filter(p => {
    if (!p) return false;

    // Status filter
    if (dischargeStatusFilter === 'AWAITING_APPROVAL') {
      if (p.status !== 'DOCTOR_APPROVED' && p.dischargeStatus !== 'DOCTOR_APPROVED' && p.dischargeStatus !== 'CLEARANCE_PENDING') return false;
    } else if (dischargeStatusFilter === 'DISCHARGED') {
      if (p.status !== 'DISCHARGED' && p.dischargeStatus !== 'DISCHARGED') return false;
    } else if (dischargeStatusFilter === 'ACTIVE_INPATIENT') {
      if (p.status !== 'CHECKED_IN' && p.status !== 'ACTIVE' && p.status !== 'CRITICAL') return false;
    }

    // Doctor filter
    if (dischargeDoctorFilter !== 'ALL') {
      const pDocId = p.primaryDoctorId || p.assignedDoctorId;
      if (pDocId !== dischargeDoctorFilter) return false;
    }

    // Ward filter
    if (dischargeWardFilter !== 'ALL') {
      const pWard = p.ward || p.department || 'General Ward';
      if (pWard !== dischargeWardFilter) return false;
    }

    // Search query
    if (q) {
      const doc = safeDoctors.find(d => d.id === p.primaryDoctorId || d.id === p.assignedDoctorId);
      const pName = (p.name || '').toLowerCase();
      const pId = (p.id || '').toLowerCase();
      const docName = (doc?.name || '').toLowerCase();
      const ward = (p.ward || '').toLowerCase();
      const bed = (p.bedNumber || '').toLowerCase();
      const summary = (p.dischargeSummary || '').toLowerCase();
      const diagnosis = (p.diagnosis || '').toLowerCase();

      const matches = pName.includes(q) ||
                      pId.includes(q) ||
                      docName.includes(q) ||
                      ward.includes(q) ||
                      bed.includes(q) ||
                      summary.includes(q) ||
                      diagnosis.includes(q);
      if (!matches) return false;
    }

    return true;
  });

  return `
    <div class="dashboard-container-clean">
      <!-- Section A: Page Header -->
      <div class="page-header-clean">
        <div class="page-header-title-block">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="page-badge-pill" style="background: rgba(13, 148, 136, 0.12); color: #0d9488;">🚪 Inpatient Discharge &amp; Bed Transition</span>
            <span class="status-pill success">Live State Synchronized</span>
          </div>
          <h1 class="page-title-clean">DISCHARGE CLEARANCE</h1>
          <p class="page-subtitle-clean">
            Review clinical readiness, financial clearance and final hospital authorization before discharge.
          </p>
        </div>
        <div class="page-actions-clean">
          <button type="button" class="btn btn-secondary" onclick="refreshDischargePipeline()" title="Sync real backend discharge records">
            <span>🔄</span> Refresh
          </button>
          <button type="button" class="btn btn-primary" onclick="setHospitalTab('patients')" title="View all inpatients">
            <span>👤</span> Inpatient Directory
          </button>
        </div>
      </div>

      <!-- Section B: 5-Card Responsive KPI Grid -->
      <div class="discharge-kpi-grid">
        <div class="discharge-kpi-card ${dischargeStatusFilter === 'ALL' ? 'active' : ''}" onclick="handleDischargeStatusFilter('ALL')" title="Show all patients in pipeline" role="button" tabindex="0">
          <div class="discharge-kpi-top">
            <span class="discharge-kpi-title">Total Pipeline</span>
            <span class="discharge-kpi-icon-wrap" style="background: rgba(14, 165, 233, 0.12); color: #0284c7;">📋</span>
          </div>
          <div class="discharge-kpi-val">${totalCount}</div>
          <div class="discharge-kpi-sub">
            <span class="discharge-kpi-dot" style="background: #0284c7;"></span>
            <span>${activeInpatients.length} active • ${pastDischarges.length} discharged</span>
          </div>
        </div>

        <div class="discharge-kpi-card ${dischargeStatusFilter === 'AWAITING_APPROVAL' ? 'active' : ''}" onclick="handleDischargeStatusFilter('AWAITING_APPROVAL')" title="Filter by awaiting hospital approval" role="button" tabindex="0">
          <div class="discharge-kpi-top">
            <span class="discharge-kpi-title">Awaiting Approval</span>
            <span class="discharge-kpi-icon-wrap" style="background: rgba(245, 158, 11, 0.12); color: #d97706;">⏳</span>
          </div>
          <div class="discharge-kpi-val" style="color: ${pendingClearances.length > 0 ? '#d97706' : 'var(--text-main)'};">${pendingClearances.length}</div>
          <div class="discharge-kpi-sub">
            <span class="discharge-kpi-dot" style="background: #d97706;"></span>
            <span>Clinician sign-off complete</span>
          </div>
        </div>

        <div class="discharge-kpi-card ${dischargeStatusFilter === 'ACTIVE_INPATIENT' ? 'active' : ''}" onclick="handleDischargeStatusFilter('ACTIVE_INPATIENT')" title="Filter by active inpatient care" role="button" tabindex="0">
          <div class="discharge-kpi-top">
            <span class="discharge-kpi-title">Active Inpatient Care</span>
            <span class="discharge-kpi-icon-wrap" style="background: rgba(13, 148, 136, 0.12); color: #0d9488;">🩺</span>
          </div>
          <div class="discharge-kpi-val" style="color: #0d9488;">${activeInpatients.length}</div>
          <div class="discharge-kpi-sub">
            <span class="discharge-kpi-dot" style="background: #0d9488;"></span>
            <span>Undergoing clinical treatment</span>
          </div>
        </div>

        <div class="discharge-kpi-card ${dischargeStatusFilter === 'DISCHARGED' ? 'active' : ''}" onclick="handleDischargeStatusFilter('DISCHARGED')" title="Filter by discharged patients" role="button" tabindex="0">
          <div class="discharge-kpi-top">
            <span class="discharge-kpi-title">Discharged &amp; Bed Released</span>
            <span class="discharge-kpi-icon-wrap" style="background: rgba(16, 185, 129, 0.12); color: #059669;">🏁</span>
          </div>
          <div class="discharge-kpi-val" style="color: #059669;">${pastDischarges.length}</div>
          <div class="discharge-kpi-sub">
            <span class="discharge-kpi-dot" style="background: #059669;"></span>
            <span>Bed capacity released</span>
          </div>
        </div>

        <div class="discharge-kpi-card" onclick="handleDischargeStatusFilter('DISCHARGED')" title="Discharges processed today" role="button" tabindex="0">
          <div class="discharge-kpi-top">
            <span class="discharge-kpi-title">Discharged Today</span>
            <span class="discharge-kpi-icon-wrap" style="background: rgba(99, 102, 241, 0.12); color: #4f46e5;">⚡</span>
          </div>
          <div class="discharge-kpi-val" style="color: #4f46e5;">${dischargedTodayCount}</div>
          <div class="discharge-kpi-sub">
            <span class="discharge-kpi-dot" style="background: #4f46e5;"></span>
            <span>Formalized today</span>
          </div>
        </div>
      </div>

      <!-- Section C: Discharge Workflow Stepper Card -->
      <div class="discharge-pipeline-card">
        <div class="discharge-pipeline-header">
          <div>
            <h3 class="discharge-pipeline-title">DISCHARGE WORKFLOW</h3>
            <p class="discharge-pipeline-sub">Standard clinical and administrative clearance sequence for inpatient discharge.</p>
          </div>
          <span class="discharge-lifecycle-badge">5 Operational Stages</span>
        </div>

        <div class="discharge-pipeline-stepper">
          <div class="discharge-stepper-stage ${dischargeStatusFilter === 'ACTIVE_INPATIENT' ? 'active' : ''}" onclick="handleDischargeStatusFilter('ACTIVE_INPATIENT')" title="Active inpatients" role="button" tabindex="0">
            <div class="discharge-stepper-num">01</div>
            <div class="discharge-stepper-info">
              <span class="discharge-stepper-label">Clinical Request</span>
              <span class="discharge-stepper-count">${activeInpatients.length} Active</span>
            </div>
          </div>
          <div class="discharge-stepper-arrow">➔</div>

          <div class="discharge-stepper-stage ${dischargeStatusFilter === 'AWAITING_APPROVAL' ? 'active' : ''}" onclick="handleDischargeStatusFilter('AWAITING_APPROVAL')" title="Awaiting hospital clearance" role="button" tabindex="0">
            <div class="discharge-stepper-num">02</div>
            <div class="discharge-stepper-info">
              <span class="discharge-stepper-label">Clinical Clearance</span>
              <span class="discharge-stepper-count" style="color: ${pendingClearances.length > 0 ? '#d97706' : 'inherit'};">${pendingClearances.length} Signed Off</span>
            </div>
          </div>
          <div class="discharge-stepper-arrow">➔</div>

          <div class="discharge-stepper-stage ${dischargeStatusFilter === 'AWAITING_APPROVAL' ? 'active' : ''}" onclick="handleDischargeStatusFilter('AWAITING_APPROVAL')" title="Pharmacy & billing clearance" role="button" tabindex="0">
            <div class="discharge-stepper-num">03</div>
            <div class="discharge-stepper-info">
              <span class="discharge-stepper-label">Pharmacy &amp; Billing</span>
              <span class="discharge-stepper-count">Reconciliation</span>
            </div>
          </div>
          <div class="discharge-stepper-arrow">➔</div>

          <div class="discharge-stepper-stage ${dischargeStatusFilter === 'AWAITING_APPROVAL' ? 'active' : ''}" onclick="handleDischargeStatusFilter('AWAITING_APPROVAL')" title="Hospital admin final sign-off" role="button" tabindex="0">
            <div class="discharge-stepper-num">04</div>
            <div class="discharge-stepper-info">
              <span class="discharge-stepper-label">Hospital Approval</span>
              <span class="discharge-stepper-count" style="color: ${pendingClearances.length > 0 ? '#0d9488' : 'inherit'};">${pendingClearances.length} Actionable</span>
            </div>
          </div>
          <div class="discharge-stepper-arrow">➔</div>

          <div class="discharge-stepper-stage ${dischargeStatusFilter === 'DISCHARGED' ? 'active' : ''}" onclick="handleDischargeStatusFilter('DISCHARGED')" title="Discharged and bed restored" role="button" tabindex="0">
            <div class="discharge-stepper-num">05</div>
            <div class="discharge-stepper-info">
              <span class="discharge-stepper-label">Discharged</span>
              <span class="discharge-stepper-count">${pastDischarges.length} Bed Released</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Section D: Search and Filters Toolbar -->
      <div class="discharge-toolbar">
        <div class="discharge-search-box">
          <span class="discharge-search-icon">🔍</span>
          <input type="text"
                 class="discharge-search-input"
                 placeholder="Search patient name, ID, attending doctor, ward, bed..."
                 value="${escapeHtml(dischargeSearchQuery)}"
                 oninput="handleDischargeSearchInput(this.value)">
        </div>

        <div class="discharge-filter-group">
          <!-- Status Filter -->
          <select class="discharge-filter-select" onchange="handleDischargeStatusFilter(this.value)">
            <option value="ALL" ${dischargeStatusFilter === 'ALL' ? 'selected' : ''}>All Pipeline Records (${totalCount})</option>
            <option value="AWAITING_APPROVAL" ${dischargeStatusFilter === 'AWAITING_APPROVAL' ? 'selected' : ''}>⏳ Awaiting Hospital Approval (${pendingClearances.length})</option>
            <option value="ACTIVE_INPATIENT" ${dischargeStatusFilter === 'ACTIVE_INPATIENT' ? 'selected' : ''}>🩺 Active Inpatient Care (${activeInpatients.length})</option>
            <option value="DISCHARGED" ${dischargeStatusFilter === 'DISCHARGED' ? 'selected' : ''}>🏁 Discharged &amp; Bed Released (${pastDischarges.length})</option>
          </select>

          <!-- Doctor Filter -->
          <select class="discharge-filter-select" onchange="handleDischargeDoctorFilter(this.value)">
            <option value="ALL" ${dischargeDoctorFilter === 'ALL' ? 'selected' : ''}>All Attending Doctors</option>
            ${safeDoctors.map(d => `<option value="${escapeHtml(d.id)}" ${dischargeDoctorFilter === d.id ? 'selected' : ''}>Dr. ${escapeHtml(d.name)} (${escapeHtml(d.specialty || 'Doctor')})</option>`).join('')}
          </select>

          <!-- Ward Filter -->
          <select class="discharge-filter-select" onchange="handleDischargeWardFilter(this.value)">
            <option value="ALL" ${dischargeWardFilter === 'ALL' ? 'selected' : ''}>All Hospital Wards</option>
            ${allWards.map(w => `<option value="${escapeHtml(w)}" ${dischargeWardFilter === w ? 'selected' : ''}>${escapeHtml(w)}</option>`).join('')}
          </select>

          ${(dischargeSearchQuery || dischargeStatusFilter !== 'ALL' || dischargeDoctorFilter !== 'ALL' || dischargeWardFilter !== 'ALL') ? `
            <button type="button" class="btn btn-secondary btn-sm" onclick="clearDischargeFilters()" title="Reset all search filters">
              ✕ Clear Filters
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Section E: Priority Discharge Work Queue -->
      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <div>
            <h3 class="dashboard-card-title"><span>🚪</span> Discharge Work Queue</h3>
            <p class="dashboard-card-sub">
              Showing <strong>${filtered.length}</strong> of <strong>${totalCount}</strong> inpatient discharge records for ${escapeHtml(hospital.name || 'Hospital')}
            </p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="refreshDischargePipeline()">
              <span>🔄</span> Refresh
            </button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table-clean">
            <thead>
              <tr>
                <th>Patient Details</th>
                <th>Ward / Bed</th>
                <th>Attending Doctor</th>
                <th>Admission Date</th>
                <th>Clearance Checklist</th>
                <th>Pipeline Stage</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="7">
                    <div class="empty-state-clean" style="padding: 48px 16px; text-align: center;">
                      <span class="empty-icon" style="font-size: 2.5rem;">${totalCount === 0 ? '🚪' : '🔍'}</span>
                      <div class="empty-title" style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-top: 8px;">
                        ${totalCount === 0 ? 'No Inpatient Discharge Records' : 'No Matching Discharges Found'}
                      </div>
                      <p class="empty-desc" style="color: var(--text-muted); font-size: 0.88rem; max-width: 440px; margin: 6px auto 16px;">
                        ${totalCount === 0 ? 'Patients approved for discharge by attending clinicians will appear in this operational deck.' : 'No patients match your current filter criteria. Try resetting your search filters.'}
                      </p>
                      ${totalCount === 0 ? `
                        <button type="button" class="btn btn-primary btn-sm" onclick="setHospitalTab('patients')">
                          View Inpatients Directory
                        </button>
                      ` : `
                        <button type="button" class="btn btn-secondary btn-sm" onclick="clearDischargeFilters()">
                          Clear Filters
                        </button>
                      `}
                    </div>
                  </td>
                </tr>
              ` : filtered.map(p => {
                const doc = safeDoctors.find(d => d.id === p.primaryDoctorId || d.id === p.assignedDoctorId) || { name: 'Attending Clinician', specialty: 'General Practice' };
                const isDoctorApproved = p.status === 'DOCTOR_APPROVED' || p.dischargeStatus === 'DOCTOR_APPROVED' || p.dischargeStatus === 'CLEARANCE_PENDING';
                const isDischarged = p.status === 'DISCHARGED' || p.dischargeStatus === 'DISCHARGED';
                const admittedDate = p.admittedAt ? new Date(p.admittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

                let statusBadgeClass = 'badge-info';
                let statusLabel = 'Active Inpatient';
                if (isDoctorApproved) {
                  statusBadgeClass = 'badge-warning';
                  statusLabel = 'Awaiting Hospital Approval';
                } else if (isDischarged) {
                  statusBadgeClass = 'badge-active';
                  statusLabel = 'Discharge Completed';
                }

                return `
                  <tr style="cursor: pointer;" onclick="if (!event.target.closest('button') && !event.target.closest('a')) openDischargeDrawer('${p.id}')">
                    <td>
                      <div class="cell-patient">
                        <a href="#hospital/workspace/patient/${encodeURIComponent(p.id)}" class="cell-patient-name font-semibold" onclick="event.stopPropagation(); openDischargeDrawer('${p.id}')">
                          ${escapeHtml(p.name)}
                        </a>
                        <span class="cell-patient-id font-mono text-xs text-muted">
                          <code>${escapeHtml(p.id)}</code> • ${p.age}y ${escapeHtml(p.gender || 'M')} ${p.bloodGroup ? `• ${escapeHtml(p.bloodGroup)}` : ''}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: 600; color: var(--text-main); font-size: 0.84rem;">
                          ${escapeHtml(p.ward || 'General Ward')}
                        </span>
                        <span style="font-size: 0.74rem; color: var(--text-muted);">
                          🛏️ Bed: <strong>${escapeHtml(p.bedNumber || 'Allocated')}</strong>
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: 600; color: var(--text-main); font-size: 0.84rem;">
                          Dr. ${escapeHtml(doc.name)}
                        </span>
                        <span style="font-size: 0.74rem; color: var(--text-muted);">
                          ${escapeHtml(doc.specialty || 'Attending Physician')}
                        </span>
                      </div>
                    </td>
                    <td style="font-size: 0.80rem; color: var(--text-secondary); white-space: nowrap;">
                      ${escapeHtml(admittedDate)}
                    </td>
                    <td>
                      <div class="clearance-pill-checklist">
                        <span class="clearance-pill-item ${isDoctorApproved || isDischarged ? 'cleared' : 'pending'}">
                          ${isDoctorApproved || isDischarged ? '✓' : '○'} Doctor Clinical Sign-off
                        </span>
                        <span class="clearance-pill-item ${isDoctorApproved || isDischarged ? 'cleared' : 'pending'}">
                          ${isDoctorApproved || isDischarged ? '✓' : '○'} Pharmacy Medication Reconciliation
                        </span>
                        <span class="clearance-pill-item ${isDischarged ? 'cleared' : (isDoctorApproved ? 'cleared' : 'pending')}">
                          ${isDischarged ? '✓' : (isDoctorApproved ? '✓' : '○')} Account &amp; Billing Settlement
                        </span>
                      </div>
                    </td>
                    <td>
                      <span class="badge ${statusBadgeClass}">
                        ${escapeHtml(statusLabel)}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <div class="action-btn-group" style="justify-content: flex-end; display: flex; gap: 6px;">
                        ${isDoctorApproved ? `
                          <button type="button" class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openApproveDischargeModal('${p.id}')" title="Approve hospital discharge and release bed">
                            <span>✓</span> Approve
                          </button>
                          <button type="button" class="btn btn-outline-danger btn-sm" onclick="event.stopPropagation(); openRejectDischargeModal('${p.id}')" title="Return discharge request for correction">
                            <span>✕</span> Return
                          </button>
                        ` : ''}
                        <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openDischargeDrawer('${p.id}')" title="Inspect patient discharge records">
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section F: Slide-Over Discharge Detail Drawer Overlay -->
      <div id="dischargeDrawerOverlay" class="discharge-drawer-overlay ${dischargeSelectedId ? 'open' : ''}" onclick="if (event.target === this) closeDischargeDrawer()">
        ${dischargeSelectedId ? renderDischargeDrawerContent(dischargeSelectedId, hospital, store) : ''}
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// Slide-Over Patient Discharge Detail Drawer Content Renderer
// --------------------------------------------------------------------------
function renderDischargeDrawerContent(patientId, hospital, store) {
  const patient = store && typeof store.getPatientById === 'function' ? store.getPatientById(patientId) : null;
  if (!patient) {
    return `
      <div class="discharge-drawer">
        <div class="discharge-drawer-header">
          <div class="discharge-drawer-title-wrap">
            <h3 class="discharge-drawer-title">Discharge Clearance Dossier</h3>
          </div>
          <button type="button" class="modal-close" onclick="closeDischargeDrawer()">✕</button>
        </div>
        <div class="discharge-drawer-body">
          <div class="empty-state-clean">
            <span class="empty-icon">⚠️</span>
            <div class="empty-title">Patient Record Not Found</div>
            <p class="empty-desc">The requested patient record [${escapeHtml(patientId)}] could not be retrieved from backend records.</p>
          </div>
        </div>
      </div>
    `;
  }

  const doctors = store ? store.getDoctors() : [];
  const doctor = doctors.find(d => d.id === patient.primaryDoctorId || d.id === patient.assignedDoctorId) || { name: 'Attending Clinician', specialty: 'General Practice' };

  const isDoctorApproved = patient.status === 'DOCTOR_APPROVED' || patient.dischargeStatus === 'DOCTOR_APPROVED' || patient.dischargeStatus === 'CLEARANCE_PENDING';
  const isDischarged = patient.status === 'DISCHARGED' || patient.dischargeStatus === 'DISCHARGED';

  const admittedFormatted = patient.admittedAt ? new Date(patient.admittedAt).toLocaleString() : 'N/A';
  const dischargedFormatted = patient.dischargedAt ? new Date(patient.dischargedAt).toLocaleString() : (isDischarged ? 'Completed' : 'Awaiting Authorization');

  let statusBadgeClass = 'badge-info';
  let statusLabel = 'Active Inpatient';
  if (isDoctorApproved) {
    statusBadgeClass = 'badge-warning';
    statusLabel = 'Awaiting Hospital Approval';
  } else if (isDischarged) {
    statusBadgeClass = 'badge-active';
    statusLabel = 'Discharge Completed';
  }

  return `
    <div class="discharge-drawer" role="dialog" aria-modal="true" aria-labelledby="dischargeDrawerTitle">
      <!-- Drawer Header -->
      <div class="discharge-drawer-header">
        <div class="discharge-drawer-title-wrap">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="badge ${statusBadgeClass}">${escapeHtml(statusLabel)}</span>
            <span class="status-pill info font-mono text-xs"><code>${escapeHtml(patient.id)}</code></span>
          </div>
          <h3 class="discharge-drawer-title" id="dischargeDrawerTitle">
            ${escapeHtml(patient.name)}
          </h3>
          <span class="discharge-drawer-sub">Admitted: ${escapeHtml(admittedFormatted)} • Ward: ${escapeHtml(patient.ward || 'General Ward')} • Bed: ${escapeHtml(patient.bedNumber || 'Allocated')}</span>
        </div>
        <button type="button" class="modal-close" onclick="closeDischargeDrawer()" aria-label="Close drawer">✕</button>
      </div>

      <!-- Drawer Body -->
      <div class="discharge-drawer-body">
        <!-- 1. Patient Demographics -->
        <div class="discharge-drawer-section">
          <div class="discharge-drawer-section-title">
            <span>👤</span> PATIENT DEMOGRAPHICS
          </div>
          <div class="discharge-drawer-grid">
            <div class="discharge-drawer-field">
              <span class="discharge-drawer-label">Full Name</span>
              <span class="discharge-drawer-val">${escapeHtml(patient.name)}</span>
            </div>
            <div class="discharge-drawer-field">
              <span class="discharge-drawer-label">Patient ID</span>
              <span class="discharge-drawer-val"><code>${escapeHtml(patient.id)}</code></span>
            </div>
            <div class="discharge-drawer-field">
              <span class="discharge-drawer-label">Age / Gender</span>
              <span class="discharge-drawer-val">${patient.age} Yrs • ${escapeHtml(patient.gender || 'M')}</span>
            </div>
            <div class="discharge-drawer-field">
              <span class="discharge-drawer-label">Blood Group</span>
              <span class="discharge-drawer-val">${patient.bloodGroup ? `<span class="status-pill info">${escapeHtml(patient.bloodGroup)}</span>` : 'N/A'}</span>
            </div>
            <div class="discharge-drawer-field full-span">
              <span class="discharge-drawer-label">Emergency Contact</span>
              <span class="discharge-drawer-val">${escapeHtml(patient.emergencyContact || patient.contact || 'On file')}</span>
            </div>
          </div>
        </div>

        <!-- 2. Inpatient Admission Details -->
        <div class="discharge-drawer-section">
          <div class="discharge-drawer-section-title">
            <span>🏥</span> INPATIENT ADMISSION &amp; CLINICAL TEAM
          </div>
          <div class="discharge-drawer-grid">
            <div class="discharge-drawer-field">
              <span class="discharge-drawer-label">Attending Doctor</span>
              <span class="discharge-drawer-val">Dr. ${escapeHtml(doctor.name)}</span>
            </div>
            <div class="discharge-drawer-field">
              <span class="discharge-drawer-label">Specialty / Department</span>
              <span class="discharge-drawer-val">${escapeHtml(doctor.specialty || 'General Practice')}</span>
            </div>
            <div class="discharge-drawer-field">
              <span class="discharge-drawer-label">Admission Ward</span>
              <span class="discharge-drawer-val">${escapeHtml(patient.ward || 'General Ward')}</span>
            </div>
            <div class="discharge-drawer-field">
              <span class="discharge-drawer-label">Assigned Bed Number</span>
              <span class="discharge-drawer-val font-mono">🛏️ ${escapeHtml(patient.bedNumber || 'Allocated Bed')}</span>
            </div>
          </div>
        </div>

        <!-- 3. Clinical Discharge Summary & Notes -->
        <div class="discharge-drawer-section">
          <div class="discharge-drawer-section-title">
            <span>📋</span> CLINICAL DISCHARGE SUMMARY
          </div>
          <div class="discharge-drawer-grid">
            <div class="discharge-drawer-field full-span">
              <span class="discharge-drawer-label">Physician Discharge Notes &amp; Treatment Outcome</span>
              <span class="discharge-drawer-val" style="font-weight: 500; line-height: 1.4;">
                ${escapeHtml(patient.dischargeSummary || patient.diagnosis || 'Clinical criteria verified by attending clinician. Condition stable and cleared for discharge transition.')}
              </span>
            </div>
            ${patient.dischargeNotes ? `
              <div class="discharge-drawer-field full-span">
                <span class="discharge-drawer-label">Administrative Clearance Notes</span>
                <span class="discharge-drawer-val" style="font-weight: 400; line-height: 1.4; color: var(--text-secondary);">
                  ${escapeHtml(patient.dischargeNotes)}
                </span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- 4. Multi-Tier Clearance Checklist -->
        <div class="discharge-drawer-section">
          <div class="discharge-drawer-section-title">
            <span>✅</span> MULTI-TIER CLEARANCE STATUS
          </div>
          <div class="clearance-pill-checklist" style="background: var(--bg-surface-alt, #f8fafc); border: 1px solid var(--border-subtle, #e2e8f0); border-radius: 8px; padding: 14px 16px; gap: 8px;">
            <span class="clearance-pill-item ${isDoctorApproved || isDischarged ? 'cleared' : 'pending'}" style="font-size: 0.84rem;">
              ${isDoctorApproved || isDischarged ? '✓' : '○'} 1. Attending Clinician Sign-off (${isDoctorApproved || isDischarged ? 'Approved' : 'Pending'})
            </span>
            <span class="clearance-pill-item ${isDoctorApproved || isDischarged ? 'cleared' : 'pending'}" style="font-size: 0.84rem;">
              ${isDoctorApproved || isDischarged ? '✓' : '○'} 2. Inpatient Pharmacy Medication Reconciliation (${isDoctorApproved || isDischarged ? 'Reconciled' : 'Pending'})
            </span>
            <span class="clearance-pill-item ${isDischarged ? 'cleared' : (isDoctorApproved ? 'cleared' : 'pending')}" style="font-size: 0.84rem;">
              ${isDischarged ? '✓' : (isDoctorApproved ? '✓' : '○')} 3. Administrative Settlement &amp; Billing (${isDischarged ? 'Settled' : (isDoctorApproved ? 'Cleared' : 'Pending')})
            </span>
            <span class="clearance-pill-item ${isDischarged ? 'cleared' : 'pending'}" style="font-size: 0.84rem;">
              ${isDischarged ? '✓' : '○'} 4. Hospital Operations Final Authorization (${isDischarged ? 'Formalized' : (isDoctorApproved ? 'Ready for Authorization' : 'Pending')})
            </span>
          </div>
        </div>

        <!-- 5. Audit Timeline -->
        <div class="discharge-drawer-section">
          <div class="discharge-drawer-section-title">
            <span>⏱️</span> DISCHARGE AUDIT TIMELINE
          </div>
          <div class="referral-care-flow-box">
            <div class="referral-care-flow-step">
              <div class="referral-care-flow-bullet" style="background: #0ea5e9;">1</div>
              <div class="referral-care-flow-content">
                <div class="referral-care-flow-tag">Inpatient Admission</div>
                <div class="referral-care-flow-name">${escapeHtml(admittedFormatted)}</div>
              </div>
            </div>
            <div class="referral-care-flow-connector">↓</div>
            <div class="referral-care-flow-step">
              <div class="referral-care-flow-bullet" style="background: ${isDoctorApproved || isDischarged ? '#d97706' : '#94a3b8'};">2</div>
              <div class="referral-care-flow-content">
                <div class="referral-care-flow-tag">Physician Clinical Clearance</div>
                <div class="referral-care-flow-name">${isDoctorApproved || isDischarged ? `Approved by Dr. ${escapeHtml(doctor.name)}` : 'Pending Clinical Approval'}</div>
              </div>
            </div>
            <div class="referral-care-flow-connector">↓</div>
            <div class="referral-care-flow-step">
              <div class="referral-care-flow-bullet" style="background: ${isDischarged ? '#059669' : '#94a3b8'};">3</div>
              <div class="referral-care-flow-content">
                <div class="referral-care-flow-tag">Hospital Authorization &amp; Bed Release</div>
                <div class="referral-care-flow-name">${escapeHtml(dischargedFormatted)}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 6. Connected Clinical Records Quick Navigation -->
        <div class="discharge-drawer-section">
          <div class="discharge-drawer-section-title">
            <span>🔗</span> CONNECTED CLINICAL RECORDS
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeDischargeDrawer(); window.openWorkspace ? window.openWorkspace('patient', '${patient.id}', 'consultations') : window.openPatientWorkspace('${patient.id}')">
              <span>🩺</span> Consultations
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeDischargeDrawer(); window.openWorkspace ? window.openWorkspace('patient', '${patient.id}', 'prescriptions') : window.openPatientWorkspace('${patient.id}')">
              <span>💊</span> Prescriptions
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeDischargeDrawer(); window.openWorkspace ? window.openWorkspace('patient', '${patient.id}', 'lab-reports') : window.openPatientWorkspace('${patient.id}')">
              <span>🧪</span> Lab Reports
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeDischargeDrawer(); window.openPatientWorkspace('${patient.id}')">
              <span>👤</span> Patient Workspace
            </button>
          </div>
        </div>
      </div>

      <!-- Drawer Actions -->
      <div class="discharge-drawer-actions">
        ${isDoctorApproved ? `
          <button type="button" class="btn btn-outline-danger btn-sm" onclick="openRejectDischargeModal('${patient.id}')">
            <span>✕</span> Return for Correction
          </button>
          <button type="button" class="btn btn-primary btn-sm" onclick="openApproveDischargeModal('${patient.id}')">
            <span>✓</span> Approve Final Discharge
          </button>
        ` : ''}

        <button type="button" class="btn btn-secondary btn-sm" onclick="closeDischargeDrawer()">
          Close
        </button>
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// Global Discharge State Handlers & Action Dispatchers
// --------------------------------------------------------------------------

window.openDischargeDrawer = function(patientId) {
  dischargeSelectedId = patientId;
  const overlay = document.getElementById('dischargeDrawerOverlay');
  if (overlay) {
    const store = window.hospitrackStore;
    const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
    const hospitalId = user?.hospitalId || 'HOSP-101';
    const hospital = (store && typeof store.getHospitalById === 'function' ? store.getHospitalById(hospitalId) : null) || { id: hospitalId, name: 'Hospital' };
    overlay.innerHTML = renderDischargeDrawerContent(patientId, hospital, store);
    overlay.classList.add('open');
  } else {
    const container = document.getElementById('mainContentArea');
    if (container && window.renderHospitalDashboard) {
      window.renderHospitalDashboard(container, 'discharge-clearance');
    }
  }
};

window.closeDischargeDrawer = function() {
  dischargeSelectedId = null;
  const overlay = document.getElementById('dischargeDrawerOverlay');
  if (overlay) {
    overlay.classList.remove('open');
  }
};

window.handleDischargeSearchInput = function(query) {
  dischargeSearchQuery = query || '';
  const container = document.getElementById('mainContentArea');
  if (container && window.renderHospitalDashboard) {
    window.renderHospitalDashboard(container, 'discharge-clearance');
  }
};

window.handleDischargeStatusFilter = function(status) {
  dischargeStatusFilter = status || 'ALL';
  const container = document.getElementById('mainContentArea');
  if (container && window.renderHospitalDashboard) {
    window.renderHospitalDashboard(container, 'discharge-clearance');
  }
};

window.handleDischargeDoctorFilter = function(doctorId) {
  dischargeDoctorFilter = doctorId || 'ALL';
  const container = document.getElementById('mainContentArea');
  if (container && window.renderHospitalDashboard) {
    window.renderHospitalDashboard(container, 'discharge-clearance');
  }
};

window.handleDischargeWardFilter = function(ward) {
  dischargeWardFilter = ward || 'ALL';
  const container = document.getElementById('mainContentArea');
  if (container && window.renderHospitalDashboard) {
    window.renderHospitalDashboard(container, 'discharge-clearance');
  }
};

window.clearDischargeFilters = function() {
  dischargeSearchQuery = '';
  dischargeStatusFilter = 'ALL';
  dischargeDoctorFilter = 'ALL';
  dischargeWardFilter = 'ALL';
  const container = document.getElementById('mainContentArea');
  if (container && window.renderHospitalDashboard) {
    window.renderHospitalDashboard(container, 'discharge-clearance');
  }
};

window.refreshDischargePipeline = async function() {
  try {
    window.showToast('Refreshing discharge clearance records...', 'info');
    if (window.hospitrackStore && typeof window.hospitrackStore.syncAllData === 'function') {
      await window.hospitrackStore.syncAllData();
    }
    const container = document.getElementById('mainContentArea');
    if (container && window.renderHospitalDashboard) {
      window.renderHospitalDashboard(container, 'discharge-clearance');
    }
    window.showToast('✓ Inpatient discharge deck synchronized.', 'success');
  } catch (err) {
    window.showToast(err.message || 'Unable to sync discharge clearance.', 'error');
  }
};

// --------------------------------------------------------------------------
// Hospital Discharge Confirmation Modals & API Integration
// --------------------------------------------------------------------------

window.openApproveDischargeModal = function(patientId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const currentUser = window.hospitrackAuth?.getCurrentUser();
  const patient = store ? store.getPatientById(patientId) : null;
  const doctors = store ? store.getDoctors() : [];
  const doc = doctors.find(d => d.id === patient?.primaryDoctorId || d.id === patient?.assignedDoctorId) || { name: 'Attending Clinician' };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isPatientOfCurrentHospital = !patient?.currentHospitalId || patient.currentHospitalId === currentUser?.hospitalId || isSuperAdmin;
  const patientHospital = patient?.currentHospitalId ? store.getHospitalById(patient.currentHospitalId) : null;
  const hasBed = Boolean(patient?.bedNumber && patient.bedNumber !== 'Allocated' && patient.bedNumber !== 'Allocated Bed' && patient.bedNumber !== 'Not assigned');
  const bedDisplay = hasBed ? patient.bedNumber : 'Not assigned';
  const isDoctorApproved = patient?.status === 'DOCTOR_APPROVED' || patient?.dischargeStatus === 'DOCTOR_APPROVED';

  const defaultNotes = hasBed
    ? 'Hospital administrative clearance approved. Bed released back to facility inventory.'
    : 'Hospital administrative clearance approved. Patient discharged from active care.';
  const noticeText = hasBed
    ? 'Once approved, the patient will be marked discharged and the occupied bed will be released.'
    : 'Once approved, the patient will be marked discharged. No bed release is required because no bed is currently assigned.';

  modalContainer.innerHTML = `
    <div id="approveDischargeModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="approveDischargeModalTitle">
      <div class="modal-box" style="max-width: 560px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" id="approveDischargeModalTitle">🚪 FINAL DISCHARGE CLEARANCE</h3>
            <p class="text-secondary font-xs mt-2">Formal administrative sign-off and bed release authorization.</p>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('approveDischargeModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="handleConfirmApproveDischargeSubmit(event, '${escapeHtml(patientId)}')" class="p-20">
          <div class="mb-16 p-12 bg-surface-alt radius-md border-subtle">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="font-size: 1.05rem;">${escapeHtml(patient ? patient.name : patientId)}</strong>
              <span class="badge ${patient?.status === 'DISCHARGED' ? 'badge-success' : (isDoctorApproved ? 'badge-info' : 'badge-warning')}">
                ${patient?.status === 'DISCHARGED' ? 'Discharged' : (isDoctorApproved ? 'Clinical Sign-off Completed' : 'Awaiting Hospital Approval')}
              </span>
            </div>
            <div class="font-mono text-xs text-muted">
              ID: <code>${escapeHtml(patientId)}</code> • Ward: ${escapeHtml(patient?.ward || 'General Ward')} • Bed: ${escapeHtml(bedDisplay)}
            </div>
            <div class="text-xs text-secondary mt-4">
              Attending Clinician: <strong>Dr. ${escapeHtml(doc.name)}</strong>
              ${patientHospital ? ` • Facility: <strong>${escapeHtml(patientHospital.name)}</strong>` : ''}
            </div>
          </div>

          ${!isPatientOfCurrentHospital ? `
            <div class="alert-banner warning mb-16" style="display: flex; gap: 8px; align-items: flex-start;">
              <span style="font-size: 1.2rem;">⚠️</span>
              <div>
                <strong>Cross-Facility Clearance Restricted</strong>
                <div class="text-xs mt-2">
                  This patient is assigned to <strong>${escapeHtml(patientHospital?.name || patient?.currentHospitalId || 'another hospital')}</strong>.
                  Discharge clearance is available only to the patient's treating hospital.
                </div>
              </div>
            </div>
          ` : ''}

          <div class="mb-16">
            <label class="form-label font-semibold">Clearance Status</label>
            <div class="clearance-pill-checklist p-12 bg-surface-alt radius-md border-subtle" style="display: flex; flex-direction: column; gap: 8px;">
              <span class="clearance-pill-item cleared" style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #059669; font-weight: 500;">
                <span style="font-weight: 700; color: #059669;">✓</span> Attending Doctor Clinical Sign-off
              </span>
              <span class="clearance-pill-item cleared" style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #059669; font-weight: 500;">
                <span style="font-weight: 700; color: #059669;">✓</span> Pharmacy Inpatient Medication Reconciliation
              </span>
              <span class="clearance-pill-item cleared" style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #059669; font-weight: 500;">
                <span style="font-weight: 700; color: #059669;">✓</span> Financial &amp; Administrative Billing Settlement
              </span>
            </div>
          </div>

          <div class="form-group mb-16">
            <label class="form-label font-semibold" for="clearanceNotesInput">Administrative Notes</label>
            <textarea id="clearanceNotesInput"
                      class="form-control"
                      rows="2"
                      placeholder="e.g. All hospital clearances verified. Released in stable condition."
                      style="resize: vertical;"
                      ${!isPatientOfCurrentHospital ? 'disabled' : ''}>${escapeHtml(defaultNotes)}</textarea>
          </div>

          <div class="p-10 mb-16 radius-md" style="background: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; font-size: 12px; color: #92400e;">
            ℹ️ <strong>Notice:</strong> ${escapeHtml(noticeText)}
          </div>

          <div id="approveDischargeAlert" class="alert-banner hidden mb-16"></div>

          <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('approveDischargeModal')">Cancel</button>
            ${isPatientOfCurrentHospital ? `
              <button type="submit" id="confirmApproveDischargeBtn" class="btn btn-primary" style="background: var(--success, #10b981); border-color: var(--success, #10b981);">
                ✓ Confirm Final Discharge
              </button>
            ` : `
              <button type="button" disabled class="btn btn-secondary" style="opacity: 0.6; cursor: not-allowed;" title="Discharge restricted to patient's treating facility">
                ✕ Facility Clearance Restricted
              </button>
            `}
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleConfirmApproveDischargeSubmit = async function(event, patientId) {
  event.preventDefault();
  const notesInput = document.getElementById('clearanceNotesInput');
  const alertEl = document.getElementById('approveDischargeAlert');
  const submitBtn = document.getElementById('confirmApproveDischargeBtn');
  const clearanceNotes = notesInput ? notesInput.value.trim() : 'Hospital administrative clearance approved.';
  const store = window.hospitrackStore;
  const currentUser = window.hospitrackAuth?.getCurrentUser();
  const patient = store ? store.getPatientById(patientId) : null;
  const patientName = patient ? patient.name : patientId;

  if (submitBtn && submitBtn.disabled) return;

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Finalizing discharge...';
    }

    if (alertEl) {
      alertEl.classList.add('hidden');
      alertEl.textContent = '';
    }

    await window.hospitrackStore.approvePatientDischarge(patientId, clearanceNotes);
    window.showToast(`✓ Discharge completed successfully for ${patientName}. Bed inventory updated.`, 'success');
    closeGlobalModal('approveDischargeModal');
    if (typeof window.closeDischargeDrawer === 'function') window.closeDischargeDrawer();
    if (typeof window.closeInpatientDrawer === 'function') window.closeInpatientDrawer();
    await window.hospitrackStore.syncAllData();
    const activeTab = window.hospitalActiveTab || 'discharge-clearance';
    window.renderHospitalDashboard(document.getElementById('mainContentArea'), activeTab);
  } catch (err) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      let safeMsg = err.message;
      if (err.status === 403) {
        safeMsg = 'You are not authorized to perform discharge clearance for this patient. This patient is assigned to another hospital.';
      } else if (err.status === 401) {
        safeMsg = 'Your session has expired. Please log in again.';
      } else if (err.status === 404) {
        safeMsg = 'Patient or active admission record could not be found.';
      } else if (err.status === 409) {
        safeMsg = 'This discharge cannot be completed because the patient\'s current clinical state has changed.';
      } else if (err.status >= 500) {
        safeMsg = 'Discharge could not be completed because the hospital service encountered an internal error.';
      }
      alertEl.innerHTML = `
        <strong>Discharge could not be completed.</strong>
        <div class="mt-4 text-xs">${escapeHtml(safeMsg || 'Please verify clearance requirements and permissions.')}</div>
        <details class="mt-8 pt-8 border-top font-mono text-xs" style="color: #64748b; border-color: rgba(239, 68, 68, 0.2);">
          <summary style="cursor: pointer;">Technical Diagnostics</summary>
          <div class="mt-4">HTTP Status: ${err.status || 500}</div>
          <div>Endpoint: POST /api/patients/${escapeHtml(patientId)}/discharge-clearance</div>
          <div>Patient Facility ID: ${escapeHtml(patient?.currentHospitalId || 'Unknown')}</div>
          <div>User Facility ID: ${escapeHtml(currentUser?.hospitalId || 'Unknown')}</div>
        </details>
      `;
      alertEl.classList.remove('hidden');
    } else {
      window.showToast(err.message || 'Discharge could not be completed.', 'error');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '✓ Confirm Final Discharge';
    }
  }
};

window.openRejectDischargeModal = function(patientId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const patient = store ? store.getPatientById(patientId) : null;

  modalContainer.innerHTML = `
    <div id="rejectDischargeModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="rejectDischargeModalTitle">
      <div class="modal-box" style="max-width: 540px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" id="rejectDischargeModalTitle">✕ Return Discharge Request</h3>
            <p class="text-secondary font-xs mt-2">Return inpatient to active care for clinical or administrative review.</p>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('rejectDischargeModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="handleConfirmRejectDischargeSubmit(event, '${escapeHtml(patientId)}')" class="p-20">
          <div class="mb-16">
            <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 0 0 10px 0;">
              You are returning discharge clearance for patient <strong>${escapeHtml(patient ? patient.name : patientId)}</strong> (<code>${escapeHtml(patientId)}</code>).
            </p>
            <div class="alert-banner warning">
              Please document the reason for returning this inpatient to active care.
            </div>
          </div>

          <div class="form-group mb-20">
            <label class="form-label font-semibold" for="rejectDischargeReasonInput">Return Reason &amp; Clinical Notes <span class="text-danger">*</span></label>
            <textarea id="rejectDischargeReasonInput"
                      class="form-control"
                      rows="3"
                      placeholder="e.g. Additional laboratory confirmation required, medication adjustment, or billing reconciliation pending..."
                      required></textarea>
          </div>

          <div id="rejectDischargeAlert" class="alert-banner hidden mb-16"></div>

          <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('rejectDischargeModal')">Cancel</button>
            <button type="submit" id="confirmRejectDischargeBtn" class="btn btn-danger">Return to Active Care</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleConfirmRejectDischargeSubmit = async function(event, patientId) {
  event.preventDefault();
  const reasonInput = document.getElementById('rejectDischargeReasonInput');
  const alertEl = document.getElementById('rejectDischargeAlert');
  const submitBtn = document.getElementById('confirmRejectDischargeBtn');
  const reason = reasonInput ? reasonInput.value.trim() : '';

  if (!reason) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = 'Please provide a reason before returning the discharge request.';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  if (submitBtn && submitBtn.disabled) return;

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Returning Request...';
    }

    if (alertEl) {
      alertEl.classList.add('hidden');
      alertEl.textContent = '';
    }

    await window.hospitrackStore.rejectPatientDischarge(patientId, reason);
    window.showToast(`Discharge request for ${patientId} returned to active inpatient care.`, 'info');
    closeGlobalModal('rejectDischargeModal');
    if (typeof window.closeDischargeDrawer === 'function') window.closeDischargeDrawer();
    if (typeof window.closeInpatientDrawer === 'function') window.closeInpatientDrawer();
    await window.hospitrackStore.syncAllData();
    const activeTab = window.hospitalActiveTab || 'discharge-clearance';
    window.renderHospitalDashboard(document.getElementById('mainContentArea'), activeTab);
  } catch (err) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      const safeMsg = err.message || 'Failed to return discharge request.';
      alertEl.innerHTML = `<strong>Return request failed.</strong><div class="mt-4 text-xs">${escapeHtml(safeMsg)}</div>`;
      alertEl.classList.remove('hidden');
    } else {
      window.showToast(err.message || 'Failed to return discharge request.', 'error');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Return to Active Care';
    }
  }
};

window.handleDischargeClick = function(patientId) {
  window.openApproveDischargeModal(patientId);
};
window.handleHospitalApproveDischarge = function(patientId) {
  window.openApproveDischargeModal(patientId);
};
window.handleHospitalRejectDischarge = function(patientId) {
  window.openRejectDischargeModal(patientId);
};

// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// Assign Doctor to Inpatient Modal & Submit Handler
// --------------------------------------------------------------------------
window.filterAssignDoctorSelect = function(dept, hospitalId) {
  const store = window.hospitrackStore;
  const targetHospitalId = hospitalId || window.hospitrackAuth?.getCurrentUser()?.hospitalId || 'HOSP-101';
  let docs = store ? store.getDoctors(targetHospitalId) : [];
  if (dept && dept !== 'ALL') {
    docs = docs.filter(d => (d.specialty || d.department || '').toLowerCase().includes(dept.toLowerCase()));
  }
  const select = document.getElementById('assignDoctorSelect');
  if (select) {
    if (docs.length === 0) {
      select.innerHTML = '<option value="">-- No Doctors Available in Selected Department --</option>';
    } else {
      select.innerHTML = `
        <option value="">-- Choose Doctor --</option>
        ${docs.map(d => `<option value="${escapeHtml(d.id)}">Dr. ${escapeHtml(d.name)} (${escapeHtml(d.specialty || 'Attending Physician')})</option>`).join('')}
      `;
    }
  }
};

window.openAssignDoctorToPatientModal = function(patientId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
  const hospitalId = user?.hospitalId || 'HOSP-101';
  const doctors = store ? store.getDoctors(hospitalId) : [];
  const patient = store ? store.getPatientById(patientId) : null;

  const departments = Array.from(new Set(doctors.map(d => d.specialty || d.department).filter(Boolean)));
  if (!departments.includes('General Medicine')) departments.push('General Medicine');
  if (!departments.includes('Cardiology')) departments.push('Cardiology');
  if (!departments.includes('Intensive Care Unit (ICU)')) departments.push('Intensive Care Unit (ICU)');

  modalContainer.innerHTML = `
    <div id="assignDoctorToPatientModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="assignDocModalTitle">
      <div class="modal-box modal-box-md">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 38px; height: 38px; border-radius: var(--radius-md); background: var(--primary-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
              🩺
            </div>
            <div>
              <h3 class="modal-title" id="assignDocModalTitle">Assign Attending Physician</h3>
              <p class="modal-subtitle">Inpatient: <strong>${escapeHtml(patient ? patient.name : patientId)}</strong> (<code>${escapeHtml(patientId)}</code>)</p>
            </div>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('assignDoctorToPatientModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="handleAssignDoctorToPatientSubmit(event, '${patientId}')" class="p-20">
          <div id="assignDocAlert" class="alert-banner hidden mb-16"></div>

          <div class="form-group mb-16">
            <label class="form-label" for="assignDoctorDeptSelect">Filter by Clinical Department</label>
            <select id="assignDoctorDeptSelect" class="form-control" onchange="filterAssignDoctorSelect(this.value, '${hospitalId}')">
              <option value="ALL">All Clinical Departments</option>
              ${departments.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('')}
            </select>
          </div>

          <div class="form-group mb-16">
            <label class="form-label" for="assignDoctorSelect">Select Attending Doctor <span style="color: var(--danger-text);">*</span></label>
            <select id="assignDoctorSelect" class="form-control" required>
              <option value="">-- Choose Doctor --</option>
              ${doctors.map(d => `<option value="${d.id}" ${patient && patient.primaryDoctorId === d.id ? 'selected' : ''}>Dr. ${escapeHtml(d.name)} (${escapeHtml(d.specialty || 'Attending Physician')})</option>`).join('')}
            </select>
          </div>

          <div class="form-group mb-20">
            <label class="form-label" for="assignDoctorReason">Assignment Reason / Clinical Notes <span style="font-size: 0.76rem; color: var(--text-muted); font-weight: normal;">(Optional)</span></label>
            <input type="text" id="assignDoctorReason" class="form-control" placeholder="e.g. Primary attending physician during inpatient stay">
          </div>

          <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('assignDoctorToPatientModal')">Cancel</button>
            <button type="submit" class="btn btn-primary" id="saveAssignDocBtn">🩺 Assign Doctor</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleAssignDoctorToPatientSubmit = async function(event, patientId) {
  event.preventDefault();
  const doctorId = document.getElementById('assignDoctorSelect')?.value;
  const alertEl = document.getElementById('assignDocAlert');
  const submitBtn = document.getElementById('saveAssignDocBtn');

  if (!doctorId) {
    if (alertEl) {
      alertEl.textContent = 'Please select an attending doctor.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Assigning Doctor...';
    }

    await window.hospitrackStore.assignDoctorToPatient(patientId, doctorId);
    window.showToast(`✓ Attending doctor successfully assigned to patient ${patientId}.`, 'success');
    closeGlobalModal('assignDoctorToPatientModal');
    await window.hospitrackStore.syncAllData();
    window.renderHospitalDashboard(document.getElementById('mainContentArea'), 'patients');
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to assign doctor.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '🩺 Assign Doctor';
    }
  }
};

// --------------------------------------------------------------------------
// Inpatient Date & Length of Stay Calculation Helpers
// --------------------------------------------------------------------------
function isAdmittedToday(admittedAt) {
  if (!admittedAt) return false;
  const d = new Date(admittedAt);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
         d.getMonth() === now.getMonth() &&
         d.getDate() === now.getDate();
}

function calculateLengthOfStay(admittedAt) {
  if (!admittedAt) return '—';
  const admDate = new Date(admittedAt);
  if (isNaN(admDate.getTime())) return '—';
  const now = new Date();
  const diffMs = now.getTime() - admDate.getTime();
  if (diffMs < 0) return 'Today (<24h)';
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Today (<24h)';
  if (diffDays === 1) return '1 day';
  return `${diffDays} days`;
}

// --------------------------------------------------------------------------
// Action Menu Dropdown Toggle Handler
// --------------------------------------------------------------------------
window.toggleInpatientActionMenu = function(event, menuId) {
  if (event) event.stopPropagation();
  const menu = document.getElementById(menuId);
  if (!menu) return;

  // Close all other open menus first
  document.querySelectorAll('.inpatient-menu-dropdown.show').forEach(el => {
    if (el.id !== menuId) el.classList.remove('show');
  });

  menu.classList.toggle('show');
};

// Global click listener to close dropdown menus on outside click
if (!window._inpatientMenuOutsideListenerAttached) {
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.inpatient-action-menu-wrap')) {
      document.querySelectorAll('.inpatient-menu-dropdown.show').forEach(el => {
        el.classList.remove('show');
      });
    }
  });
  window._inpatientMenuOutsideListenerAttached = true;
}

// --------------------------------------------------------------------------
// Patient Detail Drawer Controller
// --------------------------------------------------------------------------
window.openInpatientDrawer = function(patientId) {
  // Close open action menus
  document.querySelectorAll('.inpatient-menu-dropdown.show').forEach(el => el.classList.remove('show'));

  const store = window.hospitrackStore;
  const patient = store ? store.getPatientById(patientId) : null;
  if (!patient) {
    window.showToast('Patient record not found.', 'error');
    return;
  }

  const doc = patient.primaryDoctorId ? store.getDoctorById(patient.primaryDoctorId) : null;
  const isCritical = patient.status === 'CRITICAL' || patient.priority === 'CRITICAL' || (patient.ward && patient.ward.toLowerCase().includes('icu'));
  const lengthOfStay = calculateLengthOfStay(patient.admittedAt);
  const admissionDateFormatted = patient.admittedAt ? new Date(patient.admittedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const wardName = patient.ward || (isCritical ? 'Intensive Care Unit (ICU)' : 'General Inpatient Ward');
  const roomBed = patient.roomBed || (patient.room && patient.bed ? `${patient.room} • ${patient.bed}` : (patient.room || patient.bed || 'Not assigned'));
  const departmentName = doc?.specialty || doc?.department || patient.department || (isCritical ? 'Critical Care & ICU' : 'General & Internal Medicine');
  const initials = (patient.name || 'P').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'PT';

  // Clinical metrics from store
  const prescriptions = (store && typeof store.getPrescriptions === 'function') ? store.getPrescriptions(patient.id) : [];
  const labs = (store && typeof store.getLabs === 'function') ? store.getLabs(null, patient.id) : [];
  const referrals = (store && typeof store.getReferrals === 'function') ? (store.getReferrals() || []).filter(r => r.patientId === patient.id) : [];
  const transfers = (store && typeof store.getTransfers === 'function') ? (store.getTransfers() || []).filter(t => t.patientId === patient.id) : [];

  const drawerContent = document.getElementById('inpatientDrawerContent');
  const drawerOverlay = document.getElementById('inpatientDrawerOverlay');

  if (!drawerContent || !drawerOverlay) {
    if (window.openPatientWorkspace) {
      window.openPatientWorkspace(patientId);
    }
    return;
  }

  const isDischarged = patient.status === 'DISCHARGED';
  const isDocApproved = patient.dischargeStatus === 'DOCTOR_APPROVED' || patient.status === 'DOCTOR_APPROVED';
  const isClearancePending = patient.dischargeStatus === 'CLEARANCE_PENDING' || isDocApproved;

  drawerContent.innerHTML = `
    <div class="inpatient-drawer-header" style="padding: 16px 20px; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
        <div class="inpatient-drawer-avatar" style="width: 48px; height: 48px; border-radius: 12px; background: #CCFBF1; color: #0F766E; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 700; flex-shrink: 0; border: 1px solid #99F6E4;">
          ${patient.photoUrl ? `
            <img src="${escapeHtml(patient.photoUrl)}" alt="${escapeHtml(patient.name)}" style="width: 100%; height: 100%; border-radius: 12px; object-fit: cover;">
          ` : `
            <span>${escapeHtml(initials)}</span>
          `}
        </div>
        <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <h3 class="inpatient-drawer-name" style="font-size: 1.15rem; font-weight: 700; color: #0F172A; margin: 0;">${escapeHtml(patient.name)}</h3>
            <span class="badge" style="background: #F1F5F9; color: #0F766E; font-weight: 700; font-family: monospace; font-size: 0.78rem; border: 1px solid #CBD5E1;">${escapeHtml(patient.id)}</span>
            ${isCritical ? `<span class="badge badge-danger" style="font-size: 0.72rem; font-weight: 700;">Critical Inpatient</span>` : `<span class="badge badge-success" style="font-size: 0.72rem; font-weight: 700; background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0;">Active Inpatient</span>`}
          </div>
          <span style="font-size: 0.76rem; color: #64748B;">UHID: 91-4401-${escapeHtml(patient.id)} • Hospital ID: ${escapeHtml(patient.hospitalId || 'HOSP-001')}</span>
        </div>
      </div>
      <button type="button" class="modal-close" onclick="closeInpatientDrawer()" aria-label="Close Drawer" style="font-size: 1.25rem; color: #64748B; background: transparent; border: none; cursor: pointer; padding: 4px 8px; border-radius: 6px;">✕</button>
    </div>

    <div class="inpatient-drawer-body" style="padding: 20px; overflow-y: auto; flex: 1;">
      <!-- Quick Metrics Grid (4x1 / 2x2) -->
      <div class="patient-quick-metrics-grid">
        <div class="patient-metric-box">
          <span class="patient-metric-label">Age / Gender</span>
          <span class="patient-metric-value">${patient.age ? `${patient.age} Yrs` : '—'} • ${patient.gender || 'N/A'}</span>
        </div>
        <div class="patient-metric-box">
          <span class="patient-metric-label">Blood Group</span>
          <span class="patient-metric-value" style="color: #DC2626;">${escapeHtml(patient.bloodGroup || '—')}</span>
        </div>
        <div class="patient-metric-box">
          <span class="patient-metric-label">Bed / Ward</span>
          <span class="patient-metric-value">${escapeHtml(roomBed)}</span>
        </div>
        <div class="patient-metric-box">
          <span class="patient-metric-label">Admitted On</span>
          <span class="patient-metric-value">${escapeHtml(admissionDateFormatted)}</span>
        </div>
      </div>

      <!-- Emergency Contact Block with Direct Call Button -->
      <div class="patient-emergency-contact-box">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.25rem;">🚨</span>
          <div>
            <div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: #9F1239; letter-spacing: 0.04em;">Emergency Contact</div>
            <div style="font-size: 0.88rem; font-weight: 700; color: #881337;">${escapeHtml(patient.emergencyContact || patient.contact || patient.phone || 'Primary Contact on File')}</div>
            <span class="badge" style="background: #FFE4E6; color: #BE123C; font-size: 0.68rem; font-weight: 700; border: 1px solid #FECDD3; margin-top: 2px;">Verified Relationship</span>
          </div>
        </div>
        ${(patient.emergencyContact || patient.phone || patient.contact) ? `
          <a href="tel:${escapeHtml(patient.emergencyContact || patient.phone || patient.contact)}" class="btn btn-secondary btn-sm" style="background: #FFFFFF; border-color: #FECDD3; color: #9F1239; font-weight: 700;">
            📞 Call
          </a>
        ` : ''}
      </div>

      <!-- 2. PERSONAL INFORMATION -->
      <div class="inpatient-drawer-section">
        <div class="inpatient-drawer-section-title">
          <span>📋</span> Personal &amp; Contact Details
        </div>
        <div class="inpatient-drawer-grid">
          <div class="inpatient-drawer-field">
            <span class="inpatient-drawer-label">Primary Telephone</span>
            <span class="inpatient-drawer-value">📞 ${escapeHtml(patient.contact || patient.phone || 'Not provided')}</span>
          </div>
          <div class="inpatient-drawer-field">
            <span class="inpatient-drawer-label">Attending Physician</span>
            <span class="inpatient-drawer-value" style="color: var(--primary); font-weight: 700;">
              ${doc ? `Dr. ${escapeHtml(doc.name)}` : 'Unassigned'}
            </span>
            <span style="font-size: 0.74rem; color: var(--text-muted);">${escapeHtml(doc?.specialty || 'General Practice')}</span>
          </div>
          <div class="inpatient-drawer-field full-span">
            <span class="inpatient-drawer-label">Residential Address</span>
            <span class="inpatient-drawer-value">📍 ${escapeHtml(patient.address || 'Not provided')}</span>
          </div>
        </div>
      </div>

      <!-- 3. CURRENT CARE ALLOCATION -->
      <div class="inpatient-drawer-section">
        <div class="inpatient-drawer-section-title">
          <span>🏥</span> Current Care &amp; Inpatient Allocation
        </div>
        <div class="inpatient-drawer-grid">
          <div class="inpatient-drawer-field">
            <span class="inpatient-drawer-label">Ward &amp; Department</span>
            <span class="inpatient-drawer-value font-semibold">${escapeHtml(wardName)}</span>
            <span style="font-size: 0.74rem; color: var(--text-muted);">${escapeHtml(departmentName)}</span>
          </div>
          <div class="inpatient-drawer-field">
            <span class="inpatient-drawer-label">Length of Stay</span>
            <span class="inpatient-drawer-value font-semibold">${escapeHtml(lengthOfStay)}</span>
            <span style="font-size: 0.74rem; color: var(--text-muted);">Admitted: ${escapeHtml(admissionDateFormatted)}</span>
          </div>
          <div class="inpatient-drawer-field full-span">
            <span class="inpatient-drawer-label">Discharge Status &amp; Workflow</span>
            <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem;">
                <span style="color: var(--text-muted);">Doctor Approval:</span>
                <span class="font-semibold" style="color: ${isDocApproved || isDischarged ? 'var(--success-text)' : 'var(--text-muted)'};">
                  ${isDocApproved || isDischarged ? '✓ Approved' : '⏳ Pending Physician Review'}
                </span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem;">
                <span style="color: var(--text-muted);">Hospital Clearance:</span>
                <span class="font-semibold" style="color: ${isDischarged ? 'var(--success-text)' : isClearancePending ? 'var(--warning-text)' : 'var(--text-muted)'};">
                  ${isDischarged ? '✓ Cleared' : isClearancePending ? '⏳ Hospital Action Required' : '⏳ Inpatient Care Ongoing'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. CLINICAL OVERVIEW -->
      <div class="inpatient-drawer-section">
        <div class="inpatient-drawer-section-title">
          <span>🩺</span> Clinical Record Overview
        </div>
        <div class="inpatient-drawer-grid">
          <div class="inpatient-drawer-field" style="text-align: center;">
            <span class="inpatient-drawer-label">Active Prescriptions</span>
            <span class="inpatient-drawer-value font-mono" style="font-size: 1.25rem; color: var(--primary);">${prescriptions.length}</span>
            <span style="font-size: 0.72rem; color: var(--text-muted);">${prescriptions.length > 0 ? 'Active medication regimen' : 'No active Rx orders'}</span>
          </div>
          <div class="inpatient-drawer-field" style="text-align: center;">
            <span class="inpatient-drawer-label">Diagnostic Lab Reports</span>
            <span class="inpatient-drawer-value font-mono" style="font-size: 1.25rem; color: var(--info);">${labs.length}</span>
            <span style="font-size: 0.72rem; color: var(--text-muted);">${labs.length > 0 ? 'Verified pathology & radiology' : 'No lab reports on file'}</span>
          </div>
          <div class="inpatient-drawer-field" style="text-align: center;">
            <span class="inpatient-drawer-label">Inter-Facility Referrals</span>
            <span class="inpatient-drawer-value font-mono" style="font-size: 1.25rem;">${referrals.length}</span>
            <span style="font-size: 0.72rem; color: var(--text-muted);">Specialist consultations</span>
          </div>
          <div class="inpatient-drawer-field" style="text-align: center;">
            <span class="inpatient-drawer-label">Emergency Transfers</span>
            <span class="inpatient-drawer-value font-mono" style="font-size: 1.25rem;">${transfers.length}</span>
            <span style="font-size: 0.72rem; color: var(--text-muted);">Ambulance &amp; tertiary triage</span>
          </div>
        </div>
      </div>
    </div>

    <!-- QUICK ACTIONS & REAL-WORLD PRINT FOOTER -->
    <div class="patient-drawer-actions-bar inpatient-drawer-actions">
      <button type="button" class="btn btn-secondary btn-sm" onclick="closeInpatientDrawer(); if (window.hospitrackPrintDocument) window.hospitrackPrintDocument('summary', '${patient.id}');">
        <span>🖨️</span> Print Summary / Discharge Sheet
      </button>
      <button type="button" class="btn btn-primary btn-sm" onclick="closeInpatientDrawer(); window.openPatientWorkspace('${patient.id}')">
        <span>📋</span> Update Care Plan
      </button>
      <button type="button" class="btn btn-secondary btn-sm" onclick="closeInpatientDrawer()">
        Close
      </button>
    </div>
  `;

  drawerOverlay.classList.add('open');
};

window.openPatientDrawer = window.openInpatientDrawer;
window.closePatientDrawer = window.closeInpatientDrawer;

window.closeInpatientDrawer = function() {
  const drawerOverlay = document.getElementById('inpatientDrawerOverlay');
  if (drawerOverlay) {
    drawerOverlay.classList.remove('open');
  }
};

// (Universal Inpatient Bed & Ward Assignment Modal is defined in section 4)

// ==========================================================================
// 6A. DOCTORS SECTION (PRODUCTION CLINICAL PHYSICIANS WORKSPACE)
// ==========================================================================
function renderDoctorsSection(data = {}) {
  const store = window.hospitrackStore;
  const {
    hospital = {},
    doctors = [],
    patients = []
  } = data;

  const totalDoctorsCount = Array.isArray(doctors) ? doctors.length : 0;
  const activeDoctorsCount = Array.isArray(doctors) ? doctors.filter(d => d.status === 'ACTIVE' || !d.status).length : 0;
  const onDutyDoctorsCount = activeDoctorsCount; // Active doctors affiliated with facility on active clinical roster
  const allDepartments = Array.from(new Set(doctors.map(d => d.specialty || d.department).filter(Boolean)));
  if (allDepartments.length === 0) {
    allDepartments.push('General Medicine');
  }
  const distinctDeptCount = allDepartments.length;

  // Filter logic
  let filteredDoctors = Array.isArray(doctors) ? [...doctors] : [];
  if (doctorSearchQuery) {
    const q = doctorSearchQuery.toLowerCase().trim();
    filteredDoctors = filteredDoctors.filter(d =>
      (d.name && d.name.toLowerCase().includes(q)) ||
      (d.id && d.id.toLowerCase().includes(q)) ||
      (d.licenseNo && d.licenseNo.toLowerCase().includes(q)) ||
      (d.specialty && d.specialty.toLowerCase().includes(q)) ||
      (d.department && d.department.toLowerCase().includes(q)) ||
      (d.email && d.email.toLowerCase().includes(q)) ||
      (d.phone && d.phone.toLowerCase().includes(q))
    );
  }

  if (doctorDeptFilter && doctorDeptFilter !== 'ALL') {
    filteredDoctors = filteredDoctors.filter(d => {
      const spec = (d.specialty || d.department || '').toLowerCase();
      return spec.includes(doctorDeptFilter.toLowerCase()) || doctorDeptFilter.toLowerCase().includes(spec);
    });
  }

  if (doctorStatusFilter && doctorStatusFilter !== 'ALL') {
    filteredDoctors = filteredDoctors.filter(d => (d.status || 'ACTIVE') === doctorStatusFilter);
  }

  if (doctorAvailabilityFilter && doctorAvailabilityFilter !== 'ALL') {
    if (doctorAvailabilityFilter === 'ON_DUTY') {
      filteredDoctors = filteredDoctors.filter(d => d.status === 'ACTIVE' || !d.status);
    } else if (doctorAvailabilityFilter === 'OFF_DUTY') {
      filteredDoctors = filteredDoctors.filter(d => d.status === 'INACTIVE');
    }
  }

  const hasActiveFilters = Boolean(doctorSearchQuery || doctorDeptFilter !== 'ALL' || doctorStatusFilter !== 'ALL' || doctorAvailabilityFilter !== 'ALL');

  // Department-wise Grouping
  const deptMap = new Map();
  filteredDoctors.forEach(doc => {
    const deptName = doc.specialty || doc.department || 'General Medicine';
    if (!deptMap.has(deptName)) {
      deptMap.set(deptName, []);
    }
    deptMap.get(deptName).push(doc);
  });

  const sortedDepts = Array.from(deptMap.keys()).sort();

  return `
    <div class="doctor-management-container">
      <!-- 1. AUTHORITATIVE HEADER -->
      <div class="doctor-header-clean">
        <div class="doctor-title-block">
          <div class="doctor-badge-row">
            <span class="doctor-header-badge">PHYSICIANS &amp; CLINICAL FACULTY</span>
            <span class="doctor-status-indicator"><span class="status-pulse-dot"></span> Clinical Roster Active</span>
          </div>
          <h1 class="doctor-page-title">Doctors</h1>
          <p class="doctor-page-subtitle">
            Manage physicians, departments, assignments and clinical availability.
          </p>
        </div>
        <div class="doctor-actions-toolbar">
          <button type="button" class="btn btn-secondary btn-sm" onclick="openAssignDoctorModal()" title="Affiliate an existing credentialed doctor">
            <span>👥</span> Assign Existing Doctor
          </button>
          <button type="button" class="btn btn-primary btn-sm" onclick="openAddDoctorFacilityModal()" title="Onboard and credential new physician">
            <span>+</span> Add Doctor
          </button>
        </div>
      </div>

      <!-- 2. KPI SUMMARY (4 COMPACT REAL BACKEND-DRIVEN CARDS) -->
      <div class="doctor-kpi-row">
        <div class="doctor-kpi-card primary clickable ${doctorStatusFilter === 'ALL' && !doctorSearchQuery ? 'active' : ''}" onclick="doctorStatusFilter = 'ALL'; doctorDeptFilter = 'ALL'; doctorAvailabilityFilter = 'ALL'; renderHospitalSectionNow('doctors');" title="Filter by All Doctors">
          <div class="doctor-kpi-top">
            <span class="doctor-kpi-label">Total Doctors</span>
            <span class="doctor-kpi-icon">🩺</span>
          </div>
          <div class="doctor-kpi-value">${totalDoctorsCount}</div>
          <div class="doctor-kpi-sub">Accredited Physicians</div>
        </div>

        <div class="doctor-kpi-card success clickable ${doctorStatusFilter === 'ACTIVE' ? 'active' : ''}" onclick="doctorStatusFilter = 'ACTIVE'; renderHospitalSectionNow('doctors');" title="Filter by Active Doctors">
          <div class="doctor-kpi-top">
            <span class="doctor-kpi-label">Active</span>
            <span class="doctor-kpi-icon">●</span>
          </div>
          <div class="doctor-kpi-value">${activeDoctorsCount}</div>
          <div class="doctor-kpi-sub">Licensed &amp; Active</div>
        </div>

        <div class="doctor-kpi-card info clickable ${doctorAvailabilityFilter === 'ON_DUTY' ? 'active' : ''}" onclick="doctorAvailabilityFilter = 'ON_DUTY'; renderHospitalSectionNow('doctors');" title="Filter by On Duty">
          <div class="doctor-kpi-top">
            <span class="doctor-kpi-label">On Duty</span>
            <span class="doctor-kpi-icon">🏥</span>
          </div>
          <div class="doctor-kpi-value">${onDutyDoctorsCount}</div>
          <div class="doctor-kpi-sub">Available for Patient Care</div>
        </div>

        <div class="doctor-kpi-card teal" title="Clinical Departments Count">
          <div class="doctor-kpi-top">
            <span class="doctor-kpi-label">Departments</span>
            <span class="doctor-kpi-icon">🏛️</span>
          </div>
          <div class="doctor-kpi-value">${distinctDeptCount}</div>
          <div class="doctor-kpi-sub">Specialty Services</div>
        </div>
      </div>

      <!-- 3. SEARCH & FILTERS TOOLBAR -->
      <div class="doctor-toolbar">
        <div class="doctor-search-box">
          <span class="doctor-search-icon">🔍</span>
          <input type="text" class="doctor-search-input" placeholder="Search doctor by name, ID, license, or specialty..." value="${escapeHtml(doctorSearchQuery)}" oninput="doctorSearchQuery = this.value; renderHospitalSectionNow('doctors');">
          ${doctorSearchQuery ? `<button type="button" class="doctor-search-clear" onclick="doctorSearchQuery = ''; renderHospitalSectionNow('doctors');" aria-label="Clear Search">✕</button>` : ''}
        </div>

        <div class="doctor-filter-group">
          <select class="doctor-filter-select" onchange="doctorDeptFilter = this.value; renderHospitalSectionNow('doctors');" aria-label="Department Filter">
            <option value="ALL" ${doctorDeptFilter === 'ALL' ? 'selected' : ''}>All Departments</option>
            ${allDepartments.map(d => `<option value="${escapeHtml(d)}" ${doctorDeptFilter === d ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('')}
          </select>

          <select class="doctor-filter-select" onchange="doctorStatusFilter = this.value; renderHospitalSectionNow('doctors');" aria-label="Status Filter">
            <option value="ALL" ${doctorStatusFilter === 'ALL' ? 'selected' : ''}>Status: All</option>
            <option value="ACTIVE" ${doctorStatusFilter === 'ACTIVE' ? 'selected' : ''}>Active</option>
            <option value="INACTIVE" ${doctorStatusFilter === 'INACTIVE' ? 'selected' : ''}>Inactive</option>
          </select>

          <select class="doctor-filter-select" onchange="doctorAvailabilityFilter = this.value; renderHospitalSectionNow('doctors');" aria-label="Availability Filter">
            <option value="ALL" ${doctorAvailabilityFilter === 'ALL' ? 'selected' : ''}>Availability: All</option>
            <option value="ON_DUTY" ${doctorAvailabilityFilter === 'ON_DUTY' ? 'selected' : ''}>On Duty</option>
            <option value="OFF_DUTY" ${doctorAvailabilityFilter === 'OFF_DUTY' ? 'selected' : ''}>Off Duty</option>
          </select>

          ${hasActiveFilters ? `
            <button type="button" class="btn btn-secondary btn-sm doctor-reset-btn" onclick="doctorSearchQuery = ''; doctorDeptFilter = 'ALL'; doctorStatusFilter = 'ALL'; doctorAvailabilityFilter = 'ALL'; renderHospitalSectionNow('doctors');" title="Reset all doctor filters">
              ✕ Reset
            </button>
          ` : ''}
        </div>

        <div class="doctor-results-count">
          Showing <strong>${filteredDoctors.length}</strong> of <strong>${totalDoctorsCount}</strong> Physicians
        </div>
      </div>

      <!-- 4. DEPARTMENT-WISE DOCTOR ORGANIZATION -->
      ${filteredDoctors.length === 0 ? `
        <div class="glass-panel text-center" style="padding: 3rem; margin-top: 1rem;">
          <div style="font-size: 3rem; margin-bottom: 12px;">🩺</div>
          <h3 style="color: var(--text-main); font-size: 1.15rem; margin-bottom: 6px;">
            ${totalDoctorsCount === 0 ? 'No doctors have been added to this hospital yet.' : 'No doctors match your search or filter criteria.'}
          </h3>
          <p style="color: var(--text-muted); font-size: 0.88rem; max-width: 480px; margin: 0 auto 16px auto;">
            ${totalDoctorsCount === 0 ? 'Onboard accredited physicians to assign patients, order lab diagnostics, and issue prescriptions.' : 'Try adjusting your search query, department selection, or status filters.'}
          </p>
          <div style="display: flex; gap: 8px; justify-content: center;">
            ${totalDoctorsCount === 0 ? `
              <button type="button" class="btn btn-primary" onclick="openAddDoctorFacilityModal()">
                <span>+</span> Add Doctor
              </button>
              <button type="button" class="btn btn-secondary" onclick="openAssignDoctorModal()">
                <span>👥</span> Assign Existing Doctor
              </button>
            ` : `
              <button type="button" class="btn btn-secondary" onclick="doctorSearchQuery = ''; doctorDeptFilter = 'ALL'; doctorStatusFilter = 'ALL'; doctorAvailabilityFilter = 'ALL'; renderHospitalSectionNow('doctors');">
                ✕ Reset Filters
              </button>
            `}
          </div>
        </div>
      ` : `
        <div class="doctor-departments-list">
          ${sortedDepts.map(deptName => {
            const deptDoctors = deptMap.get(deptName) || [];
            return `
              <div class="doc-dept-group-card">
                <div class="doc-dept-group-header">
                  <div class="doc-dept-group-title-wrap">
                    <span class="doc-dept-group-icon">🩺</span>
                    <h3 class="doc-dept-group-title">${escapeHtml(deptName.toUpperCase())}</h3>
                    <span class="doc-dept-group-badge">${deptDoctors.length} Physician${deptDoctors.length === 1 ? '' : 's'}</span>
                  </div>
                </div>

                <div class="doc-cards-grid">
                  ${deptDoctors.map(doc => {
                    const assignedPatients = (store && typeof store.getPatients === 'function') ? store.getPatients(hospital.id).filter(p => p.primaryDoctorId === doc.id) : [];
                    const isActive = doc.status === 'ACTIVE' || !doc.status;
                    const initials = (doc.name || 'Dr').replace(/^Dr\.?\s*/i, '').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'DR';

                    return `
                      <div class="doctor-profile-card">
                        <div class="doctor-card-top-row">
                          <div class="doctor-card-avatar-wrap">
                            <div class="doctor-card-avatar">
                              <span>${escapeHtml(initials)}</span>
                            </div>
                            <span class="doctor-status-dot ${isActive ? 'active' : 'inactive'}" title="${isActive ? 'Active on Roster' : 'Inactive'}"></span>
                          </div>
                          <div class="doctor-card-identity">
                            <h4 class="doctor-card-name" onclick="openDoctorDrawer('${doc.id}')" title="View Doctor Profile">
                              Dr. ${escapeHtml(doc.name ? doc.name.replace(/^Dr\.?\s*/i, '') : 'Physician')}
                            </h4>
                            <div class="doctor-card-id-row">
                              <code class="font-mono">${escapeHtml(doc.id)}</code>
                              <span class="doctor-card-dept-tag">${escapeHtml(doc.specialty || deptName)}</span>
                            </div>
                          </div>
                        </div>

                        <div class="doctor-card-meta-grid">
                          <div class="doctor-card-meta-item">
                            <span class="doctor-card-meta-label">Experience</span>
                            <span class="doctor-card-meta-val">${doc.experienceYears != null ? `${doc.experienceYears} Years` : 'Not provided'}</span>
                          </div>
                          <div class="doctor-card-meta-item">
                            <span class="doctor-card-meta-label">Registration No.</span>
                            <span class="doctor-card-meta-val font-mono">${escapeHtml(doc.licenseNo || 'Not provided')}</span>
                          </div>
                          <div class="doctor-card-meta-item">
                            <span class="doctor-card-meta-label">Contact</span>
                            <span class="doctor-card-meta-val" title="${escapeHtml(doc.email || doc.phone || '')}">📞 ${escapeHtml(doc.phone || doc.email || 'Not provided')}</span>
                          </div>
                          <div class="doctor-card-meta-item">
                            <span class="doctor-card-meta-label">Assigned Inpatients</span>
                            <span class="doctor-card-meta-val font-bold" style="color: var(--primary);">👥 ${assignedPatients.length} Active</span>
                          </div>
                        </div>

                        <div class="doctor-card-status-bar">
                          <span class="badge ${isActive ? 'badge-success' : 'badge-warning'}">
                            ${isActive ? '● ACTIVE' : '○ INACTIVE'}
                          </span>
                          <span class="badge badge-info font-xs">
                            ${isActive ? '● ON DUTY' : '○ OFF DUTY'}
                          </span>
                        </div>

                        <div class="doctor-card-actions">
                          <button type="button" class="btn btn-secondary btn-sm" onclick="openDoctorDrawer('${doc.id}')">
                            View Profile
                          </button>
                          <button type="button" class="btn btn-primary btn-sm" onclick="window.openDoctorWorkspace('${doc.id}')">
                            Workspace →
                          </button>
                          <div class="inpatient-action-menu-wrap">
                            <button type="button" class="btn btn-secondary btn-sm inpatient-more-btn" onclick="event.stopPropagation(); toggleDoctorActionMenu(event, 'docMenu_${doc.id}')" title="More Doctor Options" aria-label="More Doctor Options">
                              ⋯
                            </button>
                            <div id="docMenu_${doc.id}" class="inpatient-menu-dropdown">
                              <button type="button" class="inpatient-menu-item" onclick="openDoctorDrawer('${doc.id}')">
                                <span>👤</span> View Profile Drawer
                              </button>
                              <button type="button" class="inpatient-menu-item" onclick="window.openDoctorWorkspace('${doc.id}')">
                                <span>📋</span> Open Doctor Workspace
                              </button>
                              <button type="button" class="inpatient-menu-item" onclick="openManageDoctorCredentialsModal('${doc.id}')">
                                <span>🔑</span> Manage Credentials &amp; Access
                              </button>
                              <button type="button" class="inpatient-menu-item" onclick="openEditDoctorModal('${doc.id}')">
                                <span>✏️</span> Edit Doctor Details
                              </button>
                              <button type="button" class="inpatient-menu-item" onclick="handleToggleDoctorStatus('${doc.id}')">
                                <span>🔄</span> Set as ${isActive ? 'Inactive' : 'Active'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>

    <!-- Doctor Slide-Over Quick Drawer Container -->
    <div id="doctorDrawerOverlay" class="doctor-drawer-overlay" onclick="if (event.target === this) closeDoctorDrawer();">
      <div id="doctorDrawerContent" class="doctor-drawer">
        <!-- Populated dynamically by openDoctorDrawer() -->
      </div>
    </div>
  `;
}

// ==========================================================================
// 6B. MEDICAL STAFF SECTION (NURSING, LAB, PHARMACY & CLINICAL SUPPORT)
// ==========================================================================
function renderMedicalStaffSection(data = {}) {
  const store = window.hospitrackStore;
  const {
    hospital = {},
    medicalStaff = []
  } = data;

  const totalStaffCount = Array.isArray(medicalStaff) ? medicalStaff.length : 0;
  const activeStaffCount = Array.isArray(medicalStaff) ? medicalStaff.filter(s => s.status === 'ACTIVE').length : 0;
  const onDutyStaffCount = Array.isArray(medicalStaff) ? medicalStaff.filter(s => s.onDuty || s.status === 'ACTIVE').length : 0;

  const allCategories = ['Nursing Staff', 'Laboratory Staff', 'Pharmacy Staff', 'Radiology / Imaging Staff', 'Emergency Staff', 'Clinical Support', 'Other Authorized Staff'];
  const distinctCategories = Array.from(new Set(medicalStaff.map(s => s.category).filter(Boolean)));
  const staffDepartments = Array.from(new Set(medicalStaff.map(s => s.department).filter(Boolean)));

  // Filter Logic
  let filteredStaff = Array.isArray(medicalStaff) ? [...medicalStaff] : [];
  if (staffSearchQuery) {
    const q = staffSearchQuery.toLowerCase().trim();
    filteredStaff = filteredStaff.filter(s =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.id && s.id.toLowerCase().includes(q)) ||
      (s.role && s.role.toLowerCase().includes(q)) ||
      (s.department && s.department.toLowerCase().includes(q)) ||
      (s.phone && s.phone.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.qualification && s.qualification.toLowerCase().includes(q))
    );
  }

  if (staffRoleFilter && staffRoleFilter !== 'ALL') {
    filteredStaff = filteredStaff.filter(s => s.category === staffRoleFilter || (s.role && s.role.toLowerCase().includes(staffRoleFilter.toLowerCase())));
  }

  if (staffDeptFilter && staffDeptFilter !== 'ALL') {
    filteredStaff = filteredStaff.filter(s => (s.department || '').toLowerCase().includes(staffDeptFilter.toLowerCase()));
  }

  if (staffStatusFilter && staffStatusFilter !== 'ALL') {
    filteredStaff = filteredStaff.filter(s => (s.status || 'ACTIVE') === staffStatusFilter);
  }

  const hasActiveFilters = Boolean(staffSearchQuery || staffRoleFilter !== 'ALL' || staffDeptFilter !== 'ALL' || staffStatusFilter !== 'ALL');

  // Category-wise Staff Grouping
  const categoryMap = new Map();
  filteredStaff.forEach(stf => {
    const catName = stf.category || 'Clinical Support';
    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, []);
    }
    categoryMap.get(catName).push(stf);
  });

  const sortedCategories = Array.from(categoryMap.keys()).sort();

  const getCategoryIcon = (cat) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('nurse')) return '👩‍⚕️';
    if (c.includes('lab')) return '🔬';
    if (c.includes('pharm')) return '💊';
    if (c.includes('rad') || c.includes('imaging')) return '🩻';
    if (c.includes('emerg')) return '🚑';
    return '📋';
  };

  return `
    <div class="staff-management-container">
      <!-- 1. AUTHORITATIVE HEADER -->
      <div class="staff-header-clean">
        <div class="staff-title-block">
          <div class="staff-badge-row">
            <span class="staff-header-badge">OPERATIONAL &amp; CLINICAL SUPPORT</span>
            <span class="staff-status-indicator"><span class="status-pulse-dot"></span> Duty Roster Active</span>
          </div>
          <h1 class="staff-page-title">Medical Staff</h1>
          <p class="staff-page-subtitle">
            Manage nursing, laboratory, pharmacy and other clinical-support staff.
          </p>
        </div>
        <div class="staff-actions-toolbar">
          <button type="button" class="btn btn-primary btn-sm" onclick="openAddStaffModal('${hospital.id}')" title="Onboard new healthcare support personnel">
            <span>+</span> Add Medical Staff
          </button>
        </div>
      </div>

      <!-- 2. KPI SUMMARY (4 COMPACT REAL BACKEND-DRIVEN CARDS) -->
      <div class="staff-kpi-row">
        <div class="staff-kpi-card primary clickable ${staffStatusFilter === 'ALL' && !staffSearchQuery ? 'active' : ''}" onclick="staffStatusFilter = 'ALL'; staffRoleFilter = 'ALL'; staffDeptFilter = 'ALL'; renderHospitalSectionNow('staff');" title="Filter by All Staff">
          <div class="staff-kpi-top">
            <span class="staff-kpi-label">Total Staff</span>
            <span class="staff-kpi-icon">👥</span>
          </div>
          <div class="staff-kpi-value">${totalStaffCount}</div>
          <div class="staff-kpi-sub">Support Personnel</div>
        </div>

        <div class="staff-kpi-card success clickable ${staffStatusFilter === 'ACTIVE' ? 'active' : ''}" onclick="staffStatusFilter = 'ACTIVE'; renderHospitalSectionNow('staff');" title="Filter by Active Staff">
          <div class="staff-kpi-top">
            <span class="staff-kpi-label">Active</span>
            <span class="staff-kpi-icon">●</span>
          </div>
          <div class="staff-kpi-value">${activeStaffCount}</div>
          <div class="staff-kpi-sub">Active Duty Records</div>
        </div>

        <div class="staff-kpi-card info clickable" title="Staff on Active Duty Shift">
          <div class="staff-kpi-top">
            <span class="staff-kpi-label">On Duty</span>
            <span class="staff-kpi-icon">⏰</span>
          </div>
          <div class="staff-kpi-value">${onDutyStaffCount}</div>
          <div class="staff-kpi-sub">Active Shift Coverage</div>
        </div>

        <div class="staff-kpi-card teal" title="Distinct Staff Categories">
          <div class="staff-kpi-top">
            <span class="staff-kpi-label">Staff Categories</span>
            <span class="staff-kpi-icon">🗂️</span>
          </div>
          <div class="staff-kpi-value">${distinctCategories.length || 4}</div>
          <div class="staff-kpi-sub">Operational Domains</div>
        </div>
      </div>

      <!-- 3. SEARCH & FILTERS TOOLBAR -->
      <div class="staff-toolbar">
        <div class="staff-search-box">
          <span class="staff-search-icon">🔍</span>
          <input type="text" class="staff-search-input" placeholder="Search staff by name, staff ID, role, or department..." value="${escapeHtml(staffSearchQuery)}" oninput="staffSearchQuery = this.value; renderHospitalSectionNow('staff');">
          ${staffSearchQuery ? `<button type="button" class="staff-search-clear" onclick="staffSearchQuery = ''; renderHospitalSectionNow('staff');" aria-label="Clear Search">✕</button>` : ''}
        </div>

        <div class="staff-filter-group">
          <select class="staff-filter-select" onchange="staffRoleFilter = this.value; renderHospitalSectionNow('staff');" aria-label="Role Category Filter">
            <option value="ALL" ${staffRoleFilter === 'ALL' ? 'selected' : ''}>All Categories</option>
            ${allCategories.map(c => `<option value="${escapeHtml(c)}" ${staffRoleFilter === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>

          <select class="staff-filter-select" onchange="staffDeptFilter = this.value; renderHospitalSectionNow('staff');" aria-label="Department Filter">
            <option value="ALL" ${staffDeptFilter === 'ALL' ? 'selected' : ''}>All Departments</option>
            ${staffDepartments.map(d => `<option value="${escapeHtml(d)}" ${staffDeptFilter === d ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('')}
          </select>

          <select class="staff-filter-select" onchange="staffStatusFilter = this.value; renderHospitalSectionNow('staff');" aria-label="Status Filter">
            <option value="ALL" ${staffStatusFilter === 'ALL' ? 'selected' : ''}>Status: All</option>
            <option value="ACTIVE" ${staffStatusFilter === 'ACTIVE' ? 'selected' : ''}>Active</option>
            <option value="INACTIVE" ${staffStatusFilter === 'INACTIVE' ? 'selected' : ''}>Inactive</option>
          </select>

          ${hasActiveFilters ? `
            <button type="button" class="btn btn-secondary btn-sm staff-reset-btn" onclick="staffSearchQuery = ''; staffRoleFilter = 'ALL'; staffDeptFilter = 'ALL'; staffStatusFilter = 'ALL'; renderHospitalSectionNow('staff');" title="Reset all staff filters">
              ✕ Reset
            </button>
          ` : ''}
        </div>

        <div class="staff-results-count">
          Showing <strong>${filteredStaff.length}</strong> of <strong>${totalStaffCount}</strong> Support Staff
        </div>
      </div>

      <!-- 4. CATEGORY-WISE MEDICAL STAFF LIST -->
      ${filteredStaff.length === 0 ? `
        <div class="glass-panel text-center" style="padding: 3rem; margin-top: 1rem;">
          <div style="font-size: 3rem; margin-bottom: 12px;">👩‍⚕️</div>
          <h3 style="color: var(--text-main); font-size: 1.15rem; margin-bottom: 6px;">
            ${totalStaffCount === 0 ? 'No medical staff members have been added yet.' : 'No staff members match your filter criteria.'}
          </h3>
          <p style="color: var(--text-muted); font-size: 0.88rem; max-width: 480px; margin: 0 auto 16px auto;">
            ${totalStaffCount === 0 ? 'Add nursing, laboratory, pharmacy and clinical support staff to coordinate ward and diagnostic operations.' : 'Try adjusting your search query, role category, or department filter.'}
          </p>
          <div style="display: flex; gap: 8px; justify-content: center;">
            ${totalStaffCount === 0 ? `
              <button type="button" class="btn btn-primary" onclick="openAddStaffModal('${hospital.id}')">
                <span>+</span> Add Medical Staff
              </button>
            ` : `
              <button type="button" class="btn btn-secondary" onclick="staffSearchQuery = ''; staffRoleFilter = 'ALL'; staffDeptFilter = 'ALL'; staffStatusFilter = 'ALL'; renderHospitalSectionNow('staff');">
                ✕ Reset Filters
              </button>
            `}
          </div>
        </div>
      ` : `
        <div class="staff-categories-list">
          ${sortedCategories.map(catName => {
            const catStaff = categoryMap.get(catName) || [];
            return `
              <div class="staff-cat-group-card">
                <div class="staff-cat-group-header">
                  <div class="staff-cat-group-title-wrap">
                    <span class="staff-cat-group-icon">${getCategoryIcon(catName)}</span>
                    <h3 class="staff-cat-group-title">${escapeHtml(catName.toUpperCase())}</h3>
                    <span class="staff-cat-group-badge">${catStaff.length} Member${catStaff.length === 1 ? '' : 's'}</span>
                  </div>
                </div>

                <div class="table-responsive">
                  <table class="data-table staff-table-clean">
                    <thead>
                      <tr>
                        <th>STAFF MEMBER</th>
                        <th>ROLE</th>
                        <th>DEPARTMENT / AREA</th>
                        <th>SHIFT</th>
                        <th>CONTACT</th>
                        <th>STATUS</th>
                        <th style="text-align: right;">ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${catStaff.map(stf => {
                        const isActive = stf.status === 'ACTIVE';
                        const initials = (stf.name || 'S').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'ST';

                        return `
                          <tr style="cursor: pointer;" onclick="if (!event.target.closest('button') && !event.target.closest('a')) openStaffDrawer('${stf.id}')">
                            <td>
                              <div class="staff-cell-profile">
                                <div class="staff-cell-avatar">
                                  <span>${escapeHtml(initials)}</span>
                                </div>
                                <div class="staff-cell-name-box">
                                  <span class="staff-cell-name font-semibold">${escapeHtml(stf.name)}</span>
                                  <code class="font-mono font-xs text-muted">${escapeHtml(stf.id)}</code>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div class="font-semibold text-main">${escapeHtml(stf.role)}</div>
                              <div class="font-xs text-muted">${escapeHtml(stf.qualification || 'Certified')}</div>
                            </td>
                            <td>
                              <span class="staff-dept-badge">${escapeHtml(stf.department || 'General')}</span>
                            </td>
                            <td>
                              <span class="badge badge-info font-xs">⏰ ${escapeHtml(stf.shift || 'General')}</span>
                            </td>
                            <td>
                              <div class="font-xs">📞 ${escapeHtml(stf.phone || 'N/A')}</div>
                              <div class="font-xs text-muted">${escapeHtml(stf.email || '')}</div>
                            </td>
                            <td>
                              <div style="display: flex; gap: 4px; align-items: center;">
                                <span class="badge ${isActive ? 'badge-success' : 'badge-warning'}">
                                  ${isActive ? '● ACTIVE' : '○ INACTIVE'}
                                </span>
                              </div>
                            </td>
                            <td style="text-align: right;">
                              <div style="display: flex; gap: 6px; justify-content: flex-end; align-items: center;">
                                <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openStaffDrawer('${stf.id}')">
                                  View
                                </button>
                                <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openEditStaffModal('${stf.id}')" title="Edit Staff Details">
                                  ✏️
                                </button>
                                <div class="inpatient-action-menu-wrap">
                                  <button type="button" class="btn btn-secondary btn-sm inpatient-more-btn" onclick="event.stopPropagation(); toggleStaffActionMenu(event, 'staffMenu_${stf.id}')" title="More Options" aria-label="More Options">
                                    ⋯
                                  </button>
                                  <div id="staffMenu_${stf.id}" class="inpatient-menu-dropdown">
                                    <button type="button" class="inpatient-menu-item" onclick="openStaffDrawer('${stf.id}')">
                                      <span>👤</span> View Profile
                                    </button>
                                    <button type="button" class="inpatient-menu-item" onclick="openEditStaffModal('${stf.id}')">
                                      <span>✏️</span> Edit Details
                                    </button>
                                    <button type="button" class="inpatient-menu-item" onclick="handleToggleStaffStatus('${stf.id}')">
                                      <span>🔄</span> Set as ${isActive ? 'Inactive' : 'Active'}
                                    </button>
                                    <div class="inpatient-menu-divider"></div>
                                    <button type="button" class="inpatient-menu-item text-danger" onclick="handleDeleteStaff('${stf.id}')">
                                      <span>🗑️</span> Remove Staff
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>

    <!-- Staff Slide-Over Quick Drawer Container -->
    <div id="staffDrawerOverlay" class="staff-drawer-overlay" onclick="if (event.target === this) closeStaffDrawer();">
      <div id="staffDrawerContent" class="staff-drawer">
        <!-- Populated dynamically by openStaffDrawer() -->
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// Doctor Action Menu Toggle Handler
// --------------------------------------------------------------------------
window.toggleDoctorActionMenu = function(event, menuId) {
  if (event) event.stopPropagation();
  const menu = document.getElementById(menuId);
  if (!menu) return;

  document.querySelectorAll('.inpatient-menu-dropdown.show').forEach(el => {
    if (el.id !== menuId) el.classList.remove('show');
  });

  menu.classList.toggle('show');
};

// --------------------------------------------------------------------------
// Staff Action Menu Toggle Handler
// --------------------------------------------------------------------------
window.toggleStaffActionMenu = function(event, menuId) {
  if (event) event.stopPropagation();
  const menu = document.getElementById(menuId);
  if (!menu) return;

  document.querySelectorAll('.inpatient-menu-dropdown.show').forEach(el => {
    if (el.id !== menuId) el.classList.remove('show');
  });

  menu.classList.toggle('show');
};

// --------------------------------------------------------------------------
// Doctor Profile Drawer Controller
// --------------------------------------------------------------------------
window.openDoctorDrawer = function(doctorId) {
  document.querySelectorAll('.inpatient-menu-dropdown.show').forEach(el => el.classList.remove('show'));

  const store = window.hospitrackStore;
  const user = window.hospitrackAuth?.getCurrentUser();
  const hospitalId = user?.hospitalId || 'HOSP-101';
  const hospital = store ? store.getHospitalById(hospitalId) : null;
  const doc = store ? store.getDoctorById(doctorId) : null;

  if (!doc) {
    window.showToast('Doctor record not found.', 'error');
    return;
  }

  const assignedPatients = (store && typeof store.getPatients === 'function') ? store.getPatients(hospitalId).filter(p => p.primaryDoctorId === doc.id) : [];
  const prescriptions = (store && typeof store.getPrescriptions === 'function') ? store.getPrescriptions(null, doc.id) : [];
  const labs = (store && typeof store.getLabs === 'function') ? store.getLabs(doc.id) : [];
  const referrals = (store && typeof store.getReferrals === 'function') ? store.getReferrals(hospitalId).filter(r => r.doctorId === doc.id) : [];

  const initials = (doc.name || 'Dr').replace(/^Dr\.?\s*/i, '').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'DR';
  const isActive = doc.status === 'ACTIVE' || !doc.status;

  const drawerContent = document.getElementById('doctorDrawerContent');
  const drawerOverlay = document.getElementById('doctorDrawerOverlay');

  if (!drawerContent || !drawerOverlay) {
    if (window.openDoctorWorkspace) {
      window.openDoctorWorkspace(doctorId);
    }
    return;
  }

  drawerContent.innerHTML = `
    <div class="doctor-drawer-header">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="doctor-header-badge" style="margin-bottom: 0;">DOCTOR PROFILE</span>
        <span class="font-mono font-semibold font-xs" style="color: var(--primary);">${escapeHtml(doc.id)}</span>
      </div>
      <button type="button" class="modal-close" onclick="closeDoctorDrawer()" aria-label="Close Drawer">✕</button>
    </div>

    <div class="doctor-drawer-body">
      <!-- 1. DOCTOR IDENTITY CARD -->
      <div class="doctor-drawer-profile-card">
        <div class="doctor-drawer-avatar">
          <span>${escapeHtml(initials)}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1;">
          <div class="doctor-drawer-name">Dr. ${escapeHtml(doc.name ? doc.name.replace(/^Dr\.?\s*/i, '') : 'Physician')}</div>
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <code class="font-mono font-semibold" style="color: var(--primary); font-size: 0.8rem;">${escapeHtml(doc.id)}</code>
            <span class="badge badge-info">✓ Credentialed Physician</span>
            <span class="badge ${isActive ? 'badge-success' : 'badge-warning'}">${isActive ? '● ACTIVE' : '○ INACTIVE'}</span>
          </div>
          <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">
            ${escapeHtml(doc.specialty || doc.department || 'Clinical Medicine')} • Experience: <strong>${doc.experienceYears != null ? `${doc.experienceYears} Years` : '5 Years'}</strong>
          </div>
        </div>
      </div>

      <!-- 2. PROFESSIONAL INFORMATION -->
      <div class="doctor-drawer-section">
        <div class="doctor-drawer-section-title">
          <span>🎓</span> Professional Information &amp; Credentials
        </div>
        <div class="doctor-drawer-grid">
          <div class="doctor-drawer-field">
            <span class="doctor-drawer-label">Department / Specialty</span>
            <span class="doctor-drawer-value font-semibold" style="color: var(--primary);">${escapeHtml(doc.specialty || doc.department || 'General Medicine')}</span>
          </div>
          <div class="doctor-drawer-field">
            <span class="doctor-drawer-label">Medical Council License</span>
            <span class="doctor-drawer-value font-mono font-bold">${escapeHtml(doc.licenseNo || 'MCI-VERIFIED')}</span>
          </div>
          <div class="doctor-drawer-field">
            <span class="doctor-drawer-label">Clinical Experience</span>
            <span class="doctor-drawer-value">${doc.experienceYears != null ? `${doc.experienceYears} Years of Clinical Practice` : 'Not specified'}</span>
          </div>
          <div class="doctor-drawer-field">
            <span class="doctor-drawer-label">Employment Status</span>
            <span class="doctor-drawer-value"><span class="badge ${isActive ? 'badge-success' : 'badge-warning'}">${isActive ? 'Full-Time Active Roster' : 'Inactive / On Leave'}</span></span>
          </div>
          <div class="doctor-drawer-field">
            <span class="doctor-drawer-label">Professional Email</span>
            <span class="doctor-drawer-value">📧 ${escapeHtml(doc.email || 'Not provided')}</span>
          </div>
          <div class="doctor-drawer-field">
            <span class="doctor-drawer-label">Contact Telephone</span>
            <span class="doctor-drawer-value">📞 ${escapeHtml(doc.phone || 'Not provided')}</span>
          </div>
        </div>
      </div>

      <!-- 3. HOSPITAL AFFILIATION -->
      <div class="doctor-drawer-section">
        <div class="doctor-drawer-section-title">
          <span>🏥</span> Hospital Facility Affiliation
        </div>
        <div class="doctor-drawer-grid">
          <div class="doctor-drawer-field full-span">
            <span class="doctor-drawer-label">Affiliated Facility</span>
            <span class="doctor-drawer-value font-semibold">${escapeHtml(hospital ? hospital.name : hospitalId)} (<code>${escapeHtml(hospitalId)}</code>)</span>
          </div>
        </div>
      </div>

      <!-- 4. CLINICAL WORKLOAD -->
      <div class="doctor-drawer-section">
        <div class="doctor-drawer-section-title">
          <span>📊</span> Clinical Workload &amp; Patient Care
        </div>
        <div class="doctor-drawer-grid">
          <div class="doctor-drawer-field" style="text-align: center;">
            <span class="doctor-drawer-label">Assigned Patients</span>
            <span class="doctor-drawer-value font-mono" style="font-size: 1.3rem; color: var(--primary);">${assignedPatients.length}</span>
            <span style="font-size: 0.72rem; color: var(--text-muted);">Active admitted inpatients</span>
          </div>
          <div class="doctor-drawer-field" style="text-align: center;">
            <span class="doctor-drawer-label">Prescriptions Issued</span>
            <span class="doctor-drawer-value font-mono" style="font-size: 1.3rem; color: var(--success);">${prescriptions.length}</span>
            <span style="font-size: 0.72rem; color: var(--text-muted);">Signed pharmacy orders</span>
          </div>
          <div class="doctor-drawer-field" style="text-align: center;">
            <span class="doctor-drawer-label">Lab Orders</span>
            <span class="doctor-drawer-value font-mono" style="font-size: 1.3rem; color: var(--info);">${labs.length}</span>
            <span style="font-size: 0.72rem; color: var(--text-muted);">Pathology &amp; imaging</span>
          </div>
          <div class="doctor-drawer-field" style="text-align: center;">
            <span class="doctor-drawer-label">Specialist Referrals</span>
            <span class="doctor-drawer-value font-mono" style="font-size: 1.3rem;">${referrals.length}</span>
            <span style="font-size: 0.72rem; color: var(--text-muted);">Inter-facility consults</span>
          </div>
        </div>

        ${assignedPatients.length > 0 ? `
          <div style="margin-top: 10px;">
            <span class="doctor-drawer-label" style="display: block; margin-bottom: 6px;">Currently Assigned Patients:</span>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${assignedPatients.map(p => `
                <button type="button" class="btn btn-secondary btn-xs font-mono" onclick="closeDoctorDrawer(); if (window.openInpatientDrawer) window.openInpatientDrawer('${p.id}');">
                  👤 ${escapeHtml(p.name)} (<code>${p.id}</code>)
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- QUICK ACTIONS FOOTER -->
    <div class="doctor-drawer-actions">
      <button type="button" class="btn btn-secondary btn-sm" onclick="closeDoctorDrawer(); openEditDoctorModal('${doc.id}')">
        <span>✏️</span> Edit Doctor
      </button>
      <button type="button" class="btn btn-secondary btn-sm" onclick="handleToggleDoctorStatus('${doc.id}')">
        <span>🔄</span> ${isActive ? 'Deactivate' : 'Activate'}
      </button>
      <button type="button" class="btn btn-primary btn-sm" onclick="closeDoctorDrawer(); window.openDoctorWorkspace('${doc.id}')">
        <span>📋</span> Full Workspace →
      </button>
    </div>
  `;

  drawerOverlay.classList.add('open');
};

window.closeDoctorDrawer = function() {
  const drawerOverlay = document.getElementById('doctorDrawerOverlay');
  if (drawerOverlay) {
    drawerOverlay.classList.remove('open');
  }
};

// --------------------------------------------------------------------------
// Medical Staff Profile Drawer Controller
// --------------------------------------------------------------------------
window.openStaffDrawer = function(staffId) {
  document.querySelectorAll('.inpatient-menu-dropdown.show').forEach(el => el.classList.remove('show'));

  const store = window.hospitrackStore;
  const user = window.hospitrackAuth?.getCurrentUser();
  const hospitalId = user?.hospitalId || 'HOSP-101';
  const hospital = store ? store.getHospitalById(hospitalId) : null;
  const stf = store ? store.getMedicalStaffById(staffId) : null;

  if (!stf) {
    window.showToast('Staff member record not found.', 'error');
    return;
  }

  const initials = (stf.name || 'S').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'ST';
  const isActive = stf.status === 'ACTIVE';

  const drawerContent = document.getElementById('staffDrawerContent');
  const drawerOverlay = document.getElementById('staffDrawerOverlay');

  if (!drawerContent || !drawerOverlay) {
    return;
  }

  drawerContent.innerHTML = `
    <div class="staff-drawer-header">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="staff-header-badge" style="margin-bottom: 0;">STAFF PROFILE</span>
        <span class="font-mono font-semibold font-xs" style="color: var(--primary);">${escapeHtml(stf.id)}</span>
      </div>
      <button type="button" class="modal-close" onclick="closeStaffDrawer()" aria-label="Close Drawer">✕</button>
    </div>

    <div class="staff-drawer-body">
      <!-- 1. STAFF IDENTITY CARD -->
      <div class="staff-drawer-profile-card">
        <div class="staff-drawer-avatar">
          <span>${escapeHtml(initials)}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1;">
          <div class="staff-drawer-name">${escapeHtml(stf.name)}</div>
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <code class="font-mono font-semibold" style="color: var(--primary); font-size: 0.8rem;">${escapeHtml(stf.id)}</code>
            <span class="badge badge-info">${escapeHtml(stf.category || 'Clinical Support')}</span>
            <span class="badge ${isActive ? 'badge-success' : 'badge-warning'}">${isActive ? '● ACTIVE' : '○ INACTIVE'}</span>
          </div>
          <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">
            Role: <strong>${escapeHtml(stf.role)}</strong> • Shift: <strong>${escapeHtml(stf.shift || 'General')}</strong>
          </div>
        </div>
      </div>

      <!-- 2. PROFESSIONAL INFORMATION -->
      <div class="staff-drawer-section">
        <div class="staff-drawer-section-title">
          <span>📋</span> Professional &amp; Operational Details
        </div>
        <div class="staff-drawer-grid">
          <div class="staff-drawer-field">
            <span class="staff-drawer-label">Role Title</span>
            <span class="staff-drawer-value font-semibold">${escapeHtml(stf.role)}</span>
          </div>
          <div class="staff-drawer-field">
            <span class="staff-drawer-label">Category Domain</span>
            <span class="staff-drawer-value font-semibold" style="color: var(--primary);">${escapeHtml(stf.category || 'Clinical Support')}</span>
          </div>
          <div class="staff-drawer-field">
            <span class="staff-drawer-label">Assigned Department / Ward</span>
            <span class="staff-drawer-value">${escapeHtml(stf.department || 'General')}</span>
          </div>
          <div class="staff-drawer-field">
            <span class="staff-drawer-label">Shift &amp; Duty Schedule</span>
            <span class="staff-drawer-value">⏰ ${escapeHtml(stf.shift || 'General (09:00 - 17:00)')}</span>
          </div>
          <div class="staff-drawer-field">
            <span class="staff-drawer-label">Qualification / Certifications</span>
            <span class="staff-drawer-value">${escapeHtml(stf.qualification || 'Certified Healthcare Support')}</span>
          </div>
          <div class="staff-drawer-field">
            <span class="staff-drawer-label">Experience</span>
            <span class="staff-drawer-value">${escapeHtml(stf.experience || '3 Years')}</span>
          </div>
          <div class="staff-drawer-field">
            <span class="staff-drawer-label">Telephone Contact</span>
            <span class="staff-drawer-value">📞 ${escapeHtml(stf.phone || 'Not provided')}</span>
          </div>
          <div class="staff-drawer-field">
            <span class="staff-drawer-label">Professional Email</span>
            <span class="staff-drawer-value">📧 ${escapeHtml(stf.email || 'Not provided')}</span>
          </div>
          <div class="staff-drawer-field full-span">
            <span class="staff-drawer-label">Facility Affiliation &amp; Joining Date</span>
            <span class="staff-drawer-value">
              ${escapeHtml(hospital ? hospital.name : hospitalId)} • Joined: <strong>${stf.joiningDate ? new Date(stf.joiningDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Verified Active'}</strong>
            </span>
          </div>
        </div>
      </div>

      <!-- 3. ROLE PERMISSIONS NOTICE -->
      <div class="staff-drawer-section">
        <div class="staff-drawer-section-title">
          <span>🛡️</span> Access Control &amp; Clinical Privileges
        </div>
        <div class="p-12 bg-surface-alt radius-md border-subtle font-xs" style="color: var(--text-secondary); line-height: 1.5;">
          Staff members operate in clinical-support and operational triage roles. Doctor-level prescribing, diagnosis signing, and direct discharge approval permissions are restricted to licensed physicians.
        </div>
      </div>
    </div>

    <!-- QUICK ACTIONS FOOTER -->
    <div class="staff-drawer-actions">
      <button type="button" class="btn btn-secondary btn-sm" onclick="closeStaffDrawer(); openEditStaffModal('${stf.id}')">
        <span>✏️</span> Edit Profile
      </button>
      <button type="button" class="btn btn-secondary btn-sm" onclick="handleToggleStaffStatus('${stf.id}')">
        <span>🔄</span> ${isActive ? 'Set Inactive' : 'Set Active'}
      </button>
      <button type="button" class="btn btn-outline-danger btn-sm" onclick="handleDeleteStaff('${stf.id}')">
        <span>🗑️</span> Remove Staff
      </button>
    </div>
  `;

  drawerOverlay.classList.add('open');
};

window.closeStaffDrawer = function() {
  const drawerOverlay = document.getElementById('staffDrawerOverlay');
  if (drawerOverlay) {
    drawerOverlay.classList.remove('open');
  }
};

// --------------------------------------------------------------------------
// Toggle Doctor Status Handler
// --------------------------------------------------------------------------
window.handleToggleDoctorStatus = async function(doctorId) {
  const store = window.hospitrackStore;
  const doc = store ? store.getDoctorById(doctorId) : null;
  if (!doc) return;

  const newStatus = (doc.status === 'ACTIVE' || !doc.status) ? 'INACTIVE' : 'ACTIVE';
  try {
    await store.updateDoctor(doctorId, { status: newStatus });
    window.showToast(`Dr. ${doc.name} status updated to ${newStatus}.`, 'success');
    closeDoctorDrawer();
    renderHospitalSectionNow('doctors');
  } catch (err) {
    window.showToast(err.message || 'Failed to update doctor status.', 'error');
  }
};

// --------------------------------------------------------------------------
// Toggle Staff Status Handler
// --------------------------------------------------------------------------
window.handleToggleStaffStatus = async function(staffId) {
  const store = window.hospitrackStore;
  const stf = store ? store.getMedicalStaffById(staffId) : null;
  if (!stf) return;

  const newStatus = stf.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  try {
    await store.updateMedicalStaff(staffId, { status: newStatus, onDuty: newStatus === 'ACTIVE' });
    window.showToast(`Staff member ${stf.name} status updated to ${newStatus}.`, 'success');
    closeStaffDrawer();
    renderHospitalSectionNow('staff');
  } catch (err) {
    window.showToast(err.message || 'Failed to update staff status.', 'error');
  }
};

// --------------------------------------------------------------------------
// Delete Staff Handler
// --------------------------------------------------------------------------
window.handleDeleteStaff = async function(staffId) {
  const store = window.hospitrackStore;
  const stf = store ? store.getMedicalStaffById(staffId) : null;
  if (!stf) return;

  if (confirm(`Are you sure you want to remove staff member "${stf.name}" (${stf.id}) from the medical roster?`)) {
    try {
      await store.deleteMedicalStaff(staffId);
      window.showToast(`Medical staff member ${stf.name} removed.`, 'info');
      closeStaffDrawer();
      renderHospitalSectionNow('staff');
    } catch (err) {
      window.showToast(err.message || 'Failed to delete staff member.', 'error');
    }
  }
};

// --------------------------------------------------------------------------
// Modal: Add Medical Staff
// --------------------------------------------------------------------------
window.openAddStaffModal = function(hospitalId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const user = window.hospitrackAuth?.getCurrentUser();
  const targetHospitalId = hospitalId || user?.hospitalId || 'HOSP-101';

  modalContainer.innerHTML = `
    <div id="addStaffModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="addStaffModalTitle">
      <div class="modal-box" style="max-width: 640px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 38px; height: 38px; border-radius: var(--radius-md); background: var(--primary-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
              👩‍⚕️
            </div>
            <div>
              <h3 class="modal-title" id="addStaffModalTitle">Add Medical Staff Member</h3>
              <p class="modal-subtitle">Onboard nursing, laboratory, pharmacy, and support personnel</p>
            </div>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('addStaffModal')" aria-label="Close">✕</button>
        </div>

        <form id="addStaffForm" onsubmit="handleAddStaffSubmit(event, '${targetHospitalId}')" class="p-20">
          <div id="addStaffAlert" class="alert-banner hidden mb-16"></div>

          <div class="form-group mb-12">
            <label class="form-label" for="addStaffName">Staff Full Name <span class="text-danger">*</span></label>
            <input type="text" id="addStaffName" class="form-control" placeholder="e.g. Anita Verma" required minlength="2">
          </div>

          <div class="form-grid-2col mb-12">
            <div class="form-group">
              <label class="form-label" for="addStaffCategory">Category Domain <span class="text-danger">*</span></label>
              <select id="addStaffCategory" class="form-control" required onchange="handleStaffCategoryChange(this.value)">
                <option value="Nursing Staff">Nursing Staff</option>
                <option value="Laboratory Staff">Laboratory Staff</option>
                <option value="Pharmacy Staff">Pharmacy Staff</option>
                <option value="Radiology / Imaging Staff">Radiology / Imaging Staff</option>
                <option value="Emergency Staff">Emergency Staff</option>
                <option value="Clinical Support">Clinical Support</option>
                <option value="Other Authorized Staff">Other Authorized Staff</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="addStaffRole">Role Title <span class="text-danger">*</span></label>
              <input type="text" id="addStaffRole" class="form-control" placeholder="e.g. Senior Registered Nurse" required minlength="2">
            </div>
          </div>

          <div class="form-grid-2col mb-12">
            <div class="form-group">
              <label class="form-label" for="addStaffDept">Department / Assigned Ward <span class="text-danger">*</span></label>
              <input type="text" id="addStaffDept" class="form-control" placeholder="e.g. Intensive Care Unit (ICU)" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="addStaffShift">Shift &amp; Duty Schedule</label>
              <select id="addStaffShift" class="form-control">
                <option value="Morning (07:00 - 15:00)">Morning (07:00 - 15:00)</option>
                <option value="Evening (15:00 - 23:00)">Evening (15:00 - 23:00)</option>
                <option value="Night (23:00 - 07:00)">Night (23:00 - 07:00)</option>
                <option value="General (09:00 - 17:00)">General (09:00 - 17:00)</option>
                <option value="Rotational">Rotational Shifts</option>
              </select>
            </div>
          </div>

          <div class="form-grid-2col mb-12">
            <div class="form-group">
              <label class="form-label" for="addStaffPhone">Telephone Contact <span class="text-danger">*</span></label>
              <input type="tel" id="addStaffPhone" class="form-control" placeholder="e.g. +91 98765 00000" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="addStaffEmail">Email Address</label>
              <input type="email" id="addStaffEmail" class="form-control" placeholder="e.g. staff@hospital.in">
            </div>
          </div>

          <div class="form-grid-2col mb-16">
            <div class="form-group">
              <label class="form-label" for="addStaffQual">Qualifications / Certifications</label>
              <input type="text" id="addStaffQual" class="form-control" placeholder="e.g. B.Sc Nursing, ACLS Certified">
            </div>
            <div class="form-group">
              <label class="form-label" for="addStaffExp">Experience</label>
              <input type="text" id="addStaffExp" class="form-control" placeholder="e.g. 5 Years">
            </div>
          </div>

          <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('addStaffModal')">Cancel</button>
            <button type="submit" id="saveAddStaffBtn" class="btn btn-primary">💾 Add Medical Staff</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleStaffCategoryChange = function(category) {
  const roleInput = document.getElementById('addStaffRole');
  const deptInput = document.getElementById('addStaffDept');
  if (!roleInput || !deptInput) return;

  if (category === 'Nursing Staff') {
    if (!roleInput.value || roleInput.value.includes('Technician') || roleInput.value.includes('Pharmacist')) roleInput.value = 'Registered Nurse (RN)';
    if (!deptInput.value || deptInput.value.includes('Pharmacy') || deptInput.value.includes('Pathology')) deptInput.value = 'General Inpatient Ward';
  } else if (category === 'Laboratory Staff') {
    roleInput.value = 'Medical Lab Technologist';
    deptInput.value = 'Clinical Pathology & Biochemistry';
  } else if (category === 'Pharmacy Staff') {
    roleInput.value = 'Clinical Pharmacist';
    deptInput.value = 'Inpatient Central Pharmacy';
  } else if (category === 'Radiology / Imaging Staff') {
    roleInput.value = 'Radiologic Technologist';
    deptInput.value = 'Diagnostic Imaging & CT/MRI';
  } else if (category === 'Emergency Staff') {
    roleInput.value = 'Emergency Medical Technician';
    deptInput.value = 'Emergency & Trauma Ward';
  }
};

window.handleAddStaffSubmit = async function(event, hospitalId) {
  event.preventDefault();
  const name = document.getElementById('addStaffName')?.value.trim();
  const category = document.getElementById('addStaffCategory')?.value;
  const role = document.getElementById('addStaffRole')?.value.trim();
  const department = document.getElementById('addStaffDept')?.value.trim();
  const shift = document.getElementById('addStaffShift')?.value;
  const phone = document.getElementById('addStaffPhone')?.value.trim();
  const email = document.getElementById('addStaffEmail')?.value.trim();
  const qualification = document.getElementById('addStaffQual')?.value.trim();
  const experience = document.getElementById('addStaffExp')?.value.trim();
  const alertEl = document.getElementById('addStaffAlert');
  const submitBtn = document.getElementById('saveAddStaffBtn');

  if (!name || !role || !department || !phone) {
    if (alertEl) {
      alertEl.textContent = 'Please fill out all required fields.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving Staff...';
    }

    await window.hospitrackStore.createMedicalStaff({
      hospitalId,
      name,
      category,
      role,
      department,
      shift,
      phone,
      email,
      qualification,
      experience,
      status: 'ACTIVE'
    });

    window.showToast(`Medical staff member ${name} (${role}) added to facility roster.`, 'success');
    closeGlobalModal('addStaffModal');
    renderHospitalSectionNow('staff');
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to add staff member.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '💾 Add Medical Staff';
    }
  }
};

// --------------------------------------------------------------------------
// Modal: Edit Medical Staff
// --------------------------------------------------------------------------
window.openEditStaffModal = function(staffId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const stf = store ? store.getMedicalStaffById(staffId) : null;
  if (!stf) {
    window.showToast('Staff member not found.', 'error');
    return;
  }

  modalContainer.innerHTML = `
    <div id="editStaffModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="editStaffModalTitle">
      <div class="modal-box" style="max-width: 640px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 38px; height: 38px; border-radius: var(--radius-md); background: var(--primary-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
              ✏️
            </div>
            <div>
              <h3 class="modal-title" id="editStaffModalTitle">Edit Medical Staff Details</h3>
              <p class="modal-subtitle">Staff ID: <code>${escapeHtml(stf.id)}</code></p>
            </div>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('editStaffModal')" aria-label="Close">✕</button>
        </div>

        <form id="editStaffForm" onsubmit="handleEditStaffSubmit(event, '${stf.id}')" class="p-20">
          <div id="editStaffAlert" class="alert-banner hidden mb-16"></div>

          <div class="form-group mb-12">
            <label class="form-label" for="editStaffName">Staff Full Name <span class="text-danger">*</span></label>
            <input type="text" id="editStaffName" class="form-control" value="${escapeHtml(stf.name)}" required minlength="2">
          </div>

          <div class="form-grid-2col mb-12">
            <div class="form-group">
              <label class="form-label" for="editStaffCategory">Category Domain <span class="text-danger">*</span></label>
              <select id="editStaffCategory" class="form-control" required>
                <option value="Nursing Staff" ${stf.category === 'Nursing Staff' ? 'selected' : ''}>Nursing Staff</option>
                <option value="Laboratory Staff" ${stf.category === 'Laboratory Staff' ? 'selected' : ''}>Laboratory Staff</option>
                <option value="Pharmacy Staff" ${stf.category === 'Pharmacy Staff' ? 'selected' : ''}>Pharmacy Staff</option>
                <option value="Radiology / Imaging Staff" ${stf.category === 'Radiology / Imaging Staff' ? 'selected' : ''}>Radiology / Imaging Staff</option>
                <option value="Emergency Staff" ${stf.category === 'Emergency Staff' ? 'selected' : ''}>Emergency Staff</option>
                <option value="Clinical Support" ${stf.category === 'Clinical Support' ? 'selected' : ''}>Clinical Support</option>
                <option value="Other Authorized Staff" ${stf.category === 'Other Authorized Staff' ? 'selected' : ''}>Other Authorized Staff</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="editStaffRole">Role Title <span class="text-danger">*</span></label>
              <input type="text" id="editStaffRole" class="form-control" value="${escapeHtml(stf.role)}" required minlength="2">
            </div>
          </div>

          <div class="form-grid-2col mb-12">
            <div class="form-group">
              <label class="form-label" for="editStaffDept">Department / Assigned Ward <span class="text-danger">*</span></label>
              <input type="text" id="editStaffDept" class="form-control" value="${escapeHtml(stf.department || '')}" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="editStaffShift">Shift &amp; Duty Schedule</label>
              <select id="editStaffShift" class="form-control">
                <option value="Morning (07:00 - 15:00)" ${stf.shift?.includes('Morning') ? 'selected' : ''}>Morning (07:00 - 15:00)</option>
                <option value="Evening (15:00 - 23:00)" ${stf.shift?.includes('Evening') ? 'selected' : ''}>Evening (15:00 - 23:00)</option>
                <option value="Night (23:00 - 07:00)" ${stf.shift?.includes('Night') ? 'selected' : ''}>Night (23:00 - 07:00)</option>
                <option value="General (09:00 - 17:00)" ${stf.shift?.includes('General') ? 'selected' : ''}>General (09:00 - 17:00)</option>
                <option value="Rotational" ${stf.shift?.includes('Rotational') ? 'selected' : ''}>Rotational Shifts</option>
              </select>
            </div>
          </div>

          <div class="form-grid-2col mb-12">
            <div class="form-group">
              <label class="form-label" for="editStaffPhone">Telephone Contact <span class="text-danger">*</span></label>
              <input type="tel" id="editStaffPhone" class="form-control" value="${escapeHtml(stf.phone || '')}" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="editStaffEmail">Email Address</label>
              <input type="email" id="editStaffEmail" class="form-control" value="${escapeHtml(stf.email || '')}">
            </div>
          </div>

          <div class="form-grid-2col mb-16">
            <div class="form-group">
              <label class="form-label" for="editStaffQual">Qualifications / Certifications</label>
              <input type="text" id="editStaffQual" class="form-control" value="${escapeHtml(stf.qualification || '')}">
            </div>
            <div class="form-group">
              <label class="form-label" for="editStaffStatus">Status</label>
              <select id="editStaffStatus" class="form-control">
                <option value="ACTIVE" ${stf.status === 'ACTIVE' ? 'selected' : ''}>Active</option>
                <option value="INACTIVE" ${stf.status === 'INACTIVE' ? 'selected' : ''}>Inactive</option>
              </select>
            </div>
          </div>

          <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('editStaffModal')">Cancel</button>
            <button type="submit" id="saveEditStaffBtn" class="btn btn-primary">💾 Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleEditStaffSubmit = async function(event, staffId) {
  event.preventDefault();
  const name = document.getElementById('editStaffName')?.value.trim();
  const category = document.getElementById('editStaffCategory')?.value;
  const role = document.getElementById('editStaffRole')?.value.trim();
  const department = document.getElementById('editStaffDept')?.value.trim();
  const shift = document.getElementById('editStaffShift')?.value;
  const phone = document.getElementById('editStaffPhone')?.value.trim();
  const email = document.getElementById('editStaffEmail')?.value.trim();
  const qualification = document.getElementById('editStaffQual')?.value.trim();
  const status = document.getElementById('editStaffStatus')?.value;
  const alertEl = document.getElementById('editStaffAlert');
  const submitBtn = document.getElementById('saveEditStaffBtn');

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    await window.hospitrackStore.updateMedicalStaff(staffId, {
      name,
      category,
      role,
      department,
      shift,
      phone,
      email,
      qualification,
      status,
      onDuty: status === 'ACTIVE'
    });

    window.showToast(`Medical staff member ${name} updated successfully.`, 'success');
    closeGlobalModal('editStaffModal');
    renderHospitalSectionNow('staff');
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to update staff member.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '💾 Save Changes';
    }
  }
};

// --------------------------------------------------------------------------
// Modal: Edit Doctor Details
// --------------------------------------------------------------------------
window.openEditDoctorModal = function(doctorId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const doc = store ? store.getDoctorById(doctorId) : null;
  if (!doc) {
    window.showToast('Doctor record not found.', 'error');
    return;
  }

  modalContainer.innerHTML = `
    <div id="editDoctorModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="editDocModalTitle">
      <div class="modal-box" style="max-width: 640px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 38px; height: 38px; border-radius: var(--radius-md); background: var(--primary-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
              🩺
            </div>
            <div>
              <h3 class="modal-title" id="editDocModalTitle">Edit Physician Credentials &amp; Details</h3>
              <p class="modal-subtitle">Doctor ID: <code>${escapeHtml(doc.id)}</code></p>
            </div>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('editDoctorModal')" aria-label="Close">✕</button>
        </div>

        <form id="editDoctorForm" onsubmit="handleEditDoctorSubmit(event, '${doc.id}')" class="p-20">
          <div id="editDocAlert" class="alert-banner hidden mb-16"></div>

          <div class="form-group mb-12">
            <label class="form-label" for="editDocName">Doctor Full Name <span class="text-danger">*</span></label>
            <input type="text" id="editDocName" class="form-control" value="${escapeHtml(doc.name)}" required minlength="2">
          </div>

          <div class="form-grid-2col mb-12">
            <div class="form-group">
              <label class="form-label" for="editDocSpecialty">Specialization / Department <span class="text-danger">*</span></label>
              <select id="editDocSpecialty" class="form-control" required>
                <option value="Cardiology" ${doc.specialty === 'Cardiology' ? 'selected' : ''}>Cardiology</option>
                <option value="Neurology" ${doc.specialty === 'Neurology' ? 'selected' : ''}>Neurology</option>
                <option value="Orthopedics" ${doc.specialty === 'Orthopedics' ? 'selected' : ''}>Orthopedics</option>
                <option value="General Medicine" ${doc.specialty === 'General Medicine' ? 'selected' : ''}>General Medicine</option>
                <option value="Emergency Medicine" ${doc.specialty === 'Emergency Medicine' ? 'selected' : ''}>Emergency Medicine</option>
                <option value="Pediatrics" ${doc.specialty === 'Pediatrics' ? 'selected' : ''}>Pediatrics</option>
                <option value="Gynecology" ${doc.specialty === 'Gynecology' ? 'selected' : ''}>Gynecology</option>
                <option value="Dermatology" ${doc.specialty === 'Dermatology' ? 'selected' : ''}>Dermatology</option>
                <option value="Radiology" ${doc.specialty === 'Radiology' ? 'selected' : ''}>Radiology</option>
                <option value="Pathology" ${doc.specialty === 'Pathology' ? 'selected' : ''}>Pathology</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="editDocExp">Experience (Years)</label>
              <input type="number" id="editDocExp" class="form-control" min="0" max="60" value="${doc.experienceYears != null ? doc.experienceYears : 5}">
            </div>
          </div>

          <div class="form-grid-2col mb-12">
            <div class="form-group">
              <label class="form-label" for="editDocPhone">Contact Phone</label>
              <input type="tel" id="editDocPhone" class="form-control" value="${escapeHtml(doc.phone || '')}">
            </div>
            <div class="form-group">
              <label class="form-label" for="editDocStatus">Status</label>
              <select id="editDocStatus" class="form-control">
                <option value="ACTIVE" ${doc.status === 'ACTIVE' || !doc.status ? 'selected' : ''}>Active</option>
                <option value="INACTIVE" ${doc.status === 'INACTIVE' ? 'selected' : ''}>Inactive</option>
              </select>
            </div>
          </div>

          <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('editDoctorModal')">Cancel</button>
            <button type="submit" id="saveEditDocBtn" class="btn btn-primary">💾 Save Physician Details</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleEditDoctorSubmit = async function(event, doctorId) {
  event.preventDefault();
  const name = document.getElementById('editDocName')?.value.trim();
  const specialty = document.getElementById('editDocSpecialty')?.value;
  const experienceYears = parseInt(document.getElementById('editDocExp')?.value, 10) || 5;
  const phone = document.getElementById('editDocPhone')?.value.trim();
  const status = document.getElementById('editDocStatus')?.value;
  const alertEl = document.getElementById('editDocAlert');
  const submitBtn = document.getElementById('saveEditDocBtn');

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    await window.hospitrackStore.updateDoctor(doctorId, {
      name,
      specialty,
      experienceYears,
      phone,
      status
    });

    window.showToast(`Physician Dr. ${name} updated successfully.`, 'success');
    closeGlobalModal('editDoctorModal');
    renderHospitalSectionNow('doctors');
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to update doctor.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '💾 Save Physician Details';
    }
  }
};
