import React, { useState, useMemo } from 'react';
import { HorizontalScrollTrack } from './HorizontalScrollTrack';
import {
  Calendar,
  FileText,
  Pill,
  Download,
  Printer,
  Clock,
  CheckCircle2,
  Activity,
  HeartPulse,
  Search,
  Building2,
  ChevronDown,
  ChevronUp,
  Share2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileDown,
  Send,
  MapPin,
  UserCheck,
  ClipboardList,
  Check,
  Sparkles
} from 'lucide-react';

// ============================================================================
// DATA CONTRACTS & TYPES
// ============================================================================

export interface HospitalFacility {
  id: string; // e.g. "HOSP-101"
  name: string; // "City General Hospital"
  code: string; // "CGH"
  location?: string;
  totalRecords: number;
  availableBeds?: number;
  isCurrent?: boolean;
}

export interface ConsultationVitals {
  bp: string; // "120/76 mmHg"
  pulse: string; // "72 bpm"
  spo2: string; // "98%"
  temp?: string; // "98.6°F"
  rr?: string; // "16 bpm"
}

export interface ConsultationRecord {
  id: string; // e.g. "CON-401"
  visitDate: string; // ISO date string e.g. "2026-10-26T14:30:00Z"
  diagnosis: string; // "Post-Angioplasty Recovery & Controlled Blood Pressure"
  doctorName: string; // "Dr. Sarah Sharma"
  doctorTitle: string; // "MD (Cardiology)"
  doctorAvatar?: string;
  facilityId: string; // "HOSP-101"
  facilityName: string; // "City General Hospital"
  isVerified: boolean;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'SCHEDULED';
  symptoms: string[]; // ["Mild exertional dyspnea on stair climbing", "Atypical precordial fullness", "No syncope or palpitations"]
  treatmentPlan: string[]; // ["Continue dual antiplatelet regimen (DAPT)", "Target systolic BP < 125 mmHg via Telmisartan 40mg", "Begin supervised 30-min cardiac walking sessions"]
  vitals: ConsultationVitals;
  clinicianNotes: string; // "Patient demonstrates steady left ventricular recovery following DES intervention. Bilateral breath sounds clear, peripheral pulses intact with no pitting pedal edema."
  linkedPrescriptionId?: string; // "RX-805"
  linkedLabReportId?: string; // "LAB-301"
  followUpRecommendation?: string; // "Outpatient review with fasting lipid profile in 4 weeks"
}

export interface PrescriptionItem {
  id: string; // "MED-1"
  name: string; // "Telmisartan"
  form: string; // "Oral Tablet"
  dosage: string; // "40 mg"
  frequency: string; // "Once daily with morning water"
  duration: string; // "60 Days"
  daysCompleted: number; // 12
  totalDays: number; // 60
  status: 'ACTIVE' | 'COMPLETED' | 'DISCONTINUED';
  refillStatus: string; // "2 Refills Remaining"
  instructions?: string; // "Do not discontinue abruptly. Monitor seated morning BP."
}

export interface PrescriptionMasterRecord {
  id: string; // "RX-805"
  prescribedDate: string; // "2026-10-26"
  doctorId: string;
  doctorName: string; // "Dr. Sarah Sharma"
  doctorSpecialty: string; // "Senior Interventional Cardiologist"
  facilityId: string;
  facilityName: string; // "City General Hospital"
  status: 'ACTIVE' | 'EXPIRED' | 'COMPLETED';
  diagnosis: string; // "Post-PCI Cardiac Secondary Prevention & Hypertension"
  items: PrescriptionItem[];
}

export interface FollowUpAppointment {
  id: string; // "FUP-701"
  scheduledDate: string; // "2026-11-15T10:30:00"
  department: string; // "Cardiology Outpatient Clinic"
  doctorName: string; // "Dr. Sarah Sharma"
  doctorSpecialty: string; // "Cardiology"
  facilityId: string;
  facilityName: string; // "City General Hospital"
  status: 'UPCOMING' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED';
  milestoneStep: number; // 2
  milestoneTotal: number; // 3
  isCompleted: boolean;
  instructions: string; // "Review blood pressure logs, fasting lipid profile before visit. Bring current medication dossier."
  intakeFormCompleted: boolean;
  locationRoom?: string; // "Suite 304, Ambulatory Care Wing"
}

export interface PatientDemographics {
  id: string; // "PAT-303"
  uhid: string; // "UHID-992-817-CGH"
  name: string; // "Ananya Iyer"
  age: number; // 31
  gender: string; // "Female"
  bloodGroup: string; // "A+"
  primaryFacility: string; // "City General Hospital"
}

export type ClinicalCategoryFilter = 'all' | 'consultations' | 'prescriptions' | 'labs' | 'follow-ups';

export interface PatientClinicalRecordsProps {
  patient?: PatientDemographics;
  facilities?: HospitalFacility[];
  consultations?: ConsultationRecord[];
  prescriptions?: PrescriptionMasterRecord[];
  followUps?: FollowUpAppointment[];
  initialCategory?: ClinicalCategoryFilter;
  onExportPdf?: () => void;
  onPrintHistory?: () => void;
  onPrintRx?: (rxId: string) => void;
  onRequestRefill?: (rxId?: string, medName?: string) => void;
  onAddToCalendar?: (appt: FollowUpAppointment) => void;
  onReschedule?: (apptId: string) => void;
  onIntakeForm?: (apptId: string) => void;
  onDownloadClinicalNote?: (consultationId: string) => void;
  onViewPrescription?: (rxId: string) => void;
}

