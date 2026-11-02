/**
 * Hospitrack — Centralized Modal Lifecycle & Form Validation Controller
 * Houses modal dialog structures, dynamic select populators, and backend API submission pipelines.
 */

window.rxMedicinesList = [
  { name: 'Aspirin', dosage: '75mg', frequency: 'Once daily', duration: '30 days', instructions: 'Take after breakfast with water' }
];

window.initModalManager = function() {
  const container = document.getElementById('globalModalContainer');
  if (!container) return;

  container.innerHTML = `
    <!-- 1. Add Hospital Modal -->
    <div id="addHospitalModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="addHospTitle">
      <div class="modal-box modal-box-register">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" id="addHospTitle">🏥 Onboard New Healthcare Facility</h3>
            <p class="modal-subtitle">Register credentialed hospital to the national network</p>
          </div>
          <button type="button" class="modal-close" onclick="closeModal('addHospitalModal')" aria-label="Close">✕</button>
        </div>
        <form id="addHospitalForm" onsubmit="handleGlobalAddHospital(event)">
          <div class="form-grid-2col">
            <div class="form-group full-width">
              <label class="form-label" for="hospName">Hospital Name <span style="color: var(--danger);">*</span></label>
              <input type="text" id="hospName" class="form-control" placeholder="e.g. Fortis Super Speciality Hospital" required minlength="2">
            </div>
            <div class="form-group">
              <label class="form-label" for="hospCode">Hospital Code <span style="color: var(--danger);">*</span></label>
              <input type="text" id="hospCode" class="form-control" placeholder="e.g. FSH-04" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="hospBeds">Total Bed Capacity <span style="color: var(--danger);">*</span></label>
              <input type="number" id="hospBeds" class="form-control" placeholder="250" min="1" max="5000" value="200" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="hospContact">Contact Phone <span style="color: var(--danger);">*</span></label>
              <input type="tel" id="hospContact" class="form-control" placeholder="+91 98200 12345" required minlength="6">
            </div>
            <div class="form-group">
              <label class="form-label" for="hospEmail">Official Administrative Email</label>
              <input type="email" id="hospEmail" class="form-control" placeholder="admin@fortis.in">
            </div>
            <div class="form-group full-width">
              <label class="form-label" for="hospLocation">Facility Location / Address <span style="color: var(--danger);">*</span></label>
              <input type="text" id="hospLocation" class="form-control" placeholder="e.g. Sector 62, Phase 8, Mohali" required minlength="3">
            </div>
          </div>
          <div id="addHospAlert" class="alert-banner hidden mb-16"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal('addHospitalModal')">Cancel</button>
            <button type="submit" id="addHospSubmitBtn" class="btn btn-primary">Onboard to Network</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 2. Edit Hospital Modal -->
    <div id="editHospitalModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="editHospTitle">
      <div class="modal-box modal-box-md">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" id="editHospTitle">✏️ Edit Hospital Facility Details</h3>
            <p class="modal-subtitle">Update live bed inventory, contact information, and address</p>
          </div>
          <button type="button" class="modal-close" onclick="closeModal('editHospitalModal')" aria-label="Close">✕</button>
        </div>
        <form id="editHospitalForm" onsubmit="handleGlobalEditHospital(event)">
          <input type="hidden" id="editHospId">
          <div id="editHospAlert" class="alert-banner hidden mb-16"></div>

          <div class="form-group">
            <label class="form-label" for="editHospName">Hospital Name <span style="color: var(--danger);">*</span></label>
            <input type="text" id="editHospName" class="form-control" required minlength="2">
          </div>

          <div class="form-grid-2col">
            <div class="form-group">
              <label class="form-label" for="editHospTotalBeds">Total Beds <span style="color: var(--danger);">*</span></label>
              <input type="number" id="editHospTotalBeds" class="form-control" min="0" max="10000" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="editHospAvailBeds">Available Beds <span style="color: var(--danger);">*</span></label>
              <input type="number" id="editHospAvailBeds" class="form-control" min="0" max="10000" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="editHospLocation">Location / Address <span style="color: var(--danger);">*</span></label>
            <input type="text" id="editHospLocation" class="form-control" required minlength="3">
          </div>

          <div class="form-grid-2col">
            <div class="form-group">
              <label class="form-label" for="editHospContact">Contact Phone <span style="color: var(--danger);">*</span></label>
              <input type="tel" id="editHospContact" class="form-control" required minlength="6">
            </div>
            <div class="form-group">
              <label class="form-label" for="editHospEmail">Official Email</label>
              <input type="email" id="editHospEmail" class="form-control" placeholder="admin@hospital.in">
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal('editHospitalModal')">Cancel</button>
            <button type="submit" id="editHospSubmitBtn" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 3. View Hospital Modal -->
    <div id="viewHospitalModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="viewHospTitle">
      <div class="modal-box modal-box-md">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" id="viewHospTitle">Hospital Network Profile</h3>
            <p class="modal-subtitle">Facility dossier & live operational metrics</p>
          </div>
          <button type="button" class="modal-close" onclick="closeModal('viewHospitalModal')" aria-label="Close">✕</button>
        </div>
        <div id="viewHospitalBody" class="modal-body"></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal('viewHospitalModal')">Close</button>
        </div>
      </div>
    </div>
  `;
};

