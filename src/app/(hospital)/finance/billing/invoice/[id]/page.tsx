'use client';
import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
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

  // 1. Fetch Patient Info
  const patientRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !patientId) return null;
    return doc(firestore, 'hospitals', hospitalId, 'patients', patientId as string);
  }, [firestore, hospitalId, patientId]);
  const { data: patient, isLoading: isPatientLoading } = useDoc(patientRef);
  
  // 2. Fetch all billable service logs for this patient
  const labOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !patientId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/lab_orders`), where("patientId", "==", patientId));
  }, [firestore, hospitalId, patientId]);
  const { data: labOrders, isLoading: labsLoading } = useCollection(labOrdersQuery);

  const radiologyOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !patientId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/radiology_orders`), where("patientId", "==", patientId));
  }, [firestore, hospitalId, patientId]);
  const { data: radiologyOrders, isLoading: scansLoading } = useCollection(radiologyOrdersQuery);

  const procedureLogsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !patientId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/procedure_logs`), where("patientId", "==", patientId));
  }, [firestore, hospitalId, patientId]);
  const { data: procedureLogs, isLoading: proceduresLoading } = useCollection(procedureLogsQuery);

  const encountersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !patientId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/patients/${patientId}/encounters`), where("type", "==", "Consultation"));
  }, [firestore, hospitalId, patientId]);
  const { data: consultations, isLoading: consultationsLoading } = useCollection(encountersQuery);

  const generalServicesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/general_services`));
  }, [firestore, hospitalId]);
  const { data: generalServices, isLoading: servicesLoading } = useCollection(generalServicesQuery);

  // NEW: Fetch payers for receivable logic
  const payersQuery = useMemoFirebase(() => {
      if (!firestore || !hospitalId) return null;
      return query(collection(firestore, `hospitals/${hospitalId}/payers`));
  }, [firestore, hospitalId]);
  const { data: payers, isLoading: payersLoading } = useCollection(payersQuery);


  const { billItems, total } = useMemo(() => {
    const items: any[] = [];
    const consultationFee = generalServices?.find(s => s.category === 'CONSULTATION')?.price || 0;

    consultations?.forEach(c => items.push({ name: 'Doctor Consultation', price: consultationFee, type: 'Consultation' }));
    labOrders?.forEach(d => items.push({ name: d.testName, price: d.price, type: 'Laboratory' }));
    radiologyOrders?.forEach(d => items.push({ name: d.scanName, price: d.price, type: 'Imaging' }));
    procedureLogs?.forEach(d => items.push({ name: d.procedureName, price: d.serviceFee, type: 'Procedure' }));
    
    const totalAmount = items.reduce((acc, curr) => acc + (curr.price || 0), 0);
    return { billItems: items, total: totalAmount };
  }, [consultations, labOrders, radiologyOrders, procedureLogs, generalServices]);

  const handleRecordPayment = async () => {
    if (!hospitalId || !firestore || !user || !patient) {
      toast({ variant: "destructive", title: "System Error", description: "System not ready. Please re-login." });
      return;
    }
    if (billItems.length === 0) {
        toast({ variant: 'destructive', title: 'Empty Bill', description: 'Cannot process an empty bill.'});
        return;
    }
    
    setLoading(true);
    const batch = writeBatch(firestore);

    try {
      if (paymentMode === 'Cash' || paymentMode === 'MoMo') {
        // --- CASH PAYMENT LOGIC ---
        const paymentId = `REC-${Math.floor(100000 + Math.random() * 900000)}`;
        const paymentRef = doc(firestore, `hospitals/${hospitalId}/payments`, paymentId);
        batch.set(paymentRef, {
          paymentId: paymentId,
          patientId: patientId,
          patientName: `${patient.firstName} ${patient.lastName}`,
          totalAmount: total,
          paymentMode: paymentMode,
          hospitalId: hospitalId,
          processedBy: user.uid,
          processedByName: user.displayName || "Unknown Staff",
          createdAt: serverTimestamp(),
        });
        
        await batch.commit();
        toast({ title: "Payment Recorded", description: `GHS ${total.toFixed(2)} secured for ${patient.firstName}` });

      } else { // NHIS or other credit payment
        // --- DEBT CREATION LOGIC (ACCOUNTS RECEIVABLE) ---
        const payer = payers?.find(p => p.type === paymentMode); // Find by type, e.g. 'NHIS'
        
        if (!payer) {
          throw new Error(`Payer configuration for "${paymentMode}" not found. Please register it in the Payer Master.`);
        }

        // 1. Create the Receivable Document
        const arRef = doc(collection(firestore, `hospitals/${hospitalId}/receivables`));
        batch.set(arRef, {
          hospitalId: hospitalId,
          patientId: patientId,
          patientName: `${patient.firstName} ${patient.lastName}`,
          payerId: payer.id,
          payerName: payer.name,
          amount: total,
          status: 'UNPAID',
          createdAt: serverTimestamp()
        });

        // 2. Increment the Payer's Global Debt in the Registry
        const payerRef = doc(firestore, `hospitals/${hospitalId}/payers`, payer.id);
        batch.update(payerRef, {
          currentBalance: increment(total)
        });
        
        await batch.commit();
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

  const isLoading = isPatientLoading || labsLoading || scansLoading || proceduresLoading || consultationsLoading || servicesLoading || payersLoading;

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
      {/* INVOICE HEADER */}
      <div className="bg-card border-4 border-foreground p-10 rounded-[48px] shadow-sm flex justify-between items-center">
         <div>
            <div className="flex items-center gap-2 mb-4 text-primary">
               <FileText size={24} />
               <span className="text-xl font-black uppercase tracking-tighter">Master Invoice</span>
            </div>
            <p className="text-3xl font-black text-card-foreground uppercase tracking-tighter">{patient?.firstName} {patient?.lastName}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">EHR: {patient?.ehrNumber}</p>
         </div>
         <div className="text-right">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Invoice Date</p>
            <p className="text-lg font-black text-card-foreground uppercase">{new Date().toLocaleDateString('en-GB')}</p>
         </div>
      </div>

      {/* BILLING TABLE */}
      <div className="bg-card rounded-[32px] border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Service Description</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Category</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Amount (GHS)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {billItems.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center p-12 text-muted-foreground italic">No billable services recorded for this patient yet.</TableCell></TableRow>
            ) : billItems.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell className="p-4 font-bold uppercase text-card-foreground">{item.name}</TableCell>
                <TableCell className="p-4"><span className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase">{item.type}</span></TableCell>
                <TableCell className="p-4 text-right text-sm font-mono">{item.price?.toFixed(2)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-foreground/5">
              <TableCell colSpan={2} className="p-6 text-right text-sm font-black uppercase text-card-foreground">Grand Total</TableCell>
              <TableCell className="p-6 text-right text-2xl font-black text-primary">GHS {total.toFixed(2)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* PAYMENT METHODS & FINALIZATION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="bg-card p-8 rounded-[32px] border shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Select Payment Mode</h3>
            <div className="grid grid-cols-3 gap-3">
               <PaymentBtn icon={<Wallet size={20}/>} label="Cash" active={paymentMode === 'Cash'} onClick={() => setPaymentMode('Cash')} />
               <PaymentBtn icon={<CreditCard size={20}/>} label="MoMo" active={paymentMode === 'MoMo'} onClick={() => setPaymentMode('MoMo')} />
               <PaymentBtn icon={<Landmark size={20}/>} label="NHIS" active={paymentMode === 'NHIS'} onClick={() => setPaymentMode('NHIS')} />
            </div>
         </div>

         <div className="flex flex-col gap-3">
            <Button size="lg" className="h-auto py-5 bg-primary hover:bg-foreground text-primary-foreground rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3" onClick={handleRecordPayment} disabled={loading}>
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

function PaymentBtn({ icon, label, active, onClick }: any) {
  return (
    <div 
        onClick={onClick}
        className={`p-4 rounded-xl flex flex-col items-center gap-2 cursor-pointer transition-all border-2 ${active ? 'border-primary/50 bg-primary/10' : 'bg-muted/50 border-transparent hover:border-primary/20'}`}
    >
      {icon}
      <span className={`text-xs font-black uppercase text-center ${active ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
    </div>
  );
}
