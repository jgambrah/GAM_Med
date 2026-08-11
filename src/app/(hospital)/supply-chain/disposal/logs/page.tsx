'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { Search, ShieldAlert, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

// Mock Data matching the blueprint lifecycle
const defaultMockDisposals = [
  {
    id: 'DS-404557',
    disposalId: 'DS-404557',
    productName: 'AMOXICILLIN 500MG',
    sku: 'MED-AMO-327',
    location: 'Pharmacy Shelves',
    reason: 'EXPIRED',
    status: 'PENDING',
    qty: 70,
    unitPrice: 10.00,
    lossValue: 700.00,
    createdAtStr: '28/06/2026'
  },
  {
    id: 'DS-007734',
    disposalId: 'DS-007734',
    productName: 'NUGEL-O SUSPENSION',
    sku: 'MED-NUG-773',
    location: 'Pharmacy Shelves',
    reason: 'EXPIRED',
    status: 'PENDING',
    qty: 2,
    unitPrice: 18.50,
    lossValue: 37.00,
    createdAtStr: '28/06/2026'
  },
  {
    id: 'DS-811172',
    disposalId: 'DS-811172',
    productName: 'AMOXICILLIN 500MG',
    sku: 'MED-AMO-327',
    location: 'Pharmacy Shelves',
    reason: 'EXPIRED',
    status: 'PENDING',
    qty: 400,
    unitPrice: 10.00,
    lossValue: 4000.00,
    createdAtStr: '28/06/2026'
  },
  {
    id: 'DS-409210',
    disposalId: 'DS-409210',
    productName: 'AMOXICILLIN 500MG',
    sku: 'MED-AMO-327',
    location: 'Pharmacy Shelves',
    reason: 'EXPIRED',
    status: 'PENDING',
    qty: 50,
    unitPrice: 10.00,
    lossValue: 500.00,
    createdAtStr: '06/03/2026'
  }
];

