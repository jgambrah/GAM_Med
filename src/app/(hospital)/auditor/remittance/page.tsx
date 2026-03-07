'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { 
  ShieldCheck, Landmark, CheckCircle2, 
  FileText, Loader2, ShieldAlert, Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function AuditorRemittanceClearance() {
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
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'AUDITOR'].includes(userProfile?.role || '');

  const runsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/payroll_runs`),
      where("status", "==", "POSTED")
    );
  }, [firestore, hospitalId]);
  const { data: runs, isLoading: areRunsLoading } = useCollection(runsQuery);

  const clearRemittance = async (runId: string, type: 'SSNIT' | 'PAYE') => {
    if (!firestore || !hospitalId || !userProfile) return;

    try {
      const runRef = doc(firestore, `hospitals/${hospitalId}/payroll_runs`, runId);
      await updateDocumentNonBlocking(runRef, {
        [`${type.toLowerCase()}AuditCleared`]: true,
        [`${type.toLowerCase()}AuditorName`]: userProfile?.fullName,
        [`${type.toLowerCase()}AuditDate`]: serverTimestamp()
      });
      toast({ title: `${type} Schedule has been Pre-Audit Certified.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: e.message });
    }
  };

  const isLoading = isUserLoading || isProfileLoading || areRunsLoading;

  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin h-16 w-16" /></div>;
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
    <div className="p-8 max-w-6xl mx-auto space-y-8 text-black font-bold">
      <div className="flex justify-between items-end border-b-8 border-slate-900 pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Statutory <span className="text-blue-600">Clearance</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Vetting SSNIT, GRA, and Union schedules for bank submission.</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-3xl border-2 border-blue-100 flex items-center gap-3">
           <ShieldCheck className="text-blue-600" size={24} />
           <span className="text-[10px] font-black uppercase">Internal Audit Post</span>
        </div>
      </div>

      <div className="space-y-6">
        {isLoading ? <div className="p-10 text-center"><Loader2 className="animate-spin"/></div> :
        runs?.length === 0 ? (
          <div className="p-10 bg-slate-50 rounded-[40px] border-2 border-dashed text-center text-slate-300 italic uppercase text-xs">No payroll files pending audit.</div>
        ) : runs?.map(run => (
          <div key={run.id} className="bg-white rounded-[40px] border-4 border-slate-900 overflow-hidden shadow-2xl">
             <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                <p className="text-xs font-black uppercase tracking-widest italic">Payroll Run: {run.month}/{run.year}</p>
                <div className="flex gap-2">
                   <span className="bg-blue-600 px-3 py-1 rounded-full text-[9px]">GHS {run.totalNet?.toLocaleString()} Total Net</span>
                </div>
             </div>

             <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <ClearanceBox 
                    title="SSNIT Remittance (18.5%)"
                    isCleared={run.ssnitAuditCleared}
                    auditor={run.ssnitAuditorName}
                    onClear={() => clearRemittance(run.id, 'SSNIT')}
                    icon={<Landmark size={20}/>}
                    period={{ month: run.month, year: run.year }}
                    type="SSNIT"
                />
                
                <ClearanceBox 
                    title="GRA PAYE (Tax) Schedule"
                    isCleared={run.payeAuditCleared}
                    auditor={run.payeAuditorName}
                    onClear={() => clearRemittance(run.id, 'PAYE')}
                    icon={<FileText size={20}/>}
                    color="red"
                    period={{ month: run.month, year: run.year }}
                    type="PAYE"
                />
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClearanceBox({ title, isCleared, auditor, onClear, icon, color = "blue", period, type }: any) {
    const router = useRouter();
    return (
        <div className={`p-6 rounded-[32px] border-2 transition-all ${isCleared ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex justify-between items-start mb-6">
               <div className={`p-3 rounded-2xl ${isCleared ? 'bg-green-600 text-white' : color === 'red' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>{icon}</div>
               {isCleared ? (
                 <div className="text-right">
                    <span className="text-[9px] font-black text-green-600 uppercase italic">Certified OK</span>
                    <p className="text-[8px] text-slate-400 mt-1 uppercase">By: {auditor}</p>
                 </div>
               ) : (
                 <span className="text-[9px] font-black text-slate-400 uppercase italic">Pending Review</span>
               )}
            </div>
            <h4 className="text-sm font-black uppercase text-black mb-6">{title}</h4>
            <div className="flex gap-2">
                <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => router.push(`/hr/payroll/schedules?year=${period.year}&month=${period.month}&type=${type}`)}
                >
                    <Eye size={14} className="mr-2"/> Review
                </Button>
                <Button 
                    disabled={isCleared}
                    onClick={onClear}
                    className={`flex-1 font-black uppercase text-[10px] tracking-widest transition-all ${isCleared ? 'bg-green-100 text-green-700' : 'bg-slate-900 text-white hover:bg-blue-600 shadow-xl'}`}
                >
                    {isCleared ? 'Cleared' : 'Certify'}
                </Button>
            </div>
        </div>
    );
}
