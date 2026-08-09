import { z } from 'zod';

export const SafetyAlertSchema = z.object({
  id: z.string(),
  severity: z.enum(['BLOCKING_ALLERGY', 'WARNING_INTERACTION', 'INFO']),
  type: z.enum(['ALLERGY_CONFLICT', 'DRUG_INTERACTION', 'DOSE_CHECK']),
  message: z.string(),
  recommendation: z.string(),
});

export const OrderItemSchema = z.object({
  id: z.string(),
  category: z.enum(['LAB', 'MEDICATION', 'IMAGING', 'NURSING', 'TRANSFER']),
  name: z.string(),
  details: z.string(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  isUrgent: z.boolean().default(false),
});

export const OrderBundleSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  category: z.string(),
  icon: z.string(),
  items: z.array(OrderItemSchema),
});

export type SafetyAlert = z.infer<typeof SafetyAlertSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type OrderBundle = z.infer<typeof OrderBundleSchema>;

// Real-time Drug Allergy & Interaction Safety Checking Engine
export function checkDrugSafety(
  proposedDrugName: string,
  patientAllergies?: string,
  activeMedications: string[] = []
): SafetyAlert[] {
  const alerts: SafetyAlert[] = [];
  const drugLower = proposedDrugName.toLowerCase().trim();
  const allergiesLower = (patientAllergies || '').toLowerCase();

  // 1. ALLERGY CONFLICT CHECKING
  if (allergiesLower.includes('penicillin') || allergiesLower.includes('amoxicillin') || allergiesLower.includes('ampicillin')) {
    if (drugLower.includes('penicillin') || drugLower.includes('amoxicillin') || drugLower.includes('ampicillin') || drugLower.includes('augmentin') || drugLower.includes('piperacillin')) {
      alerts.push({
        id: `ALERT-${Date.now()}-1`,
        severity: 'BLOCKING_ALLERGY',
        type: 'ALLERGY_CONFLICT',
        message: `🚨 ALLERGY CONFLICT: Patient has documented Penicillin allergy! Proposed medication "${proposedDrugName}" is a Penicillin-class beta-lactam.`,
        recommendation: 'BLOCK ORDER: Switch to Macrolide (Erythromycin/Azithromycin) or Fluoroquinolone.'
      });
    }
  }

  if (allergiesLower.includes('sulfa') || allergiesLower.includes('sulfonamides') || allergiesLower.includes('bactrim')) {
    if (drugLower.includes('sulfa') || drugLower.includes('cotrimoxazole') || drugLower.includes('bactrim') || drugLower.includes('sulfamethoxazole')) {
      alerts.push({
        id: `ALERT-${Date.now()}-2`,
        severity: 'BLOCKING_ALLERGY',
        type: 'ALLERGY_CONFLICT',
        message: `🚨 ALLERGY CONFLICT: Patient has documented Sulfa allergy! Proposed medication "${proposedDrugName}" contains Sulfonamides.`,
        recommendation: 'BLOCK ORDER: Substitute with Ciprofloxacin or Doxycycline.'
      });
    }
  }

  if (allergiesLower.includes('nsaid') || allergiesLower.includes('aspirin') || allergiesLower.includes('ibuprofen')) {
    if (drugLower.includes('aspirin') || drugLower.includes('ibuprofen') || drugLower.includes('diclofenac') || drugLower.includes('naproxen')) {
      alerts.push({
        id: `ALERT-${Date.now()}-3`,
        severity: 'BLOCKING_ALLERGY',
        type: 'ALLERGY_CONFLICT',
        message: `🚨 ALLERGY CONFLICT: Patient has documented NSAID/Aspirin hypersensitivity!`,
        recommendation: 'BLOCK ORDER: Use Paracetamol or Acetaminophen for analgesia.'
      });
    }
  }

  // 2. DRUG-DRUG INTERACTION CHECKING
  const activeMedsLower = activeMedications.map(m => m.toLowerCase());
  
  if (drugLower.includes('warfarin') || drugLower.includes('coumadin')) {
    if (activeMedsLower.some(m => m.includes('aspirin') || m.includes('ibuprofen') || m.includes('diclofenac'))) {
      alerts.push({
        id: `ALERT-${Date.now()}-4`,
        severity: 'WARNING_INTERACTION',
        type: 'DRUG_INTERACTION',
        message: `⚠️ DRUG INTERACTION: Warfarin combined with NSAIDs/Aspirin severely increases major bleeding risk.`,
        recommendation: 'Monitor INR closely or prescribe alternative analgesia.'
      });
    }
  }

  if (drugLower.includes('magnesium') || drugLower.includes('mgso4')) {
    if (activeMedsLower.some(m => m.includes('nifedipine') || m.includes('amlodipine'))) {
      alerts.push({
        id: `ALERT-${Date.now()}-5`,
        severity: 'WARNING_INTERACTION',
        type: 'DRUG_INTERACTION',
        message: `⚠️ DRUG INTERACTION: IV Magnesium Sulfate combined with Nifedipine can cause severe neuromuscular blockade & hypotension.`,
        recommendation: 'Monitor blood pressure and continuous ECG during infusion.'
      });
    }
  }

  return alerts;
}

