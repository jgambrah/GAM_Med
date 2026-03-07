'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { Archive, Search, FileText, Printer, Skull, TrendingDown, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DisposalLogsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  const logsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/disposal_logs`),
      orderBy("createdAt", "desc")
    );
  }, [firestore, hospitalId]);

  const { data: logs, isLoading: areLogsLoading } = useCollection(logsQuery);

  const totalLoss = useMemo(() => {
      if(!logs) return 0;
      return logs.reduce((sum, log) => sum + (log.lossValue || 0), 0)
    }, [logs]);

  const pageIsLoading = isUserLoading || isProfileLoading || areLogsLoading;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-black font-bold">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Disposal <span className="text-red-600">Archive</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Historical record of decommissioned and wasted supplies.</p>
        </div>
        <div className="bg-red-50 text-red-600 px-6 py-4 rounded-[32px] border-2 border-red-100 flex items-center gap-4">
           <TrendingDown size={24} />
           <div>
              <p className="text-[10px] font-black uppercase opacity-60">Total Value Lost</p>
              <p className="text-xl font-black">₵ {totalLoss.toLocaleString()}</p>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
            <tr>
              <th className="p-6">Date & ID</th>
              <th className="p-6">Product & SKU</th>
              <th className="p-6">Qty</th>
              <th className="p-6">Reason</th>
              <th className="p-6 text-right">Loss (₵)</th>
              <th className="p-6 text-right">Certificate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pageIsLoading && <tr><td colSpan={6} className="p-20 text-center"><Loader2 className="animate-spin mx-auto"/></td></tr>}
            {!pageIsLoading && logs?.length === 0 ? (
              <tr><td colSpan={6} className="p-20 text-center text-slate-300 uppercase italic">No disposal records found.</td></tr>
            ) : logs?.map(log => (
              <tr key={log.id} className="hover:bg-slate-50 transition-all font-bold">
                <td className="p-6">
                   <p className="text-xs">{new Date(log.createdAt?.toDate()).toLocaleDateString('en-GB')}</p>
                   <p className="text-[9px] text-slate-400 font-black">#{log.disposalId}</p>
                </td>
                <td className="p-6">
                   <p className="uppercase text-sm">{log.productName}</p>
                   <p className="text-[10px] text-blue-600 font-black">{log.sku}</p>
                </td>
                <td className="p-6 text-sm">{log.qty} units</td>
                <td className="p-6">
                   <span className="text-[9px] font-black px-3 py-1 rounded-full uppercase italic bg-amber-100 text-amber-700">
                      {log.reason}
                   </span>
                </td>
                <td className="p-6 text-right text-red-600 italic">₵ {log.lossValue?.toFixed(2)}</td>
                <td className="p-6 text-right">
                   <Link href={`/supply-chain/disposal/certificate/${log.id}`}>
                      <button className="bg-slate-900 text-white p-3 rounded-2xl hover:bg-blue-600 transition-all shadow-lg">
                         <FileText size={18}/>
                      </button>
                   </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
