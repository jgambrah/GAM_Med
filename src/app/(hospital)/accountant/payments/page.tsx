
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, writeBatch, increment, runTransaction } from 'firebase/firestore';
import { 
  FileText, Printer, Save, Calculator, 
  Landmark, Wallet, History, CheckCircle, ShieldAlert, Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PaymentVoucherManager() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [processing, setProcessing] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  
  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userRole || '');
  
  const WHT_RATES = [
    { label: "Exempt / 0% (Exemption Certificate)", rate: 0 },
    { label: "Supply of Goods (3%)", rate: 0.03 },
    { label: "Supply of Works (5%)", rate: 0.05 },
    { label: "Supply of General Services (7.5%)", rate: 0.075 },
    { label: "Rent - Residential (8%)", rate: 0.08 },
    { label: "Rent - Commercial (15%)", rate: 0.15 },
    { label: "Director Fees (20%)", rate: 0.20 },
    { label: "Management / Technical Fees (7.5%)", rate: 0.075 },
    { label: "Consultancy Fees (7.5%)", rate: 0.075 },
    { label: "Commissions (10%)", rate: 0.10 },
    { label: "Royalties (15%)", rate: 0.15 },
  ];

  const [form, setForm] = useState({
    debitAccountId: '',
    debitAccountName: '',
    creditAccountId: '',
    creditAccountName: '',
    grossAmount: 0,
    applyVat: false,
    whtRate: 0,
    whtLabel: 'Exempt / 0% (Exemption Certificate)',
    narration: '',
    payee: '',
    pvNumber: ''
  });
  
  useEffect(() => {
    const payee = searchParams.get('payee');
    const amount = searchParams.get('amount');
    const grnNumber = searchParams.get('grnNumber');
    if (payee && amount) {
        setForm(prev => ({
            ...prev,
            payee,
            grossAmount: parseFloat(amount),
            narration: grnNumber ? `Payment for goods received against GRN #${grnNumber}` : `Payment to ${payee}`
        }));
    }
  }, [searchParams]);

  const hospitalRef = useMemoFirebase(() => hospitalId ? doc(firestore, "hospitals", hospitalId) : null, [firestore, hospitalId]);
  const { data: hospitalData } = useDoc(hospitalRef);
  const hospitalName = hospitalData?.name || '';
  
  const coaQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`), where("hospitalId", "==", hospitalId)) : null, [firestore, hospitalId]);
  const { data: coa, isLoading: isCoaLoading } = useCollection(coaQuery);

  const vatAmount = form.applyVat ? form.grossAmount * 0.219 : 0;
  const whtAmount = form.grossAmount * form.whtRate;
  const netAmount = form.grossAmount + vatAmount - whtAmount;

  const handleAuthorizePayment = async () => {
    if (!form.debitAccountId || !form.creditAccountId || form.grossAmount <= 0) {
        toast({ variant: 'destructive', title: "Validation Error", description: "Please complete all financial fields." });
        return;
    }
    if (!hospitalId || !user || !firestore) return;

    setProcessing(true);
    let finalPvNumber = '';

    try {
      await runTransaction(firestore, async (transaction) => {
        const hospitalDocRef = doc(firestore, "hospitals", hospitalId);
        const hospitalDoc = await transaction.get(hospitalDocRef);
        if (!hospitalDoc.exists()) throw new Error("Hospital document not found.");

        const hData = hospitalDoc.data();
        const prefix = hData?.mrnPrefix || 'GAM';
        const currentPvCount = (hData?.pvCounter || 0) + 1;
        const year = new Date().getFullYear().toString().slice(-2);
        const pvNumber = `${prefix}/PV/${year}/${currentPvCount.toString().padStart(4, '0')}`;
        finalPvNumber = pvNumber;
        
        const pvRef = doc(collection(firestore, `hospitals/${hospitalId}/payment_vouchers`));
        const debitAccount = coa?.find(a => a.id === form.debitAccountId);
        const creditAccount = coa?.find(a => a.id === form.creditAccountId);
        if (!debitAccount || !creditAccount) throw new Error("Selected account not found");
        
        // 1. Create the master PV record with PENDING status
        transaction.set(pvRef, {
          ...form, pvNumber, vatAmount, whtAmount, netAmount,
          hospitalId,
          debitAccountName: debitAccount.name,
          creditAccountName: creditAccount.name,
          processedBy: user.uid,
          processedByName: user.displayName,
          status: 'PENDING_APPROVAL', // <<< CHANGED
          createdAt: serverTimestamp()
        });
        
        // 2. Clear Accounts Payable if linked
        const apId = searchParams.get('apId');
        if (apId) {
          const apRef = doc(firestore, `hospitals/${hospitalId}/accounts_payable`, apId);
          // Note: We don't mark as PAID here, that's the cashier's job after Director authorizes.
          // We could add a 'pv_raised' status if needed. For now, we link the PV ID.
          transaction.update(apRef, { pvId: pvRef.id });
        }

        // 3. UPDATE COUNTER
        transaction.update(hospitalDocRef, { pvCounter: increment(1) });
      });

      setForm(prev => ({ ...prev, pvNumber: finalPvNumber }));
      toast({ title: `PV ${finalPvNumber} Sent for Approval`, description: "Awaiting review from the internal auditor." });
      // We don't print here anymore, auditor/director will do that.

    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const pageIsLoading = isUserLoading || isProfileLoading;
  
  if (pageIsLoading) {
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
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="print:hidden space-y-8">
        <div>
           <h1 className="text-4xl font-black uppercase tracking-tighter italic">Disbursement <span className="text-primary">Portal</span></h1>
           <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest italic">GHANA REVENUE AUTHORITY COMPLIANT VOUCHER GENERATION</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-card p-10 rounded-[40px] border-2 border-border shadow-sm space-y-6">
             <div className="grid grid-cols-2 gap-6">
                <div>
                   <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Expenditure / Asset Ledger (DEBIT)</label>
                   <select className="w-full p-4 border rounded-2xl bg-muted text-card-foreground font-bold outline-none"
                     onChange={e => setForm({...form, debitAccountId: e.target.value})}>
                     <option value="">Select Ledger Account...</option>
                     {isCoaLoading ? <option>Loading...</option> : coa?.filter(a => ['EXPENSES', 'ASSETS'].includes(a.category)).map(a => <option key={a.id} value={a.id}>{a.accountCode} - {a.name}</option>)}
                   </select>
                </div>
                <div>
                   <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Bank / Cash Account (CREDIT)</label>
                   <select className="w-full p-4 border rounded-2xl bg-muted text-card-foreground font-bold outline-none"
                     onChange={e => setForm({...form, creditAccountId: e.target.value})}>
                     <option value="">Select Funding Source...</option>
                      {isCoaLoading ? <option>Loading...</option> : coa?.filter(a => a.category === 'ASSETS').map(a => <option key={a.id} value={a.id}>{a.accountCode} - {a.name}</option>)}
                   </select>
                </div>
             </div>

             <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Payee Information</label>
                <input required className="w-full p-4 border rounded-2xl mt-1 text-card-foreground font-bold bg-muted" 
                  placeholder="Official Name of Recipient" value={form.payee} onChange={e => setForm({...form, payee: e.target.value})} />
             </div>

             <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Detailed Narration</label>
                <textarea className="w-full p-4 border rounded-2xl mt-1 text-card-foreground font-medium text-sm h-32 bg-muted outline-none"
                  placeholder="Purpose of payment (Reference Invoice numbers if any)..." value={form.narration} onChange={e => setForm({...form, narration: e.target.value})} />
             </div>
          </div>

          <div className="bg-[#0f172a] p-8 rounded-[40px] text-white shadow-2xl space-y-6">
             <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Calculator size={16}/> Statutory Deductions
             </h3>
             <div className="space-y-4">
                <div>
                   <label className="text-[10px] font-bold text-slate-400 uppercase">Gross Amount (GHS)</label>
                   <input type="number" className="w-full p-4 bg-slate-800 rounded-xl text-white font-black text-2xl outline-none mt-1"
                     value={form.grossAmount || ''} onChange={e => setForm({...form, grossAmount: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="flex items-center gap-3 bg-slate-800 p-4 rounded-2xl border border-slate-700 cursor-pointer"
                   onClick={() => setForm({...form, applyVat: !form.applyVat})}>
                   <input type="checkbox" checked={form.applyVat} readOnly className="w-5 h-5 rounded accent-primary" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Apply VAT + Levies (21.9%)</span>
                </div>
                <div>
                   <label className="text-[10px] font-bold text-slate-400 uppercase">WHT Category (Ghana Law)</label>
                   <select className="w-full p-4 bg-slate-800 rounded-xl text-white font-bold outline-none mt-1 border-none"
                     onChange={e => {
                        const selected = WHT_RATES.find(r => r.rate === parseFloat(e.target.value));
                        setForm({...form, whtRate: parseFloat(e.target.value), whtLabel: selected?.label || ''});
                     }}>
                      {WHT_RATES.map((w, i) => <option key={i} value={w.rate}>{w.label}</option>)}
                   </select>
                </div>
             </div>
             <div className="pt-6 space-y-3 border-t border-slate-800">
                <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400"><span>VAT + Levies</span><span>GHS {vatAmount.toFixed(2)}</span></div>
                <div className="flex justify-between text-[10px] uppercase font-bold text-red-400"><span>WHT ({form.whtLabel.split('(')[1] || '0%)'})</span><span>(GHS {whtAmount.toFixed(2)})</span></div>
                <div className="flex justify-between text-2xl font-black text-white pt-2 uppercase tracking-tighter"><span>Net Payable</span><span>GHS {netAmount.toFixed(2)}</span></div>
             </div>
             <Button onClick={handleAuthorizePayment} disabled={processing} className="w-full bg-primary hover:bg-white hover:text-black text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest transition-all shadow-xl flex items-center justify-center gap-3">
                {processing ? <Loader2 className="animate-spin" /> : <><FileText size={18}/> Send PV for Approval</>}
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
