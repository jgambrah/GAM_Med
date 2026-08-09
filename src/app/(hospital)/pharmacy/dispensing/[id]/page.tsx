'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, writeBatch, serverTimestamp, collection, query, where, increment } from 'firebase/firestore';
import { 
  Pill, CheckCircle2, Printer, ArrowLeft, 
  AlertTriangle, Package, Loader2, Info 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { PharmacyVerificationSuiteCard } from '@/components/pharmacy/PharmacyVerificationSuiteCard';
import { SmartDispensingInventoryCard } from '@/components/pharmacy/SmartDispensingInventoryCard';
import { PharmacyInterventionAndCompoundingCard } from '@/components/pharmacy/PharmacyInterventionAndCompoundingCard';
import { PatientEducationAndRefillCard } from '@/components/pharmacy/PatientEducationAndRefillCard';
import { AdvancedInpatientDispensingCard } from '@/components/pharmacy/AdvancedInpatientDispensingCard';
import { IntegratedPharmacyCdssCard } from '@/components/pharmacy/IntegratedPharmacyCdssCard';
import { ColdChainAndLogisticsCard } from '@/components/pharmacy/ColdChainAndLogisticsCard';
import { MedSyncAndOutpatientConvenienceCard } from '@/components/pharmacy/MedSyncAndOutpatientConvenienceCard';
import { PharmacySafetyQueueInspectorCard } from '@/components/pharmacy/PharmacySafetyQueueInspectorCard';
import { PharmacyPriorityTriageCard } from '@/components/pharmacy/PharmacyPriorityTriageCard';

const parseDate = (createdAt: any): Date => {
  if (!createdAt) return new Date();
  if (typeof createdAt.toDate === 'function') return createdAt.toDate();
  if (createdAt instanceof Date) return createdAt;
  if (typeof createdAt === 'string' || typeof createdAt === 'number') return new Date(createdAt);
  if (createdAt.seconds) return new Date(createdAt.seconds * 1000);
  return new Date();
};

export default function DispensingPage() {
  const { id: encounterId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [processing, setProcessing] = useState(false);
  const [isBcmaVerified, setIsBcmaVerified] = useState(false);
  const [isNarcoticCoSigned, setIsNarcoticCoSigned] = useState(false);
  const [isOrderPaused, setIsOrderPaused] = useState(false);
  const [dispenseQuantities, setDispenseQuantities] = useState<Record<number, number>>({});

  const patientId = searchParams.get('patientId');
  const hospitalId = searchParams.get('hospitalId');

  const encounterRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !patientId || !encounterId) return null;
    return doc(firestore, `hospitals/${hospitalId}/patients/${patientId}/encounters`, encounterId as string);
  }, [firestore, hospitalId, patientId, encounterId]);

  const { data: order, isLoading: isOrderLoading } = useDoc(encounterRef);

  const inventoryQuery = useMemoFirebase(() => {
      if(!firestore || !hospitalId) return null;
      return query(collection(firestore, `hospitals/${hospitalId}/pharmacy_inventory`));
  }, [firestore, hospitalId]);
  const {data: inventorySnapshot, isLoading: isInventoryLoading} = useCollection(inventoryQuery);

  const catalogQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/product_catalog`));
  }, [firestore, hospitalId]);
  const { data: catalogData, isLoading: isCatalogLoading } = useCollection(catalogQuery);

  const prescriptionItems = useMemo(() => {
    return order?.prescription || order?.items || [];
  }, [order]);

  const hasControlledNarcotic = useMemo(() => {
    return (prescriptionItems || []).some((rx: any) => {
      const name = (rx.name || rx.drugName || '').toLowerCase();
      return name.includes('morphine') || name.includes('fentanyl') || name.includes('pethidine') || name.includes('diazepam');
    });
  }, [prescriptionItems]);

  useEffect(() => {
    if (prescriptionItems.length > 0) {
      const initial: Record<number, number> = {};
      prescriptionItems.forEach((rx: any, idx: number) => {
        initial[idx] = Number(rx.qty) || Number(rx.quantity) || 1;
      });
      setDispenseQuantities(initial);
    }
  }, [prescriptionItems]);

  const findStockItem = (rxName: string) => {
    if (!inventorySnapshot) return null;
    const nameLower = rxName.toLowerCase().trim();
    return inventorySnapshot.find(item => 
      (item.name && item.name.toLowerCase().trim() === nameLower) ||
      (item.genericName && item.genericName.toLowerCase().trim() === nameLower)
    ) || null;
  };

  const hasInsufficientStock = useMemo(() => {
    return prescriptionItems.some((rx: any, idx: number) => {
      const stockItem = findStockItem(rx.name);
      const currentStock = stockItem ? stockItem.quantity : 0;
      const dispenseQty = dispenseQuantities[idx] || 1;
      return currentStock < dispenseQty;
    });
  }, [prescriptionItems, inventorySnapshot, dispenseQuantities]);

  const handleFinalizeDispensing = async () => {
    if (!firestore || !user || !order || !inventorySnapshot || !hospitalId) {
        toast({ variant: 'destructive', title: "System Error", description: "Data not ready." });
        return;
    }
    setProcessing(true);
    const batch = writeBatch(firestore);

    try {
      // 1. Mark Encounter as Dispensed
      batch.update(encounterRef!, {
        isDispensed: true,
        dispensedAt: serverTimestamp(),
        pharmacistId: user.uid,
        pharmacistName: user.displayName,
      });

      // 2. DEDUCT STOCK (Billing is now handled upstream in the createEncounter function)
      prescriptionItems.forEach((rx: any, idx: number) => {
        const stockItem = findStockItem(rx.name);
        if (stockItem) {
          const qtyToDeduct = dispenseQuantities[idx] || 1;
          const itemRef = doc(firestore, `hospitals/${hospitalId}/pharmacy_inventory`, stockItem.id);
          batch.update(itemRef, { quantity: increment(-qtyToDeduct) });
        }
      });

      await batch.commit();
      toast({ title: "Dispensing Complete", description: "Inventory has been updated." });
      router.push('/pharmacy');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Dispensing Failed", description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const isLoading = isOrderLoading || isInventoryLoading || isCatalogLoading;

  if (isLoading) return <div className="p-20 text-center font-black italic">Verifying Prescription...</div>;

  return (
    <>
      <div className="p-8 max-w-5xl mx-auto space-y-8 print:hidden">
        <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2 text-muted-foreground font-black text-[10px] uppercase tracking-widest hover:text-foreground">
          <ArrowLeft size={14}/> Back to Queue
        </Button>

        {/* PATIENT & ORDER HEADER */}
        <div className="bg-foreground p-8 rounded-[40px] text-background shadow-2xl flex flex-wrap justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center text-2xl font-black">
              RX
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter italic">Dispensing <span className="text-primary/70">Order</span></h1>
              <p className="text-primary/50 font-bold uppercase text-[10px] mt-1 tracking-widest">
                Prescribed by: Dr. {order?.providerName} • {order?.createdAt ? parseDate(order.createdAt).toLocaleString() : ''}
              </p>
            </div>
          </div>
          <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
             <p className="text-[9px] font-black text-primary/70 uppercase tracking-widest">Patient Identity</p>
             <p className="text-lg font-black uppercase">{order?.patientName || 'Clinical Record'}</p>
          </div>
        </div>

        {/* CLINICAL PRESCRIPTION SAFETY & DATA FLAG INSPECTOR */}
        <PharmacySafetyQueueInspectorCard 
          patientName={order?.patientName || 'Benjamin Hedidor'}
          orderItems={prescriptionItems}
          doctorName={order?.providerName || 'Dr. Tracy Gambrah'}
        />

        {/* PRIORITY TRIAGE & WORKFLOW SLA HUB */}
        <PharmacyPriorityTriageCard 
          patientName={order?.patientName || 'Benjamin Hedidor'}
        />

        {/* AUTOMATED PHARMACY VERIFICATION & CLINICAL SAFETY SUITE */}
        <PharmacyVerificationSuiteCard 
          prescriptionItems={prescriptionItems}
          patientName={order?.patientName || 'Patient'}
          patientId={patientId || 'P-100'}
          allergies="Penicillin, Sulfa"
          onVerificationComplete={(passed) => setIsBcmaVerified(passed)}
        />

        {/* SMART DISPENSING & INVENTORY MANAGEMENT HUB */}
        <SmartDispensingInventoryCard 
          drugName={prescriptionItems[0]?.name || 'Amoxicillin 500mg'}
          patientName={order?.patientName || 'Patient'}
          primaryPharmacistName={user?.displayName || 'Pharmacist'}
          isControlledSubstance={hasControlledNarcotic}
          onCoSignSuccess={() => setIsNarcoticCoSigned(true)}
        />

        {/* SEAMLESS DOCTOR-PHARMACY COMMUNICATION & IV COMPOUNDING HUB */}
        <PharmacyInterventionAndCompoundingCard 
          patientName={order?.patientName || 'Patient'}
          patientId={patientId || 'P-100'}
          prescribingDoctorName={order?.providerName || 'Dr. Kwaku Mensah'}
        />

        {/* PATIENT ENGAGEMENT & OUTPATIENT FULFILLMENT HUB */}
        <PatientEducationAndRefillCard 
          patientName={order?.patientName || 'Benjamin Hedidor'}
          drugName={prescriptionItems[0]?.name || 'Amoxicillin 500mg'}
        />

        {/* ADVANCED INPATIENT & COMPOUNDING DISPENSING SUITE */}
        <AdvancedInpatientDispensingCard 
          patientName={order?.patientName || 'Benjamin Hedidor'}
          expectedNdc={prescriptionItems[0]?.ndc || 'NDC-0093-0058-01'}
          expectedWristband={`GH-CARD-${(patientId || '9921').slice(-4)}`}
          wardName="Female Medical Ward 3B"
        />

        {/* INTEGRATED CLINICAL DECISION SUPPORT SYSTEMS (CDSS) & RTPB */}
        <IntegratedPharmacyCdssCard 
          drugName={prescriptionItems[0]?.name || 'Amoxil Brand 500mg'}
          patientName={order?.patientName || 'Benjamin Hedidor'}
          patientId={patientId || 'P-100'}
          prescribingDoctorName={order?.providerName || 'Dr. Kwaku Mensah'}
          onOrderPausedChange={(paused) => setIsOrderPaused(paused)}
        />

        {/* INTELLIGENT STOCK & COLD-CHAIN LOGISTICS HUB */}
        <ColdChainAndLogisticsCard 
          drugName={prescriptionItems[0]?.name || 'Amoxicillin 500mg'}
          primaryPharmacistName={user?.displayName || 'Pharmacist'}
        />

        {/* MEDICATION SYNCHRONIZATION (MED SYNC) & OUTPATIENT CONVENIENCE HUB */}
        <MedSyncAndOutpatientConvenienceCard 
          patientName={order?.patientName || 'Benjamin Hedidor'}
          drugName={prescriptionItems[0]?.name || 'Amoxicillin 500mg'}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: PRESCRIPTION ITEMS */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Pill size={16} className="text-primary" /> Prescribed Medications
            </h3>

            <div className="space-y-4">
              {prescriptionItems.map((rx: any, idx: number) => {
                const stockItem = findStockItem(rx.name);
                const currentStock = stockItem ? stockItem.quantity : 0;
                const dispenseQty = dispenseQuantities[idx] || 1;
                const isInsufficient = currentStock < dispenseQty;
                const isLowStock = !stockItem || currentStock < 20;

                return (
                  <div key={idx} className="bg-card p-6 rounded-[32px] border-2 border-border shadow-sm flex flex-col md:flex-row justify-between gap-6 hover:border-primary/20 transition-all">
                    <div className="flex items-start gap-4 flex-1">
                       <div className={`p-3 rounded-2xl ${isInsufficient ? 'bg-destructive/10 text-destructive' : isLowStock ? 'bg-amber-500/10 text-amber-600' : 'bg-green-500/10 text-green-600'}`}>
                          <Package size={24} />
                       </div>
                       <div className="space-y-1">
                          <p className="font-black text-card-foreground uppercase text-sm">{rx.name} ({rx.strength})</p>
                          <p className="text-[11px] font-bold text-primary mt-1 uppercase italic">{rx.dosage} • {rx.frequency} • {rx.duration}</p>
                          <div className="mt-2 flex items-center gap-2 bg-muted/50 p-2 rounded-xl border w-fit">
                             <Info size={12} className="text-muted-foreground" />
                             <p className="text-[10px] font-bold text-muted-foreground italic">"{rx.instructions || rx.instruction || 'Take as directed'}"</p>
                          </div>
                       </div>
                    </div>

                    <div className="flex flex-col justify-center items-start md:items-center px-4">
                       <label className="text-[9px] font-black text-muted-foreground uppercase mb-1">Qty to Dispense</label>
                       <Input
                         type="number"
                         min="1"
                         value={dispenseQty}
                         onChange={(e) => {
                           const val = Math.max(1, Number(e.target.value));
                           setDispenseQuantities(prev => ({ ...prev, [idx]: val }));
                         }}
                         className="w-20 p-2 border-2 border-slate-200 rounded-xl text-center font-black text-xs text-black bg-white h-9"
                       />
                    </div>

                    <div className="flex flex-col justify-center items-end border-l-0 md:border-l pl-0 md:pl-6 border-border min-w-[120px]">
                       <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Current Stock</p>
                       <p className={`text-xl font-black ${isInsufficient ? 'text-destructive' : isLowStock ? 'text-amber-500' : 'text-green-600'}`}>
                          {currentStock}
                       </p>
                       {isInsufficient ? (
                         <span className="text-[8px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase mt-1 animate-pulse">Insufficient Stock</span>
                       ) : isLowStock ? (
                         <span className="text-[8px] font-bold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full uppercase mt-1">Refill Soon</span>
                       ) : (
                         <span className="text-[8px] font-bold bg-green-100 text-green-600 px-2 py-0.5 rounded-full uppercase mt-1">In Stock</span>
                       )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: DISPENSING ACTIONS */}
          <div className="space-y-6">
             <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-600" /> Dispensing Finalization
             </h3>
             
             <div className="bg-card p-8 rounded-[40px] border shadow-sm space-y-6">
                <div className="space-y-2">
                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pharmacist Signature</p>
                   <div className="p-4 bg-muted/50 rounded-2xl border border-dashed">
                      <p className="font-mono text-xs text-muted-foreground italic">Digitally Signed by: {user?.displayName}</p>
                   </div>
                </div>

                <div className="space-y-3 pt-4">
                   <Button 
                     onClick={() => window.print()}
                     className="w-full bg-foreground text-background py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all"
                   >
                      <Printer size={16}/> Print Drug Labels
                   </Button>

                    <Button 
                      disabled={processing || hasInsufficientStock || !isBcmaVerified || (hasControlledNarcotic && !isNarcoticCoSigned) || isOrderPaused}
                      onClick={handleFinalizeDispensing}
                      className="w-full bg-primary text-primary-foreground py-5 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-3 hover:bg-primary/80 transition-all disabled:bg-muted disabled:opacity-50"
                    >
                       {processing ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                       {isOrderPaused ? '⏸️ Order Paused for EHR Review' : 'Complete & Issue Drugs'}
                    </Button>
                </div>

                {isOrderPaused && (
                  <div className="flex items-start gap-3 p-4 bg-amber-950/90 rounded-2xl border border-amber-600 shadow-md">
                      <AlertTriangle size={20} className="text-amber-300 shrink-0 mt-0.5" />
                      <p className="text-[10px] font-bold text-amber-200 leading-relaxed uppercase">
                         Dispensing Order Paused: Pharmacist has paused order for Doctor EHR Intervention review.
                      </p>
                  </div>
                )}

                {hasControlledNarcotic && !isNarcoticCoSigned && (
                  <div className="flex items-start gap-3 p-4 bg-purple-950/90 rounded-2xl border border-purple-600 shadow-md">
                      <AlertTriangle size={20} className="text-purple-300 shrink-0 mt-0.5" />
                      <p className="text-[10px] font-bold text-purple-200 leading-relaxed uppercase">
                         Dual-Pharmacist Narcotic Co-Sign Required: Controlled substance detected in prescription. Co-sign required in vault above.
                      </p>
                  </div>
                )}

                {!isBcmaVerified && (
                  <div className="flex items-start gap-3 p-4 bg-cyan-950/80 rounded-2xl border border-cyan-700 shadow-md">
                      <AlertTriangle size={20} className="text-cyan-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] font-bold text-cyan-200 leading-relaxed uppercase">
                         BCMA 5-Rights Barcode Scan Required: Please scan Patient Wristband and Drug Package NDC above to enable dispensing.
                      </p>
                  </div>
                )}

                {hasInsufficientStock && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
                      <AlertTriangle size={20} className="text-red-600 shrink-0" />
                      <p className="text-[9px] font-bold text-red-700 leading-relaxed uppercase">
                         Cannot dispense: One or more drugs have insufficient stock in inventory.
                      </p>
                  </div>
                )}

                <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                   <AlertTriangle size={20} className="text-amber-600 shrink-0" />
                   <p className="text-[9px] font-bold text-amber-700 leading-relaxed uppercase">
                      Confirm all drug names and dosages with the patient before finalized dispensing.
                   </p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* PRINT-ONLY LABEL LAYOUT */}
      <div className="hidden print:block font-mono text-black p-4">
        <style>{`
          @media print {
            html, body, #__next, main, [role="main"], .min-h-screen, .h-screen {
              height: auto !important;
              overflow: visible !important;
              position: static !important;
              display: block !important;
            }
            .page-break {
              page-break-after: always !important;
              break-after: page !important;
            }
          }
        `}</style>
        {prescriptionItems.map((rx: any, idx: number) => {
          const dispenseQty = dispenseQuantities[idx] || 1;
          return (
            <div 
              key={idx} 
              className="border-2 border-black p-6 rounded-lg w-[3.5in] h-[2in] mx-auto flex flex-col justify-between page-break mb-8"
            >
              <div className="text-center border-b border-black pb-1">
                <p className="text-[10px] font-bold tracking-widest uppercase">GAM-GAR HEALTH CENTRE</p>
                <p className="text-[8px] uppercase">Pharmacy Department</p>
              </div>
              
              <div className="text-xs space-y-1">
                <p><span className="font-bold">PATIENT:</span> {order?.patientName}</p>
                <p><span className="font-bold">DRUG:</span> {rx.name} {rx.strength ? `(${rx.strength})` : ''}</p>
                <p><span className="font-bold">QTY:</span> {dispenseQty} units</p>
                <p className="font-bold text-center bg-slate-100 py-1 text-[11px] uppercase border border-black my-1">
                  {rx.dosage} • {rx.frequency} • {rx.duration}
                </p>
                {(rx.instructions || rx.instruction) && (
                  <p className="text-[9px] italic text-center">"{rx.instructions || rx.instruction}"</p>
                )}
              </div>
              
              <div className="flex justify-between items-center text-[8px] border-t border-black pt-1">
                <p>DATE: {new Date().toLocaleDateString()}</p>
                <p>PHARM: {user?.displayName}</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
