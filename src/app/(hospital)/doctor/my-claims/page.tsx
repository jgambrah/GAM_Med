'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { 
  Wallet, Clock, CheckCircle2, TrendingUp, 
  Banknote, ShieldCheck, Loader2, ShieldAlert,
  Calculator
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LocumMyClaims() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // Get full user profile for contractType
  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  
  const isLocum = userProfile?.contractType === 'LOCUM';
  const hospitalId = userProfile?.hospitalId;

  // Get salary profile for agreed rate
  const salaryProfileRef = useMemoFirebase(() => {
      if(!firestore || !hospitalId || !user) return null;
      return doc(firestore, `hospitals/${hospitalId}/salary_profiles`, user.uid);
  }, [firestore, hospitalId, user]);
  const { data: salaryProfile, isLoading: isSalaryLoading } = useDoc(salaryProfileRef);
  
  const agreedRate = salaryProfile?.basicSalary || 0;

  // Get all attendance logs for this user
  const shiftsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/attendance_logs`),
      where("staffId", "==", user.uid),
      orderBy("clockInTime", "desc")
    );
  }, [firestore, user?.uid, hospitalId]);

  const { data: shifts, isLoading: areShiftsLoading } = useCollection(shiftsQuery);

  const { pendingGHC, whtAmount, unpaidShiftsCount } = useMemo(() => {
    if (!shifts || agreedRate === 0) return { pendingGHC: 0, whtAmount: 0, unpaidShiftsCount: 0 };
    
    const unpaid = shifts.filter(s => s.paymentStatus === 'UNPAID');
    const gross = unpaid.length * agreedRate;
    const wht = gross * 0.075;
    
    return {
        pendingGHC: gross,
        whtAmount: wht,
        unpaidShiftsCount: unpaid.length
    }
  }, [shifts, agreedRate]);

  const isLoading = isAuthLoading || isProfileLoading || isSalaryLoading || areShiftsLoading;

  if (isLoading) return <div className="p-20 text-center font-black italic animate-pulse text-blue-600">Syncing Earnings...</div>;

  if (!isLocum) {
     return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">This portal is for Locum clinicians only.</p>
          <Button onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto text-black font-bold">
      <div className="bg-[#0f172a] p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12">
            <Banknote size={200} />
        </div>
        
        <div className="flex justify-between items-start mb-8 relative z-10">
           <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Total Pending Claim</p>
              <h1 className="text-5xl font-black italic tracking-tighter mt-1">₵ {pendingGHC.toLocaleString()}</h1>
           </div>
           <div className="bg-blue-600 p-4 rounded-3xl shadow-xl">
              <TrendingUp size={32} />
           </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 relative z-10 pt-6 border-t border-slate-800">
           <div>
              <p className="text-[9px] font-black uppercase text-slate-400">Net after 7.5% WHT</p>
              <p className="text-lg font-black text-blue-400">₵ {(pendingGHC - whtAmount).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
           </div>
           <div>
              <p className="text-[9px] font-black uppercase text-slate-400">Unpaid Shifts</p>
              <p className="text-lg font-black">{unpaidShiftsCount}</p>
           </div>
           <div className="hidden md:block">
              <p className="text-[9px] font-black uppercase text-slate-400">Agreed Rate</p>
              <p className="text-lg font-black text-green-400">₵ {agreedRate.toFixed(2)} / Shift</p>
           </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center px-2">
           <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Clock size={16} className="text-blue-600" /> Recent Shift History
           </h3>
           <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase italic">Last 30 Days</span>
        </div>

        <div className="bg-white rounded-[40px] border-2 border-slate-50 shadow-sm overflow-hidden divide-y-2 divide-slate-50">
          {shifts?.length === 0 ? (
             <div className="p-20 text-center text-slate-300 italic uppercase text-xs">No shifts recorded in the system.</div>
          ) : shifts?.map((s) => (
            <div key={s.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-blue-50/30 transition-all group">
               <div className="flex items-center gap-5">
                  <div className={`p-4 rounded-2xl ${s.paymentStatus === 'PAID' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                     {s.paymentStatus === 'PAID' ? <CheckCircle2 size={24}/> : <Clock size={24}/>}
                  </div>
                  <div>
                     <p className="font-black uppercase text-sm">{s.clockInTime?.toDate().toLocaleDateString('en-GB')} — {s.shiftName}</p>
                     <div className="flex gap-3 mt-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Clock size={10}/> {s.hoursWorked || 0} Hours</span>
                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1"><ShieldCheck size={10}/> Verified</span>
                     </div>
                  </div>
               </div>
               
               <div className="flex items-center gap-6 w-full md:w-auto justify-between border-t md:border-0 pt-4 md:pt-0">
                  <div className="text-right">
                     <p className="text-[9px] font-black text-slate-300 uppercase">Estimated Gross</p>
                     <p className="text-lg font-black">₵ {agreedRate.toFixed(2)}</p>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase italic ${s.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700 animate-pulse'}`}>
                     {s.paymentStatus === 'PAID' ? 'Payment Settled' : 'Payment Processing'}
                  </div>
               </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-8 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200 text-center">
         <div className="flex justify-center gap-2 text-slate-400 mb-4">
            <Calculator size={18} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Accounting Transparency</p>
         </div>
         <p className="text-xs font-bold text-slate-500 italic leading-relaxed max-w-2xl mx-auto">
            "Locum earnings are subject to a mandatory 7.5% Withholding Tax as per the Ghana Income Tax Act (896). 
            Your net payment is calculated after this deduction and is usually disbursed via the hospital's Monthly PV run."
         </p>
      </div>
    </div>
  );
}