export default function DisposalLogsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [mockState, setMockState] = useState(defaultMockDisposals);
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, 'APPROVED' | 'REJECTED'>>({});

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'PHARMACIST', 'STORE_MANAGER', 'AUDITOR', 'SUPERVISOR'].includes(userRole || '');

  const logsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/disposal_logs`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, hospitalId]);
  const { data: rawLogs, isLoading: areLogsLoading } = useCollection(logsQuery);

  // Smart unit price fallback for items without explicit master pricing
  const getEstimatedUnitPrice = (name: string, sku: string) => {
    const n = (name + ' ' + sku).toLowerCase();
    if (n.includes('nugel') || n.includes('nug-')) return 18.50;
    if (n.includes('amox') || n.includes('amo-')) return 10.00;
    if (n.includes('vita') || n.includes('vit-')) return 12.50;
    if (n.includes('efpac') || n.includes('efp-')) return 14.00;
    return 15.00;
  };

  // Normalize Firestore logs or fallback to mock logs
  const allLogs = useMemo(() => {
    let sourceList = mockState;
    if (rawLogs && rawLogs.length > 0) {
      sourceList = rawLogs.map(log => {
        const name = log.productName || log.name || 'Decommissioned Stock';
        const sku = log.sku || 'MED-GEN-000';
        const qty = Number(log.qty || log.quantity || 0);
        let unitPrice = Number(log.unitPrice || log.price || log.acquisitionCost || 0);
        
        if (unitPrice <= 0) {
          unitPrice = getEstimatedUnitPrice(name, sku);
        }

        let lossValue = Number(log.lossValue || 0);
        if (lossValue <= 0) {
          lossValue = unitPrice * qty;
        }
        
        const dateStr = log.createdAt 
          ? format(log.createdAt.toDate(), 'dd/MM/yyyy') 
          : (log.createdAtStr || 'Recent');

        return {
          id: log.id,
          rawId: log.id,
          disposalId: log.disposalId || `DS-${log.id.slice(0, 6).toUpperCase()}`,
          productName: name,
          sku: sku,
          location: (log.location || 'Pharmacy Shelves').replace('_', ' '),
          reason: (log.reason || 'WASTAGE').toUpperCase(),
          status: log.status || 'PENDING',
          qty: qty,
          unitPrice: unitPrice,
          lossValue: lossValue,
          createdAtStr: dateStr,
          productId: log.productId || log.stockId,
          isReal: true
        };
      });
    }

    // Apply Optimistic status overrides
    return sourceList.map(log => {
      const override = optimisticStatuses[log.id];
      return override ? { ...log, status: override } : log;
    });
  }, [rawLogs, mockState, optimisticStatuses]);

  // Financial Metrics: Reactive Calculations via useMemo
  const metrics = useMemo(() => {
    return allLogs.reduce(
      (acc, log) => {
        if (log.status === 'PENDING') acc.pendingRisk += log.lossValue || 0;
        if (log.status === 'APPROVED') acc.totalLoss += log.lossValue || 0;
        return acc;
      },
      { pendingRisk: 0, totalLoss: 0 }
    );
  }, [allLogs]);

  // Filtered Logs by Search & Status Filter
  const displayedLogs = useMemo(() => {
    return allLogs.filter(log => {
      const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
      if (!matchesStatus) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        log.disposalId.toLowerCase().includes(q) ||
        log.productName.toLowerCase().includes(q) ||
        log.sku.toLowerCase().includes(q) ||
        log.location.toLowerCase().includes(q) ||
        log.reason.toLowerCase().includes(q)
      );
    });
  }, [allLogs, statusFilter, searchQuery]);

  // Optimistic UI Status Handler (Approve / Reject)
  const handleUpdateStatus = async (log: any, newStatus: 'APPROVED' | 'REJECTED') => {
    // 1. Optimistic UI update: Instantly change status in local UI & recalculate totals
    setOptimisticStatuses(prev => ({ ...prev, [log.id]: newStatus }));
    setMockState(prev => prev.map(m => m.id === log.id ? { ...m, status: newStatus } : m));

    toast({ 
      title: newStatus === 'APPROVED' ? "Disposal Approved" : "Disposal Rejected", 
      description: `Record #${log.disposalId} status updated to ${newStatus}. Dispatching audit receipt...` 
    });

    const activeUser = user?.displayName || user?.email || 'Shane Gambrah';

    try {
      // 2. Perform actual Firestore transaction if real DB record
      if (log.isReal && firestore && hospitalId && user) {
        const batch = writeBatch(firestore);
        const logRef = doc(firestore, `hospitals/${hospitalId}/disposal_logs`, log.rawId || log.id);
        
        if (newStatus === 'APPROVED') {
          batch.update(logRef, {
            status: 'APPROVED',
            approvedBy: user.uid,
            approvedByName: activeUser,
            approvedAt: serverTimestamp()
          });

          if (log.productId) {
            const invRef = doc(firestore, `hospitals/${hospitalId}/pharmacy_inventory`, log.productId);
            batch.update(invRef, {
              quantity: increment(-Number(log.qty || 0))
            });
          }
        } else {
          batch.update(logRef, {
            status: 'REJECTED',
            rejectedBy: user.uid,
            rejectedByName: activeUser,
            rejectedAt: serverTimestamp()
          });
        }

        await batch.commit();
      }

      // 3. DISPATCH IMMUTABLE EMAIL NOTIFICATION RECEIPT
      await fetch('/api/disposals/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: log.disposalId || log.id,
          drug: log.productName,
          sku: log.sku,
          qty: log.qty,
          loss: log.lossValue,
          status: newStatus,
          processedBy: activeUser,
        }),
      });

      console.log(`[AUDIT COMPLETE] Disposal #${log.disposalId} updated to ${newStatus} & email dispatched.`);
    } catch (err: any) {
      console.error("Status Update Error:", err);
      // Revert optimistic state on error
      setOptimisticStatuses(prev => {
        const next = { ...prev };
        delete next[log.id];
        return next;
      });
      setMockState(prev => prev.map(m => m.id === log.id ? { ...m, status: 'PENDING' } : m));

      toast({ 
        variant: 'destructive', 
        title: "Action Failed", 
        description: err.message || "Failed to process audit action. Rolling back..." 
      });
    }
  };

  const pageIsLoading = isUserLoading || isProfileLoading;
  if (pageIsLoading) return <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-rose-600"/></div>;

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4 text-black font-bold">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You do not have authorization to access the Disposal Archive.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* 1. DARK HERO BANNER & METRICS */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-md space-y-5 relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white uppercase italic flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              DISPOSAL ARCHIVE
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Historical record of decommissioned stock, FEFO wastage, and regulatory audits.
            </p>
          </div>

          {/* Reactive Financial Impact Dashboard */}
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-right shrink-0 min-w-[150px]">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Pending Value Risk
              </span>
              <span className="text-lg font-black text-amber-500">
                ₵ {metrics.pendingRisk.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-right shrink-0 min-w-[150px]">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Total Loss (Approved)
              </span>
              <span className="text-lg font-black text-rose-500">
                ₵ {metrics.totalLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by ID, Drug Name, or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition cursor-pointer ${
                  statusFilter === tab 
                    ? 'bg-slate-700 text-white' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. MODERNIZED AUDIT TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-4">Date & Record ID</th>
                <th className="px-5 py-4">Product & SKU</th>
                <th className="px-5 py-4">Location</th>
                <th className="px-5 py-4">Context</th>
                <th className="px-5 py-4 text-right">Loss Impact</th>
                <th className="px-5 py-4 text-center">Audit Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {areLogsLoading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-rose-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-medium">Fetching Disposal Audit Records...</p>
                  </td>
                </tr>
              ) : displayedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 font-medium text-xs">
                    No disposal records match your filter criteria.
                  </td>
                </tr>
              ) : (
                displayedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    {/* Date & Record ID */}
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100 font-mono text-xs">#{log.disposalId}</div>
                      <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{log.createdAtStr}</div>
                    </td>

                    {/* Product & SKU */}
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase">{log.productName}</div>
                      <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">{log.sku}</div>
                    </td>

                    {/* Location */}
                    <td className="px-5 py-4 text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">
                      {log.location}
                    </td>

                    {/* Context (Reason + Status + Qty) */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md uppercase">
                          {log.reason}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                          log.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
                          log.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' :
                          'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                      <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        Qty: <strong className="text-slate-700 dark:text-slate-200">{log.qty} Units</strong>
                      </div>
                    </td>

                    {/* Loss Impact */}
                    <td className="px-5 py-4 text-right">
                      <span className={`font-bold text-xs font-mono ${log.status === 'REJECTED' ? 'text-slate-400 line-through' : 'text-rose-600 dark:text-rose-400'}`}>
                        ₵ {log.lossValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Audit Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/supply-chain/disposal/certificate/${log.id}`}>
                          <button 
                            title="View Certificate" 
                            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-md transition cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </Link>

                        {/* Supervisor Actions for PENDING items */}
                        {log.status === 'PENDING' && (
                          <>
                            <button 
                              onClick={() => handleUpdateStatus(log, 'APPROVED')}
                              title="Approve" 
                              className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-md transition cursor-pointer"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(log, 'REJECTED')}
                              title="Reject" 
                              className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md transition cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
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
