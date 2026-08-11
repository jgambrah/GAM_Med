'use client';
import { useState, useMemo } from 'react';
import { 
  Activity, Thermometer, Calendar, Lock, ChevronDown, ChevronUp, 
  Radio, Package, ShieldCheck
} from 'lucide-react';
import {
  evaluateNearExpiryBatches,
  getVaccineFridgeTelemetry,
  getNarcoticVaultGaugeData
} from '@/ai/flows/ai-pharmacy-stock-telemetry-engine';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PharmacyStockTelemetryPulseCardProps {
  defaultExpanded?: boolean;
  stockStats?: {
    stableCount: number;
    stablePercent: number;
    lowCount: number;
    lowPercent: number;
    outCount: number;
    outPercent: number;
  };
  generateReportFn?: () => void;
  isLoadingStats?: boolean;
}

export function PharmacyStockTelemetryPulseCard({
  defaultExpanded = true,
  stockStats,
  generateReportFn,
  isLoadingStats = false
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
    <div className={`bg-slate-950 text-white rounded-2xl border transition-all duration-300 overflow-hidden relative ${
      isExpanded 
        ? 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
        : 'border-slate-800 hover:border-slate-700'
    }`}>
      {/* LEFT GLOWING ACCENT FOR ACTIVE STATE */}
      {isExpanded && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)] z-20"></div>
      )}

      {/* BANNER HEADER */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer relative z-10 select-none hover:bg-slate-900/40 transition"
      >
        <div className="flex items-center gap-4 pl-2">
          <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400 shrink-0">
            <Activity className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-sm font-black text-white uppercase tracking-wide">Stock Pulse & Telemetry</h3>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full">
                LIVE TELEMETRY
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Near-expiry batch tracking, vaccine fridge temp, & narcotic vault.</p>
          </div>
        </div>

        <button className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1 shrink-0 cursor-pointer">
          {isExpanded ? 'Collapse Stock Pulse' : 'Expand Stock Pulse'} 
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* EXPANDED WORKSPACE */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-slate-800/80 bg-slate-900/30 space-y-6">
          
          {/* SECTION 0: INVENTORY STATUS (INTEGRATED BREAKDOWN) */}
          {stockStats && (
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Inventory Status</h4>
                  <h2 className="text-base font-black text-white">Pharmacy Store A</h2>
                </div>
                {generateReportFn && (
                  <Button 
                    onClick={generateReportFn}
                    disabled={isLoadingStats}
                    size="sm"
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl transition"
                  >
                    Generate Report
                  </Button>
                )}
              </div>

              {/* Progress Bars */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-emerald-400 uppercase">Healthy Stock (&gt;20)</span>
                    <span className="text-emerald-400">{isLoadingStats ? '...' : `${stockStats.stableCount} Items`}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${Math.max(5, stockStats.stablePercent)}%` }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-rose-400 uppercase">Low Stock (1-20)</span>
                    <span className="text-rose-400">{isLoadingStats ? '...' : `${stockStats.lowCount} Items`}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div className="bg-rose-500 h-2 rounded-full transition-all" style={{ width: `${Math.max(5, stockStats.lowPercent)}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-400 uppercase">Out of Stock (0)</span>
                    <span className="text-slate-400">{isLoadingStats ? '...' : `${stockStats.outCount} Items`}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div className="bg-slate-600 h-2 rounded-full transition-all" style={{ width: `${Math.max(5, stockStats.outPercent)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 1: COLD-CHAIN / VACCINE FRIDGE TELEMETRY */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="text-xs font-bold uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                <Radio size={16} className="text-cyan-400 animate-pulse" /> Vaccine & Cold-Chain Telemetry:
              </h4>
              <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full uppercase">
                {fridgeTelemetry.status} (2°C - 8°C)
              </span>
            </div>

            <div className="p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <Thermometer size={22} className="text-emerald-400 shrink-0" />
                <div>
                  <h5 className="text-xs font-bold uppercase text-white">{fridgeTelemetry.location}</h5>
                  <p className="text-[10px] text-emerald-300 font-medium mt-0.5">{fridgeTelemetry.statusMessage}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-lg font-black text-emerald-300 tracking-wider block">{fridgeTelemetry.temperatureCelsius}°C</span>
                <span className="text-[9px] text-slate-400 font-medium uppercase">Humidity: {fridgeTelemetry.humidityPercent}%</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: NEAR-EXPIRY BATCH TRACKING (< 30 DAYS) */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="text-xs font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Calendar size={16} /> Near-Expiry Batches (&lt; 30 Days):
              </h4>
              <span className="text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full uppercase">
                {nearExpiryBatches.length} Batches Near Expiry
              </span>
            </div>

            <div className="space-y-2">
              {nearExpiryBatches.map((b) => (
                <div key={b.batchId} className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{b.drugName}</span>
                      <span className="text-[9px] font-mono bg-amber-900/60 text-amber-200 px-2 py-0.5 rounded font-bold">
                        Batch #{b.batchId}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Expiring in <span className="text-amber-300 font-bold">{b.daysRemaining} days</span> ({b.expiryDate}) • Shelf: {b.shelfBin} • Stock: {b.quantityInStock} Units
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleMarkBatchForReturn(b.batchId, b.drugName)}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] uppercase rounded-xl h-7 px-3 shrink-0"
                  >
                    Mark for Return
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: CONTROLLED SUBSTANCE NARCOTIC VAULT */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="text-xs font-bold uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                <Lock size={16} /> Narcotic Vault Perpetual Inventory:
              </h4>
              <span className="text-[9px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2.5 py-0.5 rounded-full uppercase">
                Dual Sign-Off Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {narcoticVaultList.map((n, idx) => (
                <div key={idx} className="p-3 bg-purple-950/30 border border-purple-800/60 rounded-xl space-y-1">
                  <div className="flex justify-between items-center font-bold text-xs text-purple-300">
                    <span>{n.drugName}</span>
                    <ShieldCheck size={15} className="text-purple-400" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">Category: {n.scheduleCategory}</p>
                  <div className="flex justify-between items-center pt-1 border-t border-purple-900/60 text-xs">
                    <span className="font-mono text-purple-200 font-bold">Perpetual Balance:</span>
                    <span className="font-bold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
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
