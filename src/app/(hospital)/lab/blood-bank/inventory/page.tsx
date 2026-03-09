'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { 
  Droplets, Plus, AlertTriangle, 
  History, Thermometer, ShieldCheck, 
  Search, Calendar, Loader2, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format, differenceInDays } from 'date-fns';

export default function BloodBankInventory() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'LAB_TECH', 'DOCTOR', 'NURSE'].includes(userRole || '');

  const pintsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/blood_pints`),
      where("status", "==", "AVAILABLE"),
      orderBy("expiryDate", "asc")
    );
  }, [firestore, hospitalId]);
  
  const { data: pints, isLoading: arePintsLoading } = useCollection(pintsQuery);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const bloodGroupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (pints) {
      for (const group of bloodGroups) {
        counts[group] = pints.filter(p => p.bloodGroup === group).length;
      }
    }
    return counts;
  }, [pints, bloodGroups]);
  
  const getDaysRemaining = (expiry: { toDate: () => Date }) => {
    if (!expiry) return { text: 'N/A', color: 'text-slate-400' };
    const days = differenceInDays(expiry.toDate(), new Date());
    if (days < 0) return { text: 'EXPIRED', color: 'text-red-500 font-black' };
    if (days <= 7) return { text: `${days} Days Left`, color: 'text-red-500' };
    return { text: `${days} Days`, color: 'text-green-600' };
  };

  const isLoading = isUserLoading || isProfileLoading || arePintsLoading;
  
  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin"/></div>
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized for the Blood Bank module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-black font-bold">
      <div className="flex justify-between items-end border-b-8 border-red-600 pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic text-black">Blood <span className="text-red-600">Bank Vault</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Critical Cold-Chain Pint Management.</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="bg-red-50 text-red-600 px-6 py-2 rounded-2xl border-2 border-red-200 flex items-center gap-3">
            <Thermometer size={18} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase">Temp: 4.2°C (Optimal)</span>
            </div>
            <Button className="bg-red-600 hover:bg-red-700 text-white"><Plus size={16}/> New Pint</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {bloodGroups.map(group => {
            const count = bloodGroupCounts[group] || 0;
            return (
                <div key={group} className={`p-4 rounded-3xl border-4 text-center transition-all ${count === 0 ? 'bg-slate-50 border-slate-200 text-slate-300' : 'bg-white border-red-600 text-red-600 shadow-lg'}`}>
                    <p className="text-xl font-black">{group}</p>
                    <p className="text-[10px] font-bold uppercase">{count} Pints</p>
                </div>
            )
        })}
      </div>

      <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-6 text-[10px] uppercase">Pint ID / Batch</th>
              <th className="p-6 text-[10px] uppercase">Blood Group</th>
              <th className="p-6 text-[10px] uppercase">Expiry Date</th>
              <th className="p-6 text-[10px] uppercase">Screening</th>
              <th className="p-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading && <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin"/></td></tr>}
            {!isLoading && pints?.length === 0 ? (
                 <tr><td colSpan={5} className="p-20 text-center text-slate-300 uppercase italic">No available pints in inventory.</td></tr>
            ) : pints?.map(pint => {
              const expiryInfo = getDaysRemaining(pint.expiryDate);
              return (
              <tr key={pint.id} className="hover:bg-red-50/30 transition-all font-bold">
                <td className="p-6 uppercase text-sm">
                   {pint.pintId}
                   <p className="text-[9px] text-slate-400">Source: {pint.source || 'Donation'}</p>
                </td>
                <td className="p-6">
                   <span className="bg-red-600 text-white px-4 py-1 rounded-full text-xs font-black italic">{pint.bloodGroup}</span>
                </td>
                <td className="p-6">
                   <div className="flex flex-col">
                      <span className="text-xs uppercase">{pint.expiryDate ? format(pint.expiryDate.toDate(), 'PPP') : 'N/A'}</span>
                      <span className={`text-[8px] uppercase ${expiryInfo.color}`}>{expiryInfo.text}</span>
                   </div>
                </td>
                <td className="p-6">
                   <div className={`flex items-center gap-1 text-[10px] uppercase ${pint.screened ? 'text-green-600' : 'text-amber-600'}`}>
                      {pint.screened ? <ShieldCheck size={14}/> : <AlertTriangle size={14} />} {pint.screened ? 'Tested (Negative)' : 'UNSCREENED'}
                   </div>
                </td>
                <td className="p-6 text-right">
                   <button className="bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] uppercase hover:bg-red-600 transition-all">Cross-match</button>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  );
}
