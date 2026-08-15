'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Stethoscope, X, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CheckInModalProps {
  patient: {
    id: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    name?: string;
    ehrNumber?: string;
    ehrId?: string;
    status?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (encounterId: string) => void;
  hospitalId?: string;
}

export default function CheckInModal({ patient, isOpen, onClose, onSuccess, hospitalId }: CheckInModalProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [route, setRoute] = useState<'OPD_TRIAGE' | 'EMERGENCY'>('OPD_TRIAGE');
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  if (!isOpen || !patient) return null;

  const patientFullName = patient.fullName || patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'PATIENT';
  const patientEhr = patient.ehrNumber || patient.ehrId || 'MMH/EHR/26/0007';
  const patientStatus = (patient.status || 'WAITING_FOR_ASSIGNMENT').replace(/_/g, ' ');
  const patientInitial = patientFullName.charAt(0).toUpperCase();

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const res = await fetch('/api/patients/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          patientName: patientFullName,
          ehrId: patientEhr,
          destinationQueue: route,
          paymentMethod,
          hospitalId: hospitalId || 'GAM-GAR-7578',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Check-in failed.');
      }

      toast({
        title: "✅ Patient Checked-In & Routed",
        description: `${patientFullName} routed to ${route === 'EMERGENCY' ? 'Emergency Triage' : 'General OPD Triage'} (${paymentMethod}).`,
      });

      if (onSuccess) onSuccess(data.encounterId);
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: "Check-In Failed",
        description: error.message || "Failed to route patient to triage.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
        
        {/* Modal Header */}
        <div className="bg-slate-950 text-white p-6 shrink-0 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-400">
              <Stethoscope size={22} />
              <h2 className="text-xl font-black italic uppercase tracking-wider text-white">CLINICAL CHECK-IN</h2>
            </div>
            <p className="text-slate-400 text-xs font-mono font-bold mt-1">EHR: {patientEhr}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-black px-2.5 py-1 rounded-xl uppercase tracking-widest border border-indigo-500/30">
              Active Encounter
            </span>
            <button 
              type="button"
              onClick={onClose} 
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-slate-800 cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Check-In Form */}
        <form onSubmit={handleCheckIn} className="p-6 flex-1 space-y-6 text-slate-900 dark:text-slate-100">
          
          {/* Patient Context Plate */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-xl shrink-0">
              {patientInitial}
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-base uppercase">{patientFullName}</h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Status: <span className="text-amber-500 font-bold uppercase">{patientStatus}</span></p>
            </div>
          </div>

          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">
            Encounter Parameters
          </h3>

          <div className="space-y-5">
            {/* Clinical Routing */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Destination Queue *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRoute('OPD_TRIAGE')}
                  className={`p-3 text-xs font-black rounded-xl border transition-all cursor-pointer text-center ${
                    route === 'OPD_TRIAGE'
                      ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  General OPD Triage
                </button>

                <button
                  type="button"
                  onClick={() => setRoute('EMERGENCY')}
                  className={`p-3 text-xs font-black rounded-xl border transition-all cursor-pointer text-center ${
                    route === 'EMERGENCY'
                      ? 'bg-red-500/10 border-red-500 text-red-400 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  Emergency (Red Flag)
                </button>
              </div>
            </div>

            {/* Financial Clearance */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Financial Clearance (Consultation) *</label>
              <select
                required
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold outline-none cursor-pointer"
              >
                <option value="CASH">Out of Pocket (Cash / MoMo)</option>
                <option value="NHIS">National Health Insurance (NHIA)</option>
                <option value="GLICO">GLICO Healthcare HMO</option>
                <option value="ACACIA">Acacia Health Insurance</option>
              </select>

              {paymentMethod === 'CASH' && (
                <div className="text-[11px] text-amber-500 font-bold mt-2.5 uppercase flex items-center gap-1.5 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>Action will generate pending consultation invoice at Cashier Till.</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
              <ShieldCheck size={14} className="text-indigo-400" />
              <span>Encounter Generator Active</span>
            </div>

            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                className="px-6 py-3 font-bold text-xs uppercase rounded-xl"
              >
                CANCEL
              </Button>

              <Button 
                type="submit" 
                disabled={isProcessing} 
                className="px-8 py-3 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>ROUTING...</span>
                  </>
                ) : (
                  'CONFIRM & ROUTE TO TRIAGE'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
