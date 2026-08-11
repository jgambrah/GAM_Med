'use client';

import React, { useState, useMemo } from 'react';
import { 
  FileText, DollarSign, Wallet, FileCheck, Lock, Download, 
  Printer, Search, ArrowRightLeft, CheckCircle2, ShieldAlert,
  Clock, Filter, ShieldCheck, AlertCircle
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface ShiftTransaction {
  id: string;
  receiptNo: string;
  time: string;
  patientName: string;
  mrn: string;
  amount: number;
  paymentRoute: 'CASH PAYMENT' | 'NHIS CLAIM' | 'MOBILE MONEY' | 'CREDIT ACCOUNT';
  status: 'RECONCILED' | 'PENDING AUDIT' | 'FLAGGED VARIANCE';
}

const MOCK_ACTIVE_SHIFT_TRANSACTIONS: ShiftTransaction[] = [
  {
    id: 'TXN-9984-A',
    receiptNo: 'TXN-9984-A',
    time: '08:42 AM',
    patientName: 'Janet Bonah',
    mrn: 'MMH/EHR/26/0005',
    amount: 145.00,
    paymentRoute: 'CASH PAYMENT',
    status: 'RECONCILED',
  },
  {
    id: 'TXN-9985-B',
    receiptNo: 'TXN-9985-B',
    time: '09:15 AM',
    patientName: 'Benjamin Hedidor',
    mrn: 'MMH/EHR/26/0007',
    amount: 420.00,
    paymentRoute: 'NHIS CLAIM',
    status: 'RECONCILED',
  },
  {
    id: 'TXN-9986-C',
    receiptNo: 'TXN-9986-C',
    time: '10:30 AM',
    patientName: 'Daniel Sarfo',
    mrn: 'MMH/EHR/26/0012',
    amount: 280.00,
    paymentRoute: 'CASH PAYMENT',
    status: 'RECONCILED',
  },
  {
    id: 'TXN-9987-D',
    receiptNo: 'TXN-9987-D',
    time: '11:05 AM',
    patientName: 'Abena Osei',
    mrn: 'MMH/EHR/26/0019',
    amount: 650.00,
    paymentRoute: 'NHIS CLAIM',
    status: 'RECONCILED',
  },
  {
    id: 'TXN-9988-E',
    receiptNo: 'TXN-9988-E',
    time: '11:45 AM',
    patientName: 'Kwame Ampofo',
    mrn: 'MMH/EHR/26/0024',
    amount: 95.00,
    paymentRoute: 'MOBILE MONEY',
    status: 'RECONCILED',
  },
  {
    id: 'TXN-9989-F',
    receiptNo: 'TXN-9989-F',
    time: '12:20 PM',
    patientName: 'Grace Mensah',
    mrn: 'MMH/EHR/26/0031',
    amount: 310.00,
    paymentRoute: 'CASH PAYMENT',
    status: 'RECONCILED',
  },
];

const MOCK_ARCHIVE_SHIFT_TRANSACTIONS: ShiftTransaction[] = [
  {
    id: 'TXN-8810-X',
    receiptNo: 'TXN-8810-X',
    time: '05:30 PM (Yesterday)',
    patientName: 'Kofi Owusu',
    mrn: 'MMH/EHR/26/0002',
    amount: 510.00,
    paymentRoute: 'CASH PAYMENT',
    status: 'RECONCILED',
  },
  {
    id: 'TXN-8811-Y',
    receiptNo: 'TXN-8811-Y',
    time: '07:15 PM (Yesterday)',
    patientName: 'Ama Serwaa',
    mrn: 'MMH/EHR/26/0004',
    amount: 890.00,
    paymentRoute: 'NHIS CLAIM',
    status: 'RECONCILED',
  },
];

export default function ShiftReportsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'ACTIVE_SHIFT' | 'ARCHIVE'>('ACTIVE_SHIFT');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLockingTill, setIsLockingTill] = useState(false);
  const [shiftClosed, setShiftClosed] = useState(false);

  const transactions = activeTab === 'ACTIVE_SHIFT' ? MOCK_ACTIVE_SHIFT_TRANSACTIONS : MOCK_ARCHIVE_SHIFT_TRANSACTIONS;

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const queryLower = searchQuery.toLowerCase();
    return transactions.filter(t => 
      t.receiptNo.toLowerCase().includes(queryLower) ||
      t.patientName.toLowerCase().includes(queryLower) ||
      t.mrn.toLowerCase().includes(queryLower) ||
      t.paymentRoute.toLowerCase().includes(queryLower)
    );
  }, [transactions, searchQuery]);

  const grossTotal = useMemo(() => transactions.reduce((acc, t) => acc + t.amount, 0), [transactions]);
  const cashInTill = useMemo(() => transactions.filter(t => t.paymentRoute === 'CASH PAYMENT' || t.paymentRoute === 'MOBILE MONEY').reduce((acc, t) => acc + t.amount, 0), [transactions]);
  const nhisClaims = useMemo(() => transactions.filter(t => t.paymentRoute === 'NHIS CLAIM').reduce((acc, t) => acc + t.amount, 0), [transactions]);

  const handleExportLedger = () => {
    const headers = ['Receipt No', 'Time', 'Patient Name', 'MRN', 'Amount (GHS)', 'Payment Route', 'Status'];
    const rows = filteredTransactions.map(t => [
      `"${t.receiptNo}"`,
      `"${t.time}"`,
      `"${t.patientName}"`,
      `"${t.mrn}"`,
      t.amount.toFixed(2),
      `"${t.paymentRoute}"`,
      `"${t.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pharmacy_shift_financial_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: '📥 Financial Shift Ledger Exported',
      description: `Exported ${filteredTransactions.length} reconciled transactions to CSV.`
    });
  };

  const handlePrintStatement = () => {
    window.print();
  };

  const handleCloseShift = () => {
    if (confirm('Are you sure you want to close the active shift, lock the cash till, and sign the daily ledger balance?')) {
      setIsLockingTill(true);
      setTimeout(() => {
        setIsLockingTill(false);
        setShiftClosed(true);
        toast({
          title: '🔒 SHIFT CLOSED & CASH TILL LOCKED',
          description: `Total Reconciled Cash: GHS ${cashInTill.toFixed(2)} | NHIS Claims: GHS ${nhisClaims.toFixed(2)}. End-of-shift ledger posting signed by ${user?.displayName || 'Pharmacist'}.`
        });
      }, 1200);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* 1. THE DARK COMMAND BANNER */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        
        {/* Background Accent Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10 pb-5 border-b border-slate-800/60 mb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase italic flex items-center gap-3">
              <FileText className="w-7 h-7 text-emerald-400" />
              FINANCIAL SHIFT RECONCILIATION
            </h1>
            <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-widest">
              Daily Cash Statements, NHIS Copays & End-of-Shift Handover Logs
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button 
              type="button"
              onClick={handleExportLedger}
              className="px-4 py-2 text-[10px] font-bold text-slate-300 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-lg transition flex items-center gap-2 uppercase tracking-wide cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export Ledger
            </button>

            <button 
              type="button"
              onClick={handlePrintStatement}
              className="px-4 py-2 text-[10px] font-bold text-slate-300 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-lg transition flex items-center gap-2 uppercase tracking-wide cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print Statement
            </button>

            <button 
              type="button"
              disabled={shiftClosed || isLockingTill}
              onClick={handleCloseShift}
              className="px-4 py-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg transition shadow-sm flex items-center gap-2 uppercase tracking-wide cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" /> 
              {isLockingTill ? 'LOCKING TILL...' : shiftClosed ? 'SHIFT LOCKED & CLOSED' : 'Close Shift & Lock Till'}
            </button>
          </div>
        </div>

        {/* Financial Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Gross Dispensed Value</span>
            <span className="text-2xl font-black text-white">GHS {grossTotal.toFixed(2)}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Wallet className="w-3 h-3 text-emerald-400" /> Cash in Till
            </span>
            <span className="text-2xl font-black text-emerald-400">GHS {cashInTill.toFixed(2)}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <FileCheck className="w-3 h-3 text-indigo-400" /> NHIS Claims Value
            </span>
            <span className="text-2xl font-black text-indigo-400">GHS {nhisClaims.toFixed(2)}</span>
          </div>

          <div className="bg-slate-900 border border-rose-900/50 shadow-[0_0_15px_rgba(225,29,72,0.05)] rounded-xl p-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>
            <span className="block text-[10px] font-bold text-rose-400/80 uppercase tracking-widest mb-1 pl-2">Unreconciled Variances</span>
            <span className="text-2xl font-black text-rose-400 pl-2">GHS 0.00</span>
          </div>

        </div>
      </div>

      {/* 2. TAB CONTROLS & SEARCH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex bg-slate-900 dark:bg-slate-900 rounded-xl p-1 border border-slate-800 w-fit">
          <button 
            type="button"
            onClick={() => setActiveTab('ACTIVE_SHIFT')}
            className={`px-5 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === 'ACTIVE_SHIFT' 
                ? 'bg-slate-700 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Current Active Shift
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('ARCHIVE')}
            className={`px-5 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === 'ARCHIVE' 
                ? 'bg-slate-700 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Past Handover Archives
          </button>
        </div>

        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none transition shadow-sm" 
            placeholder="Search receipt or MRN..." 
          />
        </div>
      </div>

      {/* 3. TRANSACTION LEDGER TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <th className="py-4 pl-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Time & Receipt</th>
                <th className="py-4 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Patient / MRN</th>
                <th className="py-4 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Gross Total</th>
                <th className="py-4 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Payment Route</th>
                <th className="py-4 pr-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                  
                  {/* Time & Receipt */}
                  <td className="py-4 pl-6">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">{t.time}</span>
                    <span className="text-[10px] font-mono font-medium text-slate-400">{t.receiptNo}</span>
                  </td>

                  {/* Patient / MRN */}
                  <td className="py-4 px-4">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block uppercase">{t.patientName}</span>
                    <span className="text-[10px] font-mono font-medium text-slate-400">{t.mrn}</span>
                  </td>

                  {/* Gross Total */}
                  <td className="py-4 px-4 text-right">
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">GHS {t.amount.toFixed(2)}</span>
                  </td>

                  {/* Payment Route */}
                  <td className="py-4 px-4 text-right">
                    {t.paymentRoute === 'NHIS CLAIM' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-md uppercase tracking-wider">
                        NHIS CLAIM
                      </span>
                    ) : t.paymentRoute === 'MOBILE MONEY' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 rounded-md uppercase tracking-wider">
                        MOBILE MONEY
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-md uppercase tracking-wider">
                        CASH PAYMENT
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-4 pr-6 text-right">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md uppercase tracking-wider">
                      <ArrowRightLeft className="w-3 h-3 text-emerald-500" /> {t.status}
                    </span>
                  </td>

                </tr>
              ))}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-xs font-bold uppercase">No Shift Transactions Found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
