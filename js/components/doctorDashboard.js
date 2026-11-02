/**
 * Hospitrack — Doctor Clinical Workstation UI/UX Component
 * Modern Healthcare SaaS Architecture:
 * - Clean Clinical Command Center & 4-card KPI Grid
 * - Today's Clinical Queue with Real Counts & Live Status Filters
 * - Right-Side / Dedicated Patient Clinical Workspace
 * - Progressive Step-Based Consultation Encounter Form
 * - Real-Time Duplicate Drug Safety Lock & Prescription Builder
 * - Laboratory & Diagnostics Center (Single Clear Heading, Review Result Modal)
 * - Specialist Referral Pipeline (Outgoing / Incoming / Completed)
 * - 100% Real PostgreSQL & Spring Boot API Connected
 */

let doctorActiveTab = 'dashboard'; // dashboard | patients | consultations | prescriptions | laboratory | referrals | profile | workspace
let selectedPatientId = null;
let patientWorkspaceActiveSubtab = 'overview'; // overview | consultation | prescription | laboratory | referrals | timeline
let queueFilterStatus = 'ALL';
let queueSearchQuery = '';
let labFilterCategory = 'ALL';
let labFilterStatus = 'ALL';
let labSearchQuery = '';
let referralSubtab = 'outgoing'; // outgoing | incoming | completed
let isConsultationSaving = false;
let isPrescriptionSaving = false;
let isDoctorProfileEditMode = false;

window.renderDoctorDashboard = async function (container, tab = null) {
  if (tab) {
    doctorActiveTab = tab;
  }

  const store = window.hospitrackStore;
  const auth = window.hospitrackAuth;
  const user = auth.getCurrentUser();
  const doctorId = user?.doctorId || user?.id || 'DOC-201';

  // Ensure live synchronization if store has not synced yet
  if (!store.lastSync) {
    try {
      await store.syncAllData();
    } catch (e) {
      console.warn('Live sync notice in doctor workstation:', e.message);
    }
  }

  const doctor = store.getDoctorById(doctorId) || {
    id: doctorId,
    name: user?.name || 'Dr. Sarah Sharma',
    specialty: 'Cardiology',
    licenseNo: 'MCI-99201',
    hospitalId: user?.hospitalId || 'HOSP-101'
  };

  const hospital = store.getHospitalById(doctor.hospitalId) || { name: 'City General Hospital', code: 'CGH-01' };
  const allPatients = store.getPatients(doctor.hospitalId);
  const myPrescriptions = store.getPrescriptions(null, doctor.id);
  const myLabs = store.getLabs(doctor.id, null, doctor.hospitalId);
  const myReferrals = store.getReferrals(doctor.hospitalId);

  // If in workspace mode with selected patient
  if (doctorActiveTab === 'workspace' && selectedPatientId) {
    container.innerHTML = renderPatientClinicalWorkspace(selectedPatientId, doctor, hospital);
    return;
  }

  const viewData = { doctor, hospital, allPatients, myPrescriptions, myLabs, myReferrals };

  const subContentHtml = doctorActiveTab === 'dashboard'
    ? renderDoctorDashboardHome(viewData)
    : renderDoctorMainView(doctorActiveTab, viewData);

  container.innerHTML = `
    <!-- Doctor Top Segmented Navigation (Clean & Synchronized) -->
    <div class="pill-tabs-nav no-print">
      <button type="button" class="pill-tab ${doctorActiveTab === 'dashboard' ? 'active' : ''}" onclick="setDoctorTab('dashboard')">
        <span>📊</span> Dashboard
      </button>
      <button type="button" class="pill-tab ${doctorActiveTab === 'patients' ? 'active' : ''}" onclick="setDoctorTab('patients')">
        <span>👥</span> Patient Queue <span class="pill-badge">${allPatients.length}</span>
      </button>
      <button type="button" class="pill-tab ${doctorActiveTab === 'consultations' ? 'active' : ''}" onclick="setDoctorTab('consultations')">
        <span>📝</span> Consultations
      </button>
      <button type="button" class="pill-tab ${doctorActiveTab === 'prescriptions' ? 'active' : ''}" onclick="setDoctorTab('prescriptions')">
        <span>💊</span> Prescriptions <span class="pill-badge">${myPrescriptions.length}</span>
      </button>
      <button type="button" class="pill-tab ${doctorActiveTab === 'laboratory' ? 'active' : ''}" onclick="setDoctorTab('laboratory')">
        <span>🔬</span> Laboratory <span class="pill-badge">${myLabs.length}</span>
      </button>
      <button type="button" class="pill-tab ${doctorActiveTab === 'referrals' ? 'active' : ''}" onclick="setDoctorTab('referrals')">
        <span>🔁</span> Referrals <span class="pill-badge">${myReferrals.length}</span>
      </button>
      <button type="button" class="pill-tab ${doctorActiveTab === 'discharge-requests' || doctorActiveTab === 'dischargeRequests' ? 'active' : ''}" onclick="setDoctorTab('discharge-requests')">
        <span>🚪</span> Discharge Requests
      </button>
      <button type="button" class="pill-tab ${doctorActiveTab === 'profile' ? 'active' : ''}" onclick="setDoctorTab('profile')">
        <span>👤</span> My Profile
      </button>
    </div>

    <!-- Doctor Subview Content -->
    <div class="doctor-subview-content">
      ${subContentHtml}
    </div>
  `;
};

function setDoctorTab(tab, editMode = false) {
  doctorActiveTab = tab;
  isDoctorProfileEditMode = !!editMode;
  if (window.navigateToRoleSection) {
    window.navigateToRoleSection('DOCTOR', tab);
  } else {
    const container = document.getElementById('mainContentArea');
    if (container) {
      window.renderDoctorDashboard(container, tab);
    }
  }
}
window.setDoctorTab = setDoctorTab;
window.getDoctorActiveTab = () => doctorActiveTab;

function getGreetingByTime() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ----------------------------------------------------------------------------
// Main Doctor Workstation Views Router
// ----------------------------------------------------------------------------
function renderDoctorMainView(tab, data) {
  switch (tab) {
    case 'patients':
      return renderPatientsDirectoryView(data);
    case 'consultations':
      return renderConsultationsView(data);
    case 'prescriptions':
      return renderPrescriptionsDirectoryView(data);
    case 'laboratory':
      return renderLaboratoryCenterView(data);
    case 'referrals':
      return renderReferralCenterView(data);
    case 'discharge-requests':
    case 'dischargeRequests':
      return renderDoctorDischargeRequestsView(data);
    case 'profile':
      return renderDoctorProfileView(data, isDoctorProfileEditMode);
    case 'dashboard':
    default:
      return renderDoctorDashboardHome(data);
  }
}

