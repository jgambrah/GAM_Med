'use client';
import { useState, useMemo } from 'react';
import { Calendar, Languages, Smartphone, Truck, CheckCircle2, ChevronDown, ChevronUp, Printer, Send, Globe, Sparkles, Clock, MapPin } from 'lucide-react';
import {
  calculateMedSyncAlignment,
  generateConvenienceLabel,
  updateDigitalOrderTracking,
  MedSyncProfile,
  DigitalOrderTracking,
  ConvenienceLabel
} from '@/ai/flows/ai-med-sync-convenience-engine';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface MedSyncAndOutpatientConvenienceCardProps {
  patientName?: string;
  patientPhone?: string;
  drugName?: string;
  defaultExpanded?: boolean;
}

export function MedSyncAndOutpatientConvenienceCard({
  patientName = 'Benjamin Hedidor',
  patientPhone = '+233 24 123 4567',
  drugName = 'Amoxicillin 500mg',
  defaultExpanded = true
}: MedSyncAndOutpatientConvenienceCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Med Sync State
  const [pickupDay, setPickupDay] = useState<number>(15);
  const [medSyncProfile, setMedSyncProfile] = useState<MedSyncProfile>(() =>
    calculateMedSyncAlignment(15, ['Amlodipine 10mg', 'Metformin 850mg', 'Lisinopril 20mg'], patientName)
  );

  // Multilingual Label State
  const [selectedLanguage, setSelectedLanguage] = useState<'ENGLISH' | 'ASANTE_TWI' | 'EWE' | 'GA'>('ENGLISH');
  const labelPayload = useMemo(
    () => generateConvenienceLabel('RX-9921', patientName, drugName, selectedLanguage),
    [patientName, drugName, selectedLanguage]
  );

  // Digital Order Tracking State
  const [trackingStage, setTrackingStage] = useState<DigitalOrderTracking['currentStage']>('READY_FOR_PICKUP');
  const trackingData = useMemo(
    () => updateDigitalOrderTracking('TRACK-8891', trackingStage, patientPhone),
    [trackingStage, patientPhone]
  );

  const handleSynchronizeMeds = () => {
    const updated = calculateMedSyncAlignment(pickupDay, ['Amlodipine 10mg', 'Metformin 850mg', 'Lisinopril 20mg'], patientName);
    setMedSyncProfile(updated);
    toast({
      title: '📅 Refills Synchronized (Med Sync Active)',
      description: `All monthly refills aligned to the ${pickupDay}th of every month for ${patientName}.`
    });
  };

  const handleDispatchTrackingSms = () => {
    toast({
      title: '📱 Order Status SMS Dispatched',
      description: `Sent "${trackingData.statusMessage}" to ${patientPhone}.`
    });
  };

  return (
    <div className="bg-slate-950 text-white rounded-[32px] border-4 border-emerald-600 shadow-2xl overflow-hidden transition-all mb-6">
      {/* COLLAPSIBLE HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="p-5 bg-emerald-950/40 hover:bg-emerald-900/40 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-emerald-900 gap-3 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-900/80 rounded-2xl border border-emerald-700 text-emerald-300">
            <Calendar className="animate-pulse" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-emerald-300">Medication Synchronization & Outpatient Convenience</h3>
              <span className="text-[9px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase">
                MED SYNC ACTIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              Consolidated Monthly Pickup Alignment • Multilingual Label Generator • Live Digital Order Tracking & SMS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" className="text-emerald-400 font-black text-xs uppercase rounded-xl">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand Convenience'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE WORKSPACE */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* SECTION 1: MEDICATION SYNCHRONIZATION (MED SYNC) BOARD */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                <Calendar size={16} /> Medication Synchronization (Med Sync) Monthly Alignment:
              </h4>

              <span className="text-[9px] font-black bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-full uppercase">
                Adherence Score: {medSyncProfile.adherenceScorePercent}%
              </span>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h5 className="text-xs font-black text-white">Consolidated Monthly Pickup Day</h5>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  Synchronized Chronic Meds: {medSyncProfile.synchronizedMedsList.join(', ')}
                </p>
                <p className="text-[11px] text-emerald-300 font-extrabold mt-1">
                  Next Consolidated Date: {medSyncProfile.nextConsolidatedPickupDate}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={pickupDay}
                  onChange={(e) => setPickupDay(Number(e.target.value))}
                  className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-emerald-300 font-bold outline-none"
                >
                  <option value={1}>1st of Month</option>
                  <option value={10}>10th of Month</option>
                  <option value={15}>15th of Month</option>
                  <option value={25}>25th of Month</option>
                </select>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleSynchronizeMeds}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase rounded-xl h-8 px-3 flex items-center gap-1 shadow-md"
                >
                  <Calendar size={12} /> Align Pickup Date
                </Button>
              </div>
            </div>
          </div>

          {/* SECTION 2: MULTILINGUAL LABEL GENERATOR WITH VISUAL DOSAGE ICONS */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                <Languages size={16} /> Multilingual Label Generator with Dosage Icons:
              </h4>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'ENGLISH', label: '🇬🇧 English' },
                  { id: 'ASANTE_TWI', label: '🇬🇭 Asante Twi' },
                  { id: 'EWE', label: '🇬🇭 Ewe' },
                  { id: 'GA', label: '🇬🇭 Ga' }
                ].map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setSelectedLanguage(lang.id as any)}
                    className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-xl transition-all ${
                      selectedLanguage === lang.id
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-white text-slate-900 rounded-2xl border-4 border-slate-300 space-y-2">
              <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                <span className="text-xs font-black uppercase text-cyan-900">Rx #: {labelPayload.rxNumber}</span>
                <span className="text-[10px] font-bold text-slate-600">Patient: {labelPayload.patientName}</span>
              </div>
              <h6 className="text-sm font-black uppercase text-slate-900">{labelPayload.drugName}</h6>
              <p className="text-xs font-bold text-slate-800 bg-cyan-50 p-2.5 rounded-xl border border-cyan-200">
                {labelPayload.dosageText}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[9px] font-black uppercase text-slate-500">Dosage Schedule:</span>
                {labelPayload.visualIcons.map((icon, idx) => (
                  <span key={idx} className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300">
                    {icon}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 3: DIGITAL ORDER TRACKING & SMS DISPATCHER */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Truck size={16} /> Digital Order Progress & SMS Tracker:
              </h4>

              <Button
                type="button"
                size="sm"
                onClick={handleDispatchTrackingSms}
                className="bg-amber-600 hover:bg-amber-500 text-white font-black text-[10px] uppercase rounded-xl h-7 px-3 flex items-center gap-1 shadow-md"
              >
                <Send size={12} /> Dispatch Status SMS
              </Button>
            </div>

            {/* PROGRESS STAGES */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['FILLED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED'] as const).map((stage) => {
                const isActive = trackingStage === stage;
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setTrackingStage(stage)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      isActive
                        ? 'bg-amber-600 text-white border-amber-400 font-black shadow-lg ring-2 ring-amber-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 font-bold hover:text-white'
                    }`}
                  >
                    <span className="text-[9px] uppercase block">{stage.replace(/_/g, ' ')}</span>
                  </button>
                );
              })}
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-medium text-slate-300">
              <p className="font-bold text-amber-300">SMS Notification Payload ({patientPhone}):</p>
              <p className="font-mono text-[10px] text-slate-400 mt-0.5">"{trackingData.statusMessage}"</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
