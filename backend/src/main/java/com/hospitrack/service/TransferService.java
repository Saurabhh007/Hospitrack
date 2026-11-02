package com.hospitrack.service;

import com.hospitrack.dto.TransferRequest;
import com.hospitrack.entity.Hospital;
import com.hospitrack.entity.Patient;
import com.hospitrack.entity.Transfer;
import com.hospitrack.exception.BadRequestException;
import com.hospitrack.exception.ResourceNotFoundException;
import com.hospitrack.repository.HospitalRepository;
import com.hospitrack.repository.PatientRepository;
import com.hospitrack.repository.TransferRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
public class TransferService {

    private final TransferRepository transferRepository;
    private final PatientRepository patientRepository;
    private final HospitalRepository hospitalRepository;
    private final AuditService auditService;

    public TransferService(
            TransferRepository transferRepository,
            PatientRepository patientRepository,
            HospitalRepository hospitalRepository,
            AuditService auditService
    ) {
        this.transferRepository = transferRepository;
        this.patientRepository = patientRepository;
        this.hospitalRepository = hospitalRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<Transfer> getAllTransfers() {
        return transferRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Transfer getTransferById(String id) {
        return transferRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Transfer not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<Transfer> getTransfersByHospital(String hospitalId) {
        return transferRepository.findByFromHospitalIdOrToHospitalIdOrderByInitiatedAtDesc(hospitalId, hospitalId);
    }

    @Transactional(readOnly = true)
    public List<Transfer> getTransfersByPatient(String patientId) {
        return transferRepository.findByPatientIdOrderByInitiatedAtDesc(patientId);
    }

    @Transactional
    public Transfer initiateTransfer(TransferRequest request, String actorId, String actorRole, String actorName) {
        Patient patient = patientRepository.findById(Objects.requireNonNull(request.getPatientId()))
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + request.getPatientId()));

        String fromHospitalId = request.getFromHospitalId() != null ? request.getFromHospitalId() : patient.getCurrentHospitalId();

        String id = "TRF-" + (900 + transferRepository.count() + 1);
        Transfer transfer = new Transfer(
                id,
                request.getPatientId(),
                fromHospitalId,
                request.getToHospitalId(),
                request.getReason(),
                request.getPriority(),
                "PENDING",
                fromHospitalId,
                LocalDateTime.now(),
                null,
                request.getNotes()
        );

        patient.setStatus("TRANSFER_PENDING");
        patientRepository.save(patient);

        Transfer saved = transferRepository.save(transfer);
        auditService.logEvent(actorId, actorRole, actorName, "INITIATE_TRANSFER", "TRANSFER", saved.getId(),
                "Initiated " + saved.getPriority() + " hospital transfer for " + patient.getName() + " (" + patient.getId() + ") to " + saved.getToHospitalId());

        return saved;
    }

    @Transactional
    public Transfer acceptTransfer(String id, String actorId, String actorRole, String actorName) {
        Transfer transfer = transferRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Transfer not found: " + id));

        if (!"PENDING".equalsIgnoreCase(transfer.getStatus()) && !"IN_PROGRESS".equalsIgnoreCase(transfer.getStatus())) {
            throw new BadRequestException("Transfer is already " + transfer.getStatus());
        }

        Patient patient = patientRepository.findById(Objects.requireNonNull(transfer.getPatientId()))
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + transfer.getPatientId()));

        Hospital originHosp = transfer.getFromHospitalId() != null ? hospitalRepository.findById(Objects.requireNonNull(transfer.getFromHospitalId())).orElse(null) : null;
        Hospital destHosp = hospitalRepository.findById(Objects.requireNonNull(transfer.getToHospitalId()))
                .orElseThrow(() -> new ResourceNotFoundException("Destination hospital not found: " + transfer.getToHospitalId()));

        // Update transfer status
        transfer.setStatus("COMPLETED");
        transfer.setCompletedAt(LocalDateTime.now());
        Transfer savedTransfer = transferRepository.save(transfer);

        // Update patient current hospital & status
        patient.setCurrentHospitalId(destHosp.getId());
        patient.setStatus("CHECKED_IN");
        patientRepository.save(patient);

        // Reallocate beds
        if (originHosp != null) {
            originHosp.setAvailableBeds(originHosp.getAvailableBeds() + 1);
            hospitalRepository.save(originHosp);
        }
        if (destHosp.getAvailableBeds() > 0) {
            destHosp.setAvailableBeds(destHosp.getAvailableBeds() - 1);
            hospitalRepository.save(destHosp);
        }

        auditService.logEvent(actorId, actorRole, actorName, "ACCEPT_TRANSFER", "TRANSFER", savedTransfer.getId(),
                "Accepted emergency transfer " + savedTransfer.getId() + ". Patient " + patient.getName() + " admitted to " + destHosp.getName());

        return savedTransfer;
    }
}
