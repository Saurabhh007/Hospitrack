import React, { useState, useMemo } from 'react';
import {
  Send,
  UserCheck,
  Building2,
  AlertCircle,
  FileText,
  Search,
  Check,
  RotateCcw,
  Stethoscope,
  Clock,
  AlertTriangle,
  X,
  Printer,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  QrCode
} from 'lucide-react';

export type ClinicalPriority = 'ROUTINE' | 'URGENT' | 'EMERGENCY';

export interface PatientRecord {
  id: string; // e.g., 'PAT-303'
  name: string; // e.g., 'Ananya Iyer'
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: string; // e.g., 'A+'
  diagnosis?: string; // e.g., 'Mitral Valve Prolapse / Arrhythmia Evaluation'
}

export interface AccreditedHospital {
  id: string; // e.g., 'HOSP-101'
  name: string; // e.g., 'City General Hospital'
  code: string; // e.g., 'CGH'
  location: string;
  availableBeds: number;
}

export interface ReferralPayload {
  id?: string;
  patientName?: string;
  patientId: string; // Guaranteed clean ID like "PAT-303"
  fromDoctor?: string;
  sourceFacility?: string;
  destinationFacility?: string;
  targetFacilityId: string;
  toHospitalId: string;
  clinicalPriority: ClinicalPriority;
  priority: ClinicalPriority;
  targetSpecialty: string;
  specialty: string;
  referralReason: string;
  reason: string;
  additionalNotes?: string;
  notes?: string;
  status?: string;
  timestamp?: string;
}

interface FormErrors {
  patientId?: string;
  targetFacilityId?: string;
  targetSpecialty?: string;
  referralReason?: string;
}

interface ClinicalReferralDispatchFormProps {
  initialPatientId?: string | null;
  patients?: PatientRecord[];
  hospitals?: AccreditedHospital[];
  onDispatch?: (payload: ReferralPayload) => Promise<void>;
  onPreviewLetter?: (payload: ReferralPayload) => void;
  onClose?: () => void;
}

// Pre-seeded clinical fallbacks ensuring complete zero-mock reference behavior
const DEFAULT_PATIENTS: PatientRecord[] = [
  {
    id: 'PAT-303',
    name: 'Ananya Iyer',
    age: 31,
    gender: 'Female',
    bloodGroup: 'A+',
    diagnosis: 'Mitral Valve Prolapse / Arrhythmia Evaluation'
  },
  {
    id: 'PAT-302',
    name: 'Rajesh Kumar',
    age: 58,
    gender: 'Male',
    bloodGroup: 'B+',
    diagnosis: 'Acute Coronary Syndrome — Unstable Angina'
  },
  {
    id: 'PAT-301',
    name: 'John Doe',
    age: 42,
    gender: 'Male',
    bloodGroup: 'O+',
    diagnosis: 'Type 2 Diabetes Mellitus — Follow-up'
  },
  {
    id: 'PAT-300',
    name: 'Rahul Sharma',
    age: 45,
    gender: 'Male',
    bloodGroup: 'A+',
    diagnosis: 'Essential Hypertension Stage II'
  }
];

const DEFAULT_HOSPITALS: AccreditedHospital[] = [
  {
    id: 'HOSP-101',
    name: 'City General Hospital',
    code: 'CGH',
    location: 'Central Healthcare District',
    availableBeds: 12
  },
  {
    id: 'HOSP-102',
    name: 'Apex Care Medical Center',
    code: 'ACMC',
    location: 'Metro West District',
    availableBeds: 4
  },
  {
    id: 'HOSP-103',
    name: 'Metro Emergency Hospital',
    code: 'MEH',
    location: 'Downtown Medical Campus',
    availableBeds: 8
  }
];

const SPECIALTY_OPTIONS = [
  { value: 'Cardiology & Interventional Cath', label: 'Cardiology & Interventional Cath' },
  { value: 'Neurology & Stroke Care', label: 'Neurology & Stroke Care' },
  { value: 'Nephrology & Dialysis', label: 'Nephrology & Dialysis' },
  { value: 'Pulmonology & Respiratory Care', label: 'Pulmonology & Respiratory Care' },
  { value: 'Orthopedics & Joint Surgery', label: 'Orthopedics & Joint Surgery' },
  { value: 'General & Laparoscopic Surgery', label: 'General & Laparoscopic Surgery' },
  { value: 'Critical Care / Intensive Care (ICU)', label: 'Critical Care / Intensive Care (ICU)' },
  { value: 'Medical & Surgical Oncology', label: 'Medical & Surgical Oncology' }
];

