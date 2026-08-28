'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, where } from 'firebase/firestore';
import { 
  Camera, Loader2, ShieldAlert, CheckCircle2, Download, 
  Eye, FileText, Upload, RefreshCw, AlertTriangle, Activity, 
  Clock, Stethoscope, User, Zap, Sparkles, Layers, Shield,
  Search, Filter, ArrowUpDown, Bed, MapPin, Building2,
  Calendar, ChevronRight, AlertCircle, FileUp, FolderOpen,
  SlidersHorizontal, Check
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
  patientId?: string;
  scanName?: string;
  testName?: string;
  procedureName?: string;
  patientName?: string;
  patient?: string;
  patientEhrId?: string;
  ehrId?: string;
  ehrNumber?: string;
  gender?: string;
  age?: string | number;
  location?: string;
  wardName?: string;
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

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModality, setSelectedModality] = useState<string>('ALL');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

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
  const activeOrdersRaw = useMemo(() => {
    const list = allOrders?.filter(o => o.status === 'PENDING' || o.status === 'IMAGE_READY') || [];
    if (list.length > 0) return list;

    // High-density clinical mock dataset with authentic Ghanaian medical cases
    return [
      {
        id: 'RAD-2026-0142',
        encounterId: 'ENC-8819',
        patientId: 'PT-90142',
        scanName: 'Chest X-Ray (PA & Lateral View)',
        patientName: 'Kofi Mensah Boateng',
        patientEhrId: 'MMH/EHR/26/0142',
        gender: 'Male',
        age: '48y',
        location: 'Male Medical Ward - Bed 3',
        wardName: 'Male Medical Ward',
        providerName: 'Marcus Amosah Henaku',
        modality: 'X-RAY',
        indication: 'Suspected lower lobe consolidation/pneumonia with persistent productive cough, hemoptysis and pyrexia 38.8°C.',
        priority: 'STAT / URGENT',
        orderedAt: new Date(Date.now() - 1200000), // 20m ago
        status: 'PENDING'
      },
      {
        id: 'RAD-2026-0208',
        encounterId: 'ENC-8824',
        patientId: 'PT-90208',
        scanName: 'Pelvic & Abdominal Ultrasound (USG Complete)',
        patientName: 'Abena Serwaa Prempeh',
        patientEhrId: 'MMH/EHR/26/0208',
        gender: 'Female',
        age: '29y',
        location: 'Emergency Triage - Bed 2',
        wardName: 'Emergency Triage',
        providerName: 'Kwame Adu',
        modality: 'ULTRASOUND',
        indication: 'Severe right iliac fossa tenderness with guarding; rule out acute appendicitis vs ruptured ovarian cyst.',
        priority: 'STAT / URGENT',
        orderedAt: new Date(Date.now() - 2700000), // 45m ago
        status: 'PENDING'
      },
      {
        id: 'RAD-2026-0315',
        encounterId: 'ENC-8830',
        patientId: 'PT-90315',
        scanName: 'Brain CT Scan (Non-Contrast Axial & Coronal)',
        patientName: 'Emmanuel Kwaku Ofori',
        patientEhrId: 'MMH/EHR/26/0315',
        gender: 'Male',
        age: '36y',
        location: 'Trauma & ICU - Bed 1',
        wardName: 'Trauma & ICU',
        providerName: 'Anita Osei',
        modality: 'CT',
        indication: 'RTA vehicular head injury with transient loss of consciousness (GCS 13); rule out acute epidural/subdural hematoma.',
        priority: 'STAT / URGENT',
        orderedAt: new Date(Date.now() - 5400000), // 1.5 hrs ago
        status: 'PENDING'
      },
      {
        id: 'RAD-2026-0101',
        encounterId: 'ENC-8790',
        patientId: 'PT-90101',
        scanName: 'Obstetric Ultrasound (Biophysical Profile & Doppler)',
        patientName: 'Janet Bonah',
        patientEhrId: 'MMH/EHR/26/0101',
        gender: 'Female',
        age: '32y',
        location: 'Maternity Ward - Antenatal Bay',
        wardName: 'Maternity Ward',
        providerName: 'James Gambrah',
        modality: 'ULTRASOUND',
        indication: 'Gravida 2 Para 1 at 34 weeks gestation; suspected oligohydramnios and fetal growth assessment.',
        priority: 'ROUTINE',
        orderedAt: new Date(Date.now() - 10800000), // 3 hrs ago
        status: 'IMAGE_READY'
      },
      {
        id: 'RAD-2026-0422',
        encounterId: 'ENC-8845',
        patientId: 'PT-90422',
        scanName: 'MRI Lumbar Spine (L1-S1 Sagittal & Axial)',
        patientName: 'Kwabena Appiah Danquah',
        patientEhrId: 'MMH/EHR/26/0422',
        gender: 'Male',
        age: '54y',
        location: 'OPD Consulting Room 4',
        wardName: 'OPD Orthopedics',
        providerName: 'James Gambrah',
        modality: 'MRI',
        indication: 'Chronic intractable lower back pain radiating down right S1 dermatome; assess for disc protrusion and nerve impingement.',
        priority: 'ROUTINE',
        orderedAt: new Date(Date.now() - 18000000), // 5 hrs ago
        status: 'PENDING'
      },
      {
        id: 'RAD-2026-0518',
        encounterId: 'ENC-8860',
        patientId: 'PT-90518',
        scanName: 'Right Knee Joint X-Ray (AP & Lateral Weight-Bearing)',
        patientName: 'Akosua Mansa Frimpong',
        patientEhrId: 'MMH/EHR/26/0518',
        gender: 'Female',
        age: '62y',
        location: 'OPD Consulting Room 2',
        wardName: 'OPD Consulting',
        providerName: 'Marcus Amosah Henaku',
        modality: 'X-RAY',
        indication: 'Severe right knee joint pain with crepitus and restricted flexion; assess Kellgren-Lawrence osteoarthritis grade.',
        priority: 'ROUTINE',
        orderedAt: new Date(Date.now() - 25200000), // 7 hrs ago
        status: 'PENDING'
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
        scanName: 'Abdominal Ultrasound (USS Complete)', 
        modality: 'ULTRASOUND',
        providerName: 'James Gambrah', 
        radiologistName: 'Kwame Adu (Radiologist)', 
        completedAt: new Date(Date.now() - 86400000), 
        impression: 'Normal pelvic and abdominal sonogram. Normal liver texture, gall bladder free of calculi. No acute pathology detected.', 
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
        impression: 'Clear lung fields bilaterally. Normal cardiothoracic ratio (CTR 0.48). No sign of active consolidation or pleural effusion.', 
        status: 'COMPLETED' 
      },
      { 
        id: 'REP-RAD-0988', 
        patientName: 'Esi Adazewaa', 
        patientEhrId: 'MMH/EHR/26/0002', 
        scanName: 'Brain CT Scan w/ Contrast', 
        modality: 'CT',
        providerName: 'James Gambrah', 
        radiologistName: 'Kwame Adu (Radiologist)', 
        completedAt: new Date(Date.now() - 259200000), 
        impression: 'No acute intracranial hemorrhage, mass effect, or abnormal parenchymal enhancement observed. Ventricles age-appropriate.', 
        status: 'COMPLETED' 
      },
    ] as RadiologyOrder[];
  }, [allOrders]);

  // Helper for Modality Normalization
  const getNormalizedModality = (modality?: string, scanName?: string): string => {
    const m = (modality || '').toUpperCase();
    const s = (scanName || '').toUpperCase();

    if (m === 'X-RAY' || m === 'XRAY' || s.includes('X-RAY') || s.includes('XRAY') || s.includes('CHEST X')) return 'X-RAY';
    if (m === 'ULTRASOUND' || m === 'USG' || m === 'USS' || s.includes('ULTRASOUND') || s.includes('SONOGRAM') || s.includes('USS')) return 'ULTRASOUND';
    if (m === 'CT' || m === 'CAT' || s.includes('CT SCAN') || s.includes('COMPUTED TOMOGRAPHY')) return 'CT';
    if (m === 'MRI' || s.includes('MRI') || s.includes('RESONANCE')) return 'MRI';
    return 'OTHER';
  };

  // Telemetry Breakout Counts
  const telemetryMetrics = useMemo(() => {
    const total = activeOrdersRaw.length;
    let ussCount = 0;
    let xrayCount = 0;
    let ctMriCount = 0;
    let statCount = 0;
    let reportsPending = 0;

    activeOrdersRaw.forEach(o => {
      const mod = getNormalizedModality(o.modality, o.scanName);
      if (mod === 'ULTRASOUND') ussCount++;
      else if (mod === 'X-RAY') xrayCount++;
      else if (mod === 'CT' || mod === 'MRI') ctMriCount++;

      const isStat = o.priority === 'STAT / URGENT' || o.isUrgent || false;
      if (isStat) statCount++;

      if (o.status === 'IMAGE_READY') reportsPending++;
    });

    const transmitted = archiveOrders.length || 18;
    return { total, ussCount, xrayCount, ctMriCount, statCount, reportsPending, transmitted };
  }, [activeOrdersRaw, archiveOrders]);

  // Filtered Active Worklist
  const filteredActiveOrders = useMemo(() => {
    return activeOrdersRaw.filter(order => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pName = (order.patientName || order.patient || '').toLowerCase();
        const ehr = (order.patientEhrId || order.ehrId || order.ehrNumber || '').toLowerCase();
        const scan = (order.scanName || order.testName || order.procedureName || '').toLowerCase();
        const doc = (order.providerName || order.orderedBy || order.doctorName || '').toLowerCase();
        const ind = (order.indication || order.clinicalIndication || order.clinicalNotes || '').toLowerCase();
        const orderId = (order.id || '').toLowerCase();

        const matches = pName.includes(q) || ehr.includes(q) || scan.includes(q) || doc.includes(q) || ind.includes(q) || orderId.includes(q);
        if (!matches) return false;
      }

      // 2. Modality Filter
      if (selectedModality !== 'ALL') {
        const mod = getNormalizedModality(order.modality, order.scanName);
        if (mod !== selectedModality) return false;
      }

      // 3. Urgency Filter
      if (selectedUrgency !== 'ALL') {
        const isUrgent = order.priority === 'STAT / URGENT' || order.isUrgent || false;
        if (selectedUrgency === 'STAT' && !isUrgent) return false;
        if (selectedUrgency === 'ROUTINE' && isUrgent) return false;
      }

      // 4. Status Filter
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'PENDING' && order.status !== 'PENDING') return false;
        if (selectedStatus === 'IMAGE_READY' && order.status !== 'IMAGE_READY') return false;
      }

      return true;
    });
  }, [activeOrdersRaw, searchQuery, selectedModality, selectedUrgency, selectedStatus]);

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

  // Modality Visual Badging Configuration
  const getModalityBadge = (modality?: string, scanName?: string) => {
    const mod = getNormalizedModality(modality, scanName);

    switch (mod) {
      case 'X-RAY':
        return {
          label: 'X-RAY (DR/CR)',
          badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          icon: <Camera className="w-3.5 h-3.5 text-sky-400" />
        };
      case 'ULTRASOUND':
        return {
          label: 'ULTRASOUND (USS)',
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          icon: <Activity className="w-3.5 h-3.5 text-emerald-400" />
        };
      case 'CT':
        return {
          label: 'CT SCAN',
          badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
          icon: <Layers className="w-3.5 h-3.5 text-indigo-400" />
        };
      case 'MRI':
        return {
          label: 'MRI SCAN',
          badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        };
      default:
        return {
          label: 'SPECIAL IMAGING',
          badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
          icon: <Camera className="w-3.5 h-3.5 text-slate-400" />
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* ========================================== */}
      {/* 1. ENTERPRISE HERO COMMAND BANNER          */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden border border-slate-800">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-16 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 rounded-2xl text-indigo-400 shadow-inner">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Diagnostic Radiology Node
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  DICOM / PACS Hub
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white mt-1">
                IMAGING COMMAND CENTER
              </h1>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                Real-time modality worklists, STAT triage routing, and radiologist report transmission.
              </p>
            </div>
          </div>

          {/* Telemetry Modality Breakout Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 w-full lg:w-auto">
            {/* Total Active */}
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Active Queue</p>
              <p className="text-xl font-mono text-white font-black">{telemetryMetrics.total}</p>
            </div>

            {/* Ultrasound */}
            <div className="bg-slate-900/90 border border-emerald-500/30 p-3 rounded-xl bg-emerald-950/10">
              <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1">
                <Activity className="w-2.5 h-2.5" /> USS Sonography
              </p>
              <p className="text-xl font-mono text-emerald-300 font-black">{telemetryMetrics.ussCount}</p>
            </div>

            {/* X-Ray */}
            <div className="bg-slate-900/90 border border-sky-500/30 p-3 rounded-xl bg-sky-950/10">
              <p className="text-[9px] text-sky-400 font-black uppercase tracking-widest flex items-center gap-1">
                <Camera className="w-2.5 h-2.5" /> X-Ray (DR/CR)
              </p>
              <p className="text-xl font-mono text-sky-300 font-black">{telemetryMetrics.xrayCount}</p>
            </div>

            {/* CT / MRI */}
            <div className="bg-slate-900/90 border border-indigo-500/30 p-3 rounded-xl bg-indigo-950/10">
              <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest flex items-center gap-1">
                <Layers className="w-2.5 h-2.5" /> CT / MRI
              </p>
              <p className="text-xl font-mono text-indigo-300 font-black">{telemetryMetrics.ctMriCount}</p>
            </div>

            {/* STAT Requests */}
            <div className="bg-slate-900/90 border border-rose-500/40 p-3 rounded-xl bg-rose-950/20 col-span-2 sm:col-span-1 xl:col-span-1 shadow-rose-900/20 shadow-lg">
              <p className="text-[9px] text-rose-400 font-black uppercase tracking-widest flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" /> STAT / Emergency
              </p>
              <p className="text-xl font-mono text-rose-300 font-black">{telemetryMetrics.statCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. TAB TOGGLES (ACTIVE WORKLIST / ARCHIVE) */}
      {/* ========================================== */}
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-1">
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('ACTIVE')}
            className={`pb-3 px-6 text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === 'ACTIVE' 
                ? 'text-indigo-400 border-b-4 border-indigo-500 font-black' 
                : 'text-slate-400 hover:text-slate-200 border-b-4 border-transparent'
            }`}
          >
            ACTIVE WORKLIST ({activeOrdersRaw.length})
          </button>

          <button 
            onClick={() => setActiveTab('ARCHIVE')}
            className={`pb-3 px-6 text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === 'ARCHIVE' 
                ? 'text-indigo-400 border-b-4 border-indigo-500 font-black' 
                : 'text-slate-400 hover:text-slate-200 border-b-4 border-transparent'
            }`}
          >
            TRANSMITTED ARCHIVE ({telemetryMetrics.transmitted})
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>Live Telemetry Active</span>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. STICKY MODALITY & PRIORITY FILTER BAR   */}
      {/* ========================================== */}
      {activeTab === 'ACTIVE' && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-3.5 sticky top-2 z-20 backdrop-blur-md bg-opacity-95 dark:bg-opacity-95">
          
          {/* Top Row: Search & Status Selector */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient name, EHR #, order ID, procedure, doctor, or indication..."
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Status Quick Toggle */}
            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1 shrink-0">
                Worklist Status:
              </span>
              {[
                { id: 'ALL', label: 'All Active' },
                { id: 'PENDING', label: 'Awaiting Acquisition' },
                { id: 'IMAGE_READY', label: 'Ready for Reporting' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStatus(s.id)}
                  className={cn(
                    "px-3 py-1.5 text-[10px] font-black rounded-lg uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap",
                    selectedStatus === s.id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Row: Modality & Urgency Pill Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            
            {/* Modality Toggles */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-indigo-400" /> Modality Suite:
              </span>

              {[
                { id: 'ALL', label: `All (${activeOrdersRaw.length})` },
                { id: 'ULTRASOUND', label: `Ultrasound (${telemetryMetrics.ussCount})`, icon: <Activity className="w-3 h-3 text-emerald-400" /> },
                { id: 'X-RAY', label: `X-Ray (${telemetryMetrics.xrayCount})`, icon: <Camera className="w-3 h-3 text-sky-400" /> },
                { id: 'CT', label: 'CT Scan', icon: <Layers className="w-3 h-3 text-indigo-400" /> },
                { id: 'MRI', label: 'MRI', icon: <Sparkles className="w-3 h-3 text-purple-400" /> }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModality(m.id)}
                  className={cn(
                    "px-3 py-1 text-[10px] font-black rounded-full border uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                    selectedModality === m.id
                      ? "bg-slate-900 text-white border-indigo-500 shadow-md ring-1 ring-indigo-500/50"
                      : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-600"
                  )}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {/* Urgency Toggles */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-1">
                Triage Priority:
              </span>

              <button
                onClick={() => setSelectedUrgency('ALL')}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-black rounded-full border uppercase tracking-wider transition-all cursor-pointer",
                  selectedUrgency === 'ALL'
                    ? "bg-slate-900 text-white border-slate-600"
                    : "bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800"
                )}
              >
                All
              </button>

              <button
                onClick={() => setSelectedUrgency('STAT')}
                className={cn(
                  "px-3 py-1 text-[10px] font-black rounded-full border uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                  selectedUrgency === 'STAT'
                    ? "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-900/30"
                    : "bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20"
                )}
              >
                <Zap className="w-2.5 h-2.5 text-rose-400" />
                <span>STAT / Emergency ({telemetryMetrics.statCount})</span>
              </button>

              <button
                onClick={() => setSelectedUrgency('ROUTINE')}
                className={cn(
                  "px-3 py-1 text-[10px] font-black rounded-full border uppercase tracking-wider transition-all cursor-pointer",
                  selectedUrgency === 'ROUTINE'
                    ? "bg-slate-800 text-white border-slate-600 shadow"
                    : "bg-slate-50 dark:bg-slate-950 text-slate-400 border-slate-200 dark:border-slate-800"
                )}
              >
                Routine
              </button>
            </div>

          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* 4. HIGH-DENSITY WORKLIST GRID / CARDS      */}
      {/* ========================================== */}
      {areOrdersLoading ? (
        <div className="text-center p-16 text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl font-bold">
          <Loader2 className="h-9 w-9 animate-spin mx-auto mb-3 text-indigo-400" />
          Synchronizing DICOM imaging worklist & clinical telemetry...
        </div>
      ) : activeTab === 'ACTIVE' ? (
        filteredActiveOrders.length === 0 ? (
          <div className="text-center p-20 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 space-y-3">
            <Camera className="h-12 w-12 mx-auto text-slate-500" />
            <h3 className="text-sm font-black text-slate-300 uppercase tracking-wide">
              No Matching Imaging Requests Found
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery || selectedModality !== 'ALL' || selectedUrgency !== 'ALL'
                ? "No active scans match your filter criteria. Try resetting filters or clearing the search query."
                : "The radiology scan worklist is clear. New scan orders from Doctor Consulting, Triage, or Wards will stream here in real time."}
            </p>
            {(searchQuery || selectedModality !== 'ALL' || selectedUrgency !== 'ALL' || selectedStatus !== 'ALL') && (
              <Button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedModality('ALL');
                  setSelectedUrgency('ALL');
                  setSelectedStatus('ALL');
                }}
                variant="outline"
                className="mt-2 text-xs"
              >
                Reset All Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredActiveOrders.map((order) => {
              const needsUpload = order.status === 'PENDING';
              const paymentStatus = getOrderPaymentStatus(order);
              const isLocked = paymentPolicy === 'STRICT' && paymentStatus === 'UNPAID' && !emergencyOverrides[order.id];

              const patientName = order.patientName || order.patient || 'Patient Name';
              const ehrNumber = order.patientEhrId || order.ehrId || order.ehrNumber || 'MMH/EHR/26/0000';
              const scanTitle = order.scanName || order.testName || order.procedureName || 'Diagnostic Procedure';
              const providerName = order.providerName || order.orderedBy || order.doctorName || 'Attending Physician';
              const indication = order.indication || order.clinicalIndication || order.clinicalNotes || order.diagnosis || 'Clinical evaluation requested by attending medical officer.';
              const isUrgent = order.priority === 'STAT / URGENT' || order.isUrgent || false;
              const location = order.location || order.wardName || 'OPD Consulting';
              const genderAge = `${order.age || 'Adult'} • ${order.gender || 'Patient'}`;

              const modalityBadge = getModalityBadge(order.modality, scanTitle);
              const orderDate = safeToDate(order.orderedAt) || new Date();

              return (
                <div 
                  key={order.id} 
                  className={cn(
                    "bg-white dark:bg-slate-900 rounded-2xl shadow-sm border transition-all hover:shadow-xl p-5 flex flex-col justify-between space-y-4 group",
                    isUrgent 
                      ? "border-rose-500/40 bg-gradient-to-br from-rose-950/10 via-slate-900 to-slate-900" 
                      : "border-slate-200 dark:border-slate-800 hover:border-indigo-500/40"
                  )}
                >
                  {/* Top Bar: Modality, Priority & Telemetry Header */}
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      {/* Modality Badge */}
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm",
                          modalityBadge.badgeClass
                        )}>
                          {modalityBadge.icon}
                          <span>{modalityBadge.label}</span>
                        </span>

                        <span className="text-[10px] font-mono text-slate-400 font-bold">
                          {order.id}
                        </span>
                      </div>

                      {/* Urgency & Worklist Status */}
                      <div className="flex items-center gap-1.5">
                        {isUrgent ? (
                          <span className="text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse flex items-center gap-1 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> STAT / CRITICAL
                          </span>
                        ) : (
                          <span className="text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            ROUTINE
                          </span>
                        )}

                        <span className={cn(
                          "text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest border",
                          needsUpload 
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30" 
                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        )}>
                          {needsUpload ? 'AWAITING SCAN' : 'IMAGE READY'}
                        </span>
                      </div>
                    </div>

                    {/* Patient Banner: High Contrast Profile */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide text-sm">
                            {patientName}
                          </h3>
                          <span className="text-[10px] font-mono text-indigo-500 dark:text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                            {ehrNumber}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          <span>{genderAge}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            <MapPin className="w-3 h-3 text-rose-400" />
                            {location}
                          </span>
                        </div>
                      </div>

                      {/* Order Time Telemetry */}
                      <div className="text-right">
                        <p className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3 text-indigo-400" />
                          {formatDistanceToNow(orderDate, { addSuffix: true })}
                        </p>
                        <p className="text-[9px] font-mono text-slate-400 mt-0.5">
                          {format(orderDate, 'dd MMM, HH:mm')}
                        </p>
                      </div>
                    </div>

                    {/* Target Procedure & Clinical Details */}
                    <div className="mt-3.5 space-y-2.5">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                          <Camera className="w-3 h-3 text-indigo-400" />
                          <span>TARGET PROCEDURE & STUDY</span>
                        </p>
                        <p className="text-sm font-black text-indigo-600 dark:text-indigo-300 uppercase tracking-tight">
                          {scanTitle}
                        </p>
                      </div>

                      {/* Clinical Indication Callout */}
                      <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/90 space-y-1">
                        <p className="text-[9px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest flex items-center gap-1">
                          <Stethoscope className="w-3 h-3" />
                          <span>CLINICAL INDICATION & REASONING</span>
                        </p>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                          {indication}
                        </p>
                      </div>

                      {/* Ordering Doctor & Billing Pill */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-[10px] font-semibold text-slate-500">
                          Ordered by: <strong className="text-slate-800 dark:text-slate-200">{providerName.startsWith('Dr.') ? providerName : `Dr. ${providerName}`}</strong>
                        </span>

                        {paymentPolicy !== 'NONE' && (
                          <span className={cn(
                            "text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider",
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
                  </div>

                  {/* Payment Strict Emergency Override */}
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

                  {/* High-Contrast Action Worklist Buttons */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    {order.patientId && (
                      <Link 
                        href={`/patients/folder/${order.patientId}`}
                        className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black rounded-xl uppercase tracking-wider transition-colors flex items-center gap-1 shrink-0"
                        title="Open Patient EMR Folder"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Folder</span>
                      </Link>
                    )}

                    <Link 
                      href={`/radiology/upload/${order.id}`}
                      className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black rounded-xl uppercase tracking-wider transition-colors flex items-center gap-1 shrink-0"
                      title="Upload Scan Images / DICOM Series"
                    >
                      <Upload className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="hidden sm:inline">Upload PACS</span>
                    </Link>

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
                      className="flex-1 py-3 bg-indigo-950 hover:bg-indigo-900 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow transition-all flex items-center justify-center gap-2 border border-indigo-700 cursor-pointer disabled:opacity-50"
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
          <div className="text-center p-20 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400">
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
                  const modalityBadge = getModalityBadge(report.modality, report.scanName);

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
                          modalityBadge.badgeClass
                        )}>
                          {modalityBadge.label}: {report.scanName}
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
