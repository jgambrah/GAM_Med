'use client';
import { useState, useMemo } from 'react';
import { Building2, Truck, RefreshCw, CheckCircle2, Send, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import {
  queryMultiBranchInventory,
  initiateInterFacilityStockTransfer,
  FacilityStockNode,
  InterFacilityTransferRequest
} from '@/ai/flows/ai-pharmacy-multitenant-sync-engine';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface PharmacyMultiBranchInventoryTransferCardProps {
  initialDrugName?: string;
  defaultExpanded?: boolean;
}

export function PharmacyMultiBranchInventoryTransferCard({
  initialDrugName = 'Penicillin V Potassium 500mg',
  defaultExpanded = false
}: PharmacyMultiBranchInventoryTransferCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [searchDrug, setSearchDrug] = useState(initialDrugName);

  // Multi-branch network search results
  const branchStocks = useMemo(() => {
    return queryMultiBranchInventory(searchDrug);
  }, [searchDrug]);

  // Transfer modal state
  const [selectedNode, setSelectedNode] = useState<FacilityStockNode | null>(null);
  const [transferQty, setTransferQty] = useState(50);
  const [activeTransfer, setActiveTransfer] = useState<InterFacilityTransferRequest | null>(null);

  const handleRequestTransfer = () => {
    if (!selectedNode) return;

    const request = initiateInterFacilityStockTransfer(
      selectedNode.facilityId,
      selectedNode.facilityName,
      'HOSP-CURRENT',
      'GAM_Med Central Pharmacy',
      selectedNode.drugName,
      transferQty,
      'CRITICAL_STAT'
    );

    setActiveTransfer(request);
    setSelectedNode(null);

    toast({
      title: '🚚 Inter-Facility Stock Transfer Dispatched',
      description: `Request ${request.requestId} sent to ${request.sourceFacilityName} for ${transferQty} units of ${request.drugName}.`
    });
  };

  return (
    <div className="bg-slate-900 text-white rounded-[28px] border border-slate-800 shadow-xl overflow-hidden my-4">
      {/* HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-black">
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm uppercase tracking-wider text-white">Multi-Tenant Stock Sync</h3>
              <span className="text-[9px] font-black bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full uppercase">
                🌐 4 Branches Connected
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Query Sister Hospitals & Initiate Express Stock Transfer
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-white font-bold text-xs uppercase"
        >
          {isExpanded ? 'Collapse ▲' : 'Query Sister Stock ▼'}
        </Button>
      </div>

      {/* EXPANDED CONTENT */}
      {isExpanded && (
        <div className="p-5 pt-0 space-y-4 border-t border-slate-800/80">
          {/* SEARCH DRUG BAR */}
          <div className="flex items-center gap-2 pt-3">
            <input
              type="text"
              value={searchDrug}
              onChange={(e) => setSearchDrug(e.target.value)}
              placeholder="Enter drug name to search sister hospital network..."
              className="flex-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-cyan-500 font-bold"
            />
            <Button
              type="button"
              onClick={() => setSearchDrug(searchDrug)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] uppercase rounded-xl h-9 px-4"
            >
              <RefreshCw size={12} className="mr-1" /> Refresh Network
            </Button>
          </div>

          {/* ACTIVE DISPATCH NOTIFICATION */}
          {activeTransfer && (
            <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-200 p-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-pulse">
              <div className="flex items-center gap-2">
                <Truck className="text-emerald-400 h-4 w-4 shrink-0" />
                <span>TRANSFER DISPATCHED ({activeTransfer.requestId}): {activeTransfer.requestedQty} units of {activeTransfer.drugName} en-route from {activeTransfer.sourceFacilityName}</span>
              </div>
              <span className="text-[9px] bg-emerald-900 text-emerald-100 px-2 py-0.5 rounded uppercase font-mono">
                EN-ROUTE 🚚
              </span>
            </div>
          )}

          {/* SISTER BRANCHES TELEMETRY LIST */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              Available Network Inventory Telemetry ({branchStocks.length} Sister Facilities)
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {branchStocks.map((node) => (
                <div 
                  key={node.facilityId}
                  className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-all"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-xs text-white uppercase">{node.facilityName}</h4>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                        node.status === 'AVAILABLE'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {node.status}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 font-medium">
                      📍 {node.location} • 📞 {node.contactPhone}
                    </p>

                    <p className="text-[10px] font-mono font-bold text-cyan-400">
                      Stock: {node.quantityInStock} units available (GHS {node.unitCostGhc.toFixed(2)}/unit)
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => setSelectedNode(node)}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] uppercase rounded-xl h-8 px-3 flex items-center gap-1 shrink-0 shadow-md shadow-cyan-600/20"
                  >
                    <Truck size={12} /> Transfer Stock
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* INTER-FACILITY STOCK TRANSFER MODAL */}
      <Dialog open={!!selectedNode} onOpenChange={() => setSelectedNode(null)}>
        <DialogContent className="bg-slate-950 text-white border-2 border-cyan-600 rounded-[32px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase text-cyan-300 flex items-center gap-2">
              <Truck size={18} /> Initiate Express Inter-Facility Stock Transfer
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-medium">
              Dispatch an automated cloud transfer request from {selectedNode?.facilityName} to Central Pharmacy.
            </DialogDescription>
          </DialogHeader>

          {selectedNode && (
            <div className="space-y-3 py-2">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase">Target Drug:</p>
                <p className="text-xs font-black text-cyan-300 uppercase">{selectedNode.drugName}</p>
                <p className="text-[10px] font-mono text-slate-400">Source Balance: {selectedNode.quantityInStock} units available</p>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Requested Transfer Quantity (Units):</label>
                <input
                  type="number"
                  value={transferQty}
                  onChange={(e) => setTransferQty(Number(e.target.value))}
                  min={1}
                  max={selectedNode.quantityInStock}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-cyan-500 font-black"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-white font-bold text-xs uppercase"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRequestTransfer}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase rounded-xl px-5"
            >
              Dispatch Transfer Request 🚚
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