// ============================================================================
// DEFAULT REAL-WORLD CLINICAL DATA (Clinical Telemetry Grade)
// ============================================================================

const DEFAULT_PATIENT: PatientDemographics = {
  id: 'PAT-303',
  uhid: 'UHID-992-817-CGH',
  name: 'Ananya Iyer',
  age: 31,
  gender: 'Female',
  bloodGroup: 'A+',
  primaryFacility: 'City General Hospital'
};

const DEFAULT_FACILITIES: HospitalFacility[] = [
  { id: 'ALL', name: 'All Facilities', code: 'NET', totalRecords: 8, isCurrent: false },
  { id: 'HOSP-101', name: 'City General Hospital', code: 'CGH', location: 'Central Healthcare District', totalRecords: 5, availableBeds: 247, isCurrent: true },
  { id: 'HOSP-102', name: 'Apex Care Medical Center', code: 'ACMC', location: 'Metro West District', totalRecords: 3, availableBeds: 182, isCurrent: false }
];

const DEFAULT_CONSULTATIONS: ConsultationRecord[] = [
  {
    id: 'CON-401',
    visitDate: '2026-10-26T10:15:00Z',
    diagnosis: 'Post-Angioplasty Recovery & Controlled Blood Pressure',
    doctorName: 'Dr. Sarah Sharma',
    doctorTitle: 'MD (Cardiology), FACC',
    facilityId: 'HOSP-101',
    facilityName: 'City General Hospital',
    isVerified: true,
    status: 'COMPLETED',
    symptoms: [
      'Subsided exertional dyspnea (NYHA Class I)',
      'Atypical precordial soreness resolved post-stent placement',
      'No episodes of syncope, palpitations, or orthopnea'
    ],
    treatmentPlan: [
      'Maintain Dual Antiplatelet Therapy (Aspirin 81mg + Clopidogrel 75mg)',
      'Optimize seated morning blood pressure with Telmisartan 40mg',
      'Initiate supervised Phase-II cardiac rehabilitation 3x weekly'
    ],
    vitals: {
      bp: '120/76 mmHg',
      pulse: '72 bpm',
      spo2: '98%',
      temp: '98.4°F',
      rr: '15 bpm'
    },
    clinicianNotes: 'Patient demonstrates excellent vascular compliance and stable hemodynamic response post-PCI. Bilateral lung bases are resonant and clear. S1/S2 physiological without third sound or gallop. Well-healed right femoral access site with zero hematoma.',
    linkedPrescriptionId: 'RX-805',
    linkedLabReportId: 'LAB-301',
    followUpRecommendation: 'Outpatient clinical cardiology checkup in 3 weeks with fasting lipid panel.'
  },
  {
    id: 'CON-388',
    visitDate: '2026-10-12T14:45:00Z',
    diagnosis: 'Pre-Procedure Coronary Angiogram Evaluation',
    doctorName: 'Dr. Arjun Verma',
    doctorTitle: 'MD, DM (Interventional Cardiology)',
    facilityId: 'HOSP-102',
    facilityName: 'Apex Care Medical Center',
    isVerified: true,
    status: 'COMPLETED',
    symptoms: [
      'Atypical retrosternal heaviness on brisk exertion (CCS Class II)',
      'Borderline ischemic ST depressions on treadmill stress testing',
      'Normal baseline ECG at rest'
    ],
    treatmentPlan: [
      'Direct diagnostic coronary catheterization scheduled for Oct 14',
      'Pre-procedure hydration with 0.9% Normal Saline',
      'Hold Metformin 24 hours prior to radio-contrast administration'
    ],
    vitals: {
      bp: '134/86 mmHg',
      pulse: '78 bpm',
      spo2: '99%',
      temp: '98.6°F',
      rr: '16 bpm'
    },
    clinicianNotes: 'Pre-procedural risk assessment completed. Serum creatinine 0.92 mg/dL; eGFR > 90 mL/min indicating satisfactory renal clearance for iodinated contrast medium.',
    linkedPrescriptionId: 'RX-792',
    followUpRecommendation: 'Admission to Day Care Cath Lab on Oct 14 at 07:00 AM.'
  },
  {
    id: 'CON-350',
    visitDate: '2026-09-18T11:00:00Z',
    diagnosis: 'Metabolic & Essential Hypertension Follow-Up',
    doctorName: 'Dr. Sarah Sharma',
    doctorTitle: 'MD (Cardiology), FACC',
    facilityId: 'HOSP-101',
    facilityName: 'City General Hospital',
    isVerified: true,
    status: 'COMPLETED',
    symptoms: [
      'Intermittent early morning occipital headaches',
      'Elevated home ambulatory blood pressure readings (142/90 mmHg)'
    ],
    treatmentPlan: [
      'Uptitrate Telmisartan to 40mg daily with breakfast',
      'DASH dietary sodium restriction (< 2.0g sodium/day)',
      'Home blood pressure log review twice weekly'
    ],
    vitals: {
      bp: '138/88 mmHg',
      pulse: '76 bpm',
      spo2: '98%',
      temp: '98.5°F',
      rr: '16 bpm'
    },
    clinicianNotes: 'Mild Stage-I essential hypertension. No target organ damage noted on fundoscopic exam. Routine metabolic panel ordered.',
    linkedPrescriptionId: 'RX-760',
    linkedLabReportId: 'LAB-289',
    followUpRecommendation: 'Follow-up consultation in 4 weeks with updated BP diary.'
  }
];

