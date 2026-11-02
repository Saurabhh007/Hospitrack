package com.hospitrack.service;

import com.hospitrack.dto.ClinicalSafetyAlertDto;
import com.hospitrack.dto.ClinicalSafetyReportDto;
import com.hospitrack.dto.PrescriptionRequest;
import com.hospitrack.entity.Patient;
import com.hospitrack.entity.PatientIntake;
import com.hospitrack.entity.Prescription;
import com.hospitrack.entity.PrescriptionItem;
import com.hospitrack.repository.PatientIntakeRepository;
import com.hospitrack.repository.PatientRepository;
import com.hospitrack.repository.PrescriptionRepository;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;

@Component
public class ClinicalSafetyEngine {

    private final PrescriptionRepository prescriptionRepository;
    private final PatientRepository patientRepository;
    private final PatientIntakeRepository intakeRepository;

    public ClinicalSafetyEngine(
            PrescriptionRepository prescriptionRepository,
            PatientRepository patientRepository,
            PatientIntakeRepository intakeRepository
    ) {
        this.prescriptionRepository = prescriptionRepository;
        this.patientRepository = patientRepository;
        this.intakeRepository = intakeRepository;
    }

    // Normalized drug interaction definition
    private record DrugInteraction(String drug1, String drug2, String severity, String title, String description, String clinicalAction) {}

