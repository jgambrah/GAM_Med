'use client';
import { useState, useMemo } from 'react';
import { TrendingUp, Sparkles, ShoppingBag, CheckCircle2, AlertTriangle, ArrowRight, Zap, CloudRain } from 'lucide-react';
import {
  generatePredictiveDemandForecast,
  generateAutoPurchaseOrder,
  DemandForecastMetrics,
  AutoPurchaseOrderPayload
} from '@/ai/flows/ai-pharmacy-demand-forecasting-engine';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface PharmacyDemandForecastingCardProps {
  defaultExpanded?: boolean;
}

export function PharmacyDemandForecastingCard({
  defaultExpanded = false
}: PharmacyDemandForecastingCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Predictive Demand Forecast Data
  const forecasts = useMemo(() => generatePredictiveDemandForecast(), []);

  // Auto Purchase Order Modal State
  const [selectedForecast, setSelectedForecast] = useState<DemandForecastMetrics | null>(null);
  const [orderQty, setOrderQty] = useState(1000);
  const [activePo, setActivePo] = useState<AutoPurchaseOrderPayload | null>(null);

  const handleGeneratePo = () => {
    if (!selectedForecast) return;

    const po = generateAutoPurchaseOrder(
      selectedForecast.drugName,
      orderQty,
      selectedForecast.suggestedVendor
    );

    setActivePo(po);
    setSelectedForecast(null);

    toast({
      title: '📑 AI Auto Purchase Order Dispatched to Vendor',
      description: `Generated Purchase Order ${po.poNumber} for ${orderQty} units of ${po.drugName} to ${po.vendorName} (GHS ${po.totalCostGhc.toLocaleString()}).`
    });
  };

  return (
    <div className={`bg-slate-950 text-white rounded-2xl border transition-all duration-300 overflow-hidden relative ${
      isExpanded ? 'border-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.15)]' : 'border-slate-800 hover:border-slate-700'
    }`}>
      {isExpanded && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.8)] z-20"></div>
      )}
      {/* HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/40 transition select-none"
      >
        <div className="flex items-center gap-4 pl-2">
          <div className="p-3 bg-fuchsia-500/10 rounded-xl border border-fuchsia-500/20 text-fuchsia-400 shrink-0">
            <Sparkles className="w-6 h-6 text-fuchsia-400" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-sm font-black text-white uppercase tracking-wide">AI Demand Forecasting</h3>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-fuchsia-400" />
                DYNAMIC REORDER ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Predictive seasonal demand spikes & supplier auto-PO engine.</p>
          </div>
        </div>

        <button className="text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-wider flex items-center gap-1 shrink-0 cursor-pointer">
          {isExpanded ? 'Collapse Forecasts' : 'View AI Forecasts'}
        </button>
      </div>

      {/* EXPANDED CONTENT */}
      {isExpanded && (
        <div className="p-5 pt-0 space-y-4 border-t border-slate-800/80">
          {/* ACTIVE PO DISPATCH BANNER */}
          {activePo && (
            <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-200 p-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-pulse mt-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="text-emerald-400 h-4 w-4 shrink-0" />
                <span>AUTO-PO DISPATCHED ({activePo.poNumber}): {activePo.recommendedReorderQty} units of {activePo.drugName} ordered from {activePo.vendorName}</span>
              </div>
              <span className="text-[9px] bg-emerald-900 text-emerald-100 px-2 py-0.5 rounded uppercase font-mono">
                SUBMITTED 📑
              </span>
            </div>
          )}

          {/* FORECAST METRICS LIST */}
          <div className="space-y-3 pt-2">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              30-Day Seasonal Demand Predictions & Reorder Thresholds
            </p>

            <div className="space-y-3">
              {forecasts.map((item, idx) => (
                <div 
                  key={idx}
                  className="p-4 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-2.5 hover:border-purple-800/60 transition-all"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h4 className="font-black text-xs text-white uppercase">{item.drugName}</h4>
                      <p className="text-[10px] text-purple-400 font-extrabold uppercase mt-0.5">
                        {item.seasonalTriggerReason}
                      </p>
                    </div>

                    <span className="text-[9px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800 px-2.5 py-0.5 rounded-full uppercase">
                      Confidence: {item.forecastConfidencePercent}%
                    </span>
                  </div>

                  {/* FORECAST METRICS GRID */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-800">
                      <p className="text-[9px] text-slate-400 uppercase font-black">Current Stock</p>
                      <p className="text-xs font-mono font-black text-amber-400">{item.currentStock} units</p>
                    </div>

                    <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-800">
                      <p className="text-[9px] text-slate-400 uppercase font-black">Predicted 30D Demand</p>
                      <p className="text-xs font-mono font-black text-purple-400">{item.predicted30DayDemand} units</p>
                    </div>

                    <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-800">
                      <p className="text-[9px] text-slate-400 uppercase font-black">Dynamic Reorder Point</p>
                      <p className="text-xs font-mono font-black text-cyan-400">{item.recommendedDynamicReorderPoint} units</p>
                    </div>

                    <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-800">
                      <p className="text-[9px] text-slate-400 uppercase font-black">Days of Supply</p>
                      <p className="text-xs font-mono font-black text-red-400">{item.daysOfSupplyRemaining} days left</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                    <span className="text-[10px] text-slate-400 font-bold">
                      Vendor: {item.suggestedVendor}
                    </span>

                    <Button
                      type="button"
                      onClick={() => {
                        setSelectedForecast(item);
                        setOrderQty(item.recommendedDynamicReorderPoint * 2);
                      }}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase rounded-xl h-8 px-3 flex items-center gap-1 shadow-md shadow-purple-600/20"
                    >
                      <ShoppingBag size={12} /> Auto-Generate PO
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AUTO PURCHASE ORDER MODAL */}
      <Dialog open={!!selectedForecast} onOpenChange={() => setSelectedForecast(null)}>
        <DialogContent className="bg-slate-950 text-white border-2 border-purple-600 rounded-[32px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase text-purple-300 flex items-center gap-2">
              <ShoppingBag size={18} /> Generate AI Predictive Supplier Purchase Order
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-medium">
              Auto-generate and transmit purchase order to supplier before current stock hits zero.
            </DialogDescription>
          </DialogHeader>

          {selectedForecast && (
            <div className="space-y-3 py-2">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase">Target Drug:</p>
                <p className="text-xs font-black text-purple-300 uppercase">{selectedForecast.drugName}</p>
                <p className="text-[10px] font-mono text-purple-400">Trigger: {selectedForecast.seasonalTriggerReason}</p>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Target Supplier / Vendor:</label>
                <input
                  type="text"
                  value={selectedForecast.suggestedVendor}
                  readOnly
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-black uppercase"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Recommended Reorder Quantity (Units):</label>
                <input
                  type="number"
                  value={orderQty}
                  onChange={(e) => setOrderQty(Number(e.target.value))}
                  min={100}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-purple-500 font-black"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelectedForecast(null)}
              className="text-slate-400 hover:text-white font-bold text-xs uppercase"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleGeneratePo}
              className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase rounded-xl px-5"
            >
              Submit PO to Vendor 📑
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