// Generic Modal Open/Close Helper
window.openModal = function(modalId) {
  const el = document.getElementById(modalId);
  if (el) {
    el.classList.add('open');
    const firstInput = el.querySelector('input:not([type=hidden]), select, textarea, button.btn-primary');
    if (firstInput) firstInput.focus();
  }
};

window.openCredentialPolicyModal = function() {
  const el = document.getElementById('credentialPolicyModal');
  if (el) {
    el.classList.add('open');
  }
};

window.closeModal = function(modalId) {
  const el = document.getElementById(modalId);
  if (el) {
    el.classList.remove('open');
    // Clear alert banners inside modal
    const alertBanner = el.querySelector('.alert-banner');
    if (alertBanner) {
      alertBanner.classList.add('hidden');
      alertBanner.textContent = '';
    }
  }
};

window.closeGlobalModal = function(modalId) {
  const el = document.getElementById(modalId);
  if (el) {
    el.classList.remove('open');
    const alertBanner = el.querySelector('.alert-banner');
    if (alertBanner) {
      alertBanner.classList.add('hidden');
      alertBanner.textContent = '';
    }
  }
};

// Open Edit Hospital Modal and populate values
window.openEditHospitalModal = function(hospId) {
  const store = window.hospitrackStore;
  const user = window.hospitrackAuth?.getCurrentUser();
  const targetId = hospId || user?.hospitalId || 'HOSP-101';
  
  const hosp = store.getHospitalById(targetId) || (store.getHospitals() || []).find(h => h.id === targetId) || {
    id: targetId,
    name: 'City General Hospital',
    totalBeds: 250,
    availableBeds: 42,
    location: 'Metro Healthcare Corridor',
    contact: '+91 98200 12345',
    email: 'admin@hospital.in'
  };

  const modalContainer = document.getElementById('globalModalContainer');
  if (modalContainer) {
    modalContainer.innerHTML = `
      <div id="editHospitalModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="editHospTitle">
        <div class="modal-box modal-box-md">
          <div class="modal-header">
            <div>
              <h3 class="modal-title" id="editHospTitle">✏️ Edit Hospital Facility Details</h3>
              <p class="modal-subtitle">Update live bed inventory, contact information, and address</p>
            </div>
            <button type="button" class="modal-close" onclick="closeGlobalModal('editHospitalModal')" aria-label="Close">✕</button>
          </div>
          <form id="editHospitalForm" onsubmit="handleGlobalEditHospital(event)">
            <input type="hidden" id="editHospId" value="${escapeHtml(hosp.id || targetId)}">
            <div id="editHospAlert" class="alert-banner hidden mb-16"></div>

            <div class="form-group mb-16">
              <label class="form-label" for="editHospName">Hospital Name <span style="color: var(--danger);">*</span></label>
              <input type="text" id="editHospName" class="form-control" value="${escapeHtml(hosp.name || '')}" required minlength="2">
            </div>

            <div class="form-grid-2col mb-16">
              <div class="form-group">
                <label class="form-label" for="editHospTotalBeds">Total Bed Capacity <span style="color: var(--danger);">*</span></label>
                <input type="number" id="editHospTotalBeds" class="form-control" value="${hosp.totalBeds != null ? hosp.totalBeds : 100}" min="0" max="10000" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="editHospAvailBeds">Available Beds <span style="color: var(--danger);">*</span></label>
                <input type="number" id="editHospAvailBeds" class="form-control" value="${hosp.availableBeds != null ? hosp.availableBeds : 20}" min="0" max="10000" required>
              </div>
            </div>

            <div class="form-group mb-16">
              <label class="form-label" for="editHospLocation">Location / Address <span style="color: var(--danger);">*</span></label>
              <input type="text" id="editHospLocation" class="form-control" value="${escapeHtml(hosp.location || '')}" required minlength="3">
            </div>

            <div class="form-grid-2col mb-16">
              <div class="form-group">
                <label class="form-label" for="editHospContact">Contact Phone <span style="color: var(--danger);">*</span></label>
                <input type="tel" id="editHospContact" class="form-control" value="${escapeHtml(hosp.contact || '')}" required minlength="6">
              </div>
              <div class="form-group">
                <label class="form-label" for="editHospEmail">Official Administrative Email</label>
                <input type="email" id="editHospEmail" class="form-control" value="${escapeHtml(hosp.email || '')}" placeholder="admin@hospital.in">
              </div>
            </div>

            <div class="modal-actions" style="margin-top: 1.25rem; display: flex; justify-content: flex-end; gap: 8px;">
              <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('editHospitalModal')">Cancel</button>
              <button type="submit" id="editHospSubmitBtn" class="btn btn-primary">💾 Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }
};

window.openViewHospitalModal = function(hospId) {
  const store = window.hospitrackStore;
  const hosp = store.getHospitalById(hospId) || (store.getHospitals().find(h => h.id === hospId));
  if (!hosp) return;

  const docs = store.getDoctors(hosp.id);
  const pats = store.getPatients(hosp.id);

  const titleEl = document.getElementById('viewHospTitle');
  const bodyEl = document.getElementById('viewHospitalBody');

  if (titleEl) titleEl.textContent = `${hosp.name} (${hosp.code || hosp.id})`;
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1rem; font-size: 0.88rem;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: var(--bg-surface-alt); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <div><strong>Facility ID:</strong> <code>${hosp.id}</code></div>
          <div><strong>Status:</strong> <span class="badge ${hosp.status === 'ACTIVE' ? 'badge-active' : 'badge-danger'}">${hosp.status || 'ACTIVE'}</span></div>
          <div><strong>Total Beds:</strong> ${hosp.totalBeds || 0}</div>
          <div><strong>Available Beds:</strong> <strong style="color: var(--primary);">${hosp.availableBeds != null ? hosp.availableBeds : 0}</strong></div>
          <div><strong>Credentialed Doctors:</strong> ${docs.length}</div>
          <div><strong>Active Inpatients:</strong> ${pats.length}</div>
        </div>
        <div>
          <strong>📍 Address:</strong> ${escapeHtml(hosp.location || 'N/A')}<br>
          <strong>📞 Phone:</strong> ${escapeHtml(hosp.contact || 'N/A')}<br>
          <strong>✉️ Email:</strong> ${escapeHtml(hosp.email || 'N/A')}
        </div>
      </div>
    `;
  }

  openModal('viewHospitalModal');
};