    // Master Clinical Drug-Drug Interaction Database (Standardized)
    private static final List<DrugInteraction> DDI_DATABASE = List.of(
            // CONTRAINDICATED (Hard Stop / Severe)
            new DrugInteraction("sildenafil", "nitroglycerin", "CONTRAINDICATED",
                    "Fatal Hypotension Contraindication: PDE-5 Inhibitor + Nitrate",
                    "Co-administration causes profound, refractory systemic vasodilation, precipitous blood pressure drop, and fatal cardiovascular collapse.",
                    "Discontinue Nitrate or PDE-5 inhibitor immediately. Concurrent use is strictly contraindicated."),
            new DrugInteraction("tadalafil", "nitroglycerin", "CONTRAINDICATED",
                    "Fatal Hypotension Contraindication: PDE-5 Inhibitor + Nitrate",
                    "Concurrent use with nitrates can precipitate life-threatening hemodynamic instability.",
                    "Do not co-prescribe. Maintain at least 48-hour washout."),
            new DrugInteraction("sildenafil", "isosorbide", "CONTRAINDICATED",
                    "Fatal Hypotension Contraindication: PDE-5 Inhibitor + Long-acting Nitrate",
                    "Profound synergistic cGMP elevation causes critical refractory hypotension.",
                    "Strictly contraindicated. Select alternative antianginal therapy."),
            new DrugInteraction("potassium", "spironolactone", "CONTRAINDICATED",
                    "Severe Hyperkalemia Risk: Potassium Supplement + Aldosterone Antagonist",
                    "Combined potassium retention can precipitate acute, life-threatening hyperkalemia and fatal cardiac conduction arrest.",
                    "Contraindicated in outpatient care. Do not supplement potassium with aldosterone antagonists unless under continuous inpatient serum telemetry."),
            new DrugInteraction("lisinopril", "losartan", "CONTRAINDICATED",
                    "Dual Renin-Angiotensin System (RAS) Blockade: ACEi + ARB",
                    "Dual blockade of the renin-angiotensin-aldosterone axis produces no additive cardiovascular benefit while drastically increasing risks of acute renal failure, severe hypotension, and hyperkalemia.",
                    "Monotherapy with either ACE inhibitor or ARB is standard of care. Discontinue dual regimen."),
            new DrugInteraction("ramipril", "valsartan", "CONTRAINDICATED",
                    "Dual RAS Blockade: ACEi + ARB",
                    "Concomitant therapy causes significant nephrotoxicity and refractory hypotension without therapeutic synergy.",
                    "Select a single agent targeting the renin-angiotensin axis."),

            // MAJOR (High Clinical Hazard - Requires Documented Clinical Override)
            new DrugInteraction("warfarin", "aspirin", "MAJOR",
                    "Major Hemorrhage Risk: Vitamin K Antagonist + Antiplatelet Agent",
                    "Synergistic anticoagulant and antiplatelet inhibition substantially elevates the risk of severe gastrointestinal, intracranial, and surgical hemorrhage.",
                    "Requires strict clinical justification (e.g., recent coronary stent with mechanical valve), gastroprotection (PPI), and frequent INR monitoring."),
            new DrugInteraction("warfarin", "ibuprofen", "MAJOR",
                    "Gastrointestinal Hemorrhage Hazard: Warfarin + NSAID",
                    "NSAIDs induce gastric mucosal injury and inhibit platelet aggregation while displacing warfarin from albumin binding sites, increasing bleeding risk fourfold.",
                    "Avoid NSAID co-prescription. Use paracetamol/acetaminophen for analgesia when possible."),
            new DrugInteraction("warfarin", "naproxen", "MAJOR",
                    "Major Bleeding Risk: Warfarin + NSAID",
                    "Marked increase in gastrointestinal ulceration and systemic bleeding.",
                    "Avoid combination. Consider alternative pain management."),
            new DrugInteraction("methotrexate", "ibuprofen", "MAJOR",
                    "Methotrexate Toxicity: Methotrexate + NSAID",
                    "NSAIDs decrease renal prostaglandin synthesis and tubular clearance, causing toxic serum methotrexate accumulation, bone marrow suppression, and nephrotoxicity.",
                    "Avoid NSAID administration during high-dose methotrexate therapy. Monitor hematologic counts closely."),
            new DrugInteraction("methotrexate", "aspirin", "MAJOR",
                    "Methotrexate Toxicity: Methotrexate + Salicylate",
                    "Salicylates displace methotrexate from plasma proteins and diminish renal excretion.",
                    "Avoid concurrent therapy or perform rigorous weekly hematologic and renal monitoring."),
            new DrugInteraction("ciprofloxacin", "amiodarone", "MAJOR",
                    "Critical QTc Prolongation: Fluoroquinolone + Class III Antiarrhythmic",
                    "Additive cardiac electrophysiological prolongation of the QT interval, predisposing to Torsades de Pointes and fatal ventricular tachycardia.",
                    "Perform baseline 12-lead ECG. Monitor serum electrolytes (potassium, magnesium) or switch to non-QTc prolonging antimicrobial."),
            new DrugInteraction("levofloxacin", "amiodarone", "MAJOR",
                    "Severe Arrhythmia Hazard: Fluoroquinolone + Amiodarone",
                    "High risk of malignant ventricular dysrhythmia due to additive QT prolongation.",
                    "Avoid concurrent use or perform continuous telemetry."),
            new DrugInteraction("atorvastatin", "clarithromycin", "MAJOR",
                    "Rhabdomyolysis Risk: Statin + Strong CYP3A4 Inhibitor",
                    "Clarithromycin potent CYP3A4 inhibition increases systemic atorvastatin exposure up to 400%, precipitating acute rhabdomyolysis and myoglobinuric renal failure.",
                    "Temporarily withhold statin therapy during clarithromycin course, or switch to azithromycin."),
            new DrugInteraction("simvastatin", "clarithromycin", "MAJOR",
                    "Critical Rhabdomyolysis Risk: Simvastatin + CYP3A4 Inhibitor",
                    "Massive increase in simvastatin active metabolite concentrations triggering muscle necrosis.",
                    "Contraindicated in FDA labeling. Suspend simvastatin during macrolide therapy."),
            new DrugInteraction("metoprolol", "verapamil", "MAJOR",
                    "Severe Bradycardia & Heart Block: Beta-Blocker + Non-Dihydropyridine CCB",
                    "Additive depression of sinoatrial and atrioventricular nodal conduction, potentially precipitating severe bradycardia, sinus arrest, or complete heart block.",
                    "Avoid combination. If medically required, perform continuous inpatient ECG and blood pressure monitoring."),
            new DrugInteraction("atenolol", "diltiazem", "MAJOR",
                    "Profound AV Block Risk: Beta-Blocker + Diltiazem",
                    "Synergistic negative inotropic and dromotropic cardiac depression.",
                    "Monitor heart rate and PR interval closely. Adjust dosages cautiously."),
            new DrugInteraction("fluoxetine", "tramadol", "MAJOR",
                    "Serotonin Syndrome Hazard: SSRI + Serotonergic Opioid",
                    "Inhibition of CYP2D6 combined with additive serotonin reuptake inhibition can trigger acute Serotonin Syndrome (hyperthermia, autonomic instability, clonus).",
                    "Advise patient on early symptoms of serotonin toxicity. Consider alternative non-serotonergic analgesic."),
            new DrugInteraction("sertraline", "tramadol", "MAJOR",
                    "Serotonin Syndrome Warning: SSRI + Tramadol",
                    "Increased risk of central nervous system serotonin toxicity and lowered seizure threshold.",
                    "Monitor for neuromuscular hyperactivity and delirium."),

            // MODERATE (Clinical Precautions & Monitoring)
            new DrugInteraction("clopidogrel", "omeprazole", "MODERATE",
                    "Reduced Antiplatelet Efficacy: Clopidogrel + CYP2C19 Inhibitor",
                    "Omeprazole inhibits CYP2C19 bioactivation of clopidogrel to its active thiol metabolite, reducing anti-ischemic platelet protection.",
                    "Consider pantoprazole or famotidine as gastroprotective alternatives with lower CYP2C19 inhibition."),
            new DrugInteraction("lisinopril", "ibuprofen", "MODERATE",
                    "Renal Impairment & Antihypertensive Blunting: ACEi + NSAID",
                    "NSAIDs inhibit renal vasodilatory prostaglandins, decreasing GFR and blunting the blood pressure-lowering effect of ACE inhibitors.",
                    "Monitor renal function (creatinine, eGFR) and blood pressure regularly during concurrent therapy."),
            new DrugInteraction("metformin", "furosemide", "MODERATE",
                    "Lactic Acidosis Caution: Metformin + Loop Diuretic",
                    "Loop diuretics can cause hypovolemia and transient renal impairment, increasing metformin accumulation risk.",
                    "Ensure adequate hydration and monitor serum creatinine periodically.")
    );

