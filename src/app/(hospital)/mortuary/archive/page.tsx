
'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { Skull, FileText, Loader2, ShieldAlert, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function MortuaryArchivePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'MORTUARY_ATTENDANT'].includes(userProfile?.role || '');

  const recordsQuery = useMemoFirebase(() => (hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/mortuary_records`), where("status", "==", "RELEASED"), orderBy("releasedAt", "desc")) : null), [firestore, hospitalId]);
  const { data: records, isLoading: areRecordsLoading } = useCollection(recordsQuery);

  const isLoading = isUserLoading || isProfileLoading || areRecordsLoading;
  
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized for this module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-black font-bold">
      <div className="flex justify-between items-end border-b-8 border-slate-900 pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Release <span className="text-blue-600">Archive</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Historical record of all released bodies.</p>
        </div>
      </div>
      <div className="bg-white rounded-[40px] border-4 border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
            <tr>
              <th className="p-6">Deceased Name & ID</th>
              <th className="p-6">Released To</th>
              <th className="p-6">Date Released</th>
              <th className="p-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y-4 divide-slate-50">
            {areRecordsLoading && <tr><td colSpan={4} className="p-20 text-center"><Loader2 className="animate-spin" /></td></tr>}
            {!areRecordsLoading && records?.length === 0 ? (
              <tr><td colSpan={4} className="p-20 text-center text-slate-300 italic uppercase">No bodies have been released yet.</td></tr>
            ) : records?.map(record => (
              <tr key={record.id} className="hover:bg-blue-50/50 transition-all font-bold">
                <td className="p-6">
                  <p className="text-sm uppercase">{record.bodyName}</p>
                  <p className="text-[9px] text-blue-600 font-black">ID: {record.bodyId}</p>
                </td>
                <td className="p-6">
                    <p className="text-sm uppercase">{record.releasedToName}</p>
                    <p className="text-[9px] text-slate-400 font-black">{record.releasedToID}</p>
                </td>
                <td className="p-6 text-sm text-slate-500">{record.releasedAt ? format(record.releasedAt.toDate(), 'PPP, p') : 'N/A'}</td>
                <td className="p-6 text-right">
                    <Button asChild variant="outline" size="sm">
                       <Link href={`/mortuary/release/certificate/${record.id}`}>
                         <FileText size={14}/> View Certificate
                       </Link>
                    </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
