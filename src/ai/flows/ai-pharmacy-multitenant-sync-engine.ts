import { z } from 'zod';

export const FacilityStockNodeSchema = z.object({
  facilityId: z.string(),
  facilityName: z.string(),
  location: z.string(),
  drugName: z.string(),
  quantityInStock: z.number(),
  unitCostGhc: z.number(),
  contactPhone: z.string(),
  status: z.enum(['AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK']),
});

export const InterFacilityTransferRequestSchema = z.object({
  requestId: z.string(),
  sourceFacilityId: z.string(),
  sourceFacilityName: z.string(),
  targetFacilityId: z.string(),
  targetFacilityName: z.string(),
  drugName: z.string(),
  requestedQty: z.number(),
  urgency: z.enum(['CRITICAL_STAT', 'ROUTINE']),
  timestamp: z.string(),
  status: z.enum(['REQUESTED', 'DISPATCHED', 'RECEIVED']),
});

export type FacilityStockNode = z.infer<typeof FacilityStockNodeSchema>;
export type InterFacilityTransferRequest = z.infer<typeof InterFacilityTransferRequestSchema>;

// Mock sister hospital branches network database
const SISTER_FACILITIES_STOCK_DB: FacilityStockNode[] = [
  {
    facilityId: 'HOSP-ACCRA-MAIN',
    facilityName: 'GAM_Med Accra Main Medical Center',
    location: 'Airport Residential Area, Accra',
    drugName: 'Penicillin V Potassium 500mg',
    quantityInStock: 450,
    unitCostGhc: 15.0,
    contactPhone: '+233 24 111 2233',
    status: 'AVAILABLE',
  },
  {
    facilityId: 'HOSP-KUMASI-CENTRAL',
    facilityName: 'GAM_Med Kumasi Central Branch',
    location: 'Adum, Kumasi',
    drugName: 'Penicillin V Potassium 500mg',
    quantityInStock: 120,
    unitCostGhc: 15.0,
    contactPhone: '+233 20 444 5566',
    status: 'AVAILABLE',
  },
  {
    facilityId: 'HOSP-TEMA-REGIONAL',
    facilityName: 'GAM_Med Tema Regional Hub',
    location: 'Community 11, Tema',
    drugName: 'Amoxicillin 500mg Capsules',
    quantityInStock: 800,
    unitCostGhc: 12.5,
    contactPhone: '+233 27 777 8899',
    status: 'AVAILABLE',
  },
  {
    facilityId: 'HOSP-TAKORADI-BAY',
    facilityName: 'GAM_Med Takoradi Port Hospital',
    location: 'Harbour Area, Takoradi',
    drugName: 'Morphine Sulfate 10mg Inj',
    quantityInStock: 45,
    unitCostGhc: 45.0,
    contactPhone: '+233 31 222 3344',
    status: 'LOW_STOCK',
  },
];

/**
 * Queries inventory telemetry across all sister hospital branches in the network
 */
export function queryMultiBranchInventory(
  drugName = 'Penicillin V Potassium 500mg',
  currentHospitalId = 'HOSP-CURRENT'
): FacilityStockNode[] {
  const queryLower = drugName.toLowerCase();
  
  const matches = SISTER_FACILITIES_STOCK_DB.filter(
    (item) => item.facilityId !== currentHospitalId && item.drugName.toLowerCase().includes(queryLower)
  );

  if (matches.length > 0) return matches;

  // Fallback default network branch results
  return [
    {
      facilityId: 'HOSP-ACCRA-MAIN',
      facilityName: 'GAM_Med Accra Main Medical Center',
      location: 'Airport Residential Area, Accra',
      drugName,
      quantityInStock: 340,
      unitCostGhc: 18.0,
      contactPhone: '+233 24 111 2233',
      status: 'AVAILABLE',
    },
    {
      facilityId: 'HOSP-KUMASI-CENTRAL',
      facilityName: 'GAM_Med Kumasi Central Branch',
      location: 'Adum, Kumasi',
      drugName,
      quantityInStock: 85,
      unitCostGhc: 18.0,
      contactPhone: '+233 20 444 5566',
      status: 'LOW_STOCK',
    },
  ];
}

/**
 * Formats and dispatches an automated inter-facility stock transfer request
 */
export function initiateInterFacilityStockTransfer(
  sourceFacilityId: string,
  sourceFacilityName: string,
  targetFacilityId = 'HOSP-CURRENT',
  targetFacilityName = 'GAM_Med Central Pharmacy',
  drugName = 'Penicillin V Potassium 500mg',
  requestedQty = 50,
  urgency: 'CRITICAL_STAT' | 'ROUTINE' = 'CRITICAL_STAT'
): InterFacilityTransferRequest {
  return {
    requestId: `TRANSFER-${Math.floor(10000 + Math.random() * 90000)}`,
    sourceFacilityId,
    sourceFacilityName,
    targetFacilityId,
    targetFacilityName,
    drugName,
    requestedQty,
    urgency,
    timestamp: new Date().toLocaleTimeString(),
    status: 'REQUESTED',
  };
}
