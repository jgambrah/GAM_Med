'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, Search, Receipt, Clock, ArrowRight, 
  Loader2, ShieldCheck, CheckCircle2, User, Wallet,
  Landmark, Sparkles, Building2, ChevronRight, FileText
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BillingQueuePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch all unpaid billing items in the facility
  const unpaidBillsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, "hospitals", hospitalId, "billing_items"),
      where('status', '==', 'UNPAID')
    );
  }, [firestore, hospitalId]);
  
  const { data: rawUnpaidItems, isLoading: isUnpaidLoading } = useCollection(unpaidBillsQuery);

  // Demodata Fallback for Immediate Audit & Shift Demonstration
  const demoUnpaidItems = useMemo(() => [
    { id: 'bi-1', patientId: 'P-9921', patientName: 'Kwame Asante Mensah', total: 150.00, ehrNumber: 'GAM-P-9921', payerType: 'NHIS_PLUS', createdAt: { toDate: () => new Date('2026-08-16T10:15:00') } },
    { id: 'bi-2', patientId: 'P-9921', patientName: 'Kwame Asante Mensah', total: 80.00, ehrNumber: 'GAM-P-9921', payerType: 'NHIS_PLUS', createdAt: { toDate: () => new Date('2026-08-16T10:15:00') } },
    { id: 'bi-3', patientId: 'P-8812', patientName: 'Abena Serwaa Ampofo', total: 320.00, ehrNumber: 'GAM-P-8812', payerType: 'PRIVATE_CASH', createdAt: { toDate: () => new Date('2026-08-16T09:30:00') } },
    { id: 'bi-4', patientId: 'P-7740', patientName: 'Emmanuel Ofori Atta', total: 450.00, ehrNumber: 'GAM-P-7740', payerType: 'ACACIA_HMO', createdAt: { toDate: () => new Date('2026-08-16T08:45:00') } },
    { id: 'bi-5', patientId: 'P-6102', patientName: 'Sarah Mensah Addo', total: 195.00, ehrNumber: 'GAM-P-6102', payerType: 'NATIONWIDE', createdAt: { toDate: () => new Date('2026-08-16T11:20:00') } },
  ], []);

  const unpaidItems = rawUnpaidItems && rawUnpaidItems.length > 0 ? rawUnpaidItems : demoUnpaidItems;

  const groupedBills = useMemo(() => {
    if (!unpaidItems) return [];
    const groups: { [key: string]: { patientId: string; patientName: string; ehrNumber: string; payerType: string; totalAmount: number; itemCount: number; lastActivity: Date | null } } = {};
    
    unpaidItems.forEach(item => {
      const pid = item.patientId;
      if (!pid) return;
      
      let itemDate = null;
      if (item.createdAt && typeof item.createdAt.toDate === 'function') {
        itemDate = item.createdAt.toDate();
      } else if (item.createdAt) {
        itemDate = new Date(item.createdAt);
      }
      
      if (!groups[pid]) {
        groups[pid] = {
          patientId: pid,
          patientName: item.patientName || 'Unknown Patient',
          ehrNumber: item.ehrNumber || `GAM-P-${pid}`,
          payerType: item.payerType || 'PRIVATE_CASH',
          totalAmount: 0,
          itemCount: 0,
          lastActivity: itemDate
        };
      }
      groups[pid].totalAmount += item.total || 0;
      groups[pid].itemCount += 1;
      if (itemDate && (!groups[pid].lastActivity || itemDate > groups[pid].lastActivity!)) {
        groups[pid].lastActivity = itemDate;
      }
    });

    return Object.values(groups);
  }, [unpaidItems]);

  const filteredBills = useMemo(() => {
    if (!searchTerm.trim()) return groupedBills;
    const q = searchTerm.toLowerCase();
    return groupedBills.filter(b => 
      b.patientName.toLowerCase().includes(q) ||
      b.patientId.toLowerCase().includes(q) ||
      b.ehrNumber.toLowerCase().includes(q)
    );
  }, [groupedBills, searchTerm]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalReceivable = groupedBills.reduce((acc, curr) => acc + curr.totalAmount, 0);
    return {
      pendingEncounterCount: groupedBills.length,
      totalReceivable,
    };
  }, [groupedBills]);

  const isLoading = isUserLoading || isProfileLoading || isUnpaidLoading;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* 1. GAM MED SIGNATURE COMMAND BANNER */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" /> Point of Sale & Revenue Hub
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Cashier: {userProfile?.fullName || 'Priscilla Adysei'} ({userProfile?.staffNumber || 'GAM/STF/26/0008'})
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3 italic">
              <Receipt className="w-7 h-7 text-emerald-400" />
              Patient Billing Console
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">
              Encounter Accrual Aggregation, Multi-Rail Checkout & Cryptographic Receipting
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-right min-w-[140px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Unpaid Queue</span>
              <span className="text-2xl font-mono font-black text-amber-400">{metrics.pendingEncounterCount} Patients</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-right min-w-[150px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Total Receivable</span>
              <span className="text-2xl font-mono font-black text-emerald-400">GHS {metrics.totalReceivable.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search patient name, EHR ID, or Ghana Card..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 shadow-inner"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live Clinical Billing Stream Active</span>
        </div>
      </div>

      {/* 3. PATIENT BILLING QUEUE GRID */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-4 pl-6">Patient Identity</th>
                <th className="py-4 px-4">EHR & Payer Classification</th>
                <th className="py-4 px-4">Pending Items</th>
                <th className="py-4 px-4">Last Activity</th>
                <th className="py-4 px-4 text-right">Total Accrued</th>
                <th className="py-4 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
                    <p className="font-bold uppercase tracking-wider text-xs">Streaming unpaid encounter ledger...</p>
                  </td>
                </tr>
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-60" />
                    <p className="font-bold uppercase tracking-wider text-xs">No pending uncollected bills</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">All outpatient and inpatient encounters are settled.</p>
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => (
                  <tr key={bill.patientId} className="hover:bg-slate-800/40 transition">
                    {/* Patient Name */}
                    <td className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center font-black text-slate-300">
                          {bill.patientName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-white block uppercase text-sm">{bill.patientName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">ID #{bill.patientId}</span>
                        </div>
                      </div>
                    </td>

                    {/* EHR & Payer */}
                    <td className="py-4 px-4">
                      <span className="font-mono text-slate-300 font-bold block">{bill.ehrNumber}</span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-emerald-500/30 inline-block mt-0.5">
                        {bill.payerType.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Pending Items */}
                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-300">{bill.itemCount} billable lines</span>
                      <span className="text-[10px] text-slate-500 block font-mono">Pharmacy / Lab / Consult</span>
                    </td>

                    {/* Last Activity */}
                    <td className="py-4 px-4 font-mono text-slate-400">
                      {bill.lastActivity ? bill.lastActivity.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                    </td>

                    {/* Total Amount */}
                    <td className="py-4 px-4 text-right font-mono font-black text-base text-emerald-400">
                      GHS {bill.totalAmount.toFixed(2)}
                    </td>

                    {/* Action Button */}
                    <td className="py-4 pr-6 text-right">
                      <Link href={`/finance/billing/invoice/${bill.patientId}`}>
                        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider px-4 py-2 rounded-xl shadow-lg shadow-emerald-600/20 gap-1.5 cursor-pointer">
                          Process Checkout <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
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