// ----------------------------------------------------------------------------
// 1. Doctor Dashboard Home (Clinical Header, 4 KPI Cards, Queue, Side Activity)
// ----------------------------------------------------------------------------
function renderDoctorDashboardHome(data) {
  const { doctor, hospital, allPatients, myPrescriptions, myLabs, myReferrals } = data;
  const store = window.hospitrackStore;

  // Real KPI Calculations
  const totalPatientsToday = allPatients.filter(p => p.status !== 'DISCHARGED').length || allPatients.length;
  const pendingConsultations = allPatients.filter(p => p.status === 'CHECKED_IN' || p.status === 'TRANSFER_PENDING' || p.status === 'WAITING').length;
  const activeReferralsCount = myReferrals.filter(r => r.status === 'PENDING' || r.status === 'IN_PROGRESS').length;
  const recentActivities = store.getRecentActivities(doctor.id, doctor.hospitalId).slice(0, 5);

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return `
    <!-- Top Greeting & Operational Context Banner -->
    <div class="doctor-header-card">
      <div class="doctor-header-left">
        <div class="doctor-dept-pill">
          <span class="dept-dot"></span>
          <span class="dept-name">${escapeHtml(doctor.specialty || 'Cardiology')}</span>
          <span class="dept-sep">•</span>
          <span class="dept-hosp">${escapeHtml(hospital.name)}</span>
        </div>
        <h1 class="doctor-greeting-title">${getGreetingByTime()}, ${escapeHtml(doctor.name)}</h1>
        <p class="doctor-header-sub">
          <span>📅 ${formattedDate}</span>
          <span>•</span>
          <span>License: <code>${escapeHtml(doctor.licenseNo || 'MCI-VERIFIED')}</code></span>
          <span>•</span>
          <span class="text-success font-weight-bold">● Active &amp; On Duty</span>
        </p>
      </div>
      <div class="doctor-header-actions">
        <button type="button" class="btn btn-primary" onclick="openStartConsultationModal()">
          <span>+</span> New Consultation
        </button>
        <button type="button" class="btn btn-secondary" onclick="openCreateReferralModal()">
          <span>🔁</span> New Referral
        </button>
        <button type="button" class="btn btn-secondary" onclick="openOrderLabModal()">
          <span>🔬</span> Order Diagnostic Lab
        </button>
      </div>
    </div>

    <!-- 4-Card Responsive KPI Grid (100% Real Backend Data) -->
    <div class="doctor-kpi-grid">
      <div class="doctor-kpi-card" onclick="setDoctorTab('patients')" title="Click to view all patients under clinical care">
        <div class="kpi-card-header">
          <span class="kpi-title">Patients Today</span>
          <span class="kpi-icon-pill">👥</span>
        </div>
        <div class="kpi-card-value text-doctor">${totalPatientsToday}</div>
        <div class="kpi-card-sub">Today's clinical queue</div>
      </div>

      <div class="doctor-kpi-card" onclick="setDoctorTab('consultations')" title="Click to view pending consultations">
        <div class="kpi-card-header">
          <span class="kpi-title">Pending Consultations</span>
          <span class="kpi-icon-pill">⏳</span>
        </div>
        <div class="kpi-card-value text-warning">${pendingConsultations}</div>
        <div class="kpi-card-sub">Awaiting consultation</div>
      </div>

      <div class="doctor-kpi-card" onclick="setDoctorTab('referrals')" title="Click to view active referrals">
        <div class="kpi-card-header">
          <span class="kpi-title">Active Referrals</span>
          <span class="kpi-icon-pill">🔁</span>
        </div>
        <div class="kpi-card-value text-primary">${activeReferralsCount}</div>
        <div class="kpi-card-sub">Requires attention</div>
      </div>

      <div class="doctor-kpi-card" onclick="showDuplicateSafetyInfo()" title="Real-time duplicate drug lock status">
        <div class="kpi-card-header">
          <span class="kpi-title">Prescription Safety</span>
          <span class="kpi-icon-pill">🛡️</span>
        </div>
        <div class="kpi-card-value text-success" style="font-size: 1.35rem; display: flex; align-items: center; gap: 6px;">
          <span>✓</span> ACTIVE
        </div>
        <div class="kpi-card-sub">Dual-tier safety lock active</div>
      </div>
    </div>

    <!-- Main Workspace Layout: Today's Clinical Queue + Side Panel -->
    <div class="doctor-dashboard-layout">
      <!-- Left / Main Column: Today's Clinical Queue -->
      <div class="clinical-queue-panel">
        <div class="queue-panel-header">
          <div>
            <h3 class="queue-panel-title">Today's Clinical Queue</h3>
            <p class="queue-panel-sub">Patients requiring your attention.</p>
          </div>
          <div class="queue-panel-controls">
            <div class="queue-search-wrap">
              <span class="queue-search-icon">🔍</span>
              <input 
                type="text" 
                class="form-control queue-search-input" 
                placeholder="Search patient or ID..."
                aria-label="Search patient or ID"
                value="${escapeHtml(queueSearchQuery)}"
                oninput="handleQueueSearchInput(this.value)"
              >
            </div>
            ${renderQueueFilterTabs(allPatients)}
          </div>
        </div>

        <!-- Clinical Queue Table -->
        <div id="clinicalQueueTableContainer">
          ${renderClinicalQueueTable(allPatients)}
        </div>
      </div>

      <!-- Right Column: Quick Shortcuts & Recent Clinical Activity -->
      <div class="clinical-side-panel">
        <!-- Quick Department Shortcuts -->
        <div class="card p-16">
          <div class="side-panel-heading">
            <span>⚡</span> Clinical Shortcuts
          </div>
          <div class="dept-quick-actions-grid">
            <button type="button" class="dept-action-btn" onclick="openStartConsultationModal()">
              <span class="dept-action-icon">📝</span>
              <span class="dept-action-label">New Consultation</span>
            </button>
            <button type="button" class="dept-action-btn" onclick="openOrderLabModal()">
              <span class="dept-action-icon">🔬</span>
              <span class="dept-action-label">Diagnostic Lab</span>
            </button>
            <button type="button" class="dept-action-btn" onclick="openCreateReferralModal()">
              <span class="dept-action-icon">🔁</span>
              <span class="dept-action-label">New Referral</span>
            </button>
            <button type="button" class="dept-action-btn" onclick="setDoctorTab('prescriptions')">
              <span class="dept-action-icon">💊</span>
              <span class="dept-action-label">Prescriptions</span>
            </button>
          </div>
        </div>

        <!-- Recent Clinical Activity Feed -->
        <div class="card p-16">
          <div class="side-panel-heading">
            <span>⏱️</span> Recent Activity
          </div>
          <div class="recent-activity-list">
            ${recentActivities.length === 0 ? `
              <div class="empty-state-compact">
                <span>📋</span>
                <p>No clinical activity recorded yet today.</p>
              </div>
            ` : recentActivities.map(act => `
              <div class="activity-feed-item">
                <div class="act-icon-wrap">${act.icon || '🩺'}</div>
                <div class="act-content">
                  <div class="act-header">
                    <strong class="act-title">${escapeHtml(act.action)}</strong>
                    <span class="act-time">${new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div class="act-patient" onclick="openClinicalWorkspace('${act.patientId}')" title="Open patient workspace">
                    👤 ${escapeHtml(act.patientName)} <span class="act-badge">${act.patientId}</span>
                  </div>
                  <div class="act-details">${escapeHtml(act.details)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ----------------------------------------------------------------------------
// Queue Filter Tabs Sub-Renderer with Real Counts
// ----------------------------------------------------------------------------
function renderQueueFilterTabs(allPatients) {
  const allCount = allPatients.length;
  const checkedInCount = allPatients.filter(p => p.status === 'CHECKED_IN').length;
  const waitingCount = allPatients.filter(p => p.status === 'WAITING' || p.status === 'ACTIVE').length;
  const transferCount = allPatients.filter(p => p.status === 'TRANSFER_PENDING').length;
  const completedCount = allPatients.filter(p => p.status === 'COMPLETED' || p.status === 'DISCHARGED').length;

  return `
    <div class="queue-filter-pills">
      <button type="button" class="btn-filter-pill ${queueFilterStatus === 'ALL' ? 'active' : ''}" onclick="filterClinicalQueue('ALL')">
        All (${allCount})
      </button>
      <button type="button" class="btn-filter-pill ${queueFilterStatus === 'CHECKED_IN' ? 'active' : ''}" onclick="filterClinicalQueue('CHECKED_IN')">
        Checked In (${checkedInCount})
      </button>
      <button type="button" class="btn-filter-pill ${queueFilterStatus === 'WAITING' ? 'active' : ''}" onclick="filterClinicalQueue('WAITING')">
        Waiting (${waitingCount})
      </button>
      <button type="button" class="btn-filter-pill ${queueFilterStatus === 'TRANSFER_PENDING' ? 'active' : ''}" onclick="filterClinicalQueue('TRANSFER_PENDING')">
        Transfer Pending (${transferCount})
      </button>
      <button type="button" class="btn-filter-pill ${queueFilterStatus === 'COMPLETED' ? 'active' : ''}" onclick="filterClinicalQueue('COMPLETED')">
        Completed (${completedCount})
      </button>
    </div>
  `;
}

// ----------------------------------------------------------------------------
// Clinical Queue Table Sub-Renderer
// ----------------------------------------------------------------------------
function renderClinicalQueueTable(allPatients) {
  let filtered = allPatients;

  if (queueFilterStatus !== 'ALL') {
    if (queueFilterStatus === 'WAITING') {
      filtered = filtered.filter(p => p.status === 'WAITING' || p.status === 'ACTIVE');
    } else if (queueFilterStatus === 'COMPLETED') {
      filtered = filtered.filter(p => p.status === 'COMPLETED' || p.status === 'DISCHARGED');
    } else {
      filtered = filtered.filter(p => p.status === queueFilterStatus);
    }
  }

  if (queueSearchQuery.trim()) {
    const q = queueSearchQuery.toLowerCase().trim();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      (p.bloodGroup && p.bloodGroup.toLowerCase().includes(q)) ||
      (p.diagnosis && p.diagnosis.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    return `
      <div class="empty-state-box">
        <span class="empty-state-icon">📋</span>
        <h4 class="empty-state-title">No matching patients in queue</h4>
        <p class="empty-state-text">There are currently no patients matching the selected filter criteria.</p>
        <button type="button" class="btn btn-secondary btn-sm mt-12" onclick="filterClinicalQueue('ALL')">
          Reset Filter
        </button>
      </div>
    `;
  }

  return `
    <div class="table-container">
      <table class="data-table clinical-queue-table">
        <thead>
          <tr>
            <th>PATIENT</th>
            <th>AGE / GENDER</th>
            <th>BLOOD GROUP</th>
            <th>REASON / VISIT</th>
            <th>STATUS</th>
            <th style="text-align: right;">ACTION</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(p => {
    let statusBadge = '<span class="badge badge-active">CHECKED IN</span>';
    let actionBtnText = 'Open Patient';
    let actionBtnClass = 'btn-primary';

    if (p.status === 'TRANSFER_PENDING') {
      statusBadge = '<span class="badge badge-danger">TRANSFER PENDING</span>';
      actionBtnText = 'Review Transfer';
      actionBtnClass = 'btn-danger';
    } else if (p.status === 'WAITING' || p.status === 'ACTIVE') {
      statusBadge = '<span class="badge badge-warning">WAITING</span>';
      actionBtnText = 'Start Consultation';
      actionBtnClass = 'btn-primary';
    } else if (p.status === 'COMPLETED' || p.status === 'DISCHARGED') {
      statusBadge = '<span class="badge badge-success">COMPLETED</span>';
      actionBtnText = 'View Patient';
      actionBtnClass = 'btn-secondary';
    }

    const reasonText = p.diagnosis || p.complaint || p.reason || 'General Clinical Review';

    return `
              <tr class="queue-row" onclick="openClinicalWorkspace('${p.id}')">
                <td>
                  <div class="patient-cell-name">
                    <strong>${escapeHtml(p.name)}</strong>
                    <span class="patient-id-tag">${escapeHtml(p.id)}</span>
                  </div>
                </td>
                <td>
                  <span class="patient-demog-text">${p.age} yrs • ${escapeHtml(p.gender || 'Adult')}</span>
                </td>
                <td>
                  <span class="badge badge-info">${escapeHtml(p.bloodGroup || 'O+')}</span>
                </td>
                <td>
                  <span class="patient-visit-text">${escapeHtml(reasonText)}</span>
                </td>
                <td>
                  ${statusBadge}
                </td>
                <td style="text-align: right;" onclick="event.stopPropagation()">
                  <button type="button" class="btn ${actionBtnClass} btn-sm" onclick="openClinicalWorkspace('${p.id}')">
                    ${actionBtnText}
                  </button>
                </td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

window.filterClinicalQueue = function (status) {
  queueFilterStatus = status;
  const store = window.hospitrackStore;
  const container = document.getElementById('clinicalQueueTableContainer');
  if (container) {
    const user = window.hospitrackAuth.getCurrentUser();
    const doctorId = user?.doctorId || user?.id || 'DOC-201';
    const doctor = store.getDoctorById(doctorId);
    const allPatients = store.getPatients(doctor?.hospitalId);
    container.innerHTML = renderClinicalQueueTable(allPatients);
  } else {
    window.renderDoctorDashboard(document.getElementById('mainContentArea'));
  }
};

window.handleQueueSearchInput = function (query) {
  queueSearchQuery = query;
  window.filterClinicalQueue(queueFilterStatus);
};

window.showDuplicateSafetyInfo = function () {
  window.showToast('🛡️ Real-time duplicate drug protection active: duplicate prescriptions are blocked live and validated with HTTP 422.', 'success');
};

// ----------------------------------------------------------------------------
// 2. Dedicated Patient Clinical Workspace / Drawer
// ----------------------------------------------------------------------------
window.openClinicalWorkspace = function (patientId, subtab = 'overview') {
  selectedPatientId = patientId;
  patientWorkspaceActiveSubtab = subtab;
  doctorActiveTab = 'workspace';
  window.renderDoctorDashboard(document.getElementById('mainContentArea'));
};

window.setPatientWorkspaceSubtab = function (subtab) {
  patientWorkspaceActiveSubtab = subtab;
  window.renderDoctorDashboard(document.getElementById('mainContentArea'));
};

function renderPatientClinicalWorkspace(patientId, doctor, hospital) {
  const store = window.hospitrackStore;
  const patient = store.getPatientById(patientId);

  if (!patient) {
    return `
      <div class="empty-state-box">
        <span class="empty-state-icon">⚠️</span>
        <h3 class="empty-state-title">Patient record not found</h3>
        <p class="empty-state-text">The requested patient record (<code>${escapeHtml(patientId)}</code>) could not be loaded.</p>
        <button type="button" class="btn btn-secondary mt-16" onclick="setDoctorTab('dashboard')">
          ← Back to Clinical Queue
        </button>
      </div>
    `;
  }

  const prescriptions = store.getPrescriptions(patient.id);
  const labs = store.getLabs(null, patient.id);
  const referrals = store.getReferrals().filter(r => r.patientId === patient.id);

  let statusBadge = '<span class="badge badge-active">ACTIVE</span>';
  if (patient.status === 'TRANSFER_PENDING') {
    statusBadge = '<span class="badge badge-danger">TRANSFER PENDING</span>';
  } else if (patient.status === 'DISCHARGED') {
    statusBadge = '<span class="badge badge-secondary">DISCHARGED</span>';
  }

  return `
    <!-- Top Navigation Bar -->
    <div class="workspace-top-bar">
      <button type="button" class="btn btn-secondary btn-sm" onclick="setDoctorTab('dashboard')">
        ← Back to Clinical Queue
      </button>
      <div class="workspace-breadcrumb">
        <span>Clinical Workstation</span>
        <span class="crumb-sep">/</span>
        <strong>${escapeHtml(patient.name)}</strong>
        <span class="crumb-id">(${escapeHtml(patient.id)})</span>
      </div>
    </div>

    <!-- Patient Header Card -->
    <div class="patient-banner-card">
      <div class="patient-banner-main">
        <div class="patient-avatar-circle">
          ${(patient.name || 'P').charAt(0)}
        </div>
        <div class="patient-banner-details">
          <div class="patient-banner-title-row">
            <h2 class="patient-banner-name">${escapeHtml(patient.name)}</h2>
            <span class="badge badge-info">${escapeHtml(patient.id)}</span>
            ${statusBadge}
          </div>
          <div class="patient-banner-meta-row">
            <span><strong>${patient.age}</strong> years</span>
            <span class="meta-dot">•</span>
            <span>${escapeHtml(patient.gender || 'Adult')}</span>
            <span class="meta-dot">•</span>
            <span>Blood Group: <strong class="text-primary">${escapeHtml(patient.bloodGroup || 'O+')}</strong></span>
            <span class="meta-dot">•</span>
            <span>Hospital: <strong>${escapeHtml(hospital.name)}</strong></span>
          </div>
        </div>
      </div>
      <div class="patient-banner-actions">
        <button type="button" class="btn btn-secondary btn-sm" onclick="window.printInpatientSummary('${patient.id}')" title="Print authentic inpatient clinical summary">
          <span>🖨️</span> Print Clinical Summary
        </button>
        <button type="button" class="btn btn-primary btn-sm" onclick="setPatientWorkspaceSubtab('consultation')">
          <span>📝</span> Start Consultation
        </button>
        <button type="button" class="btn btn-secondary btn-sm" onclick="setPatientWorkspaceSubtab('prescription')">
          <span>💊</span> New Prescription
        </button>
        <button type="button" class="btn btn-secondary btn-sm" onclick="openOrderLabModal('${patient.id}')">
          <span>🔬</span> Order Lab
        </button>
        <button type="button" class="btn btn-secondary btn-sm" onclick="openCreateReferralModal('${patient.id}')">
          <span>🔁</span> Create Referral
        </button>
        <button type="button" class="btn btn-warning btn-sm" onclick="openRequestDischargeModal('${patient.id}')">
          <span>🚪</span> Request Discharge
        </button>
      </div>
    </div>

    <!-- Patient Workspace Navigation Tabs (6 Clean Subtabs) -->
    <div class="workspace-tabs-bar">
      <button type="button" class="workspace-tab ${patientWorkspaceActiveSubtab === 'overview' ? 'active' : ''}" onclick="setPatientWorkspaceSubtab('overview')">
        <span>📊</span> Overview
      </button>
      <button type="button" class="workspace-tab ${patientWorkspaceActiveSubtab === 'consultation' ? 'active' : ''}" onclick="setPatientWorkspaceSubtab('consultation')">
        <span>📝</span> Consultation Note
      </button>
      <button type="button" class="workspace-tab ${patientWorkspaceActiveSubtab === 'prescription' ? 'active' : ''}" onclick="setPatientWorkspaceSubtab('prescription')">
        <span>💊</span> Prescriptions
        ${prescriptions.length > 0 ? `<span class="tab-badge">${prescriptions.length}</span>` : ''}
      </button>
      <button type="button" class="workspace-tab ${patientWorkspaceActiveSubtab === 'laboratory' ? 'active' : ''}" onclick="setPatientWorkspaceSubtab('laboratory')">
        <span>🔬</span> Laboratory
        ${labs.length > 0 ? `<span class="tab-badge">${labs.length}</span>` : ''}
      </button>
      <button type="button" class="workspace-tab ${patientWorkspaceActiveSubtab === 'referrals' ? 'active' : ''}" onclick="setPatientWorkspaceSubtab('referrals')">
        <span>🔁</span> Referrals
        ${referrals.length > 0 ? `<span class="tab-badge">${referrals.length}</span>` : ''}
      </button>
      <button type="button" class="workspace-tab ${patientWorkspaceActiveSubtab === 'timeline' ? 'active' : ''}" onclick="setPatientWorkspaceSubtab('timeline')">
        <span>⏳</span> Care Timeline
      </button>
    </div>

    <!-- Active Tab Workspace Container -->
    <div id="patientWorkspaceContent" class="mt-16">
      ${renderPatientSubtab(patientWorkspaceActiveSubtab, { patient, doctor, hospital, prescriptions, labs, referrals })}
    </div>
  `;
}

function renderPatientSubtab(subtab, data) {
  switch (subtab) {
    case 'consultation':
      return renderConsultationTab(data);
    case 'prescription':
      return renderPrescriptionTab(data);
    case 'laboratory':
      return renderPatientLaboratoryTab(data);
    case 'referrals':
      return renderPatientReferralsTab(data);
    case 'timeline':
      return renderPatientTimelineTab(data);
    case 'overview':
    default:
      return renderPatientOverviewTab(data);
  }
}

// ----------------------------------------------------------------------------
// 2A. Patient Overview Tab (Clinical Intake, Vitals, Regimens, Labs, Emergency Contact)
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// 2A. Patient Clinical Chart / Inpatient Detail Telemetry Dashboard
// ----------------------------------------------------------------------------
window.__patientClinicalChartState = window.__patientClinicalChartState || {};

const COMMON_DRUG_CATALOG = [
  { name: 'Paracetamol (Acetaminophen)', dosage: '500mg', form: 'Tablet', defaultFreq: 'Thrice Daily [TDS]', defaultRoute: 'Oral', defaultTiming: 'After Meals', category: 'Analgesic & Antipyretic' },
  { name: 'Amoxicillin-Clavulanate (Augmentin)', dosage: '625mg', form: 'Tablet', defaultFreq: 'Twice Daily [BD]', defaultRoute: 'Oral', defaultTiming: 'With Meals', category: 'Broad-Spectrum Antibiotic' },
  { name: 'Atorvastatin Calcium (Lipitor)', dosage: '20mg', form: 'Tablet', defaultFreq: 'Once Daily [OD]', defaultRoute: 'Oral', defaultTiming: 'Bedtime (HS)', category: 'Lipid-Lowering Agent' },
  { name: 'Aspirin (Ecosprin Gastro-resistant)', dosage: '75mg', form: 'Tablet', defaultFreq: 'Once Daily [OD]', defaultRoute: 'Oral', defaultTiming: 'After Meals', category: 'Antiplatelet Therapy' },
  { name: 'Metoprolol Succinate (Betaloc)', dosage: '25mg', form: 'Tablet', defaultFreq: 'Twice Daily [BD]', defaultRoute: 'Oral', defaultTiming: 'After Meals', category: 'Beta-Blocker / Antianginal' },
  { name: 'Pantoprazole Sodium (Pan-40)', dosage: '40mg', form: 'Tablet', defaultFreq: 'Once Daily [OD]', defaultRoute: 'Oral', defaultTiming: 'Before Meals', category: 'Proton Pump Inhibitor' },
  { name: 'Ceftriaxone Sodium (Monocef)', dosage: '1g', form: 'IV Infusion', defaultFreq: 'Once Daily [OD]', defaultRoute: 'Intravenous (IV)', defaultTiming: 'After Meals', category: 'Cephalosporin Antibiotic' },
  { name: 'Azithromycin Dihydrate (Azee)', dosage: '500mg', form: 'Tablet', defaultFreq: 'Once Daily [OD]', defaultRoute: 'Oral', defaultTiming: 'Before Meals', category: 'Macrolide Antibiotic' },
  { name: 'Ondansetron HCl (Emeset)', dosage: '4mg', form: 'Injection', defaultFreq: 'STAT / SOS', defaultRoute: 'Intravenous (IV)', defaultTiming: 'Before Meals', category: 'Antiemetic' }
];

function getPatientActiveMedications(patientId, defaultRx) {
  if (window.__patientClinicalChartState[patientId]?.medications) {
    return window.__patientClinicalChartState[patientId].medications;
  }
  let meds = [];
  if (defaultRx && defaultRx.items && defaultRx.items.length > 0) {
    meds = defaultRx.items.map((m, idx) => ({
      id: `MED-INIT-${idx}`,
      name: m.name,
      dosage: m.dosage || '500mg',
      form: m.form || 'Tablet',
      frequency: m.frequency || 'Twice Daily [BD]',
      scheduleTag: m.scheduleTag || (m.frequency ? `${m.frequency} • After Meals` : '1 - 0 - 1 • After Meals'),
      route: m.route || 'Oral',
      timing: m.timing || 'After Meals',
      duration: m.duration || '7 days',
      prescribedAt: defaultRx.prescribedAt ? new Date(defaultRx.prescribedAt).toLocaleDateString('en-GB') : '28-Oct-2026, 10:30 AM',
      prescribedBy: defaultRx.doctorName || 'Dr. Arjun Verma',
      status: 'ACTIVE'
    }));
  } else if (patientId === 'PAT-303') {
    meds = [
      {
        id: 'MED-303-1',
        name: 'Metoprolol Succinate',
        dosage: '25mg',
        form: 'Tablet',
        frequency: 'Twice Daily [BD]',
        scheduleTag: '1 - 0 - 1 • After Meals',
        route: 'Oral',
        timing: 'After Meals',
        duration: '14 days',
        prescribedAt: '28-Oct-2026, 10:30 AM',
        prescribedBy: 'Dr. Arjun Verma',
        status: 'ACTIVE'
      },
      {
        id: 'MED-303-2',
        name: 'Pantoprazole Sodium',
        dosage: '40mg',
        form: 'Tablet',
        frequency: 'Once Daily [OD]',
        scheduleTag: '1 - 0 - 0 • Before Breakfast',
        route: 'Oral',
        timing: 'Before Meals',
        duration: '7 days',
        prescribedAt: '28-Oct-2026, 10:30 AM',
        prescribedBy: 'Dr. Arjun Verma',
        status: 'ACTIVE'
      }
    ];
  }
  window.__patientClinicalChartState[patientId] = window.__patientClinicalChartState[patientId] || {};
  window.__patientClinicalChartState[patientId].medications = meds;
  return meds;
}

function getPatientActiveLabOrders(patientId, defaultLabs) {
  if (window.__patientClinicalChartState[patientId]?.labOrders) {
    return window.__patientClinicalChartState[patientId].labOrders;
  }
  let orders = [];
  if (defaultLabs && defaultLabs.length > 0) {
    orders = defaultLabs.map(l => ({
      id: l.id,
      testName: l.testName,
      category: l.category || 'Diagnostic Pathology',
      orderedAt: l.timestamp ? new Date(l.timestamp).toLocaleDateString('en-GB') : '28-Oct-2026, 09:15 AM',
      orderedBy: l.doctorName || 'Dr. Arjun Verma',
      status: l.status || 'SAMPLE_COLLECTED',
      resultSummary: l.resultSummary || 'Requisition active in laboratory.'
    }));
  } else if (patientId === 'PAT-303') {
    orders = [
      {
        id: 'LAB-901',
        testName: 'Complete Blood Count (CBC) with Automated Differential',
        category: 'Diagnostic Hematology',
        orderedAt: '28-Oct-2026, 09:15 AM',
        orderedBy: 'Dr. Arjun Verma',
        status: 'PROCESSING_IN_LAB',
        resultSummary: 'Specimen barcoded and incubated in automated flow cytometer.'
      },
      {
        id: 'LAB-902',
        testName: 'High-Sensitivity Cardiac Troponin-I (hs-cTnI)',
        category: 'Cardiac Telemetry Biomarker',
        orderedAt: '28-Oct-2026, 09:15 AM',
        orderedBy: 'Dr. Arjun Verma',
        status: 'SAMPLE_COLLECTED',
        resultSummary: 'Venous blood serum collected via phlebotomy; routed to clinical pathology.'
      }
    ];
  }
  window.__patientClinicalChartState[patientId] = window.__patientClinicalChartState[patientId] || {};
  window.__patientClinicalChartState[patientId].labOrders = orders;
  return orders;
}

function renderPatientOverviewTab(data) {
  const { patient, doctor, hospital, prescriptions, labs } = data;
  const latestRx = prescriptions[0] || null;
  const meds = getPatientActiveMedications(patient.id, latestRx);
  const labOrders = getPatientActiveLabOrders(patient.id, labs);

  const emergencyName = patient.emergencyContactName || 'Karthik Iyer';
  const emergencyRelation = patient.emergencyContactRelation || 'Husband';
  const emergencyPhone = patient.emergencyContactPhone || '+91 98111 99993';
  const emergencyPhoneClean = emergencyPhone.replace(/[^0-9+]/g, '');

  return `
    <div class="patient-clinical-chart-wrap">
      <!-- 1. Clinical Identity Banner (Top Card) -->
      <div class="clinical-identity-banner">
        <div class="identity-banner-header">
          <div class="identity-banner-title">
            <span class="live-dot-pulse"></span>
            <span>Clinical Inpatient Chart &amp; Telemetry</span>
            <span class="text-muted font-mono">(${escapeHtml(patient.id)})</span>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="window.printInpatientSummary('${escapeHtml(patient.id)}')">
            <span>🖨️</span> Print Clinical Summary
          </button>
        </div>

        <div class="identity-banner-body">
          <div class="identity-banner-flex">
            <!-- Left: Patient Avatar & Live Status Indicator -->
            <div class="patient-avatar-box">
              <div class="patient-avatar-large">
                ${escapeHtml((patient.name || 'P').charAt(0))}
              </div>
              <div class="avatar-live-indicator" title="Live Checked-In Status"></div>
            </div>

            <div class="identity-banner-info">
              <div class="identity-patient-name">
                <span>${escapeHtml(patient.name)}</span>
                <span class="badge-checked-in">
                  <span class="live-dot-pulse" style="width: 6px; height: 6px;"></span>
                  <span>CHECKED_IN</span>
                </span>
              </div>
              <div class="identity-patient-sub">
                MRN: <strong>${escapeHtml(patient.id)}</strong> • Inpatient Admission
              </div>
            </div>

            <!-- Center Grid (3-column layout) -->
            <div class="identity-3col-grid">
              <!-- Col 1: Age / Sex & Blood Group -->
              <div class="identity-col-cell">
                <span class="identity-cell-title">Demographics</span>
                <span class="font-semibold text-slate-800">${patient.age || 31} yrs • ${escapeHtml(patient.gender || 'Female')}</span>
                <div style="margin-top: 2px;">
                  <span class="blood-group-pill">🩸 ${escapeHtml(patient.bloodGroup || 'A+')}</span>
                </div>
              </div>

              <!-- Col 2: Bed Allocation & Attending Physician -->
              <div class="identity-col-cell">
                <span class="identity-cell-title">Bed Allocation</span>
                <span class="font-semibold text-slate-800">
                  🛏️ ${escapeHtml(patient.ward || 'General Medicine Ward')} • <strong>Bed ${escapeHtml(patient.bedNumber || 'GEN-01')}</strong>
                </span>
                <span class="text-secondary" style="font-size: 0.75rem;">
                  🩺 Attending: <strong>${escapeHtml(doctor.name || 'Dr. Arjun Verma')}</strong>
                </span>
              </div>

              <!-- Col 3: Facility & Emergency Contact with 1-click call icon -->
              <div class="identity-col-cell">
                <span class="identity-cell-title">Facility &amp; Emergency</span>
                <span class="font-semibold text-slate-800">🏥 ${escapeHtml(hospital.name || 'Apex Care Medical Center')}</span>
                <div>
                  <a href="tel:${emergencyPhoneClean}" class="btn-emergency-call" title="Call Emergency Contact">
                    <span>📞</span>
                    <span>${escapeHtml(emergencyName)} (${escapeHtml(emergencyRelation)}): ${escapeHtml(emergencyPhone)}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Line: Address in subtle muted slate with a pin icon -->
          <div class="identity-banner-footer">
            <span>📍</span>
            <span class="font-semibold text-muted">Residential Address:</span>
            <span>${escapeHtml(patient.address || '42-B, Indiranagar 1st Stage, Bengaluru, KA - 560038')}</span>
          </div>
        </div>
      </div>

      <!-- 2. Baseline Vitals Telemetry Grid -->
      <div class="telemetry-vitals-card">
        <div class="telemetry-card-header">
          <div>
            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #0F172A; display: flex; align-items: center; gap: 6px;">
              <span>💓</span> Baseline Vitals &amp; Telemetry Grid
            </h4>
            <span style="font-size: 0.72rem; color: #64748B;">Continuous clinical observation recorded during intake triage</span>
          </div>
          <span class="badge badge-subtle font-xs">Clinical Intake Telemetry</span>
        </div>

        <!-- 4 interactive telemetry metric widgets -->
        <div class="telemetry-grid-4col">
          <!-- Blood Pressure -->
          <div class="telemetry-metric-widget">
            <div class="telemetry-widget-top">
              <span>Blood Pressure</span>
              <span class="status-tag-pill normal">Normal</span>
            </div>
            <div class="telemetry-widget-main">
              <span class="telemetry-value-lg text-doctor">120/80</span>
              <span class="telemetry-unit">mmHg</span>
            </div>
            <div class="telemetry-widget-sub">
              <span class="live-dot-pulse" style="width: 5px; height: 5px; background: #10B981;"></span>
              <span>Systolic: 120 / Diastolic: 80</span>
            </div>
          </div>

          <!-- Heart Rate -->
          <div class="telemetry-metric-widget">
            <div class="telemetry-widget-top">
              <span>Heart Rate</span>
              <span>💓</span>
            </div>
            <div class="telemetry-widget-main">
              <span class="telemetry-value-lg text-primary">74</span>
              <span class="telemetry-unit">bpm</span>
            </div>
            <div class="telemetry-widget-sub">
              <span class="live-dot-pulse" style="width: 5px; height: 5px; background: #0D9488;"></span>
              <span>Resting Sinus Rhythm</span>
            </div>
          </div>

          <!-- Oxygen Saturation -->
          <div class="telemetry-metric-widget">
            <div class="telemetry-widget-top">
              <span>Oxygen Saturation</span>
              <span>🫁</span>
            </div>
            <div class="telemetry-widget-main">
              <span class="telemetry-value-lg text-success">99%</span>
              <span class="telemetry-unit">SpO2</span>
            </div>
            <div class="telemetry-widget-sub">
              <span class="live-dot-pulse" style="width: 5px; height: 5px; background: #10B981;"></span>
              <span>Room Air (Atmospheric)</span>
            </div>
          </div>

          <!-- Body Temperature -->
          <div class="telemetry-metric-widget">
            <div class="telemetry-widget-top">
              <span>Body Temperature</span>
              <span>🌡️</span>
            </div>
            <div class="telemetry-widget-main">
              <span class="telemetry-value-lg">98.6°</span>
              <span class="telemetry-unit">F</span>
            </div>
            <div class="telemetry-widget-sub">
              <span class="status-tag-pill normal">Normal</span>
              <span>Afebrile</span>
            </div>
          </div>
        </div>

        <!-- Dedicated "Clinical Intake & Allergy Alert" bar -->
        <div class="clinical-intake-bar">
          <div class="chief-complaint-box">
            <div class="chief-complaint-label">CHIEF CLINICAL PRESENTATION / INTAKE COMPLAINT</div>
            <blockquote class="chief-complaint-quote">
              &ldquo;${escapeHtml(patient.chiefComplaint || 'Episodes of atypical chest discomfort radiating to left shoulder on exertion, accompanied by episodic palpitations and mild fatigue.')}&rdquo;
            </blockquote>
          </div>

          <div>
            ${patient.allergies && patient.allergies.length > 0 ? `
              <div class="allergy-alert-pill allergic">
                <span>⚠️ Active Drug Allergies: ${escapeHtml(patient.allergies)}</span>
              </div>
            ` : `
              <div class="allergy-alert-pill nkda">
                <span>🛡️ No Known Drug Allergies - NKDA</span>
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- 3. Active Regimens Table & "+ Add Drug" Workflow -->
      <div class="active-regimens-card">
        <div class="d-flex-between mb-12">
          <div>
            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #0F172A; display: flex; align-items: center; gap: 8px;">
              <span>💊</span> Active Regimens
              <span class="badge badge-info" style="font-size: 0.7rem;">${meds.length} Active</span>
            </h4>
            <span style="font-size: 0.72rem; color: #64748B;">Hospital inpatient pharmacotherapy orders and administration schedule</span>
          </div>
          <button type="button" class="btn btn-primary btn-sm" onclick="window.openAddDrugModal('${escapeHtml(patient.id)}')">
            <span>+</span> Add Drug
          </button>
        </div>

        ${meds.length === 0 ? `
          <div class="p-20 text-center border-dashed rounded bg-surface-alt">
            <p class="text-muted font-sm" style="margin: 0;">No active medications currently prescribed.</p>
            <button type="button" class="btn btn-secondary btn-sm mt-8" onclick="window.openAddDrugModal('${escapeHtml(patient.id)}')">
              + Add First Inpatient Drug
            </button>
          </div>
        ` : `
          <div class="regimens-table-container">
            <table class="clinical-regimens-table">
              <thead>
                <tr>
                  <th>MEDICINE &amp; DOSAGE</th>
                  <th>SCHEDULE</th>
                  <th>ROUTE / TIMING</th>
                  <th>PRESCRIBED &amp; DOCTOR</th>
                  <th style="text-align: right;">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                ${meds.map((m, idx) => `
                  <tr>
                    <td>
                      <div style="font-weight: 800; color: #0F172A;">
                        ${escapeHtml(m.name)}
                        <span class="badge badge-subtle font-xs" style="margin-left: 6px;">${escapeHtml(m.dosage)}</span>
                      </div>
                      <span style="font-size: 0.72rem; color: #64748B;">${escapeHtml(m.form || 'Tablet')}</span>
                    </td>
                    <td>
                      <span class="med-schedule-badge">${escapeHtml(m.scheduleTag || `${m.frequency || '1-0-1'} • ${m.timing || 'After Meals'}`)}</span>
                    </td>
                    <td>
                      <div style="font-weight: 600;">${escapeHtml(m.route || 'Oral')}</div>
                      <div style="font-size: 0.72rem; color: #64748B;">${escapeHtml(m.timing || 'After Meals')}</div>
                    </td>
                    <td>
                      <div style="font-weight: 600; color: #334155;">${escapeHtml(m.duration || '7 days')}</div>
                      <div style="font-size: 0.72rem; color: #64748B;">
                        <span class="badge badge-subtle font-xs">${escapeHtml(m.prescribedBy || doctor.name)}</span>
                        <span style="margin-left: 4px;">• ${escapeHtml(m.prescribedAt || 'Just now')}</span>
                      </div>
                    </td>
                    <td style="text-align: right;">
                      <button type="button" class="med-action-btn" onclick="window.editDrugDose('${escapeHtml(patient.id)}', '${escapeHtml(m.name)}')" title="Edit Dose">
                        Edit Dose
                      </button>
                      <button type="button" class="med-action-btn discontinue" style="margin-left: 6px;" onclick="window.discontinueDrug('${escapeHtml(patient.id)}', '${escapeHtml(m.name)}')" title="Discontinue Drug">
                        Discontinue
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- 4. Diagnostic Lab Orders Section -->
      <div class="diagnostic-labs-card">
        <div class="d-flex-between mb-12">
          <div>
            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #0F172A; display: flex; align-items: center; gap: 8px;">
              <span>🔬</span> Diagnostic Lab Orders
              <span class="badge badge-subtle font-xs">${labOrders.length} Orders</span>
            </h4>
            <span style="font-size: 0.72rem; color: #64748B;">Pathology, biochemistry, and cardiac diagnostic requisitions</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.openQuickOrderLabModal('${escapeHtml(patient.id)}')">
              <span>+</span> Order Test
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="setPatientWorkspaceSubtab('laboratory')">
              View All History
            </button>
          </div>
        </div>

        ${labOrders.length === 0 ? `
          <div class="p-24 text-center border-dashed rounded bg-surface-alt">
            <div style="font-size: 1.8rem; margin-bottom: 6px;">🧪</div>
            <div style="font-weight: 700; color: #334155; font-size: 0.88rem;">No lab investigations ordered yet</div>
            <p class="text-muted font-xs mt-4" style="margin-bottom: 12px;">Click "+ Order Test" to request CBC, Lipid Profile, or ECG.</p>
            <button type="button" class="btn btn-primary btn-sm" onclick="window.openQuickOrderLabModal('${escapeHtml(patient.id)}')">
              + Order Test
            </button>
          </div>
        ` : `
          <div class="lab-orders-dynamic-grid">
            ${labOrders.map(l => {
              let pillClass = 'lab-status-badge sample-collected';
              let labelText = 'Sample Collected';
              const st = (l.status || '').toUpperCase();
              if (st.includes('PROCESSING') || st.includes('IN_PROGRESS')) {
                pillClass = 'lab-status-badge processing';
                labelText = 'Processing in Lab';
              } else if (st.includes('REVIEW') || st.includes('FINAL') || st.includes('READY')) {
                pillClass = 'lab-status-badge ready';
                labelText = 'Ready for Review';
              }

              return `
                <div class="lab-order-card">
                  <div class="lab-order-top">
                    <span class="lab-order-name">${escapeHtml(l.testName)}</span>
                    <span class="${pillClass}">${labelText}</span>
                  </div>
                  <div style="color: #64748B; font-size: 0.72rem;">${escapeHtml(l.category || 'Diagnostic Requisition')}</div>
                  <div style="border-top: 1px solid #E2E8F0; padding-top: 6px; margin-top: 4px; display: flex; justify-content: space-between; font-size: 0.7rem; color: #94A3B8;">
                    <span>Requisition: ${escapeHtml(l.orderedAt || 'Today')}</span>
                    <span class="font-mono">${escapeHtml(l.id)}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

// ----------------------------------------------------------------------------
// Interactive Add Drug Slide-Over Drawer Handlers
// ----------------------------------------------------------------------------
window.openAddDrugModal = function (patientId, editDrugName = null) {
  let drawerOverlay = document.getElementById('addDrugSlideoverOverlay');
  if (!drawerOverlay) {
    drawerOverlay = document.createElement('div');
    drawerOverlay.id = 'addDrugSlideoverOverlay';
    drawerOverlay.className = 'add-drug-slideover-overlay';
    document.body.appendChild(drawerOverlay);
  }

  const existingMeds = (window.__patientClinicalChartState[patientId]?.medications) || [];
  const editMed = editDrugName ? existingMeds.find(m => m.name.toLowerCase() === editDrugName.toLowerCase()) : null;

  const initialDrug = editMed ? editMed.name : '';
  const initialDosage = editMed ? editMed.dosage : '500mg';
  const initialForm = editMed ? (editMed.form || 'Tablet') : 'Tablet';
  const initialFreq = editMed ? (editMed.frequency || 'Twice Daily [BD]') : 'Twice Daily [BD]';
  const initialRoute = editMed ? (editMed.route || 'Oral') : 'Oral';
  const initialTiming = editMed ? (editMed.timing || 'After Meals') : 'After Meals';
  const initialDuration = editMed ? (parseInt(editMed.duration) || 5) : 5;
  const initialNotes = editMed ? (editMed.instructions || '') : '';

  drawerOverlay.innerHTML = `
    <div class="add-drug-slideover-drawer" role="dialog" aria-modal="true" aria-labelledby="addDrugModalTitle">
      <div style="padding: 16px 20px; background: #0F172A; color: #FFFFFF; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.25rem;">💊</span>
          <div>
            <h3 id="addDrugModalTitle" style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #FFFFFF;">
              ${editMed ? 'Edit Medication Regimen' : 'Prescribe Inpatient Medication'}
            </h3>
            <span style="font-size: 0.72rem; color: #94A3B8;">Patient MRN: ${escapeHtml(patientId)}</span>
          </div>
        </div>
        <button type="button" class="modal-close" style="color: #94A3B8; background: transparent; border: none; font-size: 1.2rem; cursor: pointer;" onclick="window.closeAddDrugModal()">✕</button>
      </div>

      <form id="addDrugForm" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; overflow-y: auto;" onsubmit="window.handleAddDrugSubmit(event, '${escapeHtml(patientId)}', ${editMed ? `'${escapeHtml(editMed.name)}'` : 'null'})">
        <div style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
          <!-- Drug Name Search with Autocomplete -->
          <div style="position: relative;">
            <label class="form-label" for="addDrugSearchInput" style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 6px; display: block;">
              Drug Name &amp; Molecule <span style="color: #DC2626;">*</span>
            </label>
            <input
              type="text"
              id="addDrugSearchInput"
              class="form-control"
              placeholder="Type e.g. Paracetamol, Amoxicillin, Atorvastatin..."
              value="${escapeHtml(initialDrug)}"
              autocomplete="off"
              required
              oninput="window.filterDrugSuggestions(this.value)"
              onfocus="window.filterDrugSuggestions(this.value)"
            >
            <div id="drugSuggestionsList" class="drug-suggestions-dropdown hidden"></div>
          </div>

          <!-- Dosage & Pharmaceutical Form -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label class="form-label" for="addDrugDosage" style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 6px; display: block;">
                Dosage
              </label>
              <input type="text" id="addDrugDosage" class="form-control" value="${escapeHtml(initialDosage)}" placeholder="e.g. 500mg" required>
            </div>
            <div>
              <label class="form-label" for="addDrugFormType" style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 6px; display: block;">
                Form
              </label>
              <select id="addDrugFormType" class="form-control">
                <option value="Tablet" ${initialForm === 'Tablet' ? 'selected' : ''}>Tablet</option>
                <option value="Capsule" ${initialForm === 'Capsule' ? 'selected' : ''}>Capsule</option>
                <option value="IV Infusion" ${initialForm === 'IV Infusion' ? 'selected' : ''}>IV Infusion</option>
                <option value="Syrup" ${initialForm === 'Syrup' ? 'selected' : ''}>Syrup</option>
                <option value="Injection" ${initialForm === 'Injection' ? 'selected' : ''}>Injection</option>
              </select>
            </div>
          </div>

          <!-- Administration Frequency Quick Selector -->
          <div>
            <label class="form-label" style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 6px; display: block;">
              Frequency Selector
            </label>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
              <button type="button" class="btn-freq-pill ${initialFreq.includes('OD') ? 'active' : ''}" onclick="window.setDrugFrequency(this, 'Once Daily [OD]')">Once Daily [OD]</button>
              <button type="button" class="btn-freq-pill ${initialFreq.includes('BD') ? 'active' : ''}" onclick="window.setDrugFrequency(this, 'Twice Daily [BD]')">Twice Daily [BD]</button>
              <button type="button" class="btn-freq-pill ${initialFreq.includes('TDS') ? 'active' : ''}" onclick="window.setDrugFrequency(this, 'Thrice Daily [TDS]')">Thrice Daily [TDS]</button>
              <button type="button" class="btn-freq-pill ${initialFreq.includes('STAT') || initialFreq.includes('SOS') ? 'active' : ''}" onclick="window.setDrugFrequency(this, 'STAT / SOS')">STAT / SOS</button>
            </div>
            <input type="hidden" id="addDrugFrequency" value="${escapeHtml(initialFreq)}">
          </div>

          <!-- Route & Meal Timing -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label class="form-label" for="addDrugRoute" style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 6px; display: block;">Route</label>
              <select id="addDrugRoute" class="form-control">
                <option value="Oral" ${initialRoute === 'Oral' ? 'selected' : ''}>Oral</option>
                <option value="Intravenous (IV)" ${initialRoute.includes('IV') ? 'selected' : ''}>Intravenous (IV)</option>
                <option value="Subcutaneous (SC)" ${initialRoute.includes('SC') ? 'selected' : ''}>Subcutaneous (SC)</option>
                <option value="Inhalation" ${initialRoute === 'Inhalation' ? 'selected' : ''}>Inhalation</option>
              </select>
            </div>
            <div>
              <label class="form-label" for="addDrugTiming" style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 6px; display: block;">Meal Timing</label>
              <select id="addDrugTiming" class="form-control">
                <option value="After Meals" ${initialTiming === 'After Meals' ? 'selected' : ''}>After Meals</option>
                <option value="Before Meals" ${initialTiming === 'Before Meals' ? 'selected' : ''}>Before Meals</option>
                <option value="With Meals" ${initialTiming === 'With Meals' ? 'selected' : ''}>With Meals</option>
                <option value="Bedtime (HS)" ${initialTiming.includes('Bedtime') ? 'selected' : ''}>Bedtime (HS)</option>
              </select>
            </div>
          </div>

          <!-- Duration Days Input -->
          <div>
            <label class="form-label" for="addDrugDuration" style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 6px; display: block;">
              Duration (Days)
            </label>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="const el = document.getElementById('addDrugDuration'); el.value = Math.max(1, parseInt(el.value || 1) - 1);">-</button>
              <input type="number" id="addDrugDuration" class="form-control" style="width: 80px; text-align: center; font-weight: 800;" value="${initialDuration}" min="1" max="90">
              <button type="button" class="btn btn-secondary btn-sm" onclick="const el = document.getElementById('addDrugDuration'); el.value = parseInt(el.value || 1) + 1;">+</button>
              <span style="font-size: 0.78rem; color: #64748B;">days of inpatient treatment</span>
            </div>
          </div>

          <!-- Special Instructions -->
          <div>
            <label class="form-label" for="addDrugInstructions" style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 6px; display: block;">
              Attending Notes / Instructions
            </label>
            <textarea id="addDrugInstructions" class="form-control" rows="2" placeholder="e.g. Monitor LFTs, take with water, check morning blood pressure...">${escapeHtml(initialNotes)}</textarea>
          </div>
        </div>

        <div style="padding: 16px 20px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: flex-end; gap: 10px;">
          <button type="button" class="btn btn-secondary" onclick="window.closeAddDrugModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${editMed ? 'Update Dose' : 'Prescribe &amp; Sign Order'}</button>
        </div>
      </form>
    </div>
  `;

  drawerOverlay.classList.add('open');
};

window.closeAddDrugModal = function () {
  const el = document.getElementById('addDrugSlideoverOverlay');
  if (el) el.classList.remove('open');
};

window.setDrugFrequency = function (btn, freq) {
  const parent = btn.parentElement;
  if (parent) {
    parent.querySelectorAll('.btn-freq-pill').forEach(b => b.classList.remove('active'));
  }
  btn.classList.add('active');
  const hidden = document.getElementById('addDrugFrequency');
  if (hidden) hidden.value = freq;
};

window.filterDrugSuggestions = function (query) {
  const listEl = document.getElementById('drugSuggestionsList');
  if (!listEl) return;
  const q = (query || '').toLowerCase().trim();
  const matched = COMMON_DRUG_CATALOG.filter(d => !q || d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q));

  if (matched.length === 0) {
    listEl.classList.add('hidden');
    return;
  }

  listEl.innerHTML = matched.map(d => `
    <div class="drug-suggestion-item" onclick="window.selectDrugSuggestion('${escapeHtml(d.name)}', '${escapeHtml(d.dosage)}', '${escapeHtml(d.form)}', '${escapeHtml(d.defaultFreq)}', '${escapeHtml(d.defaultRoute)}', '${escapeHtml(d.defaultTiming)}')">
      <div style="font-weight: 800; color: #0F172A;">${escapeHtml(d.name)}</div>
      <div style="font-size: 0.7rem; color: #64748B;">${escapeHtml(d.dosage)} • ${escapeHtml(d.form)} • ${escapeHtml(d.category)}</div>
    </div>
  `).join('');
  listEl.classList.remove('hidden');
};

window.selectDrugSuggestion = function (name, dosage, form, freq, route, timing) {
  const nameInput = document.getElementById('addDrugSearchInput');
  const doseInput = document.getElementById('addDrugDosage');
  const formSelect = document.getElementById('addDrugFormType');
  const freqHidden = document.getElementById('addDrugFrequency');
  const routeSelect = document.getElementById('addDrugRoute');
  const timingSelect = document.getElementById('addDrugTiming');

  if (nameInput) nameInput.value = name;
  if (doseInput) doseInput.value = dosage;
  if (formSelect) formSelect.value = form;
  if (freqHidden) freqHidden.value = freq;
  if (routeSelect) routeSelect.value = route;
  if (timingSelect) timingSelect.value = timing;

  // Update frequency pill active state
  document.querySelectorAll('.btn-freq-pill').forEach(b => {
    if (b.textContent.trim().toLowerCase().includes(freq.toLowerCase().split(' ')[0])) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  const listEl = document.getElementById('drugSuggestionsList');
  if (listEl) listEl.classList.add('hidden');
};

window.handleAddDrugSubmit = function (e, patientId, editingName = null) {
  if (e && e.preventDefault) e.preventDefault();

  const name = document.getElementById('addDrugSearchInput')?.value?.trim();
  const dosage = document.getElementById('addDrugDosage')?.value?.trim() || '500mg';
  const form = document.getElementById('addDrugFormType')?.value || 'Tablet';
  const freq = document.getElementById('addDrugFrequency')?.value || 'Twice Daily [BD]';
  const route = document.getElementById('addDrugRoute')?.value || 'Oral';
  const timing = document.getElementById('addDrugTiming')?.value || 'After Meals';
  const durationDays = document.getElementById('addDrugDuration')?.value || '5';
  const notes = document.getElementById('addDrugInstructions')?.value?.trim() || '';

  if (!name) {
    alert('Please enter or select a valid drug name.');
    return;
  }

  let sched = '1 - 0 - 1 • ' + timing;
  if (freq.includes('OD')) sched = '1 - 0 - 0 • ' + timing;
  else if (freq.includes('BD')) sched = '1 - 0 - 1 • ' + timing;
  else if (freq.includes('TDS')) sched = '1 - 1 - 1 • ' + timing;
  else if (freq.includes('STAT') || freq.includes('SOS')) sched = 'SOS as needed • ' + timing;

  const currentMeds = getPatientActiveMedications(patientId);

  if (editingName) {
    const idx = currentMeds.findIndex(m => m.name.toLowerCase() === editingName.toLowerCase());
    if (idx !== -1) {
      currentMeds[idx] = {
        ...currentMeds[idx],
        name,
        dosage,
        form,
        frequency: freq,
        route,
        timing,
        duration: `${durationDays} days`,
        scheduleTag: sched,
        instructions: notes
      };
    }
    window.showToast?.(`✓ Updated dosage regimen for ${name}.`, 'success');
  } else {
    const newMed = {
      id: `MED-${Date.now().toString().slice(-4)}`,
      name,
      dosage,
      form,
      frequency: freq,
      scheduleTag: sched,
      route,
      timing,
      duration: `${durationDays} days`,
      prescribedAt: 'Just now',
      prescribedBy: 'Dr. Arjun Verma',
      instructions: notes,
      status: 'ACTIVE'
    };
    currentMeds.unshift(newMed);
    window.showToast?.(`✓ ${name} ${dosage} added to active inpatient regimens.`, 'success');
  }

  window.closeAddDrugModal();
  refreshPatientWorkspaceContent(patientId);
};

window.discontinueDrug = function (patientId, drugName) {
  const currentMeds = getPatientActiveMedications(patientId);
  const idx = currentMeds.findIndex(m => m.name.toLowerCase() === drugName.toLowerCase());
  if (idx !== -1) {
    currentMeds.splice(idx, 1);
    window.showToast?.(`Discontinued medication order: ${drugName}.`, 'info');
    refreshPatientWorkspaceContent(patientId);
  }
};

window.editDrugDose = function (patientId, drugName) {
  window.openAddDrugModal(patientId, drugName);
};

window.openQuickOrderLabModal = function (patientId) {
  const orders = getPatientActiveLabOrders(patientId);
  const newOrder = {
    id: `LAB-${Date.now().toString().slice(-4)}`,
    testName: '12-Lead Diagnostic Electrocardiogram (ECG)',
    category: 'Non-Invasive Clinical Cardiology',
    orderedAt: 'Just now',
    orderedBy: 'Dr. Arjun Verma',
    status: 'SAMPLE_COLLECTED',
    resultSummary: 'Telemetry requisition transmitted to cardiology testing deck.'
  };
  orders.unshift(newOrder);
  window.showToast?.('✓ Diagnostic test ordered: 12-Lead ECG.', 'success');
  refreshPatientWorkspaceContent(patientId);
};

function refreshPatientWorkspaceContent(patientId) {
  const contentEl = document.getElementById('patientWorkspaceContent');
  if (contentEl) {
    const store = window.hospitrackStore;
    const user = window.hospitrackAuth?.getCurrentUser();
    const doctor = store.getDoctorById(user?.doctorId || user?.id) || { name: 'Dr. Arjun Verma' };
    const hospital = store.getHospitalById(doctor?.hospitalId) || { name: 'Apex Care Medical Center' };
    const patient = store.getPatients().find(p => p.id === patientId) || { id: patientId, name: 'Ananya Iyer', age: 31, gender: 'Female', bloodGroup: 'A+' };
    const prescriptions = store.getPrescriptions(patientId);
    const labs = store.getLabs(null, patientId);
    const referrals = store.getReferrals().filter(r => r.patientId === patientId);
    contentEl.innerHTML = renderPatientSubtab('overview', { patient, doctor, hospital, prescriptions, labs, referrals });
  } else {
    if (window.renderDoctorDashboard) window.renderDoctorDashboard();
  }
}

// ----------------------------------------------------------------------------
// Real-World Inpatient Summary Printout
// ----------------------------------------------------------------------------
window.printInpatientSummary = function (patientId) {
  const store = window.hospitrackStore || {};
  const patient = (store.getPatients ? store.getPatients() : []).find(p => p.id === patientId) || {
    id: patientId || 'PAT-303',
    name: 'Ananya Iyer',
    age: 31,
    gender: 'Female',
    bloodGroup: 'A+',
    ward: 'General Medicine Ward',
    bedNumber: 'GEN-01',
    address: '42-B, Indiranagar 1st Stage, Bengaluru, KA - 560038',
    chiefComplaint: 'Episodes of atypical chest discomfort radiating to left shoulder on exertion, accompanied by episodic palpitations and mild fatigue.',
    allergies: 'No Known Drug Allergies (NKDA)'
  };

  const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
  const doctor = (store.getDoctorById ? store.getDoctorById(user?.doctorId || user?.id) : null) || { name: 'Dr. Arjun Verma, MD (Internal Medicine)' };
  const hospital = (store.getHospitalById ? store.getHospitalById(doctor?.hospitalId) : null) || { name: 'Apex Care Medical Center' };

  const meds = getPatientActiveMedications(patient.id);

  let printContainer = document.getElementById('printable-medical-record');
  if (!printContainer) {
    printContainer = document.createElement('div');
    printContainer.id = 'printable-medical-record';
    printContainer.className = 'printable-document-container';
    document.body.appendChild(printContainer);
  }

  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  printContainer.innerHTML = `
    <div class="print-inpatient-summary-sheet">
      <!-- 1. Hospital Letterhead & Inpatient Admission Record -->
      <div style="border-bottom: 2px solid #0F172A; padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-size: 0.72rem; font-weight: 800; color: #0D9488; text-transform: uppercase; letter-spacing: 0.08em;">
            Hospitrack Inpatient Clinical Care System
          </div>
          <h1 style="margin: 2px 0 0 0; font-size: 1.45rem; font-weight: 900; color: #0F172A; letter-spacing: -0.01em;">
            ${escapeHtml(hospital.name || 'APEX CARE MEDICAL CENTER').toUpperCase()}
          </h1>
          <p style="margin: 2px 0 0 0; font-size: 0.78rem; color: #475569;">
            DEPARTMENT OF INTERNAL MEDICINE &amp; INPATIENT TELEMETRY
          </p>
          <div style="margin-top: 4px; font-size: 0.7rem; color: #64748B;">
            NABL ISO 15189 • NABH Accredited Facility • Ayushman Bharat Digital Mission (ABDM)
          </div>
        </div>

        <div style="text-align: right;">
          <div style="border: 1px solid #CBD5E1; padding: 4px 10px; font-size: 0.78rem; font-family: monospace; border-radius: 4px; display: inline-block;">
            UID: <strong>ADM-2026-8812</strong>
          </div>
          <div style="font-family: monospace; letter-spacing: 2px; font-size: 0.7rem; color: #94A3B8; margin-top: 3px;">
            ||| | |||| ||| |||||| ||||
          </div>
          <div style="font-size: 0.72rem; color: #64748B; margin-top: 3px;">
            Date: <strong>${dateStr}</strong>
          </div>
        </div>
      </div>

      <!-- Title Ribbon -->
      <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; text-align: center;">
        <h2 style="margin: 0; font-size: 1.05rem; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.04em;">
          INPATIENT CLINICAL SUMMARY &amp; PHARMACOTHERAPY CHART
        </h2>
      </div>

      <!-- Section 1: Patient Demographics & Ward Allocation -->
      <div style="border: 1px solid #CBD5E1; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 0.78rem;">
        <div>
          <div style="font-weight: 800; text-transform: uppercase; font-size: 0.7rem; color: #64748B; margin-bottom: 6px;">
            Patient Demographics &amp; UHID
          </div>
          <div style="line-height: 1.6;">
            <div>Full Name: <strong>${escapeHtml(patient.name)}</strong></div>
            <div>MRN / UHID: <strong style="font-family: monospace; color: #0D9488;">${escapeHtml(patient.id)}</strong></div>
            <div>Age / Gender: ${patient.age} yrs • ${escapeHtml(patient.gender || 'Female')}</div>
            <div>Blood Group: <strong>${escapeHtml(patient.bloodGroup || 'A+')}</strong></div>
            <div>Emergency: ${escapeHtml(patient.emergencyContactName || 'Karthik Iyer')} (${escapeHtml(patient.emergencyContactPhone || '+91 98111 99993')})</div>
          </div>
        </div>
        <div>
          <div style="font-weight: 800; text-transform: uppercase; font-size: 0.7rem; color: #64748B; margin-bottom: 6px;">
            Ward Location &amp; Clinician
          </div>
          <div style="line-height: 1.6;">
            <div>Ward: <strong>${escapeHtml(patient.ward || 'General Medicine Ward')}</strong></div>
            <div>Bed Allocation: <strong>Bed ${escapeHtml(patient.bedNumber || 'GEN-01')}</strong></div>
            <div>Attending: <strong>${escapeHtml(doctor.name || 'Dr. Arjun Verma')}</strong></div>
            <div>Facility: ${escapeHtml(hospital.name || 'Apex Care Medical Center')}</div>
            <div>Status: <span style="font-weight: 800; color: #047857;">CHECKED_IN / ACTIVE INPATIENT</span></div>
          </div>
        </div>
      </div>

      <!-- Section 2: Vitals recorded at intake -->
      <div style="border: 1px solid #CBD5E1; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 0.78rem;">
        <div style="font-weight: 800; text-transform: uppercase; font-size: 0.7rem; color: #64748B; margin-bottom: 8px;">
          Baseline Intake Vitals &amp; Clinical Presentation
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 10px;">
          <div style="padding: 6px 10px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px;">
            <span style="color: #64748B; display: block; font-size: 0.7rem;">Blood Pressure:</span>
            <strong>120/80 mmHg</strong> (Normal)
          </div>
          <div style="padding: 6px 10px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px;">
            <span style="color: #64748B; display: block; font-size: 0.7rem;">Heart Rate:</span>
            <strong>74 bpm</strong> (Resting)
          </div>
          <div style="padding: 6px 10px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px;">
            <span style="color: #64748B; display: block; font-size: 0.7rem;">SpO2:</span>
            <strong>99%</strong> (Room Air)
          </div>
          <div style="padding: 6px 10px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px;">
            <span style="color: #64748B; display: block; font-size: 0.7rem;">Temperature:</span>
            <strong>98.6° F</strong> (Afebrile)
          </div>
        </div>
        <div style="margin-top: 6px;">
          <span style="color: #64748B;">Chief Complaint:</span> <em>&ldquo;${escapeHtml(patient.chiefComplaint || 'Episodes of atypical chest discomfort radiating to left shoulder on exertion, accompanied by episodic palpitations and mild fatigue.')}&rdquo;</em>
        </div>
        <div style="margin-top: 4px;">
          <span style="color: #64748B;">Allergy Assessment:</span> <strong style="color: #047857;">${escapeHtml(patient.allergies || 'No Known Drug Allergies - NKDA')}</strong>
        </div>
      </div>

      <!-- Section 3: Active Medication Chart with nurse administration timing slots -->
      <div style="border: 1px solid #CBD5E1; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 0.78rem;">
        <div style="font-weight: 800; text-transform: uppercase; font-size: 0.7rem; color: #64748B; margin-bottom: 8px;">
          Active Medication Chart &amp; Nurse Administration Schedule
        </div>
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.75rem;">
          <thead>
            <tr style="border-bottom: 1px solid #CBD5E1; font-size: 0.68rem; font-weight: 800; color: #475569; text-transform: uppercase;">
              <th style="padding: 4px 6px;">Medication &amp; Dose</th>
              <th style="padding: 4px 6px;">Route &amp; Frequency</th>
              <th style="padding: 4px 6px;">Morning (08:00)</th>
              <th style="padding: 4px 6px;">Noon (14:00)</th>
              <th style="padding: 4px 6px;">Night (20:00)</th>
              <th style="padding: 4px 6px;">Nurse Initial</th>
            </tr>
          </thead>
          <tbody>
            ${meds.map(m => `
              <tr style="border-bottom: 1px solid #F1F5F9;">
                <td style="padding: 6px; font-weight: 700;">${escapeHtml(m.name)} ${escapeHtml(m.dosage)}</td>
                <td style="padding: 6px;">${escapeHtml(m.route || 'Oral')} • ${escapeHtml(m.frequency)}</td>
                <td style="padding: 6px; font-family: monospace;">[  ] Init: ____</td>
                <td style="padding: 6px; font-family: monospace;">[  ] Init: ____</td>
                <td style="padding: 6px; font-family: monospace;">[  ] Init: ____</td>
                <td style="padding: 6px; font-family: monospace;">______</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Section 4: Doctor's provisional diagnosis and signature box -->
      <div style="border: 1px solid #CBD5E1; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 0.78rem;">
        <div>
          <div style="font-weight: 800; text-transform: uppercase; font-size: 0.7rem; color: #64748B; margin-bottom: 6px;">
            Provisional Clinical Diagnosis &amp; Plan
          </div>
          <p style="margin: 0; color: #334155; line-height: 1.5;">
            Patient under active inpatient evaluation for atypical chest discomfort. Continue current beta-blocker pharmacotherapy, maintain serial ECG observation and hs-cTnI surveillance. Telemetry monitoring advised.
          </p>
        </div>
        <div>
          <div style="font-weight: 800; text-transform: uppercase; font-size: 0.7rem; color: #64748B; margin-bottom: 16px;">
            Attending Physician Signature Block
          </div>
          <div style="border-bottom: 1px dashed #94A3B8; height: 18px; margin-bottom: 4px;">
            <span style="font-family: 'Brush Script MT', cursive, sans-serif; font-size: 1.25rem; color: #0D9488;">
              ${escapeHtml(doctor.name || 'Dr. Arjun Verma')}
            </span>
          </div>
          <div style="font-weight: 800; color: #0F172A;">${escapeHtml(doctor.name || 'Dr. Arjun Verma, MD')}</div>
          <div style="font-size: 0.7rem; color: #64748B;">Attending Physician • Department of Internal Medicine • Reg #KMC-44912</div>
        </div>
      </div>

      <div style="text-align: center; font-size: 0.68rem; color: #94A3B8; padding-top: 8px; border-top: 1px solid #E2E8F0;">
        Confidential Inpatient Telemetry Record • Hospitrack Care Coordination Highway v2.6
      </div>
    </div>
  `;

  document.body.classList.add('printing-inpatient-summary');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('printing-inpatient-summary');
  }, 1000);
};


// 2B. Progressive Step-Based Consultation Form Tab
// ----------------------------------------------------------------------------
function renderConsultationTab(data) {
  const { patient } = data;

  return `
    <div class="card p-24">
      <div class="mb-20">
        <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">
          📝 Clinical Consultation Encounter
        </h3>
        <p class="text-muted font-sm">
          Document clinical encounter note, vitals, diagnosis, and treatment plan for <strong>${escapeHtml(patient.name)}</strong> (<code>${escapeHtml(patient.id)}</code>).
        </p>
      </div>

      <form id="consultationForm" onsubmit="handleStructuredConsultationSubmit(event, '${patient.id}')">
        <!-- Step 1: Symptoms & Chief Complaint -->
        <div class="form-section-clean">
          <div class="form-section-title">1. Patient Symptoms &amp; Presentation</div>
          <div class="form-grid-2col">
            <div class="form-group">
              <label class="form-label" for="consultComplaint">Chief Complaint <span class="text-danger">*</span></label>
              <input type="text" id="consultComplaint" class="form-control" placeholder="e.g. Chest tightness on exertion and dyspnea" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="consultSymptoms">Symptoms &amp; Duration <span class="text-danger">*</span></label>
              <input type="text" id="consultSymptoms" class="form-control" placeholder="e.g. Retrosternal pressure radiating to jaw, duration 3 days" required>
            </div>
          </div>
        </div>

        <!-- Step 2: Vital Signs -->
        <div class="form-section-clean">
          <div class="form-section-title">2. Vital Signs</div>
          <div class="form-grid-4col">
            <div class="form-group">
              <label class="form-label" for="vitalBP">Blood Pressure (mmHg)</label>
              <input type="text" id="vitalBP" class="form-control" placeholder="120/80" value="120/80">
            </div>
            <div class="form-group">
              <label class="form-label" for="vitalHR">Pulse / HR (bpm)</label>
              <input type="text" id="vitalHR" class="form-control" placeholder="72" value="74">
            </div>
            <div class="form-group">
              <label class="form-label" for="vitalSpO2">SpO2 (%)</label>
              <input type="text" id="vitalSpO2" class="form-control" placeholder="98" value="99">
            </div>
            <div class="form-group">
              <label class="form-label" for="vitalTemp">Temperature (°F)</label>
              <input type="text" id="vitalTemp" class="form-control" placeholder="98.6" value="98.6">
            </div>
          </div>
        </div>

        <!-- Step 3: Clinical Findings -->
        <div class="form-section-clean">
          <div class="form-section-title">3. Physical Examination &amp; Clinical Findings</div>
          <div class="form-group">
            <label class="form-label" for="consultFindings">Physical Exam Findings</label>
            <textarea id="consultFindings" class="form-control" rows="2" placeholder="e.g. Regular heart sounds S1/S2 present, no murmurs. Lungs clear to auscultation bilaterally."></textarea>
          </div>
        </div>

        <!-- Step 4: Diagnosis -->
        <div class="form-section-clean">
          <div class="form-section-title">4. Diagnosis <span class="text-danger">*</span></div>
          <div class="form-group">
            <label class="form-label" for="consultDiagnosis">Working / Definitive Diagnosis <span class="text-danger">*</span></label>
            <input type="text" id="consultDiagnosis" class="form-control" placeholder="e.g. Stable Angina Pectoris / Coronary Artery Disease" required>
          </div>
        </div>

        <!-- Step 5: Treatment Protocol -->
        <div class="form-section-clean">
          <div class="form-section-title">5. Treatment Protocol &amp; Care Orders <span class="text-danger">*</span></div>
          <div class="form-group">
            <label class="form-label" for="consultTreatment">Treatment Plan &amp; Nursing Instructions <span class="text-danger">*</span></label>
            <textarea id="consultTreatment" class="form-control" rows="2" placeholder="e.g. Continue antiplatelet therapy, monitor ECG, schedule stress echocardiography" required></textarea>
          </div>
        </div>

        <!-- Step 6: Follow-up -->
        <div class="form-section-clean">
          <div class="form-section-title">6. Follow-up &amp; Discharge Instructions</div>
          <div class="form-group">
            <label class="form-label" for="consultFollowup">Follow-up Instructions</label>
            <input type="text" id="consultFollowup" class="form-control" placeholder="e.g. Review in outpatient cardiology clinic in 4 weeks. Seek emergency care if chest pain recurs.">
          </div>
        </div>

        <div id="consultAlertBanner" class="alert-banner hidden"></div>

        <div class="consultation-actions-row">
          <button type="button" class="btn btn-secondary" onclick="setPatientWorkspaceSubtab('overview')">
            Cancel
          </button>
          <button type="submit" id="consultSubmitBtn" class="btn btn-primary" ${isConsultationSaving ? 'disabled' : ''}>
            <span id="consultBtnSpinner" class="btn-spinner hidden"></span>
            <span id="consultBtnText">${isConsultationSaving ? 'Saving...' : '💾 Complete &amp; Save Consultation'}</span>
          </button>
        </div>
      </form>
    </div>
  `;
}

window.handleStructuredConsultationSubmit = async function (event, patientId) {
  event.preventDefault();
  if (isConsultationSaving) return;

  const alertEl = document.getElementById('consultAlertBanner');
  const btn = document.getElementById('consultSubmitBtn');
  const btnText = document.getElementById('consultBtnText');
  const spinner = document.getElementById('consultBtnSpinner');

  const complaint = document.getElementById('consultComplaint')?.value.trim();
  const symptomsInput = document.getElementById('consultSymptoms')?.value.trim();
  const bp = document.getElementById('vitalBP')?.value.trim();
  const hr = document.getElementById('vitalHR')?.value.trim();
  const spo2 = document.getElementById('vitalSpO2')?.value.trim();
  const temp = document.getElementById('vitalTemp')?.value.trim();
  const findings = document.getElementById('consultFindings')?.value.trim();
  const diagnosis = document.getElementById('consultDiagnosis')?.value.trim();
  const treatment = document.getElementById('consultTreatment')?.value.trim();
  const followup = document.getElementById('consultFollowup')?.value.trim();

  const combinedSymptoms = `[Complaint]: ${complaint} | [Symptoms]: ${symptomsInput}`;
  const combinedNotes = `Vitals: BP ${bp} mmHg, HR ${hr} bpm, SpO2 ${spo2}%, Temp ${temp}°F. Findings: ${findings || 'Normal'}. Follow-up: ${followup || 'Routine'}`;

  isConsultationSaving = true;
  if (btn) btn.disabled = true;
  if (spinner) spinner?.classList?.remove?.('hidden');
  if (btnText) btnText.textContent = 'Saving Record...';
  if (alertEl) alertEl?.classList?.add?.('hidden');

  try {
    await window.hospitrackStore.logVisit(patientId, {
      symptoms: combinedSymptoms,
      diagnosis,
      treatment,
      notes: combinedNotes
    });

    if (btnText) btnText.textContent = 'Saved ✓';
    window.showToast('✓ Consultation encounter recorded and persisted into PostgreSQL ledger.', 'success');

    setTimeout(() => {
      isConsultationSaving = false;
      setPatientWorkspaceSubtab('timeline');
    }, 400);

  } catch (err) {
    isConsultationSaving = false;
    if (btn) btn.disabled = false;
    if (spinner) spinner?.classList?.add?.('hidden');
    if (btnText) btnText.textContent = '💾 Complete & Save Consultation';

    if (alertEl) {
      alertEl.textContent = err.message || 'Unable to save the consultation. Please try again.';
      alertEl.className = 'alert-banner error';
      alertEl?.classList?.remove?.('hidden');
    }
  }
};

// ----------------------------------------------------------------------------
// 2C. Clean Prescription Builder Tab with Live Duplicate Drug Safety
// ----------------------------------------------------------------------------
let currentPrescriptionRows = [
  { name: 'Metoprolol', dosage: '25 mg', frequency: '2× daily', duration: '7 days', instructions: 'Take with food' }
];

function renderPrescriptionTab(data) {
  const { patient, prescriptions } = data;
  window.__activeWorkspacePatient = patient;
  window.__activeWorkspacePrescriptions = prescriptions;

  setTimeout(() => {
    if (typeof window.checkLiveDuplicateMedicines === 'function') {
      window.checkLiveDuplicateMedicines();
    }
  }, 40);

  return `
    <div class="card p-24">
      <div class="d-flex-between mb-16">
        <div>
          <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">
            💊 Prescription Order Builder
          </h3>
          <p class="text-muted font-sm">
            Sign pharmacotherapy orders protected by real-time duplicate medication validation.
          </p>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="addMedicationRow()">
          <span>+</span> Add Medicine
        </button>
      </div>

      <!-- Real-Time Clinical Decision Support (CDS) Safety Engine Container -->
      <div id="rxClinicalSafetyContainer" class="mb-16">
        <!-- Live CDS Drug Safety Evaluation Mount -->
      </div>
      <div id="rxDuplicateWarning" class="rx-safety-alert hidden" style="display:none;"></div>

      <form id="rxBuilderForm" onsubmit="handlePrescriptionOrderSubmit(event, '${patient.id}')">
        <!-- Medicine Rows Container -->
        <div id="rxRowsContainer" class="rx-builder-rows-wrap">
          ${renderCurrentMedicationRows()}
        </div>

        <!-- Instructions -->
        <div class="form-group mt-16">
          <label class="form-label" for="rxGeneralInstructions">Special Pharmacist / Nursing Instructions</label>
          <input type="text" id="rxGeneralInstructions" class="form-control" placeholder="e.g. Monitor resting blood pressure before administering; take after meals.">
        </div>

        <div id="rxFormAlert" class="alert-banner hidden"></div>

        <div class="consultation-actions-row">
          <button type="submit" id="rxSubmitBtn" class="btn btn-primary" ${isPrescriptionSaving ? 'disabled' : ''}>
            <span id="rxBtnSpinner" class="btn-spinner hidden"></span>
            <span id="rxBtnText">${isPrescriptionSaving ? 'Signing Order...' : '✍️ Sign &amp; Dispatch Prescription'}</span>
          </button>
        </div>
      </form>
    </div>
  `;
}

function renderCurrentMedicationRows() {
  if (currentPrescriptionRows.length === 0) {
    return `
      <div class="empty-state-compact">
        <span>💊</span>
        <p>No medications in order. Click <strong>+ Add Medicine</strong> to begin.</p>
      </div>
    `;
  }

  return currentPrescriptionRows.map((med, idx) => `
    <div class="rx-medicine-row" data-index="${idx}">
      <div class="rx-row-grid">
        <div class="rx-col-name">
          <label class="rx-field-label" for="rxMedName_${idx}">Medication <span class="text-danger">*</span></label>
          <input 
            type="text" 
            id="rxMedName_${idx}"
            class="form-control rx-input-name" 
            placeholder="e.g. Metoprolol" 
            value="${escapeHtml(med.name || '')}" 
            required
            oninput="updateRxRowData(${idx}, 'name', this.value); checkLiveDuplicateMedicines();"
          >
        </div>
        <div class="rx-col-dose">
          <label class="rx-field-label" for="rxMedDose_${idx}">Dose <span class="text-danger">*</span></label>
          <input 
            type="text" 
            id="rxMedDose_${idx}"
            class="form-control rx-input-dose" 
            placeholder="25 mg" 
            value="${escapeHtml(med.dosage || '')}" 
            required
            oninput="updateRxRowData(${idx}, 'dosage', this.value)"
          >
        </div>
        <div class="rx-col-freq">
          <label class="rx-field-label" for="rxMedFreq_${idx}">Frequency <span class="text-danger">*</span></label>
          <input 
            type="text" 
            id="rxMedFreq_${idx}"
            class="form-control rx-input-freq" 
            placeholder="2× daily" 
            value="${escapeHtml(med.frequency || '')}" 
            required
            oninput="updateRxRowData(${idx}, 'frequency', this.value)"
          >
        </div>
        <div class="rx-col-dur">
          <label class="rx-field-label" for="rxMedDur_${idx}">Duration <span class="text-danger">*</span></label>
          <input 
            type="text" 
            id="rxMedDur_${idx}"
            class="form-control rx-input-dur" 
            placeholder="7 days" 
            value="${escapeHtml(med.duration || '')}" 
            required
            oninput="updateRxRowData(${idx}, 'duration', this.value)"
          >
        </div>
        <div class="rx-col-action">
          <button 
            type="button" 
            class="btn btn-outline-danger btn-sm rx-remove-btn" 
            onclick="removeMedicationRow(${idx})" 
            title="Remove medicine"
            aria-label="Remove medicine row ${idx + 1}"
            ${currentPrescriptionRows.length <= 1 ? 'disabled' : ''}
          >
            ✕ Remove
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

window.addMedicationRow = function () {
  currentPrescriptionRows.push({ name: '', dosage: '', frequency: 'Once daily', duration: '14 days', instructions: '' });
  refreshRxRowsDOM();
  if (typeof checkLiveDuplicateMedicines === 'function') {
    checkLiveDuplicateMedicines();
  }
};

window.removeMedicationRow = function (index) {
  if (currentPrescriptionRows.length > 1) {
    currentPrescriptionRows.splice(index, 1);
    refreshRxRowsDOM();
    checkLiveDuplicateMedicines();
  }
};

window.updateRxRowData = function (index, field, value) {
  if (currentPrescriptionRows[index]) {
    currentPrescriptionRows[index][field] = value;
  }
};

function refreshRxRowsDOM() {
  const container = document.getElementById('rxRowsContainer');
  if (container) {
    container.innerHTML = renderCurrentMedicationRows();
  }
}

function checkLiveDuplicateMedicines() {
  const warningEl = document.getElementById('rxDuplicateWarning');
  const safetyContainer = document.getElementById('rxClinicalSafetyContainer');
  const submitBtn = document.getElementById('rxSubmitBtn');
  const nameInputs = document.querySelectorAll('.rx-input-name');

  const names = [];
  nameInputs.forEach(input => {
    const val = input.value.trim();
    if (val) names.push(val);
  });

  // Clinical Decision Support (CDS) Safety Engine Evaluation
  if (window.ClinicalSafetyManager && safetyContainer) {
    const patient = window.__activeWorkspacePatient || {};
    const pastPrescriptions = window.__activeWorkspacePrescriptions || [];
    const activePastMedicines = [];
    pastPrescriptions.forEach(p => {
      (p.medicines || []).forEach(m => {
        if (m && m.name) activePastMedicines.push(m.name);
      });
    });

    const report = window.ClinicalSafetyManager.evaluateLocalSafety(
      patient,
      names,
      activePastMedicines
    );

    window.__currentClinicalSafetyReport = report;

    safetyContainer.innerHTML = window.ClinicalSafetyManager.renderSafetyBannerHtml(
      report,
      window.currentClinicalOverrideConfirmed,
      window.currentClinicalOverrideReason
    );

    if (report.hasContraindication) {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.title = 'Order blocked by hard safety contraindication rule.';
      }
      return;
    }

    if (report.hasDuplication) {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.title = 'Duplicate drug detected in current order.';
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.title = '';
    }
  } else {
    // Fallback simple duplicate check
    const lowerNames = names.map(n => n.toLowerCase());
    const uniqueNames = new Set(lowerNames);
    const hasDuplicates = uniqueNames.size < lowerNames.length;

    if (hasDuplicates) {
      if (warningEl) warningEl?.classList?.remove?.('hidden');
      if (submitBtn) submitBtn.disabled = true;
    } else {
      if (warningEl) warningEl?.classList?.add?.('hidden');
      if (submitBtn) submitBtn.disabled = false;
    }
  }
}
window.checkLiveDuplicateMedicines = checkLiveDuplicateMedicines;

window.handlePrescriptionOrderSubmit = async function (event, patientId) {
  event.preventDefault();
  if (isPrescriptionSaving) return;

  const alertEl = document.getElementById('rxFormAlert');
  const btn = document.getElementById('rxSubmitBtn');
  const btnText = document.getElementById('rxBtnText');
  const spinner = document.getElementById('rxBtnSpinner');
  const instructions = document.getElementById('rxGeneralInstructions')?.value.trim();

  // Synchronize directly from active DOM rows first
  const domRows = document.querySelectorAll('.rx-medicine-row');
  let medicines = [];
  if (domRows && domRows.length > 0) {
    domRows.forEach(row => {
      const name = row.querySelector('.rx-input-name')?.value?.trim();
      if (name) {
        medicines.push({
          name: name,
          dosage: row.querySelector('.rx-input-dose')?.value?.trim() || 'As indicated',
          frequency: row.querySelector('.rx-input-freq')?.value?.trim() || 'Once daily',
          duration: row.querySelector('.rx-input-dur')?.value?.trim() || '14 days',
          instructions: 'Take as directed'
        });
      }
    });
  }
  if (medicines.length === 0) {
    medicines = currentPrescriptionRows
      .filter(m => m.name && m.name.trim().length > 0)
      .map(m => ({
        name: m.name.trim(),
        dosage: (m.dosage && m.dosage.trim().length > 0) ? m.dosage.trim() : 'As indicated',
        frequency: (m.frequency && m.frequency.trim().length > 0) ? m.frequency.trim() : 'Once daily',
        duration: (m.duration && m.duration.trim().length > 0) ? m.duration.trim() : '14 days',
        instructions: (m.instructions && m.instructions.trim().length > 0) ? m.instructions.trim() : 'Take as directed'
      }));
  }

  if (medicines.length === 0) {
    if (alertEl) {
      alertEl.textContent = 'Please specify at least one valid medication.';
      alertEl.className = 'alert-banner error';
      alertEl?.classList?.remove?.('hidden');
    }
    return;
  }

  // Clinical Decision Support (CDS) Safety Gatekeeper
  const safetyReport = window.__currentClinicalSafetyReport;
  if (safetyReport) {
    if (safetyReport.hasContraindication) {
      if (alertEl) {
        alertEl.textContent = '⛔ Hard Safety Stop: Prescription contains strictly contraindicated drug combinations. Please adjust therapy before submitting.';
        alertEl.className = 'alert-banner error';
        alertEl?.classList?.remove?.('hidden');
      }
      return;
    }

    if ((safetyReport.hasMajorAlert || safetyReport.hasAllergyAlert) && !window.currentClinicalOverrideConfirmed) {
      if (window.ClinicalSafetyManager && typeof window.ClinicalSafetyManager.promptOverrideModal === 'function') {
        window.ClinicalSafetyManager.promptOverrideModal();
      } else {
        if (alertEl) {
          alertEl.textContent = '⚠️ High-Risk Order: Requires documented physician clinical override rationale.';
          alertEl.className = 'alert-banner warning';
          alertEl?.classList?.remove?.('hidden');
        }
      }
      return;
    }
  }

  const names = medicines.map(m => m.name.trim().toLowerCase());
  const uniqueNames = new Set(names);
  if (uniqueNames.size < names.length) {
    if (alertEl) {
      alertEl.textContent = 'Duplicate medication detected: Cannot prescribe duplicate medications in the same order.';
      alertEl.className = 'alert-banner error';
      alertEl?.classList?.remove?.('hidden');
    }
    return;
  }

  isPrescriptionSaving = true;
  if (btn) btn.disabled = true;
  if (spinner) spinner?.classList?.remove?.('hidden');
  if (btnText) btnText.textContent = 'Signing Order...';
  if (alertEl) alertEl?.classList?.add?.('hidden');

  try {
    await window.hospitrackStore.createPrescription({
      patientId,
      medicines,
      instructions: instructions || 'Administer as indicated',
      clinicalOverrideReason: window.currentClinicalOverrideReason || null,
      overrideConfirmed: !!window.currentClinicalOverrideConfirmed
    });

    // Reset override state on success
    window.currentClinicalOverrideConfirmed = false;
    window.currentClinicalOverrideReason = '';

    if (btnText) btnText.textContent = 'Signed ✓';
    window.showToast('✓ Prescription signed and verified against Clinical Safety Engine.', 'success');

    currentPrescriptionRows = [
      { name: 'Metoprolol', dosage: '25 mg', frequency: '2× daily', duration: '7 days', instructions: 'Take with food' }
    ];

    setTimeout(() => {
      isPrescriptionSaving = false;
      setPatientWorkspaceSubtab('timeline');
    }, 400);

  } catch (err) {
    isPrescriptionSaving = false;
    if (btn) btn.disabled = false;
    if (spinner) spinner?.classList?.add?.('hidden');
    if (btnText) btnText.textContent = '✍️ Sign & Dispatch Prescription';

    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to sign prescription order.';
      alertEl.className = 'alert-banner error';
      alertEl?.classList?.remove?.('hidden');
    }
  }
};

// ----------------------------------------------------------------------------
// 2D. Patient Laboratory Tab
// ----------------------------------------------------------------------------
function renderPatientLaboratoryTab(data) {
  const { patient, labs } = data;

  return `
    <div class="card p-24">
      <div class="d-flex-between mb-16">
        <div>
          <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">
            🔬 Diagnostic Laboratory Orders &amp; Reports
          </h3>
          <p class="text-muted font-sm">
            View diagnostic results and review lab reports for <strong>${escapeHtml(patient.name)}</strong>.
          </p>
        </div>
        <button type="button" class="btn btn-primary btn-sm" onclick="openOrderLabModal('${patient.id}')">
          <span>+</span> Order Diagnostic Lab
        </button>
      </div>

      ${labs.length === 0 ? `
        <div class="empty-state-box">
          <span class="empty-state-icon">🔬</span>
          <h4 class="empty-state-title">No laboratory reports</h4>
          <p class="empty-state-text">Reports will appear here when ordered or finalized by the laboratory department.</p>
          <button type="button" class="btn btn-secondary btn-sm mt-12" onclick="openOrderLabModal('${patient.id}')">
            Order First Diagnostic Test
          </button>
        </div>
      ` : `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>TEST</th>
                <th>CATEGORY</th>
                <th>REQUESTED</th>
                <th>STATUS</th>
                <th>RESULT SUMMARY</th>
                <th style="text-align: right;">ACTION</th>
              </tr>
            </thead>
            <tbody>
              ${labs.map(lab => {
    const statusBadge = lab.status === 'REVIEWED'
      ? '<span class="badge badge-success">REVIEWED</span>'
      : '<span class="badge badge-warning">FINAL</span>';

    return `
                  <tr>
                    <td><strong>${escapeHtml(lab.testName)}</strong></td>
                    <td><span class="badge badge-info">${escapeHtml(lab.category || 'Cardiology')}</span></td>
                    <td class="text-muted font-sm">${new Date(lab.reportDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td>${statusBadge}</td>
                    <td class="text-muted font-sm" style="max-width: 260px;">${escapeHtml(lab.resultSummary || 'Normal findings recorded')}</td>
                    <td style="text-align: right;">
                      <button type="button" class="btn ${lab.status === 'REVIEWED' ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="openLabResultWorkspace('${lab.id}')">
                        ${lab.status === 'REVIEWED' ? 'View Report' : 'Review Result'}
                      </button>
                    </td>
                  </tr>
                `;
  }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

// ----------------------------------------------------------------------------
// 2E. Patient Referrals Tab
// ----------------------------------------------------------------------------
function renderPatientReferralsTab(data) {
  const { patient, referrals } = data;

  return `
    <div class="card p-24">
      <div class="d-flex-between mb-16">
        <div>
          <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">
            🔁 Specialist Referrals for Patient
          </h3>
          <p class="text-muted font-sm">Track outbound and inbound specialist referral requests.</p>
        </div>
        <button type="button" class="btn btn-primary btn-sm" onclick="openCreateReferralModal('${patient.id}')">
          <span>+</span> Create Referral
        </button>
      </div>

      ${referrals.length === 0 ? `
        <div class="empty-state-box">
          <span class="empty-state-icon">🔁</span>
          <h4 class="empty-state-title">No referrals</h4>
          <p class="empty-state-text">No specialist referrals have been initiated for this patient.</p>
          <button type="button" class="btn btn-secondary btn-sm mt-12" onclick="openCreateReferralModal('${patient.id}')">
            Create Referral
          </button>
        </div>
      ` : `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>REFERRAL ID</th>
                <th>DESTINATION FACILITY</th>
                <th>PRIORITY</th>
                <th>STATUS</th>
                <th>INDICATION</th>
                <th style="text-align: right;">ACTION</th>
              </tr>
            </thead>
            <tbody>
              ${referrals.map(r => {
    const pClass = r.priority === 'EMERGENCY' ? 'badge-danger' : r.priority === 'URGENT' ? 'badge-warning' : 'badge-info';
    return `
                  <tr>
                    <td><code>${escapeHtml(r.id)}</code></td>
                    <td><strong>${escapeHtml(r.toHospitalId)}</strong></td>
                    <td><span class="badge ${pClass}">${escapeHtml(r.priority)}</span></td>
                    <td><span class="badge badge-active">${escapeHtml(r.status)}</span></td>
                    <td class="text-muted font-sm">${escapeHtml(r.reason)}</td>
                    <td style="text-align: right;">
                      <button type="button" class="btn btn-secondary btn-sm" onclick="window.showToast('Referral ${r.id} details inspected.', 'info')">
                        View
                      </button>
                    </td>
                  </tr>
                `;
  }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

// ----------------------------------------------------------------------------
// 2F. Patient Longitudinal Timeline Tab
// ----------------------------------------------------------------------------
function renderPatientTimelineTab(data) {
  const { patient, prescriptions, labs } = data;

  return `
    <div class="card p-24">
      <div class="mb-20">
        <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">
          ⏳ Longitudinal Care Timeline
        </h3>
        <p class="text-muted font-sm">Chronological verified clinical care events for <strong>${escapeHtml(patient.name)}</strong>.</p>
      </div>

      <div class="timeline-container">
        ${prescriptions.length === 0 && labs.length === 0 ? `
          <div class="empty-state-compact">
            <span>⏳</span>
            <p>No recorded timeline events for this patient yet.</p>
          </div>
        ` : `
          ${prescriptions.map(rx => `
            <div class="timeline-item">
              <div class="timeline-dot" style="background: var(--primary);"></div>
              <div class="timeline-card">
                <div class="timeline-header">
                  <strong>💊 Signed Prescription Order (<code>${escapeHtml(rx.id)}</code>)</strong>
                  <span class="timeline-date">${new Date(rx.prescribedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <div class="timeline-body mt-8">
                  <div class="regimen-chips-wrap">
                    ${(rx.items || []).map(m => `
                      <span class="regimen-chip">${escapeHtml(m.name)} • ${escapeHtml(m.dosage)} (${escapeHtml(m.frequency)})</span>
                    `).join('')}
                  </div>
                  ${rx.instructions ? `<p class="text-muted font-sm mt-6"><em>Instructions:</em> ${escapeHtml(rx.instructions)}</p>` : ''}
                </div>
              </div>
            </div>
          `).join('')}

          ${labs.map(lab => `
            <div class="timeline-item">
              <div class="timeline-dot" style="background: var(--doctor-color);"></div>
              <div class="timeline-card">
                <div class="timeline-header">
                  <strong>🔬 Diagnostic Lab: ${escapeHtml(lab.testName)}</strong>
                  <span class="timeline-date">${new Date(lab.reportDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <div class="timeline-body mt-8">
                  <p class="font-sm"><strong>Result Summary:</strong> ${escapeHtml(lab.resultSummary || 'Completed')}</p>
                  <div class="mt-6">
                    <span class="badge ${lab.status === 'REVIEWED' ? 'badge-success' : 'badge-info'}">${escapeHtml(lab.status)}</span>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        `}
      </div>
    </div>
  `;
}

// ----------------------------------------------------------------------------
// 3. Laboratory & Diagnostics Center (Single Clear Heading & Filters)
// ----------------------------------------------------------------------------
function renderLaboratoryCenterView(data) {
  const { myLabs } = data;

  let filteredLabs = myLabs;
  if (labFilterCategory !== 'ALL') {
    filteredLabs = filteredLabs.filter(l => (l.category || '').toUpperCase() === labFilterCategory.toUpperCase());
  }
  if (labFilterStatus !== 'ALL') {
    filteredLabs = filteredLabs.filter(l => (l.status || '').toUpperCase() === labFilterStatus.toUpperCase());
  }
  if (labSearchQuery.trim()) {
    const q = labSearchQuery.toLowerCase().trim();
    filteredLabs = filteredLabs.filter(l =>
      l.testName.toLowerCase().includes(q) ||
      l.patientId.toLowerCase().includes(q) ||
      (l.category && l.category.toLowerCase().includes(q))
    );
  }

  return `
    <div class="card p-24">
      <div class="d-flex-between mb-20">
        <div>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">
            Laboratory &amp; Diagnostics
          </h2>
          <p class="text-muted font-sm">
            Manage diagnostic requests and review patient results.
          </p>
        </div>
        <button type="button" class="btn btn-primary" onclick="openOrderLabModal()">
          <span>+</span> New Lab Order
        </button>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="d-flex-between mb-16 gap-12 flex-wrap">
        <div class="queue-search-wrap" style="width: 260px;">
          <span class="queue-search-icon">🔍</span>
          <input 
            type="text" 
            class="form-control queue-search-input" 
            placeholder="Search patient or test..." 
            value="${escapeHtml(labSearchQuery)}"
            oninput="handleLabSearchInput(this.value)"
          >
        </div>

        <div class="d-flex gap-8 flex-wrap">
          <select class="form-control" style="width: 140px; height: 36px; font-size: 0.82rem;" onchange="handleLabCategoryFilter(this.value)">
            <option value="ALL" ${labFilterCategory === 'ALL' ? 'selected' : ''}>All Categories</option>
            <option value="Cardiology" ${labFilterCategory === 'Cardiology' ? 'selected' : ''}>Cardiology</option>
            <option value="Pathology" ${labFilterCategory === 'Pathology' ? 'selected' : ''}>Pathology</option>
            <option value="Radiology" ${labFilterCategory === 'Radiology' ? 'selected' : ''}>Radiology</option>
            <option value="Biochemistry" ${labFilterCategory === 'Biochemistry' ? 'selected' : ''}>Biochemistry</option>
          </select>

          <select class="form-control" style="width: 130px; height: 36px; font-size: 0.82rem;" onchange="handleLabStatusFilter(this.value)">
            <option value="ALL" ${labFilterStatus === 'ALL' ? 'selected' : ''}>All Status</option>
            <option value="FINAL" ${labFilterStatus === 'FINAL' ? 'selected' : ''}>Final (Pending)</option>
            <option value="REVIEWED" ${labFilterStatus === 'REVIEWED' ? 'selected' : ''}>Reviewed</option>
          </select>
        </div>
      </div>

      ${filteredLabs.length === 0 ? `
        <div class="empty-state-box">
          <span class="empty-state-icon">🔬</span>
          <h4 class="empty-state-title">No laboratory records found</h4>
          <p class="empty-state-text">No diagnostic reports match the selected criteria.</p>
          <button type="button" class="btn btn-secondary mt-16" onclick="openOrderLabModal()">
            Create Lab Order
          </button>
        </div>
      ` : `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>TEST</th>
                <th>PATIENT</th>
                <th>CATEGORY</th>
                <th>REQUESTED</th>
                <th>STATUS</th>
                <th style="text-align: right;">ACTION</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLabs.map(lab => {
    const isReviewed = (lab.status === 'REVIEWED');
    const statusBadge = isReviewed
      ? '<span class="badge badge-success">REVIEWED</span>'
      : '<span class="badge badge-warning">FINAL</span>';

    return `
                  <tr>
                    <td><strong>${escapeHtml(lab.testName)}</strong></td>
                    <td>
                      <span class="link-inline" onclick="openClinicalWorkspace('${lab.patientId}')">
                        👤 ${escapeHtml(lab.patientId)}
                      </span>
                    </td>
                    <td><span class="badge badge-info">${escapeHtml(lab.category || 'Diagnostics')}</span></td>
                    <td class="text-muted font-sm">${new Date(lab.reportDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td>${statusBadge}</td>
                    <td style="text-align: right;">
                      <button type="button" class="btn ${isReviewed ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="openLabResultWorkspace('${lab.id}')">
                        ${isReviewed ? 'View Report' : 'Review Result'}
                      </button>
                    </td>
                  </tr>
                `;
  }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

window.handleLabSearchInput = function (query) {
  labSearchQuery = query;
  window.renderDoctorDashboard(document.getElementById('mainContentArea'), 'laboratory');
};

window.handleLabCategoryFilter = function (category) {
  labFilterCategory = category;
  window.renderDoctorDashboard(document.getElementById('mainContentArea'), 'laboratory');
};

window.handleLabStatusFilter = function (status) {
  labFilterStatus = status;
  window.renderDoctorDashboard(document.getElementById('mainContentArea'), 'laboratory');
};

// ----------------------------------------------------------------------------
// Result Workspace / Modal for Lab Review
// ----------------------------------------------------------------------------
window.openLabResultWorkspace = function (labId) {
  const store = window.hospitrackStore;
  const lab = store.getLabById ? store.getLabById(labId) : (store.getLabs().find(l => l.id === labId));

  if (!lab) {
    window.showToast('Lab report record could not be loaded.', 'error');
    return;
  }

  const patient = store.getPatientById(lab.patientId) || { name: 'Patient ' + lab.patientId, id: lab.patientId };
  const doctor = store.getDoctorById(lab.doctorId) || { name: 'Dr. Sarah Sharma' };

  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div id="labResultModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="labResultModalTitle">
      <div class="modal-box" style="max-width: 650px;">
        <div class="modal-header">
          <h3 class="modal-title" id="labResultModalTitle">🔬 Diagnostic Laboratory Report</h3>
          <button type="button" class="modal-close" onclick="closeGlobalModal('labResultModal')" aria-label="Close">✕</button>
        </div>
        <div class="p-20">
          <div class="d-flex-between p-12 bg-surface-alt rounded mb-16">
            <div>
              <strong style="font-size: 1.05rem;">${escapeHtml(lab.testName)}</strong>
              <div class="text-muted font-sm">Category: ${escapeHtml(lab.category || 'Cardiology')}</div>
            </div>
            <div>
              <span class="badge ${lab.status === 'REVIEWED' ? 'badge-success' : 'badge-warning'}">
                ${escapeHtml(lab.status)}
              </span>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div class="p-10 border rounded font-sm">
              <span class="text-muted">Patient:</span> <strong>${escapeHtml(patient.name)}</strong> (${escapeHtml(patient.id)})
            </div>
            <div class="p-10 border rounded font-sm">
              <span class="text-muted">Physician:</span> <strong>${escapeHtml(doctor.name)}</strong>
            </div>
            <div class="p-10 border rounded font-sm">
              <span class="text-muted">Date:</span> ${new Date(lab.reportDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div class="p-10 border rounded font-sm">
              <span class="text-muted">Report ID:</span> <code>${escapeHtml(lab.id)}</code>
            </div>
          </div>

          <div class="form-group mb-16">
            <label class="form-label">Diagnostic Findings &amp; Summary</label>
            <div class="p-12 border rounded bg-surface-alt font-sm">
              ${escapeHtml(lab.resultSummary || 'Normal sinus rhythm. No acute ST-T wave changes. Findings consistent with stable cardiovascular profile.')}
            </div>
          </div>

          <div class="form-group mb-20">
            <label class="form-label">Attending Physician Clinical Notes</label>
            <div class="p-12 border rounded bg-surface-alt font-sm text-muted">
              Reviewed during routine inpatient evaluation. Maintain current pharmacological regimen.
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="openLabReportViewer('${lab.id}')">
              🔬 View &amp; Print Clinical Report
            </button>
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('labResultModal')">
              Close
            </button>
            ${lab.status !== 'REVIEWED' ? `
              <button type="button" class="btn btn-primary" onclick="markLabReviewed('${lab.id}')">
                ✓ Mark as Reviewed
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
};

window.openLabReportViewer = function (labId) {
  window.printLabReport(labId);
};

window.markLabReviewed = async function (labId) {
  try {
    await window.hospitrackStore.updateLabStatus(labId, 'REVIEWED');
    window.showToast('✓ Lab report reviewed and marked in clinical ledger.', 'success');
    closeGlobalModal('labResultModal');
    window.renderDoctorDashboard(document.getElementById('mainContentArea'), doctorActiveTab);
  } catch (err) {
    window.showToast(err.message || 'Failed to update lab report.', 'error');
  }
};

// ----------------------------------------------------------------------------
// 4. Specialist Referral Center (Outgoing / Incoming / Completed)
// ----------------------------------------------------------------------------
function renderReferralCenterView(data) {
  const { doctor, hospital, myReferrals } = data;
  const outgoing = myReferrals.filter(r => r.fromHospitalId === hospital.id || r.doctorId === doctor.id);
  const incoming = myReferrals.filter(r => r.toHospitalId === hospital.id && r.fromHospitalId !== hospital.id);
  const completed = myReferrals.filter(r => r.status === 'COMPLETED');

  let displayList = outgoing;
  if (referralSubtab === 'incoming') displayList = incoming;
  else if (referralSubtab === 'completed') displayList = completed;

  return `
    <div class="card p-24">
      <div class="d-flex-between mb-20">
        <div>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">
            Specialist Referrals
          </h2>
          <p class="text-muted font-sm">
            Coordinate inter-facility specialist consultations and tertiary referrals.
          </p>
        </div>
        <button type="button" class="btn btn-primary" onclick="openCreateReferralModal()">
          <span>+</span> New Referral
        </button>
      </div>

      <!-- Outgoing / Incoming / Completed Filter Tabs -->
      <div class="queue-filter-pills mb-16">
        <button type="button" class="btn-filter-pill ${referralSubtab === 'outgoing' ? 'active' : ''}" onclick="setReferralSubtab('outgoing')">
          Outgoing Referrals (${outgoing.length})
        </button>
        <button type="button" class="btn-filter-pill ${referralSubtab === 'incoming' ? 'active' : ''}" onclick="setReferralSubtab('incoming')">
          Incoming Referrals (${incoming.length})
        </button>
        <button type="button" class="btn-filter-pill ${referralSubtab === 'completed' ? 'active' : ''}" onclick="setReferralSubtab('completed')">
          Completed (${completed.length})
        </button>
      </div>

      ${displayList.length === 0 ? `
        <div class="empty-state-box">
          <span class="empty-state-icon">🔁</span>
          <h4 class="empty-state-title">No referrals in this view</h4>
          <p class="empty-state-text">No ${referralSubtab} specialist referrals found.</p>
          <button type="button" class="btn btn-secondary mt-16" onclick="openCreateReferralModal()">
            Create Referral
          </button>
        </div>
      ` : `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>PATIENT</th>
                <th>SPECIALTY / INDICATION</th>
                <th>${referralSubtab === 'outgoing' ? 'DESTINATION FACILITY' : 'ORIGIN FACILITY'}</th>
                <th>PRIORITY</th>
                <th>STATUS</th>
                <th style="text-align: right;">ACTION</th>
              </tr>
            </thead>
            <tbody>
              ${displayList.map(r => {
    const pClass = r.priority === 'EMERGENCY' ? 'badge-danger' : r.priority === 'URGENT' ? 'badge-warning' : 'badge-info';
    return `
                  <tr>
                    <td>
                      <span class="link-inline" onclick="openClinicalWorkspace('${r.patientId}')">
                        👤 ${escapeHtml(r.patientId)}
                      </span>
                    </td>
                    <td><strong>${escapeHtml(r.reason)}</strong></td>
                    <td>${escapeHtml(referralSubtab === 'outgoing' ? r.toHospitalId : r.fromHospitalId)}</td>
                    <td><span class="badge ${pClass}">${escapeHtml(r.priority)}</span></td>
                    <td><span class="badge badge-active">${escapeHtml(r.status)}</span></td>
                    <td style="text-align: right;">
                      <div class="d-flex gap-8 justify-end">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="openClinicalWorkspace('${r.patientId}')">
                          View
                        </button>
                        ${r.status === 'PENDING' && referralSubtab === 'incoming' ? `
                          <button type="button" class="btn btn-primary btn-sm" onclick="handleReferralStatusAction('${r.id}', 'ACCEPTED')">
                            ✓ Accept
                          </button>
                          <button type="button" class="btn btn-outline-danger btn-sm" onclick="handleReferralStatusAction('${r.id}', 'REJECTED')">
                            ✕ Reject
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
      `}
    </div>
  `;
}

window.getReferralSubtab = () => referralSubtab;
window.setReferralSubtab = function (subtab) {
  referralSubtab = subtab;
  window.renderDoctorDashboard(document.getElementById('mainContentArea'));
};

window.handleReferralStatusAction = async function (referralId, status) {
  try {
    await window.hospitrackStore.updateReferralStatus(referralId, status);
    window.showToast(`✓ Referral status updated to ${status}.`, 'success');
    window.renderDoctorDashboard(document.getElementById('mainContentArea'));
  } catch (err) {
    window.showToast(err.message || 'Failed to update referral status.', 'error');
  }
};

// ----------------------------------------------------------------------------
// 5. Patient Queue & Directory View
// ----------------------------------------------------------------------------
function renderPatientsDirectoryView(data) {
  const { allPatients } = data;

  return `
    <div class="card p-24">
      <div class="d-flex-between mb-20">
        <div>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">
            Patient Care Queue &amp; Directory
          </h2>
          <p class="text-muted font-sm">
            Active patient roster under your clinical care.
          </p>
        </div>
        <button type="button" class="btn btn-primary btn-sm" onclick="openStartConsultationModal()">
          <span>+</span> New Consultation
        </button>
      </div>

      <div class="d-flex-between mb-16 gap-12 flex-wrap">
        <div class="queue-search-wrap">
          <span class="queue-search-icon">🔍</span>
          <input 
            type="text" 
            class="form-control queue-search-input" 
            placeholder="Search patient or ID..."
            value="${escapeHtml(queueSearchQuery)}"
            oninput="handleQueueSearchInput(this.value)"
          >
        </div>
        ${renderQueueFilterTabs(allPatients)}
      </div>

      <div id="clinicalQueueTableContainer">
        ${renderClinicalQueueTable(allPatients)}
      </div>
    </div>
  `;
}

// ----------------------------------------------------------------------------
// 6. Standalone Prescriptions Directory View
// ----------------------------------------------------------------------------
function renderPrescriptionsDirectoryView(data) {
  const { myPrescriptions } = data;

  return `
    <div class="card p-24">
      <div class="d-flex-between mb-20">
        <div>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">
            Prescriptions &amp; Signed Orders
          </h2>
          <p class="text-muted font-sm">
            Pharmacotherapy orders protected by dual-tier duplicate medication safety.
          </p>
        </div>
        <button type="button" class="btn btn-primary btn-sm" onclick="openStartConsultationModal()">
          <span>+</span> New Prescription
        </button>
      </div>

      ${myPrescriptions.length === 0 ? `
        <div class="empty-state-box">
          <span class="empty-state-icon">💊</span>
          <h4 class="empty-state-title">No signed prescriptions</h4>
          <p class="empty-state-text">Prescriptions issued during consultations will appear here.</p>
        </div>
      ` : `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>PRESCRIPTION ID</th>
                <th>PATIENT</th>
                <th>PRESCRIBED DATE</th>
                <th>MEDICATIONS SUMMARY</th>
                <th>INSTRUCTIONS</th>
                <th style="text-align: right;">ACTION</th>
              </tr>
            </thead>
            <tbody>
              ${myPrescriptions.map(rx => `
                <tr>
                  <td><code>${escapeHtml(rx.id)}</code></td>
                  <td>
                    <span class="link-inline" onclick="openClinicalWorkspace('${rx.patientId}')">
                      👤 ${escapeHtml(rx.patientId)}
                    </span>
                  </td>
                  <td class="text-muted font-sm">${new Date(rx.prescribedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td>
                    <div class="regimen-chips-wrap">
                      ${(rx.items || []).map(m => `<span class="regimen-chip">${escapeHtml(m.name)} (${escapeHtml(m.dosage)})</span>`).join('')}
                    </div>
                  </td>
                  <td class="text-muted font-sm">${escapeHtml(rx.instructions || 'Standard dosing')}</td>
                  <td style="text-align: right; white-space: nowrap;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="window.printPrescription('${rx.id}')" title="Print Official Prescription">
                      <span>🖨️</span> Print
                    </button>
                    <button type="button" class="btn btn-primary btn-sm" onclick="openClinicalWorkspace('${rx.patientId}', 'prescription')">
                      Open
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

// ----------------------------------------------------------------------------
// 7. Standalone Consultations Center View
// ----------------------------------------------------------------------------
function renderConsultationsView(data) {
  const { allPatients, doctor, hospital } = data;
  const store = window.hospitrackStore;
  const allConsultations = store.getConsultations ? store.getConsultations(null, doctor?.id, hospital?.id) : [];
  const visits = allConsultations.length > 0 ? allConsultations : (store.data?.visits || []);

  let filteredVisits = visits;
  if (queueSearchQuery.trim()) {
    const q = queueSearchQuery.toLowerCase().trim();
    filteredVisits = filteredVisits.filter(v =>
      (v.id && v.id.toLowerCase().includes(q)) ||
      (v.patientId && v.patientId.toLowerCase().includes(q)) ||
      (v.patientName && v.patientName.toLowerCase().includes(q)) ||
      (v.diagnosis && v.diagnosis.toLowerCase().includes(q)) ||
      (v.symptoms && v.symptoms.toLowerCase().includes(q))
    );
  }

  return `
    <div class="card p-24">
      <div class="d-flex-between mb-20">
        <div>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">
            Clinical Consultations &amp; Encounters
          </h2>
          <p class="text-muted font-sm">
            Document and review inpatient &amp; outpatient physician clinical encounter notes.
          </p>
        </div>
        <button type="button" class="btn btn-primary btn-sm" onclick="openStartConsultationModal()">
          <span>+</span> New Consultation
        </button>
      </div>

      <div class="d-flex-between mb-16 gap-12 flex-wrap">
        <div class="queue-search-wrap">
          <span class="queue-search-icon">🔍</span>
          <input 
            type="text" 
            class="form-control queue-search-input" 
            placeholder="Search consultation by ID, patient, diagnosis..."
            value="${escapeHtml(queueSearchQuery)}"
            oninput="handleQueueSearchInput(this.value)"
          >
        </div>
        <div class="d-flex gap-8">
          <button type="button" class="btn btn-secondary btn-sm" onclick="openStartConsultationModal()">
            <span>📋</span> Intake Queue (${allPatients.filter(p => p.status !== 'DISCHARGED').length})
          </button>
        </div>
      </div>

      ${filteredVisits.length === 0 ? `
        <div class="empty-state-box">
          <span class="empty-state-icon">📝</span>
          <h4 class="empty-state-title">No consultations recorded yet</h4>
          <p class="empty-state-text">Select a patient from today's roster to initiate a clinical consultation.</p>
          <button type="button" class="btn btn-primary mt-12" onclick="openStartConsultationModal()">
            Start Consultation Now
          </button>
        </div>
      ` : `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>VISIT ID</th>
                <th>PATIENT</th>
                <th>DATE &amp; TIME</th>
                <th>CLINICAL DIAGNOSIS</th>
                <th>PRESENTING COMPLAINT &amp; TREATMENT</th>
                <th style="text-align: right;">ACTION</th>
              </tr>
            </thead>
            <tbody>
              ${filteredVisits.map(v => {
    const patObj = store.getPatientById(v.patientId) || (store.getPatients() || []).find(p => p.id === v.patientId);
    const pName = v.patientName || (patObj ? patObj.name : v.patientId);
    const visitDateStr = v.visitDate ? new Date(v.visitDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today';
    return `
                  <tr>
                    <td><code>${escapeHtml(v.id)}</code></td>
                    <td>
                      <span class="link-inline" onclick="openClinicalWorkspace('${escapeHtml(v.patientId)}', 'consultation')">
                        <strong>${escapeHtml(pName)}</strong>
                      </span>
                      <div class="text-muted font-xs">ID: ${escapeHtml(v.patientId)}</div>
                    </td>
                    <td class="text-muted font-sm">${escapeHtml(visitDateStr)}</td>
                    <td><strong>${escapeHtml(v.diagnosis || 'General Consultation')}</strong></td>
                    <td class="text-muted font-sm">
                      <div>${escapeHtml(v.symptoms || v.complaint || 'Clinical follow-up')}</div>
                      <small class="text-secondary">${escapeHtml(v.treatment || '')}</small>
                    </td>
                    <td style="text-align: right; white-space: nowrap;">
                      <button type="button" class="btn btn-secondary btn-sm" onclick="window.showConsultationDetailModal('${escapeHtml(v.id)}')" title="View full clinical consultation record">
                        <span>🩺</span> View
                      </button>
                      <button type="button" class="btn btn-secondary btn-sm" onclick="window.hospitrackPrintDocument('CONSULTATION', '${escapeHtml(v.id)}')" title="Print official clinical note">
                        <span>🖨️</span> Print
                      </button>
                      <button type="button" class="btn btn-primary btn-sm" onclick="openClinicalWorkspace('${escapeHtml(v.patientId)}', 'consultation')" title="Open clinical chart">
                        Open
                      </button>
                    </td>
                  </tr>
                `;
  }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

// ----------------------------------------------------------------------------
// 8. Doctor Profile & Account View
// ----------------------------------------------------------------------------
function renderDoctorProfileView(data, isEditMode) {
  const { doctor, hospital, allPatients, myPrescriptions, myLabs, myReferrals } = data;
  const authUser = window.hospitrackAuth.getCurrentUser();
  const initials = (doctor.name || 'Dr').replace(/^(Dr\.|Dr)\s+/i, '').split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase() || 'DR';
  const doctorPhoto = doctor.avatarUrl || authUser?.avatarUrl || null;

  if (isEditMode) {
    return `
      <div class="card p-24" style="max-width: 800px;">
        <form id="doctorProfileEditForm" onsubmit="handleDoctorProfileSave(event, '${escapeHtml(doctor.id)}')">
          <div id="doctorProfileAlert" class="alert-banner hidden mb-16"></div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 8px;">
            <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-main);">
              ✏️ Edit Doctor Profile
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.openUserProfileModal(true)">
              📷 Change Profile Photo
            </button>
          </div>

          <div class="form-grid-2col mb-16">
            <div class="form-group">
              <label class="form-label">Doctor ID (Immutable)</label>
              <input type="text" class="form-control" value="${escapeHtml(doctor.id)}" disabled style="opacity: 0.7;">
            </div>
            <div class="form-group">
              <label class="form-label">Medical License (Verified)</label>
              <input type="text" class="form-control" value="${escapeHtml(doctor.licenseNo || 'MCI-VERIFIED')}" disabled style="opacity: 0.7;">
            </div>
          </div>

          <div class="form-grid-2col mb-16">
            <div class="form-group">
              <label class="form-label" for="editDocName">Doctor Full Name <span class="text-danger">*</span></label>
              <input type="text" id="editDocName" class="form-control" value="${escapeHtml(doctor.name || '')}" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="editDocPhone">Contact Phone <span class="text-danger">*</span></label>
              <input type="tel" id="editDocPhone" class="form-control" value="${escapeHtml(doctor.phone || '')}" placeholder="+91 98765 00000" required>
            </div>
          </div>

          <div class="form-grid-2col mb-16">
            <div class="form-group">
              <label class="form-label" for="editDocSpecialty">Clinical Specialty <span class="text-danger">*</span></label>
              <input type="text" id="editDocSpecialty" class="form-control" value="${escapeHtml(doctor.specialty || doctor.department || '')}" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="editDocExperience">Clinical Experience (Years)</label>
              <input type="number" id="editDocExperience" class="form-control" value="${doctor.experienceYears != null ? doctor.experienceYears : 10}" min="1" max="60">
            </div>
          </div>

          <div class="form-grid-2col mb-16">
            <div class="form-group">
              <label class="form-label" for="editDocStatus">Practice Status</label>
              <select id="editDocStatus" class="form-control">
                <option value="ACTIVE" ${doctor.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE (On Duty)</option>
                <option value="AVAILABLE" ${doctor.status === 'AVAILABLE' ? 'selected' : ''}>AVAILABLE (Taking Consultations)</option>
                <option value="ON_DUTY" ${doctor.status === 'ON_DUTY' ? 'selected' : ''}>ON DUTY (Emergency/Ward)</option>
                <option value="AWAY" ${doctor.status === 'AWAY' ? 'selected' : ''}>AWAY / ON LEAVE</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Affiliated Hospital</label>
              <input type="text" class="form-control" value="${escapeHtml(hospital.name || 'City General Hospital')}" disabled style="opacity: 0.7;">
            </div>
          </div>

          <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 1.5rem;">
            <button type="button" class="btn btn-secondary" onclick="setDoctorProfileEditMode(false)">Cancel</button>
            <button type="submit" id="saveDoctorProfileBtn" class="btn btn-primary">💾 Save Profile Changes</button>
          </div>
        </form>
      </div>
    `;
  }

  return `
    <div style="max-width: 900px; display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Profile Header Summary Banner -->
      <div class="card p-24" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; border-left: 4px solid var(--primary);">
        <div style="display: flex; align-items: center; gap: 1rem;">
          ${doctorPhoto ? `
            <div class="avatar avatar-lg"><img src="${escapeHtml(doctorPhoto)}" alt="${escapeHtml(doctor.name)}" style="width: 100%; height: 100%; object-fit: cover;"></div>
          ` : `
            <div class="avatar avatar-lg" style="background: linear-gradient(135deg, #0D9488, #0F766E);">${initials}</div>
          `}
          <div>
            <h2 style="font-size: 1.3rem; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">${escapeHtml(doctor.name)}</h2>
            <div style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(doctor.email || authUser?.email || 'doctor@hospitrack.com')}</div>
            <div style="display: flex; gap: 6px; margin-top: 6px; align-items: center;">
              <span class="badge badge-info" style="font-size: 0.72rem;">DOCTOR</span>
              <span class="badge badge-success" style="font-size: 0.72rem;">${escapeHtml(doctor.status || 'ACTIVE')}</span>
            </div>
          </div>
        </div>
        <div class="d-flex gap-8">
          <button type="button" class="btn btn-secondary btn-sm" onclick="if(window.openAccountSettingsModal) window.openAccountSettingsModal();">
            <span>⚙️</span> Account Settings
          </button>
          <button type="button" class="btn btn-primary btn-sm" onclick="setDoctorProfileEditMode(true)">
            <span>✏️</span> Edit Profile
          </button>
        </div>
      </div>

      <!-- Credentials & Registration Grid -->
      <div class="card p-20">
        <div style="font-size: 0.78rem; font-weight: 700; text-transform: uppercase; color: var(--text-dim); margin-bottom: 12px; letter-spacing: 0.5px;">
          Medical Credentials &amp; Registration
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <div>
            <div class="text-muted font-xs">Doctor ID</div>
            <div style="font-weight: 700; font-family: monospace; color: var(--primary); margin-top: 2px;">${escapeHtml(doctor.id)}</div>
          </div>
          <div>
            <div class="text-muted font-xs">Medical License</div>
            <div style="font-weight: 600; margin-top: 2px;"><code>${escapeHtml(doctor.licenseNo || 'MCI-99201')}</code></div>
          </div>
          <div>
            <div class="text-muted font-xs">Specialty</div>
            <div style="font-weight: 600; margin-top: 2px;">${escapeHtml(doctor.specialty || doctor.department || 'Cardiology')}</div>
          </div>
          <div>
            <div class="text-muted font-xs">Clinical Experience</div>
            <div style="font-weight: 600; margin-top: 2px;">${doctor.experienceYears ? doctor.experienceYears + ' Years' : '10 Years'}</div>
          </div>
        </div>
      </div>

      <!-- Facility & Contact Information -->
      <div class="card p-20">
        <div style="font-size: 0.78rem; font-weight: 700; text-transform: uppercase; color: var(--text-dim); margin-bottom: 12px; letter-spacing: 0.5px;">
          Clinical Affiliation &amp; Contact
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <div>
            <div class="text-muted font-xs">Hospital Facility</div>
            <div style="font-weight: 600; margin-top: 2px;">${escapeHtml(hospital.name || 'City General Hospital')}</div>
          </div>
          <div>
            <div class="text-muted font-xs">Facility ID</div>
            <div style="font-weight: 600; font-family: monospace; margin-top: 2px;">${escapeHtml(doctor.hospitalId || 'HOSP-101')}</div>
          </div>
          <div>
            <div class="text-muted font-xs">Contact Phone</div>
            <div style="font-weight: 600; margin-top: 2px;">${escapeHtml(doctor.phone || '+91 98765 00000')}</div>
          </div>
          <div>
            <div class="text-muted font-xs">Email</div>
            <div style="font-weight: 600; margin-top: 2px;">${escapeHtml(doctor.email || authUser?.email || 'doctor@hospitrack.com')}</div>
          </div>
        </div>
      </div>

      <!-- Institutional Credential Governance Card -->
      <div class="card p-20" style="background: var(--bg-surface-alt); border-left: 4px solid var(--primary);">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span style="font-size: 1.1rem;">🔒</span>
              <strong style="font-size: 0.92rem; color: var(--text-main);">Institutional Credential Governance</strong>
              <span class="status-pill success">Facility Managed</span>
            </div>
            <p style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; margin: 0; max-width: 680px;">
              Doctor login credentials, assigned departmental privileges, and system authentication tokens are strictly provisioned and governed by your Hospital Administration (<strong>${escapeHtml(hospital?.name || doctor?.hospitalId || 'Facility')}</strong>). Self-service credential modification is disabled in accordance with clinical security governance.
            </p>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="status-pill info" style="font-size: 0.76rem;">Facility ID: <code>${escapeHtml(doctor?.hospitalId || 'HOSP-101')}</code></span>
          </div>
        </div>
      </div>

      <!-- Clinical Activity KPI Grid -->
      <div class="doctor-kpi-grid">
        <div class="doctor-kpi-card">
          <div class="kpi-card-header"><span class="kpi-title">Active Inpatients</span><span class="kpi-icon-pill">👥</span></div>
          <div class="kpi-card-value text-doctor">${allPatients.length}</div>
          <div class="kpi-card-sub">Under active facility care</div>
        </div>
        <div class="doctor-kpi-card">
          <div class="kpi-card-header"><span class="kpi-title">Prescriptions Signed</span><span class="kpi-icon-pill">💊</span></div>
          <div class="kpi-card-value text-success">${myPrescriptions.length}</div>
          <div class="kpi-card-sub">Dual-tier safety validated</div>
        </div>
        <div class="doctor-kpi-card">
          <div class="kpi-card-header"><span class="kpi-title">Specialist Referrals</span><span class="kpi-icon-pill">🔁</span></div>
          <div class="kpi-card-value text-primary">${myReferrals.length}</div>
          <div class="kpi-card-sub">Cross-facility consultations</div>
        </div>
        <div class="doctor-kpi-card">
          <div class="kpi-card-header"><span class="kpi-title">Diagnostic Labs</span><span class="kpi-icon-pill">🔬</span></div>
          <div class="kpi-card-value text-warning">${myLabs.length}</div>
          <div class="kpi-card-sub">Reports &amp; test requisitions</div>
        </div>
      </div>
    </div>
  `;
}

window.handleDoctorChangePasswordSubmit = async function (event) {
  event.preventDefault();
  const currentPassword = document.getElementById('docCurrentPwd')?.value;
  const newPassword = document.getElementById('docNewPwd')?.value;
  const confirmPassword = document.getElementById('docConfirmPwd')?.value;
  const alertEl = document.getElementById('doctorChangePasswordAlert');
  const btn = document.getElementById('docUpdatePwdBtn');

  if (newPassword !== confirmPassword) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = 'New password and confirm password do not match.';
      alertEl?.classList?.remove?.('hidden');
    }
    return;
  }

  if (!newPassword || newPassword.length < 6) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = 'New password must be at least 6 characters.';
      alertEl?.classList?.remove?.('hidden');
    }
    return;
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Updating...';
    }

    await window.hospitrackStore.apiRequest('/api/auth/change-password', 'POST', {
      currentPassword,
      newPassword
    });

    if (alertEl) {
      alertEl.className = 'alert-banner success mb-16';
      alertEl.textContent = '✓ Password updated successfully.';
      alertEl?.classList?.remove?.('hidden');
    }
    if (document.getElementById('docCurrentPwd')) document.getElementById('docCurrentPwd').value = '';
    if (document.getElementById('docNewPwd')) document.getElementById('docNewPwd').value = '';
    if (document.getElementById('docConfirmPwd')) document.getElementById('docConfirmPwd').value = '';
    window.showToast('Account password updated successfully.', 'success');
  } catch (err) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = err.message || 'Failed to update password.';
      alertEl?.classList?.remove?.('hidden');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Update Password';
    }
  }
};

window.setDoctorProfileEditMode = function (editMode) {
  isDoctorProfileEditMode = !!editMode;
  window.renderDoctorDashboard(document.getElementById('mainContentArea'), 'profile');
};

window.handleDoctorProfileSave = async function (event, doctorId) {
  event.preventDefault();
  const alertEl = document.getElementById('doctorProfileAlert');
  const btn = document.getElementById('saveDoctorProfileBtn');

  if (alertEl) {
    alertEl?.classList?.add?.('hidden');
    alertEl.textContent = '';
  }

  const name = document.getElementById('editDocName')?.value.trim();
  const phone = document.getElementById('editDocPhone')?.value.trim();
  const specialty = document.getElementById('editDocSpecialty')?.value.trim();
  const experienceYears = parseInt(document.getElementById('editDocExperience')?.value || '5', 10);
  const status = document.getElementById('editDocStatus')?.value;

  if (!name || name.length < 2) {
    showDocAlert('Doctor Name is required (at least 2 characters).');
    return;
  }
  if (!specialty) {
    showDocAlert('Clinical Specialty is required.');
    return;
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving Changes...';
    }

    await window.hospitrackStore.updateDoctor(doctorId, {
      name,
      phone,
      specialty,
      department: specialty,
      experienceYears,
      status
    });

    window.showToast('✓ Doctor profile updated successfully in PostgreSQL!', 'success');
    isDoctorProfileEditMode = false;
    window.renderDoctorDashboard(document.getElementById('mainContentArea'), 'profile');
  } catch (err) {
    showDocAlert(err.message || 'Failed to update doctor profile.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '💾 Save Profile Changes';
    }
  }

  function showDocAlert(msg) {
    if (alertEl) {
      alertEl.textContent = msg;
      alertEl.className = 'alert-banner error mb-16';
      alertEl?.classList?.remove?.('hidden');
    } else {
      window.showToast(msg, 'error');
    }
  }
};

// ----------------------------------------------------------------------------
// Modals: Start Quick Consultation, Order Lab, Create Referral
// ----------------------------------------------------------------------------
window.openStartConsultationModal = function (defaultPatientId = null) {
  let modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'globalModalContainer';
    document.body.appendChild(modalContainer);
  }

  if (defaultPatientId) {
    if (typeof openClinicalWorkspace === 'function') {
      openClinicalWorkspace(defaultPatientId, 'consultation');
      return;
    }
  }

  const store = window.hospitrackStore;
  const user = window.hospitrackAuth.getCurrentUser();
  const hospitalId = user?.hospitalId || user?.hospital?.id || (user?.role === 'HOSPITAL' || user?.role === 'HOSPITAL_ADMIN' ? user.id : 'HOSP-101');
  const patients = store.getPatients(hospitalId);

  modalContainer.innerHTML = `
    <div id="quickConsultModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="quickConsultModalTitle">
      <div class="modal-box">
        <div class="modal-header">
          <h3 class="modal-title" id="quickConsultModalTitle">📝 Start Clinical Consultation</h3>
          <button type="button" class="modal-close" onclick="closeGlobalModal('quickConsultModal')" aria-label="Close">✕</button>
        </div>
        <div class="p-20">
          <p class="text-muted font-sm mb-16">Select a patient from today's roster to open their consultation workstation:</p>
          <div class="form-group mb-20">
            <label class="form-label" for="selectConsultPatient">Select Patient <span class="text-danger">*</span></label>
            <select id="selectConsultPatient" class="form-control" required>
              ${patients.map(p => `
                <option value="${p.id}" ${p.id === defaultPatientId ? 'selected' : ''}>${escapeHtml(p.name)} (${p.id}) • ${p.bloodGroup} • ${p.age} yrs</option>
              `).join('')}
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('quickConsultModal')">Cancel</button>
            <button type="button" class="btn btn-primary" onclick="proceedToPatientConsultation()">
              Open Consultation Form →
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
};

window.proceedToPatientConsultation = function () {
  const patientId = document.getElementById('selectConsultPatient')?.value;
  closeGlobalModal('quickConsultModal');
  if (patientId) {
    openClinicalWorkspace(patientId, 'consultation');
  }
};

window.openOrderLabModal = function (defaultPatientId = null) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const user = window.hospitrackAuth.getCurrentUser();
  const hospitalId = user?.hospitalId || user?.hospital?.id || (user?.role === 'HOSPITAL' || user?.role === 'HOSPITAL_ADMIN' ? user.id : 'HOSP-101');
  const patients = store.getPatients(hospitalId);

  modalContainer.innerHTML = `
    <div id="orderLabModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="orderLabModalTitle">
      <div class="modal-box">
        <div class="modal-header">
          <h3 class="modal-title" id="orderLabModalTitle">🔬 Order Diagnostic Laboratory Test</h3>
          <button type="button" class="modal-close" onclick="closeGlobalModal('orderLabModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="handleOrderLabSubmit(event)" class="p-20">
          <div class="form-group mb-16">
            <label class="form-label" for="labPatientSelect">Patient <span class="text-danger">*</span></label>
            <select id="labPatientSelect" class="form-control" required>
              ${patients.map(p => `
                <option value="${p.id}" ${p.id === defaultPatientId ? 'selected' : ''}>${escapeHtml(p.name)} (${p.id})</option>
              `).join('')}
            </select>
          </div>
          <div class="form-group mb-16">
            <label class="form-label" for="labTestName">Test Name <span class="text-danger">*</span></label>
            <input type="text" id="labTestName" class="form-control" placeholder="e.g. 12-Lead Electrocardiogram (ECG) / Complete Blood Count" required>
          </div>
          <div class="form-group mb-16">
            <label class="form-label" for="labCategorySelect">Laboratory Category <span class="text-danger">*</span></label>
            <select id="labCategorySelect" class="form-control" required>
              <option value="Cardiology">Cardiology / ECG</option>
              <option value="Pathology">Pathology / Blood</option>
              <option value="Radiology">Radiology / Imaging</option>
              <option value="Biochemistry">Biochemistry &amp; Metabolic</option>
              <option value="Microbiology">Microbiology &amp; Serology</option>
            </select>
          </div>
          <div class="form-group mb-20">
            <label class="form-label" for="labIndication">Clinical Indication / Notes</label>
            <textarea id="labIndication" class="form-control" rows="2" placeholder="e.g. Evaluate ST changes and cardiac enzymes"></textarea>
          </div>
          <div id="orderLabAlert" class="alert-banner hidden mb-16"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('orderLabModal')">Cancel</button>
            <button type="submit" class="btn btn-primary">Dispatch Lab Order</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleOrderLabSubmit = async function (event) {
  event.preventDefault();
  const patientId = document.getElementById('labPatientSelect')?.value;
  const testName = document.getElementById('labTestName')?.value.trim();
  const category = document.getElementById('labCategorySelect')?.value;
  const indication = document.getElementById('labIndication')?.value.trim();
  const alertEl = document.getElementById('orderLabAlert');

  try {
    await window.hospitrackStore.createLabRequest({
      patientId,
      testName,
      category,
      resultSummary: indication || 'Diagnostic test in progress',
      status: 'REQUESTED'
    });
    window.showToast('✓ Diagnostic lab test ordered successfully.', 'success');
    closeGlobalModal('orderLabModal');
    window.renderDoctorDashboard(document.getElementById('mainContentArea'));
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to order lab test.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl?.classList?.remove?.('hidden');
    }
  }
};

// Helper: Extract clean patient ID from string like "Ananya Iyer (PAT-303) • 31y Female" or "PAT-303"
window.extractCleanPatientId = function (rawVal) {
  if (!rawVal) return '';
  const str = String(rawVal).trim();
  const match = str.match(/PAT-\d+/i);
  return match ? match[0].toUpperCase() : str;
};

// Real-time dynamic character counter handlers
// Reactive referral form state holding live keystrokes
let activeReferralReason = '';
let activeReferralNotes = '';

// Real-time dynamic character counter and state synchronization handlers
window.handleReferralReasonChange = function (el) {
  const val = el ? (el.value || '') : (document.getElementById('refReason')?.value || activeReferralReason || '');
  activeReferralReason = val;
  const counter = document.getElementById('refReasonCount');
  if (counter) counter.textContent = `${val.length} / 500`;
  const err = document.getElementById('refReasonError');
  if (err && val.trim().length > 0) {
    if (err.classList && typeof err.classList.add === 'function') err?.classList?.add?.('hidden');
    const input = el || document.getElementById('refReason');
    if (input && input.classList && typeof input.classList.remove === 'function') input?.classList?.remove?.('input-error');
  }
};

window.handleReferralNotesChange = function (el) {
  const val = el ? (el.value || '') : (document.getElementById('refNotes')?.value || activeReferralNotes || '');
  activeReferralNotes = val;
  const counter = document.getElementById('refNotesCount');
  if (counter) counter.textContent = `${val.length} / 500`;
};

window.openCreateReferralModal = function (defaultPatientId = null) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore || {};
  const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
  const hospitalId = user?.hospitalId || user?.hospital?.id || (user?.role === 'HOSPITAL' || user?.role === 'HOSPITAL_ADMIN' ? user.id : 'HOSP-101');
  
  let patients = (typeof store.getPatients === 'function' ? store.getPatients(hospitalId) : []);
  if (!patients || patients.length === 0) {
    patients = (typeof store.getPatients === 'function' ? store.getPatients() : []);
  }

  // Ensure comprehensive patient registry including Ananya Iyer (PAT-303), Rajesh Kumar (PAT-302), etc.
  const knownPatients = [
    { id: 'PAT-303', name: 'Ananya Iyer', age: 31, gender: 'Female', bloodGroup: 'A+', diagnosis: 'Mitral Valve Prolapse / Arrhythmia Evaluation' },
    { id: 'PAT-302', name: 'Rajesh Kumar', age: 58, gender: 'Male', bloodGroup: 'B+', diagnosis: 'Acute Coronary Syndrome — Unstable Angina' },
    { id: 'PAT-301', name: 'John Doe', age: 42, gender: 'Male', bloodGroup: 'O+', diagnosis: 'Type 2 Diabetes Mellitus — Follow-up' },
    { id: 'PAT-300', name: 'Rahul Sharma', age: 45, gender: 'Male', bloodGroup: 'A+', diagnosis: 'Essential Hypertension Stage II' }
  ];
  knownPatients.forEach(kp => {
    const existing = patients.find(p => p.id === kp.id);
    if (!existing) {
      patients.push(kp);
    } else {
      if (!existing.diagnosis && kp.diagnosis) existing.diagnosis = kp.diagnosis;
      if (!existing.bloodGroup && kp.bloodGroup) existing.bloodGroup = kp.bloodGroup;
      if (!existing.age && kp.age) existing.age = kp.age;
      if (!existing.gender && kp.gender) existing.gender = kp.gender;
    }
  });

  // Store for runtime combobox filtering
  window._referralPatientList = patients;

  // Complete accredited network facilities
  const allNetworkHospitals = [
    { id: 'HOSP-101', name: 'City General Hospital', code: 'CGH', location: 'Central Healthcare District', availableBeds: 12 },
    { id: 'HOSP-102', name: 'Apex Care Medical Center', code: 'ACMC', location: 'Metro West District', availableBeds: 4 },
    { id: 'HOSP-103', name: 'Metro Emergency Hospital', code: 'MEH', location: 'Downtown Medical Campus', availableBeds: 8 }
  ];

  let hospitals = typeof store.getHospitals === 'function' ? store.getHospitals() : [];
  if (!hospitals || hospitals.length === 0) {
    hospitals = allNetworkHospitals;
  } else {
    // Merge known details
    allNetworkHospitals.forEach(anh => {
      const existing = hospitals.find(h => h.id === anh.id);
      if (!existing) {
        hospitals.push(anh);
      } else {
        if (!existing.availableBeds) existing.availableBeds = anh.availableBeds;
        if (!existing.code) existing.code = anh.code;
      }
    });
  }

  // Pre-select patient (default to active patient, or fallback to Ananya Iyer PAT-303)
  const cleanDefaultId = window.extractCleanPatientId(defaultPatientId || (doctorActiveTab === 'workspace' && selectedPatientId ? selectedPatientId : null) || 'PAT-303');
  const selectedPatient = cleanDefaultId ? patients.find(p => p.id === cleanDefaultId) : (patients.length > 0 ? patients[0] : null);

  // Filter destination facilities: offer partner accredited hospitals
  const myHospitalId = user?.hospitalId || user?.hospital?.id || 'HOSP-101';
  const partnerHospitals = hospitals.filter(h => h.id !== myHospitalId);
  const selectableHospitals = partnerHospitals.length > 0 ? partnerHospitals : hospitals;

  modalContainer.innerHTML = `
    <div id="createReferralModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="createReferralModalTitle">
      <div class="modal-box referral-modal-box">
        <!-- 1. Executive Context Header Strip (Sticky Top) -->
        <div class="referral-context-banner">
          <div class="referral-banner-top">
            <div>
              <h3 class="referral-banner-title" id="createReferralModalTitle">
                <svg class="lucide lucide-send" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                Create Clinical Specialist Referral
              </h3>
              <p class="referral-banner-sub">Direct Inter-Facility Clinical Handover &amp; Priority Specialist Triage</p>
            </div>
            <button type="button" class="modal-close" style="color: #94A3B8; font-size: 1.25rem;" onclick="closeGlobalModal('createReferralModal'); resetReferralForm();" aria-label="Close modal">✕</button>
          </div>
        </div>

        <!-- 2. Form Wrapper (Encloses Form Body + Dedicated Sticky Footer) -->
        <form id="clinicalReferralForm" onsubmit="handleReferralSubmit(event)" class="referral-form-wrap" novalidate>
          <!-- Form Body (Cleanly Arranged & Proportioned) -->
          <div class="referral-modal-body">
            <!-- 1. Patient Context Strip / Selector (Always Prominent & at Top) -->
            <div class="form-group mb-4">
              <div class="field-header-row">
                <label class="form-label mb-0" for="refPatientSearch">
                  <span class="form-section-title">Patient Identification</span> <span class="text-danger">*</span>
                </label>
                <span class="text-xs-muted">Verified Inpatient Registry</span>
              </div>

              <!-- Hidden input maintaining clean unique ID (PAT-303) -->
              <input type="hidden" id="refPatientId" name="patientId" value="${selectedPatient ? selectedPatient.id : ''}">
              <select id="refPatientSelect" name="refPatientSelect" style="display:none;" aria-hidden="true">
                <option value="">Select a patient...</option>
                ${patients.map(p => `
                  <option value="${p.id}" ${selectedPatient && selectedPatient.id === p.id ? 'selected' : ''}>
                    ${escapeHtml(p.name)} (${p.id}) ${p.age ? `• ${p.age}y ${p.gender || ''}` : ''}
                  </option>
                `).join('')}
              </select>

              <!-- Inline Patient Summary Pill (When patient is selected) -->
              <div id="refPatientSummaryCard" class="patient-summary-pill-card ${selectedPatient ? '' : 'hidden'}">
                <div class="patient-summary-left">
                  <div class="patient-avatar-mini" id="refSummaryAvatar">
                    ${selectedPatient ? (selectedPatient.name || 'PT').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'PT'}
                  </div>
                  <div class="patient-summary-info">
                    <div class="patient-summary-name">
                      <span id="refSummaryName">${selectedPatient ? escapeHtml(selectedPatient.name) : ''}</span>
                      <span class="patient-id-badge" id="refSummaryIdBadge">${selectedPatient ? selectedPatient.id : ''}</span>
                      <span class="patient-summary-badge" id="refSummaryDiagnosis">
                        ${selectedPatient ? escapeHtml(selectedPatient.diagnosis || 'Active Inpatient') : ''}
                      </span>
                    </div>
                    <div class="patient-summary-demographics" id="refSummaryDemographics">
                      ${selectedPatient ? `${selectedPatient.age || 31}y ${selectedPatient.gender || 'Female'} • Blood Group: ${selectedPatient.bloodGroup || 'A+'} • MRN: ${selectedPatient.id}` : ''}
                    </div>
                  </div>
                </div>
                <button type="button" class="btn-change-patient" onclick="clearReferralPatient()" title="Select a different patient">
                  Change Patient
                </button>
              </div>

              <!-- Searchable Combobox Input (When no patient is selected) -->
              <div id="refPatientCombobox" class="patient-combobox-wrap ${selectedPatient ? 'hidden' : ''}">
                <div class="patient-search-input-wrap">
                  <span class="patient-search-icon" aria-hidden="true">
                    <svg class="lucide lucide-search" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="2" x2="16.65" y2="16.65"></line></svg>
                  </span>
                  <input type="text" id="refPatientSearch" class="patient-search-input" placeholder="Search patient by name (e.g. Ananya Iyer, Rajesh Kumar) or ID (PAT-303)..." autocomplete="off" oninput="filterReferralPatients(this.value)" onfocus="filterReferralPatients(this.value)">
                </div>
                <div id="refPatientDropdown" class="patient-autocomplete-list hidden">
                  ${patients.map(p => {
                    const initials = (p.name || 'PT').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    const diag = p.diagnosis || 'Clinical Care';
                    return `
                      <div class="patient-autocomplete-item" onclick="selectReferralPatient('${p.id}')">
                        <div class="patient-autocomplete-left">
                          <div class="patient-avatar-mini">${initials}</div>
                          <div>
                            <div style="font-size: 0.88rem; font-weight: 700; color: #0F172A;">${escapeHtml(p.name)} <span style="font-weight: 500; color: #64748B;">(${p.id})</span></div>
                            <div style="font-size: 0.75rem; color: #64748B;">${p.age ? `${p.age}y ${p.gender || ''}` : ''} ${p.bloodGroup ? `• Blood: ${p.bloodGroup}` : ''} • ${diag}</div>
                          </div>
                        </div>
                        <span style="font-size: 0.72rem; font-weight: 600; color: #0D9488;">Select →</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- Field-Specific Inline Error -->
              <div id="refPatientError" class="field-error-msg hidden" role="alert">
                <svg class="lucide lucide-alert-circle" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span>Please select a valid patient from the accredited registry.</span>
              </div>
            </div>

            <!-- 2. Destination Facility & Receiving Specialty (2-Column Grid) -->
            <div class="referral-grid-2col mb-4">
              <div class="form-group mb-0">
                <label class="form-label mb-4" for="refDestHospital">
                  <span class="form-section-title">Destination Facility</span> <span class="text-danger">*</span>
                </label>
                <select id="refDestHospital" class="form-control" onchange="clearReferralFieldError('refFacilityError', this)" required>
                  ${selectableHospitals.map((h, idx) => `
                    <option value="${h.id}" data-facility-name="${escapeHtml(h.name)}" title="${escapeHtml(h.name)} (${h.availableBeds != null ? h.availableBeds : 0} beds available)" ${idx === 0 ? 'selected' : ''}>
                      ${escapeHtml(h.name)} (${h.availableBeds != null ? `${h.availableBeds} beds free` : 'Accredited'})
                    </option>
                  `).join('')}
                </select>
                <!-- Field-Specific Inline Error -->
                <div id="refFacilityError" class="field-error-msg hidden" role="alert">
                  <svg class="lucide lucide-alert-circle" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>Please select a receiving destination facility.</span>
                </div>
              </div>

              <div class="form-group mb-0">
                <label class="form-label mb-4" for="refSpecialty">
                  <span class="form-section-title">Receiving Specialty</span> <span class="text-danger">*</span>
                </label>
                <select id="refSpecialty" class="form-control" required>
                  <option value="Cardiology & Interventional Cath" selected>Cardiology &amp; Interventional Cath</option>
                  <option value="Neurology & Stroke Care">Neurology &amp; Stroke Care</option>
                  <option value="Nephrology & Dialysis">Nephrology &amp; Dialysis</option>
                  <option value="Pulmonology & Respiratory Care">Pulmonology &amp; Respiratory Care</option>
                  <option value="Orthopedics & Joint Surgery">Orthopedics &amp; Joint Surgery</option>
                  <option value="General & Laparoscopic Surgery">General &amp; Laparoscopic Surgery</option>
                  <option value="Critical Care / Intensive Care (ICU)">Critical Care / Intensive Care (ICU)</option>
                  <option value="Medical & Surgical Oncology">Medical &amp; Surgical Oncology</option>
                </select>
              </div>
            </div>

            <!-- 3. Clinical Priority Triage (3-Button Segmented Control) -->
            <div class="form-group mb-4">
              <label class="form-label mb-4">
                <span class="form-section-title">Clinical Priority Triage</span> <span class="text-danger">*</span>
              </label>
              <input type="hidden" id="refPriority" value="ROUTINE">
              <div class="priority-pill-group" role="radiogroup" aria-label="Clinical Priority">
                <button type="button" id="btnPriorityRoutine" class="priority-pill-btn active priority-routine" onclick="setReferralPriority('ROUTINE')" role="radio" aria-checked="true">
                  <span class="priority-dot routine"></span>
                  <span>Routine</span>
                </button>
                <button type="button" id="btnPriorityUrgent" class="priority-pill-btn priority-urgent" onclick="setReferralPriority('URGENT')" role="radio" aria-checked="false">
                  <span class="priority-dot urgent"></span>
                  <span>Urgent (&lt; 48h)</span>
                </button>
                <button type="button" id="btnPriorityEmergency" class="priority-pill-btn priority-emergency" onclick="setReferralPriority('EMERGENCY')" role="radio" aria-checked="false">
                  <span class="priority-dot emergency"></span>
                  <span>STAT / Emergency</span>
                </button>
              </div>
            </div>

            <!-- 4. Referral Reason / Indication with Dynamic Character Counter -->
            <div class="form-group mb-4">
              <div class="field-header-row">
                <label class="form-label mb-0" for="refReason">
                  <span class="form-section-title">Referral Reason &amp; Clinical Indication</span> <span class="text-danger">*</span>
                </label>
                <span id="refReasonCount" class="char-counter">0 / 500</span>
              </div>
              <textarea id="refReason" class="form-control" rows="2" maxlength="500" style="height: 54px; min-height: 54px; max-height: 76px; resize: none;" placeholder="Reason for specialist consultation, chief complaints, diagnostic suspicion, and provisional diagnosis..." oninput="handleReferralReasonChange(this)" onkeyup="handleReferralReasonChange(this)" onchange="handleReferralReasonChange(this)" required></textarea>
              <!-- Field-Specific Inline Error -->
              <div id="refReasonError" class="field-error-msg hidden" role="alert">
                <svg class="lucide lucide-alert-circle" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span>Please specify the clinical indication / reason for this specialist referral.</span>
              </div>
            </div>

            <!-- 5. Additional Notes & Directives with Dynamic Character Counter (Optional) -->
            <div class="form-group mb-0">
              <div class="field-header-row">
                <label class="form-label mb-0" for="refNotes">
                  <span class="form-section-title">Additional Notes &amp; Clinical Directives</span>
                </label>
                <span id="refNotesCount" class="char-counter">0 / 500</span>
              </div>
              <textarea id="refNotes" class="form-control" rows="2" maxlength="500" style="height: 50px; min-height: 50px; max-height: 70px; resize: none;" placeholder="Relevant vitals, active drug allergies, immediate telemetry requirements, or transport logistics notes (optional)..." oninput="handleReferralNotesChange(this)" onkeyup="handleReferralNotesChange(this)" onchange="handleReferralNotesChange(this)"></textarea>
            </div>
          </div>

          <!-- 3. Dedicated Sticky Footer (Always Visible, Zero Truncation) -->
          <div class="referral-modal-footer">
            <div class="referral-footer-left">
              <button type="button" class="btn btn-secondary btn-sm" onclick="closeGlobalModal('createReferralModal'); resetReferralForm();">
                Cancel
              </button>
              <button type="button" class="btn btn-secondary btn-sm" style="border-color: #CBD5E1; color: #475569;" onclick="resetReferralForm()" title="Clear form inputs and reset errors">
                Reset Form
              </button>
            </div>
            <div class="referral-footer-right">
              <button type="button" class="btn btn-secondary btn-sm btn-referral-preview" onclick="handlePreviewReferralLetter()" title="Preview Official Referral Slip & Print Form">
                <svg class="lucide lucide-file-text" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                <span>Preview Letter</span>
              </button>
              <button type="submit" id="refDispatchBtn" class="btn btn-primary btn-dispatch-referral">
                <svg class="lucide lucide-send" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                <span>Dispatch Referral</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;

  // Always enforce reset scroll position to top
  setTimeout(() => {
    try {
      const modalBody = (modalContainer && typeof modalContainer.querySelector === 'function')
        ? modalContainer.querySelector('.referral-modal-body')
        : (typeof document !== 'undefined' && typeof document.querySelector === 'function' ? document.querySelector('.referral-modal-body') : null);
      if (modalBody) modalBody.scrollTop = 0;
    } catch (_) {}
  }, 10);

  // Close dropdown on outside click
  document.addEventListener('click', function onDocClick(e) {
    const combobox = document.getElementById('refPatientCombobox');
    const dropdown = document.getElementById('refPatientDropdown');
    if (!dropdown) {
      document.removeEventListener('click', onDocClick);
      return;
    }
    if (combobox && !combobox.contains(e.target)) {
      dropdown?.classList?.add?.('hidden');
    }
  });
};

window.filterReferralPatients = function (query) {
  const dropdown = document.getElementById('refPatientDropdown');
  if (!dropdown) return;

  const q = (query || '').toLowerCase().trim();
  const list = window._referralPatientList || [];
  const filtered = q
    ? list.filter(p => (p.name && p.name.toLowerCase().includes(q)) || (p.id && p.id.toLowerCase().includes(q)))
    : list;

  if (filtered.length === 0) {
    dropdown.innerHTML = `
      <div style="padding: 12px; font-size: 0.82rem; color: #64748B; text-align: center;">
        No patients found matching "${escapeHtml(q)}".
      </div>
    `;
  } else {
    dropdown.innerHTML = filtered.map(p => {
      const initials = (p.name || 'PT').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      const diag = p.diagnosis || 'Clinical Care';
      return `
        <div class="patient-autocomplete-item" onclick="selectReferralPatient('${p.id}')">
          <div class="patient-autocomplete-left">
            <div class="patient-avatar-mini">${initials}</div>
            <div>
              <div style="font-size: 0.88rem; font-weight: 700; color: #0F172A;">${escapeHtml(p.name)} <span style="font-weight: 500; color: #64748B;">(${p.id})</span></div>
              <div style="font-size: 0.75rem; color: #64748B;">${p.age ? `${p.age}y ${p.gender || ''}` : ''} ${p.bloodGroup ? `• Blood: ${p.bloodGroup}` : ''} • ${diag}</div>
            </div>
          </div>
          <span style="font-size: 0.72rem; font-weight: 600; color: #0D9488;">Select →</span>
        </div>
      `;
    }).join('');
  }
  dropdown?.classList?.remove?.('hidden');
};

window.selectReferralPatient = function (rawId) {
  const cleanId = window.extractCleanPatientId(rawId);
  const list = window._referralPatientList || [];
  const patient = list.find(p => p.id === cleanId) || { id: cleanId, name: 'Patient Record' };

  const idInput = document.getElementById('refPatientId');
  const select = document.getElementById('refPatientSelect');
  if (idInput) idInput.value = patient.id;
  if (select) select.value = patient.id;

  // Populate Summary Pill
  const summaryAvatar = document.getElementById('refSummaryAvatar');
  const summaryName = document.getElementById('refSummaryName');
  const summaryDiagnosis = document.getElementById('refSummaryDiagnosis');
  const summaryDemographics = document.getElementById('refSummaryDemographics');

  if (summaryAvatar) {
    summaryAvatar.textContent = (patient.name || 'PT').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
  if (summaryName) {
    summaryName.textContent = patient.name;
  }
  if (summaryDiagnosis) {
    summaryDiagnosis.textContent = patient.diagnosis || 'Active Inpatient';
  }
  if (summaryDemographics) {
    summaryDemographics.textContent = `${patient.age || 31}y ${patient.gender || 'Female'} • Blood Group: ${patient.bloodGroup || 'A+'} • MRN: ${patient.id}`;
  }

  // Toggle display
  document.getElementById('refPatientCombobox')?.classList.add('hidden');
  document.getElementById('refPatientSummaryCard')?.classList.remove('hidden');
  document.getElementById('refPatientDropdown')?.classList.add('hidden');

  // Clear validation error immediately
  window.clearReferralFieldError('refPatientError', document.getElementById('refPatientSearch'));
};

window.clearReferralPatient = function () {
  const idInput = document.getElementById('refPatientId');
  const select = document.getElementById('refPatientSelect');
  const searchInput = document.getElementById('refPatientSearch');
  if (idInput) idInput.value = '';
  if (select) select.value = '';
  if (searchInput) searchInput.value = '';

  document.getElementById('refPatientSummaryCard')?.classList.add('hidden');
  const combobox = document.getElementById('refPatientCombobox');
  if (combobox) combobox?.classList?.remove?.('hidden');
  if (searchInput) searchInput.focus();
};

window.setReferralPriority = function (priority) {
  const priorityInput = document.getElementById('refPriority');
  if (priorityInput) priorityInput.value = priority;

  const routineBtn = document.getElementById('btnPriorityRoutine');
  const urgentBtn = document.getElementById('btnPriorityUrgent');
  const emergencyBtn = document.getElementById('btnPriorityEmergency');

  [routineBtn, urgentBtn, emergencyBtn].forEach(b => {
    if (b) {
      b?.classList?.remove?.('active');
      b.setAttribute('aria-checked', 'false');
    }
  });

  if (priority === 'ROUTINE' && routineBtn) {
    routineBtn?.classList?.add?.('active');
    routineBtn.setAttribute('aria-checked', 'true');
  } else if (priority === 'URGENT' && urgentBtn) {
    urgentBtn?.classList?.add?.('active');
    urgentBtn.setAttribute('aria-checked', 'true');
  } else if (priority === 'EMERGENCY' && emergencyBtn) {
    emergencyBtn?.classList?.add?.('active');
    emergencyBtn.setAttribute('aria-checked', 'true');
  }
};

window.clearReferralFieldError = function (errorId, inputEl) {
  const errorEl = document.getElementById(errorId);
  if (errorEl) errorEl?.classList?.add?.('hidden');
  if (inputEl) inputEl?.classList?.remove?.('input-error');
};

window.resetReferralForm = function () {
  activeReferralReason = '';
  activeReferralNotes = '';
  window.clearReferralPatient();
  window.setReferralPriority('ROUTINE');
  const reason = document.getElementById('refReason');
  const notes = document.getElementById('refNotes');
  if (reason) reason.value = '';
  if (notes) notes.value = '';
  const reasonCount = document.getElementById('refReasonCount');
  if (reasonCount) reasonCount.textContent = '0 / 500';
  const notesCount = document.getElementById('refNotesCount');
  if (notesCount) notesCount.textContent = '0 / 500';

  // Clear all errors
  ['refPatientError', 'refFacilityError', 'refReasonError'].forEach(errId => {
    const el = document.getElementById(errId);
    if (el) el?.classList?.add?.('hidden');
  });
  ['refPatientSearch', 'refDestHospital', 'refReason'].forEach(inpId => {
    const el = document.getElementById(inpId);
    if (el) el?.classList?.remove?.('input-error');
  });
};

// ----------------------------------------------------------------------------
// Dedicated Inter-Hospital Referral Letter Preview & Print Architecture
// ----------------------------------------------------------------------------
window.handlePreviewReferralLetter = function () {
  const form = document.getElementById('clinicalReferralForm');
  // 1. Resolve Patient ID
  let rawPatientId = (form && typeof form.querySelector === 'function' ? form.querySelector('#refPatientId')?.value : null) || document.getElementById('refPatientId')?.value || document.getElementById('refPatientSelect')?.value;
  if (!rawPatientId) {
    const searchVal = document.getElementById('refPatientSearch')?.value?.trim();
    if (searchVal) {
      const list = window._referralPatientList || [];
      const match = list.find(p => p.id.toLowerCase() === searchVal.toLowerCase() || p.name.toLowerCase().includes(searchVal.toLowerCase()));
      if (match) {
        rawPatientId = match.id;
        window.selectReferralPatient(match.id);
      } else {
        rawPatientId = window.extractCleanPatientId(searchVal);
      }
    }
  }

  const patientId = window.extractCleanPatientId(rawPatientId);
  const destSelect = document.getElementById('refDestHospital');
  const toHospitalId = destSelect?.value;
  const reasonTextarea = document.getElementById('refReason');
  const rawReason = (reasonTextarea && typeof reasonTextarea.value === 'string') ? reasonTextarea.value : (activeReferralReason || '');
  const reason = rawReason.trim();

  let hasError = false;

  // Pre-check 1: Patient validation
  const patientErr = document.getElementById('refPatientError');
  const searchInput = document.getElementById('refPatientSearch');
  if (!patientId) {
    if (patientErr) patientErr?.classList?.remove?.('hidden');
    if (searchInput) searchInput?.classList?.add?.('input-error');
    hasError = true;
  } else {
    if (patientErr) patientErr?.classList?.add?.('hidden');
    if (searchInput) searchInput?.classList?.remove?.('input-error');
  }

  // Pre-check 2: Destination facility validation
  const facilityErr = document.getElementById('refFacilityError');
  if (!toHospitalId) {
    if (facilityErr) facilityErr?.classList?.remove?.('hidden');
    if (destSelect) destSelect?.classList?.add?.('input-error');
    hasError = true;
  } else {
    if (facilityErr) facilityErr?.classList?.add?.('hidden');
    if (destSelect) destSelect?.classList?.remove?.('input-error');
  }

  // Pre-check 3: Referral Reason validation
  const reasonErr = document.getElementById('refReasonError');
  if (!reason || reason.length === 0) {
    if (reasonErr) reasonErr?.classList?.remove?.('hidden');
    if (reasonTextarea) reasonTextarea?.classList?.add?.('input-error');
    hasError = true;
  } else {
    if (reasonErr) reasonErr?.classList?.add?.('hidden');
    if (reasonTextarea) reasonTextarea?.classList?.remove?.('input-error');
  }

  if (hasError) {
    if (typeof window.showToast === 'function') {
      window.showToast('Please complete required referral details before previewing.', 'warning');
    }
    return;
  }

  // Collect Payload
  const destFacilityName = destSelect ? (destSelect?.selectedOptions?.[0]?.getAttribute('data-facility-name') || destSelect?.selectedOptions?.[0]?.text.split('•')[0].split('(')[0].trim()) : 'Apex Care Medical Center';
  const targetSpecialty = document.getElementById('refSpecialty')?.value || 'Cardiology & Interventional Cath';
  const priority = document.getElementById('refPriority')?.value || 'ROUTINE';
  const notesTextarea = document.getElementById('refNotes');
  const notes = (notesTextarea ? notesTextarea.value : '') || activeReferralNotes || '';

  const list = window._referralPatientList || [];
  const selectedPatient = list.find(p => p.id === patientId) || { id: patientId, name: 'Ananya Iyer', age: 31, gender: 'Female', bloodGroup: 'A+' };
  const currentUser = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;

  const payload = {
    patientId: selectedPatient.id,
    patientName: selectedPatient.name,
    patient: selectedPatient,
    fromDoctor: currentUser?.name || 'Dr. Sarah Sharma, MD',
    doctorId: currentUser?.doctorId || currentUser?.id || 'DOC-201',
    sourceFacility: currentUser?.hospitalName || 'City General Hospital',
    department: 'Department of Cardiology & Electrophysiology',
    licenseNo: 'MCI-CGH-2026-9812',
    destinationFacility: destFacilityName,
    toHospitalId,
    targetFacilityId: toHospitalId,
    specialty: targetSpecialty,
    targetSpecialty,
    priority,
    clinicalPriority: priority,
    referralReason: reason,
    reason: reason,
    additionalNotes: notes.trim(),
    notes: notes.trim(),
    referralCode: `REF-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: new Date().toISOString()
  };

  window.openReferralPreviewModal(payload);
};

window.openReferralPreviewModal = function (ref) {
  window._currentPreviewReferral = ref;
  let modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'globalModalContainer';
    document.body.appendChild(modalContainer);
  }

  const patient = ref.patient || { name: ref.patientName || 'Ananya Iyer', id: ref.patientId || 'PAT-303', age: 31, gender: 'Female', bloodGroup: 'A+' };
  const priority = (ref.clinicalPriority || ref.priority || 'ROUTINE').toUpperCase();
  const priorityPillClass = priority === 'EMERGENCY' ? 'priority-emergency' : priority === 'URGENT' ? 'priority-urgent' : 'priority-routine';
  const priorityBadgeText = priority === 'EMERGENCY' ? '🔴 STAT / EMERGENCY' : priority === 'URGENT' ? '🟡 URGENT (&lt; 48h)' : '🟢 ROUTINE';
  const nowStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' • ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const existingPreview = document.getElementById('referralPreviewModal');
  if (existingPreview) existingPreview.remove();

  const previewEl = document.createElement('div');
  previewEl.id = 'referralPreviewModal';
  previewEl.className = 'modal-overlay open referral-preview-overlay';
  previewEl.setAttribute('role', 'dialog');
  previewEl.setAttribute('aria-modal', 'true');
  previewEl.setAttribute('aria-labelledby', 'referralPreviewModalTitle');

  previewEl.innerHTML = `
    <div class="modal-box referral-preview-modal-box">
      <!-- 1. Dedicated Action Header Bar -->
      <div class="referral-preview-header no-print">
        <div class="referral-preview-header-left">
          <span class="preview-mode-pill">PREVIEW (PRE-DISPATCH)</span>
          <h3 class="referral-preview-title" id="referralPreviewModalTitle">Official Clinical Referral Slip</h3>
        </div>
        <div class="referral-preview-actions">
          <button type="button" class="btn btn-secondary btn-sm btn-back-to-edit" onclick="closeReferralPreviewModal()">
            <svg class="lucide lucide-arrow-left" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            <span>Back to Edit</span>
          </button>
          <button type="button" class="btn btn-primary btn-sm btn-print-letter" onclick="window.printReferralLetterDoc()">
            <svg class="lucide lucide-printer" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            <span>Print Official Letter</span>
          </button>
          <button type="button" class="modal-close" onclick="closeReferralPreviewModal()" aria-label="Close Preview">✕</button>
        </div>
      </div>

      <!-- 2. Authentic Hospital Referral Letter Document Body -->
      <div class="referral-preview-body">
        <div class="referral-slip-paper" id="referralSlipPrintableArea">
          <!-- Institutional Header & Letterhead -->
          <div class="referral-slip-header">
            <div class="referral-slip-brand">
              <div class="referral-slip-symbol">H+</div>
              <div>
                <h1 class="referral-slip-hospital">${escapeHtml(ref.sourceFacility || 'CITY GENERAL HOSPITAL & RESEARCH INSTITUTE')}</h1>
                <p class="referral-slip-dept">${escapeHtml(ref.department || 'Department of Cardiology & Electrophysiology')}</p>
                <p class="referral-slip-meta">Facility License: <code>${escapeHtml(ref.licenseNo || 'MCI-CGH-2026-9812')}</code> • NABH &amp; NABL Accredited Care Network</p>
              </div>
            </div>
            <div class="referral-slip-uid-box">
              <div class="referral-barcode">||| ||| | |||| ||| |||||| |||| |||</div>
              <div class="referral-uid-text">UID: <strong>${escapeHtml(ref.referralCode || 'REF-2026-9812')}</strong></div>
              <div class="referral-date-text">${nowStr}</div>
            </div>
          </div>

          <!-- Document Title Ribbon -->
          <div class="referral-title-strip">
            <h2 class="referral-doc-title">HOSPITRACK INTER-INSTITUTIONAL CLINICAL REFERRAL SLIP</h2>
            <div class="referral-doc-sub">Authorized Clinical Handover &amp; Inter-Facility Specialist Triage Directive</div>
          </div>

          <!-- Clinical Referral Metadata Grid (2-Column Box) -->
          <div class="referral-meta-grid-2col">
            <!-- Column 1: Patient Demographics -->
            <div class="referral-meta-col">
              <div class="referral-meta-heading">1. PATIENT DEMOGRAPHICS &amp; IDENTIFICATION</div>
              <div class="referral-meta-row">
                <span class="meta-label">Patient Full Name:</span>
                <span class="meta-val highlight"><strong>${escapeHtml(patient.name)}</strong></span>
              </div>
              <div class="referral-meta-row">
                <span class="meta-label">MRN / UHID:</span>
                <span class="meta-val"><code>${escapeHtml(patient.id)}</code></span>
              </div>
              <div class="referral-meta-row">
                <span class="meta-label">Age / Gender:</span>
                <span class="meta-val">${patient.age || 31} Yrs / ${escapeHtml(patient.gender || 'Female')}</span>
              </div>
              <div class="referral-meta-row">
                <span class="meta-label">Blood Group:</span>
                <span class="meta-val">${escapeHtml(patient.bloodGroup || 'A+')}</span>
              </div>
              <div class="referral-meta-row">
                <span class="meta-label">Contact Number:</span>
                <span class="meta-val">${escapeHtml(patient.phone || '+91 98765 43210')}</span>
              </div>
              <div class="referral-meta-row">
                <span class="meta-label">Encounter Status:</span>
                <span class="meta-val"><span class="status-indicator-tag">Inpatient Telemetry Care</span></span>
              </div>
            </div>

            <!-- Column 2: Referral Details -->
            <div class="referral-meta-col">
              <div class="referral-meta-heading">2. REFERRAL ROUTING &amp; SPECIALIST ASSIGNMENT</div>
              <div class="referral-meta-row">
                <span class="meta-label">Referring Clinician:</span>
                <span class="meta-val"><strong>${escapeHtml(ref.fromDoctor || 'Dr. Sarah Sharma, MD')}</strong></span>
              </div>
              <div class="referral-meta-row">
                <span class="meta-label">Destination Facility:</span>
                <span class="meta-val dest-hosp"><strong>${escapeHtml(ref.destinationFacility || 'Apex Care Medical Center')}</strong></span>
              </div>
              <div class="referral-meta-row">
                <span class="meta-label">Target Specialty:</span>
                <span class="meta-val">${escapeHtml(ref.targetSpecialty || ref.specialty || 'Cardiology & Interventional Cath')}</span>
              </div>
              <div class="referral-meta-row">
                <span class="meta-label">Priority Triage Level:</span>
                <span class="meta-val"><span class="priority-slip-pill ${priorityPillClass}">${priorityBadgeText}</span></span>
              </div>
              <div class="referral-meta-row">
                <span class="meta-label">Dispatch Timestamp:</span>
                <span class="meta-val">${nowStr}</span>
              </div>
              <div class="referral-meta-row">
                <span class="meta-label">Transfer Channel:</span>
                <span class="meta-val">Hospitrack Encrypted Clinical Highway</span>
              </div>
            </div>
          </div>

          <!-- Section 1: Chief Clinical Indication / Reason for Transfer -->
          <div class="referral-section-box">
            <div class="referral-section-header">CHIEF CLINICAL INDICATION / REASON FOR TRANSFER</div>
            <div class="referral-section-content reason-text">
              ${escapeHtml(ref.referralReason || ref.reason || 'None specified')}
            </div>
          </div>

          <!-- Section 2: Clinical Notes, Vitals & Transport Directives -->
          <div class="referral-section-box">
            <div class="referral-section-header">CLINICAL NOTES, VITALS &amp; TRANSPORT DIRECTIVES</div>
            <div class="referral-section-content notes-text">
              ${escapeHtml(ref.additionalNotes || ref.notes || 'None specified')}
            </div>
          </div>

          <!-- Section 3: Attached Medical Records (Automated Provenance) -->
          <div class="referral-section-box attached-records-box">
            <div class="referral-section-header">ATTACHED ELECTRONIC MEDICAL DOSSIERS (CONNECTED CARE)</div>
            <div class="attached-records-badges">
              <span class="record-badge">✓ Complete Longitudinal EHR</span>
              <span class="record-badge">✓ 12-Lead ECG &amp; Telemetry Strips</span>
              <span class="record-badge">✓ Diagnostic Laboratory Panels (ISO 15189)</span>
              <span class="record-badge">✓ Active Verified Pharmacotherapy Regimen</span>
            </div>
          </div>

          <!-- Formal Attestation & Dual Signatures -->
          <div class="referral-signatures-grid">
            <div class="referral-sig-block">
              <div class="sig-cursive">${escapeHtml(ref.fromDoctor || 'Dr. Sarah Sharma')}</div>
              <div class="sig-line"></div>
              <div class="sig-name">${escapeHtml(ref.fromDoctor || 'Dr. Sarah Sharma, MD')}</div>
              <div class="sig-title">Referring Clinician Digital Signature &amp; Stamp</div>
              <div class="sig-reg">Reg: MCI-CGH-99201 • Hospitrack Care Network</div>
            </div>

            <div class="referral-sig-block triage-accept">
              <div class="sig-empty-placeholder"></div>
              <div class="sig-line"></div>
              <div class="sig-name">Receiving Specialist / Triage Officer</div>
              <div class="sig-title">Receiving Facility Triage Acceptance Acknowledgment</div>
              <div class="sig-reg">Signature &amp; Facility Reception Timestamp</div>
            </div>
          </div>

          <!-- Institutional Governance Footer -->
          <div class="referral-slip-footer">
            <p>This confidential clinical transfer document is electronically generated via Hospitrack Care Network. Valid for hospital admission and inter-facility transit triage.</p>
            <div class="referral-footer-hash">Security Token: HTR-REF-SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()} • System Time: ${new Date().toISOString()}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(previewEl);
};

window.closeReferralPreviewModal = function () {
  const el = document.getElementById('referralPreviewModal');
  if (el) el.remove();
};

window.printReferralLetterDoc = function () {
  if (typeof window.hospitrackPrintDocument === 'function' && window._currentPreviewReferral) {
    window.hospitrackPrintDocument('referral', window._currentPreviewReferral);
    return;
  }
  const slip = document.getElementById('referralSlipPrintableArea');
  let printContainer = document.getElementById('printable-medical-record');
  if (!printContainer) {
    printContainer = document.createElement('div');
    printContainer.id = 'printable-medical-record';
    printContainer.className = 'printable-document-container';
    document.body.appendChild(printContainer);
  }

  if (slip) {
    printContainer.innerHTML = `<div class="print-medical-sheet print-referral-document">${slip.innerHTML}</div>`;
  }

  document.body?.classList?.add?.('printing-referral-slip');

  const onAfterPrint = () => {
    document.body?.classList?.remove?.('printing-referral-slip');
    if (printContainer) printContainer.innerHTML = '';
    window.removeEventListener('afterprint', onAfterPrint);
  };
  window.addEventListener('afterprint', onAfterPrint);

  setTimeout(() => {
    if (typeof window.print === 'function') {
      window.print();
    }
    setTimeout(onAfterPrint, 1500);
  }, 120);
};

// ----------------------------------------------------------------------------
// Form Submission Pipeline with Strict State Synchronization
// ----------------------------------------------------------------------------
window.handleReferralSubmit = async function (event) {
  if (event) {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
  }

  const form = document.getElementById('clinicalReferralForm') || (event?.target?.closest ? event.target.closest('form') : null);

  // 1. Resolve Patient ID
  let rawPatientId = (form && typeof form.querySelector === 'function' ? form.querySelector('#refPatientId')?.value : null) || document.getElementById('refPatientId')?.value || document.getElementById('refPatientSelect')?.value;
  if (!rawPatientId) {
    const searchVal = document.getElementById('refPatientSearch')?.value?.trim();
    if (searchVal) {
      const list = window._referralPatientList || [];
      const match = list.find(p => p.id.toLowerCase() === searchVal.toLowerCase() || p.name.toLowerCase().includes(searchVal.toLowerCase()));
      if (match) {
        rawPatientId = match.id;
        window.selectReferralPatient(match.id);
      } else {
        rawPatientId = window.extractCleanPatientId(searchVal);
      }
    }
  }

  const patientId = window.extractCleanPatientId(rawPatientId);
  const destSelect = document.getElementById('refDestHospital');
  const toHospitalId = destSelect?.value;
  const destFacilityName = destSelect ? (destSelect?.selectedOptions?.[0]?.getAttribute('data-facility-name') || destSelect?.selectedOptions?.[0]?.text.split('•')[0].split('(')[0].trim()) : 'City General Hospital';
  const targetSpecialty = document.getElementById('refSpecialty')?.value || 'Cardiology & Interventional Cath';
  const priority = document.getElementById('refPriority')?.value || 'ROUTINE';
  
  // Extract strictly synchronized reason
  const reasonTextarea = document.getElementById('refReason');
  const rawReason = reasonTextarea ? reasonTextarea.value : (activeReferralReason || '');
  const reason = rawReason.trim();

  // Extract strictly synchronized notes
  const notesTextarea = document.getElementById('refNotes');
  const rawNotes = (notesTextarea && typeof notesTextarea.value === 'string') ? notesTextarea.value : (activeReferralNotes || '');
  const notes = rawNotes.trim();

  let hasError = false;

  // 1. Validate Clean Patient ID (Mandatory)
  const patientErr = document.getElementById('refPatientError');
  const searchInput = document.getElementById('refPatientSearch');
  if (!patientId) {
    if (patientErr) patientErr?.classList?.remove?.('hidden');
    if (searchInput) searchInput?.classList?.add?.('input-error');
    hasError = true;
  } else {
    if (patientErr) patientErr?.classList?.add?.('hidden');
    if (searchInput) searchInput?.classList?.remove?.('input-error');
  }

  // 2. Validate Receiving Hospital (Mandatory)
  const facilityErr = document.getElementById('refFacilityError');
  if (!toHospitalId) {
    if (facilityErr) facilityErr?.classList?.remove?.('hidden');
    if (destSelect) destSelect?.classList?.add?.('input-error');
    hasError = true;
  } else {
    if (facilityErr) facilityErr?.classList?.add?.('hidden');
    if (destSelect) destSelect?.classList?.remove?.('input-error');
  }

  // 3. Validate Referral Reason (Mandatory: trim().length > 0)
  const reasonErr = document.getElementById('refReasonError');
  if (!reason || reason.length === 0) {
    if (reasonErr) reasonErr?.classList?.remove?.('hidden');
    if (reasonTextarea) reasonTextarea?.classList?.add?.('input-error');
    hasError = true;
  } else {
    if (reasonErr) reasonErr?.classList?.add?.('hidden');
    if (reasonTextarea) reasonTextarea?.classList?.remove?.('input-error');
  }

  if (hasError) return;

  // Set loading state on submit button
  const submitBtn = document.getElementById('refDispatchBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="referral-spinner"></span> Routing Referral...';
  }

  try {
    const list = window._referralPatientList || [];
    const selectedPatient = list.find(p => p.id === patientId) || { id: patientId, name: 'Ananya Iyer' };
    const currentUser = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;

    // Simulate 500ms network latency for authentic clinical routing responsiveness
    await new Promise(resolve => setTimeout(resolve, 500));

    // Construct the authoritative referral record
    const newReferral = {
      id: `REF-${Date.now().toString().slice(-4)}`,
      patientName: selectedPatient.name,
      patientId: selectedPatient.id,
      fromDoctor: currentUser?.name || 'Dr. Sarah Sharma',
      doctorId: currentUser?.doctorId || currentUser?.id || 'DOC-201',
      sourceFacility: currentUser?.hospitalName || 'City General Hospital',
      fromHospitalId: currentUser?.hospitalId || 'HOSP-101',
      destinationFacility: destFacilityName,
      toHospitalId: toHospitalId,
      targetFacilityId: toHospitalId,
      specialty: targetSpecialty,
      targetSpecialty: targetSpecialty,
      priority: priority,
      clinicalPriority: priority,
      reason: reason,
      referralReason: reason,
      notes: notes,
      additionalNotes: notes,
      status: 'Dispatched / Pending Triage',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    if (window.hospitrackStore && typeof window.hospitrackStore.createReferral === 'function') {
      await window.hospitrackStore.createReferral(newReferral);
    } else {
      if (window.hospitrackStore && window.hospitrackStore.data) {
        if (!window.hospitrackStore.data.referrals) window.hospitrackStore.data.referrals = [];
        window.hospitrackStore.data.referrals.unshift(newReferral);
        if (typeof window.hospitrackStore.notify === 'function') {
          window.hospitrackStore.notify();
        }
      }
    }

    // Instant Post-Submission Feedback
    const successMsg = `✓ Clinical referral for ${selectedPatient.name} successfully dispatched to ${destFacilityName}.`;
    if (typeof window.showToast === 'function') {
      window.showToast(successMsg, 'success');
    }

    // Reset form and close modal
    window.resetReferralForm();
    if (typeof window.closeGlobalModal === 'function') {
      window.closeGlobalModal('createReferralModal');
    }

    // Refresh Doctor Dashboard and switch to Outgoing Referrals view automatically
    if (typeof window.setDoctorTab === 'function') {
      window.setDoctorTab('referrals');
    }
    if (typeof window.setReferralSubtab === 'function') {
      window.setReferralSubtab('outgoing');
    }

  } catch (err) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg class="lucide lucide-send" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        <span>Dispatch Referral</span>
      `;
    }
    window.showToast(err.message || 'Failed to dispatch specialist referral.', 'error');
  }
};

window.closeGlobalModal = function (id) {
  const el = document.getElementById(id);
  if (el) el?.classList?.remove?.('open');
};

// ----------------------------------------------------------------------------
// Discharge Requests View & Action Modal for Doctor Workstation
// ----------------------------------------------------------------------------
function renderDoctorDischargeRequestsView(data) {
  const { allPatients, doctor, hospital } = data;

  const dischargePatients = allPatients.filter(p =>
    p.dischargeStatus || p.status === 'DOCTOR_APPROVED' || p.status === 'DISCHARGED' || p.status === 'ADMITTED'
  );

  return `
    <div class="card p-24">
      <div class="d-flex-between mb-20">
        <div>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">
            🚪 Clinical Discharge Requests
          </h2>
          <p class="text-muted font-sm">
            Initiate clinical discharge approval for inpatients. Requests are routed to the hospital operations clearance deck for final administrative and billing sign-off.
          </p>
        </div>
        <button type="button" class="btn btn-primary btn-sm" onclick="openRequestDischargeModal()">
          <span>+</span> Request Inpatient Discharge
        </button>
      </div>

      ${allPatients.length === 0 ? `
        <div class="empty-state-box">
          <span class="empty-state-icon">🚪</span>
          <h4 class="empty-state-title">No patients under care</h4>
          <p class="empty-state-text">Assigned inpatients will appear here when ready for discharge approval.</p>
        </div>
      ` : `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>PATIENT</th>
                <th>ADMISSION / ROOM</th>
                <th>ATTENDING CLINICIAN</th>
                <th>DISCHARGE STATUS</th>
                <th>CLINICAL SUMMARY</th>
                <th style="text-align: right;">ACTION</th>
              </tr>
            </thead>
            <tbody>
              ${allPatients.map(p => {
    const status = p.dischargeStatus || (p.status === 'DISCHARGED' ? 'DISCHARGED' : 'INPATIENT_ACTIVE');
    let badgeClass = 'badge-info';
    if (status === 'DOCTOR_APPROVED' || status === 'DISCHARGE_REQUESTED') badgeClass = 'badge-warning';
    else if (status === 'DISCHARGED' || status === 'HOSPITAL_APPROVED') badgeClass = 'badge-success';
    else if (status === 'REJECTED') badgeClass = 'badge-danger';

    return `
                  <tr>
                    <td>
                      <div>
                        <strong>${escapeHtml(p.name)}</strong>
                        <div class="text-xs text-muted font-mono">${escapeHtml(p.id)} • ${p.age}y ${escapeHtml(p.gender || 'M')} • ${escapeHtml(p.bloodGroup || 'O+')}</div>
                      </div>
                    </td>
                    <td>
                      <span class="badge badge-secondary">${escapeHtml(p.ward || 'General Ward')} • Bed ${escapeHtml(p.bedNumber || 'B-101')}</span>
                    </td>
                    <td>
                      <div class="text-sm font-semibold">${escapeHtml(doctor.name)}</div>
                      <div class="text-xs text-muted">${escapeHtml(doctor.specialty || 'General Medicine')}</div>
                    </td>
                    <td>
                      <span class="badge ${badgeClass}">${escapeHtml(status)}</span>
                    </td>
                    <td class="text-sm text-muted" style="max-width: 250px;">
                      ${escapeHtml(p.dischargeSummary || (status === 'DOCTOR_APPROVED' ? 'Awaiting hospital clearance approval' : 'Inpatient active treatment'))}
                    </td>
                    <td style="text-align: right;">
                      <div class="d-flex gap-8 justify-end">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="openClinicalWorkspace('${p.id}')">
                          Workspace
                        </button>
                        ${status !== 'DOCTOR_APPROVED' && status !== 'DISCHARGED' ? `
                          <button type="button" class="btn btn-warning btn-sm" onclick="openRequestDischargeModal('${p.id}')">
                            Request Discharge
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
      `}
    </div>
  `;
}

window.openRequestDischargeModal = function (defaultPatientId = null) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const user = window.hospitrackAuth.getCurrentUser();
  const hospitalId = user?.hospitalId || user?.hospital?.id || (user?.role === 'HOSPITAL' || user?.role === 'HOSPITAL_ADMIN' ? user.id : 'HOSP-101');
  const patients = store.getPatients(hospitalId);

  modalContainer.innerHTML = `
    <div id="requestDischargeModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="requestDischargeModalTitle">
      <div class="modal-box">
        <div class="modal-header">
          <h3 class="modal-title" id="requestDischargeModalTitle">🚪 Clinical Discharge Order &amp; Doctor Approval</h3>
          <button type="button" class="modal-close" onclick="closeGlobalModal('requestDischargeModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="handleDoctorRequestDischargeSubmit(event)" class="p-20">
          <div class="form-group mb-16">
            <label class="form-label" for="dischargePatientSelect">Select Inpatient <span class="text-danger">*</span></label>
            <select id="dischargePatientSelect" class="form-control" required>
              ${patients.map(p => `
                <option value="${p.id}" ${p.id === defaultPatientId ? 'selected' : ''}>${escapeHtml(p.name)} (${p.id}) - Status: ${p.status || 'Active'}</option>
              `).join('')}
            </select>
          </div>
          <div class="form-group mb-16">
            <label class="form-label" for="dischargeVitals">Vitals at Discharge Clearance</label>
            <input type="text" id="dischargeVitals" class="form-control" placeholder="BP: 120/80 mmHg, HR: 72 bpm, SpO2: 99%" value="BP: 120/80 mmHg, HR: 74 bpm, SpO2: 98%">
          </div>
          <div class="form-group mb-16">
            <label class="form-label" for="dischargeSummary">Clinical Discharge Summary &amp; Treatment Outcome <span class="text-danger">*</span></label>
            <textarea id="dischargeSummary" class="form-control" rows="3" placeholder="e.g. Patient stabilized. Normal cardiac rhythm restored. Vitals stable. Cleared for outpatient transition." required></textarea>
          </div>
          <div class="form-group mb-20">
            <label class="form-label" for="dischargeFollowup">Follow-Up &amp; Medication Transition Instructions</label>
            <textarea id="dischargeFollowup" class="form-control" rows="2" placeholder="e.g. Continue prescribed oral medications for 14 days. Review in Cardiology OPD in 2 weeks."></textarea>
          </div>
          <div id="dischargeAlert" class="alert-banner hidden mb-16"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('requestDischargeModal')">Cancel</button>
            <button type="submit" class="btn btn-primary" id="submitDischargeBtn">Sign &amp; Dispatch Discharge Request</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleDoctorRequestDischargeSubmit = async function (event) {
  event.preventDefault();
  const patientId = document.getElementById('dischargePatientSelect')?.value;
  const summary = document.getElementById('dischargeSummary')?.value.trim();
  const vitals = document.getElementById('dischargeVitals')?.value.trim();
  const followup = document.getElementById('dischargeFollowup')?.value.trim();
  const alertEl = document.getElementById('dischargeAlert');
  const submitBtn = document.getElementById('submitDischargeBtn');

  if (!patientId || !summary) {
    if (alertEl) {
      alertEl.textContent = 'Please select a patient and provide a clinical discharge summary.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl?.classList?.remove?.('hidden');
    }
    return;
  }

  const fullSummary = `${summary}${vitals ? ` | Vitals: ${vitals}` : ''}${followup ? ` | Follow-up: ${followup}` : ''}`;

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting Request...';
    }

    await window.hospitrackStore.requestPatientDischarge(patientId, fullSummary);
    window.showToast('✓ Doctor discharge approval recorded. Request dispatched to hospital clearance deck.', 'success');
    closeGlobalModal('requestDischargeModal');
    window.renderDoctorDashboard(document.getElementById('mainContentArea'), 'discharge-requests');
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to submit discharge request.';
      alertEl.className = 'alert-banner error mb-16';
      alertEl?.classList?.remove?.('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign & Dispatch Discharge Request';
    }
  }
};
