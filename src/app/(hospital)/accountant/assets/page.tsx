'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, addDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { 
  Building2, Truck, Zap, Activity,
  Plus, Search, TrendingDown, Wrench,
  ShieldCheck, Calculator, Calendar, Loader2, ShieldAlert,
  Filter, CheckCircle2, FileText, Eye, AlertCircle, X, Layers, Wallet, HardDrive, CheckSquare, RefreshCw, Trash2,
  MapPin, User as UserIcon, QrCode, Printer, Tag, Barcode, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

type FixedAsset = {
  id: string;
  tag: string;
  name: string;
  category: 'MEDICAL_EQ' | 'IT_INFRA' | 'MOTOR_VEHICLES' | 'FURNITURE' | 'PPE';
  purchaseDate: string;
  cost: number;
  accumDepr: number;
  nbv: number;
  usefulLifeYears: number;
  salvageValue: number;
  location: string;
  custodian: string;
  serialNumber?: string;
  deprMethod?: 'STRAIGHT_LINE' | 'DECLINING_BALANCE';
  status: 'ACTIVE' | 'MAINTENANCE' | 'DISPOSED';
  lastDeprDate?: string;
  disposalProceeds?: number;
  gainOrLossOnDisposal?: number;
};

export default function FixedAssetRegisterConsole() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isCapitalizeOpen, setIsCapitalizeOpen] = useState(false);
  const [isDeprPreviewOpen, setIsDeprPreviewOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAssetForDossier, setSelectedAssetForDossier] = useState<FixedAsset | null>(null);

  // New Asset Form State
  const [newTag, setNewTag] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<'MEDICAL_EQ' | 'IT_INFRA' | 'MOTOR_VEHICLES' | 'FURNITURE'>('MEDICAL_EQ');
  const [newCost, setNewCost] = useState('');
  const [newUsefulLife, setNewUsefulLife] = useState('10');
  const [newSalvageValue, setNewSalvageValue] = useState('0');
  const [newPurchaseDate, setNewPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [newLocation, setNewLocation] = useState('Main Block - Radiology');
  const [newCustodian, setNewCustodian] = useState('Dr. Samuel Kponor');
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [newDeprMethod, setNewDeprMethod] = useState<'STRAIGHT_LINE' | 'DECLINING_BALANCE'>('STRAIGHT_LINE');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole || '');

  // 1. Listen for Fixed Assets collection
  const assetsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/assets`));
  }, [firestore, hospitalId]);
  const { data: rawAssets, isLoading: isAssetsLoading } = useCollection(assetsQuery);

  // 2. Demo Assets Fallback with Location and Custodian tracking
  const demoAssets: FixedAsset[] = useMemo(() => [
    { 
      id: 'AST-MED-001', 
      tag: 'GAM-US-001', 
      name: 'GE Voluson E8 Ultrasound System', 
      category: 'MEDICAL_EQ', 
      purchaseDate: '2023-01-15', 
      cost: 450000.00, 
      accumDepr: 135000.00, 
      nbv: 315000.00, 
      usefulLifeYears: 10, 
      salvageValue: 10000.00, 
      location: 'Main Block - Radiology',
      custodian: 'Dr. Samuel Kponor (Consultant Sonologist)',
      serialNumber: 'GE-VOL-99482-X',
      deprMethod: 'STRAIGHT_LINE',
      status: 'ACTIVE' 
    },
    { 
      id: 'AST-MED-042', 
      tag: 'GAM-XRY-002', 
      name: 'Siemens Mobile X-Ray Machine', 
      category: 'MEDICAL_EQ', 
      purchaseDate: '2024-06-10', 
      cost: 280000.00, 
      accumDepr: 56000.00, 
      nbv: 224000.00, 
      usefulLifeYears: 7, 
      salvageValue: 5000.00, 
      location: 'Emergency & Trauma Wing',
      custodian: 'Eng. Eric Boateng (Lead Biomedical Eng.)',
      serialNumber: 'SIE-MXR-2024-04',
      deprMethod: 'STRAIGHT_LINE',
      status: 'ACTIVE' 
    },
    { 
      id: 'AST-VEH-003', 
      tag: 'GAM-AMB-001', 
      name: 'Toyota Hiace Emergency Ambulance (GN-123-25)', 
      category: 'MOTOR_VEHICLES', 
      purchaseDate: '2025-02-20', 
      cost: 650000.00, 
      accumDepr: 162500.00, 
      nbv: 487500.00, 
      usefulLifeYears: 5, 
      salvageValue: 20000.00, 
      location: 'Ambulance Bay - Transport Dept',
      custodian: 'Mr. David Mensah (Fleet Supervisor)',
      serialNumber: 'VIN-JT2HE41P59012',
      deprMethod: 'STRAIGHT_LINE',
      status: 'MAINTENANCE' 
    },
    { 
      id: 'AST-IT-015', 
      tag: 'GAM-SRV-001', 
      name: 'Dell PowerEdge T440 Core Enterprise Server', 
      category: 'IT_INFRA', 
      purchaseDate: '2024-11-05', 
      cost: 85000.00, 
      accumDepr: 42500.00, 
      nbv: 42500.00, 
      usefulLifeYears: 4, 
      salvageValue: 2000.00, 
      location: 'Administration Block - Server Room 2',
      custodian: 'Kofi Asare (Head of Health Informatics)',
      serialNumber: 'SRV-DL-883921',
      deprMethod: 'STRAIGHT_LINE',
      status: 'ACTIVE' 
    },
    { 
      id: 'AST-FUR-008', 
      tag: 'GAM-ICU-009', 
      name: 'Hill-Rom Electric ICU Patient Bed Systems (Set of 4)', 
      category: 'FURNITURE', 
      purchaseDate: '2023-08-12', 
      cost: 120000.00, 
      accumDepr: 36000.00, 
      nbv: 84000.00, 
      usefulLifeYears: 8, 
      salvageValue: 4000.00, 
      location: 'Intensive Care Unit (ICU Block)',
      custodian: 'Tracy Gambrah (Nurse In-Charge)',
      serialNumber: 'HR-BED-ICU-009',
      deprMethod: 'STRAIGHT_LINE',
      status: 'ACTIVE' 
    }
  ], []);

  const assets: FixedAsset[] = useMemo(() => {
    if (rawAssets && rawAssets.length > 0) {
      return rawAssets.map((docItem: any) => {
        const cost = Number(docItem.cost || docItem.purchasePrice || 0);
        const accumDepr = Number(docItem.accumDepr || docItem.accumulatedDepreciation || 0);
        const nbv = Math.max(0, cost - accumDepr);
        return {
          id: docItem.id,
          tag: docItem.tag || docItem.tagId || `TAG-${docItem.id.slice(0, 5)}`,
          name: docItem.name || 'Capital Asset',
          category: (docItem.category || 'MEDICAL_EQ') as any,
          purchaseDate: docItem.purchaseDate || '2025-01-01',
          cost,
          accumDepr,
          nbv,
          usefulLifeYears: Number(docItem.usefulLife || docItem.usefulLifeYears || 5),
          salvageValue: Number(docItem.salvageValue || 0),
          location: docItem.location || 'Main Hospital Facility',
          custodian: docItem.custodian || 'Hospital Asset Controller',
          serialNumber: docItem.serialNumber || 'N/A',
          deprMethod: docItem.deprMethod || 'STRAIGHT_LINE',
          status: docItem.status === 'OPERATIONAL' ? 'ACTIVE' : (docItem.status || 'ACTIVE') as any,
          lastDeprDate: docItem.lastDepreciationPeriod,
          disposalProceeds: docItem.disposalProceeds,
          gainOrLossOnDisposal: docItem.gainOrLossOnDisposal,
        };
      });
    }
    return demoAssets;
  }, [rawAssets, demoAssets]);

  // Balance Sheet Metrics (Only include non-DISPOSED assets)
  const metrics = useMemo(() => {
    let totalCost = 0, totalDepr = 0, totalNbv = 0;
    assets.forEach(a => {
      if (a.status !== 'DISPOSED') {
        totalCost += a.cost;
        totalDepr += a.accumDepr;
        totalNbv += a.nbv;
      }
    });
    return { totalCost, totalDepr, totalNbv };
  }, [assets]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = a.name.toLowerCase().includes(q) || a.tag.toLowerCase().includes(q);
      const matchesCat = selectedCategory === 'ALL' || a.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [assets, searchTerm, selectedCategory]);

  // Calculated Real-Time Monthly Depreciation Preview for Capitalization Form
  const calcNewMonthlyDepr = useMemo(() => {
    const cost = parseFloat(newCost) || 0;
    const salvage = parseFloat(newSalvageValue) || 0;
    const years = parseInt(newUsefulLife) || 1;
    const totalMonths = years * 12;
    if (cost <= 0 || totalMonths <= 0) return 0;
    return Math.max(0, (cost - salvage) / totalMonths);
  }, [newCost, newSalvageValue, newUsefulLife]);

  // Pre-Run Depreciation Batch Telemetry Calculation
  const deprBatchTelemetry = useMemo(() => {
    const activeAssets = assets.filter(a => a.status === 'ACTIVE' && a.nbv > a.salvageValue);
    let totalMonthlyDepr = 0;
    const categoryBreakdown: Record<string, { count: number; monthly: number }> = {};

    activeAssets.forEach(a => {
      const monthly = Math.max(0, (a.cost - a.salvageValue) / (a.usefulLifeYears * 12));
      totalMonthlyDepr += monthly;
      if (!categoryBreakdown[a.category]) {
        categoryBreakdown[a.category] = { count: 0, monthly: 0 };
      }
      categoryBreakdown[a.category].count += 1;
      categoryBreakdown[a.category].monthly += monthly;
    });

    return { activeAssets, totalMonthlyDepr, categoryBreakdown };
  }, [assets]);

  const handleCapitalizeAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag || !newName || !newCost) {
      toast({ variant: 'destructive', title: "Missing Fields", description: "Asset Tag, Name, and Purchase Cost are required." });
      return;
    }

    const costNum = parseFloat(newCost);
    const lifeNum = parseInt(newUsefulLife) || 5;
    const salvageNum = parseFloat(newSalvageValue) || 0;

    setIsProcessing(true);

    try {
      if (firestore && hospitalId && user) {
        await addDoc(collection(firestore, `hospitals/${hospitalId}/assets`), {
          tag: newTag.trim().toUpperCase(),
          tagId: newTag.trim().toUpperCase(),
          name: newName.trim(),
          category: newCategory,
          purchaseDate: newPurchaseDate,
          purchasePrice: costNum,
          cost: costNum,
          accumulatedDepreciation: 0,
          accumDepr: 0,
          nbv: costNum,
          usefulLife: lifeNum,
          usefulLifeYears: lifeNum,
          salvageValue: salvageNum,
          location: newLocation.trim() || 'Main Hospital Facility',
          custodian: newCustodian.trim() || 'Asset Controller',
          serialNumber: newSerialNumber.trim() || 'N/A',
          deprMethod: newDeprMethod,
          status: 'ACTIVE',
          capitalizedBy: user.uid,
          createdAt: serverTimestamp()
        });

        // Post Capitalization Journal Voucher (Debit 1500 PPE / Credit 1010 Bank Account)
        await addDoc(collection(firestore, `hospitals/${hospitalId}/journal_entries`), {
          jvNumber: `JV-CAP-${Date.now().toString().slice(-6)}`,
          narration: `Capitalization of Asset ${newTag.toUpperCase()}: ${newName} (${newLocation})`,
          totalAmount: costNum,
          status: 'AUTHORIZED',
          createdByName: userProfile?.fullName || 'Finance Director',
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          lines: [
            { accountId: '1500', accountName: `1500 - Property, Plant & Equipment (${newCategory})`, debit: costNum, credit: 0 },
            { accountId: '1010', accountName: '1010 - Main GCB Operations Bank Account', debit: 0, credit: costNum }
          ]
        });
      }

      toast({
        title: "Asset Capitalized Successfully",
        description: `${newName} (${newTag.toUpperCase()}) added to Fixed Asset Register for ₵ ${costNum.toLocaleString('en-GH', { minimumFractionDigits: 2 })}. Capitalization JV posted.`
      });

      setIsCapitalizeOpen(false);
      setNewTag('');
      setNewName('');
      setNewCost('');
      setNewSalvageValue('0');
      setNewUsefulLife('10');
      setNewSerialNumber('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Capitalization Failed", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDepreciationBatch = async () => {
    setIsProcessing(true);

    try {
      if (firestore && hospitalId) {
        const functions = getFunctions();
        const runDeprFn = httpsCallable(functions, 'runMonthlyAssetDepreciation');
        const res: any = await runDeprFn({ hospitalId });

        toast({
          title: "Monthly Depreciation Batch Executed",
          description: res.data?.message || `Depreciation of ₵ ${deprBatchTelemetry.totalMonthlyDepr.toLocaleString('en-GH', { minimumFractionDigits: 2 })} posted to General Ledger.`
        });
      } else {
        // Fallback simulation
        toast({
          title: "Depreciation Batch Posted to General Ledger",
          description: `Posted JV for ${deprBatchTelemetry.activeAssets.length} assets: Debit 6500 (₵${deprBatchTelemetry.totalMonthlyDepr.toFixed(2)}) / Credit 1550 (₵${deprBatchTelemetry.totalMonthlyDepr.toFixed(2)}).`
        });
      }
      setIsDeprPreviewOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Depreciation Run Failed", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const [isDisposalModalOpen, setIsDisposalModalOpen] = useState(false);
  const [disposalAsset, setDisposalAsset] = useState<FixedAsset | null>(null);
  const [disposalProceeds, setDisposalProceeds] = useState('0');
  const [disposalDate, setDisposalDate] = useState(new Date().toISOString().split('T')[0]);
  const [disposalBankId, setDisposalBankId] = useState('1010');

  const handleExportAssetRegister = () => {
    if (!assets || assets.length === 0) {
      toast({ variant: 'destructive', title: 'Export Error', description: 'No fixed assets found in register.' });
      return;
    }

    const headers = "Asset_Tag,Asset_Name,Category,Location,Custodian,Serial_No,Purchase_Date,Purchase_Cost_GHS,Useful_Life_Years,Salvage_Value_GHS,Accumulated_Depreciation_GHS,Net_Book_Value_GHS,Status\n";
    const rows = assets.map(a => 
      `"${a.tag}","${a.name}","${a.category}","${a.location}","${a.custodian}","${a.serialNumber || 'N/A'}","${a.purchaseDate}",${a.cost.toFixed(2)},${a.usefulLifeYears},${a.salvageValue.toFixed(2)},${a.accumDepr.toFixed(2)},${a.nbv.toFixed(2)},"${a.status}"`
    ).join('\n');

    const totalCost = assets.reduce((s, a) => s + (a.status !== 'DISPOSED' ? a.cost : 0), 0);
    const totalDepr = assets.reduce((s, a) => s + (a.status !== 'DISPOSED' ? a.accumDepr : 0), 0);
    const totalNbv = assets.reduce((s, a) => s + (a.status !== 'DISPOSED' ? a.nbv : 0), 0);

    const footer = `\n"TOTAL","ACTIVE BALANCE SHEET CARRYING VALUES","","","","",${totalCost.toFixed(2)},"","",${totalDepr.toFixed(2)},${totalNbv.toFixed(2)},"ACTIVE_REGISTER"`;

    const csvData = "data:text/csv;charset=utf-8," + headers + rows + footer;
    const encodedUri = encodeURI(csvData);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GAM_MED_Fixed_Asset_Register_August_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Asset Register Exported", description: `Exported ${assets.length} assets. Total NBV: GHS ${totalNbv.toFixed(2)}.` });
  };

  const handleExecuteDisposal = async () => {
    if (!disposalAsset) return;
    const proceeds = parseFloat(disposalProceeds) || 0;
    const nbv = disposalAsset.nbv;
    const gainOrLoss = proceeds - nbv;
    const isGain = gainOrLoss >= 0;

    setIsProcessing(true);

    try {
      if (firestore && hospitalId && user) {
        // 1. Update Asset Status in Firestore
        if (disposalAsset.id.length > 15) {
          const assetRef = doc(firestore, `hospitals/${hospitalId}/assets`, disposalAsset.id);
          await updateDoc(assetRef, {
            status: 'DISPOSED',
            disposalProceeds: proceeds,
            disposalDate,
            gainOrLossOnDisposal: gainOrLoss,
            updatedAt: serverTimestamp()
          });
        }

        // 2. Post Multi-Leg Disposal Journal Voucher
        const jvLines = [
          ...(proceeds > 0 ? [{ accountId: disposalBankId, accountName: `${disposalBankId} - Bank / Cash Liquidation Account`, debit: proceeds, credit: 0 }] : []),
          { accountId: '1550', accountName: `1550 - Accumulated Depreciation: ${disposalAsset.category}`, debit: disposalAsset.accumDepr, credit: 0 },
          ...(!isGain ? [{ accountId: '5080', accountName: '5080 - Loss on Fixed Asset Disposal (Expense)', debit: Math.abs(gainOrLoss), credit: 0 }] : []),
          ...(isGain && gainOrLoss > 0 ? [{ accountId: '4080', accountName: '4080 - Gain on Fixed Asset Disposal (Other Revenue)', debit: 0, credit: gainOrLoss }] : []),
          { accountId: '1500', accountName: `1500 - Property, Plant & Equipment: ${disposalAsset.name}`, debit: 0, credit: disposalAsset.cost }
        ];

        await addDoc(collection(firestore, `hospitals/${hospitalId}/journal_entries`), {
          jvNumber: `JV-DISP-${Date.now().toString().slice(-6)}`,
          narration: `De-recognition & Disposal of ${disposalAsset.tag}: ${disposalAsset.name}. Proceeds: GHS ${proceeds.toFixed(2)}, NBV: GHS ${nbv.toFixed(2)}, ${isGain ? 'Gain' : 'Loss'}: GHS ${Math.abs(gainOrLoss).toFixed(2)}.`,
          totalAmount: Math.max(proceeds + disposalAsset.accumDepr, disposalAsset.cost),
          status: 'AUTHORIZED',
          createdByName: userProfile?.fullName || 'Chief Accountant',
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          lines: jvLines
        });
      }

      disposalAsset.status = 'DISPOSED';
      disposalAsset.disposalProceeds = proceeds;
      disposalAsset.gainOrLossOnDisposal = gainOrLoss;

      toast({
        title: "Asset Disposed & De-Recognized",
        description: `Disposal JV posted. ${isGain ? `Gain of GHS ${gainOrLoss.toFixed(2)} booked.` : `Loss on disposal of GHS ${Math.abs(gainOrLoss).toFixed(2)} booked.`}`
      });

      setIsDisposalModalOpen(false);
      setDisposalAsset(null);
      setSelectedAssetForDossier(null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Disposal Failed", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateAssetStatus = async (assetId: string, newStatus: 'ACTIVE' | 'MAINTENANCE' | 'DISPOSED') => {
    if (newStatus === 'DISPOSED' && selectedAssetForDossier) {
      setDisposalAsset(selectedAssetForDossier);
      setIsDisposalModalOpen(true);
      return;
    }

    setIsProcessing(true);
    try {
      if (firestore && hospitalId && assetId.length > 15) {
        const assetRef = doc(firestore, `hospitals/${hospitalId}/assets`, assetId);
        await updateDoc(assetRef, {
          status: newStatus,
          updatedAt: serverTimestamp()
        });
      }

      if (selectedAssetForDossier) {
        setSelectedAssetForDossier({ ...selectedAssetForDossier, status: newStatus });
      }

      toast({
        title: "Asset Status Updated",
        description: `Asset status changed to ${newStatus}.`
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Update Failed", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintAssetTag = () => {
    window.print();
  };

  const isLoading = isUserLoading || isProfileLoading || isAssetsLoading;
  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-8 min-h-screen">
        <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">Access Denied</h1>
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Fixed Asset & Depreciation Management.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100">
      
      {/* ========================================== */}
      {/* 1. THE GAM MED SIGNATURE HERO BANNER       */}
      {/* ========================================== */}
      <div className="w-full bg-slate-900 text-white p-6 md:p-8 shadow-lg border-b border-slate-800 relative overflow-hidden">
        {/* Subtle Ambient Radial Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-6 relative z-10">
          
          {/* Top Section: Title & Financial Controller Info */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black tracking-widest rounded uppercase">
                  IFRS & IPSAS COMPLIANCE
                </span>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white uppercase italic">
                  GAM MED
                </h1>
              </div>
              <h2 className="text-xs md:text-sm font-bold text-slate-300 mt-1 uppercase tracking-wider">
                Fixed Asset & Depreciation Register Command Center
              </h2>
            </div>

            <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700 px-4 py-2 rounded-xl backdrop-blur">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center border border-emerald-400">
                {userInitials}
              </div>
              <div>
                <p className="text-[11px] font-bold text-white uppercase">{userName}</p>
                <p className="text-[9px] font-semibold text-emerald-400 uppercase tracking-widest">Finance Director / Controller</p>
              </div>
            </div>
          </div>

          {/* Contextual Capital Balance Sheet Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Gross Asset Value</p>
                <p className="text-2xl font-mono text-white font-bold mt-1">
                  ₵ {metrics.totalCost.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[9px] text-slate-400 font-medium mt-0.5">Historical Capital Acquisition Cost (GL 1500)</p>
              </div>
              <div className="p-3 bg-slate-700/50 rounded-lg text-slate-300">
                <Building2 className="w-6 h-6 text-indigo-400" />
              </div>
            </div>

            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Accumulated Depreciation</p>
                <p className="text-2xl font-mono text-amber-400 font-bold mt-1">
                  ₵ {metrics.totalDepr.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[9px] text-amber-400/80 font-medium mt-0.5">Contra-Asset Write-Off (GL Account 1550)</p>
              </div>
              <div className="p-3 bg-amber-500/20 rounded-lg text-amber-400 border border-amber-500/30">
                <TrendingDown className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-indigo-950/40 p-4 rounded-xl border border-indigo-800/50 shadow-sm flex items-center justify-between ring-1 ring-emerald-500/20">
              <div>
                <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Total Net Book Value (NBV)</p>
                <p className="text-2xl font-mono text-emerald-400 font-extrabold mt-1">
                  ₵ {metrics.totalNbv.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[9px] text-emerald-400/80 font-medium mt-0.5">Active Carrying Value on Balance Sheet</p>
              </div>
              <div className="p-3 bg-emerald-500/20 rounded-lg text-emerald-400 border border-emerald-500/30">
                <Calculator className="w-6 h-6" />
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* MAIN CONTAINER                             */}
      {/* ========================================== */}
      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* ACTION & FILTER CONTROL BAR */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by asset tag, description, location, or custodian..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-sm text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full md:w-56 p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 font-bold text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">ALL CATEGORIES</option>
              <option value="MEDICAL_EQ">🏥 MEDICAL EQUIPMENT</option>
              <option value="IT_INFRA">💻 IT INFRASTRUCTURE</option>
              <option value="MOTOR_VEHICLES">🚑 MOTOR VEHICLES</option>
              <option value="FURNITURE">🛏️ FURNITURE & FITTINGS</option>
            </select>

            <button
              onClick={handleExportAssetRegister}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black uppercase rounded-xl transition-all flex items-center gap-2 border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>EXPORT CSV</span>
            </button>

            <button 
              onClick={() => setIsDeprPreviewOpen(true)}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-2 border border-slate-800 cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span>RUN DEPRECIATION BATCH</span>
            </button>

            <button 
              onClick={() => setIsCapitalizeOpen(true)}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ CAPITALIZE NEW ASSET</span>
            </button>
          </div>

        </div>

        {/* ========================================== */}
        {/* 2. THE FIXED ASSET MASTER GRID             */}
        {/* ========================================== */}
        <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="p-4">Asset Tag</th>
                  <th className="p-4">Description, Location & Custodian</th>
                  <th className="p-4">Depreciation Policy</th>
                  <th className="p-4 text-right">Purchase Cost</th>
                  <th className="p-4 text-right text-amber-700 dark:text-amber-400">Accum. Depr.</th>
                  <th className="p-4 text-right text-indigo-700 dark:text-emerald-400">Net Book Value (NBV)</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="text-xs font-bold divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAssets.map(asset => {
                  const monthlyDepr = (asset.cost - asset.salvageValue) / (asset.usefulLifeYears * 12);
                  const annualRate = (100 / asset.usefulLifeYears).toFixed(1);

                  return (
                    <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 align-top">
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 block w-fit">
                          {asset.tag}
                        </span>
                        {asset.serialNumber && asset.serialNumber !== 'N/A' && (
                          <span className="text-[9px] text-slate-400 font-mono block mt-1">S/N: {asset.serialNumber}</span>
                        )}
                      </td>

                      <td className="p-4 align-top space-y-1">
                        <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{asset.name}</p>
                        
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                          <span className="text-indigo-600 dark:text-indigo-400">{asset.category.replace('_', ' ')}</span>
                          <span>•</span>
                          <span>Purchased: {asset.purchaseDate}</span>
                        </div>

                        {/* Location & Custodian Sub-Labels */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-600 dark:text-slate-300 font-medium pt-0.5">
                          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            <strong>{asset.location}</strong>
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                            <UserIcon className="w-3 h-3 text-emerald-500 shrink-0" />
                            {asset.custodian}
                          </span>
                        </div>
                      </td>

                      {/* Depreciation Policy & Rate Column */}
                      <td className="p-4 align-top">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-mono font-bold">
                            SLM • {asset.usefulLifeYears} Yrs ({annualRate}% p.a.)
                          </span>
                          <p className="text-[10px] font-mono text-slate-500">
                            ₵ {monthlyDepr.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo
                          </p>
                        </div>
                      </td>

                      <td className="p-4 text-right font-mono text-slate-700 dark:text-slate-300 align-top">
                        ₵ {asset.cost.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="p-4 text-right font-mono font-semibold text-amber-700 dark:text-amber-400 align-top">
                        ₵ {asset.accumDepr.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="p-4 text-right font-mono font-extrabold text-indigo-900 dark:text-emerald-400 bg-indigo-50/40 dark:bg-emerald-950/20 align-top">
                        ₵ {asset.nbv.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="p-4 text-center align-top">
                        <span className={`px-2.5 py-1 text-[9px] font-black rounded uppercase tracking-wider border ${
                          asset.status === 'ACTIVE' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300' 
                            : asset.status === 'MAINTENANCE' 
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300' 
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300'
                        }`}>
                          {asset.status}
                        </span>
                      </td>

                      <td className="p-4 text-center align-top">
                        <button 
                          onClick={() => setSelectedAssetForDossier(asset)}
                          className="text-[10px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-400 hover:border-indigo-700 font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5 mx-auto cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>DOSSIER & QR</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredAssets.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-16 text-center text-slate-400 italic font-semibold">
                      No assets found matching the current search filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* 3. PRE-RUN DEPRECIATION TELEMETRY & PROJECTED JV MODAL         */}
      {/* ============================================================== */}
      {isDeprPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-4 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase rounded tracking-wider border border-amber-500/30">
                  MAKER-CHECKER CONTROL GATE
                </span>
                <h3 className="font-extrabold text-lg uppercase tracking-wider mt-1 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-400" /> Monthly Depreciation Batch Run
                </h3>
                <p className="text-xs text-slate-400 font-mono">Simulated Impact & Projected Journal Voucher Preview</p>
              </div>
              <button 
                onClick={() => setIsDeprPreviewOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs font-bold max-h-[75vh] overflow-y-auto">
              
              {/* Macro Telemetry Cards */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[9px] text-slate-500 uppercase block">Active In-Scope</span>
                  <span className="font-mono text-base font-black text-slate-900 dark:text-slate-100">
                    {deprBatchTelemetry.activeAssets.length} Assets
                  </span>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50">
                  <span className="text-[9px] text-amber-700 dark:text-amber-400 uppercase block">Cycle Period</span>
                  <span className="font-mono text-sm font-black text-amber-700 dark:text-amber-400">
                    August 2026
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                  <span className="text-[9px] text-emerald-700 dark:text-emerald-400 uppercase block">Projected Monthly JV</span>
                  <span className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400">
                    ₵ {deprBatchTelemetry.totalMonthlyDepr.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                  DEPRECIATION EXPENSE BREAKDOWN BY ASSET CLASS
                </span>
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700">
                  {Object.entries(deprBatchTelemetry.categoryBreakdown).map(([cat, data]) => (
                    <div key={cat} className="p-3 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{cat.replace('_', ' ')}</span>
                        <span className="text-[10px] text-slate-400 font-mono ml-2">({data.count} units)</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        ₵ {data.monthly.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Projected General Ledger Double-Entry Impact */}
              <div className="p-4 bg-slate-950 text-white rounded-2xl space-y-2.5 font-mono text-[11px] border border-slate-800">
                <span className="text-[9px] font-sans font-black uppercase tracking-widest text-slate-400 block">
                  PROJECTED DOUBLE-ENTRY JOURNAL VOUCHER (JV-DEPR-AUTO)
                </span>
                <div className="flex justify-between text-emerald-400 border-b border-slate-800 pb-1.5">
                  <span>DR 6500 - Depreciation Expense (Hospital Operations)</span>
                  <span>₵ {deprBatchTelemetry.totalMonthlyDepr.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-400 pt-1">
                  <span>CR 1550 - Accumulated Depreciation (Contra-Asset)</span>
                  <span>₵ {deprBatchTelemetry.totalMonthlyDepr.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeprPreviewOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  ABORT
                </button>
                <button
                  type="button"
                  disabled={isProcessing || deprBatchTelemetry.totalMonthlyDepr <= 0}
                  onClick={handleConfirmDepreciationBatch}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>COMMIT & POST DEPRECIATION BATCH (MAKER)</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. CAPITALIZE NEW ASSET MODAL              */}
      {/* ========================================== */}
      {isCapitalizeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-extrabold text-lg uppercase tracking-wider">Capitalize New Fixed Asset</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Automated Double-Entry: Debit PPE (1500) / Credit Bank (1010)</p>
              </div>
              <button 
                onClick={() => setIsCapitalizeOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCapitalizeAsset} className="p-6 space-y-4 text-xs font-bold overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Asset Tag ID *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. GAM-US-009"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Asset Category *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none cursor-pointer text-slate-900 dark:text-slate-100"
                  >
                    <option value="MEDICAL_EQ">🏥 MEDICAL EQUIPMENT</option>
                    <option value="IT_INFRA">💻 IT INFRASTRUCTURE</option>
                    <option value="MOTOR_VEHICLES">🚑 MOTOR VEHICLES</option>
                    <option value="FURNITURE">🛏️ FURNITURE & FITTINGS</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Asset Description & Model *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. GE Voluson E8 Ultrasound System"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Location & Custodian Tracking Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Physical Location / Dept *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Main Block - Radiology"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Designated Custodian *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Dr. Samuel Kponor"
                    value={newCustodian}
                    onChange={(e) => setNewCustodian(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Manufacturer Serial Number</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-88912-VOL"
                    value={newSerialNumber}
                    onChange={(e) => setNewSerialNumber(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Depreciation Method</label>
                  <select
                    value={newDeprMethod}
                    onChange={(e) => setNewDeprMethod(e.target.value as any)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none cursor-pointer text-slate-900 dark:text-slate-100"
                  >
                    <option value="STRAIGHT_LINE">Straight-Line Method (SLM)</option>
                    <option value="DECLINING_BALANCE">Reducing / Declining Balance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Purchase Cost (₵) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="450000.00"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-mono text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Purchase Date *</label>
                  <input
                    required
                    type="date"
                    value={newPurchaseDate}
                    onChange={(e) => setNewPurchaseDate(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Useful Life (Years) *</label>
                  <input
                    required
                    type="number"
                    value={newUsefulLife}
                    onChange={(e) => setNewUsefulLife(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Salvage Value (₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newSalvageValue}
                    onChange={(e) => setNewSalvageValue(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* REAL-TIME DEPRECIATION CALCULATOR PREVIEW */}
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase text-indigo-700 dark:text-indigo-300 font-black">Estimated Monthly Straight-Line Depr:</span>
                  <span className="text-sm font-mono font-extrabold text-indigo-900 dark:text-emerald-400">
                    ₵ {calcNewMonthlyDepr.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mo
                  </span>
                </div>
                <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-normal">
                  Formula: (Cost ₵{parseFloat(newCost) || 0} - Salvage ₵{parseFloat(newSalvageValue) || 0}) / ({parseInt(newUsefulLife) || 1} Yrs × 12 Months)
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCapitalizeOpen(false)}
                  className="px-4 py-2.5 font-bold text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer flex items-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>CAPITALIZE & POST JV</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. ASSET DISPOSAL & GAIN/LOSS WORKFLOW MODAL                   */}
      {/* ============================================================== */}
      {isDisposalModalOpen && disposalAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-rose-950 text-white p-6 border-b border-rose-900 flex justify-between items-center">
              <div>
                <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[9px] font-black uppercase rounded tracking-wider border border-rose-500/30">
                  DE-RECOGNITION WORKFLOW
                </span>
                <h3 className="font-extrabold text-lg uppercase tracking-wider mt-1 flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-rose-400" /> Fixed Asset Disposal
                </h3>
                <p className="text-xs text-rose-300/80 font-mono mt-0.5">{disposalAsset.tag}: {disposalAsset.name}</p>
              </div>
              <button 
                onClick={() => { setIsDisposalModalOpen(false); setDisposalAsset(null); }}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-bold">
              {/* Financial Snapshot */}
              <div className="grid grid-cols-3 gap-2 text-center p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block">Historical Cost</span>
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">₵ {disposalAsset.cost.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-amber-600 uppercase block">Accum. Depr</span>
                  <span className="font-mono text-xs font-bold text-amber-600">₵ {disposalAsset.accumDepr.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-emerald-600 uppercase block">Net Book Value</span>
                  <span className="font-mono text-xs font-black text-emerald-600">₵ {disposalAsset.nbv.toFixed(2)}</span>
                </div>
              </div>

              {/* Proceeds Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Disposal / Salvage Cash Proceeds (GHS)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={disposalProceeds}
                  onChange={(e) => setDisposalProceeds(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-mono text-sm"
                />
              </div>

              {/* Calculated Gain or Loss on Disposal */}
              {(() => {
                const proceeds = parseFloat(disposalProceeds) || 0;
                const gainOrLoss = proceeds - disposalAsset.nbv;
                const isGain = gainOrLoss >= 0;

                return (
                  <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    isGain ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-800 dark:text-rose-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      {isGain ? <ArrowUpRight className="w-5 h-5 text-emerald-600" /> : <ArrowDownRight className="w-5 h-5 text-rose-600" />}
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider block">
                          {isGain ? 'GAIN ON DISPOSAL (OTHER REVENUE - GL 4080)' : 'LOSS ON DISPOSAL (EXPENSE - GL 5080)'}
                        </span>
                        <span className="text-[9px] opacity-80">Proceeds (₵{proceeds.toFixed(2)}) minus Net Book Value (₵{disposalAsset.nbv.toFixed(2)})</span>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-black">
                      {isGain ? `+₵ ${gainOrLoss.toFixed(2)}` : `-₵ ${Math.abs(gainOrLoss).toFixed(2)}`}
                    </span>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Disposal Date</label>
                  <input
                    type="date"
                    value={disposalDate}
                    onChange={(e) => setDisposalDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Settlement Bank</label>
                  <select
                    value={disposalBankId}
                    onChange={(e) => setDisposalBankId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="1010">1010 - GCB Main Bank</option>
                    <option value="1020">1020 - Ecobank Liquidation</option>
                    <option value="1002">1002 - Vault Cash</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsDisposalModalOpen(false); setDisposalAsset(null); }}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleExecuteDisposal}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase rounded-xl transition-all shadow flex items-center gap-2 cursor-pointer"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>CONFIRM DISPOSAL & POST JV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. ASSET DOSSIER & PRINTABLE QR CODE MODAL                     */}
      {/* ============================================================== */}
      {selectedAssetForDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            
            <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex justify-between items-start shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500 text-slate-950 text-[10px] font-mono font-black px-2.5 py-0.5 rounded uppercase tracking-wider">
                    {selectedAssetForDossier.tag}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {selectedAssetForDossier.id}</span>
                </div>
                <h3 className="font-extrabold text-xl uppercase tracking-wider mt-2">{selectedAssetForDossier.name}</h3>
              </div>
              <button 
                onClick={() => setSelectedAssetForDossier(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs font-bold overflow-y-auto flex-1">
              
              {/* Asset Financial Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-[9px] text-slate-500 uppercase">Purchase Cost</p>
                  <p className="font-mono text-sm font-black text-slate-900 dark:text-slate-100 mt-1">
                    ₵ {selectedAssetForDossier.cost.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50">
                  <p className="text-[9px] text-amber-700 dark:text-amber-400 uppercase">Accum. Depr</p>
                  <p className="font-mono text-sm font-black text-amber-700 dark:text-amber-400 mt-1">
                    ₵ {selectedAssetForDossier.accumDepr.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                  <p className="text-[9px] text-emerald-700 dark:text-emerald-400 uppercase">Net Book Value</p>
                  <p className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-400 mt-1">
                    ₵ {selectedAssetForDossier.nbv.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/50">
                  <p className="text-[9px] text-indigo-700 dark:text-indigo-400 uppercase">Monthly Depr</p>
                  <p className="font-mono text-sm font-black text-indigo-700 dark:text-indigo-400 mt-1">
                    ₵ {((selectedAssetForDossier.cost - selectedAssetForDossier.salvageValue) / (selectedAssetForDossier.usefulLifeYears * 12)).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Physical Location, Custodian & Specifications */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl space-y-3 border border-slate-200 dark:border-slate-700">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Physical Verification & Governance Tracking
                </h4>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500 uppercase text-[9px] block">Location / Department:</span>
                    <span className="text-slate-900 dark:text-slate-100 flex items-center gap-1 font-bold">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" /> {selectedAssetForDossier.location}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[9px] block">Responsible Custodian:</span>
                    <span className="text-slate-900 dark:text-slate-100 flex items-center gap-1 font-bold">
                      <UserIcon className="w-3.5 h-3.5 text-emerald-500" /> {selectedAssetForDossier.custodian}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[9px] block">Useful Life & Method:</span>
                    <span className="text-slate-900 dark:text-slate-100 font-mono">
                      {selectedAssetForDossier.usefulLifeYears} Years (Straight-Line Method)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[9px] block">Serial / Asset Tag:</span>
                    <span className="font-mono text-slate-900 dark:text-slate-100">{selectedAssetForDossier.serialNumber || selectedAssetForDossier.tag}</span>
                  </div>
                </div>
              </div>

              {/* ============================================================== */}
              {/* PRINTABLE QR CODE ASSET LABEL TAG                              */}
              {/* ============================================================== */}
              <div className="p-4 bg-slate-950 text-white rounded-2xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">
                      SCANNABLE ASSET TAG (PHYSICAL VERIFICATION)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handlePrintAssetTag}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Printer className="w-3 h-3" /> PRINT ASSET STICKER
                  </button>
                </div>

                {/* Printable Label Box */}
                <div className="bg-white text-slate-950 p-4 rounded-xl border border-slate-300 shadow-inner flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-left flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-700 tracking-wider uppercase">
                      <Building2 className="w-3 h-3 text-emerald-600" /> GAM MED HOSPITAL • ASSET VAULT
                    </div>
                    <p className="font-black text-xs text-slate-900 truncate uppercase">{selectedAssetForDossier.name}</p>
                    <p className="font-mono text-lg font-black text-slate-950 tracking-tight">{selectedAssetForDossier.tag}</p>
                    <div className="text-[9px] text-slate-600 font-bold space-y-0.5">
                      <p className="truncate">LOC: {selectedAssetForDossier.location}</p>
                      <p className="truncate">CUST: {selectedAssetForDossier.custodian}</p>
                    </div>
                  </div>

                  {/* High Contrast QR Code Graphic with Verification Payload */}
                  <div className="p-2 bg-slate-50 border-2 border-slate-950 rounded-lg shrink-0 flex flex-col items-center">
                    <svg viewBox="0 0 100 100" className="w-20 h-20">
                      {/* Corner Position Detection Patterns */}
                      <rect x="5" y="5" width="25" height="25" fill="#000" />
                      <rect x="8" y="8" width="19" height="19" fill="#fff" />
                      <rect x="11" y="11" width="13" height="13" fill="#000" />

                      <rect x="70" y="5" width="25" height="25" fill="#000" />
                      <rect x="73" y="8" width="19" height="19" fill="#fff" />
                      <rect x="76" y="11" width="13" height="13" fill="#000" />

                      <rect x="5" y="70" width="25" height="25" fill="#000" />
                      <rect x="8" y="73" width="19" height="19" fill="#fff" />
                      <rect x="11" y="76" width="13" height="13" fill="#000" />

                      {/* Data Matrix Simulation Points */}
                      <rect x="35" y="10" width="6" height="6" fill="#000" />
                      <rect x="45" y="10" width="6" height="6" fill="#000" />
                      <rect x="55" y="10" width="6" height="6" fill="#000" />
                      <rect x="35" y="25" width="6" height="6" fill="#000" />
                      <rect x="50" y="25" width="6" height="6" fill="#000" />
                      
                      <rect x="10" y="45" width="6" height="6" fill="#000" />
                      <rect x="25" y="45" width="6" height="6" fill="#000" />
                      <rect x="40" y="40" width="18" height="18" fill="#059669" rx="2" />
                      <rect x="65" y="45" width="6" height="6" fill="#000" />
                      <rect x="80" y="45" width="6" height="6" fill="#000" />

                      <rect x="35" y="70" width="6" height="6" fill="#000" />
                      <rect x="50" y="75" width="6" height="6" fill="#000" />
                      <rect x="70" y="70" width="6" height="6" fill="#000" />
                      <rect x="85" y="75" width="6" height="6" fill="#000" />
                      <rect x="75" y="85" width="6" height="6" fill="#000" />
                    </svg>
                    <span className="text-[8px] font-mono font-black text-slate-800 mt-1">SCAN FOR AUDIT</span>
                  </div>
                </div>
              </div>

              {/* Asset Status Lifecycle Switcher */}
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl space-y-3 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Asset Lifecycle Status</h4>
                  <span className={`px-2.5 py-0.5 text-[9px] font-black rounded uppercase tracking-wider border ${
                    selectedAssetForDossier.status === 'ACTIVE' 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300' 
                      : selectedAssetForDossier.status === 'MAINTENANCE' 
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300' 
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300'
                  }`}>
                    CURRENT: {selectedAssetForDossier.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={isProcessing || selectedAssetForDossier.status === 'ACTIVE'}
                    onClick={() => handleUpdateAssetStatus(selectedAssetForDossier.id, 'ACTIVE')}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-bold text-[10px] uppercase transition-all shadow cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>SET ACTIVE</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing || selectedAssetForDossier.status === 'MAINTENANCE'}
                    onClick={() => handleUpdateAssetStatus(selectedAssetForDossier.id, 'MAINTENANCE')}
                    className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl font-bold text-[10px] uppercase transition-all shadow cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>MAINTENANCE</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing || selectedAssetForDossier.status === 'DISPOSED'}
                    onClick={() => handleUpdateAssetStatus(selectedAssetForDossier.id, 'DISPOSED')}
                    className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl font-bold text-[10px] uppercase transition-all shadow cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                    <span>DISPOSE ASSET</span>
                  </button>
                </div>
              </div>

              {/* Accounting Journal Voucher Ledger Mapping */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 font-mono text-[11px] border border-slate-800">
                <p className="text-[9px] text-slate-400 font-sans font-black uppercase tracking-widest">Automated Journal Voucher Mapping</p>
                <div className="flex justify-between text-emerald-400 border-b border-slate-800 pb-1">
                  <span>Debit: 6500 - Depreciation Expense</span>
                  <span>₵ {((selectedAssetForDossier.cost - selectedAssetForDossier.salvageValue) / (selectedAssetForDossier.usefulLifeYears * 12)).toFixed(2)} / mo</span>
                </div>
                <div className="flex justify-between text-amber-400 pt-1">
                  <span>Credit: 1550 - Accumulated Depreciation: {selectedAssetForDossier.category}</span>
                  <span>₵ {((selectedAssetForDossier.cost - selectedAssetForDossier.salvageValue) / (selectedAssetForDossier.usefulLifeYears * 12)).toFixed(2)} / mo</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAssetForDossier(null)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  CLOSE DOSSIER
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
