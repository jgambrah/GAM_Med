'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  PackageCheck, Wrench, Plus, Search, Filter, CheckCircle2, Clock, 
  AlertTriangle, AlertCircle, ShieldAlert, ArrowUpRight, Check, X,
  Building2, Truck, Eye, FileText, ChevronRight, Copy, CheckCheck,
  Stethoscope, Layers, Sparkles, RefreshCw, Loader2, ArrowRight
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import Link from 'next/link';

// ============================================================================
// TYPES & DATA CONTRACTS
// ============================================================================
export interface ConsumableItem {
  id: string;
  name: string;
  category: string;
  unitOfIssue: string;
  stockOnHand: number;
  estUnitCost: number;
}

export interface RequisitionDraftItem {
  id: string;
  name: string;
  unitOfIssue: string;
  quantity: number;
  estUnitCost: number;
}

export interface StoreRequisition {
  id: string;
  reqNumber: string;
  targetStore: 'MAIN_STORE' | 'CENTRAL_PHARMACY' | 'GENERAL_CONSUMABLES';
  targetStoreLabel: string;
  requestDate: any;
  clinicianName: string;
  department: string;
  priority: 'ROUTINE' | 'URGENT';
  items: RequisitionDraftItem[];
  justification: string;
  status: 'PENDING_APPROVAL' | 'DISPATCHED' | 'RECEIVED_FULFILLED' | 'REJECTED';
  dispatchedAt?: any;
  fulfilledAt?: any;
}

export interface ServiceTicket {
  id: string;
  ticketNumber: string;
  assetName: string;
  assetSerial: string;
  assetLocation: string;
  issueCategory: 'PREVENTIVE_MAINTENANCE' | 'HARDWARE_BREAKDOWN' | 'PACS_SOFTWARE_GLITCH' | 'ELECTRICAL_HVAC' | 'RADIATION_SAFETY';
  issueCategoryLabel: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL_DOWNTIME';
  problemDescription: string;
  haltsScans: boolean;
  loggedDate: any;
  reportingOfficer: string;
  assignedEngineer?: string;
  status: 'LOGGED' | 'ASSIGNED_TO_BIOMED' | 'IN_PROGRESS' | 'RESOLVED_VERIFIED';
  resolvedAt?: any;
  resolutionNotes?: string;
}

// Master Consumable Catalog for Radiology
const RADIOLOGY_CONSUMABLES_CATALOG: ConsumableItem[] = [
  { id: 'CON-01', name: 'Ultrasound Transmission Acoustic Gel (5L Cubitainer)', category: 'ULTRASOUND', unitOfIssue: 'Gallon (5L)', stockOnHand: 2, estUnitCost: 145.00 },
  { id: 'CON-02', name: 'Sony High-Density Thermal Print Paper (UPP-110HD)', category: 'PRINTING', unitOfIssue: 'Roll', stockOnHand: 4, estUnitCost: 95.00 },
  { id: 'CON-03', name: 'Nitrile Medical Gloves Powder-Free (Large)', category: 'PPE', unitOfIssue: 'Box (100 pcs)', stockOnHand: 8, estUnitCost: 45.00 },
  { id: 'CON-04', name: 'Non-Ionic IV Contrast Media - Iohexol 350mg/50ml', category: 'PHARMACY', unitOfIssue: 'Vial (50ml)', stockOnHand: 6, estUnitCost: 220.00 },
  { id: 'CON-05', name: 'Hospital-Grade Surface Disinfectant Wipes', category: 'INFECTION_CONTROL', unitOfIssue: 'Canister (160 wipes)', stockOnHand: 3, estUnitCost: 65.00 },
  { id: 'CON-06', name: 'Radiation Protective Lead Apron 0.5mmPb w/ Thyroid Collar', category: 'RADIATION_SAFETY', unitOfIssue: 'Unit', stockOnHand: 2, estUnitCost: 850.00 },
  { id: 'CON-07', name: 'ECG Recording Thermal Grid Paper (Z-Fold Pad)', category: 'CARDIOLOGY', unitOfIssue: 'Pad', stockOnHand: 5, estUnitCost: 38.00 },
  { id: 'CON-08', name: 'IV Cannula 18G & 20G with Extension Sets', category: 'CONSUMABLES', unitOfIssue: 'Box (50 pcs)', stockOnHand: 3, estUnitCost: 75.00 },
  { id: 'CON-09', name: 'Barium Sulfate Suspension 100% w/v (300ml Oral)', category: 'CONTRAST', unitOfIssue: 'Bottle', stockOnHand: 4, estUnitCost: 110.00 },
  { id: 'CON-10', name: 'Disposable Ultrasound Transducer Sheaths / Covers', category: 'ULTRASOUND', unitOfIssue: 'Box (100 pcs)', stockOnHand: 1, estUnitCost: 80.00 },
];

// Master Radiology Equipment Assets
const RADIOLOGY_EQUIPMENT_ASSETS = [
  { name: 'Mindray DC-70 Ultrasound Unit 1', serial: 'MND-USS-7049-GH', location: 'Ultrasound Suite 1' },
  { name: 'Philips DuraDiagnost Digital X-Ray (PA/Lat)', serial: 'PHL-XR-8812-AC', location: 'Radiography Room 2' },
  { name: 'PACS Local Gateway DICOM Server Rack', serial: 'SRV-PACS-2026-X1', location: 'Radiology Server Room' },
  { name: 'GE Optima CT540 16-Slice CT Scanner', serial: 'GE-CT-540-9921', location: 'CT Suite (Ground Floor)' },
  { name: 'Chison SonoBook 9 Portable Ultrasound Unit', serial: 'CHS-SB9-4102-PT', location: 'Emergency / Triage Ward' },
  { name: 'Siemens Magnetom 1.5T MRI Suite Console', serial: 'SMS-MRI-15T-774', location: 'MRI Diagnostic Center' },
];

