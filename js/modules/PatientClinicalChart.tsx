import React, { useState, useMemo } from 'react';
import {
  HeartPulse,
  Activity,
  Thermometer,
  Droplets,
  Pill,
  Plus,
  Phone,
  ShieldCheck,
  Bed,
  MapPin,
  Clock,
  Printer,
  X,
  Search,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit3,
  FlaskConical,
  Stethoscope,
  Building2,
  UserCheck
} from 'lucide-react';

export interface PatientDemographics {
  id: string; // e.g. "PAT-303"
  name: string; // e.g. "Ananya Iyer"
  age: number; // 31
  gender: 'Female' | 'Male' | 'Other';
  bloodGroup: string; // "A+"
  status: 'CHECKED_IN' | 'ADMITTED' | 'DISCHARGED' | 'TRANSFER_PENDING';
  ward: string; // "General Medicine Ward"
  bedNumber: string; // "GEN-01"
  attendingDoctor: string; // "Dr. Arjun Verma"
  facility: string; // "Apex Care Medical Center"
  emergencyContact: {
    name: string; // "Karthik Iyer"
    relation: string; // "Husband"
    phone: string; // "+91 98111 99993"
  };
  address: string; // "42-B, Indiranagar 1st Stage, Bengaluru, KA - 560038"
  chiefComplaint: string; // "Episodes of atypical chest discomfort radiating to left shoulder on exertion..."
  allergies: string[]; // [] for NKDA, or e.g. ["Penicillin", "Sulfa Drugs"]
  medicalHistory?: string[]; // ["Mitral Valve Prolapse", "Mild Dyslipidemia"]
}

export interface MedicationItem {
  id: string;
  name: string; // e.g. "Paracetamol"
  dosage: string; // "500mg"
  form: 'Tablet' | 'Capsule' | 'IV Infusion' | 'Syrup' | 'Injection';
  frequency: 'Once Daily [OD]' | 'Twice Daily [BD]' | 'Thrice Daily [TDS]' | 'STAT / SOS';
  scheduleTag: string; // "1 - 0 - 1 • After Meals"
  route: 'Oral' | 'Intravenous (IV)' | 'Subcutaneous (SC)' | 'Inhalation';
  timing: 'After Meals' | 'Before Meals' | 'With Meals' | 'Bedtime (HS)';
  duration: string; // "5 days"
  prescribedAt: string; // "Just now" or "28-Oct-2026, 10:30 AM"
  prescribedBy: string; // "Dr. Arjun Verma"
  instructions?: string;
  status: 'ACTIVE' | 'DISCONTINUED';
}

export interface LabOrderItem {
  id: string;
  testName: string; // e.g. "Complete Blood Count (CBC)"
  category: string; // "Hematology & Biomarkers"
  orderedAt: string; // "28-Oct-2026, 09:15 AM"
  orderedBy: string; // "Dr. Arjun Verma"
  status: 'SAMPLE_COLLECTED' | 'PROCESSING_IN_LAB' | 'READY_FOR_REVIEW';
  statusText: string;
  resultSummary?: string;
}

export interface DrugCatalogSuggestion {
  name: string;
  dosage: string;
  form: 'Tablet' | 'Capsule' | 'IV Infusion' | 'Syrup' | 'Injection';
  defaultFrequency: 'Once Daily [OD]' | 'Twice Daily [BD]' | 'Thrice Daily [TDS]' | 'STAT / SOS';
  defaultRoute: 'Oral' | 'Intravenous (IV)' | 'Subcutaneous (SC)' | 'Inhalation';
  defaultTiming: 'After Meals' | 'Before Meals' | 'With Meals' | 'Bedtime (HS)';
  category: string;
}

