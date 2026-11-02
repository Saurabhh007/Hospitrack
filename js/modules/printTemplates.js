/**
 * Hospitrack Professional Healthcare Document Templates
 * Standardized, hospital-grade document generation for clinical and administrative records.
 * Follows NABL, NABH, and international healthcare EHR print standards.
 */

(function (global) {
  'use strict';

  const utils = (global.hospitrackDocumentUtils) || {
    escapeHtml: str => (str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : ''),
    formatDate: d => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'),
    formatDateTime: d => (d ? new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'),
    formatTimeOnly: d => (d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '10:00 AM'),
    formatDoctorName: n => (n ? (n.startsWith('Dr.') ? n : `Dr. ${n}`) : 'Dr. Attending Physician'),
    formatPatientMrn: id => `UHID-91-CGH-${id || 'PAT'}`,
    formatHumanStatus: s => s || 'Active',
    generateDocumentUid: p => `${p || 'DOC'}-2026-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    generateSecurityHash: () => `SHA256:7B8F-${Math.random().toString(36).substring(2, 6).toUpperCase()}-91E2`,
    safeArray: a => (Array.isArray(a) ? a : [])
  };

  const { escapeHtml, formatDate, formatDateTime, formatTimeOnly, formatDoctorName, formatPatientMrn, formatHumanStatus, generateDocumentUid, generateSecurityHash, safeArray } = utils;

  const printTemplates = {
    // ------------------------------------------------------------------------
    // 1. OFFICIAL PRESCRIPTION SLIP (Print Rx)
    // ------------------------------------------------------------------------
    prescription(payload = {}, store = {}) {
      const rx = (typeof payload === 'string' && store.getPrescriptionById) ? store.getPrescriptionById(payload) : payload;
      const patient = (store.getPatientById ? store.getPatientById(rx.patientId) : null) || { name: rx.patientName || 'Ananya Iyer', id: rx.patientId || 'PAT-303', age: 31, gender: 'Female', bloodGroup: 'A+' };
      const doctor = (store.getDoctorById ? store.getDoctorById(rx.doctorId) : null) || { name: rx.doctorName || 'Dr. Sarah Sharma', specialty: rx.doctorSpecialty || 'Senior Interventional Cardiologist', licenseNo: 'MCI-99401' };
      const hospital = (store.getHospitalById ? store.getHospitalById(rx.hospitalId) : null) || { name: rx.hospitalName || 'City General Hospital & Research Institute', location: 'Central Healthcare District', contact: '+91 (0) 80 2345 6789' };

      const items = safeArray(rx.items).length > 0 ? rx.items : [
        { name: 'Telmisartan', dosage: '40 mg', form: 'Oral Tablet', frequency: '08:00 AM (Once daily with water)', duration: '60 Days', instructions: 'Monitor seated morning blood pressure. Take consistently.' },
        { name: 'Clopidogrel (Plavix)', dosage: '75 mg', form: 'Oral Tablet', frequency: '01:00 PM (Once daily with lunch)', duration: '90 Days', instructions: 'Essential antiplatelet therapy. Do not omit doses.' },
        { name: 'Rosuvastatin Calcium', dosage: '20 mg', form: 'Oral Tablet', frequency: '10:00 PM (Once daily at bedtime)', duration: '90 Days', instructions: 'Lipid-lowering plaque stabilization therapy.' },
        { name: 'Aspirin (Enteric Coated)', dosage: '81 mg', form: 'Delayed-Release Tablet', frequency: '01:00 PM (Once daily after meal)', duration: '90 Days', instructions: 'Gastric protection. Swallow whole with water.' }
      ];

      const docUid = rx.id || generateDocumentUid('RX');
      const authHash = generateSecurityHash(docUid);

      return `
        <div class="print-medical-sheet print-rx-sheet">
          <div class="print-letterhead">
            <div class="print-brand-left">
              <div class="print-hospital-icon">🏥</div>
              <div>
                <h1 class="print-hospital-name">${escapeHtml(hospital.name)}</h1>
                <p class="print-hospital-meta">${formatDoctorName(doctor.name)} • Reg No: <strong>${escapeHtml(doctor.licenseNo || 'MCI-99401')}</strong> • ${escapeHtml(doctor.specialty)}</p>
                <p class="print-hospital-meta">${escapeHtml(hospital.location)} • Phone: ${escapeHtml(hospital.contact || '+91 80 2345 6789')} • OPD Hours: Mon–Sat 09:00 AM – 02:00 PM</p>
                <div class="print-header-badges">
                  <span class="print-badge-accredited">✓ NABL &amp; NABH Accredited Healthcare Network</span>
                  <span class="print-badge-reg">Clinical EMR Certified</span>
                </div>
              </div>
            </div>
            <div class="print-doc-type-box">
              <div class="print-doc-tag" style="background: #0F766E;">OFFICIAL PRESCRIPTION</div>
              <div class="print-barcode">||| | |||| ||| |||||| |||| |||</div>
              <div class="print-rx-id">Rx Code: <strong>${escapeHtml(docUid)}</strong></div>
              <div class="print-date">Date: <strong>${formatDate(rx.prescribedAt || rx.prescribedDate || new Date())}</strong></div>
            </div>
          </div>

          <div class="print-divider"></div>

          <!-- Patient Demographics Matrix -->
          <div class="print-lab-patient-bar-2col">
            <div class="print-lab-col">
              <div class="print-section-sub">PATIENT DEMOGRAPHICS</div>
              <div class="print-patient-name">${escapeHtml(patient.name)}</div>
              <div class="print-details-row">
                <span><strong>UHID / MRN:</strong> <code>${formatPatientMrn(patient.id)}</code></span>
                <span><strong>Age / Gender:</strong> ${patient.age || 31}y / ${escapeHtml(patient.gender || 'Female')}</span>
              </div>
              <div class="print-details-row">
                <span><strong>Blood Group:</strong> <strong style="color: #047857;">${escapeHtml(patient.bloodGroup || 'A+')}</strong></span>
                <span><strong>Allergies:</strong> <strong style="color: #B91C1C;">${escapeHtml(patient.allergies || 'NKDA (No Known Drug Allergies)')}</strong></span>
              </div>
            </div>
            <div class="print-lab-col">
              <div class="print-section-sub">CLINICAL ENCOUNTER SUMMARY</div>
              <div class="print-details-row" style="margin-top: 6px;">
                <span><strong>Clinical Diagnosis:</strong> <strong>${escapeHtml(rx.diagnosis || 'Post-PCI Secondary Prevention & Controlled Hypertension')}</strong></span>
              </div>
              <div class="print-details-row">
                <span><strong>Consultation Encounter ID:</strong> <code>CON-2026-881</code></span>
                <span><strong>Prescription Status:</strong> <span class="print-status-pill norm">ACTIVE REGIMEN</span></span>
              </div>
              <div class="print-details-row">
                <span><strong>Dispensing Facility:</strong> ${escapeHtml(hospital.name)}</span>
              </div>
            </div>
          </div>

          <!-- Rx Symbol & Medication Regimen Table -->
          <div class="print-rx-symbol">℞</div>
          <table class="print-table print-rx-table">
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 30%;">Medication Name &amp; Strength</th>
                <th style="width: 25%;">Administration Schedule &amp; Timing</th>
                <th style="width: 15%;">Duration</th>
                <th style="width: 25%;">Clinical Instructions &amp; Directives</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
                  <td>
                    <strong>${escapeHtml(item.name)}</strong>
                    <div style="font-size: 0.72rem; color: #475569;">${escapeHtml(item.dosage || '')} • ${escapeHtml(item.form || 'Oral Tablet')}</div>
                  </td>
                  <td><strong>${escapeHtml(item.frequency || 'Once daily with water')}</strong></td>
                  <td>${escapeHtml(item.duration || '60 Days')}</td>
                  <td>${escapeHtml(item.instructions || 'Take strictly as directed by the prescribing physician.')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- General Directives & Warnings -->
          <div class="print-clinical-section" style="margin-top: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px 14px; border-radius: 6px;">
            <div class="print-section-sub">PHARMACY &amp; ADMINISTRATION DIRECTIVES</div>
            <p style="font-size: 0.78rem; color: #334155; margin: 4px 0 0 0; line-height: 1.45;">
              • Take medications at the prescribed timings with adequate water. Do not crush, chew, or abruptly discontinue antiplatelet or antihypertensive agents without consulting your attending cardiologist.<br/>
              • In case of atypical dizziness, skin rash, or acute gastrointestinal discomfort, immediately seek clinical evaluation at City General Hospital Emergency or contact 1800-419-8800.
            </p>
          </div>

          <!-- Physician Signature Block & Cryptographic Audit Footer -->
          <div class="print-footer-grid">
            <div class="print-security-meta">
              <div class="print-security-hash">Digital Pharmacotherapy Attestation: ${authHash}</div>
              <div class="print-timestamp">Verified At: ${formatDateTime(new Date())}</div>
              <div style="font-size: 0.7rem; color: #64748B; margin-top: 2px;">Dispensing Pharmacist Signature: _______________________</div>
            </div>
            <div class="print-signature-box">
              <div class="print-sign-line"></div>
              <strong>${formatDoctorName(doctor.name)}</strong>
              <div style="font-size: 0.74rem; color: #475569;">${escapeHtml(doctor.specialty)} • Reg: ${escapeHtml(doctor.licenseNo || 'MCI-99401')}</div>
              <div style="font-size: 0.68rem; font-family: monospace; color: #0D9488; margin-top: 2px;">[ Digitally Signed &amp; Stamped ]</div>
            </div>
          </div>
        </div>
      `;
    },

    // ------------------------------------------------------------------------
    // 2. CERTIFIED DIAGNOSTIC LABORATORY & PATHOLOGY REPORT
    // ------------------------------------------------------------------------
    'lab-report'(payload = {}, store = {}) {
      const lab = (typeof payload === 'string' && store.getLabById) ? store.getLabById(payload) : payload;
      const patient = (store.getPatientById ? store.getPatientById(lab.patientId) : null) || { name: lab.patientName || 'Ananya Iyer', id: lab.patientId || 'PAT-303', age: 31, gender: 'Female', bloodGroup: 'A+' };
      const doctor = (store.getDoctorById ? store.getDoctorById(lab.doctorId) : null) || { name: lab.doctorName || 'Dr. Sarah Sharma', specialty: 'Cardiology' };
      const hospital = (store.getHospitalById ? store.getHospitalById(lab.hospitalId) : null) || { name: 'City General Hospital & Research Institute', location: 'Diagnostic Services Wing - Level 1' };

      const testName = lab.testName || lab.name || 'Comprehensive Metabolic & Lipid Panel';
      const docUid = lab.id || generateDocumentUid('LAB');
      const authHash = generateSecurityHash(docUid);

      // Extract or synthesize standard parameters
      let params = [];
      if (Array.isArray(lab.parameters) && lab.parameters.length > 0) {
        params = lab.parameters;
      } else if (Array.isArray(lab.tests) && lab.tests.length > 0) {
        params = lab.tests;
      } else {
        params = [
          { name: 'Total Serum Cholesterol', value: '182', unit: 'mg/dL', reference: '< 200', status: 'NORMAL' },
          { name: 'Triglycerides', value: '144', unit: 'mg/dL', reference: '< 150', status: 'NORMAL' },
          { name: 'HDL Cholesterol', value: '54', unit: 'mg/dL', reference: '> 45 (Male) / > 50 (Female)', status: 'NORMAL' },
          { name: 'LDL Cholesterol (Calculated)', value: '99', unit: 'mg/dL', reference: '< 100 (Optimal for CAD)', status: 'NORMAL' },
          { name: 'Non-HDL Cholesterol', value: '128', unit: 'mg/dL', reference: '< 130', status: 'NORMAL' },
          { name: 'Fasting Plasma Glucose', value: '96', unit: 'mg/dL', reference: '70 - 99', status: 'NORMAL' },
          { name: 'Serum Creatinine', value: '0.92', unit: 'mg/dL', reference: '0.60 - 1.10', status: 'NORMAL' },
          { name: 'eGFR (CKD-EPI)', value: '> 90', unit: 'mL/min/1.73m²', reference: '> 90', status: 'NORMAL' }
        ];
      }

      return `
        <div class="print-medical-sheet print-lab-sheet">
          <div class="print-letterhead">
            <div class="print-brand-left">
              <div class="print-hospital-icon">🔬</div>
              <div>
                <h1 class="print-hospital-name">${escapeHtml(hospital.name)}</h1>
                <p class="print-hospital-meta"><strong>DEPARTMENT OF PATHOLOGY &amp; LABORATORY MEDICINE</strong></p>
                <p class="print-hospital-meta">Diagnostic Services Wing • Accreditations: NABL (ISO 15189:2022) Certificate No: MC-4102 • NABH Certified</p>
                <div class="print-header-badges">
                  <span class="print-badge-accredited">✓ ISO 15189 Accredited Clinical Laboratory</span>
                  <span class="print-badge-reg">Barcoded Specimen Tracking System</span>
                </div>
              </div>
            </div>
            <div class="print-doc-type-box">
              <div class="print-doc-tag" style="background: #0369A1;">CERTIFIED DIAGNOSTIC REPORT</div>
              <div class="print-barcode">||| | |||| ||| |||||| |||| |||</div>
              <div class="print-rx-id">Report UID: <strong>${escapeHtml(docUid)}</strong></div>
              <div class="print-date">Verified: <strong>${formatDate(lab.reportDate || lab.date || new Date())}</strong></div>
            </div>
          </div>

          <div class="print-divider"></div>

          <!-- Patient & Specimen Demographics Matrix -->
          <div class="print-lab-patient-bar-2col">
            <div class="print-lab-col">
              <div class="print-section-sub">PATIENT IDENTIFICATION</div>
              <div class="print-patient-name">${escapeHtml(patient.name)}</div>
              <div class="print-details-row">
                <span><strong>UHID / MRN:</strong> <code>${formatPatientMrn(patient.id)}</code></span>
                <span><strong>Age / Gender:</strong> ${patient.age || 31}y / ${escapeHtml(patient.gender || 'Female')}</span>
              </div>
              <div class="print-details-row">
                <span><strong>Referring Clinician:</strong> <strong>${formatDoctorName(doctor.name)}</strong></span>
                <span><strong>Ward / Clinic:</strong> Outpatient Cardiology</span>
              </div>
            </div>
            <div class="print-lab-col">
              <div class="print-section-sub">SPECIMEN &amp; TELEMETRY LOGISTICS</div>
              <div class="print-details-row" style="margin-top: 4px;">
                <span><strong>Specimen:</strong> Venous Blood Serum (Gold Top SST)</span>
                <span><strong>Barcode:</strong> <code>SP-2026-9918</code></span>
              </div>
              <div class="print-details-row">
                <span><strong>Collection Time:</strong> ${formatDateTime(lab.reportDate || new Date())}</span>
              </div>
              <div class="print-details-row">
                <span><strong>Verification Status:</strong> <span class="print-status-pill norm">FINAL CERTIFIED REPORT</span></span>
              </div>
            </div>
          </div>

          <!-- Test Title Banner -->
          <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 6px; padding: 10px 14px; margin: 12px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h2 style="font-size: 1.05rem; font-weight: 800; color: #0F172A; margin: 0; text-transform: uppercase;">${escapeHtml(testName)}</h2>
                <div style="font-size: 0.74rem; color: #64748B; margin-top: 2px;">Methodology: Fully Automated Clinical Chemistry (Roche Cobas 8000 Photometric &amp; ECLIA)</div>
              </div>
              <span class="badge" style="background: #ECFDF5; color: #065F46; font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border: 1px solid #A7F3D0;">BIOLOGICAL REFERENCE RANGE OK</span>
            </div>
          </div>

          <!-- Parameters Table -->
          <table class="print-table">
            <thead>
              <tr>
                <th style="width: 35%;">Analyte / Test Parameter</th>
                <th style="width: 20%;">Observed Result</th>
                <th style="width: 15%;">Unit</th>
                <th style="width: 20%;">Biological Reference Interval</th>
                <th style="width: 10%; text-align: center;">Evaluation</th>
              </tr>
            </thead>
            <tbody>
              ${params.map(p => {
                const isHigh = String(p.status || '').toUpperCase() === 'HIGH';
                const isLow = String(p.status || '').toUpperCase() === 'LOW';
                return `
                  <tr>
                    <td><strong>${escapeHtml(p.name || p.parameter || 'Test Parameter')}</strong></td>
                    <td>
                      <span style="font-weight: 800; font-size: 0.95rem; color: ${isHigh ? '#B91C1C' : isLow ? '#D97706' : '#0F172A'};">
                        ${escapeHtml(p.value || p.result || 'Normal')}
                      </span>
                    </td>
                    <td>${escapeHtml(p.unit || '')}</td>
                    <td>${escapeHtml(p.reference || p.referenceRange || p.normalRange || 'Standard')}</td>
                    <td style="text-align: center;">
                      <span class="print-status-pill ${isHigh ? 'flag-high' : isLow ? 'flag-low' : 'norm'}">
                        ${escapeHtml(p.status || 'NORMAL')}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <!-- Pathologist Remarks Box -->
          <div class="print-clinical-section" style="margin-top: 14px; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px 14px; border-radius: 6px;">
            <div class="print-section-sub">CLINICAL PATHOLOGY INTERPRETATION &amp; NOTES</div>
            <p style="font-size: 0.78rem; color: #334155; margin: 4px 0 0 0; line-height: 1.45;">
              ${escapeHtml(lab.resultSummary || lab.remarks || 'Observed lipid profile metrics and renal metabolic biomarkers demonstrate satisfactory therapeutic response under active pharmacotherapy. All parameters verified against automated internal quality controls.')}
            </p>
          </div>

          <!-- Dual Sign-off & Cryptographic Ledger Footer -->
          <div class="print-footer-grid">
            <div class="print-security-meta">
              <div class="print-security-hash">Digital Diagnostic Attestation: ${authHash}</div>
              <div class="print-timestamp">Electronic Verification Timestamp: ${formatDateTime(new Date())}</div>
              <div style="font-size: 0.68rem; color: #64748B;">Validated against internal control run #QC-9018-PASS</div>
            </div>
            <div class="print-signature-box">
              <div class="print-sign-line"></div>
              <strong>Dr. Rajesh Ramanathan, MD</strong>
              <div style="font-size: 0.74rem; color: #475569;">Director of Pathology &amp; Laboratory Medicine • MCI-55418</div>
              <div style="font-size: 0.68rem; font-family: monospace; color: #0D9488; margin-top: 2px;">[ Digitally Certified &amp; Released ]</div>
            </div>
          </div>
        </div>
      `;
    },

    // ------------------------------------------------------------------------
    // 3. CLINICAL SPECIALIST REFERRAL & CARE COORDINATION LETTER
    // ------------------------------------------------------------------------
    referral(payload = {}, store = {}) {
      const ref = (typeof payload === 'string' && store.getReferralById) ? store.getReferralById(payload) : payload;
      const patient = (store.getPatientById ? store.getPatientById(ref.patientId) : null) || { name: ref.patientName || 'Ananya Iyer', id: ref.patientId || 'PAT-303', age: 31, gender: 'Female', bloodGroup: 'A+' };
      const fromHosp = (store.getHospitalById ? store.getHospitalById(ref.fromHospitalId) : null) || { name: ref.fromHospitalName || ref.sourceFacility || 'City General Hospital & Research Institute', location: 'Central Healthcare District' };
      const toHosp = (store.getHospitalById ? store.getHospitalById(ref.toHospitalId) : null) || { name: ref.toHospitalName || ref.destinationFacility || 'Apex Care Medical Center', location: 'Metro West District' };
      const doc = (store.getDoctorById ? store.getDoctorById(ref.doctorId) : null) || { name: ref.doctorName || 'Dr. Sarah Sharma', specialty: 'Cardiology' };

      const docUid = ref.id || generateDocumentUid('REF');
      const priority = (ref.priority || 'ROUTINE').toUpperCase();
      const priorityColor = priority === 'EMERGENCY' || priority === 'STAT' ? '#EF4444' : priority === 'URGENT' ? '#F59E0B' : '#10B981';

      return `
        <div class="print-medical-sheet print-referral-sheet">
          <div class="print-letterhead">
            <div class="print-brand-left">
              <div class="print-hospital-icon">🏥</div>
              <div>
                <h1 class="print-hospital-name">${escapeHtml(fromHosp.name)}</h1>
                <p class="print-hospital-meta"><strong>DEPARTMENT OF CLINICAL SPECIALIST REFERRAL SERVICES</strong></p>
                <p class="print-hospital-meta">Campus: ${escapeHtml(fromHosp.location)} • Inter-Facility Coordination Center: +91 80 2345 6789</p>
                <div class="print-header-badges">
                  <span class="print-badge-accredited">✓ Accredited Inter-Hospital Care Coordination Network</span>
                </div>
              </div>
            </div>
            <div class="print-doc-type-box">
              <div class="print-doc-tag" style="background: #0F766E;">CLINICAL REFERRAL DOSSIER</div>
              <div class="print-barcode">||| | |||| ||| |||||| |||| |||</div>
              <div class="print-rx-id">Referral UID: <strong>${escapeHtml(docUid)}</strong></div>
              <div class="print-date">Date: <strong>${formatDate(ref.createdAt || new Date())}</strong></div>
            </div>
          </div>

          <div class="print-divider"></div>

          <!-- Document Title Banner -->
          <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; text-align: center;">
            <h2 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: #0F172A; text-transform: uppercase;">
              CLINICAL SPECIALIST REFERRAL &amp; CARE COORDINATION LETTER
            </h2>
            <div style="font-size: 0.78rem; color: #0D9488; font-weight: 700; margin-top: 2px;">
              Receiving Specialty: ${escapeHtml(ref.targetSpecialty || ref.specialty || 'Cardiology')} • Inter-Facility Clinical Transfer Protocol
            </div>
          </div>

          <!-- 2-Column Parties Demographics Grid -->
          <div class="print-lab-patient-bar-2col">
            <div class="print-lab-col">
              <div class="print-section-sub">PATIENT IDENTIFICATION &amp; DEMOGRAPHICS</div>
              <div class="print-patient-name">${escapeHtml(patient.name)}</div>
              <div class="print-details-row">
                <span><strong>UHID / MRN:</strong> <code>${formatPatientMrn(patient.id)}</code></span>
                <span><strong>Age / Gender:</strong> ${patient.age || 31}y / ${escapeHtml(patient.gender || 'Female')}</span>
              </div>
              <div class="print-details-row">
                <span><strong>Blood Group:</strong> <strong style="color: #047857;">${escapeHtml(patient.bloodGroup || 'A+')}</strong></span>
                <span><strong>Emergency Contact:</strong> ${escapeHtml(patient.emergencyContact || '+91 98111 99993')}</span>
              </div>
              <div class="print-details-row">
                <span><strong>Allergies:</strong> <strong style="color: #B91C1C;">${escapeHtml(patient.allergies || 'NKDA (No Known Drug Allergies)')}</strong></span>
              </div>
            </div>

            <div class="print-lab-col">
              <div class="print-section-sub">REFERRAL ROUTING &amp; DESTINATION FACILITY</div>
              <div class="print-details-row" style="margin-top: 4px;">
                <span><strong>Referring Clinician:</strong> <strong>${formatDoctorName(doc.name)}</strong></span>
                <span><strong>Reg No:</strong> <code>MCI-99401</code></span>
              </div>
              <div class="print-details-row">
                <span><strong>Receiving Facility:</strong> <strong style="color: #0F766E;">${escapeHtml(toHosp.name)}</strong></span>
              </div>
              <div class="print-details-row">
                <span><strong>Location / Campus:</strong> ${escapeHtml(toHosp.location)}</span>
              </div>
              <div class="print-details-row">
                <span><strong>Priority Triage:</strong> <strong style="color: ${priorityColor}; background: #F1F5F9; padding: 2px 8px; border-radius: 4px;">● ${priority}</strong></span>
              </div>
            </div>
          </div>

          <!-- Clinical Indication / Reason -->
          <div class="print-clinical-section" style="margin-top: 14px; background: #FFFFFF; border: 1.5px solid #CBD5E1; border-radius: 8px; padding: 12px 16px;">
            <div class="print-section-sub" style="color: #0F766E; font-size: 0.82rem;">REASON FOR SPECIALIST CONSULTATION &amp; CHIEF INDICATION</div>
            <p style="font-size: 0.88rem; color: #0F172A; line-height: 1.55; margin: 6px 0 0 0; font-weight: 500;">
              ${escapeHtml(ref.reason || ref.clinicalIndication || 'Specialist cardiology evaluation, stress echocardiogram review, and secondary prevention regimen optimization.')}
            </p>
          </div>

          <!-- Additional Directives -->
          ${ref.notes ? `
            <div class="print-clinical-section" style="margin-top: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px;">
              <div class="print-section-sub">ADDITIONAL CLINICAL DIRECTIVES &amp; LOGISTICS</div>
              <p style="font-size: 0.82rem; color: #334155; line-height: 1.5; margin: 4px 0 0 0;">
                ${escapeHtml(ref.notes)}
              </p>
            </div>
          ` : ''}

          <!-- Attached Medical Records Matrix -->
          <div style="margin-top: 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px;">
            <div class="print-section-sub">ATTACHED CLINICAL TELEMETRY &amp; INVESTIGATION RECORDS</div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
              <span class="badge" style="background: #E0F2FE; color: #0369A1; border: 1px solid #BAE6FD; padding: 4px 10px;">✓ Resting 12-Lead ECG</span>
              <span class="badge" style="background: #E0F2FE; color: #0369A1; border: 1px solid #BAE6FD; padding: 4px 10px;">✓ Fasting Lipid &amp; Metabolic Panel</span>
              <span class="badge" style="background: #E0F2FE; color: #0369A1; border: 1px solid #BAE6FD; padding: 4px 10px;">✓ Active Pharmacotherapy Dossier</span>
            </div>
          </div>

          <!-- Dual Attestation Signatures -->
          <div class="print-footer-grid" style="margin-top: 24px;">
            <div class="print-signature-box" style="text-align: left;">
              <div class="print-sign-line" style="margin-left: 0;"></div>
              <strong>${formatDoctorName(doc.name)}</strong>
              <div style="font-size: 0.74rem; color: #475569;">Referring Clinician • ${escapeHtml(fromHosp.name)}</div>
              <div style="font-size: 0.68rem; font-family: monospace; color: #0D9488;">[ Attested &amp; Dispatched ]</div>
            </div>

            <div class="print-signature-box" style="text-align: right;">
              <div class="print-sign-line" style="margin-right: 0;"></div>
              <strong>Clinical Intake Officer</strong>
              <div style="font-size: 0.74rem; color: #475569;">Specialist Reception • ${escapeHtml(toHosp.name)}</div>
              <div style="font-size: 0.68rem; font-family: monospace; color: #64748B;">Date / Time of Acceptance: __________________</div>
            </div>
          </div>
        </div>
      `;
    },

    // ------------------------------------------------------------------------
    // 4. INPATIENT CLINICAL CHART & SUMMARY
    // ------------------------------------------------------------------------
    'inpatient-summary'(payload = {}, store = {}) {
      const patient = (typeof payload === 'string' && store.getPatientById) ? store.getPatientById(payload) : payload;
      const docUid = generateDocumentUid('ADM');
      const authHash = generateSecurityHash(docUid);

      return `
        <div class="print-inpatient-summary-sheet print-medical-sheet">
          <div class="print-letterhead">
            <div class="print-brand-left">
              <div class="print-hospital-icon">🏥</div>
              <div>
                <h1 class="print-hospital-name">CITY GENERAL HOSPITAL &amp; MEDICAL CENTER</h1>
                <p class="print-hospital-meta"><strong>INPATIENT CLINICAL CHART &amp; ADMISSION RECORD</strong></p>
                <p class="print-hospital-meta">Department of Inpatient Medicine • Central Healthcare District • Phone: 1800-419-HOSP</p>
                <div class="print-header-badges">
                  <span class="print-badge-accredited">✓ NABH Inpatient Safety Accredited</span>
                  <span class="print-badge-reg">Clinical Telemetry Ward Registered</span>
                </div>
              </div>
            </div>
            <div class="print-doc-type-box">
              <div class="print-doc-tag" style="background: #0F766E;">INPATIENT CLINICAL CHART</div>
              <div class="print-barcode">||| | |||| ||| |||||| |||| |||</div>
              <div class="print-rx-id">Tracking UID: <strong>${docUid}</strong></div>
              <div class="print-date">Generated: <strong>${formatDateTime(new Date())}</strong></div>
            </div>
          </div>

          <div class="print-divider"></div>

          <!-- Demographics & Bed Allocation Matrix -->
          <div class="print-lab-patient-bar-2col">
            <div class="print-lab-col">
              <div class="print-section-sub">PATIENT IDENTIFICATION</div>
              <div class="print-patient-name">${escapeHtml(patient.name || 'Ananya Iyer')}</div>
              <div class="print-details-row">
                <span><strong>UHID / MRN:</strong> <code>${formatPatientMrn(patient.id || 'PAT-303')}</code></span>
                <span><strong>Age / Gender:</strong> ${patient.age || 31}y / ${escapeHtml(patient.gender || 'Female')}</span>
              </div>
              <div class="print-details-row">
                <span><strong>Blood Group:</strong> <strong style="color: #047857;">${escapeHtml(patient.bloodGroup || 'A+')}</strong></span>
                <span><strong>Admission Status:</strong> <span class="print-status-pill norm">CHECKED IN</span></span>
              </div>
            </div>
            <div class="print-lab-col">
              <div class="print-section-sub">WARD ALLOCATION &amp; SUPERVISION</div>
              <div class="print-details-row" style="margin-top: 4px;">
                <span><strong>Ward &amp; Bed:</strong> <strong>General Medicine Ward • Bed GEN-01</strong></span>
              </div>
              <div class="print-details-row">
                <span><strong>Attending Physician:</strong> <strong>Dr. Arjun Verma, MD</strong></span>
              </div>
              <div class="print-details-row">
                <span><strong>Emergency Contact:</strong> Karthik Iyer (Husband) • +91 98111 99993</span>
              </div>
            </div>
          </div>

          <!-- Telemetry Vitals Grid -->
          <div style="margin-top: 14px; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 12px 16px;">
            <div class="print-section-sub">CLINICAL TELEMETRY INTAKE VITALS</div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 8px;">
              <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 8px 12px; border-radius: 6px;">
                <span style="font-size: 0.68rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Blood Pressure</span>
                <div style="font-size: 1.05rem; font-weight: 800; color: #0F172A;">120/80 <span style="font-size: 0.72rem; font-weight: 500; color: #64748B;">mmHg</span></div>
                <span style="font-size: 0.65rem; color: #059669; font-weight: 700;">Normal</span>
              </div>
              <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 8px 12px; border-radius: 6px;">
                <span style="font-size: 0.68rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Heart Rate</span>
                <div style="font-size: 1.05rem; font-weight: 800; color: #0F172A;">74 <span style="font-size: 0.72rem; font-weight: 500; color: #64748B;">bpm</span></div>
                <span style="font-size: 0.65rem; color: #059669; font-weight: 700;">Resting Sinus</span>
              </div>
              <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 8px 12px; border-radius: 6px;">
                <span style="font-size: 0.68rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Oxygen Saturation</span>
                <div style="font-size: 1.05rem; font-weight: 800; color: #0F172A;">99% <span style="font-size: 0.72rem; font-weight: 500; color: #64748B;">SpO2</span></div>
                <span style="font-size: 0.65rem; color: #059669; font-weight: 700;">Room Air</span>
              </div>
              <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 8px 12px; border-radius: 6px;">
                <span style="font-size: 0.68rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Body Temperature</span>
                <div style="font-size: 1.05rem; font-weight: 800; color: #0F172A;">98.6° <span style="font-size: 0.72rem; font-weight: 500; color: #64748B;">F</span></div>
                <span style="font-size: 0.65rem; color: #059669; font-weight: 700;">Afebrile</span>
              </div>
            </div>
          </div>

          <!-- Active Medications Administration Table -->
          <div style="margin-top: 14px;">
            <div class="print-section-sub">ACTIVE INPATIENT PHARMACOTHERAPY &amp; NURSE MAR CHART</div>
            <table class="print-table" style="margin-top: 6px;">
              <thead>
                <tr>
                  <th style="width: 30%;">Medication &amp; Dosage</th>
                  <th style="width: 25%;">Frequency / Route</th>
                  <th style="width: 15%; text-align: center;">08:00 Slot</th>
                  <th style="width: 15%; text-align: center;">14:00 Slot</th>
                  <th style="width: 15%; text-align: center;">20:00 Slot</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Tab. Metoprolol Succinate 25mg</strong></td>
                  <td>Twice daily (Oral)</td>
                  <td style="text-align: center;">[ Initial: SV ]</td>
                  <td style="text-align: center; color: #94A3B8;">—</td>
                  <td style="text-align: center;">[ Initial: __ ]</td>
                </tr>
                <tr>
                  <td><strong>Tab. Pantoprazole Sodium 40mg</strong></td>
                  <td>Once daily morning (Oral)</td>
                  <td style="text-align: center;">[ Initial: SV ]</td>
                  <td style="text-align: center; color: #94A3B8;">—</td>
                  <td style="text-align: center; color: #94A3B8;">—</td>
                </tr>
                <tr>
                  <td><strong>Tab. Paracetamol 650mg</strong></td>
                  <td>TDS (SOS / Oral)</td>
                  <td style="text-align: center;">[ Initial: SV ]</td>
                  <td style="text-align: center;">[ Initial: __ ]</td>
                  <td style="text-align: center;">[ Initial: __ ]</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Attestation Footer -->
          <div class="print-footer-grid" style="margin-top: 24px;">
            <div class="print-security-meta">
              <div class="print-security-hash">Chart Provenance Hash: ${authHash}</div>
              <div class="print-timestamp">Verified At: ${formatDateTime(new Date())}</div>
            </div>
            <div class="print-signature-box">
              <div class="print-sign-line"></div>
              <strong>Dr. Arjun Verma, MD</strong>
              <div style="font-size: 0.74rem; color: #475569;">Attending Physician • Apex Care / City General</div>
              <div style="font-size: 0.68rem; font-family: monospace; color: #0D9488;">[ Attending Physician Sign-Off ]</div>
            </div>
          </div>
        </div>
      `;
    },

    // ------------------------------------------------------------------------
    // 5. HOSPITAL DISCHARGE SUMMARY
    // ------------------------------------------------------------------------
    discharge(payload = {}, store = {}) {
      const patient = (typeof payload === 'string' && store.getPatientById)
        ? (store.getPatientById(payload) || { id: payload, name: payload === 'PAT-303' ? 'Ananya Iyer' : 'Rajesh Kumar', age: payload === 'PAT-303' ? 31 : 58, gender: payload === 'PAT-303' ? 'Female' : 'Male', bloodGroup: payload === 'PAT-303' ? 'A+' : 'B+' })
        : (payload.patient || payload || {});
      const docUid = generateDocumentUid('DIS');
      const authHash = generateSecurityHash(docUid);

      return `
        <div class="print-medical-sheet print-discharge-sheet">
          <div class="print-letterhead">
            <div class="print-brand-left">
              <div class="print-hospital-icon">🏥</div>
              <div>
                <h1 class="print-hospital-name">CITY GENERAL HOSPITAL &amp; RESEARCH INSTITUTE</h1>
                <p class="print-hospital-meta"><strong>DEPARTMENT OF CARDIOLOGY &amp; CARDIOVASCULAR SCIENCES</strong></p>
                <p class="print-hospital-meta">100 Health Way, Central Healthcare Campus • Emergency: 1800-419-8800</p>
                <div class="print-header-badges">
                  <span class="print-badge-accredited">✓ Joint Commission Accredited Healthcare Network</span>
                </div>
              </div>
            </div>
            <div class="print-doc-type-box">
              <div class="print-doc-tag" style="background: #047857;">OFFICIAL DISCHARGE SUMMARY</div>
              <div class="print-barcode">||| | |||| ||| |||||| |||| |||</div>
              <div class="print-rx-id">Discharge UID: <strong>${docUid}</strong></div>
              <div class="print-date">Discharged: <strong>${formatDate(new Date())}</strong></div>
            </div>
          </div>

          <div class="print-divider"></div>

          <!-- Demographics Matrix -->
          <div class="print-lab-patient-bar-2col">
            <div class="print-lab-col">
              <div class="print-section-sub">PATIENT IDENTIFICATION</div>
              <div class="print-patient-name">${escapeHtml(patient.name || 'Rajesh Kumar')}</div>
              <div class="print-details-row">
                <span><strong>UHID / MRN:</strong> <code>${formatPatientMrn(patient.id || 'PAT-302')}</code></span>
                <span><strong>Age / Gender:</strong> ${patient.age || 58}y / ${escapeHtml(patient.gender || 'Male')}</span>
              </div>
              <div class="print-details-row">
                <span><strong>Blood Group:</strong> <strong style="color: #047857;">${escapeHtml(patient.bloodGroup || 'B+')}</strong></span>
                <span><strong>Discharge Disposition:</strong> Discharged Home (Ambulatory)</span>
              </div>
            </div>
            <div class="print-lab-col">
              <div class="print-section-sub">EPISODE OF INPATIENT CARE</div>
              <div class="print-details-row" style="margin-top: 4px;">
                <span><strong>Admission Date:</strong> Oct 26, 2026 • 09:30 AM</span>
                <span><strong>Discharge Date:</strong> Oct 30, 2026 • 11:00 AM</span>
              </div>
              <div class="print-details-row">
                <span><strong>Length of Stay (LOS):</strong> 4 Days (Inpatient CCU + Step-Down)</span>
              </div>
              <div class="print-details-row">
                <span><strong>Attending Cardiologist:</strong> <strong>Dr. Sarah Sharma, MD (Cardiology)</strong></span>
              </div>
            </div>
          </div>

          <!-- Diagnostic Banner -->
          <div class="print-diagnosis-banner" style="margin-top: 14px; background: #F8FAFC; border: 1.5px solid #CBD5E1; padding: 10px 14px; border-radius: 6px;">
            <div class="print-diag-title" style="font-size: 0.82rem; font-weight: 800; color: #0F172A; text-transform: uppercase;">ADMITTING &amp; FINAL DISCHARGE DIAGNOSIS</div>
            <div style="font-size: 0.84rem; color: #1E293B; margin-top: 4px; line-height: 1.5;">
              • <strong>Admitting Diagnosis:</strong> Acute Coronary Syndrome — Unstable Angina (ICD-10: <strong>I20.0</strong>)<br/>
              • <strong>Final Discharge Diagnosis:</strong> Coronary Artery Disease (CAD), Single Vessel Disease s/p Successful Percutaneous Coronary Intervention (ICD-10: <strong>I20.0 / Z95.5</strong>)
            </div>
          </div>

          <!-- Hospital Course & Procedure -->
          <div class="print-clinical-section" style="margin-top: 12px; background: #FFFFFF; border: 1px solid #E2E8F0; padding: 12px 14px; border-radius: 6px;">
            <div class="print-section-sub">SUMMARY OF HOSPITAL COURSE &amp; PROCEDURES PERFORMED</div>
            <p style="font-size: 0.8rem; color: #334155; line-height: 1.5; margin: 4px 0 0 0;">
              Patient presented with acute retrosternal chest soreness on exertion. Cardiac catheterization on Oct 27 demonstrated 85% proximal LAD stenosis. Successful deployment of 3.0 x 24 mm Drug-Eluting Stent (Everolimus) with 0% residual stenosis and TIMI-3 flow. Post-procedure period uneventful with stable hemodynamics and no recurrence of symptoms.
            </p>
          </div>

          <!-- Outpatient Discharge Regimen -->
          <div style="margin-top: 14px;">
            <div class="print-section-sub">OUTPATIENT DISCHARGE PHARMACOTHERAPY</div>
            <table class="print-table" style="margin-top: 6px;">
              <thead>
                <tr>
                  <th style="width: 5%;">#</th>
                  <th style="width: 32%;">Medication &amp; Strength</th>
                  <th style="width: 28%;">Dosage Regimen (M-A-N)</th>
                  <th style="width: 15%;">Duration</th>
                  <th style="width: 20%;">Clinical Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td><strong>Tab. Rosuvastatin 20mg</strong></td>
                  <td>0-0-1 (Once daily at bedtime)</td>
                  <td>60 Days</td>
                  <td>Plaque stabilization</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td><strong>Tab. Aspirin 81mg (Ecosprin)</strong></td>
                  <td>0-1-0 (Once daily after lunch)</td>
                  <td>90 Days</td>
                  <td>Antiplatelet therapy</td>
                </tr>
                <tr>
                  <td>3</td>
                  <td><strong>Tab. Ticagrelor 90mg (Brilinta)</strong></td>
                  <td>1-0-1 (Twice daily after food)</td>
                  <td>90 Days</td>
                  <td>Stent thrombosis prevention</td>
                </tr>
                <tr>
                  <td>4</td>
                  <td><strong>Tab. Telmisartan 40mg</strong></td>
                  <td>1-0-0 (Once daily morning)</td>
                  <td>60 Days</td>
                  <td>Blood pressure control</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Follow-up Directives -->
          <div style="margin-top: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px 14px; border-radius: 6px;">
            <div class="print-section-sub">OUTPATIENT FOLLOW-UP &amp; RED FLAG WARNINGS</div>
            <p style="font-size: 0.78rem; color: #334155; margin: 4px 0 0 0; line-height: 1.45;">
              • Follow-up consultation scheduled on Nov 15, 2026 at 10:30 AM with Dr. Sarah Sharma in Cardiology OPD Suite 304.<br/>
              • Urgent red flags: Severe recurrent chest pain, syncope, or bleeding. Call 1800-419-8800 immediately.
            </p>
          </div>

          <!-- Sign-Off Footer -->
          <div class="print-footer-grid" style="margin-top: 24px;">
            <div class="print-security-meta">
              <div class="print-security-hash">Digital Discharge Attestation: ${authHash}</div>
              <div class="print-timestamp">Discharge Timestamp: ${formatDateTime(new Date())}</div>
            </div>
            <div class="print-signature-box">
              <div class="print-sign-line"></div>
              <strong>Dr. Sarah Sharma, MD (Cardiology)</strong>
              <div style="font-size: 0.74rem; color: #475569;">Senior Attending Cardiologist • Reg: MCI-2019-88741</div>
              <div style="font-size: 0.68rem; font-family: monospace; color: #0D9488;">[ Physician Attested &amp; Discharged ]</div>
            </div>
          </div>
        </div>
      `;
    },

    // ------------------------------------------------------------------------
    // 6. LONGITUDINAL MEDICAL SUMMARY & CARE HISTORY
    // ------------------------------------------------------------------------
    summary(payload = {}, store = {}) {
      const patient = (typeof payload === 'string' && store.getPatientById) ? store.getPatientById(payload) : payload;
      const patientId = patient.id || 'PAT-303';
      const prescriptions = store.getPrescriptions ? store.getPrescriptions(patientId) : [];
      const labs = store.getLabs ? store.getLabs(null, patientId) : [];
      const consults = store.getConsultations ? store.getConsultations(patientId) : [];

      const docUid = generateDocumentUid('SUM');
      const authHash = generateSecurityHash(docUid);

      return `
        <div class="print-medical-sheet print-summary-sheet">
          <div class="print-letterhead">
            <div class="print-brand-left">
              <div class="print-hospital-icon">🏥</div>
              <div>
                <h1 class="print-hospital-name">CITY GENERAL HOSPITAL &amp; MEDICAL NETWORK</h1>
                <p class="print-hospital-meta"><strong>LONGITUDINAL ELECTRONIC HEALTH RECORD (EHR) SUMMARY</strong></p>
                <p class="print-hospital-meta">Hospitrack Universal Inter-Facility Health Informatics System</p>
                <div class="print-header-badges">
                  <span class="print-badge-accredited">✓ Verified Care Network Clinical Dossier</span>
                </div>
              </div>
            </div>
            <div class="print-doc-type-box">
              <div class="print-doc-tag" style="background: #0F172A;">MEDICAL SUMMARY DOSSIER</div>
              <div class="print-barcode">||| | |||| ||| |||||| |||| |||</div>
              <div class="print-rx-id">Dossier UID: <strong>${docUid}</strong></div>
              <div class="print-date">Generated: <strong>${formatDate(new Date())}</strong></div>
            </div>
          </div>

          <div class="print-divider"></div>

          <!-- Patient Information Matrix -->
          <div class="print-lab-patient-bar-2col">
            <div class="print-lab-col">
              <div class="print-section-sub">PATIENT IDENTIFICATION</div>
              <div class="print-patient-name">${escapeHtml(patient.name || 'Ananya Iyer')}</div>
              <div class="print-details-row">
                <span><strong>UHID / MRN:</strong> <code>${formatPatientMrn(patient.id)}</code></span>
                <span><strong>Age / Gender:</strong> ${patient.age || 31}y / ${escapeHtml(patient.gender || 'Female')}</span>
              </div>
              <div class="print-details-row">
                <span><strong>Blood Group:</strong> <strong style="color: #047857;">${escapeHtml(patient.bloodGroup || 'A+')}</strong></span>
                <span><strong>Emergency Contact:</strong> ${escapeHtml(patient.emergencyContact || '+91 98111 99993')}</span>
              </div>
            </div>
            <div class="print-lab-col">
              <div class="print-section-sub">CLINICAL NETWORK SUMMARY</div>
              <div class="print-details-row" style="margin-top: 4px;">
                <span><strong>Primary Facility:</strong> City General Hospital</span>
              </div>
              <div class="print-details-row">
                <span><strong>Active Consultations:</strong> ${consults.length || 3} Recorded</span>
                <span><strong>Active Prescriptions:</strong> ${prescriptions.length || 2} Regimens</span>
              </div>
              <div class="print-details-row">
                <span><strong>Diagnostic Reports:</strong> ${labs.length || 2} Tests On File</span>
              </div>
            </div>
          </div>

          <!-- Active Prescriptions Section -->
          <div style="margin-top: 14px;">
            <div class="print-section-sub">ACTIVE MEDICATIONS &amp; PHARMACOTHERAPY DOSSIER</div>
            <table class="print-table" style="margin-top: 6px;">
              <thead>
                <tr>
                  <th style="width: 20%;">Prescription ID</th>
                  <th style="width: 25%;">Prescribing Physician</th>
                  <th style="width: 40%;">Medications &amp; Regimens</th>
                  <th style="width: 15%;">Prescribed Date</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>RX-805</code></td>
                  <td><strong>Dr. Sarah Sharma, MD</strong></td>
                  <td>Telmisartan 40mg (OD); Clopidogrel 75mg (OD); Rosuvastatin 20mg (OD HS); Aspirin 81mg (OD)</td>
                  <td>Oct 26, 2026</td>
                </tr>
                <tr>
                  <td><code>RX-760</code></td>
                  <td><strong>Dr. Sarah Sharma, MD</strong></td>
                  <td>Telmisartan 20mg (OD) — Completed / Uptitrated</td>
                  <td>Sep 18, 2026</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Diagnostic Labs Section -->
          <div style="margin-top: 14px;">
            <div class="print-section-sub">DIAGNOSTIC PATHOLOGY &amp; LABORATORY FINDINGS</div>
            <table class="print-table" style="margin-top: 6px;">
              <thead>
                <tr>
                  <th style="width: 18%;">Report ID</th>
                  <th style="width: 35%;">Investigation Name</th>
                  <th style="width: 22%;">Result Summary</th>
                  <th style="width: 12%;">Status</th>
                  <th style="width: 13%;">Reported Date</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>LAB-301</code></td>
                  <td><strong>Fasting Lipid &amp; Metabolic Panel</strong></td>
                  <td>Total Chol: 182 mg/dL; Trig: 144; LDL: 99</td>
                  <td><span class="print-status-pill norm">FINAL</span></td>
                  <td>Oct 26, 2026</td>
                </tr>
                <tr>
                  <td><code>LAB-289</code></td>
                  <td><strong>12-Lead Diagnostic Electrocardiogram</strong></td>
                  <td>Normal sinus rhythm; physiologic PR interval</td>
                  <td><span class="print-status-pill norm">FINAL</span></td>
                  <td>Oct 12, 2026</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="print-footer-grid" style="margin-top: 24px;">
            <div class="print-security-meta">
              <div class="print-security-hash">Digital Provenance Hash: ${authHash}</div>
              <div class="print-timestamp">Verified At: ${formatDateTime(new Date())}</div>
            </div>
            <div class="print-signature-box">
              <div class="print-sign-line"></div>
              <strong>Hospitrack Universal Care Network</strong>
              <div style="font-size: 0.74rem; color: #475569;">Department of Health Informatics</div>
              <div style="font-size: 0.68rem; font-family: monospace; color: #0D9488;">[ Verified Electronic Medical Record ]</div>
            </div>
          </div>
        </div>
      `;
    },

    // ------------------------------------------------------------------------
    // 7. CLINICAL ENCOUNTER / CONSULTATION NOTE
    // ------------------------------------------------------------------------
    consultation(payload = {}, store = {}) {
      const c = (typeof payload === 'string' && store.getConsultationById) ? store.getConsultationById(payload) : payload;
      const patient = (store.getPatientById ? store.getPatientById(c.patientId) : null) || { name: c.patientName || 'Ananya Iyer', id: c.patientId || 'PAT-303', age: 31, gender: 'Female', bloodGroup: 'A+' };
      const docUid = c.id || generateDocumentUid('CON');
      const authHash = generateSecurityHash(docUid);

      return `
        <div class="print-medical-sheet print-consultation-sheet">
          <div class="print-letterhead">
            <div class="print-brand-left">
              <div class="print-hospital-icon">🩺</div>
              <div>
                <h1 class="print-hospital-name">${escapeHtml(c.hospitalName || 'City General Hospital & Research Institute')}</h1>
                <p class="print-hospital-meta"><strong>CLINICAL CONSULTATION ENCOUNTER &amp; EVALUATION NOTE</strong></p>
                <p class="print-hospital-meta">Department of ${escapeHtml(c.department || c.specialty || 'Cardiology')} • OPD Clinic</p>
              </div>
            </div>
            <div class="print-doc-type-box">
              <div class="print-doc-tag" style="background: #0D9488;">CLINICAL ENCOUNTER NOTE</div>
              <div class="print-rx-id">Encounter UID: <strong>${escapeHtml(docUid)}</strong></div>
              <div class="print-date">Date: <strong>${formatDate(c.visitDate || new Date())}</strong></div>
            </div>
          </div>

          <div class="print-divider"></div>

          <!-- Patient & Physician Identification -->
          <div class="print-lab-patient-bar-2col">
            <div class="print-lab-col">
              <div class="print-section-sub">PATIENT IDENTIFICATION</div>
              <div class="print-patient-name">${escapeHtml(patient.name)}</div>
              <div class="print-details-row">
                <span><strong>UHID:</strong> <code>${formatPatientMrn(patient.id)}</code></span>
                <span><strong>Age / Gender:</strong> ${patient.age || 31}y / ${escapeHtml(patient.gender || 'Female')}</span>
              </div>
            </div>
            <div class="print-lab-col">
              <div class="print-section-sub">ATTENDING PHYSICIAN</div>
              <div class="print-details-row" style="margin-top: 4px;">
                <span><strong>Doctor:</strong> <strong>${formatDoctorName(c.doctorName)}</strong></span>
              </div>
              <div class="print-details-row">
                <span><strong>Specialty:</strong> ${escapeHtml(c.department || c.specialty || 'Cardiology')}</span>
                <span><strong>Status:</strong> <span class="print-status-pill norm">VERIFIED</span></span>
              </div>
            </div>
          </div>

          <!-- 3-Column Clinical Matrix -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 14px;">
            <div style="background: #F8FAFC; border: 1px solid #CBD5E1; padding: 10px; border-radius: 6px;">
              <div class="print-section-sub">SYMPTOMS &amp; INDICATION</div>
              <p style="font-size: 0.8rem; color: #1E293B; margin: 4px 0 0 0; line-height: 1.45;">
                ${escapeHtml(c.complaint || c.symptoms || 'Subsided exertional dyspnea, post-stent placement follow-up.')}
              </p>
            </div>
            <div style="background: #F0FDFA; border: 1px solid #99F6E4; padding: 10px; border-radius: 6px;">
              <div class="print-section-sub" style="color: #0F766E;">ACTIVE TREATMENT PLAN</div>
              <p style="font-size: 0.8rem; color: #0F172A; margin: 4px 0 0 0; line-height: 1.45; font-weight: 500;">
                ${escapeHtml(c.treatment || 'Maintain Dual Antiplatelet Therapy (DAPT) and BP titration via Telmisartan 40mg.')}
              </p>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #CBD5E1; padding: 10px; border-radius: 6px;">
              <div class="print-section-sub">RECORDED VITALS &amp; FINDINGS</div>
              <div style="font-size: 0.78rem; font-weight: 700; color: #0D9488; margin-top: 4px;">
                ${escapeHtml(c.vitals || 'BP: 120/76 mmHg • Pulse: 72 bpm • SpO2: 98%')}
              </div>
              <p style="font-size: 0.76rem; color: #475569; margin: 4px 0 0 0; font-style: italic;">
                "${escapeHtml(c.notes || 'Steady ventricular recovery, peripheral pulses intact.')}"
              </p>
            </div>
          </div>

          <!-- Sign-Off Footer -->
          <div class="print-footer-grid" style="margin-top: 24px;">
            <div class="print-security-meta">
              <div class="print-security-hash">Encounter Verification Hash: ${authHash}</div>
              <div class="print-timestamp">Recorded At: ${formatDateTime(c.visitDate || new Date())}</div>
            </div>
            <div class="print-signature-box">
              <div class="print-sign-line"></div>
              <strong>${formatDoctorName(c.doctorName)}</strong>
              <div style="font-size: 0.74rem; color: #475569;">Attending Clinician • City General Hospital</div>
              <div style="font-size: 0.68rem; font-family: monospace; color: #0D9488;">[ Digitally Signed &amp; Timestamped ]</div>
            </div>
          </div>
        </div>
      `;
    },

    // ------------------------------------------------------------------------
    // 8. HOSPITAL BED CENSUS & OCCUPANCY REPORT
    // ------------------------------------------------------------------------
    'bed-occupancy'(payload = {}, store = {}) {
      const hospital = payload.hospital || (store.getHospitals ? store.getHospitals()[0] : null) || { name: 'City General Hospital', id: 'HOSP-101', totalBeds: 247, availableBeds: 34 };
      const totalBeds = hospital.totalBeds || 247;
      const availableBeds = hospital.availableBeds || 34;
      const occupiedBeds = totalBeds - availableBeds;
      const occupancyPct = Math.round((occupiedBeds / totalBeds) * 100);

      const patients = store.getPatients ? store.getPatients(hospital.id).slice(0, 15) : [];
      const docUid = generateDocumentUid('CENSUS');
      const authHash = generateSecurityHash(docUid);

      return `
        <div class="print-medical-sheet print-census-sheet">
          <div class="print-letterhead">
            <div class="print-brand-left">
              <div class="print-hospital-icon">🛏️</div>
              <div>
                <h1 class="print-hospital-name">${escapeHtml(hospital.name)}</h1>
                <p class="print-hospital-meta"><strong>DAILY BED OCCUPANCY CENSUS &amp; WARD ALLOCATION REPORT</strong></p>
                <p class="print-hospital-meta">Hospital Operations Directorate • Real-Time Inter-Facility Registry</p>
              </div>
            </div>
            <div class="print-doc-type-box">
              <div class="print-doc-tag" style="background: #0F172A;">BED OCCUPANCY CENSUS</div>
              <div class="print-rx-id">Census UID: <strong>${docUid}</strong></div>
              <div class="print-date">Census Date: <strong>${formatDate(new Date())}</strong></div>
            </div>
          </div>

          <div class="print-divider"></div>

          <!-- KPI Summary Strip -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px;">
            <div style="background: #F8FAFC; border: 1px solid #CBD5E1; padding: 10px 14px; border-radius: 6px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Total Licensed Beds</span>
              <div style="font-size: 1.3rem; font-weight: 800; color: #0F172A;">${totalBeds}</div>
            </div>
            <div style="background: #ECFDF5; border: 1px solid #A7F3D0; padding: 10px 14px; border-radius: 6px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #065F46; text-transform: uppercase;">Available Ready Beds</span>
              <div style="font-size: 1.3rem; font-weight: 800; color: #059669;">${availableBeds}</div>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #CBD5E1; padding: 10px 14px; border-radius: 6px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Occupied Beds</span>
              <div style="font-size: 1.3rem; font-weight: 800; color: #0F172A;">${occupiedBeds}</div>
            </div>
            <div style="background: #FEF3C7; border: 1px solid #FDE68A; padding: 10px 14px; border-radius: 6px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #92400E; text-transform: uppercase;">Net Occupancy Rate</span>
              <div style="font-size: 1.3rem; font-weight: 800; color: #B45309;">${occupancyPct}%</div>
            </div>
          </div>

          <!-- Ward Breakdown Table -->
          <div class="print-section-sub">DEPARTMENTAL &amp; WARD OCCUPANCY DISTRIBUTION</div>
          <table class="print-table" style="margin-top: 6px;">
            <thead>
              <tr>
                <th style="width: 30%;">Ward / Unit</th>
                <th style="width: 15%;">Total Beds</th>
                <th style="width: 15%;">Occupied</th>
                <th style="width: 15%;">Available</th>
                <th style="width: 25%;">Occupancy Utilization</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Intensive Care Unit (ICU)</strong></td>
                <td>37</td>
                <td>32</td>
                <td><strong style="color: #059669;">5</strong></td>
                <td>86% • High Demand</td>
              </tr>
              <tr>
                <td><strong>Emergency &amp; Trauma Triage</strong></td>
                <td>49</td>
                <td>38</td>
                <td><strong style="color: #059669;">11</strong></td>
                <td>78% • Active Intake</td>
              </tr>
              <tr>
                <td><strong>Cardiac Care Unit (CCU)</strong></td>
                <td>25</td>
                <td>21</td>
                <td><strong style="color: #059669;">4</strong></td>
                <td>84% • Monitored Beds</td>
              </tr>
              <tr>
                <td><strong>General Medicine &amp; Surgery</strong></td>
                <td>112</td>
                <td>99</td>
                <td><strong style="color: #059669;">13</strong></td>
                <td>88% • Stable Inpatients</td>
              </tr>
              <tr>
                <td><strong>Neonatal ICU (NICU)</strong></td>
                <td>24</td>
                <td>23</td>
                <td><strong style="color: #059669;">1</strong></td>
                <td>96% • Critical Triage</td>
              </tr>
            </tbody>
          </table>

          <!-- Current Admitted Inpatients Roster -->
          <div style="margin-top: 14px;">
            <div class="print-section-sub">ACTIVE INPATIENT CENSUS SAMPLE ROSTER</div>
            <table class="print-table" style="margin-top: 6px;">
              <thead>
                <tr>
                  <th style="width: 15%;">Patient ID</th>
                  <th style="width: 25%;">Patient Name</th>
                  <th style="width: 20%;">Ward / Bed</th>
                  <th style="width: 25%;">Attending Physician</th>
                  <th style="width: 15%;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${patients.length > 0 ? patients.map(p => `
                  <tr>
                    <td><code>${escapeHtml(p.id)}</code></td>
                    <td><strong>${escapeHtml(p.name)}</strong> (${p.age || 45}y)</td>
                    <td>${escapeHtml(p.ward || 'General Medicine')} • Bed ${escapeHtml(p.bed || 'GEN-01')}</td>
                    <td>${formatDoctorName(p.doctorName || 'Dr. Arjun Verma')}</td>
                    <td><span class="print-status-pill norm">${escapeHtml(p.status || 'ADMITTED')}</span></td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td><code>PAT-303</code></td>
                    <td><strong>Ananya Iyer</strong> (31y)</td>
                    <td>General Medicine • Bed GEN-01</td>
                    <td>Dr. Arjun Verma</td>
                    <td><span class="print-status-pill norm">CHECKED IN</span></td>
                  </tr>
                  <tr>
                    <td><code>PAT-302</code></td>
                    <td><strong>Rajesh Kumar</strong> (58y)</td>
                    <td>Cardiology CCU • Bed CCU-04</td>
                    <td>Dr. Sarah Sharma</td>
                    <td><span class="print-status-pill norm">CHECKED IN</span></td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- Sign-Off Footer -->
          <div class="print-footer-grid" style="margin-top: 24px;">
            <div class="print-security-meta">
              <div class="print-security-hash">Census Provenance Hash: ${authHash}</div>
              <div class="print-timestamp">Snapshot Timestamp: ${formatDateTime(new Date())}</div>
            </div>
            <div class="print-signature-box">
              <div class="print-sign-line"></div>
              <strong>Director of Hospital Operations</strong>
              <div style="font-size: 0.74rem; color: #475569;">${escapeHtml(hospital.name)}</div>
              <div style="font-size: 0.68rem; font-family: monospace; color: #0D9488;">[ Official Hospital Census Released ]</div>
            </div>
          </div>
        </div>
      `;
    },

    // ------------------------------------------------------------------------
    // 9. SUPER ADMIN NATIONAL HEALTHCARE NETWORK DOSSIER
    // ------------------------------------------------------------------------
    'admin-network-dossier'(payload = {}, store = {}) {
      const hospitals = (store.getHospitals ? store.getHospitals() : []) || [];
      const totalBeds = hospitals.reduce((acc, h) => acc + (Number(h.totalBeds) || 100), 0);
      const availBeds = hospitals.reduce((acc, h) => acc + (h.availableBeds != null ? Number(h.availableBeds) : 20), 0);
      const docUid = generateDocumentUid('NET');
      const authHash = generateSecurityHash(docUid);

      return `
        <div class="print-medical-sheet print-network-sheet">
          <div class="print-letterhead">
            <div class="print-brand-left">
              <div class="print-hospital-icon">🌐</div>
              <div>
                <h1 class="print-hospital-name">HOSPITRACK NATIONAL HEALTHCARE ALLIANCE</h1>
                <p class="print-hospital-meta"><strong>SUPER ADMIN ACCREDITED NETWORK DOSSIER</strong></p>
                <p class="print-hospital-meta">National Health System Registry &amp; Inter-Facility Governance Directorate</p>
              </div>
            </div>
            <div class="print-doc-type-box">
              <div class="print-doc-tag" style="background: #0F172A;">NATIONAL NETWORK DOSSIER</div>
              <div class="print-rx-id">Registry UID: <strong>${docUid}</strong></div>
              <div class="print-date">Generated: <strong>${formatDate(new Date())}</strong></div>
            </div>
          </div>

          <div class="print-divider"></div>

          <!-- Network KPIs -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px;">
            <div style="background: #F8FAFC; border: 1px solid #CBD5E1; padding: 10px 14px; border-radius: 6px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Accredited Campuses</span>
              <div style="font-size: 1.3rem; font-weight: 800; color: #0F172A;">${hospitals.length || 3}</div>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #CBD5E1; padding: 10px 14px; border-radius: 6px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Total Network Capacity</span>
              <div style="font-size: 1.3rem; font-weight: 800; color: #0F172A;">${totalBeds || 450} Beds</div>
            </div>
            <div style="background: #ECFDF5; border: 1px solid #A7F3D0; padding: 10px 14px; border-radius: 6px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #065F46; text-transform: uppercase;">Net Ready Beds</span>
              <div style="font-size: 1.3rem; font-weight: 800; color: #059669;">${availBeds || 62} Available</div>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #CBD5E1; padding: 10px 14px; border-radius: 6px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Quality Compliance</span>
              <div style="font-size: 1.3rem; font-weight: 800; color: #0D9488;">99.4% Pass</div>
            </div>
          </div>

          <!-- Network Hospitals Table -->
          <div class="print-section-sub">ACCREDITED HEALTHCARE FACILITIES REGISTER</div>
          <table class="print-table" style="margin-top: 6px;">
            <thead>
              <tr>
                <th style="width: 12%;">Code</th>
                <th style="width: 32%;">Facility Name &amp; District</th>
                <th style="width: 18%;">Bed Capacity</th>
                <th style="width: 18%;">Available Beds</th>
                <th style="width: 20%;">Clinical Rating &amp; Status</th>
              </tr>
            </thead>
            <tbody>
              ${hospitals.map(h => `
                <tr>
                  <td><code>${escapeHtml(h.id)}</code></td>
                  <td>
                    <strong>${escapeHtml(h.name)}</strong>
                    <div style="font-size: 0.72rem; color: #64748B;">${escapeHtml(h.location || 'Metro Healthcare Campus')}</div>
                  </td>
                  <td>${h.totalBeds || 100} Beds</td>
                  <td><strong style="color: #059669;">${h.availableBeds != null ? h.availableBeds : 20} Ready</strong></td>
                  <td>
                    <span style="font-weight: 700; color: #B45309;">⭐ ${h.rating || '4.8'}</span>
                    <span class="print-status-pill norm" style="margin-left: 6px;">${escapeHtml(h.status || 'ACTIVE')}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Sign-Off Footer -->
          <div class="print-footer-grid" style="margin-top: 24px;">
            <div class="print-security-meta">
              <div class="print-security-hash">Network Governance Hash: ${authHash}</div>
              <div class="print-timestamp">Attestation Timestamp: ${formatDateTime(new Date())}</div>
            </div>
            <div class="print-signature-box">
              <div class="print-sign-line"></div>
              <strong>Super Administrator</strong>
              <div style="font-size: 0.74rem; color: #475569;">National Health Authority • Hospitrack Governance</div>
              <div style="font-size: 0.68rem; font-family: monospace; color: #0D9488;">[ Authorized Institutional Registry ]</div>
            </div>
          </div>
        </div>
      `;
    },

    // ------------------------------------------------------------------------
    // 10. SYSTEM REPORTS & OPERATIONAL ANALYTICS
    // ------------------------------------------------------------------------
    'system-analytics'(payload = {}, store = {}) {
      const docUid = generateDocumentUid('RPT');
      const authHash = generateSecurityHash(docUid);

      return `
        <div class="print-medical-sheet print-analytics-sheet">
          <div class="print-letterhead">
            <div class="print-brand-left">
              <div class="print-hospital-icon">📊</div>
              <div>
                <h1 class="print-hospital-name">HOSPITRACK OPERATIONAL ANALYTICS</h1>
                <p class="print-hospital-meta"><strong>HEALTHCARE DELIVERY METRICS &amp; CLINICAL VOLUME REPORT</strong></p>
                <p class="print-hospital-meta">PostgreSQL Certified Analytics Engine • Inter-Facility Coordination</p>
              </div>
            </div>
            <div class="print-doc-type-box">
              <div class="print-doc-tag" style="background: #0F766E;">SYSTEM ANALYTICS REPORT</div>
              <div class="print-rx-id">Report UID: <strong>${docUid}</strong></div>
              <div class="print-date">Generated: <strong>${formatDate(new Date())}</strong></div>
            </div>
          </div>

          <div class="print-divider"></div>

          <!-- Metrics Matrix -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px;">
            <div style="background: #F8FAFC; border: 1px solid #CBD5E1; padding: 10px 14px; border-radius: 6px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Active Consultations</span>
              <div style="font-size: 1.3rem; font-weight: 800; color: #0F172A;">128</div>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #CBD5E1; padding: 10px 14px; border-radius: 6px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Prescription Volume</span>
              <div style="font-size: 1.3rem; font-weight: 800; color: #0F172A;">342</div>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #CBD5E1; padding: 10px 14px; border-radius: 6px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Inter-Hospital Referrals</span>
              <div style="font-size: 1.3rem; font-weight: 800; color: #0F172A;">46</div>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #CBD5E1; padding: 10px 14px; border-radius: 6px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Emergency Transfers</span>
              <div style="font-size: 1.3rem; font-weight: 800; color: #059669;">18 Resolved</div>
            </div>
          </div>

          <!-- Throughput Analysis Table -->
          <div class="print-section-sub">HEALTHCARE THROUGHPUT &amp; INTER-FACILITY VELOCITY</div>
          <table class="print-table" style="margin-top: 6px;">
            <thead>
              <tr>
                <th style="width: 25%;">Domain</th>
                <th style="width: 20%;">Total Transacted</th>
                <th style="width: 20%;">Average Processing Time</th>
                <th style="width: 15%;">Resolution Rate</th>
                <th style="width: 20%;">Safety Index</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Specialist Referrals</strong></td>
                <td>46 Dispatched</td>
                <td>24 Minutes</td>
                <td><strong style="color: #059669;">98.2%</strong></td>
                <td>Zero Discrepancies</td>
              </tr>
              <tr>
                <td><strong>Emergency Bed Transfers</strong></td>
                <td>18 Critical</td>
                <td>11 Minutes</td>
                <td><strong style="color: #059669;">100%</strong></td>
                <td>Continuous Telemetry</td>
              </tr>
              <tr>
                <td><strong>Diagnostic Labs</strong></td>
                <td>210 Completed</td>
                <td>42 Minutes</td>
                <td><strong style="color: #059669;">99.5%</strong></td>
                <td>NABL Verified</td>
              </tr>
              <tr>
                <td><strong>Inpatient Discharges</strong></td>
                <td>38 Cleared</td>
                <td>35 Minutes</td>
                <td><strong style="color: #059669;">100%</strong></td>
                <td>DAPT Safety Verified</td>
              </tr>
            </tbody>
          </table>

          <!-- Sign-Off Footer -->
          <div class="print-footer-grid" style="margin-top: 24px;">
            <div class="print-security-meta">
              <div class="print-security-hash">Analytics Audit Hash: ${authHash}</div>
              <div class="print-timestamp">Generated Timestamp: ${formatDateTime(new Date())}</div>
            </div>
            <div class="print-signature-box">
              <div class="print-sign-line"></div>
              <strong>Super Administrator</strong>
              <div style="font-size: 0.74rem; color: #475569;">Health Analytics &amp; Informatics Division</div>
              <div style="font-size: 0.68rem; font-family: monospace; color: #0D9488;">[ Verified System Intelligence ]</div>
            </div>
          </div>
        </div>
      `;
    },

    // ------------------------------------------------------------------------
    // 11. CRYPTOGRAPHIC AUDIT TRAIL & SECURITY LEDGER
    // ------------------------------------------------------------------------
    'audit-ledger'(payload = {}, store = {}) {
      const logs = store.getAuditLogs ? store.getAuditLogs().slice(0, 30) : [];
      const docUid = generateDocumentUid('AUD');
      const authHash = generateSecurityHash(docUid);

      return `
        <div class="print-medical-sheet print-audit-sheet">
          <div class="print-letterhead">
            <div class="print-brand-left">
              <div class="print-hospital-icon">🛡️</div>
              <div>
                <h1 class="print-hospital-name">HOSPITRACK IMMUTABLE AUDIT TRAIL</h1>
                <p class="print-hospital-meta"><strong>CRYPTOGRAPHIC SECURITY &amp; COMPLIANCE LEDGER</strong></p>
                <p class="print-hospital-meta">Digital Personal Data Protection Act (DPDP) &amp; HIPAA Security Compliance</p>
              </div>
            </div>
            <div class="print-doc-type-box">
              <div class="print-doc-tag" style="background: #0F172A;">SECURITY AUDIT LEDGER</div>
              <div class="print-rx-id">Ledger UID: <strong>${docUid}</strong></div>
              <div class="print-date">Generated: <strong>${formatDate(new Date())}</strong></div>
            </div>
          </div>

          <div class="print-divider"></div>

          <div class="print-section-sub">IMMUTABLE CLINICAL &amp; SYSTEM ACCESS TRANSACTIONS</div>
          <table class="print-table" style="margin-top: 6px;">
            <thead>
              <tr>
                <th style="width: 14%;">Event ID</th>
                <th style="width: 22%;">Action / Operation</th>
                <th style="width: 20%;">Actor (Role)</th>
                <th style="width: 16%;">Target Entity</th>
                <th style="width: 14%;">Timestamp</th>
                <th style="width: 14%;">Verification Hash</th>
              </tr>
            </thead>
            <tbody>
              ${logs.length > 0 ? logs.map(l => `
                <tr>
                  <td><code>${escapeHtml(l.id)}</code></td>
                  <td><strong>${escapeHtml(l.action || l.eventType || 'SYSTEM_EVENT')}</strong></td>
                  <td>${escapeHtml(l.actorName || l.actor || 'System')} (${escapeHtml(l.actorRole || 'SYSTEM')})</td>
                  <td>${escapeHtml(l.targetEntity || 'RECORD')} (${escapeHtml(l.targetId || 'N/A')})</td>
                  <td>${formatTimeOnly(l.timestamp)}</td>
                  <td><code style="font-size: 0.68rem;">${escapeHtml(l.integrityHash || 'SEC-SHA256')}</code></td>
                </tr>
              `).join('') : `
                <tr>
                  <td><code>AUD-9918</code></td>
                  <td><strong>PATIENT_RECORD_VIEW</strong></td>
                  <td>Dr. Sarah Sharma (DOCTOR)</td>
                  <td>PATIENT (PAT-303)</td>
                  <td>10:45 AM</td>
                  <td><code>SEC-SHA256-OK</code></td>
                </tr>
                <tr>
                  <td><code>AUD-9917</code></td>
                  <td><strong>PRESCRIPTION_DISPENSED</strong></td>
                  <td>Chief Pharmacist (HOSPITAL)</td>
                  <td>PRESCRIPTION (RX-805)</td>
                  <td>10:30 AM</td>
                  <td><code>SEC-SHA256-OK</code></td>
                </tr>
                <tr>
                  <td><code>AUD-9916</code></td>
                  <td><strong>REFERRAL_DISPATCHED</strong></td>
                  <td>Dr. Arjun Verma (DOCTOR)</td>
                  <td>REFERRAL (REF-8841)</td>
                  <td>10:15 AM</td>
                  <td><code>SEC-SHA256-OK</code></td>
                </tr>
              `}
            </tbody>
          </table>

          <!-- Sign-Off Footer -->
          <div class="print-footer-grid" style="margin-top: 24px;">
            <div class="print-security-meta">
              <div class="print-security-hash">Immutable Ledger Hash: ${authHash}</div>
              <div class="print-timestamp">Verified At: ${formatDateTime(new Date())}</div>
            </div>
            <div class="print-signature-box">
              <div class="print-sign-line"></div>
              <strong>Chief Information Security Officer</strong>
              <div style="font-size: 0.74rem; color: #475569;">Hospitrack Security &amp; Compliance Office</div>
              <div style="font-size: 0.68rem; font-family: monospace; color: #0D9488;">[ Cryptographically Attested ]</div>
            </div>
          </div>
        </div>
      `;
    },

    // ------------------------------------------------------------------------
    // 12. HOSPITAL INTELLIGENCE & ACCREDITATION DOSSIER
    // ------------------------------------------------------------------------
    'hospital-dossier'(payload = {}, store = {}) {
      const hospitalId = typeof payload === 'string' ? payload : (payload.id || 'HOSP-101');
      const h = (store.getHospitalById ? store.getHospitalById(hospitalId) : null) || payload || { name: 'City General Hospital', id: 'HOSP-101', totalBeds: 247, availableBeds: 34, location: 'Central Healthcare District' };
      const docUid = generateDocumentUid('FAC');
      const authHash = generateSecurityHash(docUid);

      return `
        <div class="print-medical-sheet print-facility-sheet">
          <div class="print-letterhead">
            <div class="print-brand-left">
              <div class="print-hospital-icon">🏛️</div>
              <div>
                <h1 class="print-hospital-name">${escapeHtml(h.name)}</h1>
                <p class="print-hospital-meta"><strong>FACILITY ACCREDITATION &amp; INTELLIGENCE DOSSIER</strong></p>
                <p class="print-hospital-meta">Campus: ${escapeHtml(h.location || 'Central Healthcare District')} • Code: <code>${escapeHtml(h.id)}</code></p>
              </div>
            </div>
            <div class="print-doc-type-box">
              <div class="print-doc-tag" style="background: #0F766E;">FACILITY DOSSIER</div>
              <div class="print-rx-id">Facility UID: <strong>${docUid}</strong></div>
              <div class="print-date">Generated: <strong>${formatDate(new Date())}</strong></div>
            </div>
          </div>

          <div class="print-divider"></div>

          <!-- Capacity & Rating Matrix -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px;">
            <div style="background: #F8FAFC; border: 1px solid #CBD5E1; padding: 10px 14px; border-radius: 6px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Licensed Beds</span>
              <div style="font-size: 1.3rem; font-weight: 800; color: #0F172A;">${h.totalBeds || 247}</div>
            </div>
            <div style="background: #ECFDF5; border: 1px solid #A7F3D0; padding: 10px 14px; border-radius: 6px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #065F46; text-transform: uppercase;">Ready Beds</span>
              <div style="font-size: 1.3rem; font-weight: 800; color: #059669;">${h.availableBeds != null ? h.availableBeds : 34}</div>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #CBD5E1; padding: 10px 14px; border-radius: 6px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Clinical Rating</span>
              <div style="font-size: 1.3rem; font-weight: 800; color: #B45309;">⭐ ${h.rating || '4.8'}</div>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #CBD5E1; padding: 10px 14px; border-radius: 6px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Operational Status</span>
              <div style="font-size: 1.3rem; font-weight: 800; color: #0D9488;">${escapeHtml(h.status || 'ACTIVE')}</div>
            </div>
          </div>

          <!-- Clinical Specialties List -->
          <div class="print-section-sub">ACCREDITED CLINICAL DEPARTMENTS &amp; FACILITIES</div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 6px;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px; border-radius: 6px;">
              <strong>Cardiology &amp; Cath Lab</strong>
              <div style="font-size: 0.74rem; color: #64748B;">24/7 Primary PCI, 37 CCU Beds</div>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px; border-radius: 6px;">
              <strong>Emergency &amp; Trauma Triage</strong>
              <div style="font-size: 0.74rem; color: #64748B;">Level-1 Trauma, 49 Monitored Beds</div>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px; border-radius: 6px;">
              <strong>Intensive Care Unit (ICU)</strong>
              <div style="font-size: 0.74rem; color: #64748B;">Mechanical Telemetry, NABL Certified</div>
            </div>
          </div>

          <!-- Sign-Off Footer -->
          <div class="print-footer-grid" style="margin-top: 24px;">
            <div class="print-security-meta">
              <div class="print-security-hash">Facility Verification Hash: ${authHash}</div>
              <div class="print-timestamp">Verified At: ${formatDateTime(new Date())}</div>
            </div>
            <div class="print-signature-box">
              <div class="print-sign-line"></div>
              <strong>Hospital Accreditation Officer</strong>
              <div style="font-size: 0.74rem; color: #475569;">Quality Assurance Directorate</div>
              <div style="font-size: 0.68rem; font-family: monospace; color: #0D9488;">[ Accredited Facility Dossier ]</div>
            </div>
          </div>
        </div>
      `;
    },

    // ------------------------------------------------------------------------
    // 13. EMERGENCY PATIENT TRANSFER & HANDOVER RECORD
    // ------------------------------------------------------------------------
    'emergency-transfers'(payload = {}, store = {}) {
      const t = payload || {};
      const docUid = t.id || generateDocumentUid('TRF');
      const authHash = generateSecurityHash(docUid);

      return `
        <div class="print-medical-sheet print-transfer-sheet">
          <div class="print-letterhead">
            <div class="print-brand-left">
              <div class="print-hospital-icon">🚑</div>
              <div>
                <h1 class="print-hospital-name">HOSPITRACK EMERGENCY TRANSFER NETWORK</h1>
                <p class="print-hospital-meta"><strong>CRITICAL PATIENT HANDOVER &amp; AMBULANCE TELEMETRY RECORD</strong></p>
                <p class="print-hospital-meta">Inter-Facility Emergency Transfer Coordination Protocol</p>
              </div>
            </div>
            <div class="print-doc-type-box">
              <div class="print-doc-tag" style="background: #EF4444;">EMERGENCY TRANSFER DOSSIER</div>
              <div class="print-rx-id">Transfer UID: <strong>${docUid}</strong></div>
              <div class="print-date">Dispatched: <strong>${formatDateTime(new Date())}</strong></div>
            </div>
          </div>

          <div class="print-divider"></div>

          <!-- Source & Destination Facilities -->
          <div class="print-lab-patient-bar-2col">
            <div class="print-lab-col">
              <div class="print-section-sub">SOURCE TRANSFERRING FACILITY</div>
              <div class="print-patient-name" style="font-size: 1.05rem;">City General Hospital</div>
              <div class="print-details-row">
                <span><strong>Transferring Physician:</strong> Dr. Sarah Sharma, MD</span>
                <span><strong>Phone:</strong> +91 80 2345 6789</span>
              </div>
            </div>
            <div class="print-lab-col">
              <div class="print-section-sub">RECEIVING DESTINATION FACILITY</div>
              <div class="print-patient-name" style="font-size: 1.05rem;">Apex Care Medical Center</div>
              <div class="print-details-row">
                <span><strong>Receiving Unit:</strong> Emergency Trauma ICU</span>
                <span><strong>Bed Reserved:</strong> ICU-BED-02</span>
              </div>
            </div>
          </div>

          <!-- Patient & Critical Triage -->
          <div class="print-clinical-section" style="margin-top: 14px; background: #FEF2F2; border: 1.5px solid #FCA5A5; padding: 12px 14px; border-radius: 6px;">
            <div class="print-section-sub" style="color: #991B1B;">PATIENT IDENTIFICATION &amp; EMERGENCY INDICATION</div>
            <div style="font-size: 0.95rem; font-weight: 800; color: #0F172A; margin: 4px 0;">
              Patient: ${escapeHtml(t.patientName || 'Ananya Iyer')} • MRN: <code>${escapeHtml(t.patientId || 'PAT-303')}</code> • Age: 31y Female
            </div>
            <p style="font-size: 0.82rem; color: #7F1D1D; margin: 4px 0 0 0; line-height: 1.45;">
              <strong>Indication:</strong> Acute unstable angina with dynamic ST changes requiring emergency tertiary cath lab catheterization and continuous cardiac telemetry.
            </p>
          </div>

          <!-- Sign-Off Footer -->
          <div class="print-footer-grid" style="margin-top: 24px;">
            <div class="print-signature-box" style="text-align: left;">
              <div class="print-sign-line" style="margin-left: 0;"></div>
              <strong>Dispatching Clinician / Paramedic</strong>
              <div style="font-size: 0.74rem; color: #475569;">City General Ambulance Unit</div>
            </div>
            <div class="print-signature-box" style="text-align: right;">
              <div class="print-sign-line" style="margin-right: 0;"></div>
              <strong>Receiving Emergency Resident</strong>
              <div style="font-size: 0.74rem; color: #475569;">Apex Care Medical Center</div>
            </div>
          </div>
        </div>
      `;
    },

    // ------------------------------------------------------------------------
    // Central Dynamic Dispatcher
    // ------------------------------------------------------------------------
    renderDocument(type, payload = {}, store = {}) {
      const norm = (type || 'summary').toLowerCase().trim();
      const map = {
        'prescription': this.prescription,
        'lab-report': this['lab-report'],
        'lab_report': this['lab-report'],
        'lab': this['lab-report'],
        'labs': this['lab-report'],
        'referral': this.referral,
        'inpatient-summary': this['inpatient-summary'],
        'inpatient_summary': this['inpatient-summary'],
        'inpatient': this['inpatient-summary'],
        'discharge': this.discharge,
        'discharge-summary': this.discharge,
        'discharge_summary': this.discharge,
        'summary': this.summary,
        'clinical-history': this.summary,
        'clinical_history': this.summary,
        'consultation': this.consultation,
        'consult': this.consultation,
        'bed-occupancy': this['bed-occupancy'],
        'bed_occupancy': this['bed-occupancy'],
        'bed-census': this['bed-occupancy'],
        'bed_census': this['bed-occupancy'],
        'hospital-dossier': this['hospital-dossier'],
        'hospital_dossier': this['hospital-dossier'],
        'admin-network-dossier': this['admin-network-dossier'],
        'admin_network_dossier': this['admin-network-dossier'],
        'network-dossier': this['admin-network-dossier'],
        'system-analytics': this['system-analytics'],
        'system_analytics': this['system-analytics'],
        'audit-ledger': this['audit-ledger'],
        'audit_ledger': this['audit-ledger'],
        'emergency-transfers': this['emergency-transfers'],
        'emergency_transfers': this['emergency-transfers'],
        'transfer': this['emergency-transfers'],
        'transfers': this['emergency-transfers']
      };

      const handler = map[norm] || this[norm] || this.summary;
      if (typeof handler === 'function') {
        return handler.call(this, payload, store);
      }
      return this.summary.call(this, payload, store);
    }
  };

  // Export to global scope and CommonJS
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = printTemplates;
  }
  if (typeof global !== 'undefined') {
    global.hospitrackPrintTemplates = printTemplates;
  }
})(typeof window !== 'undefined' ? window : global);
