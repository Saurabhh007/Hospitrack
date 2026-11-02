import React, { useState, useMemo, useEffect } from 'react';
import { HorizontalScrollTrack } from './HorizontalScrollTrack';
import {
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Building2,
  UserCheck,
  Stethoscope,
  Lock,
  Unlock,
  RefreshCw,
  FileSpreadsheet,
  Eye,
  EyeOff,
  Search,
  Command,
  Activity,
  AlertTriangle,
  Printer,
  Download,
  Copy,
  Check,
  Users,
  ChevronRight,
  MoreVertical,
  ExternalLink,
  Sparkles,
  Layers,
  Database,
  Radio,
  Clock,
  MapPin,
  PhoneCall,
  Mail,
  Sliders,
  Server
} from 'lucide-react';

// ============================================================================
// DATA CONTRACTS & TYPE DEFINITIONS
// ============================================================================

export type UserRole = 'HOSPITAL_ADMIN' | 'DOCTOR' | 'PATIENT' | 'SUPER_ADMIN';
export type AccountStatus = 'ACTIVE' | 'FIRST_LOGIN_REQUIRED' | 'SUSPENDED' | 'LOCKED';
export type TwoFactorStatus = 'ENFORCED' | 'OPTIONAL' | 'DISABLED';

export interface HospitalFacility {
  id: string; // e.g. "HOSP-101"
  name: string; // "City General Hospital & Research Institute"
  code: string; // "CGH"
  licenseUid: string; // "NABH-DL-2026-9812"
  address: string;
  city: string;
  state: string;
  contactOfficial: string;
  emergencyHelpline: string;
  departments: string[];
  adminEmail: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL';
  maxDoctorsQuota: number;
  totalBedsQuota: number;
  availableBeds: number;
  activeDoctorsCount: number;
  activePatientsCount: number;
  crossFacilityReferral: boolean;
  createdAt: string;
  facilityKey: string;
}

export interface UserCredentialRecord {
  id: string; // System UID e.g. "USER-DOC-104", "USER-ADM-101"
  name: string;
  username: string; // "dr.sharma@citygeneral.hospitrack.org"
  role: UserRole;
  hospitalId: string;
  hospitalName: string;
  createdBy: string; // "Superadmin Direct" or "City General Admin"
  createdAt: string;
  lastLogin: string;
  status: AccountStatus;
  twoFactorStatus: TwoFactorStatus;
  passwordLastRotated: string;
  specialtyOrDiagnosis?: string;
  licenseNumber?: string;
}

export interface SecurityAuditEntry {
  id: string;
  timestamp: string;
  action: 'CREDENTIAL_ISSUED' | 'PASSWORD_ROTATED' | 'ACCOUNT_SUSPENDED' | 'ACCOUNT_UNLOCKED' | 'DIAGNOSTIC_IMPERSONATION' | 'FACILITY_PROVISIONED';
  actor: string;
  targetUser: string;
  targetRole: UserRole;
  hospitalId: string;
  ipHash: string;
  details: string;
}

export interface ProvisioningFormData {
  facilityName: string;
  facilityCode: string;
  licenseUid: string;
  address: string;
  city: string;
  state: string;
  contactOfficial: string;
  emergencyHelpline: string;
  departments: string[];
  adminEmail: string;
  adminPassword: string;
  enforceFirstLoginPasswordChange: boolean;
  maxDoctorsQuota: number;
  totalBedsQuota: number;
  crossFacilityReferral: boolean;
}

export interface SuperadminDashboardProps {
  initialHospitals?: HospitalFacility[];
  initialCredentials?: UserCredentialRecord[];
  initialAuditLogs?: SecurityAuditEntry[];
  onPrintCredentialSlip?: (credential: UserCredentialRecord) => void;
  onPrintActivationPacket?: (hospital: HospitalFacility) => void;
}

// ============================================================================
// DEFAULT MOCK STORE DATA
// ============================================================================

export const DEFAULT_HOSPITALS: HospitalFacility[] = [
  {
    id: 'HOSP-101',
    name: 'City General Hospital & Research Institute',
    code: 'CGH',
    licenseUid: 'NABH-DL-2026-9812',
    address: '100 Health Way, Central Healthcare Campus',
    city: 'New Delhi',
    state: 'Delhi',
    contactOfficial: 'Dr. Vivek Sengupta (Medical Director)',
    emergencyHelpline: '+91 11 2345 6789',
    departments: ['Cardiology', 'Emergency Medicine', 'General Medicine', 'Pathology', 'ICU'],
    adminEmail: 'admin@citygeneral.hospitrack.org',
    status: 'ACTIVE',
    maxDoctorsQuota: 50,
    totalBedsQuota: 247,
    availableBeds: 34,
    activeDoctorsCount: 18,
    activePatientsCount: 142,
    crossFacilityReferral: true,
    createdAt: '2026-01-15T09:00:00Z',
    facilityKey: 'FCKEY-CGH-9921-A87F'
  },
  {
    id: 'HOSP-102',
    name: 'Apex Care Medical Center',
    code: 'ACMC',
    licenseUid: 'NABH-KA-2026-4432',
    address: '42 Tertiary Parkway, Metro West District',
    city: 'Bengaluru',
    state: 'Karnataka',
    contactOfficial: 'Dr. Radhika Nair (Dean)',
    emergencyHelpline: '+91 80 9811 9999',
    departments: ['Cardiology', 'Neurology', 'Internal Medicine', 'Oncology', 'Surgical CCU'],
    adminEmail: 'admin@apexcare.hospitrack.org',
    status: 'ACTIVE',
    maxDoctorsQuota: 40,
    totalBedsQuota: 180,
    availableBeds: 28,
    activeDoctorsCount: 14,
    activePatientsCount: 96,
    crossFacilityReferral: true,
    createdAt: '2026-03-20T11:30:00Z',
    facilityKey: 'FCKEY-ACMC-5514-B90C'
  },
  {
    id: 'HOSP-103',
    name: 'Metro Emergency Hospital & Trauma Center',
    code: 'MEH',
    licenseUid: 'NABH-MH-2026-7810',
    address: '18 Ring Road Corridor, Downtown Medical Campus',
    city: 'Mumbai',
    state: 'Maharashtra',
    contactOfficial: 'Col. (Dr.) Rajesh Rao',
    emergencyHelpline: '+91 22 4433 2211',
    departments: ['Trauma & Resuscitation', 'Orthopedics', 'Anesthesiology', 'Burn Unit'],
    adminEmail: 'admin@metroemergency.hospitrack.org',
    status: 'ACTIVE',
    maxDoctorsQuota: 30,
    totalBedsQuota: 120,
    availableBeds: 16,
    activeDoctorsCount: 9,
    activePatientsCount: 64,
    crossFacilityReferral: true,
    createdAt: '2026-05-10T14:15:00Z',
    facilityKey: 'FCKEY-MEH-3321-C11D'
  }
];

