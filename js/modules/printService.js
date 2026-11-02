/**
 * Hospitrack Centralized Professional Printing & Document Generation Service
 * Orchestrates clinical templates, print preview modal, A4 isolation, and clean teardown.
 */

(function (global) {
  'use strict';

  const printService = {
    /**
     * Get or create the isolated DOM print container
     */
    getPrintContainer() {
      let el = document.getElementById('printable-medical-record');
      if (!el) {
        el = document.createElement('div');
        el.id = 'printable-medical-record';
        el.className = 'printable-document-container';
        el.setAttribute('aria-hidden', 'true');
        document.body.appendChild(el);
      }
      return el;
    },

    /**
     * Generate HTML for any document type using printTemplates
     */
    generateDocumentHtml(type, payload = {}) {
      const templates = global.hospitrackPrintTemplates || {};
      const store = global.hospitrackStore || {};
      const normType = String(type || '').toLowerCase().trim();

      // Normalize aliases
      let templateFn = null;
      if (normType === 'prescription' || normType === 'rx') {
        templateFn = templates.prescription;
      } else if (normType === 'lab-report' || normType === 'lab' || normType === 'laboratory') {
        templateFn = templates['lab-report'];
      } else if (normType === 'referral' || normType === 'referral-letter') {
        templateFn = templates.referral;
      } else if (normType === 'inpatient-summary' || normType === 'clinical-chart') {
        templateFn = templates['inpatient-summary'];
      } else if (normType === 'discharge' || normType === 'discharge-summary') {
        templateFn = templates.discharge;
      } else if (normType === 'summary' || normType === 'patient-summary' || normType === 'medical-summary') {
        templateFn = templates.summary;
      } else if (normType === 'consultation' || normType === 'encounter' || normType === 'visit') {
        templateFn = templates.consultation;
      } else if (normType === 'bed-occupancy' || normType === 'bed-census' || normType === 'census') {
        templateFn = templates['bed-occupancy'];
      } else if (normType === 'hospital-dossier' || normType === 'facility-dossier' || normType === 'hospital-profile') {
        templateFn = templates['hospital-dossier'];
      } else if (normType === 'admin-network-dossier' || normType === 'network-dossier' || normType === 'network') {
        templateFn = templates['admin-network-dossier'];
      } else if (normType === 'system-analytics' || normType === 'analytics' || normType === 'operational-analytics') {
        templateFn = templates['system-analytics'];
      } else if (normType === 'audit-ledger' || normType === 'audit') {
        templateFn = templates['audit-ledger'];
      } else if (normType === 'emergency-transfers' || normType === 'transfer' || normType === 'transfers') {
        templateFn = templates['emergency-transfers'];
      } else if (typeof templates[normType] === 'function') {
        templateFn = templates[normType];
      }

      if (typeof templateFn === 'function') {
        return templateFn(payload, store);
      }

      // Fallback: render longitudinal summary if type unknown
      if (typeof templates.summary === 'function') {
        return templates.summary(payload, store);
      }
      return '<div class="print-medical-sheet"><p>Clinical document record prepared for print.</p></div>';
    },

    /**
     * Directly Print Document (A4 with complete DOM isolation)
     */
    printDocument(type, payload = {}, options = {}) {
      const container = this.getPrintContainer();
      const fallbackArea = document.getElementById('hospitrackPrintArea');
      const docHtml = this.generateDocumentHtml(type, payload);

      container.innerHTML = docHtml;
      if (fallbackArea && fallbackArea !== container) {
        fallbackArea.innerHTML = docHtml;
      }

      // Add strict isolation class to body
      document.body.classList.add('printing-custom-doc');
      if (type === 'inpatient-summary') document.body.classList.add('printing-inpatient-summary');
      if (type === 'referral') document.body.classList.add('printing-referral-slip');

      const cleanup = () => {
        document.body.classList.remove('printing-custom-doc');
        document.body.classList.remove('printing-inpatient-summary');
        document.body.classList.remove('printing-referral-slip');
        if (container) container.innerHTML = '';
        if (fallbackArea && fallbackArea !== container) fallbackArea.innerHTML = '';
        if (typeof window.removeEventListener === 'function') {
          window.removeEventListener('afterprint', cleanup);
        }
      };

      if (typeof window.addEventListener === 'function') {
        window.addEventListener('afterprint', cleanup);
      }

      // Trigger print after microtask layout flush
      setTimeout(() => {
        if (typeof window.print === 'function') {
          window.print();
        }
        // Safety fallback cleanup in case afterprint does not fire
        setTimeout(cleanup, 2500);
      }, 100);
    },

    /**
     * Interactive Document Print Preview Modal
     */
    previewDocument(type, payload = {}, options = {}) {
      let modalOverlay = document.getElementById('hospitrackPrintPreviewModal');
      if (!modalOverlay) {
        modalOverlay = document.createElement('div');
        modalOverlay.id = 'hospitrackPrintPreviewModal';
        modalOverlay.className = 'modal-overlay print-preview-modal-overlay no-print';
        modalOverlay.setAttribute('role', 'dialog');
        modalOverlay.setAttribute('aria-modal', 'true');
        document.body.appendChild(modalOverlay);
      }

      const docHtml = this.generateDocumentHtml(type, payload);
      const title = options.title || 'Official Document Print Preview';

      modalOverlay.innerHTML = `
        <div class="modal-box print-preview-modal-box">
          <div class="print-preview-modal-header">
            <div class="print-preview-header-left">
              <span class="print-preview-header-icon">📄</span>
              <div>
                <h3 class="print-preview-title">${title}</h3>
                <p class="print-preview-subtitle">Healthcare Certified A4 Printable Document • Inspect before dispatching</p>
              </div>
            </div>
            <div class="print-preview-header-actions">
              <button type="button" class="btn btn-secondary btn-sm" onclick="hospitrackPrintService.closePreview()">
                Close
              </button>
              <button type="button" class="btn btn-primary btn-sm btn-print-now" onclick="hospitrackPrintService.printFromPreview('${type}')">
                <svg class="lucide lucide-printer" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>

          <div class="print-preview-modal-body">
            <div class="print-preview-paper-sheet">
              ${docHtml}
            </div>
          </div>
        </div>
      `;

      modalOverlay.classList.add('open');
      modalOverlay.style.display = 'flex';
      this._lastPreviewData = { type, payload };
    },

    /**
     * Print directly from the open preview modal
     */
    printFromPreview(type) {
      const data = this._lastPreviewData || { type, payload: {} };
      this.closePreview();
      this.printDocument(data.type, data.payload);
    },

    /**
     * Close the print preview modal
     */
    closePreview() {
      const modalOverlay = document.getElementById('hospitrackPrintPreviewModal');
      if (modalOverlay) {
        modalOverlay.classList.remove('open');
        modalOverlay.style.display = 'none';
      }
    },

    /**
     * Download as PDF (Uses native browser print-to-PDF pipeline)
     */
    exportPdf(type, payload = {}) {
      this.printDocument(type, payload);
    }
  };

  // Export to global namespace
  global.hospitrackPrintService = printService;

  // Unified backward-compatible bindings across all modules
  global.hospitrackPrintDocument = function (type, payload = {}) {
    printService.printDocument(type, payload);
  };

  global.openDocumentPrintPreview = function (type, payload = {}, options = {}) {
    printService.previewDocument(type, payload, options);
  };

  global.printPrescription = function (rxId) {
    printService.printDocument('prescription', rxId);
  };

  global.printLabReport = function (labId) {
    printService.printDocument('lab-report', labId);
  };

  global.printConsultation = function (conId) {
    printService.printDocument('consultation', conId);
  };

  global.printPatientSummary = function (patId) {
    printService.printDocument('summary', patId);
  };

  global.printDischargeSummary = function (id) {
    printService.printDocument('discharge', id);
  };

  global.printReferral = function (refId) {
    printService.printDocument('referral', refId);
  };

  global.previewReferralLetter = function (payload) {
    printService.previewDocument('referral', payload, { title: 'Specialist Referral Letter Preview' });
  };

  global.printAuditLedger = function () {
    printService.printDocument('audit-ledger');
  };

  global.printInpatientSummary = function (patientId) {
    printService.printDocument('inpatient-summary', patientId);
  };

  global.printClinicalHistory = function () {
    const auth = global.hospitrackAuth ? global.hospitrackAuth.getCurrentUser() : null;
    printService.printDocument('summary', auth ? auth.patientId || auth.id : 'PAT-303');
  };

  global.printBedCensusReport = function (payload) {
    printService.printDocument('bed-occupancy', payload);
  };

  global.printHospitalDossier = function (hospitalId) {
    printService.printDocument('hospital-dossier', hospitalId);
  };

  global.printNetworkDossier = function () {
    printService.printDocument('admin-network-dossier');
  };

  global.printSystemAnalytics = function () {
    printService.printDocument('system-analytics');
  };

  global.printEmergencyTransfers = function (payload) {
    printService.printDocument('emergency-transfers', payload);
  };

  global.downloadClinicalPdf = function (type, id) {
    printService.printDocument(type, id);
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = printService;
  }
})(typeof window !== 'undefined' ? window : global);

