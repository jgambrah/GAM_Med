'use client';
import { useState, useMemo } from 'react';
import { ShieldAlert, UserCheck, AlertTriangle, Radio, Scale, CheckCircle2, ChevronDown, ChevronUp, Activity, User, FileText, Send, Sparkles } from 'lucide-react';
import {
  evaluatePharmacyQueueSafety,
  reconcileDuplicateOrders,
  QueueOrderSafetyResult
} from '@/ai/flows/ai-pharmacy-queue-safety-engine';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PharmacySafetyQueueInspectorCardProps {
  patientName?: string;
  orderItems?: any[];
  doctorName?: string;
  defaultExpanded?: boolean;
}

export function PharmacySafetyQueueInspectorCard({
  patientName = 'Benjamin Hedidor',
  orderItems = [{ name: 'Vita C Syrup' }, { name: 'Nugel-O Suspension' }],
  doctorName = 'Dr. Tracy Gambrah',
  defaultExpanded = true
}: PharmacySafetyQueueInspectorCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Safety Evaluation State
  const safetyResult = useMemo(
    () => evaluatePharmacyQueueSafety(patientName, orderItems, doctorName),
    [patientName, orderItems, doctorName]
  );

  // Duplicate Reconciliation State
  const [isReconciled, setIsReconciled] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(doctorName);

  // Radiology Route State
  const [isRoutedToRadiology, setIsRoutedToRadiology] = useState(false);

  const handleReconcile = () => {
    const res = reconcileDuplicateOrders(orderItems, selectedDoctor);
    setIsReconciled(true);
    toast({
      title: '⚖️ Duplicate Prescription Reconciled',
      description: res.message
    });
  };

  const handleRouteToRadiology = () => {
    setIsRoutedToRadiology(true);
    toast({
      title: '📡 Diagnostic Order Routed to Radiology Queue',
      description: `Non-medication order (${safetyResult.diagnosticType.replace(/_/g, ' ')}) transferred to Radiology PACS queue.`
    });
  };

  const ctx = safetyResult.patientContext;

  return (
    <div className="bg-slate-950 text-white rounded-[32px] border-4 border-red-600 shadow-2xl overflow-hidden transition-all mb-6">
      {/* COLLAPSIBLE HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="p-5 bg-red-950/40 hover:bg-red-900/40 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-red-900 gap-3 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-900/80 rounded-2xl border border-red-700 text-red-300">
            <ShieldAlert className="animate-pulse" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-red-300">Clinical Prescription Safety & Data Flag Suite</h3>
              <span className="text-[9px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full uppercase">
                SAFETY ENGINE ACTIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              Patient Context (Age/Weight/MRN) • Allergy & Renal Flags • Non-Medication Filter • Duplicate Order Reconciliation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" className="text-red-400 font-black text-xs uppercase rounded-xl">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand Safety Flags'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE WORKSPACE */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* SECTION 1: ENHANCED PATIENT CLINICAL CONTEXT HEADER */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                <User size={16} /> Patient Clinical Metadata Context:
              </h4>

              <span className="text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 px-3 py-1 rounded-full uppercase font-bold">
                {ctx.mrn}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-black">
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[8px] text-slate-400 block uppercase">PATIENT NAME</span>
                <span className="text-white text-xs">{ctx.patientName}</span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[8px] text-slate-400 block uppercase">AGE & GENDER</span>
                <span className="text-cyan-300 text-xs">{ctx.ageYears} Yrs • {ctx.gender}</span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[8px] text-slate-400 block uppercase">WEIGHT (DOSING)</span>
                <span className="text-amber-300 text-xs">{ctx.weightKg} kg</span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[8px] text-slate-400 block uppercase">RENAL CLEARANCE</span>
                <span className={ctx.egfrValue < 30 ? 'text-red-400 font-extrabold' : 'text-emerald-400 font-extrabold'}>
                  eGFR {ctx.egfrValue} mL/min
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: ALLERGY & RENAL SAFETY BANNERS */}
          {safetyResult.safetyBanners.length > 0 && (
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
              <h4 className="text-xs font-black uppercase text-red-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
                <AlertTriangle size={16} /> Active Clinical Safety Banners:
              </h4>

              <div className="space-y-2">
                {safetyResult.safetyBanners.map((banner, idx) => (
                  <div key={idx} className="p-3 bg-red-950/80 border border-red-600 rounded-xl text-red-200 text-xs font-bold flex items-center gap-2">
                    <ShieldAlert size={16} className="text-red-400 shrink-0" />
                    {banner}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 3: NON-MEDICATION DIAGNOSTIC ORDER FILTER (e.g. MRI SCAN) */}
          {safetyResult.isNonMedicationOrder && (
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                  <Radio size={16} /> Non-Medication Diagnostic Order Detected:
                </h4>

                <span className="text-[9px] font-black bg-amber-950 text-amber-300 border border-amber-800 px-3 py-1 rounded-full uppercase">
                  {safetyResult.diagnosticType.replace(/_/g, ' ')} ORDER
                </span>
              </div>

              <div className="p-4 bg-amber-950/40 border border-amber-700 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h5 className="text-xs font-black text-white">Diagnostic Imaging Order</h5>
                  <p className="text-[11px] font-bold text-amber-200 mt-0.5">
                    Order for "{safetyResult.diagnosticType.replace(/_/g, ' ')}" is a non-medication diagnostic request. Should be routed to Radiology PACS queue.
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  disabled={isRoutedToRadiology}
                  onClick={handleRouteToRadiology}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase rounded-xl h-9 px-4 shrink-0 shadow-lg flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Radio size={14} /> {isRoutedToRadiology ? '✅ Transferred to Radiology' : '📡 Route to Radiology Queue'}
                </Button>
              </div>
            </div>
          )}

          {/* SECTION 4: DUPLICATE / CONFLICTING PROVIDER ORDER RECONCILIATION */}
          {safetyResult.duplicateOrderDetected && (
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                  <Scale size={16} /> Duplicate / Conflicting Provider Orders Flag:
                </h4>

                <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${
                  isReconciled ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {isReconciled ? 'RECONCILED' : 'ACTION REQUIRED'}
                </span>
              </div>

              <div className="p-4 bg-amber-950/40 border border-amber-700 rounded-2xl space-y-3">
                <p className="text-xs text-amber-200 font-bold">
                  Identical prescriptions ordered by two different doctors: {safetyResult.conflictingProviders.join(' and ')}.
                </p>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Select Authoritative Doctor:</span>
                    <select
                      value={selectedDoctor}
                      onChange={(e) => setSelectedDoctor(e.target.value)}
                      className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-300 font-bold outline-none"
                    >
                      {safetyResult.conflictingProviders.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    disabled={isReconciled}
                    onClick={handleReconcile}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase rounded-xl h-9 px-4 shrink-0 shadow-lg flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Scale size={14} /> {isReconciled ? '✅ Order Reconciled' : '⚖️ Reconcile Duplicate Order'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
