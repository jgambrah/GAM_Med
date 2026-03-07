'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc, writeBatch, serverTimestamp, increment, runTransaction } from 'firebase/firestore';
import { 
  Play, CheckCircle2, FileText, AlertCircle, 
  Loader2, Calculator, Calendar, Download, Save, ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { calculatePAYE, getProRataMultiplier } from '@/lib/payroll';

export default function PayrollRunEnginePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [payrollData, setPayrollData] = useState<any[]>([]);
  
  const [period, setPeriod] = useState({
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  });

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'HR_MANAGER'].includes(userRole);


  const initializeRun = async () => {
    if (!firestore || !hospitalId) {
      toast({ variant: 'destructive', title: 'System not ready.' });
      return;
    }
    setLoading(true);
    try {
      const configRef = doc(firestore, "hospitals", hospitalId, "payroll_config", "main");
      const profilesQuery = query(collection(firestore, "hospitals", hospitalId, "salary_profiles"), where("hospitalId", "==", hospitalId));
      const staffQuery = query(collection(firestore, "users"), where("hospitalId", "==", hospitalId), where("is_active", "==", true));

      const [configSnap, profilesSnap, staffSnap] = await Promise.all([
        getDoc(configRef),
        getDocs(profilesQuery),
        getDocs(staffQuery)
      ]);

      if (!configSnap.exists()) {
        throw new Error("Payroll configuration not found for this hospital.");
      }
      const statutory = configSnap.data();
      
      const staffMap = new Map(staffSnap.docs.map(d => [d.id, d.data()]));
      
      const results = profilesSnap.docs.map(doc => {
        const profile = doc.data();
        const staff = staffMap.get(profile.staffId) as any;
        if (!staff) return null;

        const multiplier = getProRataMultiplier(staff.createdAt, period.month, period.year);
        
        const basic = (profile.basicSalary || 0) * multiplier;
        const totalAllowances = (profile.allowances || []).reduce((sum: number, a: any) => sum + (a.amount * multiplier), 0);
        const gross = basic + totalAllowances;
        
        const ssnitEmployee = basic * (statutory?.ssnitEmployeeRate / 100 || 0.055);
        const taxableIncome = gross - ssnitEmployee;
        
        const paye = calculatePAYE(taxableIncome, statutory?.payeBrackets || []);
        
        const voluntaryDeductions = profile.deductions || [];
        const voluntaryDeductionsTotal = voluntaryDeductions.reduce((sum: number, d: any) => sum + d.amount, 0);

        const totalDeductions = ssnitEmployee + paye + voluntaryDeductionsTotal;
        const netSalary = gross - totalDeductions;

        return {
          staffId: staff.uid,
          name: staff.fullName,
          role: staff.role,
          basic,
          gross,
          ssnitEmployee,
          paye,
          deductions: voluntaryDeductions,
          netSalary,
          multiplier,
          bankName: staff.bankName,
          accountNumber: staff.accountNumber,
          branchCode: staff.branchCode,
        };
      }).filter(Boolean);

      setPayrollData(results as any[]);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Initialization Failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const exportToBankFile = () => {
    if (payrollData.length === 0) return;
  
    const headers = ["Employee Name", "Bank Name", "Account Number", "Branch Code", "Net Salary (GHS)"];
    
    const rows = payrollData.map(p => [
      p.name,
      p.bankName || "Commercial Bank", 
      p.accountNumber || "0000000000000",
      p.branchCode || "000",
      p.netSalary.toFixed(2)
    ]);
  
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BANK_TRANSFER_FILE_${period.month + 1}_${period.year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Bank Transfer File Generated", description: "You can now upload this to your banking portal." });
  };

  const commitPayroll = async () => {
    if (!firestore || !user || !hospitalId || payrollData.length === 0) {
      toast({ variant: 'destructive', title: "Cannot process empty payroll."});
      return;
    };
    setProcessing(true);
    const batch = writeBatch(firestore);
    const periodId = `${period.year}-${String(period.month + 1).padStart(2, '0')}`;

    try {
      // 1. Calculate Totals for Posting
      const totalGross = payrollData.reduce((a, b) => a + b.gross, 0);
      const totalNet = payrollData.reduce((a, b) => a + b.netSalary, 0);
      const totalPaye = payrollData.reduce((a, b) => a + b.paye, 0);
      const totalSsnit = payrollData.reduce((a, b) => a + (b.basic * 0.185), 0);
      const totalEmployerSsnit = payrollData.reduce((a, b) => a + (b.basic * 0.13), 0);
      
      // 2. Create the MASTER ARCHIVE Document
      const archiveRef = doc(collection(firestore, `hospitals/${hospitalId}/payroll_archives`));
      batch.set(archiveRef, {
        hospitalId: hospitalId,
        period: periodId,
        processedBy: user?.uid,
        processedByName: user?.displayName,
        totalNet: totalNet,
        totalGross: totalGross,
        totalTax: totalPaye,
        fullData: payrollData,
        status: 'POSTED',
        createdAt: serverTimestamp(),
      });


      const apCollection = collection(firestore, `hospitals/${hospitalId}/accounts_payable`);
      // 3. CREATE ACCOUNTS PAYABLE RECORDS
      batch.set(doc(apCollection), {
        supplierName: "STAFF SALARIES (MONTHLY)",
        amountOwed: totalNet, category: "PAYROLL", status: 'UNPAID', hospitalId: hospitalId,
        description: `Payroll Net Payable for ${periodId}`, createdAt: serverTimestamp()
      });
      batch.set(doc(apCollection), {
        supplierName: "GHANA REVENUE AUTHORITY (PAYE)",
        amountOwed: totalPaye, category: "STATUTORY", status: 'UNPAID', hospitalId: hospitalId,
        description: `PAYE Deductions for ${periodId}`, createdAt: serverTimestamp()
      });
      batch.set(doc(apCollection), {
        supplierName: "SSNIT (TIER 1 & 2)",
        amountOwed: totalSsnit, category: "STATUTORY", status: 'UNPAID', hospitalId: hospitalId,
        description: `Total SSNIT Contributions (18.5%) for ${periodId}`, createdAt: serverTimestamp()
      });

      // 4. LEDGER POSTING
      const salariesExpenseQuery = query(collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`), where("accountCode", "==", "5001"));
      const expenseSnap = await getDocs(salariesExpenseQuery);
      if (!expenseSnap.empty) {
          batch.update(expenseSnap.docs[0].ref, {
              currentBalance: increment(totalGross + totalEmployerSsnit)
          });
      }

      // 5. Create Main Run Document (Summary)
      const runId = `PAY-${periodId}`;
      const runRef = doc(firestore, "hospitals", hospitalId, "payroll_runs", runId);
      batch.set(runRef, {
        hospitalId: hospitalId, month: period.month + 1, year: period.year,
        totalNet: totalNet, status: 'POSTED', createdAt: serverTimestamp(), processedBy: user?.uid
      });

      // 6. Finalize individual slips
      payrollData.forEach(slip => {
         const slipRef = doc(collection(firestore, "hospitals", hospitalId, "payslips"));
         // By explicitly setting fields, we ensure data integrity for each payslip.
         batch.set(slipRef, {
            runId: runId,
            hospitalId: hospitalId,
            createdAt: serverTimestamp(),
            staffId: slip.staffId,
            name: slip.name,
            role: slip.role,
            basic: slip.basic,
            gross: slip.gross,
            ssnitEmployee: slip.ssnitEmployee,
            paye: slip.paye,
            deductions: slip.deductions || [], // Ensure it's always an array
            netSalary: slip.netSalary,
            multiplier: slip.multiplier,
            bankName: slip.bankName || 'N/A',
            accountNumber: slip.accountNumber || 'N/A',
            branchCode: slip.branchCode || 'N/A'
         });
      });

      await batch.commit();
      toast({ title: "Payroll Finalized and Archived for Audit." });
      setPayrollData([]);
    } catch (e: any) { 
        toast({ variant: 'destructive', title: "Payroll Commit Failed", description: e.message });
    }
    setProcessing(false);
  };
  
  const pageIsLoading = isUserLoading || isProfileLoading;
  if (pageIsLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin"/></div>
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
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-end border-b pb-6 gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Payroll <span className="text-primary">Run Engine</span></h1>
          <p className="text-muted-foreground font-bold text-xs uppercase italic">Process monthly clinical compensation with pro-rata intelligence.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-card p-4 rounded-3xl border shadow-sm">
           <select className="bg-muted p-2 rounded-xl text-xs" value={period.month} onChange={e => setPeriod({...period, month: Number(e.target.value)})}>
              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => <option key={i} value={i}>{m}</option>)}
           </select>
           <Button onClick={initializeRun} disabled={loading} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-foreground transition-all">
              {loading ? <Loader2 className="animate-spin" /> : <Calculator size={14}/>} Initialize Run
           </Button>
        </div>
      </div>

      {payrollData.length > 0 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <SummaryCard label="Total Net Payable" value={`GHS ${payrollData.reduce((a,b) => a + b.netSalary, 0).toLocaleString()}`} color="blue" />
             <SummaryCard label="Total PAYE Tax" value={`GHS ${payrollData.reduce((a,b) => a + b.paye, 0).toLocaleString()}`} color="red" />
             <SummaryCard label="Total SSNIT (5.5%)" value={`GHS ${payrollData.reduce((a,b) => a + b.ssnitEmployee, 0).toLocaleString()}`} color="orange" />
          </div>

          <div className="bg-card rounded-[40px] border shadow-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-foreground text-primary-foreground text-[9px] uppercase font-black tracking-widest">
                <tr>
                  <th className="p-5">Employee / Role</th>
                  <th className="p-5 text-right">Gross (GHS)</th>
                  <th className="p-5 text-right">SSNIT (GHS)</th>
                  <th className="p-5 text-right">PAYE (GHS)</th>
                  <th className="p-5 text-right">Other Ded. (GHS)</th>
                  <th className="p-5 text-right">Net Salary (GHS)</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {payrollData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-primary/5 transition-all">
                    <td className="p-5">
                       <p className="uppercase font-bold">{item.name}</p>
                       <div className="flex items-center gap-2">
                          <span className="text-[8px] text-muted-foreground font-black">{item.role}</span>
                          {item.multiplier < 1 && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[7px] font-bold">PRO-RATA: {(item.multiplier * 100).toFixed(0)}%</span>}
                       </div>
                    </td>
                    <td className="p-5 text-right font-medium italic">GHS {item.gross.toFixed(2)}</td>
                    <td className="p-5 text-right text-orange-600">({item.ssnitEmployee.toFixed(2)})</td>
                    <td className="p-5 text-right text-destructive">({item.paye.toFixed(2)})</td>
                    <td className="p-5 text-right text-muted-foreground">({(item.deductions || []).reduce((acc: number, d: any) => acc + d.amount, 0).toFixed(2)})</td>
                    <td className="p-5 text-right font-black text-primary text-sm">GHS {item.netSalary.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-4">
             <Button onClick={exportToBankFile} variant="outline" className="font-bold uppercase text-xs"><Download size={16}/> Export Bank File</Button>
             <Button 
               disabled={processing}
               onClick={commitPayroll}
               className="bg-green-600 hover:bg-green-700 text-white font-black uppercase text-xs flex items-center gap-2 shadow-xl"
             >
                {processing ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18}/>} Approve & Post Payroll
             </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: any) {
    const colors: any = {
        blue: "bg-blue-50 border-blue-100 text-blue-700",
        red: "bg-red-50 border-red-100 text-red-700",
        orange: "bg-orange-50 border-orange-100 text-orange-700"
    };
    return (
        <div className={`p-6 rounded-[32px] border-2 ${colors[color]} shadow-sm`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
            <p className="text-2xl font-black mt-1">{value}</p>
        </div>
    );
}
