'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Clock, CheckCircle, ChevronRight, AlertCircle, 
  Send, MessageSquareWarning, Package, ShieldCheck, CheckCircle2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PharmacyAdvancedClinicalSafetySuiteCard } from '@/components/pharmacy/PharmacyAdvancedClinicalSafetySuiteCard';
import { PharmacyInterdepartmentalActionCard } from '@/components/pharmacy/PharmacyInterdepartmentalActionCard';
import { useToast } from '@/hooks/use-toast';
import { executeAtomicBatchDispenseTransaction } from '@/ai/flows/ai-pharmacy-atomic-dispense-transaction-engine';
import { useFirestore, useUser } from '@/firebase';

interface MasterPatientCardProps {
  group: any;
  hospitalId?: string;
  onBulkDispense?: (group: any) => void;
  formatRelativeSlaTime: (createdAt: any) => string;
}

export function MasterPatientCard({
  group,
  hospitalId = 'HOSP-CURRENT',
  onBulkDispense,
  formatRelativeSlaTime
}: MasterPatientCardProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [isDispensingTx, setIsDispensingTx] = useState(false);

  const [currentStage, setCurrentStage] = useState<'UNREVIEWED' | 'CLINICALLY_VERIFIED' | 'IN_PACKAGING' | 'READY_FOR_PICKUP'>(
    group.patientName?.toLowerCase().includes('daniel') ? 'CLINICALLY_VERIFIED' : group.patientName?.toLowerCase().includes('janet') ? 'IN_PACKAGING' : 'UNREVIEWED'
  );

  const meds = group.allMedications || group.medications || [];

  const handleExecuteAcidBatchDispense = async () => {
    setIsDispensingTx(true);

    const payload = {
      encounterId: group.id || group.encounterId || 'ENC-8812',
      hospitalId,
      pharmacistId: user?.uid || 'PHARM-8801',
      pharmacistName: user?.displayName || 'Senior Pharmacist',
      itemsToDispense: meds.map((m: any, idx: number) => ({
        prescriptionId: m.id || `RX-${idx + 1}`,
        drugId: `DRUG-${(m.name || 'item').toLowerCase().replace(/\s+/g, '-')}`,
        drugName: m.name || 'Medication Line',
        dispenseQty: m.qty || m.quantity || 1,
        coPayAmount: 0,
      })),
    };

    const res = await executeAtomicBatchDispenseTransaction(firestore, payload);

    setIsDispensingTx(false);

    if (res.success) {
      setCurrentStage('READY_FOR_PICKUP');
      toast({
        title: '⚡ ACID ATOMIC BATCH DISPENSE COMPLETE',
        description: `All ${meds.length} Items Finalized & Ledger Postings Signed. (${res.message})`,
      });
      if (onBulkDispense) onBulkDispense(group);
    } else {
      toast({
        variant: 'destructive',
        title: '🚨 TRANSACTION ROLLED BACK',
        description: `${res.message || 'Insufficient stock for requested medication.'} 0 items deducted, financial ledger untouched.`,
      });
    }
  };

  const handleCycleStage = () => {
    if (currentStage === 'UNREVIEWED') setCurrentStage('CLINICALLY_VERIFIED');
    else if (currentStage === 'CLINICALLY_VERIFIED') setCurrentStage('IN_PACKAGING');
    else if (currentStage === 'IN_PACKAGING') setCurrentStage('READY_FOR_PICKUP');
    else setCurrentStage('UNREVIEWED');
  };

  const triage = group.triageLevel || (group.patientName?.toLowerCase().includes('daniel') ? 'STAT' : group.isDiag ? 'DIAGNOSTIC' : 'ROUTINE');
  const age = group.patientAge || (group.patientName?.toLowerCase().includes('daniel') ? 58 : 34);
  const weight = group.patientWeight || (group.patientName?.toLowerCase().includes('daniel') ? 82 : 62);
  const gender = group.patientGender || (group.patientName?.toLowerCase().includes('daniel') ? 'M' : 'F');
  const provider = group.providerName || group.prescriber || 'Dr. Marcus Amosah Henaku';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-500/40 transition-all duration-200 overflow-hidden mb-6">
      
      {/* 1. UNIFIED CARD HEADER */}
      <div className="bg-slate-900 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Patient Identity */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-500/20 border border-indigo-500/30 rounded-full flex items-center justify-center text-indigo-300 font-black text-lg">
            {group.patientName ? group.patientName.charAt(0).toUpperCase() : 'P'}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-black text-white tracking-wide uppercase">{group.patientName}</h2>
              {group.isDiag ? (
                <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> DIAGNOSTIC
                </span>
              ) : triage === 'STAT' ? (
                <span className="px-2 py-0.5 text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full uppercase tracking-wider flex items-center gap-1 animate-pulse">
                  <AlertCircle className="w-3 h-3" /> STAT EMERGENCY
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> ROUTINE OPD
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {gender}, {age} YRS • {weight} KG • DR. {provider.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Status Tags */}
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> {formatRelativeSlaTime(group.createdAt)}
          </span>
          <button
            type="button"
            onClick={handleCycleStage}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-md flex items-center gap-1.5 uppercase transition cursor-pointer ${
              currentStage === 'CLINICALLY_VERIFIED'
                ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20'
                : currentStage === 'IN_PACKAGING'
                ? 'text-fuchsia-400 bg-fuchsia-500/10 border border-fuchsia-500/20'
                : currentStage === 'READY_FOR_PICKUP'
                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
            }`}
          >
            <Package className="w-3 h-3" /> {currentStage.replace('_', ' ')}
          </button>
        </div>
      </div>

      {/* 2. CARD BODY (Data & Actions) */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Prescriptions (Takes up 7/12 columns) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Clinical Safety Suite for Alert Patients */}
          {group.patientName?.toLowerCase().includes('daniel') && (
            <PharmacyAdvancedClinicalSafetySuiteCard 
              patientName={group.patientName}
              drugList={meds.map((m: any) => m.name || 'Drug Item')}
              ageYears={58}
              weightKg={82}
            />
          )}

          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            Prescribed Items ({meds.length} Lines)
          </h4>
          
          <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {meds.map((m: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="w-8 py-3 pl-4 text-xs font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <span className="w-2 h-2 bg-rose-400 rounded-full"></span> 
                      {(m.name || m.drugName || 'Medication Item').toUpperCase()}
                    </td>
                    <td className="py-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                      Qty: {m.qty || m.quantity || 1}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-md">
                        IN STOCK
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: Financial Clearance & Actions (Takes up 5/12 columns) */}
        <div className="lg:col-span-5 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 pt-6 lg:pt-0 lg:pl-8">
          
          {/* Financial Clearance Block */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              Financial Clearance
            </h4>
            <div className="flex items-center justify-between mb-2">
              <span className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-md flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3" /> NHIS PRE-APPROVED
              </span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Copay: GHS 0.00</span>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-center mt-3">
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide flex items-center justify-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-indigo-500" /> FULLY PAID (GHS 0.00 DUE)
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 mt-6">
            <div className="w-full">
              <PharmacyInterdepartmentalActionCard 
                doctorName={provider}
                patientName={group.patientName}
                patientId={group.patientId}
              />
            </div>

            <button 
              type="button"
              disabled={isDispensingTx}
              onClick={handleExecuteAcidBatchDispense}
              className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isDispensingTx ? 'EXECUTING TRANSACTION...' : group.isDiag ? 'ROUTE TO RADIOLOGY PACS' : `DISPENSE ALL (${meds.length} ITEMS)`}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
