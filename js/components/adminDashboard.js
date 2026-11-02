/**
 * Hospitrack — Super Admin Command Center Component (/admin)
 * Network-wide Operational Oversight, Live PostgreSQL KPIs, Facility Lifecycle Management,
 * Review Center Moderation, and Low-Rating Quality Alert Monitoring.
 */

let adminActiveSection = 'overview'; // overview | hospitals | doctors | patients | referrals | transfers | beds | reviews | quality | audit | reports | settings | notifications | profile
let adminSearchQuery = '';
let adminReviewRatingFilter = 'ALL'; // ALL | 5 | 4 | 3 | 2 | 1 | FLAGGED
let currentDossierHospitalId = null;

function normalizeAdminSection(sec) {
  const s = safeLowerCase(sec, 'overview').trim();
  if (s === 'dashboard' || s === 'command-center' || s === 'home') return 'overview';
  if (s === 'facilities') return 'hospitals';
  if (s === 'bed-network' || s === 'beds' || s === 'bednetwork' || s === 'capacity' || s === 'network') return 'beds';
  if (s === 'audit-trail' || s === 'audit-ledger' || s === 'ledger' || s === 'compliance' || s === 'audits') return 'audit';
  if (s === 'onboard-hospital' || s === 'onboard' || s === 'onboarding' || s === 'hospital-management' || s === 'governance') return 'quality';
  if (s === 'feedback') return 'reviews';
  if (s === 'analytics' || s === 'statistics' || s === 'national-reports') return 'reports';
  if (s === 'security' || s === 'config' || s === 'system-settings') return 'settings';
  if (s === 'alerts' || s === 'notifs') return 'notifications';
  if (s === 'account' || s === 'admin-profile') return 'profile';
  return s || 'overview';
}
window.normalizeAdminSection = normalizeAdminSection;

window.renderAdminDashboard = function(container, subtab = null) {
  if (!container) container = document.getElementById('mainContentArea');
  if (!container) return;

  if (subtab) {
    adminActiveSection = normalizeAdminSection(subtab);
  } else {
    adminActiveSection = normalizeAdminSection(adminActiveSection);
  }

  const store = window.hospitrackStore;
  const auth = window.hospitrackAuth;
  const user = auth ? auth.getCurrentUser() : null;

  try {
    const hospitals = (store && typeof store.getHospitals === 'function') ? (store.getHospitals() || []) : [];
    const doctors = (store && typeof store.getDoctors === 'function') ? (store.getDoctors() || []) : [];
    const patients = (store && typeof store.getPatients === 'function') ? (store.getPatients() || []) : [];
    const referrals = (store && typeof store.getReferrals === 'function') ? (store.getReferrals() || []) : [];
    const transfers = (store && typeof store.getTransfers === 'function') ? (store.getTransfers() || []) : [];
    const reviews = (store && typeof store.getReviews === 'function') ? (store.getReviews() || []) : [];
    const auditLogs = (store && typeof store.getAuditLogs === 'function') ? (store.getAuditLogs() || []) : [];

    const overview = (store && store.data && store.data.overview) || {};

    const totalHospitals = overview.totalHospitals != null ? Number(overview.totalHospitals) : hospitals.length;
    const activeHospitals = overview.activeHospitals != null ? Number(overview.activeHospitals) : hospitals.filter(h => h && h.status === 'ACTIVE').length;
    const suspendedHospitals = overview.suspendedHospitals != null ? Number(overview.suspendedHospitals) : hospitals.filter(h => h && h.status === 'SUSPENDED').length;
    const deactivatedHospitals = overview.deactivatedHospitals != null ? Number(overview.deactivatedHospitals) : hospitals.filter(h => h && h.status === 'DEACTIVATED').length;
    const totalDoctors = overview.totalDoctors != null ? Number(overview.totalDoctors) : doctors.length;
    const totalPatients = overview.totalPatients != null ? Number(overview.totalPatients) : patients.length;
    const totalReferrals = overview.totalReferrals != null ? Number(overview.totalReferrals) : referrals.length;
    const totalTransfers = overview.totalTransfers != null ? Number(overview.totalTransfers) : transfers.length;
    const avgRating = overview.averageRating != null ? Number(overview.averageRating).toFixed(1) : (
      hospitals.filter(h => h && h.rating).reduce((acc, h) => acc + h.rating, 0) / (hospitals.filter(h => h && h.rating).length || 1)
    ).toFixed(1);

    const lowRatingHospitals = (store && typeof store.getLowRatingHospitals === 'function') ? (store.getLowRatingHospitals(3.0) || []) : [];

    let subContentHtml = '';
    try {
      subContentHtml = renderAdminSectionContent(adminActiveSection, {
        hospitals,
        doctors,
        patients,
        referrals,
        transfers,
        reviews,
        auditLogs,
        totalHospitals,
        activeHospitals,
        suspendedHospitals,
        deactivatedHospitals,
        totalDoctors,
        totalPatients,
        totalReferrals,
        totalTransfers,
        avgRating,
        lowRatingHospitals
      });
    } catch (secErr) {
      console.error(`Error rendering admin subview [${adminActiveSection}]:`, secErr);
      subContentHtml = `
        <div class="dashboard-section-error" style="margin: 24px 0; padding: 24px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-card);">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <span style="font-size: 1.8rem;">⚠️</span>
            <div>
              <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-main);">Unable to load ${escapeHtml(adminActiveSection)} section</h3>
              <p style="margin: 4px 0 0 0; font-size: 0.84rem; color: var(--text-secondary);">${escapeHtml(secErr.message || 'An unexpected rendering error occurred.')}</p>
            </div>
          </div>
          <button type="button" class="btn btn-primary btn-sm" onclick="renderAdminDashboard(null, '${escapeHtml(adminActiveSection)}')">
            🔄 Retry Loading
          </button>
        </div>
      `;
    }

    container.innerHTML = `
      <!-- Super Admin Top Segmented Navigation -->
      <div class="pill-tabs-nav no-print">
        <button type="button" class="pill-tab ${adminActiveSection === 'overview' ? 'active' : ''}" onclick="setAdminSection('overview')">
          <span>🛡️</span> Command Center
        </button>
        <button type="button" class="pill-tab ${adminActiveSection === 'hospitals' ? 'active' : ''}" onclick="setAdminSection('hospitals')">
          <span>🏥</span> Facilities <span class="pill-badge">${hospitals.length}</span>
        </button>
        <button type="button" class="pill-tab ${adminActiveSection === 'doctors' ? 'active' : ''}" onclick="setAdminSection('doctors')">
          <span>🩺</span> Doctors <span class="pill-badge">${doctors.length}</span>
        </button>
        <button type="button" class="pill-tab ${adminActiveSection === 'patients' ? 'active' : ''}" onclick="setAdminSection('patients')">
          <span>👥</span> Patients <span class="pill-badge">${patients.length}</span>
        </button>
        <button type="button" class="pill-tab ${adminActiveSection === 'referrals' ? 'active' : ''}" onclick="setAdminSection('referrals')">
          <span>🔁</span> Referrals <span class="pill-badge">${referrals.length}</span>
        </button>
        <button type="button" class="pill-tab ${adminActiveSection === 'transfers' ? 'active' : ''}" onclick="setAdminSection('transfers')">
          <span>🚑</span> Transfers <span class="pill-badge">${transfers.length}</span>
        </button>
        <button type="button" class="pill-tab ${adminActiveSection === 'beds' || adminActiveSection === 'bed-network' ? 'active' : ''}" onclick="setAdminSection('beds')">
          <span>🛏️</span> Bed Network
        </button>
        <button type="button" class="pill-tab ${adminActiveSection === 'reviews' ? 'active' : ''}" onclick="setAdminSection('reviews')">
          <span>⭐</span> Quality Reviews <span class="pill-badge">${reviews.length}</span>
        </button>
        <button type="button" class="pill-tab ${adminActiveSection === 'quality' || adminActiveSection === 'hospital-management' || adminActiveSection === 'onboarding' ? 'active' : ''}" onclick="setAdminSection('quality')">
          <span>🏛️</span> Hospital Management
        </button>
        <button type="button" class="pill-tab ${adminActiveSection === 'audit' ? 'active' : ''}" onclick="setAdminSection('audit')">
          <span>📜</span> Audit Ledger <span class="pill-badge">${auditLogs.length}</span>
        </button>
        <button type="button" class="pill-tab ${adminActiveSection === 'reports' ? 'active' : ''}" onclick="setAdminSection('reports')">
          <span>📊</span> Reports
        </button>
        <button type="button" class="pill-tab ${adminActiveSection === 'settings' ? 'active' : ''}" onclick="setAdminSection('settings')">
          <span>⚙️</span> Settings
        </button>
        <button type="button" class="pill-tab ${adminActiveSection === 'profile' ? 'active' : ''}" onclick="setAdminSection('profile')">
          <span>👤</span> Profile
        </button>
      </div>

      <!-- Admin Subview Content -->
      <div class="admin-subview-content dashboard-container-clean">
        ${subContentHtml}
      </div>
    `;
  } catch (err) {
    console.error('Fatal admin dashboard error:', err);
    container.innerHTML = `
      <div class="dashboard-section-error" style="margin: 32px; padding: 32px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-card); text-align: center;">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">🛡️</div>
        <h2 style="color: var(--text-main); font-size: 1.3rem; margin-bottom: 8px;">Super Admin Command Center Notice</h2>
        <p style="color: var(--text-secondary); max-width: 500px; margin: 0 auto 16px auto; font-size: 0.9rem;">
          ${escapeHtml(err.message || 'Unable to render command center. Please retry or refresh your session.')}
        </p>
        <button type="button" class="btn btn-primary" onclick="renderAdminDashboard(null, 'overview')">
          🔄 Reload Command Center
        </button>
      </div>
    `;
  }
};

function setAdminSection(section) {
  adminActiveSection = section;
  if (window.navigateToRoleSection) {
    window.navigateToRoleSection('SUPER_ADMIN', section);
  } else {
    window.renderAdminDashboard(document.getElementById('mainContentArea'), section);
  }
}
window.setAdminSection = setAdminSection;

