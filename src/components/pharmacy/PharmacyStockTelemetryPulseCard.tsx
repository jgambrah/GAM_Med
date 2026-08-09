'use client';
import { useState, useMemo } from 'react';
import { Thermometer, Calendar, Lock, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Radio, RefreshCcw, Package, Sparkles, ShieldCheck } from 'lucide-react';
import {
  evaluateNearExpiryBatches,
  getVaccineFridgeTelemetry,
  getNarcoticVaultGaugeData,
  NearExpiryBatch,
  FridgeTelemetryGauge,
  NarcoticVaultGauge
} from '@/ai/flows/ai-pharmacy-stock-telemetry-engine';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PharmacyStockTelemetryPulseCardProps {
  defaultExpanded?: boolean;
}

export function PharmacyStockTelemetryPulseCard({
  defaultExpanded = true
}: PharmacyStockTelemetryPulseCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Engine Data
  const nearExpiryBatches = useMemo(() => evaluateNearExpiryBatches(), []);
  const fridgeTelemetry = useMemo(() => getVaccineFridgeTelemetry(), []);
  const narcoticVaultList = useMemo(() => getNarcoticVaultGaugeData(), []);

  const handleMarkBatchForReturn = (batchId: string, drugName: string) => {
    toast({
      title: `📦 Batch ${batchId} Marked for Supplier Return`,
      description: `${drugName} (Expiring < 30 days) flagged for FEFO clearance return.`
    });
  };

  return (
    <div className="bg-slate-950 text-white rounded-[32px] border-4 border-cyan-600 shadow-2xl overflow-hidden transition-all mb-6">
      {/* COLLAPSIBLE HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="p-5 bg-cyan-950/40 hover:bg-cyan-900/40 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-cyan-900 gap-3 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-900/80 rounded-2xl border border-cyan-700 text-cyan-300">
            <Thermometer className="animate-pulse" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-cyan-300">Stock Pulse & Telemetry Insights</h3>
              <span className="text-[9px] font-black bg-cyan-600 text-white px-2 py-0.5 rounded-full uppercase">
                LIVE TELEMETRY
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              Near-Expiry Batch Tracking (&lt; 30 Days) • Vaccine Fridge Telemetry (2°C-8°C) • Narcotic Vault Tracker
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" className="text-cyan-400 font-black text-xs uppercase rounded-xl">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand Stock Pulse'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE WORKSPACE */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* SECTION 1: COLD-CHAIN / VACCINE STORAGE FRIDGE TELEMETRY */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                <Radio size={16} className="text-cyan-400 animate-pulse" /> Vaccine & Insulin Fridge Telemetry:
              </h4>

              <span className="text-[9px] font-black bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-full uppercase">
                {fridgeTelemetry.status} (2°C - 8°C)
              </span>
            </div>

            <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <Thermometer size={24} className="text-emerald-400" />
                <div>
                  <h5 className="text-xs font-black uppercase text-white">{fridgeTelemetry.location}</h5>
                  <p className="text-[10px] text-emerald-300 font-bold mt-0.5">{fridgeTelemetry.statusMessage}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xl font-black text-emerald-300 tracking-wider block">{fridgeTelemetry.temperatureCelsius}°C</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase">Humidity: {fridgeTelemetry.humidityPercent}%</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: NEAR-EXPIRY MEDICATION & BATCH TRACKING (< 30 DAYS) */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Calendar size={16} /> Near-Expiry Batch Tracking (&lt; 30 Days Expiration):
              </h4>

              <span className="text-[9px] font-black bg-amber-950 text-amber-300 border border-amber-800 px-3 py-1 rounded-full uppercase">
                {nearExpiryBatches.length} Batches Near Expiry
              </span>
            </div>

            <div className="space-y-2">
              {nearExpiryBatches.map((b) => (
                <div key={b.batchId} className="p-3 bg-amber-950/40 border border-amber-700 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">{b.drugName}</span>
                      <span className="text-[9px] font-mono bg-amber-900 text-amber-200 px-2 py-0.5 rounded-sm font-bold">
                        Batch #{b.batchId}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      Expiring in <span className="text-amber-300 font-black">{b.daysRemaining} days</span> ({b.expiryDate}) • Location: {b.shelfBin} • Stock: {b.quantityInStock} Units
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleMarkBatchForReturn(b.batchId, b.drugName)}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-black text-[10px] uppercase rounded-xl h-7 px-3 shrink-0 shadow-md"
                  >
                    📦 Mark for Return
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: CONTROLLED SUBSTANCE (NARCOTICS) PERPETUAL VAULT */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                <Lock size={16} /> Restricted Narcotic Vault Perpetual Inventory:
              </h4>

              <span className="text-[9px] font-black bg-purple-950 text-purple-300 border border-purple-800 px-3 py-1 rounded-full uppercase">
                Dual Sign-off Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {narcoticVaultList.map((n, idx) => (
                <div key={idx} className="p-3.5 bg-purple-950/40 border border-purple-800 rounded-xl space-y-1">
                  <div className="flex justify-between items-center font-black text-xs text-purple-300">
                    <span>{n.drugName}</span>
                    <ShieldCheck size={16} className="text-purple-400" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold">Category: {n.scheduleCategory}</p>
                  <div className="flex justify-between items-center pt-1 border-t border-purple-900/60 text-xs">
                    <span className="font-mono text-purple-200 font-black">Perpetual Balance:</span>
                    <span className="font-black text-emerald-300 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                      {n.currentBalanceMg} mg
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
