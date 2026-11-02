package com.hospitrack.service;

import com.hospitrack.entity.Doctor;
import com.hospitrack.entity.Patient;
import com.hospitrack.entity.User;
import com.hospitrack.repository.DoctorRepository;
import com.hospitrack.repository.PatientRepository;
import com.hospitrack.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class UserLookupService {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;

    public UserLookupService(
            UserRepository userRepository,
            DoctorRepository doctorRepository,
            PatientRepository patientRepository
    ) {
        this.userRepository = userRepository;
        this.doctorRepository = doctorRepository;
        this.patientRepository = patientRepository;
    }

    @Transactional(readOnly = true)
    public Optional<User> findByIdentifier(String identifier) {
        if (identifier == null || identifier.trim().isEmpty()) {
            return Optional.empty();
        }
        String idClean = identifier.trim();
        String idLower = idClean.toLowerCase();
        String idUpper = idClean.toUpperCase();

        // 1. Direct Email (case-insensitive)
        Optional<User> byEmail = userRepository.findByEmailIgnoreCase(idLower);
        if (byEmail.isPresent()) return byEmail;

        // 2. Direct User ID
        Optional<User> byId = userRepository.findById(idClean);
        if (byId.isPresent()) return byId;

        Optional<User> byIdUpper = userRepository.findById(idUpper);
        if (byIdUpper.isPresent()) return byIdUpper;

        // 3. User ID with "USER-" prefix (e.g. DOC-201 -> USER-DOC-201, PAT-301 -> USER-PAT-301)
        if (!idUpper.startsWith("USER-")) {
            Optional<User> byUserPrefix = userRepository.findById("USER-" + idUpper);
            if (byUserPrefix.isPresent()) return byUserPrefix;
        }

        // 4. Patient ID (case-insensitive)
        Optional<User> byPatientId = userRepository.findFirstByPatientIdIgnoreCase(idClean);
        if (byPatientId.isPresent()) return byPatientId;

        // 5. Doctor ID (case-insensitive)
        Optional<User> byDoctorId = userRepository.findFirstByDoctorIdIgnoreCase(idClean);
        if (byDoctorId.isPresent()) return byDoctorId;

        // 6. Doctor License Number (case-insensitive)
        Optional<Doctor> docByLicense = doctorRepository.findByLicenseNoIgnoreCase(idClean);
        if (docByLicense.isPresent()) {
            Optional<User> docUser = userRepository.findFirstByDoctorIdIgnoreCase(docByLicense.get().getId());
            if (docUser.isPresent()) return docUser;
            if (docByLicense.get().getEmail() != null) {
                Optional<User> docUserByEmail = userRepository.findByEmailIgnoreCase(docByLicense.get().getEmail());
                if (docUserByEmail.isPresent()) return docUserByEmail;
            }
        }

        // 7. Phone Number / Contact
        Optional<User> byPhone = userRepository.findByPhone(idClean);
        if (byPhone.isPresent()) return byPhone;

        Optional<Doctor> docByPhone = doctorRepository.findByPhone(idClean);
        if (docByPhone.isPresent()) {
            Optional<User> docUser = userRepository.findFirstByDoctorIdIgnoreCase(docByPhone.get().getId());
            if (docUser.isPresent()) return docUser;
        }

        Optional<Patient> patByContact = patientRepository.findByContact(idClean);
        if (patByContact.isPresent()) {
            Optional<User> patUser = userRepository.findFirstByPatientIdIgnoreCase(patByContact.get().getId());
            if (patUser.isPresent()) return patUser;
        }

        // 8. Username prefix before '@' (e.g. "s.sharma" matching "s.sharma@citygeneral.in")
        List<User> matchingPrefix = userRepository.findAll().stream()
                .filter(u -> u.getEmail() != null && u.getEmail().split("@")[0].equalsIgnoreCase(idClean))
                .toList();
        if (matchingPrefix.size() == 1) {
            return Optional.of(matchingPrefix.get(0));
        }

        return Optional.empty();
    }
}

