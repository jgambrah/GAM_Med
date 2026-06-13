'use client';
import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, writeBatch, serverTimestamp, increment, runTransaction, getDocs } from 'firebase/firestore';
import { Receipt, CreditCard, Wallet, Landmark, Printer, CheckCircle2, Loader2, User, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function PatientInvoicePage() {
  const { id: patientId } = useParams();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState('Cash');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, 'hospitals', hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospital, isLoading: isHospitalLoading } = useDoc(hospitalRef);

  // 1. Fetch Patient Info
  const patientRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !patientId) return null;
    return doc(firestore, 'hospitals', hospitalId, 'patients', patientId as string);
  }, [firestore, hospitalId, patientId]);
  const { data: patient, isLoading: isPatientLoading } = useDoc(patientRef);

  // 1b. Fetch Mortuary Record (if applicable)
  const mortuaryRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !patientId) return null;
    return doc(firestore, 'hospitals', hospitalId, 'mortuary_records', patientId as string);
  }, [firestore, hospitalId, patientId]);
  const { data: mortuaryRecord, isLoading: isMortuaryLoading } = useDoc(mortuaryRef);
  
  // 2. Fetch all UNPAID billable items for this patient
  const billingItemsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !patientId) return null;
    return query(
        collection(firestore, `hospitals/${hospitalId}/billing_items`), 
        where("patientId", "==", patientId),
        where("status", "==", "UNPAID")
    );
  }, [firestore, hospitalId, patientId]);
  const { data: billItems, isLoading: itemsLoading } = useCollection(billingItemsQuery);

  const payersQuery = useMemoFirebase(() => {
      if (!firestore || !hospitalId) return null;
      return query(collection(firestore, `hospitals/${hospitalId}/payers`));
  }, [firestore, hospitalId]);
  const { data: payers, isLoading: payersLoading } = useCollection(payersQuery);


  const total = useMemo(() => {
    if (!billItems) return 0;
    return billItems.reduce((acc, curr) => acc + (curr.total || 0), 0);
  }, [billItems]);

  const handleRecordPayment = async () => {
    if (!hospitalId || !firestore || !user || (!patient && !mortuaryRecord) || !billItems) {
      toast({ variant: "destructive", title: "System Error", description: "System not ready. Please re-login." });
      return;
    }
    if (billItems.length === 0) {
        toast({ variant: 'destructive', title: 'Empty Bill', description: 'Cannot process an empty bill.'});
        return;
    }
    
    setLoading(true);

    try {
      let resolvedChamberId = mortuaryRecord?.chamberId;

      // Dynamic lookup fallback if chamberId is missing on the record
      if (mortuaryRecord && !resolvedChamberId) {
        const chambersRef = collection(firestore, `hospitals/${hospitalId}/mortuary_chambers`);
        const q = query(chambersRef, where("bodyId", "==", patientId as string));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          resolvedChamberId = qSnap.docs[0].id;
        }
      }

      const displayName = patient 
          ? `${patient.firstName} ${patient.lastName}` 
          : (mortuaryRecord ? `Family of ${mortuaryRecord.bodyName}` : 'Unknown Recipient');

      if (paymentMode === 'Cash' || paymentMode === 'MoMo') {
        const hospitalDocRef = doc(firestore, "hospitals", hospitalId);
        await runTransaction(firestore, async (transaction) => {
            const hospitalDoc = await transaction.get(hospitalDocRef);
            if (!hospitalDoc.exists()) throw new Error("Hospital document not found.");
            
            const hData = hospitalDoc.data();
            const prefix = hData?.mrnPrefix || 'GAM';
            const currentReceiptCount = (hData?.receiptCounter || 0) + 1;
            const year = new Date().getFullYear().toString().slice(-2);
            const paymentId = `${prefix}-REC-${year}-${currentReceiptCount.toString().padStart(4, '0')}`;

            const paymentRef = doc(firestore, `hospitals/${hospitalId}/payments`, paymentId);
            transaction.set(paymentRef, {
                paymentId: paymentId,
                patientId: patientId,
                patientName: displayName,
                totalAmount: total,
                paymentMode: paymentMode,
                hospitalId: hospitalId,
                processedBy: user.uid,
                processedByName: user.displayName || "Unknown Staff",
                createdAt: serverTimestamp(),
            });

            // Mark all billed items as PAID
            billItems.forEach(item => {
                const itemRef = doc(firestore, `hospitals/${hospitalId}/billing_items`, item.id);
                transaction.update(itemRef, { status: 'PAID', paymentId: paymentId });
            });

            // If it is a mortuary record, finalize the release and free the chamber
            if (mortuaryRecord) {
              const recordRef = doc(firestore, `hospitals/${hospitalId}/mortuary_records`, patientId as string);
              transaction.update(recordRef, {
                status: 'RELEASED',
                releasedAt: serverTimestamp(),
              });

              if (resolvedChamberId) {
                const chamberRef = doc(firestore, `hospitals/${hospitalId}/mortuary_chambers`, resolvedChamberId);
                transaction.update(chamberRef, {
                  status: 'AVAILABLE',
                  bodyId: null,
                  bodyName: null,
                  admittedAt: null,
                });
              }
            }

            transaction.update(hospitalDocRef, { receiptCounter: increment(1) });
        });
        
        toast({ title: "Payment Recorded", description: `GHS ${total.toFixed(2)} secured for ${displayName}` });

      } else { // NHIS or other credit payment
        const payer = payers?.find(p => p.type === paymentMode);
        if (!payer) {
          throw new Error(`Payer configuration for "${paymentMode}" not found. Please register it in the Payer Master.`);
        }
        
        await runTransaction(firestore, async (transaction) => {
          const payerRef = doc(firestore, `hospitals/${hospitalId}/payers`, payer.id);
          const arRef = doc(collection(firestore, `hospitals/${hospitalId}/receivables`));
          
          // 1. Create the Receivable Document
          transaction.set(arRef, {
            hospitalId: hospitalId,
            patientId: patientId,
            patientName: displayName,
            payerId: payer.id,
            payerName: payer.name,
            amount: total,
            status: 'UNPAID',
            createdAt: serverTimestamp()
          });

          // 2. Increment the Payer's Global Debt in the Registry
          transaction.update(payerRef, {
            currentBalance: increment(total)
          });
          
          // 3. Mark all billed items as PAID
          billItems.forEach(item => {
              const itemRef = doc(firestore, `hospitals/${hospitalId}/billing_items`, item.id);
              transaction.update(itemRef, { status: 'PAID', paymentId: arRef.id });
          });

          // If it is a mortuary record, finalize the release and free the chamber
          if (mortuaryRecord) {
            const recordRef = doc(firestore, `hospitals/${hospitalId}/mortuary_records`, patientId as string);
            transaction.update(recordRef, {
              status: 'RELEASED',
              releasedAt: serverTimestamp(),
            });

            if (resolvedChamberId) {
              const chamberRef = doc(firestore, `hospitals/${hospitalId}/mortuary_chambers`, resolvedChamberId);
              transaction.update(chamberRef, {
                status: 'AVAILABLE',
                bodyId: null,
                bodyName: null,
                admittedAt: null,
              });
            }
          }
        });
        
        toast({ title: "Receivable Created", description: `GHS ${total.toFixed(2)} debt recorded for ${payer.name}.` });
      }

      // Common success path
      setTimeout(() => router.push('/finance/billing'), 2000);

    } catch (error: any) {
      console.error("FINANCE_FAILURE:", error);
      toast({ variant: "destructive", title: "Transaction Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isLoading = isPatientLoading || isMortuaryLoading || itemsLoading || payersLoading || isHospitalLoading;

  if (isLoading) {
    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <Skeleton className="h-48 w-full rounded-[48px]" />
            <Skeleton className="h-64 w-full rounded-[32px]" />
            <div className="grid grid-cols-2 gap-8">
                <Skeleton className="h-40 w-full rounded-[32px]" />
                <Skeleton className="h-40 w-full rounded-[32px]" />
            </div>
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />
      {/* INVOICE HEADER */}
      <div 
        className="p-10 rounded-[48px] shadow-lg flex flex-col md:flex-row justify-between gap-6 text-white"
        style={{ backgroundColor: hospital?.primaryColor || '#0f172a' }}
      >
         <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
               <FileText size={24} className="text-white" />
               <span className="text-xl font-black uppercase tracking-tighter text-white">
                  {hospital?.name || 'Master Invoice'}
               </span>
            </div>
            <p className="text-[10px] text-white/85 font-bold uppercase tracking-widest leading-relaxed">
               {hospital?.address || 'Physical Address Not Configured'}<br />
               {hospital?.location || 'City/Town'}, {hospital?.region || 'Region'}<br />
               Phone: {hospital?.phone || 'N/A'} | Email: {hospital?.email || 'N/A'}
               {hospital?.website && <><br /><span className="font-extrabold text-white underline">{hospital.website}</span></>}
            </p>
         </div>
         <div className="md:text-right flex flex-col md:items-end justify-between">
            <div>
               <p className="text-[10px] font-black text-white/75 uppercase tracking-widest">Billing Details</p>
               <p className="text-2xl font-black text-white uppercase tracking-tighter mt-1">
                 {patient ? `${patient.firstName} ${patient.lastName}` : (mortuaryRecord ? `Family of ${mortuaryRecord.bodyName}` : 'Unknown Recipient')}
               </p>
               <p className="text-[9px] font-bold text-white/80 uppercase tracking-widest mt-0.5">
                 {patient ? `EHR: ${patient.ehrNumber}` : (mortuaryRecord ? `MORTUARY: ${mortuaryRecord.bodyId}` : '')}
               </p>
            </div>
            <div className="mt-4 md:mt-0">
               <p className="text-[10px] font-black text-white/75 uppercase tracking-widest">Invoice Date</p>
               <p className="text-sm font-black text-white uppercase mt-0.5">{new Date().toLocaleDateString('en-GB')}</p>
            </div>
         </div>
      </div>

      {/* BILLING TABLE */}
      <div className="bg-card rounded-[32px] border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow 
              className="hover:bg-transparent"
              style={{ backgroundColor: `${hospital?.secondaryColor || '#2563eb'}1a` }}
            >
              <TableHead 
                className="p-4 text-[10px] font-black uppercase tracking-widest"
                style={{ color: hospital?.secondaryColor || '#2563eb' }}
              >
                Service Description
              </TableHead>
              <TableHead 
                className="p-4 text-[10px] font-black uppercase tracking-widest"
                style={{ color: hospital?.secondaryColor || '#2563eb' }}
              >
                Category
              </TableHead>
              <TableHead 
                className="p-4 text-[10px] font-black uppercase tracking-widest text-right"
                style={{ color: hospital?.secondaryColor || '#2563eb' }}
              >
                Amount (GHS)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!billItems || billItems.length === 0) ? (
                <TableRow><TableCell colSpan={3} className="text-center p-12 text-muted-foreground italic">No billable services recorded for this patient yet.</TableCell></TableRow>
            ) : billItems.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell className="p-4 font-bold uppercase text-card-foreground">{item.description}</TableCell>
                <TableCell className="p-4">
                  <span 
                    className="text-[10px] font-black px-3 py-1 rounded-full uppercase"
                    style={{ 
                      backgroundColor: `${hospital?.secondaryColor || '#2563eb'}1a`, 
                      color: hospital?.secondaryColor || '#2563eb' 
                    }}
                  >
                    {item.category}
                  </span>
                </TableCell>
                <TableCell className="p-4 text-right text-sm font-mono">{item.total?.toFixed(2)}</TableCell>
              </TableRow>
            ))}
            <TableRow style={{ backgroundColor: `${hospital?.secondaryColor || '#2563eb'}0a` }}>
              <TableCell colSpan={2} className="p-6 text-right text-sm font-black uppercase text-card-foreground font-black">Grand Total</TableCell>
              <TableCell className="p-6 text-right text-2xl font-black" style={{ color: hospital?.primaryColor || '#0f172a' }}>GHS {total.toFixed(2)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* PAYMENT METHODS & FINALIZATION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 no-print">
         <div className="bg-card p-8 rounded-[32px] border shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Select Payment Mode</h3>
            <div className="grid grid-cols-3 gap-3">
               <PaymentBtn icon={<Wallet size={20}/>} label="Cash" active={paymentMode === 'Cash'} onClick={() => setPaymentMode('Cash')} secondaryColor={hospital?.secondaryColor} />
               <PaymentBtn icon={<CreditCard size={20}/>} label="MoMo" active={paymentMode === 'MoMo'} onClick={() => setPaymentMode('MoMo')} secondaryColor={hospital?.secondaryColor} />
               <PaymentBtn icon={<Landmark size={20}/>} label="NHIS" active={paymentMode === 'NHIS'} onClick={() => setPaymentMode('NHIS')} secondaryColor={hospital?.secondaryColor} />
            </div>
         </div>

         <div className="flex flex-col gap-3">
            <Button 
               size="lg" 
               className="h-auto py-5 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 hover:brightness-95 hover:bg-black transition-all" 
               onClick={handleRecordPayment} 
               disabled={loading}
               style={{ backgroundColor: hospital?.primaryColor || '#0f172a' }}
            >
               {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />} Record Payment & Close File
            </Button>
            <Button size="lg" variant="outline" className="h-auto py-5 bg-card hover:bg-muted border-2 border-foreground/20 text-foreground rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3" onClick={handlePrint}>
               <Printer size={18} /> Print Official Receipt
            </Button>
         </div>
      </div>
    </div>
  );
}

function PaymentBtn({ icon, label, active, onClick, secondaryColor }: any) {
  return (
    <div 
        onClick={onClick}
        className={`p-4 rounded-xl flex flex-col items-center gap-2 cursor-pointer transition-all border-2`}
        style={active ? {
          borderColor: `${secondaryColor || '#2563eb'}80`,
          backgroundColor: `${secondaryColor || '#2563eb'}1a`
        } : {
          backgroundColor: 'rgb(241 245 249 / 0.5)',
          borderColor: 'transparent'
        }}
    >
      {icon}
      <span className="text-xs font-black uppercase text-center" style={active ? { color: secondaryColor || '#2563eb' } : { color: 'rgb(100 116 139)' }}>{label}</span>
    </div>
  );
}
