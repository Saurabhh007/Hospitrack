/**
 * Hospitrack — Production Workspace Renderer Engine
 * Modular, role-aware workspace renderer for Patient (8 tabs), Doctor, Hospital,
 * Referral, and Transfer workspaces.
 * Follows strict architecture: Reads authoritative data through store.js,
 * renders inside #mainContentArea with intact Header and Sidebar.
 */

(function() {
  'use strict';

  const workspaceRenderer = {

    // ------------------------------------------------------------------------
    // Common Shell & State Helpers
    // ------------------------------------------------------------------------
    renderLoading(container, title = 'Loading Workspace...') {
      if (!container) return;
      container.innerHTML = `
        <div class="workspace-state-box">
          <div class="spinner-lg"></div>
          <h3 class="mt-16">${escapeHtml(title)}</h3>
          <p class="text-muted">Fetching authoritative clinical records from Hospitrack backend...</p>
        </div>
      `;
    },

    renderNotFound(container, entityType = 'Record', id = '') {
      if (!container) return;
      container.innerHTML = `
        <div class="workspace-state-box">
          <div class="state-icon-large">🔍</div>
          <h2 class="mt-16 text-danger">Record Not Found</h2>
          <p class="text-secondary mt-8">
            The requested ${escapeHtml(entityType)} with ID <code>${escapeHtml(id)}</code> was not found in the database.
          </p>
          <div class="mt-24">
            <button type="button" class="btn btn-primary" onclick="window.navigateWorkspaceBack()">
              ← Back
            </button>
          </div>
        </div>
      `;
    },

    renderAccessDenied(container, entityType = 'Record', id = '') {
      if (!container) return;
      container.innerHTML = `
        <div class="workspace-state-box">
          <div class="state-icon-large">🔒</div>
          <h2 class="mt-16 text-warning">Access Denied</h2>
          <p class="text-secondary mt-8">
            You do not have administrative or clinical permission to access this ${escapeHtml(entityType)} (<code>${escapeHtml(id)}</code>).
          </p>
          <p class="text-muted font-xs mt-4">
            Data isolation protocol enforced by Spring Security &amp; DataIsolationGuard.
          </p>
          <div class="mt-24">
            <button type="button" class="btn btn-primary" onclick="window.navigateWorkspaceBack()">
              ← Back
            </button>
          </div>
        </div>
      `;
    },

    renderError(container, message = 'An unexpected error occurred.', error = null) {
      if (!container) return;
      if (error && (error.status === 404 || error.message?.includes('not found') || error.message?.includes('404'))) {
        this.renderNotFound(container, 'Record', '');
        return;
      }
      if (error && (error.status === 403 || error.message?.includes('Access denied') || error.message?.includes('403'))) {
        this.renderAccessDenied(container, 'Record', '');
        return;
      }

      container.innerHTML = `
        <div class="workspace-state-box">
          <div class="state-icon-large">⚠️</div>
          <h2 class="mt-16 text-danger">Unable to Load Workspace</h2>
          <p class="text-secondary mt-8">${escapeHtml(message)}</p>
          <div class="mt-24 d-flex gap-12 justify-center">
            <button type="button" class="btn btn-secondary" onclick="window.navigateWorkspaceBack()">
              ← Back
            </button>
            <button type="button" class="btn btn-primary" onclick="window.location.reload()">
              🔄 Retry
            </button>
          </div>
        </div>
      `;
    },

    // ------------------------------------------------------------------------
    // 1. PATIENT WORKSPACE (EXACTLY 8 SECTIONS / TABS)
    // ------------------------------------------------------------------------
    async renderPatientWorkspace(container, patientId, activeTab = 'overview') {
      const store = window.hospitrackStore;
      const user = window.hospitrackAuth?.getCurrentUser();
      const currentRole = user?.role;

      this.renderLoading(container, `Loading Patient Workspace (${patientId})...`);

      try {
        const patient = await store.fetchPatientById(patientId);
        if (!patient) {
          this.renderNotFound(container, 'Patient', patientId);
          return;
        }

        // Fetch Timeline / Clinical Data asynchronously
        let timelineData = { visits: [], prescriptions: [], reports: [] };
        try {
          const res = await store.getPatientTimeline(patientId);
          if (res) timelineData = res;
        } catch (e) {
          console.warn('Timeline fetch error:', e.message);
        }

        const visits = timelineData.visits || [];
        const prescriptions = timelineData.prescriptions || store.getPrescriptions(patientId);
        const reports = timelineData.reports || store.getLabs(null, patientId);
        const referrals = store.getReferrals().filter(r => r.patientId === patientId);
        const transfers = store.getTransfers().filter(t => t.patientId === patientId);

        const hospital = store.getHospitalById(patient.currentHospitalId) || {
          id: patient.currentHospitalId || 'N/A',
          name: patient.currentHospitalId ? `Hospital (${patient.currentHospitalId})` : 'Not assigned'
        };

        const doctor = store.getDoctorById(patient.primaryDoctorId) || {
          id: patient.primaryDoctorId || 'N/A',
          name: patient.primaryDoctorId ? `Doctor (${patient.primaryDoctorId})` : 'Not assigned',
          specialty: 'General Medicine'
        };

        const validTabs = [
          'overview',
          'profile',
          'clinical',
          'consultations',
          'prescriptions',
          'labs',
          'referrals',
          'timeline'
        ];

        let currentTab = validTabs.includes(activeTab) ? activeTab : 'overview';

        // Render Top Header with Breadcrumbs and Role-Aware Actions
        let actionsHtml = '';
        if (currentRole === 'DOCTOR') {
          actionsHtml = `
            <button type="button" class="btn btn-primary btn-sm" onclick="openStartConsultationModal('${patient.id}')">
              <span>+</span> New Consultation
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="openDirectPrescriptionModal('${patient.id}')">
              <span>💊</span> Prescribe
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="openOrderLabModal('${patient.id}')">
              <span>🔬</span> Order Lab
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="openCreateReferralModal('${patient.id}')">
              <span>🔁</span> Referral
            </button>
          `;
        } else if (currentRole === 'HOSPITAL_ADMIN' || currentRole === 'SUPER_ADMIN') {
          actionsHtml = `
            <button type="button" class="btn btn-primary btn-sm" onclick="openEditPatientModal('${patient.id}')">
              <span>✏️</span> Edit Profile
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="openChangePatientPhotoModal('${patient.id}')">
              <span>📷</span> Manage Photo
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="openCreateReferralModal('${patient.id}')">
              <span>🔁</span> New Referral
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="openCreateTransferModal('${patient.id}')">
              <span>🚑</span> Emergency Transfer
            </button>
            ${patient.status !== 'DISCHARGED' ? `
              <button type="button" class="btn btn-outline-danger btn-sm" onclick="handleWorkspaceDischargePatient('${patient.id}')">
                <span>🚪</span> Discharge Patient
              </button>
            ` : ''}
          `;
        }

        const tabNavHtml = `
          <div class="workspace-tabs-bar" role="tablist">
            <button type="button" role="tab" class="workspace-tab ${currentTab === 'overview' ? 'active' : ''}" onclick="window.switchPatientWorkspaceTab('${patient.id}', 'overview')">
              <span>📊</span> 1. Overview
            </button>
            <button type="button" role="tab" class="workspace-tab ${currentTab === 'profile' ? 'active' : ''}" onclick="window.switchPatientWorkspaceTab('${patient.id}', 'profile')">
              <span>👤</span> 2. Profile &amp; Demographics
            </button>
            <button type="button" role="tab" class="workspace-tab ${currentTab === 'clinical' ? 'active' : ''}" onclick="window.switchPatientWorkspaceTab('${patient.id}', 'clinical')">
              <span>🩺</span> 3. Clinical Summary &amp; Vitals
            </button>
            <button type="button" role="tab" class="workspace-tab ${currentTab === 'consultations' ? 'active' : ''}" onclick="window.switchPatientWorkspaceTab('${patient.id}', 'consultations')">
              <span>📋</span> 4. Consultations &amp; Visits (${visits.length})
            </button>
            <button type="button" role="tab" class="workspace-tab ${currentTab === 'prescriptions' ? 'active' : ''}" onclick="window.switchPatientWorkspaceTab('${patient.id}', 'prescriptions')">
              <span>💊</span> 5. Active Prescriptions (${prescriptions.length})
            </button>
            <button type="button" role="tab" class="workspace-tab ${currentTab === 'labs' ? 'active' : ''}" onclick="window.switchPatientWorkspaceTab('${patient.id}', 'labs')">
              <span>🔬</span> 6. Diagnostic Lab Reports (${reports.length})
            </button>
            <button type="button" role="tab" class="workspace-tab ${currentTab === 'referrals' ? 'active' : ''}" onclick="window.switchPatientWorkspaceTab('${patient.id}', 'referrals')">
              <span>🔁</span> 7. Specialist Referrals (${referrals.length})
            </button>
            <button type="button" role="tab" class="workspace-tab ${currentTab === 'timeline' ? 'active' : ''}" onclick="window.switchPatientWorkspaceTab('${patient.id}', 'timeline')">
              <span>⏳</span> 8. Care Timeline
            </button>
          </div>
        `;

        let tabContentHtml = '';

        // TAB 1: OVERVIEW
        if (currentTab === 'overview') {
          tabContentHtml = `
            <div class="workspace-section">
              <!-- Vitals & Stat Summary Grid -->
              <div class="workspace-stats-grid">
                <div class="workspace-stat-card">
                  <div class="stat-label">Patient Record ID</div>
                  <div class="stat-value text-primary font-mono">${escapeHtml(patient.id)}</div>
                  <div class="stat-sub">Authoritative Clinical Record</div>
                </div>
                <div class="workspace-stat-card">
                  <div class="stat-label">Demographics</div>
                  <div class="stat-value">${patient.age ? `${patient.age} yrs` : 'Not available'} • ${escapeHtml(patient.gender || 'Not available')}</div>
                  <div class="stat-sub">Blood Group: <strong>${escapeHtml(patient.bloodGroup || 'Not available')}</strong></div>
                </div>
                <div class="workspace-stat-card">
                  <div class="stat-label">Admitted Hospital</div>
                  <div class="stat-value font-sm">${escapeHtml(hospital.name || 'Not available')}</div>
                  <div class="stat-sub">Facility: <code>${escapeHtml(patient.currentHospitalId || 'N/A')}</code></div>
                </div>
                <div class="workspace-stat-card">
                  <div class="stat-label">Primary Physician</div>
                  <div class="stat-value font-sm">${escapeHtml(doctor.name || 'Not available')}</div>
                  <div class="stat-sub">${escapeHtml(doctor.specialty || 'General')}</div>
                </div>
              </div>

              <!-- Quick Clinical Snapshot -->
              <div class="workspace-card mt-20">
                <div class="card-header-clean">
                  <div>
                    <h3 class="card-title">Clinical Care Summary</h3>
                    <p class="card-subtitle">Active medical overview and attending care team</p>
                  </div>
                  <span class="badge ${getStatusBadgeClass(patient.status)}">${escapeHtml(patient.status || 'ACTIVE')}</span>
                </div>
                <div class="profile-details-grid mt-16">
                  <div class="profile-field-box">
                    <div class="profile-field-label">Contact Phone</div>
                    <div class="profile-field-value">${escapeHtml(patient.contact || 'Not available')}</div>
                  </div>
                  <div class="profile-field-box">
                    <div class="profile-field-label">Registered Email</div>
                    <div class="profile-field-value">${escapeHtml(patient.email || 'Not available')}</div>
                  </div>
                  <div class="profile-field-box">
                    <div class="profile-field-label">Emergency Contact</div>
                    <div class="profile-field-value">${escapeHtml(patient.emergencyContact || 'Not available')}</div>
                  </div>
                  <div class="profile-field-box">
                    <div class="profile-field-label">Residential Address</div>
                    <div class="profile-field-value">${escapeHtml(patient.address || 'Not available')}</div>
                  </div>
                </div>
              </div>

              <!-- Recent Activity Quick Cards -->
              <div class="form-grid-2col mt-20">
                <div class="workspace-card">
                  <div class="card-header-clean">
                    <h3 class="card-title">Latest Consultation</h3>
                    <button type="button" class="btn-link-sm" onclick="window.switchPatientWorkspaceTab('${patient.id}', 'consultations')">View all (${visits.length})</button>
                  </div>
                  ${visits.length > 0 ? `
                    <div class="p-12 bg-surface-alt radius-md mt-12">
                      <strong>${escapeHtml(visits[0].diagnosis || 'General Consultation')}</strong>
                      <p class="text-secondary font-sm mt-4">${escapeHtml(visits[0].treatment || visits[0].notes || 'Clinical notes recorded.')}</p>
                      <span class="text-muted font-xs mt-6 display-block">📅 ${formatDateTime(visits[0].visitDate)} • Dr. ${escapeHtml(doctor.name)}</span>
                    </div>
                  ` : `
                    <p class="text-muted font-sm mt-12">No recorded clinical visits available.</p>
                  `}
                </div>

                <div class="workspace-card">
                  <div class="card-header-clean">
                    <h3 class="card-title">Active Regimen</h3>
                    <button type="button" class="btn-link-sm" onclick="window.switchPatientWorkspaceTab('${patient.id}', 'prescriptions')">View all (${prescriptions.length})</button>
                  </div>
                  ${prescriptions.length > 0 ? `
                    <div class="p-12 bg-surface-alt radius-md mt-12">
                      <strong>Prescription Order ${escapeHtml(prescriptions[0].id)}</strong>
                      <div class="mt-6">
                        ${(prescriptions[0].items || []).map(item => `
                          <span class="badge badge-info mr-6 mb-4">${escapeHtml(item.name)} ${escapeHtml(item.dosage || '')}</span>
                        `).join('')}
                      </div>
                      <span class="text-muted font-xs mt-6 display-block">Prescribed: ${formatDateTime(prescriptions[0].prescribedAt)}</span>
                    </div>
                  ` : `
                    <p class="text-muted font-sm mt-12">No active prescriptions currently on file.</p>
                  `}
                </div>
              </div>
            </div>
          `;
        }

        // TAB 2: PROFILE & DEMOGRAPHICS
        else if (currentTab === 'profile') {
          const isHospitalOrSuperAdmin = currentRole === 'HOSPITAL_ADMIN' || currentRole === 'SUPER_ADMIN';
          tabContentHtml = `
            <div class="workspace-section">
              <div class="workspace-card">
                <div class="card-header-clean">
                  <div>
                    <h3 class="card-title">Patient Profile &amp; Demographics</h3>
                    <p class="card-subtitle">Verified clinical identity, residential information, and facility allocation</p>
                  </div>
                  ${isHospitalOrSuperAdmin ? `
                    <div class="d-flex gap-8">
                      <button type="button" class="btn btn-primary btn-sm" onclick="openEditPatientModal('${patient.id}')">
                        ✏️ Edit Profile
                      </button>
                      <button type="button" class="btn btn-secondary btn-sm" onclick="openChangePatientPhotoModal('${patient.id}')">
                        📷 Photo
                      </button>
                    </div>
                  ` : `
                    <span class="badge badge-active">✓ Hospital Verified Profile</span>
                  `}
                </div>

                <!-- Patient Photo & Official Verification Banner -->
                <div class="p-16 bg-surface-alt radius-md mt-16 border-subtle d-flex align-center gap-16" style="flex-wrap: wrap;">
                  <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--bg-surface); border: 2px solid var(--primary); display: flex; align-items: center; justify-content: center; font-size: 2rem; overflow: hidden; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    ${patient.photoUrl ? `
                      <img src="${escapeHtml(patient.photoUrl)}" alt="${escapeHtml(patient.name)}" style="width: 100%; height: 100%; object-fit: cover;">
                    ` : `
                      <span>👤</span>
                    `}
                  </div>
                  <div style="flex: 1; min-width: 240px;">
                    <div class="d-flex align-center gap-8">
                      <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-main);">${escapeHtml(patient.name)}</h4>
                      <span class="badge badge-active">✓ Hospital Verified Profile</span>
                    </div>
                    <div class="text-secondary font-xs mt-4">
                      Official Record ID: <code class="font-mono text-primary font-semibold">${escapeHtml(patient.id)}</code> • Admitted Facility: <strong>${escapeHtml(hospital.name)}</strong>
                    </div>
                    <div class="text-muted font-xs mt-4">
                      ${isHospitalOrSuperAdmin ? `
                        Hospital Admin owns and maintains this official patient clinical profile.
                      ` : `
                        Your clinical profile is maintained by your hospital. Contact your hospital if any information needs to be corrected.
                      `}
                    </div>
                  </div>
                </div>

                <div class="profile-details-grid mt-20">
                  <div class="profile-field-box">
                    <div class="profile-field-label">Full Name</div>
                    <div class="profile-field-value font-semibold">${escapeHtml(patient.name || 'Not available')}</div>
                  </div>
                  <div class="profile-field-box">
                    <div class="profile-field-label">Patient Record ID</div>
                    <div class="profile-field-value font-mono">${escapeHtml(patient.id)}</div>
                  </div>
                  <div class="profile-field-box">
                    <div class="profile-field-label">Age</div>
                    <div class="profile-field-value">${patient.age ? `${patient.age} years` : 'Not available'}</div>
                  </div>
                  <div class="profile-field-box">
                    <div class="profile-field-label">Gender</div>
                    <div class="profile-field-value">${escapeHtml(patient.gender || 'Not available')}</div>
                  </div>
                  <div class="profile-field-box">
                    <div class="profile-field-label">Blood Group</div>
                    <div class="profile-field-value font-semibold text-danger">${escapeHtml(patient.bloodGroup || 'Not available')}</div>
                  </div>
                  <div class="profile-field-box">
                    <div class="profile-field-label">Status</div>
                    <div class="profile-field-value">
                      <span class="badge ${getStatusBadgeClass(patient.status)}">${escapeHtml(patient.status || 'ACTIVE')}</span>
                    </div>
                  </div>
                  <div class="profile-field-box">
                    <div class="profile-field-label">Contact Phone</div>
                    <div class="profile-field-value">${escapeHtml(patient.contact || patient.phone || 'Not available')}</div>
                  </div>
                  <div class="profile-field-box">
                    <div class="profile-field-label">Email Address</div>
                    <div class="profile-field-value">${escapeHtml(patient.email || 'Not available')}</div>
                  </div>
                  <div class="profile-field-box full-width">
                    <div class="profile-field-label">Residential Address</div>
                    <div class="profile-field-value">${escapeHtml(patient.address || 'Not available')}</div>
                  </div>
                  <div class="profile-field-box full-width">
                    <div class="profile-field-label">Emergency Contact &amp; Relation</div>
                    <div class="profile-field-value">${escapeHtml(patient.emergencyContact || 'Not available')}</div>
                  </div>
                  <div class="profile-field-box">
                    <div class="profile-field-label">Assigned Hospital Facility</div>
                    <div class="profile-field-value">${escapeHtml(hospital.name)} (<code>${escapeHtml(patient.currentHospitalId || 'N/A')}</code>)</div>
                  </div>
                  <div class="profile-field-box">
                    <div class="profile-field-label">Primary Attending Physician</div>
                    <div class="profile-field-value">${escapeHtml(doctor.name)} (<code>${escapeHtml(patient.primaryDoctorId || 'N/A')}</code>)</div>
                  </div>
                </div>
              </div>
            </div>
          `;
        }

        // TAB 3: CLINICAL SUMMARY & VITALS
        else if (currentTab === 'clinical') {
          const latestVisit = visits[0] || null;
          tabContentHtml = `
            <div class="workspace-section">
              <div class="workspace-card">
                <div class="card-header-clean">
                  <div>
                    <h3 class="card-title">Clinical Summary &amp; Physiological Parameters</h3>
                    <p class="card-subtitle">Latest clinical observations, diagnosis, and attending treatment plan</p>
                  </div>
                </div>

                ${latestVisit ? `
                  <div class="p-16 bg-surface-alt radius-md mt-16 border-subtle">
                    <div class="d-flex-between">
                      <strong class="font-md text-main">Primary Diagnosis: ${escapeHtml(latestVisit.diagnosis || 'Not specified')}</strong>
                      <span class="text-muted font-xs">Recorded: ${formatDateTime(latestVisit.visitDate)}</span>
                    </div>

                    <div class="profile-details-grid mt-16">
                      <div class="profile-field-box full-width">
                        <div class="profile-field-label">Chief Symptoms</div>
                        <div class="profile-field-value">${escapeHtml(latestVisit.symptoms || 'None recorded')}</div>
                      </div>
                      <div class="profile-field-box full-width">
                        <div class="profile-field-label">Treatment Protocol</div>
                        <div class="profile-field-value">${escapeHtml(latestVisit.treatment || 'No specific treatment protocol provided')}</div>
                      </div>
                      <div class="profile-field-box full-width">
                        <div class="profile-field-label">Physician Clinical Notes</div>
                        <div class="profile-field-value">${escapeHtml(latestVisit.notes || 'No additional notes.')}</div>
                      </div>
                    </div>
                  </div>
                ` : `
                  <div class="empty-placeholder mt-16">
                    <span>🩺</span>
                    <p>No clinical consults or vitals recorded for this patient yet.</p>
                  </div>
                `}
              </div>
            </div>
          `;
        }

        // TAB 4: CONSULTATIONS & VISITS
        else if (currentTab === 'consultations') {
          tabContentHtml = `
            <div class="workspace-section">
              <div class="workspace-card">
                <div class="card-header-clean">
                  <div>
                    <h3 class="card-title">Clinical Consultations &amp; Visits (${visits.length})</h3>
                    <p class="card-subtitle">Chronological record of inpatient/outpatient physician consults</p>
                  </div>
                  ${currentRole === 'DOCTOR' ? `
                    <button type="button" class="btn btn-primary btn-sm" onclick="openStartConsultationModal('${patient.id}')">
                      + Log Visit
                    </button>
                  ` : ''}
                </div>

                ${visits.length === 0 ? `
                  <div class="empty-placeholder mt-16">
                    <span>📋</span>
                    <p>No clinical consultations recorded for this patient.</p>
                  </div>
                ` : `
                  <div class="table-responsive mt-16">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Visit ID</th>
                          <th>Date &amp; Time</th>
                          <th>Attending Doctor</th>
                          <th>Facility</th>
                          <th>Diagnosis</th>
                          <th>Treatment &amp; Notes</th>
                          <th style="text-align: right;">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${visits.map(v => `
                          <tr>
                            <td class="font-mono font-semibold">${escapeHtml(v.id)}</td>
                            <td>${formatDateTime(v.visitDate)}</td>
                            <td>${escapeHtml(v.doctorId || doctor.name)}</td>
                            <td>${escapeHtml(v.hospitalId || hospital.name)}</td>
                            <td><strong>${escapeHtml(v.diagnosis || 'Clinical evaluation')}</strong></td>
                            <td class="font-sm text-secondary">
                              <div>${escapeHtml(v.treatment || '')}</div>
                              <small class="text-muted">${escapeHtml(v.notes || '')}</small>
                            </td>
                            <td style="text-align: right; white-space: nowrap;">
                              <button type="button" class="btn btn-secondary btn-sm" onclick="window.showConsultationDetailModal('${escapeHtml(v.id)}')" title="View full consultation notes &amp; vitals">
                                <span>🩺</span> View
                              </button>
                              <button type="button" class="btn btn-secondary btn-sm" onclick="window.hospitrackPrintDocument('CONSULTATION', '${escapeHtml(v.id)}')" title="Print consultation encounter">
                                <span>🖨️</span> Print
                              </button>
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                `}
              </div>
            </div>
          `;
        }

        // TAB 5: ACTIVE PRESCRIPTIONS
        else if (currentTab === 'prescriptions') {
          tabContentHtml = `
            <div class="workspace-section">
              <div class="workspace-card">
                <div class="card-header-clean">
                  <div>
                    <h3 class="card-title">Prescription Orders (${prescriptions.length})</h3>
                    <p class="card-subtitle">Pharmacological regimens with dosage instructions and safety validation</p>
                  </div>
                  ${currentRole === 'DOCTOR' ? `
                    <button type="button" class="btn btn-primary btn-sm" onclick="openDirectPrescriptionModal('${patient.id}')">
                      + New Prescription
                    </button>
                  ` : ''}
                </div>

                ${prescriptions.length === 0 ? `
                  <div class="empty-placeholder mt-16">
                    <span>💊</span>
                    <p>No prescriptions recorded for this patient.</p>
                  </div>
                ` : `
                  <div class="d-flex-col gap-16 mt-16">
                    ${prescriptions.map(rx => {
                      const prescribingDoctor = store.getDoctorById(rx.doctorId) || { id: rx.doctorId, name: rx.doctorId || 'Attending Physician', specialty: 'Clinical Medicine' };
                      const issuingHospital = store.getHospitalById(rx.hospitalId) || { id: rx.hospitalId, name: rx.hospitalId || 'Hospital Facility' };
                      return `
                        <div class="p-16 bg-surface-alt radius-md border-subtle">
                          <div class="d-flex-between mb-12" style="flex-wrap: wrap; gap: 8px;">
                            <div>
                              <strong class="font-md text-main">Order ${escapeHtml(rx.id)}</strong>
                              <span class="text-muted font-xs ml-8">Prescribed: ${formatDateTime(rx.prescribedAt)}</span>
                              <div class="mt-4 font-sm">
                                Prescribing Physician: 
                                <button type="button" class="btn-link-sm font-semibold text-primary" onclick="window.openDoctorWorkspace('${prescribingDoctor.id}')">
                                  🩺 Dr. ${escapeHtml(prescribingDoctor.name)} (<code>${escapeHtml(prescribingDoctor.id)}</code>)
                                </button>
                                • Facility: <strong>${escapeHtml(issuingHospital.name)}</strong>
                              </div>
                            </div>
                            <span class="badge badge-success">ACTIVE REGIMEN</span>
                          </div>

                          <div class="table-responsive">
                            <table class="data-table">
                              <thead>
                                <tr>
                                  <th>Medication</th>
                                  <th>Dosage</th>
                                  <th>Frequency</th>
                                  <th>Duration</th>
                                  <th>Special Instructions</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${(rx.items || []).map(item => `
                                  <tr>
                                    <td><strong>💊 ${escapeHtml(item.name || 'Not specified')}</strong></td>
                                    <td>${escapeHtml(item.dosage || 'Not available')}</td>
                                    <td>${escapeHtml(item.frequency || 'Not available')}</td>
                                    <td>${escapeHtml(item.duration || 'Not available')}</td>
                                    <td class="font-sm text-secondary">${escapeHtml(item.instructions || 'Standard administration')}</td>
                                  </tr>
                                `).join('')}
                              </tbody>
                            </table>
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

        // TAB 6: DIAGNOSTIC LAB REPORTS
        else if (currentTab === 'labs') {
          tabContentHtml = `
            <div class="workspace-section">
              <div class="workspace-card">
                <div class="card-header-clean">
                  <div>
                    <h3 class="card-title">Diagnostic Laboratory Reports (${reports.length})</h3>
                    <p class="card-subtitle">Verified clinical test orders, pathology, and laboratory reports</p>
                  </div>
                  ${currentRole === 'DOCTOR' ? `
                    <button type="button" class="btn btn-primary btn-sm" onclick="openOrderLabModal('${patient.id}')">
                      + Order Lab Test
                    </button>
                  ` : ''}
                </div>

                ${reports.length === 0 ? `
                  <div class="empty-placeholder mt-16">
                    <span>🔬</span>
                    <p>No diagnostic lab reports found for this patient.</p>
                  </div>
                ` : `
                  <div class="table-responsive mt-16">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Report ID</th>
                          <th>Test Name</th>
                          <th>Category</th>
                          <th>Order Date</th>
                          <th>Status</th>
                          <th>Diagnostic Results</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${reports.map(rep => `
                          <tr>
                            <td class="font-mono font-semibold">${escapeHtml(rep.id)}</td>
                            <td><strong>${escapeHtml(rep.testName || 'Laboratory Test')}</strong></td>
                            <td><span class="badge badge-info">${escapeHtml(rep.category || 'General')}</span></td>
                            <td>${formatDateTime(rep.reportDate)}</td>
                            <td>
                              <span class="badge ${rep.status === 'FINAL' ? 'badge-success' : 'badge-warning'}">
                                ${escapeHtml(rep.status || 'PENDING')}
                              </span>
                            </td>
                            <td class="font-sm text-secondary">${escapeHtml(rep.resultSummary || 'Awaiting final clinical sign-off.')}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                `}
              </div>
            </div>
          `;
        }

        // TAB 7: SPECIALIST REFERRALS
        else if (currentTab === 'referrals') {
          tabContentHtml = `
            <div class="workspace-section">
              <div class="workspace-card">
                <div class="card-header-clean">
                  <div>
                    <h3 class="card-title">Specialist Referrals (${referrals.length})</h3>
                    <p class="card-subtitle">Inter-facility clinical transfers and tertiary consultations</p>
                  </div>
                  <button type="button" class="btn btn-primary btn-sm" onclick="openCreateReferralModal('${patient.id}')">
                    + Dispatch Referral
                  </button>
                </div>

                ${referrals.length === 0 ? `
                  <div class="empty-placeholder mt-16">
                    <span>🔁</span>
                    <p>No specialist referrals recorded for this patient.</p>
                  </div>
                ` : `
                  <div class="table-responsive mt-16">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Referral ID</th>
                          <th>From Facility</th>
                          <th>Target Facility</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Reason &amp; Justification</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${referrals.map(ref => `
                          <tr>
                            <td class="font-mono font-semibold">${escapeHtml(ref.id)}</td>
                            <td>${escapeHtml(ref.fromHospitalId || 'N/A')}</td>
                            <td><strong>${escapeHtml(ref.toHospitalId || 'N/A')}</strong></td>
                            <td><span class="badge ${getPriorityBadgeClass(ref.priority)}">${escapeHtml(ref.priority || 'ROUTINE')}</span></td>
                            <td><span class="badge ${getStatusBadgeClass(ref.status)}">${escapeHtml(ref.status || 'PENDING')}</span></td>
                            <td class="font-sm text-secondary">${escapeHtml(ref.reason || 'Clinical transfer')}</td>
                            <td>
                              <button type="button" class="btn btn-secondary btn-sm" onclick="window.openReferralWorkspace('${ref.id}')">
                                View
                              </button>
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                `}
              </div>
            </div>
          `;
        }

        // TAB 8: CARE TIMELINE
        else if (currentTab === 'timeline') {
          // Aggregate all events
          const events = [];
          visits.forEach(v => {
            events.push({
              id: v.id,
              date: v.visitDate || new Date().toISOString(),
              icon: '📋',
              badge: 'CONSULTATION',
              badgeClass: 'badge-info',
              title: `Clinical Visit: ${v.diagnosis || 'General Consultation'}`,
              subtitle: `Physician: ${v.doctorId || doctor.name} • Facility: ${v.hospitalId || hospital.name}`,
              details: v.treatment || v.notes || 'Clinical consultation recorded.'
            });
          });

          prescriptions.forEach(rx => {
            events.push({
              id: rx.id,
              date: rx.prescribedAt || new Date().toISOString(),
              icon: '💊',
              badge: 'PRESCRIPTION',
              badgeClass: 'badge-success',
              title: `Prescription Order ${rx.id}`,
              subtitle: `${(rx.items || []).length} active medication(s) prescribed`,
              details: (rx.items || []).map(i => `${i.name} (${i.dosage})`).join(', ')
            });
          });

          reports.forEach(rep => {
            events.push({
              id: rep.id,
              date: rep.reportDate || new Date().toISOString(),
              icon: '🔬',
              badge: 'LAB REPORT',
              badgeClass: 'badge-warning',
              title: `Diagnostic Lab: ${rep.testName}`,
              subtitle: `Status: ${rep.status} • Category: ${rep.category}`,
              details: rep.resultSummary || 'Diagnostic testing performed.'
            });
          });

          referrals.forEach(ref => {
            events.push({
              id: ref.id,
              date: ref.createdAt || new Date().toISOString(),
              icon: '🔁',
              badge: 'REFERRAL',
              badgeClass: 'badge-info',
              title: `Specialist Referral: ${ref.reason}`,
              subtitle: `${ref.fromHospitalId} → ${ref.toHospitalId} • Priority: ${ref.priority}`,
              details: ref.notes || `Referral status is currently ${ref.status}.`
            });
          });

          transfers.forEach(trf => {
            events.push({
              id: trf.id,
              date: trf.initiatedAt || new Date().toISOString(),
              icon: '🚑',
              badge: 'TRANSFER',
              badgeClass: 'badge-danger',
              title: `Emergency Transfer: ${trf.reason}`,
              subtitle: `Status: ${trf.status} • Priority: ${trf.priority}`,
              details: trf.notes || 'Transfer dispatched.'
            });
          });

          events.sort((a, b) => new Date(b.date) - new Date(a.date));

          tabContentHtml = `
            <div class="workspace-section">
              <div class="workspace-card">
                <div class="card-header-clean">
                  <div>
                    <h3 class="card-title">Longitudinal Care Timeline (${events.length} Events)</h3>
                    <p class="card-subtitle">Chronological clinical history across hospital visits, prescriptions, and diagnostics</p>
                  </div>
                </div>

                ${events.length === 0 ? `
                  <div class="empty-placeholder mt-16">
                    <span>⏳</span>
                    <p>No historical medical events on file for this patient.</p>
                  </div>
                ` : `
                  <div class="timeline-container mt-20">
                    ${events.map(ev => `
                      <div class="timeline-entry">
                        <div class="timeline-icon-box">${ev.icon}</div>
                        <div class="timeline-content-card">
                          <div class="d-flex-between">
                            <div class="d-flex align-center gap-8">
                              <span class="badge ${ev.badgeClass}">${ev.badge}</span>
                              <strong class="text-main">${escapeHtml(ev.title)}</strong>
                            </div>
                            <span class="text-muted font-xs">${formatDateTime(ev.date)}</span>
                          </div>
                          <p class="text-secondary font-sm mt-4">${escapeHtml(ev.subtitle)}</p>
                          ${ev.details ? `<div class="timeline-detail-box mt-6">${escapeHtml(ev.details)}</div>` : ''}
                        </div>
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>
            </div>
          `;
        }

        container.innerHTML = `
          <!-- Unified Workspace Master Shell -->
          <div class="workspace-wrapper">
            <!-- Top Workspace Header -->
            <div class="workspace-header-bar">
              <div class="workspace-header-left">
                <div class="workspace-breadcrumb-row">
                  <button type="button" class="btn-link-sm" onclick="window.navigateWorkspaceBack()">
                    ← Back
                  </button>
                  <span class="text-dim">/</span>
                  <span class="badge badge-info">PATIENT WORKSPACE</span>
                  <span class="text-dim">/</span>
                  <span class="font-mono text-muted">${escapeHtml(patient.id)}</span>
                </div>
                <div class="d-flex align-center gap-12 mt-8">
                  ${patient.photoUrl ? `
                    <img src="${escapeHtml(patient.photoUrl)}" alt="${escapeHtml(patient.name)}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary); flex-shrink: 0;">
                  ` : `
                    <div class="avatar" style="width: 44px; height: 44px; border-radius: 50%; font-size: 1.2rem; background: var(--bg-surface-alt); border: 2px solid var(--border-color); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                      👤
                    </div>
                  `}
                  <div>
                    <h1 class="workspace-title">${escapeHtml(patient.name)}</h1>
                    <div class="d-flex align-center gap-8 mt-4" style="flex-wrap: wrap;">
                      <span class="badge ${getStatusBadgeClass(patient.status)}">${escapeHtml(patient.status || 'ACTIVE')}</span>
                      <span class="badge badge-info">${patient.age ? `${patient.age} yrs` : ''} ${escapeHtml(patient.gender || '')}</span>
                      <span class="badge badge-active">${escapeHtml(patient.bloodGroup || 'Blood Group N/A')}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="workspace-header-actions">
                ${actionsHtml}
              </div>
            </div>

            <!-- Exact 8 Tabs Navigation -->
            ${tabNavHtml}

            <!-- Active Tab Content Area -->
            <div class="workspace-content-body mt-20">
              ${tabContentHtml}
            </div>
          </div>
        `;
      } catch (err) {
        console.error('Patient workspace error:', err);
        this.renderError(container, err.message, err);
      }
    },

    // ------------------------------------------------------------------------
    // 2. DOCTOR WORKSPACE
    // ------------------------------------------------------------------------
    async renderDoctorWorkspace(container, doctorId, activeTab = 'overview') {
      const store = window.hospitrackStore;
      const user = window.hospitrackAuth?.getCurrentUser();

      this.renderLoading(container, `Loading Doctor Workspace (${doctorId})...`);

      try {
        const doctor = await store.fetchDoctorById(doctorId);
        if (!doctor) {
          this.renderNotFound(container, 'Doctor', doctorId);
          return;
        }

        const hospital = store.getHospitalById(doctor.hospitalId) || {
          id: doctor.hospitalId,
          name: doctor.hospitalId ? `Hospital (${doctor.hospitalId})` : 'Central Medical Facility'
        };

        const assignedPatients = store.getPatients(doctor.hospitalId).filter(p => p.primaryDoctorId === doctor.id);
        const myReferrals = store.getReferrals(doctor.hospitalId).filter(r => r.doctorId === doctor.id);

        container.innerHTML = `
          <div class="workspace-wrapper">
            <!-- Header Bar -->
            <div class="workspace-header-bar">
              <div class="workspace-header-left">
                <div class="workspace-breadcrumb-row">
                  <button type="button" class="btn-link-sm" onclick="window.navigateWorkspaceBack()">
                    ← Back
                  </button>
                  <span class="text-dim">/</span>
                  <span class="badge badge-info">DOCTOR WORKSPACE</span>
                  <span class="text-dim">/</span>
                  <span class="font-mono text-muted">${escapeHtml(doctor.id)}</span>
                </div>
                <div class="d-flex align-center gap-12 mt-8">
                  <h1 class="workspace-title">${escapeHtml(doctor.name)}</h1>
                  <span class="badge badge-active">${escapeHtml(doctor.specialty || 'General Medicine')}</span>
                  <span class="badge badge-info">License: ${escapeHtml(doctor.licenseNo || 'MCI-VERIFIED')}</span>
                </div>
              </div>
            </div>

            <!-- Profile & Metrics Cards -->
            <div class="workspace-stats-grid mt-20">
              <div class="workspace-stat-card">
                <div class="stat-label">Specialization</div>
                <div class="stat-value text-primary">${escapeHtml(doctor.specialty || 'Clinical Medicine')}</div>
                <div class="stat-sub">Experience: <strong>${doctor.experienceYears || '10+'} years</strong></div>
              </div>
              <div class="workspace-stat-card">
                <div class="stat-label">Assigned Facility</div>
                <div class="stat-value font-sm">${escapeHtml(hospital.name)}</div>
                <div class="stat-sub">Facility ID: <code>${escapeHtml(doctor.hospitalId || 'N/A')}</code></div>
              </div>
              <div class="workspace-stat-card">
                <div class="stat-label">Assigned Patients</div>
                <div class="stat-value font-mono">${assignedPatients.length}</div>
                <div class="stat-sub">Active in-facility caseload</div>
              </div>
              <div class="workspace-stat-card">
                <div class="stat-label">Specialist Referrals</div>
                <div class="stat-value font-mono">${myReferrals.length}</div>
                <div class="stat-sub">Dispatched / Coordinated</div>
              </div>
            </div>

            <!-- Full Details & Inpatients Table -->
            <div class="workspace-card mt-20">
              <div class="card-header-clean">
                <div>
                  <h3 class="card-title">Attending Physician Profile &amp; Credentials</h3>
                  <p class="card-subtitle">Verified contact, licensing, and facility accreditation details</p>
                </div>
              </div>
              <div class="profile-details-grid mt-16">
                <div class="profile-field-box">
                  <div class="profile-field-label">Medical License Number</div>
                  <div class="profile-field-value font-mono font-semibold">${escapeHtml(doctor.licenseNo || 'Not available')}</div>
                </div>
                <div class="profile-field-box">
                  <div class="profile-field-label">Official Email</div>
                  <div class="profile-field-value">${escapeHtml(doctor.email || 'Not available')}</div>
                </div>
                <div class="profile-field-box">
                  <div class="profile-field-label">Contact Telephone</div>
                  <div class="profile-field-value">${escapeHtml(doctor.phone || 'Not available')}</div>
                </div>
                <div class="profile-field-box">
                  <div class="profile-field-label">Department / Specialty</div>
                  <div class="profile-field-value">${escapeHtml(doctor.specialty || 'General Practice')}</div>
                </div>
              </div>
            </div>

            <!-- Assigned Inpatients -->
            <div class="workspace-card mt-20">
              <div class="card-header-clean">
                <div>
                  <h3 class="card-title">Assigned Patients &amp; Active Queue (${assignedPatients.length})</h3>
                  <p class="card-subtitle">Patients under direct clinical care of this physician</p>
                </div>
              </div>
              ${assignedPatients.length === 0 ? `
                <div class="empty-placeholder mt-16">
                  <span>👥</span>
                  <p>No patients currently assigned to this doctor.</p>
                </div>
              ` : `
                <div class="table-responsive mt-16">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Patient ID</th>
                        <th>Name</th>
                        <th>Age / Gender</th>
                        <th>Blood Group</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${assignedPatients.map(p => `
                        <tr>
                          <td class="font-mono font-semibold">${escapeHtml(p.id)}</td>
                          <td><strong>${escapeHtml(p.name)}</strong></td>
                          <td>${p.age ? `${p.age} yrs` : 'N/A'} • ${escapeHtml(p.gender || '')}</td>
                          <td><span class="badge badge-active">${escapeHtml(p.bloodGroup || 'N/A')}</span></td>
                          <td><span class="badge ${getStatusBadgeClass(p.status)}">${escapeHtml(p.status || 'ACTIVE')}</span></td>
                          <td>
                            <button type="button" class="btn btn-primary btn-sm" onclick="window.openPatientWorkspace('${p.id}')">
                              Open Workspace
                            </button>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </div>
          </div>
        `;
      } catch (err) {
        console.error('Doctor workspace error:', err);
        this.renderError(container, err.message, err);
      }
    },

    // ------------------------------------------------------------------------
    // 3. HOSPITAL WORKSPACE
    // ------------------------------------------------------------------------
    async renderHospitalWorkspace(container, hospitalId, activeTab = 'overview') {
      const store = window.hospitrackStore;
      const user = window.hospitrackAuth?.getCurrentUser();
      const currentRole = user?.role;

      this.renderLoading(container, `Loading Hospital Workspace (${hospitalId})...`);

      try {
        const hospital = await store.fetchHospitalById(hospitalId);
        if (!hospital) {
          this.renderNotFound(container, 'Hospital Facility', hospitalId);
          return;
        }

        const doctors = store.getDoctors(hospital.id);
        const patients = store.getPatients(hospital.id);
        const referrals = store.getReferrals(hospital.id);
        const transfers = store.getTransfers(hospital.id);

        const totalBeds = hospital.totalBeds || 0;
        const availBeds = hospital.availableBeds || 0;
        const occupiedBeds = Math.max(0, totalBeds - availBeds);
        const occPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

        let actionsHtml = '';
        if (currentRole === 'SUPER_ADMIN' || (currentRole === 'HOSPITAL_ADMIN' && user?.hospitalId === hospital.id)) {
          actionsHtml = `
            <button type="button" class="btn btn-primary btn-sm" onclick="openAddDoctorModal('${hospital.id}')">
              <span>+</span> Add Doctor
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="openHospitalRegisterPatientModal('${hospital.id}')">
              <span>👤</span> Admit Inpatient
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="openEditHospitalModal('${hospital.id}')">
              <span>🛏️</span> Update Bed Capacity
            </button>
          `;
        }

        container.innerHTML = `
          <div class="workspace-wrapper">
            <!-- Header Bar -->
            <div class="workspace-header-bar">
              <div class="workspace-header-left">
                <div class="workspace-breadcrumb-row">
                  <button type="button" class="btn-link-sm" onclick="window.navigateWorkspaceBack()">
                    ← Back
                  </button>
                  <span class="text-dim">/</span>
                  <span class="badge badge-info">HOSPITAL WORKSPACE</span>
                  <span class="text-dim">/</span>
                  <span class="font-mono text-muted">${escapeHtml(hospital.id)}</span>
                </div>
                <div class="d-flex align-center gap-12 mt-8">
                  <h1 class="workspace-title">${escapeHtml(hospital.name)}</h1>
                  <span class="badge badge-info">${escapeHtml(hospital.code || 'FACILITY')}</span>
                  <span class="badge ${getStatusBadgeClass(hospital.status)}">${escapeHtml(hospital.status || 'ACTIVE')}</span>
                </div>
              </div>
              <div class="workspace-header-actions">
                ${actionsHtml}
              </div>
            </div>

            <!-- Stat Summary Grid -->
            <div class="workspace-stats-grid mt-20">
              <div class="workspace-stat-card">
                <div class="stat-label">Total Bed Capacity</div>
                <div class="stat-value text-primary font-mono">${totalBeds}</div>
                <div class="stat-sub">Available: <strong class="text-success">${availBeds} Beds</strong></div>
              </div>
              <div class="workspace-stat-card">
                <div class="stat-label">Bed Occupancy</div>
                <div class="stat-value">${occPct}%</div>
                <div class="stat-sub">${occupiedBeds} occupied / ${totalBeds} total</div>
              </div>
              <div class="workspace-stat-card">
                <div class="stat-label">Accredited Doctors</div>
                <div class="stat-value font-mono">${doctors.length}</div>
                <div class="stat-sub">Attending clinical staff</div>
              </div>
              <div class="workspace-stat-card">
                <div class="stat-label">Current Inpatients</div>
                <div class="stat-value font-mono">${patients.length}</div>
                <div class="stat-sub">Admitted in facility</div>
              </div>
            </div>

            <!-- Profile & Location Card -->
            <div class="workspace-card mt-20">
              <div class="card-header-clean">
                <div>
                  <h3 class="card-title">Hospital Facility Information</h3>
                  <p class="card-subtitle">Official administrative contact and accredited address</p>
                </div>
              </div>
              <div class="profile-details-grid mt-16">
                <div class="profile-field-box">
                  <div class="profile-field-label">Facility Code</div>
                  <div class="profile-field-value font-mono font-semibold">${escapeHtml(hospital.code || 'Not available')}</div>
                </div>
                <div class="profile-field-box">
                  <div class="profile-field-label">Administrative Email</div>
                  <div class="profile-field-value">${escapeHtml(hospital.email || 'Not available')}</div>
                </div>
                <div class="profile-field-box">
                  <div class="profile-field-label">Emergency Phone</div>
                  <div class="profile-field-value">${escapeHtml(hospital.contact || 'Not available')}</div>
                </div>
                <div class="profile-field-box">
                  <div class="profile-field-label">Rating</div>
                  <div class="profile-field-value font-semibold">
                    ${hospital.rating ? `⭐ ${hospital.rating.toFixed(1)} / 5.0` : 'Not available'}
                  </div>
                </div>
                <div class="profile-field-box full-width">
                  <div class="profile-field-label">Location Address</div>
                  <div class="profile-field-value">📍 ${escapeHtml(hospital.location || 'Not available')}</div>
                </div>
              </div>
            </div>

            <!-- Clinical Doctors Directory -->
            <div class="workspace-card mt-20">
              <div class="card-header-clean">
                <div>
                  <h3 class="card-title">Medical Staff &amp; Physicians (${doctors.length})</h3>
                  <p class="card-subtitle">Accredited clinical practitioners assigned to this facility</p>
                </div>
              </div>
              ${doctors.length === 0 ? `
                <div class="empty-placeholder mt-16">
                  <span>🩺</span>
                  <p>No doctors currently registered at this hospital.</p>
                </div>
              ` : `
                <div class="table-responsive mt-16">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Doctor ID</th>
                        <th>Physician Name</th>
                        <th>Specialty</th>
                        <th>License Number</th>
                        <th>Contact</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${doctors.map(d => `
                        <tr>
                          <td class="font-mono font-semibold">${escapeHtml(d.id)}</td>
                          <td><strong>${escapeHtml(d.name)}</strong></td>
                          <td><span class="badge badge-active">${escapeHtml(d.specialty || 'General')}</span></td>
                          <td class="font-mono font-sm">${escapeHtml(d.licenseNo || 'MCI-VERIFIED')}</td>
                          <td class="font-sm text-secondary">${escapeHtml(d.phone || d.email || 'N/A')}</td>
                          <td>
                            <button type="button" class="btn btn-secondary btn-sm" onclick="window.openDoctorWorkspace('${d.id}')">
                              View Workstation
                            </button>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </div>

            <!-- Inpatient Patients -->
            <div class="workspace-card mt-20">
              <div class="card-header-clean">
                <div>
                  <h3 class="card-title">Inpatient Population (${patients.length})</h3>
                  <p class="card-subtitle">Patients currently admitted in facility wards</p>
                </div>
              </div>
              ${patients.length === 0 ? `
                <div class="empty-placeholder mt-16">
                  <span>👤</span>
                  <p>No inpatients currently admitted at this facility.</p>
                </div>
              ` : `
                <div class="table-responsive mt-16">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Patient ID</th>
                        <th>Name</th>
                        <th>Age / Gender</th>
                        <th>Blood Group</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${patients.map(p => `
                        <tr>
                          <td class="font-mono font-semibold">${escapeHtml(p.id)}</td>
                          <td><strong>${escapeHtml(p.name)}</strong></td>
                          <td>${p.age ? `${p.age} yrs` : 'N/A'} • ${escapeHtml(p.gender || '')}</td>
                          <td><span class="badge badge-active">${escapeHtml(p.bloodGroup || 'N/A')}</span></td>
                          <td><span class="badge ${getStatusBadgeClass(p.status)}">${escapeHtml(p.status || 'ACTIVE')}</span></td>
                          <td>
                            <button type="button" class="btn btn-primary btn-sm" onclick="window.openPatientWorkspace('${p.id}')">
                              Open Workspace
                            </button>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </div>
          </div>
        `;
      } catch (err) {
        console.error('Hospital workspace error:', err);
        this.renderError(container, err.message, err);
      }
    },

    // ------------------------------------------------------------------------
    // 4. REFERRAL WORKSPACE
    // ------------------------------------------------------------------------
    async renderReferralWorkspace(container, referralId) {
      const store = window.hospitrackStore;
      const user = window.hospitrackAuth?.getCurrentUser();
      const currentRole = user?.role;

      this.renderLoading(container, `Loading Referral Workspace (${referralId})...`);

      try {
        const referral = await store.fetchReferralById(referralId);
        if (!referral) {
          this.renderNotFound(container, 'Specialist Referral', referralId);
          return;
        }

        const patient = store.getPatientById(referral.patientId) || {
          id: referral.patientId,
          name: `Patient (${referral.patientId})`
        };

        const fromHospital = store.getHospitalById(referral.fromHospitalId) || {
          id: referral.fromHospitalId,
          name: referral.fromHospitalId || 'Origin Hospital'
        };

        const toHospital = store.getHospitalById(referral.toHospitalId) || {
          id: referral.toHospitalId,
          name: referral.toHospitalId || 'Target Hospital'
        };

        // State & Role Aware Actions
        let actionsHtml = '';
        const canManage = currentRole === 'SUPER_ADMIN' ||
          (user?.hospitalId && (user.hospitalId === referral.toHospitalId || user.hospitalId === referral.fromHospitalId));

        if (canManage) {
          if (referral.status === 'PENDING') {
            actionsHtml = `
              <button type="button" class="btn btn-success btn-sm" onclick="handleWorkspaceReferralAction('${referral.id}', 'IN_PROGRESS')">
                ✅ Accept Referral
              </button>
              <button type="button" class="btn btn-outline-danger btn-sm" onclick="handleWorkspaceReferralAction('${referral.id}', 'REJECTED')">
                ❌ Reject Referral
              </button>
            `;
          } else if (referral.status === 'IN_PROGRESS' || referral.status === 'ACCEPTED') {
            actionsHtml = `
              <button type="button" class="btn btn-primary btn-sm" onclick="handleWorkspaceReferralAction('${referral.id}', 'COMPLETED')">
                🏁 Mark Completed
              </button>
            `;
          }
        }

        container.innerHTML = `
          <div class="workspace-wrapper">
            <!-- Header Bar -->
            <div class="workspace-header-bar">
              <div class="workspace-header-left">
                <div class="workspace-breadcrumb-row">
                  <button type="button" class="btn-link-sm" onclick="window.navigateWorkspaceBack()">
                    ← Back
                  </button>
                  <span class="text-dim">/</span>
                  <span class="badge badge-info">REFERRAL WORKSPACE</span>
                  <span class="text-dim">/</span>
                  <span class="font-mono text-muted">${escapeHtml(referral.id)}</span>
                </div>
                <div class="d-flex align-center gap-12 mt-8">
                  <h1 class="workspace-title">Referral ${escapeHtml(referral.id)}</h1>
                  <span class="badge ${getStatusBadgeClass(referral.status)}">${escapeHtml(referral.status || 'PENDING')}</span>
                  <span class="badge ${getPriorityBadgeClass(referral.priority)}">${escapeHtml(referral.priority || 'ROUTINE')}</span>
                </div>
              </div>
              <div class="workspace-header-actions">
                ${actionsHtml}
              </div>
            </div>

            <!-- Details Card -->
            <div class="workspace-card mt-20">
              <div class="card-header-clean">
                <div>
                  <h3 class="card-title">Referral Details &amp; Clinical Routing</h3>
                  <p class="card-subtitle">Direct specialist referral across accredited facilities</p>
                </div>
              </div>
              <div class="profile-details-grid mt-16">
                <div class="profile-field-box">
                  <div class="profile-field-label">Patient Record</div>
                  <div class="profile-field-value">
                    <button type="button" class="btn-link-sm font-semibold" onclick="window.openPatientWorkspace('${referral.patientId}')">
                      👤 ${escapeHtml(patient.name)} (<code>${escapeHtml(referral.patientId)}</code>)
                    </button>
                  </div>
                </div>
                <div class="profile-field-box">
                  <div class="profile-field-label">Referring Doctor</div>
                  <div class="profile-field-value font-mono">${escapeHtml(referral.doctorId || 'Not specified')}</div>
                </div>
                <div class="profile-field-box">
                  <div class="profile-field-label">Origin Facility</div>
                  <div class="profile-field-value">${escapeHtml(fromHospital.name)} (<code>${escapeHtml(referral.fromHospitalId)}</code>)</div>
                </div>
                <div class="profile-field-box">
                  <div class="profile-field-label">Destination Facility</div>
                  <div class="profile-field-value font-semibold text-primary">${escapeHtml(toHospital.name)} (<code>${escapeHtml(referral.toHospitalId)}</code>)</div>
                </div>
                <div class="profile-field-box">
                  <div class="profile-field-label">Priority Level</div>
                  <div class="profile-field-value">
                    <span class="badge ${getPriorityBadgeClass(referral.priority)}">${escapeHtml(referral.priority || 'ROUTINE')}</span>
                  </div>
                </div>
                <div class="profile-field-box">
                  <div class="profile-field-label">Current Status</div>
                  <div class="profile-field-value">
                    <span class="badge ${getStatusBadgeClass(referral.status)}">${escapeHtml(referral.status || 'PENDING')}</span>
                  </div>
                </div>
                <div class="profile-field-box full-width">
                  <div class="profile-field-label">Clinical Justification &amp; Reason</div>
                  <div class="profile-field-value font-md font-semibold">${escapeHtml(referral.reason || 'Clinical transfer')}</div>
                </div>
                <div class="profile-field-box full-width">
                  <div class="profile-field-label">Clinical Notes &amp; Instructions</div>
                  <div class="profile-field-value text-secondary">${escapeHtml(referral.notes || 'No supplementary notes provided.')}</div>
                </div>
                <div class="profile-field-box">
                  <div class="profile-field-label">Created At</div>
                  <div class="profile-field-value font-xs text-muted">${formatDateTime(referral.createdAt)}</div>
                </div>
                <div class="profile-field-box">
                  <div class="profile-field-label">Last Updated</div>
                  <div class="profile-field-value font-xs text-muted">${formatDateTime(referral.updatedAt || referral.createdAt)}</div>
                </div>
              </div>
            </div>
          </div>
        `;
      } catch (err) {
        console.error('Referral workspace error:', err);
        this.renderError(container, err.message, err);
      }
    },

    // ------------------------------------------------------------------------
    // 5. TRANSFER WORKSPACE
    // ------------------------------------------------------------------------
    async renderTransferWorkspace(container, transferId) {
      const store = window.hospitrackStore;
      const user = window.hospitrackAuth?.getCurrentUser();
      const currentRole = user?.role;

      this.renderLoading(container, `Loading Transfer Workspace (${transferId})...`);

      try {
        const transfer = await store.fetchTransferById(transferId);
        if (!transfer) {
          this.renderNotFound(container, 'Emergency Transfer', transferId);
          return;
        }

        const patient = store.getPatientById(transfer.patientId) || {
          id: transfer.patientId,
          name: `Patient (${transfer.patientId})`
        };

        const fromHospital = store.getHospitalById(transfer.fromHospitalId) || {
          id: transfer.fromHospitalId,
          name: transfer.fromHospitalId || 'Origin Facility'
        };

        const toHospital = store.getHospitalById(transfer.toHospitalId) || {
          id: transfer.toHospitalId,
          name: transfer.toHospitalId || 'Destination Facility'
        };

        // State-aware action buttons
        let actionsHtml = '';
        const canManage = currentRole === 'SUPER_ADMIN' ||
          (user?.hospitalId && (user.hospitalId === transfer.toHospitalId || user.hospitalId === transfer.fromHospitalId));

        if (canManage && transfer.status === 'PENDING') {
          actionsHtml = `
            <button type="button" class="btn btn-success btn-sm" onclick="handleWorkspaceAcceptTransfer('${transfer.id}')">
              🏥 Accept &amp; Admit Inpatient
            </button>
          `;
        }

        container.innerHTML = `
          <div class="workspace-wrapper">
            <!-- Header Bar -->
            <div class="workspace-header-bar">
              <div class="workspace-header-left">
                <div class="workspace-breadcrumb-row">
                  <button type="button" class="btn-link-sm" onclick="window.navigateWorkspaceBack()">
                    ← Back
                  </button>
                  <span class="text-dim">/</span>
                  <span class="badge badge-danger">EMERGENCY TRANSFER</span>
                  <span class="text-dim">/</span>
                  <span class="font-mono text-muted">${escapeHtml(transfer.id)}</span>
                </div>
                <div class="d-flex align-center gap-12 mt-8">
                  <h1 class="workspace-title">Transfer ${escapeHtml(transfer.id)}</h1>
                  <span class="badge ${getStatusBadgeClass(transfer.status)}">${escapeHtml(transfer.status || 'PENDING')}</span>
                  <span class="badge ${getPriorityBadgeClass(transfer.priority)}">${escapeHtml(transfer.priority || 'EMERGENCY')}</span>
                </div>
              </div>
              <div class="workspace-header-actions">
                ${actionsHtml}
              </div>
            </div>

            <!-- Details Card -->
            <div class="workspace-card mt-20">
              <div class="card-header-clean">
                <div>
                  <h3 class="card-title">Emergency Facility Transfer Details</h3>
                  <p class="card-subtitle">Real-time emergency transfer dispatch and ICU bed reallocation</p>
                </div>
              </div>
              <div class="profile-details-grid mt-16">
                <div class="profile-field-box">
                  <div class="profile-field-label">Inpatient Record</div>
                  <div class="profile-field-value">
                    <button type="button" class="btn-link-sm font-semibold" onclick="window.openPatientWorkspace('${transfer.patientId}')">
                      👤 ${escapeHtml(patient.name)} (<code>${escapeHtml(transfer.patientId)}</code>)
                    </button>
                  </div>
                </div>
                <div class="profile-field-box">
                  <div class="profile-field-label">Triage Priority</div>
                  <div class="profile-field-value">
                    <span class="badge ${getPriorityBadgeClass(transfer.priority)}">${escapeHtml(transfer.priority || 'EMERGENCY')}</span>
                  </div>
                </div>
                <div class="profile-field-box">
                  <div class="profile-field-label">Dispatching Facility</div>
                  <div class="profile-field-value">${escapeHtml(fromHospital.name)} (<code>${escapeHtml(transfer.fromHospitalId)}</code>)</div>
                </div>
                <div class="profile-field-box">
                  <div class="profile-field-label">Receiving Facility</div>
                  <div class="profile-field-value font-semibold text-danger">${escapeHtml(toHospital.name)} (<code>${escapeHtml(transfer.toHospitalId)}</code>)</div>
                </div>
                <div class="profile-field-box">
                  <div class="profile-field-label">Current Status</div>
                  <div class="profile-field-value">
                    <span class="badge ${getStatusBadgeClass(transfer.status)}">${escapeHtml(transfer.status || 'PENDING')}</span>
                  </div>
                </div>
                <div class="profile-field-box">
                  <div class="profile-field-label">Initiated At</div>
                  <div class="profile-field-value font-xs text-muted">${formatDateTime(transfer.initiatedAt)}</div>
                </div>
                <div class="profile-field-box full-width">
                  <div class="profile-field-label">Transfer Justification &amp; Clinical Requirement</div>
                  <div class="profile-field-value font-md font-semibold">${escapeHtml(transfer.reason || 'Emergency critical care transfer')}</div>
                </div>
                <div class="profile-field-box full-width">
                  <div class="profile-field-label">Ambulance &amp; Transit Information</div>
                  <div class="profile-field-value text-secondary">
                    ${transfer.notes ? escapeHtml(transfer.notes) : 'Not available'}
                  </div>
                </div>
                ${transfer.completedAt ? `
                  <div class="profile-field-box full-width">
                    <div class="profile-field-label">Admitted / Completed Timestamp</div>
                    <div class="profile-field-value text-success font-semibold">${formatDateTime(transfer.completedAt)}</div>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      } catch (err) {
        console.error('Transfer workspace error:', err);
        this.renderError(container, err.message, err);
      }
    }
  };

  // --------------------------------------------------------------------------
  // Global Workspace Action Handlers (All bound to real store / backend APIs)
  // --------------------------------------------------------------------------
  window.switchPatientWorkspaceTab = function(patientId, tabName) {
    const container = document.getElementById('mainContentArea');
    if (container) {
      window.history.pushState(null, '', `#patient/workspace/${encodeURIComponent(patientId)}/${encodeURIComponent(tabName)}`);
      workspaceRenderer.renderPatientWorkspace(container, patientId, tabName);
    }
  };

  window.handleWorkspaceDischargePatient = async function(patientId) {
    if (!window.confirm(`Are you sure you want to discharge patient ${patientId}? Bed capacity will be released.`)) {
      return;
    }
    try {
      await window.hospitrackStore.dischargePatient(patientId);
      window.showToast(`Patient ${patientId} successfully discharged.`, 'success');
      const container = document.getElementById('mainContentArea');
      if (container) {
        workspaceRenderer.renderPatientWorkspace(container, patientId, 'overview');
      }
    } catch (e) {
      window.showToast(e.message || 'Discharge failed.', 'error');
    }
  };

  window.handleWorkspaceReferralAction = async function(referralId, status) {
    try {
      await window.hospitrackStore.updateReferralStatus(referralId, status);
      window.showToast(`Referral ${referralId} updated to ${status}.`, 'success');
      const container = document.getElementById('mainContentArea');
      if (container) {
        workspaceRenderer.renderReferralWorkspace(container, referralId);
      }
    } catch (e) {
      window.showToast(e.message || 'Failed to update referral.', 'error');
    }
  };

  window.handleWorkspaceAcceptTransfer = async function(transferId) {
    try {
      await window.hospitrackStore.acceptTransfer(transferId);
      window.showToast(`Transfer ${transferId} accepted and patient admitted.`, 'success');
      const container = document.getElementById('mainContentArea');
      if (container) {
        workspaceRenderer.renderTransferWorkspace(container, transferId);
      }
    } catch (e) {
      window.showToast(e.message || 'Failed to accept transfer.', 'error');
    }
  };

  // Helper formatting functions
  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatDateTime(dt) {
    if (!dt) return 'Not available';
    try {
      const d = new Date(dt);
      if (isNaN(d.getTime())) return dt;
      return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dt;
    }
  }

  function getStatusBadgeClass(status) {
    if (!status) return 'badge-info';
    const s = status.toUpperCase();
    if (s === 'ACTIVE' || s === 'COMPLETED' || s === 'ACCEPTED' || s === 'FINAL') return 'badge-success';
    if (s === 'PENDING' || s === 'IN_PROGRESS' || s === 'TRANSFER_PENDING') return 'badge-warning';
    if (s === 'DISCHARGED' || s === 'TRANSFERRED') return 'badge-info';
    if (s === 'REJECTED' || s === 'CANCELLED' || s === 'SUSPENDED') return 'badge-danger';
    return 'badge-info';
  }

  function getPriorityBadgeClass(priority) {
    if (!priority) return 'badge-info';
    const p = priority.toUpperCase();
    if (p === 'EMERGENCY') return 'badge-danger';
    if (p === 'URGENT') return 'badge-warning';
    return 'badge-info';
  }

  window.workspaceRenderer = workspaceRenderer;
})();
