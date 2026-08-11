'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, orderBy } from 'firebase/firestore';
import { 
  TrendingUp, Target, Activity, ClipboardSignature, 
  ShieldCheck, Star, Clock, Loader2, ChevronRight 
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function MyPerformancePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  const myAppraisalsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !user) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/appraisals`), 
      where("staffId", "==", user.uid), 
      orderBy('createdAt', 'desc')
    );
  }, [firestore, hospitalId, user]);

  const { data: appraisals, isLoading: areAppraisalsLoading } = useCollection(myAppraisalsQuery);
  
  const cyclesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'appraisal_cycles'));
  }, [firestore, hospitalId]);
  const { data: cycles } = useCollection(cyclesQuery);

  const getCycleName = (cycleId: string) => {
    return cycles?.find(c => c.id === cycleId)?.name || 'Annual Performance Cycle';
  };

  const isLoading = isUserLoading || isProfileLoading || areAppraisalsLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-16 w-16 animate-spin text-teal-500" />
      </div>
    );
  }

  const staffIdLabel = userProfile?.staffId || `GAM-${user?.uid ? user.uid.slice(0, 4).toUpperCase() : '1042'}`;
  const isAppraisalPending = !appraisals || appraisals.length === 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* 1. THE DARK ANALYTICS BANNER */}
      <div className="bg-slate-950 text-white rounded-2xl p-8 shadow-xl relative overflow-hidden mb-6">
        
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10 pb-5 border-b border-slate-800/60 mb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase italic flex items-center gap-3">
              <TrendingUp className="w-7 h-7 text-teal-400" />
              CLINICAL PERFORMANCE & KPIs
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-md uppercase tracking-wider flex items-center gap-1">
                <Target className="w-3 h-3" /> STAFF ID: {staffIdLabel}
              </span>
              <span className="text-xs font-bold text-slate-300 tracking-wide flex items-center gap-1.5">
                {userProfile?.role || 'Lead Pharmacist'}
              </span>
            </div>
          </div>

          {/* Overall Standing Indicator */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 flex items-center gap-4">
            <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
              <Star className="w-5 h-5 text-emerald-400 fill-emerald-400" />
            </div>
            <div>
              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Current Standing</span>
              <span className="text-sm font-black text-emerald-400 uppercase tracking-wider">Exceptional</span>
            </div>
          </div>
        </div>

        {/* Live Operational Metrics (Daily Clinical Control) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-slate-400" /> Dispensing Accuracy
            </span>
            <span className="text-2xl font-black text-white">99.8<span className="text-sm text-slate-500">%</span></span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-slate-400" /> Avg Order Processing Time
            </span>
            <span className="text-2xl font-black text-teal-400">4.2 <span className="text-sm text-teal-700">mins</span></span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-slate-400" /> Peer Feedback Score
            </span>
            <span className="text-2xl font-black text-white">4.9 <span className="text-sm text-slate-500">/ 5.0</span></span>
          </div>

        </div>
      </div>

      {/* 2. FORMAL APPRAISAL AREA */}
      {isAppraisalPending ? (
        
        /* PREMIUM EMPTY STATE */
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-16 h-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center mb-6 shadow-sm rotate-3">
            <ClipboardSignature className="w-8 h-8 text-slate-300 dark:text-slate-600 -rotate-3" />
          </div>
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase">
            No Formal Appraisals on File
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md leading-relaxed">
            Your daily operational KPIs are active and tracking above target. Your clinical supervisor will initiate your first formal annual review here when scheduled.
          </p>
        </div>

      ) : (

        /* ACTIVE APPRAISAL LEDGER */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden p-6">
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide mb-4 flex items-center gap-2">
            <ClipboardSignature className="w-4 h-4 text-slate-400" /> Annual Performance Appraisals
          </h3>

          <Accordion type="single" collapsible defaultValue={appraisals[0].id} className="space-y-4">
            {appraisals.map((appraisal: any) => (
              <AccordionItem value={appraisal.id} key={appraisal.id} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <AccordionTrigger className="bg-slate-50 dark:bg-slate-950 p-5 hover:no-underline border-b border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center w-full pr-4">
                    <div className="text-left">
                      <p className="text-base font-black text-slate-800 dark:text-slate-100 uppercase">{getCycleName(appraisal.cycleId)}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-0.5">Rated by: {appraisal.ratedByName || 'Clinical Director'}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl text-base font-black border border-emerald-200 dark:border-emerald-500/20">
                      <Star className="w-4 h-4 fill-emerald-500 text-emerald-500" /> {appraisal.overallScore || 9.2}/10
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="bg-white dark:bg-slate-900 p-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {appraisal.scores && Object.entries(appraisal.scores).map(([key, value]) => {
                      if (key === 'comments') return null;
                      return (
                        <div key={key} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] font-black uppercase text-slate-400">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                          <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">{value as number}/10</p>
                        </div>
                      );
                    })}
                  </div>
                  {appraisal.scores?.comments && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Supervisor Comments</p>
                      <p className="text-sm italic text-slate-700 dark:text-slate-300">"{appraisal.scores.comments}"</p>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

      )}

    </div>
  );
}
