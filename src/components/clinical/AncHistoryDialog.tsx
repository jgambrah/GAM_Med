'use client';
import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { History, Baby, ClipboardList, Loader2, Calendar, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

interface AncHistoryDialogProps {
  patientId: string;
  hospitalId: string;
  patientName: string;
}

export function AncHistoryDialog({ patientId, hospitalId, patientName }: AncHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();

  const ancVisitsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !patientId || !open) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/patients/${patientId}/encounters`),
      where("encounterType", "==", "ANC Visit"),
      orderBy("createdAt", "desc")
    );
  }, [firestore, hospitalId, patientId, open]);

  const { data: visits, isLoading, error } = useCollection<any>(ancVisitsQuery);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-pink-200 text-pink-700 hover:bg-pink-50 font-bold uppercase tracking-widest text-[10px]">
          <History size={16} /> Visit History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 border-b shrink-0">
          <DialogTitle className="flex items-center gap-3 font-black tracking-tighter uppercase text-xl text-slate-900">
            <ClipboardList className="text-pink-500" /> Pregnancy Visit History
          </DialogTitle>
          <DialogDescription className="text-xs uppercase font-bold text-slate-500">Patient: {patientName}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p className="text-xs uppercase font-bold">Loading checkup logs...</p>
            </div>
          ) : error ? (
            <div className="text-center p-12 bg-white border border-red-100 rounded-3xl text-red-500 text-sm space-y-2">
              <ShieldCheck className="mx-auto text-red-400 mb-2" size={32} />
              <p className="font-black uppercase text-xs tracking-wider">Failed to load history</p>
              <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">{error.message}</p>
            </div>
          ) : visits && visits.length > 0 ? (
            <div className="relative border-l-2 border-pink-200 ml-4 space-y-8 pb-4">
              {visits.map((visit: any, index: number) => {
                const date = visit.createdAt ? visit.createdAt.toDate() : new Date();
                const dData = visit.ancData || {};
                
                return (
                  <div key={visit.id || index} className="relative pl-8">
                    {/* Timeline Node dot */}
                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-pink-500 border-4 border-white shadow-sm ring-2 ring-pink-100" />
                    
                    <div className="bg-white p-6 rounded-[28px] border shadow-sm space-y-4 hover:border-pink-200 transition-all">
                      <div className="flex justify-between items-start border-b pb-3 border-slate-100">
                        <div>
                          <p className="text-xs font-black text-slate-900 flex items-center gap-1.5"><Calendar size={14} className="text-slate-400" /> {format(date, 'PP')}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Time: {format(date, 'p')}</p>
                        </div>
                        <span className="bg-pink-100 text-pink-700 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                          ANC Visit
                        </span>
                      </div>

                      {/* Vitals & Screenings Panel */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border text-xs">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Blood Pressure</p>
                          <p className="font-bold text-slate-800 mt-0.5">{dData.bp || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Maternal Weight</p>
                          <p className="font-bold text-slate-800 mt-0.5">{dData.weight ? `${dData.weight} kg` : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Fundal Height</p>
                          <p className="font-bold text-slate-800 mt-0.5">{dData.fundalHeight ? `${dData.fundalHeight} cm` : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Fetal Heart Rate</p>
                          <p className="font-bold text-slate-800 mt-0.5">{dData.fetalHeartRate ? `${dData.fetalHeartRate} bpm` : 'N/A'}</p>
                        </div>
                      </div>

                      {/* Dynamic clinical observations */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Fetal Presentation</p>
                          <p className="font-bold text-slate-800 mt-0.5">{dData.presentation || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Fetal Movement</p>
                          <p className="font-bold text-slate-800 mt-0.5">{dData.fetalMovement || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Urine Protein</p>
                          <p className="font-bold text-slate-800 mt-0.5">{dData.urineProtein || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Urine Sugar</p>
                          <p className="font-bold text-slate-800 mt-0.5">{dData.urineSugar || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Maternal Edema</p>
                          <p className="font-bold text-slate-800 mt-0.5">{dData.edema || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Logged By</p>
                          <p className="font-bold text-slate-800 mt-0.5">{visit.providerName || 'Staff'}</p>
                        </div>
                      </div>

                      {visit.diagnosis && (
                        <div className="pt-3 border-t border-slate-100">
                          <p className="text-[9px] font-black text-pink-600 uppercase tracking-widest flex items-center gap-1"><ClipboardList size={10} /> Diagnosis & Clinical Notes</p>
                          <p className="text-xs text-slate-700 mt-1 leading-relaxed italic">"{visit.diagnosis}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center p-20 bg-white border-2 border-dashed rounded-3xl text-slate-400 italic text-sm">
              <ClipboardList className="mx-auto mb-2" size={32} />
              No previous ANC checkups found for this patient.
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t flex justify-end shrink-0">
          <Button onClick={() => setOpen(false)} variant="outline">Close History</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
