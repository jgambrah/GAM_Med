'use client';
import { useState, useMemo } from 'react';
import { Layers, Package, Clock, ShieldCheck, AlertCircle, ShoppingCart, RefreshCcw, Lock, Key, CheckCircle2, ChevronDown, ChevronUp, UserCheck, Zap } from 'lucide-react';
import {
  getSampleBatches,
  allocateFEFOBatches,
  evaluateReorderPoint,
  validateDualPharmacistSignoff,
  InventoryBatch,
  AutoReorderOrder,
  ControlledSubstanceLog
} from '@/ai/flows/ai-pharmacy-inventory-engine';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface SmartDispensingInventoryCardProps {
  drugName?: string;
  patientName?: string;
  primaryPharmacistName?: string;
  isControlledSubstance?: boolean;
  onCoSignSuccess?: () => void;
  defaultExpanded?: boolean;
}

export function SmartDispensingInventoryCard({
  drugName = 'Amoxicillin 500mg',
  patientName = 'Patient',
  primaryPharmacistName = 'Pharmacist',
  isControlledSubstance = false,
  onCoSignSuccess,
  defaultExpanded = true
}: SmartDispensingInventoryCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // FEFO Batches State
  const [batches, setBatches] = useState<InventoryBatch[]>(() => getSampleBatches(drugName));
  const fefoResult = useMemo(() => allocateFEFOBatches(drugName, 30, batches), [drugName, batches]);

  // Auto-Reorder PO State
  const totalStock = batches.reduce((acc, b) => acc + b.remainingQty, 0);
  const autoPO = useMemo(() => evaluateReorderPoint(totalStock, 300, drugName), [totalStock, drugName]);
  const [poDispatched, setPoDispatched] = useState(false);

  // Controlled Substance Dual Sign-Off Modal State
  const [isNarcoticModalOpen, setIsNarcoticModalOpen] = useState(false);
  const [coSignerEmail, setCoSignerEmail] = useState('');
  const [coSignerPin, setCoSignerPin] = useState('');
  const [narcoticLog, setNarcoticLog] = useState<ControlledSubstanceLog | null>(null);

  const handleDispatchPO = () => {
    setPoDispatched(true);
    toast({
      title: '📦 Supplier Purchase Order Dispatched',
      description: `Draft ${autoPO?.poId} sent to Ghana National Medical Stores (NMS) for 500 units of ${drugName}.`
    });
  };

  const handleVerifyDualSignoff = () => {
    const res = validateDualPharmacistSignoff(primaryPharmacistName, coSignerEmail, coSignerPin, drugName, patientName);

    if (res.isValid && res.log) {
      setNarcoticLog(res.log);
      setIsNarcoticModalOpen(false);
      toast({
        title: '✅ Controlled Substance Dual Sign-Off Verified',
        description: res.message
      });
      if (onCoSignSuccess) onCoSignSuccess();
    } else {
      toast({
        variant: 'destructive',
        title: '🚨 Dual Sign-Off Failed',
        description: res.message
      });
    }
  };

  return (
    <div className="bg-slate-950 text-white rounded-[32px] border-4 border-purple-600 shadow-2xl overflow-hidden transition-all mb-6">
      {/* COLLAPSIBLE HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="p-5 bg-purple-950/40 hover:bg-purple-900/40 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-purple-900 gap-3 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-900/80 rounded-2xl border border-purple-700 text-purple-300">
            <Layers className="animate-pulse" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-purple-300">Smart Dispensing & Inventory Intelligence</h3>
              <span className="text-[9px] font-black bg-purple-600 text-white px-2 py-0.5 rounded-full uppercase">
                FEFO BATCH ROUTER ACTIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              First-Expired First-Out (FEFO) Routing • Auto-Reorder PO Thresholds • Narcotic Dual Sign-Off Audit Vault
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" className="text-purple-400 font-black text-xs uppercase rounded-xl">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand Inventory'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE WORKSPACE */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* SECTION 1: FEFO BATCH ALLOCATION ROUTER */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                <Clock size={16} /> FEFO (First-Expired, First-Out) Automated Batch Allocation:
              </h4>
              <span className="text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-full uppercase">
                Total Stock: {totalStock} Units
              </span>
            </div>

            <p className="text-[11px] text-emerald-300 font-bold bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/60 flex items-center gap-2">
              <Zap size={14} className="text-yellow-400 shrink-0" />
              {fefoResult.fefoRecommendation}
            </p>

            {/* BATCHES TABLE */}
            <div className="space-y-2">
              {batches.map((batch) => {
                const isPrimary = batch.id === fefoResult.primaryBatch?.id;
                return (
                  <div
                    key={batch.id}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition-all ${
                      isPrimary 
                        ? 'bg-purple-950/60 border-purple-500 shadow-md ring-2 ring-purple-500/30' 
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Package size={18} className={isPrimary ? 'text-purple-300' : 'text-slate-500'} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">Batch #{batch.batchNumber}</span>
                          {isPrimary && (
                            <span className="bg-purple-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">
                              FEFO RECOMMENDED BATCH
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                          Expires: {batch.expiryDate} ({batch.daysUntilExpiry} days remaining) • Location: {batch.storageLocation}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-amber-300 block">{batch.remainingQty} Units</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">{batch.status.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: AUTO-REORDER & STOCK THRESHOLD ALERTS */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
              <ShoppingCart size={16} /> Automated Reorder & Stock Threshold Alerts:
            </h4>

            {autoPO ? (
              <div className="p-4 bg-amber-950/80 border-2 border-amber-600 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-start gap-3">
                  <AlertCircle size={22} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-black text-white uppercase">Critical Stock Threshold Alert Triggered</h5>
                    <p className="text-[11px] font-bold text-amber-200 mt-0.5">
                      Current stock ({autoPO.currentStock} units) is below reorder point ({autoPO.reorderPoint} units). PO Draft #{autoPO.poId} generated for 500 units from {autoPO.vendorName}.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  disabled={poDispatched}
                  onClick={handleDispatchPO}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase rounded-xl h-9 px-4 shrink-0 shadow-lg disabled:opacity-50"
                >
                  {poDispatched ? '✅ PO Dispatched' : '📦 Dispatch Supplier PO Draft'}
                </Button>
              </div>
            ) : (
              <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} />
                Stock levels optimal ({totalStock} units). Above reorder threshold (300 units).
              </div>
            )}
          </div>

          {/* SECTION 3: CONTROLLED SUBSTANCE NARCOTIC VAULT */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                <Lock size={16} /> Controlled Substance Vault & Dual-Pharmacist Sign-off:
              </h4>

              <Button
                type="button"
                size="sm"
                onClick={() => setIsNarcoticModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase rounded-xl h-7 px-3 flex items-center gap-1 shadow-md"
              >
                <Key size={12} /> Co-Sign Narcotic Dispense
              </Button>
            </div>

            {narcoticLog ? (
              <div className="p-4 bg-purple-950/80 border border-purple-600 rounded-2xl text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-black text-purple-300 uppercase">✅ Verified Narcotic Co-Sign Audit Record</span>
                  <span className="text-[9px] font-mono bg-purple-900 text-white px-2 py-0.5 rounded-md">{narcoticLog.id}</span>
                </div>
                <p className="text-slate-200 font-bold">
                  Primary Pharmacist: {narcoticLog.primaryPharmacist} • Co-Signer: {narcoticLog.coSigningPharmacist}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Timestamp: {narcoticLog.coSignTimestamp} • Clinical Rationale: {narcoticLog.clinicalRationale}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-medium">
                Mandatory dual-pharmacist biometric/digital co-sign log required for Morphine, Fentanyl, Pethidine, or Diazepam dispensing.
              </p>
            )}
          </div>
        </div>
      )}

      {/* DUAL-PHARMACIST CO-SIGN DIALOG */}
      <Dialog open={isNarcoticModalOpen} onOpenChange={setIsNarcoticModalOpen}>
        <DialogContent className="bg-slate-950 text-white border-2 border-purple-600 rounded-[32px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase text-purple-300 flex items-center gap-2">
              <Lock size={18} /> Controlled Substance Dual-Pharmacist Co-Sign
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-medium">
              Federal & Hospital Compliance requires a 2nd licensed pharmacist to verify narcotic dosage for {patientName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Primary Pharmacist:</label>
              <input
                type="text"
                disabled
                value={primaryPharmacistName}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Co-Signing Pharmacist Email / UID:</label>
              <input
                type="text"
                value={coSignerEmail}
                onChange={(e) => setCoSignerEmail(e.target.value)}
                placeholder="cosigner.pharmacist@hospital.org"
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-purple-500 font-medium"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Co-Signer 4-Digit Security PIN:</label>
              <input
                type="password"
                maxLength={4}
                value={coSignerPin}
                onChange={(e) => setCoSignerPin(e.target.value)}
                placeholder="••••"
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-purple-300 outline-none focus:border-purple-500 font-mono tracking-widest text-center"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsNarcoticModalOpen(false)}
              className="text-slate-400 text-xs font-black uppercase"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleVerifyDualSignoff}
              className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase rounded-xl px-4"
            >
              ✍️ Authorize & Co-Sign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
