'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  Camera, Plus, Loader2, ShieldAlert, Package, Search, Layers, 
  CheckCircle2, AlertCircle, Clock, FileText, Download, SlidersHorizontal,
  Activity, Sparkles, AlertTriangle, Check, ArrowUpDown, Filter, Edit3,
  Building2, ShieldCheck, Tag, HeartPulse, HelpCircle, Eye, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface MenuScanItem {
  id: string;
  code: string; // GHS / CPT / ICD-10-PCS Code
  name: string;
  alias?: string;
  modality: 'ULTRASOUND' | 'X-RAY' | 'CT' | 'MRI' | 'ECHO' | 'MAMMO' | string;
  organRegion: 'ABDOMEN_PELVIS' | 'CHEST_THORAX' | 'MUSCULOSKELETAL' | 'HEAD_NEURO' | 'SPINE' | 'OB_GYN' | 'CARDIO' | string;
  tatMinutes: number; // Turnaround Time in minutes
  cashPrice: number;
  nhisPrice: number;
  isNhisCovered: boolean;
  corporatePrice: number;
  prepProtocol: 'NONE' | 'FULL_BLADDER' | 'FASTING_4HR' | 'NO_METAL' | 'CONTRAST_CREATININE' | 'CUSTOM';
  prepInstructions?: string;
  status: 'ACTIVE' | 'MAINTENANCE';
}

const scanFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Scan name is required"),
  alias: z.string().optional(),
  code: z.string().min(2, "Standard procedure code is required"),
  modality: z.string().min(1, "Modality is required"),
  organRegion: z.string().min(1, "Anatomical region is required"),
  tatMinutes: z.coerce.number().min(5, "Minimum turnaround time is 5 minutes"),
  cashPrice: z.coerce.number().min(0, "Cash tariff cannot be negative"),
  nhisPrice: z.coerce.number().min(0, "NHIS tariff cannot be negative"),
  isNhisCovered: z.boolean().default(true),
  corporatePrice: z.coerce.number().min(0, "Corporate tariff cannot be negative"),
  prepProtocol: z.string().min(1, "Preparation protocol is required"),
  prepInstructions: z.string().optional(),
  status: z.enum(['ACTIVE', 'MAINTENANCE']).default('ACTIVE'),
});

type ScanFormValues = z.infer<typeof scanFormSchema>;