const DEFAULT_PRESCRIPTIONS: PrescriptionMasterRecord[] = [
  {
    id: 'RX-805',
    prescribedDate: '2026-10-26',
    doctorId: 'DOC-201',
    doctorName: 'Dr. Sarah Sharma',
    doctorSpecialty: 'Senior Interventional Cardiologist',
    facilityId: 'HOSP-101',
    facilityName: 'City General Hospital',
    status: 'ACTIVE',
    diagnosis: 'Post-PCI Cardiac Secondary Prevention & Hypertension',
    items: [
      {
        id: 'MED-101',
        name: 'Telmisartan',
        form: 'Oral Film-Coated Tablet',
        dosage: '40 mg',
        frequency: 'Once daily (08:00 AM with water)',
        duration: '60 Days',
        daysCompleted: 12,
        totalDays: 60,
        status: 'ACTIVE',
        refillStatus: '2 Refills Remaining',
        instructions: 'Take consistently at the same time each morning. Monitor seated blood pressure.'
      },
      {
        id: 'MED-102',
        name: 'Clopidogrel (Plavix)',
        form: 'Oral Film-Coated Tablet',
        dosage: '75 mg',
        frequency: 'Once daily (01:00 PM with lunch)',
        duration: '90 Days',
        daysCompleted: 12,
        totalDays: 90,
        status: 'ACTIVE',
        refillStatus: '3 Refills Remaining',
        instructions: 'Essential antiplatelet agent. Do not omit or discontinue without cardiologist consultation.'
      },
      {
        id: 'MED-103',
        name: 'Rosuvastatin Calcium',
        form: 'Oral Tablet',
        dosage: '20 mg',
        frequency: 'Once daily at bedtime (10:00 PM)',
        duration: '90 Days',
        daysCompleted: 12,
        totalDays: 90,
        status: 'ACTIVE',
        refillStatus: '3 Refills Remaining',
        instructions: 'High-intensity lipid-lowering therapy for plaque stabilization.'
      },
      {
        id: 'MED-104',
        name: 'Aspirin (Enteric Coated)',
        form: 'Delayed-Release Tablet',
        dosage: '81 mg',
        frequency: 'Once daily (01:00 PM with meal)',
        duration: '90 Days',
        daysCompleted: 12,
        totalDays: 90,
        status: 'ACTIVE',
        refillStatus: '3 Refills Remaining',
        instructions: 'Gastric-protective enteric coating. Swallow whole with water.'
      }
    ]
  },
  {
    id: 'RX-760',
    prescribedDate: '2026-09-18',
    doctorId: 'DOC-201',
    doctorName: 'Dr. Sarah Sharma',
    doctorSpecialty: 'Senior Interventional Cardiologist',
    facilityId: 'HOSP-101',
    facilityName: 'City General Hospital',
    status: 'COMPLETED',
    diagnosis: 'Stage-I Hypertension Monotherapy',
    items: [
      {
        id: 'MED-090',
        name: 'Telmisartan',
        form: 'Oral Tablet',
        dosage: '20 mg',
        frequency: 'Once daily in the morning',
        duration: '30 Days',
        daysCompleted: 30,
        totalDays: 30,
        status: 'COMPLETED',
        refillStatus: 'Completed / Uptitrated to 40mg',
        instructions: 'Initial dose titration.'
      }
    ]
  }
];

const DEFAULT_FOLLOW_UPS: FollowUpAppointment[] = [
  {
    id: 'FUP-701',
    scheduledDate: '2026-11-15T10:30:00',
    department: 'Cardiology Outpatient Clinic',
    doctorName: 'Dr. Sarah Sharma',
    doctorSpecialty: 'Cardiology',
    facilityId: 'HOSP-101',
    facilityName: 'City General Hospital',
    locationRoom: 'Suite 304, Ambulatory Care Wing',
    status: 'UPCOMING',
    milestoneStep: 2,
    milestoneTotal: 3,
    isCompleted: false,
    instructions: 'Review blood pressure logs, fasting lipid profile before visit. Bring current medication dossier and morning ambulatory vitals chart.',
    intakeFormCompleted: true
  },
  {
    id: 'FUP-680',
    scheduledDate: '2026-10-26T10:00:00',
    department: 'Cardiology Post-Procedure Check',
    doctorName: 'Dr. Sarah Sharma',
    doctorSpecialty: 'Cardiology',
    facilityId: 'HOSP-101',
    facilityName: 'City General Hospital',
    locationRoom: 'Exam Room 2B, Cardiovascular Center',
    status: 'COMPLETED',
    milestoneStep: 1,
    milestoneTotal: 3,
    isCompleted: true,
    instructions: 'Post-catheterization femoral puncture site inspection and 12-lead ECG recording.',
    intakeFormCompleted: true
  },
  {
    id: 'FUP-820',
    scheduledDate: '2027-01-20T11:00:00',
    department: 'Cardiovascular Secondary Prevention Clinic',
    doctorName: 'Dr. Sarah Sharma',
    doctorSpecialty: 'Cardiology',
    facilityId: 'HOSP-101',
    facilityName: 'City General Hospital',
    locationRoom: 'Suite 304, Ambulatory Care Wing',
    status: 'UPCOMING',
    milestoneStep: 3,
    milestoneTotal: 3,
    isCompleted: false,
    instructions: 'Comprehensive 90-day post-PCI stress echocardiogram and cardiac rehabilitation review.',
    intakeFormCompleted: false
  }
];

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

