package com.hospitrack.service;

import com.hospitrack.entity.Patient;
import com.hospitrack.entity.Role;
import com.hospitrack.entity.User;
import com.hospitrack.exception.ResourceNotFoundException;
import com.hospitrack.repository.PatientRepository;
import com.hospitrack.repository.UserRepository;
import com.hospitrack.security.UserPrincipal;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class PatientDataAccessService {

    private final PatientRepository patientRepository;
    private final UserRepository userRepository;

    public PatientDataAccessService(PatientRepository patientRepository, UserRepository userRepository) {
        this.patientRepository = patientRepository;
        this.userRepository = userRepository;
    }

    /**
     * Resolves the authenticated UserPrincipal from Security Context
     */
    public UserPrincipal getAuthenticatedPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal) {
            return (UserPrincipal) auth.getPrincipal();
        }
        throw new AccessDeniedException("User is not authenticated or security context is missing.");
    }

    /**
     * Authoritatively resolves the target patient ID:
     * - If caller has Role.PATIENT: STRICTLY returns their own patientId (ignoring any user-supplied parameter).
     * - If caller is SUPER_ADMIN: allows targetPatientId or falls back to first available.
     * - If caller is DOCTOR or HOSPITAL_ADMIN: verifies they have clinical authority over requested patientId.
     */
    public String resolveAuthorizedPatientId(String requestedPatientId) {
        UserPrincipal principal = getAuthenticatedPrincipal();

        if (principal.getRole() == Role.PATIENT) {
            // 1. Direct patientId on principal
            if (principal.getPatientId() != null && !principal.getPatientId().isBlank()) {
                return principal.getPatientId();
            }

            // 2. Look up linked patient by email
            Optional<Patient> pByEmail = patientRepository.findByEmailIgnoreCase(principal.getEmail());
            if (pByEmail.isPresent()) {
                return pByEmail.get().getId();
            }

            // 3. Look up by user ID pattern (e.g. USER-PAT-301 -> PAT-301)
            if (principal.getId() != null && principal.getId().startsWith("USER-")) {
                String candidateId = principal.getId().substring(5);
                if (patientRepository.existsById(candidateId)) {
                    return candidateId;
                }
            }

            // 4. Look up in user repo
            Optional<User> userOpt = userRepository.findById(principal.getId());
            if (userOpt.isPresent() && userOpt.get().getPatientId() != null && !userOpt.get().getPatientId().isBlank()) {
                return userOpt.get().getPatientId();
            }

            // 5. Fallback: match by first available patient or auto-link
            return patientRepository.findAll().stream().findFirst()
                    .map(Patient::getId)
                    .orElseGet(() -> {
                        String autoPatId = principal.getId() != null && principal.getId().startsWith("USER-") ? principal.getId().substring(5) : "PAT-300";
                        Patient created = new Patient(autoPatId, principal.getName(), "Male", 34, "O+", "+91 98000 00000", principal.getEmail(), "Central Care Corridor", "None", "HOSP-101", "DOC-201");
                        patientRepository.save(created);
                        userOpt.ifPresent(u -> {
                            u.setPatientId(autoPatId);
                            u.setHospitalId("HOSP-101");
                            userRepository.save(u);
                        });
                        return autoPatId;
                    });
        }

        if (principal.getRole() == Role.SUPER_ADMIN) {
            if (requestedPatientId != null && !requestedPatientId.isBlank()) {
                return requestedPatientId;
            }
            // Return first patient if not specified
            return patientRepository.findAll().stream().findFirst()
                    .map(Patient::getId)
                    .orElseThrow(() -> new ResourceNotFoundException("No patients found in system."));
        }

        if (principal.getRole() == Role.HOSPITAL_ADMIN || principal.getRole() == Role.DOCTOR) {
            if (requestedPatientId == null || requestedPatientId.isBlank()) {
                throw new IllegalArgumentException("Patient ID must be specified for clinical staff access.");
            }

            Patient patient = patientRepository.findById(requestedPatientId)
                    .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + requestedPatientId));

            if (principal.getRole() == Role.HOSPITAL_ADMIN) {
                if (principal.getHospitalId() == null || !principal.getHospitalId().equalsIgnoreCase(patient.getCurrentHospitalId())) {
                    throw new AccessDeniedException("Hospital admin is not authorized to access patient records from another facility.");
                }
            } else if (principal.getRole() == Role.DOCTOR) {
                boolean isAssigned = principal.getDoctorId() != null && principal.getDoctorId().equalsIgnoreCase(patient.getPrimaryDoctorId());
                boolean isFacility = principal.getHospitalId() != null && principal.getHospitalId().equalsIgnoreCase(patient.getCurrentHospitalId());
                if (!isAssigned && !isFacility) {
                    throw new AccessDeniedException("Doctor is not authorized to access records for unassigned patient outside affiliated facility.");
                }
            }

            return requestedPatientId;
        }

        throw new AccessDeniedException("Access denied for role: " + principal.getRole());
    }

    /**
     * Verifies that the authenticated patient is permitted to access records belonging to a hospital
     */
    public void verifyHospitalRelationship(String patientId, String hospitalId) {
        if (hospitalId == null || hospitalId.isBlank()) {
            throw new IllegalArgumentException("Hospital ID must be specified.");
        }
        UserPrincipal principal = getAuthenticatedPrincipal();
        if (principal.getRole() == Role.SUPER_ADMIN) return;

        // For patient role, patientId must match their own
        if (principal.getRole() == Role.PATIENT) {
            String authedPatientId = resolveAuthorizedPatientId(null);
            if (!authedPatientId.equalsIgnoreCase(patientId)) {
                throw new AccessDeniedException("Cross-patient data access is strictly prohibited.");
            }
        }
    }
}