// Comprehensive Ghanaian Clinical Diagnostic Menu Baseline
const initialEnterpriseMenu: MenuScanItem[] = [
  { 
    id: 'SCN-RAD-001', 
    code: 'GHS-RAD-USS-01', 
    name: 'Obstetric Ultrasound (USS Complete)', 
    alias: 'Pregnancy Scan, Fetal Biometry, AFI Doppler',
    modality: 'ULTRASOUND', 
    organRegion: 'OB_GYN',
    tatMinutes: 30,
    cashPrice: 120.00, 
    nhisPrice: 85.00,
    isNhisCovered: true,
    corporatePrice: 160.00,
    prepProtocol: 'FULL_BLADDER',
    prepInstructions: 'Drink 1 Liter of plain water 1 hour prior to scan. Do not empty bladder until examination is completed.',
    status: 'ACTIVE' 
  },
  { 
    id: 'SCN-RAD-002', 
    code: 'GHS-RAD-XR-01', 
    name: 'Chest X-Ray (PA & Lateral View)', 
    alias: 'CXR, Plain Radiograph Thorax',
    modality: 'X-RAY', 
    organRegion: 'CHEST_THORAX',
    tatMinutes: 20,
    cashPrice: 110.00, 
    nhisPrice: 75.00,
    isNhisCovered: true,
    corporatePrice: 145.00,
    prepProtocol: 'NONE',
    prepInstructions: 'Remove necklaces, metallic objects, and clothing with metal zippers from chest area.',
    status: 'ACTIVE' 
  },
  { 
    id: 'SCN-RAD-003', 
    code: 'GHS-RAD-USS-02', 
    name: 'Abdomino-Pelvic Ultrasound (Complete)', 
    alias: 'Abdominal Sonogram, Liver, Gallbladder, Kidneys',
    modality: 'ULTRASOUND', 
    organRegion: 'ABDOMEN_PELVIS',
    tatMinutes: 45,
    cashPrice: 140.00, 
    nhisPrice: 95.00,
    isNhisCovered: true,
    corporatePrice: 190.00,
    prepProtocol: 'FASTING_4HR',
    prepInstructions: 'Fasting for 4 to 6 hours prior to scan (nil by mouth except light sips of water). Full bladder also advised.',
    status: 'ACTIVE' 
  },
  { 
    id: 'SCN-RAD-004', 
    code: 'GHS-RAD-CT-01', 
    name: 'Brain CT Scan (Non-Contrast Axial)', 
    alias: 'Cranial CT, Head Trauma Protocol',
    modality: 'CT', 
    organRegion: 'HEAD_NEURO',
    tatMinutes: 40,
    cashPrice: 850.00, 
    nhisPrice: 520.00,
    isNhisCovered: true,
    corporatePrice: 1150.00,
    prepProtocol: 'NONE',
    prepInstructions: 'Remove earrings, hairpins, dentures, and metallic head accessories before entering gantry.',
    status: 'ACTIVE' 
  },
  { 
    id: 'SCN-RAD-005', 
    code: 'GHS-RAD-MRI-01', 
    name: 'MRI Lumbar Spine (L1-S1 Sagittal & Axial)', 
    alias: 'Lumbosacral Spine MRI, Disc Herniation Protocol',
    modality: 'MRI', 
    organRegion: 'SPINE',
    tatMinutes: 60,
    cashPrice: 1450.00, 
    nhisPrice: 0.00,
    isNhisCovered: false,
    corporatePrice: 1850.00,
    prepProtocol: 'NO_METAL',
    prepInstructions: 'CRITICAL: Strict MRI Safety Check. No metallic implants, pacemakers, surgical clips, or magnetic foreign bodies.',
    status: 'ACTIVE' 
  },
  { 
    id: 'SCN-RAD-006', 
    code: 'GHS-RAD-XR-04', 
    name: 'Right Knee Joint X-Ray (AP & Lateral Weight-Bearing)', 
    alias: 'Knee Radiograph, Osteoarthritis Series',
    modality: 'X-RAY', 
    organRegion: 'MUSCULOSKELETAL',
    tatMinutes: 20,
    cashPrice: 100.00, 
    nhisPrice: 70.00,
    isNhisCovered: true,
    corporatePrice: 135.00,
    prepProtocol: 'NONE',
    prepInstructions: 'Wear loose-fitting clothing that can be rolled above the knee joint.',
    status: 'ACTIVE' 
  },
  { 
    id: 'SCN-RAD-007', 
    code: 'GHS-RAD-CT-03', 
    name: 'Abdominal & Pelvic CT Scan (IV Contrast Enhanced)', 
    alias: 'Abdomen CT w/ Contrast, Staging Protocol',
    modality: 'CT', 
    organRegion: 'ABDOMEN_PELVIS',
    tatMinutes: 60,
    cashPrice: 1100.00, 
    nhisPrice: 650.00,
    isNhisCovered: true,
    corporatePrice: 1450.00,
    prepProtocol: 'CONTRAST_CREATININE',
    prepInstructions: 'Recent Serum Creatinine (eGFR) within 30 days required. Fasting 4 hours prior to IV contrast administration.',
    status: 'MAINTENANCE' 
  },
  { 
    id: 'SCN-RAD-008', 
    code: 'GHS-RAD-ECHO-01', 
    name: 'Transthoracic Echocardiogram (2D Echo + Doppler)', 
    alias: 'Cardiac USS, Ejection Fraction Assessment',
    modality: 'ECHO', 
    organRegion: 'CARDIO',
    tatMinutes: 45,
    cashPrice: 280.00, 
    nhisPrice: 180.00,
    isNhisCovered: true,
    corporatePrice: 380.00,
    prepProtocol: 'NONE',
    prepInstructions: 'No special preparation needed. Bring previous ECG/cardiology records.',
    status: 'ACTIVE' 
  }
];


// Smart Clinical Inference Helpers for Legacy and Unspecified Scans
export const inferOrganRegion = (name: string, modality: string, existingRegion?: string): string => {
  const text = ((name || '') + ' ' + (modality || '')).toUpperCase();
  if (text.includes('CHEST') || text.includes('LUNG') || text.includes('THORAX') || text.includes('CXR') || text.includes('RIB') || text.includes('CLAVICLE')) {
    return 'CHEST_THORAX';
  }
  if (text.includes('OBSTETRIC') || text.includes('PREGNAN') || text.includes('FETAL') || text.includes('FOETAL') || text.includes('GYNAE') || text.includes('UTERUS') || text.includes('OVARY')) {
    return 'OB_GYN';
  }
  if (text.includes('BRAIN') || text.includes('HEAD') || text.includes('CRANIAL') || text.includes('SKULL') || text.includes('NEURO')) {
    return 'HEAD_NEURO';
  }
  if (text.includes('SPINE') || text.includes('LUMBAR') || text.includes('CERVICAL') || text.includes('LUMBOSACRAL')) {
    return 'SPINE';
  }
  if (text.includes('KNEE') || text.includes('FEMUR') || text.includes('TIBIA') || text.includes('JOINT') || text.includes('SHOULDER') || text.includes('ANKLE') || text.includes('WRIST') || text.includes('HAND') || text.includes('FOOT') || text.includes('BONE')) {
    return 'MUSCULOSKELETAL';
  }
  if (text.includes('ECHO') || text.includes('CARDIO') || text.includes('HEART') || text.includes('ECG')) {
    return 'CARDIO';
  }
  return existingRegion || 'ABDOMEN_PELVIS';
};

