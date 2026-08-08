import { z } from 'zod';

export const GeneticMarkerSchema = z.object({
  gene: z.string(),
  variant: z.string(),
  phenotype: z.enum(['POOR_METABOLIZER', 'INTERMEDIATE_METABOLIZER', 'NORMAL_METABOLIZER', 'ULTRA_FAST_METABOLIZER', 'HYPERSENSITIVITY_RISK', 'HIGH_RISK_VARIANT']),
  clinicalImplication: z.string(),
});

export const PGxAlertSchema = z.object({
  medicationName: z.string(),
  gene: z.string(),
  phenotype: z.string(),
  riskSeverity: z.enum(['CRITICAL_CONTRAINDICATION', 'HIGH_RISK_DOSE_ADJUSTMENT', 'MODERATE_MONITORING', 'SAFE']),
  clinicalWarning: z.string(),
  recommendedAction: z.string(),
  alternativeMedications: z.array(z.string()),
});

export const TargetedANCRiskProfileSchema = z.object({
  preEclampsiaRiskTier: z.enum(['LOW', 'MODERATE', 'HIGH']),
  preEclampsiaGeneMarkers: z.array(z.string()),
  preEclampsiaProtocol: z.string(),

  gestationalDiabetesRiskTier: z.enum(['LOW', 'MODERATE', 'HIGH']),
  gdmGeneMarkers: z.array(z.string()),
  gdmScreeningProtocol: z.string(),

  chromosomalAbnormalityRiskTier: z.enum(['LOW', 'MODERATE', 'HIGH']),
  chromosomalMarkers: z.array(z.string()),
  niptProtocol: z.string(),

  personalizedCarePlan: z.array(z.string()),
});

export type PGxAlert = z.infer<typeof PGxAlertSchema>;
export type TargetedANCRiskProfile = z.infer<typeof TargetedANCRiskProfileSchema>;

export interface PatientGenomicProfile {
  patientId: string;
  patientName: string;
  markers: {
    gene: string;
    variant: string;
    phenotype: string;
    clinicalNotes: string;
  }[];
}

