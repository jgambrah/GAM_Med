'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { 
  Landmark, Upload, CheckCircle2, AlertTriangle, ArrowRight, 
  Loader2, ShieldAlert, FileText, Check, HelpCircle, RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface BankRecord {
  id: string;
  date: string;
  description: string;
  reference: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
}

export default function BankReconciliation() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [csvText, setCsvText] = useState('');
  const [bankRecords, setBankRecords] = useState<BankRecord[]>([]);
  const [reconciling, setReconciling] = useState(false);
  const [matchedIds, setMatchedIds] = useState<Record<string, string>>({}); // bankRecordId -> ledgerId

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userProfile?.role || '');

  // 1. Fetch uncleared Payment Vouchers (Outflows)
  const pvQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/payment_vouchers`),
      where("reconciled", "!=", true)
    );
  }, [firestore, hospitalId]);
  const { data: unpaidPVs, isLoading: pvsLoading } = useCollection(pvQuery);

  // 2. Fetch uncleared Patient Payments (Inflows)
  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/payments`),
      where("reconciled", "!=", true)
    );
  }, [firestore, hospitalId]);
  const { data: rawPayments, isLoading: paymentsLoading } = useCollection(paymentsQuery);

  // Parse cash outflows that are PAID
  const unclearedOutflows = useMemo(() => {
    if (!unpaidPVs) return [];
    // Only look at PVs that are authorized or paid
    return unpaidPVs.filter(pv => ['AUTHORIZED', 'PAID'].includes(pv.status)).map(pv => ({
      id: pv.id,
      docType: 'OUTFLOW' as const,
      reference: pv.pvNumber || pv.id,
      name: pv.payee || 'Supplier Payout',
      amount: -pv.netAmount, // Outflow is negative
      date: pv.createdAt ? new Date(pv.createdAt.toDate()) : new Date(),
    }));
  }, [unpaidPVs]);

  // Parse cash inflows (receipts)
  const unclearedInflows = useMemo(() => {
    if (!rawPayments) return [];
    return rawPayments.map(p => ({
      id: p.id,
      docType: 'INFLOW' as const,
      reference: p.paymentId || p.id,
      name: p.patientName || 'Patient Cashier Receipt',
      amount: p.totalAmount, // Inflow is positive
      date: p.createdAt ? new Date(p.createdAt.toDate()) : new Date(),
    }));
  }, [rawPayments]);

  // Combined ledger transactions
  const ledgerTransactions = useMemo(() => {
    return [...unclearedInflows, ...unclearedOutflows].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [unclearedInflows, unclearedOutflows]);

  // Parse pasted CSV text
  const handleParseCSV = () => {
    if (!csvText.trim()) {
      toast({ variant: "destructive", title: "No CSV Data", description: "Please paste your bank statement entries first." });
      return;
    }

    try {
      const rows = csvText.split('\n');
      const records: BankRecord[] = [];
      
      rows.forEach((row, i) => {
        if (!row.trim()) return;
        // Expected format: Date, Description, Reference, Amount
        const parts = row.split(',').map(p => p.trim());
        if (parts.length < 4) return;
        
        const date = parts[0];
        const description = parts[1];
        const reference = parts[2];
        const amount = parseFloat(parts[3]);

        if (isNaN(amount)) return;

        records.push({
          id: `bank-${i}-${Date.now()}`,
          date,
          description,
          reference,
          amount,
          type: amount > 0 ? 'CREDIT' : 'DEBIT',
        });
      });

      if (records.length === 0) {
        throw new Error("Could not parse any valid transaction rows. Check format: YYYY-MM-DD, Description, Reference, Amount");
      }

      setBankRecords(records);
      toast({ title: "Statement Parsed", description: `Loaded ${records.length} bank transactions.` });

      // Run Auto-Matching Engine
      const matches: Record<string, string> = {};
      records.forEach(br => {
        // Try to match by reference or amount exactly
        const matchedLedger = ledgerTransactions.find(lt => 
          Math.abs(lt.amount - br.amount) < 0.01 && 
          (lt.reference.toLowerCase().includes(br.reference.toLowerCase()) || 
           br.reference.toLowerCase().includes(lt.reference.toLowerCase()))
        );
        
        if (matchedLedger) {
          matches[br.id] = matchedLedger.id;
        }
      });
      setMatchedIds(matches);

    } catch (e: any) {
      toast({ variant: "destructive", title: "CSV Parse Error", description: e.message });
    }
  };

  const handleManualMatch = (bankRecordId: string, ledgerId: string) => {
    setMatchedIds(prev => ({
      ...prev,
      [bankRecordId]: ledgerId,
    }));
  };

  const handleClearMatch = (bankRecordId: string) => {
    setMatchedIds(prev => {
      const copy = { ...prev };
      delete copy[bankRecordId];
      return copy;
    });
  };

  const handleCommitReconciliation = async () => {
    if (!firestore || !hospitalId) return;
    const entriesToReconcile = Object.entries(matchedIds);
    if (entriesToReconcile.length === 0) {
      toast({ variant: "destructive", title: "No Matches", description: "There are no matches staged for reconciliation." });
      return;
    }

    setReconciling(true);
    const batch = writeBatch(firestore);

    try {
      entriesToReconcile.forEach(([bankRecordId, ledgerId]) => {
        const bankRecord = bankRecords.find(br => br.id === bankRecordId);
        const ledgerItem = ledgerTransactions.find(lt => lt.id === ledgerId);

        if (!bankRecord || !ledgerItem) return;

        const collectionName = ledgerItem.docType === 'OUTFLOW' ? 'payment_vouchers' : 'payments';
        const docRef = doc(firestore, `hospitals/${hospitalId}/${collectionName}`, ledgerId);
        
        batch.update(docRef, {
          reconciled: true,
          reconciledAt: serverTimestamp(),
          bankClearedDate: bankRecord.date,
          bankDescription: bankRecord.description,
          bankReference: bankRecord.reference,
          status: ledgerItem.docType === 'OUTFLOW' ? 'PAID' : 'PAID', // mark PV as fully paid once cleared at bank
        });
      });

      await batch.commit();
      toast({ title: "Reconciliation Successful", description: `Reconciled and cleared ${entriesToReconcile.length} transactions at the bank.` });
      
      // Clear local states
      setBankRecords([]);
      setMatchedIds({});
      setCsvText('');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Reconciliation Failed", description: e.message });
    } finally {
      setReconciling(false);
    }
  };

  const pageIsLoading = isUserLoading || isProfileLoading;
  
  if (pageIsLoading) {
    return <div className="flex h-screen w-full items-center justify-center bg-slate-50"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50 p-4">
        <div className="text-center bg-white p-10 rounded-[40px] border shadow-sm max-w-md">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground mt-2">Only Accountants are authorized to run bank reconciliations.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 font-black uppercase text-xs tracking-widest rounded-2xl py-4 h-auto w-full">Return Home</Button>
        </div>
      </div>
    );
  }

  const isLoadingData = pvsLoading || paymentsLoading;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 text-slate-800">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic">
          Bank <span className="text-primary">Reconciliation</span>
        </h1>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider italic mt-1">
          Match and clear bank statement lines against internal cashier collections and payment vouchers
        </p>
      </div>

      {/* PASTE CSV SECTION */}
      <div className="bg-white p-6 md:p-8 rounded-[40px] border shadow-sm space-y-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
            <Upload size={20} className="text-primary" /> Import Bank Statement
          </h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
            Paste CSV records in the format: <span className="font-mono text-slate-800">Date, Description, Reference, Amount</span>
          </p>
        </div>
        <textarea
          className="w-full p-4 border rounded-2xl font-mono text-xs bg-slate-50 h-28 focus:border-primary outline-none text-slate-900"
          placeholder="e.g.&#13;2026-06-12, Acorn Med Payout, PV-0045, -4500.00&#13;2026-06-13, Patient Cash Receipt, REC-1244, 250.00"
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
        />
        <Button 
          onClick={handleParseCSV} 
          className="font-black uppercase text-xs tracking-widest px-8 py-3 h-auto rounded-xl shadow-lg"
        >
          Parse & Run Auto-Match Engine
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Bank Statement Records */}
        <div className="lg:col-span-6 bg-white p-6 md:p-8 rounded-[40px] border shadow-sm space-y-6">
          <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 border-b pb-4 text-slate-900">
            <Landmark size={20} className="text-primary" /> Bank Statement Records
          </h2>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {bankRecords.length === 0 ? (
              <div className="p-20 text-center text-muted-foreground italic uppercase text-xs border-2 border-dashed rounded-[30px]">
                No statement uploaded yet. Please paste CSV records above.
              </div>
            ) : (
              bankRecords.map(br => {
                const matchedId = matchedIds[br.id];
                const matchedLedger = ledgerTransactions.find(lt => lt.id === matchedId);

                return (
                  <div 
                    key={br.id} 
                    className={`p-5 rounded-3xl border-2 flex flex-col gap-3 transition-all ${
                      matchedLedger ? 'bg-green-50/50 border-green-200' : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">{br.date}</p>
                        <h3 className="font-black text-sm uppercase text-slate-900 leading-tight mt-0.5">{br.description}</h3>
                        <p className="text-[10px] text-slate-500 font-bold mt-1">Ref: {br.reference}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${br.type === 'CREDIT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {br.type}
                        </span>
                        <p className={`text-base font-black font-mono mt-1 ${br.type === 'CREDIT' ? 'text-green-600' : 'text-slate-800'}`}>
                          GHS {Math.abs(br.amount).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {matchedLedger ? (
                      <div className="p-3 bg-white border border-green-100 rounded-2xl flex justify-between items-center text-[10px] font-bold text-green-800">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                          <span>Matched: {matchedLedger.name} ({matchedLedger.reference})</span>
                        </div>
                        <button onClick={() => handleClearMatch(br.id)} className="text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 underline">
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-white border rounded-2xl flex flex-col gap-2">
                        <p className="text-[9px] font-black uppercase text-slate-400">Match against Ledger:</p>
                        <select 
                          className="w-full p-2 border rounded-xl text-[11px] font-bold text-slate-700 outline-none bg-slate-50"
                          onChange={e => handleManualMatch(br.id, e.target.value)}
                        >
                          <option value="">-- Choose matching ledger line --</option>
                          {ledgerTransactions
                            .filter(lt => !Object.values(matchedIds).includes(lt.id))
                            .map(lt => (
                              <option key={lt.id} value={lt.id}>
                                {lt.docType === 'INFLOW' ? '➕ Inflow' : '➖ Outflow'} - {lt.name} (₵ {Math.abs(lt.amount).toFixed(2)}) [{lt.reference}]
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Internal Ledger Transactions */}
        <div className="lg:col-span-6 bg-white p-6 md:p-8 rounded-[40px] border shadow-sm space-y-6">
          <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 border-b pb-4 text-slate-900">
            <FileText size={20} className="text-primary" /> Uncleared Ledger Transactions
          </h2>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {isLoadingData ? (
              <div className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" /></div>
            ) : ledgerTransactions.length === 0 ? (
              <div className="p-20 text-center text-muted-foreground italic uppercase text-xs border-2 border-dashed rounded-[30px]">All ledger transactions are cleared.</div>
            ) : (
              ledgerTransactions.map(lt => {
                const isMatched = Object.values(matchedIds).includes(lt.id);
                return (
                  <div 
                    key={lt.id} 
                    className={`p-5 rounded-3xl border-2 flex justify-between items-center transition-all ${
                      isMatched ? 'bg-green-50/20 border-green-100 opacity-60' : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">{lt.date.toLocaleDateString()}</span>
                      <h3 className="font-black text-sm uppercase text-slate-900 mt-0.5 leading-tight">{lt.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${lt.docType === 'INFLOW' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {lt.docType === 'INFLOW' ? 'Receipt' : 'Voucher'}
                        </span>
                        <p className="text-[8px] text-slate-400 font-bold font-mono">REF: {lt.reference}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-base font-black font-mono ${lt.docType === 'INFLOW' ? 'text-blue-600' : 'text-red-600'}`}>
                        {lt.docType === 'INFLOW' ? `+ ₵ ${lt.amount.toFixed(2)}` : `- ₵ ${Math.abs(lt.amount).toFixed(2)}`}
                      </p>
                      {isMatched && <span className="text-[8px] font-black uppercase text-green-600 tracking-wider">Staged Match</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* FOOTER COMMIT BAR */}
      {bankRecords.length > 0 && (
        <div className="bg-slate-900 text-white p-6 rounded-[30px] flex justify-between items-center shadow-xl border-b-8 border-primary">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-primary">Ready to Reconcile</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Staged matches: <span className="text-white font-extrabold">{Object.keys(matchedIds).length}</span> of {bankRecords.length} statements rows
            </p>
          </div>
          <Button 
            disabled={reconciling || Object.keys(matchedIds).length === 0}
            onClick={handleCommitReconciliation}
            className="bg-primary hover:bg-white hover:text-black font-black uppercase text-xs tracking-widest px-8 py-3.5 h-auto rounded-xl flex items-center gap-2"
          >
            {reconciling ? <Loader2 className="animate-spin h-4 w-4" /> : <Check size={16} />} Commit & Clear Ledger
          </Button>
        </div>
      )}
    </div>
  );
}
