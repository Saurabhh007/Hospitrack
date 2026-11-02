package com.hospitrack;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospitrack.dto.LoginRequest;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@SuppressWarnings("null")
public class ConnectedCareTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String patientToken;
    private String adminToken;

    @BeforeEach
    void authenticate() throws Exception {
        // Authenticate as Patient Rahul Sharma (PAT-300)
        LoginRequest patientLogin = new LoginRequest();
        patientLogin.setEmail("rahul.sharma@gmail.com");
        patientLogin.setPassword("Patient@123!");

        MvcResult pRes = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(patientLogin)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode pNode = objectMapper.readTree(pRes.getResponse().getContentAsString());
        patientToken = pNode.get("data").get("accessToken").asText();

        // Authenticate as Super Admin
        LoginRequest adminLogin = new LoginRequest();
        adminLogin.setEmail("admin@hospitrack.com");
        adminLogin.setPassword("Admin@Hospitrack2026!");

        MvcResult aRes = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(adminLogin)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode aNode = objectMapper.readTree(aRes.getResponse().getContentAsString());
        adminToken = aNode.get("data").get("accessToken").asText();
    }

    @Test
    @DisplayName("Patient can retrieve their Connected Care summary")
    void testGetCareSummary() throws Exception {
        mockMvc.perform(get("/api/patient/care-summary")
                .header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.patientId").value("PAT-300"))
                .andExpect(jsonPath("$.data.patientName").value("Rahul Sharma"))
                .andExpect(jsonPath("$.data.currentHospital.hospitalId").value("HOSP-101"))
                .andExpect(jsonPath("$.data.currentHospital.hospitalName").value("City General Hospital"))
                .andExpect(jsonPath("$.data.previousHospitals").isArray())
                .andExpect(jsonPath("$.data.activePrescriptionsCount").isNumber());
    }

    @Test
    @DisplayName("Patient can retrieve chronological Care Journey timeline")
    void testGetCareJourney() throws Exception {
        mockMvc.perform(get("/api/patient/care-journey")
                .header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].eventType").exists())
                .andExpect(jsonPath("$.data[0].sourceAttribution").exists());
    }

    @Test
    @DisplayName("Patient can retrieve dedicated Current Hospital details")
    void testGetCurrentHospital() throws Exception {
        mockMvc.perform(get("/api/patient/current-hospital")
                .header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.hospitalId").value("HOSP-101"))
                .andExpect(jsonPath("$.data.hospitalName").value("City General Hospital"))
                .andExpect(jsonPath("$.data.primaryDoctorName").value("Dr. Sarah Sharma"))
                .andExpect(jsonPath("$.data.consultationsCount").isNumber());
    }

    @Test
    @DisplayName("Patient can retrieve connected and previous hospitals")
    void testGetConnectedHospitals() throws Exception {
        mockMvc.perform(get("/api/patient/hospitals")
                .header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].careReceivedChecklist").isArray());
    }

    @Test
    @DisplayName("Patient can retrieve referral connections")
    void testGetReferrals() throws Exception {
        mockMvc.perform(get("/api/patient/referrals")
                .header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @DisplayName("Patient can retrieve connected records grouped by source hospital")
    void testGetConnectedRecords() throws Exception {
        mockMvc.perform(get("/api/patient/connected-records")
                .header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].hospitalName").exists());
    }

    @Test
    @DisplayName("Patient can retrieve enriched prescriptions with doctor and hospital source")
    void testGetPrescriptions() throws Exception {
        mockMvc.perform(get("/api/patient/prescriptions")
                .header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].hospitalName").exists())
                .andExpect(jsonPath("$.data[0].sourceAttribution").exists());
    }

    @Test
    @DisplayName("Patient can retrieve enriched diagnostic laboratory reports")
    void testGetLabReports() throws Exception {
        mockMvc.perform(get("/api/patient/lab-reports")
                .header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].testName").exists());
    }

    @Test
    @DisplayName("Patient can retrieve inpatient discharge summary and pathway")
    void testGetDischarges() throws Exception {
        mockMvc.perform(get("/api/patient/discharges")
                .header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @DisplayName("Connected Care 2.0: Single consolidated authorized endpoint returns complete journey in one call")
    void testGetUnifiedConnectedCare() throws Exception {
        mockMvc.perform(get("/api/patient/connected-care")
                .header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.patient.id").value("PAT-300"))
                .andExpect(jsonPath("$.data.patient.name").value("Rahul Sharma"))
                .andExpect(jsonPath("$.data.currentHospital.hospitalId").value("HOSP-101"))
                .andExpect(jsonPath("$.data.currentHospital.hospitalName").value("City General Hospital"))
                .andExpect(jsonPath("$.data.previousHospitals").isArray())
                .andExpect(jsonPath("$.data.prescriptions").isArray())
                .andExpect(jsonPath("$.data.labReports").isArray())
                .andExpect(jsonPath("$.data.referrals").isArray())
                .andExpect(jsonPath("$.data.journeyEvents").isArray())
                .andExpect(jsonPath("$.data.lastUpdated").exists());
    }

    @Test
    @DisplayName("Connected Care 2.0: John Doe (PAT-301) can load unified connected care journey without errors")
    void testGetUnifiedConnectedCareForJohnDoe() throws Exception {
        LoginRequest johnLogin = new LoginRequest();
        johnLogin.setEmail("john.doe@email.com");
        johnLogin.setPassword("Patient@123!");

        MvcResult jRes = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(johnLogin)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode jNode = objectMapper.readTree(jRes.getResponse().getContentAsString());
        String johnToken = jNode.get("data").get("accessToken").asText();

        mockMvc.perform(get("/api/patient/connected-care")
                .header("Authorization", "Bearer " + johnToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.patient.id").value("PAT-301"))
                .andExpect(jsonPath("$.data.patient.name").value("John Doe"))
                .andExpect(jsonPath("$.data.currentHospital.hospitalId").isNotEmpty())
                .andExpect(jsonPath("$.data.currentHospital.hospitalName").isNotEmpty())
                .andExpect(jsonPath("$.data.journeyEvents").isArray());
    }

    @Test
    @DisplayName("Data Access Security: Patient identity derived from JWT context prevents parameter tampering")
    void testPatientIdentityDerivation() throws Exception {
        // Even if patient passes someone else's patientId parameter (PAT-301), backend strictly returns PAT-300
        mockMvc.perform(get("/api/patient/care-summary?patientId=PAT-301")
                .header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.patientId").value("PAT-300"))
                .andExpect(jsonPath("$.data.patientName").value("Rahul Sharma"));
    }
}