const DRUG_SUGGESTIONS: DrugCatalogSuggestion[] = [
  { name: 'Paracetamol (Acetaminophen)', dosage: '500mg', form: 'Tablet', defaultFrequency: 'Thrice Daily [TDS]', defaultRoute: 'Oral', defaultTiming: 'After Meals', category: 'Analgesic & Antipyretic' },
  { name: 'Amoxicillin-Clavulanate (Augmentin)', dosage: '625mg', form: 'Tablet', defaultFrequency: 'Twice Daily [BD]', defaultRoute: 'Oral', defaultTiming: 'With Meals', category: 'Broad-Spectrum Antibiotic' },
  { name: 'Atorvastatin Calcium (Lipitor)', dosage: '20mg', form: 'Tablet', defaultFrequency: 'Once Daily [OD]', defaultRoute: 'Oral', defaultTiming: 'Bedtime (HS)', category: 'Lipid-Lowering Agent' },
  { name: 'Aspirin (Ecosprin Gastro-resistant)', dosage: '75mg', form: 'Tablet', defaultFrequency: 'Once Daily [OD]', defaultRoute: 'Oral', defaultTiming: 'After Meals', category: 'Antiplatelet Therapy' },
  { name: 'Metoprolol Succinate (Betaloc)', dosage: '25mg', form: 'Tablet', defaultFrequency: 'Twice Daily [BD]', defaultRoute: 'Oral', defaultTiming: 'After Meals', category: 'Beta-Blocker / Antianginal' },
  { name: 'Pantoprazole Sodium (Pan-40)', dosage: '40mg', form: 'Tablet', defaultFrequency: 'Once Daily [OD]', defaultRoute: 'Oral', defaultTiming: 'Before Meals', category: 'Proton Pump Inhibitor' },
  { name: 'Ceftriaxone Sodium (Monocef)', dosage: '1g', form: 'IV Infusion', defaultFrequency: 'Once Daily [OD]', defaultRoute: 'Intravenous (IV)', defaultTiming: 'After Meals', category: 'Cephalosporin Antibiotic' },
  { name: 'Azithromycin Dihydrate (Azee)', dosage: '500mg', form: 'Tablet', defaultFrequency: 'Once Daily [OD]', defaultRoute: 'Oral', defaultTiming: 'Before Meals', category: 'Macrolide Antibiotic' },
  { name: 'Ondansetron HCl (Emeset)', dosage: '4mg', form: 'Injection', defaultFrequency: 'STAT / SOS', defaultRoute: 'Intravenous (IV)', defaultTiming: 'Before Meals', category: 'Antiemetic' }
];

const INITIAL_PATIENT: PatientDemographics = {
  id: 'PAT-303',
  name: 'Ananya Iyer',
  age: 31,
  gender: 'Female',
  bloodGroup: 'A+',
  status: 'CHECKED_IN',
  ward: 'General Medicine Ward',
  bedNumber: 'GEN-01',
  attendingDoctor: 'Dr. Arjun Verma',
  facility: 'Apex Care Medical Center',
  emergencyContact: {
    name: 'Karthik Iyer',
    relation: 'Husband',
    phone: '+91 98111 99993'
  },
  address: '42-B, Indiranagar 1st Stage, Bengaluru, KA - 560038',
  chiefComplaint: 'Episodes of atypical chest discomfort radiating to left shoulder on exertion, accompanied by episodic palpitations and mild fatigue.',
  allergies: [], // NKDA
  medicalHistory: ['Mitral Valve Prolapse Evaluation', 'Mild Dyslipidemia']
};