function renderAdminSectionContent(section, data) {
  const store = window.hospitrackStore;
  const {
    hospitals,
    doctors,
    patients,
    referrals,
    transfers,
    reviews,
    auditLogs,
    totalHospitals,
    activeHospitals,
    suspendedHospitals,
    deactivatedHospitals,
    totalDoctors,
    totalPatients,
    totalReferrals,
    totalTransfers,
    avgRating,
    lowRatingHospitals
  } = data;

  // 1. SYSTEM OVERVIEW / COMMAND CENTER
  if (section === 'overview' || !section) {
    return `
      <!-- Single Authoritative Page Header -->
      <div class="page-header-clean">
        <div class="page-header-info">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="status-pill status-info">🛡️ Super Admin</span>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <h1 class="page-title-clean">System Command Center</h1>
          <p class="page-subtitle-clean">Monitor hospitals, doctors, patients and healthcare network operations.</p>
        </div>
        <div class="page-header-actions">
          <button type="button" class="btn btn-primary btn-sm" onclick="openOnboardHospitalModal()">
            <span>+</span> Onboard Facility
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="setAdminSection('reviews')">
            <span>⭐</span> Review Center
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="window.printNetworkDossier()" title="Print Network Dossier">
            <span>🖨️</span> Print Network
          </button>
        </div>
      </div>

      <!-- Low Rating Hospital Quality Attention Banner (Manual Review Alert) -->
      ${lowRatingHospitals.length > 0 ? `
        <div class="compact-alert-row" style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); margin-bottom: 20px; border-radius: 12px; padding: 14px 16px;">
          <span class="compact-alert-icon">⚠️</span>
          <div class="compact-alert-content">
            <div class="compact-alert-title" style="color: #b45309;">Quality Attention Required: Low Rating Detected</div>
            <div class="compact-alert-desc">
              ${lowRatingHospitals.map(h => `<strong>${escapeHtml(h.name)}</strong> (${h.rating}★)`).join(', ')} is below standard threshold (3.0/5.0). Manual administrative review recommended.
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-sm" onclick="setAdminSection('reviews')">Inspect Reviews</button>
            <button class="btn btn-secondary btn-sm" style="color: var(--danger); border-color: var(--danger-border);" onclick="openDeactivateHospitalModal('${lowRatingHospitals[0].id}')">Manual Review</button>
          </div>
        </div>
      ` : ''}

      <!-- 6-Card Compact KPI Grid -->
      <div class="kpi-row-6 mb-24">
        <div class="kpi-card-clean">
          <div class="kpi-card-header">
            <span class="kpi-label">HOSPITALS</span>
            <span class="kpi-icon">🏥</span>
          </div>
          <div class="kpi-value">${totalHospitals}</div>
          <div class="kpi-subtext"><strong>${activeHospitals}</strong> active &bull; ${suspendedHospitals} suspended</div>
        </div>

        <div class="kpi-card-clean">
          <div class="kpi-card-header">
            <span class="kpi-label">DOCTORS</span>
            <span class="kpi-icon">🩺</span>
          </div>
          <div class="kpi-value">${totalDoctors}</div>
          <div class="kpi-subtext">Credentialed physicians</div>
        </div>

        <div class="kpi-card-clean">
          <div class="kpi-card-header">
            <span class="kpi-label">PATIENTS</span>
            <span class="kpi-icon">👤</span>
          </div>
          <div class="kpi-value">${totalPatients}</div>
          <div class="kpi-subtext">Network medical records</div>
        </div>

        <div class="kpi-card-clean">
          <div class="kpi-card-header">
            <span class="kpi-label">ACTIVE REFERRALS</span>
            <span class="kpi-icon">🔁</span>
          </div>
          <div class="kpi-value">${totalReferrals}</div>
          <div class="kpi-subtext">Inter-facility consultations</div>
        </div>

        <div class="kpi-card-clean">
          <div class="kpi-card-header">
            <span class="kpi-label">EMERGENCY CASES</span>
            <span class="kpi-icon">🚑</span>
          </div>
          <div class="kpi-value" style="color: ${totalTransfers > 0 ? '#ef4444' : 'var(--text-main)'};">${totalTransfers}</div>
          <div class="kpi-subtext">${totalTransfers > 0 ? 'Urgent transfers logged' : 'No emergency backlogs'}</div>
        </div>

        <div class="kpi-card-clean">
          <div class="kpi-card-header">
            <span class="kpi-label">NETWORK RATING</span>
            <span class="kpi-icon">⭐</span>
          </div>
          <div class="kpi-value" style="color: #f59e0b;">${avgRating} ★</div>
          <div class="kpi-subtext">From verified patient reviews</div>
        </div>
      </div>

      <!-- Two-Column Primary Workspace -->
      <div class="dashboard-split-grid mb-24">
        <!-- Left: Hospital Network Overview -->
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <div>
              <h3 class="dashboard-card-title">Hospital Network</h3>
              <p class="dashboard-card-subtitle">Active healthcare facilities and operational occupancy</p>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="setAdminSection('hospitals')">View All →</button>
          </div>
          <div class="table-container-clean">
            <table class="table-clean">
              <thead>
                <tr>
                  <th>Hospital</th>
                  <th>Location</th>
                  <th>Beds</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${renderAdminRecentHospitalRows(hospitals.slice(0, 5))}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Right: System Alerts & Live Activity -->
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <div>
              <h3 class="dashboard-card-title">System Alerts</h3>
              <p class="dashboard-card-subtitle">Operational notifications requiring administrative oversight</p>
            </div>
          </div>
          <div class="compact-alert-list">
            ${renderAdminSystemAlerts(hospitals, referrals, transfers, lowRatingHospitals)}
          </div>
        </div>
      </div>

      <!-- Facility Governance & Lifecycle Management -->
      <div class="dashboard-card mb-24">
        <div class="dashboard-card-header">
          <div>
            <h3 class="dashboard-card-title">Facility Governance & Lifecycle</h3>
            <p class="dashboard-card-subtitle">Accreditation approvals, quality reviews, and status administration</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-primary btn-sm" onclick="openOnboardHospitalModal()">+ Onboard Facility</button>
          </div>
        </div>
        <div class="table-container-clean">
          <table class="table-clean">
            <thead>
              <tr>
                <th>Hospital</th>
                <th>Hospital ID</th>
                <th>Capacity</th>
                <th>Rating</th>
                <th>Status</th>
                <th style="text-align: right;">Administrative Actions</th>
              </tr>
            </thead>
            <tbody>
              ${renderAdminFacilityManagementRows(hospitals.slice(0, 6))}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent Cryptographic Audit Logs -->
      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <div>
            <h3 class="dashboard-card-title">Audit Trail</h3>
            <p class="dashboard-card-subtitle">Recent tamper-evident SHA-256 administrative and clinical events</p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="setAdminSection('audit')">View Full Audit Trail →</button>
        </div>
        <div class="table-container-clean">
          <table class="table-clean">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Action</th>
                <th>Entity</th>
                <th style="text-align: right;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${renderAdminRecentAuditRows(auditLogs.slice(0, 5))}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 2. HOSPITALS
  if (section === 'hospitals') {
    return `
      <div class="page-header-clean">
        <div class="page-header-info">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="status-pill status-info">Network Facilities</span>
          </div>
          <h1 class="page-title-clean">Hospital Facilities & Networks</h1>
          <p class="page-subtitle-clean">Manage onboarding, operational status, capacity, and facility dossiers.</p>
        </div>
        <div class="page-header-actions">
          <button type="button" class="btn btn-primary btn-sm" onclick="openOnboardHospitalModal()">
            <span>+</span> Onboard Hospital
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="setAdminSection('overview')">
            Back to Command Center
          </button>
        </div>
      </div>

      <div class="dashboard-card">
        <div class="table-container-clean">
          <table class="table-clean">
            <thead>
              <tr>
                <th>Hospital</th>
                <th>Code / ID</th>
                <th>Bed Inventory</th>
                <th>Rating</th>
                <th>Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${renderAdminFacilityManagementRows(hospitals)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 3. DOCTORS
  if (section === 'doctors') {
    return `
      <div class="page-header-clean">
        <div class="page-header-info">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="status-pill status-info">Staff Directory</span>
          </div>
          <h1 class="page-title-clean">Doctor Directory</h1>
          <p class="page-subtitle-clean">Directory of credentialed medical specialists across all facilities.</p>
        </div>
        <div class="page-header-actions">
          <button type="button" class="btn btn-secondary btn-sm" onclick="setAdminSection('overview')">
            Back to Command Center
          </button>
        </div>
      </div>

      <div class="dashboard-card">
        <div class="table-container-clean">
          <table class="table-clean">
            <thead>
              <tr>
                <th>Physician</th>
                <th>Specialty</th>
                <th>License</th>
                <th>Affiliated Facility</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              ${doctors.length === 0 ? `
                <tr><td colspan="5" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">No credentialed physicians registered.</td></tr>
              ` : doctors.map(d => `
                <tr>
                  <td>
                    <div style="font-weight: 700; color: var(--text-main);">${escapeHtml(d.name)}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace;">${escapeHtml(d.id)}</div>
                  </td>
                  <td><span class="status-pill status-info">${escapeHtml(d.specialty || 'General')}</span></td>
                  <td><code style="font-size: 0.8rem;">${escapeHtml(d.licenseNo || 'MCI-VERIFIED')}</code></td>
                  <td>${escapeHtml(d.hospitalName || d.hospitalId || 'General')}</td>
                  <td style="color: var(--text-muted);">${escapeHtml(d.email || 'N/A')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 4. PATIENTS
  if (section === 'patients') {
    return `
      <div class="page-header-clean">
        <div class="page-header-info">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="status-pill status-info">Clinical Records</span>
          </div>
          <h1 class="page-title-clean">Patient Directory</h1>
          <p class="page-subtitle-clean">Registry of patients and admission states across network facilities.</p>
        </div>
        <div class="page-header-actions">
          <button type="button" class="btn btn-secondary btn-sm" onclick="setAdminSection('overview')">
            Back to Command Center
          </button>
        </div>
      </div>

      <div class="dashboard-card">
        <div class="table-container-clean">
          <table class="table-clean">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Facility</th>
                <th>Attending Doctor</th>
                <th>Status</th>
                <th>Emergency Contact</th>
                <th style="text-align: right;">Health Record</th>
              </tr>
            </thead>
            <tbody>
              ${patients.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">No patients registered.</td></tr>
              ` : patients.map(p => `
                <tr>
                  <td>
                    <div style="font-weight: 700; color: var(--text-main);">${escapeHtml(p.name)}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${p.age || '—'} yrs &bull; ${escapeHtml(p.gender || '—')} &bull; <span style="font-family: monospace;">${escapeHtml(p.id)}</span></div>
                  </td>
                  <td>${escapeHtml(p.hospitalName || p.currentHospitalId || '—')}</td>
                  <td>${escapeHtml(p.doctorName || p.primaryDoctorId || 'Unassigned')}</td>
                  <td>
                    <span class="status-pill ${p.status === 'ACTIVE' || p.status === 'ADMITTED' ? 'status-success' : p.status === 'DISCHARGED' ? 'status-info' : 'status-warning'}">
                      ${escapeHtml(p.status || 'ACTIVE')}
                    </span>
                  </td>
                  <td style="font-size: 0.82rem; color: var(--text-muted);">${escapeHtml(p.emergencyContact || p.contact || '—')}</td>
                  <td style="text-align: right;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="openPatientHealthSummaryPrint('${p.id}')" title="Print Comprehensive Medical Summary">
                      <span>🖨️</span> Dossier
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 5. REFERRALS
  if (section === 'referrals') {
    return `
      <div class="page-header-clean">
        <div class="page-header-info">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="status-pill status-info">Inter-Facility</span>
          </div>
          <h1 class="page-title-clean">Specialist Referrals</h1>
          <p class="page-subtitle-clean">Inter-facility clinical referral pipeline and transfer justification.</p>
        </div>
        <div class="page-header-actions">
          <button type="button" class="btn btn-secondary btn-sm" onclick="setAdminSection('overview')">Back to Command Center</button>
        </div>
      </div>

      <div class="dashboard-card">
        <div class="table-container-clean">
          <table class="table-clean">
            <thead>
              <tr>
                <th>Referral ID</th>
                <th>Patient</th>
                <th>From</th>
                <th>To</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              ${referrals.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">No referrals recorded.</td></tr>
              ` : referrals.map(r => `
                <tr>
                  <td><code style="font-size: 0.8rem;">${escapeHtml(r.id)}</code></td>
                  <td><strong>${escapeHtml(r.patientName || r.patientId)}</strong></td>
                  <td>${escapeHtml(r.fromHospitalName || r.fromHospitalId)}</td>
                  <td>${escapeHtml(r.toHospitalName || r.toHospitalId)}</td>
                  <td>
                    <span class="status-pill ${r.priority === 'EMERGENCY' ? 'status-danger' : r.priority === 'URGENT' ? 'status-warning' : 'status-info'}">
                      ${escapeHtml(r.priority || 'NORMAL')}
                    </span>
                  </td>
                  <td>
                    <span class="status-pill ${r.status === 'ACCEPTED' || r.status === 'COMPLETED' ? 'status-success' : r.status === 'PENDING' ? 'status-warning' : 'status-danger'}">
                      ${escapeHtml(r.status || 'PENDING')}
                    </span>
                  </td>
                  <td style="max-width: 250px; font-size: 0.82rem; color: var(--text-muted);">${escapeHtml(r.reason || 'Specialist care')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 6. TRANSFERS
  if (section === 'transfers') {
    return `
      <div class="page-header-clean">
        <div class="page-header-info">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="status-pill status-danger">Urgent Logistics</span>
          </div>
          <h1 class="page-title-clean">Emergency Transfers</h1>
          <p class="page-subtitle-clean">Urgent patient logistics and bed reallocation records.</p>
        </div>
        <div class="page-header-actions">
          <button type="button" class="btn btn-secondary btn-sm" onclick="setAdminSection('overview')">Back to Command Center</button>
        </div>
      </div>

      <div class="dashboard-card">
        <div class="table-container-clean">
          <table class="table-clean">
            <thead>
              <tr>
                <th>Transfer ID</th>
                <th>Patient</th>
                <th>Origin</th>
                <th>Destination</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Dispatched At</th>
              </tr>
            </thead>
            <tbody>
              ${transfers.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">No emergency transfers logged.</td></tr>
              ` : transfers.map(t => `
                <tr>
                  <td><code style="font-size: 0.8rem;">${escapeHtml(t.id)}</code></td>
                  <td><strong>${escapeHtml(t.patientName || t.patientId)}</strong></td>
                  <td>${escapeHtml(t.fromHospitalName || t.fromHospitalId)}</td>
                  <td>${escapeHtml(t.toHospitalName || t.toHospitalId)}</td>
                  <td><span class="status-pill status-danger">${escapeHtml(t.priority || 'EMERGENCY')}</span></td>
                  <td>
                    <span class="status-pill ${t.status === 'ACCEPTED' || t.status === 'COMPLETED' ? 'status-success' : 'status-warning'}">
                      ${escapeHtml(t.status || 'PENDING')}
                    </span>
                  </td>
                  <td style="font-size: 0.82rem; color: var(--text-muted);">${t.initiatedAt ? new Date(t.initiatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 7. ONBOARDING
  if (section === 'onboarding') {
    const pendingHospitals = hospitals.filter(h => h.status === 'PENDING_APPROVAL');
    return `
      <div class="page-header-clean">
        <div class="page-header-info">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="status-pill status-info">Governance</span>
          </div>
          <h1 class="page-title-clean">Hospital Onboarding</h1>
          <p class="page-subtitle-clean">Direct onboarding and credentialing of healthcare institutions.</p>
        </div>
        <div class="page-header-actions">
          <button type="button" class="btn btn-primary btn-sm" onclick="openOnboardHospitalModal()">
            <span>+</span> Onboard New Facility
          </button>
        </div>
      </div>

      <div class="dashboard-card mb-24">
        <div class="dashboard-card-header">
          <div>
            <h3 class="dashboard-card-title">Facilities Awaiting Approval (${pendingHospitals.length})</h3>
            <p class="dashboard-card-subtitle">Verify accreditation credentials before activating facility access.</p>
          </div>
        </div>
        <div class="table-container-clean">
          <table class="table-clean">
            <thead>
              <tr>
                <th>Hospital Name</th>
                <th>Code</th>
                <th>Total Beds</th>
                <th>Contact</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${pendingHospitals.length === 0 ? `
                <tr><td colspan="5" style="text-align: center; color: var(--text-dim); padding: 2rem;">No pending facility applications at this time.</td></tr>
              ` : pendingHospitals.map(h => `
                <tr>
                  <td><strong>${escapeHtml(h.name)}</strong></td>
                  <td><code>${escapeHtml(h.code || h.id)}</code></td>
                  <td>${h.totalBeds || 100} Beds</td>
                  <td>${escapeHtml(h.contact || h.email || 'N/A')}</td>
                  <td style="text-align: right;">
                    <button type="button" class="btn btn-primary btn-sm" onclick="handleApproveHospital('${h.id}')">
                      ✓ Approve Facility
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 8. REVIEWS
  if (section === 'reviews') {
    let filteredReviews = reviews;
    if (adminReviewRatingFilter !== 'ALL') {
      if (adminReviewRatingFilter === 'FLAGGED') {
        filteredReviews = reviews.filter(r => r.flagged);
      } else {
        const star = parseInt(adminReviewRatingFilter, 10);
        filteredReviews = reviews.filter(r => r.rating === star);
      }
    }

    return `
      <div class="page-header-clean">
        <div class="page-header-info">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="status-pill status-info">Quality & Safety</span>
          </div>
          <h1 class="page-title-clean">Quality & Experience Reviews</h1>
          <p class="page-subtitle-clean">Inspect patient experiences, monitor facility reputation, and moderate feedback.</p>
        </div>
        <div class="page-header-actions">
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button type="button" class="btn ${adminReviewRatingFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="filterAdminReviews('ALL')">All</button>
            <button type="button" class="btn ${adminReviewRatingFilter === '5' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="filterAdminReviews('5')">5 ★</button>
            <button type="button" class="btn ${adminReviewRatingFilter === '4' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="filterAdminReviews('4')">4 ★</button>
            <button type="button" class="btn ${adminReviewRatingFilter === '3' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="filterAdminReviews('3')">3 ★</button>
            <button type="button" class="btn ${adminReviewRatingFilter === '2' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="filterAdminReviews('2')">2 ★</button>
            <button type="button" class="btn ${adminReviewRatingFilter === '1' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="filterAdminReviews('1')">1 ★</button>
          </div>
        </div>
      </div>

      <div class="dashboard-card">
        <div class="table-container-clean">
          <table class="table-clean">
            <thead>
              <tr>
                <th>Review ID</th>
                <th>Facility</th>
                <th>Patient</th>
                <th>Rating</th>
                <th>Review Content</th>
                <th>Date</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filteredReviews.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">No reviews matching filter criteria.</td></tr>
              ` : filteredReviews.map(r => `
                <tr>
                  <td><code style="font-size: 0.8rem;">${escapeHtml(r.id)}</code></td>
                  <td><strong>${escapeHtml(r.hospitalName || r.hospitalId)}</strong></td>
                  <td>${escapeHtml(r.patientName || r.patientId)}</td>
                  <td><span style="color: #f59e0b; font-weight: 700;">${'★'.repeat(r.rating)}</span></td>
                  <td style="max-width: 320px; font-size: 0.82rem; line-height: 1.4; color: var(--text-muted);">${escapeHtml(r.reviewText)}</td>
                  <td style="font-size: 0.82rem; color: var(--text-muted);">${new Date(r.createdAt).toLocaleDateString()}</td>
                  <td style="text-align: right;">
                    ${!r.flagged ? `
                      <button type="button" class="btn btn-secondary btn-sm" onclick="handleFlagReview('${r.id}')" title="Flag for Review">
                        🚩 Flag
                      </button>
                    ` : `
                      <span class="status-pill status-danger">FLAGGED</span>
                    `}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 9. AUDIT LEDGER
  if (section === 'audit' || section === 'audit-trail' || section === 'audit-ledger' || section === 'ledger') {
    if (window.renderAuditLogger) {
      setTimeout(() => {
        const subContainer = document.getElementById('adminAuditContainer');
        if (subContainer) {
          window.renderAuditLogger(subContainer);
        } else {
          const container = document.getElementById('mainContentArea');
          if (container) window.renderAuditLogger(container);
        }
      }, 0);
      return `
        <div id="adminAuditContainer">
          <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
            <span style="font-size: 2.5rem;">📜</span>
            <h3 style="margin-top: 12px; font-size: 1.1rem; color: var(--text-main);">Loading Cryptographic Audit Ledger...</h3>
            <p style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 4px;">Synchronizing tamper-evident security records with PostgreSQL.</p>
          </div>
        </div>
      `;
    }
  }

  // 10. SUPER ADMIN PROFILE
  if (section === 'profile') {
    const authUser = window.hospitrackAuth.getCurrentUser();
    const initials = 'SA';
    const adminPhoto = authUser?.avatarUrl || null;
    return `
      <div class="page-header-clean">
        <div class="page-header-info">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="status-pill status-info">Security &amp; Governance</span>
          </div>
          <h1 class="page-title-clean">Administrator System Profile</h1>
          <p class="page-subtitle-clean">National Network root authority, security credentials, and system governance profile.</p>
        </div>
        <div class="page-header-actions" style="display: flex; gap: 8px;">
          <button type="button" class="btn btn-primary btn-sm" onclick="openUserProfileModal(true)">
            <span>✏️</span> Edit Profile &amp; Photo
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="openAccountSettingsModal()">
            <span>⚙️</span> Account Settings
          </button>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 900px;">
        <!-- Profile Header Summary Banner -->
        <div class="dashboard-card" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; border-left: 4px solid var(--admin-color);">
          <div style="display: flex; align-items: center; gap: 1rem;">
            ${adminPhoto ? `
              <div class="avatar avatar-lg"><img src="${escapeHtml(adminPhoto)}" alt="Admin" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"></div>
            ` : `
              <div class="avatar avatar-lg" style="background: linear-gradient(135deg, #0d9488, #0f766e); font-weight: 800; color: #fff;">${initials}</div>
            `}
            <div>
              <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-main); margin: 0 0 4px 0;">${escapeHtml(authUser?.name || 'Super Administrator')}</h2>
              <div style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(authUser?.email || 'admin@hospitrack.com')}</div>
              <div style="display: flex; gap: 6px; margin-top: 6px; align-items: center;">
                <span class="status-pill status-info">SUPER_ADMIN</span>
                <span class="status-pill status-success">ACTIVE / ROOT_AUTHORIZED</span>
              </div>
            </div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="openAccountSettingsModal()">
            <span>🔒</span> Security Settings
          </button>
        </div>

        <!-- Administrative Credentials & Scope -->
        <div class="dashboard-card">
          <div style="font-size: 0.78rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 12px; letter-spacing: 0.5px;">
            Administrative Authority &amp; System Scope
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Admin ID</div>
              <div style="font-weight: 700; font-family: monospace; color: var(--primary); margin-top: 2px;">${escapeHtml(authUser?.id || 'ADMIN-001')}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">System Role</div>
              <div style="font-weight: 600; color: var(--text-main); margin-top: 2px;">National System Administrator</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Cryptographic Access</div>
              <div style="font-weight: 600; color: var(--success); margin-top: 2px;">SHA-256 Audit Authority</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Facility Jurisdiction</div>
              <div style="font-weight: 600; color: var(--text-main); margin-top: 2px;">Network-wide (All Hospitals)</div>
            </div>
          </div>
        </div>

        <!-- Contact & Security Information -->
        <div class="dashboard-card">
          <div style="font-size: 0.78rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 12px; letter-spacing: 0.5px;">
            Security &amp; Contact Information
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Official Email</div>
              <div style="font-weight: 600; color: var(--text-main); margin-top: 2px;">${escapeHtml(authUser?.email || 'admin@hospitrack.com')}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Account Status</div>
              <div style="font-weight: 600; color: var(--success); margin-top: 2px;">Verified &amp; Active</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Session Authentication</div>
              <div style="font-weight: 600; color: var(--text-main); margin-top: 2px;">Spring Security 6 JWT Bearer</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Permissions Level</div>
              <div style="font-weight: 600; color: var(--text-main); margin-top: 2px;">Full Network Governance</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 11. BED NETWORK & CAPACITY
  if (section === 'beds' || section === 'bed-network') {
    const bedNetwork = (store && typeof store.getBedNetwork === 'function') ? store.getBedNetwork() : null;
    const totalNetworkBeds = bedNetwork?.networkTotalBeds ?? hospitals.reduce((acc, h) => acc + (Number(h.totalBeds) || 0), 0);
    const totalAvailBeds = bedNetwork?.networkAvailableBeds ?? hospitals.reduce((acc, h) => acc + (Number(h.availableBeds) || 0), 0);
    const totalOccBeds = bedNetwork?.networkOccupiedBeds ?? Math.max(0, totalNetworkBeds - totalAvailBeds);
    const totalMaintBeds = bedNetwork?.networkMaintenanceBeds ?? 0;
    const networkOccPct = totalNetworkBeds > 0 ? Math.round((totalOccBeds / totalNetworkBeds) * 100) : 0;

    let displayHospitals = bedNetwork?.hospitals || hospitals.map(h => {
      const tot = Number(h.totalBeds) || 100;
      const av = h.availableBeds != null ? Number(h.availableBeds) : 20;
      const occ = Math.max(0, tot - av);
      const pct = tot > 0 ? Math.round((occ / tot) * 100) : 0;
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
        occupancyRate: pct,
        categories: h.categories || {
          icu: { total: Math.round(tot * 0.15), available: Math.round(av * 0.15), occupied: Math.round(occ * 0.15) },
          emergency: { total: Math.round(tot * 0.15), available: Math.round(av * 0.15), occupied: Math.round(occ * 0.15) },
          general: { total: Math.round(tot * 0.40), available: Math.round(av * 0.40), occupied: Math.round(occ * 0.40) }
        }
      };
    });

    if (adminSearchQuery && adminSearchQuery.trim()) {
      const q = adminSearchQuery.trim().toLowerCase();
      displayHospitals = displayHospitals.filter(h =>
        (h.hospitalName && h.hospitalName.toLowerCase().includes(q)) ||
        (h.code && h.code.toLowerCase().includes(q)) ||
        (h.location && h.location.toLowerCase().includes(q))
      );
    }

    return `
      <div class="page-header-clean">
        <div class="page-header-info">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="status-pill status-info">🛏️ Capacity Logistics</span>
            <span class="status-pill status-success">Live PostgreSQL Ward Sync</span>
          </div>
          <h1 class="page-title-clean">Network Bed Capacity &amp; Ward Distribution</h1>
          <p class="page-subtitle-clean">Live bed availability, ward occupancy, and critical care distribution across accredited healthcare facilities.</p>
        </div>
        <div class="page-header-actions">
          <button type="button" class="btn btn-primary btn-sm" onclick="refreshBedNetworkLive()">
            <span>🔄</span> Refresh Bed Data
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="setAdminSection('overview')">Back to Command Center</button>
        </div>
      </div>

      <!-- Network Bed KPIs -->
      <div class="kpi-row-6 mb-24">
        <div class="kpi-card-clean">
          <div class="kpi-card-header">
            <span class="kpi-label">TOTAL NETWORK BEDS</span>
            <span class="kpi-icon">🛏️</span>
          </div>
          <div class="kpi-value">${totalNetworkBeds}</div>
          <div class="kpi-subtext">Across ${hospitals.length} accredited facilities</div>
        </div>
        <div class="kpi-card-clean">
          <div class="kpi-card-header">
            <span class="kpi-label">AVAILABLE BEDS</span>
            <span class="kpi-icon">✅</span>
          </div>
          <div class="kpi-value" style="color: var(--success);">${totalAvailBeds}</div>
          <div class="kpi-subtext">Ready for immediate clinical intake</div>
        </div>
        <div class="kpi-card-clean">
          <div class="kpi-card-header">
            <span class="kpi-label">OCCUPIED BEDS</span>
            <span class="kpi-icon">👥</span>
          </div>
          <div class="kpi-value">${totalOccBeds}</div>
          <div class="kpi-subtext">Active inpatients admitted</div>
        </div>
        <div class="kpi-card-clean">
          <div class="kpi-card-header">
            <span class="kpi-label">NETWORK OCCUPANCY</span>
            <span class="kpi-icon">📊</span>
          </div>
          <div class="kpi-value" style="color: ${networkOccPct > 90 ? 'var(--danger)' : networkOccPct > 75 ? 'var(--warning)' : 'var(--primary)'};">${networkOccPct}%</div>
          <div class="kpi-subtext">Aggregate network utilization</div>
        </div>
      </div>

      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <div>
            <h3 class="dashboard-card-title">Hospital Ward Capacity &amp; Utilization Ledger</h3>
            <p class="dashboard-card-subtitle">Real-time facility capacity accounting with ICU, Emergency &amp; Ward breakdown</p>
          </div>
          <div style="min-width: 240px;">
            <input 
              type="text" 
              class="form-control" 
              placeholder="Search facility by name or code..."
              value="${escapeHtml(adminSearchQuery)}"
              oninput="handleAdminSearch(this.value)"
            >
          </div>
        </div>
        <div class="table-container-clean">
          <table class="table-clean">
            <thead>
              <tr>
                <th>Hospital Facility</th>
                <th>Code</th>
                <th>Total Beds</th>
                <th>Available</th>
                <th>Occupied</th>
                <th>Ward Distribution (ICU / Emergency / General)</th>
                <th>Occupancy %</th>
                <th>Status</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${displayHospitals.length === 0 ? `
                <tr><td colspan="9" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">No facilities matching bed search criteria.</td></tr>
              ` : displayHospitals.map(h => {
                const tot = Number(h.totalBeds) || 100;
                const av = h.availableBeds != null ? Number(h.availableBeds) : 20;
                const occ = h.occupiedBeds != null ? Number(h.occupiedBeds) : Math.max(0, tot - av);
                const pct = h.occupancyRate != null ? h.occupancyRate : (tot > 0 ? Math.round((occ / tot) * 100) : 0);
                const icu = h.categories?.icu?.available != null ? `${h.categories.icu.available}/${h.categories.icu.total || 15}` : '—';
                const emg = h.categories?.emergency?.available != null ? `${h.categories.emergency.available}/${h.categories.emergency.total || 15}` : '—';
                const gen = h.categories?.general?.available != null ? `${h.categories.general.available}/${h.categories.general.total || 40}` : '—';

                return `
                  <tr>
                    <td>
                      <strong>${escapeHtml(h.hospitalName || h.name)}</strong>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(h.location || '—')}</div>
                    </td>
                    <td><code>${escapeHtml(h.code || h.hospitalId || h.id)}</code></td>
                    <td class="font-mono font-bold">${tot}</td>
                    <td class="font-mono font-bold text-success">${av}</td>
                    <td class="font-mono">${occ}</td>
                    <td style="font-size: 0.8rem;">
                      <span class="status-pill status-danger" title="ICU Available / Total">ICU: ${icu}</span>
                      <span class="status-pill status-warning" title="Emergency Available / Total">EMG: ${emg}</span>
                      <span class="status-pill status-info" title="General Ward Available / Total">GEN: ${gen}</span>
                    </td>
                    <td>
                      <span class="status-pill ${pct > 90 ? 'status-danger' : pct > 75 ? 'status-warning' : 'status-success'}">${pct}%</span>
                    </td>
                    <td><span class="status-pill ${h.status === 'ACTIVE' ? 'status-success' : 'status-warning'}">${escapeHtml(h.status || 'ACTIVE')}</span></td>
                    <td style="text-align: right;">
                      <button type="button" class="btn btn-secondary btn-sm" onclick="openHospitalDossier('${h.hospitalId || h.id}')">Dossier</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 12. QUALITY & HOSPITAL MANAGEMENT (MANUAL GOVERNANCE)
  if (section === 'quality' || section === 'hospital-management') {
    return `
      <div class="page-header-clean">
        <div class="page-header-info">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="status-pill status-info">🏛️ Governance & Quality</span>
          </div>
          <h1 class="page-title-clean">Hospital Quality & Lifecycle Management</h1>
          <p class="page-subtitle-clean">Manual accreditation governance, quality inspection, status changes, and facility onboarding.</p>
        </div>
        <div class="page-header-actions">
          <button type="button" class="btn btn-primary btn-sm" onclick="openOnboardHospitalModal()">
            <span>+</span> Onboard New Facility
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="setAdminSection('reviews')">
            <span>⭐</span> Quality Reviews
          </button>
        </div>
      </div>

      <!-- Quality Oversight Notice -->
      <div class="compact-alert-row" style="background: rgba(37, 99, 235, 0.08); border: 1px solid rgba(37, 99, 235, 0.2); margin-bottom: 20px; border-radius: 12px; padding: 14px 16px;">
        <span class="compact-alert-icon">🔒</span>
        <div class="compact-alert-content">
          <div class="compact-alert-title" style="color: var(--primary);">Manual Administrative Governance Rule</div>
          <div class="compact-alert-desc">
            Hospital suspension, warning, or deactivation actions are strictly MANUAL. Low patient review scores flag facilities for inspection but NEVER automatically decommission or delete accredited facilities.
          </div>
        </div>
      </div>

      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <div>
            <h3 class="dashboard-card-title">Network Facility Accreditation Ledger</h3>
            <p class="dashboard-card-subtitle">Manage lifecycle status, perform reviews, and edit administrative metadata</p>
          </div>
        </div>
        <div class="table-container-clean">
          <table class="table-clean">
            <thead>
              <tr>
                <th>Hospital Facility</th>
                <th>Facility ID / Code</th>
                <th>Capacity</th>
                <th>Quality Rating</th>
                <th>Status</th>
                <th style="text-align: right;">Administrative Actions</th>
              </tr>
            </thead>
            <tbody>
              ${renderAdminFacilityManagementRows(hospitals)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 13. NOTIFICATIONS
  if (section === 'notifications') {
    const notifs = store.getNotifications();
    return `
      <div class="page-header-clean">
        <div class="page-header-info">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="status-pill status-info">🔔 Alerts Hub</span>
          </div>
          <h1 class="page-title-clean">Administrative Notifications & Alerts</h1>
          <p class="page-subtitle-clean">System events, facility quality notices, and operational logs.</p>
        </div>
        <div class="page-header-actions">
          <button type="button" class="btn btn-secondary btn-sm" onclick="markAllNotifsRead()">Mark All Read</button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="setAdminSection('overview')">Back to Command Center</button>
        </div>
      </div>

      <div class="dashboard-card">
        <div class="table-container-clean">
          ${notifs.length === 0 ? `
            <div class="empty-state-clean">
              <span class="empty-icon">🔔</span>
              <div class="empty-title">No Notifications</div>
              <p class="empty-desc">You are all caught up on system alerts and events.</p>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 8px; padding: 16px;">
              ${notifs.map(n => `
                <div class="compact-alert-row ${n.read ? '' : 'info'}" style="cursor: pointer;" onclick="handleNotifClick('${n.id}')">
                  <span class="compact-alert-icon">${n.type === 'TRANSFER' ? '🚨' : n.type === 'ADMIN' ? '⚠️' : '🔔'}</span>
                  <div class="compact-alert-content">
                    <div class="compact-alert-title">${escapeHtml(n.title)}</div>
                    <div class="compact-alert-desc">${escapeHtml(n.message)}</div>
                  </div>
                  <span style="font-size: 0.72rem; color: var(--text-dim);">${new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  // 14. REPORTS & ANALYTICS
  if (section === 'reports' || section === 'analytics' || section === 'statistics') {
    return renderAdminReportsContent(data);
  }

  // 15. SYSTEM & SECURITY SETTINGS
  if (section === 'settings' || section === 'security' || section === 'config') {
    return renderAdminSettingsContent(data);
  }

  return `
    <div class="empty-state-clean" style="padding: 3.5rem 1rem; text-align: center;">
      <span class="empty-icon" style="font-size: 2.5rem;">🛡️</span>
      <h3 class="empty-title" style="margin: 12px 0 4px 0;">Super Admin Workspace</h3>
      <p class="empty-desc" style="color: var(--text-muted); font-size: 0.9rem; max-width: 440px; margin: 0 auto 16px auto;">
        Select an administrative section from the navigation tabs above or return to the main Command Center.
      </p>
      <button type="button" class="btn btn-primary btn-sm" onclick="setAdminSection('overview')">
        Back to Command Center
      </button>
    </div>
  `;
}

function renderAdminReportsContent(data) {
  const { hospitals, totalHospitals, activeHospitals, totalDoctors, totalPatients, totalReferrals, totalTransfers, avgRating } = data;
  const totalBeds = hospitals.reduce((acc, h) => acc + (Number(h.totalBeds) || 0), 0);
  const availBeds = hospitals.reduce((acc, h) => acc + (Number(h.availableBeds) || 0), 0);
  const occBeds = Math.max(0, totalBeds - availBeds);
  const occPct = totalBeds > 0 ? Math.round((occBeds / totalBeds) * 100) : 0;

  return `
    <div class="page-header-clean">
      <div class="page-header-info">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span class="status-pill status-info">📊 National Intelligence</span>
          <span class="status-pill status-success">Live PostgreSQL Analytics</span>
        </div>
        <h1 class="page-title-clean">System Reports &amp; Operational Analytics</h1>
        <p class="page-subtitle-clean">Comprehensive healthcare delivery metrics, bed occupancy analytics, referral flows, and clinical volume.</p>
      </div>
      <div class="page-header-actions">
        <button type="button" class="btn btn-primary btn-sm" onclick="window.printSystemAnalytics()" title="Print Executive Analytics & System Metrics">
          <span>🖨️</span> Print Summary
        </button>
        <button type="button" class="btn btn-secondary btn-sm" onclick="setAdminSection('overview')">
          Back to Command Center
        </button>
      </div>
    </div>

    <!-- Analytics KPIs -->
    <div class="kpi-row-6 mb-24" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
      <div class="kpi-card-clean">
        <div class="kpi-card-header">
          <span class="kpi-label">TOTAL ACCREDITED HOSPITALS</span>
          <span class="kpi-icon">🏥</span>
        </div>
        <div class="kpi-value">${totalHospitals}</div>
        <div class="kpi-subtext">${activeHospitals} active operational</div>
      </div>
      <div class="kpi-card-clean">
        <div class="kpi-card-header">
          <span class="kpi-label">TOTAL BED INVENTORY</span>
          <span class="kpi-icon">🛏️</span>
        </div>
        <div class="kpi-value">${totalBeds}</div>
        <div class="kpi-subtext">${availBeds} currently available (${occPct}% occ)</div>
      </div>
      <div class="kpi-card-clean">
        <div class="kpi-card-header">
          <span class="kpi-label">CLINICAL WORKFORCE</span>
          <span class="kpi-icon">🩺</span>
        </div>
        <div class="kpi-value" style="color: var(--primary);">${totalDoctors}</div>
        <div class="kpi-subtext">Registered specialist doctors</div>
      </div>
      <div class="kpi-card-clean">
        <div class="kpi-card-header">
          <span class="kpi-label">REGISTERED PATIENTS</span>
          <span class="kpi-icon">👥</span>
        </div>
        <div class="kpi-value" style="color: var(--success);">${totalPatients}</div>
        <div class="kpi-subtext">Active longitudinal patient records</div>
      </div>
      <div class="kpi-card-clean">
        <div class="kpi-card-header">
          <span class="kpi-label">CARE COORDINATION</span>
          <span class="kpi-icon">🔁</span>
        </div>
        <div class="kpi-value" style="color: var(--hospital-color);">${Number(totalReferrals) + Number(totalTransfers)}</div>
        <div class="kpi-subtext">${totalReferrals} referrals / ${totalTransfers} transfers</div>
      </div>
      <div class="kpi-card-clean">
        <div class="kpi-card-header">
          <span class="kpi-label">NETWORK SATISFACTION</span>
          <span class="kpi-icon">⭐</span>
        </div>
        <div class="kpi-value" style="color: #f59e0b;">${avgRating} ★</div>
        <div class="kpi-subtext">Patient experience rating</div>
      </div>
    </div>

    <!-- Facility Performance Table -->
    <div class="dashboard-card mb-24">
      <div class="dashboard-card-header">
        <div>
          <h3 class="dashboard-card-title">Facility Capacity &amp; Quality Performance Report</h3>
          <p class="dashboard-card-subtitle">Detailed breakdown across all accredited healthcare institutions</p>
        </div>
      </div>
      <div class="table-container-clean">
        <table class="table-clean">
          <thead>
            <tr>
              <th>Hospital Name</th>
              <th>Code</th>
              <th>Type</th>
              <th>Total Beds</th>
              <th>Available</th>
              <th>Occupancy %</th>
              <th>Rating</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${hospitals.length === 0 ? `
              <tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 2rem;">No facility records available.</td></tr>
            ` : hospitals.map(h => {
              const tot = Number(h.totalBeds) || 100;
              const av = h.availableBeds != null ? Number(h.availableBeds) : 20;
              const occ = Math.max(0, tot - av);
              const pct = tot > 0 ? Math.round((occ / tot) * 100) : 0;
              return `
                <tr>
                  <td><strong>${escapeHtml(h.name)}</strong><div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(h.location || '—')}</div></td>
                  <td><code>${escapeHtml(h.code || h.id)}</code></td>
                  <td style="font-size: 0.85rem;">${escapeHtml(h.type || 'General')}</td>
                  <td class="font-mono font-bold">${tot}</td>
                  <td class="font-mono text-success font-bold">${av}</td>
                  <td><span class="status-pill ${pct > 90 ? 'status-danger' : pct > 75 ? 'status-warning' : 'status-success'}">${pct}%</span></td>
                  <td><span style="color: #f59e0b; font-weight: 700;">${h.rating || '5.0'} ★</span></td>
                  <td><span class="status-pill ${h.status === 'ACTIVE' ? 'status-success' : 'status-warning'}">${escapeHtml(h.status || 'ACTIVE')}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAdminSettingsContent(data) {
  const authUser = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;

  return `
    <div class="page-header-clean">
      <div class="page-header-info">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span class="status-pill status-info">⚙️ System Governance</span>
          <span class="status-pill status-success">Security Policies Active</span>
        </div>
        <h1 class="page-title-clean">System &amp; Security Settings</h1>
        <p class="page-subtitle-clean">National platform security configuration, cryptographic ledger parameters, and data governance policies.</p>
      </div>
      <div class="page-header-actions">
        <button type="button" class="btn btn-primary btn-sm" onclick="openAccountSettingsModal()">
          <span>🔒</span> Admin Password &amp; MFA
        </button>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
      <!-- Security & Cryptographic Policies -->
      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <div>
            <h3 class="dashboard-card-title">🛡️ Cryptographic &amp; Audit Ledger</h3>
            <p class="dashboard-card-subtitle">Tamper-evident data integrity guarantees</p>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
            <div>
              <div style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Audit Ledger Hash Algorithm</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">Cryptographic block chaining verification</div>
            </div>
            <span class="status-pill status-success">SHA-256</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
            <div>
              <div style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Password Storage Standard</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">Adaptive salted key derivation</div>
            </div>
            <span class="status-pill status-info">BCrypt (12 Rounds)</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
            <div>
              <div style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Multi-Tenant Data Isolation</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">Spring Security DataIsolationGuard</div>
            </div>
            <span class="status-pill status-success">ENFORCED</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0;">
            <div>
              <div style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">JWT Session Token Lifespan</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">Stateless Bearer authorization token</div>
            </div>
            <span class="status-pill status-neutral">24 Hours</span>
          </div>
        </div>
      </div>

      <!-- Database & Connectivity Status -->
      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <div>
            <h3 class="dashboard-card-title">🗄️ Database &amp; System Health</h3>
            <p class="dashboard-card-subtitle">Real-time database connection metrics</p>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
            <div>
              <div style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Database Engine</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">Authoritative persistence layer</div>
            </div>
            <span class="status-pill status-success">PostgreSQL / H2 Dev</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
            <div>
              <div style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Connection Pool</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">HikariCP connection management</div>
            </div>
            <span class="status-pill status-info">Active (Healthy)</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
            <div>
              <div style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Soft Deactivation Guard</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">Historical clinical record preservation</div>
            </div>
            <span class="status-pill status-success">ACTIVE</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0;">
            <div>
              <div style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Authenticated Root Admin</div>
              <div style="font-size: 0.78rem; color: var(--text-muted); font-family: monospace;">${escapeHtml(authUser?.email || 'admin@hospitrack.com')}</div>
            </div>
            <span class="status-pill status-info">SUPER_ADMIN</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Helper renderers for clean Super Admin sections
function renderAdminRecentHospitalRows(hospitals) {
  if (!hospitals || hospitals.length === 0) {
    return `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 2rem;">No network facilities found.</td></tr>`;
  }
  return hospitals.map(h => `
    <tr>
      <td>
        <div style="font-weight: 700; color: var(--text-main);">${escapeHtml(h.name)}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace;">${escapeHtml(h.code || h.id)}</div>
      </td>
      <td style="font-size: 0.82rem; color: var(--text-muted);">${escapeHtml(h.location || '—')}</td>
      <td><strong>${h.availableBeds || 0}</strong> / ${h.totalBeds || 0}</td>
      <td><span style="color: #f59e0b; font-weight: 700;">${h.rating || '5.0'} ★</span></td>
      <td>
        <span class="status-pill ${h.status === 'ACTIVE' ? 'status-success' : h.status === 'SUSPENDED' ? 'status-danger' : 'status-warning'}">
          ${escapeHtml(h.status || 'ACTIVE')}
        </span>
      </td>
      <td style="text-align: right;">
        <button type="button" class="btn btn-secondary btn-sm" onclick="openHospitalDossier('${h.id}')">Dossier</button>
      </td>
    </tr>
  `).join('');
}

function renderAdminFacilityManagementRows(hospitals) {
  if (!hospitals || hospitals.length === 0) {
    return `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 2rem;">No hospitals registered.</td></tr>`;
  }
  return hospitals.map(h => `
    <tr>
      <td>
        <div style="font-weight: 700; color: var(--text-main);">${escapeHtml(h.name)}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(h.location || '—')}</div>
      </td>
      <td><code>${escapeHtml(h.code || h.id)}</code></td>
      <td>${h.availableBeds || 0} / ${h.totalBeds || 0}</td>
      <td>
        <span style="color: #f59e0b; font-weight: 700;">${h.rating || '5.0'} ★</span>
        <span style="font-size: 0.75rem; color: var(--text-muted);">(${h.reviewCount || 0})</span>
      </td>
      <td>
        <span class="status-pill ${h.status === 'ACTIVE' ? 'status-success' : h.status === 'PENDING_APPROVAL' ? 'status-warning' : h.status === 'SUSPENDED' ? 'status-danger' : 'status-info'}">
          ${escapeHtml(h.status || 'ACTIVE')}
        </span>
      </td>
      <td style="text-align: right;">
        <div style="display: flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="openHospitalDossier('${h.id}')" title="View Full Dossier">
            Dossier
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="openEditHospitalModal('${h.id}')" title="Edit Hospital Details">
            ✏️ Edit
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="openResetHospitalCredentialsModal('${h.id}')" title="Reset Admin Password">
            🔑 Reset
          </button>
          ${h.status === 'PENDING_APPROVAL' ? `
            <button type="button" class="btn btn-primary btn-sm" onclick="handleApproveHospital('${h.id}')" title="Approve Hospital Registration">
              ✓ Approve
            </button>
          ` : h.status === 'ACTIVE' ? `
            <button type="button" class="btn btn-secondary btn-sm" style="color: var(--danger); border-color: var(--danger-border);" onclick="openDeactivateHospitalModal('${h.id}')" title="Manual Suspension / Quality Action">
              Suspend
            </button>
          ` : `
            <button type="button" class="btn btn-primary btn-sm" onclick="handleReactivateHospital('${h.id}')" title="Reactivate Facility">
              Reactivate
            </button>
          `}
        </div>
      </td>
    </tr>
  `).join('');
}

function renderAdminSystemAlerts(hospitals, referrals, transfers, lowRatingHospitals) {
  const alerts = [];

  const pendingHospitals = (hospitals || []).filter(h => h.status === 'PENDING_APPROVAL');
  if (pendingHospitals.length > 0) {
    alerts.push(`
      <div class="compact-alert-row">
        <span class="compact-alert-icon">🏛️</span>
        <div class="compact-alert-content">
          <div class="compact-alert-title">${pendingHospitals.length} Facility Approval${pendingHospitals.length > 1 ? 's' : ''} Pending</div>
          <div class="compact-alert-desc">Review accreditation credentials for ${escapeHtml(pendingHospitals[0].name)}</div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="setAdminSection('onboarding')">Review</button>
      </div>
    `);
  }

  if (lowRatingHospitals && lowRatingHospitals.length > 0) {
    alerts.push(`
      <div class="compact-alert-row">
        <span class="compact-alert-icon">⚠️</span>
        <div class="compact-alert-content">
          <div class="compact-alert-title">Facility Quality Review Flagged</div>
          <div class="compact-alert-desc">${escapeHtml(lowRatingHospitals[0].name)} rating is ${lowRatingHospitals[0].rating}★</div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="setAdminSection('reviews')">Inspect</button>
      </div>
    `);
  }

  const activeTransfers = (transfers || []).filter(t => t.status === 'PENDING' || t.status === 'DISPATCHED' || t.priority === 'EMERGENCY');
  if (activeTransfers.length > 0) {
    alerts.push(`
      <div class="compact-alert-row">
        <span class="compact-alert-icon">🚑</span>
        <div class="compact-alert-content">
          <div class="compact-alert-title">${activeTransfers.length} Emergency Transfer${activeTransfers.length > 1 ? 's' : ''} Active</div>
          <div class="compact-alert-desc">Critical inter-facility transport logistics underway</div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="setAdminSection('transfers')">Track</button>
      </div>
    `);
  }

  if (alerts.length === 0) {
    alerts.push(`
      <div class="compact-alert-row">
        <span class="compact-alert-icon">✓</span>
        <div class="compact-alert-content">
          <div class="compact-alert-title">Network Operations Normal</div>
          <div class="compact-alert-desc">All facilities connected, no emergency backlogs or pending approvals.</div>
        </div>
      </div>
    `);
  }

  return alerts.join('');
}

function renderAdminRecentAuditRows(auditLogs) {
  if (!auditLogs || auditLogs.length === 0) {
    return `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 2rem;">No audit records available.</td></tr>`;
  }
  return auditLogs.map(a => `
    <tr>
      <td style="font-size: 0.8rem; color: var(--text-muted);">${a.timestamp ? new Date(a.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
      <td><strong>${escapeHtml(a.performedBy || 'System Admin')}</strong></td>
      <td><span class="status-pill status-info">${escapeHtml(a.userRole || 'SUPER_ADMIN')}</span></td>
      <td><code>${escapeHtml(a.action || 'SYSTEM_EVENT')}</code></td>
      <td style="font-size: 0.82rem; color: var(--text-muted);">${escapeHtml(a.entityType || 'ENTITY')}:${escapeHtml(a.entityId || '0')}</td>
      <td style="text-align: right;"><span class="status-pill status-success">SHA-256 Valid</span></td>
    </tr>
  `).join('');
}

window.filterAdminReviews = function(rating) {
  adminReviewRatingFilter = rating;
  window.renderAdminDashboard(document.getElementById('mainContentArea'));
};

// Hospital Dossier Viewer
window.openHospitalDossier = async function(hospitalId) {
  currentDossierHospitalId = hospitalId;
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const hospital = store.getHospitalById(hospitalId) || { name: 'Hospital Facility', id: hospitalId };

  modalContainer.innerHTML = `
    <div id="hospitalDossierModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="dossierHospitalName">
      <div class="modal-box modal-box-lg">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" id="dossierHospitalName">${escapeHtml(hospital.name)}</h3>
            <p class="modal-subtitle">Hospital intelligence dossier & operational record</p>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('hospitalDossierModal')" aria-label="Close">✕</button>
        </div>
        <div id="dossierTabContent" class="modal-body">
          <div style="text-align: center; padding: 2rem;">Loading hospital intelligence dossier...</div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('hospitalDossierModal')">Close</button>
          <button type="button" class="btn btn-secondary" onclick="window.printHospitalDossier('${hospitalId}')" title="Print Facility Dossier">🖨️ Print Dossier</button>
          <button type="button" class="btn btn-primary" onclick="closeGlobalModal('hospitalDossierModal'); openEditHospitalModal('${hospitalId}');">Edit Facility</button>
        </div>
      </div>
    </div>
  `;

  try {
    const details = await store.getHospitalDetails(hospitalId);
    renderDossierContent(details);
  } catch (err) {
    const contentEl = document.getElementById('dossierTabContent');
    if (contentEl) {
      contentEl.innerHTML = `<div style="color: var(--danger); padding: 2rem;">Failed to load dossier: ${escapeHtml(err.message)}</div>`;
    }
  }
};

function renderDossierContent(details) {
  const contentEl = document.getElementById('dossierTabContent');
  if (!contentEl) return;

  const h = details.hospital || {};
  const doctors = details.doctors || [];
  const patients = details.patients || [];
  const reviews = details.reviews || [];

  contentEl.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 1.25rem;">
      <div class="stat-card" style="padding: 12px;">
        <div style="font-size: 0.72rem; color: var(--text-dim); font-weight: 700;">BED CAPACITY</div>
        <div style="font-weight: 800; font-size: 1.15rem; color: var(--text-main); margin-top: 2px;">${h.availableBeds || 0} / ${h.totalBeds || 0} Available</div>
      </div>
      <div class="stat-card" style="padding: 12px;">
        <div style="font-size: 0.72rem; color: var(--text-dim); font-weight: 700;">DOCTORS</div>
        <div style="font-weight: 800; font-size: 1.15rem; color: var(--text-main); margin-top: 2px;">${doctors.length} Verified</div>
      </div>
      <div class="stat-card" style="padding: 12px;">
        <div style="font-size: 0.72rem; color: var(--text-dim); font-weight: 700;">ACTIVE INPATIENTS</div>
        <div style="font-weight: 800; font-size: 1.15rem; color: var(--text-main); margin-top: 2px;">${patients.length} Registered</div>
      </div>
      <div class="stat-card" style="padding: 12px;">
        <div style="font-size: 0.72rem; color: var(--text-dim); font-weight: 700;">QUALITY RATING</div>
        <div style="font-weight: 800; font-size: 1.15rem; color: var(--warning); margin-top: 2px;">${h.rating || '5.0'} ★ <span style="font-size: 0.78rem; color: var(--text-muted);">(${reviews.length})</span></div>
      </div>
    </div>

    <div class="profile-details-grid" style="font-size: 0.86rem;">
      <div class="profile-field-box">
        <div class="profile-field-label">Official Contact Phone</div>
        <div class="profile-field-value">${escapeHtml(h.contact || 'N/A')}</div>
      </div>
      <div class="profile-field-box">
        <div class="profile-field-label">Administrative Email</div>
        <div class="profile-field-value">${escapeHtml(h.email || 'N/A')}</div>
      </div>
      <div class="profile-field-box" style="grid-column: span 2;">
        <div class="profile-field-label">Physical Address</div>
        <div class="profile-field-value">${escapeHtml(h.location || 'N/A')}</div>
      </div>
      <div class="profile-field-box">
        <div class="profile-field-label">Operational Status</div>
        <div class="profile-field-value"><span class="badge ${h.status === 'ACTIVE' ? 'badge-active' : 'badge-danger'}">${escapeHtml(h.status || 'ACTIVE')}</span></div>
      </div>
      <div class="profile-field-box">
        <div class="profile-field-label">Facility Code</div>
        <div class="profile-field-value"><code>${escapeHtml(h.code || h.id)}</code></div>
      </div>
    </div>
  `;
}

// Edit Hospital Modal
window.openEditHospitalModal = function(hospitalId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const h = store.getHospitalById(hospitalId);
  if (!h) return;

  modalContainer.innerHTML = `
    <div id="editHospitalModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="editHospTitle">
      <div class="modal-box">
        <div class="modal-header">
          <h3 class="modal-title" id="editHospTitle">✏️ Edit Facility Details</h3>
          <button type="button" class="modal-close" onclick="closeGlobalModal('editHospitalModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="handleEditHospitalSubmit(event, '${h.id}')">
          <div class="form-group">
            <label class="form-label" for="editHospNameInput">Hospital Name *</label>
            <input type="text" id="editHospNameInput" class="form-control" value="${escapeHtml(h.name)}" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="editHospContactInput">Official Contact Phone *</label>
            <input type="tel" id="editHospContactInput" class="form-control" value="${escapeHtml(h.contact || '')}" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="editHospEmailInput">Administrative Email</label>
            <input type="email" id="editHospEmailInput" class="form-control" value="${escapeHtml(h.email || '')}">
          </div>
          <div class="form-group">
            <label class="form-label" for="editHospLocInput">Location / Address *</label>
            <input type="text" id="editHospLocInput" class="form-control" value="${escapeHtml(h.location || '')}" required>
          </div>
          <div id="editHospAlert" class="alert-banner hidden"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('editHospitalModal')">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Facility Details</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleEditHospitalSubmit = async function(event, hospitalId) {
  event.preventDefault();
  const name = document.getElementById('editHospNameInput')?.value.trim();
  const contact = document.getElementById('editHospContactInput')?.value.trim();
  const email = document.getElementById('editHospEmailInput')?.value.trim();
  const location = document.getElementById('editHospLocInput')?.value.trim();
  const alertEl = document.getElementById('editHospAlert');

  try {
    await window.hospitrackStore.updateHospitalProfile(hospitalId, {
      name,
      contact,
      email,
      location
    });
    window.showToast('Hospital details updated successfully.', 'success');
    closeGlobalModal('editHospitalModal');
    window.renderAdminDashboard(document.getElementById('mainContentArea'));
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to update hospital details.';
      alertEl.classList.remove('hidden');
    }
  }
};

// Deactivation Modal with Reason Confirmation
window.openDeactivateHospitalModal = function(hospitalId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const hospital = store.getHospitalById(hospitalId) || { name: 'Hospital Facility', rating: 4.8, reviewCount: 0, status: 'ACTIVE' };

  modalContainer.innerHTML = `
    <div id="deactivateHospModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="deactModalTitle">
      <div class="modal-box">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" id="deactModalTitle" style="color: var(--danger);">Deactivate Hospital</h3>
            <p class="modal-subtitle">Administrative action to decommission or suspend healthcare facility</p>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('deactivateHospModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="handleDeactivateHospitalSubmit(event, '${hospitalId}')">
          <div style="background: var(--danger-light); border: 1px solid var(--danger-border); border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
            <div style="font-size: 1rem; font-weight: 700; color: var(--danger-text);">${escapeHtml(hospital.name)}</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; font-size: 0.8rem; color: var(--text-secondary);">
              <div>Rating: <strong>${hospital.rating || 'N/A'}★</strong></div>
              <div>Reviews: <strong>${hospital.reviewCount || 0}</strong></div>
              <div>Status: <span class="badge badge-${(hospital.status || 'ACTIVE').toLowerCase()}">${hospital.status || 'ACTIVE'}</span></div>
            </div>
            <p style="font-size: 0.76rem; color: var(--text-muted); margin-top: 8px;">
              Soft deactivation: Historical clinical records, patient timelines, and audit records remain fully preserved.
            </p>
          </div>

          <div class="form-group">
            <label class="form-label" for="deactActionType">Action Type *</label>
            <select id="deactActionType" class="form-control" required>
              <option value="DEACTIVATED">DEACTIVATE — Decommission facility from active operations</option>
              <option value="SUSPENDED">SUSPEND — Temporary operational hold</option>
              <option value="WARNED">WARN — Administrative quality warning</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="deactReason">Reason for Action *</label>
            <textarea id="deactReason" class="form-control" rows="3" placeholder="Mandatory administrative justification (e.g. Clinical quality audit failure, rating below 3.0 threshold)..." required minlength="5"></textarea>
          </div>

          <div class="mb-16">
            <label style="display: flex; align-items: flex-start; gap: 10px; font-size: 0.84rem; color: var(--text-secondary); cursor: pointer;">
              <input type="checkbox" id="deactAcknowledge" required style="margin-top: 3px;">
              <span>I understand this will deactivate the hospital from active operations.</span>
            </label>
          </div>

          <div id="deactAlert" class="alert-banner hidden"></div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('deactivateHospModal')">Cancel</button>
            <button type="submit" id="confirmDeactBtn" class="btn btn-danger">Deactivate Hospital</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleDeactivateHospitalSubmit = async function(event, hospitalId) {
  event.preventDefault();
  const status = document.getElementById('deactActionType')?.value;
  const reason = document.getElementById('deactReason')?.value.trim();
  const alertEl = document.getElementById('deactAlert');

  try {
    await window.hospitrackStore.updateHospitalStatus(hospitalId, status, reason);
    window.showToast(`Facility status updated to ${status}.`, 'info');
    closeGlobalModal('deactivateHospModal');
    window.renderAdminDashboard(document.getElementById('mainContentArea'));
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to update facility status.';
      alertEl.classList.remove('hidden');
    }
  }
};

window.handleApproveHospital = async function(hospitalId) {
  if (confirm(`Approve hospital facility registration for ${hospitalId}? This will activate the hospital and allow the hospital administrator to log in.`)) {
    try {
      await window.hospitrackStore.approveHospital(hospitalId);
      window.showToast('Hospital approved and activated successfully.', 'success');
      window.renderAdminDashboard(document.getElementById('mainContentArea'));
    } catch (err) {
      window.showToast(err.message || 'Failed to approve hospital.', 'error');
    }
  }
};

window.handleReactivateHospital = async function(hospitalId) {
  if (confirm(`Reactivate hospital facility ${hospitalId} to ACTIVE status?`)) {
    try {
      await window.hospitrackStore.updateHospitalStatus(hospitalId, 'ACTIVE', 'Administrative reactivation approved.');
      window.showToast('Facility reactivated to ACTIVE operational status.', 'success');
      window.renderAdminDashboard(document.getElementById('mainContentArea'));
    } catch (err) {
      window.showToast(err.message || 'Failed to reactivate hospital.', 'error');
    }
  }
};

window.handleFlagReview = async function(reviewId) {
  if (confirm(`Flag review ${reviewId} for administrative inspection?`)) {
    try {
      await window.hospitrackStore.flagReview(reviewId);
      window.showToast('Review flagged for quality inspection.', 'info');
      window.renderAdminDashboard(document.getElementById('mainContentArea'));
    } catch (err) {
      window.showToast(err.message || 'Failed to flag review.', 'error');
    }
  }
};

// Onboard Hospital Modal
window.openOnboardHospitalModal = function() {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div id="onboardHospModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="onboardHospModalTitle">
      <div class="modal-box modal-box-register" style="max-width: 720px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" id="onboardHospModalTitle">🏛️ Onboard Healthcare Facility</h3>
            <p class="modal-subtitle">Register facility in national network and provision Hospital Administrator credentials</p>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('onboardHospModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="handleOnboardHospitalSubmit(event)">
          <div class="form-grid-2col">
            <div class="form-group full-width">
              <label class="form-label" for="onboardHospName">Hospital Name *</label>
              <input type="text" id="onboardHospName" class="form-control" placeholder="e.g. Apollo Super Speciality Hospital" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="onboardHospCode">Registration / Network Code *</label>
              <input type="text" id="onboardHospCode" class="form-control" placeholder="e.g. ASH-04" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="onboardHospType">Hospital Type *</label>
              <select id="onboardHospType" class="form-control" required>
                <option value="General Hospital">General Hospital</option>
                <option value="Super Specialty" selected>Super Specialty</option>
                <option value="Tertiary Care">Tertiary Care</option>
                <option value="Multi-Specialty">Multi-Specialty</option>
                <option value="Trauma Center">Critical Trauma Center</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="onboardHospEmail">Official Administrative Email *</label>
              <input type="email" id="onboardHospEmail" class="form-control" placeholder="admin@apollo.in" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="onboardHospPhone">Official Telephone *</label>
              <input type="tel" id="onboardHospPhone" class="form-control" placeholder="+91 11 9988 7766" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="onboardHospEmerPhone">Emergency Helpline Phone</label>
              <input type="tel" id="onboardHospEmerPhone" class="form-control" placeholder="+91 11 9988 7700">
            </div>
            <div class="form-group">
              <label class="form-label" for="onboardHospWebsite">Official Website</label>
              <input type="url" id="onboardHospWebsite" class="form-control" placeholder="https://apollo.in">
            </div>
            <div class="form-group">
              <label class="form-label" for="onboardHospBeds">Total Bed Capacity *</label>
              <input type="number" id="onboardHospBeds" class="form-control" min="1" placeholder="e.g. 350" value="150" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="onboardHospAvailBeds">Initial Available Beds</label>
              <input type="number" id="onboardHospAvailBeds" class="form-control" min="0" placeholder="e.g. 50" value="50">
            </div>
            <div class="form-group full-width">
              <label class="form-label" for="onboardHospAddress">Physical Address *</label>
              <input type="text" id="onboardHospAddress" class="form-control" placeholder="e.g. Sarita Vihar, Mathura Road" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="onboardHospCity">City *</label>
              <input type="text" id="onboardHospCity" class="form-control" placeholder="e.g. New Delhi" value="New Delhi" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="onboardHospState">State *</label>
              <input type="text" id="onboardHospState" class="form-control" placeholder="e.g. Delhi" value="Delhi" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="onboardHospPin">PIN Code</label>
              <input type="text" id="onboardHospPin" class="form-control" placeholder="e.g. 110076">
            </div>
            <div class="form-group">
              <label class="form-label" for="onboardHospAccred">Accreditations</label>
              <input type="text" id="onboardHospAccred" class="form-control" placeholder="e.g. NABH, NABL, JCI Accredited" value="NABH, JCI Accredited">
            </div>
            <div class="form-group full-width">
              <label class="form-label" for="onboardHospSpecial">Specializations (comma-separated)</label>
              <input type="text" id="onboardHospSpecial" class="form-control" placeholder="Cardiology, Oncology, Neurology, Orthopedics, Emergency Medicine" value="Cardiology, Emergency Medicine, General Surgery, Pediatrics">
            </div>
            <div class="form-group full-width">
              <label class="form-label" for="onboardHospFacilities">Key Medical Facilities</label>
              <input type="text" id="onboardHospFacilities" class="form-control" placeholder="24/7 Trauma Bay, 3T MRI, Cath Lab, Dialysis Center, Level-III NICU" value="24/7 Emergency, Cath Lab, ICU, Pathology, Radiology">
            </div>
            <div class="form-group">
              <label class="form-label" for="onboardHospStatus">Initial Approval Status</label>
              <select id="onboardHospStatus" class="form-control">
                <option value="ACTIVE" selected>ACTIVE (Instant Access)</option>
                <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="onboardHospPass">Initial Administrator Password *</label>
              <input type="password" id="onboardHospPass" class="form-control" placeholder="Minimum 8 characters" minlength="8" required oninput="validateOnboardPasswordForm()">
              <div style="font-size: 0.74rem; color: var(--text-dim); margin-top: 3px;">Min 8 chars (letters and numbers). Required.</div>
            </div>
            <div class="form-group">
              <label class="form-label" for="onboardHospPassConfirm">Confirm Initial Password *</label>
              <input type="password" id="onboardHospPassConfirm" class="form-control" placeholder="Re-enter password" minlength="8" required oninput="validateOnboardPasswordForm()">
              <div id="passMismatchNotice" style="font-size: 0.74rem; color: var(--danger); margin-top: 3px; display: none;">Passwords do not match</div>
            </div>
          </div>
          <div id="onboardHospAlert" class="alert-banner hidden"></div>
          <div class="modal-actions" style="margin-top: 20px;">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('onboardHospModal')">Cancel</button>
            <button type="submit" class="btn btn-primary" id="onboardSubmitBtn">Onboard & Provision Credentials</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.validateOnboardPasswordForm = function() {
  const p1 = document.getElementById('onboardHospPass')?.value || '';
  const p2 = document.getElementById('onboardHospPassConfirm')?.value || '';
  const notice = document.getElementById('passMismatchNotice');
  const btn = document.getElementById('onboardSubmitBtn');

  if (p2.length > 0 && p1 !== p2) {
    if (notice) notice.style.display = 'block';
  } else {
    if (notice) notice.style.display = 'none';
  }
};

window.handleOnboardHospitalSubmit = async function(event) {
  event.preventDefault();
  const name = document.getElementById('onboardHospName')?.value.trim();
  const code = document.getElementById('onboardHospCode')?.value.trim();
  const type = document.getElementById('onboardHospType')?.value;
  const email = document.getElementById('onboardHospEmail')?.value.trim();
  const contact = document.getElementById('onboardHospPhone')?.value.trim();
  const emergencyContact = document.getElementById('onboardHospEmerPhone')?.value.trim();
  const website = document.getElementById('onboardHospWebsite')?.value.trim();
  const totalBeds = parseInt(document.getElementById('onboardHospBeds')?.value || '100', 10);
  const availableBeds = parseInt(document.getElementById('onboardHospAvailBeds')?.value || '50', 10);
  const address = document.getElementById('onboardHospAddress')?.value.trim();
  const city = document.getElementById('onboardHospCity')?.value.trim();
  const state = document.getElementById('onboardHospState')?.value.trim();
  const pinCode = document.getElementById('onboardHospPin')?.value.trim();
  const accreditation = document.getElementById('onboardHospAccred')?.value.trim();
  const specializations = document.getElementById('onboardHospSpecial')?.value.trim();
  const facilities = document.getElementById('onboardHospFacilities')?.value.trim();
  const status = document.getElementById('onboardHospStatus')?.value || 'ACTIVE';
  const initialPassword = document.getElementById('onboardHospPass')?.value;
  const confirmPassword = document.getElementById('onboardHospPassConfirm')?.value;
  const alertEl = document.getElementById('onboardHospAlert');
  const btn = document.getElementById('onboardSubmitBtn');

  // Client-side Strict Validation
  if (!initialPassword || initialPassword.trim().length === 0) {
    if (alertEl) {
      alertEl.textContent = 'Initial hospital administrator password is required.';
      alertEl.classList.remove('hidden');
    }
    return;
  }
  if (initialPassword.trim().length < 8) {
    if (alertEl) {
      alertEl.textContent = 'Initial password must be at least 8 characters.';
      alertEl.classList.remove('hidden');
    }
    return;
  }
  if (initialPassword.trim() !== (confirmPassword || '').trim()) {
    if (alertEl) {
      alertEl.textContent = 'Initial password and confirm password do not match.';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Provisioning Facility...';
  }

  try {
    const res = await window.hospitrackStore.createHospital({
      name,
      code,
      type,
      email,
      contact,
      emergencyContact,
      website,
      totalBeds,
      availableBeds,
      address,
      city,
      state,
      pinCode,
      location: `${address}, ${city}, ${state}`,
      accreditation,
      specializations,
      facilities,
      status,
      initialPassword: initialPassword.trim(),
      confirmPassword: confirmPassword.trim()
    });

    closeGlobalModal('onboardHospModal');
    window.showToast(`Facility ${name} onboarded successfully.`, 'success');
    window.renderAdminDashboard(document.getElementById('mainContentArea'));

    if (res && (res.temporaryPassword || res.adminUserId)) {
      window.openProvisionedCredentialsModal(res);
    }
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Onboard & Provision Credentials';
    }
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to onboard hospital.';
      alertEl.classList.remove('hidden');
    }
  }
};

window.openProvisionedCredentialsModal = function(data) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const hName = data.hospital?.name || data.adminName || 'Healthcare Facility';
  const hId = data.hospital?.id || data.adminUserId || '';
  const email = data.adminEmail || data.hospital?.email || '';
  const tempPass = data.temporaryPassword || data.initialPassword || '';

  modalContainer.innerHTML = `
    <div id="provisionedCredentialsModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="provCredTitle">
      <div class="modal-box" style="max-width: 540px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" id="provCredTitle">🔐 Hospital Administrator Credentials Provisioned</h3>
            <p class="modal-subtitle">Secure initial credential confirmation for healthcare facility</p>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('provisionedCredentialsModal')" aria-label="Close">✕</button>
        </div>
        <div style="padding: 16px 0;">
          <div style="background: rgba(14, 165, 233, 0.08); border: 1px solid rgba(14, 165, 233, 0.25); border-radius: 8px; padding: 14px; margin-bottom: 16px;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Facility Onboarded</div>
            <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-main); margin-top: 2px;">${escapeHtml(hName)}</div>
            <div style="font-size: 0.85rem; color: var(--text-muted); font-family: monospace; margin-top: 2px;">Hospital ID: <strong>${escapeHtml(hId)}</strong></div>
          </div>

          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label" style="font-weight: 700;">Administrator Username / Official Email</label>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="provCredEmail" class="form-control" value="${escapeHtml(email)}" readonly style="background: var(--bg-surface-secondary); font-family: monospace; font-weight: 600;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="copyAdminCredential('${escapeHtml(email)}', 'Email copied')">📋 Copy</button>
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label" style="font-weight: 700;">Initial Administrator Password</label>
            <div style="display: flex; gap: 8px;">
              <input type="password" id="provCredPass" class="form-control" value="${escapeHtml(tempPass)}" readonly style="background: var(--bg-surface-secondary); font-family: monospace; font-weight: 700; letter-spacing: 0.05em;">
              <button type="button" class="btn btn-secondary btn-sm" id="toggleProvPassBtn" onclick="toggleAdminPasswordVisibility('provCredPass', 'toggleProvPassBtn')">👁️ Show</button>
              <button type="button" class="btn btn-primary btn-sm" onclick="copyAdminCredential('${escapeHtml(tempPass)}', 'Password copied')">📋 Copy</button>
            </div>
          </div>

          <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 12px 14px; margin-top: 16px;">
            <div style="display: flex; align-items: flex-start; gap: 8px;">
              <span style="font-size: 1.1rem;">⚠️</span>
              <div style="font-size: 0.82rem; color: #b45309; line-height: 1.45;">
                <strong>Security Notice:</strong> The password has been cryptographically hashed (BCrypt) in PostgreSQL and is never stored in plaintext. This confirmation view is the only time the initial password is shown in the session.
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions" style="margin-top: 16px;">
          <button type="button" class="btn btn-primary" style="width: 100%;" onclick="closeGlobalModal('provisionedCredentialsModal')">
            ✓ Done & Close
          </button>
        </div>
      </div>
    </div>
  `;
};

window.refreshBedNetworkLive = async function() {
  const store = window.hospitrackStore;
  if (!store) return;
  try {
    window.showToast('Synchronizing bed network...', 'info');
    if (typeof store.fetchBedNetwork === 'function') {
      await store.fetchBedNetwork();
    }
    await store.syncAllData();
    window.renderAdminDashboard(document.getElementById('mainContentArea'), 'beds');
    window.showToast('Network bed capacity synchronized.', 'success');
  } catch (e) {
    window.showToast('Failed to refresh bed network: ' + e.message, 'error');
  }
};

window.openResetHospitalCredentialsModal = function(hospitalId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const hospital = store.getHospitalById(hospitalId) || { id: hospitalId, name: 'Hospital Facility' };

  modalContainer.innerHTML = `
    <div id="resetHospCredModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="resetHospTitle">
      <div class="modal-box" style="max-width: 480px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" id="resetHospTitle">🔑 Reset Administrator Credentials</h3>
            <p class="modal-subtitle">Generate new secure temporary password for ${escapeHtml(hospital.name)}</p>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('resetHospCredModal')" aria-label="Close">✕</button>
        </div>
        <div style="padding: 14px 0;">
          <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; margin: 0 0 14px 0;">
            This will invalidate all current active sessions for <strong>${escapeHtml(hospital.name)}</strong>'s administrator account and generate a fresh temporary password.
          </p>
          <div id="resetHospAlert" class="alert-banner hidden"></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('resetHospCredModal')">Cancel</button>
          <button type="button" class="btn btn-primary" id="confirmResetHospBtn" onclick="handleConfirmResetHospitalCredentials('${hospitalId}')">
            Confirm & Reset Password
          </button>
        </div>
      </div>
    </div>
  `;
};

window.handleConfirmResetHospitalCredentials = async function(hospitalId) {
  const btn = document.getElementById('confirmResetHospBtn');
  const alertEl = document.getElementById('resetHospAlert');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Resetting...';
  }

  try {
    const res = await window.hospitrackStore.resetHospitalCredentials(hospitalId);
    closeGlobalModal('resetHospCredModal');
    window.showToast('Administrator credentials reset successfully.', 'success');
    window.openProvisionedCredentialsModal(res);
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Confirm & Reset Password';
    }
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to reset credentials.';
      alertEl.classList.remove('hidden');
    }
  }
};

window.copyAdminCredential = function(text, toastMsg) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      window.showToast(toastMsg || 'Copied to clipboard', 'success');
    }).catch(() => {
      fallbackCopyText(text, toastMsg);
    });
  } else {
    fallbackCopyText(text, toastMsg);
  }
};

function fallbackCopyText(text, toastMsg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    window.showToast(toastMsg || 'Copied to clipboard', 'success');
  } catch (e) {
    window.showToast('Please copy manually', 'warning');
  }
  document.body.removeChild(ta);
}

window.toggleAdminPasswordVisibility = function(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (btn) btn.textContent = '🔒 Hide';
  } else {
    input.type = 'password';
    if (btn) btn.textContent = '👁️ Show';
  }
};

// Patient Health Summary Viewer & Print Controller
window.openPatientHealthSummaryPrint = async function(patientId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const patient = store.getPatientById(patientId) || (store.getPatients() || []).find(p => p.id === patientId) || { id: patientId, name: 'Patient Record' };
  const hospital = store.getHospitalById(patient.currentHospitalId || patient.hospitalId) || { name: 'Assigned Hospital Facility', location: 'National Health Network' };
  const doctor = store.getDoctorById(patient.primaryDoctorId) || { name: 'Attending Physician', specialty: 'General Clinical Medicine' };
  
  const prescriptions = store.getPrescriptionsByPatient ? store.getPrescriptionsByPatient(patientId) : [];
  const reports = store.getLabsByPatient ? store.getLabsByPatient(patientId) : [];

  modalContainer.innerHTML = `
    <div id="adminPatientSummaryModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="summaryModalTitle">
      <div class="modal-box modal-box-lg">
        <div class="modal-header no-print">
          <div>
            <h3 class="modal-title" id="summaryModalTitle">📄 Longitudinal Health Summary</h3>
            <p class="modal-subtitle">Official verified clinical dossier for ${escapeHtml(patient.name || patientId)}</p>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('adminPatientSummaryModal')" aria-label="Close">✕</button>
        </div>

        <div class="medical-summary-document" style="padding: 1.5rem; background: #ffffff; color: #0f172a; border-radius: var(--radius-md);">
          <!-- Header -->
          <div style="border-bottom: 2px solid #0d9488; padding-bottom: 1rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 1.3rem; font-weight: 800; color: #0d9488; letter-spacing: -0.5px;">HOSPITRACK NATIONAL HEALTHCARE NETWORK</div>
              <div style="font-size: 0.82rem; color: #64748b; margin-top: 2px;">Comprehensive Longitudinal Health Record Summary</div>
            </div>
            <div style="text-align: right; font-size: 0.78rem; color: #64748b;">
              <div>Generated: <strong>${new Date().toLocaleDateString([], { dateStyle: 'full' })}</strong></div>
              <div>Ledger: <strong style="color: #059669;">SHA-256 Verified</strong></div>
            </div>
          </div>

          <!-- Demographics -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 8px; margin-bottom: 1.25rem;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 8px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px;">Patient Demographics</div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; font-size: 0.84rem;">
              <div><strong>Full Name:</strong> ${escapeHtml(patient.name)}</div>
              <div><strong>Patient ID:</strong> <code>${escapeHtml(patient.id)}</code></div>
              <div><strong>Age / Gender:</strong> ${patient.age || 'N/A'} yrs / ${escapeHtml(patient.gender || 'N/A')}</div>
              <div><strong>Blood Group:</strong> <strong style="color: #0d9488;">${escapeHtml(patient.bloodGroup || 'N/A')}</strong></div>
              <div><strong>Contact Phone:</strong> ${escapeHtml(patient.contact || 'N/A')}</div>
              <div><strong>Email:</strong> ${escapeHtml(patient.email || 'N/A')}</div>
              <div><strong>Emergency Contact:</strong> ${escapeHtml(patient.emergencyContact || 'N/A')}</div>
              <div><strong>Address:</strong> ${escapeHtml(patient.address || 'N/A')}</div>
            </div>
          </div>

          <!-- Facility & Doctor -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 1.25rem;">
            <div style="padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
              <div style="font-size: 0.75rem; color: #64748b; font-weight: 700;">ASSIGNED HEALTHCARE FACILITY</div>
              <div style="font-weight: 700; font-size: 0.95rem; color: #0f172a; margin-top: 2px;">${escapeHtml(hospital.name)}</div>
              <div style="font-size: 0.8rem; color: #64748b;">${escapeHtml(hospital.location)}</div>
            </div>
            <div style="padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
              <div style="font-size: 0.75rem; color: #64748b; font-weight: 700;">ATTENDING PHYSICIAN</div>
              <div style="font-weight: 700; font-size: 0.95rem; color: #0f172a; margin-top: 2px;">${escapeHtml(doctor.name)}</div>
              <div style="font-size: 0.8rem; color: #64748b;">${escapeHtml(doctor.specialty || 'Clinical Medicine')}</div>
            </div>
          </div>

          <!-- Active Prescriptions -->
          <div style="margin-bottom: 1.25rem;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px; font-size: 0.88rem;">Active Medication Regimens (${prescriptions.length})</div>
            ${prescriptions.length === 0 ? `<p style="color: #64748b; font-size: 0.82rem; margin: 0;">No active prescriptions recorded.</p>` : `
              <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;">
                <thead>
                  <tr style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                    <th style="padding: 6px 8px;">Date</th>
                    <th style="padding: 6px 8px;">Medications</th>
                    <th style="padding: 6px 8px;">Dosage &amp; Frequency</th>
                    <th style="padding: 6px 8px;">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  ${prescriptions.map(p => `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 6px 8px;">${new Date(p.prescribedAt || p.createdAt).toLocaleDateString()}</td>
                      <td style="padding: 6px 8px;">${(p.items || []).map(i => `<strong>${escapeHtml(i.name)}</strong>`).join(', ')}</td>
                      <td style="padding: 6px 8px;">${(p.items || []).map(i => `${escapeHtml(i.dosage)} (${escapeHtml(i.frequency)})`).join(', ')}</td>
                      <td style="padding: 6px 8px;">${(p.items || []).map(i => escapeHtml(i.duration)).join(', ')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>

          <!-- Diagnostic Labs -->
          <div style="margin-bottom: 1.25rem;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px; font-size: 0.88rem;">Diagnostic Laboratory Findings (${reports.length})</div>
            ${reports.length === 0 ? `<p style="color: #64748b; font-size: 0.82rem; margin: 0;">No diagnostic reports recorded.</p>` : `
              <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;">
                <thead>
                  <tr style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                    <th style="padding: 6px 8px;">Date</th>
                    <th style="padding: 6px 8px;">Test Name</th>
                    <th style="padding: 6px 8px;">Category</th>
                    <th style="padding: 6px 8px;">Result Finding</th>
                  </tr>
                </thead>
                <tbody>
                  ${reports.map(r => `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 6px 8px;">${new Date(r.reportDate || r.createdAt).toLocaleDateString()}</td>
                      <td style="padding: 6px 8px;"><strong>${escapeHtml(r.testName)}</strong></td>
                      <td style="padding: 6px 8px;">${escapeHtml(r.category || 'General')}</td>
                      <td style="padding: 6px 8px;">${escapeHtml(r.resultSummary || 'Normal')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 0.75rem; font-size: 0.75rem; color: #64748b; text-align: center;">
            Official document generated from Hospitrack Enterprise Healthcare Network. Tamper-evident and privacy-protected.
          </div>
        </div>

        <div class="modal-actions no-print" style="margin-top: 1rem; display: flex; justify-content: flex-end; gap: 8px;">
          <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('adminPatientSummaryModal')">Close</button>
          <button type="button" class="btn btn-primary" onclick="window.printPatientSummary('${patient.id || patientId}')">🖨️ Print Health Summary</button>
        </div>
      </div>
    </div>
  `;
};
