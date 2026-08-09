'use client';
import { useState, useMemo } from 'react';
import { TrendingUp, Activity, Sparkles, AlertTriangle, ShieldCheck, Plus, Trash2, ChevronDown, ChevronUp, Baby, Scale, Heart, LineChart } from 'lucide-react';
import {
  getWHOACOGPercentileCurves,
  evaluateGrowthRisk,
  getSampleBiomarkerTrends,
  GrowthPoint,
  BiomarkerTrendPoint
} from '@/ai/flows/ai-growth-trend-engine';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface GrowthAndBiomarkerTrendsCardProps {
  patientName?: string;
  isMaternity?: boolean;
  isPediatric?: boolean;
  defaultExpanded?: boolean;
}

export function GrowthAndBiomarkerTrendsCard({
  patientName = 'Patient',
  isMaternity = true,
  isPediatric = false,
  defaultExpanded = true
}: GrowthAndBiomarkerTrendsCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Active metrics
  const [selectedGrowthMetric, setSelectedGrowthMetric] = useState<'FUNDAL_HEIGHT' | 'ESTIMATED_FETAL_WEIGHT' | 'CHILD_WEIGHT'>('FUNDAL_HEIGHT');
  const [selectedBiomarkerMetric, setSelectedBiomarkerMetric] = useState<'HEMOGLOBIN' | 'HBA1C' | 'PLATELETS' | 'BLOOD_PRESSURE'>('HEMOGLOBIN');

  // Input state for adding custom data point
  const [inputAxisValue, setInputAxisValue] = useState<number>(32);
  const [inputMeasuredValue, setInputMeasuredValue] = useState<number>(31);

  // Patient plotted growth points
  const [patientGrowthPoints, setPatientGrowthPoints] = useState<{ axis: number; value: number }[]>([
    { axis: 20, value: 20 },
    { axis: 24, value: 24 },
    { axis: 28, value: 27 },
    { axis: 32, value: 31 },
  ]);

  const curveData = useMemo(() => getWHOACOGPercentileCurves(selectedGrowthMetric), [selectedGrowthMetric]);
  const biomarkerData = useMemo(() => getSampleBiomarkerTrends(selectedBiomarkerMetric), [selectedBiomarkerMetric]);

  // Latest growth risk evaluation
  const latestPatientPoint = patientGrowthPoints[patientGrowthPoints.length - 1];
  const growthRisk = useMemo(() => {
    if (!latestPatientPoint) return null;
    return evaluateGrowthRisk(latestPatientPoint.value, latestPatientPoint.axis, selectedGrowthMetric);
  }, [latestPatientPoint, selectedGrowthMetric]);

  const handleAddDataPoint = () => {
    if (!inputAxisValue || !inputMeasuredValue) return;

    setPatientGrowthPoints(prev => [...prev, { axis: Number(inputAxisValue), value: Number(inputMeasuredValue) }]);

    const risk = evaluateGrowthRisk(Number(inputMeasuredValue), Number(inputAxisValue), selectedGrowthMetric);

    toast({
      title: '📈 Data Point Plotted on WHO/ACOG Curve',
      description: risk.message
    });
  };

  return (
    <div className="bg-slate-950 text-white rounded-[32px] border-4 border-pink-600 shadow-2xl overflow-hidden transition-all mb-6">
      {/* COLLAPSIBLE HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="p-5 bg-pink-950/40 hover:bg-pink-900/40 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-pink-900 gap-3 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-pink-900/80 rounded-2xl border border-pink-700 text-pink-300">
            <LineChart className="animate-pulse" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-pink-300">Diagnostic & Trend Visualizers Engine</h3>
              <span className="text-[9px] font-black bg-pink-600 text-white px-2 py-0.5 rounded-full uppercase">
                WHO / ACOG PERCENTILES ACTIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              Interactive Fetal & Pediatric Growth Curves (P10, P50, P90) • Longitudinal Biomarker Trajectory Grapher
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" className="text-pink-400 font-black text-xs uppercase rounded-xl">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand Visualizer'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE VISUALIZER WORKSPACE */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* SECTION 1: WHO/ACOG FETAL & PEDIATRIC GROWTH CURVE CANVAS */}
          <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
              <h4 className="text-xs font-black uppercase text-pink-400 tracking-wider flex items-center gap-1.5">
                <Baby size={16} /> Interactive WHO / ACOG Growth Curves:
              </h4>

              {/* GROWTH METRIC SELECTOR BUTTONS */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={selectedGrowthMetric === 'FUNDAL_HEIGHT' ? 'default' : 'outline'}
                  onClick={() => setSelectedGrowthMetric('FUNDAL_HEIGHT')}
                  className={`text-[10px] font-black uppercase rounded-xl h-7 px-3 ${
                    selectedGrowthMetric === 'FUNDAL_HEIGHT' ? 'bg-pink-600 text-white' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Fundal Height (cm)
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={selectedGrowthMetric === 'ESTIMATED_FETAL_WEIGHT' ? 'default' : 'outline'}
                  onClick={() => setSelectedGrowthMetric('ESTIMATED_FETAL_WEIGHT')}
                  className={`text-[10px] font-black uppercase rounded-xl h-7 px-3 ${
                    selectedGrowthMetric === 'ESTIMATED_FETAL_WEIGHT' ? 'bg-pink-600 text-white' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Estimated Fetal Weight (g)
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={selectedGrowthMetric === 'CHILD_WEIGHT' ? 'default' : 'outline'}
                  onClick={() => setSelectedGrowthMetric('CHILD_WEIGHT')}
                  className={`text-[10px] font-black uppercase rounded-xl h-7 px-3 ${
                    selectedGrowthMetric === 'CHILD_WEIGHT' ? 'bg-pink-600 text-white' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Pediatric Weight (kg)
                </Button>
              </div>
            </div>

            {/* RISK EVALUATION BANNER */}
            {growthRisk && (
              <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                growthRisk.riskLevel === 'IUGR_RISK' ? 'bg-red-950/80 border-red-600 text-red-200 animate-pulse' :
                growthRisk.riskLevel === 'MACROSOMIA_RISK' ? 'bg-amber-950/80 border-amber-600 text-amber-200' :
                'bg-emerald-950/60 border-emerald-700 text-emerald-300'
              }`}>
                <Activity size={16} className="shrink-0" />
                <p className="text-xs font-bold">{growthRisk.message}</p>
              </div>
            )}

            {/* INTERACTIVE SVG GROWTH CHART OVERLAY */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                <span>WHO/ACOG Percentile Graph ({selectedGrowthMetric.replace(/_/g, ' ')})</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> 90th Percentile</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> 50th Median</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> 10th Percentile</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block animate-ping"></span> Patient Data Point</span>
                </div>
              </div>

              {/* DYNAMIC SVG CHART CANVAS */}
              <div className="h-56 w-full relative flex items-end justify-between px-6 pt-6 pb-8 bg-slate-900/60 rounded-xl border border-slate-800">
                {curveData.map((pt, idx) => {
                  const maxVal = curveData[curveData.length - 1].p90 * 1.1;
                  const hP90 = (pt.p90 / maxVal) * 100;
                  const hP50 = (pt.p50 / maxVal) * 100;
                  const hP10 = (pt.p10 / maxVal) * 100;

                  const patientPt = patientGrowthPoints.find(p => p.axis === pt.timeAxis);
                  const hPatient = patientPt ? (patientPt.value / maxVal) * 100 : null;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                      {/* P90 DASHED MARKER */}
                      <div style={{ height: `${hP90}%` }} className="absolute bottom-6 w-full border-t-2 border-dashed border-amber-400/60"></div>
                      
                      {/* P50 MEDIAN SOLID LINE */}
                      <div style={{ height: `${hP50}%` }} className="absolute bottom-6 w-full border-t-2 border-emerald-400"></div>

                      {/* P10 DASHED MARKER */}
                      <div style={{ height: `${hP10}%` }} className="absolute bottom-6 w-full border-t-2 border-dashed border-amber-400/60"></div>

                      {/* PATIENT PLOTTED DOT */}
                      {hPatient !== null && (
                        <div
                          style={{ bottom: `calc(${hPatient}% + 1.25rem)` }}
                          className="absolute z-10 w-4 h-4 bg-pink-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:scale-125 transition-transform"
                          title={`Week ${pt.timeAxis}: ${patientPt?.value}`}
                        >
                          <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                        </div>
                      )}

                      {/* X-AXIS LABELS */}
                      <span className="absolute -bottom-1 text-[9px] font-black uppercase text-slate-400">{pt.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* INPUT BAR FOR PLOTTING NEW DATA POINT */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="text-[10px] font-black uppercase text-pink-400">Plot New Data Point:</span>
                <input
                  type="number"
                  value={inputAxisValue}
                  onChange={(e) => setInputAxisValue(Number(e.target.value))}
                  placeholder="Week / Month"
                  className="w-28 p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none font-bold"
                />
                <input
                  type="number"
                  value={inputMeasuredValue}
                  onChange={(e) => setInputMeasuredValue(Number(e.target.value))}
                  placeholder="Value (cm/g/kg)"
                  className="w-32 p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none font-bold"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddDataPoint}
                  className="bg-pink-600 hover:bg-pink-500 text-white font-black text-xs uppercase rounded-xl h-9 px-4 flex items-center gap-1 shadow-lg"
                >
                  <Plus size={14} /> Plot on Curve
                </Button>
              </div>
            </div>
          </div>

          {/* SECTION 2: LONGITUDINAL BIOMARKER TREND GRAPHER */}
          <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
              <h4 className="text-xs font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                <TrendingUp size={16} /> Longitudinal Biomarker Trajectory Grapher:
              </h4>

              {/* BIOMARKER METRIC SELECTOR BUTTONS */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={selectedBiomarkerMetric === 'HEMOGLOBIN' ? 'default' : 'outline'}
                  onClick={() => setSelectedBiomarkerMetric('HEMOGLOBIN')}
                  className={`text-[10px] font-black uppercase rounded-xl h-7 px-3 ${
                    selectedBiomarkerMetric === 'HEMOGLOBIN' ? 'bg-cyan-600 text-white' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Hemoglobin (Hb)
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={selectedBiomarkerMetric === 'HBA1C' ? 'default' : 'outline'}
                  onClick={() => setSelectedBiomarkerMetric('HBA1C')}
                  className={`text-[10px] font-black uppercase rounded-xl h-7 px-3 ${
                    selectedBiomarkerMetric === 'HBA1C' ? 'bg-cyan-600 text-white' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  HbA1c (%)
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={selectedBiomarkerMetric === 'PLATELETS' ? 'default' : 'outline'}
                  onClick={() => setSelectedBiomarkerMetric('PLATELETS')}
                  className={`text-[10px] font-black uppercase rounded-xl h-7 px-3 ${
                    selectedBiomarkerMetric === 'PLATELETS' ? 'bg-cyan-600 text-white' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Platelet Count
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={selectedBiomarkerMetric === 'BLOOD_PRESSURE' ? 'default' : 'outline'}
                  onClick={() => setSelectedBiomarkerMetric('BLOOD_PRESSURE')}
                  className={`text-[10px] font-black uppercase rounded-xl h-7 px-3 ${
                    selectedBiomarkerMetric === 'BLOOD_PRESSURE' ? 'bg-cyan-600 text-white' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Systolic BP
                </Button>
              </div>
            </div>

            {/* TRAJECTORY LIST STREAM */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {biomarkerData.map((point) => (
                <div key={point.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400">{point.dateFormatted}</span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                      point.status === 'CRITICAL' ? 'bg-red-600 text-white animate-pulse' :
                      point.status === 'HIGH' || point.status === 'LOW' ? 'bg-amber-600 text-white' :
                      'bg-emerald-600 text-white'
                    }`}>
                      {point.status}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-white">{point.value}</span>
                    <span className="text-xs font-bold text-slate-400">{point.unit}</span>
                    <span className="text-[9px] text-slate-500 font-medium ml-auto">Ref: {point.refMin}-{point.refMax}</span>
                  </div>

                  {point.note && (
                    <p className="text-[10px] text-cyan-300 font-medium italic border-t border-slate-800/80 pt-1">
                      "{point.note}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