export const PatientClinicalChart: React.FC<{
  patient?: PatientDemographics;
  onNavigateTab?: (tab: string) => void;
}> = ({ patient = INITIAL_PATIENT, onNavigateTab }) => {
  // 1. Reactive Medications State
  const [medications, setMedications] = useState<MedicationItem[]>([
    {
      id: 'MED-101',
      name: 'Metoprolol Succinate',
      dosage: '25mg',
      form: 'Tablet',
      frequency: 'Twice Daily [BD]',
      scheduleTag: '1 - 0 - 1 • After Meals',
      route: 'Oral',
      timing: 'After Meals',
      duration: '14 days',
      prescribedAt: '28-Oct-2026, 10:30 AM',
      prescribedBy: 'Dr. Arjun Verma',
      instructions: 'Take after meals. Monitor morning resting pulse.',
      status: 'ACTIVE'
    },
    {
      id: 'MED-102',
      name: 'Pantoprazole Sodium',
      dosage: '40mg',
      form: 'Tablet',
      frequency: 'Once Daily [OD]',
      scheduleTag: '1 - 0 - 0 • Before Breakfast',
      route: 'Oral',
      timing: 'Before Meals',
      duration: '7 days',
      prescribedAt: '28-Oct-2026, 10:30 AM',
      prescribedBy: 'Dr. Arjun Verma',
      instructions: 'Administer 30 mins prior to breakfast.',
      status: 'ACTIVE'
    }
  ]);

  // 2. Reactive Diagnostic Lab Orders State
  const [labOrders, setLabOrders] = useState<LabOrderItem[]>([
    {
      id: 'LAB-901',
      testName: 'Complete Blood Count (CBC) with Automated Differential',
      category: 'Diagnostic Hematology',
      orderedAt: '28-Oct-2026, 09:15 AM',
      orderedBy: 'Dr. Arjun Verma',
      status: 'PROCESSING_IN_LAB',
      statusText: 'Processing in Lab',
      resultSummary: 'Specimen barcoded and incubated in automated flow cytometer.'
    },
    {
      id: 'LAB-902',
      testName: 'High-Sensitivity Cardiac Troponin-I (hs-cTnI)',
      category: 'Cardiac Telemetry Biomarker',
      orderedAt: '28-Oct-2026, 09:15 AM',
      orderedBy: 'Dr. Arjun Verma',
      status: 'SAMPLE_COLLECTED',
      statusText: 'Sample Collected',
      resultSummary: 'Venous blood serum collected via phlebotomy; routed to clinical pathology.'
    }
  ]);

  // 3. Slide-over "+ Add Drug" Modal State
  const [isAddDrugOpen, setIsAddDrugOpen] = useState<boolean>(false);
  const [drugSearchQuery, setDrugSearchQuery] = useState<string>('');
  const [isDrugDropdownOpen, setIsDrugDropdownOpen] = useState<boolean>(false);
  const [editingMedId, setEditingMedId] = useState<string | null>(null);

  // Form Fields
  const [drugName, setDrugName] = useState<string>('');
  const [dosage, setDosage] = useState<string>('500mg');
  const [formType, setFormType] = useState<MedicationItem['form']>('Tablet');
  const [frequency, setFrequency] = useState<MedicationItem['frequency']>('Twice Daily [BD]');
  const [route, setRoute] = useState<MedicationItem['route']>('Oral');
  const [timing, setTiming] = useState<MedicationItem['timing']>('After Meals');
  const [durationDays, setDurationDays] = useState<number>(5);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Autocomplete Suggestions
  const filteredSuggestions = useMemo(() => {
    if (!drugSearchQuery.trim()) return DRUG_SUGGESTIONS;
    const q = drugSearchQuery.toLowerCase();
    return DRUG_SUGGESTIONS.filter(
      (d) => d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)
    );
  }, [drugSearchQuery]);

  const handleSelectSuggestion = (s: DrugCatalogSuggestion) => {
    setDrugName(s.name);
    setDosage(s.dosage);
    setFormType(s.form);
    setFrequency(s.defaultFrequency);
    setRoute(s.defaultRoute);
    setTiming(s.defaultTiming);
    setDrugSearchQuery(s.name);
    setIsDrugDropdownOpen(false);
    setFormError(null);
  };

  const handleOpenAddDrugModal = (existingMed?: MedicationItem) => {
    if (existingMed) {
      setEditingMedId(existingMed.id);
      setDrugName(existingMed.name);
      setDrugSearchQuery(existingMed.name);
      setDosage(existingMed.dosage);
      setFormType(existingMed.form);
      setFrequency(existingMed.frequency);
      setRoute(existingMed.route);
      setTiming(existingMed.timing);
      setDurationDays(parseInt(existingMed.duration) || 5);
      setSpecialInstructions(existingMed.instructions || '');
    } else {
      setEditingMedId(null);
      setDrugName('');
      setDrugSearchQuery('');
      setDosage('500mg');
      setFormType('Tablet');
      setFrequency('Twice Daily [BD]');
      setRoute('Oral');
      setTiming('After Meals');
      setDurationDays(5);
      setSpecialInstructions('');
    }
    setFormError(null);
    setIsDrugDropdownOpen(false);
    setIsAddDrugOpen(true);
  };

  const handleSaveDrug = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drugName.trim()) {
      setFormError('Please select or specify a valid drug name.');
      return;
    }

    // Determine Schedule Tag
    let sched = '1 - 0 - 1 • After Meals';
    if (frequency === 'Once Daily [OD]') sched = '1 - 0 - 0 • ' + timing;
    else if (frequency === 'Twice Daily [BD]') sched = '1 - 0 - 1 • ' + timing;
    else if (frequency === 'Thrice Daily [TDS]') sched = '1 - 1 - 1 • ' + timing;
    else if (frequency === 'STAT / SOS') sched = 'SOS as needed • ' + timing;

    if (editingMedId) {
      // Edit existing dose
      setMedications((prev) =>
        prev.map((m) =>
          m.id === editingMedId
            ? {
                ...m,
                name: drugName.trim(),
                dosage: dosage.trim(),
                form: formType,
                frequency,
                route,
                timing,
                duration: `${durationDays} days`,
                scheduleTag: sched,
                instructions: specialInstructions.trim()
              }
            : m
        )
      );
      showToast(`✓ Updated dosage regimen for ${drugName}.`);
    } else {
      // Prepend brand-new drug
      const newMed: MedicationItem = {
        id: `MED-${Date.now().toString().slice(-4)}`,
        name: drugName.trim(),
        dosage: dosage.trim(),
        form: formType,
        frequency,
        scheduleTag: sched,
        route,
        timing,
        duration: `${durationDays} days`,
        prescribedAt: 'Just now',
        prescribedBy: patient.attendingDoctor,
        instructions: specialInstructions.trim(),
        status: 'ACTIVE'
      };
      setMedications((prev) => [newMed, ...prev]);
      showToast(`✓ ${newMed.name} ${newMed.dosage} added to active inpatient regimens.`);
    }

    setIsAddDrugOpen(false);
  };

  const handleDiscontinueDrug = (medId: string) => {
    const med = medications.find((m) => m.id === medId);
    if (!med) return;
    setMedications((prev) => prev.filter((m) => m.id !== medId));
    showToast(`Discontinued medication order: ${med.name}.`);
  };

  // Quick "+ Order Test" handler
  const handleQuickOrderTest = () => {
    const newTest: LabOrderItem = {
      id: `LAB-${Date.now().toString().slice(-4)}`,
      testName: '12-Lead Diagnostic Electrocardiogram (ECG)',
      category: 'Non-Invasive Clinical Cardiology',
      orderedAt: 'Just now',
      orderedBy: patient.attendingDoctor,
      status: 'SAMPLE_COLLECTED',
      statusText: 'Sample Collected',
      resultSummary: 'Telemetry requisition transmitted to cardiology testing deck.'
    };
    setLabOrders((prev) => [newTest, ...prev]);
    showToast('✓ Diagnostic test ordered: 12-Lead ECG.');
  };

  // Real-World Inpatient Summary Printout
  const handlePrintClinicalSummary = () => {
    window.print();
  };

  const activeMedsCount = medications.filter((m) => m.status === 'ACTIVE').length;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 font-sans antialiased text-slate-800 print:hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-200 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================================
          1. CLINICAL IDENTITY BANNER (TOP CARD)
          ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md">
        {/* Top Action Header Bar */}
        <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0" />
            <span className="text-xs font-black tracking-wider text-slate-700 uppercase">
              Inpatient Clinical Chart &amp; Telemetry
            </span>
            <span className="text-xs text-slate-400 font-mono">({patient.id})</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrintClinicalSummary}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all shadow-sm cursor-pointer"
              title="Print clinical inpatient summary and medication sheet"
            >
              <Printer className="w-3.5 h-3.5 text-teal-700" />
              <span>Print Clinical Summary</span>
            </button>
          </div>
        </div>

        {/* Executive Patient Header Strip */}
        <div className="p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            {/* Left: Patient Avatar & Live Status Indicator */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 text-white flex items-center justify-center text-2xl font-black shadow-md shadow-teal-700/20">
                  {patient.name.charAt(0)}
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    {patient.name}
                  </h1>
                  {/* Live Status Badge */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>CHECKED_IN</span>
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  MRN: <strong className="text-slate-600">{patient.id}</strong> • Inpatient Admission
                </div>
              </div>
            </div>

            {/* Center Grid: 3-Column Demographics Matrix */}
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-4 border-t lg:border-t-0 lg:border-l border-slate-200/80 pt-4 lg:pt-0 lg:pl-6 text-xs">
              {/* Column 1: Age/Sex & Blood Group */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                  Demographics
                </div>
                <div className="text-slate-700 font-semibold">
                  {patient.age} yrs • {patient.gender}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Blood Group:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                    <Droplets className="w-3 h-3 mr-1 text-rose-500" />
                    {patient.bloodGroup}
                  </span>
                </div>
              </div>

              {/* Column 2: Bed Allocation & Attending Physician */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                  Ward Allocation
                </div>
                <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                  <Bed className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>{patient.ward} • <strong>{patient.bedNumber}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Physician: <strong>{patient.attendingDoctor}</strong></span>
                </div>
              </div>

              {/* Column 3: Facility & Emergency Contact with 1-Click Call */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                  Facility &amp; Emergency
                </div>
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                  <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="truncate">{patient.facility}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 truncate">
                    {patient.emergencyContact.name} ({patient.emergencyContact.relation}):
                  </span>
                  <a
                    href={`tel:${patient.emergencyContact.phone.replace(/[^0-9+]/g, '')}`}
                    className="inline-flex items-center gap-1 font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded border border-teal-200 transition-colors"
                    title={`Call emergency contact ${patient.emergencyContact.phone}`}
                  >
                    <Phone className="w-3 h-3 text-teal-600" />
                    <span>{patient.emergencyContact.phone}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Line: Address with Pin Icon */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-400">Residential Address:</span>
            <span className="text-slate-600">{patient.address}</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. BASELINE VITALS TELEMETRY GRID & INTAKE ALERT BAR
          ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              <span>Baseline Telemetry &amp; Vital Signs</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Continuous observation recorded during inpatient ward intake triage.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-lg">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Telemetry Synchronized</span>
          </span>
        </div>

        {/* 4 Interactive Telemetry Metric Widgets */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Blood Pressure */}
          <div className="p-4 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-all group">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold uppercase tracking-wider text-[11px]">Blood Pressure</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Normal
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">120/80</span>
              <span className="text-xs text-slate-400 font-mono">mmHg</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Systolic: 120 / Diastolic: 80</span>
            </div>
          </div>

          {/* 2. Heart Rate */}
          <div className="p-4 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-all group">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold uppercase tracking-wider text-[11px]">Heart Rate</span>
              <HeartPulse className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">74</span>
              <span className="text-xs text-slate-400 font-mono">bpm</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              <span>Resting Sinus Rhythm</span>
            </div>
          </div>

          {/* 3. Oxygen Saturation (SpO2) */}
          <div className="p-4 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-all group">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold uppercase tracking-wider text-[11px]">Oxygen Saturation</span>
              <Activity className="w-4 h-4 text-teal-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">99%</span>
              <span className="text-xs text-slate-400 font-mono">SpO2</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Room Air (Atmospheric)</span>
            </div>
          </div>

          {/* 4. Body Temperature */}
          <div className="p-4 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-all group">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold uppercase tracking-wider text-[11px]">Body Temperature</span>
              <Thermometer className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">98.6°</span>
              <span className="text-xs text-slate-400 font-mono">Fahrenheit</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Afebrile / Normal</span>
            </div>
          </div>
        </div>

        {/* Dedicated "Clinical Intake & Allergy Alert" Bar */}
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Chief Complaint with Quotation Styling */}
          <div className="flex-1 text-xs">
            <div className="font-bold uppercase tracking-wider text-[10px] text-slate-400 mb-1">
              Chief Clinical Presentation / Intake Complaint
            </div>
            <blockquote className="border-l-3 border-teal-600 pl-3 italic text-slate-700 leading-relaxed font-serif text-[13px]">
              &ldquo;{patient.chiefComplaint}&rdquo;
            </blockquote>
          </div>

          {/* Allergy Status Badge */}
          <div className="shrink-0 flex items-center gap-2">
            {patient.allergies.length === 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>No Known Drug Allergies - NKDA</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>⚠️ Allergic: {patient.allergies.join(', ')}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. ACTIVE REGIMENS & MEDICATION ORDERS SECTION (+ WORKING "+ ADD DRUG")
          ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Active Regimens &amp; Pharmacotherapy</span>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  {activeMedsCount} Active
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Hospital inpatient drug administration schedule and verified orders.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAddDrugModal()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all shadow-sm shadow-teal-700/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Drug</span>
          </button>
        </div>

        {/* Medication List / Empty State */}
        {medications.length === 0 ? (
          <div className="p-10 border border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
            <Pill className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <div className="text-xs font-bold text-slate-600">No active medications prescribed</div>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              Click <strong>&ldquo;+ Add Drug&rdquo;</strong> to prescribe inpatient oral or IV pharmacotherapy.
            </p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3 pl-4">Medication &amp; Dosage</th>
                  <th className="p-3">Schedule &amp; Administration</th>
                  <th className="p-3">Route / Timing</th>
                  <th className="p-3">Duration &amp; Prescriber</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medications.map((med) => (
                  <tr key={med.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 pl-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{med.name}</span>
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded border border-slate-200">
                          {med.dosage}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{med.form}</div>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        {med.scheduleTag}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 font-medium">
                      <div>{med.route}</div>
                      <div className="text-[11px] text-slate-400">{med.timing}</div>
                    </td>
                    <td className="p-3 text-slate-600">
                      <div className="font-semibold text-slate-800">{med.duration}</div>
                      <div className="text-[11px] text-slate-400">
                        {med.prescribedBy} • {med.prescribedAt}
                      </div>
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenAddDrugModal(med)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Dose"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDiscontinueDrug(med.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Discontinue Medication"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          4. DIAGNOSTIC LAB ORDERS SECTION
          ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Diagnostic Lab Orders</span>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {labOrders.length} Orders
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Clinical biochemistry, pathology, and diagnostic imaging requisitions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleQuickOrderTest}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Order Test</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('laboratory')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
            >
              View All History
            </button>
          </div>
        </div>

        {/* Lab Orders List / Empty State */}
        {labOrders.length === 0 ? (
          <div className="p-10 border border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
            <FlaskConical className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <div className="text-xs font-bold text-slate-700">No lab investigations ordered yet</div>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              Click <strong>&ldquo;+ Order Test&rdquo;</strong> to request CBC, Lipid Profile, or ECG.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {labOrders.map((lab) => {
              const statusPill = {
                SAMPLE_COLLECTED: (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    Sample Collected
                  </span>
                ),
                PROCESSING_IN_LAB: (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    Processing in Lab
                  </span>
                ),
                READY_FOR_REVIEW: (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Ready for Review
                  </span>
                )
              }[lab.status];

              return (
                <div
                  key={lab.id}
                  className="p-3.5 bg-slate-50/60 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-slate-900 leading-snug">{lab.testName}</span>
                    {statusPill}
                  </div>
                  <div className="text-[11px] text-slate-500">{lab.category}</div>
                  <div className="text-[11px] text-slate-400 border-t border-slate-200/60 pt-1.5 flex justify-between">
                    <span>Requisition: {lab.orderedAt}</span>
                    <span className="font-mono">{lab.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          SLIDE-OVER MODAL: "+ ADD DRUG" WORKFLOW
          ========================================================================= */}
      {isAddDrugOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingMedId ? 'Edit Dosage & Schedule' : 'Prescribe Inpatient Medication'}
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    For {patient.name} ({patient.id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDrugOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveDrug} className="flex-1 flex flex-col justify-between overflow-y-auto">
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* 1. Drug Search with Auto-Suggestions */}
                <div className="relative">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                    Drug Name &amp; Molecule <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search e.g. Paracetamol, Amoxicillin, Atorvastatin..."
                      value={drugSearchQuery}
                      onChange={(e) => {
                        setDrugSearchQuery(e.target.value);
                        setDrugName(e.target.value);
                        setIsDrugDropdownOpen(true);
                        setFormError(null);
                      }}
                      onFocus={() => setIsDrugDropdownOpen(true)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 shadow-sm"
                      autoFocus
                    />
                  </div>

                  {/* Suggestions Popover */}
                  {isDrugDropdownOpen && filteredSuggestions.length > 0 && (
                    <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {filteredSuggestions.map((s) => (
                        <div
                          key={s.name}
                          onClick={() => handleSelectSuggestion(s)}
                          className="p-2.5 px-3 hover:bg-teal-50/60 cursor-pointer text-xs transition-colors"
                        >
                          <div className="font-bold text-slate-900">{s.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {s.dosage} • {s.form} • {s.category}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Dosage & Form Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                      Dosage (e.g. 500mg)
                    </label>
                    <input
                      type="text"
                      value={dosage}
                      onChange={(e) => setDosage(e.target.value)}
                      placeholder="e.g. 500mg"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                      Pharmaceutical Form
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 shadow-sm"
                    >
                      <option value="Tablet">Tablet</option>
                      <option value="Capsule">Capsule</option>
                      <option value="IV Infusion">IV Infusion</option>
                      <option value="Syrup">Syrup</option>
                      <option value="Injection">Injection</option>
                    </select>
                  </div>
                </div>

                {/* 3. Frequency Quick Selector */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                    Administration Frequency
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {(['Once Daily [OD]', 'Twice Daily [BD]', 'Thrice Daily [TDS]', 'STAT / SOS'] as MedicationItem['frequency'][]).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFrequency(f)}
                        className={`p-2 rounded-xl border text-center font-bold transition-all ${
                          frequency === f
                            ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Route & Timing */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                      Route
                    </label>
                    <select
                      value={route}
                      onChange={(e) => setRoute(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-teal-600 shadow-sm"
                    >
                      <option value="Oral">Oral</option>
                      <option value="Intravenous (IV)">Intravenous (IV)</option>
                      <option value="Subcutaneous (SC)">Subcutaneous (SC)</option>
                      <option value="Inhalation">Inhalation</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                      Meal Timing
                    </label>
                    <select
                      value={timing}
                      onChange={(e) => setTiming(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-teal-600 shadow-sm"
                    >
                      <option value="After Meals">After Meals</option>
                      <option value="Before Meals">Before Meals</option>
                      <option value="With Meals">With Meals</option>
                      <option value="Bedtime (HS)">Bedtime (HS)</option>
                    </select>
                  </div>
                </div>

                {/* 5. Duration Days Counter */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                    Duration (Days)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDurationDays(Math.max(1, durationDays - 1))}
                      className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={durationDays}
                      onChange={(e) => setDurationDays(parseInt(e.target.value) || 1)}
                      className="w-20 text-center px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setDurationDays(durationDays + 1)}
                      className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100"
                    >
                      +
                    </button>
                    <span className="text-xs text-slate-500 font-medium ml-1">Days of inpatient therapy</span>
                  </div>
                </div>

                {/* 6. Special Instructions */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                    Attending Instructions / Notes
                  </label>
                  <textarea
                    rows={2}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g. Monitor LFTs, take with full glass of water, check BP prior to dose..."
                    className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-teal-600 shadow-sm resize-none"
                  />
                </div>
              </div>

              {/* Sticky Drawer Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddDrugOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl bg-white hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all shadow-md shadow-teal-700/20 cursor-pointer"
                >
                  {editingMedId ? 'Update Dose' : 'Prescribe & Sign Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          PRINTABLE INPATIENT SUMMARY SHEET (VISIBLE ONLY DURING PRINT)
          ========================================================================= */}
      <div className="hidden print:block print:w-full print:m-0 print:p-0 font-sans text-black">
        {/* Hospital Letterhead */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-teal-800">
              Hospitrack Inpatient Clinical Care System
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {patient.facility.toUpperCase()}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              DEPARTMENT OF INTERNAL MEDICINE &amp; INPATIENT TELEMETRY
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              NABL ISO 15189 • NABH Accredited Facility • ABDM Connected Health Record
            </p>
          </div>
          <div className="text-right">
            <div className="border border-slate-400 px-3 py-1 text-xs font-mono inline-block rounded">
              UID: <strong>ADM-2026-8812</strong>
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-widest mt-1">
              ||| | |||| ||| |||||| ||||
            </div>
            <div className="text-[11px] text-slate-600 mt-1">
              Printed: <strong>{new Date().toLocaleDateString('en-GB')}</strong>
            </div>
          </div>
        </div>

        {/* Section 1: Patient Demographics & Ward Allocation */}
        <div className="border border-slate-300 rounded-xl p-4 mb-6 text-xs grid grid-cols-2 gap-4">
          <div>
            <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
              Patient Identification
            </div>
            <div className="space-y-1">
              <div>Name: <strong>{patient.name}</strong></div>
              <div>MRN / UHID: <span className="font-mono">{patient.id}</span></div>
              <div>Age / Gender: {patient.age} yrs • {patient.gender}</div>
              <div>Blood Group: <strong>{patient.bloodGroup}</strong></div>
              <div>Emergency: {patient.emergencyContact.name} ({patient.emergencyContact.phone})</div>
            </div>
          </div>
          <div>
            <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
              Ward Allocation &amp; Clinician
            </div>
            <div className="space-y-1">
              <div>Ward: <strong>{patient.ward}</strong></div>
              <div>Bed: <strong>{patient.bedNumber}</strong></div>
              <div>Attending: <strong>{patient.attendingDoctor}</strong></div>
              <div>Facility: {patient.facility}</div>
              <div>Admission Status: <strong>{patient.status}</strong></div>
            </div>
          </div>
        </div>

        {/* Section 2: Vitals recorded at intake */}
        <div className="border border-slate-300 rounded-xl p-4 mb-6 text-xs">
          <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
            Baseline Intake Vitals &amp; Clinical Presentation
          </div>
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="p-2 border border-slate-200 rounded">
              <span className="text-slate-500 block">BP:</span>
              <strong>120/80 mmHg</strong> (Normal)
            </div>
            <div className="p-2 border border-slate-200 rounded">
              <span className="text-slate-500 block">Heart Rate:</span>
              <strong>74 bpm</strong> (Resting)
            </div>
            <div className="p-2 border border-slate-200 rounded">
              <span className="text-slate-500 block">SpO2:</span>
              <strong>99%</strong> (Room Air)
            </div>
            <div className="p-2 border border-slate-200 rounded">
              <span className="text-slate-500 block">Temperature:</span>
              <strong>98.6° F</strong> (Afebrile)
            </div>
          </div>
          <div>
            <span className="text-slate-500">Chief Complaint:</span> <em>&ldquo;{patient.chiefComplaint}&rdquo;</em>
          </div>
          <div className="mt-1">
            <span className="text-slate-500">Allergy Alert:</span>{' '}
            <strong className="text-emerald-700">No Known Drug Allergies (NKDA)</strong>
          </div>
        </div>

        {/* Section 3: Active Medication Chart with Nurse Administration Timing Slots */}
        <div className="border border-slate-300 rounded-xl p-4 mb-6 text-xs">
          <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
            Active Pharmacotherapy &amp; Nurse Administration Matrix
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-300 text-[10px] uppercase font-bold text-slate-600">
                <th className="py-1">Medication &amp; Dose</th>
                <th className="py-1">Route &amp; Frequency</th>
                <th className="py-1">Morning (08:00)</th>
                <th className="py-1">Noon (14:00)</th>
                <th className="py-1">Night (20:00)</th>
                <th className="py-1">Nurse Initial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {medications.map((m) => (
                <tr key={m.id}>
                  <td className="py-1.5 font-bold">{m.name} {m.dosage}</td>
                  <td className="py-1.5">{m.route} • {m.frequency}</td>
                  <td className="py-1.5 font-mono">[  ] Init: ____</td>
                  <td className="py-1.5 font-mono">[  ] Init: ____</td>
                  <td className="py-1.5 font-mono">[  ] Init: ____</td>
                  <td className="py-1.5 font-mono">______</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 4: Doctor's provisional diagnosis and signature box */}
        <div className="border border-slate-300 rounded-xl p-4 mb-6 text-xs grid grid-cols-2 gap-6">
          <div>
            <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">
              Provisional Clinical Diagnosis &amp; Plan
            </div>
            <p className="text-slate-700 leading-relaxed">
              Patient admitted for telemetry cardiac evaluation. Continue beta-blocker therapy, monitor serial ECGs and hs-Troponin-I. Patient advised low-sodium diet and bed rest.
            </p>
          </div>
          <div>
            <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-6">
              Attending Physician Signature Block
            </div>
            <div className="h-6 border-b border-dashed border-slate-400 mb-1">
              <span className="font-serif italic text-sm">{patient.attendingDoctor}</span>
            </div>
            <div className="font-bold text-slate-900">{patient.attendingDoctor}, MD</div>
            <div className="text-[10px] text-slate-500">Department of General &amp; Inpatient Medicine • Reg #KMC-44912</div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-200">
          Official Inpatient Electronic Medical Record • Hospitrack Telemetry Network v2.6
        </div>
      </div>
    </div>
  );
};

export default PatientClinicalChart;
