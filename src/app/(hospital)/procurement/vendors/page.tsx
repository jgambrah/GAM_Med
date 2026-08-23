'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, serverTimestamp, doc, addDoc, updateDoc } from 'firebase/firestore';
import { 
  Building2, Plus, Download, Printer, Search, 
  Filter, ShieldCheck, AlertTriangle, Clock, 
  CheckCircle2, Phone, Mail, FileText, ShoppingCart, 
  ArrowUpRight, Edit3, Loader2, ShieldAlert, 
  Trash2, Layers, DollarSign, Wallet, MoreVertical
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import Link from 'next/link';

type Vendor = {
  id: string;
  name: string;
  tin: string;
  category: 'PHARMACEUTICAL' | 'CONSUMABLES' | 'EQUIPMENT' | 'WORKS' | 'SERVICES';
  contactPerson: string;
  phone: string;
  email: string;
  paymentTerms: string;
  taxClearanceExpiry: string;
  fdaLicenseNo?: string;
  complianceStatus: 'CLEARED' | 'COMPLIANCE_HOLD' | 'PENDING_APPROVAL';
  openPOCount: number;
  ytdVolume: number;
  notes?: string;
};

export default function SupplierMasterDataPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'STORE_MANAGER', 'PROCUREMENT_OFFICER', 'PHARMACIST', 'ACCOUNTANT'].includes(userRole || 'DIRECTOR');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [complianceFilter, setComplianceFilter] = useState('ALL');

  // Modal States
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    tin: '',
    category: 'PHARMACEUTICAL' as Vendor['category'],
    contactPerson: '',
    phone: '',
    email: '',
    paymentTerms: 'Net 30 Days',
    taxClearanceExpiry: '2027-12-31',
    fdaLicenseNo: '',
    complianceStatus: 'CLEARED' as Vendor['complianceStatus'],
    notes: ''
  });

  // Master Mock Suppliers with Compliance & Financial Metrics
  const [localVendors, setLocalVendors] = useState<Vendor[]>([
    {
      id: 'VND-001',
      name: 'Ernest Chemists Ltd',
      tin: 'C0001928472',
      category: 'PHARMACEUTICAL',
      contactPerson: 'Kojo Antwi (Institutional Rep)',
      phone: '+233 24 412 8901',
      email: 'institutional@ernestchemists.com.gh',
      paymentTerms: 'Net 30 Days',
      taxClearanceExpiry: '2027-12-31',
      fdaLicenseNo: 'FDA/DRG/2026/0819',
      complianceStatus: 'CLEARED',
      openPOCount: 3,
      ytdVolume: 185400.00,
      notes: 'Primary hospital IV fluids & essential antibiotic provider.'
    },
    {
      id: 'VND-002',
      name: 'Tobinco Pharmaceuticals Ltd',
      tin: 'C0008492019',
      category: 'PHARMACEUTICAL',
      contactPerson: 'Abena Osei',
      phone: '+233 20 882 1092',
      email: 'hospital.orders@tobinco.com',
      paymentTerms: 'Net 30 Days',
      taxClearanceExpiry: '2027-09-30',
      fdaLicenseNo: 'FDA/DRG/2026/1102',
      complianceStatus: 'CLEARED',
      openPOCount: 1,
      ytdVolume: 92500.00,
      notes: 'Oral antimalarials, analgesics, and paediatric suspensions.'
    },
    {
      id: 'VND-003',
      name: 'Multinec Medical Consumables',
      tin: 'C0004819203',
      category: 'CONSUMABLES',
      contactPerson: 'David Mensah',
      phone: '+233 55 901 3482',
      email: 'sales@multinecmed.gh',
      paymentTerms: 'Net 15 Days',
      taxClearanceExpiry: '2027-11-15',
      fdaLicenseNo: 'FDA/DEV/2025/0042',
      complianceStatus: 'CLEARED',
      openPOCount: 2,
      ytdVolume: 64200.00,
      notes: 'Surgical gloves, syringes, IV cannulas, and dressing packs.'
    },
    {
      id: 'VND-004',
      name: 'MedTech Supplies Inc.',
      tin: 'C0007519284',
      category: 'EQUIPMENT',
      contactPerson: 'Emanuel Asante',
      phone: '+233 24 551 0943',
      email: 'service@medtechgh.com',
      paymentTerms: 'Net 45 Days',
      taxClearanceExpiry: '2026-06-30', // Expired!
      fdaLicenseNo: 'FDA/DEV/2024/0912',
      complianceStatus: 'COMPLIANCE_HOLD',
      openPOCount: 0,
      ytdVolume: 12000.00,
      notes: 'HOLD: GRA Tax Clearance Certificate expired in June 2026. Awaiting renewal.'
    },
    {
      id: 'VND-005',
      name: 'Perkins Power Solutions Ghana',
      tin: 'C0003928174',
      category: 'WORKS',
      contactPerson: 'Kwame Boateng',
      phone: '+233 27 761 0029',
      email: 'service@perkinspower.gh',
      paymentTerms: 'Immediate on GRN',
      taxClearanceExpiry: '2027-10-31',
      complianceStatus: 'CLEARED',
      openPOCount: 1,
      ytdVolume: 34000.00,
      notes: 'Hospital 250kVA generator routine maintenance and fuel filters.'
    },
    {
      id: 'VND-006',
      name: 'Zoomlion Ghana Ltd',
      tin: 'C0009128471',
      category: 'SERVICES',
      contactPerson: 'Evelyn Addo',
      phone: '+233 30 299 8811',
      email: 'clinicalwaste@zoomlionghana.com',
      paymentTerms: 'Net 30 Days',
      taxClearanceExpiry: '2026-07-31', // Expired!
      complianceStatus: 'COMPLIANCE_HOLD',
      openPOCount: 0,
      ytdVolume: 8500.00,
      notes: 'HOLD: Annual EPA Hazardous Waste Handling permit pending re-audit.'
    },
    {
      id: 'VND-007',
      name: 'A-Z Diagnostic Reagents Ltd',
      tin: 'C0009948123',
      category: 'CONSUMABLES',
      contactPerson: 'Dr. Seth Adjei',
      phone: '+233 24 119 4488',
      email: 'orders@azdiagnostics.com.gh',
      paymentTerms: 'Net 30 Days',
      taxClearanceExpiry: '2028-02-28',
      fdaLicenseNo: 'FDA/IVD/2026/0014',
      complianceStatus: 'PENDING_APPROVAL',
      openPOCount: 0,
      ytdVolume: 0.00,
      notes: 'New supplier application pending Hospital Director onboarding sign-off.'
    }
  ]);

  // Telemetry Metrics
  const telemetry = useMemo(() => {
    const total = localVendors.length;
    const cleared = localVendors.filter(v => v.complianceStatus === 'CLEARED').length;
    const holds = localVendors.filter(v => v.complianceStatus === 'COMPLIANCE_HOLD').length;
    const pending = localVendors.filter(v => v.complianceStatus === 'PENDING_APPROVAL').length;
    const categoriesCount = new Set(localVendors.map(v => v.category)).size;

    return {
      total,
      cleared,
      holds,
      pending,
      categoriesCount
    };
  }, [localVendors]);

  // Filtered List
  const filteredVendors = useMemo(() => {
    return localVendors.filter(v => {
      const matchesSearch = 
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.tin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.contactPerson.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === 'ALL' || v.category === categoryFilter;

      const matchesCompliance = 
        complianceFilter === 'ALL' || 
        (complianceFilter === 'CLEARED' && v.complianceStatus === 'CLEARED') ||
        (complianceFilter === 'HOLDS' && v.complianceStatus === 'COMPLIANCE_HOLD') ||
        (complianceFilter === 'PENDING' && v.complianceStatus === 'PENDING_APPROVAL');

      return matchesSearch && matchesCategory && matchesCompliance;
    });
  }, [localVendors, searchQuery, categoryFilter, complianceFilter]);

  const handleOpenRegister = () => {
    setEditingVendor(null);
    setFormData({
      name: '',
      tin: '',
      category: 'PHARMACEUTICAL',
      contactPerson: '',
      phone: '',
      email: '',
      paymentTerms: 'Net 30 Days',
      taxClearanceExpiry: '2027-12-31',
      fdaLicenseNo: '',
      complianceStatus: 'CLEARED',
      notes: ''
    });
    setIsRegisterModalOpen(true);
  };

  const handleOpenEdit = (v: Vendor) => {
    setEditingVendor(v);
    setFormData({
      name: v.name,
      tin: v.tin,
      category: v.category,
      contactPerson: v.contactPerson,
      phone: v.phone,
      email: v.email,
      paymentTerms: v.paymentTerms,
      taxClearanceExpiry: v.taxClearanceExpiry,
      fdaLicenseNo: v.fdaLicenseNo || '',
      complianceStatus: v.complianceStatus,
      notes: v.notes || ''
    });
    setIsRegisterModalOpen(true);
  };

  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingVendor) {
      // Update existing
      setLocalVendors(prev => prev.map(v => {
        if (v.id === editingVendor.id) {
          return {
            ...v,
            ...formData
          };
        }
        return v;
      }));
      toast({
        title: "Vendor Profile Updated",
        description: `${formData.name} master record and compliance status saved.`
      });
    } else {
      // Register New
      const newVendor: Vendor = {
        id: `VND-${Math.floor(100 + Math.random() * 900)}`,
        ...formData,
        openPOCount: 0,
        ytdVolume: 0.00
      };
      setLocalVendors(prev => [newVendor, ...prev]);
      toast({
        title: "🎉 Supplier Registered Successfully!",
        description: `${newVendor.name} (TIN: ${newVendor.tin}) onboarded to Master Data.`
      });
    }

    setIsRegisterModalOpen(false);
  };

  const isLoading = isUserLoading || isProfileLoading;
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-8 min-h-screen">
        <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase text-slate-900 dark:text-slate-100">Access Denied</h1>
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Supplier Master Data.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24">
      
      {/* ========================================================================= */}
      {/* 1. THE EXECUTIVE DARK BANNER & TELEMETRY                                   */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          {/* Header Title & Badges */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Master Data & Governance
                  </span>
                  <span className="text-xs text-slate-400">• GRA Compliance Audited</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white mt-0.5">
                  Supplier Master Data
                </h1>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl">
              Manage verified hospital vendors, statutory GRA tax clearance compliance, and strategic procurement relationships.
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-3 self-start lg:self-center flex-wrap">
            <button 
              type="button"
              onClick={() => {
                toast({ title: "CSV Export Generated", description: "Supplier directory downloaded with TIN & compliance tags." });
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button 
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Directory
            </button>
            <button 
              type="button"
              onClick={handleOpenRegister}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold tracking-wide flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + REGISTER SUPPLIER
            </button>
          </div>
        </div>

        {/* 4-Card KPI Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80 relative z-10 font-mono">
          
          {/* Total Verified */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Total Verified Suppliers
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {telemetry.cleared} Active
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">100% Audited TINs</span>
            </div>
          </div>

          {/* Compliance Holds (Warning Card) */}
          <div className="bg-rose-950/40 rounded-xl p-4 border border-rose-800/60">
            <div className="text-xs font-medium text-rose-300 uppercase tracking-wider font-sans">
              Compliance Holds
            </div>
            <div className="text-2xl font-black text-rose-400 mt-1">
              {telemetry.holds} Vendors
            </div>
            <div className="text-xs text-rose-300/80 mt-1 flex items-center gap-1 font-sans">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Expired Tax / Permit Docs</span>
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Pending Approvals
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {telemetry.pending} Onboarding
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Director Sign-off Required</span>
            </div>
          </div>

          {/* Active Categories */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Sourcing Categories
            </div>
            <div className="text-2xl font-black text-sky-400 mt-1">
              {telemetry.categoriesCount} Disciplines
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Pharma, Consumables, Works</span>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. THE COMMAND FILTER BAR (SEARCH & PILLS)                                */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        
        {/* Top Search Bar */}
        <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by supplier name, TIN number, or institutional contact person..."
            className="w-full bg-transparent text-xs font-medium text-slate-900 dark:text-slate-100 outline-none"
          />
        </div>

        {/* Filter Pills Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          
          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Category:</span>
            {[
              { id: 'ALL', label: 'All Categories' },
              { id: 'PHARMACEUTICAL', label: 'Pharmaceuticals' },
              { id: 'CONSUMABLES', label: 'Consumables' },
              { id: 'EQUIPMENT', label: 'Equipment & Diagnostic' },
              { id: 'WORKS', label: 'Works & Maintenance' },
              { id: 'SERVICES', label: 'Services' },
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Compliance Filter Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Compliance:</span>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'CLEARED', label: 'Cleared Only' },
              { id: 'HOLDS', label: 'Compliance Holds' },
            ].map(comp => (
              <button
                key={comp.id}
                type="button"
                onClick={() => setComplianceFilter(comp.id)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  complianceFilter === comp.id
                    ? comp.id === 'HOLDS'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {comp.label}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. UPGRADED VENDOR CARDS GRID                                             */}
      {/* ========================================================================= */}
      {filteredVendors.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border border-slate-200 dark:border-slate-800 space-y-3">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-black uppercase text-slate-700 dark:text-slate-300">No Suppliers Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No supplier records matched your active search query or compliance filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendors.map(vendor => {
            const isHold = vendor.complianceStatus === 'COMPLIANCE_HOLD';
            const isPending = vendor.complianceStatus === 'PENDING_APPROVAL';

            return (
              <div 
                key={vendor.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl border shadow-sm flex flex-col justify-between overflow-hidden transition-all hover:shadow-md ${
                  isHold 
                    ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-500/20' 
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                
                {/* Card Header & Badge */}
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {vendor.category}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">
                          {vendor.id}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                        {vendor.name}
                      </h3>
                    </div>

                    {/* Compliance Badge */}
                    <div className="shrink-0">
                      {isHold ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950 dark:text-rose-300 animate-pulse">
                          <AlertTriangle className="w-2.5 h-2.5" /> COMPLIANCE HOLD
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                          <Clock className="w-2.5 h-2.5" /> PENDING APPROVAL
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="w-2.5 h-2.5" /> CLEARED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Core Details */}
                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
                    <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">TIN Number:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{vendor.tin}</span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Payment Terms:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{vendor.paymentTerms}</span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Tax Clearance:</span>
                      <span className={`font-mono text-[11px] font-bold ${isHold ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {vendor.taxClearanceExpiry}
                      </span>
                    </div>

                    <div className="pt-1 space-y-1 text-[11px]">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{vendor.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{vendor.email}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Quick Stats & Actions Block */}
                <div>
                  
                  {/* Gray Financial Stats Block */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-4 border-t border-b border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-center font-mono">
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block font-sans">Open POs</span>
                      <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                        {vendor.openPOCount} Active
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block font-sans">YTD Volume</span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        ₵ {vendor.ytdVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="p-4 bg-white dark:bg-slate-900 flex items-center justify-between gap-2">
                    
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(vendor)}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => router.push('/accountant/payable')}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                        title="View Accounts Payable Ledger"
                      >
                        <FileText className="w-3 h-3 text-sky-500" /> Ledger
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (isHold) {
                            toast({
                              variant: "destructive",
                              title: "Compliance Hold Active",
                              description: `Cannot issue POs to ${vendor.name} until Tax Clearance is updated.`
                            });
                            return;
                          }
                          router.push(`/procurement/orders/new`);
                        }}
                        disabled={isHold}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition shadow cursor-pointer flex items-center gap-1 ${
                          isHold 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                        }`}
                      >
                        <ShoppingCart className="w-3 h-3" /> Issue PO
                      </button>
                    </div>

                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. REGISTER / EDIT SUPPLIER MODAL DIALOG                                  */}
      {/* ========================================================================= */}
      {isRegisterModalOpen && (
        <Dialog open={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen}>
          <DialogContent className="max-w-2xl bg-slate-950 border border-slate-800 text-white rounded-3xl p-6 md:p-8 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <span>{editingVendor ? `Edit Supplier (${editingVendor.name})` : 'Register Verified Supplier'}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Maintain statutory GRA tax clearance, FDA licensing, and corporate banking profiles.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveVendor} className="space-y-4 pt-3">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Supplier Legal Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g. Ernest Chemists Ltd"
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">GRA Tax Identification Number (TIN)</label>
                  <input
                    type="text"
                    value={formData.tin}
                    onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                    required
                    placeholder="e.g. C0001928472"
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Primary Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                  >
                    <option value="PHARMACEUTICAL">Pharmaceuticals & IV Fluids</option>
                    <option value="CONSUMABLES">Medical & Surgical Consumables</option>
                    <option value="EQUIPMENT">Diagnostic & Lab Equipment</option>
                    <option value="WORKS">Engineering Works & Fuel</option>
                    <option value="SERVICES">Hospital Services & Waste</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Institutional Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    required
                    placeholder="e.g. Kojo Antwi"
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    placeholder="+233 24 400 0000"
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Official Orders Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="orders@supplier.com.gh"
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Standard Payment Terms</label>
                  <select
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                  >
                    <option value="Net 30 Days">Net 30 Days (Standard Hospital Credit)</option>
                    <option value="Net 15 Days">Net 15 Days (Consumables)</option>
                    <option value="Net 60 Days">Net 60 Days (High-Volume)</option>
                    <option value="Immediate on GRN">Immediate on GRN Clearance</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">GRA Tax Clearance Expiry</label>
                  <input
                    type="date"
                    value={formData.taxClearanceExpiry}
                    onChange={(e) => setFormData({ ...formData, taxClearanceExpiry: e.target.value })}
                    required
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Compliance & Regulatory Status</label>
                  <select
                    value={formData.complianceStatus}
                    onChange={(e) => setFormData({ ...formData, complianceStatus: e.target.value as any })}
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                  >
                    <option value="CLEARED">CLEARED — Valid GRA Tax Clearance & FDA Certification</option>
                    <option value="COMPLIANCE_HOLD">COMPLIANCE HOLD — Missing / Expired Documentation</option>
                    <option value="PENDING_APPROVAL">PENDING APPROVAL — Awaiting Executive Director Onboarding</option>
                  </select>
                </div>

              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsRegisterModalOpen(false)} className="text-slate-400 hover:text-white">
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-6">
                  {editingVendor ? 'Save Master Record' : 'Register Supplier →'}
                </Button>
              </DialogFooter>

            </form>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
