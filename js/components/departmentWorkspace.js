/**
 * Hospitrack — Department Clinical Architecture & Workspace Component
 * Comprehensive multi-tab clinical module engine across 12 medical departments:
 * Cardiology, Neurology, Orthopedics, Pediatrics, General Medicine,
 * Emergency, Gynecology, Dermatology, ENT, Ophthalmology, Radiology, Pathology.
 */

let selectedDepartmentCode = 'Cardiology';
let activeDeptTab = 'overview';

const DEPARTMENT_CONFIGS = {
  Cardiology: {
    code: 'Cardiology',
    deptId: 'DEPT-CARD-01',
    name: 'Department of Cardiology & Cardiovascular Sciences',
    icon: '❤️',
    color: '#ef4444',
    badge: 'Tertiary Care',
    head: 'Dr. Robert Chen, MD, FACC',
    wardCategory: 'ICU',
    description: 'Hemodynamic monitoring, electrophysiology, coronary interventions, and inpatient cardiac care.',
    modules: [
      { id: 'vitals', title: 'Hemodynamic Vitals', icon: '💓', desc: 'Continuous Blood Pressure, Heart Rate, SpO2, and Mean Arterial Pressure monitoring.' },
      { id: 'ecg', title: 'ECG & Arrhythmia Analysis', icon: '📈', desc: '12-lead Electrocardiogram tracings, ST elevation monitoring, and rhythm strips.' },
      { id: 'symptoms', title: 'Chest Pain & Symptoms Triage', icon: '🩺', desc: 'Angina grading (CCS I-IV), dyspnea on exertion, palpitations, and syncope workup.' },
      { id: 'diagnosis', title: 'Cardiovascular Diagnosis', icon: '📋', desc: 'CAD, Acute Coronary Syndrome, Heart Failure (NYHA), and Valvular heart disease protocols.' },
      { id: 'treatment', title: 'Treatment & Intervention Plan', icon: '💊', desc: 'Antiplatelet therapy, ACE-inhibitors, Beta-blockers, and Cath-Lab scheduling.' },
      { id: 'followup', title: 'Scheduled Follow-up & Rehab', icon: '🗓️', desc: 'Post-PCI cardiac rehabilitation, lipid goal tracking, and 30-day readmission risk.' }
    ]
  },
  Emergency: {
    code: 'Emergency',
    deptId: 'DEPT-EMER-01',
    name: 'Department of Emergency Medicine & Trauma',
    icon: '🚨',
    color: '#f97316',
    badge: 'Critical Care 24/7',
    head: 'Dr. Sarah Jenkins, MD, FACEP',
    wardCategory: 'EMERGENCY',
    description: 'Rapid resuscitation, multi-trauma triage, critical transfers, and immediate life support.',
    modules: [
      { id: 'triage', title: 'Emergency Severity Triage (ESI 1-5)', icon: '⚡', desc: 'Acuity stratification: Resuscitation (1), Emergent (2), Urgent (3), Less Urgent (4), Non-urgent (5).' },
      { id: 'priority', title: 'Priority Clinical Queue', icon: '⏱️', desc: 'Door-to-provider time, fast-track minor injuries, and resuscitation bay allocation.' },
      { id: 'beds', title: 'Emergency & Red Bay Capacity', icon: '🛏️', desc: 'Crash room beds, trauma bays, and high-dependency stabilization units.' },
      { id: 'transfers', title: 'Inter-Facility Critical Transfers', icon: '🚑', desc: 'Immediate dispatch to tertiary specialty trauma centers and neuro-ICUs.' },
      { id: 'referrals', title: 'Stat Specialist Consultations', icon: '🔁', desc: 'On-call Trauma Surgery, Interventional Neuro-Radiology, and Thoracic surgery alerts.' }
    ]
  },
  Radiology: {
    code: 'Radiology',
    deptId: 'DEPT-RAD-01',
    name: 'Department of Diagnostic & Interventional Radiology',
    icon: '🩻',
    color: '#06b6d4',
    badge: 'Diagnostic Imaging',
    head: 'Dr. Marcus Vance, MD',
    wardCategory: 'GENERAL',
    description: 'Computed Tomography (CT), MRI, Digital Radiography, Ultrasound, and PACS reporting.',
    modules: [
      { id: 'requests', title: 'Diagnostic Imaging Orders', icon: '📥', desc: 'Real-time intake for MRI Brain, High-Resolution Chest CT, Abdominal USG, and Skeletal X-Rays.' },
      { id: 'reports', title: 'PACS Scan Verification & Reports', icon: '📄', desc: 'Radiologist impression, DICOM slice cross-referencing, and urgent critical findings alert.' },
      { id: 'findings', title: 'Key Imaging Findings', icon: '🔍', desc: 'Measurement of lesions, ischemic penumbra, fracture displacement, and vascular patency.' },
      { id: 'status', title: 'Acquisition & Reading Status', icon: '⏳', desc: 'SCHEDULED → IN_PROGRESS → SCANNED → RADIOLOGIST_REVIEWED → FINAL_VERIFIED.' }
    ]
  },
  Pathology: {
    code: 'Pathology',
    deptId: 'DEPT-PATH-01',
    name: 'Department of Pathology & Clinical Laboratory',
    icon: '🔬',
    color: '#8b5cf6',
    badge: 'Diagnostic Lab',
    head: 'Dr. Elena Rostova, MD, FCAP',
    wardCategory: 'GENERAL',
    description: 'Hematology, Clinical Biochemistry, Histopathology, Microbiology, and Blood Banking.',
    modules: [
      { id: 'orders', title: 'Laboratory Test Orders', icon: '🧪', desc: 'Comprehensive Metabolic Panel (CMP), Complete Blood Count (CBC), Troponin-I, and Lipid Panels.' },
      { id: 'samples', title: 'Sample Barcode & Custody', icon: '🏷️', desc: 'Specimen collection timestamps, tube preservation types, and chain of custody tracking.' },
      { id: 'results', title: 'Biochemical Results & Limits', icon: '📊', desc: 'Automated reference-range deviation flagging (Critical Low / High alerts).' },
      { id: 'reports', title: 'Pathologist Signed Reports', icon: '✍️', desc: 'Cryptographically verified laboratory reports issued directly into patient timeline.' }
    ]
  },
  GeneralMedicine: {
    code: 'General Medicine',
    deptId: 'DEPT-GENM-01',
    name: 'Department of Internal & General Medicine',
    icon: '🩺',
    color: '#3b82f6',
    badge: 'Inpatient Medicine',
    head: 'Dr. Michael Chang, MD, FACP',
    wardCategory: 'GENERAL',
    description: 'Comprehensive adult health, chronic multi-morbidity, infectious diseases, and preventative wellness.',
    modules: [
      { id: 'history', title: 'Systemic Health History', icon: '📚', desc: 'Review of systems, comorbidities, family medical history, and allergy documentation.' },
      { id: 'chronic', title: 'Chronic Disease Management', icon: '📉', desc: 'Type 2 Diabetes glycemic control (HbA1c), Hypertension, and COPD management plans.' },
      { id: 'medplan', title: 'Integrated Pharmacotherapy', icon: '💊', desc: 'Multi-drug reconciliation with duplicate protection and renal adjustment checks.' },
      { id: 'preventative', title: 'Preventative Health & Immunization', icon: '🛡️', desc: 'Adult vaccination schedules, cancer screening reminders, and lifestyle counseling.' }
    ]
  },
  Neurology: {
    code: 'Neurology',
    deptId: 'DEPT-NEUR-01',
    name: 'Department of Neurology & Neurosciences',
    icon: '🧠',
    color: '#ec4899',
    badge: 'Specialty Center',
    head: 'Dr. Aris Thorne, MD, PhD',
    wardCategory: 'ICU',
    description: 'Acute stroke response, seizure disorders, neuromuscular diseases, and neuro-rehabilitation.',
    modules: [
      { id: 'neuroexam', title: 'Neurological Assessment', icon: '⚡', desc: 'Glasgow Coma Scale (GCS), NIHSS Stroke Scale, cranial nerve assessment, and reflex scoring.' },
      { id: 'eeg', title: 'EEG & Evoked Potentials', icon: '📈', desc: 'Continuous EEG telemetry for non-convulsive status epilepticus and focal spikes.' },
      { id: 'stroke', title: 'Hyperacute Stroke Pathway', icon: '🚨', desc: 'Door-to-needle thrombolytic timing and mechanical thrombectomy referral criteria.' },
      { id: 'rehab', title: 'Neuro-Cognitive Rehabilitation', icon: '🧩', desc: 'Speech therapy, occupational therapy, and motor recovery milestone tracking.' }
    ]
  },
  Orthopedics: {
    code: 'Orthopedics',
    deptId: 'DEPT-ORTH-01',
    name: 'Department of Orthopedic Surgery & Traumatology',
    icon: '🦴',
    color: '#14b8a6',
    badge: 'Surgical Specialty',
    head: 'Dr. David K. Miller, MD, FAAOS',
    wardCategory: 'GENERAL',
    description: 'Joint arthroplasty, complex trauma reconstruction, spine surgery, and sports medicine.',
    modules: [
      { id: 'fractures', title: 'Trauma & Fracture Assessment', icon: '📐', desc: 'AO/OTA fracture classification, neurovascular status of limbs, and compartment pressure monitoring.' },
      { id: 'surgical', title: 'OR & Surgical Booking', icon: '🏥', desc: 'Implant selection, arthroscopic scheduling, pre-op clearance, and antibiotic prophylaxis.' },
      { id: 'mobility', title: 'Mobility & Weight-Bearing Status', icon: '🚶', desc: 'Post-operative ambulation protocols (NWB, PWB, FWB) and physical therapy progression.' }
    ]
  },
  Pediatrics: {
    code: 'Pediatrics',
    deptId: 'DEPT-PEDI-01',
    name: 'Department of Pediatrics & Child Health',
    icon: '👶',
    color: '#eab308',
    badge: 'Child Care',
    head: 'Dr. Lisa Patel, MD, FAAP',
    wardCategory: 'NICU',
    description: 'Neonatal care (NICU), pediatric development, childhood infections, and pediatric pharmacotherapy.',
    modules: [
      { id: 'growth', title: 'Growth & Percentile Charting', icon: '📏', desc: 'WHO weight-for-age, height-for-age, and head circumference developmental percentiles.' },
      { id: 'immunization', title: 'National Immunization Tracker', icon: '💉', desc: 'Childhood vaccination ledger (BCG, Polio, Pentavalent, MMR, Hepatitis).' },
      { id: 'dosing', title: 'Weight-Based Pediatric Dosing', icon: '⚖️', desc: 'Strict mg/kg dosage calculation with automated safety ceiling limits.' }
    ]
  },
  Gynecology: {
    code: 'Gynecology',
    deptId: 'DEPT-GYNE-01',
    name: 'Department of Obstetrics & Gynecology',
    icon: '🌸',
    color: '#f43f5e',
    badge: 'Maternal Health',
    head: 'Dr. Rachel Green, MD, FACOG',
    wardCategory: 'GENERAL',
    description: 'Antenatal care, labor & delivery suites, high-risk obstetrics, and gynecologic oncology.',
    modules: [
      { id: 'antenatal', title: 'Obstetrics & Gestational Log', icon: '🤰', desc: 'Estimated Date of Delivery (EDD), gestational age, fetal heart tones, and fundal height.' },
      { id: 'labor', title: 'Labor Suite & Partogram', icon: '⏱️', desc: 'Cervical dilation progression, contraction frequency, and maternal vital stability.' },
      { id: 'postpartum', title: 'Post-Partum Recovery Care', icon: '🤱', desc: 'Lochia monitoring, neonatal bonding, lactation support, and discharge counseling.' }
    ]
  },
  Dermatology: {
    code: 'Dermatology',
    deptId: 'DEPT-DERM-01',
    name: 'Department of Dermatology & Cutaneous Medicine',
    icon: '✨',
    color: '#d97706',
    badge: 'Specialty Outpatient',
    head: 'Dr. Hannah Becker, MD',
    wardCategory: 'GENERAL',
    description: 'Cutaneous oncology, inflammatory skin conditions, dermoscopy, and dermatopathology.',
    modules: [
      { id: 'morphology', title: 'Lesion & Rash Morphology', icon: '🔍', desc: 'Photodocumentation, Fitzpatrick skin typing, and ABCDE melanoma screening.' },
      { id: 'biopsy', title: 'Punch & Excisional Biopsies', icon: '🔬', desc: 'Histopathology requisitions, margin assessments, and immunofluorescence workup.' },
      { id: 'topical', title: 'Targeted Topical & Biologic Plans', icon: '🧴', desc: 'Steroid-sparing agents, biologics for psoriasis/atopic eczema, and patch allergy testing.' }
    ]
  },
  ENT: {
    code: 'ENT',
    deptId: 'DEPT-ENT-01',
    name: 'Department of Otorhinolaryngology (ENT)',
    icon: '👂',
    color: '#0284c7',
    badge: 'Specialty Surgical',
    head: 'Dr. Gregory House, MD',
    wardCategory: 'GENERAL',
    description: 'Otology, rhinology, head & neck surgery, audiology, and endoscopic sinus procedures.',
    modules: [
      { id: 'audiometry', title: 'Audiogram & Tympanometry', icon: '📊', desc: 'Pure tone audiometry thresholds, air-bone gaps, and sensorineural vs conductive loss.' },
      { id: 'endoscopy', title: 'Flexible Nasopharyngoscopy', icon: '🔎', desc: 'Vocal cord mobility, airway patency, and sinus mucosal evaluation.' },
      { id: 'surgical', title: 'Surgical Interventions', icon: '🏥', desc: 'Tonsillectomy, FESS, tympanoplasty, and tracheostomy care protocols.' }
    ]
  },
  Ophthalmology: {
    code: 'Ophthalmology',
    deptId: 'DEPT-OPHT-01',
    name: 'Department of Ophthalmology & Visual Sciences',
    icon: '👁️',
    color: '#10b981',
    badge: 'Eye Care Center',
    head: 'Dr. Allison Cameron, MD',
    wardCategory: 'GENERAL',
    description: 'Comprehensive eye exams, cataract surgery, glaucoma management, and retina clinic.',
    modules: [
      { id: 'acuity', title: 'Visual Acuity & Refraction', icon: '👓', desc: 'Snellen visual acuity scores (OD/OS), pinhole improvement, and refractive error.' },
      { id: 'iop', title: 'Intraocular Pressure (Tonometry)', icon: '⏱️', desc: 'Goldmann applanation tonometry IOP measurements for glaucoma management.' },
      { id: 'retina', title: 'Fundoscopy & Retinal OCT', icon: '📸', desc: 'Diabetic retinopathy grading, macula thickness maps, and optic disc cup-to-disc ratios.' }
    ]
  }
};