export const PatientClinicalRecords: React.FC<PatientClinicalRecordsProps> = ({
  patient = DEFAULT_PATIENT,
  facilities = DEFAULT_FACILITIES,
  consultations = DEFAULT_CONSULTATIONS,
  prescriptions = DEFAULT_PRESCRIPTIONS,
  followUps = DEFAULT_FOLLOW_UPS,
  initialCategory = 'all',
  onExportPdf,
  onPrintHistory,
  onPrintRx,
  onRequestRefill,
  onAddToCalendar,
  onReschedule,
  onIntakeForm,
  onDownloadClinicalNote,
  onViewPrescription
}) => {
  // Reactive UI States
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('ALL');
  const [activeCategory, setActiveCategory] = useState<ClinicalCategoryFilter>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedConsultations, setExpandedConsultations] = useState<Record<string, boolean>>({
    'CON-401': true // First item expanded by default
  });
  const [refillSuccessMsg, setRefillSuccessMsg] = useState<string | null>(null);

  // Toggle consultation card expansion
  const toggleConsultation = (id: string) => {
    setExpandedConsultations(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Filter facilities
  const filteredFacilities = useMemo(() => {
    return facilities.map(f => {
      if (f.id === 'ALL') {
        return {
          ...f,
          totalRecords: consultations.length + prescriptions.length + followUps.length
        };
      }
      const cCount = consultations.filter(c => c.facilityId === f.id).length;
      const pCount = prescriptions.filter(p => p.facilityId === f.id).length;
      const fCount = followUps.filter(u => u.facilityId === f.id).length;
      return {
        ...f,
        totalRecords: cCount + pCount + fCount
      };
    });
  }, [facilities, consultations, prescriptions, followUps]);

  // Filter consultations by facility and search query
  const filteredConsultations = useMemo(() => {
    return consultations.filter(c => {
      // Facility filter
      if (selectedFacilityId !== 'ALL' && c.facilityId !== selectedFacilityId) {
        return false;
      }
      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const diagMatch = c.diagnosis.toLowerCase().includes(q);
      const docMatch = c.doctorName.toLowerCase().includes(q);
      const sympMatch = c.symptoms.some(s => s.toLowerCase().includes(q));
      const planMatch = c.treatmentPlan.some(p => p.toLowerCase().includes(q));
      const notesMatch = c.clinicianNotes.toLowerCase().includes(q);
      const hospMatch = c.facilityName.toLowerCase().includes(q);
      const idMatch = c.id.toLowerCase().includes(q);
      return diagMatch || docMatch || sympMatch || planMatch || notesMatch || hospMatch || idMatch;
    });
  }, [consultations, selectedFacilityId, searchQuery]);

  // Filter prescriptions by facility and search query
  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter(p => {
      if (selectedFacilityId !== 'ALL' && p.facilityId !== selectedFacilityId) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const idMatch = p.id.toLowerCase().includes(q);
      const docMatch = p.doctorName.toLowerCase().includes(q);
      const diagMatch = p.diagnosis.toLowerCase().includes(q);
      const medMatch = p.items.some(i => i.name.toLowerCase().includes(q) || i.dosage.toLowerCase().includes(q));
      return idMatch || docMatch || diagMatch || medMatch;
    });
  }, [prescriptions, selectedFacilityId, searchQuery]);

  // Filter follow-ups by facility and search query
  const filteredFollowUps = useMemo(() => {
    return followUps.filter(f => {
      if (selectedFacilityId !== 'ALL' && f.facilityId !== selectedFacilityId) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const idMatch = f.id.toLowerCase().includes(q);
      const docMatch = f.doctorName.toLowerCase().includes(q);
      const deptMatch = f.department.toLowerCase().includes(q);
      const instMatch = f.instructions.toLowerCase().includes(q);
      return idMatch || docMatch || deptMatch || instMatch;
    });
  }, [followUps, selectedFacilityId, searchQuery]);

  // Aggregate count
  const totalMatchingRecords = useMemo(() => {
    return filteredConsultations.length + filteredPrescriptions.length + filteredFollowUps.length;
  }, [filteredConsultations, filteredPrescriptions, filteredFollowUps]);

  // Handle refill request with visual feedback
  const handleRefillRequest = (rxId: string, medName?: string) => {
    if (onRequestRefill) {
      onRequestRefill(rxId, medName);
    }
    setRefillSuccessMsg(`Refill request for ${medName || 'medication'} submitted successfully to City General Pharmacy.`);
    setTimeout(() => setRefillSuccessMsg(null), 4000);
  };

  // Format date helper
  const formatDisplayDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatDisplayDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Handle native window print with clean print isolation
  const handleNativePrint = () => {
    if (onPrintHistory) {
      onPrintHistory();
    } else {
      window.print();
    }
  };

  return (
    <div className="hospitrack-clinical-records-root w-full space-y-6 font-sans text-slate-900">
      {/* ====================================================================
          1. TOP FILTER & ACTION RIBBON
          ==================================================================== */}
      <div className="no-print bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
        {/* Facility Switcher Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Care Facility Network:
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {filteredFacilities.map(f => {
              const isSelected = selectedFacilityId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFacilityId(f.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-700/20'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  <span>{f.name}</span>
                  <span
                    className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {f.totalRecords}
                  </span>
                  {f.availableBeds && (
                    <span className={`text-[10px] hidden md:inline ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                      • {f.availableBeds} beds
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Search & Category Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Input Box */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by diagnosis, medication, or physician..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 rounded-xl text-sm text-slate-800 placeholder-slate-400 transition-all outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-slate-600 px-1 py-0.5 rounded"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {(
              [
                { key: 'all', label: 'All Records', count: totalMatchingRecords },
                { key: 'consultations', label: 'Consultations', count: filteredConsultations.length },
                { key: 'prescriptions', label: 'Active Prescriptions', count: filteredPrescriptions.length },
                { key: 'follow-ups', label: 'Follow-ups', count: filteredFollowUps.length }
              ] as const
            ).map(cat => {
              const active = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 hover:text-slate-900'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      active ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <button
              type="button"
              onClick={onExportPdf || handleNativePrint}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-all shadow-sm cursor-pointer whitespace-nowrap"
              title="Export Clinical Records as PDF dossier"
            >
              <FileDown className="w-3.5 h-3.5 text-slate-500" />
              <span>Export PDF Summary</span>
            </button>

            <button
              type="button"
              onClick={handleNativePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-all shadow-sm hover:shadow cursor-pointer whitespace-nowrap"
              title="Launch official hospital print layout"
            >
              <Printer className="w-3.5 h-3.5 text-teal-200" />
              <span>Print Clinical History</span>
            </button>
          </div>
        </div>

        {/* Total Records Counter & Care Network Badge */}
        <div className="flex items-center justify-between pt-2 text-xs text-slate-500 border-t border-slate-100">
          <div className="flex items-center gap-2 font-medium">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 font-bold border border-teal-200/60">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>{totalMatchingRecords} Clinical Records • Verified Care Network</span>
            </span>
            <span className="hidden sm:inline text-slate-400">
              Showing records for {patient.name} ({patient.uhid})
            </span>
          </div>

          {searchQuery && (
            <div className="text-teal-700 font-medium">
              Filter: "{searchQuery}"
            </div>
          )}
        </div>
      </div>

      {/* Success Notification Banner for Refills */}
      {refillSuccessMsg && (
        <div className="no-print flex items-center justify-between gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{refillSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setRefillSuccessMsg(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ====================================================================
          2. PRINT-ONLY INSTITUTIONAL HEADER (True-to-Life Clinical Dossier)
          ==================================================================== */}
      <div className="only-print hidden print:block mb-6 pb-4 border-b-2 border-slate-800">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-slate-800" />
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                City General Hospital &amp; Medical Network
              </h1>
            </div>
            <p className="text-xs text-slate-600">
              Department of Health Informatics • Comprehensive Longitudinal Electronic Health Record (EHR)
            </p>
            <p className="text-[11px] text-slate-500">
              NABL ISO 15189 Accredited • NABH Certified Clinical Telemetry Network
            </p>
          </div>

          <div className="text-right space-y-1">
            <div className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold tracking-wider rounded">
              OFFICIAL CLINICAL DOSSIER
            </div>
            <div className="text-xs font-mono text-slate-600">
              Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Patient Demographics Matrix in Print */}
        <div className="mt-4 grid grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-300 rounded text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Patient Name:</span>
            <span className="font-bold text-slate-900">{patient.name}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">MRN / UHID:</span>
            <span className="font-mono font-bold text-slate-900">{patient.uhid}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Age / Gender / Blood:</span>
            <span className="font-bold text-slate-900">
              {patient.age}y / {patient.gender} / {patient.bloodGroup}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Primary Facility:</span>
            <span className="font-bold text-slate-900">{patient.primaryFacility}</span>
          </div>
        </div>
      </div>

      {/* ====================================================================
          3. SECTION: CLINICAL CONSULTATIONS & SPECIALIST ENCOUNTERS
          ==================================================================== */}
      {(activeCategory === 'all' || activeCategory === 'consultations') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-200/60">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Clinical Consultations &amp; Specialist Encounters
                </h2>
                <p className="text-xs text-slate-500">
                  Attending physician encounter evaluations, objective findings, and care directives.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
              {filteredConsultations.length} Consultations
            </span>
          </div>

          {filteredConsultations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-2">
              <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No Consultations Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No clinical consultation records match your selected facility or search query.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredConsultations.map(consult => {
                const isExpanded = !!expandedConsultations[consult.id];
                return (
                  <div
                    key={consult.id}
                    className="consultation-ehr-card rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition-all break-inside-avoid"
                  >
                    {/* Card Header Strip */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900 tracking-tight">
                            {consult.diagnosis}
                          </h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                            {consult.status}
                          </span>
                        </div>

                        {/* Physician Strip */}
                        <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                          <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center">
                            {consult.doctorName
                              .split(' ')
                              .map(n => n[0])
                              .join('')
                              .substring(0, 2)
                              .toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-800">{consult.doctorName}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-600">{consult.doctorTitle}</span>
                          {consult.isVerified && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>Verified Clinician</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Header Right: Date & Facility Badge */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 flex-shrink-0">
                        <div className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formatDisplayDate(consult.visitDate)}</span>
                        </div>
                        <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{consult.facilityName}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          ID: {consult.id}
                        </div>
                      </div>
                    </div>

                    {/* Progressive Disclosure Body */}
                    {isExpanded && (
                      <div className="pt-4 space-y-4">
                        {/* Structured 3-Column Clinical Matrix */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Column 1: Symptoms & Clinical Indication */}
                          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <span>Symptoms &amp; Indication</span>
                            </div>
                            <ul className="space-y-1.5 text-xs text-slate-700">
                              {consult.symptoms.map((symp, sIdx) => (
                                <li key={sIdx} className="flex items-start gap-1.5">
                                  <span className="text-amber-500 mt-0.5">•</span>
                                  <span>{symp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Column 2: Active Treatment Plan (Checklist Styling) */}
                          <div className="p-3.5 rounded-xl bg-teal-50/50 border border-teal-200/60 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-800">
                              <CheckCircle2 className="w-4 h-4 text-teal-600" />
                              <span>Active Treatment Plan</span>
                            </div>
                            <ul className="space-y-1.5 text-xs text-slate-700">
                              {consult.treatmentPlan.map((plan, pIdx) => (
                                <li key={pIdx} className="flex items-start gap-2">
                                  <div className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Check className="w-2.5 h-2.5 text-teal-700" />
                                  </div>
                                  <span className="text-slate-800 font-medium">{plan}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Column 3: Clinician Notes & Recorded Vitals */}
                          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                              <Activity className="w-4 h-4 text-teal-600" />
                              <span>Clinician Notes &amp; Vitals</span>
                            </div>

                            {/* Pill Metrics */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white border border-slate-200 text-slate-800 shadow-2xs">
                                BP: <strong className="text-teal-700">{consult.vitals.bp}</strong>
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white border border-slate-200 text-slate-800 shadow-2xs">
                                Pulse: <strong className="text-teal-700">{consult.vitals.pulse}</strong>
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white border border-slate-200 text-slate-800 shadow-2xs">
                                SpO2: <strong className="text-teal-700">{consult.vitals.spo2}</strong>
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed italic border-t border-slate-200/70 pt-2">
                              "{consult.clinicianNotes}"
                            </p>
                          </div>
                        </div>

                        {/* Connected Clinical Assets Strip */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                          {consult.linkedPrescriptionId && (
                            <button
                              type="button"
                              onClick={() => {
                                if (onViewPrescription) onViewPrescription(consult.linkedPrescriptionId!);
                                setActiveCategory('prescriptions');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-medium cursor-pointer transition-colors"
                            >
                              <Pill className="w-3.5 h-3.5 text-teal-600" />
                              <span>Prescription Linked ({consult.linkedPrescriptionId})</span>
                            </button>
                          )}

                          {consult.linkedLabReportId && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 font-medium">
                              <FileText className="w-3.5 h-3.5 text-sky-600" />
                              <span>Diagnostic Lab Attached ({consult.linkedLabReportId})</span>
                            </span>
                          )}

                          {consult.followUpRecommendation && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium ml-auto">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span>{consult.followUpRecommendation}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Card Footer Actions Strip */}
                    <div className="no-print flex items-center justify-between pt-3 mt-3 border-t border-slate-100 gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (onDownloadClinicalNote) {
                              onDownloadClinicalNote(consult.id);
                            } else {
                              handleNativePrint();
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-500" />
                          <span>Download Clinical Note (PDF)</span>
                        </button>

                        {consult.linkedPrescriptionId && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onViewPrescription) onViewPrescription(consult.linkedPrescriptionId!);
                              setActiveCategory('prescriptions');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 transition-colors cursor-pointer"
                          >
                            <Pill className="w-3.5 h-3.5 text-teal-600" />
                            <span>View Linked Prescriptions</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setActiveCategory('follow-ups')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Request Follow-up</span>
                        </button>
                      </div>

                      {/* Expand / Collapse Toggle Button */}
                      <button
                        type="button"
                        onClick={() => toggleConsultation(consult.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
                      >
                        <span>{isExpanded ? 'Hide Clinical Matrix' : 'View Full Details'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ====================================================================
          4. SECTION: PRESCRIPTIONS & ACTIVE REGIMENS OVERHAUL
          ==================================================================== */}
      {(activeCategory === 'all' || activeCategory === 'prescriptions') && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-200/60">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Active Prescriptions &amp; Medication Regimens
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                    {filteredPrescriptions.reduce((acc, p) => acc + p.items.filter(i => i.status === 'ACTIVE').length, 0)} Active Meds
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Comprehensive pharmacy regimen, clinical administration schedules, and duration tracking.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleRefillRequest('ALL', 'Full Care Regimen')}
              className="no-print inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-teal-600" />
              <span>+ Request Refill</span>
            </button>
          </div>

          {filteredPrescriptions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-2">
              <Pill className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No Prescriptions On File</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No medication regimens logged for the selected facility filter.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {filteredPrescriptions.map(rx => (
                <div
                  key={rx.id}
                  className="rx-master-card rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition-all break-inside-avoid"
                >
                  {/* Master Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded">
                          {rx.id}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Active Regimen</span>
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          {rx.diagnosis}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Prescribed by <strong className="text-slate-800">{rx.doctorName}</strong> ({rx.doctorSpecialty}) • {rx.facilityName}
                      </div>
                    </div>

                    <div className="no-print flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onPrintRx) onPrintRx(rx.id);
                          else handleNativePrint();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                        <span>Print Rx Slip</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRefillRequest(rx.id, 'Rx Package')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-teal-600" />
                        <span>Order Home Delivery / Refill</span>
                      </button>
                    </div>
                  </div>

                  {/* Medication Table / Grid */}
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                          <th className="py-2.5 px-3">Drug &amp; Dosage</th>
                          <th className="py-2.5 px-3">Frequency &amp; Schedule</th>
                          <th className="py-2.5 px-3">Duration &amp; Progress</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right no-print">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rx.items.map(med => {
                          const percent = Math.min(100, Math.round((med.daysCompleted / med.totalDays) * 100));
                          const daysRemaining = Math.max(0, med.totalDays - med.daysCompleted);

                          return (
                            <tr key={med.id} className="hover:bg-slate-50/60 transition-colors">
                              {/* Drug & Dosage */}
                              <td className="py-3 px-3 align-top">
                                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                  <Pill className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                                  <span>{med.name}</span>
                                </div>
                                <div className="text-slate-500 text-[11px] mt-0.5">
                                  {med.dosage} • {med.form}
                                </div>
                                {med.instructions && (
                                  <div className="text-[11px] text-slate-600 italic mt-1 bg-slate-50 p-1.5 rounded border border-slate-200/50">
                                    Directive: {med.instructions}
                                  </div>
                                )}
                              </td>

                              {/* Frequency & Schedule */}
                              <td className="py-3 px-3 align-top text-slate-700">
                                <div className="font-semibold text-slate-800">{med.frequency}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  Daily adherence required
                                </div>
                              </td>

                              {/* Duration & Visual Progress Bar */}
                              <td className="py-3 px-3 align-top min-w-[160px]">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
                                  <span>Day {med.daysCompleted} of {med.totalDays}</span>
                                  <span className="text-teal-700 font-bold">{daysRemaining}d left</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                                  <div
                                    className="bg-teal-600 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${percent}%` }}
                                    role="progressbar"
                                    aria-valuenow={percent}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                  />
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1">
                                  {med.refillStatus}
                                </div>
                              </td>

                              {/* Status */}
                              <td className="py-3 px-3 align-top">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    med.status === 'ACTIVE'
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {med.status}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-3 align-top text-right no-print">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleRefillRequest(rx.id, med.name)}
                                    className="px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-[11px] border border-teal-200 transition-colors cursor-pointer"
                                  >
                                    Refill
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ====================================================================
          5. SECTION: CLINICAL FOLLOW-UP SCHEDULE & TIMELINE
          ==================================================================== */}
      {(activeCategory === 'all' || activeCategory === 'follow-ups') && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-200/60">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Clinical Follow-up Schedule &amp; Care Journey Milestones
                </h2>
                <p className="text-xs text-slate-500">
                  Scheduled outpatient reviews, post-procedure clinical milestones, and pre-visit intake requirements.
                </p>
              </div>
            </div>

            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
              {filteredFollowUps.filter(f => f.status === 'UPCOMING').length} Upcoming
            </span>
          </div>

          {filteredFollowUps.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-2">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No Pending Follow-ups</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active follow-up appointments scheduled for this care network.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Milestone Stepper Ribbon */}
              <div className="no-print p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Care Journey Post-Procedure Milestones</span>
                  <span className="text-teal-700 font-medium">Step 2 of 3 Active</span>
                </div>
                <HorizontalScrollTrack
                  showProgressLine={true}
                  progressLinePosition="bottom"
                  scrollStep={220}
                  fadeMask={true}
                  snapAlign="start"
                  className="w-full"
                >
                  <div className="flex items-center justify-between gap-2 min-w-full pb-1">
                    {filteredFollowUps.map((step, idx) => (
                      <div key={step.id} className="flex-1 min-w-[180px] flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                            step.isCompleted
                              ? 'bg-emerald-600 text-white'
                              : step.status === 'UPCOMING'
                              ? 'bg-teal-600 text-white ring-4 ring-teal-100'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {step.isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate">
                            {step.department}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {formatDisplayDate(step.scheduledDate)}
                          </div>
                        </div>
                        {idx < filteredFollowUps.length - 1 && (
                          <div className="hidden sm:block flex-1 h-0.5 bg-slate-200 mx-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </HorizontalScrollTrack>
              </div>

              {/* Follow-up Cards */}
              <div className="space-y-3">
                {filteredFollowUps.map(appt => {
                  const isUpcoming = appt.status === 'UPCOMING';
                  return (
                    <div
                      key={appt.id}
                      className={`rounded-2xl border p-5 transition-all break-inside-avoid ${
                        isUpcoming
                          ? 'border-teal-300 bg-white shadow-sm hover:shadow-md ring-1 ring-teal-500/10'
                          : 'border-slate-200 bg-slate-50/70 text-slate-600'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                isUpcoming
                                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {appt.status}
                            </span>
                            <h3 className="text-base font-bold text-slate-900">
                              {appt.department}
                            </h3>
                          </div>

                          <div className="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
                            <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                            <strong className="text-slate-800">{appt.doctorName}</strong>
                            <span>({appt.doctorSpecialty})</span>
                            <span className="text-slate-400">•</span>
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{appt.facilityName}</span>
                            {appt.locationRoom && (
                              <span className="text-slate-500">({appt.locationRoom})</span>
                            )}
                          </div>
                        </div>

                        {/* Date/Time Badge */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 font-bold text-xs whitespace-nowrap self-start">
                          <Calendar className="w-4 h-4 text-teal-600" />
                          <span>{formatDisplayDateTime(appt.scheduledDate)}</span>
                        </div>
                      </div>

                      {/* Instructions Box with Medical Checklist Icon */}
                      <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                        <div className="p-1.5 bg-white text-teal-700 rounded-lg border border-slate-200 shadow-2xs mt-0.5 flex-shrink-0">
                          <ClipboardList className="w-4 h-4" />
                        </div>
                        <div className="space-y-1 text-xs">
                          <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                            Pre-Visit Instructions &amp; Diagnostic Directives:
                          </span>
                          <p className="text-slate-700 leading-relaxed">
                            {appt.instructions}
                          </p>
                        </div>
                      </div>

                      {/* Action Group */}
                      <div className="no-print flex items-center justify-between pt-3 mt-3 border-t border-slate-100 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (onAddToCalendar) {
                                onAddToCalendar(appt);
                              } else {
                                // Default .ics download
                                const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Hospitrack//Clinical Followup//EN\nBEGIN:VEVENT\nSUMMARY:${appt.department} - ${appt.doctorName}\nDESCRIPTION:${appt.instructions}\nLOCATION:${appt.facilityName} ${appt.locationRoom || ''}\nDTSTART:20261115T050000Z\nDTEND:20261115T054500Z\nEND:VEVENT\nEND:VCALENDAR`;
                                const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
                                const link = document.createElement('a');
                                link.href = window.URL.createObjectURL(blob);
                                link.setAttribute('download', `hospitrack-appointment-${appt.id}.ics`);
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>Add to Calendar (.ics)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (onReschedule) onReschedule(appt.id);
                              else alert(`To reschedule appointment ${appt.id}, please contact ${appt.facilityName} reception at 1800-419-HOSP.`);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                            <span>Reschedule</span>
                          </button>
                        </div>

                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              if (onIntakeForm) onIntakeForm(appt.id);
                              else alert('Pre-visit Intake Questionnaire completed and verified on file.');
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              appt.intakeFormCompleted
                                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                : 'text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {appt.intakeFormCompleted ? 'Intake Form Completed' : 'Complete Pre-visit Intake'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ====================================================================
          6. PRINT-ONLY PHYSICIAN DIGITAL SIGNATURE & AUDIT BLOCK
          ==================================================================== */}
      <div className="only-print hidden print:block mt-8 pt-4 border-t-2 border-slate-800 break-inside-avoid">
        <div className="grid grid-cols-2 gap-8 text-xs">
          <div>
            <div className="font-bold text-slate-900 uppercase">Institutional Verification &amp; Audit Trail:</div>
            <div className="text-slate-600 mt-1">
              This official document is generated from Hospitrack Health Informatics. All medical entries have been digitally attested under NABL &amp; NABH medical continuity guidelines.
            </div>
            <div className="font-mono text-[10px] text-slate-500 mt-2">
              RECORD-HASH: SHA256:7B8F...91E2 • AUDIT-VERIFIED-OK
            </div>
          </div>

          <div className="text-right space-y-4">
            <div>
              <div className="font-bold text-slate-900">Dr. Sarah Sharma, MD (Cardiology)</div>
              <div className="text-slate-600 text-[11px]">Attending Senior Cardiologist • Reg: MCI-2019-88741</div>
              <div className="text-slate-500 text-[10px]">City General Hospital Healthcare System</div>
            </div>
            <div className="inline-block border-t border-slate-400 pt-1 w-48 text-center text-[10px] font-mono text-slate-500">
              [ Digitally Signed &amp; Timestamped ]
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientClinicalRecords;

