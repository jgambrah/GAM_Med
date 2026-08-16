'use client';

import React, { useState, useMemo } from 'react';
import { 
  Receipt, CreditCard, Wallet, Landmark, Search, 
  Calendar, Printer, Filter, CheckCircle2, ArrowRight,
  TrendingUp, Download, Building2, User, Clock, FileText,
  DollarSign, Sparkles
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface TransactionRecord {
  id: string;
  receiptNumber: string;
  patientName: string;
  ehrNumber: string;
  totalAmount: number;
  paymentMethod: 'Cash' | 'MobileMoney' | 'POS' | 'SplitPayer';
  momoNetwork?: string;
  cashierName: string;
  cashierStaffId: string;
  timestamp: string;
  itemCount: number;
  status: 'SETTLED' | 'REFUNDED' | 'QUERIED';
}

const DEFAULT_TRANSACTIONS: TransactionRecord[] = [
  {
    id: 'TXN-001',
    receiptNumber: 'RCP-2026-0912',
    patientName: 'Kwame Asante Mensah',
    ehrNumber: 'EHR-884912',
    totalAmount: 230.00,
    paymentMethod: 'Cash',
    cashierName: 'Priscilla Adysei',
    cashierStaffId: 'GAM/STF/26/0008',
    timestamp: '10:42 AM Today',
    itemCount: 3,
    status: 'SETTLED',
  },
  {
    id: 'TXN-002',
    receiptNumber: 'RCP-2026-0913',
    patientName: 'Abena Mansah',
    ehrNumber: 'EHR-773190',
    totalAmount: 480.00,
    paymentMethod: 'MobileMoney',
    momoNetwork: 'MTN MoMo (0244******)',
    cashierName: 'Priscilla Adysei',
    cashierStaffId: 'GAM/STF/26/0008',
    timestamp: '11:15 AM Today',
    itemCount: 4,
    status: 'SETTLED',
  },
  {
    id: 'TXN-003',
    receiptNumber: 'RCP-2026-0914',
    patientName: 'Emmanuel Ofori',
    ehrNumber: 'EHR-629143',
    totalAmount: 750.00,
    paymentMethod: 'POS',
    cashierName: 'Priscilla Adysei',
    cashierStaffId: 'GAM/STF/26/0008',
    timestamp: '12:08 PM Today',
    itemCount: 5,
    status: 'SETTLED',
  },
  {
    id: 'TXN-004',
    receiptNumber: 'RCP-2026-0915',
    patientName: 'Janet Bonah',
    ehrNumber: 'EHR-910482',
    totalAmount: 120.00,
    paymentMethod: 'SplitPayer',
    cashierName: 'Priscilla Adysei',
    cashierStaffId: 'GAM/STF/26/0008',
    timestamp: '01:30 PM Today',
    itemCount: 2,
    status: 'SETTLED',
  }
];

export default function FinanceTransactionReportsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  // Real-Time Query for Hospital Payments
  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/payments`),
      limit(50)
    );
  }, [firestore, hospitalId]);
  const { data: rawPayments, isLoading: arePaymentsLoading } = useCollection<any>(paymentsQuery);

  const allTransactions = useMemo(() => {
    if (rawPayments && rawPayments.length > 0) {
      return rawPayments.map((p: any) => ({
        id: p.id,
        receiptNumber: p.receiptNumber || `RCP-${p.id.slice(0, 8)}`,
        patientName: p.patientName || 'Patient',
        ehrNumber: p.ehrNumber || 'EHR',
        totalAmount: p.amountPaid || p.totalAmount || 0,
        paymentMethod: p.paymentMethod || 'Cash',
        momoNetwork: p.momoNetwork,
        cashierName: p.cashierName || userProfile?.fullName || 'Cashier',
        cashierStaffId: p.cashierStaffId || 'GAM-STF',
        timestamp: p.createdAt?.toDate ? p.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today',
        itemCount: p.itemCount || 1,
        status: p.status || 'SETTLED',
      }));
    }
    return DEFAULT_TRANSACTIONS;
  }, [rawPayments, userProfile]);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      const matchesMethod = selectedMethod === 'ALL' || t.paymentMethod === selectedMethod;
      const matchesSearch = 
        !searchTerm ||
        t.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.ehrNumber.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesMethod && matchesSearch;
    });
  }, [allTransactions, selectedMethod, searchTerm]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalCollected = allTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const cashTotal = allTransactions.filter(t => t.paymentMethod === 'Cash').reduce((sum, t) => sum + t.totalAmount, 0);
    const momoTotal = allTransactions.filter(t => t.paymentMethod === 'MobileMoney').reduce((sum, t) => sum + t.totalAmount, 0);
    const posTotal = allTransactions.filter(t => t.paymentMethod === 'POS').reduce((sum, t) => sum + t.totalAmount, 0);

    return {
      totalCollected,
      cashTotal,
      momoTotal,
      posTotal,
      txnCount: allTransactions.length,
    };
  }, [allTransactions]);

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* 1. HERO HEADER */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5" /> Revenue & Receipts Archive
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Daily Till Settlement Ledger
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3 italic">
              <Landmark className="w-7 h-7 text-emerald-400" />
              Transaction Reports & Receipts
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">
              Itemized patient payments, payment rail reconciliation, and shift cashier audits
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handlePrintReport}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider gap-2 border border-slate-700 shadow-md"
            >
              <Printer className="w-4 h-4" /> Print Daily Summary
            </Button>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Total Revenue</span>
            <span className="text-xl font-black text-emerald-400 font-mono">GHS {metrics.totalCollected.toFixed(2)}</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Cash in Drawer</span>
            <span className="text-xl font-black text-white font-mono">GHS {metrics.cashTotal.toFixed(2)}</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Mobile Money</span>
            <span className="text-xl font-black text-amber-400 font-mono">GHS {metrics.momoTotal.toFixed(2)}</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">POS Card</span>
            <span className="text-xl font-black text-indigo-400 font-mono">GHS {metrics.posTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold overflow-x-auto">
          {(['ALL', 'Cash', 'MobileMoney', 'POS', 'SplitPayer'] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setSelectedMethod(method)}
              className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition cursor-pointer text-[11px] ${
                selectedMethod === method
                  ? 'bg-emerald-600 text-white font-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {method === 'MobileMoney' ? 'MoMo' : method === 'SplitPayer' ? 'NHIS Co-Pay' : method}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search receipt #, patient, EHR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* 3. TRANSACTION LEDGER TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-4 pl-6">Receipt & Time</th>
                <th className="py-4 px-4">Patient Identity</th>
                <th className="py-4 px-4">Payment Method</th>
                <th className="py-4 px-4">Cashier</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 pr-6 text-right">Amount (GHS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Receipt className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="font-bold uppercase tracking-wider text-xs">No transactions found</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-800/40 transition">
                    {/* Receipt & Time */}
                    <td className="py-4 pl-6">
                      <span className="font-mono font-bold text-white block">{txn.receiptNumber}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{txn.timestamp}</span>
                    </td>

                    {/* Patient */}
                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-200 block uppercase">{txn.patientName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{txn.ehrNumber} • {txn.itemCount} items</span>
                    </td>

                    {/* Method */}
                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold text-[10px] uppercase border border-slate-700 inline-block">
                        {txn.paymentMethod === 'MobileMoney' ? (txn.momoNetwork || 'MTN MoMo') : txn.paymentMethod}
                      </span>
                    </td>

                    {/* Cashier */}
                    <td className="py-4 px-4">
                      <span className="text-slate-300 font-medium block">{txn.cashierName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{txn.cashierStaffId}</span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" /> {txn.status}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-4 pr-6 text-right font-mono font-black text-sm text-emerald-400">
                      GHS {txn.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