window.renderDepartmentWorkspace = function(container, deptCode = null, tab = null) {
  if (deptCode && DEPARTMENT_CONFIGS[deptCode]) {
    selectedDepartmentCode = deptCode;
  }
  if (tab) {
    activeDeptTab = tab;
  }

  const store = window.hospitrackStore;
  const user = window.hospitrackAuth.getCurrentUser();
  const hospitalId = user?.hospitalId || 'HOSP-101';
  const hospital = store.getHospitalById(hospitalId) || { name: 'Hospital Facility', totalBeds: 250, availableBeds: 45 };
  
  const allPatients = store.getPatients(hospitalId) || [];
  const allDoctors = store.getDoctors(hospitalId) || [];
  const allReferrals = store.getReferrals(hospitalId) || [];
  const dept = DEPARTMENT_CONFIGS[selectedDepartmentCode] || DEPARTMENT_CONFIGS['Cardiology'];

  // Filter clinical entities associated with this department
  const deptPatients = allPatients.filter(p => 
    (p.department || '').toLowerCase() === dept.code.toLowerCase() || 
    (p.diagnosis && p.diagnosis.toLowerCase().includes(dept.code.toLowerCase()))
  );
  
  const deptDoctors = allDoctors.filter(d => 
    (d.specialty || '').toLowerCase().includes(dept.code.toLowerCase()) || 
    (d.department || '').toLowerCase() === dept.code.toLowerCase()
  );

  const deptReferrals = allReferrals.filter(r => 
    (r.department || '').toLowerCase() === dept.code.toLowerCase() ||
    (r.specialty || '').toLowerCase().includes(dept.code.toLowerCase())
  );

  // Bed metrics for this department's ward
  const totalDeptBeds = Math.max(12, Math.round((hospital.totalBeds || 100) * 0.15));
  const availableDeptBeds = Math.max(2, Math.round(totalDeptBeds - deptPatients.length));
  const occupiedDeptBeds = Math.max(0, totalDeptBeds - availableDeptBeds);

  container.innerHTML = `
    <!-- Department Workspace Header Banner -->
    <div class="workspace-banner" style="border-left: 4px solid ${dept.color};">
      <div class="banner-left">
        <span class="banner-greeting">${dept.icon} Clinical Department Workspace</span>
        <h1 class="banner-title">${escapeHtml(dept.name)}</h1>
        <p class="banner-subtitle">
          Dept ID: <strong>${escapeHtml(dept.deptId)}</strong> • Facility: <strong>${escapeHtml(hospital.name)}</strong> • Department Head: <strong>${escapeHtml(dept.head)}</strong>
        </p>
      </div>
      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <span class="badge badge-active" style="padding: 6px 12px; font-size: 0.8rem; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);">
          STATUS: OPERATIONAL
        </span>
        <button class="btn btn-secondary btn-sm" onclick="openCreateReferralModal()">
          <span>🔁</span> Request Referral
        </button>
      </div>
    </div>

    <!-- 12-Department Selector Grid -->
    <div class="glass-panel" style="padding: 0.85rem 1rem; margin-bottom: 1.25rem;">
      <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-dim); margin-bottom: 8px; letter-spacing: 0.5px;">
        Select Clinical Department
      </div>
      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        ${Object.keys(DEPARTMENT_CONFIGS).map(key => {
          const d = DEPARTMENT_CONFIGS[key];
          const isSelected = d.code === dept.code;
          return `
            <button type="button" class="btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}" 
                    style="${isSelected ? `background: ${d.color}; border-color: ${d.color}; color: #fff;` : 'font-size: 0.8rem;'}"
                    onclick="selectDepartmentView('${key}')">
              <span>${d.icon}</span> ${d.code}
            </button>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Department Navigation Tabs -->
    <div style="display: flex; gap: 8px; margin-bottom: 1.25rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px; overflow-x: auto;">
      <button class="btn btn-sm ${activeDeptTab === 'overview' ? 'btn-primary' : 'btn-secondary'}" onclick="setDeptTab('overview')">
        📋 Overview
      </button>
      <button class="btn btn-sm ${activeDeptTab === 'staff' ? 'btn-primary' : 'btn-secondary'}" onclick="setDeptTab('staff')">
        🩺 Staff (${deptDoctors.length})
      </button>
      <button class="btn btn-sm ${activeDeptTab === 'patients' ? 'btn-primary' : 'btn-secondary'}" onclick="setDeptTab('patients')">
        👤 Patients (${deptPatients.length})
      </button>
      <button class="btn btn-sm ${activeDeptTab === 'beds' ? 'btn-primary' : 'btn-secondary'}" onclick="setDeptTab('beds')">
        🛏️ Beds (${availableDeptBeds}/${totalDeptBeds})
      </button>
      <button class="btn btn-sm ${activeDeptTab === 'activity' ? 'btn-primary' : 'btn-secondary'}" onclick="setDeptTab('activity')">
        📊 Clinical Activity (${deptReferrals.length})
      </button>
    </div>

    <!-- Tab Content Area -->
    <div id="deptTabContent">
      ${renderDeptTabContent(dept, deptDoctors, deptPatients, deptReferrals, hospital, totalDeptBeds, availableDeptBeds, occupiedDeptBeds)}
    </div>
  `;
};

function renderDeptTabContent(dept, doctors, patients, referrals, hospital, totalBeds, availBeds, occBeds) {
  switch (activeDeptTab) {
    case 'staff':
      return `
        <div class="glass-panel" style="padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 10px;">
            <h3 style="margin: 0; font-size: 1.1rem; color: #fff;">Department Medical Staff (${doctors.length})</h3>
            <button class="btn btn-primary btn-sm" onclick="openAssignDoctorModal()">
              <span>+</span> Assign Doctor
            </button>
          </div>
          ${doctors.length === 0 ? `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
              <p>No doctors currently assigned specifically to ${escapeHtml(dept.name)}.</p>
              <button class="btn btn-secondary btn-sm" onclick="openAssignDoctorModal()">Assign Doctor Now</button>
            </div>
          ` : `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
              ${doctors.map(d => `
                <div class="glass-panel" style="padding: 1rem; border-top: 3px solid ${dept.color};">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                      <h4 style="margin: 0 0 4px 0; color: #fff; font-size: 0.95rem;">${escapeHtml(d.name)}</h4>
                      <div style="font-size: 0.8rem; color: var(--text-dim); font-family: monospace;">${escapeHtml(d.doctorId || d.id || '')}</div>
                      <div style="font-size: 0.82rem; color: var(--primary); margin-top: 4px;">${escapeHtml(d.specialty || d.department || dept.code)}</div>
                    </div>
                    <span class="badge ${d.status === 'ACTIVE' || d.status === 'AVAILABLE' ? 'badge-active' : 'badge-inactive'}" style="font-size: 0.7rem;">
                      ${escapeHtml(d.status || 'ACTIVE')}
                    </span>
                  </div>
                  <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.06); display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.78rem; color: var(--text-muted);">Exp: ${escapeHtml(d.experienceYears ? d.experienceYears + ' yrs' : 'Senior')}</span>
                    <a href="#hospital/workspace/doctor/${d.doctorId || d.id}" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 4px 8px;">
                      View Profile →
                    </a>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;

    case 'patients':
      return `
        <div class="glass-panel" style="padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 10px;">
            <h3 style="margin: 0; font-size: 1.1rem; color: #fff;">Department Inpatients (${patients.length})</h3>
            <button class="btn btn-primary btn-sm" onclick="openAdmitPatientModal()">
              <span>+</span> Admit Patient
            </button>
          </div>
          ${patients.length === 0 ? `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
              <p>No inpatients currently admitted under ${escapeHtml(dept.name)}.</p>
              <button class="btn btn-secondary btn-sm" onclick="openAdmitPatientModal()">Admit Patient</button>
            </div>
          ` : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Patient ID</th>
                    <th>Name</th>
                    <th>Gender/Age</th>
                    <th>Diagnosis</th>
                    <th>Ward / Bed</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${patients.map(p => `
                    <tr style="cursor: pointer;" onclick="window.location.hash = '#hospital/workspace/patient/${p.patientId || p.id}'">
                      <td style="font-family: monospace; font-weight: 600; color: var(--primary);">${escapeHtml(p.patientId || p.id)}</td>
                      <td style="font-weight: 600;">${escapeHtml(p.name)}</td>
                      <td>${escapeHtml(p.gender || '—')} / ${p.age || '—'}</td>
                      <td><span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">${escapeHtml(p.diagnosis || 'General')}</span></td>
                      <td>${escapeHtml(p.ward || dept.wardCategory || 'General')} - ${escapeHtml(p.bed || 'B-01')}</td>
                      <td><span class="badge ${p.status === 'ADMITTED' || p.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}">${escapeHtml(p.status || 'ADMITTED')}</span></td>
                      <td>
                        <a href="#hospital/workspace/patient/${p.patientId || p.id}" class="btn btn-secondary btn-sm" onclick="event.stopPropagation();">
                          Workspace
                        </a>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      `;

    case 'beds':
      return `
        <div class="glass-panel" style="padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="margin: 0; font-size: 1.1rem; color: #fff;">${escapeHtml(dept.name)} — Ward & Bed Capacity</h3>
            <a href="#hospital/ward-management" class="btn btn-secondary btn-sm">Ward &amp; Bed Capacity Panel →</a>
          </div>
          
          <div class="stats-grid" style="margin-bottom: 1.5rem;">
            <div class="stat-card" style="border-left: 3px solid var(--primary);">
              <div class="stat-header"><span class="stat-title">Total Allocated Beds</span><span class="stat-icon">🛏️</span></div>
              <div class="stat-value">${totalBeds}</div>
              <div class="stat-sub">Department ward allocation</div>
            </div>
            <div class="stat-card" style="border-left: 3px solid var(--success);">
              <div class="stat-header"><span class="stat-title">Available Beds</span><span class="stat-icon">✅</span></div>
              <div class="stat-value" style="color: var(--success);">${availBeds}</div>
              <div class="stat-sub">Ready for immediate intake</div>
            </div>
            <div class="stat-card" style="border-left: 3px solid #ef4444;">
              <div class="stat-header"><span class="stat-title">Occupied Beds</span><span class="stat-icon">👤</span></div>
              <div class="stat-value" style="color: #ef4444;">${occBeds}</div>
              <div class="stat-sub">Currently admitted patients</div>
            </div>
          </div>

          <div style="margin-top: 1rem;">
            <h4 style="color: var(--text-main); font-size: 0.95rem; margin-bottom: 10px;">Department Bed Bays Grid</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px;">
              ${Array.from({ length: totalBeds }).map((_, i) => {
                const isOccupied = i < occBeds;
                return `
                  <div style="padding: 10px; border-radius: 8px; text-align: center; background: ${isOccupied ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)'}; border: 1px solid ${isOccupied ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'};">
                    <div style="font-size: 1.1rem;">🛏️</div>
                    <div style="font-size: 0.78rem; font-weight: 700; color: #fff; margin-top: 2px;">BED-${String(i + 1).padStart(2, '0')}</div>
                    <div style="font-size: 0.68rem; color: ${isOccupied ? '#ef4444' : '#10b981'}; font-weight: 600; text-transform: uppercase;">
                      ${isOccupied ? 'Occupied' : 'Available'}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;

    case 'activity':
      return `
        <div class="glass-panel" style="padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="margin: 0; font-size: 1.1rem; color: #fff;">Department Clinical Consultations & Referrals</h3>
            <button class="btn btn-secondary btn-sm" onclick="openCreateReferralModal()">+ New Referral</button>
          </div>
          ${referrals.length === 0 ? `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
              <p>No active referrals or inter-facility consultations recorded for this department.</p>
            </div>
          ` : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Referral ID</th>
                    <th>Patient</th>
                    <th>Specialty / Dept</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  ${referrals.map(r => `
                    <tr>
                      <td style="font-family: monospace; color: var(--primary); font-weight: 600;">${escapeHtml(r.referralId || r.id)}</td>
                      <td>${escapeHtml(r.patientName || r.patientId || 'Patient')}</td>
                      <td>${escapeHtml(r.specialty || dept.code)}</td>
                      <td><span class="badge ${r.priority === 'CRITICAL' || r.priority === 'HIGH' ? 'badge-danger' : 'badge-info'}">${escapeHtml(r.priority || 'ROUTINE')}</span></td>
                      <td><span class="badge badge-active">${escapeHtml(r.status || 'PENDING')}</span></td>
                      <td>${escapeHtml(r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Today')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      `;

    case 'overview':
    default:
      return `
        <!-- Department KPI Stats -->
        <div class="stats-grid">
          <div class="stat-card" style="border-left: 3px solid ${dept.color};">
            <div class="stat-header">
              <span class="stat-title">Department Patients</span>
              <span class="stat-icon">👤</span>
            </div>
            <div class="stat-value" style="color: ${dept.color};">${patients.length}</div>
            <div class="stat-sub">Active in clinical pathway</div>
          </div>
          <div class="stat-card" style="border-left: 3px solid var(--doctor-color);">
            <div class="stat-header">
              <span class="stat-title">Attending Specialists</span>
              <span class="stat-icon">🩺</span>
            </div>
            <div class="stat-value">${doctors.length}</div>
            <div class="stat-sub">On active clinical duty</div>
          </div>
          <div class="stat-card" style="border-left: 3px solid var(--primary);">
            <div class="stat-header">
              <span class="stat-title">Ward Bed Capacity</span>
              <span class="stat-icon">🛏️</span>
            </div>
            <div class="stat-value">${availBeds} / ${totalBeds}</div>
            <div class="stat-sub">Available beds in ward</div>
          </div>
          <div class="stat-card" style="border-left: 3px solid var(--success);">
            <div class="stat-header">
              <span class="stat-title">Duplicate Safety Protocol</span>
              <span class="stat-icon">🛡️</span>
            </div>
            <div class="stat-value" style="font-size: 1.15rem; color: var(--success); font-weight: 700;">ACTIVE</div>
            <div class="stat-sub">Real-time cross-drug verification</div>
          </div>
        </div>

        <!-- Clinical Workstation Modules Grid -->
        <div style="margin-top: 1.5rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 8px;">
            <span>${dept.icon}</span> Standard Operating Clinical Modules
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
            ${escapeHtml(dept.description)}
          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">
            ${dept.modules.map(mod => `
              <div class="glass-panel" style="padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; border-top: 3px solid ${dept.color};">
                <div>
                  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <span style="font-size: 1.4rem;">${mod.icon}</span>
                    <h4 style="font-size: 0.98rem; font-weight: 700; color: var(--text-main); margin: 0;">${escapeHtml(mod.title)}</h4>
                  </div>
                  <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.45;">
                    ${escapeHtml(mod.desc)}
                  </p>
                </div>
                <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.06); display: flex; justify-content: space-between; align-items: center;">
                  <span class="badge badge-active" style="font-size: 0.72rem;">STATUS: OPERATIONAL</span>
                  <button class="btn btn-secondary btn-sm" onclick="handleDepartmentModuleAction('${dept.code}', '${mod.id}')">
                    Open Module
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
  }
}

window.selectDepartmentView = function(deptCode) {
  selectedDepartmentCode = deptCode;
  const container = document.getElementById('mainContentArea');
  if (container) {
    window.renderDepartmentWorkspace(container, deptCode, activeDeptTab);
  }
};

window.setDeptTab = function(tabName) {
  activeDeptTab = tabName;
  const container = document.getElementById('mainContentArea');
  if (container) {
    window.renderDepartmentWorkspace(container, selectedDepartmentCode, tabName);
  }
};

window.handleDepartmentModuleAction = function(deptCode, moduleId) {
  window.showToast(`${deptCode} → ${moduleId.toUpperCase()} module opened in clinical workspace.`, 'info');
};
