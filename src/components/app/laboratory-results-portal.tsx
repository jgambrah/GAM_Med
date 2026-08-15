'use client';

import { useState } from 'react';
import { Microscope, AlertTriangle, ShieldCheck, CheckCircle2, X, Loader2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LabRequest {
  id: string;
  patientName: string;
  patientId?: string;
  ehrId: string;
  doctor: string;
  doctorUid?: string;
  testName: string;
  priority: string;
}

interface ReferenceRange {
  min: number;
  max: number;
  unit: string;
  name: string;
}

interface LaboratoryResultsPortalProps {
  labRequest?: LabRequest | null;
  isOpen: boolean;
  onClose: () => void;
  hospitalId?: string;
  onSuccess?: () => void;
}

export default function LaboratoryResultsPortal({
  labRequest,
  isOpen,
  onClose,
  hospitalId,
  onSuccess,
}: LaboratoryResultsPortalProps) {
  const { toast } = useToast();
  const [isPublishing, setIsPublishing] = useState(false);
  const [notes, setNotes] = useState('');

  // Fallback request data if none provided
  const request: LabRequest = labRequest || {
    id: 'REQ-LAB-2026-089',
    patientName: 'BENJAMIN HEDIDOR',
    patientId: 'p_benjamin',
    ehrId: 'MMH/EHR/26/0007',
    doctor: 'Dr. James Gambrah',
    doctorUid: 'doc_gambrah',
    testName: 'Full Blood Count (FBC)',
    priority: 'EMERGENCY',
  };

  // State to hold entered values for each parameter
  const [results, setResults] = useState<Record<string, string>>({
    wbc: '7.2',
    rbc: '4.8',
    hgb: '14.2',
    plt: '250',
  });

  // Master Reference Ranges for Auto-Flagging Engine
  const referenceRanges: Record<string, ReferenceRange> = {
    wbc: { min: 4.0, max: 10.0, unit: 'x10^9/L', name: 'White Blood Cells (WBC)' },
    rbc: { min: 4.5, max: 5.5, unit: 'x10^12/L', name: 'Red Blood Cells (RBC)' },
    hgb: { min: 13.0, max: 17.0, unit: 'g/dL', name: 'Hemoglobin (HGB)' },
    plt: { min: 150, max: 400, unit: 'x10^9/L', name: 'Platelets (PLT)' },
  };

  // 1. The Auto-Flagging Engine
  const getFlag = (key: string, value: string): 'LOW' | 'HIGH' | 'NORMAL' | null => {
    if (!value) return null;
    const val = parseFloat(value);
    const range = referenceRanges[key];
    if (isNaN(val) || !range) return null;
    if (val < range.min) return 'LOW';
    if (val > range.max) return 'HIGH';
    return 'NORMAL';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResults({ ...results, [e.target.name]: e.target.value });
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPublishing(true);

    // Build finalized parameter payload with flag tags
    const finalizedMatrix: Record<string, any> = {};
    Object.keys(referenceRanges).forEach((key) => {
      const val = results[key];
      const flag = getFlag(key, val);
      finalizedMatrix[key] = {
        name: referenceRanges[key].name,
        value: val,
        unit: referenceRanges[key].unit,
        min: referenceRanges[key].min,
        max: referenceRanges[key].max,
        flag: flag,
      };
    });

    try {
      const response = await fetch('/api/lab/publish-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalId: hospitalId || 'GAM-GAR-7578',
          orderId: request.id,
          patientId: request.patientId,
          patientName: request.patientName,
          ehrId: request.ehrId,
          doctorName: request.doctor,
          doctorUid: request.doctorUid,
          testName: request.testName,
          priority: request.priority,
          results: finalizedMatrix,
          technicianNotes: notes,
          labTechName: 'Chief Biomedical Scientist',
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to publish results.');
      }

      toast({
        title: '✅ Results Published & Encrypted',
        description: `Diagnostic report for ${request.testName} transmitted to ${request.doctor}'s EMR Console.`,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Publishing Error',
        description: error.message || 'Failed to publish results.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-800">
        
        {/* 1. Header & Context (Signature Dark Edition) */}
        <div className="bg-slate-950 text-white p-6 shrink-0 border-b border-slate-800 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-violet-500/20 border border-violet-500/30 rounded-xl text-violet-400">
                <Microscope className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black italic uppercase tracking-wider text-white flex items-center gap-2">
                  LABORATORY RESULTS ENTRY & AUTO-VALIDATION
                </h2>
                <p className="text-slate-400 font-mono text-xs mt-0.5">
                  {request.id} • Requested by: <span className="text-violet-400 font-bold">{request.doctor}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {request.priority === 'EMERGENCY' || request.priority === 'STAT' ? (
              <span className="bg-red-500/20 text-red-400 border border-red-500/50 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse">
                STAT / EMERGENCY
              </span>
            ) : (
              <span className="bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">
                ROUTINE
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Patient Context Plate */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-lg shadow-sm">
              {request.patientName.charAt(0)}
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-base uppercase tracking-wide">
                {request.patientName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-2 mt-0.5">
                <span>EHR: <strong className="text-slate-700 dark:text-slate-200">{request.ehrId}</strong></span>
                <span>•</span>
                <span>Test: <strong className="text-violet-600 dark:text-violet-400">{request.testName}</strong></span>
              </p>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Validation Engine</span>
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Live Range Checker Active
            </span>
          </div>
        </div>

        {/* 2. The Smart Result Matrix Form */}
        <form onSubmit={handlePublish} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-6 space-y-6">
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider">
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700">Parameter</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 w-48 text-center">Result Value</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 w-24">Unit</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">Ref. Range</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-right w-32">Clinical Flag</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-bold">
                  {Object.keys(referenceRanges).map(key => {
                    const range = referenceRanges[key];
                    const flag = getFlag(key, results[key]);
                    
                    return (
                      <tr key={key} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-black text-slate-900 dark:text-slate-100">{range.name}</td>
                        
                        <td className="p-4 text-center">
                          <input 
                            type="number" step="0.01" name={key} required
                            value={results[key]} onChange={handleChange}
                            className={`w-32 p-2.5 text-center font-mono font-black text-xs border rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-colors ${
                              flag === 'LOW' ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200' :
                              flag === 'HIGH' ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-700 text-red-900 dark:text-red-200' :
                              'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                            }`}
                          />
                        </td>
                        
                        <td className="p-4 text-xs text-slate-500 font-mono">{range.unit}</td>
                        <td className="p-4 text-center text-xs text-slate-500 font-mono">{range.min} - {range.max}</td>
                        
                        <td className="p-4 text-right">
                          {flag === 'LOW' && (
                            <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                              LOW
                            </span>
                          )}
                          {flag === 'HIGH' && (
                            <span className="bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                              HIGH
                            </span>
                          )}
                          {flag === 'NORMAL' && (
                            <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                              NORMAL
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Technician Notes / Morphological Observations
              </label>
              <textarea 
                rows={3} 
                value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any morphological observations, cell structure details, or testing notes here..."
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-violet-500 outline-none"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-auto p-6 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-3 font-bold text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer uppercase tracking-wider"
            >
              CANCEL
            </button>

            <button 
              type="submit" 
              disabled={isPublishing} 
              className="px-8 py-3 bg-violet-950 hover:bg-violet-900 text-white font-black text-xs rounded-xl shadow-xl transition-all uppercase tracking-wider disabled:opacity-50 flex items-center gap-2 cursor-pointer border border-violet-800"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                  ENCRYPTING & PUBLISHING...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  AUTHORIZE & PUBLISH TO EMR
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
