/**
 * Hospitrack — Environmental Services (EVS) Bed Turnover & Sanitization Pipeline
 * Enterprise Clinical Command Center & Conveyor Pipeline:
 * Stage 1: Vacated & Triage -> Stage 2: Housekeeper Sanitization -> Stage 3: Supervisory Quality Audit -> Stage 4: Certified Sterile Admissions.
 * 
 * Features:
 * - 4-Stage Clinical Stepper with real-time status telemetry
 * - Dual View Engine: Kanban Pipeline Board & Master EVS Roster Table
 * - Interactive Independent Per-Column Pagination (Board Mode)
 * - Enterprise Master Table Pagination with Page-Size Selector (Table Mode)
 * - Real-world SLA Progress Latency Indicators & Terminal Protocol Tracking
 * - Seamless integration with live backend API & interactive simulation engine
 */

(function () {
  'use strict';

  // In-memory demo & state persistence
  if (typeof window.__evsDemoActive === 'undefined') {
    window.__evsDemoActive = true; // Enabled by default for rich visual demonstration
  }
  if (!window.__evsWardFilter) {
    window.__evsWardFilter = 'ALL';
  }
  if (!window.__evsSearchQuery) {
    window.__evsSearchQuery = '';
  }
  if (!window.__evsViewMode) {
    window.__evsViewMode = 'kanban'; // 'kanban' | 'table'
  }
  if (!window.__evsColPages) {
    window.__evsColPages = { dirty: 1, cleaning: 1, inspect: 1, ready: 1 };
  }
  if (!window.__evsColPageSize) {
    window.__evsColPageSize = 4; // 4 cards per column page for optimal vertical height
  }
  if (!window.__evsTablePage) {
    window.__evsTablePage = 1;
  }
  if (!window.__evsTablePageSize) {
    window.__evsTablePageSize = 10;
  }

  // Pre-configured rich realistic simulation dataset across all 4 stages
  const DEFAULT_DEMO_BEDS = [
    // 1. Vacated & Dirty Queue (Stage 1)
    {
      id: 'DEMO-BED-ICU-04',
      bedNumber: 'ICU-04',
      wardName: 'Intensive Care Unit (ICU)',
      wardId: 'WARD-ICU',
      type: 'Critical Care Resuscitation Bed',
      status: 'DIRTY_PENDING_CLEANING',
      urgency: 'STAT Emergency',
      requiredProtocol: 'Terminal Disinfection & UV-C Sterilization',
      dischargedAgo: '12 mins ago',
      slaMinutes: 30,
      slaElapsedMinutes: 12,
      previousPatient: 'PAT-301 (Post-Extubation)',
      notes: 'Airborne isolation room. Chemical misting & high-level disinfection required before next intake.'
    },
    {
      id: 'DEMO-BED-EMG-02',
      bedNumber: 'EMG-02',
      wardName: 'Emergency Trauma Triage',
      wardId: 'WARD-EMG',
      type: 'Acute Trauma Gurney',
      status: 'DIRTY_PENDING_CLEANING',
      urgency: 'High Priority',
      requiredProtocol: 'Bloodborne Pathogen Protocol',
      dischargedAgo: '18 mins ago',
      slaMinutes: 25,
      slaElapsedMinutes: 18,
      previousPatient: 'PAT-309 (Trauma Transfer)',
      notes: 'Rapid turnover needed for incoming multi-vehicle accident transfer (ETA 14 mins).'
    },
    {
      id: 'DEMO-BED-GEN-14',
      bedNumber: 'GEN-14',
      wardName: 'General Inpatient Ward',
      wardId: 'WARD-GEN',
      type: 'Electric Inpatient Bed',
      status: 'DIRTY_PENDING_CLEANING',
      urgency: 'Standard Turnover',
      requiredProtocol: 'Standard Terminal Inpatient Clean',
      dischargedAgo: '32 mins ago',
      slaMinutes: 45,
      slaElapsedMinutes: 32,
      previousPatient: 'PAT-304 (Discharged Home)',
      notes: 'Routine discharge sanitization, mattress inspection, and sterile linen replacement.'
    },
    {
      id: 'DEMO-BED-CARD-05',
      bedNumber: 'CARD-05',
      wardName: 'Cardiology Step-Down',
      wardId: 'WARD-CARD',
      type: 'Telemetry Monitored Bed',
      status: 'DIRTY_PENDING_CLEANING',
      urgency: 'High Priority',
      requiredProtocol: 'Cardiac Telemetry Disinfection',
      dischargedAgo: '8 mins ago',
      slaMinutes: 35,
      slaElapsedMinutes: 8,
      previousPatient: 'PAT-289 (Step-Down Transfer)',
      notes: 'Clean telemetry leads, replace pressure-relief mattress cover.'
    },
    {
      id: 'DEMO-BED-PED-07',
      bedNumber: 'PED-07',
      wardName: 'Pediatric Care Unit',
      wardId: 'WARD-PED',
      type: 'Pediatric Crib Bed',
      status: 'DIRTY_PENDING_CLEANING',
      urgency: 'Standard Turnover',
      requiredProtocol: 'Pediatric Eco-Sterile Protocol',
      dischargedAgo: '24 mins ago',
      slaMinutes: 40,
      slaElapsedMinutes: 24,
      previousPatient: 'PAT-342 (Pediatric Outpatient)',
      notes: 'Hypoallergenic sanitization only. Disinfect safety side-rails.'
    },
    {
      id: 'DEMO-BED-SURG-03',
      bedNumber: 'SURG-03',
      wardName: 'Post-Surgical Recovery (PACU)',
      wardId: 'WARD-SURG',
      type: 'Post-Op Surgical Bed',
      status: 'DIRTY_PENDING_CLEANING',
      urgency: 'STAT Emergency',
      requiredProtocol: 'Sterile Surgical Turnover',
      dischargedAgo: '6 mins ago',
      slaMinutes: 30,
      slaElapsedMinutes: 6,
      previousPatient: 'PAT-351 (OR Recovery Transferred)',
      notes: 'PACU bed needed for incoming open-heart post-op case.'
    },

    // 2. Cleaning Active Queue (Stage 2)
    {
      id: 'DEMO-BED-ICU-01',
      bedNumber: 'ICU-01',
      wardName: 'Intensive Care Unit (ICU)',
      wardId: 'WARD-ICU',
      type: 'Critical Care Bed',
      status: 'CLEANING_IN_PROGRESS',
      urgency: 'STAT Emergency',
      evsStaffName: 'Ramesh Kumar (Zone 1 Lead)',
      evsProtocol: 'Airborne Contact Isolation Protocol',
      cleaningElapsed: '18 mins in progress',
      slaMinutes: 30,
      slaElapsedMinutes: 18,
      notes: 'HEPA negative pressure scrub & hydrogen peroxide vapor cycle active.'
    },
    {
      id: 'DEMO-BED-PED-03',
      bedNumber: 'PED-03',
      wardName: 'Pediatric Care Unit',
      wardId: 'WARD-PED',
      type: 'Pediatric Safety Bed',
      status: 'CLEANING_IN_PROGRESS',
      urgency: 'Standard Turnover',
      evsStaffName: 'Pooja Verma (Housekeeping Senior)',
      evsProtocol: 'Pediatric Eco-Sterile Protocol',
      cleaningElapsed: '12 mins in progress',
      slaMinutes: 35,
      slaElapsedMinutes: 12,
      notes: 'Non-toxic antimicrobial surface treatment and pediatric crib disinfection.'
    },
    {
      id: 'DEMO-BED-EMG-06',
      bedNumber: 'EMG-06',
      wardName: 'Emergency Trauma Triage',
      wardId: 'WARD-EMG',
      type: 'Rapid Triage Stretcher',
      status: 'CLEANING_IN_PROGRESS',
      urgency: 'High Priority',
      evsStaffName: 'Amit Sharma (Biomed Tech)',
      evsProtocol: 'Rapid Terminal Disinfection',
      cleaningElapsed: '9 mins in progress',
      slaMinutes: 20,
      slaElapsedMinutes: 9,
      notes: 'Blood spill protocol complete. Final bleach wash in progress.'
    },
    {
      id: 'DEMO-BED-GEN-04',
      bedNumber: 'GEN-04',
      wardName: 'General Inpatient Ward',
      wardId: 'WARD-GEN',
      type: 'Standard Hospital Bed',
      status: 'CLEANING_IN_PROGRESS',
      urgency: 'Standard Turnover',
      evsStaffName: 'Suman Devi (Terminal Sanitation Lead)',
      evsProtocol: 'Standard Terminal Inpatient Clean',
      cleaningElapsed: '22 mins in progress',
      slaMinutes: 35,
      slaElapsedMinutes: 22,
      notes: 'Terminal wipe-down 80% complete; linen cart arriving.'
    },
    {
      id: 'DEMO-BED-CARD-01',
      bedNumber: 'CARD-01',
      wardName: 'Cardiology Step-Down',
      wardId: 'WARD-CARD',
      type: 'Telemetry Bed',
      status: 'CLEANING_IN_PROGRESS',
      urgency: 'High Priority',
      evsStaffName: 'Vikram Joshi (EVS Specialist)',
      evsProtocol: 'Terminal Disinfection & UV-C',
      cleaningElapsed: '14 mins in progress',
      slaMinutes: 30,
      slaElapsedMinutes: 14,
      notes: 'UV-C emitter robot deployed in chamber (10 min cycle).'
    },

    // 3. Ready for Clinical Inspection (Stage 3)
    {
      id: 'DEMO-BED-CARD-02',
      bedNumber: 'CARD-02',
      wardName: 'Cardiology Step-Down',
      wardId: 'WARD-CARD',
      type: 'Telemetry Monitored Bed',
      status: 'READY_FOR_INSPECTION',
      urgency: 'High Priority',
      evsStaffName: 'Suman Devi (Terminal Sanitation Lead)',
      evsProtocol: 'Terminal Disinfection & UV-C',
      evsTurnaroundMinutes: 24,
      atpReading: '7 RLU (Passed)',
      notes: 'ATP bioluminescence swab tested <10 RLU (Passed). Awaiting Charge Nurse certification.'
    },
    {
      id: 'DEMO-BED-GEN-08',
      bedNumber: 'GEN-08',
      wardName: 'General Inpatient Ward',
      wardId: 'WARD-GEN',
      type: 'Standard Hospital Bed',
      status: 'READY_FOR_INSPECTION',
      urgency: 'Standard Turnover',
      evsStaffName: 'Amit Sharma (Biomed Tech)',
      evsProtocol: 'Standard Inpatient Bed Turnover',
      evsTurnaroundMinutes: 21,
      atpReading: '11 RLU (Passed)',
      notes: 'Full wipe-down complete. New sanitized linen fitted; oxygen port caps sealed.'
    },
    {
      id: 'DEMO-BED-ICU-06',
      bedNumber: 'ICU-06',
      wardName: 'Intensive Care Unit (ICU)',
      wardId: 'WARD-ICU',
      type: 'Critical Care Bed',
      status: 'READY_FOR_INSPECTION',
      urgency: 'STAT Emergency',
      evsStaffName: 'Ramesh Kumar (Zone 1 Lead)',
      evsProtocol: 'Terminal Disinfection & UV-C Sterilization',
      evsTurnaroundMinutes: 28,
      atpReading: '4 RLU (Ultra Sterile)',
      notes: 'ICU Charge Nurse audit required for ECMO candidate admission.'
    },
    {
      id: 'DEMO-BED-SURG-01',
      bedNumber: 'SURG-01',
      wardName: 'Post-Surgical Recovery (PACU)',
      wardId: 'WARD-SURG',
      type: 'Surgical Recovery Bed',
      status: 'READY_FOR_INSPECTION',
      urgency: 'High Priority',
      evsStaffName: 'Pooja Verma (Housekeeping Senior)',
      evsProtocol: 'Surgical Suite Terminal Protocol',
      evsTurnaroundMinutes: 19,
      atpReading: '6 RLU (Passed)',
      notes: 'All cords sealed, high-touch monitors sanitized.'
    },
    {
      id: 'DEMO-BED-PED-01',
      bedNumber: 'PED-01',
      wardName: 'Pediatric Care Unit',
      wardId: 'WARD-PED',
      type: 'Pediatric Safety Bed',
      status: 'READY_FOR_INSPECTION',
      urgency: 'Standard Turnover',
      evsStaffName: 'Vikram Joshi (EVS Specialist)',
      evsProtocol: 'Pediatric Eco-Sterile Protocol',
      evsTurnaroundMinutes: 23,
      atpReading: '8 RLU (Passed)',
      notes: 'Crib rails sanitized with hospital-grade green biocide.'
    },

    // 4. Certified Available & Sterile Pool (Stage 4)
    {
      id: 'DEMO-BED-ICU-02',
      bedNumber: 'ICU-02',
      wardName: 'Intensive Care Unit (ICU)',
      wardId: 'WARD-ICU',
      type: 'Critical Care Resuscitation Bed',
      status: 'AVAILABLE',
      sanitationGrade: 'Level 4 Hospital Sterile (UV-C Certified)',
      certifiedBy: 'Charge Nurse Sunita',
      certifiedAgo: '15 mins ago'
    },
    {
      id: 'DEMO-BED-ICU-03',
      bedNumber: 'ICU-03',
      wardName: 'Intensive Care Unit (ICU)',
      wardId: 'WARD-ICU',
      type: 'Critical Care Bed',
      status: 'AVAILABLE',
      sanitationGrade: 'Level 4 Hospital Sterile',
      certifiedBy: 'Supervisor Anjali Nair',
      certifiedAgo: '35 mins ago'
    },
    {
      id: 'DEMO-BED-EMG-01',
      bedNumber: 'EMG-01',
      wardName: 'Emergency Trauma Triage',
      wardId: 'WARD-EMG',
      type: 'Acute Trauma Gurney',
      status: 'AVAILABLE',
      sanitationGrade: 'Trauma Rapid Sterile Certified',
      certifiedBy: 'Triage Lead Dr. Roy',
      certifiedAgo: '8 mins ago'
    },
    {
      id: 'DEMO-BED-EMG-03',
      bedNumber: 'EMG-03',
      wardName: 'Emergency Trauma Triage',
      wardId: 'WARD-EMG',
      type: 'Acute Trauma Gurney',
      status: 'AVAILABLE',
      sanitationGrade: 'Trauma Rapid Sterile Certified',
      certifiedBy: 'Triage Lead Dr. Roy',
      certifiedAgo: '42 mins ago'
    },
    {
      id: 'DEMO-BED-GEN-01',
      bedNumber: 'GEN-01',
      wardName: 'General Inpatient Ward',
      wardId: 'WARD-GEN',
      type: 'Standard Hospital Bed',
      status: 'AVAILABLE',
      sanitationGrade: 'Inpatient Terminal Sterile',
      certifiedBy: 'Nurse Ritu Sharma',
      certifiedAgo: '50 mins ago'
    },
    {
      id: 'DEMO-BED-GEN-02',
      bedNumber: 'GEN-02',
      wardName: 'General Inpatient Ward',
      wardId: 'WARD-GEN',
      type: 'Standard Hospital Bed',
      status: 'AVAILABLE',
      sanitationGrade: 'Inpatient Terminal Sterile',
      certifiedBy: 'Nurse Ritu Sharma',
      certifiedAgo: '1 hr ago'
    },
    {
      id: 'DEMO-BED-GEN-03',
      bedNumber: 'GEN-03',
      wardName: 'General Inpatient Ward',
      wardId: 'WARD-GEN',
      type: 'Electric Inpatient Bed',
      status: 'AVAILABLE',
      sanitationGrade: 'Inpatient Terminal Sterile',
      certifiedBy: 'Supervisor Anjali Nair',
      certifiedAgo: '1.5 hrs ago'
    },
    {
      id: 'DEMO-BED-CARD-03',
      bedNumber: 'CARD-03',
      wardName: 'Cardiology Step-Down',
      wardId: 'WARD-CARD',
      type: 'Telemetry Bed',
      status: 'AVAILABLE',
      sanitationGrade: 'Cardiac Certified Sterile',
      certifiedBy: 'Charge Nurse Sunita',
      certifiedAgo: '22 mins ago'
    },
    {
      id: 'DEMO-BED-CARD-04',
      bedNumber: 'CARD-04',
      wardName: 'Cardiology Step-Down',
      wardId: 'WARD-CARD',
      type: 'Telemetry Bed',
      status: 'AVAILABLE',
      sanitationGrade: 'Cardiac Certified Sterile',
      certifiedBy: 'Charge Nurse Sunita',
      certifiedAgo: '1.2 hrs ago'
    },
    {
      id: 'DEMO-BED-PED-02',
      bedNumber: 'PED-02',
      wardName: 'Pediatric Care Unit',
      wardId: 'WARD-PED',
      type: 'Pediatric Safety Bed',
      status: 'AVAILABLE',
      sanitationGrade: 'Pediatric Eco-Sterile Certified',
      certifiedBy: 'Nurse Vandana',
      certifiedAgo: '45 mins ago'
    },
    {
      id: 'DEMO-BED-PED-04',
      bedNumber: 'PED-04',
      wardName: 'Pediatric Care Unit',
      wardId: 'WARD-PED',
      type: 'Pediatric Safety Bed',
      status: 'AVAILABLE',
      sanitationGrade: 'Pediatric Eco-Sterile Certified',
      certifiedBy: 'Nurse Vandana',
      certifiedAgo: '2 hrs ago'
    },
    {
      id: 'DEMO-BED-SURG-02',
      bedNumber: 'SURG-02',
      wardName: 'Post-Surgical Recovery (PACU)',
      wardId: 'WARD-SURG',
      type: 'Surgical Recovery Bed',
      status: 'AVAILABLE',
      sanitationGrade: 'PACU Sterile Certified',
      certifiedBy: 'PACU Supervisor George',
      certifiedAgo: '30 mins ago'
    }
  ];

  if (!window.__evsDemoBeds) {
    window.__evsDemoBeds = JSON.parse(JSON.stringify(DEFAULT_DEMO_BEDS));
  }

  window.EvsBedManager = {
    /**
     * Render the Full Interactive EVS Turnover Command Center
     */
    renderTurnoverBoard: async function (container, hospitalId) {
      if (!container) return;
      if (typeof container === 'string') {
        container = document.getElementById(container);
      }
      if (!container) return;

      const store = window.hospitrackStore;
      const hospId = hospitalId || (window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser()?.hospitalId : 'HOSP-101') || 'HOSP-101';

      container.innerHTML = `
        <div class="card p-32 text-center" style="background: var(--bg-surface, #ffffff); border-radius: 16px; border: 1px solid var(--border-color, #e2e8f0); box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <div class="spinner-lg mb-16" style="margin: 0 auto;"></div>
          <h3 style="font-size: 1.15rem; color: var(--text-main, #0f172a); margin-bottom: 6px; font-weight: 700;">Connecting EVS Command Center...</h3>
          <p style="color: var(--text-secondary, #64748b); font-size: 0.88rem;">Synchronizing real-time terminal disinfection pipelines, housekeeper telemetry and bed turnover latency...</p>
        </div>
      `;

      let summary = null;
      let rawBeds = [];

      try {
        if (store && typeof store.getEvsTurnoverSummary === 'function') {
          summary = await store.getEvsTurnoverSummary(hospId);
        }
        if (store && typeof store.getHospitalBeds === 'function') {
          rawBeds = await store.getHospitalBeds(hospId);
        } else if (store && typeof store.getBeds === 'function') {
          rawBeds = await store.getBeds(hospId);
        }
      } catch (err) {
        console.warn('Failed to load live EVS data:', err.message);
        if (store && typeof store.getBeds === 'function') {
          try { rawBeds = await store.getBeds(hospId); } catch (_) { rawBeds = []; }
        }
      }

      if (!Array.isArray(rawBeds)) {
        rawBeds = [];
      }

      // Group live beds into the 4 Pipeline Columns
      const liveDirty = [];
      const liveCleaning = [];
      const liveInspection = [];
      const liveAvailable = [];

      rawBeds.forEach(b => {
        const s = (b.status || 'AVAILABLE').toUpperCase();
        const reason = (b.maintenanceReason || '').toLowerCase();

        if (s === 'DIRTY_PENDING_CLEANING' || s === 'DIRTY' || (s === 'MAINTENANCE' && !reason.includes('hardware_repair') && !reason.includes('broken'))) {
          liveDirty.push(b);
        } else if (s === 'CLEANING_IN_PROGRESS' || s === 'CLEANING') {
          liveCleaning.push(b);
        } else if (s === 'READY_FOR_INSPECTION' || s === 'INSPECTED') {
          liveInspection.push(b);
        } else if (s === 'AVAILABLE') {
          liveAvailable.push(b);
        }
      });

      // If live facility has 0 turnover beds or demo mode is active, include demo simulation beds
      let allBeds = [...rawBeds];
      const hasLiveTurnover = liveDirty.length > 0 || liveCleaning.length > 0 || liveInspection.length > 0;

      if ((window.__evsDemoActive || !hasLiveTurnover) && window.__evsDemoBeds && window.__evsDemoBeds.length > 0) {
        const liveIds = new Set(rawBeds.map(b => b.id));
        const demoBedsToInclude = window.__evsDemoBeds.filter(b => !liveIds.has(b.id));
        allBeds = [...rawBeds, ...demoBedsToInclude];
      }

      // Apply Ward Filter & Search Query
      const wardFilter = window.__evsWardFilter || 'ALL';
      const searchQuery = (window.__evsSearchQuery || '').toLowerCase().trim();

      const filteredBeds = allBeds.filter(b => {
        if (wardFilter !== 'ALL') {
          const w = (b.wardName || b.wardId || '').toUpperCase();
          if (!w.includes(wardFilter.toUpperCase())) return false;
        }
        if (searchQuery) {
          const num = (b.bedNumber || '').toLowerCase();
          const ward = (b.wardName || '').toLowerCase();
          const type = (b.type || '').toLowerCase();
          const id = (b.id || '').toLowerCase();
          const staff = (b.evsStaffName || '').toLowerCase();
          const proto = (b.evsProtocol || b.requiredProtocol || '').toLowerCase();
          if (!num.includes(searchQuery) && !ward.includes(searchQuery) && !type.includes(searchQuery) && !id.includes(searchQuery) && !staff.includes(searchQuery) && !proto.includes(searchQuery)) {
            return false;
          }
        }
        return true;
      });

      // Group beds into the 4 Pipeline Columns
      const dirtyBeds = [];
      const cleaningBeds = [];
      const inspectionBeds = [];
      const availableBeds = [];

      filteredBeds.forEach(b => {
        const s = (b.status || 'AVAILABLE').toUpperCase();
        const reason = (b.maintenanceReason || '').toLowerCase();

        if (s === 'DIRTY_PENDING_CLEANING' || s === 'DIRTY' || (s === 'MAINTENANCE' && !reason.includes('hardware_repair') && !reason.includes('broken'))) {
          dirtyBeds.push(b);
        } else if (s === 'CLEANING_IN_PROGRESS' || s === 'CLEANING') {
          cleaningBeds.push(b);
        } else if (s === 'READY_FOR_INSPECTION' || s === 'INSPECTED') {
          inspectionBeds.push(b);
        } else if (s === 'AVAILABLE') {
          availableBeds.push(b);
        }
      });

      const totalActivePipeline = dirtyBeds.length + cleaningBeds.length + inspectionBeds.length;
      const totalAllInventory = filteredBeds.length;
      const avgTat = (summary && summary.averageTurnaroundMinutes) ? summary.averageTurnaroundMinutes : 24.5;
      const viewMode = window.__evsViewMode || 'kanban';

      // Safe Per-Column Pagination Calculations (Kanban View)
      const pageSize = window.__evsColPageSize || 4;
      const pages = window.__evsColPages;

      const totalDirtyPages = Math.max(1, Math.ceil(dirtyBeds.length / pageSize));
      const totalCleaningPages = Math.max(1, Math.ceil(cleaningBeds.length / pageSize));
      const totalInspectPages = Math.max(1, Math.ceil(inspectionBeds.length / pageSize));
      const totalReadyPages = Math.max(1, Math.ceil(availableBeds.length / pageSize));

      pages.dirty = Math.min(Math.max(1, pages.dirty || 1), totalDirtyPages);
      pages.cleaning = Math.min(Math.max(1, pages.cleaning || 1), totalCleaningPages);
      pages.inspect = Math.min(Math.max(1, pages.inspect || 1), totalInspectPages);
      pages.ready = Math.min(Math.max(1, pages.ready || 1), totalReadyPages);

      const pagedDirtyBeds = dirtyBeds.slice((pages.dirty - 1) * pageSize, pages.dirty * pageSize);
      const pagedCleaningBeds = cleaningBeds.slice((pages.cleaning - 1) * pageSize, pages.cleaning * pageSize);
      const pagedInspectionBeds = inspectionBeds.slice((pages.inspect - 1) * pageSize, pages.inspect * pageSize);
      const pagedAvailableBeds = availableBeds.slice((pages.ready - 1) * pageSize, pages.ready * pageSize);

      // Master Table Pagination Calculations (Table View)
      const tablePageSize = window.__evsTablePageSize || 10;
      const totalTablePages = Math.max(1, Math.ceil(filteredBeds.length / tablePageSize));
      let currentTablePage = Math.min(Math.max(1, window.__evsTablePage || 1), totalTablePages);
      window.__evsTablePage = currentTablePage;
      const pagedTableBeds = filteredBeds.slice((currentTablePage - 1) * tablePageSize, currentTablePage * tablePageSize);

      container.innerHTML = `
        <div id="evsTurnoverContainer" class="evs-turnover-wrapper">
          
          <!-- EVS Command Center Header & Controls -->
          <div class="evs-header-container">
            <div class="evs-header-title-wrap">
              <div class="d-flex-align gap-12">
                <div class="evs-brand-icon">🧹</div>
                <div>
                  <div class="d-flex-align gap-8 mb-4">
                    <span class="evs-header-badge">Clinical Operations Subsystem</span>
                    <span class="badge ${window.__evsDemoActive ? 'badge-info' : 'badge-success'}">
                      ${window.__evsDemoActive ? '⚡ Interactive Simulation Mode' : '● Live Facility Inventory'}
                    </span>
                    <span class="badge badge-neutral" style="font-size: 0.72rem; letter-spacing: 0.3px;">
                      ${totalActivePipeline} In Turnover Conveyor
                    </span>
                  </div>
                  <h2 class="evs-header-title">Environmental Services (EVS) Bed Turnover Operations</h2>
                  <p class="evs-header-subtitle">Real-time room sanitization, terminal UV-C tracking, housekeeper dispatch, and rapid bed turnover latency management.</p>
                </div>
              </div>
            </div>

            <div class="evs-header-actions">
              <div class="evs-view-switcher" role="group" aria-label="View Switcher">
                <button type="button" class="evs-view-btn ${viewMode === 'kanban' ? 'active' : ''}" onclick="window.EvsBedManager.setViewMode('kanban', '${hospId}')" title="Interactive 4-Stage Kanban Pipeline Board">
                  <span>📊 Kanban Pipeline</span>
                </button>
                <button type="button" class="evs-view-btn ${viewMode === 'table' ? 'active' : ''}" onclick="window.EvsBedManager.setViewMode('table', '${hospId}')" title="Master Turnover Directory & Roster Table">
                  <span>📋 Master Roster Table</span>
                </button>
              </div>

              <button type="button" class="btn btn-sm ${window.__evsDemoActive ? 'btn-outline-primary' : 'btn-primary'}" onclick="window.EvsBedManager.toggleDemoMode('${hospId}')" title="Toggle realistic demo simulation dataset">
                <span>${window.__evsDemoActive ? '🔄 Switch to Live Facility' : '🧪 Load Simulation'}</span>
              </button>

              <button type="button" class="btn btn-sm btn-outline-danger" onclick="window.EvsBedManager.simulatePatientDischarge('${hospId}')" title="Discharge an inpatient to watch their bed transition into the EVS queue live">
                <span>⚡ Simulate Discharge</span>
              </button>

              <button type="button" class="btn btn-sm btn-secondary" onclick="window.EvsBedManager.refresh('${hospId}')" title="Refresh live telemetry">
                <span>🔄 Refresh</span>
              </button>
            </div>
          </div>

          <!-- REAL-WORLD CLINICAL EVS STEPPER (FLOW CONVEYOR) -->
          <div class="evs-flow-stepper-card">
            <div class="evs-stepper-header">
              <div class="d-flex-align gap-8">
                <span class="stepper-lead-icon">🔄</span>
                <div>
                  <h4 class="stepper-title">Clinical Terminal Disinfection Conveyor Flow</h4>
                  <p class="stepper-sub">Authoritative hospital chain of custody: Bed Vacation ➔ Chemical Scrub ➔ Quality Audit ➔ Sterile Admission</p>
                </div>
              </div>
              <div class="stepper-legend">
                <span class="stepper-sla-pill">Target Cycle: &lt; 45 mins</span>
              </div>
            </div>

            <div class="evs-flow-stepper-track">
              <!-- Step 1 -->
              <div class="evs-flow-step step-1 ${dirtyBeds.length > 0 ? 'step-active' : ''}">
                <div class="step-badge-circle">1</div>
                <div class="step-content">
                  <div class="step-label">Stage 1: Vacated &amp; Triage</div>
                  <div class="step-desc">Biohazard triage &amp; protocol match</div>
                  <div class="step-meta">
                    <span class="step-count-pill pill-rose">${dirtyBeds.length} Beds</span>
                    <span class="step-target">SLA: &lt; 10m</span>
                  </div>
                </div>
                <div class="step-chevron">➔</div>
              </div>

              <!-- Step 2 -->
              <div class="evs-flow-step step-2 ${cleaningBeds.length > 0 ? 'step-active' : ''}">
                <div class="step-badge-circle">2</div>
                <div class="step-content">
                  <div class="step-label">Stage 2: Sanitization Active</div>
                  <div class="step-desc">Housekeeper chemical &amp; UV-C cycles</div>
                  <div class="step-meta">
                    <span class="step-count-pill pill-amber">${cleaningBeds.length} Active</span>
                    <span class="step-target">SLA: 20-30m</span>
                  </div>
                </div>
                <div class="step-chevron">➔</div>
              </div>

              <!-- Step 3 -->
              <div class="evs-flow-step step-3 ${inspectionBeds.length > 0 ? 'step-active' : ''}">
                <div class="step-badge-circle">3</div>
                <div class="step-content">
                  <div class="step-label">Stage 3: Supervisory Audit</div>
                  <div class="step-desc">ATP bioluminescence &amp; nurse release</div>
                  <div class="step-meta">
                    <span class="step-count-pill pill-purple">${inspectionBeds.length} Inspect</span>
                    <span class="step-target">SLA: &lt; 10m</span>
                  </div>
                </div>
                <div class="step-chevron">➔</div>
              </div>

              <!-- Step 4 -->
              <div class="evs-flow-step step-4 ${availableBeds.length > 0 ? 'step-active' : ''}">
                <div class="step-badge-circle">4</div>
                <div class="step-content">
                  <div class="step-label">Stage 4: Certified Sterile</div>
                  <div class="step-desc">Instant inpatient admission assignment</div>
                  <div class="step-meta">
                    <span class="step-count-pill pill-emerald">${availableBeds.length} Ready</span>
                    <span class="step-target">Turnover Complete</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 4-Card EVS Operational Metric Deck -->
          <div class="evs-kpi-grid">
            <div class="evs-kpi-card accent-rose">
              <div class="evs-kpi-top">
                <span class="evs-kpi-label">Vacated &amp; Dirty</span>
                <span class="evs-kpi-icon">⚠️</span>
              </div>
              <div class="evs-kpi-val" style="color: #e11d48;">${dirtyBeds.length}</div>
              <div class="evs-kpi-sub">Awaiting housekeeper dispatch</div>
            </div>

            <div class="evs-kpi-card accent-amber">
              <div class="evs-kpi-top">
                <span class="evs-kpi-label">Active Sanitization</span>
                <span class="evs-kpi-icon">🧴</span>
              </div>
              <div class="evs-kpi-val" style="color: #d97706;">${cleaningBeds.length}</div>
              <div class="evs-kpi-sub">Chemical &amp; UV-C cycles active</div>
            </div>

            <div class="evs-kpi-card accent-purple">
              <div class="evs-kpi-top">
                <span class="evs-kpi-label">Awaiting Sign-off</span>
                <span class="evs-kpi-icon">🔍</span>
              </div>
              <div class="evs-kpi-val" style="color: #7c3aed;">${inspectionBeds.length}</div>
              <div class="evs-kpi-sub">Ready for nurse / ATP inspection</div>
            </div>

            <div class="evs-kpi-card accent-emerald">
              <div class="evs-kpi-top">
                <span class="evs-kpi-label">Avg Turnaround Latency</span>
                <span class="evs-kpi-icon">⏱️</span>
              </div>
              <div class="evs-kpi-val" style="color: #059669;">${avgTat} <span style="font-size: 0.9rem; font-weight: 500; color: #64748b;">mins</span></div>
              <div class="evs-kpi-sub">Standard: &lt; 35m • Efficiency: Optimal</div>
            </div>
          </div>

          <!-- Filter & Search Toolbar -->
          <div class="evs-filter-toolbar">
            <div class="evs-ward-filters">
              <span class="text-xs-muted mr-6 font-semibold uppercase">Ward / Dept:</span>
              <button type="button" class="evs-filter-pill ${wardFilter === 'ALL' ? 'active' : ''}" onclick="window.EvsBedManager.setWardFilter('ALL', '${hospId}')">All Wards (${totalAllInventory})</button>
              <button type="button" class="evs-filter-pill ${wardFilter === 'ICU' ? 'active' : ''}" onclick="window.EvsBedManager.setWardFilter('ICU', '${hospId}')">ICU / Critical</button>
              <button type="button" class="evs-filter-pill ${wardFilter === 'EMG' || wardFilter === 'EMERGENCY' ? 'active' : ''}" onclick="window.EvsBedManager.setWardFilter('EMG', '${hospId}')">Emergency</button>
              <button type="button" class="evs-filter-pill ${wardFilter === 'GEN' || wardFilter === 'GENERAL' ? 'active' : ''}" onclick="window.EvsBedManager.setWardFilter('GEN', '${hospId}')">General Ward</button>
              <button type="button" class="evs-filter-pill ${wardFilter === 'CARD' || wardFilter === 'CARDIOLOGY' ? 'active' : ''}" onclick="window.EvsBedManager.setWardFilter('CARD', '${hospId}')">Cardiology</button>
              <button type="button" class="evs-filter-pill ${wardFilter === 'PED' || wardFilter === 'PEDIATRICS' ? 'active' : ''}" onclick="window.EvsBedManager.setWardFilter('PED', '${hospId}')">Pediatrics</button>
              <button type="button" class="evs-filter-pill ${wardFilter === 'SURG' || wardFilter === 'SURGERY' ? 'active' : ''}" onclick="window.EvsBedManager.setWardFilter('SURG', '${hospId}')">PACU / Surgical</button>
            </div>

            <div class="evs-search-box">
              <span class="search-icon">🔍</span>
              <input 
                type="text" 
                class="form-control form-control-sm" 
                placeholder="Search bed, ward, staff, protocol..." 
                value="${window.escapeHtml(window.__evsSearchQuery || '')}"
                oninput="window.EvsBedManager.setSearchQuery(this.value, '${hospId}')"
              >
              ${window.__evsSearchQuery ? `
                <button type="button" class="clear-search-btn" onclick="window.EvsBedManager.setSearchQuery('', '${hospId}')">✕</button>
              ` : ''}
            </div>
          </div>

          <!-- VIEW MODE 1: 4-STAGE INTERACTIVE KANBAN PIPELINE -->
          ${viewMode === 'kanban' ? `
            <div class="evs-kanban-board">

              <!-- Stage 1: Vacated & Dirty Queue -->
              <div class="evs-kanban-column column-dirty">
                <div class="evs-col-header">
                  <div class="evs-col-title-wrap">
                    <div class="evs-col-title">
                      <span class="pulse-dot pulse-dirty"></span>
                      <span>1. Vacated &amp; Dirty</span>
                    </div>
                    <span class="evs-col-count count-dirty">${dirtyBeds.length}</span>
                  </div>
                  <p class="evs-col-sub">Needs biohazard triage &amp; EVS dispatch</p>
                </div>

                <div class="evs-column-body">
                  ${pagedDirtyBeds.length ? pagedDirtyBeds.map(b => window.EvsBedManager.renderDirtyCard(b, hospId)).join('') : `
                    <div class="evs-empty-col">
                      <span>✨</span>
                      <p><strong>Zero Dirty Beds Queued</strong></p>
                      <p class="text-xs-muted mt-4">All vacated rooms have been dispatched to housekeeping teams.</p>
                      <button type="button" class="btn btn-xs btn-outline-danger mt-12" onclick="window.EvsBedManager.simulatePatientDischarge('${hospId}')">
                        ⚡ Simulate Discharge
                      </button>
                    </div>
                  `}
                </div>

                <!-- Column 1 Pagination -->
                ${dirtyBeds.length > 0 ? `
                  <div class="evs-col-pagination">
                    <div class="evs-col-page-info">
                      Showing ${(pages.dirty - 1) * pageSize + 1}–${Math.min(pages.dirty * pageSize, dirtyBeds.length)} of ${dirtyBeds.length}
                    </div>
                    <div class="evs-col-page-ctrls">
                      <button type="button" class="evs-page-btn" ${pages.dirty <= 1 ? 'disabled' : ''} onclick="window.EvsBedManager.changeColPage('dirty', -1, '${hospId}')" title="Previous Page">◀</button>
                      <span class="evs-page-num">${pages.dirty} / ${totalDirtyPages}</span>
                      <button type="button" class="evs-page-btn" ${pages.dirty >= totalDirtyPages ? 'disabled' : ''} onclick="window.EvsBedManager.changeColPage('dirty', 1, '${hospId}')" title="Next Page">▶</button>
                    </div>
                  </div>
                ` : ''}
              </div>

              <!-- Stage 2: Disinfection In Progress -->
              <div class="evs-kanban-column column-cleaning">
                <div class="evs-col-header">
                  <div class="evs-col-title-wrap">
                    <div class="evs-col-title">
                      <span class="pulse-dot pulse-cleaning"></span>
                      <span>2. Cleaning Active</span>
                    </div>
                    <span class="evs-col-count count-cleaning">${cleaningBeds.length}</span>
                  </div>
                  <p class="evs-col-sub">Housekeepers actively sterilizing</p>
                </div>

                <div class="evs-column-body">
                  ${pagedCleaningBeds.length ? pagedCleaningBeds.map(b => window.EvsBedManager.renderCleaningCard(b, hospId)).join('') : `
                    <div class="evs-empty-col">
                      <span>🧴</span>
                      <p><strong>No Active Sanitization</strong></p>
                      <p class="text-xs-muted mt-4">Dispatch a housekeeper from Column 1 to commence sanitization.</p>
                    </div>
                  `}
                </div>

                <!-- Column 2 Pagination -->
                ${cleaningBeds.length > 0 ? `
                  <div class="evs-col-pagination">
                    <div class="evs-col-page-info">
                      Showing ${(pages.cleaning - 1) * pageSize + 1}–${Math.min(pages.cleaning * pageSize, cleaningBeds.length)} of ${cleaningBeds.length}
                    </div>
                    <div class="evs-col-page-ctrls">
                      <button type="button" class="evs-page-btn" ${pages.cleaning <= 1 ? 'disabled' : ''} onclick="window.EvsBedManager.changeColPage('cleaning', -1, '${hospId}')" title="Previous Page">◀</button>
                      <span class="evs-page-num">${pages.cleaning} / ${totalCleaningPages}</span>
                      <button type="button" class="evs-page-btn" ${pages.cleaning >= totalCleaningPages ? 'disabled' : ''} onclick="window.EvsBedManager.changeColPage('cleaning', 1, '${hospId}')" title="Next Page">▶</button>
                    </div>
                  </div>
                ` : ''}
              </div>

              <!-- Stage 3: Awaiting Nurse / Supervisor Inspection -->
              <div class="evs-kanban-column column-inspect">
                <div class="evs-col-header">
                  <div class="evs-col-title-wrap">
                    <div class="evs-col-title">
                      <span class="pulse-dot pulse-inspect"></span>
                      <span>3. Ready for Inspection</span>
                    </div>
                    <span class="evs-col-count count-inspect">${inspectionBeds.length}</span>
                  </div>
                  <p class="evs-col-sub">Cleaned rooms awaiting clinical release</p>
                </div>

                <div class="evs-column-body">
                  ${pagedInspectionBeds.length ? pagedInspectionBeds.map(b => window.EvsBedManager.renderInspectionCard(b, hospId)).join('') : `
                    <div class="evs-empty-col">
                      <span>🔍</span>
                      <p><strong>Inspection Queue Clear</strong></p>
                      <p class="text-xs-muted mt-4">Cleaned beds requiring supervisor sign-off will appear here.</p>
                    </div>
                  `}
                </div>

                <!-- Column 3 Pagination -->
                ${inspectionBeds.length > 0 ? `
                  <div class="evs-col-pagination">
                    <div class="evs-col-page-info">
                      Showing ${(pages.inspect - 1) * pageSize + 1}–${Math.min(pages.inspect * pageSize, inspectionBeds.length)} of ${inspectionBeds.length}
                    </div>
                    <div class="evs-col-page-ctrls">
                      <button type="button" class="evs-page-btn" ${pages.inspect <= 1 ? 'disabled' : ''} onclick="window.EvsBedManager.changeColPage('inspect', -1, '${hospId}')" title="Previous Page">◀</button>
                      <span class="evs-page-num">${pages.inspect} / ${totalInspectPages}</span>
                      <button type="button" class="evs-page-btn" ${pages.inspect >= totalInspectPages ? 'disabled' : ''} onclick="window.EvsBedManager.changeColPage('inspect', 1, '${hospId}')" title="Next Page">▶</button>
                    </div>
                  </div>
                ` : ''}
              </div>

              <!-- Stage 4: Certified Available & Released for Admissions -->
              <div class="evs-kanban-column column-ready">
                <div class="evs-col-header">
                  <div class="evs-col-title-wrap">
                    <div class="evs-col-title">
                      <span class="pulse-dot pulse-ready"></span>
                      <span>4. Certified Available</span>
                    </div>
                    <span class="evs-col-count count-ready">${availableBeds.length}</span>
                  </div>
                  <p class="evs-col-sub">Sterilized &amp; ready for inpatient intake</p>
                </div>

                <div class="evs-column-body">
                  ${pagedAvailableBeds.length ? pagedAvailableBeds.map(b => window.EvsBedManager.renderAvailableCard(b)).join('') : `
                    <div class="evs-empty-col">
                      <span>🛏️</span>
                      <p><strong>No Available Beds Matching Filter</strong></p>
                      <p class="text-xs-muted mt-4">Adjust the ward filter or inspect cleaned beds to release them.</p>
                    </div>
                  `}
                </div>

                <!-- Column 4 Pagination -->
                ${availableBeds.length > 0 ? `
                  <div class="evs-col-pagination">
                    <div class="evs-col-page-info">
                      Showing ${(pages.ready - 1) * pageSize + 1}–${Math.min(pages.ready * pageSize, availableBeds.length)} of ${availableBeds.length}
                    </div>
                    <div class="evs-col-page-ctrls">
                      <button type="button" class="evs-page-btn" ${pages.ready <= 1 ? 'disabled' : ''} onclick="window.EvsBedManager.changeColPage('ready', -1, '${hospId}')" title="Previous Page">◀</button>
                      <span class="evs-page-num">${pages.ready} / ${totalReadyPages}</span>
                      <button type="button" class="evs-page-btn" ${pages.ready >= totalReadyPages ? 'disabled' : ''} onclick="window.EvsBedManager.changeColPage('ready', 1, '${hospId}')" title="Next Page">▶</button>
                    </div>
                  </div>
                ` : ''}
              </div>

            </div>
          ` : `
            <!-- VIEW MODE 2: MASTER TURNOVER DIRECTORY TABLE -->
            <div class="evs-master-table-card">
              <div class="evs-table-header">
                <div>
                  <h3 class="evs-table-title">Master EVS Turnover &amp; Sanitization Directory</h3>
                  <p class="evs-table-subtitle">Unified inventory ledger of all inpatient beds, sanitization protocols, housekeeper assignments, and clinical certification audit trails.</p>
                </div>
                <div class="d-flex-align gap-8">
                  <span class="text-xs-muted font-semibold">Rows per page:</span>
                  <select class="form-control form-control-xs" style="width: auto;" onchange="window.EvsBedManager.setTablePageSize(Number(this.value), '${hospId}')">
                    <option value="8" ${tablePageSize === 8 ? 'selected' : ''}>8 rows</option>
                    <option value="10" ${tablePageSize === 10 ? 'selected' : ''}>10 rows</option>
                    <option value="15" ${tablePageSize === 15 ? 'selected' : ''}>15 rows</option>
                    <option value="25" ${tablePageSize === 25 ? 'selected' : ''}>25 rows</option>
                  </select>
                </div>
              </div>

              <div class="table-responsive">
                <table class="table evs-table">
                  <thead>
                    <tr>
                      <th>Bed #</th>
                      <th>Ward / Dept</th>
                      <th>Classification</th>
                      <th>Turnover Stage</th>
                      <th>Assigned Specialist / Lead</th>
                      <th>Sanitization Protocol</th>
                      <th>SLA / Latency</th>
                      <th class="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${pagedTableBeds.length ? pagedTableBeds.map(b => window.EvsBedManager.renderTableRow(b, hospId)).join('') : `
                      <tr>
                        <td colspan="8" class="text-center p-32">
                          <span style="font-size: 2rem; display: block; margin-bottom: 8px;">🔍</span>
                          <strong style="color: var(--text-main);">No beds matching selected filters</strong>
                          <p class="text-xs-muted mt-4">Try clearing the search query or switching to 'All Wards'.</p>
                        </td>
                      </tr>
                    `}
                  </tbody>
                </table>
              </div>

              <!-- Master Table Pagination Bar -->
              <div class="evs-table-pagination-bar">
                <div class="evs-table-count-summary">
                  Showing <strong>${(currentTablePage - 1) * tablePageSize + 1}</strong> to <strong>${Math.min(currentTablePage * tablePageSize, filteredBeds.length)}</strong> of <strong>${filteredBeds.length}</strong> beds
                </div>

                <div class="evs-table-pagination-controls">
                  <button type="button" class="btn btn-xs btn-outline-secondary" ${currentTablePage <= 1 ? 'disabled' : ''} onclick="window.EvsBedManager.setTablePage(1, '${hospId}')">« First</button>
                  <button type="button" class="btn btn-xs btn-outline-secondary" ${currentTablePage <= 1 ? 'disabled' : ''} onclick="window.EvsBedManager.setTablePage(${currentTablePage - 1}, '${hospId}')">‹ Prev</button>
                  
                  <div class="evs-page-selector-pills">
                    ${Array.from({ length: totalTablePages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalTablePages || Math.abs(p - currentTablePage) <= 2)
                      .map((p, idx, arr) => {
                        const showGap = idx > 0 && p - arr[idx - 1] > 1;
                        return `
                          ${showGap ? `<span class="evs-page-ellipsis">…</span>` : ''}
                          <button type="button" class="evs-num-pill ${p === currentTablePage ? 'active' : ''}" onclick="window.EvsBedManager.setTablePage(${p}, '${hospId}')">
                            ${p}
                          </button>
                        `;
                      }).join('')}
                  </div>

                  <button type="button" class="btn btn-xs btn-outline-secondary" ${currentTablePage >= totalTablePages ? 'disabled' : ''} onclick="window.EvsBedManager.setTablePage(${currentTablePage + 1}, '${hospId}')">Next ›</button>
                  <button type="button" class="btn btn-xs btn-outline-secondary" ${currentTablePage >= totalTablePages ? 'disabled' : ''} onclick="window.EvsBedManager.setTablePage(${totalTablePages}, '${hospId}')">Last »</button>
                </div>
              </div>
            </div>
          `}
        </div>
      `;
    },

    /**
     * Stage 1 Card: Vacated & Dirty Bed
     */
    renderDirtyCard: function (bed, hospId) {
      const isUrgent = (bed.urgency && bed.urgency.toLowerCase().includes('stat')) || (bed.wardName && bed.wardName.includes('ICU'));
      const slaTotal = bed.slaMinutes || 30;
      const slaElapsed = bed.slaElapsedMinutes || 12;
      const progressPct = Math.min(100, Math.round((slaElapsed / slaTotal) * 100));

      return `
        <div class="evs-bed-card card-dirty-bed" data-bed-id="${window.escapeHtml(bed.id)}">
          <div class="evs-card-top">
            <div class="d-flex-align gap-6">
              <strong class="evs-bed-id">${window.escapeHtml(bed.bedNumber)}</strong>
              ${isUrgent ? `<span class="badge-urgent-pulse">⚡ STAT</span>` : `<span class="badge-standard-sub">Turnover</span>`}
            </div>
            <span class="badge badge-danger">Needs Sanitization</span>
          </div>

          <div class="evs-card-ward">🏥 ${window.escapeHtml(bed.wardName || 'Inpatient Ward')}</div>

          <div class="evs-card-meta">
            <div class="evs-meta-item">
              <span>Required Protocol:</span>
              <strong class="text-danger">${window.escapeHtml(bed.requiredProtocol || 'Terminal Disinfection')}</strong>
            </div>
            ${bed.dischargedAgo ? `
              <div class="evs-meta-item">
                <span>Discharged:</span>
                <span>${window.escapeHtml(bed.dischargedAgo)}</span>
              </div>
            ` : ''}
            ${bed.previousPatient ? `
              <div class="evs-meta-item">
                <span>Last Inpatient:</span>
                <span class="font-mono text-secondary">${window.escapeHtml(bed.previousPatient)}</span>
              </div>
            ` : ''}
            
            <!-- SLA Progress Tracker -->
            <div class="evs-card-progress-wrap">
              <div class="evs-progress-header">
                <span>Discharge Triage SLA</span>
                <span class="${progressPct > 80 ? 'text-danger font-semibold' : 'text-secondary'}">${slaElapsed}m / ${slaTotal}m</span>
              </div>
              <div class="evs-progress-track">
                <div class="evs-progress-bar bar-rose" style="width: ${progressPct}%;"></div>
              </div>
            </div>

            ${bed.notes ? `
              <div class="evs-meta-notes">
                📝 ${window.escapeHtml(bed.notes)}
              </div>
            ` : ''}
          </div>

          <div class="evs-card-actions">
            <button type="button" class="btn btn-sm btn-primary w-100" onclick="window.EvsBedManager.promptDispatchModal('${hospId}', '${bed.id}', '${window.escapeHtml(bed.bedNumber)}')">
              🚀 Dispatch Housekeeper
            </button>
          </div>
        </div>
      `;
    },

    /**
     * Stage 2 Card: Cleaning In Progress
     */
    renderCleaningCard: function (bed, hospId) {
      const slaTotal = bed.slaMinutes || 30;
      const slaElapsed = bed.slaElapsedMinutes || 15;
      const progressPct = Math.min(100, Math.round((slaElapsed / slaTotal) * 100));

      return `
        <div class="evs-bed-card card-cleaning-bed" data-bed-id="${window.escapeHtml(bed.id)}">
          <div class="evs-card-top">
            <div class="d-flex-align gap-6">
              <strong class="evs-bed-id">${window.escapeHtml(bed.bedNumber)}</strong>
              <span class="badge-active-pulse">🧴 In Progress</span>
            </div>
            <span class="badge badge-warning">Sanitizing</span>
          </div>

          <div class="evs-card-ward">🏥 ${window.escapeHtml(bed.wardName || 'Inpatient Ward')}</div>

          <div class="evs-card-meta">
            <div class="evs-meta-item">
              <span>Assigned Specialist:</span>
              <strong>👤 ${window.escapeHtml(bed.evsStaffName || 'EVS Specialist')}</strong>
            </div>
            <div class="evs-meta-item">
              <span>Protocol:</span>
              <span>🧪 ${window.escapeHtml(bed.evsProtocol || 'Terminal Clean')}</span>
            </div>
            <div class="evs-meta-item">
              <span>Elapsed Time:</span>
              <span class="text-amber font-semibold">⏱️ ${window.escapeHtml(bed.cleaningElapsed || '15 mins elapsed')}</span>
            </div>

            <!-- SLA Progress Tracker -->
            <div class="evs-card-progress-wrap">
              <div class="evs-progress-header">
                <span>Sanitization Target Cycle</span>
                <span class="${progressPct > 80 ? 'text-amber font-semibold' : 'text-secondary'}">${progressPct}% cycle</span>
              </div>
              <div class="evs-progress-track">
                <div class="evs-progress-bar bar-amber" style="width: ${progressPct}%;"></div>
              </div>
            </div>

            ${bed.notes ? `
              <div class="evs-meta-notes">
                📝 ${window.escapeHtml(bed.notes)}
              </div>
            ` : ''}
          </div>

          <div class="evs-card-actions">
            <button type="button" class="btn btn-sm btn-success w-100" onclick="window.EvsBedManager.completeCleaning('${hospId}', '${bed.id}', '${window.escapeHtml(bed.bedNumber)}')">
              ✓ Mark Sanitization Complete
            </button>
          </div>
        </div>
      `;
    },

    /**
     * Stage 3 Card: Ready for Clinical Inspection
     */
    renderInspectionCard: function (bed, hospId) {
      const tat = bed.evsTurnaroundMinutes || 23;
      return `
        <div class="evs-bed-card card-inspect-bed" data-bed-id="${window.escapeHtml(bed.id)}">
          <div class="evs-card-top">
            <div class="d-flex-align gap-6">
              <strong class="evs-bed-id">${window.escapeHtml(bed.bedNumber)}</strong>
              <span class="badge-inspect-ready">🔍 Awaiting Sign-off</span>
            </div>
            <span class="badge badge-purple">Inspecting</span>
          </div>

          <div class="evs-card-ward">🏥 ${window.escapeHtml(bed.wardName || 'Inpatient Ward')}</div>

          <div class="evs-card-meta">
            <div class="evs-meta-item">
              <span>Sanitized By:</span>
              <strong>${window.escapeHtml(bed.evsStaffName || 'EVS Staff')}</strong>
            </div>
            <div class="evs-meta-item">
              <span>Turnaround Latency:</span>
              <strong class="text-success font-semibold">⏱️ ${tat} mins (Target: &lt; 35m)</strong>
            </div>
            <div class="evs-meta-item">
              <span>ATP Swab Reading:</span>
              <span class="badge badge-neutral" style="font-size: 0.72rem; font-weight: 700; color: #7c3aed;">🧪 ${window.escapeHtml(bed.atpReading || '<10 RLU (Passed)')}</span>
            </div>
            ${bed.notes ? `
              <div class="evs-meta-notes">
                📝 ${window.escapeHtml(bed.notes)}
              </div>
            ` : ''}
          </div>

          <div class="evs-card-actions">
            <button type="button" class="btn btn-sm btn-purple w-100" onclick="window.EvsBedManager.inspectBed('${hospId}', '${bed.id}', '${window.escapeHtml(bed.bedNumber)}')">
              🛡️ Certify Sterile &amp; Release
            </button>
          </div>
        </div>
      `;
    },

    /**
     * Stage 4 Card: Available & Released Bed
     */
    renderAvailableCard: function (bed) {
      return `
        <div class="evs-bed-card card-available-bed" data-bed-id="${window.escapeHtml(bed.id)}">
          <div class="evs-card-top">
            <div class="d-flex-align gap-6">
              <strong class="evs-bed-id">${window.escapeHtml(bed.bedNumber)}</strong>
              <span class="text-xs text-muted font-mono">(${window.escapeHtml(bed.id || '')})</span>
            </div>
            <span class="badge badge-success">✓ Ready for Patient</span>
          </div>

          <div class="evs-card-ward">🏥 ${window.escapeHtml(bed.wardName || 'Inpatient Ward')}</div>

          <div class="evs-card-meta">
            <div class="evs-meta-item">
              <span>Bed Classification:</span>
              <span>${window.escapeHtml(bed.type || 'Standard Hospital Bed')}</span>
            </div>
            <div class="evs-meta-item">
              <span>Sanitation Grade:</span>
              <strong class="text-success">${window.escapeHtml(bed.sanitationGrade || 'Level 4 Hospital Sterile')}</strong>
            </div>
            ${bed.certifiedBy ? `
              <div class="evs-meta-item">
                <span>Certified By:</span>
                <span class="text-secondary font-semibold">👤 ${window.escapeHtml(bed.certifiedBy)}</span>
              </div>
            ` : ''}
          </div>

          <div class="evs-card-actions mt-4">
            <button type="button" class="btn btn-xs btn-outline-secondary w-100" onclick="window.openAssignBedModal ? window.openAssignBedModal('${bed.id}') : window.showToast('Bed ${window.escapeHtml(bed.bedNumber)} ready for admission.', 'info')">
              🛏️ Fast Assign Inpatient
            </button>
          </div>
        </div>
      `;
    },

    /**
     * Master Table View: Individual Row
     */
    renderTableRow: function (bed, hospId) {
      const s = (bed.status || 'AVAILABLE').toUpperCase();
      let stageBadge = '<span class="badge badge-success">4. Certified Sterile</span>';
      let actionBtn = `
        <button type="button" class="btn btn-xs btn-outline-secondary" onclick="window.openAssignBedModal ? window.openAssignBedModal('${bed.id}') : window.showToast('Bed ready for intake.', 'info')">
          🛏️ Fast Assign
        </button>
      `;

      if (s === 'DIRTY_PENDING_CLEANING' || s === 'DIRTY' || (s === 'MAINTENANCE' && !(bed.maintenanceReason || '').includes('repair'))) {
        stageBadge = '<span class="badge badge-danger">1. Vacated &amp; Dirty</span>';
        actionBtn = `
          <button type="button" class="btn btn-xs btn-primary" onclick="window.EvsBedManager.promptDispatchModal('${hospId}', '${bed.id}', '${window.escapeHtml(bed.bedNumber)}')">
            🚀 Dispatch
          </button>
        `;
      } else if (s === 'CLEANING_IN_PROGRESS' || s === 'CLEANING') {
        stageBadge = '<span class="badge badge-warning">2. Cleaning Active</span>';
        actionBtn = `
          <button type="button" class="btn btn-xs btn-success" onclick="window.EvsBedManager.completeCleaning('${hospId}', '${bed.id}', '${window.escapeHtml(bed.bedNumber)}')">
            ✓ Complete
          </button>
        `;
      } else if (s === 'READY_FOR_INSPECTION' || s === 'INSPECTED') {
        stageBadge = '<span class="badge badge-purple">3. Ready for Inspection</span>';
        actionBtn = `
          <button type="button" class="btn btn-xs btn-purple" onclick="window.EvsBedManager.inspectBed('${hospId}', '${bed.id}', '${window.escapeHtml(bed.bedNumber)}')">
            🛡️ Certify
          </button>
        `;
      }

      const specialist = bed.evsStaffName || bed.certifiedBy || '—';
      const protocol = bed.evsProtocol || bed.requiredProtocol || bed.sanitationGrade || 'Standard Terminal Sanitization';
      const latency = bed.cleaningElapsed || (bed.evsTurnaroundMinutes ? `${bed.evsTurnaroundMinutes}m cycle` : (bed.certifiedAgo ? `Released ${bed.certifiedAgo}` : 'Optimal'));

      return `
        <tr>
          <td>
            <div class="d-flex-align gap-6">
              <strong style="color: var(--text-main); font-size: 0.95rem;">${window.escapeHtml(bed.bedNumber)}</strong>
              ${(bed.urgency && bed.urgency.toLowerCase().includes('stat')) ? `<span class="badge-urgent-pulse" style="font-size:0.65rem;">STAT</span>` : ''}
            </div>
            <span class="text-xs text-muted font-mono">${window.escapeHtml(bed.id)}</span>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-main); font-size: 0.85rem;">${window.escapeHtml(bed.wardName || 'Inpatient Ward')}</div>
            <span class="text-xs-muted">${window.escapeHtml(bed.wardId || 'WARD-MAIN')}</span>
          </td>
          <td>
            <span class="text-sm text-secondary">${window.escapeHtml(bed.type || 'Standard Hospital Bed')}</span>
          </td>
          <td>${stageBadge}</td>
          <td>
            <span class="text-sm font-semibold text-main">👤 ${window.escapeHtml(specialist)}</span>
          </td>
          <td>
            <span class="text-xs font-mono" style="color: var(--text-secondary);">${window.escapeHtml(protocol)}</span>
          </td>
          <td>
            <span class="text-xs font-semibold" style="color: #059669;">⏱️ ${window.escapeHtml(latency)}</span>
          </td>
          <td class="text-right">${actionBtn}</td>
        </tr>
      `;
    },

    /**
     * Dispatch Housekeeper Modal
     */
    promptDispatchModal: function (hospitalId, bedId, bedNumber) {
      let modal = document.getElementById('evsDispatchModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'evsDispatchModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="modal-box modal-box-md" onclick="event.stopPropagation()">
          <div class="modal-header">
            <div class="d-flex-align gap-8">
              <span class="badge badge-primary">EVS Dispatch</span>
              <h3 class="modal-title" style="margin:0;">Dispatch Housekeeper to Bed ${window.escapeHtml(bedNumber)}</h3>
            </div>
            <button type="button" class="modal-close" onclick="document.getElementById('evsDispatchModal').classList.remove('open')">✕</button>
          </div>
          <div class="modal-body">
            <p class="text-sm text-secondary mb-16">
              Assign an Environmental Services specialist and protocol to disinfect and prepare this bed for the next inpatient admission.
            </p>
            <div class="form-group mb-16">
              <label class="form-label required">Assigned EVS Staff Specialist:</label>
              <select id="evsStaffSelect" class="form-control">
                <option value="Ramesh Kumar (Zone 1 Lead)">Ramesh Kumar (EVS Specialist - Zone 1)</option>
                <option value="Suman Devi (Terminal Sanitation Lead)">Suman Devi (Terminal Sanitation Lead)</option>
                <option value="Amit Sharma (Biomedical Cleaning Tech)">Amit Sharma (Biomedical Cleaning Tech)</option>
                <option value="Pooja Verma (Housekeeping Senior)">Pooja Verma (Housekeeping Senior)</option>
                <option value="Vikram Joshi (EVS Specialist)">Vikram Joshi (EVS Specialist)</option>
              </select>
            </div>
            <div class="form-group mb-16">
              <label class="form-label required">Sanitization &amp; Disinfection Protocol:</label>
              <select id="evsProtocolSelect" class="form-control">
                <option value="Terminal Disinfection & UV-C Sterilization">Terminal Disinfection &amp; UV-C Sterilization</option>
                <option value="Airborne Contact Isolation Protocol">Airborne Contact Isolation Protocol (HEPA + Chemical Fog)</option>
                <option value="Standard Inpatient Bed Turnover">Standard Inpatient Bed Turnover</option>
                <option value="Intensive Care Unit (ICU) Sterile Protocol">Intensive Care Unit (ICU) Sterile Protocol</option>
                <option value="Pediatric Eco-Sterile Protocol">Pediatric Eco-Sterile Protocol</option>
              </select>
            </div>
            <div class="form-group mb-16">
              <label class="form-label">Housekeeping Instructions / Room Notes:</label>
              <input type="text" id="evsNotesInput" class="form-control" placeholder="e.g. Linen change, telemetry lead disinfection, floor chemical wipe">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('evsDispatchModal').classList.remove('open')">Cancel</button>
            <button type="button" class="btn btn-primary" onclick="window.EvsBedManager.submitDispatch('${hospitalId}', '${bedId}', '${window.escapeHtml(bedNumber)}')">
              🚀 Dispatch Housekeeping
            </button>
          </div>
        </div>
      `;

      modal.classList.add('open');
    },

    submitDispatch: async function (hospitalId, bedId, bedNumber) {
      const staff = document.getElementById('evsStaffSelect')?.value || 'Ramesh Kumar (Zone 1 Lead)';
      const protocol = document.getElementById('evsProtocolSelect')?.value || 'Terminal Disinfection & UV-C Sterilization';
      const notes = document.getElementById('evsNotesInput')?.value || '';

      const modal = document.getElementById('evsDispatchModal');
      if (modal) modal.classList.remove('open');

      // Check if this is a demo simulation bed
      const demoIndex = (window.__evsDemoBeds || []).findIndex(b => b.id === bedId);
      if (demoIndex !== -1) {
        window.__evsDemoBeds[demoIndex].status = 'CLEANING_IN_PROGRESS';
        window.__evsDemoBeds[demoIndex].evsStaffName = staff;
        window.__evsDemoBeds[demoIndex].evsProtocol = protocol;
        window.__evsDemoBeds[demoIndex].cleaningElapsed = 'Just commenced';
        window.__evsDemoBeds[demoIndex].slaElapsedMinutes = 2;
        if (notes) window.__evsDemoBeds[demoIndex].notes = notes;

        window.showToast(`✓ Housekeeper ${staff} dispatched to Bed ${bedNumber} under ${protocol}.`, 'success');
        window.EvsBedManager.refresh(hospitalId);
        return;
      }

      // Live backend bed dispatch
      try {
        await window.hospitrackStore.dispatchEvsHousekeeping(hospitalId, bedId, {
          staffName: staff,
          protocol: protocol,
          notes: notes
        });
        window.showToast(`✓ Housekeeper ${staff} dispatched to Bed ${bedNumber}.`, 'success');
        window.EvsBedManager.refresh(hospitalId);
      } catch (err) {
        window.showError(`Failed to dispatch housekeeper: ${err.message}`);
      }
    },

    completeCleaning: async function (hospitalId, bedId, bedNumber) {
      // Check if this is a demo simulation bed
      const demoIndex = (window.__evsDemoBeds || []).findIndex(b => b.id === bedId);
      if (demoIndex !== -1) {
        window.__evsDemoBeds[demoIndex].status = 'READY_FOR_INSPECTION';
        window.__evsDemoBeds[demoIndex].evsTurnaroundMinutes = Math.floor(Math.random() * 12) + 18;
        window.__evsDemoBeds[demoIndex].atpReading = `${Math.floor(Math.random() * 8) + 4} RLU (Passed)`;
        window.__evsDemoBeds[demoIndex].notes = 'ATP bioluminescence swab tested <10 RLU. Ready for supervisor inspection.';

        window.showToast(`✓ Sanitization marked complete for Bed ${bedNumber}. Ready for supervisor inspection.`, 'success');
        window.EvsBedManager.refresh(hospitalId);
        return;
      }

      // Live backend bed completion
      try {
        await window.hospitrackStore.completeEvsCleaning(hospitalId, bedId);
        window.showToast(`✓ Sanitization marked complete for Bed ${bedNumber}. Ready for supervisor inspection.`, 'success');
        window.EvsBedManager.refresh(hospitalId);
      } catch (err) {
        window.showError(`Failed to mark cleaning complete: ${err.message}`);
      }
    },

    inspectBed: async function (hospitalId, bedId, bedNumber) {
      const user = window.hospitrackAuth ? window.hospitrackAuth.getCurrentUser() : null;
      const inspector = user?.name || 'Charge Nurse Sunita';

      // Check if this is a demo simulation bed
      const demoIndex = (window.__evsDemoBeds || []).findIndex(b => b.id === bedId);
      if (demoIndex !== -1) {
        window.__evsDemoBeds[demoIndex].status = 'AVAILABLE';
        window.__evsDemoBeds[demoIndex].sanitationGrade = 'Level 4 Hospital Sterile (Certified)';
        window.__evsDemoBeds[demoIndex].certifiedBy = inspector;
        window.__evsDemoBeds[demoIndex].certifiedAgo = 'Just now';
        window.__evsDemoBeds[demoIndex].notes = `Certified sterile by ${inspector} and released to active inventory.`;

        window.showToast(`✓ Bed ${bedNumber} certified sterile by ${inspector} and released to active admissions!`, 'success');
        window.EvsBedManager.refresh(hospitalId);
        return;
      }

      // Live backend bed inspection
      try {
        await window.hospitrackStore.inspectAndReleaseBed(hospitalId, bedId, inspector);
        window.showToast(`✓ Bed ${bedNumber} certified sterile by ${inspector} and released to active admissions!`, 'success');
        window.EvsBedManager.refresh(hospitalId);
      } catch (err) {
        window.showError(`Failed to certify bed: ${err.message}`);
      }
    },

    /**
     * View Switcher: 'kanban' or 'table'
     */
    setViewMode: function (mode, hospitalId) {
      window.__evsViewMode = mode;
      window.EvsBedManager.refresh(hospitalId);
    },

    /**
     * Per-Column Pagination Control (Kanban Mode)
     */
    changeColPage: function (colKey, delta, hospitalId) {
      if (!window.__evsColPages) {
        window.__evsColPages = { dirty: 1, cleaning: 1, inspect: 1, ready: 1 };
      }
      const cur = window.__evsColPages[colKey] || 1;
      window.__evsColPages[colKey] = Math.max(1, cur + delta);
      window.EvsBedManager.refresh(hospitalId);
    },

    /**
     * Master Table Pagination Controls (Table Mode)
     */
    setTablePage: function (page, hospitalId) {
      window.__evsTablePage = Math.max(1, page);
      window.EvsBedManager.refresh(hospitalId);
    },

    setTablePageSize: function (size, hospitalId) {
      window.__evsTablePageSize = size;
      window.__evsTablePage = 1;
      window.EvsBedManager.refresh(hospitalId);
    },

    /**
     * Demo & Simulation Controls
     */
    toggleDemoMode: function (hospitalId) {
      window.__evsDemoActive = !window.__evsDemoActive;
      if (window.__evsDemoActive) {
        window.__evsDemoBeds = JSON.parse(JSON.stringify(DEFAULT_DEMO_BEDS));
        window.showToast('✓ Interactive EVS simulation data loaded across all 4 stages.', 'success');
      } else {
        window.showToast('✓ Switched to live facility bed inventory.', 'info');
      }
      window.EvsBedManager.refresh(hospitalId);
    },

    simulatePatientDischarge: function (hospitalId) {
      window.__evsDemoActive = true;
      const randomNum = Math.floor(Math.random() * 80) + 20;
      const wards = [
        { name: 'Intensive Care Unit (ICU)', code: 'ICU', urgency: 'STAT Emergency', protocol: 'Terminal Disinfection & UV-C' },
        { name: 'Emergency Trauma Triage', code: 'EMG', urgency: 'High Priority', protocol: 'Bloodborne Pathogen Protocol' },
        { name: 'General Inpatient Ward', code: 'GEN', urgency: 'Standard Turnover', protocol: 'Standard Inpatient Bed Turnover' },
        { name: 'Cardiology Step-Down', code: 'CARD', urgency: 'High Priority', protocol: 'Terminal Disinfection' },
        { name: 'Post-Surgical Recovery (PACU)', code: 'SURG', urgency: 'STAT Emergency', protocol: 'Sterile PACU Clean' }
      ];
      const selected = wards[Math.floor(Math.random() * wards.length)];
      const newBed = {
        id: `DEMO-BED-${selected.code}-${randomNum}`,
        bedNumber: `${selected.code}-${randomNum}`,
        wardName: selected.name,
        type: `${selected.code} Inpatient Bed`,
        status: 'DIRTY_PENDING_CLEANING',
        urgency: selected.urgency,
        requiredProtocol: selected.protocol,
        dischargedAgo: 'Just now',
        slaMinutes: 30,
        slaElapsedMinutes: 1,
        previousPatient: `PAT-${Math.floor(Math.random() * 800) + 200} (Discharged)`,
        notes: `Simulated patient discharge. Bed vacated and queued for EVS dispatch.`
      };

      if (!window.__evsDemoBeds) window.__evsDemoBeds = [];
      window.__evsDemoBeds.unshift(newBed);

      // Reset column 1 page to 1 so the newly vacated bed is immediately visible
      if (window.__evsColPages) window.__evsColPages.dirty = 1;

      window.showToast(`⚡ Inpatient discharged! Bed ${newBed.bedNumber} (${selected.name}) routed to EVS Dirty Queue.`, 'warning');
      window.EvsBedManager.refresh(hospitalId);
    },

    setWardFilter: function (ward, hospitalId) {
      window.__evsWardFilter = ward;
      if (window.__evsColPages) {
        window.__evsColPages = { dirty: 1, cleaning: 1, inspect: 1, ready: 1 };
      }
      window.__evsTablePage = 1;
      window.EvsBedManager.refresh(hospitalId);
    },

    setSearchQuery: function (query, hospitalId) {
      window.__evsSearchQuery = query;
      if (window.__evsColPages) {
        window.__evsColPages = { dirty: 1, cleaning: 1, inspect: 1, ready: 1 };
      }
      window.__evsTablePage = 1;
      window.EvsBedManager.refresh(hospitalId);
    },

    refresh: function (hospitalId) {
      const container = document.getElementById('evsTurnoverMountArea') || document.getElementById('evsTurnoverContainer');
      if (container) {
        window.EvsBedManager.renderTurnoverBoard(container, hospitalId);
      } else if (typeof window.renderHospitalDashboard === 'function') {
        window.renderHospitalDashboard(null, 'evs-turnover');
      }
    }
  };
})();
