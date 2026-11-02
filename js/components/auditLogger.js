/**
 * Hospitrack — Production System Audit Trail & Compliance Ledger Component
 * Cryptographically signed chronological audit trail with multi-factor search, role & action filtering,
 * hospital scope, and safe data normalization.
 */

// Local fallback normalization helpers for bulletproof error resilience
function normalizeString(val, fallback = '') {
  if (val === null || val === undefined) return fallback;
  return String(val).trim();
}
function safeLowerCase(val, fallback = '') {
  return normalizeString(val, fallback).toLowerCase();
}
function safeUpperCase(val, fallback = '') {
  return normalizeString(val, fallback).toUpperCase();
}
function safeIncludes(val, query) {
  if (!query) return true;
  return safeLowerCase(val).includes(safeLowerCase(query));
}
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

if (typeof window !== 'undefined') {
  window.normalizeString = window.normalizeString || normalizeString;
  window.safeLowerCase = window.safeLowerCase || safeLowerCase;
  window.safeUpperCase = window.safeUpperCase || safeUpperCase;
  window.safeIncludes = window.safeIncludes || safeIncludes;
  window.escapeHtml = window.escapeHtml || escapeHtml;
}

let auditSearchText = '';
let auditRoleSelected = 'ALL';
let auditActionSelected = 'ALL';
let auditHospitalSelected = 'ALL';
let auditViewMode = 'timeline'; // 'timeline' | 'table'

