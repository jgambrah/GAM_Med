'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where, orderBy } from 'firebase/firestore';
import { 
  Building2, Users, CreditCard, ShieldCheck, 
  Download, Loader2, BarChart3
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CorporateAuditorDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setIsClaimsLoading(true);
      user.getIdTokenResult(true).then((idTokenResult) => {
        setClaims(idTokenResult.claims);
        setIsClaimsLoading(false);
      });
    } else if (!isUserLoading) {
      setIsClaimsLoading(false);
    }
  }, [user, isUserLoading]);
    
  const payerId = claims?.payerId;
  const payerName = claims?.payerName || 'Your Entity';

  const billingItemsQuery = useMemoFirebase(() => {
      if (!firestore || !payerId) return null;
      return query(
        collectionGroup(firestore, "billing_items"),
        where("payerId", "==", payerId),
        where("billingType", "==", "INSURANCE_CLAIM"),
        orderBy("createdAt", "desc")
      );
  }, [firestore, payerId]);
  
  const { data: billingItems, isLoading: areItemsLoading } = useCollection(billingItemsQuery);

  const totalOutstanding = useMemo(() => {
      if (!billingItems) return 0;
      return billingItems.filter(c => c.status !== 'PAID').reduce((a, b) => a + b.total, 0);
  }, [billingItems]);
  
  const staffTreated = useMemo(() => {
      if (!billingItems) return 0;
      return new Set(billingItems.map(c => c.patientId)).size;
  }, [billingItems]);

  const totalInvoiced = useMemo(() => {
      if (!billingItems) return 0;
      return billingItems.reduce((a, b) => a + b.total, 0);
  }, [billingItems]);

  const pendingReconciliation = useMemo(() => {
      if (!billingItems) return 0;
      return billingItems.filter(c => c.status === 'UNPAID').length;
  }, [billingItems]);
  
  if (isUserLoading || isClaimsLoading) {
      return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin"/></div>
  }

  return (
    <div className="p-8 space-y-10 max-w-7xl mx-auto text-black font-bold">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b-8 border-slate-900 pb-8">
        <div className="space-y-2">
           <div className="flex items-center gap-3 text-blue-600">
              <Building2 size={32} />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Corporate Partnership Portal</span>
           </div>
           <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none">
              {payerName} <span className="text-blue-600">Audit</span>
           </h1>
        </div>
        
        <div className="bg-slate-900 p-6 rounded-[32px] text-white shadow-2xl flex items-center gap-6 border-b-4 border-blue-600">
           <div className="text-right">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Current Liability</p>
              <p className="text-3xl font-black italic">₵ {totalOutstanding.toLocaleString()}</p>
           </div>
           <CreditCard size={32} className="text-blue-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <MetricCard label="Employees Covered" value={areItemsLoading ? '...' : staffTreated.toString()} icon={<Users/>} color="blue" />
         <MetricCard label="Total Invoiced (MTD)" value={`₵ ${areItemsLoading ? '...' : totalInvoiced.toLocaleString()}`} icon={<TrendingUp/>} color="green" />
         <MetricCard label="Pending Reconciliation" value={areItemsLoading ? '...' : pendingReconciliation.toString()} icon={<ShieldCheck/>} color="orange" />
      </div>

      <div className="bg-white rounded-[40px] border-4 border-slate-900 overflow-hidden shadow-2xl">
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
           <h3 className="text-sm font-black uppercase tracking-widest">Staff Medical Utilization Log</h3>
           <button className="bg-blue-600 hover:bg-white hover:text-black text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2">
              <Download size={14} /> Export CSV
           </button>
        </div>
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b-2 border-slate-100">
            <tr>
              <th className="p-6 text-[10px] uppercase font-black">Employee / ID</th>
              <th className="p-6 text-[10px] uppercase font-black text-center">Service Date</th>
              <th className="p-6 text-[10px] uppercase font-black">Description of Care</th>
              <th className="p-6 text-[10px] uppercase font-black text-right">Amount (₵)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-bold">
            {areItemsLoading && (
                <tr><td colSpan={4} className="p-12 text-center"><Loader2 className="animate-spin" /></td></tr>
            )}
            {billingItems?.map((claim) => (
              <tr key={claim.id} className="hover:bg-blue-50/30 transition-all">
                <td className="p-6">
                   <p className="uppercase text-sm">{claim.patientName}</p>
                   <p className="text-[9px] text-blue-600">Ref: {claim.policyNumber || 'N/A'}</p>
                </td>
                <td className="p-6 text-center text-xs text-slate-400 uppercase">
                   {new Date(claim.createdAt?.toDate()).toLocaleDateString('en-GB')}
                </td>
                <td className="p-6">
                   <span className="text-xs uppercase italic text-slate-700">{claim.description}</span>
                </td>
                <td className="p-6 text-right font-black italic">
                   ₵ {claim.total?.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, color }: any) {
    const colors: any = {
      blue: "bg-blue-50 border-blue-100 text-blue-600",
      green: "bg-green-50 border-green-100 text-green-700",
      orange: "bg-orange-50 border-orange-100 text-orange-700",
    };
    return (
        <div className={`${colors[color]} p-8 rounded-[40px] border-2 shadow-sm flex items-center justify-between`}>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
                <p className="text-3xl font-black mt-1">{value}</p>
            </div>
            <div className="p-4 bg-white/50 rounded-3xl">{icon}</div>
        </div>
    );
}
