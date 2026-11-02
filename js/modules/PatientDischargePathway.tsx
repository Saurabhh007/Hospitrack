import React, { useState } from 'react';
import { HorizontalScrollTrack } from './HorizontalScrollTrack';
import {
  FileCheck,
  Activity,
  CalendarCheck,
  AlertTriangle,
  Download,
  Printer,
  Pill,
  PhoneCall,
  CheckCircle2,
  Clock,
  Building2,
  UserCheck,
  HeartPulse,
  Share2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Calendar,
  ChevronRight,
  Stethoscope,
  Sparkles,
  Check,
  FileText,
  BadgeAlert,
  ArrowRight
} from 'lucide-react';

// ============================================================================
// DATA CONTRACTS & TYPE DEFINITIONS
// ============================================================================

export type ClearanceStatus = 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';

export interface ClearanceStep {
  id: string; // e.g., "STEP-1"
  stepNumber: number;
  title: string; // "Clinical Stability & Primary Consultant Sign-off"
  department: string; // "Internal Medicine / Cardiology"
  description: string;
  status: ClearanceStatus;
  signoffBy: string; // "Dr. Arjun Verma, MD"
  timestamp: string; // "Oct 29, 2026 • 11:30 AM"
  notes?: string;
}

export interface AdmissionEpisodeContext {
  hospitalName: string; // "Apex Care Medical Center"
  hospitalCode: string; // "ACMC"
  ward: string; // "General Medicine Ward"
  bedNumber: string; // "Bed GEN-01"
  admissionDate: string; // "Oct 24, 2026, 10:15 AM"
  dischargeDate: string; // "Oct 29, 2026, 02:30 PM"
  lengthOfStay: string; // "5 Days"
  attendingPhysician: string; // "Dr. Arjun Verma, MD (Internal Medicine)"
  physicianLicense: string; // "MCI-48201"
  icd10Diagnosis: string; // "I21.9 - Acute Myocardial Infarction / Unspecified"
  admissionType: string; // "Emergency Inpatient Admission"
  patientMrn: string; // "PAT-303"
  patientName: string; // "Ananya Iyer"
  statusBadge: string; // "FORMALLY DISCHARGED • HOME CARE TRANSITION"
}

export interface DischargeVitals {
  bp: string; // "120/80 mmHg"
  pulse: string; // "72 bpm"
  spo2: string; // "99% Room Air"
  temp: string; // "98.6° F"
  rr: string; // "16 bpm"
  conditionText: string; // "Afebrile, hemodynamically stable, ambulatory without assistance"
}

export interface LabHighlight {
  testName: string;
  result: string;
  unit: string;
  refRange: string;
  status: 'NORMAL' | 'OPTIMAL' | 'EVALUATED';
}

export interface HospitalCourseSummary {
  diagnosticImpression: string;
  inpatientProcedures: string[];
  clinicalCourseNotes: string;
  vitals: DischargeVitals;
  keyLabHighlights: LabHighlight[];
}

export type MedicationReconciliationType = 'CONTINUED' | 'NEW' | 'DISCONTINUED';

export interface MedicationReconciliationItem {
  id: string;
  name: string; // "Rosuvastatin 20mg Tablet"
  type: MedicationReconciliationType;
  indication: string; // "Cholesterol Lowering & Plaque Stabilization"
  dosageSchedule: string; // "0 - 0 - 1 (Night)"
  duration: string; // "60 Days"
  instructions: string; // "After dinner with water"
  prescribedBy?: string;
}

export interface RecoveryDirectives {
  activityRestrictions: string[];
  dietaryGuidelines: string[];
  redFlagWarnings: string[];
  emergencyPhone: string; // "+91 98111 99993"
  emergencyHospitalName: string; // "Apex Care Medical Center Emergency Department"
}

