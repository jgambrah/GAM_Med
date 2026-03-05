
'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, orderBy } from 'firebase/firestore';
import { Award, TrendingUp, Star, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
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
    return cycles?.find(c => c.id === cycleId)?.name || 'Unknown Cycle';
  }

  const isLoading = isUserLoading || isProfileLoading || areAppraisalsLoading;

  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
        <div className="flex justify-between items-end border-b pb-6">
            <div>
              <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">My <span className="text-primary">Performance</span></h1>
              <p className="text-muted-foreground font-medium">Review your clinical KPI scores and appraisal history.</p>
            </div>
        </div>
        
        {appraisals && appraisals.length > 0 ? (
          <Accordion type="single" collapsible defaultValue={appraisals[0].id}>
            {appraisals.map(appraisal => (
              <AccordionItem value={appraisal.id} key={appraisal.id} className="border-b-0 mb-4">
                <AccordionTrigger className="bg-card p-6 rounded-t-2xl hover:no-underline border data-[state=closed]:rounded-b-2xl">
                  <div className="flex justify-between items-center w-full">
                    <div className="text-left">
                       <p className="text-lg font-black uppercase">{getCycleName(appraisal.cycleId)}</p>
                       <p className="text-[10px] text-muted-foreground font-bold uppercase">Rated by: {appraisal.ratedByName}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-2xl text-lg font-black">
                       <Star size={16} /> {appraisal.overallScore}/10
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="bg-card p-6 border-x border-b rounded-b-2xl">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                    {Object.entries(appraisal.scores).map(([key, value]) => {
                      if (key === 'comments') return null;
                      return (
                        <div key={key} className="bg-muted/50 p-4 rounded-xl">
                          <p className="text-[10px] font-black uppercase text-muted-foreground">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                          <p className="text-xl font-black text-foreground">{value as number}/10</p>
                        </div>
                      )
                    })}
                  </div>
                  {appraisal.scores.comments && (
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Rater's Comments</p>
                      <p className="text-sm italic p-4 bg-muted/50 rounded-xl">"{appraisal.scores.comments}"</p>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
            <div className="p-20 bg-card rounded-2xl text-center text-muted-foreground italic border-2 border-dashed">
                No appraisal records found. Your first review will appear here.
            </div>
        )}
    </div>
  );
}

