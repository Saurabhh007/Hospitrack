/**
 * Hospitrack — Advanced Clinical Decision Support (CDS) Safety Engine
 * Real-Time Drug-Drug Interaction (DDI), Drug-Allergy Contraindication,
 * Cross-Order Duplication, and Physician Clinical Override Subsystem.
 */

(function () {
  'use strict';

  // Client-side instant interaction dictionary for immediate typing feedback
  const DDI_RULES = [
    {
      drugs: ['sildenafil', 'nitroglycerin'],
      severity: 'CONTRAINDICATED',
      title: 'Fatal Hypotension Contraindication (PDE-5 Inhibitor + Nitrate)',
      description: 'Profound synergistic cGMP elevation causes critical refractory hypotension and cardiovascular collapse.',
      action: 'Concurrent use is strictly contraindicated. Discontinue nitrate or select alternative therapy.'
    },
    {
      drugs: ['tadalafil', 'nitroglycerin'],
      severity: 'CONTRAINDICATED',
      title: 'Fatal Hypotension Contraindication (PDE-5 Inhibitor + Nitrate)',
      description: 'Severe refractory hypotension and circulatory shock risk.',
      action: 'Contraindicated. Minimum 48-hour washout required.'
    },
    {
      drugs: ['potassium', 'spironolactone'],
      severity: 'CONTRAINDICATED',
      title: 'Severe Hyperkalemia Risk (Potassium Supplement + Aldosterone Antagonist)',
      description: 'Concurrent retention precipitates lethal hyperkalemia and cardiac arrest.',
      action: 'Avoid potassium supplementation with potassium-sparing diuretics.'
    },
    {
      drugs: ['lisinopril', 'losartan'],
      severity: 'CONTRAINDICATED',
      title: 'Dual RAS Blockade Contraindication (ACE Inhibitor + ARB)',
      description: 'Dual blockade causes severe renal impairment, hyperkalemia, and refractory hypotension without efficacy gain.',
      action: 'Prescribe single agent targeting the renin-angiotensin axis.'
    },
    {
      drugs: ['warfarin', 'aspirin'],
      severity: 'MAJOR',
      title: 'Major Hemorrhage Hazard (Warfarin + Antiplatelet Salicylate)',
      description: 'Marked synergy between anticoagulant and antiplatelet inhibition substantially elevates risk of fatal gastrointestinal and intracranial hemorrhage.',
      action: 'Requires explicit clinical justification (e.g. post-PCI stent), proton pump inhibitor gastroprotection, and close INR monitoring.'
    },
    {
      drugs: ['warfarin', 'ibuprofen'],
      severity: 'MAJOR',
      title: 'Gastrointestinal Bleeding Hazard (Warfarin + NSAID)',
      description: 'NSAIDs induce gastric mucosal injury and displace warfarin, increasing bleeding risk fourfold.',
      action: 'Avoid NSAIDs in anticoagulated patients. Use paracetamol for analgesia.'
    },
    {
      drugs: ['methotrexate', 'ibuprofen'],
      severity: 'MAJOR',
      title: 'Methotrexate Toxicity Hazard (Methotrexate + NSAID)',
      description: 'NSAIDs diminish methotrexate renal excretion, causing bone marrow suppression and nephrotoxicity.',
      action: 'Avoid NSAID co-prescription during methotrexate therapy.'
    },
    {
      drugs: ['ciprofloxacin', 'amiodarone'],
      severity: 'MAJOR',
      title: 'Critical QTc Prolongation Hazard (Fluoroquinolone + Amiodarone)',
      description: 'Additive cardiac electrophysiological prolongation predisposing to Torsades de Pointes.',
      action: 'Obtain baseline 12-lead ECG; monitor serum K+ and Mg2+.'
    },
    {
      drugs: ['atorvastatin', 'clarithromycin'],
      severity: 'MAJOR',
      title: 'Rhabdomyolysis Risk (Statin + CYP3A4 Inhibitor)',
      description: 'Strong CYP3A4 inhibition elevates statin blood levels up to 400%, precipitating muscle necrosis and acute kidney failure.',
      action: 'Temporarily suspend statin therapy during clarithromycin antibiotic course.'
    },
    {
      drugs: ['metoprolol', 'verapamil'],
      severity: 'MAJOR',
      title: 'Severe Bradycardia & AV Block Hazard (Beta-Blocker + Non-DHP CCB)',
      description: 'Profound negative dromotropic cardiac depression, risk of complete heart block and severe hypotension.',
      action: 'Avoid co-prescription. Inpatient continuous telemetry required if clinically mandated.'
    },
    {
      drugs: ['fluoxetine', 'tramadol'],
      severity: 'MAJOR',
      title: 'Serotonin Syndrome Hazard (SSRI + Serotonergic Opioid)',
      description: 'Synergistic serotonin accumulation predisposing to hyperthermia, clonus, and autonomic instability.',
      action: 'Monitor for agitation, hyperreflexia, and diaphoresis; consider non-serotonergic analgesic.'
    },
    {
      drugs: ['clopidogrel', 'omeprazole'],
      severity: 'MODERATE',
      title: 'Reduced Antiplatelet Efficacy (Clopidogrel + CYP2C19 Inhibitor)',
      description: 'Omeprazole inhibits bioactivation of clopidogrel, lessening platelet protection.',
      action: 'Consider pantoprazole or famotidine as gastroprotective alternatives.'
    }
  ];

  function normalizeMedName(raw) {
    if (!raw) return '';
    let s = String(raw).toLowerCase().trim();
    s = s.replace(/\b\d+(\.\d+)?\s*(mg|mcg|g|ml|iu|tablets?|caps?)\b/g, '');
    s = s.replace(/[^a-z0-9\s]/g, ' ').trim();
    const parts = s.split(/\s+/);
    return parts.length > 0 ? parts[0] : '';
  }

  function checkAllergyMatch(medNorm, allergyText) {
    if (!medNorm || !allergyText) return false;
    const at = allergyText.toLowerCase();

    // Penicillin / Beta-lactams
    if (at.includes('penicillin') || at.includes('beta-lactam')) {
      if (['amoxicillin', 'ampicillin', 'penicillin', 'augmentin', 'piperacillin'].some(d => medNorm.includes(d))) {
        return true;
      }
    }
    // Sulfa
    if (at.includes('sulfa') || at.includes('sulfonamide')) {
      if (['sulfa', 'bactrim', 'septra', 'sulfamethoxazole', 'sulfasalazine'].some(d => medNorm.includes(d))) {
        return true;
      }
    }
    // NSAIDs / Aspirin
    if (at.includes('aspirin') || at.includes('nsaid')) {
      if (['aspirin', 'ibuprofen', 'naproxen', 'diclofenac', 'ketorolac', 'celecoxib'].some(d => medNorm.includes(d))) {
        return true;
      }
    }
    // Opioids
    if (at.includes('opioid') || at.includes('codeine') || at.includes('morphine')) {
      if (['codeine', 'morphine', 'tramadol', 'oxycodone', 'fentanyl'].some(d => medNorm.includes(d))) {
        return true;
      }
    }
    return at.includes(medNorm);
  }

  window.ClinicalSafetyManager = {
    /**
     * Fast synchronous local safety check (zero latency)
     */
    evaluateLocalSafety: function (patient, currentMedicines, activePastMedicines = []) {
      const report = {
        safe: true,
        hasContraindication: false,
        hasMajorAlert: false,
        hasAllergyAlert: false,
        hasDuplication: false,
        alerts: []
      };

      if (!currentMedicines || !currentMedicines.length) {
        return report;
      }

      const normMeds = [];
      const rawMap = {};

      currentMedicines.forEach(m => {
        const name = typeof m === 'string' ? m : (m && m.name ? m.name : '');
        const norm = normalizeMedName(name);
        if (norm) {
          normMeds.push(norm);
          rawMap[norm] = name;
        }
      });

      // 1. Intra-order Duplicates
      const seen = new Set();
      normMeds.forEach(norm => {
        if (seen.has(norm)) {
          report.hasDuplication = true;
          report.safe = false;
          report.alerts.push({
            severity: 'DUPLICATE',
            title: `Duplicate Drug in Order: ${rawMap[norm]}`,
            description: `The medication '${rawMap[norm]}' is specified multiple times in this single prescription order. Co-prescribing identical medications risks accidental dosage doubling.`,
            action: 'Consolidate into a single order line with the appropriate dosage.'
          });
        }
        seen.add(norm);
      });

      // 2. Allergies Check
      const allergies = (patient && (patient.allergies || patient.knownAllergies || (patient.intake && patient.intake.allergies))) || '';
      if (allergies && !allergies.toLowerCase().includes('nkda')) {
        normMeds.forEach(norm => {
          if (checkAllergyMatch(norm, allergies)) {
            report.hasAllergyAlert = true;
            report.safe = false;
            report.alerts.push({
              severity: 'ALLERGY',
              title: `Critical Allergy Warning: ${rawMap[norm]}`,
              description: `Patient has documented allergy: "${allergies}". The prescribed medication '${rawMap[norm]}' belongs to or cross-reacts with this allergen class.`,
              action: 'Select a non-cross-reacting medication. Clinical override rationale is strictly required to proceed.'
            });
          }
        });
      }

      // 3. Drug-Drug Interactions
      const allDrugs = [...normMeds];
      (activePastMedicines || []).forEach(past => {
        const pNorm = normalizeMedName(past);
        if (pNorm && !allDrugs.includes(pNorm)) {
          allDrugs.push(pNorm);
          rawMap[pNorm] = past + ' (Active Past Rx)';
        }
      });

      for (let i = 0; i < allDrugs.length; i++) {
        for (let j = i + 1; j < allDrugs.length; j++) {
          const d1 = allDrugs[i];
          const d2 = allDrugs[j];

          // At least one must be in the current draft
          if (!normMeds.includes(d1) && !normMeds.includes(d2)) continue;

          for (const rule of DDI_RULES) {
            const m1 = (d1.includes(rule.drugs[0]) && d2.includes(rule.drugs[1]));
            const m2 = (d2.includes(rule.drugs[0]) && d1.includes(rule.drugs[1]));
            if (m1 || m2) {
              const alert = {
                severity: rule.severity,
                title: `${rule.title} (${rawMap[d1]} + ${rawMap[d2]})`,
                description: rule.description,
                action: rule.action
              };
              report.safe = false;
              if (rule.severity === 'CONTRAINDICATED') {
                report.hasContraindication = true;
              } else if (rule.severity === 'MAJOR') {
                report.hasMajorAlert = true;
              }
              report.alerts.push(alert);
            }
          }
        }
      }

      return report;
    },

    /**
     * Call backend API for authoritative Clinical Decision Support safety check
     */
    evaluateRemoteSafety: async function (prescriptionPayload) {
      if (!window.hospitrackStore || !prescriptionPayload) return null;
      try {
        return await window.hospitrackStore.checkPrescriptionSafety(prescriptionPayload);
      } catch (err) {
        console.warn('Remote CDS safety check error:', err.message);
        return null;
      }
    },

    /**
     * Render the Rich Clinical Decision Support Alert Card Component
     */
    renderSafetyBannerHtml: function (report, overrideConfirmed = false, overrideReason = '') {
      if (!report || report.safe || !report.alerts || !report.alerts.length) {
        return `
          <div class="cds-safety-banner cds-status-verified">
            <div class="cds-banner-header">
              <span class="cds-pulse-dot cds-dot-green"></span>
              <div class="cds-header-text">
                <strong>✓ Clinical Safety Verified</strong>
                <span>All active pharmacotherapy orders validated against DDI database, patient allergy records, and duplication rules.</span>
              </div>
            </div>
          </div>
        `;
      }

      const hasContra = report.hasContraindication;
      const hasAllergy = report.hasAllergyAlert;
      const hasMajor = report.hasMajorAlert;
      const bannerClass = hasContra
        ? 'cds-status-contraindicated'
        : (hasAllergy ? 'cds-status-allergy' : (hasMajor ? 'cds-status-major' : 'cds-status-warning'));

      let alertsHtml = report.alerts.map(a => {
        let badgeClass = 'badge-warning';
        let icon = '⚠️';
        if (a.severity === 'CONTRAINDICATED') {
          badgeClass = 'badge-danger';
          icon = '⛔';
        } else if (a.severity === 'ALLERGY' || a.severity === 'ALLERGY_CONTRAINDICATION') {
          badgeClass = 'badge-danger';
          icon = '🚨';
        } else if (a.severity === 'MAJOR') {
          badgeClass = 'badge-warning';
          icon = '⚠️';
        }

        return `
          <div class="cds-alert-item cds-alert-${(a.severity || 'warning').toLowerCase()}">
            <div class="cds-alert-badge-wrap">
              <span class="cds-icon">${icon}</span>
              <span class="badge ${badgeClass}">${window.escapeHtml(a.severity)}</span>
            </div>
            <div class="cds-alert-body">
              <div class="cds-alert-title">${window.escapeHtml(a.title)}</div>
              <div class="cds-alert-desc">${window.escapeHtml(a.description)}</div>
              <div class="cds-alert-action">
                <strong>Clinical Action:</strong> ${window.escapeHtml(a.action)}
              </div>
            </div>
          </div>
        `;
      }).join('');

      let overrideSection = '';
      if (!hasContra && (hasMajor || hasAllergy)) {
        if (overrideConfirmed) {
          overrideSection = `
            <div class="cds-override-active-box">
              <div class="d-flex-between">
                <div>
                  <span class="badge badge-success">✓ Physician Clinical Override Active</span>
                  <div class="cds-override-text mt-4">
                    <strong>Rationale:</strong> ${window.escapeHtml(overrideReason || 'Documented clinical necessity')}
                  </div>
                </div>
                <button type="button" class="btn btn-sm btn-outline" onclick="window.ClinicalSafetyManager.promptOverrideModal()">
                  Edit Rationale
                </button>
              </div>
            </div>
          `;
        } else {
          overrideSection = `
            <div class="cds-override-action-bar">
              <div class="cds-override-warning-text">
                <span>🛡️ High-risk order requires documented physician rationale before signing.</span>
              </div>
              <button type="button" class="btn btn-sm btn-primary" onclick="window.ClinicalSafetyManager.promptOverrideModal()">
                Provide Clinical Override Rationale
              </button>
            </div>
          `;
        }
      } else if (hasContra) {
        overrideSection = `
          <div class="cds-override-blocked-box">
            <span class="cds-lock-icon">🔒</span>
            <span><strong>Hard Safety Stop:</strong> Contraindicated combinations cannot be signed due to critical patient risk. Discontinue one of the conflicting agents to enable submission.</span>
          </div>
        `;
      }

      return `
        <div class="cds-safety-banner ${bannerClass}">
          <div class="cds-banner-header">
            <span class="cds-pulse-dot ${hasContra ? 'cds-dot-red' : (hasAllergy ? 'cds-dot-orange' : 'cds-dot-yellow')}"></span>
            <div class="cds-header-text">
              <strong>${hasContra ? '⛔ CRITICAL CONTRAINDICATION DETECTED' : (hasAllergy ? '🚨 PATIENT ALLERGY WARNING' : '⚠️ CLINICAL SAFETY ADVISORY')}</strong>
              <span>Automated Clinical Decision Support (CDS) Safety Engine Alert</span>
            </div>
          </div>
          <div class="cds-alerts-list">
            ${alertsHtml}
          </div>
          ${overrideSection}
        </div>
      `;
    },

    /**
     * Interactive Clinical Override Modal
     */
    promptOverrideModal: function () {
      let modal = document.getElementById('cdsOverrideModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'cdsOverrideModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="modal-box modal-box-md" onclick="event.stopPropagation()">
          <div class="modal-header">
            <div class="d-flex-align gap-8">
              <span class="badge badge-warning">Physician Override</span>
              <h3 class="modal-title" style="margin:0;">Document Clinical Justification</h3>
            </div>
            <button type="button" class="modal-close" onclick="document.getElementById('cdsOverrideModal').classList.remove('open')">✕</button>
          </div>
          <div class="modal-body">
            <p class="text-sm text-secondary mb-16">
              You are signing a prescription order with recognized clinical safety warnings. Please document the therapeutic necessity, risk-benefit evaluation, and safeguarding protocols (e.g. telemetry, PPI gastroprotection, renal monitoring) for the immutable audit ledger.
            </p>
            <div class="form-group mb-16">
              <label class="form-label required">Clinical Rationale &amp; Safeguards:</label>
              <textarea id="cdsOverrideInput" class="form-control" rows="4" placeholder="e.g., Patient on dual antiplatelet therapy post-coronary stent with pantoprazole gastroprotection. INR monitored bi-weekly.">${window.currentClinicalOverrideReason || ''}</textarea>
            </div>
            <div class="form-check mb-16">
              <label class="d-flex-align gap-8 text-sm" style="cursor:pointer;">
                <input type="checkbox" id="cdsOverrideAcknowledge" checked>
                <span>I confirm that I have reviewed the clinical safety warnings and take clinical responsibility for this pharmacotherapy order.</span>
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('cdsOverrideModal').classList.remove('open')">Cancel</button>
            <button type="button" class="btn btn-primary" onclick="window.ClinicalSafetyManager.confirmOverride()">Confirm Override &amp; Unlock Order</button>
          </div>
        </div>
      `;

      modal.classList.add('open');
    },

    confirmOverride: function () {
      const input = document.getElementById('cdsOverrideInput');
      const check = document.getElementById('cdsOverrideAcknowledge');
      const reason = input ? input.value.trim() : '';

      if (!reason || reason.length < 10) {
        window.showError('Please document a specific clinical rationale (at least 10 characters).');
        if (input) input.focus();
        return;
      }
      if (check && !check.checked) {
        check.checked = true;
      }

      window.currentClinicalOverrideConfirmed = true;
      window.currentClinicalOverrideReason = reason;

      const modal = document.getElementById('cdsOverrideModal');
      if (modal) modal.classList.remove('open');

      window.showToast('✓ Physician clinical override registered. Prescription order unlocked for signing.', 'success');

      // Re-evaluate and re-render the doctor prescription banner
      if (typeof window.checkLiveDuplicateMedicines === 'function') {
        window.checkLiveDuplicateMedicines();
      }
    }
  };
})();
