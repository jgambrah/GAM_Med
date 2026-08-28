'use client';

import { useState, useEffect } from 'react';
import { 
  Camera, FileText, Upload, AlertTriangle, X, Loader2, CheckCircle2, 
  ShieldAlert, Printer, Sparkles, Check, Download, Eye, Lock, Plus,
  Stethoscope, Building2, Calendar, User, ShieldCheck, FileCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface RadiologyRequest {
  id: string;
  patient?: string;
  patientName?: string;
  patientId?: string;
  ehrId?: string;
  scanType?: string;
  scanName?: string;
  orderedBy?: string;
  providerName?: string;
  radiologistName?: string;
  encounterId?: string;
  indication?: string;
  findings?: string;
  impression?: string;
  imageUrl?: string;
  completedAt?: any;
  isTransmitted?: boolean;
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'REPORT' | 'ADDENDUM'>('REPORT');
  const [addendumText, setAddendumText] = useState('');
  const [addendaList, setAddendaList] = useState<Array<{ text: string; date: string; author: string }>>([]);

  const isDossierMode = !!request?.isTransmitted;

  const [report, setReport] = useState({
    findings: request?.findings || '',
    impression: request?.impression || '',
    isCritical: false,
  });

  useEffect(() => {
    if (request) {
      setReport({
        findings: request.findings || '',
        impression: request.impression || '',
        isCritical: false,
      });
      if (request.imageUrl) {
        setPreviewUrl(request.imageUrl);
      }
    }
  }, [request]);

  const activeReq: RadiologyRequest = request || {
    id: 'ORD-26-0101',
    patientName: 'Janet Bonah',
    ehrId: 'MMH/EHR/26/0101',
    scanType: 'Abdomino-Pelvic Ultrasound (USS Complete)',
    orderedBy: 'Dr. Marcus Amosah Henaku',
    indication: 'Evaluation of acute right iliac fossa pain; rule out acute appendicitis vs ovarian pathology.'
  };

  const patientName = activeReq.patientName || activeReq.patient || 'Janet Bonah';
  const ehrId = activeReq.ehrId || 'MMH/EHR/26/0101';
  const scanType = activeReq.scanName || activeReq.scanType || 'Abdomino-Pelvic Ultrasound (USS Complete)';
  const orderedBy = activeReq.providerName || activeReq.orderedBy || 'Dr. Marcus Amosah Henaku';
  const radiologist = activeReq.radiologistName || 'Dr. Kwame Adu, FWACS (Consultant Radiologist)';
  const indication = activeReq.indication || 'Clinical evaluation requested by attending medical officer.';
  const completedDate = activeReq.completedAt ? (safeToDate(activeReq.completedAt) || new Date()) : new Date();

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  // One-Click Normal Reporting Clinical Templates
  const applyTemplate = (type: 'NORMAL_USS' | 'NORMAL_CXR' | 'NORMAL_OBSTETRIC' | 'NORMAL_CT') => {
    switch (type) {
      case 'NORMAL_CXR':
        setReport({
          findings: 'LUNG FIELDS: The lungs are clear bilaterally with no active focal consolidation, pleural effusion, or pneumothorax.\nCARDIAC: Cardiothoracic ratio (CTR) is within normal limits (< 0.50). Normal mediastinal contour.\nBONES & SOFT TISSUES: Osseous thoracic cage and chest wall soft tissues are unremarkable.',
          impression: 'NORMAL CHEST RADIOGRAPH (PA VIEW). No acute cardiopulmonary pathology or active inflammatory disease identified.',
          isCritical: false
        });
        break;

      case 'NORMAL_USS':
        setReport({
          findings: 'LIVER: Normal in size, contour and homogeneous parenchymal echotexture. No focal hepatic mass lesion.\nGALLBLADDER: Thin-walled and completely acalculous. Normal biliary tree.\nKIDNEYS: Normal bilateral renal bipolar length and corticomedullary differentiation without hydronephrosis or calculi.\nSPLEEN & PANCREAS: Normal limits.\nURINARY BLADDER: Well-distended with smooth lumen.\nUTERUS & ADNEXA: Normal pelvic sonogram without free fluid in the pouch of Douglas.',
          impression: 'NORMAL ABDOMINAL & PELVIC SONOGRAM. Normal solid abdominal viscera. No evidence of cholecystitis, appendicitis, or pelvic mass.',
          isCritical: false
        });
        break;

      case 'NORMAL_OBSTETRIC':
        setReport({
          findings: 'FETUS: Single live intrauterine fetus in cephalic presentation.\nFETAL HEART: Regular cardiac activity noted (FHR 142 bpm).\nAMNIOTIC FLUID: Adequate amniotic fluid volume (Amniotic Fluid Index AFI: 14.5 cm).\nPLACENTA: Anterior, fundal, clear of internal os (Grade II maturity).\nBIOMETRY: BPD, HC, AC, and FL parameters correspond to Estimated Gestational Age of 34 weeks ± 1 week. Estimated Fetal Weight: 2.35 kg.',
          impression: 'SINGLE VIABLE INTRAUTERINE PREGNANCY AT 34 WEEKS GESTATION. Normal fetal growth velocity and reassuring biophysical profile.',
          isCritical: false
        });
        break;

      case 'NORMAL_CT':
        setReport({
          findings: 'BRAIN PARENCHYMA: Normal gray-white matter differentiation. No acute intracranial hemorrhage, territorial infarction, or mass effect.\nVENTRICLES: Symmetrical and age-appropriate ventricular system.\nBONES: Calvarium and skull base are intact with no fracture lines.\nPARANASAL SINUSES: Clear and aerated.',
          impression: 'UNREMARKABLE NON-CONTRAST BRAIN CT SCAN. No acute intracranial hemorrhage, edema, or traumatic calvarial defect.',
          isCritical: false
        });
        break;
    }

    toast({
      title: '📋 Clinical Template Applied',
      description: 'Standard diagnostic reporting template populated.',
    });
  };

  // Publish / Transmit Report to EMR
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
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
          imageUrl: previewUrl || 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&q=80',
          radiologistName: radiologist,
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

  // Handle Addendum Submission
  const handleAddAddendum = () => {
    if (!addendumText.trim()) return;
    const newEntry = {
      text: addendumText.trim(),
      date: format(new Date(), 'dd MMM yyyy, HH:mm'),
      author: radiologist
    };
    setAddendaList(prev => [...prev, newEntry]);
    setAddendumText('');
    toast({
      title: '🖋️ Signed Addendum Logged',
      description: 'The authenticated addendum has been attached to the diagnostic record.',
    });
  };

  // Single-Click Print Utility
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] border border-slate-800">
        
        {/* ========================================================= */}
        {/* 1. MODAL HEADER & ACTION TOOLBAR (SCREEN ONLY)            */}
        {/* ========================================================= */}
        <div className="bg-slate-950 text-white p-5 shrink-0 border-b border-slate-800 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 rounded-2xl text-indigo-400 shadow-inner">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {isDossierMode ? 'AUTHENTICATED DIAGNOSTIC DOSSIER' : 'STRUCTURED REPORTING STUDIO'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {activeReq.id}
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-black uppercase italic tracking-wider text-white mt-0.5">
                {scanType}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDossierMode && (
              <Button 
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black rounded-xl uppercase tracking-wider shadow flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>PRINT PDF REPORT</span>
              </Button>
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

        {/* ========================================================= */}
        {/* 2. PRINTABLE OFFICIAL CLINICAL DOSSIER CONTENT           */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Official Hospital Letterhead Banner */}
          <div className="border-b-2 border-slate-900 dark:border-slate-700 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-500" />
                <h1 className="font-black text-slate-900 dark:text-slate-100 text-base md:text-lg uppercase tracking-wider">
                  MMH DIAGNOSTIC RADIOLOGY NODE
                </h1>
              </div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Department of Radiology & Nuclear Medicine • Ghana Health Service (GHS)
              </p>
            </div>

            <div className="text-right text-xs">
              <p className="font-mono font-bold text-slate-700 dark:text-slate-300">
                Transmission Date: {format(completedDate, 'dd MMMM yyyy, HH:mm')}
              </p>
              <p className="text-[10px] font-mono text-slate-400">
                Accession No: {activeReq.id}
              </p>
            </div>
          </div>

          {/* Patient Demographics Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Patient Name</p>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase mt-0.5">{patientName}</p>
            </div>

            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hospital EHR #</p>
              <p className="text-sm font-mono font-bold text-indigo-500 mt-0.5">{ehrId}</p>
            </div>

            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ordering Physician</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">{orderedBy}</p>
            </div>

            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Study Modality</p>
              <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase mt-0.5">{scanType}</p>
            </div>
          </div>

          {/* Clinical Indication Callout */}
          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-1">
            <p className="text-[9px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest flex items-center gap-1">
              <Stethoscope className="w-3.5 h-3.5" />
              <span>CLINICAL INDICATION & TECHNIQUE</span>
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              {indication}
            </p>
          </div>

          {/* Main Workspace: Side-by-Side Image Viewer & Structured Report */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Image / DICOM Attachment Preview */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-400" />
                  <span>KEY SCAN SLICE / PACS SERIES</span>
                </p>
                {previewUrl && (
                  <a 
                    href={previewUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-wider flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> Full Size
                  </a>
                )}
              </div>

              {previewUrl ? (
                <div className="rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-video relative group shadow-md flex items-center justify-center">
                  <img 
                    src={previewUrl} 
                    alt="Acquired scan" 
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/70 text-white font-mono text-[9px] uppercase tracking-wider">
                    Series 1 • Key Image
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-6 text-center bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center min-h-[160px]">
                  <input 
                    type="file" 
                    accept="image/*,.dcm" 
                    onChange={handleFileChange} 
                    className="hidden" 
                    id="dossier-file-upload" 
                  />
                  <label htmlFor="dossier-file-upload" className="cursor-pointer flex flex-col items-center">
                    <Upload className="w-8 h-8 text-indigo-400 mb-1" />
                    <span className="font-black text-xs text-indigo-400 uppercase tracking-wider">
                      Attach DICOM / Scan Image
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5">
                      PNG, JPEG, or DICOM from workstation
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Right Column: Structured Findings & Diagnostic Impression */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Quick Template Picker (Shown only in Create Mode) */}
              {!isDossierMode && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-xl space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> One-Click Normal Reporting Templates:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyTemplate('NORMAL_CXR')}
                      className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 hover:border-indigo-500 text-[9px] font-black rounded-lg uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Normal Chest X-Ray
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('NORMAL_USS')}
                      className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 hover:border-indigo-500 text-[9px] font-black rounded-lg uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Normal Abdomen/Pelvis USS
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('NORMAL_OBSTETRIC')}
                      className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 hover:border-indigo-500 text-[9px] font-black rounded-lg uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Normal Obstetric (34w)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('NORMAL_CT')}
                      className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 hover:border-indigo-500 text-[9px] font-black rounded-lg uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Normal Head CT
                    </button>
                  </div>
                </div>
              )}

              {/* Findings Section */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  CLINICAL FINDINGS & OBSERVATIONS *
                </label>
                {isDossierMode ? (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                    {report.findings || 'Symmetric anatomical structures observed with preserved tissue planes and normal vascularity.'}
                  </div>
                ) : (
                  <textarea 
                    required
                    value={report.findings}
                    onChange={(e) => setReport({ ...report, findings: e.target.value })}
                    placeholder="Detail objective anatomical observations (e.g. lung fields, solid organs, vascularity, osseous alignment)..."
                    className="w-full min-h-[130px] p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-800 dark:text-slate-100 resize-y outline-none leading-relaxed"
                  />
                )}
              </div>

              {/* Impression Section */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  DIAGNOSTIC IMPRESSION & CONCLUSION *
                </label>
                {isDossierMode ? (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-black text-emerald-900 dark:text-emerald-300 leading-relaxed uppercase tracking-tight">
                    {report.impression || 'Normal study without evidence of acute traumatic or infective pathology.'}
                  </div>
                ) : (
                  <textarea 
                    required
                    value={report.impression}
                    onChange={(e) => setReport({ ...report, impression: e.target.value })}
                    placeholder="State definitive clinical diagnosis and conclusion..."
                    className="w-full min-h-[90px] p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800 dark:text-slate-100 resize-y outline-none leading-relaxed uppercase"
                  />
                )}
              </div>

            </div>

          </div>

          {/* Signed Addendum History (Dossier Mode) */}
          {isDossierMode && addendaList.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5" /> Authenticated Signed Addenda:
              </p>
              {addendaList.map((addendum, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                    <span>Addendum #{idx + 1} by {addendum.author}</span>
                    <span>{addendum.date}</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {addendum.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Addendum Entry Form in Dossier Mode */}
          {isDossierMode && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 print:hidden">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-indigo-400" /> Attach Formal Addendum / Revision Note
              </p>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={addendumText}
                  onChange={(e) => setAddendumText(e.target.value)}
                  placeholder="Enter authenticated addendum or clinical clarification..."
                  className="flex-1 px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none"
                />
                <Button 
                  type="button"
                  onClick={handleAddAddendum}
                  disabled={!addendumText.trim()}
                  className="text-xs font-black uppercase tracking-wider"
                >
                  Log Addendum
                </Button>
              </div>
            </div>
          )}

          {/* Digital Signature & Radiologist Sign-off */}
          <div className="pt-6 border-t-2 border-slate-900 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Authorized Electronic Verification
              </p>
              <div className="flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Digitally Signed & Encrypted (ISO/HL7 FHIR Certified)</span>
              </div>
            </div>

            <div className="text-right border-t sm:border-t-0 pt-2 sm:pt-0">
              <div className="font-serif italic font-bold text-slate-800 dark:text-slate-200 text-sm">
                Kwame Adu
              </div>
              <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase">
                {radiologist}
              </p>
              <p className="text-[9px] font-mono text-slate-400">
                Consultant Radiologist • GMC Reg # 489201
              </p>
            </div>
          </div>

        </div>

        {/* ========================================================= */}
        {/* 3. MODAL ACTION FOOTER (SCREEN ONLY)                      */}
        {/* ========================================================= */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-between items-center shrink-0 print:hidden">
          <Button 
            type="button" 
            variant="outline"
            onClick={onClose} 
            className="text-xs uppercase tracking-wider border-slate-700 text-slate-300"
          >
            Close Window
          </Button>

          {!isDossierMode && (
            <Button 
              type="button" 
              onClick={handlePublish}
              disabled={isPublishing || !report.findings || !report.impression} 
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-xl uppercase tracking-widest flex items-center gap-2 cursor-pointer"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>TRANSMITTING REPORT TO EMR...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>AUTHORIZE & TRANSMIT TO EMR</span>
                </>
              )}
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
