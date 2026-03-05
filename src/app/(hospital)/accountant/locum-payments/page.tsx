'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { UserCheck, Wallet, Loader2, ShieldAlert, Banknote, Calendar, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function LocumPaymentEngine() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [processingId, setProcessingId] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  
  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'HR_MANAGER'].includes(userRole || '');

  // 1. Fetch unpaid locum attendance logs
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/attendance_logs`), 
      where("contractType", "==", "LOCUM"),
      where("paymentStatus", "==", "UNPAID")
    );
  }, [firestore, hospitalId]);
  const { data: unpaidLogs, isLoading: logsLoading } = useCollection(attendanceQuery);

  // 2. Fetch salary profiles
  const salariesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/salary_profiles`));
  }, [firestore, hospitalId]);
  const { data: salaryProfiles, isLoading: salariesLoading } = useCollection(salariesQuery);
  
  // 3. Process and group the data
  const locumPayrollData = useMemo(() => {
    if (!unpaidLogs || !salaryProfiles) return [];
    
    const logsByStaff = unpaidLogs.reduce((acc, log) => {
      const staffId = log.staffId;
      if (!acc[staffId]) {
        acc[staffId] = [];
      }
      acc[staffId].push(log);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.entries(logsByStaff).map(([staffId, shifts]) => {
      const staffName = shifts[0]?.staffName || 'Unknown Locum';
      const salaryInfo = salaryProfiles.find(p => p.staffId === staffId);
      const agreedRate = salaryInfo?.basicSalary || 0; // Use basicSalary as per-shift rate
      const totalOwed = shifts.length * agreedRate;
      
      return {
        staffId,
        staffName,
        shifts,
        agreedRate,
        totalOwed
      };
    });
  }, [unpaidLogs, salaryProfiles]);

  const processLocumPay = async (locumData: any) => {
    if (!firestore || !user || !hospitalId) {
      toast({ variant: 'destructive', title: "System not ready." });
      return;
    }
    setProcessingId(locumData.staffId);
    
    const batch = writeBatch(firestore);
    
    const grossAmount = locumData.totalOwed;
    const whtAmount = grossAmount * 0.075; // 7.5% Professional Service WHT
    const netAmount = grossAmount - whtAmount;
    
    const pvNumber = `PV-LOCUM-${Date.now().toString().slice(-5)}`;

    try {
      // 1. Create the Payment Voucher (Handshake with Finance)
      const pvRef = doc(collection(firestore, `hospitals/${hospitalId}/payment_vouchers`));
      batch.set(pvRef, {
        pvNumber,
        payee: locumData.staffName,
        narration: `Payment for ${locumData.shifts.length} Locum shifts in ${new Date().toLocaleString('en-GB', {month: 'long', year: 'numeric'})}`,
        grossAmount,
        whtRate: 0.075,
        whtAmount,
        netAmount,
        debitAccountId: '5001', // Standard Salaries Expense Account
        creditAccountId: '1000', // Standard Bank/Cash Account
        hospitalId: hospitalId,
        status: 'PENDING_APPROVAL',
        processedBy: user.uid,
        processedByName: user.displayName,
        createdAt: serverTimestamp()
      });

      // 2. Mark those specific shifts as PAID to prevent double-claiming
      locumData.shifts.forEach((s: any) => {
        const shiftRef = doc(firestore, `hospitals/${hospitalId}/attendance_logs`, s.id);
        batch.update(shiftRef, { paymentStatus: 'PAID', pvReference: pvNumber });
      });

      await batch.commit();
      toast({ title: "Locum PV Generated", description: `Deducted 7.5% WHT for ${locumData.staffName}. Awaiting Director approval.` });
    } catch (e: any) { 
      toast({ variant: 'destructive', title: 'PV Generation Failed', description: e.message });
    } finally {
      setProcessingId(null);
    }
  };


  const pageIsLoading = isUserLoading || isProfileLoading;
  if (pageIsLoading) return <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin h-16 w-16" /></div>;

  if (!isAuthorized) {
    return (
     <div className="flex flex-1 items-center justify-center bg-background p-4">
       <div className="text-center">
         <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
         <h1 className="text-2xl font-bold">Access Denied</h1>
         <p className="text-muted-foreground">You are not authorized for this module.</p>
         <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
       </div>
     </div>
   );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Locum <span className="text-primary">Payments</span></h1>
          <p className="text-muted-foreground font-medium">Consolidate unpaid shifts and generate compliant payment vouchers.</p>
        </div>
      </div>

      <div className="space-y-6">
        {logsLoading || salariesLoading ? (
            <div className="text-center p-20"><Loader2 className="animate-spin text-primary" /></div>
        ) : locumPayrollData.length === 0 ? (
            <div className="text-center p-20 bg-card rounded-2xl border-2 border-dashed">
                <CheckCircle2 className="mx-auto text-green-500 mb-2" size={32}/>
                <p className="font-bold text-muted-foreground">All locum claims are settled.</p>
            </div>
        ) : (
            locumPayrollData.map(locum => (
                <div key={locum.staffId} className="bg-card p-6 rounded-[32px] border shadow-sm">
                    <div className="flex justify-between items-center border-b pb-4 mb-4">
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/10 text-primary p-3 rounded-2xl"><UserCheck size={24}/></div>
                            <div>
                                <h3 className="text-xl font-black uppercase text-card-foreground">{locum.staffName}</h3>
                                <p className="text-xs font-bold text-muted-foreground">{locum.shifts.length} Unpaid Shifts @ ₵{locum.agreedRate}/shift</p>
                            </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xs font-bold text-muted-foreground">Gross Payable</p>
                           <p className="text-2xl font-black text-primary">₵{locum.totalOwed.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs mb-4">
                       {locum.shifts.slice(0, 8).map((s: any) => (
                           <div key={s.id} className="bg-muted/50 p-2 rounded-lg">
                              <p className="font-bold">{s.clockInTime ? format(s.clockInTime.toDate(), 'do MMM') : 'N/A'}</p>
                              <p className="text-muted-foreground">{s.shiftName}</p>
                           </div>
                       ))}
                    </div>
                     <Button 
                        onClick={() => processLocumPay(locum)} 
                        disabled={processingId === locum.staffId}
                        className="w-full bg-foreground hover:bg-primary text-background font-bold uppercase text-[10px] tracking-widest"
                    >
                        {processingId === locum.staffId ? <Loader2 className="animate-spin" /> : <><Banknote size={16}/> Generate Payment Voucher</>}
                    </Button>
                </div>
            ))
        )}
      </div>
    </div>
  );
}