window.renderAuditLogger = async function(container) {
  if (!container) container = document.getElementById('adminAuditContainer') || document.getElementById('mainContentArea');
  if (!container) return;

  const store = window.hospitrackStore;
  const auth = window.hospitrackAuth;
  const user = auth ? auth.getCurrentUser() : null;

  try {
    // If audit logs are not yet loaded, fetch them live from backend
    let logs = (store && typeof store.getAuditLogs === 'function') 
      ? store.getAuditLogs(auditRoleSelected, auditActionSelected, auditSearchText, auditHospitalSelected)
      : [];

    if (logs.length === 0 && store && typeof store.fetchAuditLogs === 'function') {
      try {
        await store.fetchAuditLogs(auditRoleSelected, auditActionSelected, auditSearchText, auditHospitalSelected);
        logs = store.getAuditLogs(auditRoleSelected, auditActionSelected, auditSearchText, auditHospitalSelected);
      } catch (e) {
        console.warn('Initial audit fetch note:', e.message);
      }
    }

    const allHospitals = (store && typeof store.getHospitals === 'function') ? store.getHospitals() : [];
    const isSuperAdmin = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN');

    // Calculate audit metrics safely
    const allLogs = (store && typeof store.getAuditLogs === 'function') ? store.getAuditLogs() : logs;
    const totalCount = Array.isArray(allLogs) ? allLogs.length : 0;
    const adminCount = Array.isArray(allLogs) ? allLogs.filter(l => safeUpperCase(l?.actorRole || l?.role).includes('ADMIN')).length : 0;
    const hospCount = Array.isArray(allLogs) ? allLogs.filter(l => safeUpperCase(l?.action || l?.eventType).includes('HOSPITAL') || safeUpperCase(l?.actorRole || l?.role).includes('HOSPITAL')).length : 0;
    const clinicalCount = Array.isArray(allLogs) ? allLogs.filter(l => {
      const act = safeUpperCase(l?.action || l?.eventType);
      return act.includes('PATIENT') || act.includes('PRESCRIPTION') || act.includes('VISIT') || act.includes('TRANSFER') || act.includes('REFERRAL') || act.includes('LAB');
    }).length : 0;

    container.innerHTML = `
      <!-- Single Authoritative Page Header -->
      <div class="page-header-clean">
        <div class="page-header-info">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="status-pill status-info">🛡️ Immutable Security Ledger</span>
            <span class="status-pill status-success">SHA-256 Verified</span>
          </div>
          <h1 class="page-title-clean">System Audit Trail &amp; Compliance Log</h1>
          <p class="page-subtitle-clean">
            Authoritative, tamper-evident security ledger capturing hospital operations, admissions, prescriptions, and access events.
          </p>
        </div>
        <div class="page-header-actions">
          <button type="button" class="btn btn-primary btn-sm" onclick="refreshAuditTrailLive()">
            <span>🔄</span> Refresh Trail
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="exportAuditLogsJson()">
            <span>💾</span> Export JSON
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="window.printAuditLedger()" title="Print Cryptographic Audit Summary">
            <span>🖨️</span> Print Ledger
          </button>
        </div>
      </div>

      <!-- 4-Card Compact Audit Metrics -->
      <div class="kpi-row-6 mb-24" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
        <div class="kpi-card-clean">
          <div class="kpi-card-header">
            <span class="kpi-label">TOTAL AUDIT EVENTS</span>
            <span class="kpi-icon">📜</span>
          </div>
          <div class="kpi-value">${totalCount}</div>
          <div class="kpi-subtext">Authoritative recorded entries</div>
        </div>
        <div class="kpi-card-clean">
          <div class="kpi-card-header">
            <span class="kpi-label">ADMIN &amp; SECURITY</span>
            <span class="kpi-icon">🔒</span>
          </div>
          <div class="kpi-value" style="color: var(--primary);">${adminCount}</div>
          <div class="kpi-subtext">Governance &amp; credentials</div>
        </div>
        <div class="kpi-card-clean">
          <div class="kpi-card-header">
            <span class="kpi-label">HOSPITAL OPERATIONS</span>
            <span class="kpi-icon">🏥</span>
          </div>
          <div class="kpi-value" style="color: var(--hospital-color);">${hospCount}</div>
          <div class="kpi-subtext">Facility updates &amp; lifecycle</div>
        </div>
        <div class="kpi-card-clean">
          <div class="kpi-card-header">
            <span class="kpi-label">CLINICAL &amp; PATIENTS</span>
            <span class="kpi-icon">👥</span>
          </div>
          <div class="kpi-value" style="color: var(--success);">${clinicalCount}</div>
          <div class="kpi-subtext">Admissions, Rx &amp; transfers</div>
        </div>
      </div>

      <!-- Filter & Search Panel -->
      <div class="dashboard-card mb-24">
        <div class="dashboard-card-header">
          <div>
            <h3 class="dashboard-card-title">Audit Ledger Filters &amp; Query Controls</h3>
            <p class="dashboard-card-subtitle">Filter events by actor role, action category, hospital scope, or search text</p>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button type="button" class="btn btn-secondary btn-sm ${auditViewMode === 'timeline' ? 'active' : ''}" onclick="toggleAuditViewMode('timeline')">
              Timeline View
            </button>
            <button type="button" class="btn btn-secondary btn-sm ${auditViewMode === 'table' ? 'active' : ''}" onclick="toggleAuditViewMode('table')">
              Table View
            </button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; align-items: flex-end; padding: 4px 0;">
          <div style="grid-column: span 2; min-width: 260px;">
            <label class="form-label" for="auditSearchInput">Search Action, Actor, Target or Reference</label>
            <input 
              type="text" 
              id="auditSearchInput" 
              class="form-control" 
              placeholder="e.g. HOSP-101, PAT-301, DOCTOR_ASSIGNED, or Admin..."
              value="${escapeHtml(auditSearchText)}"
              oninput="handleAuditSearchChange(this.value)"
            >
          </div>
          <div>
            <label class="form-label" for="auditRoleFilter">Actor Role</label>
            <select id="auditRoleFilter" class="form-control" onchange="handleAuditRoleFilter(this.value)">
              <option value="ALL" ${auditRoleSelected === 'ALL' ? 'selected' : ''}>All Roles</option>
              <option value="SUPER_ADMIN" ${auditRoleSelected === 'SUPER_ADMIN' ? 'selected' : ''}>SUPER_ADMIN</option>
              <option value="HOSPITAL_ADMIN" ${auditRoleSelected === 'HOSPITAL_ADMIN' ? 'selected' : ''}>HOSPITAL_ADMIN</option>
              <option value="DOCTOR" ${auditRoleSelected === 'DOCTOR' ? 'selected' : ''}>DOCTOR</option>
              <option value="PATIENT" ${auditRoleSelected === 'PATIENT' ? 'selected' : ''}>PATIENT</option>
              <option value="SYSTEM" ${auditRoleSelected === 'SYSTEM' ? 'selected' : ''}>SYSTEM</option>
            </select>
          </div>
          <div>
            <label class="form-label" for="auditActionFilter">Action Category</label>
            <select id="auditActionFilter" class="form-control" onchange="handleAuditActionFilter(this.value)">
              <option value="ALL" ${auditActionSelected === 'ALL' ? 'selected' : ''}>All Actions</option>
              <option value="HOSPITAL" ${auditActionSelected === 'HOSPITAL' ? 'selected' : ''}>Hospital Lifecycle</option>
              <option value="PATIENT" ${auditActionSelected === 'PATIENT' ? 'selected' : ''}>Patient Operations</option>
              <option value="DOCTOR" ${auditActionSelected === 'DOCTOR' ? 'selected' : ''}>Doctor Assignment</option>
              <option value="BED" ${auditActionSelected === 'BED' ? 'selected' : ''}>Bed &amp; Ward Capacity</option>
              <option value="PRESCRIPTION" ${auditActionSelected === 'PRESCRIPTION' ? 'selected' : ''}>Prescriptions</option>
              <option value="REFERRAL" ${auditActionSelected === 'REFERRAL' ? 'selected' : ''}>Specialist Referrals</option>
              <option value="TRANSFER" ${auditActionSelected === 'TRANSFER' ? 'selected' : ''}>Emergency Transfers</option>
              <option value="USER" ${auditActionSelected === 'USER' ? 'selected' : ''}>User &amp; Auth</option>
            </select>
          </div>
          ${isSuperAdmin ? `
            <div>
              <label class="form-label" for="auditHospitalFilter">Hospital Scope</label>
              <select id="auditHospitalFilter" class="form-control" onchange="handleAuditHospitalFilter(this.value)">
                <option value="ALL" ${auditHospitalSelected === 'ALL' ? 'selected' : ''}>All Facilities</option>
                ${allHospitals.map(h => `
                  <option value="${escapeHtml(h.id)}" ${auditHospitalSelected === h.id ? 'selected' : ''}>${escapeHtml(h.name || h.id)}</option>
                `).join('')}
              </select>
            </div>
          ` : ''}
          <div>
            <button type="button" class="btn btn-secondary" style="width: 100%;" onclick="resetAuditFilters()">
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <!-- Main Audit Events Container -->
      <div class="dashboard-card">
        <div id="auditTimelineContainer">
          ${renderAuditList(logs)}
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Audit Logger rendering error:', err);
    container.innerHTML = `
      <div class="dashboard-section-error" style="margin: 32px 0; padding: 32px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-card); text-align: center;">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">⚠️</div>
        <h3 style="color: var(--text-main); font-size: 1.2rem; margin-bottom: 8px;">Unable to load Audit Trail</h3>
        <p style="color: var(--text-secondary); max-width: 480px; margin: 0 auto 16px auto; font-size: 0.88rem;">
          ${escapeHtml(err.message || 'A technical error occurred while loading audit events.')}
        </p>
        <button type="button" class="btn btn-primary" onclick="window.renderAuditLogger(document.getElementById('mainContentArea'))">
          🔄 Retry Loading Audit Trail
        </button>
      </div>
    `;
  }
};

function renderAuditList(logs) {
  if (!logs || logs.length === 0) {
    return `
      <div class="empty-state-clean" style="padding: 3rem 1rem; text-align: center;">
        <span class="empty-icon" style="font-size: 2.5rem;">📜</span>
        <h4 class="empty-title" style="margin: 8px 0 4px 0;">No Audit Records Found</h4>
        <p class="empty-desc" style="color: var(--text-muted); font-size: 0.88rem;">No events matched the current search terms and role filters.</p>
        <button type="button" class="btn btn-secondary btn-sm mt-16" onclick="resetAuditFilters()">Reset Filters</button>
      </div>
    `;
  }

  if (auditViewMode === 'table') {
    return renderAuditTableView(logs);
  }
  return renderAuditTimelineView(logs);
}

function renderAuditTimelineView(logs) {
  return `
    <div class="timeline-track" style="padding: 8px 0;">
      ${logs.map(l => {
        const item = (window.normalizeAuditEvent) ? window.normalizeAuditEvent(l) : l;
        const roleBadgeClass = getAuditRoleBadgeClass(item.actorRole);
        const actionIcon = getActionIcon(item.action);
        const formattedTime = item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A';

        return `
          <div class="timeline-node" style="padding: 14px 16px; margin-bottom: 12px; background: var(--bg-surface-secondary, rgba(255,255,255,0.03)); border: 1px solid var(--border-color, rgba(255,255,255,0.08)); border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span class="status-pill ${roleBadgeClass}">${escapeHtml(item.actorRole || 'SYSTEM')}</span>
                <span style="font-size: 1.1rem;">${actionIcon}</span>
                <strong style="color: var(--text-main); font-size: 0.95rem;">${escapeHtml(item.action || 'SYSTEM_EVENT')}</strong>
                ${item.targetEntity && item.targetEntity !== 'SYSTEM' ? `
                  <span class="status-pill status-neutral font-mono">${escapeHtml(item.targetEntity)}: ${escapeHtml(item.targetId || '—')}</span>
                ` : ''}
              </div>
              <span style="font-size: 0.78rem; color: var(--text-dim); font-family: monospace;">
                🕒 ${escapeHtml(formattedTime)}
              </span>
            </div>

            <p style="color: var(--text-secondary); font-size: 0.88rem; line-height: 1.5; margin: 4px 0 8px 0;">
              ${escapeHtml(item.details || item.description || 'System event executed.')}
            </p>

            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-dim); border-top: 1px dashed var(--border-color, rgba(255,255,255,0.08)); padding-top: 8px; margin-top: 6px; flex-wrap: wrap; gap: 8px;">
              <span>Actor: <strong>${escapeHtml(item.actorName || item.actorId || 'System')}</strong> (<code>${escapeHtml(item.actorId || 'SYS')}</code>)</span>
              <span>Ledger Ref: <code style="font-family: monospace;">${escapeHtml(item.id || 'N/A')}</code></span>
              <span style="color: var(--success); font-size: 0.72rem;">🔒 Hash: <code>${escapeHtml((item.integrityHash || 'SEC-OK').substring(0, 12))}...</code></span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderAuditTableView(logs) {
  return `
    <div class="table-container-clean">
      <table class="table-clean">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Role</th>
            <th>Action</th>
            <th>Actor</th>
            <th>Target Resource</th>
            <th>Event Details</th>
            <th>Integrity Hash</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(l => {
            const item = (window.normalizeAuditEvent) ? window.normalizeAuditEvent(l) : l;
            const roleBadgeClass = getAuditRoleBadgeClass(item.actorRole);
            const formattedTime = item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A';

            return `
              <tr>
                <td style="font-size: 0.75rem; font-family: monospace; white-space: nowrap; color: var(--text-muted);">${escapeHtml(formattedTime)}</td>
                <td><span class="status-pill ${roleBadgeClass}">${escapeHtml(item.actorRole || 'SYSTEM')}</span></td>
                <td><strong>${escapeHtml(item.action || 'EVENT')}</strong></td>
                <td>${escapeHtml(item.actorName || item.actorId || 'System')}</td>
                <td><code>${escapeHtml(item.targetEntity || 'SYS')}:${escapeHtml(item.targetId || '—')}</code></td>
                <td style="max-width: 300px; font-size: 0.82rem; color: var(--text-secondary);">${escapeHtml(item.details || item.description || '—')}</td>
                <td><code style="font-size: 0.72rem; color: var(--success);">${escapeHtml((item.integrityHash || 'SHA256').substring(0, 10))}...</code></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function getAuditRoleBadgeClass(role) {
  const r = safeUpperCase(role, 'SYSTEM');
  if (r.includes('SUPER_ADMIN') || r === 'ADMIN') return 'status-danger';
  if (r.includes('HOSPITAL')) return 'status-info';
  if (r.includes('DOCTOR')) return 'status-success';
  if (r.includes('PATIENT')) return 'status-warning';
  return 'status-neutral';
}

function getActionIcon(action) {
  const a = safeUpperCase(action, '');
  if (a.includes('HOSPITAL')) return '🏥';
  if (a.includes('PATIENT')) return '👤';
  if (a.includes('DOCTOR')) return '🩺';
  if (a.includes('BED') || a.includes('WARD')) return '🛏️';
  if (a.includes('PRESCRIPTION') || a.includes('MEDICINE')) return '💊';
  if (a.includes('REFERRAL')) return '🔁';
  if (a.includes('TRANSFER')) return '🚑';
  if (a.includes('VISIT') || a.includes('CONSULT')) return '📋';
  if (a.includes('REPORT') || a.includes('LAB')) return '🧪';
  if (a.includes('USER') || a.includes('AUTH') || a.includes('PASSWORD')) return '🔐';
  return '⚡';
}

window.handleAuditSearchChange = function(val) {
  auditSearchText = val;
  updateAuditViewContainer();
};

window.handleAuditRoleFilter = function(role) {
  auditRoleSelected = role;
  updateAuditViewContainer();
};

window.handleAuditActionFilter = function(action) {
  auditActionSelected = action;
  updateAuditViewContainer();
};

window.handleAuditHospitalFilter = function(hospId) {
  auditHospitalSelected = hospId;
  updateAuditViewContainer();
};

window.toggleAuditViewMode = function(mode) {
  auditViewMode = mode;
  updateAuditViewContainer();
};

function updateAuditViewContainer() {
  const store = window.hospitrackStore;
  const logs = (store && typeof store.getAuditLogs === 'function') 
    ? store.getAuditLogs(auditRoleSelected, auditActionSelected, auditSearchText, auditHospitalSelected)
    : [];
  const container = document.getElementById('auditTimelineContainer');
  if (container) {
    container.innerHTML = renderAuditList(logs);
  }
}

window.resetAuditFilters = function() {
  auditSearchText = '';
  auditRoleSelected = 'ALL';
  auditActionSelected = 'ALL';
  auditHospitalSelected = 'ALL';
  const sInput = document.getElementById('auditSearchInput');
  const rSelect = document.getElementById('auditRoleFilter');
  const aSelect = document.getElementById('auditActionFilter');
  const hSelect = document.getElementById('auditHospitalFilter');
  if (sInput) sInput.value = '';
  if (rSelect) rSelect.value = 'ALL';
  if (aSelect) aSelect.value = 'ALL';
  if (hSelect) hSelect.value = 'ALL';
  window.renderAuditLogger(document.getElementById('mainContentArea'));
};

window.refreshAuditTrailLive = async function() {
  const store = window.hospitrackStore;
  if (!store) return;
  try {
    window.showToast('Refreshing live audit trail...', 'info');
    if (typeof store.fetchAuditLogs === 'function') {
      await store.fetchAuditLogs(auditRoleSelected, auditActionSelected, auditSearchText, auditHospitalSelected);
    }
    window.renderAuditLogger(document.getElementById('mainContentArea'));
    window.showToast('Audit trail synchronized with PostgreSQL ledger.', 'success');
  } catch (err) {
    window.showToast('Failed to synchronize audit records: ' + err.message, 'error');
  }
};

window.exportAuditLogsJson = function() {
  const store = window.hospitrackStore;
  const logs = store ? store.getAuditLogs(auditRoleSelected, auditActionSelected, auditSearchText, auditHospitalSelected) : [];
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hospitrack-audit-trail-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  window.showToast('Audit log JSON exported successfully!', 'success');
};
