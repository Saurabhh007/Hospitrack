package com.hospitrack.service;

import com.hospitrack.dto.DepartmentRequest;
import com.hospitrack.entity.Department;
import com.hospitrack.exception.BadRequestException;
import com.hospitrack.exception.DuplicateResourceException;
import com.hospitrack.exception.ResourceNotFoundException;
import com.hospitrack.repository.DepartmentRepository;
import com.hospitrack.repository.HospitalRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
@SuppressWarnings("null")
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final HospitalRepository hospitalRepository;
    private final AuditService auditService;

    public DepartmentService(DepartmentRepository departmentRepository, HospitalRepository hospitalRepository, AuditService auditService) {
        this.departmentRepository = departmentRepository;
        this.hospitalRepository = hospitalRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<Department> getDepartmentsByHospital(String hospitalId) {
        if (hospitalId == null || hospitalId.isBlank()) {
            return List.of();
        }
        return departmentRepository.findByHospitalId(hospitalId.trim());
    }

    @Transactional(readOnly = true)
    public Department getDepartmentById(String id) {
        return departmentRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + id));
    }

    @Transactional
    public Department createDepartment(String hospitalId, DepartmentRequest request, String actorId, String actorRole, String actorName) {
        if (hospitalId == null || hospitalId.isBlank()) {
            throw new BadRequestException("Hospital ID is required.");
        }
        if (!hospitalRepository.existsById(hospitalId)) {
            throw new ResourceNotFoundException("Hospital facility not found: " + hospitalId);
        }

        String name = request.getName() != null ? request.getName().trim() : "";
        if (name.isEmpty()) {
            throw new BadRequestException("Department name is required.");
        }

        if (departmentRepository.existsByHospitalIdAndNameIgnoreCase(hospitalId, name)) {
            throw new DuplicateResourceException("Department '" + name + "' already exists in this hospital.");
        }

        long count = departmentRepository.countByHospitalId(hospitalId);
        String prefix = name.length() >= 4 ? name.substring(0, 4).toUpperCase() : name.toUpperCase();
        String id = "DEPT-" + prefix + "-" + (100 + count + 1);
        int seq = 1;
        while (departmentRepository.existsById(id)) {
            id = "DEPT-" + prefix + "-" + (100 + count + 1 + seq);
            seq++;
        }

        Department department = new Department(
                id,
                hospitalId,
                name,
                request.getDescription() != null ? request.getDescription().trim() : "",
                request.getHead() != null ? request.getHead().trim() : null,
                request.getWardCategory() != null ? request.getWardCategory() : "GENERAL",
                request.getStatus() != null ? request.getStatus().toUpperCase() : "ACTIVE"
        );
        if (request.getIcon() != null) department.setIcon(request.getIcon());
        if (request.getColor() != null) department.setColor(request.getColor());

        Department saved = departmentRepository.save(department);

        auditService.logEvent(actorId, actorRole, actorName, "DEPARTMENT_CREATED", "DEPARTMENT", saved.getId(),
                "Created department " + saved.getName() + " for hospital " + hospitalId);

        return saved;
    }

    @Transactional
    public Department updateDepartment(String id, DepartmentRequest request, String actorId, String actorRole, String actorName) {
        Department department = getDepartmentById(id);

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            String newName = request.getName().trim();
            if (!newName.equalsIgnoreCase(department.getName()) && departmentRepository.existsByHospitalIdAndNameIgnoreCase(department.getHospitalId(), newName)) {
                throw new DuplicateResourceException("Another department with name '" + newName + "' already exists in this hospital.");
            }
            department.setName(newName);
        }

        if (request.getDescription() != null) {
            department.setDescription(request.getDescription().trim());
        }
        if (request.getHead() != null) {
            department.setHead(request.getHead().trim());
        }
        if (request.getWardCategory() != null) {
            department.setWardCategory(request.getWardCategory());
        }
        if (request.getIcon() != null) {
            department.setIcon(request.getIcon());
        }
        if (request.getColor() != null) {
            department.setColor(request.getColor());
        }
        if (request.getStatus() != null) {
            department.setStatus(request.getStatus().toUpperCase().trim());
        }
        department.setUpdatedAt(LocalDateTime.now());

        Department saved = departmentRepository.save(department);

        auditService.logEvent(actorId, actorRole, actorName, "DEPARTMENT_UPDATED", "DEPARTMENT", saved.getId(),
                "Updated department " + saved.getName() + " in hospital " + saved.getHospitalId());

        return saved;
    }

    @Transactional
    public void deleteDepartment(String id, String actorId, String actorRole, String actorName) {
        Department department = getDepartmentById(id);
        departmentRepository.delete(department);

        auditService.logEvent(actorId, actorRole, actorName, "DEPARTMENT_DELETED", "DEPARTMENT", id,
                "Deleted department " + department.getName() + " from hospital " + department.getHospitalId());
    }

    @Transactional
    public void seedDefaultDepartmentsForHospital(String hospitalId) {
        if (departmentRepository.countByHospitalId(hospitalId) == 0) {
            createDepartment(hospitalId, createDeptReq("Emergency", "24/7 Emergency Medicine, Trauma Care, and Rapid Resuscitation.", "Dr. Sarah Jenkins", "EMERGENCY", "🚨", "#f97316"), "SYSTEM", "SYSTEM", "System Seeder");
            createDepartment(hospitalId, createDeptReq("Cardiology", "Hemodynamic monitoring, coronary interventions, and inpatient cardiac care.", "Dr. Robert Chen", "ICU", "❤️", "#ef4444"), "SYSTEM", "SYSTEM", "System Seeder");
            createDepartment(hospitalId, createDeptReq("General Medicine", "Comprehensive adult health, chronic multi-morbidity, and inpatient medicine.", "Dr. Michael Chang", "GENERAL", "🩺", "#3b82f6"), "SYSTEM", "SYSTEM", "System Seeder");
            createDepartment(hospitalId, createDeptReq("General Surgery", "Pre-operative assessment, elective & emergency surgeries, and post-op surgical recovery.", "Dr. David Kumar", "SURGERY", "🔪", "#0d9488"), "SYSTEM", "SYSTEM", "System Seeder");
            createDepartment(hospitalId, createDeptReq("Orthopedics", "Bone trauma, arthroplasty, spinal surgery, joint replacements, and musculoskeletal recovery.", "Dr. Marcus Vance", "GENERAL", "🦴", "#8b5cf6"), "SYSTEM", "SYSTEM", "System Seeder");
            createDepartment(hospitalId, createDeptReq("Pediatrics", "Neonatal intensive care, childhood infections, pediatric growth, and preventative immunization.", "Dr. Anita Sharma", "PEDIATRICS", "👶", "#ec4899"), "SYSTEM", "SYSTEM", "System Seeder");
            createDepartment(hospitalId, createDeptReq("Radiology", "Computed Tomography (CT), MRI, Digital Radiography, Ultrasound, and PACS reporting.", "Dr. Elena Rostova", "GENERAL", "🩻", "#06b6d4"), "SYSTEM", "SYSTEM", "System Seeder");
            createDepartment(hospitalId, createDeptReq("Laboratory", "Hematology, Clinical Biochemistry, Histopathology, Microbiology, and Blood Banking.", "Dr. Rajesh Gupta", "GENERAL", "🔬", "#10b981"), "SYSTEM", "SYSTEM", "System Seeder");
        }
    }

    private DepartmentRequest createDeptReq(String name, String desc, String head, String wardCat, String icon, String color) {
        DepartmentRequest r = new DepartmentRequest();
        r.setName(name);
        r.setDescription(desc);
        r.setHead(head);
        r.setWardCategory(wardCat);
        r.setIcon(icon);
        r.setColor(color);
        r.setStatus("ACTIVE");
        return r;
    }
}