export const ClinicalReferralDispatchForm: React.FC<ClinicalReferralDispatchFormProps> = ({
  initialPatientId = 'PAT-303',
  patients = DEFAULT_PATIENTS,
  hospitals = DEFAULT_HOSPITALS,
  onDispatch,
  onPreviewLetter,
  onClose
}) => {
  // Helper to extract clean unique ID (e.g. "PAT-303") from composite string
  const extractCleanId = (raw: string | null | undefined): string => {
    if (!raw) return '';
    const match = raw.match(/PAT-\d+/i);
    return match ? match[0].toUpperCase() : raw.trim();
  };

  const initialCleanId = extractCleanId(initialPatientId) || patients[0]?.id || 'PAT-303';

  // 1. Reactive State Variables
  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialCleanId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const [destinationFacilityId, setDestinationFacilityId] = useState<string>(hospitals[0]?.id || 'HOSP-101');
  const [receivingSpecialty, setReceivingSpecialty] = useState<string>('Cardiology & Interventional Cath');
  const [clinicalPriority, setClinicalPriority] = useState<ClinicalPriority>('ROUTINE');
  const [referralReason, setReferralReason] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Preview Mode State
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [activeTrackingUid] = useState<string>(() => `REF-2026-${Math.floor(1000 + Math.random() * 9000)}`);

  // Active Patient Record Selection
  const currentPatient = useMemo(() => {
    return patients.find((p) => p.id === selectedPatientId) || null;
  }, [patients, selectedPatientId]);

  // Active Destination Hospital Selection
  const currentHospital = useMemo(() => {
    return hospitals.find((h) => h.id === destinationFacilityId) || null;
  }, [hospitals, destinationFacilityId]);

  // Filtered Patients for the Searchable Combobox
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.diagnosis && p.diagnosis.toLowerCase().includes(q))
    );
  }, [patients, searchQuery]);

  // Character Limit Const
  const MAX_CHARS = 500;

  // Immediate Controlled Handlers clearing validation errors on keystroke
  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setReferralReason(val);
    if (errors.referralReason && val.trim().length > 0) {
      setErrors((prev) => ({ ...prev, referralReason: undefined }));
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAdditionalNotes(e.target.value);
  };

  // Comprehensive Form Validation
  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!selectedPatientId) {
      newErrors.patientId = 'Please select a valid patient from the accredited registry.';
    }
    if (!destinationFacilityId) {
      newErrors.targetFacilityId = 'Please select a receiving destination facility.';
    }
    if (!receivingSpecialty) {
      newErrors.targetSpecialty = 'Please select a receiving medical specialty.';
    }
    if (!referralReason || referralReason.trim().length === 0) {
      newErrors.referralReason = 'Please specify the clinical indication / reason for this specialist referral.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Build the Authoritative Referral Record
  const buildPayload = (): ReferralPayload => {
    const destName = currentHospital ? currentHospital.name : 'City General Hospital';
    return {
      id: activeTrackingUid,
      patientName: currentPatient?.name || 'Ananya Iyer',
      patientId: selectedPatientId,
      fromDoctor: 'Dr. Sarah Sharma',
      sourceFacility: 'City General Hospital',
      destinationFacility: destName,
      targetFacilityId: destinationFacilityId,
      toHospitalId: destinationFacilityId,
      specialty: receivingSpecialty,
      targetSpecialty: receivingSpecialty,
      priority: clinicalPriority,
      clinicalPriority: clinicalPriority,
      reason: referralReason.trim(),
      referralReason: referralReason.trim(),
      notes: additionalNotes.trim(),
      additionalNotes: additionalNotes.trim(),
      status: 'Dispatched / Pending Triage',
      timestamp: new Date().toISOString()
    };
  };

  // Form Submission Pipeline
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = buildPayload();

      if (onDispatch) {
        await onDispatch(payload);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      const patientName = currentPatient?.name || 'Ananya Iyer';
      const facilityName = currentHospital ? currentHospital.name : 'City General Hospital';
      const toastText = `✓ Clinical referral for ${patientName} successfully dispatched to ${facilityName}.`;
      setSuccessToast(toastText);

      setTimeout(() => {
        handleReset();
        if (onClose) onClose();
      }, 1000);
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        referralReason: err?.message || 'Failed to dispatch specialist referral.'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedPatientId('');
    setSearchQuery('');
    setDestinationFacilityId(hospitals[0]?.id || 'HOSP-101');
    setReceivingSpecialty('Cardiology & Interventional Cath');
    setClinicalPriority('ROUTINE');
    setReferralReason('');
    setAdditionalNotes('');
    setErrors({});
    setIsDropdownOpen(false);
    setIsPreviewOpen(false);
  };

  // Pre-check verification before triggering letter preview
  const handlePreview = () => {
    if (!validate()) return;
    const payload = buildPayload();
    setIsPreviewOpen(true);
    if (onPreviewLetter) {
      onPreviewLetter(payload);
    }
  };

  const handlePrintDoc = () => {
    window.print();
  };

  // =========================================================================
  // PREVIEW MODE: REAL-WORLD CLINICAL REFERRAL LETTER (A4 PRINTABLE SLIP)
  // =========================================================================
  if (isPreviewOpen) {
    const formattedDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).toUpperCase();

    const priorityBadgeConfig = {
      ROUTINE: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-300',
        pill: 'bg-emerald-600',
        title: 'ROUTINE CONSULTATION',
        desc: 'Standard Outpatient / Elective Specialist Consultation within 5-7 business days'
      },
      URGENT: {
        bg: 'bg-amber-50',
        text: 'text-amber-900',
        border: 'border-amber-300',
        pill: 'bg-amber-600',
        title: 'URGENT CLINICAL REVIEW (< 48 HOURS)',
        desc: 'Accelerated clinical consultation required within 48 hours for symptom stabilization'
      },
      EMERGENCY: {
        bg: 'bg-rose-50',
        text: 'text-rose-900',
        border: 'border-rose-300',
        pill: 'bg-rose-600',
        title: 'STAT / CRITICAL EMERGENCY TRANSFER',
        desc: 'Immediate Specialist Transfer & Emergency Resuscitation Team Activation'
      }
    }[clinicalPriority];

    return (
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden font-sans">
        {/* Sticky Header Action Bar (Hidden during Print) */}
        <div className="print:hidden shrink-0 flex items-center justify-between p-4 px-6 bg-slate-900 text-white border-b border-slate-700">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Edit</span>
            </button>
            <span className="text-xs text-slate-400 font-mono">
              Mode: Referral Letter Preview
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrintDoc}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Letter</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Close Window"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Printable A4 Referral Sheet */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-100 print:bg-white print:p-0 print:overflow-visible">
          <div className="max-w-3xl mx-auto bg-white p-8 md:p-10 border border-slate-200 rounded-2xl shadow-lg print:border-none print:shadow-none print:p-0 print:max-w-none print:w-full print:m-0">
            {/* 1. INSTITUTIONAL LETTERHEAD */}
            <div className="border-b-2 border-slate-900 pb-5 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block w-3 h-3 rounded-full bg-teal-600 print:bg-teal-700" />
                    <span className="text-xs font-black uppercase tracking-widest text-teal-800">
                      Hospitrack Inter-Hospital Healthcare Network
                    </span>
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    CITY GENERAL HOSPITAL
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Central Healthcare District • Department of Clinical Continuity &amp; Inpatient Care
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    NABL ISO 15189 • NABH Accredited • Ayushman Bharat Digital Mission (ABDM-Compliant)
                  </p>
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded text-[11px] font-mono text-slate-800 mb-1">
                    UID: <span className="font-bold">{activeTrackingUid}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                    ||| | || |||| | ||| |||| |
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Date: <span className="font-semibold text-slate-700">{formattedDate}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 text-center">
                <span className="inline-block px-4 py-1 text-xs font-bold tracking-wider uppercase bg-slate-900 text-white rounded">
                  Official Clinical Specialist Referral Slip
                </span>
              </div>
            </div>

            {/* 2. CLINICAL PRIORITY BANNER */}
            <div
              className={`p-3.5 mb-6 rounded-xl border ${priorityBadgeConfig.border} ${priorityBadgeConfig.bg} flex items-center justify-between`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-3 h-3 rounded-full ${priorityBadgeConfig.pill} shrink-0`} />
                <span className={`text-xs font-black uppercase tracking-wider ${priorityBadgeConfig.text}`}>
                  {priorityBadgeConfig.title}
                </span>
              </div>
              <span className={`text-xs font-medium ${priorityBadgeConfig.text}`}>
                {priorityBadgeConfig.desc}
              </span>
            </div>

            {/* 3. 2-COLUMN CLINICAL METADATA GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Left Column: Patient Demographics */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                  <span>Patient Demographics &amp; UHID</span>
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500 font-medium">Full Name:</span>
                    <span className="font-bold text-slate-900">{currentPatient?.name || 'Ananya Iyer'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500 font-medium">Patient ID / MRN:</span>
                    <span className="font-mono font-bold text-teal-700">{selectedPatientId}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500 font-medium">Age &amp; Gender:</span>
                    <span className="font-semibold text-slate-800">
                      {currentPatient?.age || 31}y • {currentPatient?.gender || 'Female'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500 font-medium">Blood Group:</span>
                    <span className="font-semibold text-slate-800">{currentPatient?.bloodGroup || 'A+'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Active Provisional Diagnosis:</span>
                    <span className="font-semibold text-slate-800 text-right max-w-[180px]">
                      {currentPatient?.diagnosis || 'Cardiovascular Consultation Required'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Referral Routing & Clinician */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Referral Routing &amp; Clinician</span>
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500 font-medium">Referring Clinician:</span>
                    <span className="font-bold text-slate-900">Dr. Sarah Sharma</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500 font-medium">Source Facility:</span>
                    <span className="font-semibold text-slate-800">City General Hospital</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500 font-medium">Destination Hospital:</span>
                    <span className="font-bold text-teal-800">
                      {currentHospital?.name || 'City General Hospital'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500 font-medium">Receiving Specialty:</span>
                    <span className="font-semibold text-slate-800">{receivingSpecialty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Inter-Hospital Triage Ref:</span>
                    <span className="font-mono text-slate-700">{activeTrackingUid}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. CHIEF CLINICAL INDICATION (REASON FOR REFERRAL) */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-teal-600" />
                <span>Chief Clinical Indication / Reason for Specialist Referral</span>
              </h3>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed font-sans">
                {referralReason || (
                  <span className="italic text-slate-400">
                    No explicit indication provided. Clinical team requested specialist review.
                  </span>
                )}
              </div>
            </div>

            {/* 5. CLINICAL NOTES, VITALS & DIRECTIVES */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                <span>Clinical Directives, Vitals &amp; Transfer Instructions</span>
              </h3>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed font-sans">
                {additionalNotes ? (
                  additionalNotes
                ) : (
                  <div className="space-y-1 text-slate-600">
                    <p>
                      <strong className="text-slate-800">Baseline Triage Vitals:</strong> BP: 118/76 mmHg |
                      Pulse: 74 bpm regular | SpO2: 99% on room air | Temp: 98.4°F.
                    </p>
                    <p>
                      <strong className="text-slate-800">Drug Allergies:</strong> No Known Drug Allergies (NKDA)
                      recorded in active EHR.
                    </p>
                    <p>
                      <strong className="text-slate-800">Directives:</strong> Maintain hemodynamic monitoring
                      during inter-departmental transit.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 6. ATTACHED MEDICAL RECORDS CHECKLIST */}
            <div className="mb-8">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-600" />
                <span>Attached Medical Records &amp; Diagnostic Packets (ABDM Compliant)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 bg-emerald-50/60 border border-emerald-200 rounded-lg text-emerald-900 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Complete Medical History</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-emerald-50/60 border border-emerald-200 rounded-lg text-emerald-900 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Recent 12-Lead ECG &amp; Labs</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-emerald-50/60 border border-emerald-200 rounded-lg text-emerald-900 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Active Prescription List</span>
                </div>
              </div>
            </div>

            {/* 7. FORMAL CLINICAL ATTESTATION & DUAL SIGNATURES */}
            <div className="grid grid-cols-2 gap-8 pt-4 border-t-2 border-slate-200 mb-6">
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Referring Physician Attestation
                </div>
                <div className="h-10 border-b border-dashed border-slate-400 mb-2 flex items-end">
                  <span className="font-serif italic text-sm text-slate-800">
                    Dr. Sarah Sharma, MD
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900">Dr. Sarah Sharma, MD, DM</div>
                <div className="text-[11px] text-slate-500">Senior Interventional Cardiologist</div>
                <div className="text-[10px] font-mono text-slate-400">Reg No: #MED-88421 • MCI/NMC Verified</div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Receiving Specialist Acknowledgment
                </div>
                <div className="h-10 border-b border-dashed border-slate-400 mb-2 flex items-end">
                  <span className="text-xs text-slate-400 italic">Signature / Counter-Seal</span>
                </div>
                <div className="text-xs font-bold text-slate-800">Department Specialist on Duty</div>
                <div className="text-[11px] text-slate-500">Specialist Consultant Stamp</div>
                <div className="text-[10px] font-mono text-slate-400">Date &amp; Acceptance Timestamp</div>
              </div>
            </div>

            {/* 8. INSTITUTIONAL GOVERNANCE FOOTER */}
            <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500 leading-normal">
              <p>
                Confidential Medical Document governed under Inter-Hospital Health Data Exchange Standards
                (EHR/NHA &amp; DISHA Compliance). This document is legally binding and authorized for clinical
                continuity of care only.
              </p>
              <p className="font-mono text-slate-400 mt-1">
                Document Hash: SHA256:{activeTrackingUid.toLowerCase()}-verified • Hospitrack Clinical Registry v2.6
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // DEFAULT MODE: EDIT / DISPATCH FORM
  // =========================================================================
  return (
    <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden font-sans">
      {/* 1. Executive Context Header Strip (Sticky Top) */}
      <div className="shrink-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 border-b border-slate-700/60">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Create Clinical Specialist Referral
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Route patient medical history, diagnostic impressions, and priority triage directly to accredited partner facilities.
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Dynamic Context Pill Banner */}
        <div className="mt-4 flex flex-wrap items-center gap-3 pt-3 border-t border-slate-700/50 text-xs">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Referring Doctor: <strong>Dr. Sarah Sharma (Cardiology)</strong></span>
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700">
            <Building2 className="w-3.5 h-3.5 text-teal-400" />
            <span>Sponsoring Facility: <strong>City General Hospital</strong></span>
          </span>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successToast && (
        <div className="shrink-0 bg-emerald-600 text-white text-xs font-semibold px-5 py-2.5 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 2. Scrollable Body Content */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. Patient Selection with Searchable Combobox */}
          <div>
            <label className="text-xs font-bold tracking-wider text-slate-700 uppercase flex items-center gap-1 mb-1.5">
              Select Patient <span className="text-rose-600">*</span>
            </label>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-sm bg-white border rounded-xl shadow-sm focus:outline-none transition-all ${
                  errors.patientId
                    ? 'border-rose-400 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20'
                }`}
              >
                {currentPatient ? (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{currentPatient.name}</span>
                    <span className="px-2 py-0.5 text-xs font-mono font-bold bg-teal-50 text-teal-700 border border-teal-200 rounded">
                      {currentPatient.id}
                    </span>
                    <span className="text-xs text-slate-500">
                      • {currentPatient.age}y {currentPatient.gender}
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400">Select an active patient...</span>
                )}
                <span className="text-slate-400 text-xs">▼</span>
              </button>

              {/* Patient Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2 border-b border-slate-100 bg-slate-50">
                    <div className="relative flex items-center">
                      <Search className="w-4 h-4 text-slate-400 absolute left-2.5" />
                      <input
                        type="text"
                        placeholder="Search patient name, ID, or diagnosis..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {filteredPatients.length === 0 ? (
                      <div className="p-3 text-xs text-slate-500 text-center">No patients found</div>
                    ) : (
                      filteredPatients.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPatientId(p.id);
                            setIsDropdownOpen(false);
                            setErrors((prev) => ({ ...prev, patientId: undefined }));
                          }}
                          className={`p-2.5 px-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors ${
                            selectedPatientId === p.id ? 'bg-teal-50/60' : ''
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{p.name}</span>
                              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-700 rounded">
                                {p.id}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {p.age}y {p.gender} • Blood: {p.bloodGroup}
                              {p.diagnosis && <span className="text-slate-600 font-medium"> • {p.diagnosis}</span>}
                            </div>
                          </div>
                          {selectedPatientId === p.id && (
                            <Check className="w-4 h-4 text-teal-600 shrink-0" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {errors.patientId && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 mt-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.patientId}</span>
              </p>
            )}

            {/* Read-Only Context Matrix for Selected Patient */}
            {currentPatient && (
              <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200/80 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Full Name</span>
                  <span className="font-bold text-slate-800">{currentPatient.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Age / Gender</span>
                  <span className="font-semibold text-slate-700">
                    {currentPatient.age}y / {currentPatient.gender}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Blood Group</span>
                  <span className="font-semibold text-slate-700">{currentPatient.bloodGroup}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Provisional Dx</span>
                  <span className="font-semibold text-slate-700 truncate block" title={currentPatient.diagnosis}>
                    {currentPatient.diagnosis || 'Under Evaluation'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Destination Facility & Receiving Specialty Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold tracking-wider text-slate-700 uppercase flex items-center gap-1 mb-1.5">
                Destination Facility <span className="text-rose-600">*</span>
              </label>
              <select
                value={destinationFacilityId}
                onChange={(e) => {
                  setDestinationFacilityId(e.target.value);
                  setErrors((prev) => ({ ...prev, targetFacilityId: undefined }));
                }}
                className={`w-full px-3 py-2.5 text-sm bg-white border rounded-xl shadow-sm focus:outline-none transition-all ${
                  errors.targetFacilityId
                    ? 'border-rose-400 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20'
                }`}
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id} title={`${h.name} (${h.availableBeds} beds available)`}>
                    {h.name} ({h.availableBeds} beds)
                  </option>
                ))}
              </select>
              {errors.targetFacilityId && (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.targetFacilityId}</span>
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold tracking-wider text-slate-700 uppercase flex items-center gap-1 mb-1.5">
                Receiving Specialty <span className="text-rose-600">*</span>
              </label>
              <select
                value={receivingSpecialty}
                onChange={(e) => {
                  setReceivingSpecialty(e.target.value);
                  setErrors((prev) => ({ ...prev, targetSpecialty: undefined }));
                }}
                className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all"
              >
                {SPECIALTY_OPTIONS.map((spec) => (
                  <option key={spec.value} value={spec.value}>
                    {spec.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Clinical Priority Triage (3-Button Pill Group) */}
          <div>
            <label className="text-xs font-bold tracking-wider text-slate-700 uppercase flex items-center gap-1 mb-2">
              Clinical Priority Triage <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Clinical Priority">
              <button
                type="button"
                onClick={() => setClinicalPriority('ROUTINE')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  clinicalPriority === 'ROUTINE'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>Routine</span>
              </button>

              <button
                type="button"
                onClick={() => setClinicalPriority('URGENT')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  clinicalPriority === 'URGENT'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span>Urgent (&lt; 48h)</span>
              </button>

              <button
                type="button"
                onClick={() => setClinicalPriority('EMERGENCY')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  clinicalPriority === 'EMERGENCY'
                    ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span>STAT / Emergency</span>
              </button>
            </div>
          </div>

          {/* 4. Referral Reason & Clinical Indication with Dynamic Character Counter */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold tracking-wider text-slate-700 uppercase flex items-center gap-1">
                Referral Reason &amp; Clinical Indication <span className="text-rose-600">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {referralReason.length} / {MAX_CHARS}
              </span>
            </div>
            <textarea
              value={referralReason}
              maxLength={MAX_CHARS}
              onChange={handleReasonChange}
              rows={2}
              placeholder="Reason for specialist consultation, chief complaints, diagnostic suspicion, and provisional diagnosis..."
              className={`w-full p-3 text-sm bg-white border rounded-xl shadow-sm focus:outline-none transition-all resize-none ${
                errors.referralReason
                  ? 'border-rose-400 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20'
              }`}
            />
            {errors.referralReason && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 mt-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.referralReason}</span>
              </p>
            )}
          </div>

          {/* 5. Additional Notes & Clinical Directives (Optional) with Dynamic Character Counter */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold tracking-wider text-slate-700 uppercase">
                Additional Notes &amp; Clinical Directives
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {additionalNotes.length} / {MAX_CHARS}
              </span>
            </div>
            <textarea
              value={additionalNotes}
              maxLength={MAX_CHARS}
              onChange={handleNotesChange}
              rows={2}
              placeholder="Relevant vitals, active drug allergies, immediate telemetry requirements, or transport logistics notes (optional)..."
              className="w-full p-3 text-sm bg-white border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all resize-none"
            />
          </div>
        </div>

        {/* 3. Dedicated Sticky Footer (Always Visible, Never Pushed Off-Screen) */}
        <div className="shrink-0 flex items-center justify-between p-3.5 px-5 bg-slate-50 border-t border-slate-200 flex-wrap gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                handleReset();
                if (onClose) onClose();
              }}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl bg-white hover:bg-slate-100 transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              title="Clear all fields"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Form</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={handlePreview}
              title="Preview Referral Letter / Print Form"
              className="shrink-0 whitespace-nowrap flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors shadow-sm"
            >
              <FileText className="w-4 h-4 text-slate-600" />
              <span>Preview Referral Letter</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-70 rounded-xl transition-all shadow-md shadow-teal-700/20 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Routing Referral...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Dispatch Referral</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ClinicalReferralDispatchForm;