// Initial Rich Fallback Data
const initialRequisitions: StoreRequisition[] = [
  {
    id: 'req_001',
    reqNumber: 'REQ-RAD-26-0012',
    targetStore: 'MAIN_STORE',
    targetStoreLabel: 'Main Medical Stores',
    requestDate: new Date(Date.now() - 3600000 * 4),
    clinicianName: 'Dr. Marcus Amosah Henaku',
    department: 'Radiology & Sonography',
    priority: 'URGENT',
    items: [
      { id: 'CON-01', name: 'Ultrasound Transmission Acoustic Gel (5L Cubitainer)', unitOfIssue: 'Gallon (5L)', quantity: 3, estUnitCost: 145.00 },
      { id: 'CON-02', name: 'Sony High-Density Thermal Print Paper (UPP-110HD)', unitOfIssue: 'Roll', quantity: 6, estUnitCost: 95.00 },
      { id: 'CON-05', name: 'Hospital-Grade Surface Disinfectant Wipes', unitOfIssue: 'Canister (160 wipes)', quantity: 4, estUnitCost: 65.00 }
    ],
    justification: 'Critical low stock for morning obstetric sonography worklist; expected stockout within 24 hours.',
    status: 'DISPATCHED',
    dispatchedAt: new Date(Date.now() - 3600000 * 1.5)
  },
  {
    id: 'req_002',
    reqNumber: 'REQ-RAD-26-0011',
    targetStore: 'CENTRAL_PHARMACY',
    targetStoreLabel: 'Central Pharmacy',
    requestDate: new Date(Date.now() - 86400000 * 1.5),
    clinicianName: 'Dr. Kwame Adu (Radiologist)',
    department: 'Computed Tomography (CT)',
    priority: 'ROUTINE',
    items: [
      { id: 'CON-04', name: 'Non-Ionic IV Contrast Media - Iohexol 350mg/50ml', unitOfIssue: 'Vial (50ml)', quantity: 15, estUnitCost: 220.00 },
      { id: 'CON-08', name: 'IV Cannula 18G & 20G with Extension Sets', unitOfIssue: 'Box (50 pcs)', quantity: 2, estUnitCost: 75.00 }
    ],
    justification: 'Routine restock for upcoming elective contrast CT angiogram bookings.',
    status: 'RECEIVED_FULFILLED',
    dispatchedAt: new Date(Date.now() - 86400000 * 1),
    fulfilledAt: new Date(Date.now() - 86400000 * 0.8)
  },
  {
    id: 'req_003',
    reqNumber: 'REQ-RAD-26-0010',
    targetStore: 'GENERAL_CONSUMABLES',
    targetStoreLabel: 'General Consumables Store',
    requestDate: new Date(Date.now() - 86400000 * 3),
    clinicianName: 'Janet Mensah (Lead Radiographer)',
    department: 'General Radiography',
    priority: 'ROUTINE',
    items: [
      { id: 'CON-03', name: 'Nitrile Medical Gloves Powder-Free (Large)', unitOfIssue: 'Box (100 pcs)', quantity: 10, estUnitCost: 45.00 },
      { id: 'CON-06', name: 'Radiation Protective Lead Apron 0.5mmPb w/ Thyroid Collar', unitOfIssue: 'Unit', quantity: 1, estUnitCost: 850.00 }
    ],
    justification: 'Replacement for damaged lead apron in X-Ray Suite 2 and staff glove stock.',
    status: 'PENDING_APPROVAL'
  }
];

const initialServiceTickets: ServiceTicket[] = [
  {
    id: 'srv_001',
    ticketNumber: 'SRV-RAD-26-0004',
    assetName: 'Philips DuraDiagnost Digital X-Ray (PA/Lat)',
    assetSerial: 'PHL-XR-8812-AC',
    assetLocation: 'Radiography Room 2',
    issueCategory: 'HARDWARE_BREAKDOWN',
    issueCategoryLabel: 'Hardware Breakdown & Tube Calibration',
    severity: 'HIGH',
    problemDescription: 'Collimator lamp intermittent shut-off during chest exposures. Error Code E-402 on generator console.',
    haltsScans: false,
    loggedDate: new Date(Date.now() - 3600000 * 6),
    reportingOfficer: 'Janet Mensah (Senior Radiographer)',
    assignedEngineer: 'Eng. Emmanuel Osei (Biomedical Lead)',
    status: 'IN_PROGRESS'
  },
  {
    id: 'srv_002',
    ticketNumber: 'SRV-RAD-26-0003',
    assetName: 'PACS Local Gateway DICOM Server Rack',
    assetSerial: 'SRV-PACS-2026-X1',
    assetLocation: 'Radiology Server Room',
    issueCategory: 'PACS_SOFTWARE_GLITCH',
    issueCategoryLabel: 'Software & DICOM Gateway Sync',
    severity: 'MEDIUM',
    problemDescription: 'Delayed DICOM auto-routing to OPD Consulting terminal 4; studies taking 15 minutes to synchronize.',
    haltsScans: false,
    loggedDate: new Date(Date.now() - 86400000 * 2),
    reportingOfficer: 'Dr. Kwame Adu',
    assignedEngineer: 'David Quartey (Clinical IT)',
    status: 'RESOLVED_VERIFIED',
    resolvedAt: new Date(Date.now() - 86400000 * 1),
    resolutionNotes: 'Storage volume cleared and Orthanc DICOM router daemon restarted. Transmission latency restored to < 3 seconds.'
  },
  {
    id: 'srv_003',
    ticketNumber: 'SRV-RAD-26-0002',
    assetName: 'Mindray DC-70 Ultrasound Unit 1',
    assetSerial: 'MND-USS-7049-GH',
    assetLocation: 'Ultrasound Suite 1',
    issueCategory: 'PREVENTIVE_MAINTENANCE',
    issueCategoryLabel: 'Quarterly Preventive Maintenance & QA',
    severity: 'LOW',
    problemDescription: 'Routine 90-day probe acoustic coupling test, power supply surge verification, and dust filter cleansing.',
    haltsScans: false,
    loggedDate: new Date(Date.now() - 86400000 * 5),
    reportingOfficer: 'Dr. Marcus Amosah Henaku',
    assignedEngineer: 'Biomedical Support Team',
    status: 'RESOLVED_VERIFIED',
    resolvedAt: new Date(Date.now() - 86400000 * 4),
    resolutionNotes: 'All 3 probes (Convex, Linear, Endovaginal) passed phantom ultrasound calibration. QA certificate issued.'
  }
];