export function evaluatePharmacogenomics(
  prescribedMedications: string[],
  genomicProfile?: PatientGenomicProfile
): PGxAlert[] {
  const alerts: PGxAlert[] = [];

  // Default demo markers if no custom profile provided
  const markers = genomicProfile?.markers || [
    {
      gene: 'HLA-B',
      variant: '*5701 Positive',
      phenotype: 'HYPERSENSITIVITY_RISK',
      clinicalNotes: 'Severe immunologic reaction risk with Abacavir'
    },
    {
      gene: 'CYP2C9',
      variant: '*2/*3 Compound Heterozygote',
      phenotype: 'POOR_METABOLIZER',
      clinicalNotes: 'Reduced Warfarin & NSAID clearance'
    },
    {
      gene: 'RYR1',
      variant: 'c.1021C>T (p.Arg341Cys)',
      phenotype: 'HIGH_RISK_VARIANT',
      clinicalNotes: 'Malignant Hyperthermia susceptibility with volatile anesthetics'
    },
    {
      gene: 'TPMT',
      variant: '*3A/*3C',
      phenotype: 'POOR_METABOLIZER',
      clinicalNotes: 'Severe bone marrow suppression risk with Azathioprine'
    }
  ];

  for (const med of prescribedMedications) {
    const medUpper = med.toUpperCase();

    // 1. Abacavir + HLA-B*5701
    if (medUpper.includes('ABACAVIR') || medUpper.includes('ZIAGEN') || medUpper.includes('TRIUMEQ')) {
      const hla = markers.find(m => m.gene === 'HLA-B' && m.variant.includes('*5701'));
      if (hla) {
        alerts.push({
          medicationName: med,
          gene: 'HLA-B*5701',
          phenotype: hla.phenotype,
          riskSeverity: 'CRITICAL_CONTRAINDICATION',
          clinicalWarning: '🚨 ABSOLUTE CONTRAINDICATION: Patient is HLA-B*5701 positive. High risk of multi-organ Abacavir Hypersensitivity Reaction (AHR).',
          recommendedAction: 'Discontinue Abacavir immediately. Switch to Tenofovir Disoproxil (TDF) or Tenofovir Alafenamide (TAF) based regimen.',
          alternativeMedications: ['Tenofovir DF (TDF) 300mg', 'Tenofovir Alafenamide (TAF) 25mg', 'Lamivudine (3TC)']
        });
      }
    }

    // 2. Warfarin + CYP2C9 / VKORC1
    if (medUpper.includes('WARFARIN') || medUpper.includes('COUMADIN')) {
      const cyp = markers.find(m => m.gene === 'CYP2C9');
      if (cyp && cyp.phenotype.includes('POOR')) {
        alerts.push({
          medicationName: med,
          gene: 'CYP2C9 (*2/*3)',
          phenotype: cyp.phenotype,
          riskSeverity: 'HIGH_RISK_DOSE_ADJUSTMENT',
          clinicalWarning: '⚠️ HIGH BLEEDING RISK: Patient is a CYP2C9 Poor Metabolizer. Warfarin clearance is reduced by ~75%.',
          recommendedAction: 'Reduce initial Warfarin starting dose by 50-70% (Target 1.5mg - 2.0mg daily) and check INR on Day 3.',
          alternativeMedications: ['Rivaroxaban 20mg (DOAC)', 'Apixaban 5mg', 'Low Molecular Weight Heparin (Enoxaparin)']
        });
      }
    }

    // 3. Volatile Anesthetics / Succinylcholine + RYR1
    if (medUpper.includes('SEVOFLURANE') || medUpper.includes('ISOFLURANE') || medUpper.includes('SUCCINYLCHOLINE')) {
      const ryr = markers.find(m => m.gene === 'RYR1');
      if (ryr) {
        alerts.push({
          medicationName: med,
          gene: 'RYR1 Mutation',
          phenotype: ryr.phenotype,
          riskSeverity: 'CRITICAL_CONTRAINDICATION',
          clinicalWarning: '🚨 MALIGNANT HYPERTHERMIA RISK: Patient carries RYR1 gene mutation causing hypermetabolic crisis during general anesthesia.',
          recommendedAction: 'Strictly avoid volatile anesthetics and succinylcholine. Use Total Intravenous Anesthesia (TIVA with Propofol). Keep Dantrolene on standby.',
          alternativeMedications: ['Propofol TIVA Infusion', 'Fentanyl', 'Rocuronium (with Sugammadex reversal)']
        });
      }
    }

    // 4. Azathioprine / 6-MP + TPMT
    if (medUpper.includes('AZATHIOPRINE') || medUpper.includes('MERCAPTOPURINE') || medUpper.includes('IMURAN')) {
      const tpmt = markers.find(m => m.gene === 'TPMT');
      if (tpmt) {
        alerts.push({
          medicationName: med,
          gene: 'TPMT (*3A/*3C)',
          phenotype: tpmt.phenotype,
          riskSeverity: 'CRITICAL_CONTRAINDICATION',
          clinicalWarning: '🚨 SEVERE MYELOSUPPRESSION: TPMT enzyme deficiency leads to toxic thiopurine metabolite accumulation causing fatal pancytopenia.',
          recommendedAction: 'Reduce Azathioprine dose to 10% of standard dose OR switch to alternative non-thiopurine immunosuppressant.',
          alternativeMedications: ['Mycophenolate Mofetil (CellCept)', 'Tacrolimus', 'Infliximab']
        });
      }
    }
  }

  return alerts;
}

export function generateTargetedANCRiskProfile(
  gestationalAgeWeeks: number = 14,
  maternalAge: number = 34,
  bpSystolic: number = 138,
  bpDiastolic: number = 88
): TargetedANCRiskProfile {
  return {
    preEclampsiaRiskTier: 'HIGH',
    preEclampsiaGeneMarkers: ['FLT1 Variant (sFlt-1/PlGF ratio 88)', 'ENG (Endoglin) Overexpression'],
    preEclampsiaProtocol: 'High Risk Flagged: Initiate Low-Dose Aspirin 150mg at bedtime starting <16 weeks. Schedule uterine artery Doppler ultrasound at 20 weeks.',

    gestationalDiabetesRiskTier: 'HIGH',
    gdmGeneMarkers: ['TCF7L2 (rs7903146 CT Genotype)', 'MTNR1B Variant'],
    gdmScreeningProtocol: 'Accelerated Screening: Order Early 75g Oral Glucose Tolerance Test (OGTT) now at 16 weeks (rather than 24-28 weeks standard).',

    chromosomalAbnormalityRiskTier: 'MODERATE',
    chromosomalMarkers: ['Cell-Free Fetal DNA (cfDNA) Low Fetal Fraction 4.2%', 'Trisomy 21 Screening Ratio 1:180'],
    niptProtocol: 'Order Non-Invasive Prenatal Testing (NIPT) panel for Chromosomes 21, 18, 13 & Microdeletions.',

    personalizedCarePlan: [
      '⚡ Order Low-Dose Aspirin 150mg Daily Protocol (Pre-eclampsia Prophylaxis).',
      '⚡ Schedule Early 16-Week 75g Oral Glucose Tolerance Test (GDM Early Detection).',
      '⚡ Queue Cell-Free Fetal DNA NIPT Genomic Screening Blood Test.',
      '⚡ High-Risk ANC Consultation Referral to Maternal-Fetal Medicine (MFM) Specialist.'
    ]
  };
}