export const DEFAULT_CREDENTIALS: UserCredentialRecord[] = [
  {
    id: 'USER-ADM-101',
    name: 'City General Admin',
    username: 'admin@citygeneral.hospitrack.org',
    role: 'HOSPITAL_ADMIN',
    hospitalId: 'HOSP-101',
    hospitalName: 'City General Hospital',
    createdBy: 'Superadmin Direct',
    createdAt: '2026-01-15T09:00:00Z',
    lastLogin: 'Today, 10:14 AM',
    status: 'ACTIVE',
    twoFactorStatus: 'ENFORCED',
    passwordLastRotated: 'Oct 15, 2026'
  },
  {
    id: 'USER-ADM-102',
    name: 'Apex Care Admin',
    username: 'admin@apexcare.hospitrack.org',
    role: 'HOSPITAL_ADMIN',
    hospitalId: 'HOSP-102',
    hospitalName: 'Apex Care Medical Center',
    createdBy: 'Superadmin Direct',
    createdAt: '2026-03-20T11:30:00Z',
    lastLogin: 'Yesterday, 04:32 PM',
    status: 'ACTIVE',
    twoFactorStatus: 'ENFORCED',
    passwordLastRotated: 'Oct 01, 2026'
  },
  {
    id: 'USER-DOC-201',
    name: 'Dr. Sarah Sharma, MD',
    username: 'dr.sharma@citygeneral.hospitrack.org',
    role: 'DOCTOR',
    hospitalId: 'HOSP-101',
    hospitalName: 'City General Hospital',
    createdBy: 'City General Admin',
    createdAt: '2026-02-01T10:00:00Z',
    lastLogin: 'Today, 11:20 AM',
    status: 'ACTIVE',
    twoFactorStatus: 'ENFORCED',
    passwordLastRotated: 'Oct 28, 2026',
    specialtyOrDiagnosis: 'Senior Interventional Cardiologist',
    licenseNumber: 'MCI-99401'
  },
  {
    id: 'USER-DOC-202',
    name: 'Dr. Arjun Verma, MD',
    username: 'dr.verma@apexcare.hospitrack.org',
    role: 'DOCTOR',
    hospitalId: 'HOSP-102',
    hospitalName: 'Apex Care Medical Center',
    createdBy: 'Apex Care Admin',
    createdAt: '2026-04-12T14:20:00Z',
    lastLogin: 'Today, 09:45 AM',
    status: 'ACTIVE',
    twoFactorStatus: 'ENFORCED',
    passwordLastRotated: 'Oct 24, 2026',
    specialtyOrDiagnosis: 'Consultant Internal Medicine',
    licenseNumber: 'MCI-48201'
  },
  {
    id: 'USER-PAT-303',
    name: 'Ananya Iyer',
    username: 'ananya.iyer@patient.hospitrack.org',
    role: 'PATIENT',
    hospitalId: 'HOSP-102',
    hospitalName: 'Apex Care Medical Center',
    createdBy: 'Apex Care Admin',
    createdAt: '2026-10-24T10:15:00Z',
    lastLogin: 'Today, 08:30 AM',
    status: 'ACTIVE',
    twoFactorStatus: 'ENFORCED',
    passwordLastRotated: 'Oct 24, 2026',
    specialtyOrDiagnosis: 'Post-PCI Care • Acute MI',
    licenseNumber: 'UHID-91-ACMC-303'
  },
  {
    id: 'USER-PAT-302',
    name: 'Rajesh Kumar',
    username: 'rajesh.kumar@patient.hospitrack.org',
    role: 'PATIENT',
    hospitalId: 'HOSP-101',
    hospitalName: 'City General Hospital',
    createdBy: 'City General Admin',
    createdAt: '2026-10-26T09:30:00Z',
    lastLogin: 'Yesterday, 07:15 PM',
    status: 'ACTIVE',
    twoFactorStatus: 'ENFORCED',
    passwordLastRotated: 'Oct 26, 2026',
    specialtyOrDiagnosis: 'Unstable Angina / Cardiology',
    licenseNumber: 'UHID-91-CGH-302'
  }
];

export const DEFAULT_AUDIT_LOGS: SecurityAuditEntry[] = [
  {
    id: 'AUD-901',
    timestamp: 'Oct 30, 2026 • 11:42 AM',
    action: 'PASSWORD_ROTATED',
    actor: 'admin@citygeneral.hospitrack.org (Hospital Admin)',
    targetUser: 'dr.sharma@citygeneral.hospitrack.org',
    targetRole: 'DOCTOR',
    hospitalId: 'HOSP-101',
    ipHash: 'IP:7A41:F982:D399',
    details: 'Enforced 90-day clinical credential rotation policy via Hospital Admin portal.'
  },
  {
    id: 'AUD-902',
    timestamp: 'Oct 29, 2026 • 02:30 PM',
    action: 'CREDENTIAL_ISSUED',
    actor: 'admin@apexcare.hospitrack.org (Hospital Admin)',
    targetUser: 'ananya.iyer@patient.hospitrack.org',
    targetRole: 'PATIENT',
    hospitalId: 'HOSP-102',
    ipHash: 'IP:9C12:33E8:77BA',
    details: 'Provisioned patient portal access upon inpatient discharge clearance.'
  },
  {
    id: 'AUD-903',
    timestamp: 'Oct 28, 2026 • 06:15 PM',
    action: 'FACILITY_PROVISIONED',
    actor: 'root@hospitrack.security (Superadmin Direct)',
    targetUser: 'admin@metroemergency.hospitrack.org',
    targetRole: 'HOSPITAL_ADMIN',
    hospitalId: 'HOSP-103',
    ipHash: 'IP:ROOT:AUTH:9901',
    details: 'Issued initial healthcare facility license and root administrative credentials.'
  }
];

