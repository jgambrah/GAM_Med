'use client';
import { useState, useMemo } from 'react';
import { Thermometer, ShieldAlert, Navigation, Lock, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Radio, RefreshCcw, Key, Sparkles } from 'lucide-react';
import {
  evaluateIotColdChainSensor,
  generateFefoPickRoute,
  logMilligramNarcoticDispense,
  IotFridgeTelemetry,
  FefoPickRoute,
  MilligramNarcoticLog
} from '@/ai/flows/ai-cold-chain-logistics-engine';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface ColdChainAndLogisticsCardProps {
  drugName?: string;
  primaryPharmacistName?: string;
  defaultExpanded?: boolean;
}

export function ColdChainAndLogisticsCard({
  drugName = 'Amoxicillin 500mg',
  primaryPharmacistName = 'Pharmacist',
  defaultExpanded = true
}: ColdChainAndLogisticsCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // IoT Cold-Chain Sensor State
  const [currentTemp, setCurrentTemp] = useState<number>(4.2);
  const iotTelemetry = useMemo(
    () => evaluateIotColdChainSensor(currentTemp, 2.0, 8.0, 'Main Vaccine & Biologicals Fridge #1'),
    [currentTemp]
  );

  // FEFO Pick Route State
  const pickRoutes = useMemo(() => generateFefoPickRoute(drugName, 30), [drugName]);

  // Milligram Narcotic Audit Log State
  const [narcoticBalanceMg, setNarcoticBalanceMg] = useState<number>(450);
  const [dispensedMg, setDispensedMg] = useState<number>(10);
  const [wastedMg, setWastedMg] = useState<number>(2);
  const [witnessName, setWitnessName] = useState<string>('Dr. Ama Serwah');
  const [narcoticLogs, setNarcoticLogs] = useState<MilligramNarcoticLog[]>([]);
  const [isNarcoticModalOpen, setIsNarcoticModalOpen] = useState(false);

  const handleSimulateTempDrift = (temp: number) => {
    setCurrentTemp(temp);
    toast({
      title: `🌡️ IoT Temperature Sensor Ping: ${temp}°C`,
      description: temp > 8.0 || temp < 2.0 ? '🚨 Cold-Chain Excursion Triggered!' : '✅ Temperature Optimal.'
    });
  };

  const handleRecordMilligramNarcotic = () => {
    const log = logMilligramNarcoticDispense(
      'Morphine Sulfate 10mg/mL IV',
      dispensedMg,
      wastedMg,
      narcoticBalanceMg,
      primaryPharmacistName,
      witnessName
    );

    setNarcoticBalanceMg(log.newBalanceMg);
    setNarcoticLogs(prev => [log, ...prev]);
    setIsNarcoticModalOpen(false);

    toast({
      title: '✅ Milligram Narcotic Audit Recorded',
      description: `Dispensed ${dispensedMg}mg (Wasted ${wastedMg}mg). New Perpetual Balance: ${log.newBalanceMg}mg.`
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
              <h3 className="text-sm font-black uppercase tracking-wider text-cyan-300">Intelligent Stock & Cold-Chain Logistics Hub</h3>
              <span className="text-[9px] font-black bg-cyan-600 text-white px-2 py-0.5 rounded-full uppercase">
                IoT TELEMETRY ACTIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              IoT Vaccine Fridge Sensor (2°C-8°C) • FEFO Batch Pick Route Map • Milligram Narcotic Perpetual Audit Vault
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" className="text-cyan-400 font-black text-xs uppercase rounded-xl">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand Logistics'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE WORKSPACE */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* SECTION 1: IoT COLD-CHAIN VACCINE FRIDGE TELEMETRY */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                <Radio size={16} className="text-cyan-400 animate-pulse" /> Live IoT Cold-Chain Sensor Stream (Vaccines & Insulin):
              </h4>

              {/* SIMULATION BUTTONS */}
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-slate-400 font-bold uppercase">Simulate Temp:</span>
                <button
                  type="button"
                  onClick={() => handleSimulateTempDrift(4.2)}
                  className="text-[9px] font-black bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-md hover:bg-emerald-900"
                >
                  4.2°C (Optimal)
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateTempDrift(11.5)}
                  className="text-[9px] font-black bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded-md hover:bg-red-900"
                >
                  11.5°C (Excursion)
                </button>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
              iotTelemetry.status === 'SAFE_OPTIMAL'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-red-950/80 border-red-600 text-red-200'
            }`}>
              <div className="flex items-center gap-3">
                <Thermometer size={24} className={iotTelemetry.status === 'SAFE_OPTIMAL' ? 'text-emerald-400' : 'text-red-400 animate-bounce'} />
                <div>
                  <h5 className="text-xs font-black uppercase">{iotTelemetry.fridgeName}</h5>
                  <p className="text-[10px] font-bold mt-0.5">{iotTelemetry.safetyMessage}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-lg font-black tracking-wider block">{iotTelemetry.temperatureCelsius}°C</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase">Target: 2°C - 8°C</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: FEFO AUTOMATED BATCH PICK ROUTE MAP */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
              <Navigation size={16} /> FEFO Automated Batch Pick Route Map:
            </h4>

            <div className="space-y-2">
              {pickRoutes.map((route, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 ${
                    route.pickPriorityRank === 1
                      ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/30'
                      : 'bg-slate-950 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-900 rounded-lg text-indigo-300 font-black text-xs">
                      #{route.pickPriorityRank}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">Batch #{route.batchNumber} ({route.daysUntilExpiry} days left)</span>
                        {route.pickPriorityRank === 1 && (
                          <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">
                            RECOMMENDED PICK
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                        Location: {route.shelfLocation} • {route.binNumber} • {route.recommendationNote}
                      </p>
                    </div>
                  </div>

                  {route.quantityToPick > 0 && (
                    <span className="text-xs font-black text-amber-300 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                      Pick {route.quantityToPick} Units
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: MILLIGRAM NARCOTIC AUDIT TRAIL & PERPETUAL VAULT */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                <Lock size={16} /> Restricted Narcotic Milligram Audit Vault:
              </h4>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black bg-purple-950 text-purple-300 border border-purple-800 px-3 py-1 rounded-full uppercase">
                  Perpetual Balance: {narcoticBalanceMg} mg
                </span>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsNarcoticModalOpen(true)}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase rounded-xl h-7 px-3 flex items-center gap-1 shadow-md"
                >
                  <Key size={12} /> Log Milligram Dispense
                </Button>
              </div>
            </div>

            {/* LOGS LIST */}
            {narcoticLogs.length > 0 ? (
              <div className="space-y-2">
                {narcoticLogs.map((log) => (
                  <div key={log.logId} className="p-3 bg-purple-950/40 border border-purple-800 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center font-black text-purple-300">
                      <span>{log.narcoticName} (Dispensed: {log.dispensedMg}mg, Wasted: {log.wastedMg}mg)</span>
                      <span className="text-[9px] font-mono bg-purple-900 text-white px-2 py-0.5 rounded-sm">{log.logId}</span>
                    </div>
                    <p className="text-slate-300 text-[10px]">
                      Primary: {log.primaryPharmacist} • Witness: {log.witnessPharmacist} • Time: {log.timestamp}
                    </p>
                    <p className="text-[10px] font-mono text-purple-200">
                      Balance: {log.previousBalanceMg}mg ➔ {log.newBalanceMg}mg
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-medium">
                Biometric perpetual inventory balance log active. Tracks restricted narcotics down to the exact milligram.
              </p>
            )}
          </div>
        </div>
      )}

      {/* MILLIGRAM NARCOTIC LOG MODAL */}
      <Dialog open={isNarcoticModalOpen} onOpenChange={setIsNarcoticModalOpen}>
        <DialogContent className="bg-slate-950 text-white border-2 border-purple-600 rounded-[32px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase text-purple-300 flex items-center gap-2">
              <Lock size={18} /> Milligram Narcotic Audit & Waste Log
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-medium">
              Record exact milligram dispense and wasted fractions with mandatory 2nd witness pharmacist signature.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Dispensed Dose (mg):</label>
                <input
                  type="number"
                  value={dispensedMg}
                  onChange={(e) => setDispensedMg(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-purple-300 font-bold outline-none text-center"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Wasted / Discarded (mg):</label>
                <input
                  type="number"
                  value={wastedMg}
                  onChange={(e) => setWastedMg(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-purple-300 font-bold outline-none text-center"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Witness Pharmacist Name / UID:</label>
              <input
                type="text"
                value={witnessName}
                onChange={(e) => setWitnessName(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-purple-500 font-bold"
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
              onClick={handleRecordMilligramNarcotic}
              className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase rounded-xl px-4"
            >
              ✍️ Sign & Update Balance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
