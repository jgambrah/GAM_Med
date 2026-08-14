'use client';

import { useState, useMemo, useRef } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Building2, Plus, Phone, Mail, Globe, 
  Trash2, Edit3, Save, Loader2, ShieldAlert, FileText, CheckCircle2,
  Search, Landmark, Percent, UserCheck, ShieldCheck, Tag, AlertTriangle,
  FileCheck, Lock, Unlock, Eye, History, Upload, Paperclip, AlertCircle, XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function VendorManager() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>('v-1');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'AWAITING_APPROVAL' | 'EXPIRING' | 'BLACKLISTED'>('ALL');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'STATUTORY' | 'VAULT' | 'AUDIT'>('OVERVIEW');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Vendor Form State
  const [form, setForm] = useState({
    name: '',
    tradeName: '',
    tin: '',
    isVatRegistered: true,
    phone: '',
    email: '',
    contactPerson: '',
    bankName: '',
    bankBranch: 'Main Branch, Accra',
    accountName: '',
    accountNumber: '',
    defaultWhtRate: 3.0,
    defaultWhtCategory: 'GOODS', // GOODS (3%), WORKS (5%), SERVICES (7.5%), RENT (8%)
    taxClearanceExpiry: '2026-12-31',
    status: 'AWAITING_APPROVAL' as 'DRAFT' | 'AWAITING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'BLACKLISTED',
    attachments: [] as string[],
  });

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'DIRECTOR';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole);
  const isChecker = ['DIRECTOR', 'ADMIN', 'SUPER_ADMIN'].includes(userRole);

  const vendorsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/vendors`));
  }, [firestore, hospitalId]);
  const { data: rawVendors, isLoading: isVendorsLoading } = useCollection(vendorsQuery);

  // Demo Vendors with Enterprise Compliance Data
  const demoVendors = useMemo(() => [
    { 
      id: 'v-1', 
      name: 'Acorn Pharma Distributors Ltd', 
      tradeName: 'Acorn Healthcare Ghana',
      tin: 'C001294819X', 
      isVatRegistered: true,
      phone: '+233 24 492 0182', 
      email: 'orders@acornpharma.com', 
      contactPerson: 'Mr. Eric K. Boateng',
      bankName: 'GCB Bank Ghana', 
      bankBranch: 'High Street Main Branch',
      accountName: 'Acorn Pharma Distributors Ltd',
      accountNumber: '1099248102', 
      defaultWhtRate: 3.0, 
      defaultWhtCategory: 'GOODS',
      taxClearanceExpiry: '2026-12-31',
      status: 'ACTIVE',
      attachments: ['GRA_Tax_Clearance_2026.pdf', 'Cert_of_Incorporation.pdf', 'SSNIT_Clearance.pdf'],
      bankAuditLogs: [
        { timestamp: '2026-06-15 10:30', modifiedBy: 'Marcus Henaku', field: 'Account Number', oldVal: '1099248000', newVal: '1099248102' }
      ],
      createdBy: 'usr-1',
      createdByName: 'Kofi Mensah (Procurement)',
      approvedBy: 'usr-admin',
      approvedByName: 'Dr. Marcus Henaku (Medical Director)'
    },
    { 
      id: 'v-2', 
      name: 'Perkins Power Solutions Ghana', 
      tradeName: 'Perkins Generators',
      tin: 'C009941028Y', 
      isVatRegistered: true,
      phone: '+233 30 294 8102', 
      email: 'service@perkinspower.com.gh', 
      contactPerson: 'Ing. Samuel Osei',
      bankName: 'Standard Chartered Ghana', 
      bankBranch: 'Ridge Branch',
      accountName: 'Perkins Power Solutions Ghana',
      accountNumber: '0100924819', 
      defaultWhtRate: 5.0, 
      defaultWhtCategory: 'WORKS',
      taxClearanceExpiry: '2026-08-28', // Expiring soon (<30d)
      status: 'ACTIVE',
      attachments: ['GRA_Tax_Clearance_Expiring.pdf', 'EPA_Permit.pdf'],
      bankAuditLogs: [],
      createdBy: 'usr-1',
      createdByName: 'Kofi Mensah (Procurement)',
      approvedBy: 'usr-admin',
      approvedByName: 'Dr. Marcus Henaku (Medical Director)'
    },
    { 
      id: 'v-3', 
      name: 'Mindray Medical West Africa', 
      tradeName: 'Mindray Equipment',
      tin: 'C008819241Z', 
      isVatRegistered: false,
      phone: '+233 20 819 2840', 
      email: 'support@mindray-wa.com', 
      contactPerson: 'Madame Joyce Ansah',
      bankName: 'Ecobank Ghana', 
      bankBranch: 'Ring Road Central',
      accountName: 'Mindray Medical WA',
      accountNumber: '14410029384', 
      defaultWhtRate: 7.5, 
      defaultWhtCategory: 'SERVICES',
      taxClearanceExpiry: '2026-09-15',
      status: 'AWAITING_APPROVAL',
      attachments: ['Pending_TIN_Doc.pdf'],
      bankAuditLogs: [],
      createdBy: 'usr-2',
      createdByName: 'Abena Ofori (Procurement Officer)'
    },
    { 
      id: 'v-4', 
      name: 'Apex BioMed Consumables Ltd', 
      tradeName: 'Apex Medical',
      tin: 'C004419280A', 
      isVatRegistered: true,
      phone: '+233 27 119 2849', 
      email: 'info@apexbiomed.com', 
      contactPerson: 'Kwame Agyeman',
      bankName: 'Fidelity Bank Ghana', 
      bankBranch: 'Airport Residential',
      accountName: 'Apex BioMed Consumables',
      accountNumber: '2099148192', 
      defaultWhtRate: 3.0, 
      defaultWhtCategory: 'GOODS',
      taxClearanceExpiry: '2026-05-10', // Expired
      status: 'SUSPENDED',
      attachments: ['Expired_Tax_Cert_2025.pdf'],
      bankAuditLogs: [],
      createdBy: 'usr-2',
      createdByName: 'Abena Ofori (Procurement Officer)'
    }
  ], []);

  const vendors = rawVendors && rawVendors.length > 0 ? rawVendors : demoVendors;

  // Selected Vendor Dossier Data
  const selectedVendor = useMemo(() => {
    return vendors.find(v => v.id === selectedVendorId) || vendors[0];
  }, [vendors, selectedVendorId]);

  // Tax Clearance Health Helper
  const getTaxHealth = (expiryDateStr: string) => {
    if (!expiryDateStr) return { color: 'text-slate-400 bg-slate-100', label: 'NO CERTIFICATE', icon: AlertCircle };
    const expiry = new Date(expiryDateStr);
    const today = new Date('2026-08-14');
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays < 0) return { color: 'text-rose-700 bg-rose-100 dark:bg-rose-950 dark:text-rose-300 border-rose-300', label: 'TAX CERT EXPIRED', icon: XCircle };
    if (diffDays <= 30) return { color: 'text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 border-amber-300', label: `EXPIRING IN ${diffDays} DAYS`, icon: AlertTriangle };
    return { color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300', label: 'GRA CERT VALID', icon: CheckCircle2 };
  };

  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      // Status Filter
      if (statusFilter === 'ACTIVE' && v.status !== 'ACTIVE') return false;
      if (statusFilter === 'AWAITING_APPROVAL' && v.status !== 'AWAITING_APPROVAL') return false;
      if (statusFilter === 'BLACKLISTED' && v.status !== 'BLACKLISTED' && v.status !== 'SUSPENDED') return false;
      if (statusFilter === 'EXPIRING') {
        const health = getTaxHealth(v.taxClearanceExpiry);
        if (health.label === 'GRA CERT VALID') return false;
      }

      // Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        v.name?.toLowerCase().includes(q) ||
        v.tin?.toLowerCase().includes(q) ||
        v.bankName?.toLowerCase().includes(q) ||
        v.accountNumber?.toLowerCase().includes(q) ||
        v.contactPerson?.toLowerCase().includes(q)
      );
    });
  }, [vendors, statusFilter, searchQuery]);

  const handleSelectVendor = (vendor: any) => {
    setIsCreatingNew(false);
    setSelectedVendorId(vendor.id);
    setForm({
      name: vendor.name || '',
      tradeName: vendor.tradeName || '',
      tin: vendor.tin || '',
      isVatRegistered: vendor.isVatRegistered ?? true,
      phone: vendor.phone || '',
      email: vendor.email || '',
      contactPerson: vendor.contactPerson || '',
      bankName: vendor.bankName || '',
      bankBranch: vendor.bankBranch || 'Main Branch, Accra',
      accountName: vendor.accountName || vendor.name || '',
      accountNumber: vendor.accountNumber || '',
      defaultWhtRate: vendor.defaultWhtRate ?? 3.0,
      defaultWhtCategory: vendor.defaultWhtCategory || 'GOODS',
      taxClearanceExpiry: vendor.taxClearanceExpiry || '2026-12-31',
      status: vendor.status || 'ACTIVE',
      attachments: vendor.attachments || [],
    });
  };

  const handleStartNewVendor = () => {
    setIsCreatingNew(true);
    setSelectedVendorId(null);
    setForm({
      name: '',
      tradeName: '',
      tin: '',
      isVatRegistered: true,
      phone: '',
      email: '',
      contactPerson: '',
      bankName: '',
      bankBranch: 'High Street Branch, Accra',
      accountName: '',
      accountNumber: '',
      defaultWhtRate: 3.0,
      defaultWhtCategory: 'GOODS',
      taxClearanceExpiry: '2026-12-31',
      status: 'AWAITING_APPROVAL',
      attachments: [],
    });
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.tin.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Company Legal Name and Official GRA TIN are required." });
      return;
    }

    setSaving(true);

    const isNewBankDetails = selectedVendor && (
      selectedVendor.bankName !== form.bankName || 
      selectedVendor.accountNumber !== form.accountNumber
    );

    const auditLogEntry = isNewBankDetails ? {
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      modifiedBy: user?.displayName || userProfile?.name || 'Marcus Henaku',
      field: 'Settlement Bank Details',
      oldVal: `${selectedVendor?.bankName || 'N/A'} - ${selectedVendor?.accountNumber || 'N/A'}`,
      newVal: `${form.bankName} - ${form.accountNumber}`
    } : null;

    if (!firestore || !hospitalId) {
      setTimeout(() => {
        toast({
          title: isCreatingNew ? "Vendor Submitted for Approval" : "Vendor Profile Updated",
          description: isCreatingNew 
            ? `${form.name} created under AWAITING_APPROVAL status.` 
            : `${form.name} dossier updated successfully.`
        });
        setSaving(false);
        setIsCreatingNew(false);
      }, 800);
      return;
    }

    try {
      if (isCreatingNew) {
        const vendorsRef = collection(firestore, `hospitals/${hospitalId}/vendors`);
        const docRef = await addDoc(vendorsRef, {
          ...form,
          accountName: form.accountName || form.name,
          createdBy: user?.uid,
          createdByName: user?.displayName || userProfile?.name || 'Procurement Officer',
          bankAuditLogs: auditLogEntry ? [auditLogEntry] : [],
          createdAt: serverTimestamp(),
        });
        toast({ title: "Vendor Submitted", description: `${form.name} placed in AWAITING_APPROVAL state for Medical Director sign-off.` });
        setSelectedVendorId(docRef.id);
        setIsCreatingNew(false);
      } else if (selectedVendorId) {
        const vendorRef = doc(firestore, `hospitals/${hospitalId}/vendors`, selectedVendorId);
        await updateDoc(vendorRef, {
          ...form,
          accountName: form.accountName || form.name,
          ...(auditLogEntry ? {
            bankAuditLogs: [...(selectedVendor?.bankAuditLogs || []), auditLogEntry]
          } : {}),
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Vendor Profile Updated", description: `${form.name} changes saved with audit trail.` });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save Failed", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'ACTIVE' | 'BLACKLISTED' | 'SUSPENDED') => {
    if (!selectedVendorId) return;

    setSaving(true);

    if (!firestore || !hospitalId) {
      setTimeout(() => {
        toast({ 
          title: `Status Changed to ${newStatus}`, 
          description: `Vendor profile status updated to ${newStatus}.` 
        });
        setForm(prev => ({ ...prev, status: newStatus }));
        setSaving(false);
      }, 600);
      return;
    }

    try {
      const vendorRef = doc(firestore, `hospitals/${hospitalId}/vendors`, selectedVendorId);
      await updateDoc(vendorRef, {
        status: newStatus,
        ...(newStatus === 'ACTIVE' ? {
          approvedBy: user?.uid,
          approvedByName: user?.displayName || userProfile?.name || 'Medical Director',
          approvedAt: serverTimestamp()
        } : {}),
        updatedAt: serverTimestamp()
      });
      toast({ 
        title: `Vendor Status: ${newStatus}`, 
        description: newStatus === 'ACTIVE' ? `${selectedVendor?.name} activated for Payment Voucher disbursements.` : `${selectedVendor?.name} restricted.` 
      });
      setForm(prev => ({ ...prev, status: newStatus }));
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Action Failed", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const fileNames = Array.from(files).map(f => f.name);
    setForm(prev => ({ ...prev, attachments: [...prev.attachments, ...fileNames] }));
    toast({ title: "Compliance Document Uploaded", description: `Added ${fileNames.length} certificate(s) to vault.` });
  };

  const pageIsLoading = isUserLoading || isProfileLoading;
  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  if (pageIsLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
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
          <p className="text-slate-500 text-sm mt-2">Only Accountants and Administrators can access the Vendor Compliance Vault.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  // Counter metrics
  const activeCount = vendors.filter(v => v.status === 'ACTIVE').length;
  const pendingCount = vendors.filter(v => v.status === 'AWAITING_APPROVAL').length;
  const expiringCount = vendors.filter(v => getTaxHealth(v.taxClearanceExpiry).label !== 'GRA CERT VALID').length;

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, User Context */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Building2 className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                VENDOR & COMPLIANCE GATEKEEPER
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              GRA STATUTORY TAX COMPLIANCE, MAKER-CHECKER ONBOARDING, AND IMMUTABLE BANKING AUDIT VAULT.
            </p>
          </div>

          {/* Active User Context & Quick Action */}
          <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
                {userInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
                <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                  {isChecker ? 'CHECKER (DIRECTOR)' : 'MAKER (PROCUREMENT)'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartNewVendor}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Plus className="w-4 h-4" /> NEW SUPPLIER ONBOARDING
            </button>
          </div>
        </div>

        {/* Bottom Row / Contextual Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Active Vendors</span>
              <div className="text-xl font-black text-white font-mono">{activeCount} Suppliers</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Approved for Disbursements</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-amber-500/20">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">Pending Onboarding (Maker-Checker)</span>
              <div className="text-xl font-black text-amber-400 font-mono">{pendingCount} Awaiting Review</div>
              <span className="text-[10px] font-bold text-amber-300 mt-0.5 block">Requires Director Approval</span>
            </div>
            <div className="p-3 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-rose-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-rose-500/20">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block mb-1">Expiring Tax Certificates</span>
              <div className="text-xl font-black text-rose-400 font-mono">{expiringCount} Suppliers</div>
              <span className="text-[10px] font-bold text-rose-300 mt-0.5 block">GRA Compliance Risk</span>
            </div>
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. MASTER / DETAIL SPLIT-PANE WORKSPACE    */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Master List (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          
          {/* Header & Filter Pill Row */}
          <div className="space-y-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> REGISTERED SUPPLIER MASTER ({filteredVendors.length})
              </h2>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search supplier, TIN, bank..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Quick Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap text-[10px] font-black uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${statusFilter === 'ALL' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
              >
                All ({vendors.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${statusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('AWAITING_APPROVAL')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${statusFilter === 'AWAITING_APPROVAL' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
              >
                Pending Review ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('EXPIRING')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${statusFilter === 'EXPIRING' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
              >
                Tax Warning ({expiringCount})
              </button>
            </div>
          </div>

          {/* Supplier Grid Table */}
          <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
            {isVendorsLoading ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
                Loading registry...
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">NO MATCHING SUPPLIERS FOUND</p>
              </div>
            ) : (
              filteredVendors.map(v => {
                const taxHealth = getTaxHealth(v.taxClearanceExpiry);
                const isSelected = selectedVendorId === v.id && !isCreatingNew;

                return (
                  <div 
                    key={v.id} 
                    onClick={() => handleSelectVendor(v)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                      isSelected 
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md' 
                        : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs font-black uppercase text-slate-900 dark:text-slate-100 truncate">{v.name}</h3>
                        <span className="text-[8px] font-black px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono">
                          TIN: {v.tin}
                        </span>
                        
                        {/* Status Pill */}
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                          v.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' :
                          v.status === 'AWAITING_APPROVAL' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 animate-pulse' :
                          'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                        }`}>
                          {v.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        <p className="flex items-center gap-1 truncate"><Landmark className="w-3 h-3 text-emerald-500 shrink-0" /> {v.bankName} – {v.accountNumber}</p>
                        <p className="flex items-center gap-1 truncate"><Phone className="w-3 h-3 text-slate-400 shrink-0" /> {v.phone}</p>
                      </div>

                      {/* Tax Health Pill */}
                      <div className="flex items-center gap-2 pt-1">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded border flex items-center gap-1 ${taxHealth.color}`}>
                          <taxHealth.icon className="w-2.5 h-2.5" /> {taxHealth.label}
                        </span>
                        <span className="text-[9px] font-black text-slate-400 uppercase">
                          WHT: {v.defaultWhtRate || 3}% ({v.defaultWhtCategory || 'GOODS'})
                        </span>
                      </div>
                    </div>

                    <div className="self-end sm:self-auto shrink-0">
                      <Button size="sm" variant={isSelected ? "default" : "outline"} className="text-[10px] font-black uppercase h-8 px-3 rounded-lg">
                        {isSelected ? 'ACTIVE DOSSIER' : 'VIEW DOSSIER'}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Pane: Vendor Dossier & Setup Form (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          
          {/* Dossier Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {isCreatingNew ? 'NEW SUPPLIER ONBOARDING (MAKER)' : 'VENDOR COMPLIANCE DOSSIER'}
            </h2>
            
            {/* Status Badge & Maker-Checker Controls */}
            {!isCreatingNew && selectedVendor && (
              <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase ${
                selectedVendor.status === 'ACTIVE' ? 'bg-emerald-600 text-white' :
                selectedVendor.status === 'AWAITING_APPROVAL' ? 'bg-amber-500 text-white animate-pulse' :
                'bg-rose-600 text-white'
              }`}>
                {selectedVendor.status.replace('_', ' ')}
              </span>
            )}
          </div>

          {/* Maker-Checker Workflow Control Box */}
          {!isCreatingNew && selectedVendor?.status === 'AWAITING_APPROVAL' && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-black text-amber-800 dark:text-amber-300 uppercase">
                <span className="flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" /> AWAITING DIRECTOR APPROVAL</span>
                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-mono">MAKER-CHECKER GATE</span>
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                Submitted by <strong>{selectedVendor.createdByName || 'Procurement Officer'}</strong>. Medical Director review required before disbursements can be initiated.
              </p>
              
              {isChecker && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('ACTIVE')}
                    disabled={saving}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVATE VENDOR
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('BLACKLISTED')}
                    disabled={saving}
                    className="py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" /> REJECT
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab Navigation Switcher */}
          {!isCreatingNew && (
            <div className="flex border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setActiveTab('OVERVIEW')}
                className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${activeTab === 'OVERVIEW' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Overview & Bank
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('STATUTORY')}
                className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${activeTab === 'STATUTORY' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                GRA Tax Setup
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('VAULT')}
                className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${activeTab === 'VAULT' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Vault ({form.attachments.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('AUDIT')}
                className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${activeTab === 'AUDIT' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Audit Log ({selectedVendor?.bankAuditLogs?.length || 0})
              </button>
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleSaveVendor} className="space-y-4 text-xs">
            
            {/* TAB 1: OVERVIEW & BANKING */}
            {(isCreatingNew || activeTab === 'OVERVIEW') && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-1">
                    Legal Business Name
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Acorn Pharma Distributors Ltd"
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-1">
                      Trade Name (DBA)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Acorn Healthcare"
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-medium text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={form.tradeName}
                      onChange={e => setForm({ ...form, tradeName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mr. Eric Boateng"
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-medium text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={form.contactPerson}
                      onChange={e => setForm({ ...form, contactPerson: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-1">
                      Phone Number
                    </label>
                    <input
                      required
                      type="tel"
                      placeholder="e.g. +233 24 492 0182"
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-medium text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-1">
                      Email Address
                    </label>
                    <input
                      required
                      type="email"
                      placeholder="e.g. orders@vendor.com"
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-medium text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                    SETTLEMENT BANK ACCOUNT DETAILS
                  </span>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-1">
                      Bank Name & Branch
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. GCB Bank - High Street Branch"
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={form.bankName}
                      onChange={e => setForm({ ...form, bankName: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-1">
                        Account Name
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="Official Account Name"
                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                        value={form.accountName}
                        onChange={e => setForm({ ...form, accountName: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-1">
                        Account Number
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. 1099248102"
                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                        value={form.accountNumber}
                        onChange={e => setForm({ ...form, accountNumber: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: GRA STATUTORY & TAX SETUP */}
            {!isCreatingNew && activeTab === 'STATUTORY' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-1">
                    Taxpayer Identification Number (GRA TIN)
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. C001294819X"
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                    value={form.tin}
                    onChange={e => setForm({ ...form, tin: e.target.value })}
                  />
                </div>

                <div 
                  onClick={() => setForm({...form, isVatRegistered: !form.isVatRegistered})}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={form.isVatRegistered} readOnly className="w-4 h-4 accent-emerald-500 cursor-pointer" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Registered for GRA VAT & Statutory Levies (21.9%)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-1">
                      Default WHT Category
                    </label>
                    <select
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                      value={form.defaultWhtCategory}
                      onChange={e => {
                        const cat = e.target.value;
                        const rateMap: any = { GOODS: 3.0, WORKS: 5.0, SERVICES: 7.5, RENT: 8.0 };
                        setForm({ ...form, defaultWhtCategory: cat, defaultWhtRate: rateMap[cat] || 3.0 });
                      }}
                    >
                      <option value="GOODS">Supply of Goods (3%)</option>
                      <option value="WORKS">Supply of Works (5%)</option>
                      <option value="SERVICES">Services / Consult (7.5%)</option>
                      <option value="RENT">Rent / Leasing (8%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-1">
                      Default WHT Rate (%)
                    </label>
                    <input
                      required
                      type="number"
                      step="0.1"
                      placeholder="3.0"
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={form.defaultWhtRate}
                      onChange={e => setForm({ ...form, defaultWhtRate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-1">
                    GRA Tax Clearance Certificate Expiry Date
                  </label>
                  <input
                    type="date"
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.taxClearanceExpiry}
                    onChange={e => setForm({ ...form, taxClearanceExpiry: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* TAB 3: COMPLIANCE VAULT (ATTACHMENTS) */}
            {!isCreatingNew && activeTab === 'VAULT' && (
              <div className="space-y-4">
                <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col items-center justify-center text-center gap-2">
                  <Upload className="w-6 h-6 text-emerald-500" />
                  <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                    COMPLIANCE DOCUMENT VAULT
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Upload Certificate of Incorporation, GRA Tax Clearance, and SSNIT Clearance Memos.
                  </p>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    multiple 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-black uppercase rounded-lg flex items-center gap-2 cursor-pointer hover:bg-emerald-700"
                  >
                    <Paperclip className="w-3.5 h-3.5" /> UPLOAD STATUTORY DOCUMENT
                  </button>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Attached Compliance Files ({form.attachments.length})</span>
                  {form.attachments.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No compliance documents uploaded yet.</p>
                  ) : (
                    form.attachments.map((file, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between text-xs font-medium text-slate-800 dark:text-slate-200">
                        <span className="flex items-center gap-2 truncate font-mono text-[10px]">
                          <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {file}
                        </span>
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">VERIFIED</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: AUDIT LOG */}
            {!isCreatingNew && activeTab === 'AUDIT' && (
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                  IMMUTABLE BANK DETAILS CHANGE LOG
                </span>
                {(!selectedVendor?.bankAuditLogs || selectedVendor.bankAuditLogs.length === 0) ? (
                  <div className="p-6 text-center text-[10px] font-bold text-slate-400 italic border border-dashed rounded-xl">
                    No bank account modifications recorded. Original details intact.
                  </div>
                ) : (
                  selectedVendor.bankAuditLogs.map((log: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1 text-xs">
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                        <span>{log.timestamp}</span>
                        <span className="font-bold text-emerald-500">{log.modifiedBy}</span>
                      </div>
                      <p className="font-black text-slate-800 dark:text-slate-200 text-[10px] uppercase">{log.field} Updated</p>
                      <div className="text-[10px] font-mono grid grid-cols-2 gap-2 text-slate-500">
                        <p className="truncate">Old: <span className="text-rose-400">{log.oldVal}</span></p>
                        <p className="truncate">New: <span className="text-emerald-400">{log.newVal}</span></p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isCreatingNew ? 'SUBMIT VENDOR FOR APPROVAL (MAKER)' : 'SAVE DOSSIER UPDATES'}</span>
              </button>
            </div>
          </form>

        </div>

      </div>

    </div>
  );
}
