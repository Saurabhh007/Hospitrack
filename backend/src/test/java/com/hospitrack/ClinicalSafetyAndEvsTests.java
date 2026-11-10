package com.hospitrack;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospitrack.dto.EvsDispatchRequest;
import com.hospitrack.dto.LoginRequest;
import com.hospitrack.dto.PrescriptionRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@SuppressWarnings("null")
public class ClinicalSafetyAndEvsTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String docToken;
    private String hospToken;

    @BeforeEach
    void setupTokens() throws Exception {
        LoginRequest docLogin = new LoginRequest();
        docLogin.setEmail("s.sharma@citygeneral.in");
        docLogin.setPassword("Doctor@123!");
        MvcResult docRes = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(docLogin)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode docNode = objectMapper.readTree(docRes.getResponse().getContentAsString());
        docToken = docNode.get("data").get("accessToken").asText();

        LoginRequest hospLogin = new LoginRequest();
        hospLogin.setEmail("admin@citygeneral.in");
        hospLogin.setPassword("Hospital@123!");
        MvcResult hospRes = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(hospLogin)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode hospNode = objectMapper.readTree(hospRes.getResponse().getContentAsString());
        hospToken = hospNode.get("data").get("accessToken").asText();
    }

    @Test
    @DisplayName("[CDS-1] Safety Check Endpoint identifies safe regimens correctly")
    void testSafetyCheckSafeOrder() throws Exception {
        PrescriptionRequest req = new PrescriptionRequest();
        req.setPatientId("PAT-300");
        req.setDoctorId("DOC-201");
        req.setHospitalId("HOSP-101");

        List<PrescriptionRequest.MedicineItemDto> items = new ArrayList<>();
        PrescriptionRequest.MedicineItemDto m1 = new PrescriptionRequest.MedicineItemDto();
        m1.setName("Paracetamol");
        m1.setDosage("500mg");
        m1.setFrequency("Every 8 hours");
        items.add(m1);
        req.setMedicines(items);

        mockMvc.perform(post("/api/prescriptions/safety-check")
                .header("Authorization", "Bearer " + docToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.safe").value(true))
                .andExpect(jsonPath("$.data.hasContraindication").value(false));
    }

    @Test
    @DisplayName("[CDS-2] Contraindicated Sildenafil + Nitroglycerin is blocked with 422")
    void testContraindicatedDrugBlock() throws Exception {
        PrescriptionRequest req = new PrescriptionRequest();
        req.setPatientId("PAT-300");
        req.setDoctorId("DOC-201");
        req.setHospitalId("HOSP-101");

        List<PrescriptionRequest.MedicineItemDto> items = new ArrayList<>();
        PrescriptionRequest.MedicineItemDto m1 = new PrescriptionRequest.MedicineItemDto();
        m1.setName("Sildenafil");
        m1.setDosage("50mg");
        m1.setFrequency("As needed");
        items.add(m1);

        PrescriptionRequest.MedicineItemDto m2 = new PrescriptionRequest.MedicineItemDto();
        m2.setName("Nitroglycerin");
        m2.setDosage("0.4mg sublingual");
        m2.setFrequency("PRN chest pain");
        items.add(m2);

        req.setMedicines(items);

        // Safety check returns contraindication
        mockMvc.perform(post("/api/prescriptions/safety-check")
                .header("Authorization", "Bearer " + docToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.hasContraindication").value(true));

        // Submit order is blocked with 422
        mockMvc.perform(post("/api/prescriptions")
                .header("Authorization", "Bearer " + docToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("CRITICAL SAFETY BLOCK")));
    }

    @Test
    @DisplayName("[CDS-3] High-Risk DDI (Warfarin + Aspirin) requires physician clinical override")
    void testMajorDdiRequiresOverride() throws Exception {
        PrescriptionRequest req = new PrescriptionRequest();
        req.setPatientId("PAT-300");
        req.setDoctorId("DOC-201");
        req.setHospitalId("HOSP-101");

        List<PrescriptionRequest.MedicineItemDto> items = new ArrayList<>();
        PrescriptionRequest.MedicineItemDto m1 = new PrescriptionRequest.MedicineItemDto();
        m1.setName("Warfarin Sodium");
        m1.setDosage("5mg");
        m1.setFrequency("Once daily");
        items.add(m1);

        PrescriptionRequest.MedicineItemDto m2 = new PrescriptionRequest.MedicineItemDto();
        m2.setName("Aspirin");
        m2.setDosage("75mg");
        m2.setFrequency("Once daily");
        items.add(m2);

        req.setMedicines(items);

        // Without override -> blocked with 422
        mockMvc.perform(post("/api/prescriptions")
                .header("Authorization", "Bearer " + docToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("HIGH-RISK DRUG INTERACTION")));

        // With override confirmed and clinical rationale -> permitted with 200
        req.setOverrideConfirmed(true);
        req.setClinicalOverrideReason("Mechanical aortic valve with recent coronary drug-eluting stent. Gastroprotection with pantoprazole prescribed.");

        mockMvc.perform(post("/api/prescriptions")
                .header("Authorization", "Bearer " + docToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("[EVS-1] Environmental Services Bed Turnover Pipeline: Dispatch -> Complete -> Inspect")
    void testEvsBedTurnoverPipeline() throws Exception {
        // Trigger lazy bed inventory initialization and select an available bed
        MvcResult bedsRes = mockMvc.perform(get("/api/hospitals/HOSP-101/beds")
                .header("Authorization", "Bearer " + hospToken))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode bedsData = objectMapper.readTree(bedsRes.getResponse().getContentAsString()).path("data");
        assertTrue(bedsData.isArray() && !bedsData.isEmpty(), "Hospital HOSP-101 bed inventory should be initialized");

        String bedId = null;
        for (JsonNode b : bedsData) {
            if ("BED-HOSP-101-GEN-02".equals(b.path("id").asText())
                    && "AVAILABLE".equalsIgnoreCase(b.path("status").asText())) {
                bedId = b.path("id").asText();
                break;
            }
        }
        if (bedId == null) {
            for (JsonNode b : bedsData) {
                if ("AVAILABLE".equalsIgnoreCase(b.path("status").asText())) {
                    bedId = b.path("id").asText();
                    break;
                }
            }
        }
        assertNotNull(bedId, "Expected an AVAILABLE bed in HOSP-101 for EVS turnover pipeline");

        // 1. Dispatch Housekeeper
        EvsDispatchRequest dispatch = new EvsDispatchRequest("Ramesh Kumar (EVS)", "Terminal Disinfection", "Routine post-discharge cleaning");
        mockMvc.perform(post("/api/hospitals/HOSP-101/beds/" + bedId + "/evs-dispatch")
                .header("Authorization", "Bearer " + hospToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dispatch)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CLEANING_IN_PROGRESS"))
                .andExpect(jsonPath("$.data.evsStaffName").value("Ramesh Kumar (EVS)"));

        // 2. Complete Cleaning
        mockMvc.perform(post("/api/hospitals/HOSP-101/beds/" + bedId + "/evs-complete")
                .header("Authorization", "Bearer " + hospToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("staffName", "Ramesh Kumar (EVS)"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("READY_FOR_INSPECTION"));

        // 3. Inspect and Release to Admissions
        mockMvc.perform(post("/api/hospitals/HOSP-101/beds/" + bedId + "/evs-inspect")
                .header("Authorization", "Bearer " + hospToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("inspectorName", "Charge Nurse Priya"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("AVAILABLE"));

        // 4. Check EVS Turnover Summary Metrics
        mockMvc.perform(get("/api/hospitals/HOSP-101/evs-summary")
                .header("Authorization", "Bearer " + hospToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalBeds").isNumber())
                .andExpect(jsonPath("$.data.availableBeds").isNumber());
    }
}