// Global Form Submission Handlers
window.handleGlobalAddHospital = async function(event) {
  event.preventDefault();
  const store = window.hospitrackStore;
  const alertEl = document.getElementById('addHospAlert');
  const submitBtn = document.getElementById('addHospSubmitBtn');

  if (alertEl) {
    alertEl.classList.add('hidden');
    alertEl.textContent = '';
  }

  const name = document.getElementById('hospName')?.value.trim();
  const code = document.getElementById('hospCode')?.value.trim();
  const totalBeds = parseInt(document.getElementById('hospBeds')?.value || '100', 10);
  const location = document.getElementById('hospLocation')?.value.trim();
  const contact = document.getElementById('hospContact')?.value.trim();
  const email = document.getElementById('hospEmail')?.value.trim();

  if (!name || name.length < 2) {
    showAddHospError('Please enter a valid hospital name (at least 2 characters).');
    return;
  }
  if (!code) {
    showAddHospError('Please enter a hospital registration code.');
    return;
  }
  if (isNaN(totalBeds) || totalBeds < 1) {
    showAddHospError('Please enter a valid total bed capacity (at least 1).');
    return;
  }
  if (!location) {
    showAddHospError('Please enter the hospital location.');
    return;
  }
  if (!contact) {
    showAddHospError('Please enter contact telephone.');
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Onboarding...';
    }

    await store.createHospital({ name, code, totalBeds, availableBeds: totalBeds, location, contact, email });
    window.showToast(`Hospital '${name}' onboarded successfully!`, 'success');
    closeModal('addHospitalModal');
    window.renderCurrentView();
  } catch (err) {
    showAddHospError(err.message || 'Failed to onboard hospital.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Onboard to Network';
    }
  }

  function showAddHospError(msg) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = msg;
      alertEl.classList.remove('hidden');
    } else {
      window.showToast(msg, 'error');
    }
  }
};

