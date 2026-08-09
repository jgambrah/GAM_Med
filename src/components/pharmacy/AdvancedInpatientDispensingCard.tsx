'use client';
import { useState, useMemo } from 'react';
import { QrCode, Scan, ShieldCheck, Box, Clock, FlaskConical, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Syringe, Layers, Sparkles } from 'lucide-react';
import {
  verifyBcmaHandheldScan,
  generateCartFillSchedule,
  calculateTpnChemoAdmixture,
  BcmaScanResult,
  UnitDoseCartFill,
  TpnChemoCompoundingResult
} from '@/ai/flows/ai-inpatient-dispensing-engine';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface AdvancedInpatientDispensingCardProps {
  patientName?: string;
  expectedNdc?: string;
  expectedWristband?: string;
  wardName?: string;
  defaultExpanded?: boolean;
}

export function AdvancedInpatientDispensingCard({
  patientName = 'Benjamin Hedidor',
  expectedNdc = 'NDC-0093-0058-01',
  expectedWristband = 'GH-CARD-9921',
  wardName = 'Female Medical Ward 3B',
  defaultExpanded = true
}: AdvancedInpatientDispensingCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // BCMA Scanning State
  const [scannedNdc, setScannedNdc] = useState(expectedNdc);
  const [scannedWristband, setScannedWristband] = useState(expectedWristband);
  const [bcmaResult, setBcmaResult] = useState<BcmaScanResult>(() =>
    verifyBcmaHandheldScan(expectedNdc, expectedNdc, expectedWristband, expectedWristband)
  );

  // Cart-Fill State
  const [cartItems, setCartItems] = useState<UnitDoseCartFill[]>(() =>
    generateCartFillSchedule(wardName, patientName)
  );
  const [cartBatchDispatched, setCartBatchDispatched] = useState(false);

  // TPN & Chemo Compounding State
  const [dextroseGrams, setDextroseGrams] = useState<number>(200);
  const [aminoAcidGrams, setAminoAcidGrams] = useState<number>(50);
  const [lipidGrams, setLipidGrams] = useState<number>(30);
  const [totalVolumeMl, setTotalVolumeMl] = useState<number>(1000);
  const [infusionHours, setInfusionHours] = useState<number>(12);

  const tpnResult = useMemo(
    () => calculateTpnChemoAdmixture(dextroseGrams, aminoAcidGrams, lipidGrams, totalVolumeMl, infusionHours),
    [dextroseGrams, aminoAcidGrams, lipidGrams, totalVolumeMl, infusionHours]
  );

  const handleVerifyBcma = () => {
    const res = verifyBcmaHandheldScan(scannedNdc, expectedNdc, scannedWristband, expectedWristband);
    setBcmaResult(res);

    if (res.isMatch) {
      toast({
        title: '✅ BCMA Scan 5-Rights Verification Passed',
        description: res.validationMessage
      });
    } else {
      toast({
        variant: 'destructive',
        title: '🚨 BCMA Verification Error',
        description: res.validationMessage
      });
    }
  };

  const handleDispatchCartFill = () => {
    setCartBatchDispatched(true);
    setCartItems(prev => prev.map(item => ({ ...item, status: 'DISPATCHED_TO_WARD' })));
    toast({
      title: '📦 Inpatient Cart-Fill Batch Dispatched',
      description: `Dispatched unit-dose cassettes for ${wardName} (Cart #CART-3B-04).`
    });
  };

  return (
    <div className="bg-slate-950 text-white rounded-[32px] border-4 border-rose-600 shadow-2xl overflow-hidden transition-all mb-6">
      {/* COLLAPSIBLE HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="p-5 bg-rose-950/40 hover:bg-rose-900/40 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-rose-900 gap-3 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-900/80 rounded-2xl border border-rose-700 text-rose-300">
            <Scan className="animate-pulse" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-rose-300">Advanced Inpatient & Compounding Dispensing Suite</h3>
              <span className="text-[9px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-full uppercase">
                EPIC WILLOW STANDARD
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              BCMA Barcode Scanning • Inpatient 24h Unit-Dose Cart Fills • Chemotherapy & TPN Compounding Calculator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" className="text-rose-400 font-black text-xs uppercase rounded-xl">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand Suite'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE WORKSPACE */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* SECTION 1: HANDHELD BCMA BARCODE SCANNER VERIFIER */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-rose-400 tracking-wider flex items-center gap-1.5">
                <Scan size={16} /> Bar-Code Medication Administration (BCMA) 5-Rights Scanner:
              </h4>

              <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                bcmaResult.isMatch ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'
              }`}>
                {bcmaResult.isMatch ? '5-RIGHTS VERIFIED' : 'SCAN MISMATCH'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Scan Drug Barcode (NDC / GTIN):</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scannedNdc}
                    onChange={(e) => setScannedNdc(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-rose-300 font-mono font-bold outline-none"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleVerifyBcma}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] uppercase rounded-xl px-3 shrink-0"
                  >
                    Scan
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Scan Patient Wristband (ID / Card):</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scannedWristband}
                    onChange={(e) => setScannedWristband(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-rose-300 font-mono font-bold outline-none"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleVerifyBcma}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] uppercase rounded-xl px-3 shrink-0"
                  >
                    Scan
                  </Button>
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              bcmaResult.isMatch 
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' 
                : 'bg-red-950/60 border-red-800 text-red-200'
            }`}>
              {bcmaResult.isMatch ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />}
              {bcmaResult.validationMessage}
            </div>
          </div>

          {/* SECTION 2: INPATIENT UNIT-DOSE CART-FILL SCHEDULE BOARD */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
                <Box size={16} /> Inpatient 24h Unit-Dose Cart-Fill Schedule ({wardName}):
              </h4>

              <Button
                type="button"
                size="sm"
                disabled={cartBatchDispatched}
                onClick={handleDispatchCartFill}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase rounded-xl h-7 px-3 flex items-center gap-1 shadow-md disabled:opacity-50"
              >
                <Layers size={12} /> {cartBatchDispatched ? '✅ Batch Dispatched' : '📦 Finalize Cart Fill Batch'}
              </Button>
            </div>

            <div className="space-y-2">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
                >
                  <div className="flex items-center gap-3">
                    <Box size={16} className="text-indigo-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{item.drugName} (Qty: {item.unitDoseQty})</span>
                        <span className="text-[8px] font-black bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full uppercase">
                          {item.fillCycle.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                        Ward: {item.wardName} • {item.bedNumber} • Cassette Bin: {item.binNumber}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                    item.status === 'DISPATCHED_TO_WARD' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                    item.status === 'FILLED' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                    'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {item.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: CHEMOTHERAPY & TPN COMPOUNDING SUITE */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-rose-400 tracking-wider flex items-center gap-1.5">
                <FlaskConical size={16} /> Total Parenteral Nutrition (TPN) & Oncology Compounding Suite:
              </h4>

              <span className="text-[10px] font-black bg-rose-950 text-rose-300 border border-rose-800 px-3 py-1 rounded-full uppercase">
                Aseptic BUD: 36 Hours
              </span>
            </div>

            {/* FORM INPUTS */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Dextrose (g):</label>
                <input
                  type="number"
                  value={dextroseGrams}
                  onChange={(e) => setDextroseGrams(Number(e.target.value))}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-rose-300 font-bold outline-none text-center"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Amino Acids (g):</label>
                <input
                  type="number"
                  value={aminoAcidGrams}
                  onChange={(e) => setAminoAcidGrams(Number(e.target.value))}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-rose-300 font-bold outline-none text-center"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Lipids (g):</label>
                <input
                  type="number"
                  value={lipidGrams}
                  onChange={(e) => setLipidGrams(Number(e.target.value))}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-rose-300 font-bold outline-none text-center"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Total Volume (mL):</label>
                <input
                  type="number"
                  value={totalVolumeMl}
                  onChange={(e) => setTotalVolumeMl(Number(e.target.value))}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-rose-300 font-bold outline-none text-center"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Infusion Hours:</label>
                <input
                  type="number"
                  value={infusionHours}
                  onChange={(e) => setInfusionHours(Number(e.target.value))}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-rose-300 font-bold outline-none text-center"
                />
              </div>
            </div>

            {/* RESULTS */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-black">
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[8px] text-slate-400 block uppercase">OSMOLALITY</span>
                  <span className="text-rose-300 text-sm font-extrabold">{tpnResult.osmolalityMOsmKg} mOsm/kg</span>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[8px] text-slate-400 block uppercase">CALORIC DENSITY</span>
                  <span className="text-emerald-300 text-sm font-extrabold">{tpnResult.caloricDensityKcalML} kcal/mL</span>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[8px] text-slate-400 block uppercase">INFUSION RATE</span>
                  <span className="text-amber-300 text-sm font-extrabold">{tpnResult.infusionRateMLHr} mL/hr</span>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[8px] text-slate-400 block uppercase">REQUIRED ACCESS</span>
                  <span className={tpnResult.routeRecommendation === 'CENTRAL_VENOUS_LINE' ? 'text-red-400 font-extrabold' : 'text-emerald-400 font-extrabold'}>
                    {tpnResult.routeRecommendation.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {tpnResult.safetyWarning && (
                <div className="p-3 bg-red-950/90 border border-red-600 rounded-xl text-red-200 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-400 shrink-0" />
                  {tpnResult.safetyWarning}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
