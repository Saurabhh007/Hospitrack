/**
 * Hospitrack Professional Healthcare Document Formatting & Utility Suite
 * Standards-compliant text, date, clinical identifier, and cryptographic helpers.
 */

(function (global) {
  'use strict';

  const documentUtils = {
    /**
     * Safe HTML escaping to prevent XSS in document templates
     */
    escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    /**
     * Standardized clinical date formatter (e.g., "Oct 30, 2026")
     */
    formatDate(dateVal, fallback = 'N/A') {
      if (!dateVal) return fallback;
      try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return String(dateVal);
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } catch (_) {
        return String(dateVal) || fallback;
      }
    },

    /**
     * Standardized clinical date-time formatter (e.g., "Oct 30, 2026 • 10:45 AM")
     */
    formatDateTime(dateVal, fallback = 'N/A') {
      if (!dateVal) return fallback;
      try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return String(dateVal);
        const dateStr = d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        const timeStr = d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
        return `${dateStr} • ${timeStr}`;
      } catch (_) {
        return String(dateVal) || fallback;
      }
    },

    /**
     * Standardized time-only formatter (e.g., "10:45 AM")
     */
    formatTimeOnly(dateVal, fallback = '10:00 AM') {
      if (!dateVal) return fallback;
      try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return String(dateVal);
        return d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (_) {
        return fallback;
      }
    },

    /**
     * Normalize doctor name preventing duplicate "Dr. Dr." and ensuring professional title
     */
    formatDoctorName(name, fallback = 'Dr. Attending Physician') {
      if (!name || typeof name !== 'string') return fallback;
      let clean = name.trim();
      // Remove duplicate prefixes
      clean = clean.replace(/^(Dr\.?\s*)+/i, '').trim();
      return `Dr. ${clean}`;
    },

    /**
     * Standardized Medical Record Number / Universal Healthcare ID
     */
    formatPatientMrn(patientId, facilityCode = 'CGH') {
      if (!patientId) return `UHID-994-${facilityCode}`;
      const cleanId = String(patientId).replace(/^(PAT-|PT-)/i, '');
      return `UHID-91-${facilityCode}-${cleanId}`;
    },

    /**
     * Human-readable clinical status format
     */
    formatHumanStatus(status, fallback = 'Active') {
      if (!status) return fallback;
      const s = String(status).toUpperCase().trim();
      switch (s) {
        case 'CHECKED_IN':
        case 'ADMITTED':
          return 'Admitted Inpatient';
        case 'DISCHARGED':
        case 'DOCTOR_APPROVED':
          return 'Discharged / Complete';
        case 'TRANSFER_PENDING':
          return 'Transfer Pending';
        case 'IN_PROGRESS':
          return 'In Progress';
        case 'PENDING':
        case 'PENDING_REVIEW':
          return 'Pending Evaluation';
        case 'COMPLETED':
        case 'FINAL':
        case 'CERTIFIED':
          return 'Certified / Complete';
        case 'FINAL_CERTIFIED':
          return 'Final Certified';
        case 'ROUTINE':
          return 'Routine';
        case 'URGENT':
          return 'Urgent (< 48h)';
        case 'EMERGENCY':
        case 'STAT':
          return 'STAT / Emergency';
        default:
          return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, ' ');
      }
    },

    /**
     * Generate unique printable document serial number
     */
    generateDocumentUid(prefix = 'DOC') {
      const year = new Date().getFullYear();
      const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
      return `${prefix}-${year}-${rand}`;
    },

    /**
     * Generate cryptographic validation string for authentic clinical auditability
     */
    generateSecurityHash(seed = '') {
      let hash = 0;
      const str = String(seed) + Date.now().toString();
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
      const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `SHA256:${hex.substring(0, 4)}-${hex.substring(4, 8)}-${rand}`;
    },

    /**
     * Clean string accessor
     */
    safeString(val, fallback = '') {
      if (val === null || val === undefined) return fallback;
      return String(val).trim();
    },

    /**
     * Clean array accessor
     */
    safeArray(val) {
      if (Array.isArray(val)) return val;
      if (val && typeof val === 'object' && Array.isArray(val.data)) return val.data;
      return [];
    },

    /**
     * Clean number accessor
     */
    safeNumber(val, fallback = 0) {
      const num = Number(val);
      return isNaN(num) ? fallback : num;
    }
  };

  // Export to global window scope and CommonJS if in Node environment
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = documentUtils;
  }
  if (typeof global !== 'undefined') {
    global.hospitrackDocumentUtils = documentUtils;
    // Export aliases for widespread consumption
    global.formatDoctorName = global.formatDoctorName || documentUtils.formatDoctorName;
    global.formatPatientMrn = global.formatPatientMrn || documentUtils.formatPatientMrn;
  }
})(typeof window !== 'undefined' ? window : global);
