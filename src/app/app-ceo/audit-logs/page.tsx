'use client';
import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { 
  ShieldAlert, UserSearch, History, 
  Lock, Globe, AlertCircle, FileText, 
  Search, Eye, ShieldCheck, Zap, Loader2
} from 'lucide-react';

export default function CEOAuditLogs() {
  const firestore = useFirestore();
  
  const logsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "global_audit_logs"), orderBy("timestamp", "desc"), limit(50));
  }, [firestore]);

  const { data: logs, isLoading: loading } = useCollection(logsQuery);

  const getSeverityColor = (type: string) => {
    if (type === 'SECURITY') return 'text-red-600 bg-red-50 border-red-100';
    if (type === 'FINANCIAL') return 'text-green-600 bg-green-50 border-green-100';
    return 'text-blue-600 bg-blue-50 border-blue-100';
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-black font-bold">
      {/* HEADER */}
      <div className="flex justify-between items-end border-b-8 border-slate-900 pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Platform <span className="text-blue-600">Audit Trail</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Gam IT Solutions Master Sovereignty Log.</p>
        </div>
        <div className="bg-slate-900 text-white p-4 rounded-3xl flex items-center gap-3">
           <Lock size={20} className="text-blue-400" />
           <span className="text-[10px] font-black uppercase tracking-widest">Encryption: AES-256 Active</span>
        </div>
      </div>

      {/* AUDIT SEARCH BAR */}
      <div className="relative">
         <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
         <input 
           placeholder="Search by Hospital ID, Staff Name, or Action Type..."
           className="w-full pl-16 p-6 rounded-[32px] border-4 border-slate-100 bg-white text-black font-black text-sm outline-none focus:border-blue-600 transition-all shadow-sm"
         />
      </div>

      {/* LOG STREAM */}
      <div className="space-y-4">
        {loading && <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary" /></div>}
        {logs?.map((log) => (
          <div key={log.id} className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm hover:border-slate-900 transition-all group flex items-center justify-between gap-6">
            <div className="flex items-center gap-6 flex-1">
               <div className={`p-4 rounded-2xl border-2 flex items-center justify-center ${getSeverityColor(log.type)}`}>
                  {log.type === 'SECURITY' ? <ShieldAlert size={24}/> : <FileText size={24}/>}
               </div>
               
               <div className="flex-1">
                  <div className="flex items-center gap-3">
                     <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{log.hospitalId}</span>
                     <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">{log.timestamp ? new Date(log.timestamp?.toDate()).toLocaleString() : ''}</span>
                  </div>
                  <h3 className="text-sm font-black uppercase text-black mt-1">
                    {log.actorName} <span className="text-slate-400 font-medium">performed</span> {log.action.replace(/_/g, ' ')}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium italic mt-1">"{log.details}"</p>
               </div>
            </div>

            <div className="text-right">
               <button className="bg-slate-50 p-3 rounded-2xl text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Eye size={18} />
               </button>
            </div>
          </div>
        ))}
      </div>

      {/* SOVEREIGNTY STATEMENT */}
      <div className="p-8 bg-blue-50 rounded-[40px] border-2 border-dashed border-blue-200 text-center">
         <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em] mb-2">Legal Disclaimer</p>
         <p className="text-xs font-bold text-blue-800 italic max-w-2xl mx-auto leading-relaxed">
            "This log is the property of Gam IT Solutions. It serves as the primary forensic evidence for system activity. 
            All entries are cryptographically timestamped and cannot be modified by any hospital personnel."
         </p>
      </div>
    </div>
  );
}