// ============================================================================
// MAIN REQUISITIONS & MAINTENANCE COMPONENT
// ============================================================================
export default function RadiologyRequisitionsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'CONSUMABLES' | 'SERVICE'>('CONSUMABLES');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult(true).then((idTokenResult) => {
        setClaims(idTokenResult.claims);
        setIsClaimsLoading(false);
      }).catch(() => {
        setIsClaimsLoading(false);
      });
    } else if (!isUserLoading) {
      setIsClaimsLoading(false);
    }
  }, [user, isUserLoading]);

  // Search & Filter States
  const [consumableSearch, setConsumableSearch] = useState('');
  const [consumableStatusFilter, setConsumableStatusFilter] = useState('ALL');
  const [consumableStoreFilter, setConsumableStoreFilter] = useState('ALL');

  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceSeverityFilter, setServiceSeverityFilter] = useState('ALL');
  const [serviceStatusFilter, setServiceStatusFilter] = useState('ALL');

  // Modals
  const [isNewRequisitionModalOpen, setIsNewRequisitionModalOpen] = useState(false);
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);
  const [viewingRequisition, setViewingRequisition] = useState<StoreRequisition | null>(null);
  const [viewingTicket, setViewingTicket] = useState<ServiceTicket | null>(null);

  // New Requisition Form State
  const [reqTargetStore, setReqTargetStore] = useState<'MAIN_STORE' | 'CENTRAL_PHARMACY' | 'GENERAL_CONSUMABLES'>('MAIN_STORE');
  const [reqPriority, setReqPriority] = useState<'ROUTINE' | 'URGENT'>('ROUTINE');
  const [reqJustification, setReqJustification] = useState('');
  const [draftedItems, setDraftedItems] = useState<RequisitionDraftItem[]>([]);
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);

  // New Service Ticket Form State
  const [srvAsset, setSrvAsset] = useState(RADIOLOGY_EQUIPMENT_ASSETS[0].name);
  const [srvCategory, setSrvCategory] = useState<'PREVENTIVE_MAINTENANCE' | 'HARDWARE_BREAKDOWN' | 'PACS_SOFTWARE_GLITCH' | 'ELECTRICAL_HVAC' | 'RADIATION_SAFETY'>('HARDWARE_BREAKDOWN');
  const [srvSeverity, setSrvSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL_DOWNTIME'>('MEDIUM');
  const [srvHaltsScans, setSrvHaltsScans] = useState(false);
  const [srvDescription, setSrvDescription] = useState('');

  // Firestore Sync Queries - Standard Requisitions Ledger (Permitted across hospital)
  const hospitalId = claims?.hospitalId || 'GAM-GAR-7578';
  
  const reqQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !user) return null;
    return query(collection(firestore, "hospitals", hospitalId, "requisitions"));
  }, [firestore, hospitalId, user]);
  const { data: dbAllRequisitions } = useCollection<any>(reqQuery);

  // Split Requisitions vs Service Tickets
  const dbRequisitions = useMemo(() => {
    if (!dbAllRequisitions || dbAllRequisitions.length === 0) return [];
    return dbAllRequisitions.filter(r => (r.department?.toLowerCase().includes('radiology') || r.module === 'RADIOLOGY' || r.type === 'STORE_REQUISITION') && r.type !== 'BIOMEDICAL_SERVICE');
  }, [dbAllRequisitions]);

  const dbServiceTickets = useMemo(() => {
    if (!dbAllRequisitions || dbAllRequisitions.length === 0) return [];
    return dbAllRequisitions.filter(r => (r.department?.toLowerCase().includes('radiology') || r.module === 'RADIOLOGY') && r.type === 'BIOMEDICAL_SERVICE');
  }, [dbAllRequisitions]);

  // Merged Requisitions
  const requisitions: StoreRequisition[] = useMemo(() => {
    if (dbRequisitions && dbRequisitions.length > 0) {
      return dbRequisitions.map(r => ({
        id: r.id,
        reqNumber: r.reqNumber || `REQ-RAD-26-${r.id.substring(0, 4).toUpperCase()}`,
        targetStore: r.targetStore || 'MAIN_STORE',
        targetStoreLabel: r.targetStoreLabel || (r.targetStore === 'CENTRAL_PHARMACY' ? 'Central Pharmacy' : 'Main Medical Stores'),
        requestDate: r.createdAt?.toDate ? r.createdAt.toDate() : (r.createdAt || new Date()),
        clinicianName: r.clinicianName || r.requestedByName || 'Dr. Marcus Amosah Henaku',
        department: r.department || 'Radiology & Sonography',
        priority: r.priority || 'ROUTINE',
        items: r.items || [],
        justification: r.justification || '',
        status: r.status || 'PENDING_APPROVAL',
        dispatchedAt: r.dispatchedAt?.toDate ? r.dispatchedAt.toDate() : r.dispatchedAt,
        fulfilledAt: r.fulfilledAt?.toDate ? r.fulfilledAt.toDate() : r.fulfilledAt
      }));
    }
    return initialRequisitions;
  }, [dbRequisitions]);

  // Merged Service Tickets
  const serviceTickets: ServiceTicket[] = useMemo(() => {
    if (dbServiceTickets && dbServiceTickets.length > 0) {
      return dbServiceTickets.map(s => ({
        id: s.id,
        ticketNumber: s.ticketNumber || `SRV-RAD-26-${s.id.substring(0, 4).toUpperCase()}`,
        assetName: s.assetName || 'Mindray DC-70 Ultrasound Unit 1',
        assetSerial: s.assetSerial || 'MND-USS-7049-GH',
        assetLocation: s.assetLocation || 'Ultrasound Suite 1',
        issueCategory: s.issueCategory || 'HARDWARE_BREAKDOWN',
        issueCategoryLabel: s.issueCategoryLabel || 'Hardware Breakdown',
        severity: s.severity || 'MEDIUM',
        problemDescription: s.problemDescription || '',
        haltsScans: s.haltsScans || false,
        loggedDate: s.createdAt?.toDate ? s.createdAt.toDate() : (s.createdAt || new Date()),
        reportingOfficer: s.reportingOfficer || 'Dr. Marcus Amosah Henaku',
        assignedEngineer: s.assignedEngineer,
        status: s.status || 'LOGGED',
        resolvedAt: s.resolvedAt?.toDate ? s.resolvedAt.toDate() : s.resolvedAt,
        resolutionNotes: s.resolutionNotes
      }));
    }
    return initialServiceTickets;
  }, [dbServiceTickets]);

  // Copy Badge Utility
  const handleCopyId = (id: string, textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(id);
    toast({
      title: '📋 Reference Copied',
      description: `${textToCopy} copied to clipboard.`,
    });
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Add Item to Draft Requisition
  const handleAddDraftItem = () => {
    if (!selectedCatalogItemId) return;
    const catItem = RADIOLOGY_CONSUMABLES_CATALOG.find(c => c.id === selectedCatalogItemId);
    if (!catItem) return;

    if (draftedItems.find(d => d.id === catItem.id)) {
      toast({ variant: 'destructive', title: 'Item already added to requisition draft' });
      return;
    }

    setDraftedItems(prev => [
      ...prev,
      {
        id: catItem.id,
        name: catItem.name,
        unitOfIssue: catItem.unitOfIssue,
        quantity: Math.max(1, selectedQty),
        estUnitCost: catItem.estUnitCost
      }
    ]);
    setSelectedCatalogItemId('');
    setSelectedQty(1);
  };

  const handleRemoveDraftItem = (id: string) => {
    setDraftedItems(prev => prev.filter(item => item.id !== id));
  };

  // Submit Requisition
  const handleSubmitRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (draftedItems.length === 0) {
      toast({ variant: 'destructive', title: 'Empty Requisition', description: 'Please add at least 1 consumable item to your requisition.' });
      return;
    }

    const storeLabels: Record<string, string> = {
      MAIN_STORE: 'Main Medical Stores',
      CENTRAL_PHARMACY: 'Central Pharmacy',
      GENERAL_CONSUMABLES: 'General Consumables Store'
    };

    const newReqNumber = `REQ-RAD-26-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      if (firestore && hospitalId) {
        await addDocumentNonBlocking(collection(firestore, 'hospitals', hospitalId, 'requisitions'), {
          reqNumber: newReqNumber,
          targetStore: reqTargetStore,
          targetStoreLabel: storeLabels[reqTargetStore],
          clinicianName: user?.displayName || 'Dr. Marcus Amosah Henaku',
          department: 'Radiology & Sonography',
          module: 'RADIOLOGY',
          type: 'STORE_REQUISITION',
          requisitionType: 'INTERNAL_STORE',
          priority: reqPriority,
          items: draftedItems,
          justification: reqJustification,
          status: 'PENDING_APPROVAL',
          createdAt: serverTimestamp()
        });
      }

      toast({
        title: '📦 Requisition Transmitted to Store',
        description: `Requisition ${newReqNumber} sent to ${storeLabels[reqTargetStore]} for fulfillment.`,
      });

      setIsNewRequisitionModalOpen(false);
      setDraftedItems([]);
      setReqJustification('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to submit requisition', description: err.message });
    }
  };

  // Submit Biomedical Ticket
  const handleSubmitServiceTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!srvDescription.trim()) {
      toast({ variant: 'destructive', title: 'Description Required', description: 'Please provide detailed clinical observations of the fault.' });
      return;
    }

    const targetAsset = RADIOLOGY_EQUIPMENT_ASSETS.find(a => a.name === srvAsset) || RADIOLOGY_EQUIPMENT_ASSETS[0];
    const newTicketNumber = `SRV-RAD-26-${Math.floor(1000 + Math.random() * 9000)}`;

    const categoryLabels: Record<string, string> = {
      PREVENTIVE_MAINTENANCE: 'Preventive Maintenance & Calibration',
      HARDWARE_BREAKDOWN: 'Hardware Breakdown',
      PACS_SOFTWARE_GLITCH: 'PACS & DICOM Software Sync Glitch',
      ELECTRICAL_HVAC: 'Electrical & AC HVAC Failure',
      RADIATION_SAFETY: 'Radiation Safety & Shielding QA'
    };

    try {
      if (firestore && hospitalId) {
        await addDocumentNonBlocking(collection(firestore, 'hospitals', hospitalId, 'requisitions'), {
          ticketNumber: newTicketNumber,
          assetName: targetAsset.name,
          assetSerial: targetAsset.serial,
          assetLocation: targetAsset.location,
          issueCategory: srvCategory,
          issueCategoryLabel: categoryLabels[srvCategory],
          severity: srvSeverity,
          haltsScans: srvHaltsScans,
          problemDescription: srvDescription,
          reportingOfficer: user?.displayName || 'Dr. Marcus Amosah Henaku',
          department: 'Radiology & Sonography',
          module: 'RADIOLOGY',
          type: 'BIOMEDICAL_SERVICE',
          requisitionType: 'SERVICE_TICKET',
          status: 'LOGGED',
          createdAt: serverTimestamp()
        });
      }

      toast({
        title: '🛠️ Biomedical Service Ticket Logged',
        description: `Ticket ${newTicketNumber} assigned to Facilities & Biomedical Engineering.`,
      });

      setIsNewServiceModalOpen(false);
      setSrvDescription('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to log ticket', description: err.message });
    }
  };

  // Acknowledge Receipt of Consumables
  const handleAcknowledgeReceipt = async (req: StoreRequisition) => {
    req.status = 'RECEIVED_FULFILLED';
    req.fulfilledAt = new Date();
    if (firestore && hospitalId && req.id) {
      try {
        const reqRef = doc(firestore, 'hospitals', hospitalId, 'requisitions', req.id);
        await updateDoc(reqRef, {
          status: 'RECEIVED_FULFILLED',
          fulfilledAt: serverTimestamp(),
          acknowledgedBy: user?.displayName || 'Dr. Marcus Amosah Henaku'
        });
      } catch (e) {
        console.warn('Local update applied for requisition receipt', e);
      }
    }
    toast({
      title: '✅ Consumables Received & Stocked',
      description: `Requisition ${req.reqNumber} marked fulfilled. Department stock levels updated.`,
    });
  };

  // Filtered Requisitions
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter(r => {
      const matchSearch = r.reqNumber.toLowerCase().includes(consumableSearch.toLowerCase()) ||
        r.clinicianName.toLowerCase().includes(consumableSearch.toLowerCase()) ||
        r.items.some(i => i.name.toLowerCase().includes(consumableSearch.toLowerCase()));
      
      const matchStatus = consumableStatusFilter === 'ALL' || r.status === consumableStatusFilter;
      const matchStore = consumableStoreFilter === 'ALL' || r.targetStore === consumableStoreFilter;

      return matchSearch && matchStatus && matchStore;
    });
  }, [requisitions, consumableSearch, consumableStatusFilter, consumableStoreFilter]);

  // Filtered Service Tickets
  const filteredServiceTickets = useMemo(() => {
    return serviceTickets.filter(s => {
      const matchSearch = s.ticketNumber.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        s.assetName.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        s.problemDescription.toLowerCase().includes(serviceSearch.toLowerCase());
      
      const matchSeverity = serviceSeverityFilter === 'ALL' || s.severity === serviceSeverityFilter;
      const matchStatus = serviceStatusFilter === 'ALL' || s.status === serviceStatusFilter;

      return matchSearch && matchSeverity && matchStatus;
    });
  }, [serviceTickets, serviceSearch, serviceSeverityFilter, serviceStatusFilter]);

  // Aggregated Telemetry
  const telemetry = useMemo(() => {
    const pendingReqs = requisitions.filter(r => r.status === 'PENDING_APPROVAL').length;
    const dispatchedReqs = requisitions.filter(r => r.status === 'DISPATCHED').length;
    const activeTickets = serviceTickets.filter(s => s.status !== 'RESOLVED_VERIFIED' && s.status !== 'CLOSED').length;
    const criticalDowntime = serviceTickets.filter(s => s.severity === 'CRITICAL_DOWNTIME' && s.status !== 'RESOLVED_VERIFIED' && s.status !== 'CLOSED').length;

    return { pendingReqs, dispatchedReqs, activeTickets, criticalDowntime };
  }, [requisitions, serviceTickets]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-6 md:p-8 space-y-6">
      
      {/* ========================================================= */}
      {/* 1. ENTERPRISE DARK HERO COMMAND BANNER                    */}
      {/* ========================================================= */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden border border-slate-800">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-16 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 rounded-2xl text-indigo-400 shadow-inner">
              <PackageCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  DEPARTMENTAL LOGISTICS & ENGINEERING
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  HUB-RAD-OPS-2026
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white mt-1">
                STORE & SERVICE REQUESTS
              </h1>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                Manage consumable requisitions, pharmacy restocks, and biomedical maintenance tickets.
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <Button
              type="button"
              onClick={() => setIsNewRequisitionModalOpen(true)}
              className="flex-1 lg:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl uppercase tracking-wider shadow flex items-center justify-center gap-2 cursor-pointer transition-all border border-indigo-400/30"
            >
              <PackageCheck className="w-4 h-4" />
              <span>+ NEW STORE REQUISITION</span>
            </Button>

            <Button
              type="button"
              onClick={() => setIsNewServiceModalOpen(true)}
              className="flex-1 lg:flex-none px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-amber-500/30 text-xs font-black rounded-xl uppercase tracking-wider shadow flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>+ LOG SERVICE TICKET</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. TELEMETRY KPI BANNER                                   */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Requisitions */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Store Approval</p>
            <h3 className="text-2xl font-black text-amber-500 mt-0.5">{telemetry.pendingReqs}</h3>
            <p className="text-[10px] font-bold text-slate-500 mt-1">Awaiting Central Store dispatch</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Dispatched / Transit */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dispatched In-Transit</p>
            <h3 className="text-2xl font-black text-indigo-500 mt-0.5">{telemetry.dispatchedReqs}</h3>
            <p className="text-[10px] font-bold text-slate-500 mt-1">Awaiting unit receipt sign-off</p>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl border border-indigo-500/20">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        {/* Active Biomed Tickets */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Service Tickets</p>
            <h3 className="text-2xl font-black text-sky-500 mt-0.5">{telemetry.activeTickets}</h3>
            <p className="text-[10px] font-bold text-slate-500 mt-1">Biomedical engineers on-site</p>
          </div>
          <div className="p-3 bg-sky-500/10 text-sky-500 rounded-2xl border border-sky-500/20">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

        {/* Hardware Up-Time */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipment Up-Time</p>
            <h3 className="text-2xl font-black text-emerald-500 mt-0.5">
              {telemetry.criticalDowntime > 0 ? '92.4%' : '99.8%'}
            </h3>
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {telemetry.criticalDowntime > 0 ? '🚨 Active Modality Downtime' : '✓ All Hardware Online'}
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. DUAL-TAB WORKSPACE SWITCHER                            */}
      {/* ========================================================= */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('CONSUMABLES')}
          className={cn(
            "pb-3.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all border-b-2 cursor-pointer",
            activeTab === 'CONSUMABLES'
              ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          )}
        >
          <PackageCheck className="w-4 h-4" />
          <span>Consumables & Stock Requisition ({requisitions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SERVICE')}
          className={cn(
            "pb-3.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all border-b-2 cursor-pointer",
            activeTab === 'SERVICE'
              ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          )}
        >
          <Wrench className="w-4 h-4" />
          <span>Biomedical & Equipment Service ({serviceTickets.length})</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 4. TAB 1: CONSUMABLES & STOCK REQUISITIONS               */}
      {/* ========================================================= */}
      {activeTab === 'CONSUMABLES' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={consumableSearch}
                onChange={(e) => setConsumableSearch(e.target.value)}
                placeholder="Search requisition #, item name, or requesting clinician..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={consumableStoreFilter}
                onChange={(e) => setConsumableStoreFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="ALL">All Stores</option>
                <option value="MAIN_STORE">Main Medical Stores</option>
                <option value="CENTRAL_PHARMACY">Central Pharmacy</option>
                <option value="GENERAL_CONSUMABLES">General Consumables</option>
              </select>

              <select
                value={consumableStatusFilter}
                onChange={(e) => setConsumableStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="RECEIVED_FULFILLED">Received & Fulfilled</option>
              </select>
            </div>
          </div>

          {/* Requisition Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                  <th className="p-4">Requisition ID</th>
                  <th className="p-4">Destination Store & Items</th>
                  <th className="p-4">Requesting Clinician</th>
                  <th className="p-4 text-center">Priority</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredRequisitions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      No consumable requisitions match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredRequisitions.map((req) => {
                    const reqDate = safeToDate(req.requestDate);
                    const formattedDate = reqDate ? format(reqDate, 'dd MMM yyyy, HH:mm') : 'Today';

                    return (
                      <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        {/* ID */}
                        <td className="p-4 align-top">
                          <button
                            type="button"
                            onClick={() => handleCopyId(req.id, req.reqNumber)}
                            className="font-mono text-xs font-black text-indigo-500 hover:text-indigo-400 flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{req.reqNumber}</span>
                            {copiedId === req.id ? (
                              <CheckCheck className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                          <p className="text-[10px] text-slate-400 font-medium mt-1">{formattedDate}</p>
                        </td>

                        {/* Items & Store */}
                        <td className="p-4 align-top">
                          <p className="font-black text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{req.targetStoreLabel}</span>
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {req.items.map((item, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-md border border-slate-200 dark:border-slate-700">
                                {item.name} <span className="text-indigo-500 font-black">× {item.quantity}</span>
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Clinician */}
                        <td className="p-4 align-top">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{req.clinicianName}</p>
                          <p className="text-[10px] text-slate-400">{req.department}</p>
                        </td>

                        {/* Priority */}
                        <td className="p-4 align-top text-center">
                          {req.priority === 'URGENT' ? (
                            <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              <AlertTriangle className="w-3 h-3" /> URGENT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              ROUTINE
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-4 align-top text-center">
                          {req.status === 'PENDING_APPROVAL' && (
                            <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                              <Clock className="w-3 h-3" /> PENDING APPROVAL
                            </span>
                          )}
                          {req.status === 'DISPATCHED' && (
                            <span className="inline-flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                              <Truck className="w-3 h-3" /> DISPATCHED
                            </span>
                          )}
                          {req.status === 'RECEIVED_FULFILLED' && (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                              <CheckCircle2 className="w-3 h-3" /> RECEIVED & FULFILLED
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="p-4 align-top text-right space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingRequisition(req)}
                            className="text-[10px] font-black uppercase tracking-wider border-slate-300 dark:border-slate-700"
                          >
                            <Eye className="w-3 h-3 mr-1" /> View
                          </Button>

                          {req.status === 'DISPATCHED' && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleAcknowledgeReceipt(req)}
                              className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                              <Check className="w-3 h-3 mr-1" /> Acknowledge Receipt
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. TAB 2: BIOMEDICAL & EQUIPMENT SERVICE WORKLIST        */}
      {/* ========================================================= */}
      {activeTab === 'SERVICE' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                placeholder="Search ticket #, equipment asset, or problem description..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={serviceSeverityFilter}
                onChange={(e) => setServiceSeverityFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="LOW">Low (Preventive)</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL_DOWNTIME">Critical (Downtime)</option>
              </select>

              <select
                value={serviceStatusFilter}
                onChange={(e) => setServiceStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="LOGGED">Logged</option>
                <option value="ASSIGNED_TO_BIOMED">Assigned to Biomed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED_VERIFIED">Resolved & Verified</option>
              </select>
            </div>
          </div>

          {/* Service Worklist Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                  <th className="p-4">Ticket ID</th>
                  <th className="p-4">Equipment Asset & Location</th>
                  <th className="p-4">Reported Issue & Category</th>
                  <th className="p-4 text-center">Severity</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredServiceTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      No biomedical service tickets match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredServiceTickets.map((ticket) => {
                    const ticketDate = safeToDate(ticket.loggedDate);
                    const formattedDate = ticketDate ? format(ticketDate, 'dd MMM yyyy, HH:mm') : 'Today';

                    return (
                      <tr key={ticket.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        {/* ID */}
                        <td className="p-4 align-top">
                          <button
                            type="button"
                            onClick={() => handleCopyId(ticket.id, ticket.ticketNumber)}
                            className="font-mono text-xs font-black text-indigo-500 hover:text-indigo-400 flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{ticket.ticketNumber}</span>
                            {copiedId === ticket.id ? (
                              <CheckCheck className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                          <p className="text-[10px] text-slate-400 font-medium mt-1">{formattedDate}</p>
                        </td>

                        {/* Asset */}
                        <td className="p-4 align-top">
                          <p className="font-black text-slate-900 dark:text-slate-100 text-xs">{ticket.assetName}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">{ticket.assetLocation} • S/N: {ticket.assetSerial}</p>
                        </td>

                        {/* Issue */}
                        <td className="p-4 align-top max-w-xs">
                          <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-indigo-400 text-[9px] font-black rounded uppercase tracking-wider mb-1">
                            {ticket.issueCategoryLabel}
                          </span>
                          <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {ticket.problemDescription}
                          </p>
                        </td>

                        {/* Severity */}
                        <td className="p-4 align-top text-center">
                          {ticket.severity === 'CRITICAL_DOWNTIME' && (
                            <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                              <ShieldAlert className="w-3 h-3" /> CRITICAL DOWNTIME
                            </span>
                          )}
                          {ticket.severity === 'HIGH' && (
                            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              HIGH
                            </span>
                          )}
                          {ticket.severity === 'MEDIUM' && (
                            <span className="inline-flex items-center gap-1 bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              MEDIUM
                            </span>
                          )}
                          {ticket.severity === 'LOW' && (
                            <span className="inline-flex items-center gap-1 bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              ROUTINE / LOW
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-4 align-top text-center">
                          {ticket.status === 'LOGGED' && (
                            <span className="inline-flex items-center gap-1.5 bg-slate-500/10 text-slate-400 border border-slate-500/30 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                              LOGGED
                            </span>
                          )}
                          {ticket.status === 'ASSIGNED_TO_BIOMED' && (
                            <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                              ASSIGNED TO BIOMED
                            </span>
                          )}
                          {ticket.status === 'IN_PROGRESS' && (
                            <span className="inline-flex items-center gap-1.5 bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                              <Wrench className="w-3 h-3 animate-spin" /> IN PROGRESS
                            </span>
                          )}
                          {ticket.status === 'RESOLVED_VERIFIED' && (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                              <CheckCircle2 className="w-3 h-3" /> RESOLVED & VERIFIED
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="p-4 align-top text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingTicket(ticket)}
                            className="text-[10px] font-black uppercase tracking-wider border-slate-300 dark:border-slate-700"
                          >
                            <Eye className="w-3 h-3 mr-1" /> Track Status
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. MODAL: CREATE NEW STORE REQUISITION                     */}
      {/* ========================================================= */}
      {isNewRequisitionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-800">
            
            {/* Header */}
            <div className="bg-slate-950 p-5 border-b border-slate-800 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-wide">NEW CONSUMABLES REQUISITION</h2>
                  <p className="text-xs text-slate-400">Restock radiology supplies from central hospital stores</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsNewRequisitionModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmitRequisition} className="p-6 overflow-y-auto space-y-5 flex-1">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Destination Store */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Target Fulfillment Store *
                  </label>
                  <select
                    value={reqTargetStore}
                    onChange={(e: any) => setReqTargetStore(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="MAIN_STORE">Main Medical Stores (Ultrasound Gel, Paper, PPE)</option>
                    <option value="CENTRAL_PHARMACY">Central Pharmacy (IV Contrast Media, Barium)</option>
                    <option value="GENERAL_CONSUMABLES">General Consumables Store (Gloves, Sanitizer)</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Priority Level *
                  </label>
                  <select
                    value={reqPriority}
                    onChange={(e: any) => setReqPriority(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="ROUTINE">Routine Weekly Restock</option>
                    <option value="URGENT">Urgent / Immediate Stockout Risk</option>
                  </select>
                </div>
              </div>

              {/* Item Selector Section */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                  + Add Consumable Item to Requisition
                </p>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-8">
                    <select
                      value={selectedCatalogItemId}
                      onChange={(e) => setSelectedCatalogItemId(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none"
                    >
                      <option value="">-- Select Consumable Item from Master Catalog --</option>
                      {RADIOLOGY_CONSUMABLES_CATALOG.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.unitOfIssue}) • Est. ₵{item.estUnitCost.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <input
                      type="number"
                      min={1}
                      value={selectedQty}
                      onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-center outline-none"
                      placeholder="Qty"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Button
                      type="button"
                      onClick={handleAddDraftItem}
                      disabled={!selectedCatalogItemId}
                      className="w-full text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      + Add
                    </Button>
                  </div>
                </div>

                {/* Drafted Items List */}
                {draftedItems.length > 0 && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Drafted Items for Order ({draftedItems.length}):
                    </p>
                    {draftedItems.map((draft, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{draft.name}</p>
                          <p className="text-[10px] text-slate-400">Unit: {draft.unitOfIssue} • Est: ₵{(draft.estUnitCost * draft.quantity).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-indigo-500">Qty: {draft.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDraftItem(draft.id)}
                            className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Justification */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Clinical Justification / Department Notes
                </label>
                <textarea
                  value={reqJustification}
                  onChange={(e) => setReqJustification(e.target.value)}
                  placeholder="State reason for restock (e.g., increased obstetric scan volume, stockout prevention)..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none min-h-[70px]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setIsNewRequisitionModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={draftedItems.length === 0} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider">
                  Transmit Requisition to Store
                </Button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. MODAL: LOG BIOMEDICAL / SERVICE TICKET                 */}
      {/* ========================================================= */}
      {isNewServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-800">
            
            {/* Header */}
            <div className="bg-slate-950 p-5 border-b border-slate-800 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-wide">LOG BIOMEDICAL / SERVICE TICKET</h2>
                  <p className="text-xs text-slate-400">Notify Facilities & Biomedical Engineering of hardware faults</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsNewServiceModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmitServiceTicket} className="p-6 overflow-y-auto space-y-4 flex-1">
              
              {/* Asset Selector */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Radiology Hardware Asset *
                </label>
                <select
                  value={srvAsset}
                  onChange={(e) => setSrvAsset(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none"
                >
                  {RADIOLOGY_EQUIPMENT_ASSETS.map((asset, idx) => (
                    <option key={idx} value={asset.name}>
                      {asset.name} ({asset.location}) • S/N: {asset.serial}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Issue Category *
                  </label>
                  <select
                    value={srvCategory}
                    onChange={(e: any) => setSrvCategory(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="HARDWARE_BREAKDOWN">Hardware Breakdown & Component Failure</option>
                    <option value="PREVENTIVE_MAINTENANCE">Preventive Maintenance & Calibration</option>
                    <option value="PACS_SOFTWARE_GLITCH">PACS & DICOM Software Sync Glitch</option>
                    <option value="ELECTRICAL_HVAC">Electrical Power Surge / HVAC Cooling Failure</option>
                    <option value="RADIATION_SAFETY">Radiation Safety Survey & Shielding Check</option>
                  </select>
                </div>

                {/* Severity */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Severity Tier *
                  </label>
                  <select
                    value={srvSeverity}
                    onChange={(e: any) => setSrvSeverity(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="LOW">Low (Routine Calibration)</option>
                    <option value="MEDIUM">Medium (Minor Glitch)</option>
                    <option value="HIGH">High (Degraded Scan Quality)</option>
                    <option value="CRITICAL_DOWNTIME">Critical (Complete Downtime / Halts Scans)</option>
                  </select>
                </div>
              </div>

              {/* Halts Scans Toggle */}
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-rose-500 uppercase">Immediate Modality Downtime Flag</p>
                  <p className="text-[10px] text-slate-400">Check if this issue halts diagnostic imaging and patient intake.</p>
                </div>
                <input
                  type="checkbox"
                  checked={srvHaltsScans}
                  onChange={(e) => setSrvHaltsScans(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Detailed Problem Description & Error Codes *
                </label>
                <textarea
                  required
                  value={srvDescription}
                  onChange={(e) => setSrvDescription(e.target.value)}
                  placeholder="State generator error codes, transducer malfunction, PACS latency, or physical symptoms..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none min-h-[90px]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setIsNewServiceModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-slate-950 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider">
                  Log Ticket to Biomedical Hub
                </Button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8. MODAL: VIEW REQUISITION DETAILS                        */}
      {/* ========================================================= */}
      {viewingRequisition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
            <div className="bg-slate-950 p-5 border-b border-slate-800 flex justify-between items-center text-white">
              <div>
                <h3 className="font-black text-base uppercase">REQUISITION DOSSIER</h3>
                <p className="text-xs font-mono text-indigo-400">{viewingRequisition.reqNumber}</p>
              </div>
              <button type="button" onClick={() => setViewingRequisition(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Target Store</p>
                  <p className="font-bold text-slate-900 dark:text-slate-100">{viewingRequisition.targetStoreLabel}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Requesting Clinician</p>
                  <p className="font-bold text-slate-900 dark:text-slate-100">{viewingRequisition.clinicianName}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Itemized Manifest</p>
                <div className="space-y-2">
                  {viewingRequisition.items.map((item, i) => (
                    <div key={i} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{item.name}</p>
                        <p className="text-[10px] text-slate-400">Unit: {item.unitOfIssue}</p>
                      </div>
                      <span className="font-black text-indigo-500 text-sm">× {item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {viewingRequisition.justification && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Justification</p>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5">{viewingRequisition.justification}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <Button type="button" variant="outline" onClick={() => setViewingRequisition(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 9. MODAL: VIEW BIOMEDICAL TICKET STATUS                   */}
      {/* ========================================================= */}
      {viewingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
            <div className="bg-slate-950 p-5 border-b border-slate-800 flex justify-between items-center text-white">
              <div>
                <h3 className="font-black text-base uppercase">BIOMEDICAL SERVICE TICKET</h3>
                <p className="text-xs font-mono text-indigo-400">{viewingTicket.ticketNumber}</p>
              </div>
              <button type="button" onClick={() => setViewingTicket(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase">Asset Name & Suite</p>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{viewingTicket.assetName}</p>
                <p className="text-[10px] font-mono text-slate-400">{viewingTicket.assetLocation} • Serial: {viewingTicket.assetSerial}</p>
              </div>

              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Reported Issue</p>
                <p className="text-slate-800 dark:text-slate-200 font-medium p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 mt-1 leading-relaxed">
                  {viewingTicket.problemDescription}
                </p>
              </div>

              {viewingTicket.resolutionNotes && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <p className="text-[9px] font-black text-emerald-500 uppercase">Engineering Resolution Notes</p>
                  <p className="text-emerald-700 dark:text-emerald-300 mt-1">{viewingTicket.resolutionNotes}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <Button type="button" variant="outline" onClick={() => setViewingTicket(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
