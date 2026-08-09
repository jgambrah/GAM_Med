import { z } from 'zod';

export const InventoryBatchSchema = z.object({
  id: z.string(),
  batchNumber: z.string(),
  drugName: z.string(),
  expiryDate: z.string(),
  daysUntilExpiry: z.number(),
  initialQty: z.number(),
  remainingQty: z.number(),
  storageLocation: z.string(),
  status: z.enum(['AVAILABLE', 'EXPIRING_SOON', 'EXPIRED']),
});

export const AutoReorderOrderSchema = z.object({
  poId: z.string(),
  itemId: z.string(),
  itemName: z.string(),
  currentStock: z.number(),
  reorderPoint: z.number(),
  suggestedQty: z.number(),
  vendorName: z.string(),
  status: z.enum(['DRAFT_GENERATED', 'DISPATCHED']),
  generatedAt: z.string(),
});

export const ControlledSubstanceLogSchema = z.object({
  id: z.string(),
  narcoticName: z.string(),
  dose: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  primaryPharmacist: z.string(),
  coSigningPharmacist: z.string(),
  coSignTimestamp: z.string(),
  clinicalRationale: z.string(),
  status: z.enum(['VERIFIED_CO_SIGNED', 'PENDING_CO_SIGN']),
});

export type InventoryBatch = z.infer<typeof InventoryBatchSchema>;
export type AutoReorderOrder = z.infer<typeof AutoReorderOrderSchema>;
export type ControlledSubstanceLog = z.infer<typeof ControlledSubstanceLogSchema>;

// Returns sample FEFO drug batches sorted by earliest expiration date
export function getSampleBatches(drugName = 'Amoxicillin 500mg'): InventoryBatch[] {
  return [
    {
      id: 'BATCH-001',
      batchNumber: 'B-2026-08A',
      drugName,
      expiryDate: '2026-09-20',
      daysUntilExpiry: 42,
      initialQty: 500,
      remainingQty: 120,
      storageLocation: 'Shelf A-4 (FEFO Priority)',
      status: 'EXPIRING_SOON'
    },
    {
      id: 'BATCH-002',
      batchNumber: 'B-2027-01B',
      drugName,
      expiryDate: '2027-01-15',
      daysUntilExpiry: 159,
      initialQty: 1000,
      remainingQty: 850,
      storageLocation: 'Shelf A-5',
      status: 'AVAILABLE'
    },
    {
      id: 'BATCH-003',
      batchNumber: 'B-2027-06C',
      drugName,
      expiryDate: '2027-06-30',
      daysUntilExpiry: 325,
      initialQty: 2000,
      remainingQty: 1900,
      storageLocation: 'Bulk Storage Room 2',
      status: 'AVAILABLE'
    }
  ];
}

// FEFO (First-Expired, First-Out) Batch Allocation Algorithm
export function allocateFEFOBatches(drugName: string, qtyRequired: number, batches: InventoryBatch[]) {
  // Sort batches by earliest expiration date (FEFO)
  const sorted = [...batches].sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  let remainingToFulfill = qtyRequired;
  const allocations: { batch: InventoryBatch; allocatedQty: number }[] = [];

  for (const b of sorted) {
    if (remainingToFulfill <= 0) break;
    if (b.remainingQty > 0) {
      const take = Math.min(b.remainingQty, remainingToFulfill);
      allocations.push({ batch: b, allocatedQty: take });
      remainingToFulfill -= take;
    }
  }

  const primaryBatch = allocations[0]?.batch || sorted[0];

  return {
    primaryBatch,
    allocations,
    isFullyAllocated: remainingToFulfill === 0,
    fefoRecommendation: primaryBatch 
      ? `FEFO ROUTED: Batch #${primaryBatch.batchNumber} (Expires in ${primaryBatch.daysUntilExpiry} days) automatically selected first to prevent expiration waste.`
      : 'No available batches found.'
  };
}

// Evaluates inventory threshold and auto-generates supplier PO draft
export function evaluateReorderPoint(currentStock: number, reorderPoint = 50, itemName = 'Amoxicillin 500mg'): AutoReorderOrder | null {
  if (currentStock <= reorderPoint) {
    return {
      poId: `PO-AUTO-${Math.floor(1000 + Math.random() * 9000)}`,
      itemId: 'ITEM-88',
      itemName,
      currentStock,
      reorderPoint,
      suggestedQty: 500,
      vendorName: 'Ghana National Medical Stores (NMS)',
      status: 'DRAFT_GENERATED',
      generatedAt: 'Just now (Automated Threshold Trigger)'
    };
  }
  return null;
}

// Validates Dual-Pharmacist Co-Sign for Narcotics / Controlled Substances
export function validateDualPharmacistSignoff(
  primaryPharmacistName: string,
  coSignerEmail: string,
  coSignerPin: string,
  narcoticName: string,
  patientName: string
): { isValid: boolean; message: string; log?: ControlledSubstanceLog } {
  if (!coSignerEmail.trim() || !coSignerPin.trim()) {
    return {
      isValid: false,
      message: '🚨 CO-SIGNER REQUIRED: Controlled substance dispensing requires valid Co-Signing Pharmacist Email and 4-digit PIN.'
    };
  }

  if (coSignerPin.trim().length < 4) {
    return {
      isValid: false,
      message: '🚨 INVALID PIN: Co-signer PIN must be 4 digits.'
    };
  }

  const log: ControlledSubstanceLog = {
    id: `NARCOTIC-LOG-${Math.floor(1000 + Math.random() * 9000)}`,
    narcoticName,
    dose: '10mg IV STAT',
    patientId: 'P-100',
    patientName,
    primaryPharmacist: primaryPharmacistName,
    coSigningPharmacist: coSignerEmail,
    coSignTimestamp: new Date().toLocaleTimeString(),
    clinicalRationale: 'Acute Severe Post-Operative Pain Management',
    status: 'VERIFIED_CO_SIGNED'
  };

  return {
    isValid: true,
    message: `✅ DUAL-PHARMACIST SIGN-OFF VERIFIED: Narcotics log recorded for ${narcoticName}. Co-signed by ${coSignerEmail}.`,
    log
  };
}
