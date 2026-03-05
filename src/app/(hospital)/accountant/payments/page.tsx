
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
        
        // 1. Create the master PV record
        transaction.set(pvRef, {
          ...form, pvNumber, vatAmount, whtAmount, netAmount,
          hospitalId,
          debitAccountName: debitAccount.name,
          creditAccountName: creditAccount.name,
          processedBy: user.uid,
          processedByName: user.displayName,
          status: 'PAID', // It's paid from the ledger perspective
          createdAt: serverTimestamp()
        });
        
        // 2. Clear Accounts Payable if linked
        const apId = searchParams.get('apId');
        if (apId) {
          const apRef = doc(firestore, `hospitals/${hospitalId}/accounts_payable`, apId);
          transaction.update(apRef, { status: 'PAID', pvId: pvRef.id });
        }

        // --- TRIPLE-ENTRY LEDGER FOOTPRINTS ---
        const ledgerCollectionRef = collection(firestore, `hospitals/${hospitalId}/ledger_entries`);
        const transactionDate = serverTimestamp();

        // a. Debit the expense/asset account
        transaction.set(doc(ledgerCollectionRef), {
            hospitalId, accountId: form.debitAccountId, accountName: debitAccount.name,
            date: transactionDate, reference: pvNumber, narration: form.narration,
            debit: form.grossAmount, credit: 0, createdAt: transactionDate
        });
        
        // b. Credit the bank/cash account
        transaction.set(doc(ledgerCollectionRef), {
            hospitalId, accountId: form.creditAccountId, accountName: creditAccount.name,
            date: transactionDate, reference: pvNumber, narration: form.narration,
            debit: 0, credit: netAmount, createdAt: transactionDate
        });

        // c. Credit the WHT Payable account
        if (whtAmount > 0) {
          const whtAccount = coa?.find(a => a.accountCode === '2100');
          if (!whtAccount) throw new Error("WHT Payable Account (Code: 2100) not found in Chart of Accounts.");
          transaction.set(doc(ledgerCollectionRef), {
              hospitalId, accountId: whtAccount.id, accountName: whtAccount.name,
              date: transactionDate, reference: pvNumber, narration: `WHT for ${form.payee}`,
              debit: 0, credit: whtAmount, createdAt: transactionDate
          });
        }

        // 4. UPDATE LEDGER BALANCES
        transaction.update(doc(firestore, `hospitals/${hospitalId}/chart_of_accounts`, form.debitAccountId), { currentBalance: increment(form.grossAmount) });
        transaction.update(doc(firestore, `hospitals/${hospitalId}/chart_of_accounts`, form.creditAccountId), { currentBalance: increment(-netAmount) });
        if (whtAmount > 0) {
          const whtAccount = coa?.find(a => a.accountCode === '2100');
          if (whtAccount) {
              transaction.update(doc(firestore, `hospitals/${hospitalId}/chart_of_accounts`, whtAccount.id), { currentBalance: increment(whtAmount) });
          }
        }

        // 5. UPDATE COUNTER
        transaction.update(hospitalDocRef, { pvCounter: increment(1) });
      });

      setForm(prev => ({ ...prev, pvNumber: finalPvNumber }));
      toast({ title: `Financial Handshake Complete`, description: "Ledger, AP, and WHT updated." });
      setTimeout(() => window.print(), 500);

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
                {processing ? <Loader2 className="animate-spin" /> : <><FileText size={18}/> Authorize & Post Payment</>}
             </Button>
          </div>
        </div>
      </div>

      <div className="hidden print:block bg-white text-black p-0 font-serif">
         <div className="border-4 border-black p-8">
            <div className="text-center border-b-4 border-black pb-4 mb-6">
               <h1 className="text-3xl font-black uppercase tracking-tighter">{hospitalName}</h1>
               <h2 className="text-xl font-bold uppercase tracking-[0.3em] bg-black text-white inline-block px-8 py-1 mt-2">Payment Voucher</h2>
            </div>
            <div className="flex justify-between items-start mb-8">
               <div className="space-y-2"><p className="font-bold uppercase text-sm">PV No: <span className="border-b-2 border-dotted border-black ml-2 px-4">{form.pvNumber}</span></p><p className="font-bold uppercase text-sm">Date: <span className="border-b-2 border-dotted border-black ml-2 px-4">{new Date().toLocaleDateString('en-GB')}</span></p><p className="font-bold uppercase text-sm">Payee: <span className="border-b-2 border-dotted border-black ml-2 px-4">{form.payee}</span></p></div>
               <div className="text-right"><div className="border-4 border-black p-4 text-center"><p className="text-[10px] font-black uppercase">Voucher Currency</p><p className="text-2xl font-black uppercase">GHS</p></div></div>
            </div>
            <table className="w-full border-4 border-black mb-8"><thead className="bg-slate-200"><tr className="border-b-4 border-black"><th className="p-4 text-left font-black uppercase text-sm border-r-4 border-black">Description of Payment / Narration</th><th className="p-4 text-right font-black uppercase text-sm">Amount (GHS)</th></tr></thead><tbody className="font-bold"><tr className="border-b-2 border-black"><td className="p-6 h-40 align-top border-r-4 border-black">{form.narration}</td><td className="p-6 text-right">{form.grossAmount.toFixed(2)}</td></tr><tr className="border-b-2 border-black"><td className="p-3 text-right font-black uppercase text-xs border-r-4 border-black">Add: VAT & Statutory Levies (Effective 21.9%)</td><td className="p-3 text-right">{vatAmount.toFixed(2)}</td></tr><tr className="border-b-4 border-black"><td className="p-3 text-right font-black uppercase text-xs border-r-4 border-black text-red-600 italic underline">Less: Withholding Tax ({form.whtLabel})</td><td className="p-3 text-right text-red-600">({whtAmount.toFixed(2)})</td></tr><tr className="bg-slate-100"><td className="p-6 text-right font-black text-xl uppercase border-r-4 border-black">Net Amount Payable</td><td className="p-6 text-right font-black text-2xl">GHS {netAmount.toFixed(2)}</td></tr></tbody></table>
            <div className="grid grid-cols-3 gap-8 mt-12"><div className="space-y-12"><div className="border-t-2 border-black pt-2 text-center"><p className="text-[10px] font-black uppercase">Prepared By (Accountant)</p><p className="text-[11px] font-bold mt-1 uppercase italic">{user?.displayName}</p></div></div><div className="space-y-12"><div className="border-t-2 border-black pt-2 text-center"><p className="text-[10px] font-black uppercase">Internal Audit (Pre-Audit)</p><div className="h-6"></div><p className="text-[8px] italic">Certification Stamp Required</p></div></div><div className="space-y-12"><div className="border-t-2 border-black pt-2 text-center"><p className="text-[10px] font-black uppercase">Approved By (Director)</p></div></div></div>
            <div className="mt-16 text-center border-t border-slate-200 pt-4 opacity-50"><p className="text-[8px] font-black uppercase tracking-[0.5em]">Digitally Generated by GamMed ERP Ecosystem • Powered by Gam IT Solutions</p></div>
         </div>
      </div>
    </div>
  );
}