    // Common Drug Class Ontologies
    private static final Map<String, String> DRUG_CLASSES = Map.ofEntries(
            Map.entry("ibuprofen", "NSAID"),
            Map.entry("naproxen", "NSAID"),
            Map.entry("aspirin", "NSAID / Antiplatelet"),
            Map.entry("diclofenac", "NSAID"),
            Map.entry("ketorolac", "NSAID"),
            Map.entry("celecoxib", "NSAID (COX-2)"),
            Map.entry("atorvastatin", "Statin (HMG-CoA Reductase Inhibitor)"),
            Map.entry("simvastatin", "Statin (HMG-CoA Reductase Inhibitor)"),
            Map.entry("rosuvastatin", "Statin (HMG-CoA Reductase Inhibitor)"),
            Map.entry("metoprolol", "Beta-Blocker"),
            Map.entry("atenolol", "Beta-Blocker"),
            Map.entry("carvedilol", "Beta-Blocker"),
            Map.entry("bisoprolol", "Beta-Blocker"),
            Map.entry("lisinopril", "ACE Inhibitor"),
            Map.entry("enalapril", "ACE Inhibitor"),
            Map.entry("ramipril", "ACE Inhibitor"),
            Map.entry("losartan", "Angiotensin Receptor Blocker (ARB)"),
            Map.entry("valsartan", "Angiotensin Receptor Blocker (ARB)"),
            Map.entry("omeprazole", "Proton Pump Inhibitor (PPI)"),
            Map.entry("pantoprazole", "Proton Pump Inhibitor (PPI)"),
            Map.entry("esomeprazole", "Proton Pump Inhibitor (PPI)"),
            Map.entry("amoxicillin", "Penicillin / Beta-lactam"),
            Map.entry("ampicillin", "Penicillin / Beta-lactam"),
            Map.entry("penicillin", "Penicillin / Beta-lactam"),
            Map.entry("piperacillin", "Penicillin / Beta-lactam"),
            Map.entry("ciprofloxacin", "Fluoroquinolone"),
            Map.entry("levofloxacin", "Fluoroquinolone")
    );

