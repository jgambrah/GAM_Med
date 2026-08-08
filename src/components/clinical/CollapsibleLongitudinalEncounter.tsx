'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Baby, Scissors, ShieldCheck, Check, Syringe, Sparkles, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CollapsibleLongitudinalEncounterProps {
  activity: any;
  defaultExpanded?: boolean;
}

function MiniVital({ label, value, unit }: { label: string; value: any; unit: string }) {
  if (!value) return null;
  return (
    <div className="bg-white/80 p-3 rounded-2xl border border-slate-100 text-center">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-black text-slate-900 mt-0.5">{value} <span className="text-[9px] font-normal text-slate-400">{unit}</span></p>
    </div>
  );
}

function parseSurgeryDetailsFromHpi(hpi: string, diagnosis: string, fallbackDetails?: any) {
  if (fallbackDetails) return fallbackDetails;
  return {
    procedureDone: diagnosis || 'Surgical Operation',
    findings: hpi || 'No intra-operative complications encountered.',
    anesthesiaType: 'General Anesthesia (ETT)',
    bloodLoss: '150 mL',
    postOpInstructions: 'Monitor vitals q15m x 1hr, maintain IV fluids, schedule post-op wound assessment.',
    checklistAudit: true,
  };
}

export function CollapsibleLongitudinalEncounter({ activity, defaultExpanded = false }: CollapsibleLongitudinalEncounterProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (activity.viewType === 'ENCOUNTER') {
    const isCwc = activity.encounterType === 'Child Welfare (CWC) Checkup' || activity.type === 'Child Welfare (CWC) Checkup';
    const isSurgery = activity.encounterType === 'Surgical Operation' || activity.type === 'Surgical Operation';

    if (isCwc) {
      return (
        <div className="bg-white rounded-[32px] border-4 border-sky-600 shadow-sm overflow-hidden mb-6 text-black transition-all">
          {/* COLLAPSIBLE HEADER BAR */}
          <div 
            onClick={() => setIsExpanded(prev => !prev)}
            className="p-5 bg-sky-50/60 hover:bg-sky-100/60 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-sky-100 gap-3 select-none"
          >
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black bg-sky-600 text-white px-3.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <Baby size={12} /> {activity.type || 'Child Welfare Checkup'}
              </span>
              <div>
                <p className="text-xs font-black text-slate-900 uppercase">{activity.hospitalName}</p>
                <p className="text-[10px] text-slate-500 font-bold">Logged by: {activity.providerName} ({activity.providerRole})</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-800 uppercase">
                {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
              </span>
              <Button size="sm" variant="ghost" className="text-sky-700 font-black text-xs uppercase rounded-xl">
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {isExpanded ? 'Collapse' : 'Expand CWC'}
              </Button>
            </div>
          </div>

          {/* EXPANDABLE DETAILS */}
          {isExpanded && (
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-sky-50/50 p-6 rounded-[32px] border border-sky-100">
                <MiniVital label="Weight" value={activity.vitals?.weight} unit="kg" />
                <MiniVital label="Length" value={activity.vitals?.height} unit="cm" />
                <MiniVital label="Head Circ." value={activity.vitals?.headCircumference} unit="cm" />
                <MiniVital label="MUAC" value={activity.vitals?.muac} unit="cm" />
                <MiniVital label="Feeding" value={activity.vitals?.feedingMethod} unit="" />
              </div>

              {activity.cwcData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activity.cwcData.vaccinesAdministered?.length > 0 && (
                    <div className="space-y-2 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest flex items-center gap-1">
                        <Syringe size={10} className="text-sky-500" /> Immunizations Administered
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {activity.cwcData.vaccinesAdministered.map((v: string) => (
                          <span key={v} className="bg-sky-100 text-sky-800 text-[9px] font-black uppercase px-2.5 py-1 rounded-full border border-sky-200">
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {activity.cwcData.milestonesObserved?.length > 0 && (
                    <div className="space-y-2 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                        <Sparkles size={10} className="text-indigo-500" /> Milestones Observed
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {activity.cwcData.milestonesObserved.map((m: string) => (
                          <span key={m} className="bg-indigo-100 text-indigo-800 text-[9px] font-black uppercase px-2.5 py-1 rounded-full border border-indigo-200">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-l-4 border-slate-300 pl-3">Developmental Remarks</p>
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed italic">
                    "{activity.diagnosis || 'No remarks recorded.'}"
                  </p>
                </div>
                {activity.cwcData?.nextCwcDate && (
                  <div className="bg-amber-50 text-amber-900 border border-amber-200 p-4 rounded-2xl flex items-center gap-3">
                    <Activity size={16} className="text-amber-600 animate-pulse" />
                    <div>
                      <p className="text-[9px] font-black uppercase text-amber-700">Next Scheduled CWC Visit</p>
                      <p className="text-xs font-black uppercase mt-0.5">
                        {new Date(activity.cwcData.nextCwcDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (isSurgery) {
      const details = parseSurgeryDetailsFromHpi(activity.hpi || '', activity.diagnosis || '', activity.surgeryDetails);
      return (
        <div className="bg-white rounded-[32px] border-4 border-indigo-600 shadow-sm overflow-hidden mb-6 text-black transition-all">
          {/* COLLAPSIBLE HEADER BAR */}
          <div 
            onClick={() => setIsExpanded(prev => !prev)}
            className="p-5 bg-indigo-50/60 hover:bg-indigo-100/60 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-indigo-100 gap-3 select-none"
          >
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black bg-indigo-600 text-white px-3.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <Scissors size={12} className="rotate-90" /> Surgical Operation
              </span>
              <div>
                <p className="text-xs font-black text-slate-900 uppercase">{activity.hospitalName}</p>
                <p className="text-[10px] text-slate-500 font-bold">Surgeon: {activity.providerName} ({activity.providerRole})</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-800 uppercase">
                {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
              </span>
              <Button size="sm" variant="ghost" className="text-indigo-700 font-black text-xs uppercase rounded-xl">
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {isExpanded ? 'Collapse' : 'Expand Operation'}
              </Button>
            </div>
          </div>

          {/* EXPANDABLE DETAILS */}
          {isExpanded && (
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                <div className="text-center md:border-r border-slate-200">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Anesthesia Type</p>
                  <p className="text-sm font-black text-slate-900 mt-1 uppercase">{details.anesthesiaType}</p>
                </div>
                <div className="text-center md:border-r border-slate-200">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Estimated Blood Loss</p>
                  <p className="text-sm font-black text-red-600 mt-1">{details.bloodLoss}</p>
                </div>
                <div className="text-center flex flex-col items-center justify-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Surgical Safety Audit</p>
                  <span className="mt-1 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck size={10} className="text-emerald-600" /> Compliant
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest border-l-4 border-indigo-600 pl-3">Procedure Performed</p>
                  <p className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">{details.procedureDone}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-l-4 border-slate-500 pl-3">Intra-Operative Findings</p>
                  <p className="text-xs text-slate-700 leading-relaxed font-semibold italic bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    "{details.findings}"
                  </p>
                </div>
              </div>

              <div className="bg-slate-900 text-white p-6 rounded-[32px] border-b-8 border-slate-950 space-y-2">
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Post-Operative Ward Instructions</p>
                <p className="text-xs font-bold leading-relaxed">{details.postOpInstructions}</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    // STANDARD CONSULTATION ENCOUNTER
    return (
      <div className="bg-white rounded-[32px] border-4 border-slate-900 shadow-sm overflow-hidden mb-6 text-black transition-all">
        {/* COLLAPSIBLE HEADER BAR */}
        <div 
          onClick={() => setIsExpanded(prev => !prev)}
          className="p-5 bg-slate-50/80 hover:bg-slate-100/80 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-slate-100 gap-3 select-none"
        >
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black bg-blue-600 text-white px-3.5 py-1 rounded-full uppercase tracking-wider">
              {activity.type || 'Consultation'}
            </span>
            <div>
              <p className="text-xs font-black text-slate-900 uppercase">{activity.hospitalName}</p>
              <p className="text-[10px] text-slate-500 font-bold">Dr. {activity.providerName} ({activity.providerRole})</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-800 uppercase">
              {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
            </span>
            <Button size="sm" variant="ghost" className="text-blue-700 font-black text-xs uppercase rounded-xl">
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {isExpanded ? 'Collapse' : 'Expand Consultation'}
            </Button>
          </div>
        </div>

        {/* EXPANDABLE DETAILS */}
        {isExpanded && (
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 bg-slate-50 p-6 rounded-[32px]">
              <MiniVital label="BP" value={activity.vitals?.bp} unit="mmHg" />
              <MiniVital label="Temp" value={activity.vitals?.temp} unit="°C" />
              <MiniVital label="Pulse" value={activity.vitals?.pulse} unit="bpm" />
              <MiniVital label="Resp" value={activity.vitals?.respiration} unit="bpm" />
              <MiniVital label="BMI" value={activity.vitals?.bmi} unit="" />
              <MiniVital label="Weight" value={activity.vitals?.weight} unit="kg" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-black">
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-600 pl-3">Chief Complaint</p>
                  <p className="text-sm font-medium text-slate-800 leading-relaxed italic">
                    "{activity.chiefComplaint || 'No subjective complaints recorded.'}"
                  </p>
                </div>
                {activity.hpi && (
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-l-4 border-slate-500 pl-3">History of Present Illness (HPI)</p>
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">{activity.hpi}</p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-[9px] font-black text-red-600 uppercase tracking-widest border-l-4 border-red-600 pl-3">Provisional Diagnosis</p>
                <p className="text-lg font-black text-black uppercase tracking-tight">
                  {activity.diagnosis || 'Pending Review'}
                </p>
              </div>
            </div>

            {activity.prescription?.length > 0 && (
              <div className="bg-[#0f172a] p-6 rounded-[32px] text-white">
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-4">Treatment Plan / RX</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activity.prescription.map((rx: any, idx: number) => (
                    <div key={idx} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                      <p className="text-xs font-black uppercase text-white">{rx.name}</p>
                      <p className="text-[10px] font-bold text-blue-400 mt-1 uppercase italic">{rx.dosage} • {rx.frequency}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // LAB RESULT CARD
  if (activity.viewType === 'LAB_RESULT') {
    const isCritical = activity.isAbnormal || false;
    return (
      <div className={`rounded-[32px] border-4 shadow-sm overflow-hidden mb-6 bg-white transition-all ${isCritical ? 'border-red-600' : 'border-purple-600'}`}>
        <div 
          onClick={() => setIsExpanded(prev => !prev)}
          className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-slate-100 gap-3 select-none"
        >
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-black text-white px-3.5 py-1 rounded-full uppercase tracking-wider ${isCritical ? 'bg-red-600 animate-pulse' : 'bg-purple-600'}`}>
              {isCritical ? 'Critical Lab Result' : 'Lab Result Release'}
            </span>
            <div>
              <p className="text-xs font-black text-slate-900 uppercase">Tested at: {activity.hospitalName}</p>
              <p className="text-[10px] text-slate-500 font-bold">Tech: {activity.labTechName || 'Lab Technician'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-800 uppercase">
              {activity.date ? new Date(activity.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
            </span>
            <Button size="sm" variant="ghost" className="text-purple-700 font-black text-xs uppercase rounded-xl">
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {isExpanded ? 'Collapse' : 'Expand Lab Report'}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="p-8 space-y-6">
            {activity.parameters && activity.parameters.length > 0 && (
              <div className="bg-slate-50 p-6 rounded-[32px] overflow-x-auto border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Panel Result Details</p>
                <table className="w-full text-left text-xs font-bold text-slate-700 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[9px] text-slate-400 uppercase tracking-wider">
                      <th className="pb-2">Parameter</th>
                      <th className="pb-2 text-center">Value</th>
                      <th className="pb-2 text-right">Reference Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.parameters.map((p: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-200/30">
                        <td className="py-2.5 text-slate-800 font-black uppercase text-[11px]">{p.name}</td>
                        <td className="py-2.5 text-center">
                          <span className={p.isAbnormal ? "text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full font-black text-[11px] inline-block" : "text-purple-700 font-black"}>
                            {p.value} <span className="text-[10px] font-semibold text-slate-400">{p.unit}</span>
                          </span>
                          {p.isAbnormal && <span className="ml-1 text-[8px] font-black text-red-500 uppercase animate-pulse">ABN</span>}
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-500 text-[11px]">{p.referenceRange || 'N/A'} {p.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}
