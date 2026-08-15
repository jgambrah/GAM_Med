'use client';

import { useState } from 'react';
import { Camera, FileText, Upload, AlertTriangle, X, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RadiologyRequest {
  id: string;
  patient: string;
  patientName?: string;
  patientId?: string;
  ehrId: string;
  scanType: string;
  scanName?: string;
  orderedBy: string;
  providerName?: string;
  encounterId?: string;
}

interface RadiologyReportModalProps {
  request?: RadiologyRequest | null;
  isOpen: boolean;
  onClose: () => void;
  hospitalId?: string;
  onSuccess?: () => void;
}

export default function RadiologyReportModal({
  request,
  isOpen,
  onClose,
  hospitalId,
  onSuccess,
}: RadiologyReportModalProps) {
  const { toast } = useToast();
  const [isPublishing, setIsPublishing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState({
    findings: '',
    impression: '',
    isCritical: false,
  });

  const activeReq: RadiologyRequest = request || {
    id: 'RAD-2026-004',
    patient: 'JANET BONAH',
    ehrId: 'MMH/EHR/26/0101',
    scanType: 'Chest X-Ray (PA View)',
    orderedBy: 'Dr. James Gambrah',
  };

  const patientName = activeReq.patientName || activeReq.patient || 'JANET BONAH';
  const ehrId = activeReq.ehrId || 'MMH/EHR/26/0101';
  const scanType = activeReq.scanName || activeReq.scanType || 'Chest X-Ray (PA View)';
  const orderedBy = activeReq.providerName || activeReq.orderedBy || 'Dr. James Gambrah';

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !activeReq.id) {
      toast({
        variant: 'destructive',
        title: 'Image Acquisition Required',
        description: 'An image or DICOM file must be attached before authorizing report.',
      });
      return;
    }
    if (!report.findings || !report.impression) {
      toast({
        variant: 'destructive',
        title: 'Report Incomplete',
        description: 'Both Clinical Findings and Diagnostic Impression are required.',
      });
      return;
    }

    setIsPublishing(true);

    try {
      const response = await fetch('/api/radiology/publish-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalId: hospitalId || 'GAM-GAR-7578',
          orderId: activeReq.id,
          encounterId: activeReq.encounterId,
          patientId: activeReq.patientId || 'p_janet',
          patientName,
          scanType,
          findings: report.findings,
          impression: report.impression,
          isCritical: report.isCritical,
          radiologistName: 'Chief Radiologist',
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to transmit radiology report.');
      }

      toast({
        title: '⚡ Radiology Report Transmitted to EMR',
        description: `Report finalized and securely transmitted to ${orderedBy}. ${report.isCritical ? '🚨 Panic alert pushed to EMR.' : ''}`,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Transmission Failed',
        description: error.message || 'Failed to transmit report.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-800">
        
        {/* Modal Header */}
        <div className="bg-slate-950 text-white p-6 shrink-0 border-b border-slate-800 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black italic uppercase tracking-wider text-white">
                  IMAGING REPORT & ACQUISITION
                </h2>
                <p className="text-slate-400 font-mono text-xs mt-0.5">
                  {activeReq.id} • Scan: <span className="text-indigo-400 font-bold">{scanType}</span>
                </p>
              </div>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Context Plate */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-indigo-900/80 text-indigo-200 rounded-full flex items-center justify-center font-black text-base border border-indigo-700">
              {patientName.charAt(0)}
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-base uppercase tracking-wide">
                {patientName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold font-mono mt-0.5">
                EHR ID: <span className="text-slate-700 dark:text-slate-200">{ehrId}</span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Referring Physician</p>
            <p className="text-xs font-black text-indigo-400">{orderedBy}</p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handlePublish} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          {/* File Upload Zone */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Image Acquisition (DICOM / JPEG / PNG) *
            </label>
            <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              file 
                ? 'border-emerald-500/50 bg-emerald-500/10' 
                : 'border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-indigo-500/50'
            }`}>
              <input 
                type="file" 
                accept="image/*,.dcm" 
                onChange={handleFileChange} 
                className="hidden" 
                id="file-upload" 
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center">
                {file ? (
                  <>
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
                    <span className="font-black text-emerald-300 text-xs">{file.name}</span>
                    <span className="text-[10px] text-emerald-400 font-bold mt-1 uppercase">Click to replace file</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-indigo-400 mb-2" />
                    <span className="font-black text-indigo-400 hover:text-indigo-300 text-xs uppercase tracking-wider">
                      Browse Modality Output / DICOM Vault
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium mt-1">
                      Drag & drop image file from PACS workstation
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Structured Clinical Report */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Clinical Findings *
              </label>
              <textarea 
                required
                value={report.findings}
                onChange={(e) => setReport({ ...report, findings: e.target.value })}
                placeholder="Detail objective anatomical observations (e.g. lung fields, cardiac silhouette, osseous structures)..."
                className="w-full min-h-[140px] p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800 dark:text-slate-100 resize-y outline-none"
              />
            </div>
            
            <div className="flex flex-col">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Diagnostic Impression *
              </label>
              <textarea 
                required
                value={report.impression}
                onChange={(e) => setReport({ ...report, impression: e.target.value })}
                placeholder="State definitive clinical conclusion & diagnosis..."
                className="w-full min-h-[140px] p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800 dark:text-slate-100 resize-y outline-none"
              />
            </div>
          </div>

          {/* Critical Alert Toggle */}
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="font-black text-rose-300 text-xs uppercase tracking-wide">
                  Flag as Critical / Panic Value
                </h4>
                <p className="text-[10px] text-rose-400 font-medium mt-0.5">
                  Triggers immediate SMS & red push alert to prescribing doctor ({orderedBy}).
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={report.isCritical}
                onChange={(e) => setReport({ ...report, isCritical: e.target.checked })}
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
            </label>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center mt-auto shrink-0">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-3 font-bold text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer uppercase tracking-wider"
            >
              CANCEL
            </button>

            <button 
              type="submit" 
              disabled={isPublishing || !report.findings || !report.impression} 
              className="px-8 py-3 bg-indigo-950 hover:bg-indigo-900 text-white font-black text-xs rounded-xl shadow-xl transition-all uppercase tracking-wider disabled:opacity-50 flex items-center gap-2 border border-indigo-700 cursor-pointer"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  ENCRYPTING & TRANSMITTING...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  AUTHORIZE & TRANSMIT TO EMR
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