    public ClinicalSafetyReportDto evaluatePrescriptionSafety(PrescriptionRequest request) {
        ClinicalSafetyReportDto report = new ClinicalSafetyReportDto();
        report.setPatientId(request.getPatientId());

        if (request.getMedicines() == null || request.getMedicines().isEmpty()) {
            report.setSafe(true);
            return report;
        }

        report.setEvaluatedMedicinesCount(request.getMedicines().size());

        // 1. Resolve Patient and Allergies
        Patient patient = patientRepository.findById(request.getPatientId()).orElse(null);
        if (patient != null) {
            report.setPatientName(patient.getName());
        }

        String documentedAllergies = "";
        if (patient != null && patient.getAddress() != null) {
            // Check patient intake records
            List<PatientIntake> intakes = intakeRepository.findByPatientIdOrderByCreatedAtDesc(request.getPatientId());
            if (!intakes.isEmpty() && intakes.get(0).getAllergies() != null && !intakes.get(0).getAllergies().isBlank()) {
                documentedAllergies = intakes.get(0).getAllergies();
            }
        }
        report.setDocumentedAllergies(documentedAllergies);

        // Extract normalized current medicines
        List<String> currentMedNames = new ArrayList<>();
        Map<String, String> rawToNorm = new LinkedHashMap<>();
        for (PrescriptionRequest.MedicineItemDto item : request.getMedicines()) {
            String norm = normalizeMedicineName(item.getName());
            currentMedNames.add(norm);
            rawToNorm.put(norm, item.getName());
        }

        // 2. Intra-prescription Duplicate Checking
        Set<String> seenNames = new HashSet<>();
        for (String norm : currentMedNames) {
            if (seenNames.contains(norm)) {
                String rawName = rawToNorm.getOrDefault(norm, norm);
                report.addAlert(new ClinicalSafetyAlertDto(
                        "DUP-INTRA-" + System.currentTimeMillis() + "-" + Math.abs(norm.hashCode() % 1000),
                        "DUPLICATE",
                        "DUPLICATE_ORDER_ITEM",
                        "Duplicate Medication in Current Order: " + rawName,
                        "The medication '" + rawName + "' appears multiple times in the same prescription draft. Co-prescribing identical drugs creates severe risk of accidental dosage doubling.",
                        "Consolidate dosages into a single order line or remove duplicate entries.",
                        List.of(rawName),
                        false
                ));
            }
            seenNames.add(norm);
        }

        // 3. Cross-Prescription Checking against Active Past Orders (Past 30 Days)
        List<Prescription> pastPrescriptions = prescriptionRepository.findByPatientIdOrderByPrescribedAtDesc(request.getPatientId());
        LocalDateTime cutoff = LocalDateTime.now().minusDays(30);

        Set<String> activePastMedNorms = new HashSet<>();
        Map<String, String> activePastMedRaw = new HashMap<>();

        for (Prescription pastRx : pastPrescriptions) {
            if (pastRx.getPrescribedAt() != null && pastRx.getPrescribedAt().isAfter(cutoff)) {
                if (pastRx.getItems() != null) {
                    for (PrescriptionItem pi : pastRx.getItems()) {
                        String norm = normalizeMedicineName(pi.getName());
                        activePastMedNorms.add(norm);
                        activePastMedRaw.put(norm, pi.getName());
                    }
                }
            }
        }

        for (String newNorm : currentMedNames) {
            if (activePastMedNorms.contains(newNorm)) {
                String rawNew = rawToNorm.getOrDefault(newNorm, newNorm);
                String rawPast = activePastMedRaw.getOrDefault(newNorm, newNorm);
                report.addAlert(new ClinicalSafetyAlertDto(
                        "DUP-CROSS-" + System.currentTimeMillis() + "-" + Math.abs(newNorm.hashCode() % 1000),
                        "MODERATE",
                        "ACTIVE_ORDER_DUPLICATION",
                        "Active Medication Cross-Order Renewal / Continuation: " + rawNew,
                        "The patient has an active prescription for '" + rawPast + "' signed within the last 30 days. Verify whether this order is a dosage renewal, regimen refill, or duplicate therapy.",
                        "Confirm if this order replaces prior therapy or adjust dosage regimen with clinical rationale.",
                        List.of(rawNew, rawPast),
                        false
                ));
            }
        }

        // 4. Drug-Allergy Safety Check
        if (documentedAllergies != null && !documentedAllergies.isBlank() && !"nkda".equalsIgnoreCase(documentedAllergies.trim())) {
            String normAllergies = documentedAllergies.toLowerCase();
            for (String newNorm : currentMedNames) {
                String rawNew = rawToNorm.getOrDefault(newNorm, newNorm);
                if (isAllergicTo(newNorm, normAllergies)) {
                    report.addAlert(new ClinicalSafetyAlertDto(
                            "ALLERGY-" + System.currentTimeMillis() + "-" + Math.abs(newNorm.hashCode() % 1000),
                            "ALLERGY_CONTRAINDICATION",
                            "DRUG_ALLERGY",
                            "Critical Drug-Allergy Warning: " + rawNew + " vs Documented Patient Allergy (" + documentedAllergies + ")",
                            "The prescribed agent '" + rawNew + "' matches or cross-reacts with the patient's documented allergy profile (" + documentedAllergies + "). Severe hypersensitivity, angioedema, or anaphylaxis may occur.",
                            "Immediate alternative non-cross-reacting pharmacotherapy required. Order cannot be signed without clinical override and emergency desensitization protocol.",
                            List.of(rawNew),
                            true
                    ));
                }
            }
        }

        // 5. Drug-Drug Interaction (DDI) Checking
        // Combine current meds + active past meds for comprehensive check
        Set<String> allActiveDrugs = new LinkedHashSet<>(currentMedNames);
        allActiveDrugs.addAll(activePastMedNorms);

        List<String> drugList = new ArrayList<>(allActiveDrugs);
        for (int i = 0; i < drugList.size(); i++) {
            for (int j = i + 1; j < drugList.size(); j++) {
                String d1 = drugList.get(i);
                String d2 = drugList.get(j);

                // Only alert if at least one drug is in the CURRENT prescription draft
                if (!currentMedNames.contains(d1) && !currentMedNames.contains(d2)) {
                    continue;
                }

                DrugInteraction interaction = findInteraction(d1, d2);
                if (interaction != null) {
                    String raw1 = rawToNorm.getOrDefault(d1, activePastMedRaw.getOrDefault(d1, d1));
                    String raw2 = rawToNorm.getOrDefault(d2, activePastMedRaw.getOrDefault(d2, d2));

                    boolean requiresOverride = "MAJOR".equalsIgnoreCase(interaction.severity()) || "CONTRAINDICATED".equalsIgnoreCase(interaction.severity());

                    report.addAlert(new ClinicalSafetyAlertDto(
                            "DDI-" + System.currentTimeMillis() + "-" + Math.abs((d1 + d2).hashCode() % 10000),
                            interaction.severity(),
                            "DRUG_DRUG_INTERACTION",
                            interaction.title() + " (" + raw1 + " + " + raw2 + ")",
                            interaction.description(),
                            interaction.clinicalAction(),
                            List.of(raw1, raw2),
                            requiresOverride
                    ));
                }
            }
        }

        // 6. Therapeutic Class Duplication Checking
        Map<String, List<String>> classMap = new HashMap<>();
        for (String norm : currentMedNames) {
            String medClass = getDrugClass(norm);
            if (medClass != null) {
                classMap.computeIfAbsent(medClass, k -> new ArrayList<>()).add(rawToNorm.getOrDefault(norm, norm));
            }
        }

        for (Map.Entry<String, List<String>> entry : classMap.entrySet()) {
            if (entry.getValue().size() > 1) {
                report.addAlert(new ClinicalSafetyAlertDto(
                        "CLASS-DUP-" + System.currentTimeMillis() + "-" + Math.abs(entry.getKey().hashCode() % 1000),
                        "MODERATE",
                        "THERAPEUTIC_DUPLICATION",
                        "Therapeutic Class Duplication: " + entry.getKey(),
                        "Multiple medications belonging to the same pharmacological class (" + String.join(", ", entry.getValue()) + ") are being concurrently prescribed without documented synergistic rationale.",
                        "Evaluate if dual therapy in this class is clinically indicated or discontinue redundant agent.",
                        entry.getValue(),
                        false
                ));
            }
        }

        return report;
    }

