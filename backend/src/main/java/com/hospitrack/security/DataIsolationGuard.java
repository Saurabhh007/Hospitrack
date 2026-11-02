package com.hospitrack.security;

import com.hospitrack.entity.*;
import com.hospitrack.repository.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component("dataGuard")
public class DataIsolationGuard {

    private final PatientRepository patientRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final LabReportRepository labReportRepository;
    private final ReferralRepository referralRepository;
    private final TransferRepository transferRepository;
    private final DoctorRepository doctorRepository;
    private final DepartmentRepository departmentRepository;

    public DataIsolationGuard(
            PatientRepository patientRepository,
            PrescriptionRepository prescriptionRepository,
            LabReportRepository labReportRepository,
            ReferralRepository referralRepository,
            TransferRepository transferRepository,
            DoctorRepository doctorRepository,
            DepartmentRepository departmentRepository
    ) {
        this.patientRepository = patientRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.labReportRepository = labReportRepository;
        this.referralRepository = referralRepository;
        this.transferRepository = transferRepository;
        this.doctorRepository = doctorRepository;
        this.departmentRepository = departmentRepository;
    }

    public UserPrincipal getCurrentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal) {
            return (UserPrincipal) auth.getPrincipal();
        }
        return null;
    }

    public boolean canAccessPatient(String patientId) {
        if (patientId == null || patientId.trim().isEmpty()) {
            return false;
        }

        UserPrincipal principal = getCurrentPrincipal();
        if (principal == null) return false;

        if (principal.getRole() == Role.SUPER_ADMIN) {
            return true;
        }

        if (principal.getRole() == Role.PATIENT) {
            return patientId.equalsIgnoreCase(principal.getPatientId());
        }

        Optional<Patient> opt = patientRepository.findById(patientId);
        if (opt.isEmpty()) return false;
        Patient patient = opt.get();

        if (principal.getRole() == Role.HOSPITAL_ADMIN) {
            return principal.getHospitalId() != null && principal.getHospitalId().equalsIgnoreCase(patient.getCurrentHospitalId());
        }

        if (principal.getRole() == Role.DOCTOR) {
            boolean isAssignedDoctor = principal.getDoctorId() != null && principal.getDoctorId().equalsIgnoreCase(patient.getPrimaryDoctorId());
            boolean isSameHospital = principal.getHospitalId() != null && principal.getHospitalId().equalsIgnoreCase(patient.getCurrentHospitalId());
            return isAssignedDoctor || isSameHospital;
        }

        return false;
    }

    public boolean canAccessPrescription(String prescriptionId) {
        if (prescriptionId == null || prescriptionId.trim().isEmpty()) {
            return false;
        }
        UserPrincipal principal = getCurrentPrincipal();
        if (principal == null) return false;
        if (principal.getRole() == Role.SUPER_ADMIN) return true;

        Optional<Prescription> opt = prescriptionRepository.findById(prescriptionId);
        if (opt.isEmpty()) return false;
        return canAccessPatient(opt.get().getPatientId());
    }

    public boolean canAccessLabReport(String reportId) {
        if (reportId == null || reportId.trim().isEmpty()) {
            return false;
        }
        UserPrincipal principal = getCurrentPrincipal();
        if (principal == null) return false;
        if (principal.getRole() == Role.SUPER_ADMIN) return true;

        Optional<LabReport> opt = labReportRepository.findById(reportId);
        if (opt.isEmpty()) return false;
        return canAccessPatient(opt.get().getPatientId());
    }

    public boolean canManageHospital(String hospitalId) {
        if (hospitalId == null || hospitalId.trim().isEmpty()) {
            return false;
        }

        UserPrincipal principal = getCurrentPrincipal();
        if (principal == null) return false;

        if (principal.getRole() == Role.SUPER_ADMIN) {
            return true;
        }

        if (principal.getRole() == Role.HOSPITAL_ADMIN) {
            return hospitalId.equalsIgnoreCase(principal.getHospitalId());
        }

        return false;
    }

    public boolean canOperateAsDoctor(String doctorId) {
        if (doctorId == null || doctorId.trim().isEmpty()) {
            return false;
        }

        UserPrincipal principal = getCurrentPrincipal();
        if (principal == null) return false;

        if (principal.getRole() == Role.SUPER_ADMIN) {
            return true;
        }

        if (principal.getRole() == Role.DOCTOR) {
            return doctorId.equalsIgnoreCase(principal.getDoctorId());
        }

        return false;
    }

    public boolean canAccessDoctor(String doctorId) {
        if (doctorId == null || doctorId.trim().isEmpty()) {
            return false;
        }

        UserPrincipal principal = getCurrentPrincipal();
        if (principal == null) return false;

        if (principal.getRole() == Role.SUPER_ADMIN) {
            return true;
        }

        if (principal.getRole() == Role.DOCTOR) {
            return doctorId.equalsIgnoreCase(principal.getDoctorId());
        }

        if (principal.getRole() == Role.HOSPITAL_ADMIN) {
            Optional<Doctor> opt = doctorRepository.findById(doctorId);
            return opt.isPresent() && principal.getHospitalId() != null && principal.getHospitalId().equalsIgnoreCase(opt.get().getHospitalId());
        }

        return false;
    }

    public boolean canAccessReferral(String referralId) {
        if (referralId == null || referralId.trim().isEmpty()) {
            return false;
        }

        UserPrincipal principal = getCurrentPrincipal();
        if (principal == null) return false;

        if (principal.getRole() == Role.SUPER_ADMIN) {
            return true;
        }

        Optional<Referral> opt = referralRepository.findById(referralId);
        if (opt.isEmpty()) return false;
        Referral ref = opt.get();

        if (principal.getRole() == Role.PATIENT) {
            return principal.getPatientId() != null && principal.getPatientId().equalsIgnoreCase(ref.getPatientId());
        }

        if (principal.getRole() == Role.HOSPITAL_ADMIN || principal.getRole() == Role.DOCTOR) {
            String hospId = principal.getHospitalId();
            boolean isFrom = hospId != null && hospId.equalsIgnoreCase(ref.getFromHospitalId());
            boolean isTo = hospId != null && hospId.equalsIgnoreCase(ref.getToHospitalId());
            boolean isDoc = principal.getDoctorId() != null && principal.getDoctorId().equalsIgnoreCase(ref.getDoctorId());
            return isFrom || isTo || isDoc || canAccessPatient(ref.getPatientId());
        }

        return false;
    }

    public boolean canAccessTransfer(String transferId) {
        if (transferId == null || transferId.trim().isEmpty()) {
            return false;
        }

        UserPrincipal principal = getCurrentPrincipal();
        if (principal == null) return false;

        if (principal.getRole() == Role.SUPER_ADMIN) {
            return true;
        }

        Optional<Transfer> opt = transferRepository.findById(transferId);
        if (opt.isEmpty()) return false;
        Transfer trf = opt.get();

        if (principal.getRole() == Role.PATIENT) {
            return principal.getPatientId() != null && principal.getPatientId().equalsIgnoreCase(trf.getPatientId());
        }

        if (principal.getRole() == Role.HOSPITAL_ADMIN || principal.getRole() == Role.DOCTOR) {
            String hospId = principal.getHospitalId();
            boolean isFrom = hospId != null && hospId.equalsIgnoreCase(trf.getFromHospitalId());
            boolean isTo = hospId != null && hospId.equalsIgnoreCase(trf.getToHospitalId());
            return isFrom || isTo || canAccessPatient(trf.getPatientId());
        }

        return false;
    }

    public boolean canAccessDepartment(String departmentId) {
        if (departmentId == null || departmentId.trim().isEmpty()) {
            return false;
        }

        UserPrincipal principal = getCurrentPrincipal();
        if (principal == null) return false;

        if (principal.getRole() == Role.SUPER_ADMIN) {
            return true;
        }

        Optional<Department> opt = departmentRepository.findById(departmentId);
        if (opt.isEmpty()) return false;
        Department dept = opt.get();

        if (principal.getRole() == Role.HOSPITAL_ADMIN || principal.getRole() == Role.DOCTOR) {
            return principal.getHospitalId() != null && principal.getHospitalId().equalsIgnoreCase(dept.getHospitalId());
        }

        return false;
    }
}