export const inferPrepProtocol = (name: string, modality: string, existingProtocol?: string, existingInstructions?: string): { protocol: string; instructions: string } => {
  if (existingProtocol && existingProtocol !== 'NONE') {
    return { protocol: existingProtocol, instructions: existingInstructions || 'Standard clinical protocol applies.' };
  }

  const text = ((name || '') + ' ' + (modality || '')).toUpperCase();
  if (text.includes('OBSTETRIC') || text.includes('PELVIC') || text.includes('PELVIS') || text.includes('PREGNAN') || text.includes('BLADDER') || text.includes('KUB')) {
    return {
      protocol: 'FULL_BLADDER',
      instructions: existingInstructions || 'Drink 1 Liter of plain water 1 hour prior to scan. Do not empty bladder until scan is completed.'
    };
  }
  if (text.includes('ABDOMEN') || text.includes('ABDOMINAL') || text.includes('LIVER') || text.includes('GALLBLADDER')) {
    return {
      protocol: 'FASTING_4HR',
      instructions: existingInstructions || 'Fasting 4 to 6 hours prior to scan (nil by mouth except light sips of water).'
    };
  }
  if (text.includes('MRI')) {
    return {
      protocol: 'NO_METAL',
      instructions: existingInstructions || 'Strict MRI Safety Check. No metallic implants, pacemakers, surgical clips, or magnetic foreign bodies.'
    };
  }
  if (text.includes('CONTRAST') || text.includes('IVU') || text.includes('CTA')) {
    return {
      protocol: 'CONTRAST_CREATININE',
      instructions: existingInstructions || 'Recent Serum Creatinine (eGFR) within 30 days required. Fasting 4 hours prior to IV contrast.'
    };
  }
  return {
    protocol: existingProtocol || 'NONE',
    instructions: existingInstructions || 'Walk-in ready. Remove metallic jewelry and accessories from scanned anatomical region.'
  };
};

