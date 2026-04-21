

export const HOSPITAL_DEPARTMENTS = [
  'Administration',
  'Clinical / Medical',
  'Nursing',
  'Pharmacy',
  'Laboratory',
  'Radiology',
  'Finance',
  'Human Resources',
  'IT',
  'Stores / Procurement',
  'Maintenance',
  'Security',
  'Mortuary',
];

export const ASSET_GROUPS = [
  { id: 'PPE', label: 'Property, Plant and Equipment (PPE)' },
  { id: 'INTANGIBLE', label: 'Intangible Assets' },
  { id: 'INVESTMENT', label: 'Long-Term Investments' },
  { id: 'WASTING', label: 'Natural Resources (Wasting Assets)' },
  { id: 'HELD_FOR_SALE', label: 'Non-Current Assets Held for Sale' }
];

export const PPE_SUB_DIVISIONS = [
  { id: 'PROPERTY', label: 'Property (Land & Buildings)' },
  { id: 'PLANT', label: 'Plant (Machinery, Power, HVAC)' },
  { id: 'EQUIPMENT', label: 'Equipment (Clinical & Office)' }
];

export const PATIENT_STATUS = {
  AWAITING_VITALS: "Awaiting Vitals",
  WAITING_ASSIGNMENT: "Waiting for Assignment",
  WAITING_DOCTOR: "Waiting for Doctor",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  DECEASED: "Deceased",
};
