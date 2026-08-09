'use client';
import { useState, useMemo } from 'react';
import { Clock, AlertOctagon, CheckCircle2, ChevronDown, ChevronUp, Filter, Activity, ArrowRight, ShieldAlert, Sparkles, Tag } from 'lucide-react';
import {
  evaluateTriageAndSla,
  advancePrescriptionLifecycleStage,
  getSampleTriageItems,
  TriageItem
} from '@/ai/flows/ai-pharmacy-triage-sla-engine';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PharmacyPriorityTriageCardProps {
  patientName?: string;
  defaultExpanded?: boolean;
}

export function PharmacyPriorityTriageCard({
  patientName = 'Benjamin Hedidor',
  defaultExpanded = true
}: PharmacyPriorityTriageCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Active Triage Filter State ('ALL' | 'STAT_EMERGENCY' | 'INPATIENT_DISCHARGE' | 'ROUTINE_OUTPATIENT')
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL');

  // Triage Queue Items State
  const [triageItems, setTriageItems] = useState<TriageItem[]>(() => getSampleTriageItems(patientName));

  const filteredItems = useMemo(() => {
    if (filterUrgency === 'ALL') return triageItems;
    return triageItems.filter(item => item.urgency === filterUrgency);
  }, [triageItems, filterUrgency]);

  const handleAdvanceStage = (orderId: string) => {
    setTriageItems(prev => prev.map(item => {
      if (item.orderId === orderId) {
        const nextStage = advancePrescriptionLifecycleStage(item.lifecycleStage);
        const evalRes = evaluateTriageAndSla(item.elapsedMinutes, item.urgency, nextStage);
        toast({
          title: `🔄 Prescription Stage Advanced: ${nextStage.replace(/_/g, ' ')}`,
          description: `Order ${orderId} updated to ${nextStage}.`
        });
        return {
          ...item,
          lifecycleStage: nextStage,
          statusBadgeColor: evalRes.statusBadgeColor
        };
      }
      return item;
    }));
  };

  return (
    <div className="bg-slate-950 text-white rounded-[32px] border-4 border-red-600 shadow-2xl overflow-hidden transition-all mb-6">
      {/* COLLAPSIBLE HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="p-5 bg-red-950/40 hover:bg-red-900/40 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-red-900 gap-3 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-900/80 rounded-2xl border border-red-700 text-red-300">
            <Clock className="animate-pulse" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-red-300">Priority Triage & Workflow SLA Hub</h3>
              <span className="text-[9px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full uppercase animate-pulse">
                STAT TRIAGE ACTIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              Urgency Tags (STAT / Emergency vs Routine) • Time-in-Queue SLA Bottleneck Timers • Lifecycle Badges
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" className="text-red-400 font-black text-xs uppercase rounded-xl">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand Triage Deck'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE WORKSPACE */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* SECTION 1: URGENCY FILTER BAR */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-red-400 tracking-wider flex items-center gap-1.5">
                <Filter size={16} /> Filter Queue by Triage Priority Category:
              </h4>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'ALL', label: 'ALL ORDERS', color: 'bg-slate-800 text-white' },
                  { id: 'STAT_EMERGENCY', label: '🚨 STAT / EMERGENCY', color: 'bg-red-950 text-red-300 border-red-800' },
                  { id: 'INPATIENT_DISCHARGE', label: '🏥 INPATIENT DISCHARGE', color: 'bg-indigo-950 text-indigo-300 border-indigo-800' },
                  { id: 'ROUTINE_OUTPATIENT', label: '🤰 ROUTINE OPD', color: 'bg-emerald-950 text-emerald-300 border-emerald-800' }
                ].map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => setFilterUrgency(btn.id)}
                    className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-xl transition-all border ${btn.color} ${
                      filterUrgency === btn.id ? 'ring-2 ring-white/50 scale-105 shadow-md' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TRIAGE QUEUE LIST */}
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const evalRes = evaluateTriageAndSla(item.elapsedMinutes, item.urgency, item.lifecycleStage);
                const isStat = item.urgency === 'STAT_EMERGENCY';

                return (
                  <div
                    key={item.orderId}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all ${
                      isStat
                        ? 'bg-red-950/60 border-red-600 ring-2 ring-red-600/30'
                        : item.urgency === 'INPATIENT_DISCHARGE'
                        ? 'bg-indigo-950/40 border-indigo-800'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {/* URGENCY BADGE */}
                        <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                          isStat
                            ? 'bg-red-600 text-white animate-pulse shadow-md'
                            : item.urgency === 'INPATIENT_DISCHARGE'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}>
                          {item.urgency.replace(/_/g, ' ')}
                        </span>

                        {/* ORDER ID & PATIENT */}
                        <span className="text-xs font-black text-white">{item.patientName}</span>
                        <span className="text-[9px] font-mono text-slate-400">({item.orderId})</span>
                      </div>

                      <p className="text-[10px] text-slate-400 font-bold">
                        Prescribed by: {item.providerName} • Placed: {item.createdAtTimestamp}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* SLA TIME-IN-QUEUE COUNTER */}
                      <div className={`p-2 rounded-xl border text-center ${
                        evalRes.slaStatus === 'SLA_BREACH_WARNING'
                          ? 'bg-red-950 text-red-300 border-red-800 animate-bounce'
                          : 'bg-slate-900 text-slate-300 border-slate-800'
                      }`}>
                        <span className="text-[8px] block uppercase font-bold text-slate-400">TIME IN QUEUE</span>
                        <span className="text-xs font-black flex items-center gap-1">
                          <Clock size={12} /> {item.elapsedMinutes} mins
                        </span>
                      </div>

                      {/* LIFECYCLE STAGE BADGE */}
                      <button
                        type="button"
                        onClick={() => handleAdvanceStage(item.orderId)}
                        className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase flex items-center gap-1 transition-all ${item.statusBadgeColor} hover:scale-105`}
                      >
                        <span>{item.lifecycleStage.replace(/_/g, ' ')}</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