    private String normalizeMedicineName(String raw) {
        if (raw == null) return "";
        String s = raw.toLowerCase().trim();
        // Remove dosage strings like "50mg", "100 mg", "500mg", "tablet", "capsule", "syrup"
        s = s.replaceAll("\\b\\d+(\\.\\d+)?\\s*(mg|mcg|g|ml|iu|tablets?|caps?)\\b", "");
        s = s.replaceAll("[^a-z0-9\\s]", " ").trim();
        String[] parts = s.split("\\s+");
        return parts.length > 0 ? parts[0] : "";
    }

    private boolean isAllergicTo(String drugNorm, String allergyText) {
        if (drugNorm == null || allergyText == null) return false;

        // Check Penicillin class
        if (allergyText.contains("penicillin") || allergyText.contains("beta-lactam")) {
            if (drugNorm.contains("amoxicillin") || drugNorm.contains("ampicillin") ||
                drugNorm.contains("penicillin") || drugNorm.contains("augmentin") ||
                drugNorm.contains("piperacillin")) {
                return true;
            }
        }

        // Check Sulfa class
        if (allergyText.contains("sulfa") || allergyText.contains("sulfonamide")) {
            if (drugNorm.contains("bactrim") || drugNorm.contains("septra") ||
                drugNorm.contains("sulfamethoxazole") || drugNorm.contains("sulfasalazine")) {
                return true;
            }
        }

        // Check NSAID / Aspirin class
        if (allergyText.contains("aspirin") || allergyText.contains("nsaid")) {
            if (drugNorm.contains("aspirin") || drugNorm.contains("ibuprofen") ||
                drugNorm.contains("naproxen") || drugNorm.contains("diclofenac") ||
                drugNorm.contains("ketorolac") || drugNorm.contains("celecoxib")) {
                return true;
            }
        }

        // Check Opioid class
        if (allergyText.contains("codeine") || allergyText.contains("morphine") || allergyText.contains("opioid")) {
            if (drugNorm.contains("codeine") || drugNorm.contains("morphine") ||
                drugNorm.contains("tramadol") || drugNorm.contains("oxycodone") ||
                drugNorm.contains("fentanyl")) {
                return true;
            }
        }

        // Check direct string match
        return allergyText.contains(drugNorm);
    }

    private DrugInteraction findInteraction(String d1, String d2) {
        for (DrugInteraction ddi : DDI_DATABASE) {
            boolean matchDirect = d1.contains(ddi.drug1()) && d2.contains(ddi.drug2());
            boolean matchReverse = d2.contains(ddi.drug1()) && d1.contains(ddi.drug2());
            if (matchDirect || matchReverse) {
                return ddi;
            }
        }
        return null;
    }

    private String getDrugClass(String drugNorm) {
        for (Map.Entry<String, String> entry : DRUG_CLASSES.entrySet()) {
            if (drugNorm.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return null;
    }
}
