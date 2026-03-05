'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { FileText, Download, Printer, Landmark, ShieldCheck, Loader2, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RemittanceSchedules() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [type, setType] = useState<string>('SSNIT');
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'HR_MANAGER', 'ACCOUNTANT'].includes(userRole);

  const payslipsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/payslips`));
  }, [firestore, hospitalId]);
  const { data: payslipData, isLoading: areSlipsLoading } = useCollection(payslipsQuery);

  const dynamicCategories = useMemo(() => {
    if (!payslipData) return [];
    const categories = new Set<string>();
    payslipData.forEach(slip => {
      (slip.deductions || []).forEach((ded: any) => {
        if (ded.category) {
          categories.add(ded.category);
        }
      });
    });
    return Array.from(categories);
  }, [payslipData]);

  const scheduleData = useMemo(() => {
    if (!payslipData || !type) return [];
    if (type === 'SSNIT' || type === 'PAYE') {
        return payslipData; // These apply to everyone
    }
    // For other types, filter and map to get specific deduction details
    return payslipData.map(slip => {
        const relevantDeductions = (slip.deductions || []).filter((d: any) => d.category === type);
        return relevantDeductions.length > 0 ? {
            staffName: slip.name,
            deductions: relevantDeductions
        } : null;
    }).filter(Boolean);

  }, [payslipData, type]);

  const totalRemittance = useMemo(() => {
    if (!scheduleData || scheduleData.length === 0) return 0;
    switch (type) {
        case 'SSNIT':
            return scheduleData.reduce((acc, s) => acc + (s.basic * 0.185), 0);
        case 'PAYE':
            return scheduleData.reduce((acc, s) => acc + s.paye, 0);
        default:
            return scheduleData.reduce((acc, s: any) => {
                const categoryTotal = (s?.deductions || []).reduce((dAcc: number, d: any) => dAcc + d.amount, 0);
                return acc + categoryTotal;
            }, 0);
    }
  }, [scheduleData, type]);


  const isLoading = isUserLoading || isProfileLoading || areSlipsLoading;
  
  if(isLoading) {
      return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

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
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-black font-bold">
      <div className="flex justify-between items-end border-b pb-6 print:hidden">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Remittance <span className="text-primary">Schedules</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Statutory and voluntary deduction reports.</p>
        </div>
        <div className="w-72">
            <Select onValueChange={setType} defaultValue={type}>
                <SelectTrigger className="font-bold uppercase text-xs tracking-widest"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="SSNIT">SSNIT Contribution (18.5%)</SelectItem>
                    <SelectItem value="PAYE">GRA PAYE Tax</SelectItem>
                    {dynamicCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat} Deductions</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[40px] border shadow-sm font-sans">
        <div className="text-center border-b-2 pb-6 mb-8">
           <h2 className="text-2xl font-black uppercase">{type} REMITTANCE SCHEDULE</h2>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">HOSPITAL ID: {hospitalId} • PERIOD: {new Date().toLocaleString('en-GB', {month: 'long', year:'numeric'})}</p>
        </div>
        
        <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-white uppercase font-black tracking-widest">
                {type === 'SSNIT' ? (
                    <tr><th className="p-4 border">Staff Name</th><th className="p-4 border">Basic Salary (GHS)</th><th className="p-4 border">Employee (5.5%)</th><th className="p-4 border">Employer (13%)</th><th className="p-4 border text-right">Total Payable</th></tr>
                ) : type === 'PAYE' ? (
                    <tr><th className="p-4 border">Staff Name</th><th className="p-4 border">Gross Pay (GHS)</th><th className="p-4 border">PAYE Tax (GHS)</th><th className="p-4 border text-right">Net Salary</th></tr>
                ) : (
                    <tr><th className="p-4 border">Staff Name</th><th className="p-4 border">Deduction Description</th><th className="p-4 border text-right">Amount (GHS)</th></tr>
                )}
            </thead>
            <tbody className="divide-y border">
                {(scheduleData || []).map((s: any, i: number) => {
                    if (type === 'SSNIT') return (
                        <tr key={i} className="hover:bg-slate-50"><td className="p-4 border uppercase font-bold">{s.name}</td><td className="p-4 border">GHS {s.basic.toFixed(2)}</td><td className="p-4 border">{(s.basic * 0.055).toFixed(2)}</td><td className="p-4 border">{(s.basic * 0.13).toFixed(2)}</td><td className="p-4 border text-right font-black">GHS {(s.basic * 0.185).toFixed(2)}</td></tr>
                    );
                    if (type === 'PAYE') return (
                         <tr key={i} className="hover:bg-slate-50"><td className="p-4 border uppercase font-bold">{s.name}</td><td className="p-4 border">{s.gross.toFixed(2)}</td><td className="p-4 border text-red-600">{s.paye.toFixed(2)}</td><td className="p-4 border text-right font-black">GHS {s.netSalary.toFixed(2)}</td></tr>
                    );
                    return s.deductions?.map((d: any, dIdx: number) => (
                         <tr key={`${i}-${dIdx}`} className="hover:bg-slate-50"><td className="p-4 border uppercase font-bold">{s.staffName}</td><td className="p-4 border">{d.label}</td><td className="p-4 border text-right font-black">GHS {d.amount.toFixed(2)}</td></tr>
                    ));
                })}
            </tbody>
            <tfoot className="bg-slate-100 font-black">
                <tr>
                    <td colSpan={type === 'SSNIT' ? 2 : type === 'PAYE' ? 2 : 2} className="p-5 border uppercase">Schedule Total</td>
                    <td colSpan={type === 'SSNIT' ? 3 : type === 'PAYE' ? 2 : 1} className="p-5 border text-right text-lg text-primary">GHS {totalRemittance.toFixed(2)}</td>
                </tr>
            </tfoot>
        </table>

         <div className="mt-20 flex justify-between print:hidden">
           <button onClick={() => window.print()} className="bg-black text-white px-10 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2">
              <Printer size={16}/> Print for Institutional Submission
           </button>
        </div>
      </div>
    </div>
  );
}

    