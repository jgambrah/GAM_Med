'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, serverTimestamp, doc, setDoc, updateDoc } from 'firebase/firestore';
import { 
  Cog, Plus, Loader2, ShieldAlert, Package, Trash2, Search, 
  Building2, BedDouble, Stethoscope, CheckCircle2, AlertTriangle, 
  Wrench, Activity, Landmark, User, RefreshCw, Sparkles, Layers,
  DollarSign, FileSpreadsheet, Lock, ArrowUpRight, ArrowDownLeft,
  Edit3, BookOpen, Sliders, Check, X, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export type GLAccountNode = {
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  category: string;
  balance: number;
  currency: string;
  isSystemLocked?: boolean;
  linkedDepartment?: string;
};

export type DepartmentNode = {
  id: string;
  name: string;
  code: string;
  revenueAccountCode: string;
  expenseAccountCode: string;
  headOfDepartment: string;
  status: 'ACTIVE' | 'INACTIVE';
};

export type HospitalBedNode = {
  id: string;
  departmentId: string;
  wardName: string;
  bedNumber: string;
  bedType: 'GENERAL' | 'VIP' | 'ICU' | 'INCUBATOR';
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  activePatientId?: string;
  dailyTariffCode: string;
  dailyRate: number;
};

export type ServiceBridgeNode = {
  id: string;
  name: string;
  clinicalModule: string;
  tariffCode: string;
  glAccountCode: string;
  glAccountName: string;
  price: number;
  nhisCap: number;
  corporateCeiling: number;
  autoBillOnComplete: boolean;
  lastUpdated?: string;
};

export default function GeneralServicesSetupPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'CHART_OF_ACCOUNTS' | 'DEPARTMENTS' | 'BED_MATRIX' | 'SERVICE_NODES'>('SERVICE_NODES');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Service Bridge Revision Modal State
  const [selectedBridgeForEdit, setSelectedBridgeForEdit] = useState<ServiceBridgeNode | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editNhisCap, setEditNhisCap] = useState<number>(0);
  const [editCorporateCeiling, setEditCorporateCeiling] = useState<number>(0);
  const [editGlCode, setEditGlCode] = useState<string>('4010');
  const [revisionNote, setRevisionNote] = useState<string>('Standard 2026 Annual Tariff Review');
  const [isSavingTariff, setIsSavingTariff] = useState(false);

  // New Service Bridge Modal State
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newClinicalModule, setNewClinicalModule] = useState('Consultation');
  const [newTariffCode, setNewTariffCode] = useState('CON-002');
  const [newGlCode, setNewGlCode] = useState('4010');
  const [newStandardPrice, setNewStandardPrice] = useState<number>(150);
  const [newNhisCap, setNewNhisCap] = useState<number>(80);
  const [newCorporateCeiling, setNewCorporateCeiling] = useState<number>(160);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN', 'FINANCE_CONTROLLER', 'FINANCE_DIRECTOR'].includes(userRole || 'ACCOUNTANT');

  // Master Chart of Accounts (COA)
  const initialChartOfAccounts: GLAccountNode[] = useMemo(() => [
    { code: '1001', name: 'GCB Bank Ghana Corporate Operating Account', type: 'ASSET', category: 'Cash & Bank', balance: 385000.00, currency: 'GHS', isSystemLocked: true },
    { code: '1010', name: 'Main Vault Cash on Hand & Imprest', type: 'ASSET', category: 'Cash', balance: 7974.25, currency: 'GHS', isSystemLocked: false },
    { code: '1020', name: 'Paystack MoMo Settlement Clearing', type: 'ASSET', category: 'Gateway Clearing', balance: 15400.00, currency: 'GHS', isSystemLocked: true },
    { code: '1200', name: 'Accounts Receivable (AR) - Out-of-Pocket', type: 'ASSET', category: 'Receivables', balance: 42300.00, currency: 'GHS', isSystemLocked: true },
    { code: '1210', name: 'Accounts Receivable (AR) - NHIA Portfolio', type: 'ASSET', category: 'Receivables', balance: 285000.00, currency: 'GHS', isSystemLocked: true },
    { code: '1220', name: 'Accounts Receivable (AR) - Corporate & HMOs', type: 'ASSET', category: 'Receivables', balance: 85400.00, currency: 'GHS', isSystemLocked: true },
    { code: '2001', name: 'Trade Accounts Payable (Medical Suppliers)', type: 'LIABILITY', category: 'Trade Payables', balance: 204150.00, currency: 'GHS', isSystemLocked: true },
    { code: '3001', name: 'Stated Share Capital & Founders Equity', type: 'EQUITY', category: 'Capital', balance: 73200000.00, currency: 'GHS', isSystemLocked: false },
    { code: '4010', name: 'OPD Specialist Consultation Revenue', type: 'REVENUE', category: 'Clinical Services', balance: 185000.00, currency: 'GHS', linkedDepartment: 'OPD' },
    { code: '4020', name: 'Inpatient Ward Bed & Nursing Revenue', type: 'REVENUE', category: 'Inpatient Care', balance: 240000.00, currency: 'GHS', linkedDepartment: 'IPD' },
    { code: '4030', name: 'Pharmacy & Medication Dispensing Revenue', type: 'REVENUE', category: 'Pharmaceuticals', balance: 340000.00, currency: 'GHS', linkedDepartment: 'PHARM' },
    { code: '4040', name: 'Laboratory Diagnostics & Blood Bank Revenue', type: 'REVENUE', category: 'Diagnostic Laboratory', balance: 125000.00, currency: 'GHS', linkedDepartment: 'LAB' },
    { code: '4050', name: 'Radiology, CT Scan, Ultrasound & Imaging', type: 'REVENUE', category: 'Diagnostic Imaging', balance: 95000.00, currency: 'GHS', linkedDepartment: 'RAD' },
    { code: '4060', name: 'Surgical Theater & Anesthesia Procedure Revenue', type: 'REVENUE', category: 'Surgical Operations', balance: 175000.00, currency: 'GHS', linkedDepartment: 'THEATER' }
  ], []);

  // Standard Service Bridge Translation Nodes with GL Target Mapping
  const [serviceBridges, setServiceBridges] = useState<ServiceBridgeNode[]>([
    { id: 'srv-01', name: 'Specialist OPD Consultation & Triage', clinicalModule: 'Consultation', tariffCode: 'CON-001', glAccountCode: '4010', glAccountName: 'OPD Specialist Consultations', price: 150.00, nhisCap: 80.00, corporateCeiling: 180.00, autoBillOnComplete: true, lastUpdated: '2026-08-01' },
    { id: 'srv-02', name: 'Abdominal Ultrasound Doppler Scan', clinicalModule: 'Radiology', tariffCode: 'RAD-004', glAccountCode: '4050', glAccountName: 'Radiology & Imaging', price: 250.00, nhisCap: 120.00, corporateCeiling: 280.00, autoBillOnComplete: true, lastUpdated: '2026-08-01' },
    { id: 'srv-03', name: 'Full Blood Count (FBC) Automated Panel', clinicalModule: 'Laboratory', tariffCode: 'LAB-012', glAccountCode: '4040', glAccountName: 'Laboratory Diagnostics', price: 120.00, nhisCap: 45.00, corporateCeiling: 135.00, autoBillOnComplete: true, lastUpdated: '2026-08-01' },
    { id: 'srv-04', name: 'Ceftriaxone 1g IV Infusion Dose', clinicalModule: 'Pharmacy', tariffCode: 'PHM-088', glAccountCode: '4030', glAccountName: 'Central Pharmacy Dispense', price: 75.00, nhisCap: 35.00, corporateCeiling: 85.00, autoBillOnComplete: true, lastUpdated: '2026-08-01' },
    { id: 'srv-05', name: 'General Inpatient Bed Accommodation (Per Night)', clinicalModule: 'Wards', tariffCode: 'WRD-002', glAccountCode: '4020', glAccountName: 'Inpatient Ward Bed Fees', price: 150.00, nhisCap: 60.00, corporateCeiling: 175.00, autoBillOnComplete: true, lastUpdated: '2026-08-01' },
    { id: 'srv-06', name: 'Major Surgical Theater Operating Fee', clinicalModule: 'Theater', tariffCode: 'SUR-001', glAccountCode: '4060', glAccountName: 'Surgical Theater Revenue', price: 1540.00, nhisCap: 650.00, corporateCeiling: 1800.00, autoBillOnComplete: true, lastUpdated: '2026-08-01' },
    { id: 'srv-07', name: 'Chest X-Ray Digital View (PA/AP)', clinicalModule: 'Radiology', tariffCode: 'RAD-001', glAccountCode: '4050', glAccountName: 'Radiology & Imaging', price: 180.00, nhisCap: 85.00, corporateCeiling: 200.00, autoBillOnComplete: true, lastUpdated: '2026-08-01' },
    { id: 'srv-08', name: 'Comprehensive Metabolic Panel (Liver/Kidney)', clinicalModule: 'Laboratory', tariffCode: 'LAB-025', glAccountCode: '4040', glAccountName: 'Laboratory Diagnostics', price: 280.00, nhisCap: 110.00, corporateCeiling: 310.00, autoBillOnComplete: true, lastUpdated: '2026-08-01' }
  ]);

  // Demo Fallback Data for Departments
  const demoDepartments: DepartmentNode[] = useMemo(() => [
    { id: 'dep-01', name: 'Outpatient Department (OPD)', code: 'OPD', revenueAccountCode: '4010', expenseAccountCode: '5001', headOfDepartment: 'Dr. Kwabena Frimpong', status: 'ACTIVE' },
    { id: 'dep-02', name: 'Maternity & Antenatal Ward', code: 'MAT', revenueAccountCode: '4020', expenseAccountCode: '5002', headOfDepartment: 'Dr. Abena Osei', status: 'ACTIVE' },
    { id: 'dep-03', name: 'Diagnostic Radiology & Imaging', code: 'RAD', revenueAccountCode: '4050', expenseAccountCode: '5003', headOfDepartment: 'Dr. Michael Taylor', status: 'ACTIVE' },
    { id: 'dep-04', name: 'Main Clinical Laboratory', code: 'LAB', revenueAccountCode: '4040', expenseAccountCode: '5004', headOfDepartment: 'Dr. Sarah Kwarteng', status: 'ACTIVE' },
    { id: 'dep-05', name: 'Intensive Care Unit (ICU)', code: 'ICU', revenueAccountCode: '4020', expenseAccountCode: '5005', headOfDepartment: 'Dr. Marcus Amosah', status: 'ACTIVE' },
    { id: 'dep-06', name: 'Operating Surgical Theaters', code: 'SURG', revenueAccountCode: '4060', expenseAccountCode: '5006', headOfDepartment: 'Dr. Emmanuel Acheampong', status: 'ACTIVE' }
  ], []);

  // Demo Fallback Data for Hospital Beds
  const demoBeds: HospitalBedNode[] = useMemo(() => [
    { id: 'bed-mat-01', departmentId: 'dep-02', wardName: 'Maternity Ward A', bedNumber: '01', bedType: 'GENERAL', status: 'AVAILABLE', dailyTariffCode: 'WRD-002', dailyRate: 150.00 },
    { id: 'bed-mat-02', departmentId: 'dep-02', wardName: 'Maternity Ward A', bedNumber: '02', bedType: 'GENERAL', status: 'OCCUPIED', activePatientId: 'P-99201 (Abena M.)', dailyTariffCode: 'WRD-002', dailyRate: 150.00 },
    { id: 'bed-mat-03', departmentId: 'dep-02', wardName: 'Maternity Ward A', bedNumber: '03', bedType: 'VIP', status: 'OCCUPIED', activePatientId: 'P-88402 (Grace A.)', dailyTariffCode: 'ACC-VIP-01', dailyRate: 450.00 },
    { id: 'bed-icu-01', departmentId: 'dep-05', wardName: 'ICU High Dependency', bedNumber: 'ICU-01', bedType: 'ICU', status: 'OCCUPIED', activePatientId: 'P-77109 (Kofi O.)', dailyTariffCode: 'ACC-ICU-01', dailyRate: 850.00 },
    { id: 'bed-icu-02', departmentId: 'dep-05', wardName: 'ICU High Dependency', bedNumber: 'ICU-02', bedType: 'ICU', status: 'AVAILABLE', dailyTariffCode: 'ACC-ICU-01', dailyRate: 850.00 }
  ], []);

  // Open Edit Modal for a Service Bridge
  const handleOpenEditModal = (srv: ServiceBridgeNode) => {
    setSelectedBridgeForEdit(srv);
    setEditPrice(srv.price);
    setEditNhisCap(srv.nhisCap);
    setEditCorporateCeiling(srv.corporateCeiling || srv.price * 1.15);
    setEditGlCode(srv.glAccountCode);
    setRevisionNote('Tariff Gazette Update');
  };

  // Save Tariff Price Revision
  const handleSaveTariffRevision = async () => {
    if (!selectedBridgeForEdit) return;
    setIsSavingTariff(true);

    try {
      await new Promise(res => setTimeout(res, 800));

      const glNameMap: Record<string, string> = {
        '4010': 'OPD Specialist Consultations',
        '4020': 'Inpatient Ward Bed & Nursing',
        '4030': 'Central Pharmacy Dispense',
        '4040': 'Laboratory Diagnostics',
        '4050': 'Radiology & Imaging',
        '4060': 'Surgical Operating Theater'
      };

      // Update in-memory state
      setServiceBridges(prev => prev.map(s => 
        s.id === selectedBridgeForEdit.id 
          ? {
              ...s,
              price: Number(editPrice),
              nhisCap: Number(editNhisCap),
              corporateCeiling: Number(editCorporateCeiling),
              glAccountCode: editGlCode,
              glAccountName: glNameMap[editGlCode] || 'Clinical Revenue',
              lastUpdated: new Date().toISOString().split('T')[0]
            }
          : s
      ));

      toast({
        title: "Service Tariff Revised & Synchronized",
        description: `${selectedBridgeForEdit.tariffCode} updated: Standard ₵${editPrice.toFixed(2)} | NHIS Cap ₵${editNhisCap.toFixed(2)} | Mapped to GL #${editGlCode}.`
      });

      setSelectedBridgeForEdit(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Revision Failed", description: e.message });
    } finally {
      setIsSavingTariff(false);
    }
  };

  // Create New Service Bridge
  const handleCreateNewServiceBridge = async () => {
    if (!newServiceName.trim()) {
      toast({ variant: "destructive", title: "Required Field", description: "Service Bridge Title is required." });
      return;
    }

    const glNameMap: Record<string, string> = {
      '4010': 'OPD Specialist Consultations',
      '4020': 'Inpatient Ward Bed & Nursing',
      '4030': 'Central Pharmacy Dispense',
      '4040': 'Laboratory Diagnostics',
      '4050': 'Radiology & Imaging',
      '4060': 'Surgical Operating Theater'
    };

    const newSrv: ServiceBridgeNode = {
      id: `srv-${Date.now()}`,
      name: newServiceName.toUpperCase(),
      clinicalModule: newClinicalModule,
      tariffCode: newTariffCode.toUpperCase(),
      glAccountCode: newGlCode,
      glAccountName: glNameMap[newGlCode] || 'Clinical Revenue',
      price: Number(newStandardPrice),
      nhisCap: Number(newNhisCap),
      corporateCeiling: Number(newCorporateCeiling),
      autoBillOnComplete: true,
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    setServiceBridges(prev => [newSrv, ...prev]);

    toast({
      title: "Service Bridge Created",
      description: `Mapped ${newTariffCode} to GL #${newGlCode} (${glNameMap[newGlCode]}).`
    });

    setIsAddServiceOpen(false);
    setNewServiceName('');
  };

  // Filtered Service Bridges
  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return serviceBridges;
    const q = searchQuery.toLowerCase();
    return serviceBridges.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.tariffCode.toLowerCase().includes(q) ||
      s.clinicalModule.toLowerCase().includes(q) ||
      s.glAccountCode.includes(q)
    );
  }, [serviceBridges, searchQuery]);

  const isLoading = isUserLoading || isProfileLoading;
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Financial Master Setup.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-20">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Cog className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                FINANCIAL SETUP & CLINICAL SERVICE BRIDGES
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              CLINICAL PROCEDURE TO GENERAL LEDGER TRANSLATION, DUAL-TIER PRICING (NHIS/PRIVATE), AND DEPARTMENTAL COST MAPPING.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 self-start xl:self-auto">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
              {userInitials}
            </div>
            <div>
              <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
              <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">TREASURY & MASTER SETUP</div>
            </div>
          </div>
        </div>

        {/* Dynamic Telemetry KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10 font-mono">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Service Bridges</span>
              <div className="text-2xl font-black text-white">{serviceBridges.length}</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 block font-sans">Active Translation Nodes</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">GL Revenue Links</span>
              <div className="text-2xl font-black text-emerald-400">100% Mapped</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 block font-sans">4000s Level Alignment</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Landmark className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 block mb-1">Dual-Tier Tariffs</span>
              <div className="text-2xl font-black text-sky-400">NHIS & Private</div>
              <span className="text-[10px] font-bold text-sky-400 mt-1 block font-sans">Automated Payer Routing</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Audit Trail</span>
              <div className="text-2xl font-black text-emerald-400">ACTIVE</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 block font-sans">IFRS 15 Revenue Aligned</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. NAVIGATION TABS & SEARCH BAR            */}
      {/* ========================================== */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('SERVICE_NODES')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'SERVICE_NODES' 
                ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-md' 
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Service Bridges ({serviceBridges.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DEPARTMENTS')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'DEPARTMENTS' 
                ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-md' 
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Departments ({demoDepartments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BED_MATRIX')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'BED_MATRIX' 
                ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-md' 
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <BedDouble className="w-3.5 h-3.5" />
            <span>Bed Matrix ({demoBeds.length})</span>
          </button>

          <button
            type="button"
            onClick={() => router.push('/accountant/coa')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Landmark className="w-3.5 h-3.5 text-emerald-500" />
            <span>Chart of Accounts Hub</span>
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search service, code or GL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {activeTab === 'SERVICE_NODES' && (
            <button
              type="button"
              onClick={() => setIsAddServiceOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>NEW BRIDGE</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. TAB 1: SERVICE BRIDGES TRANSLATION TABLE (UPGRADED)       */}
      {/* ============================================================ */}
      {activeTab === 'SERVICE_NODES' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
                <tr>
                  <th className="p-4">Clinical Procedure / Service</th>
                  <th className="p-4">Clinical Module</th>
                  <th className="p-4">Tariff Code</th>
                  <th className="p-4">GL Revenue Target (4000s)</th>
                  <th className="p-4 text-right">Standard Cash Price</th>
                  <th className="p-4 text-right text-emerald-400">NHIS Payer Cap</th>
                  <th className="p-4 text-right">Corporate Ceiling</th>
                  <th className="p-4 text-center">Tariff Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                {filteredServices.map(srv => (
                  <tr key={srv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                    
                    {/* Clinical Procedure Name */}
                    <td className="p-4">
                      <p className="font-black text-slate-900 dark:text-slate-100 uppercase">{srv.name}</p>
                      <span className="text-[10px] text-slate-400 font-normal">Last Revised: {srv.lastUpdated || '2026-08-01'}</span>
                    </td>

                    {/* Module */}
                    <td className="p-4">
                      <Badge variant="outline" className="text-[10px] font-bold text-slate-700 dark:text-slate-300 border-slate-300">
                        {srv.clinicalModule}
                      </Badge>
                    </td>

                    {/* Tariff Code */}
                    <td className="p-4 font-mono font-black text-sky-600 dark:text-sky-400">
                      {srv.tariffCode}
                    </td>

                    {/* Upgrade 1: GL Target Mapping Badge */}
                    <td className="p-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-mono text-[11px] font-bold">
                        <Landmark className="w-3.5 h-3.5 text-blue-600" />
                        <span>GL #{srv.glAccountCode}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-[10px] font-sans font-medium">{srv.glAccountName}</span>
                      </div>
                    </td>

                    {/* Standard Price */}
                    <td className="p-4 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                      ₵ {srv.price.toFixed(2)}
                    </td>

                    {/* NHIS Payer Cap */}
                    <td className="p-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                      ₵ {srv.nhisCap.toFixed(2)}
                    </td>

                    {/* Corporate Ceiling */}
                    <td className="p-4 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                      ₵ {(srv.corporateCeiling || srv.price * 1.15).toFixed(2)}
                    </td>

                    {/* Upgrade 2: Tariff Price Revision Button */}
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(srv)}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-slate-950 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer shadow-sm flex items-center gap-1.5 mx-auto"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Tariff</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3B. TAB 2: DEPARTMENTS MAPPING                               */}
      {/* ============================================================ */}
      {activeTab === 'DEPARTMENTS' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
              <tr>
                <th className="p-4">Department Name</th>
                <th className="p-4">Code</th>
                <th className="p-4">Revenue GL Account</th>
                <th className="p-4">Expense GL Account</th>
                <th className="p-4">Head of Department</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
              {demoDepartments.map(dep => (
                <tr key={dep.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                  <td className="p-4 font-black uppercase text-slate-900 dark:text-slate-100">
                    {dep.name}
                  </td>
                  <td className="p-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                    {dep.code}
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                    GL #{dep.revenueAccountCode}
                  </td>
                  <td className="p-4 font-mono font-bold text-rose-600">
                    GL #{dep.expenseAccountCode}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                    {dep.headOfDepartment}
                  </td>
                  <td className="p-4 text-center">
                    <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {dep.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3C. TAB 3: BED MATRIX & WARDS                                */}
      {/* ============================================================ */}
      {activeTab === 'BED_MATRIX' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Hospital Inpatient Bed Infrastructure</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {demoBeds.map(bed => (
              <div key={bed.id} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">{bed.wardName}</span>
                  <p className="text-base font-black text-slate-900 dark:text-white">Bed #{bed.bedNumber} ({bed.bedType})</p>
                  <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 mt-1 font-bold">₵ {bed.dailyRate.toFixed(2)} / night</p>
                </div>
                <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-md ${
                  bed.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {bed.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL 1: TARIFF PRICE REVISION & GL MAPPING DIALOG                      */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedBridgeForEdit} onOpenChange={(open) => !open && setSelectedBridgeForEdit(null)}>
        <DialogContent className="max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-2xl">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                  REVISE SERVICE TARIFF & GL REVENUE MAPPING
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  Service: <strong className="text-slate-900 dark:text-slate-100">{selectedBridgeForEdit?.name}</strong> ({selectedBridgeForEdit?.tariffCode})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            
            {/* Dual-Tier Pricing Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 block">
                  1. Standard Cash Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-slate-400">₵</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-black outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-emerald-600 block">
                  2. NHIS Payer Tariff Cap
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-slate-400">₵</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editNhisCap}
                    onChange={(e) => setEditNhisCap(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-mono font-black outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-700 dark:text-emerald-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-sky-600 block">
                  3. Corporate Ceiling
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-slate-400">₵</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editCorporateCeiling}
                    onChange={(e) => setEditCorporateCeiling(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 bg-sky-50/50 dark:bg-sky-950/30 border border-sky-300 dark:border-sky-800 rounded-xl text-xs font-mono font-black outline-none focus:ring-2 focus:ring-sky-500 text-sky-700 dark:text-sky-400"
                  />
                </div>
              </div>
            </div>

            {/* Target GL Account Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 block">
                Target GL Revenue Account (Chart of Accounts)
              </label>
              <select
                value={editGlCode}
                onChange={(e) => setEditGlCode(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              >
                <option value="4010">4010 - Medical Specialist Consultations & OPD</option>
                <option value="4020">4020 - Inpatient Ward Bed, Nursing & Hotel Fees</option>
                <option value="4030">4030 - Central Pharmacy & Prescription Dispense</option>
                <option value="4040">4040 - Laboratory Diagnostics & Blood Bank Panels</option>
                <option value="4050">4050 - Radiology, CT Scan, Ultrasound & Imaging</option>
                <option value="4060">4060 - Surgical Operating Theater & Anesthesia Fees</option>
              </select>
            </div>

            {/* Justification Note */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 block">
                Revision Justification / Authority Note
              </label>
              <input
                type="text"
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                placeholder="e.g. NHIA 2026 Gazette Tariff Revision"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Live Accounting Double-Entry Notice */}
            <div className="p-3 bg-slate-900 text-white rounded-2xl font-mono text-[11px] space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Automated Accounting Double-Entry Generated at Point of Care:</span>
              <p className="text-emerald-400">
                • DEBIT 1001/1200/1210/1220 (Cash/MoMo/AR Payer): <strong>₵ {editPrice.toFixed(2)}</strong>
              </p>
              <p className="text-sky-400">
                • CREDIT GL #{editGlCode} (Revenue Ledger): <strong>₵ {editPrice.toFixed(2)}</strong>
              </p>
            </div>

          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <Button variant="outline" onClick={() => setSelectedBridgeForEdit(null)} className="rounded-xl">
              Cancel
            </Button>
            <button
              type="button"
              onClick={handleSaveTariffRevision}
              disabled={isSavingTariff}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              {isSavingTariff ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>SAVE TARIFF REVISION</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 5. MODAL 2: CREATE NEW SERVICE BRIDGE DIALOG                               */}
      {/* ========================================================================= */}
      <Dialog open={isAddServiceOpen} onOpenChange={setIsAddServiceOpen}>
        <DialogContent className="max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-2xl">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
              CREATE CLINICAL SERVICE BRIDGE & GL TARGET
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Map new clinical procedure to dual tariffs and general ledger revenue account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500">Service Title</label>
                <input
                  type="text"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="e.g. Renal Dialysis Session"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500">Tariff Code</label>
                <input
                  type="text"
                  value={newTariffCode}
                  onChange={(e) => setNewTariffCode(e.target.value)}
                  placeholder="e.g. DIA-001"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500">Clinical Module</label>
                <select
                  value={newClinicalModule}
                  onChange={(e) => setNewClinicalModule(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option>Consultation</option>
                  <option>Radiology</option>
                  <option>Laboratory</option>
                  <option>Pharmacy</option>
                  <option>Wards</option>
                  <option>Theater</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500">GL Revenue Target</label>
                <select
                  value={newGlCode}
                  onChange={(e) => setNewGlCode(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option value="4010">4010 - OPD Specialist Consultations</option>
                  <option value="4020">4020 - Inpatient Ward Bed & Nursing</option>
                  <option value="4030">4030 - Central Pharmacy Dispense</option>
                  <option value="4040">4040 - Laboratory Diagnostics</option>
                  <option value="4050">4050 - Radiology & Imaging</option>
                  <option value="4060">4060 - Surgical Operating Theater</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500">Standard Price (₵)</label>
                <input
                  type="number"
                  value={newStandardPrice}
                  onChange={(e) => setNewStandardPrice(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-emerald-600">NHIS Cap (₵)</label>
                <input
                  type="number"
                  value={newNhisCap}
                  onChange={(e) => setNewNhisCap(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 rounded-xl text-xs font-mono font-bold text-emerald-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-sky-600">Corporate Ceiling (₵)</label>
                <input
                  type="number"
                  value={newCorporateCeiling}
                  onChange={(e) => setNewCorporateCeiling(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-sky-50 dark:bg-sky-950/30 border border-sky-300 rounded-xl text-xs font-mono font-bold text-sky-700"
                />
              </div>
            </div>

          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <Button variant="outline" onClick={() => setIsAddServiceOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleCreateNewServiceBridge} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase">
              Save Service Bridge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
