package com.hospitrack.service;

import com.hospitrack.dto.AssignBedRequest;
import com.hospitrack.entity.*;
import com.hospitrack.exception.BadRequestException;
import com.hospitrack.exception.ResourceNotFoundException;
import com.hospitrack.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@SuppressWarnings("null")
public class BedService {

    private final BedRepository bedRepository;
    private final BedMaintenanceLogRepository maintenanceLogRepository;
    private final HospitalRepository hospitalRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final AuditService auditService;

    public BedService(
            BedRepository bedRepository,
            BedMaintenanceLogRepository maintenanceLogRepository,
            HospitalRepository hospitalRepository,
            PatientRepository patientRepository,
            DoctorRepository doctorRepository,
            AuditService auditService
    ) {
        this.bedRepository = bedRepository;
        this.maintenanceLogRepository = maintenanceLogRepository;
        this.hospitalRepository = hospitalRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.auditService = auditService;
    }

    @Transactional
    public List<Bed> getBedsByHospital(String hospitalId) {
        Hospital hospital = hospitalRepository.findById(Objects.requireNonNull(hospitalId))
                .orElseThrow(() -> new ResourceNotFoundException("Hospital not found: " + hospitalId));

        List<Bed> beds = bedRepository.findByHospitalIdOrderByWardIdAscBedNumberAsc(hospitalId);
        if (beds.isEmpty()) {
            initializeHospitalBeds(hospital);
            beds = bedRepository.findByHospitalIdOrderByWardIdAscBedNumberAsc(hospitalId);
        }
        return beds;
    }

    @Transactional
    public void initializeHospitalBeds(Hospital hospital) {
        if (bedRepository.countByHospitalId(hospital.getId()) > 0) {
            return;
        }

        String hospId = hospital.getId();
        int total = hospital.getTotalBeds() != null && hospital.getTotalBeds() > 0 ? hospital.getTotalBeds() : 100;

        // Structure wards based on clinical capacity distribution
        int genCount = Math.max(4, (int) Math.round(total * 0.40));
        int icuCount = Math.max(2, (int) Math.round(total * 0.15));
        int emgCount = Math.max(2, (int) Math.round(total * 0.15));
        int surgCount = Math.max(2, (int) Math.round(total * 0.15));
        int pedCount = Math.max(2, total - (genCount + icuCount + emgCount + surgCount));

        // 1. General Medicine Ward
        createWardBeds(hospId, "general-ward", "General Medicine Ward", "GEN-", "Standard Inpatient Ward Bed", genCount);
        // 2. Intensive Care Unit (ICU)
        createWardBeds(hospId, "icu", "Intensive Care Unit (ICU)", "ICU-", "Advanced Telemetry ICU Bed", icuCount);
        // 3. Emergency Triage
        createWardBeds(hospId, "emergency", "Emergency Triage Ward", "EMG-", "Acute Emergency Resuscitation Bed", emgCount);
        // 4. Surgical Recovery
        createWardBeds(hospId, "surgical-ward", "Surgical Recovery Ward", "SUR-", "Post-Operative Recovery Bed", surgCount);
        // 5. Pediatric Ward
        createWardBeds(hospId, "pediatric-ward", "Pediatric Care Ward", "PED-", "Specialized Pediatric Care Bed", pedCount);

        // Sync active inpatients to beds
        List<Patient> activePatients = patientRepository.findByCurrentHospitalId(hospId).stream()
                .filter(p -> "CHECKED_IN".equalsIgnoreCase(p.getStatus()) || "TRANSFER_PENDING".equalsIgnoreCase(p.getStatus()))
                .toList();

        List<Bed> availableBeds = bedRepository.findByHospitalIdAndStatus(hospId, "AVAILABLE");
        for (int i = 0; i < Math.min(activePatients.size(), availableBeds.size()); i++) {
            Patient p = activePatients.get(i);
            Bed b = availableBeds.get(i);
            b.setStatus("OCCUPIED");
            b.setPatientId(p.getId());
            b.setPatientName(p.getName());
            if (p.getPrimaryDoctorId() != null) {
                b.setDoctorId(p.getPrimaryDoctorId());
                doctorRepository.findById(p.getPrimaryDoctorId()).ifPresent(d -> b.setDoctorName(d.getName()));
            }
            b.setUpdatedAt(LocalDateTime.now());
            bedRepository.save(b);

            p.setWard(b.getWardName());
            p.setBedNumber(b.getBedNumber());
            patientRepository.save(p);
        }

        recalculateHospitalCapacity(hospital);
    }