export interface PostDischargeFollowUp {
  scheduledDate: string; // "Nov 12, 2026 at 10:00 AM"
  location: string; // "OPD Block B, Room 204"
  specialist: string; // "Dr. Sarah Sharma, MD (Cardiology)"
  department: string; // "Cardiology Outpatient Clinic"
  purpose: string; // "First Outpatient Cardiac Review & Echo Follow-up"
  instructions: string; // "Bring home blood pressure log and fasting lipid report."
  bookingReference: string; // "APT-2026-9941"
}

export interface DischargeSummary {
  episode: AdmissionEpisodeContext;
  clearanceSteps: ClearanceStep[];
  hospitalCourse: HospitalCourseSummary;
  medicationReconciliation: MedicationReconciliationItem[];
  discontinuedMedicationsWarning: string;
  recoveryDirectives: RecoveryDirectives;
  followUpPathway: PostDischargeFollowUp;
}

export interface PatientDischargePathwayProps {
  initialData?: Partial<DischargeSummary>;
  onPrint?: () => void;
  onDownloadPdf?: () => void;
  onShare?: () => void;
  onScheduleAppointment?: () => void;
}

// ============================================================================
// DEFAULT MOCK CLINICAL DATA
// ============================================================================

export const DEFAULT_DISCHARGE_DATA: DischargeSummary = {
  episode: {
    hospitalName: 'Apex Care Medical Center',
    hospitalCode: 'ACMC',
    ward: 'General Medicine Ward',
    bedNumber: 'Bed GEN-01',
    admissionDate: 'Oct 24, 2026, 10:15 AM',
    dischargeDate: 'Oct 29, 2026, 02:30 PM',
    lengthOfStay: '5 Days',
    attendingPhysician: 'Dr. Arjun Verma, MD (Internal Medicine)',
    physicianLicense: 'MCI-48201',
    icd10Diagnosis: 'I21.9 - Acute Myocardial Infarction / Unspecified',
    admissionType: 'Emergency Inpatient Admission',
    patientMrn: 'PAT-303',
    patientName: 'Ananya Iyer',
    statusBadge: 'FORMALLY DISCHARGED • HOME CARE TRANSITION'
  },
  clearanceSteps: [
    {
      id: 'STEP-1',
      stepNumber: 1,
      title: 'Clinical Stability & Primary Consultant Sign-off',
      department: 'Internal Medicine / Cardiology',
      description: 'Hemodynamic stability validated, post-catheterization review approved.',
      status: 'COMPLETED',
      signoffBy: 'Dr. Arjun Verma, MD',
      timestamp: 'Oct 29, 2026 • 10:30 AM',
      notes: 'Afebrile, 48h ECG telemetry stable, ambulating independently.'
    },
    {
      id: 'STEP-2',
      stepNumber: 2,
      title: 'Medication Reconciliation & Pharmacy Clearance',
      department: 'Clinical Pharmacology & Inpatient Dispensing',
      description: 'Home drug regimen reconciled, DAPT antiplatelet counseling delivered.',
      status: 'COMPLETED',
      signoffBy: 'Dr. Anita Roy, PharmD',
      timestamp: 'Oct 29, 2026 • 12:15 PM',
      notes: 'Discharge drug kit handed over with dosage timer schedule.'
    },
    {
      id: 'STEP-3',
      stepNumber: 3,
      title: 'Billing, Insurance & TPA Approval',
      department: 'Patient Accounts & Insurance Desk',
      description: 'Cashless health insurance claim authorized and settled in full.',
      status: 'COMPLETED',
      signoffBy: 'Kavita Menon (Billing Lead)',
      timestamp: 'Oct 29, 2026 • 01:45 PM',
      notes: 'Pre-auth code: TPA-MED-881920 • Zero patient liability balance.'
    },
    {
      id: 'STEP-4',
      stepNumber: 4,
      title: 'Final Inpatient Discharge Summary Generated',
      department: 'Hospital Health Informatics (HIMS)',
      description: 'Clinical documentation finalized with digital signature & QR audit stamp.',
      status: 'COMPLETED',
      signoffBy: 'System Engine & Dr. Arjun Verma',
      timestamp: 'Oct 29, 2026 • 02:30 PM',
      notes: 'Ready for official patient download & institutional archive.'
    }
  ],
  hospitalCourse: {
    diagnosticImpression: 'Patient admitted with acute retrosternal chest pain and transient ST-segment elevation. Emergency coronary angiography revealed 85% proximal LAD lesion. Successfully treated via Drug-Eluting Stent (Everolimus 3.0 x 24 mm) under fluoroscopic guidance with zero residual stenosis and TIMI-3 flow. Hospital course complicated by mild sinus bradycardia, resolved with dose titration.',
    inpatientProcedures: [
      'Emergency Percutaneous Coronary Intervention (PCI) with Drug-Eluting Stent (LAD)',
      'Continuous 72-Hour Telemetry & Hemodynamic Monitoring',
      'Serial Cardiac Biomarkers & Troponin-I Clearance Assay',
      'Transthoracic Echocardiography: LVEF 55%, preserved systolic function'
    ],
    clinicalCourseNotes: 'Patient completed 5 days of inpatient care with satisfactory recovery. Ambulatory on flat surfaces without exertional shortness of breath, dizziness, or chest tightness. Baseline renal function stable with eGFR > 85 mL/min.',
    vitals: {
      bp: '120/80 mmHg',
      pulse: '72 bpm',
      spo2: '99% Room Air',
      temp: '98.6° F',
      rr: '16 bpm',
      conditionText: 'Afebrile, hemodynamically stable, ambulatory without assistance'
    },
    keyLabHighlights: [
      { testName: 'High-Sensitivity Troponin-I', result: '0.02', unit: 'ng/mL', refRange: '< 0.04 ng/mL', status: 'OPTIMAL' },
      { testName: 'Serum Creatinine', result: '0.9', unit: 'mg/dL', refRange: '0.6 - 1.1 mg/dL', status: 'NORMAL' },
      { testName: 'Fasting Lipid Panel (LDL-C)', result: '68', unit: 'mg/dL', refRange: '< 70 mg/dL target', status: 'OPTIMAL' },
      { testName: '12-Lead ECG at Discharge', result: 'Normal Sinus Rhythm, No ST-T Elevation', unit: 'Telemetry', refRange: 'Verified', status: 'EVALUATED' }
    ]
  },
  medicationReconciliation: [
    {
      id: 'MED-1',
      name: 'Rosuvastatin 20mg Tablet',
      type: 'CONTINUED',
      indication: 'Cholesterol Lowering & Plaque Stabilization',
      dosageSchedule: '0 - 0 - 1 (Night)',
      duration: '60 Days',
      instructions: 'Take once daily after dinner with water.',
      prescribedBy: 'Dr. Arjun Verma'
    },
    {
      id: 'MED-2',
      name: 'Clopidogrel 75mg Tablet',
      type: 'NEW',
      indication: 'Antiplatelet Blood Thinner (Stent Protection)',
      dosageSchedule: '1 - 0 - 0 (Morning)',
      duration: '60 Days',
      instructions: 'Take once daily with a full glass of water. Do not skip doses.',
      prescribedBy: 'Dr. Arjun Verma'
    },
    {
      id: 'MED-3',
      name: 'Aspirin 81mg (Enteric Coated)',
      type: 'CONTINUED',
      indication: 'Secondary Cardiovascular Prophylaxis',
      dosageSchedule: '0 - 1 - 0 (After Lunch)',
      duration: '90 Days',
      instructions: 'Take with food to protect stomach lining.',
      prescribedBy: 'Dr. Sarah Sharma'
    },
    {
      id: 'MED-4',
      name: 'Telmisartan 40mg Tablet',
      type: 'NEW',
      indication: 'Blood Pressure Control & Cardiac Remodeling',
      dosageSchedule: '1 - 0 - 0 (Morning)',
      duration: '60 Days',
      instructions: 'Take with morning glass of water. Monitor blood pressure weekly.',
      prescribedBy: 'Dr. Arjun Verma'
    },
    {
      id: 'MED-5',
      name: 'Pantoprazole 40mg Tablet',
      type: 'NEW',
      indication: 'Gastroprotection with Dual Antiplatelet Therapy',
      dosageSchedule: '1 - 0 - 0 (Before Breakfast)',
      duration: '30 Days',
      instructions: 'Take on empty stomach 30 minutes before morning meal.',
      prescribedBy: 'Dr. Arjun Verma'
    }
  ],
  discontinuedMedicationsWarning: '⚠️ Discontinue prior medication: Do not take OTC Ibuprofen, Naproxen, or other NSAIDs while on dual blood thinners (Aspirin + Clopidogrel) due to heightened risk of gastrointestinal bleeding. Use Paracetamol (Acetaminophen) for mild pain relief after consulting your physician.',
  recoveryDirectives: {
    activityRestrictions: [
      'Walking permitted on flat surfaces (20-30 minutes daily recommended).',
      'Strictly avoid heavy lifting (> 5 kg / 11 lbs) and intense strenuous exercise for 2 weeks.',
      'Refrain from driving a motor vehicle for 7 days post-stent procedure.',
      'Avoid air travel until cleared at the first outpatient cardiac review.'
    ],
    dietaryGuidelines: [
      'Low sodium intake: Less than 2g (1 teaspoon) of salt per day.',
      'Heart-healthy Mediterranean diet: Fresh vegetables, fruits, whole grains, and lean proteins.',
      'Limit saturated fats, deep-fried snacks, and processed foods.',
      'Maintain daily fluid intake of 1.5 - 2.0 Liters unless advised otherwise.'
    ],
    redFlagWarnings: [
      'Severe, crushing chest tightness or pain radiating to left arm/jaw.',
      'Persistent shortness of breath while resting or speaking.',
      'Sudden dizziness, lightheadedness, cold clammy sweating, or blackouts.',
      'Unusual or prolonged bleeding from gums, nose, urine, or stools (dark tarry stools).'
    ],
    emergencyPhone: '+91 98111 99993',
    emergencyHospitalName: 'Apex Care Medical Center Emergency Department'
  },
  followUpPathway: {
    scheduledDate: 'Nov 12, 2026 at 10:00 AM',
    location: 'OPD Block B, Room 204',
    specialist: 'Dr. Sarah Sharma, MD (Cardiology)',
    department: 'Cardiology Outpatient Clinic',
    purpose: 'First Outpatient Cardiac Review, ECG Check & Medication Titration',
    instructions: 'Please bring your daily home blood pressure & pulse logbook along with current discharge medications.',
    bookingReference: 'APT-2026-9941'
  }
};

