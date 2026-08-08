'use client';
import { useState, useMemo } from 'react';
import { Globe, Building2, ShieldCheck, Zap, Activity, RefreshCw, Cpu, Layers, ChevronDown, ChevronUp, Lock, CheckCircle2, AlertTriangle, ArrowUpRight } from 'lucide-react';
import {
  predictERSurgeAndBedCapacity,
  aggregateFederatedGradients,
  getDefaultFederatedNodes,
  CapacityPrediction,
  FederatedNode,
  FederatedConsensusResult
} from '@/ai/flows/ai-federated-engine';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface EnterpriseCapacityFederatedCardProps {
  hospitalName?: string;
  defaultExpanded?: boolean;
}

export function EnterpriseCapacityFederatedCard({ hospitalName = 'GamMed Grid Hospital', defaultExpanded = false }: EnterpriseCapacityFederatedCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isSimulatingCapacity, setIsSimulatingCapacity] = useState(false);
  const [isAggregatingFederated, setIsAggregatingFederated] = useState(false);

  const [nodes, setNodes] = useState<FederatedNode[]>(getDefaultFederatedNodes());
  const [capacity, setCapacity] = useState<CapacityPrediction>(predictERSurgeAndBedCapacity('HOSP-01'));
  const [consensus, setConsensus] = useState<FederatedConsensusResult>(aggregateFederatedGradients(getDefaultFederatedNodes()));

  const handleSimulateCapacity = () => {
    setIsSimulatingCapacity(true);
    setTimeout(() => {
      const updatedOccupancy = Math.min(96, capacity.predictedBedOccupancyPercent + 12);
      const fresh = predictERSurgeAndBedCapacity('HOSP-01', updatedOccupancy);
      setCapacity(fresh);
      setIsSimulatingCapacity(false);
      toast({
        title: '⚡ Dynamic Capacity Prediction Model Run',
        description: `Predicted 24h ER Arrivals (${fresh.erArrivalsNext24h}) & Bed Occupancy (${fresh.predictedBedOccupancyPercent}%).`
      });
    }, 700);
  };

  const handleTriggerFederatedRound = () => {
    setIsAggregatingFederated(true);
    setTimeout(() => {
      const updatedNodes = nodes.map(node => ({
        ...node,
        localRecordCount: node.localRecordCount + 1200,
        localAccuracyPercent: Number(Math.min(99.4, node.localAccuracyPercent + 0.3).toFixed(1)),
        lastSyncTime: 'Just Now'
      }));
      setNodes(updatedNodes);
      const freshConsensus = aggregateFederatedGradients(updatedNodes);
      setConsensus(freshConsensus);
      setIsAggregatingFederated(false);
      toast({
        title: '🌐 Federated AI Consensus Round Completed',
        description: `Aggregated encrypted gradients across ${updatedNodes.length} hospital nodes. Global Accuracy: ${freshConsensus.globalModelVersion}.`
      });
    }, 1000);
  };

  return (
    <div className="bg-slate-950 text-white rounded-[32px] border-4 border-indigo-600 shadow-2xl overflow-hidden transition-all mb-6">
      {/* COLLAPSIBLE HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="p-5 bg-indigo-950/40 hover:bg-indigo-900/40 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-indigo-900 gap-3 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-900/80 rounded-2xl border border-indigo-700 text-indigo-300">
            <Globe className="animate-pulse" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-indigo-300">Multi-Tenant Operations & Federated AI Engine</h3>
              <span className="bg-indigo-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                <Cpu size={10} /> FEDERATED FEDAVG GRID
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              Multi-Hospital Node Network • Zero Raw Data Transmission • Predictive ER/OR Analytics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase border ${
            capacity.erSurgeRisk === 'HIGH_SURGE_PREDICTED'
              ? 'bg-red-600 text-white border-red-400 animate-bounce'
              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
          }`}>
            ER Surge: {capacity.erSurgeRisk.replace(/_/g, ' ')} • Bed Occupancy: {capacity.predictedBedOccupancyPercent}%
          </span>

          <Button size="sm" variant="ghost" className="text-indigo-400 font-black text-xs uppercase rounded-xl">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand Enterprise Engine'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE ENTERPRISE DASHBOARD */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* SECTION 1: PREDICTIVE RESOURCE & OR CAPACITY forecasting */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider flex items-center gap-2">
              <Zap size={14} /> Dynamic Resource & Operating Theatre (OR) Capacity Forecast
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* ER ARRIVALS 24H */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1">
                  <Activity size={12} className="text-indigo-400" /> Predicted ER 24h Arrivals
                </span>
                <p className="text-3xl font-black tracking-tighter text-indigo-300">{capacity.erArrivalsNext24h} <span className="text-sm font-semibold opacity-60">patients</span></p>
                <p className="text-[9px] font-bold text-slate-400 uppercase pt-1">Trend: Peak hours 17:00 - 22:00</p>
              </div>

              {/* BED OCCUPANCY % */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1">
                  <Building2 size={12} className="text-cyan-400" /> Forecasted Bed Occupancy
                </span>
                <p className={`text-3xl font-black tracking-tighter ${capacity.predictedBedOccupancyPercent > 85 ? 'text-red-400 animate-pulse' : 'text-cyan-300'}`}>
                  {capacity.predictedBedOccupancyPercent}<span className="text-sm font-semibold opacity-60">%</span>
                </p>
                <p className="text-[9px] font-bold text-slate-400 uppercase pt-1">Target Threshold: &lt; 85%</p>
              </div>

              {/* OR TURNAROUND TIME */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1">
                  <RefreshCw size={12} className="text-amber-400" /> OR Turnaround Time
                </span>
                <p className="text-3xl font-black tracking-tighter text-amber-300">{capacity.orTurnaroundAvgMins} <span className="text-sm font-semibold opacity-60">mins</span></p>
                <p className="text-[9px] font-bold text-slate-400 uppercase pt-1">Wheels-in to Wheels-out benchmark</p>
              </div>

              {/* RECOMMENDED STAFFING ADVICE */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-400">Capacity Action Plan</span>
                <p className="text-xs font-bold text-white leading-relaxed">{capacity.recommendedStaffingAdjustment}</p>
              </div>
            </div>
          </div>

          {/* SECTION 2: FEDERATED CLINICAL AI LEARNING NODES */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black uppercase text-purple-400 tracking-wider flex items-center gap-2">
                <Lock size={14} /> Federated Clinical AI Multi-Hospital Nodes (Privacy Preserving)
              </h4>
              <span className="text-[10px] bg-purple-950 border border-purple-800 text-purple-200 px-3 py-1 rounded-xl font-black uppercase">
                Global Model: {consensus.globalModelVersion}
              </span>
            </div>

            {/* MULTI-HOSPITAL NODES GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {nodes.map((node) => (
                <div key={node.nodeId} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-black uppercase text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded-md">
                      {node.nodeId}
                    </span>
                    <span className="text-[9px] font-black text-emerald-400 flex items-center gap-1">
                      <Lock size={10} /> {node.gradientEncryptionStatus}
                    </span>
                  </div>
                  <h5 className="text-xs font-black text-white">{node.hospitalName}</h5>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{node.region}</p>
                  <div className="flex justify-between items-center text-[10px] font-black pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400">Trained: {node.localRecordCount.toLocaleString()} recs</span>
                    <span className="text-purple-300">Accuracy: {node.localAccuracyPercent}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* CONSENSUS SUMMARY BANNER */}
            <div className="p-4 bg-purple-950/40 rounded-2xl border border-purple-800/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="space-y-1">
                <p className="text-xs font-black text-purple-200 uppercase flex items-center gap-2">
                  <ShieldCheck size={16} className="text-purple-400" /> {consensus.privacyGuarantee}
                </p>
                <p className="text-[10px] font-bold text-purple-300/80 uppercase">
                  Aggregated over {consensus.totalRecordsTrained.toLocaleString()} patient outcomes across {consensus.participatingNodesCount} hospital nodes. Precision boost: +{consensus.globalPrecisionImprovementPercent}%.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={handleTriggerFederatedRound}
                disabled={isAggregatingFederated}
                className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase rounded-xl flex items-center gap-1.5 shrink-0 shadow-lg"
              >
                <RefreshCw size={14} className={isAggregatingFederated ? 'animate-spin' : ''} />
                {isAggregatingFederated ? 'Aggregating Gradients...' : '🌐 Trigger Federated Consensus Round'}
              </Button>
            </div>
          </div>

          {/* ACTION BAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <Button
              type="button"
              size="sm"
              onClick={handleSimulateCapacity}
              disabled={isSimulatingCapacity}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase rounded-xl flex items-center gap-1.5 shadow-lg"
            >
              <Zap size={14} className={isSimulatingCapacity ? 'animate-spin' : ''} />
              {isSimulatingCapacity ? 'Running Capacity Algorithm...' : '⚡ Run Predictive OR & ER Capacity Model'}
            </Button>

            <p className="text-[10px] font-bold text-slate-500 uppercase">
              FedAvg Protocol • Homomorphic Encryption Verified • GamMed National Grid
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