    private void createWardBeds(String hospId, String wardId, String wardName, String prefix, String type, int count) {
        for (int i = 1; i <= count; i++) {
            String bedNum = prefix + String.format("%02d", i);
            String bedId = "BED-" + hospId + "-" + bedNum;
            Bed bed = new Bed(bedId, hospId, wardId, wardName, bedNum, type, "AVAILABLE");
            bedRepository.save(bed);
        }
    }

    @Transactional
    public Bed assignBed(String hospitalId, AssignBedRequest request, String actorId, String actorRole, String actorName) {
        Hospital hospital = hospitalRepository.findById(Objects.requireNonNull(hospitalId))
                .orElseThrow(() -> new ResourceNotFoundException("Hospital not found: " + hospitalId));

        Patient patient = patientRepository.findById(Objects.requireNonNull(request.getPatientId()))
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + request.getPatientId()));

        if (patient.getCurrentHospitalId() == null || !patient.getCurrentHospitalId().equalsIgnoreCase(hospitalId)) {
            throw new BadRequestException("Patient does not belong to facility: " + hospital.getName());
        }

        if ("DISCHARGED".equalsIgnoreCase(patient.getStatus())) {
            throw new BadRequestException("Cannot assign bed to discharged patient.");
        }

        // Find target bed
        String identifier = request.getBedId().trim();
        Bed targetBed = bedRepository.findById(identifier)
                .or(() -> bedRepository.findByHospitalIdAndBedNumber(hospitalId, identifier))
                .orElseThrow(() -> new ResourceNotFoundException("Bed not found: " + identifier));

        if (!targetBed.getHospitalId().equalsIgnoreCase(hospitalId)) {
            throw new BadRequestException("Bed does not belong to hospital facility: " + hospital.getName());
        }

        if ("OCCUPIED".equalsIgnoreCase(targetBed.getStatus()) && !patient.getId().equalsIgnoreCase(targetBed.getPatientId())) {
            throw new BadRequestException("Bed " + targetBed.getBedNumber() + " is already occupied by patient " + targetBed.getPatientName() + ".");
        }

        if ("MAINTENANCE".equalsIgnoreCase(targetBed.getStatus())) {
            throw new BadRequestException("Bed " + targetBed.getBedNumber() + " is currently under maintenance / sterilization.");
        }

        // Check if patient was already occupying a DIFFERENT bed in this hospital
        Optional<Bed> currentOccupiedBed = bedRepository.findByPatientId(patient.getId());
        if (currentOccupiedBed.isPresent() && !currentOccupiedBed.get().getId().equalsIgnoreCase(targetBed.getId())) {
            Bed oldBed = currentOccupiedBed.get();
            oldBed.setStatus("AVAILABLE");
            oldBed.setPatientId(null);
            oldBed.setPatientName(null);
            oldBed.setDoctorId(null);
            oldBed.setDoctorName(null);
            oldBed.setUpdatedAt(LocalDateTime.now());
            bedRepository.save(oldBed);
        }

        // Assign Doctor
        String doctorId = request.getDoctorId() != null && !request.getDoctorId().isBlank()
                ? request.getDoctorId()
                : patient.getPrimaryDoctorId();
        String doctorName = null;
        if (doctorId != null && !doctorId.isBlank()) {
            Doctor doc = doctorRepository.findById(doctorId).orElse(null);
            if (doc != null) {
                doctorName = doc.getName();
                patient.setPrimaryDoctorId(doc.getId());
            }
        }

        // Update Bed
        targetBed.setStatus("OCCUPIED");
        targetBed.setPatientId(patient.getId());
        targetBed.setPatientName(patient.getName());
        targetBed.setDoctorId(doctorId);
        targetBed.setDoctorName(doctorName);
        targetBed.setMaintenanceReason(null);
        targetBed.setMaintenanceStartedAt(null);
        targetBed.setUpdatedAt(LocalDateTime.now());
        Bed savedBed = bedRepository.save(targetBed);

        // Update Patient
        patient.setWard(savedBed.getWardName());
        patient.setBedNumber(savedBed.getBedNumber());
        patientRepository.save(patient);

        recalculateHospitalCapacity(hospital);

        auditService.logEvent(actorId, actorRole, actorName, "BED_ASSIGNED", "BED", savedBed.getId(),
                "Assigned bed " + savedBed.getBedNumber() + " (" + savedBed.getWardName() + ") to patient " + patient.getName() + " (" + patient.getId() + ")");

        return savedBed;
    }

    @Transactional
    public Bed markBedMaintenance(String hospitalId, String bedId, String reason, String actorId, String actorRole, String actorName) {
        Hospital hospital = hospitalRepository.findById(Objects.requireNonNull(hospitalId))
                .orElseThrow(() -> new ResourceNotFoundException("Hospital not found: " + hospitalId));

        Bed bed = bedRepository.findById(Objects.requireNonNull(bedId))
                .or(() -> bedRepository.findByHospitalIdAndBedNumber(hospitalId, bedId))
                .orElseThrow(() -> new ResourceNotFoundException("Bed not found: " + bedId));

        if (!bed.getHospitalId().equalsIgnoreCase(hospitalId)) {
            throw new BadRequestException("Bed does not belong to hospital facility.");
        }

        String maintReason = reason != null && !reason.isBlank() ? reason : "Routine sterilization and biomedical inspection";

        // If patient was in bed, clear bed assignment
        if (bed.getPatientId() != null) {
            patientRepository.findById(bed.getPatientId()).ifPresent(p -> {
                p.setWard(null);
                p.setBedNumber(null);
                patientRepository.save(p);
            });
            bed.setPatientId(null);
            bed.setPatientName(null);
            bed.setDoctorId(null);
            bed.setDoctorName(null);
        }

        bed.setStatus("MAINTENANCE");
        bed.setMaintenanceReason(maintReason);
        bed.setMaintenanceStartedAt(LocalDateTime.now());
        bed.setUpdatedAt(LocalDateTime.now());
        Bed saved = bedRepository.save(bed);

        // Record log
        String logId = "BML-" + System.currentTimeMillis();
        BedMaintenanceLog log = new BedMaintenanceLog(
                logId,
                saved.getId(),
                hospitalId,
                saved.getWardName(),
                saved.getBedNumber(),
                maintReason,
                "STARTED",
                LocalDateTime.now(),
                null,
                actorName
        );
        maintenanceLogRepository.save(log);

        recalculateHospitalCapacity(hospital);

        auditService.logEvent(actorId, actorRole, actorName, "BED_MAINTENANCE_STARTED", "BED", saved.getId(),
                "Bed " + saved.getBedNumber() + " (" + saved.getWardName() + ") marked for maintenance: " + maintReason);

        return saved;
    }

    @Transactional
    public Bed releaseFromMaintenance(String hospitalId, String bedId, String actorId, String actorRole, String actorName) {
        Hospital hospital = hospitalRepository.findById(Objects.requireNonNull(hospitalId))
                .orElseThrow(() -> new ResourceNotFoundException("Hospital not found: " + hospitalId));

        Bed bed = bedRepository.findById(Objects.requireNonNull(bedId))
                .or(() -> bedRepository.findByHospitalIdAndBedNumber(hospitalId, bedId))
                .orElseThrow(() -> new ResourceNotFoundException("Bed not found: " + bedId));

        if (!bed.getHospitalId().equalsIgnoreCase(hospitalId)) {
            throw new BadRequestException("Bed does not belong to hospital facility.");
        }

        bed.setStatus("AVAILABLE");
        bed.setMaintenanceReason(null);
        bed.setMaintenanceStartedAt(null);
        bed.setUpdatedAt(LocalDateTime.now());
        Bed saved = bedRepository.save(bed);

        // Update maintenance logs
        List<BedMaintenanceLog> logs = maintenanceLogRepository.findByBedIdOrderByStartedAtDesc(saved.getId());
        if (!logs.isEmpty()) {
            BedMaintenanceLog latest = logs.get(0);
            if ("STARTED".equalsIgnoreCase(latest.getAction())) {
                latest.setAction("COMPLETED");
                latest.setCompletedAt(LocalDateTime.now());
                maintenanceLogRepository.save(latest);
            }
        }

        recalculateHospitalCapacity(hospital);

        auditService.logEvent(actorId, actorRole, actorName, "BED_MAINTENANCE_COMPLETED", "BED", saved.getId(),
                "Bed " + saved.getBedNumber() + " (" + saved.getWardName() + ") maintenance completed and returned to active inventory");

        return saved;
    }

    @Transactional(readOnly = true)
    public List<BedMaintenanceLog> getMaintenanceHistory(String hospitalId) {
        return maintenanceLogRepository.findByHospitalIdOrderByStartedAtDesc(hospitalId);
    }

    @Transactional
    public void handlePatientDischargeBedTransition(String hospitalId, String patientId, String actorId, String actorRole, String actorName) {
        Optional<Bed> occupiedBedOpt = bedRepository.findByPatientId(patientId);
        if (occupiedBedOpt.isPresent()) {
            Bed bed = occupiedBedOpt.get();
            bed.setStatus("MAINTENANCE");
            bed.setPatientId(null);
            bed.setPatientName(null);
            bed.setDoctorId(null);
            bed.setDoctorName(null);
            bed.setMaintenanceReason("Post-discharge sanitization and biomedical sterilization");
            bed.setMaintenanceStartedAt(LocalDateTime.now());
            bed.setEvsCleaningStartedAt(null);
            bed.setEvsCleaningCompletedAt(null);
            bed.setEvsStaffName(null);
            bed.setEvsProtocol("Terminal Disinfection");
            bed.setUpdatedAt(LocalDateTime.now());
            bedRepository.save(bed);

            BedMaintenanceLog log = new BedMaintenanceLog(
                    "LOG-" + System.currentTimeMillis() + "-" + (int)(Math.random() * 900 + 100),
                    hospitalId,
                    bed.getId(),
                    bed.getBedNumber(),
                    bed.getWardName(),
                    "Terminal Sanitization & Disinfection",
                    "STARTED",
                    LocalDateTime.now(),
                    null,
                    actorName
            );
            maintenanceLogRepository.save(log);

            auditService.logEvent(actorId, actorRole, actorName, "BED_MAINTENANCE_STARTED", "BED", bed.getId(),
                    "Bed " + bed.getBedNumber() + " (" + bed.getWardName() + ") vacated by discharged patient " + patientId + "; placed in EVS sanitization turnover queue.");

            hospitalRepository.findById(hospitalId).ifPresent(this::recalculateHospitalCapacity);
        } else {
            hospitalRepository.findById(hospitalId).ifPresent(this::recalculateHospitalCapacity);
        }
    }

    @Transactional
    public Bed dispatchEvsHousekeeping(String hospitalId, String bedId, String staffName, String protocol, String notes, String actorId, String actorRole, String actorName) {
        Hospital hospital = hospitalRepository.findById(Objects.requireNonNull(hospitalId))
                .orElseThrow(() -> new ResourceNotFoundException("Hospital not found: " + hospitalId));

        Bed bed = bedRepository.findById(Objects.requireNonNull(bedId))
                .or(() -> bedRepository.findByHospitalIdAndBedNumber(hospitalId, bedId))
                .orElseThrow(() -> new ResourceNotFoundException("Bed not found: " + bedId));

        if (!bed.getHospitalId().equalsIgnoreCase(hospitalId)) {
            throw new BadRequestException("Bed does not belong to hospital facility.");
        }

        bed.setStatus("CLEANING_IN_PROGRESS");
        bed.setEvsCleaningStartedAt(LocalDateTime.now());
        bed.setEvsStaffName(staffName != null && !staffName.isBlank() ? staffName.trim() : "EVS Sanitation Team");
        bed.setEvsProtocol(protocol != null && !protocol.isBlank() ? protocol.trim() : "Standard Terminal Sanitization");
        bed.setEvsNotes(notes != null ? notes.trim() : "Housekeeping dispatched for room disinfection.");
        bed.setUpdatedAt(LocalDateTime.now());
        Bed saved = bedRepository.save(bed);

        recalculateHospitalCapacity(hospital);

        auditService.logEvent(actorId, actorRole, actorName, "EVS_DISPATCHED", "BED", saved.getId(),
                "Dispatched EVS staff (" + saved.getEvsStaffName() + ") to bed " + saved.getBedNumber() + " (" + saved.getWardName() + ") under protocol: " + saved.getEvsProtocol());

        return saved;
    }

    @Transactional
    public Bed completeEvsCleaning(String hospitalId, String bedId, String staffName, String actorId, String actorRole, String actorName) {
        Hospital hospital = hospitalRepository.findById(Objects.requireNonNull(hospitalId))
                .orElseThrow(() -> new ResourceNotFoundException("Hospital not found: " + hospitalId));

        Bed bed = bedRepository.findById(Objects.requireNonNull(bedId))
                .or(() -> bedRepository.findByHospitalIdAndBedNumber(hospitalId, bedId))
                .orElseThrow(() -> new ResourceNotFoundException("Bed not found: " + bedId));

        if (!bed.getHospitalId().equalsIgnoreCase(hospitalId)) {
            throw new BadRequestException("Bed does not belong to hospital facility.");
        }

        LocalDateTime now = LocalDateTime.now();
        bed.setStatus("READY_FOR_INSPECTION");
        bed.setEvsCleaningCompletedAt(now);
        if (staffName != null && !staffName.isBlank()) {
            bed.setEvsStaffName(staffName.trim());
        }

        if (bed.getEvsCleaningStartedAt() != null) {
            long minutes = java.time.Duration.between(bed.getEvsCleaningStartedAt(), now).toMinutes();
            bed.setEvsTurnaroundMinutes(Math.max(1, minutes));
        } else {
            bed.setEvsTurnaroundMinutes(25L);
        }

        bed.setUpdatedAt(now);
        Bed saved = bedRepository.save(bed);

        recalculateHospitalCapacity(hospital);

        auditService.logEvent(actorId, actorRole, actorName, "EVS_CLEANING_COMPLETED", "BED", saved.getId(),
                "EVS sanitization completed for bed " + saved.getBedNumber() + " (" + saved.getWardName() + "). Turnaround: " + saved.getEvsTurnaroundMinutes() + " mins. Awaiting nurse inspection.");

        return saved;
    }

    @Transactional
    public Bed inspectAndReleaseBed(String hospitalId, String bedId, String inspectorName, String actorId, String actorRole, String actorName) {
        Hospital hospital = hospitalRepository.findById(Objects.requireNonNull(hospitalId))
                .orElseThrow(() -> new ResourceNotFoundException("Hospital not found: " + hospitalId));

        Bed bed = bedRepository.findById(Objects.requireNonNull(bedId))
                .or(() -> bedRepository.findByHospitalIdAndBedNumber(hospitalId, bedId))
                .orElseThrow(() -> new ResourceNotFoundException("Bed not found: " + bedId));

        if (!bed.getHospitalId().equalsIgnoreCase(hospitalId)) {
            throw new BadRequestException("Bed does not belong to hospital facility.");
        }

        bed.setStatus("AVAILABLE");
        bed.setPatientId(null);
        bed.setPatientName(null);
        bed.setDoctorId(null);
        bed.setDoctorName(null);
        bed.setMaintenanceReason(null);
        bed.setMaintenanceStartedAt(null);
        bed.setUpdatedAt(LocalDateTime.now());
        Bed saved = bedRepository.save(bed);

        recalculateHospitalCapacity(hospital);

        String inspector = inspectorName != null && !inspectorName.isBlank() ? inspectorName : actorName;
        auditService.logEvent(actorId, actorRole, actorName, "BED_INSPECTED_RELEASED", "BED", saved.getId(),
                "Bed " + saved.getBedNumber() + " (" + saved.getWardName() + ") certified sterile by " + inspector + " and released to active inpatient inventory.");

        return saved;
    }

    @Transactional(readOnly = true)
    public com.hospitrack.dto.EvsTurnoverSummaryDto getEvsTurnoverSummary(String hospitalId) {
        com.hospitrack.dto.EvsTurnoverSummaryDto dto = new com.hospitrack.dto.EvsTurnoverSummaryDto();
        dto.setHospitalId(hospitalId);

        List<Bed> all = bedRepository.findByHospitalIdOrderByWardIdAscBedNumberAsc(hospitalId);
        dto.setTotalBeds(all.size());

        int occ = 0, avail = 0, dirty = 0, cleaning = 0, ready = 0, maint = 0;
        long totalTurnaroundMinutes = 0;
        int turnaroundCount = 0;

        for (Bed b : all) {
            String s = b.getStatus() != null ? b.getStatus().toUpperCase() : "AVAILABLE";
            switch (s) {
                case "OCCUPIED" -> occ++;
                case "AVAILABLE" -> avail++;
                case "DIRTY_PENDING_CLEANING", "DIRTY" -> dirty++;
                case "CLEANING_IN_PROGRESS", "CLEANING" -> cleaning++;
                case "READY_FOR_INSPECTION", "INSPECTED" -> ready++;
                case "MAINTENANCE" -> maint++;
                default -> avail++;
            }
            if (b.getEvsTurnaroundMinutes() != null && b.getEvsTurnaroundMinutes() > 0) {
                totalTurnaroundMinutes += b.getEvsTurnaroundMinutes();
                turnaroundCount++;
            }
        }

        dto.setOccupiedBeds(occ);
        dto.setAvailableBeds(avail);
        dto.setDirtyBeds(dirty);
        dto.setCleaningBeds(cleaning);
        dto.setReadyForInspectionBeds(ready);
        dto.setMaintenanceBeds(maint);
        dto.setTotalTurnoverQueue(dirty + cleaning + ready);
        dto.setAverageTurnaroundMinutes(turnaroundCount > 0 ? Math.round((double) totalTurnaroundMinutes / turnaroundCount * 10.0) / 10.0 : 28.5);

        return dto;
    }

    @Transactional
    public void recalculateHospitalCapacity(Hospital hospital) {
        long totalCount = bedRepository.countByHospitalId(hospital.getId());
        long availableCount = bedRepository.countByHospitalIdAndStatus(hospital.getId(), "AVAILABLE");

        if (totalCount > 0) {
            hospital.setTotalBeds((int) totalCount);
            hospital.setAvailableBeds(Math.min((int) totalCount, (int) availableCount));
            hospitalRepository.save(hospital);
        }
    }
}
