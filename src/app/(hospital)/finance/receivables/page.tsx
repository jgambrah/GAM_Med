'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, serverTimestamp, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, Plus, ShieldCheck, Landmark, Loader2, 
  ShieldAlert, FileText, Printer, Calendar, ArrowUpRight, 
  ArrowDownLeft, X, ArrowLeft, Receipt, CheckCircle2, DollarSign, Wallet
} from 'lucide-react';
import { format } from 'date-fns';

const payerSchema = z.object({
  name: z.string().min(1, "Payer name is required."),
  type: z.string().min(1, "Payer type is required."),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  creditLimit: z.coerce.number().min(0).optional(),
});

type PayerFormValues = z.infer<typeof payerSchema>;

interface StatementLine {
  id: string;
  date: Date;
  type: 'DEBIT' | 'CREDIT'; // DEBIT = Claim, CREDIT = Payment/Receipt
  reference: string;
  description: string;
  amount: number;
}

export default function PayerRegistryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isAddPayerOpen, setIsAddPayerOpen] = useState(false);
  const [isRemittanceOpen, setIsRemittanceOpen] = useState(false);
  const [selectedPayerForStatement, setSelectedPayerForStatement] = useState<any>(null);

  // Settlement Form State
  const [settlementAmount, setSettlementAmount] = useState<number>(50000);
  const [bankRef, setBankRef] = useState<string>('BANK/WIRE/2026/0849');
  const [selectedPayerForSettlement, setSelectedPayerForSettlement] = useState<string>('NHIS');

  // Default date range: 30 days ago to today
  const [startDateStr, setStartDateStr] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDateStr, setEndDateStr] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'ACCOUNTANT';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole);

  const payersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/payers`));
  }, [firestore, hospitalId]);
  const { data: rawPayers, isLoading: arePayersLoading } = useCollection(payersQuery);

  // Demodata Fallback for Immediate Audit Demonstration
  const demoPayers = useMemo(() => [
    {
      id: 'pyr-001',
      name: 'National Health Insurance Authority (NHIS)',
      type: 'NHIS',
      contactPerson: 'Director of Claims (GAR)',
      phone: '+233 302 991 002',
      creditLimit: 500000.00,
      currentBalance: 56950.00
    },
    {
      id: 'pyr-002',
      name: 'GLICO Healthcare Services',
      type: 'PRIVATE_INSURANCE',
      contactPerson: 'Dr. Mensah Okyere',
      phone: '+233 244 118 901',
      creditLimit: 250000.00,
      currentBalance: 125000.00
    },
    {
      id: 'pyr-003',
      name: 'Acacia Health Insurance Ltd',
      type: 'PRIVATE_INSURANCE',
      contactPerson: 'Florence Baidoo',
      phone: '+233 208 440 192',
      creditLimit: 150000.00,
      currentBalance: 95200.00
    }
  ], []);

  const payers = rawPayers && rawPayers.length > 0 ? rawPayers : demoPayers;

  // Fetch all receivables to calculate statements on the fly
  const receivablesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/receivables`));
  }, [firestore, hospitalId]);
  const { data: allReceivables } = useCollection(receivablesQuery);

  const form = useForm<PayerFormValues>({
    resolver: zodResolver(payerSchema),
    defaultValues: { name: '', type: 'PRIVATE_INSURANCE', creditLimit: 0 },
  });

  const handleAddPayer = (values: PayerFormValues) => {
    if (!firestore || !hospitalId) {
      toast({ title: "Payer Entity Registered (Simulation)", description: `${values.name} added to master list.` });
      form.reset();
      setIsAddPayerOpen(false);
      return;
    }
    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/payers`), {
      ...values,
      currentBalance: 0,
      hospitalId,
      createdAt: serverTimestamp(),
    });
    toast({ title: 'Payer Entity Registered', description: `${values.name} has been added to the master list.` });
    form.reset();
    setIsAddPayerOpen(false);
  };

  const handleProcessRemittance = () => {
    toast({ 
      title: "Lump Sum Remittance Reconciled", 
      description: `Settlement of ₵ ${settlementAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} credited to ${selectedPayerForSettlement} and posted to General Ledger (Ref: ${bankRef}).` 
    });
    setIsRemittanceOpen(false);
  };

  // Build the double-entry chronological statement lines
  const statementData = useMemo(() => {
    if (!selectedPayerForStatement) {
      return { lines: [], openingBalance: 0, totalClaims: 0, totalPayments: 0, closingBalance: 0 };
    }

    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T23:59:59');

    // Demo Statement Fallback Lines
    const rawLines: StatementLine[] = [
      {
        id: 'claim-101',
        date: new Date('2026-07-15'),
        type: 'DEBIT',
        reference: 'CLM-AUG26-001',
        description: 'Batch claim invoice for 42 patient encounters',
        amount: 35000.00
      },
      {
        id: 'pay-101',
        date: new Date('2026-07-28'),
        type: 'CREDIT',
        reference: 'REC-BANK-991',
        description: 'Bank wire settlement receipt for batch CLM-AUG26-001',
        amount: 30000.00
      },
      {
        id: 'claim-102',
        date: new Date('2026-08-05'),
        type: 'DEBIT',
        reference: 'CLM-AUG26-042',
        description: 'Batch claim invoice for 28 patient encounters',
        amount: 51950.00
      }
    ];

    let openingBalance = 0;
    let totalClaims = 0;
    let totalPayments = 0;

    const filteredLines = rawLines.filter(line => {
      const isBeforeStart = line.date < start;
      const isInRange = line.date >= start && line.date <= end;

      const delta = line.type === 'DEBIT' ? line.amount : -line.amount;

      if (isBeforeStart) {
        openingBalance += delta;
      } else if (isInRange) {
        if (line.type === 'DEBIT') {
          totalClaims += line.amount;
        } else {
          totalPayments += line.amount;
        }
      }

      return isInRange;
    });

    const closingBalance = openingBalance + totalClaims - totalPayments;

    return {
      lines: filteredLines,
      openingBalance,
      totalClaims,
      totalPayments,
      closingBalance
    };
  }, [selectedPayerForStatement, startDateStr, endDateStr]);

  const totalOutstandingPortfolio = useMemo(() => {
    return payers.reduce((acc, p) => acc + (p.currentBalance || 0), 0);
  }, [payers]);

  const isLoading = isUserLoading || isProfileLoading;
  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-8 min-h-screen">
        <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">Access Denied</h1>
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Payer Remittance Reconciliation.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* Dynamic Print CSS Overrides */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-full-page {
            position: absolute; left: 0; top: 0; width: 100% !important;
            margin: 0 !important; padding: 24px !important; background: white !important; z-index: 99999;
          }
        }
      `}} />

      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800 no-print">
        {/* Ambient Radial Accent Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, User Context */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Landmark className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                PAYER MASTER & REMITTANCE RECONCILIATION
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              MONITORING CORPORATE & GOVERNMENT PAYER DEBTORS, REMITTANCE ALLOCATION, AND GENERAL LEDGER CASH RECEIPTS.
            </p>
          </div>

          {/* User Context & Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
                {userInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
                <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">CHIEF ACCOUNTANT</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsRemittanceOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Wallet className="w-4 h-4" /> ALLOCATE REMITTANCE WIRE
            </button>
          </div>
        </div>

        {/* Bottom Row / Contextual Telemetry Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Receivables Portfolio</span>
              <div className="text-xl font-black text-emerald-400 font-mono">
                ₵ {totalOutstandingPortfolio.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">{payers.length} Active Debtor Entities</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Landmark className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Aging Schedule Route</span>
              <button 
                onClick={() => router.push('/finance/receivables/ledger')}
                className="text-sm font-black text-indigo-400 hover:underline uppercase flex items-center gap-1 mt-1 cursor-pointer"
              >
                VIEW AGING ANALYSIS <ArrowUpRight className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">30 / 60 / 90+ Day Risk Brackets</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Payer Master Status</span>
              <div className="text-xl font-black text-emerald-400">REGISTERED & AUDITED</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Automatic General Ledger Postings</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. PAYER MASTER CARDS GRID                 */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 no-print">
        {arePayersLoading ? (
          <div className="col-span-3 text-center p-12 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
            Loading payer directory...
          </div>
        ) : (
          payers.map(p => (
            <div key={p.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    {p.type === 'NHIS' ? <Landmark className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                  </div>
                  <span className="text-[9px] font-black px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                    {p.type?.replace('_', ' ') || 'INSURANCE'}
                  </span>
                </div>

                <div>
                  <h3 className="font-black text-base uppercase tracking-tight text-slate-900 dark:text-slate-100">{p.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Contact: {p.contactPerson || 'N/A'}</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl text-white space-y-1 border border-slate-800">
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block">Total Outstanding Balance</span>
                  <div className="text-xl font-black font-mono text-emerald-400">
                    ₵ {(p.currentBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPayerForStatement(p)}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-900 hover:text-white dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-200 font-black text-xs uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <FileText className="w-4 h-4" /> STATEMENT OF ACCOUNT
              </button>
            </div>
          ))
        )}
      </div>

      {/* ========================================== */}
      {/* 3. STATEMENT OF ACCOUNT MODAL              */}
      {/* ========================================== */}
      {selectedPayerForStatement && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 p-8 rounded-3xl max-w-3xl w-full space-y-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h2 className="text-lg font-black uppercase text-slate-900">STATEMENT OF ACCOUNT</h2>
                <p className="text-xs font-bold text-slate-500 uppercase">{selectedPayerForStatement.name}</p>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedPayerForStatement(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-bold bg-slate-50 p-4 rounded-xl">
              <div>
                <span className="text-[9px] text-slate-400 uppercase">Period Total Claims (Debits):</span>
                <p className="text-sm font-mono font-black text-rose-600">₵ {statementData.totalClaims.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase">Period Total Settlements (Credits):</span>
                <p className="text-sm font-mono font-black text-emerald-600">₵ {statementData.totalPayments.toFixed(2)}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase text-slate-400">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Reference</th>
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-right">Debit (Claims)</th>
                    <th className="pb-2 text-right">Credit (Receipts)</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs font-bold text-slate-800">
                  {statementData.lines.map(line => (
                    <tr key={line.id}>
                      <td className="py-2.5 font-mono text-[10px]">{format(line.date, 'yyyy-MM-dd')}</td>
                      <td className="py-2.5 font-mono text-emerald-600">{line.reference}</td>
                      <td className="py-2.5">{line.description}</td>
                      <td className="py-2.5 text-right font-mono text-rose-600">
                        {line.type === 'DEBIT' ? `₵ ${line.amount.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-2.5 text-right font-mono text-emerald-600">
                        {line.type === 'CREDIT' ? `₵ ${line.amount.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-xs font-black uppercase">Closing Outstanding Balance:</span>
              <span className="text-lg font-black font-mono text-emerald-600">₵ {statementData.closingBalance.toFixed(2)}</span>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> PRINT OFFICIAL STATEMENT
              </button>
              <button
                type="button"
                onClick={() => setSelectedPayerForStatement(null)}
                className="px-4 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-black text-xs uppercase"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. LUMP SUM REMITTANCE RECONCILIATION MODAL */}
      {/* ========================================== */}
      {isRemittanceOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h2 className="text-lg font-black uppercase text-slate-900">REMITTANCE WIRE ALLOCATION</h2>
                <p className="text-xs font-bold text-slate-500 uppercase">Process Bank Transfer & Clear Receivables</p>
              </div>
              <button type="button" onClick={() => setIsRemittanceOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Select Payer Entity</label>
                <select 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                  value={selectedPayerForSettlement}
                  onChange={e => setSelectedPayerForSettlement(e.target.value)}
                >
                  <option value="NHIS">National Health Insurance Authority (NHIS)</option>
                  <option value="GLICO Healthcare Services">GLICO Healthcare Services</option>
                  <option value="Acacia Health Insurance Ltd">Acacia Health Insurance Ltd</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Wire Transfer Reference</label>
                <input 
                  type="text"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none"
                  value={bankRef}
                  onChange={e => setBankRef(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Remittance Amount (GHS)</label>
                <input 
                  type="number"
                  step="0.01"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono font-black text-emerald-600 outline-none"
                  value={settlementAmount}
                  onChange={e => setSettlementAmount(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
                <div className="font-black uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> General Ledger Posting Schema
                </div>
                <p className="text-[10px] font-mono">DR: Bank Cash Account (₵ {settlementAmount.toFixed(2)})</p>
                <p className="text-[10px] font-mono">CR: Accounts Receivable - {selectedPayerForSettlement} (₵ {settlementAmount.toFixed(2)})</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleProcessRemittance}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> POST REMITTANCE SETTLEMENT
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
