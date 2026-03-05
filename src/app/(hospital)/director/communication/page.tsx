'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc } from 'firebase/firestore';
import { MessageSquare, Send, CreditCard, History, CheckCircle2, Zap, Loader2, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function CommunicationHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  useEffect(() => {
    // Redirect SUPER_ADMIN away from this hospital-specific page
    if (userProfile && userProfile.role === 'SUPER_ADMIN') {
        toast({ title: "Redirecting...", description: "Accessing global dashboards instead." });
        router.replace('/app-ceo/dashboard');
    }
  }, [userProfile, router, toast]);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN'].includes(userRole || '');

  const smsLogsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
        collection(firestore, "sms_logs"),
        where("hospitalId", "==", hospitalId),
        orderBy("createdAt", "desc"),
        limit(10)
    );
  }, [firestore, hospitalId]);

  const { data: logs, isLoading: areLogsLoading } = useCollection(smsLogsQuery);

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading || userProfile?.role === 'SUPER_ADMIN') {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin" /></div>;
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
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Comms <span className="text-blue-600">Hub</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Managing automated patient SMS & Email traffic.</p>
        </div>
        <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-2xl flex items-center gap-6">
           <div>
              <p className="text-[10px] font-black uppercase text-blue-400">Available Credits</p>
              <p className="text-2xl font-black">2,450 <span className="text-xs text-slate-400">SMS</span></p>
           </div>
           <button className="bg-blue-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg">Top Up</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-2">
              <History size={16} className="text-blue-600" /> Transmission History
           </h3>
           <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden divide-y divide-slate-50">
              {areLogsLoading && <div className="p-10 text-center"><Loader2 className="animate-spin" /></div>}
              {logs?.map(log => (
                <div key={log.id} className="p-6 hover:bg-slate-50 transition-all flex justify-between items-center group">
                   <div className="flex items-center gap-4">
                      <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Send size={20} />
                      </div>
                      <div className="max-w-md">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">To: {log.recipient}</p>
                         <p className="text-xs font-bold text-black mt-1 leading-relaxed">"{log.message}"</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <span className="text-[9px] font-black bg-green-100 text-green-700 px-3 py-1 rounded-full uppercase italic">Delivered</span>
                      <p className="text-[8px] text-slate-300 font-bold uppercase mt-2">{log.createdAt ? new Date(log.createdAt?.toDate()).toLocaleString() : ''}</p>
                   </div>
                </div>
              ))}
              {!areLogsLoading && logs?.length === 0 && <p className="p-10 text-center italic text-muted-foreground">No SMS messages sent yet.</p>}
           </div>
        </div>

        <div className="space-y-6">
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-2">
              <Zap size={16} className="text-orange-500" /> Auto-Templates
           </h3>
           <div className="bg-white p-8 rounded-[40px] border-2 border-slate-50 space-y-6 shadow-sm">
              <TemplateItem label="Welcome Message" status="ON" />
              <TemplateItem label="Birth Congratulation" status="ON" />
              <TemplateItem label="Lab Ready Alert" status="ON" />
              <TemplateItem label="Payment Receipt" status="OFF" />
           </div>
        </div>
      </div>
    </div>
  );
}

function TemplateItem({ label, status }: any) {
    return (
        <div className="flex justify-between items-center border-b pb-4 last:border-0">
            <span className="text-[11px] font-black uppercase text-black">{label}</span>
            <div className={`px-3 py-1 rounded-lg text-[9px] font-black ${status === 'ON' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                {status}
            </div>
        </div>
    );
}