window.handleGlobalEditHospital = async function(event) {
  event.preventDefault();
  const store = window.hospitrackStore;
  const alertEl = document.getElementById('editHospAlert');
  const submitBtn = document.getElementById('editHospSubmitBtn');

  if (alertEl) {
    alertEl.classList.add('hidden');
    alertEl.textContent = '';
  }

  const id = document.getElementById('editHospId')?.value;
  const name = document.getElementById('editHospName')?.value.trim();
  const totalBeds = parseInt(document.getElementById('editHospTotalBeds')?.value || '0', 10);
  const availableBeds = parseInt(document.getElementById('editHospAvailBeds')?.value || '0', 10);
  const location = document.getElementById('editHospLocation')?.value.trim();
  const contact = document.getElementById('editHospContact')?.value.trim();
  const email = document.getElementById('editHospEmail')?.value.trim();

  // 1. Frontend validation
  if (!name || name.length < 2) {
    showEditError('Hospital Name is required (at least 2 characters).');
    return;
  }
  if (isNaN(totalBeds) || totalBeds < 0) {
    showEditError('Total Beds is required and must be a non-negative number.');
    return;
  }
  if (isNaN(availableBeds) || availableBeds < 0) {
    showEditError('Available Beds is required and must be a non-negative number.');
    return;
  }
  if (availableBeds > totalBeds) {
    showEditError('Available beds cannot exceed total beds.');
    return;
  }
  if (!location || location.length < 3) {
    showEditError('Location / Address is required.');
    return;
  }
  if (!contact || contact.length < 6) {
    showEditError('A valid contact phone number is required.');
    return;
  }

  // 2. Call backend API with loading state
  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving Changes...';
    }

    await store.updateHospitalProfile(id, {
      name,
      totalBeds,
      availableBeds,
      location,
      contact,
      email
    });

    window.showToast(`Hospital facility details updated successfully!`, 'success');
    closeModal('editHospitalModal');
    window.renderCurrentView();
  } catch (err) {
    // Keep modal open and display actual error
    let errorMsg = err.message || 'Failed to update hospital details.';
    if (err.data && err.data.message) {
      errorMsg = err.data.message;
    }
    showEditError(errorMsg);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Changes';
    }
  }

  function showEditError(msg) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = msg;
      alertEl.classList.remove('hidden');
    } else {
      window.showToast(msg, 'error');
    }
  }
};

let activeSettingsTab = 'security';

