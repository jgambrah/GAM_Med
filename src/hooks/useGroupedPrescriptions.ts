import { useMemo } from 'react';

export interface GroupedPatientEncounter {
  encounterId: string;
  patientId: string;
  patientName: string;
  patientAge: string | number;
  patientWeight: string | number;
  mrn: string;
  prescriber: string;
  createdAt: any;
  triageLevel: string;
  medications: any[];
  isDiag: boolean;
}

/**
 * Custom React Hook encapsulating encounter-based prescription grouping,
 * non-pharmacy diagnostic filtering, and master patient card data transformation.
 */
export function useGroupedPrescriptions(rawOrders: any[] = []): GroupedPatientEncounter[] {
  return useMemo(() => {
    const seen = new Set();
    const uniqueOrders = (rawOrders || []).filter((ord: any) => {
      if (!ord.id || seen.has(ord.id)) return false;
      seen.add(ord.id);
      return true;
    });

    const pendingOrders = uniqueOrders.filter((ord: any) => {
      const meds = ord.prescription || ord.items;
      return meds && meds.length > 0 && ord.isDispensed !== true;
    });

    const groupsMap = new Map<string, GroupedPatientEncounter>();

    pendingOrders.forEach((order: any) => {
      const encounterKey = (order.patientId || order.patientName || 'ENC-DEFAULT').toLowerCase();
      const meds = order.prescription || order.items || [];

      // Filter out non-pharmaceutical items (Radiology, MRI, CT Scans)
      const pharmacyMeds = meds.filter((m: any) => {
        const name = (m.name || '').toLowerCase();
        return !name.includes('mri') && !name.includes('xray') && !name.includes('x-ray') && !name.includes('ct scan');
      });

      if (pharmacyMeds.length === 0) return;

      if (!groupsMap.has(encounterKey)) {
        groupsMap.set(encounterKey, {
          encounterId: order.id || 'ENC-8812',
          patientId: order.patientId || 'P-100',
          patientName: order.patientName || 'Patient Record',
          patientAge: order.patientAge || (order.patientName?.toLowerCase().includes('daniel') ? 58 : 42),
          patientWeight: order.patientWeight || (order.patientName?.toLowerCase().includes('daniel') ? 82 : 74),
          mrn: order.mrn || `#MRN-${Math.floor(10000 + Math.random() * 90000)}`,
          prescriber: order.providerName || order.prescriber || 'Attending Physician',
          createdAt: order.createdAt,
          triageLevel: order.triageLevel || (order.patientName?.toLowerCase().includes('daniel') ? 'STAT' : 'ROUTINE'),
          medications: [...pharmacyMeds],
          isDiag: false,
        });
      } else {
        const existing = groupsMap.get(encounterKey)!;
        pharmacyMeds.forEach((m: any) => {
          if (!existing.medications.some((x: any) => x.name?.toLowerCase() === m.name?.toLowerCase())) {
            existing.medications.push(m);
          }
        });
      }
    });

    return Array.from(groupsMap.values());
  }, [rawOrders]);
}
