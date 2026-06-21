export type Encounter = {
  id: string;
  createdAt: Date;

  // Clinical
  type?: string;
  chiefComplaint: string;
  diagnosis: string;

  // Vitals
  vitals: {
    bp?: string;
    temp?: number;
    pulse?: number;
    respiration?: number;
    spo2?: number;
    weight?: number;
    height?: number;
    bmi?: number;
    systolic?: string;
    diastolic?: string;
  };

  // Orders
  labOrders?: any[];
  radiologyOrders?: any[];

  // Treatment
  prescription?: {
    name: string;
    dosage: string;
    frequency: string;
    instruction?: string;
  }[];
  items?: any[];

  // Clinical Details Fallbacks & Extension
  hpi?: string;
  encounterType?: string;
  surgeryDetails?: {
    findings: string;
    procedureDone: string;
    anesthesiaType: string;
    bloodLoss: string;
    postOpInstructions: string;
    checklistAudit?: {
      patientIdentityConfirmed?: boolean;
      siteMarked?: boolean;
      anesthesiaSafetyCheck?: boolean;
      pulseOxiFunctioning?: boolean;
      teamIntroduced?: boolean;
      verbalIncisionConfirm?: boolean;
      antibioticsAdministered?: boolean;
      essentialImagingDisplayed?: boolean;
      countsConfirmed?: boolean;
      specimenLabeled?: boolean;
      equipmentProblemsAddressed?: boolean;
      recoveryPlanReviewed?: boolean;
    };
  };

  // Meta
  providerName?: string;
  providerRole?: string;
  hospitalId?: string;
  hospitalName?: string;
};
