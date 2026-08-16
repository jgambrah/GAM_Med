'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, Search, Receipt, Clock, ArrowRight, 
  Loader2, ShieldCheck, CheckCircle2, User, Wallet,
  Landmark, Sparkles, Building2, ChevronRight, FileText,
  Lock, Unlock, Banknote, ShieldAlert, AlertCircle, Coins
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function BillingQueuePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Active Till Security Gate Check (Separation of Duties & Cashier Custody)
  const activeTillQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !user?.uid) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/cash_tills`),
      where("cashierId", "==", user.uid),
      where("status", "==", "OPEN")
    );
  }, [firestore, hospitalId, user?.uid]);
  const { data: activeTills, isLoading: isTillLoading } = useCollection<any>(activeTillQuery);
  const isTillOpen = activeTills && activeTills.length > 0;
  const activeTill = isTillOpen ? activeTills[0] : null;

  // Open Till Form State
  const [openingFloat, setOpeningFloat] = useState<string>('200.00');
  const [shiftType, setShiftType] = useState<string>('MORNING_SHIFT');
  const [drawerId, setDrawerId] = useState<string>('DRAWER-01');
  const [isFloatConfirmed, setIsFloatConfirmed] = useState(false);
  const [isOpeningTill, setIsOpeningTill] = useState(false);

  // 2. Fetch all unpaid billing items in the facility
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

  const handleOpenTill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFloatConfirmed) {
      toast({ variant: 'destructive', title: 'Float Verification Required', description: 'Please certify that you counted the opening physical cash.' });
      return;
    }

    const floatNum = parseFloat(openingFloat);
    if (isNaN(floatNum) || floatNum < 0) {
      toast({ variant: 'destructive', title: 'Invalid Float Amount', description: 'Please enter a valid opening float (e.g. 200.00).' });
      return;
    }

    setIsOpeningTill(true);
    try {
      if (!firestore || !user || !hospitalId) {
        throw new Error("Missing database or hospital session context.");
      }

      const tillsCollection = collection(firestore, `hospitals/${hospitalId}/cash_tills`);
      await addDocumentNonBlocking(tillsCollection, {
        hospitalId,
        cashierId: user.uid,
        cashierName: userProfile?.fullName || userProfile?.name || 'Priscilla Adysei',
        openingFloat: floatNum,
        shiftType,
        drawerId,
        declaredPhysicalCash: 0,
        systemExpectedCash: floatNum,
        status: 'OPEN',
        openedAt: serverTimestamp(),
        dateString: new Date().toISOString().split('T')[0]
      });

      toast({
        title: "Till Opened & Shift Started",
        description: `Active session on ${drawerId} with starting float ₵${floatNum.toFixed(2)}. Billing Console unlocked.`
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Failed to Open Till", description: err.message });
    } finally {
      setIsOpeningTill(false);
    }
  };

  const isLoading = isUserLoading || isProfileLoading || isUnpaidLoading || isTillLoading;

  if (isLoading) {
    return (
      <div className="flex h-[70vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-xs font-semibold">Verifying Cashier Till Custody & Billing Queue...</p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SECURITY INTERCEPT: OPEN TILL & DECLARE OPENING FLOAT GATE
  // -------------------------------------------------------------
  if (!isTillOpen) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-16 pt-4">
        
        {/* Signature Dark Lockout Banner */}
        <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> TILL LOCKOUT ACTIVE
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Enterprise Financial Security Gate
                </span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3 italic">
                <Banknote className="w-7 h-7 text-amber-400" />
                Open Till & Declare Float
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">
                Shift Commencement Protocol — Baseline Cash Verification
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Cashier Profile</span>
              <span className="text-sm font-mono font-bold text-amber-300">
                {userProfile?.fullName || userProfile?.name || 'Priscilla Adysei'}
              </span>
            </div>
          </div>
        </div>

        {/* Security Authorization Form Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-indigo-600" />

          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold">Point of Sale Access Blocked:</p>
              <p>In accordance with Hospital Internal Controls, cashiers must physically count and declare their starting drawer change (Opening Float) before accepting patient billings.</p>
            </div>
          </div>

          <form onSubmit={handleOpenTill} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Float Amount */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black uppercase text-slate-600 dark:text-slate-400 font-mono">
                  Opening Float (GHS ₵) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-sm font-mono font-bold text-slate-400">₵</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value)}
                    placeholder="200.00"
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-black text-base text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Standard baseline starting drawer float</p>
              </div>

              {/* Shift Type */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black uppercase text-slate-600 dark:text-slate-400 font-mono">
                  Assigned Shift *
                </label>
                <select
                  value={shiftType}
                  onChange={(e) => setShiftType(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="MORNING_SHIFT">Morning Shift (07:00 - 15:00)</option>
                  <option value="AFTERNOON_SHIFT">Afternoon Shift (15:00 - 23:00)</option>
                  <option value="NIGHT_SHIFT">Night Shift (23:00 - 07:00)</option>
                  <option value="WEEKEND_SHIFT">Weekend 12-Hr Shift</option>
                </select>
                <p className="text-[10px] text-slate-400 font-medium">Active roster schedule</p>
              </div>

              {/* Drawer ID */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black uppercase text-slate-600 dark:text-slate-400 font-mono">
                  Physical Cash Drawer *
                </label>
                <select
                  value={drawerId}
                  onChange={(e) => setDrawerId(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="DRAWER-01">Drawer 01 (Main OPD Window 1)</option>
                  <option value="DRAWER-02">Drawer 02 (Main OPD Window 2)</option>
                  <option value="DRAWER-03">Drawer 03 (Emergency / Triage Desk)</option>
                  <option value="DRAWER-04">Drawer 04 (Pharmacy POS Cashier)</option>
                </select>
                <p className="text-[10px] text-slate-400 font-medium">Hardware station identifier</p>
              </div>
            </div>

            {/* Float Certification Checkbox */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="text-xs font-bold flex items-center gap-3 cursor-pointer text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={isFloatConfirmed}
                  onChange={(e) => setIsFloatConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>I certify that I have physically counted the opening drawer cash (₵{parseFloat(openingFloat || '0').toFixed(2)}) and accept primary treasury custody for this shift.</span>
              </label>
            </div>

            {/* Unlock Button */}
            <button
              type="submit"
              disabled={isOpeningTill || !isFloatConfirmed}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              {isOpeningTill ? <Loader2 className="w-5 h-5 animate-spin" /> : <Unlock className="w-5 h-5" />}
              <span>START SHIFT & OPEN TILL</span>
            </button>

          </form>
        </div>

      </div>
    );
  }

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
