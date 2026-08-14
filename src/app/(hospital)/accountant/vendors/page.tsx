'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Building2, Plus, Phone, Mail, Globe, 
  Trash2, Edit3, Save, Loader2, ShieldAlert, FileText, CheckCircle2,
  Search, Landmark, Percent, UserCheck, ShieldCheck, Tag
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({
    name: '',
    tin: '',
    phone: '',
    email: '',
    bankName: '',
    accountNumber: '',
    defaultWhtRate: 3.0,
    defaultVatRate: 21.9,
    category: 'GOODS', // GOODS, WORKS, SERVICES, CONSULTANCY
  });

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userProfile?.role || 'DIRECTOR');

  const vendorsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/vendors`));
  }, [firestore, hospitalId]);
  const { data: rawVendors, isLoading: isVendorsLoading } = useCollection(vendorsQuery);

  const demoVendors = useMemo(() => [
    { 
      id: 'v-1', 
      name: 'Acorn Pharma Distributors Ltd', 
      tin: 'C001294819X', 
      phone: '+233 24 492 0182', 
      email: 'orders@acornpharma.com', 
      bankName: 'GCB Bank Main Branch', 
      accountNumber: '1099248102', 
      defaultWhtRate: 3.0, 
      defaultVatRate: 21.9, 
      category: 'GOODS' 
    },
    { 
      id: 'v-2', 
      name: 'Perkins Power Solutions Ghana', 
      tin: 'C009941028Y', 
      phone: '+233 30 294 8102', 
      email: 'service@perkinspower.com.gh', 
      bankName: 'Standard Chartered Ridge', 
      accountNumber: '0100924819', 
      defaultWhtRate: 5.0, 
      defaultVatRate: 21.9, 
      category: 'WORKS' 
    },
    { 
      id: 'v-3', 
      name: 'Mindray Medical West Africa', 
      tin: 'C008819241Z', 
      phone: '+233 20 819 2840', 
      email: 'support@mindray-wa.com', 
      bankName: 'Ecobank Ghana Aggregator', 
      accountNumber: '14410029384', 
      defaultWhtRate: 7.5, 
      defaultVatRate: 21.9, 
      category: 'SERVICES' 
    }
  ], []);

  const vendors = rawVendors && rawVendors.length > 0 ? rawVendors : demoVendors;

  const filteredVendors = useMemo(() => {
    if (!searchQuery.trim()) return vendors;
    const q = searchQuery.toLowerCase();
    return vendors.filter(v => 
      v.name?.toLowerCase().includes(q) ||
      v.tin?.toLowerCase().includes(q) ||
      v.bankName?.toLowerCase().includes(q) ||
      v.accountNumber?.toLowerCase().includes(q)
    );
  }, [vendors, searchQuery]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim() || !form.tin.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Company name and official TIN are mandatory." });
      return;
    }

    setSaving(true);

    if (!firestore || !hospitalId) {
      setTimeout(() => {
        toast({ title: editingId ? "Vendor Profile Updated (Simulation)" : "Vendor Registered (Simulation)", description: `${form.name} saved successfully.` });
        setForm({
          name: '',
          tin: '',
          phone: '',
          email: '',
          bankName: '',
          accountNumber: '',
          defaultWhtRate: 3.0,
          defaultVatRate: 21.9,
          category: 'GOODS',
        });
        setEditingId(null);
        setSaving(false);
      }, 800);
      return;
    }

    try {
      if (editingId) {
        const vendorRef = doc(firestore, `hospitals/${hospitalId}/vendors`, editingId);
        await updateDoc(vendorRef, {
          name: form.name.trim(),
          tin: form.tin.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          bankName: form.bankName.trim(),
          accountNumber: form.accountNumber.trim(),
          defaultWhtRate: Number(form.defaultWhtRate) || 0,
          defaultVatRate: Number(form.defaultVatRate) || 0,
          category: form.category,
        });
        toast({ title: "Vendor Profile Updated", description: `${form.name} saved successfully.` });
      } else {
        const vendorsRef = collection(firestore, `hospitals/${hospitalId}/vendors`);
        await addDoc(vendorsRef, {
          name: form.name.trim(),
          tin: form.tin.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          bankName: form.bankName.trim(),
          accountNumber: form.accountNumber.trim(),
          defaultWhtRate: Number(form.defaultWhtRate) || 0,
          defaultVatRate: Number(form.defaultVatRate) || 0,
          category: form.category,
          createdAt: serverTimestamp(),
        });
        toast({ title: "Vendor Registered", description: `${form.name} is now available for payouts.` });
      }

      setForm({
        name: '',
        tin: '',
        phone: '',
        email: '',
        bankName: '',
        accountNumber: '',
        defaultWhtRate: 3.0,
        defaultVatRate: 21.9,
        category: 'GOODS',
      });
      setEditingId(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save Failed", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (vendor: any) => {
    setEditingId(vendor.id);
    setForm({
      name: vendor.name || '',
      tin: vendor.tin || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      bankName: vendor.bankName || '',
      accountNumber: vendor.accountNumber || '',
      defaultWhtRate: vendor.defaultWhtRate ?? 3.0,
      defaultVatRate: vendor.defaultVatRate ?? 21.9,
      category: vendor.category || 'GOODS',
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete vendor: "${name}"?`)) return;

    if (!firestore || !hospitalId) {
      toast({ title: "Vendor Removed (Simulation)", description: `Deleted vendor profile for ${name}.` });
      if (editingId === id) setEditingId(null);
      return;
    }

    try {
      await deleteDoc(doc(firestore, `hospitals/${hospitalId}/vendors`, id));
      toast({ title: "Vendor Deleted", description: `Removed vendor profile for ${name}.` });
      if (editingId === id) setEditingId(null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Delete Failed", description: e.message });
    }
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
          <p className="text-slate-500 text-sm mt-2">Only Accountants and Administrators can manage vendors.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and User Context */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Building2 className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                VENDOR & SUPPLIER REGISTRY
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              REGISTERED THIRD-PARTY SUPPLIER MANAGEMENT, TAX SETTLEMENT PROFILES, AND GRA COMPLIANCE SETTINGS.
            </p>
          </div>

          {/* Active User Context & Quick Nav */}
          <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
                {userInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
                <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">FINANCE CONTROLLER</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push('/accountant/payments')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <FileText className="w-4 h-4" /> DISBURSEMENT PORTAL
            </button>
          </div>
        </div>

        {/* Bottom Row / Contextual Session Metadata Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Registered Suppliers</span>
              <div className="text-xl font-black text-white font-mono">{vendors.length} Vendors</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Verified Procurement Partners</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">GRA Tax Compliance</span>
              <div className="text-xl font-black text-white">Active (3% - 20%)</div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">WHT & VAT Auto-Calculations</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Percent className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Settlement Status</span>
              <div className="text-xl font-black text-emerald-400">AUDIT READY</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Linked to Disbursement Engine</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. DUAL-COLUMN WORKSPACE: FORM & DIRECTORY */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Vendor Setup Form (5 Cols) */}
        <form onSubmit={handleSave} className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {editingId ? 'EDIT VENDOR PROFILE' : 'REGISTER NEW VENDOR'}
            </h2>
            {editingId && (
              <button 
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm({
                    name: '',
                    tin: '',
                    phone: '',
                    email: '',
                    bankName: '',
                    accountNumber: '',
                    defaultWhtRate: 3.0,
                    defaultVatRate: 21.9,
                    category: 'GOODS',
                  });
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline uppercase"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-1">
                Company / Vendor Name
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

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-1">
                Tax Identification Number (GRA TIN)
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-1">
                  Supply Category
                </label>
                <select
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  <option value="GOODS">Supply of Goods (3% WHT)</option>
                  <option value="WORKS">Supply of Works (5% WHT)</option>
                  <option value="SERVICES">Services / Consult (7.5% WHT)</option>
                  <option value="RENT">Rent / Leasing (8% WHT)</option>
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
                  placeholder="e.g. sales@vendor.com"
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-1">Bank Name</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. GCB Bank Main Branch"
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.bankName}
                    onChange={e => setForm({ ...form, bankName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-1">Account Number</label>
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

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{editingId ? 'SAVE CHANGES' : 'REGISTER VENDOR'}</span>
          </button>
        </form>

        {/* Right Column: Registered Vendors Directory View (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> REGISTERED SUPPLIER DIRECTORY ({filteredVendors.length})
            </h2>

            {/* Search Box */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input 
                type="text"
                placeholder="Search name, TIN, bank..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
            {isVendorsLoading ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
                Loading directory...
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">NO VENDORS FOUND</p>
              </div>
            ) : (
              filteredVendors.map(v => (
                <div key={v.id} className="p-4 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-emerald-500/50 transition-colors">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-black uppercase text-slate-900 dark:text-slate-100">{v.name}</h3>
                      <span className="text-[8px] font-black px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono">
                        TIN: {v.tin}
                      </span>
                      <span className="text-[8px] font-black px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 uppercase">
                        {v.category || 'GOODS'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {v.phone}</p>
                      <p className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {v.email}</p>
                      <p className="col-span-2 flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300 font-bold mt-0.5">
                        <Landmark className="w-3 h-3 text-emerald-500 shrink-0" /> {v.bankName} – A/C: {v.accountNumber}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-[9px] font-black uppercase text-slate-400 pt-0.5">
                      <span>Default WHT: <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{v.defaultWhtRate || 3}%</span></span>
                      <span>Default VAT: <span className="text-slate-700 dark:text-slate-300 font-mono font-bold">{v.defaultVatRate || 21.9}%</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button 
                      type="button"
                      onClick={() => handleEdit(v)}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded text-[9px] font-black uppercase transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> EDIT
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleDelete(v.id, v.name)}
                      className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 rounded text-[9px] font-black uppercase transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> DELETE
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