export default function RadiologySetupPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModality, setSelectedModality] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScan, setEditingScan] = useState<MenuScanItem | null>(null);
  const [selectedPrepPreview, setSelectedPrepPreview] = useState<MenuScanItem | null>(null);

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
  const isAuthorized = !userRole || ['DIRECTOR', 'RADIOLOGIST', 'ADMIN', 'DOCTOR', 'ACCOUNTANT'].includes(userRole);

  const menuQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "hospitals", hospitalId, "radiology_menu"));
  }, [firestore, hospitalId]);

  const { data: dbScans, isLoading: isMenuLoading } = useCollection<any>(menuQuery);

  const menuScans = useMemo(() => {
    if (dbScans && dbScans.length > 0) {
      return dbScans.map(s => {
        const mod = s.modality ? s.modality.toUpperCase() : 'X-RAY';
        const region = inferOrganRegion(s.name, mod, s.organRegion);
        const prep = inferPrepProtocol(s.name, mod, s.prepProtocol, s.prepInstructions);

        return {
          id: s.id,
          code: s.code || `GHS-RAD-${s.id.substring(0, 4).toUpperCase()}`,
          name: s.name,
          alias: s.alias || '',
          modality: mod,
          organRegion: region,
          tatMinutes: Number(s.tatMinutes || 30),
          cashPrice: Number(s.cashPrice || s.price || 0),
          nhisPrice: Number(s.nhisPrice !== undefined ? s.nhisPrice : (s.price ? s.price * 0.75 : 0)),
          isNhisCovered: s.isNhisCovered !== false,
          corporatePrice: Number(s.corporatePrice !== undefined ? s.corporatePrice : (s.price ? s.price * 1.3 : 0)),
          prepProtocol: prep.protocol,
          prepInstructions: prep.instructions,
          status: s.status || 'ACTIVE',
        };
      }) as MenuScanItem[];
    }
    return initialEnterpriseMenu;
  }, [dbScans]);

  // Aggregate Telemetry Metrics
  const telemetry = useMemo(() => {
    const total = menuScans.length;
    const active = menuScans.filter(m => m.status === 'ACTIVE').length;
    const ussCount = menuScans.filter(m => m.modality.includes('ULTRASOUND') || m.modality.includes('USS')).length;
    const xrayCount = menuScans.filter(m => m.modality.includes('X-RAY') || m.modality.includes('XR')).length;
    const ctCount = menuScans.filter(m => m.modality.includes('CT')).length;
    const mriCount = menuScans.filter(m => m.modality.includes('MRI')).length;
    const echoCount = menuScans.filter(m => m.modality.includes('ECHO') || m.modality.includes('CARDIO')).length;

    const nhisCoveredCount = menuScans.filter(m => m.isNhisCovered && m.nhisPrice > 0).length;
    const nhisCoveragePercent = total > 0 ? Math.round((nhisCoveredCount / total) * 100) : 0;
    const avgTat = total > 0 ? Math.round(menuScans.reduce((acc, curr) => acc + (curr.tatMinutes || 30), 0) / total) : 30;

    return { total, active, ussCount, xrayCount, ctCount, mriCount, echoCount, nhisCoveragePercent, avgTat };
  }, [menuScans]);

  // Form Setup
  const form = useForm<ScanFormValues>({
    resolver: zodResolver(scanFormSchema),
    defaultValues: {
      name: '',
      alias: '',
      code: 'GHS-RAD-USS-01',
      modality: 'ULTRASOUND',
      organRegion: 'ABDOMEN_PELVIS',
      tatMinutes: 30,
      cashPrice: 120.00,
      nhisPrice: 85.00,
      isNhisCovered: true,
      corporatePrice: 160.00,
      prepProtocol: 'NONE',
      prepInstructions: '',
      status: 'ACTIVE'
    },
  });

  const openAddModal = () => {
    setEditingScan(null);
    form.reset({
      name: '',
      alias: '',
      code: `GHS-RAD-${Math.floor(100 + Math.random() * 900)}`,
      modality: 'ULTRASOUND',
      organRegion: 'ABDOMEN_PELVIS',
      tatMinutes: 30,
      cashPrice: 120.00,
      nhisPrice: 85.00,
      isNhisCovered: true,
      corporatePrice: 160.00,
      prepProtocol: 'NONE',
      prepInstructions: 'No special preparation needed. Standard diagnostic protocol.',
      status: 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (scan: MenuScanItem) => {
    setEditingScan(scan);
    form.reset({
      id: scan.id,
      name: scan.name,
      alias: scan.alias || '',
      code: scan.code || `GHS-RAD-${scan.id.substring(0, 4)}`,
      modality: scan.modality,
      organRegion: scan.organRegion,
      tatMinutes: scan.tatMinutes || 30,
      cashPrice: scan.cashPrice,
      nhisPrice: scan.nhisPrice,
      isNhisCovered: scan.isNhisCovered,
      corporatePrice: scan.corporatePrice,
      prepProtocol: scan.prepProtocol || 'NONE',
      prepInstructions: scan.prepInstructions || '',
      status: scan.status
    });
    setIsModalOpen(true);
  };

  const handleSaveScan = async (values: ScanFormValues) => {
    const isEdit = !!editingScan;
    const scanId = editingScan ? editingScan.id : `SCN-RAD-${Date.now().toString().slice(-4)}`;

    const payload = {
      ...values,
      id: scanId,
      hospitalId: hospitalId || 'GAM-GAR-7578',
      price: values.cashPrice, // backwards compatibility
      updatedAt: serverTimestamp(),
      ...(isEdit ? {} : { createdAt: serverTimestamp() })
    };

    if (firestore && hospitalId) {
      try {
        const scanRef = doc(firestore, `hospitals/${hospitalId}/radiology_menu`, scanId);
        await setDoc(scanRef, payload, { merge: true });
        toast({
          title: isEdit ? '⚡ Tariff Schedule Updated' : '⚡ Procedure Added to Catalog',
          description: `${values.name} (${values.code}) saved successfully to hospital master fee ledger.`,
        });
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Save Failed',
          description: err.message || 'Could not commit to Firestore ledger.',
        });
      }
    } else {
      toast({
        title: isEdit ? '⚡ Tariff Schedule Updated (Demo)' : '⚡ Procedure Added to Catalog (Demo)',
        description: `${values.name} saved to local tariff ledger.`,
      });
    }

    setIsModalOpen(false);
  };

  // Export Fee Schedule to CSV
  const handleExportCSV = () => {
    const headers = ['Ref ID', 'GHS Code', 'Scan Name', 'Alias', 'Modality', 'Organ Region', 'TAT (mins)', 'Cash Tariff (GHS)', 'NHIS Rate (GHS)', 'NHIS Covered', 'Corporate Tariff (GHS)', 'Prep Protocol', 'Prep Instructions', 'Status'];
    
    const rows = menuScans.map(s => [
      s.id,
      s.code,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${(s.alias || '').replace(/"/g, '""')}"`,
      s.modality,
      s.organRegion,
      s.tatMinutes,
      s.cashPrice.toFixed(2),
      s.nhisPrice.toFixed(2),
      s.isNhisCovered ? 'YES' : 'NO',
      s.corporatePrice.toFixed(2),
      s.prepProtocol,
      `"${(s.prepInstructions || '').replace(/"/g, '""')}"`,
      s.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GAM_MED_Radiology_Tariff_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: '📁 Fee Schedule Exported',
      description: 'The radiology diagnostic tariff ledger was downloaded as an audited CSV format.',
    });
  };

  // Filter Logic
  const filteredScans = useMemo(() => {
    return menuScans.filter(item => {
      // Search Term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches = 
          item.name.toLowerCase().includes(q) ||
          (item.alias && item.alias.toLowerCase().includes(q)) ||
          item.code.toLowerCase().includes(q) ||
          item.modality.toLowerCase().includes(q) ||
          item.organRegion.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Modality Filter
      if (selectedModality !== 'ALL') {
        if (selectedModality === 'ULTRASOUND' && !item.modality.includes('ULTRASOUND') && !item.modality.includes('USS')) return false;
        if (selectedModality === 'X-RAY' && !item.modality.includes('X-RAY') && !item.modality.includes('XR')) return false;
        if (selectedModality === 'CT' && !item.modality.includes('CT')) return false;
        if (selectedModality === 'MRI' && !item.modality.includes('MRI')) return false;
        if (selectedModality === 'ECHO' && !item.modality.includes('ECHO') && !item.modality.includes('CARDIO')) return false;
      }

      // Status Filter
      if (selectedStatus !== 'ALL') {
        if (item.status !== selectedStatus) return false;
      }

      // Organ Region Filter
      if (selectedRegion !== 'ALL') {
        if (item.organRegion !== selectedRegion) return false;
      }

      return true;
    });
  }, [menuScans, searchTerm, selectedModality, selectedStatus, selectedRegion]);

  const getModalityBadge = (modality: string) => {
    const modUpper = modality.toUpperCase();
    if (modUpper.includes('ULTRASOUND') || modUpper.includes('USS')) {
      return { label: 'ULTRASOUND (USS)', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: <Activity className="w-3 h-3 text-emerald-400" /> };
    }
    if (modUpper.includes('X-RAY') || modUpper.includes('XR')) {
      return { label: 'X-RAY (DR/CR)', badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40', icon: <Camera className="w-3 h-3 text-sky-400" /> };
    }
    if (modUpper.includes('CT')) {
      return { label: 'CT SCAN', badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', icon: <Layers className="w-3 h-3 text-indigo-400" /> };
    }
    if (modUpper.includes('MRI')) {
      return { label: 'MRI SCAN', badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40', icon: <Sparkles className="w-3 h-3 text-purple-400" /> };
    }
    if (modUpper.includes('ECHO') || modUpper.includes('CARDIO')) {
      return { label: 'ECHO / ECG', badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: <HeartPulse className="w-3 h-3 text-rose-400" /> };
    }
    return { label: modality, badgeClass: 'bg-slate-800 text-slate-300 border-slate-700', icon: <Camera className="w-3 h-3 text-slate-400" /> };
  };

  const getPrepBadge = (protocol: string) => {
    switch (protocol) {
      case 'FULL_BLADDER':
        return { label: 'Full Bladder (1L Water)', badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' };
      case 'FASTING_4HR':
        return { label: 'Fasting 4-6 hrs', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
      case 'NO_METAL':
        return { label: 'Strict MRI No Metal', badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
      case 'CONTRAST_CREATININE':
        return { label: 'Serum Creatinine Check', badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
      case 'CUSTOM':
        return { label: 'Special Protocol', badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' };
      default:
        return { label: 'Walk-in Ready', badgeClass: 'bg-slate-800/80 text-slate-400 border-slate-700' };
    }
  };

  const getRegionLabel = (region: string) => {
    switch (region) {
      case 'OB_GYN': return 'Obstetric & Gynae';
      case 'ABDOMEN_PELVIS': return 'Abdomen & Pelvis';
      case 'CHEST_THORAX': return 'Thorax & Chest';
      case 'HEAD_NEURO': return 'Head & Neuro';
      case 'SPINE': return 'Spinal Column';
      case 'MUSCULOSKELETAL': return 'Musculoskeletal';
      case 'CARDIO': return 'Cardiovascular';
      default: return region;
    }
  };

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
          <p className="text-xs text-slate-400 mt-1">You are not authorized to configure diagnostic imaging tariffs.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4 w-full">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* ========================================== */}
      {/* 1. ENTERPRISE HERO COMMAND BANNER          */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-16 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 rounded-2xl text-indigo-400 shadow-inner">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Master Diagnostic Catalog
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  GHS / NHIS G-DRG Integrated
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white mt-1">
                RADIOLOGY TARIFF LEDGER
              </h1>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                Multi-tier insurance pricing matrix, standard GHS codes, turnaround times, and clinical prep protocols.
              </p>
            </div>
          </div>

          {/* Telemetry KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Catalog Total</p>
              <p className="text-xl font-mono text-white font-black">{telemetry.total} <span className="text-[10px] text-emerald-400 font-normal">({telemetry.active} Active)</span></p>
            </div>

            <div className="bg-slate-900/90 border border-emerald-500/30 p-3 rounded-xl bg-emerald-950/10">
              <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5" /> NHIS G-DRG
              </p>
              <p className="text-xl font-mono text-emerald-300 font-black">{telemetry.nhisCoveragePercent}% <span className="text-[9px] text-slate-400 font-normal">Covered</span></p>
            </div>

            <div className="bg-slate-900/90 border border-sky-500/30 p-3 rounded-xl bg-sky-950/10">
              <p className="text-[9px] text-sky-400 font-black uppercase tracking-widest flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> Average TAT
              </p>
              <p className="text-xl font-mono text-sky-300 font-black">{telemetry.avgTat} <span className="text-[10px] font-normal text-slate-400">mins</span></p>
            </div>

            <div className="bg-slate-900/90 border border-indigo-500/30 p-3 rounded-xl bg-indigo-950/10">
              <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest flex items-center gap-1">
                <Building2 className="w-2.5 h-2.5" /> Corporate Tier
              </p>
              <p className="text-xl font-mono text-indigo-300 font-black">+30% <span className="text-[9px] text-slate-400 font-normal">Markup</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. STICKY MODALITY & REGION FILTER BAR     */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-3.5 sticky top-2 z-20 backdrop-blur-md bg-opacity-95 dark:bg-opacity-95">
        
        {/* Top Row: Search, Actions, Export */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search scan name, alias, GHS code, modality, anatomy, or tracking ID..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Export CSV */}
            <Button 
              onClick={handleExportCSV}
              variant="outline"
              className="px-3.5 py-2 text-[10px] font-black uppercase tracking-wider border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
              title="Download audited tariff schedule in CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </Button>

            {/* Add Scan Modal Trigger */}
            <Button 
              onClick={openAddModal}
              className="px-4 py-2.5 bg-indigo-950 hover:bg-indigo-900 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow transition-all border border-indigo-700 cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>+ ADD SCAN TO MENU</span>
            </Button>
          </div>
        </div>

        {/* Bottom Row: Modality Quick-Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-indigo-400" /> Modality Suite:
            </span>

            {[
              { id: 'ALL', label: `All (${menuScans.length})` },
              { id: 'ULTRASOUND', label: `Ultrasound (${telemetry.ussCount})`, icon: <Activity className="w-3 h-3 text-emerald-400" /> },
              { id: 'X-RAY', label: `X-Ray (${telemetry.xrayCount})`, icon: <Camera className="w-3 h-3 text-sky-400" /> },
              { id: 'CT', label: `CT Scan (${telemetry.ctCount})`, icon: <Layers className="w-3 h-3 text-indigo-400" /> },
              { id: 'MRI', label: `MRI (${telemetry.mriCount})`, icon: <Sparkles className="w-3 h-3 text-purple-400" /> },
              { id: 'ECHO', label: `Echo / ECG (${telemetry.echoCount})`, icon: <HeartPulse className="w-3 h-3 text-rose-400" /> }
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

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Status:
            </span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-[10px] font-black uppercase tracking-wider bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>

        </div>

      </div>

      {/* ========================================== */}
      {/* 3. MULTI-TIER TARIFF MASTER TABLE          */}
      {/* ========================================== */}
      {isMenuLoading ? (
        <div className="text-center p-16 text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl font-bold">
          <Loader2 className="h-9 w-9 animate-spin mx-auto mb-3 text-indigo-400" />
          Synchronizing hospital diagnostic tariff ledger...
        </div>
      ) : filteredScans.length === 0 ? (
        <div className="text-center p-20 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 space-y-3">
          <Camera className="h-12 w-12 mx-auto text-slate-500" />
          <h3 className="text-sm font-black text-slate-300 uppercase tracking-wide">
            No Matching Diagnostic Scans Found
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No diagnostic procedures match your active search or modality filter.
          </p>
          <Button 
            onClick={() => {
              setSearchTerm('');
              setSelectedModality('ALL');
              setSelectedStatus('ALL');
              setSelectedRegion('ALL');
            }}
            variant="outline"
            className="mt-2 text-xs"
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                <th className="p-4 w-28">GHS Code</th>
                <th className="p-4 min-w-[220px]">Procedure & Anatomy</th>
                <th className="p-4">Modality</th>
                <th className="p-4 text-center">TAT</th>
                <th className="p-4 text-right min-w-[200px]">Pricing & Insurance Matrix (GHS)</th>
                <th className="p-4">Preparation Protocol</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="text-xs">
              {filteredScans.map((item) => {
                const modalityBadge = getModalityBadge(item.modality);
                const prepBadge = getPrepBadge(item.prepProtocol);

                return (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                    
                    {/* GHS Code & Ref */}
                    <td className="p-4 align-top">
                      <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 block w-fit">
                        {item.code}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 mt-1 block">
                        {item.id}
                      </span>
                    </td>

                    {/* Procedure Name, Alias & Region */}
                    <td className="p-4 align-top">
                      <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-xs">
                        {item.name}
                      </h4>
                      {item.alias && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 italic">
                          Alias: {item.alias}
                        </p>
                      )}
                      <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded mt-1.5 border border-slate-200 dark:border-slate-700">
                        {getRegionLabel(item.organRegion)}
                      </span>
                    </td>

                    {/* Modality Badge */}
                    <td className="p-4 align-top">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border",
                        modalityBadge.badgeClass
                      )}>
                        {modalityBadge.icon}
                        <span>{modalityBadge.label}</span>
                      </span>
                    </td>

                    {/* Turnaround Time */}
                    <td className="p-4 align-top text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        {item.tatMinutes}m
                      </span>
                    </td>

                    {/* Multi-Tier Tariff Breakdown Matrix */}
                    <td className="p-4 align-top text-right space-y-1">
                      {/* Cash Rate */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Cash / Walk-in:</span>
                        <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                          ₵ {item.cashPrice.toFixed(2)}
                        </span>
                      </div>

                      {/* NHIS Rate */}
                      <div className="flex items-center justify-between text-xs pt-0.5 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                          <ShieldCheck className="w-2.5 h-2.5" /> NHIS G-DRG:
                        </span>
                        {item.isNhisCovered && item.nhisPrice > 0 ? (
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ₵ {item.nhisPrice.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            Non-Covered
                          </span>
                        )}
                      </div>

                      {/* Corporate Tariff */}
                      <div className="flex items-center justify-between text-xs pt-0.5 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1">
                          <Building2 className="w-2.5 h-2.5" /> Corporate:
                        </span>
                        <span className="font-mono font-bold text-purple-600 dark:text-purple-300">
                          ₵ {item.corporatePrice.toFixed(2)}
                        </span>
                      </div>
                    </td>

                    {/* Preparation Protocol */}
                    <td className="p-4 align-top">
                      <button
                        type="button"
                        onClick={() => setSelectedPrepPreview(item)}
                        className={cn(
                          "text-left inline-flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border transition-all hover:scale-105 cursor-pointer",
                          prepBadge.badgeClass
                        )}
                        title="Click to view patient preparation guidelines"
                      >
                        <HelpCircle className="w-2.5 h-2.5" />
                        <span>{prepBadge.label}</span>
                      </button>
                    </td>

                    {/* Status Badge */}
                    <td className="p-4 align-top text-center">
                      {item.status === 'ACTIVE' ? (
                        <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-full uppercase tracking-widest inline-flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> Active
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-amber-400 bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-full uppercase tracking-widest inline-flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div> Maintenance
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 align-top text-right">
                      <button 
                        onClick={() => openEditModal(item)}
                        className="text-[10px] font-black text-slate-400 hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-xl transition-colors uppercase tracking-widest cursor-pointer inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" /> EDIT
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. PATIENT PREPARATION INSTRUCTIONS MODAL  */}
      {/* ========================================== */}
      {selectedPrepPreview && (
        <Dialog open={!!selectedPrepPreview} onOpenChange={() => setSelectedPrepPreview(null)}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-800 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-black uppercase text-slate-900 dark:text-slate-100">
                <HelpCircle className="text-indigo-400" /> Patient Prep Protocol
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Procedure Study</p>
                <p className="text-sm font-black text-indigo-500 uppercase mt-0.5">{selectedPrepPreview.name}</p>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">{selectedPrepPreview.code} • {selectedPrepPreview.modality}</p>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Clinical Preparation Instructions
                </p>
                <p className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                  {selectedPrepPreview.prepInstructions || 'Standard walk-in procedure. No fasting or bladder preparation required.'}
                </p>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                💡 <em>These preparation instructions automatically print on appointment slips and show on nurse check-in queues.</em>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button onClick={() => setSelectedPrepPreview(null)} className="w-full">
                Close Protocol
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================== */}
      {/* 5. ADD / EDIT SCAN FORM MODAL              */}
      {/* ========================================== */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-800 rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black uppercase text-slate-900 dark:text-slate-100">
              <Camera className="text-indigo-400" />
              {editingScan ? 'Edit Diagnostic Scan & Tariff' : 'New Imaging Scan Tariff Master'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveScan)} className="space-y-4 pt-2">
              
              {/* Row 1: Procedure Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-400">Procedure Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Obstetric Ultrasound (USS Complete)" {...field} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div>
                  <FormField control={form.control} name="code" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-400">GHS / NHIS Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. GHS-RAD-USS-01" {...field} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Row 2: Alias */}
              <FormField control={form.control} name="alias" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-slate-400">Standard Search Aliases / Clinical Keywords</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Pregnancy Scan, Fetal Biometry, AFI Doppler" {...field} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Row 3: Modality, Anatomy Region & TAT */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField control={form.control} name="modality" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-400">Hardware Modality *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ULTRASOUND">ULTRASOUND (USS)</SelectItem>
                        <SelectItem value="X-RAY">X-RAY (DR/CR)</SelectItem>
                        <SelectItem value="CT">CT SCAN</SelectItem>
                        <SelectItem value="MRI">MRI SCAN</SelectItem>
                        <SelectItem value="ECHO">ECHOCARDIOGRAPHY / ECG</SelectItem>
                        <SelectItem value="MAMMO">MAMMOGRAPHY</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="organRegion" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-400">Anatomical Region *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="OB_GYN">Obstetric & Gynae</SelectItem>
                        <SelectItem value="ABDOMEN_PELVIS">Abdomen & Pelvis</SelectItem>
                        <SelectItem value="CHEST_THORAX">Thorax & Chest</SelectItem>
                        <SelectItem value="HEAD_NEURO">Head, Neck & Neuro</SelectItem>
                        <SelectItem value="SPINE">Spinal Column</SelectItem>
                        <SelectItem value="MUSCULOSKELETAL">Musculoskeletal</SelectItem>
                        <SelectItem value="CARDIO">Cardiovascular</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="tatMinutes" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-400">Est. TAT (Mins) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="5" min="5" {...field} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Row 4: Multi-Tier Pricing Matrix */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Multi-Tier Tariff Schedule (GHS)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <FormField control={form.control} name="cashPrice" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-400">Cash / Walk-in Tariff *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black font-mono text-indigo-500" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="nhisPrice" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-400">NHIS G-DRG Ceiling *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black font-mono text-emerald-500" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="corporatePrice" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-400">Corporate Insurance Rate *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black font-mono text-purple-500" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Row 5: Preparation Protocol & Instructions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField control={form.control} name="prepProtocol" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-400">Preparation Protocol Flag *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">None / Walk-in Ready</SelectItem>
                        <SelectItem value="FULL_BLADDER">Full Bladder Required (1L Water)</SelectItem>
                        <SelectItem value="FASTING_4HR">Fasting 4-6 Hours</SelectItem>
                        <SelectItem value="NO_METAL">Strict MRI No Metal Safety</SelectItem>
                        <SelectItem value="CONTRAST_CREATININE">Serum Creatinine Check (IV Contrast)</SelectItem>
                        <SelectItem value="CUSTOM">Special Custom Protocol</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-400">Operational Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ACTIVE">ACTIVE (Accept Orders)</SelectItem>
                        <SelectItem value="MAINTENANCE">MAINTENANCE (Temporarily Unavailable)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="prepInstructions" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-slate-400">Patient Preparation Instructions (Prints on Slips)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Drink 1L water 1hr prior. Do not void bladder." {...field} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter className="pt-4">
                <button 
                  type="submit" 
                  className="w-full py-3.5 bg-indigo-950 hover:bg-indigo-900 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-xl transition-all border border-indigo-700 cursor-pointer"
                >
                  {editingScan ? 'UPDATE TARIFF IN MASTER LEDGER' : 'SAVE PROCEDURE TO MASTER LEDGER'}
                </button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
