'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, serverTimestamp, collection, query, where, increment } from 'firebase/firestore';
import { 
  Pill, CheckCircle2, Printer, ArrowLeft, 
  AlertTriangle, Package, Loader2, Info 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function DispensingPage() {
  const { id: encounterId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [processing, setProcessing] = useState(false);
  
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


  const handleFinalizeDispensing = async () => {
    if (!firestore || !user || !order || !inventorySnapshot || !catalogData) {
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

      // 2. DEDUCT STOCK & CREATE BILLING ITEMS
      order.prescription.forEach((rx: any) => {
        const stockItem = inventorySnapshot.find(item => item.name === rx.name);
        if (stockItem) {
          // Deduct from physical stock
          const qtyUsed = 20; // Simplified for now
          const itemRef = doc(firestore, `hospitals/${hospitalId}/pharmacy_inventory`, stockItem.id);
          batch.update(itemRef, {
            quantity: increment(-qtyUsed)
          });
          
          // Find master catalog item to get selling price
          const catalogItem = catalogData.find(p => p.sku === stockItem.sku);
          if (catalogItem && catalogItem.sellingPrice > 0) {
              const billRef = doc(collection(firestore, `hospitals/${hospitalId}/billing_items`));
              const qtyToBill = 1; // Simplified
              batch.set(billRef, {
                  hospitalId,
                  patientId,
                  patientName: order.patientName,
                  encounterId,
                  description: catalogItem.name,
                  category: 'PHARMACY',
                  sku: catalogItem.sku,
                  unitPrice: catalogItem.sellingPrice,
                  qty: qtyToBill,
                  total: catalogItem.sellingPrice * qtyToBill,
                  status: 'UNPAID',
                  billedBy: user.uid,
                  createdAt: serverTimestamp()
              });
          }
        }
      });

      await batch.commit();
      toast({ title: "Dispensing Complete", description: "Inventory updated and patient bill generated." });
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
    <div className="p-8 max-w-5xl mx-auto space-y-8">
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
              Prescribed by: Dr. {order?.providerName} • {order?.createdAt ? new Date(order.createdAt?.toDate()).toLocaleString() : ''}
            </p>
          </div>
        </div>
        <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
           <p className="text-[9px] font-black text-primary/70 uppercase tracking-widest">Patient Identity</p>
           <p className="text-lg font-black uppercase">{order?.patientName || 'Clinical Record'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT: PRESCRIPTION ITEMS */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Pill size={16} className="text-primary" /> Prescribed Medications
          </h3>

          <div className="space-y-4">
            {order?.prescription?.map((rx: any, idx: number) => {
              const stockItem = inventorySnapshot?.find(item => item.name === rx.name);
              const isLowStock = !stockItem || stockItem.quantity < 20;

              return (
                <div key={idx} className="bg-card p-6 rounded-[32px] border-2 border-border shadow-sm flex flex-col md:flex-row justify-between gap-6 hover:border-primary/20 transition-all">
                  <div className="flex items-start gap-4">
                     <div className={`p-3 rounded-2xl ${isLowStock ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}`}>
                        <Package size={24} />
                     </div>
                     <div>
                        <p className="font-black text-card-foreground uppercase text-sm">{rx.name} ({rx.strength})</p>
                        <p className="text-[11px] font-bold text-primary mt-1 uppercase italic">{rx.dosage} • {rx.frequency} • {rx.duration}</p>
                        <div className="mt-3 flex items-center gap-2 bg-muted/50 p-2 rounded-xl border w-fit">
                           <Info size={12} className="text-muted-foreground" />
                           <p className="text-[10px] font-bold text-muted-foreground italic">"{rx.instructions || 'Take as directed'}"</p>
                        </div>
                     </div>
                  </div>

                  <div className="flex flex-col justify-center items-end border-l-0 md:border-l pl-0 md:pl-6 border-border min-w-[120px]">
                     <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Current Stock</p>
                     <p className={`text-xl font-black ${isLowStock ? 'text-destructive' : 'text-green-600'}`}>
                        {stockItem ? stockItem.quantity : '0'}
                     </p>
                     {isLowStock && <span className="text-[8px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase mt-1">Refill Soon</span>}
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
                   disabled={processing}
                   onClick={handleFinalizeDispensing}
                   className="w-full bg-primary text-primary-foreground py-5 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-3 hover:bg-primary/80 transition-all disabled:bg-muted"
                 >
                    {processing ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                    Complete & Issue Drugs
                 </Button>
              </div>

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
  );
}