// ============================================================================
// MAIN REACT COMPONENT
// ============================================================================

export const PatientDischargePathway: React.FC<PatientDischargePathwayProps> = ({
  initialData = DEFAULT_DISCHARGE_DATA,
  onPrint,
  onDownloadPdf,
  onShare,
  onScheduleAppointment
}) => {
  const data: DischargeSummary = {
    ...DEFAULT_DISCHARGE_DATA,
    ...initialData,
    episode: { ...DEFAULT_DISCHARGE_DATA.episode, ...initialData.episode },
    clearanceSteps: initialData.clearanceSteps || DEFAULT_DISCHARGE_DATA.clearanceSteps,
    hospitalCourse: { ...DEFAULT_DISCHARGE_DATA.hospitalCourse, ...initialData.hospitalCourse },
    medicationReconciliation: initialData.medicationReconciliation || DEFAULT_DISCHARGE_DATA.medicationReconciliation,
    recoveryDirectives: { ...DEFAULT_DISCHARGE_DATA.recoveryDirectives, ...initialData.recoveryDirectives },
    followUpPathway: { ...DEFAULT_DISCHARGE_DATA.followUpPathway, ...initialData.followUpPathway }
  };

  const [activeTab, setActiveTab] = useState<'ALL' | 'COURSE' | 'MEDS' | 'RECOVERY' | 'FOLLOWUP'>('ALL');
  const [copiedShare, setCopiedShare] = useState(false);

  // Print execution handler
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else if (typeof window !== 'undefined') {
      if ((window as any).hospitrackPrintDocument) {
        (window as any).hospitrackPrintDocument('discharge', data.episode.patientMrn);
      } else {
        window.print();
      }
    }
  };

  // PDF download handler
  const handleDownloadPdf = () => {
    if (onDownloadPdf) {
      onDownloadPdf();
    } else if (typeof window !== 'undefined') {
      if ((window as any).hospitrackPrintDocument) {
        (window as any).hospitrackPrintDocument('discharge', data.episode.patientMrn);
      } else {
        window.print();
      }
    }
  };

  // Share handler
  const handleShare = () => {
    if (onShare) {
      onShare();
      return;
    }
    const text = `Hospitrack Inpatient Discharge Summary: ${data.episode.patientName} (${data.episode.patientMrn}) discharged from ${data.episode.hospitalName} on ${data.episode.dischargeDate}. Attending: ${data.episode.attendingPhysician}. Emergency Contact: ${data.recoveryDirectives.emergencyPhone}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 3000);
      });
    }
  };

  // Calendar .ics export
  const handleCalendarExport = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Hospitrack Healthcare Systems//Discharge Care//EN',
      'BEGIN:VEVENT',
      `SUMMARY:${data.followUpPathway.purpose} - ${data.episode.hospitalName}`,
      `DESCRIPTION:Attending Specialist: ${data.followUpPathway.specialist}. Instructions: ${data.followUpPathway.instructions}. Ref: ${data.followUpPathway.bookingReference}`,
      `LOCATION:${data.followUpPathway.location}, ${data.episode.hospitalName}`,
      'DTSTART:20261112T043000Z',
      'DTEND:20261112T053000Z',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `FollowUp_${data.episode.patientMrn}_Nov12.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="discharge-pathway-root min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8 text-slate-800 antialiased font-sans">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ================================================================== */}
        {/* TOP TITLE & BREADCRUMB STRIP                                       */}
        {/* ================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
              <Building2 className="w-4 h-4 text-teal-600" />
              <span>Inpatient Clinical Transition Center</span>
              <span className="text-slate-300">•</span>
              <span>Episode #ACMC-2026-8812</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <span>Discharge Pathway &amp; Records</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                <Check className="w-3.5 h-3.5" />
                FORMALLY DISCHARGED
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-xs"
              title="Print official hospital discharge paperwork"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print Paperwork</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 transition-colors shadow-sm"
              title="Download official discharge summary PDF"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Summary</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              title="Share summary with caregiver"
            >
              <Share2 className="w-4 h-4 text-slate-500" />
              <span>{copiedShare ? 'Copied Link!' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* ================================================================== */}
        {/* SECTION 1: DISCHARGE STATUS & CLEARANCE MILESTONE STEPPER         */}
        {/* ================================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-teal-600" />
                <span>Multi-Department Discharge Clearance Pipeline</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-world clinical clearance milestones required prior to patient discharge release.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>100% CLEARANCE COMPLETE • HOME CARE TRANSITION</span>
            </div>
          </div>

          <HorizontalScrollTrack
            showProgressLine={true}
            progressLinePosition="bottom"
            scrollStep={280}
            fadeMask={true}
            className="w-full"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative min-w-full pb-1">
              {data.clearanceSteps.map((step) => (
                <div
                  key={step.id}
                  className="relative flex flex-col p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70 transition-colors min-w-[220px]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                      Step {step.stepNumber} • Cleared
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 line-clamp-2 mb-1">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 mb-3">
                    {step.description}
                  </p>

                  <div className="mt-auto pt-2 border-t border-emerald-200/60 text-[11px] text-slate-500 space-y-0.5">
                    <div className="font-semibold text-slate-800 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                      <span>{step.signoffBy}</span>
                    </div>
                    <div className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{step.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </HorizontalScrollTrack>
        </div>

        {/* ================================================================== */}
        {/* SECTION 2: ADMISSION & EPISODE CONTEXT BANNER                      */}
        {/* ================================================================== */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-700/60">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {data.episode.hospitalCode} • Inpatient Encounter
                </span>
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white/10 text-slate-200">
                  Length of Stay: <strong className="text-white">{data.episode.lengthOfStay}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  ICD-10: {data.episode.icd10Diagnosis.split(' - ')[0]}
                </span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {data.episode.hospitalName}
                </h2>
                <p className="text-sm text-teal-300 font-medium flex items-center gap-2 mt-0.5">
                  <Building2 className="w-4 h-4" />
                  <span>{data.episode.ward} • {data.episode.bedNumber}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 text-xs text-slate-300 border-t border-white/10">
                <div>
                  <span className="text-slate-400 block font-medium">Admitted At:</span>
                  <strong className="text-white text-xs">{data.episode.admissionDate}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Discharged At:</span>
                  <strong className="text-white text-xs">{data.episode.dischargeDate}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Primary Attending:</span>
                  <strong className="text-teal-300 text-xs">{data.episode.attendingPhysician}</strong>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 justify-center">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-900 bg-teal-400 hover:bg-teal-300 active:bg-teal-500 transition-all shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Download Official Summary</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Paperwork</span>
              </button>
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* INTERACTIVE NAVIGATION TABS                                         */}
        {/* ================================================================== */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'ALL'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
          >
            All Clinical Sections
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('COURSE')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'COURSE'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
          >
            Hospital Course &amp; Vitals
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('MEDS')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'MEDS'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
          >
            Medication Reconciliation
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('RECOVERY')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'RECOVERY'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
          >
            Recovery &amp; Red Flags
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('FOLLOWUP')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'FOLLOWUP'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
          >
            Follow-Up Pathway
          </button>
        </div>

        {/* ================================================================== */}
        {/* SECTION 3A: CARD A - CLINICAL HOSPITAL COURSE & TREATMENT SUMMARY  */}
        {/* ================================================================== */}
        {(activeTab === 'ALL' || activeTab === 'COURSE') && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Card A: Clinical Hospital Course & Treatment Summary
                  </h3>
                  <p className="text-xs text-slate-500">
                    Inpatient diagnostic impression, interventions performed, and discharge vitals.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                Physician Certified
              </span>
            </div>

            {/* Diagnostic Impression */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-600" />
                <span>Diagnostic Impression &amp; Inpatient Course</span>
              </h4>
              <p className="text-sm text-slate-800 leading-relaxed font-normal">
                {data.hospitalCourse.diagnosticImpression}
              </p>
            </div>

            {/* Inpatient Procedures */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                Inpatient Procedures &amp; Interventions
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {data.hospitalCourse.inpatientProcedures.map((proc, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 rounded-lg bg-teal-50/50 border border-teal-100 text-xs text-slate-800 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span>{proc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Discharge Vitals Matrix */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                Discharge Condition &amp; Verified Telemetry Vitals
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[11px] font-semibold text-slate-500 block uppercase">Blood Pressure</span>
                  <strong className="text-lg font-black text-slate-900 block mt-0.5">{data.hospitalCourse.vitals.bp}</strong>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full inline-block mt-1">Normotensive</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[11px] font-semibold text-slate-500 block uppercase">Heart Rate</span>
                  <strong className="text-lg font-black text-slate-900 block mt-0.5">{data.hospitalCourse.vitals.pulse}</strong>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full inline-block mt-1">Resting NSR</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[11px] font-semibold text-slate-500 block uppercase">Oxygen Saturation</span>
                  <strong className="text-lg font-black text-slate-900 block mt-0.5">{data.hospitalCourse.vitals.spo2}</strong>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full inline-block mt-1">Optimal</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[11px] font-semibold text-slate-500 block uppercase">Temperature</span>
                  <strong className="text-lg font-black text-slate-900 block mt-0.5">{data.hospitalCourse.vitals.temp}</strong>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full inline-block mt-1">Afebrile</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 italic mt-2 text-center">
                Discharge Physical Exam: &ldquo;{data.hospitalCourse.vitals.conditionText}&rdquo;
              </p>
            </div>

            {/* Key Lab Highlights */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                Key Diagnostic &amp; Lab Highlights at Discharge
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Diagnostic Investigation</th>
                      <th className="py-2.5 px-3">Discharge Result</th>
                      <th className="py-2.5 px-3">Reference Interval</th>
                      <th className="py-2.5 px-3 text-right">Clinical Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.hospitalCourse.keyLabHighlights.map((lab, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{lab.testName}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-teal-800">{lab.result} {lab.unit}</td>
                        <td className="py-2.5 px-3 text-slate-500">{lab.refRange}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="inline-block px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {lab.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* SECTION 3B: CARD B - DISCHARGE MEDICATION RECONCILIATION           */}
        {/* ================================================================== */}
        {(activeTab === 'ALL' || activeTab === 'MEDS') && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Card B: Discharge Medication Reconciliation (To Take at Home)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Comprehensive drug schedule distinguishing continued, newly prescribed, and discontinued medicines.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                {data.medicationReconciliation.length} Active Home Regimens
              </span>
            </div>

            {/* Reconciliation Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-3.5">Medication &amp; Strength</th>
                    <th className="py-3 px-3.5">Status Category</th>
                    <th className="py-3 px-3.5">Clinical Purpose</th>
                    <th className="py-3 px-3.5">Dosage Schedule</th>
                    <th className="py-3 px-3.5">Duration</th>
                    <th className="py-3 px-3.5">Patient Directives</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.medicationReconciliation.map((med) => {
                    const isNew = med.type === 'NEW';
                    return (
                      <tr key={med.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5 font-bold text-slate-900">
                          <div>{med.name}</div>
                          {med.prescribedBy && (
                            <span className="text-[10px] font-normal text-slate-400">By {med.prescribedBy}</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5">
                          {isNew ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              Newly Added
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Continued Drug
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-slate-700 font-medium">{med.indication}</td>
                        <td className="py-3 px-3.5 font-mono font-bold text-teal-800">
                          <span className="bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                            {med.dosageSchedule}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-slate-600">{med.duration}</td>
                        <td className="py-3 px-3.5 text-slate-600 font-normal">{med.instructions}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Prominent Discontinued Medications Warning Box */}
            <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 flex items-start gap-3.5 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-rose-900">
                  Critical Drug Safety Alert: Discontinued Home Medications
                </h4>
                <p className="text-xs text-rose-800 leading-relaxed font-medium">
                  {data.discontinuedMedicationsWarning}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* SECTION 3C: CARD C - RECOVERY INSTRUCTIONS & RED FLAGS             */}
        {/* ================================================================== */}
        {(activeTab === 'ALL' || activeTab === 'RECOVERY') && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Card C: Recovery Instructions, Diet & Red-Flag Warnings
                  </h3>
                  <p className="text-xs text-slate-500">
                    Activity limitations, dietary guidelines, and immediate emergency contact directives.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Activity Restrictions */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-600" />
                  <span>Physical Activity &amp; Wound Care Guidelines</span>
                </h4>
                <ul className="space-y-2 text-xs text-slate-700">
                  {data.recoveryDirectives.activityRestrictions.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0 mt-1.5"></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Dietary Guidelines */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-teal-600" />
                  <span>Cardiovascular Dietary Directives</span>
                </h4>
                <ul className="space-y-2 text-xs text-slate-700">
                  {data.recoveryDirectives.dietaryGuidelines.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0 mt-1.5"></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Red Flag Warning Box with Direct Speed-Dial */}
            <div className="bg-gradient-to-br from-amber-50 to-rose-50 border-2 border-amber-300 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <BadgeAlert className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-rose-950">
                    Emergency Red-Flag Symptoms — Seek Immediate Medical Attention
                  </h4>
                  <p className="text-xs text-rose-900 mt-0.5">
                    Contact hospital helpline or proceed to the nearest emergency department immediately if you experience:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-rose-900">
                {data.recoveryDirectives.redFlagWarnings.map((warning, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-white/70 border border-rose-200">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-rose-200/80">
                <div className="text-xs text-rose-900">
                  Direct Line to <strong>{data.recoveryDirectives.emergencyHospitalName}</strong>:
                </div>
                <a
                  href={`tel:${data.recoveryDirectives.emergencyPhone.replace(/[^0-9+]/g, '')}`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 transition-colors shadow-sm"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Call Emergency Dispatch: {data.recoveryDirectives.emergencyPhone}</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* SECTION 3D: CARD D - POST-DISCHARGE FOLLOW-UP PATHWAY              */}
        {/* ================================================================== */}
        {(activeTab === 'ALL' || activeTab === 'FOLLOWUP') && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Card D: Post-Discharge Outpatient Review Pathway
                  </h3>
                  <p className="text-xs text-slate-500">
                    Confirmed appointment, location directives, and digital calendar synchronization.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                Ref: {data.followUpPathway.bookingReference}
              </span>
            </div>

            <div className="bg-gradient-to-r from-teal-50/70 to-emerald-50/50 rounded-2xl p-5 border border-teal-200 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-600 text-white shadow-xs">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{data.followUpPathway.scheduledDate}</span>
                </div>

                <h4 className="text-base font-bold text-slate-900">
                  {data.followUpPathway.purpose}
                </h4>

                <div className="text-xs text-slate-700 space-y-1">
                  <p className="font-semibold text-teal-900 flex items-center gap-1.5">
                    <Stethoscope className="w-4 h-4 text-teal-700" />
                    <span>Consultant: {data.followUpPathway.specialist}</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-600">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <span>{data.followUpPathway.location} • {data.followUpPathway.department}</span>
                  </p>
                  <p className="text-slate-500 italic pt-1">
                    Directives: &ldquo;{data.followUpPathway.instructions}&rdquo;
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCalendarExport}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-teal-800 bg-white border border-teal-300 hover:bg-teal-50 transition-colors shadow-xs"
                >
                  <CalendarCheck className="w-4 h-4 text-teal-600" />
                  <span>Add to Google Calendar (.ics)</span>
                </button>
                <button
                  type="button"
                  onClick={onScheduleAppointment}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>Request Virtual Consult</span>
                </button>
                <button
                  type="button"
                  onClick={onScheduleAppointment}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <span>Reschedule Visit</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* FOOTER AUDIT ATTRIBUTION STRIP                                     */}
        {/* ================================================================== */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 py-3 border-t border-slate-200 gap-2">
          <div>
            Hospital Record UID: <code className="font-mono text-slate-600">HIMS-DIS-{data.episode.patientMrn}-2026</code> • Verified by HIMS Informatics
          </div>
          <div className="flex items-center gap-4">
            <span className="text-teal-700 font-semibold">NABH Accredited</span>
            <span>•</span>
            <span className="text-teal-700 font-semibold">NABL ISO 15189 Certified</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PatientDischargePathway;