// 1-Click Condition Order Sets
export function getConditionOrderBundles(): OrderBundle[] {
  return [
    {
      id: 'BUNDLE-ANC-FIRST',
      title: 'First ANC Visit Bundle',
      subtitle: 'Antenatal Booking Panel & Protocol',
      category: 'OBSTETRICS',
      icon: 'Baby',
      items: [
        { id: 'ANC-1', category: 'LAB', name: 'Full Blood Count (FBC/CBC)', details: 'Hemoglobin, Hematocrit, Platelets', isUrgent: false },
        { id: 'ANC-2', category: 'LAB', name: 'Urinalysis & Urine Culture', details: 'Proteinuria, Glucosuria, Bacteriuria screening', isUrgent: false },
        { id: 'ANC-3', category: 'LAB', name: 'Hepatitis B & C Screening (HBsAg / Anti-HCV)', details: 'Viral hepatitis screening panel', isUrgent: false },
        { id: 'ANC-4', category: 'LAB', name: 'VDRL / Syphilis Rapid Test', details: 'Serological syphilis screening', isUrgent: false },
        { id: 'ANC-5', category: 'IMAGING', name: 'Obstetric Ultrasound Scan', details: 'Gestational age confirmation & viability', isUrgent: false },
        { id: 'ANC-6', category: 'MEDICATION', name: 'Prenatal Vitamins & Iron/Folic Acid', details: 'Folic Acid 5mg PO Daily + Ferrous Sulfate 200mg PO Daily', dosage: '1 Tab Daily', frequency: 'Daily', duration: '30 Days', isUrgent: false }
      ]
    },
    {
      id: 'BUNDLE-PREECLAMPSIA',
      title: 'Severe Preeclampsia Protocol',
      subtitle: 'Emergency Obstetric Resuscitation Bundle',
      category: 'EMERGENCY_OB',
      icon: 'ShieldAlert',
      items: [
        { id: 'PE-1', category: 'MEDICATION', name: 'IV Labetalol Bolus', details: 'Antihypertensive protocol for severe systolic BP > 160mmHg', dosage: '20mg IV Bolus over 2 mins', frequency: 'STAT', duration: '1 Dose', isUrgent: true },
        { id: 'PE-2', category: 'MEDICATION', name: 'Magnesium Sulfate Infusion (Zuspan Protocol)', details: 'Eclampsia seizure prophylaxis', dosage: '4g IV Loading Dose over 15 mins + 1g/hr continuous IV drip', frequency: 'Continuous', duration: '24 Hours', isUrgent: true },
        { id: 'PE-3', category: 'LAB', name: 'Urinalysis for Dipstick Proteinuria', details: 'Assess 3+ or 4+ proteinuria', isUrgent: true },
        { id: 'PE-4', category: 'LAB', name: 'Preeclampsia Lab Panel (LFTs, Renal Function, Uric Acid)', details: 'ALT, AST, Creatinine, Platelets for HELLP Syndrome', isUrgent: true },
        { id: 'PE-5', category: 'TRANSFER', name: 'HDU / ICU Bed Transfer Request', details: 'Transfer patient to Maternal High Dependency Unit for continuous BP monitoring', isUrgent: true }
      ]
    },
    {
      id: 'BUNDLE-SEPSIS',
      title: 'Sepsis Resuscitation Bundle',
      subtitle: 'Sepsis-3 Emergency Resuscitation Panel',
      category: 'CRITICAL_CARE',
      icon: 'Zap',
      items: [
        { id: 'SEP-1', category: 'LAB', name: 'Blood Cultures x 2 Sets', details: 'Draw before antibiotic administration', isUrgent: true },
        { id: 'SEP-2', category: 'LAB', name: 'Serum Lactate Level', details: 'Assess tissue hypoperfusion', isUrgent: true },
        { id: 'SEP-3', category: 'MEDICATION', name: 'IV Broad-Spectrum Antibiotic (Ceftriaxone 2g)', details: 'Empiric coverage within 1 hour', dosage: '2g IV STAT', frequency: 'Q12H', duration: '5 Days', isUrgent: true },
        { id: 'SEP-4', category: 'NURSING', name: 'IV Fluid Resuscitation (Crystalloid 30mL/kg)', details: 'Administer Normal Saline crystalloid for hypotension or lactate >= 4mmol/L', isUrgent: true }
      ]
    },
    {
      id: 'BUNDLE-VOC-SICKLE',
      title: 'Sickle Cell VOC Crisis Protocol',
      subtitle: 'Vaso-Occlusive Pain & Crisis Management',
      category: 'HEMATOLOGY',
      icon: 'Activity',
      items: [
        { id: 'VOC-1', category: 'NURSING', name: 'Aggressive IV Rehydration (D5 1/2 NS)', details: '3-4 Liters/24h to reduce sickling', isUrgent: true },
        { id: 'VOC-2', category: 'MEDICATION', name: 'Analgesia Protocol (IV Morphine / Paracetamol)', details: 'Morphine 5mg IV Q4H PRN severe pain', dosage: '5mg IV', frequency: 'Q4H PRN', duration: '48 Hours', isUrgent: true },
        { id: 'VOC-3', category: 'LAB', name: 'Full Blood Count & Reticulocyte Count', details: 'Check baseline Hb and aplastic crisis risk', isUrgent: true },
        { id: 'VOC-4', category: 'LAB', name: 'Blood Grouping & Crossmatch 2 Units Packed RBCs', details: 'Prepare for acute chest syndrome or Hb drop', isUrgent: true }
      ]
    }
  ];
}
