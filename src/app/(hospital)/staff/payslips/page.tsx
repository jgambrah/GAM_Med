'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { 
  Wallet, Download, Eye, TrendingUp, 
  ShieldCheck, Landmark, Receipt, Info,
  ChevronRight, Calendar, Printer, Loader2
} from 'lucide-react';
import { format } from 'date-fns';

export default function StaffPayslipPortal() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  
  const [selectedSlip, setSelectedSlip] = useState<any>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  const hospitalInfoRef = useMemoFirebase(() => {
      if(!firestore || !hospitalId) return null;
      return doc(firestore, "hospitals", hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospitalInfo, isLoading: isHospitalLoading } = useDoc(hospitalInfoRef);

  const payslipsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/payslips`),
      where("staffId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
  }, [firestore, user?.uid, hospitalId]);

  const { data: payslips, isLoading: arePayslipsLoading } = useCollection(payslipsQuery);

  useEffect(() => {
      if (payslips && payslips.length > 0 && !selectedSlip) {
          setSelectedSlip(payslips[0]);
      }
  }, [payslips, selectedSlip]);

  const isLoading = arePayslipsLoading || isHospitalLoading || isProfileLoading || isAuthLoading;
  
  if (isLoading) {
      return (
          <div className="flex h-full w-full items-center justify-center p-20">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="ml-4 italic text-muted-foreground">Fetching Your Payslips...</p>
        </div>
      )
  }

  if (!payslips || payslips.length === 0) return <div className="p-20 text-center font-black animate-pulse uppercase italic text-slate-400">Waiting for first Payroll Run...</div>;
  
  if (!selectedSlip && payslips && payslips.length > 0) {
      // This will cause a quick re-render to set the default slip
      setSelectedSlip(payslips[0]);
      return <div className="flex h-full w-full items-center justify-center p-20"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (!selectedSlip) return <div className="p-20 text-center font-black animate-pulse uppercase italic text-slate-400">No payslip selected.</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 text-card-foreground">
      {/* MOBILE-FIRST MONTH SELECTOR */}
      <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4" style={{scrollbarWidth: 'none'}}>
        {payslips.map(slip => (
          <button 
            key={slip.id}
            onClick={() => setSelectedSlip(slip)}
            className={`flex-shrink-0 px-6 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${selectedSlip.id === slip.id ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-blue-100' : 'bg-card border-border text-muted-foreground'}`}
          >
            {new Date(slip.createdAt?.toDate()).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-[40px] border-4 border-foreground shadow-2xl overflow-hidden print:border-0 print:shadow-none animate-in fade-in zoom-in duration-300">
        
        <div className="bg-foreground p-8 text-background">
          <div className="flex justify-between items-start mb-6">
            <div>
               <h2 className="text-2xl font-black uppercase tracking-tighter italic">{hospitalInfo?.name}</h2>
               <p className="text-[10px] font-bold text-primary/70 uppercase tracking-widest">Electronic Payslip • {hospitalId}</p>
            </div>
            <ShieldCheck className="text-primary opacity-50" size={32} />
          </div>
          
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-xl font-black italic">
                {user?.displayName?.[0]}
             </div>
             <div>
                <p className="text-xl font-black uppercase tracking-tight">{user?.displayName}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">{selectedSlip?.role} • ID: {user?.uid.slice(0,6)}</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-b">
           <div className="p-8 border-r bg-primary/5">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Net Take-Home Pay</p>
              <h3 className="text-4xl font-black text-primary tracking-tighter">₵ {selectedSlip.netSalary.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
           </div>
           <div className="p-8 flex flex-col justify-center">
              <div className="flex justify-between items-center mb-2">
                 <span className="text-[10px] font-black text-muted-foreground uppercase">Gross Salary</span>
                 <span className="font-bold text-card-foreground">₵ {selectedSlip.gross.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-destructive">
                 <span className="text-[10px] font-black uppercase">Total Deductions</span>
                 <span className="font-bold">(₵ {(selectedSlip.gross - selectedSlip.netSalary).toFixed(2)})</span>
              </div>
           </div>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
           <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-primary border-b pb-2 flex items-center gap-2">
                 <TrendingUp size={14}/> Monthly Earnings
              </h4>
              <div className="space-y-3">
                 <LineItem label="Basic Salary" value={selectedSlip.basic} />
                 <div className="p-3 bg-muted/50 rounded-xl">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Fixed Allowances</p>
                    <p className="text-sm font-black text-card-foreground">₵ {(selectedSlip.gross - selectedSlip.basic).toFixed(2)}</p>
                 </div>
              </div>
           </div>

           <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-destructive border-b pb-2 flex items-center gap-2">
                 <Landmark size={14}/> Statutory & Voluntary
              </h4>
              <div className="space-y-3">
                 <LineItem label="SSNIT (Employee 5.5%)" value={selectedSlip.ssnitEmployee} isDeduction />
                 <LineItem label="PAYE (Income Tax)" value={selectedSlip.paye} isDeduction />
                 <LineItem label="Other Deductions" value={selectedSlip.otherDeductions} isDeduction />
              </div>
           </div>
        </div>

        <div className="m-8 p-6 bg-foreground rounded-3xl text-white">
           <div className="flex items-center gap-3 mb-4">
              <Info size={18} className="text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest">Future Wealth Contribution</p>
           </div>
           <div className="grid grid-cols-2 gap-8">
              <div>
                 <p className="text-[9px] font-bold text-muted-foreground uppercase">Total SSNIT (Employer + You)</p>
                 <p className="text-lg font-black text-primary">₵ {(selectedSlip.basic * 0.185).toFixed(2)}</p>
              </div>
              <div className="text-right">
                 <p className="text-[9px] font-bold text-muted-foreground uppercase">Tier 2 (Occupational)</p>
                 <p className="text-lg font-black text-green-400">₵ {(selectedSlip.basic * 0.05).toFixed(2)}</p>
              </div>
           </div>
           <p className="text-[8px] text-muted-foreground/70 mt-4 italic">Note: These amounts are remitted directly to SSNIT and your Pension Fund Manager on your behalf.</p>
        </div>

        <div className="p-8 bg-muted/50 border-t flex justify-between items-center print:hidden">
           <p className="text-[9px] font-bold text-muted-foreground uppercase">Authorized by the Finance Office</p>
           <div className="flex gap-3">
              <Button onClick={() => window.print()} variant="outline" size="icon">
                 <Printer />
              </Button>
              <Button className="bg-foreground text-background">
                 <Download size={16} /> PDF Payslip
              </Button>
           </div>
        </div>
      </div>

      <p className="text-center text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
         Electronic Verification Hash: {selectedSlip.id.toUpperCase()}
      </p>
    </div>
  );
}

function LineItem({ label, value, isDeduction = false }: any) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-dashed border-border last:border-0">
       <span className="text-[11px] font-bold text-muted-foreground uppercase">{label}</span>
       <span className={`text-sm font-black ${isDeduction ? 'text-destructive' : 'text-card-foreground'}`}>
          {isDeduction ? '-' : ''}₵ {value.toFixed(2)}
       </span>
    </div>
  );
}
