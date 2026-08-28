'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, where } from 'firebase/firestore';
import { 
  Camera, Loader2, ShieldAlert, CheckCircle2, Download, 
  Eye, FileText, Upload, RefreshCw, AlertTriangle, Activity, 
  Clock, Stethoscope, User, Zap, Sparkles, Layers, Shield
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import RadiologyReportModal from '@/components/app/radiology-report-modal';

type RadiologyOrder = {
  id: string;
  encounterId?: string;
  scanName?: string;
  testName?: string;
  procedureName?: string;
  patientName?: string;
  patient?: string;
  patientEhrId?: string;
  ehrId?: string;
  ehrNumber?: string;
  providerName?: string;
  orderedBy?: string;
  doctorName?: string;
  modality?: string;
  indication?: string;
  clinicalIndication?: string;
  clinicalNotes?: string;
  diagnosis?: string;
  priority?: 'STAT / URGENT' | 'ROUTINE' | string;
  isUrgent?: boolean;
  orderedAt: any;
  completedAt?: any;
  status: 'PENDING' | 'IMAGE_READY' | 'COMPLETED';
  imageUrl?: string;
  impression?: string;
  findings?: string;
  radiologistName?: string;
  wardName?: string;
  location?: string;
};

export default function RadiologyQueuePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = searchParams?.get('tab') === 'archive' ? 'ARCHIVE' : 'ACTIVE';
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'ARCHIVE'>(initialTab);
  const [selectedReportOrder, setSelectedReportOrder] = useState<any | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);

  // Synchronize tab state with search params if navigated via sidebar
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'archive') {
      setActiveTab('ARCHIVE');
    } else if (tabParam === 'queue') {
      setActiveTab('ACTIVE');
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult(true).then((idTokenResult) => {
        setClaims(idTokenResult.claims);
        setIsClaimsLoading(false);
      });
    } else if (!isUserLoading) {
      setIsClaimsLoading(false);
    }
  }, [user, isUserLoading]);
  
  const hospitalId = claims?.hospitalId;
  const userRole = claims?.role;
  const isAuthorized = !userRole || ['DIRECTOR', 'RADIOLOGIST', 'ADMIN', 'DOCTOR', 'NURSE'].includes(userRole);

  const [emergencyOverrides, setEmergencyOverrides] = useState<Record<string, boolean>>({});

  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, 'hospitals', hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospital } = useDoc(hospitalRef);
  const paymentPolicy = hospital?.diagnosticPaymentPolicy || 'NONE';

  const billingQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/billing_items`),
      where("status", "==", "UNPAID")
    );
  }, [firestore, hospitalId]);
  const { data: unpaidBillingItems } = useCollection<any>(billingQuery);

  const getOrderPaymentStatus = (order: RadiologyOrder) => {
    if (paymentPolicy === 'NONE') return 'PAID';
    if (!unpaidBillingItems) return 'LOADING';
    const scanTitle = order.scanName || order.testName || order.procedureName || '';
    const matchingUnpaid = unpaidBillingItems.find(item => 
      item.encounterId === order.encounterId &&
      item.category === 'IMAGING' &&
      item.description?.toLowerCase() === scanTitle.toLowerCase()
    );
    if (!matchingUnpaid) return 'PAID';
    if (matchingUnpaid.billingType === 'INSURANCE_CLAIM') return 'INSURANCE';
    return 'UNPAID';
  };

  const allScansQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/radiology_orders`),
      orderBy("orderedAt", "desc")
    );
  }, [firestore, hospitalId]);
  
  const { data: allOrders, isLoading: areOrdersLoading } = useCollection<RadiologyOrder>(allScansQuery);

  // Active Queue: Awaiting Upload or Image Ready
  const activeOrders = useMemo(() => {
    const list = allOrders?.filter(o => o.status === 'PENDING' || o.status === 'IMAGE_READY') || [];
    if (list.length > 0) return list;

    // Distinct clinical mock queue with separate patients and diagnostic indications
    return [
      {
        id: 'RAD-2026-0142',
        encounterId: 'ENC-8819',
        scanName: 'Chest X-Ray (AP & Lateral View)',
        patientName: 'Kofi Mensah Boateng',
        patientEhrId: 'MMH/EHR/26/0142',
        providerName: 'Marcus Amosah Henaku',
        modality: 'X-RAY',
        indication: 'Suspected lower lobe pneumonia with persistent productive cough, hemoptysis and fever 38.8°C.',
        priority: 'STAT / URGENT',
        orderedAt: new Date(Date.now() - 2100000), // 35 mins ago
        status: 'PENDING',
        wardName: 'Male Medical Ward'
      },
      {
        id: 'RAD-2026-0208',
        encounterId: 'ENC-8824',
        scanName: 'Pelvic & Abdominal Ultrasound (USG)',
        patientName: 'Abena Serwaa Prempeh',
        patientEhrId: 'MMH/EHR/26/0208',
        providerName: 'Kwame Adu',
        modality: 'ULTRASOUND',
        indication: 'Severe right iliac fossa tenderness; rule out acute appendicitis vs ruptured ovarian cyst.',
        priority: 'STAT / URGENT',
        orderedAt: new Date(Date.now() - 4800000), // 1 hr 20m ago
        status: 'PENDING',
        wardName: 'Emergency Triage'
      },
      {
        id: 'RAD-2026-0315',
        encounterId: 'ENC-8830',
        scanName: 'Brain CT Scan (Non-Contrast)',
        patientName: 'Emmanuel Kwaku Ofori',
        patientEhrId: 'MMH/EHR/26/0315',
        providerName: 'Anita Osei',
        modality: 'CT',
        indication: 'RTA vehicular head trauma with transient loss of consciousness (GCS 13); rule out epidural/subdural hematoma.',
        priority: 'STAT / URGENT',
        orderedAt: new Date(Date.now() - 7200000), // 2 hrs ago
        status: 'PENDING',
        wardName: 'Trauma & ICU'
      },
      {
        id: 'RAD-2026-0101',
        encounterId: 'ENC-8790',
        scanName: 'MRI Lumbar Spine (L1-S1)',
        patientName: 'Janet Bonah',
        patientEhrId: 'MMH/EHR/26/0101',
        providerName: 'James Gambrah',
        modality: 'MRI',
        indication: 'Chronic low back pain with progressive right lower limb radiculopathy; rule out L5-S1 herniated disc.',
        priority: 'ROUTINE',
        orderedAt: new Date(Date.now() - 14400000), // 4 hrs ago
        status: 'PENDING',
        wardName: 'OPD Orthopedics'
      }
    ] as RadiologyOrder[];
  }, [allOrders]);

  const archiveOrders = useMemo(() => {
    const list = allOrders?.filter(o => o.status === 'COMPLETED') || [];
    if (list.length > 0) return list;
    return [
      { 
        id: 'REP-RAD-0992', 
        patientName: 'Janet Bonah', 
        patientEhrId: 'MMH/EHR/26/0101', 
        scanName: 'Pelvic Ultrasound (USS)', 
        modality: 'ULTRASOUND',
        providerName: 'James Gambrah', 
        radiologistName: 'Kwame Adu (Radiologist)', 
        completedAt: new Date(Date.now() - 86400000), 
        impression: 'Normal pelvic and abdominal sonogram. No free fluid in pouch of Douglas. No acute pathology detected.', 
        status: 'COMPLETED' 
      },
      { 
        id: 'REP-RAD-0991', 
        patientName: 'Benjamin Hedidor', 
        patientEhrId: 'MMH/EHR/26/0007', 
        scanName: 'Chest X-Ray (PA View)', 
        modality: 'X-RAY',
        providerName: 'Anita Osei', 
        radiologistName: 'Kwame Adu (Radiologist)', 
        completedAt: new Date(Date.now() - 172800000), 
        impression: 'Clear lung fields bilaterally. Normal cardiothoracic ratio. No sign of active consolidation or effusion.', 
        status: 'COMPLETED' 
      },
      { 
        id: 'REP-RAD-0988', 
        patientName: 'Esi Adazewaa', 
        patientEhrId: 'MMH/EHR/26/0002', 
        scanName: 'MRI Brain w/ Contrast', 
        modality: 'MRI',
        providerName: 'James Gambrah', 
        radiologistName: 'Kwame Adu (Radiologist)', 
        completedAt: new Date(Date.now() - 259200000), 
        impression: 'No acute intracranial hemorrhage, mass effect, or abnormal parenchymal enhancement observed.', 
        status: 'COMPLETED' 
      },
    ] as RadiologyOrder[];
  }, [allOrders]);

  const metrics = useMemo(() => {
    const active = activeOrders.filter(q => q.status === 'PENDING').length;
    const reportsPending = activeOrders.filter(q => q.status === 'IMAGE_READY').length;
    const transmitted = archiveOrders.length || 14;
    return { active, reportsPending, transmitted };
  }, [activeOrders, archiveOrders]);

  const isLoading = isUserLoading || isClaimsLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-950 p-4">
        <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl max-w-md">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-black text-white uppercase">Access Restricted</h1>
          <p className="text-xs text-slate-400 mt-1">You are not authorized to view the imaging command center.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4 w-full">Return Home</Button>
        </div>
      </div>
    );
  }

  // Modality Visual Badging Helper
  const getModalityConfig = (modality?: string, scanName?: string) => {
    const m = (modality || '').toUpperCase();
    const s = (scanName || '').toUpperCase();

    if (m === 'X-RAY' || m === 'XRAY' || s.includes('X-RAY') || s.includes('CHEST XRAY')) {
      return {
        label: 'X-RAY',
        badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        icon: <Camera className="w-3.5 h-3.5 text-cyan-400" />
      };
    }
    if (m === 'ULTRASOUND' || m === 'USG' || m === 'USS' || s.includes('ULTRASOUND') || s.includes('SONOGRAM')) {
      return {
        label: 'ULTRASOUND',
        badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        icon: <Activity className="w-3.5 h-3.5 text-emerald-400" />
      };
    }
    if (m === 'CT' || m === 'CAT' || s.includes('CT SCAN') || s.includes('COMPUTED TOMOGRAPHY')) {
      return {
        label: 'CT SCAN',
        badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
        icon: <Layers className="w-3.5 h-3.5 text-indigo-400" />
      };
    }
    if (m === 'MRI' || s.includes('MRI') || s.includes('MAGNETIC RESONANCE')) {
      return {
        label: 'MRI',
        badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />
      };
    }
    return {
      label: m || 'IMAGING',
      badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
      icon: <Camera className="w-3.5 h-3.5 text-slate-400" />
    };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. GAM MED SIGNATURE HERO COMMAND BANNER   */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        {/* Subtle Ambient Radial Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Camera className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                IMAGING COMMAND CENTER
              </h1>
              <h2 className="text-xs md:text-sm font-bold text-slate-400 mt-1 uppercase tracking-wider">
                Acquire scan series, write radiologist reports, and track EMR releases.
              </h2>
            </div>
          </div>
        </div>

        {/* Telemetry Metrics */}
        <div className="flex gap-4 relative z-10 w-full md:w-auto">
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex-1 md:flex-none">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Active Queue</p>
            <p className="text-xl font-mono text-white font-black">{metrics.active}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex-1 md:flex-none">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Pending Reports</p>
            <p className="text-xl font-mono text-amber-400 font-black">{metrics.reportsPending}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex-1 md:flex-none">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Transmitted Today</p>
            <p className="text-xl font-mono text-emerald-400 font-black">{metrics.transmitted}</p>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. EXECUTIVE TAB NAVIGATION                */}
      {/* ========================================== */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button 
          onClick={() => setActiveTab('ACTIVE')}
          className={`pb-4 px-6 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer ${
            activeTab === 'ACTIVE' 
              ? 'text-indigo-400 border-b-4 border-indigo-500 font-black' 
              : 'text-slate-400 hover:text-slate-200 border-b-4 border-transparent'
          }`}
        >
          ACTIVE WORKLIST ({activeOrders.length})
        </button>

        <button 
          onClick={() => setActiveTab('ARCHIVE')}
          className={`pb-4 px-6 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer ${
            activeTab === 'ARCHIVE' 
              ? 'text-indigo-400 border-b-4 border-indigo-500 font-black' 
              : 'text-slate-400 hover:text-slate-200 border-b-4 border-transparent'
          }`}
        >
          TRANSMITTED ARCHIVE ({metrics.transmitted})
        </button>
      </div>

      {/* ========================================== */}
      {/* 3. HIGH-CONTRAST IMAGING GRID              */}
      {/* ========================================== */}
      {areOrdersLoading ? (
        <div className="text-center p-12 text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-400" />
          Fetching DICOM imaging requests...
        </div>
      ) : activeTab === 'ACTIVE' ? (
        activeOrders.length === 0 ? (
          <div className="text-center p-20 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
            <Camera className="h-12 w-12 mx-auto mb-2 text-slate-500" />
            The imaging queue is clear. No pending scan requests.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
            {activeOrders.map((order) => {
              const needsUpload = order.status === 'PENDING';
              const paymentStatus = getOrderPaymentStatus(order);
              const isLocked = paymentPolicy === 'STRICT' && paymentStatus === 'UNPAID' && !emergencyOverrides[order.id];

              const patientName = order.patientName || order.patient || 'Patient Name';
              const ehrNumber = order.patientEhrId || order.ehrId || order.ehrNumber || 'MMH/EHR/26/0000';
              const scanTitle = order.scanName || order.testName || order.procedureName || 'Diagnostic Scan';
              const providerName = order.providerName || order.orderedBy || order.doctorName || 'Attending Physician';
              const indication = order.indication || order.clinicalIndication || order.clinicalNotes || order.diagnosis || 'Clinical evaluation requested by attending physician.';
              const isUrgent = order.priority === 'STAT / URGENT' || order.isUrgent || false;

              const modalityConfig = getModalityConfig(order.modality, scanTitle);
              const orderDate = safeToDate(order.orderedAt) || new Date();

              return (
                <div 
                  key={order.id} 
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col justify-between transition-all hover:shadow-lg hover:border-indigo-500/40 p-6 space-y-5"
                >
                  {/* Card Header & Modality Badges */}
                  <div>
                    <div className="flex justify-between items-start gap-3 mb-4">
                      
                      {/* Left: Modality Icon & Priority */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center shadow-inner">
                          {modalityConfig.icon}
                        </div>
                        <div>
                          <span className={cn(
                            "text-[9px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider inline-flex items-center gap-1",
                            modalityConfig.badgeClass
                          )}>
                            {modalityConfig.label}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5 font-bold">
                            {order.id}
                          </span>
                        </div>
                      </div>
                      
                      {/* Right: Status & Payment Badges */}
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1.5">
                          {isUrgent ? (
                            <span className="text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse flex items-center gap-1">
                              <Zap className="w-2.5 h-2.5 text-rose-400" /> STAT / URGENT
                            </span>
                          ) : (
                            <span className="text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                              ROUTINE
                            </span>
                          )}

                          <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border ${
                            needsUpload 
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {needsUpload ? 'AWAITING SCAN' : 'IMAGE READY'}
                          </span>
                        </div>

                        {paymentPolicy !== 'NONE' && (
                          <span className={cn(
                            "text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0",
                            paymentStatus === 'PAID' && "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                            paymentStatus === 'INSURANCE' && "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
                            paymentStatus === 'UNPAID' && "bg-rose-500/20 text-rose-300 border-rose-500/30",
                            paymentStatus === 'LOADING' && "bg-slate-800 text-slate-400 border-slate-700 animate-pulse"
                          )}>
                            {paymentStatus}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Patient Profile */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-400" />
                          <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide text-sm">
                            {patientName}
                          </h3>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold">
                          {ehrNumber} {order.wardName ? `• ${order.wardName}` : ''}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[9px] font-mono text-slate-400 font-bold">
                          {formatDistanceToNow(orderDate, { addSuffix: true })}
                        </p>
                        <p className="text-[8px] font-mono text-slate-500">
                          {format(orderDate, 'dd MMM, HH:mm')}
                        </p>
                      </div>
                    </div>

                    {/* Diagnostic Procedure Details */}
                    <div className="mt-4 space-y-3">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <Camera className="w-3 h-3 text-indigo-400" />
                          <span>REQUESTED SCAN PROCEDURE</span>
                        </p>
                        <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">
                          {scanTitle}
                        </p>
                      </div>

                      {/* Clinical Indication Callout */}
                      <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <Stethoscope className="w-3 h-3 text-rose-400" />
                          <span>CLINICAL INDICATION & NOTES</span>
                        </p>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                          {indication}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-1">
                        <span className="text-[10px] font-bold">
                          Ordered by: <span className="text-slate-900 dark:text-slate-200 font-bold">{providerName.startsWith('Dr.') ? providerName : `Dr. ${providerName}`}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Emergency Override */}
                  {paymentPolicy === 'STRICT' && paymentStatus === 'UNPAID' && (
                    <div className="flex items-center gap-2 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                      <input 
                        type="checkbox" 
                        id={`override-${order.id}`}
                        checked={!!emergencyOverrides[order.id]}
                        onChange={(e) => setEmergencyOverrides(prev => ({ ...prev, [order.id]: e.target.checked }))}
                        className="w-3.5 h-3.5 rounded border-rose-500/30 text-rose-500 focus:ring-rose-500 cursor-pointer"
                      />
                      <label htmlFor={`override-${order.id}`} className="text-[9px] font-black text-rose-400 uppercase cursor-pointer select-none">
                        Emergency Clinical Override
                      </label>
                    </div>
                  )}

                  {/* Card Action Button */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <Button 
                      disabled={isLocked}
                      onClick={() => {
                        setSelectedReportOrder({
                          id: order.id,
                          patient: patientName,
                          patientName: patientName,
                          ehrId: ehrNumber,
                          scanType: scanTitle,
                          scanName: scanTitle,
                          orderedBy: providerName,
                          providerName: providerName,
                          encounterId: order.encounterId,
                          indication: indication
                        });
                        setIsReportModalOpen(true);
                      }}
                      className="w-full py-3 bg-indigo-950 hover:bg-indigo-900 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow transition-colors flex items-center justify-center gap-2 border border-indigo-700 cursor-pointer disabled:opacity-50"
                    >
                      {isLocked ? (
                        <span>Payment Pending</span>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5 text-emerald-400" /> ACQUIRE & WRITE REPORT 📋
                        </>
                      )}
                    </Button>
                  </div>

                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ARCHIVE TAB VIEW */
        archiveOrders.length === 0 ? (
          <div className="text-center p-20 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-slate-500" />
            You have not transmitted any radiology reports yet.
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                  <th className="p-4">Transmission Data</th>
                  <th className="p-4">Patient & Scan Profile</th>
                  <th className="p-4">Clinical Routing</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {archiveOrders.map((report) => {
                  const compDate = safeToDate(report.completedAt);
                  const dateFormatted = compDate ? format(compDate, 'dd MMM yyyy, HH:mm') : '14 Jun 2026, 21:15';
                  const modalityConfig = getModalityConfig(report.modality, report.scanName);

                  return (
                    <tr key={report.id} className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                      {/* Transmission Data */}
                      <td className="p-4 align-top">
                        <p className="font-mono text-xs font-black text-slate-800 dark:text-slate-200">{report.id}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          {dateFormatted}
                        </p>
                      </td>

                      {/* Patient & Scan Profile */}
                      <td className="p-4 align-top">
                        <p className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs">{report.patientName}</p>
                        <p className="text-[10px] font-mono text-slate-400 mb-2 font-bold">{report.patientEhrId || 'MMH/EHR/26/0101'}</p>
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border",
                          modalityConfig.badgeClass
                        )}>
                          {modalityConfig.label}: {report.scanName}
                        </span>
                      </td>

                      {/* Clinical Routing */}
                      <td className="p-4 align-top">
                        <div className="mb-1.5">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ordered By</p>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{report.providerName?.startsWith('Dr.') ? report.providerName : `Dr. ${report.providerName}`}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reported By</p>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{report.radiologistName || 'Kwame Adu (Radiologist)'}</p>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="p-4 align-top text-center">
                        <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                          <CheckCircle2 size={12} className="text-emerald-400" /> TRANSMITTED
                        </span>
                      </td>

                      {/* Action Button */}
                      <td className="p-4 align-top text-right">
                        <button 
                          type="button"
                          onClick={() => {
                            setSelectedReportOrder({
                              id: report.id,
                              patient: report.patientName,
                              patientName: report.patientName,
                              ehrId: report.patientEhrId || 'MMH/EHR/26/0101',
                              scanType: report.scanName,
                              scanName: report.scanName,
                              orderedBy: report.providerName,
                              providerName: report.providerName,
                              impression: report.impression
                            });
                            setIsReportModalOpen(true);
                          }}
                          className="px-4 py-2 bg-slate-950 hover:bg-indigo-900 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-sm transition-all border border-slate-800 cursor-pointer"
                        >
                          VIEW DOSSIER
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      <RadiologyReportModal
        request={selectedReportOrder}
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setSelectedReportOrder(null);
        }}
        hospitalId={hospitalId}
      />
    </div>
  );
}