// Helper: high-entropy temporary password generator
export function generateHighEntropyPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
  let pass = '';
  for (let i = 0; i < 16; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

// ============================================================================
// MAIN REACT SUPERADMIN COMPONENT
// ============================================================================

export const SuperadminDashboard: React.FC<SuperadminDashboardProps> = ({
  initialHospitals = DEFAULT_HOSPITALS,
  initialCredentials = DEFAULT_CREDENTIALS,
  initialAuditLogs = DEFAULT_AUDIT_LOGS,
  onPrintCredentialSlip,
  onPrintActivationPacket
}) => {
  // Master State
  const [hospitals, setHospitals] = useState<HospitalFacility[]>(initialHospitals);
  const [credentials, setCredentials] = useState<UserCredentialRecord[]>(initialCredentials);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditEntry[]>(initialAuditLogs);

  // Active Section Router
  const [activeNav, setActiveNav] = useState<'OVERVIEW' | 'PROVISION' | 'REGISTRY' | 'RBAC' | 'AUDIT' | 'SETTINGS' | 'DRILLDOWN'>('OVERVIEW');
  const [selectedHospitalForDrilldown, setSelectedHospitalForDrilldown] = useState<HospitalFacility | null>(null);
  const [drilldownSubtab, setDrilldownSubtab] = useState<'DOCTORS' | 'PATIENTS' | 'AUDIT'>('DOCTORS');

  // Command Palette & Global Search
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Registry Filters
  const [tenantFilter, setTenantFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Provisioning Drawer State
  const [isProvisionDrawerOpen, setIsProvisionDrawerOpen] = useState(false);
  const [provisionStep, setProvisionStep] = useState<1 | 2 | 3>(1);
  const [provisionForm, setProvisionForm] = useState<ProvisioningFormData>({
    facilityName: '',
    facilityCode: '',
    licenseUid: '',
    address: '',
    city: '',
    state: '',
    contactOfficial: '',
    emergencyHelpline: '',
    departments: ['Cardiology', 'General Medicine', 'ICU'],
    adminEmail: '',
    adminPassword: generateHighEntropyPassword(),
    enforceFirstLoginPasswordChange: true,
    maxDoctorsQuota: 40,
    totalBedsQuota: 150,
    crossFacilityReferral: true
  });

  // Action Menu Popover
  const [activeMenuCredentialId, setActiveMenuCredentialId] = useState<string | null>(null);
  const [selectedCredentialForDossier, setSelectedCredentialForDossier] = useState<UserCredentialRecord | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Trigger Toast Notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setActiveMenuCredentialId(null);
        setSelectedCredentialForDossier(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered Credential Registry
  const filteredCredentials = useMemo(() => {
    return credentials.filter((c) => {
      if (tenantFilter !== 'ALL' && c.hospitalId !== tenantFilter) return false;
      if (roleFilter !== 'ALL' && c.role !== roleFilter) return false;
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesUser = c.username.toLowerCase().includes(q);
        const matchesUid = c.id.toLowerCase().includes(q);
        const matchesHosp = c.hospitalName.toLowerCase().includes(q);
        return matchesName || matchesUser || matchesUid || matchesHosp;
      }
      return true;
    });
  }, [credentials, tenantFilter, roleFilter, statusFilter, searchQuery]);

  // Command Palette Matches
  const commandPaletteResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const matchedHospitals = hospitals.filter(h => h.name.toLowerCase().includes(q) || h.code.toLowerCase().includes(q) || h.id.toLowerCase().includes(q)).map(h => ({ type: 'HOSPITAL', data: h, label: `${h.name} (${h.code})`, sub: `Facility ID: ${h.id} • ${h.city}` }));
    const matchedUsers = credentials.filter(c => c.name.toLowerCase().includes(q) || c.username.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)).map(c => ({ type: 'USER', data: c, label: `${c.name} (${c.role})`, sub: `${c.username} • ${c.hospitalName}` }));
    return [...matchedHospitals, ...matchedUsers].slice(0, 8);
  }, [searchQuery, hospitals, credentials]);

  // Provisioning Submission Handler
  const handleProvisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisionForm.facilityName || !provisionForm.adminEmail) {
      showToast('Facility Name and Admin Email are required.');
      return;
    }

    const newHospId = `HOSP-${Math.floor(104 + hospitals.length)}`;
    const newFacilityKey = `FCKEY-${provisionForm.facilityCode || 'HOSP'}-${Math.floor(1000 + Math.random() * 9000)}-Z81A`;

    const newHospital: HospitalFacility = {
      id: newHospId,
      name: provisionForm.facilityName,
      code: provisionForm.facilityCode || 'HSP',
      licenseUid: provisionForm.licenseUid || `NABH-NAT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      address: provisionForm.address || 'Medical Health Hub',
      city: provisionForm.city || 'Metro City',
      state: provisionForm.state || 'State',
      contactOfficial: provisionForm.contactOfficial || 'Authorized Administrator',
      emergencyHelpline: provisionForm.emergencyHelpline || '+91 1800 419 8800',
      departments: provisionForm.departments,
      adminEmail: provisionForm.adminEmail,
      status: 'ACTIVE',
      maxDoctorsQuota: provisionForm.maxDoctorsQuota,
      totalBedsQuota: provisionForm.totalBedsQuota,
      availableBeds: Math.round(provisionForm.totalBedsQuota * 0.35),
      activeDoctorsCount: 0,
      activePatientsCount: 0,
      crossFacilityReferral: provisionForm.crossFacilityReferral,
      createdAt: new Date().toISOString(),
      facilityKey: newFacilityKey
    };

    const newAdminCred: UserCredentialRecord = {
      id: `USER-ADM-${newHospId.replace('HOSP-', '')}`,
      name: `${provisionForm.facilityName} Admin`,
      username: provisionForm.adminEmail,
      role: 'HOSPITAL_ADMIN',
      hospitalId: newHospId,
      hospitalName: provisionForm.facilityName,
      createdBy: 'Superadmin Direct',
      createdAt: new Date().toISOString(),
      lastLogin: 'Never (Pending First Login)',
      status: 'FIRST_LOGIN_REQUIRED',
      twoFactorStatus: 'ENFORCED',
      passwordLastRotated: 'Just Created'
    };

    const newAuditEntry: SecurityAuditEntry = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: 'Just Now',
      action: 'FACILITY_PROVISIONED',
      actor: 'root@hospitrack.security (Superadmin)',
      targetUser: provisionForm.adminEmail,
      targetRole: 'HOSPITAL_ADMIN',
      hospitalId: newHospId,
      ipHash: 'IP:SECURE:ROOT:GATEWAY',
      details: `Provisioned partner hospital ${provisionForm.facilityName} (${newHospId}) with ${provisionForm.maxDoctorsQuota} doctor quota and ${provisionForm.totalBedsQuota} authorized beds.`
    };

    setHospitals([newHospital, ...hospitals]);
    setCredentials([newAdminCred, ...credentials]);
    setAuditLogs([newAuditEntry, ...auditLogs]);
    setIsProvisionDrawerOpen(false);
    setProvisionStep(1);

    showToast(`✓ Facility ${newHospital.name} successfully onboarded and credentials issued.`);
  };

  // Force Password Reset Action
  const handleForcePasswordReset = (cred: UserCredentialRecord) => {
    const tempPass = generateHighEntropyPassword();
    const updated = credentials.map(c => c.id === cred.id ? { ...c, status: 'FIRST_LOGIN_REQUIRED' as AccountStatus, passwordLastRotated: 'Just Reset' } : c);
    setCredentials(updated);

    const audit: SecurityAuditEntry = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: 'Just Now',
      action: 'PASSWORD_ROTATED',
      actor: 'root@hospitrack.security (Superadmin Master Revocation)',
      targetUser: cred.username,
      targetRole: cred.role,
      hospitalId: cred.hospitalId,
      ipHash: 'IP:SUPERADMIN:FORCE',
      details: `Superadmin forced mandatory credential rotation and generated temporary key for ${cred.username}.`
    };
    setAuditLogs([audit, ...auditLogs]);
    setActiveMenuCredentialId(null);
    showToast(`✓ Temporary token generated for ${cred.username}: ${tempPass}`);
  };

  // Toggle Account Lock Action
  const handleToggleAccountLock = (cred: UserCredentialRecord) => {
    const isLocking = cred.status !== 'SUSPENDED' && cred.status !== 'LOCKED';
    const newStatus: AccountStatus = isLocking ? 'SUSPENDED' : 'ACTIVE';
    const updated = credentials.map(c => c.id === cred.id ? { ...c, status: newStatus } : c);
    setCredentials(updated);

    const audit: SecurityAuditEntry = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: 'Just Now',
      action: isLocking ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_UNLOCKED',
      actor: 'root@hospitrack.security (Superadmin Governance)',
      targetUser: cred.username,
      targetRole: cred.role,
      hospitalId: cred.hospitalId,
      ipHash: 'IP:SUPERADMIN:GOV',
      details: isLocking ? `Superadmin locked account access for ${cred.username}.` : `Superadmin restored active access for ${cred.username}.`
    };
    setAuditLogs([audit, ...auditLogs]);
    setActiveMenuCredentialId(null);
    showToast(isLocking ? `🔒 Account ${cred.username} access suspended.` : `✓ Account ${cred.username} unlocked.`);
  };

  // Copy to clipboard helper
  const handleCopyText = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedKey(label);
        setTimeout(() => setCopiedKey(null), 2500);
      });
    }
  };

  return (
    <div className="superadmin-portal-root min-h-screen bg-[#0B0F19] text-slate-100 font-sans antialiased flex flex-col selection:bg-teal-500 selection:text-white">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-100 flex items-center gap-2 bg-slate-900 border border-teal-500/60 text-teal-300 px-4 py-3 rounded-xl shadow-2xl animate-fade-in text-sm font-semibold">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================================================================== */}
      {/* 1. TOP SYSTEM BAR (High-Security Institutional Shield)              */}
      {/* ================================================================== */}
      <header className="h-16 bg-[#0E131F] border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-50">
        {/* Left: Master Shield Badge */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/20">
            <ShieldCheck className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-white">HOSPITRACK</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                SYSTEM_ROOT
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">Healthcare SaaS Network Governance</div>
          </div>
        </div>

        {/* Center: System Health Telemetry */}
        <div className="hidden lg:flex items-center gap-6 px-4 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Cluster Status: <strong className="text-emerald-400 font-bold">Optimal</strong></span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Server className="w-3.5 h-3.5 text-slate-500" />
            <span>Region: <strong className="text-slate-300">ap-south-1 (Mumbai)</strong></span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>Latency: <strong className="text-cyan-400 font-mono">18ms</strong></span>
          </div>
        </div>

        {/* Right: Global Command Search & Master Session Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-400 transition-colors shadow-xs"
            title="Global Quick Search (Cmd+K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Search Registry...</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">
              Ctrl+K
            </kbd>
          </button>

          {/* Session Profile Tag */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-teal-950 border border-teal-500/40 text-teal-300 flex items-center justify-center text-xs font-black">
              SA
            </div>
            <div className="hidden sm:block text-left text-xs">
              <div className="font-bold text-slate-200">root@hospitrack.io</div>
              <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                2FA Enforced
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ================================================================== */}
      {/* 2. BODY SHELL: SIDEBAR & MAIN ADMINISTRATIVE WORKSPACE             */}
      {/* ================================================================== */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-[#0E131F] border-r border-slate-800/80 p-4 shrink-0 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 py-2">
              Network Authority
            </div>
            <button
              type="button"
              onClick={() => { setActiveNav('OVERVIEW'); setSelectedHospitalForDrilldown(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'OVERVIEW' && !selectedHospitalForDrilldown
                  ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Activity className="w-4 h-4 text-teal-400" />
              <span>Network Overview &amp; KPIs</span>
            </button>

            <button
              type="button"
              onClick={() => setIsProvisionDrawerOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 transition-all shadow-md shadow-teal-500/20 my-2"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-950" />
                <span>+ Provision Facility</span>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
            </button>

            <button
              type="button"
              onClick={() => { setActiveNav('REGISTRY'); setSelectedHospitalForDrilldown(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'REGISTRY'
                  ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <KeyRound className="w-4 h-4 text-cyan-400" />
              <span>Master Credential Registry</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveNav('AUDIT'); setSelectedHospitalForDrilldown(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'AUDIT'
                  ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Security Audit Ledger</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveNav('RBAC'); setSelectedHospitalForDrilldown(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'RBAC'
                  ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Lock className="w-4 h-4 text-indigo-400" />
              <span>RBAC &amp; Tenant Scopes</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveNav('SETTINGS'); setSelectedHospitalForDrilldown(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'SETTINGS'
                  ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Sliders className="w-4 h-4 text-slate-400" />
              <span>System Settings</span>
            </button>
          </div>

          {/* Sidebar Footer Stats */}
          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 space-y-2">
            <div className="flex justify-between items-center">
              <span>Managed Facilities</span>
              <strong className="text-slate-300">{hospitals.length}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span>Issued Credentials</span>
              <strong className="text-slate-300">{credentials.length}</strong>
            </div>
            <div className="text-[10px] text-slate-600 pt-2">
              Hospitrack SaaS Engine v4.2 • PostgreSQL High Availability
            </div>
          </div>
        </aside>

        {/* Main Administrative Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">

          {/* ================================================================ */}
          {/* VIEW A: NETWORK OVERVIEW & MASTER KPIS                          */}
          {/* ================================================================ */}
          {activeNav === 'OVERVIEW' && !selectedHospitalForDrilldown && (
            <div className="space-y-6">
              {/* Top Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
                <div>
                  <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                    <span>Superadmin Healthcare Network Overview</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                      Tier 1 Master Oversight
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Master multi-tenant supervisory console across all onboarded hospitals, credentialed clinical staff, and patient portals.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsProvisionDrawerOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold text-slate-950 bg-teal-400 hover:bg-teal-300 transition-colors shadow-md shadow-teal-500/20"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Onboard Partner Hospital</span>
                  </button>
                </div>
              </div>

              {/* 4-Card Primary KPI Metric Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#0E131F] border border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Partner Hospitals</span>
                    <Building2 className="w-5 h-5 text-teal-400" />
                  </div>
                  <div className="text-3xl font-black text-white mt-2">{hospitals.length}</div>
                  <div className="text-xs text-emerald-400 font-semibold mt-1">100% Accredited &amp; Active</div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0E131F] border border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Credentialed Doctors</span>
                    <Stethoscope className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="text-3xl font-black text-white mt-2">
                    {credentials.filter(c => c.role === 'DOCTOR').length}
                  </div>
                  <div className="text-xs text-cyan-400 font-semibold mt-1">Multi-Specialty Staff</div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0E131F] border border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Enrolled Patient Portals</span>
                    <Users className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="text-3xl font-black text-white mt-2">
                    {credentials.filter(c => c.role === 'PATIENT').length}
                  </div>
                  <div className="text-xs text-indigo-400 font-semibold mt-1">Cross-Network Records</div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0E131F] border border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Security Audit Events</span>
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-3xl font-black text-white mt-2">{auditLogs.length}</div>
                  <div className="text-xs text-slate-400 font-semibold mt-1">Zero Breach Flagged</div>
                </div>
              </div>

              {/* Partner Hospitals Registry Table */}
              <div className="bg-[#0E131F] rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-teal-400" />
                      <span>Partner Healthcare Facilities Directory</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Click any facility to open the dedicated hospital drill-down and staff management console.
                    </p>
                  </div>
                </div>

                <HorizontalScrollTrack
                  showProgressLine={true}
                  progressLinePosition="bottom"
                  scrollStep={280}
                  fadeMask={false}
                  customScrollbar={true}
                  className="w-full"
                >
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[11px] font-bold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Hospital Facility</th>
                        <th className="py-3 px-4">Facility Code / License</th>
                        <th className="py-3 px-4">Quota Capacities</th>
                        <th className="py-3 px-4">Primary Administrator</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {hospitals.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white">
                            <div className="text-sm font-extrabold text-white">{h.name}</div>
                            <div className="text-[11px] text-slate-400 font-normal">{h.city}, {h.state}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-mono text-teal-300 font-bold">{h.code}</div>
                            <div className="text-[10px] text-slate-500">{h.licenseUid}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-slate-300">
                              Beds: <strong>{h.totalBedsQuota}</strong> (<strong>{h.availableBeds}</strong> Avail)
                            </div>
                            <div className="text-slate-400 text-[11px]">
                              Doctors: <strong>{h.activeDoctorsCount}</strong> / {h.maxDoctorsQuota} Max
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-slate-300 font-medium">{h.adminEmail}</div>
                            <div className="text-[11px] text-slate-500">{h.contactOfficial}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              {h.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => { setSelectedHospitalForDrilldown(h); setActiveNav('DRILLDOWN'); }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 transition-colors"
                            >
                              <span>Inspect Facility</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </HorizontalScrollTrack>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* VIEW B: MASTER DIRECTORY & CREDENTIAL REGISTRY                   */}
          {/* ================================================================ */}
          {activeNav === 'REGISTRY' && !selectedHospitalForDrilldown && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
                <div>
                  <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                    <span>Unified Master Credential Registry</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      Multi-Tenant Transparent Governance
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Search and manage credentials issued across all partner hospital admins, clinical doctors, and patient users.
                  </p>
                </div>
              </div>

              {/* Filtering Ribbon */}
              <div className="p-4 rounded-2xl bg-[#0E131F] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap flex-1">
                  {/* Search Input */}
                  <div className="relative min-w-[240px]">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search name, username, UID..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>

                  {/* Tenant Facility Dropdown */}
                  <select
                    value={tenantFilter}
                    onChange={(e) => setTenantFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
                  >
                    <option value="ALL">All Partner Facilities</option>
                    {hospitals.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>

                  {/* Role Filter Tabs */}
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                    {['ALL', 'HOSPITAL_ADMIN', 'DOCTOR', 'PATIENT'].map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setRoleFilter(role)}
                        className={`px-3 py-1 rounded-lg transition-colors ${
                          roleFilter === role ? 'bg-teal-500/20 text-teal-300 font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {role === 'ALL' ? 'All Roles' : role.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-slate-400 font-medium">
                  Showing <strong>{filteredCredentials.length}</strong> Credential Records
                </div>
              </div>

              {/* Master Credential Table */}
              <div className="bg-[#0E131F] rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                <HorizontalScrollTrack
                  showProgressLine={true}
                  progressLinePosition="bottom"
                  scrollStep={280}
                  fadeMask={false}
                  customScrollbar={true}
                  className="w-full"
                >
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[11px] font-bold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">User Identity</th>
                        <th className="py-3 px-4">Account UID / Role</th>
                        <th className="py-3 px-4">Tenant Facility</th>
                        <th className="py-3 px-4">Provisioned By</th>
                        <th className="py-3 px-4">Security &amp; 2FA Status</th>
                        <th className="py-3 px-4 text-right">Credential Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredCredentials.map((cred) => {
                        const isLocked = cred.status === 'SUSPENDED' || cred.status === 'LOCKED';
                        return (
                          <tr key={cred.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-white">
                              <div className="text-sm font-extrabold text-white flex items-center gap-2">
                                <span>{cred.name}</span>
                                {isLocked && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                    LOCKED
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">{cred.username}</div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-mono text-teal-300 font-bold">{cred.id}</div>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                                cred.role === 'HOSPITAL_ADMIN' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                                cred.role === 'DOCTOR' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' :
                                'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                              }`}>
                                {cred.role}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-medium text-slate-300">
                              <div>{cred.hospitalName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{cred.hospitalId}</div>
                            </td>

                            <td className="py-3.5 px-4 text-slate-400">
                              <div>{cred.createdBy}</div>
                              <div className="text-[10px] text-slate-500">{cred.createdAt.split('T')[0]}</div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>2FA {cred.twoFactorStatus}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Last: {cred.lastLogin}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-right relative">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedCredentialForDossier(cred)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                  title="View Credential Dossier"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleForcePasswordReset(cred)}
                                  className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/15 transition-colors"
                                  title="Force Password Reset &amp; Regenerate Key"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleAccountLock(cred)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    isLocked ? 'text-emerald-400 hover:bg-emerald-500/15' : 'text-rose-400 hover:bg-rose-500/15'
                                  }`}
                                  title={isLocked ? 'Restore Account Access' : 'Suspend / Lock Account'}
                                >
                                  {isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </HorizontalScrollTrack>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* VIEW C: TIER 3 - FACILITY DRILL-DOWN COMMAND CENTER             */}
          {/* ================================================================ */}
          {activeNav === 'DRILLDOWN' && selectedHospitalForDrilldown && (
            <div className="space-y-6">
              {/* Back to Facilities Button */}
              <button
                type="button"
                onClick={() => { setSelectedHospitalForDrilldown(null); setActiveNav('OVERVIEW'); }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors"
              >
                <span>&larr; Back to Network Facilities</span>
              </button>

              {/* Facility Header Banner */}
              <div className="bg-[#0E131F] rounded-2xl border border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                      {selectedHospitalForDrilldown.code}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      License: {selectedHospitalForDrilldown.licenseUid}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-white">{selectedHospitalForDrilldown.name}</h2>
                  <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{selectedHospitalForDrilldown.address}, {selectedHospitalForDrilldown.city}, {selectedHospitalForDrilldown.state}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Total Beds</div>
                    <div className="text-lg font-black text-white">{selectedHospitalForDrilldown.totalBedsQuota}</div>
                  </div>
                  <div className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Active Staff</div>
                    <div className="text-lg font-black text-cyan-400">{selectedHospitalForDrilldown.activeDoctorsCount}</div>
                  </div>
                  <div className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Active Patients</div>
                    <div className="text-lg font-black text-indigo-400">{selectedHospitalForDrilldown.activePatientsCount}</div>
                  </div>
                </div>
              </div>

              {/* Sub-tabs within Facility Drill-Down */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  type="button"
                  onClick={() => setDrilldownSubtab('DOCTORS')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    drilldownSubtab === 'DOCTORS' ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Staff Doctors Directory
                </button>
                <button
                  type="button"
                  onClick={() => setDrilldownSubtab('PATIENTS')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    drilldownSubtab === 'PATIENTS' ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Enrolled Facility Patients
                </button>
                <button
                  type="button"
                  onClick={() => setDrilldownSubtab('AUDIT')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    drilldownSubtab === 'AUDIT' ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Facility Security Audit Trail
                </button>
              </div>

              {/* Subtab Content: Staff Doctors */}
              {drilldownSubtab === 'DOCTORS' && (
                <div className="bg-[#0E131F] rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <div className="text-xs font-bold text-slate-300">
                      Doctors Authorized under {selectedHospitalForDrilldown.name}
                    </div>
                  </div>
                  <HorizontalScrollTrack
                    showProgressLine={true}
                    progressLinePosition="bottom"
                    scrollStep={240}
                    customScrollbar={true}
                    fadeMask={false}
                    className="w-full"
                  >
                    <table className="w-full text-left text-xs min-w-[650px]">
                    <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Doctor Name</th>
                        <th className="py-3 px-4">Specialty &amp; License</th>
                        <th className="py-3 px-4">Portal Username</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {credentials.filter(c => c.hospitalId === selectedHospitalForDrilldown.id && c.role === 'DOCTOR').map(doc => (
                        <tr key={doc.id} className="hover:bg-slate-900/40">
                          <td className="py-3 px-4 font-bold text-white">{doc.name}</td>
                          <td className="py-3 px-4">
                            <div className="text-slate-300 font-semibold">{doc.specialtyOrDiagnosis || 'Specialist'}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{doc.licenseNumber || 'MCI-REG'}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">{doc.username}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300">
                              {doc.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleForcePasswordReset(doc)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold"
                            >
                              Reset Key
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </HorizontalScrollTrack>
              )}

              {/* Subtab Content: Enrolled Patients */}
              {drilldownSubtab === 'PATIENTS' && (
                <div className="bg-[#0E131F] rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="p-4 border-b border-slate-800 text-xs font-bold text-slate-300">
                    Active Inpatient &amp; Outpatient Portals under {selectedHospitalForDrilldown.name}
                  </div>
                  <HorizontalScrollTrack
                    showProgressLine={true}
                    progressLinePosition="bottom"
                    scrollStep={240}
                    customScrollbar={true}
                    fadeMask={false}
                    className="w-full"
                  >
                    <table className="w-full text-left text-xs min-w-[650px]">
                    <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Patient Name</th>
                        <th className="py-3 px-4">UHID / Clinical Condition</th>
                        <th className="py-3 px-4">Portal Username</th>
                        <th className="py-3 px-4">Portal Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {credentials.filter(c => c.hospitalId === selectedHospitalForDrilldown.id && c.role === 'PATIENT').map(pat => (
                        <tr key={pat.id} className="hover:bg-slate-900/40">
                          <td className="py-3 px-4 font-bold text-white">{pat.name}</td>
                          <td className="py-3 px-4">
                            <div className="text-slate-300 font-mono font-bold">{pat.licenseNumber || pat.id}</div>
                            <div className="text-[10px] text-slate-500">{pat.specialtyOrDiagnosis}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">{pat.username}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300">
                              {pat.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </HorizontalScrollTrack>
              )}

              {/* Subtab Content: Security Audit Trail */}
              {drilldownSubtab === 'AUDIT' && (
                <div className="bg-[#0E131F] rounded-2xl border border-slate-800 p-4 space-y-3">
                  <div className="text-xs font-bold text-slate-300 mb-2">
                    Security Event Log for {selectedHospitalForDrilldown.name}
                  </div>
                  {auditLogs.filter(a => a.hospitalId === selectedHospitalForDrilldown.id).map(log => (
                    <div key={log.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs flex justify-between items-start gap-4">
                      <div>
                        <div className="font-bold text-teal-300">{log.action}</div>
                        <div className="text-slate-300 mt-0.5">{log.details}</div>
                        <div className="text-[10px] text-slate-500 mt-1">Actor: {log.actor} • Target: {log.targetUser}</div>
                      </div>
                      <div className="text-right text-[10px] text-slate-400 shrink-0">
                        <div>{log.timestamp}</div>
                        <div className="font-mono text-slate-500">{log.ipHash}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* VIEW D: SECURITY AUDIT & COMPLIANCE LOGS                         */}
          {/* ================================================================ */}
          {activeNav === 'AUDIT' && !selectedHospitalForDrilldown && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
                <div>
                  <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                    <span>Immutable Security Audit Ledger</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      HIPAA / 21 CFR Part 11
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Cryptographically hashed audit log of all facility credential provisions, forced rotations, and access revocations.
                  </p>
                </div>
              </div>

              <div className="bg-[#0E131F] rounded-2xl border border-slate-800 overflow-hidden">
                <div className="divide-y divide-slate-800/60">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/30 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                            {log.action}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">{log.id}</span>
                        </div>
                        <div className="text-sm font-semibold text-slate-200">
                          {log.details}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>Actor: <strong className="text-slate-400">{log.actor}</strong></span>
                          <span>•</span>
                          <span>Target: <strong className="text-slate-400">{log.targetUser}</strong></span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-semibold text-slate-300">{log.timestamp}</div>
                        <div className="text-[10px] font-mono text-teal-400/80">{log.ipHash}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* VIEW E: RBAC & SYSTEM SETTINGS                                   */}
          {/* ================================================================ */}
          {(activeNav === 'RBAC' || activeNav === 'SETTINGS') && (
            <div className="bg-[#0E131F] rounded-2xl border border-slate-800 p-6 space-y-6">
              <h2 className="text-xl font-black text-white">System Governance &amp; Multi-Tenant Isolation</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="font-bold text-teal-300 text-sm">Tenant Isolation Guard</div>
                  <p className="text-slate-400">Strict database schema isolation enforcing hospital boundary checks. Partner hospital admins can only access doctors and patients under their assigned `hospitalId`.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="font-bold text-teal-300 text-sm">Cryptographic Security Policy</div>
                  <p className="text-slate-400">BCrypt 12-round salted hashing for all user credentials. Mandatory password expiration set to 90 days across clinical doctor accounts.</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ================================================================== */}
      {/* MODAL 1: HOSPITAL PROVISIONING DRAWER (Multi-Step Form)            */}
      {/* ================================================================== */}
      {isProvisionDrawerOpen && (
        <div className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="w-full max-w-2xl bg-[#0E131F] border-l border-slate-800 h-full overflow-y-auto p-6 sm:p-8 flex flex-col justify-between shadow-2xl">
            <form onSubmit={handleProvisionSubmit} className="space-y-6">
              {/* Drawer Header */}
              <div className="flex justify-between items-start pb-4 border-b border-slate-800">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5 mb-1">
                    <Building2 className="w-4 h-4" />
                    <span>Hospital Administrator Provisioning</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-white">Onboard New Healthcare Partner</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProvisionDrawerOpen(false)}
                  className="text-slate-400 hover:text-white text-lg font-bold p-1"
                >
                  ✕
                </button>
              </div>

              {/* Stepper Indicator */}
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setProvisionStep(step as any)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      provisionStep === step
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                        : 'bg-slate-900 text-slate-500'
                    }`}
                  >
                    Step {step}: {step === 1 ? 'Facility Profile' : step === 2 ? 'Admin Credentials' : 'Quota & Capacities'}
                  </button>
                ))}
              </div>

              {/* STEP 1: Facility Profile */}
              {provisionStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Facility Legal Name *</label>
                    <input
                      type="text"
                      required
                      value={provisionForm.facilityName}
                      onChange={(e) => setProvisionForm({ ...provisionForm, facilityName: e.target.value })}
                      placeholder="e.g. Apollo Super Speciality Hospital"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Facility Code *</label>
                      <input
                        type="text"
                        required
                        value={provisionForm.facilityCode}
                        onChange={(e) => setProvisionForm({ ...provisionForm, facilityCode: e.target.value })}
                        placeholder="e.g. ASH"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white uppercase focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">License / NABH UID *</label>
                      <input
                        type="text"
                        required
                        value={provisionForm.licenseUid}
                        onChange={(e) => setProvisionForm({ ...provisionForm, licenseUid: e.target.value })}
                        placeholder="e.g. NABH-DL-2026-901"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">City *</label>
                      <input
                        type="text"
                        required
                        value={provisionForm.city}
                        onChange={(e) => setProvisionForm({ ...provisionForm, city: e.target.value })}
                        placeholder="e.g. New Delhi"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">State *</label>
                      <input
                        type="text"
                        required
                        value={provisionForm.state}
                        onChange={(e) => setProvisionForm({ ...provisionForm, state: e.target.value })}
                        placeholder="e.g. Delhi"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Contact Official &amp; Helpline</label>
                    <input
                      type="text"
                      value={provisionForm.contactOfficial}
                      onChange={(e) => setProvisionForm({ ...provisionForm, contactOfficial: e.target.value })}
                      placeholder="e.g. Dr. A. K. Sharma (Medical Director) • +91 11 2345 6789"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Administrator Credentials */}
              {provisionStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Administrator Official Email *</label>
                    <input
                      type="email"
                      required
                      value={provisionForm.adminEmail}
                      onChange={(e) => setProvisionForm({ ...provisionForm, adminEmail: e.target.value })}
                      placeholder="e.g. admin@apollohealth.org"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-slate-300">Generated Temporary Password *</label>
                      <button
                        type="button"
                        onClick={() => setProvisionForm({ ...provisionForm, adminPassword: generateHighEntropyPassword() })}
                        className="text-[11px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Generate Strong Key
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={provisionForm.adminPassword}
                        onChange={(e) => setProvisionForm({ ...provisionForm, adminPassword: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white font-mono font-bold tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyText(provisionForm.adminPassword, 'password')}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white shrink-0"
                      >
                        {copiedKey === 'password' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs text-teal-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>First-Login Security Enforcement</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Mandatory password change will be enforced immediately upon the hospital administrator's first authentication.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 3: Quota & Capability Allocations */}
              {provisionStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Max Doctor Accounts</label>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={provisionForm.maxDoctorsQuota}
                        onChange={(e) => setProvisionForm({ ...provisionForm, maxDoctorsQuota: parseInt(e.target.value, 10) })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Authorized Bed Quota</label>
                      <input
                        type="number"
                        min="10"
                        max="2000"
                        value={provisionForm.totalBedsQuota}
                        onChange={(e) => setProvisionForm({ ...provisionForm, totalBedsQuota: parseInt(e.target.value, 10) })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div>
                      <div className="text-xs font-bold text-white">Cross-Facility Specialist Referrals</div>
                      <div className="text-[11px] text-slate-400">Allow inter-hospital emergency referrals to accredited network partners</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={provisionForm.crossFacilityReferral}
                      onChange={(e) => setProvisionForm({ ...provisionForm, crossFacilityReferral: e.target.checked })}
                      className="w-4 h-4 accent-teal-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Drawer Actions */}
              <div className="pt-4 border-t border-slate-800 flex justify-between items-center gap-3">
                {provisionStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setProvisionStep((provisionStep - 1) as any)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                  >
                    &larr; Back
                  </button>
                ) : (
                  <div></div>
                )}

                {provisionStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setProvisionStep((provisionStep + 1) as any)}
                    className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold"
                  >
                    Next &rarr;
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-extrabold shadow-lg shadow-teal-500/20"
                  >
                    ✓ Provision &amp; Issue Activation Packet
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL 2: CREDENTIAL DOSSIER POPUP DIALOG                           */}
      {/* ================================================================== */}
      {selectedCredentialForDossier && (
        <div className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[#0E131F] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Privileged Credential Dossier</span>
                <h3 className="text-lg font-extrabold text-white">{selectedCredentialForDossier.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCredentialForDossier(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-slate-500 uppercase text-[10px] font-bold">Username / Login Identifier</span>
                <div className="font-mono font-bold text-white text-sm">{selectedCredentialForDossier.username}</div>
                <div className="text-[10px] text-teal-400 font-mono">UID: {selectedCredentialForDossier.id}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 uppercase text-[10px] font-bold">Assigned Facility</span>
                  <div className="font-bold text-white mt-0.5">{selectedCredentialForDossier.hospitalName}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 uppercase text-[10px] font-bold">Role Authority</span>
                  <div className="font-bold text-teal-300 mt-0.5">{selectedCredentialForDossier.role}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-400">
                <div>Created By: <strong className="text-white">{selectedCredentialForDossier.createdBy}</strong></div>
                <div>Status: <strong className="text-emerald-400">{selectedCredentialForDossier.status}</strong></div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onPrintCredentialSlip) onPrintCredentialSlip(selectedCredentialForDossier);
                  else window.print();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Credential Slip</span>
              </button>
              <button
                type="button"
                onClick={() => handleForcePasswordReset(selectedCredentialForDossier)}
                className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-bold text-amber-300"
              >
                Force Key Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL 3: COMMAND PALETTE (Cmd/Ctrl + K)                            */}
      {/* ================================================================== */}
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20 p-4 animate-fade-in">
          <div className="w-full max-w-xl bg-[#0E131F] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-slate-800">
              <Search className="w-5 h-5 text-teal-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search hospitals, doctors, patients, or credentials..."
                className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-slate-500"
              />
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">ESC</kbd>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-800/40">
              {commandPaletteResults.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  {searchQuery.trim() ? 'No facilities or credentials matching your search.' : 'Type any facility code, doctor name, patient UHID, or email...'}
                </div>
              ) : (
                commandPaletteResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (item.type === 'HOSPITAL') {
                        setSelectedHospitalForDrilldown(item.data as HospitalFacility);
                        setActiveNav('DRILLDOWN');
                      } else {
                        setSelectedCredentialForDossier(item.data as UserCredentialRecord);
                      }
                      setIsCommandPaletteOpen(false);
                    }}
                    className="p-3 rounded-xl hover:bg-slate-900/80 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{item.label}</div>
                      <div className="text-[11px] text-slate-400">{item.sub}</div>
                    </div>
                    <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">
                      {item.type} &rarr;
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperadminDashboard;