window.openAccountSettingsModal = function(initialTab = 'security') {
  activeSettingsTab = initialTab;
  const user = window.hospitrackAuth?.getCurrentUser() || { name: 'User', email: 'user@hospitrack.com', role: 'PATIENT' };
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div id="accountSettingsModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="settingsModalTitle">
      <div class="modal-box modal-box-md" style="max-width: 600px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.4rem;">⚙️</span>
            <div>
              <h3 class="modal-title" id="settingsModalTitle">Account Settings &amp; Security</h3>
              <p class="modal-subtitle">Manage login credentials, active sessions, and preferences</p>
            </div>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('accountSettingsModal')" aria-label="Close">✕</button>
        </div>

        <!-- Settings Tabs -->
        <div style="display: flex; gap: 6px; padding: 0 0 12px 0; border-bottom: 1px solid var(--border-color); margin-bottom: 16px;">
          <button type="button" class="btn btn-sm ${activeSettingsTab === 'security' ? 'btn-primary' : 'btn-secondary'}" onclick="switchAccountSettingsTab('security')">
            🔒 Security &amp; Password
          </button>
          <button type="button" class="btn btn-sm ${activeSettingsTab === 'session' ? 'btn-primary' : 'btn-secondary'}" onclick="switchAccountSettingsTab('session')">
            📱 Active Session
          </button>
          <button type="button" class="btn btn-sm ${activeSettingsTab === 'preferences' ? 'btn-primary' : 'btn-secondary'}" onclick="switchAccountSettingsTab('preferences')">
            🔔 Preferences
          </button>
        </div>

        <div id="settingsTabContentArea">
          ${renderAccountSettingsTabContent(activeSettingsTab, user)}
        </div>
      </div>
    </div>
  `;
};

window.switchAccountSettingsTab = function(tabName) {
  activeSettingsTab = tabName;
  const user = window.hospitrackAuth?.getCurrentUser() || { name: 'User', email: 'user@hospitrack.com', role: 'PATIENT' };
  const container = document.getElementById('settingsTabContentArea');
  if (container) {
    container.innerHTML = renderAccountSettingsTabContent(tabName, user);
  }
};

function renderAccountSettingsTabContent(tab, user) {
  switch (tab) {
    case 'session':
      return `
        <div style="display: flex; flex-direction: column; gap: 14px; font-size: 0.88rem;">
          <div style="background: var(--bg-surface-alt); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div><span style="color: var(--text-muted); font-size: 0.75rem;">Account Name:</span><div style="font-weight: 700; color: var(--text-main);">${escapeHtml(user.name || 'User')}</div></div>
            <div><span style="color: var(--text-muted); font-size: 0.75rem;">Registered Email:</span><div style="font-weight: 600; color: var(--text-main);">${escapeHtml(user.email || 'N/A')}</div></div>
            <div><span style="color: var(--text-muted); font-size: 0.75rem;">User ID:</span><div style="font-family: monospace; color: var(--primary); font-weight: 700;">${escapeHtml(user.id || 'UID-101')}</div></div>
            <div><span style="color: var(--text-muted); font-size: 0.75rem;">Role Authorization:</span><div><span class="badge badge-info">${escapeHtml(user.role || 'PATIENT')}</span></div></div>
            <div><span style="color: var(--text-muted); font-size: 0.75rem;">Facility Affiliation:</span><div style="font-weight: 600;">${escapeHtml(user.hospitalId || 'Central Network')}</div></div>
            <div><span style="color: var(--text-muted); font-size: 0.75rem;">Token Security:</span><div><span class="badge badge-active">JWT Bearer Signed</span></div></div>
          </div>
          <div style="padding: 10px; background: rgba(13, 148, 136, 0.08); border-left: 3px solid var(--primary); border-radius: var(--radius-xs); font-size: 0.82rem; color: var(--text-secondary);">
            🛡️ Your connection is cryptographically secured with SHA-256 tamper-evident audit logging.
          </div>
          <div class="modal-actions" style="margin-top: 10px;">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('accountSettingsModal')">Close</button>
          </div>
        </div>
      `;

    case 'preferences':
      if (user && user.role === 'PATIENT') {
        return `
          <form onsubmit="event.preventDefault(); window.showToast('Patient notification preferences saved.', 'success'); closeGlobalModal('accountSettingsModal');">
            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
              <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--bg-surface-alt); border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer;">
                <div>
                  <strong style="font-size: 0.88rem; color: var(--text-main);">Clinical Record Notifications</strong>
                  <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0;">Receive email alerts when new prescriptions or verified lab results are signed.</p>
                </div>
                <input type="checkbox" checked style="width: 18px; height: 18px; accent-color: var(--primary);">
              </label>
              <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--bg-surface-alt); border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer;">
                <div>
                  <strong style="font-size: 0.88rem; color: var(--text-main);">Follow-Up &amp; Care Reminders</strong>
                  <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0;">Reminders for upcoming specialist follow-ups and discharge instructions.</p>
                </div>
                <input type="checkbox" checked style="width: 18px; height: 18px; accent-color: var(--primary);">
              </label>
              <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--bg-surface-alt); border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer;">
                <div>
                  <strong style="font-size: 0.88rem; color: var(--text-main);">Hospital Care &amp; Review Alerts</strong>
                  <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0;">Invites to provide verified feedback on treating healthcare facilities.</p>
                </div>
                <input type="checkbox" checked style="width: 18px; height: 18px; accent-color: var(--primary);">
              </label>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('accountSettingsModal')">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Preferences</button>
            </div>
          </form>
        `;
      }
      return `
        <form onsubmit="event.preventDefault(); window.showToast('Notification preferences saved.', 'success'); closeGlobalModal('accountSettingsModal');">
          <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
            <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-surface-alt); border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer;">
              <div>
                <strong style="font-size: 0.88rem; color: var(--text-main);">Email Clinical Notifications</strong>
                <p style="font-size: 0.76rem; color: var(--text-muted); margin: 0;">Receive status updates on prescriptions, lab reports, and consultations.</p>
              </div>
              <input type="checkbox" checked style="width: 18px; height: 18px; accent-color: var(--primary);">
            </label>
            <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-surface-alt); border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer;">
              <div>
                <strong style="font-size: 0.88rem; color: var(--text-main);">Urgent Emergency Transfer Alerts</strong>
                <p style="font-size: 0.76rem; color: var(--text-muted); margin: 0;">Instant alerts for critical patient triage and facility dispatch.</p>
              </div>
              <input type="checkbox" checked style="width: 18px; height: 18px; accent-color: var(--primary);">
            </label>
            <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-surface-alt); border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer;">
              <div>
                <strong style="font-size: 0.88rem; color: var(--text-main);">Bed Inventory Capacity Warnings</strong>
                <p style="font-size: 0.76rem; color: var(--text-muted); margin: 0;">Notifications when ICU / Emergency ward capacity drops below 15%.</p>
              </div>
              <input type="checkbox" checked style="width: 18px; height: 18px; accent-color: var(--primary);">
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('accountSettingsModal')">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Preferences</button>
          </div>
        </form>
      `;

    case 'security':
    default: {
      const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
      if (user && (user.role === 'DOCTOR' || user.role === 'PATIENT')) {
        return `
          <div style="padding: 18px; background: var(--bg-surface-alt); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: 1.2rem;">🔒</span>
              <strong style="font-size: 0.92rem; color: var(--text-main);">Institutional Credential Governance</strong>
            </div>
            <p style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
              Under Hospitrack's healthcare credential governance policy, your login credentials and security tokens are managed directly by your Hospital Administration (Facility: <strong>${escapeHtml(user.hospitalId || 'Assigned Facility')}</strong>). Self-service credential changes are disabled for clinical data safety.
            </p>
            <div class="alert-banner info" style="font-size: 0.78rem;">
              To request a credential reset or security update, contact your Hospital Operations Desk or Facility Administrator.
            </div>
            <div class="modal-actions" style="margin-top: 1.25rem; display: flex; justify-content: flex-end;">
              <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('accountSettingsModal')">Close</button>
            </div>
          </div>
        `;
      }

      return `
        <form id="changePasswordForm" onsubmit="handlePasswordChangeSubmit(event)">
          <div id="changePwdAlert" class="alert-banner hidden mb-16"></div>

          <div class="form-group mb-16">
            <label class="form-label" for="settingsCurrentPwd">Current Password <span style="color: var(--danger);">*</span></label>
            <input type="password" id="settingsCurrentPwd" class="form-control" placeholder="••••••••••••" required>
          </div>

          <div class="form-group mb-16">
            <label class="form-label" for="settingsNewPwd">New Password <span style="color: var(--danger);">*</span></label>
            <input type="password" id="settingsNewPwd" class="form-control" placeholder="Min 8 characters" minlength="8" required>
          </div>

          <div class="form-group mb-16">
            <label class="form-label" for="settingsConfirmPwd">Confirm New Password <span style="color: var(--danger);">*</span></label>
            <input type="password" id="settingsConfirmPwd" class="form-control" placeholder="Repeat new password" minlength="8" required>
          </div>

          <div class="modal-actions" style="margin-top: 1.25rem;">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('accountSettingsModal')">Cancel</button>
            <button type="submit" id="changePwdSubmitBtn" class="btn btn-primary">Update Password</button>
          </div>
        </form>
      `;
    }
  }
}

window.handlePasswordChangeSubmit = async function(event) {
  event.preventDefault();
  const alertEl = document.getElementById('changePwdAlert');
  const btn = document.getElementById('changePwdSubmitBtn');

  if (alertEl) {
    alertEl.classList.add('hidden');
    alertEl.textContent = '';
  }

  const currentPassword = document.getElementById('settingsCurrentPwd')?.value;
  const newPassword = document.getElementById('settingsNewPwd')?.value;
  const confirmPassword = document.getElementById('settingsConfirmPwd')?.value;

  if (!currentPassword) {
    showPwdAlert('Please enter your current password.');
    return;
  }
  if (!newPassword || newPassword.length < 8) {
    showPwdAlert('New password must be at least 8 characters long.');
    return;
  }
  if (newPassword !== confirmPassword) {
    showPwdAlert('New password and confirmation do not match.');
    return;
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Updating Password...';
    }

    await window.hospitrackAuth.changePassword(currentPassword, newPassword);
    window.showToast('✓ Password updated successfully!', 'success');
    closeGlobalModal('accountSettingsModal');
  } catch (err) {
    showPwdAlert(err.message || 'Failed to update password.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Update Password';
    }
  }

  function showPwdAlert(msg) {
    if (alertEl) {
      alertEl.textContent = msg;
      alertEl.className = 'alert-banner error mb-16';
      alertEl.classList.remove('hidden');
    } else {
      window.showToast(msg, 'error');
    }
  }
};

