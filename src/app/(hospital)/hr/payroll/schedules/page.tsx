'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { 
  FileText, Download, Printer, Landmark, ShieldCheck, 
  Loader2, ShieldAlert
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RemittanceSchedules() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const [selectedItem, setSelectedItem] = useState<string>('SSNIT');
  const [period, setPeriod] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'HR_MANAGER', 'ACCOUNTANT'].includes(userRole || '');

  const hospitalInfoRef = useMemoFirebase(() => {
      if(!firestore || !hospitalId) return null;
      return doc(firestore, "hospitals", hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospitalInfo, isLoading: isHospitalLoading } = useDoc(hospitalInfoRef);

  const deductionItemsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/payroll_items`), where("type", "==", "DEDUCTION"));
  }, [firestore, hospitalId]);
  const { data: deductionItems, isLoading: areItemsLoading } = useCollection(deductionItemsQuery);

  const payslipsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/payslips`), where("hospitalId", "==", hospitalId));
  }, [firestore, hospitalId]);
  const { data: payslipData, isLoading: areSlipsLoading } = useCollection(payslipsQuery);

  const scheduleData = useMemo(() => {
    if (!payslipData || !selectedItem) return [];

    if (selectedItem === 'SSNIT') {
        return payslipData.map(s => ({
            name: s.name || "Unknown Staff",
            staffId: s.staffId,
            staffNumber: s.staffNumber,
            ssnitNumber: s.ssnitNumber,
            basic: s.basic,
            employeeSsnit: s.basic * 0.055,
            employerSsnit: s.basic * 0.13,
            totalSsnit: s.basic * 0.185
        }));
    }

    if (selectedItem === 'PAYE') {
        return payslipData.map(s => ({
            name: s.name || "Unknown Staff",
            staffId: s.staffId,
            staffNumber: s.staffNumber,
            tinNumber: s.tinNumber,
            gross: s.gross,
            paye: s.paye,
            net: s.netSalary
        }));
    }

    // Generic deduction logic using STRICT MATCH
    return payslipData.map(slip => {
      const specificDeduction = (slip.deductions || []).find(
        (d: any) => d.label.trim() === selectedItem.trim()
      );

      if (!specificDeduction || specificDeduction.amount <= 0) return null;

      return {
        name: slip.name || "Unknown Staff",
        staffId: slip.staffId,
        staffNumber: slip.staffNumber,
        role: slip.role,
        amount: specificDeduction.amount
      };
    }).filter(Boolean); // Removes the nulls
  }, [payslipData, selectedItem]);

  const totalRemittance = useMemo(() => {
    if (!scheduleData || scheduleData.length === 0) return 0;
    
    switch (selectedItem) {
        case 'SSNIT':
            return scheduleData.reduce((acc, s) => acc + s.totalSsnit, 0);
        case 'PAYE':
            return scheduleData.reduce((acc, s) => acc + s.paye, 0);
        default:
            return scheduleData.reduce((acc, s) => acc + s.amount, 0);
    }
  }, [scheduleData, selectedItem]);


  const isLoading = isUserLoading || isProfileLoading || areItemsLoading || areSlipsLoading || isHospitalLoading;
  
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
            <Select onValueChange={setSelectedItem} defaultValue={selectedItem}>
                <SelectTrigger className="font-bold uppercase text-xs tracking-widest"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="SSNIT">SSNIT Contribution (18.5%)</SelectItem>
                    <SelectItem value="PAYE">GRA PAYE Tax</SelectItem>
                    {deductionItems?.map(item => (
                        <SelectItem key={item.id} value={item.label}>{item.label} ({item.category})</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[40px] border shadow-sm font-sans">
        <div className="text-center border-b-2 pb-6 mb-8">
           <h2 className="text-2xl font-black uppercase">{selectedItem} REMITTANCE SCHEDULE</h2>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">HOSPITAL ID: {hospitalId} • PERIOD: {new Date(period.year, period.month - 1).toLocaleString('en-GB', {month: 'long', year:'numeric'})}</p>
        </div>
        
        <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-white uppercase font-black tracking-widest">
                {selectedItem === 'SSNIT' ? (
                    <tr><th className="p-4 border">Staff Name</th><th className="p-4 border">SSNIT Number</th><th className="p-4 border">Basic Salary (GHS)</th><th className="p-4 border text-right">Total Payable (18.5%)</th></tr>
                ) : selectedItem === 'PAYE' ? (
                    <tr><th className="p-4 border">Staff Name</th><th className="p-4 border">TIN / GHA Card</th><th className="p-4 border">Gross Pay (GHS)</th><th className="p-4 border text-right">PAYE Tax (GHS)</th></tr>
                ) : (
                    <tr><th className="p-4 border">Staff Name</th><th className="p-4 border">Staff ID / Ref</th><th className="p-4 border text-right">Amount (GHS)</th></tr>
                )}
            </thead>
            <tbody className="divide-y border">
                {scheduleData.length === 0 ? (
                    <tr><td colSpan={selectedItem === 'SSNIT' ? 4 : (selectedItem === 'PAYE' ? 4 : 3)} className="p-10 text-center italic">No data for selected item and period.</td></tr>
                ) : scheduleData.map((s: any, i: number) => {
                    if (selectedItem === 'SSNIT') return (
                        <tr key={i} className="hover:bg-slate-50">
                            <td className="p-4 border uppercase font-bold">{s.name}</td>
                            <td className="p-4 border font-mono text-blue-600">{s.ssnitNumber || 'NOT SET'}</td>
                            <td className="p-4 border">GHS {s.basic.toFixed(2)}</td>
                            <td className="p-4 border text-right font-black">GHS {s.totalSsnit.toFixed(2)}</td>
                        </tr>
                    );
                    if (selectedItem === 'PAYE') return (
                         <tr key={i} className="hover:bg-slate-50">
                            <td className="p-4 border uppercase font-bold">{s.name}</td>
                            <td className="p-4 border font-mono text-blue-600">{s.tinNumber || 'NOT SET'}</td>
                            <td className="p-4 border">{s.gross.toFixed(2)}</td>
                            <td className="p-4 border text-right font-bold text-red-600">{s.paye.toFixed(2)}</td>
                         </tr>
                    );
                    // Default case for other deductions
                    return (
                         <tr key={i} className="hover:bg-slate-50">
                            <td className="p-4 border uppercase font-bold">{s.name}</td>
                            <td className="p-4 border text-blue-600 font-mono">{s.staffNumber || s.staffId.slice(0,8)}</td>
                            <td className="p-4 border text-right font-black">GHS {s.amount.toFixed(2)}</td>
                         </tr>
                    );
                })}
            </tbody>
            <tfoot className="bg-slate-100 font-black">
                <tr>
                    <td colSpan={selectedItem === 'SSNIT' || selectedItem === 'PAYE' ? 3 : 2} className="p-5 border uppercase">Schedule Total</td>
                    <td className="p-5 border text-right text-lg text-primary">GHS {totalRemittance.toFixed(2)}</td>
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
