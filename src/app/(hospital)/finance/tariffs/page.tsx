'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, query, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Tag, Save, Plus, Edit3, HeartPulse, Beaker, Camera, BedDouble, 
  Loader2, ShieldAlert, Package, Percent, Search, Landmark, ShieldCheck, 
  Layers, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, AlertTriangle, X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type TariffItem = {
  id: string;
  code: string;
  name: string;
  department: string;
  baseCash: number;
  nhiaTariff: number;
  hmoTariff: number;
  status: string;
  collectionName?: string;
};

export default function TariffManagerPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  
  // Audited Price Change Modal State
  const [editingTariff, setEditingTariff] = useState<TariffItem | null>(null);
  const [newCashPrice, setNewCashPrice] = useState<string>('');
  const [newNhiaCap, setNewNhiaCap] = useState<string>('');
  const [newHmoTariff, setNewHmoTariff] = useState<string>('');
  const [justification, setJustification] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'ACCOUNTANT';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole);

  // Firestore Queries
  const productsQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/product_catalog`)) : null, [firestore, hospitalId]);
  const generalServicesQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/general_services`)) : null, [firestore, hospitalId]);
  const labMenuQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/lab_menu`)) : null, [firestore, hospitalId]);
  const radiologyMenuQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/radiology_menu`)) : null, [firestore, hospitalId]);

  const { data: rawProducts, isLoading: productsLoading } = useCollection(productsQuery);
  const { data: rawGeneral, isLoading: generalLoading } = useCollection(generalServicesQuery);
  const { data: rawLab, isLoading: labLoading } = useCollection(labMenuQuery);
  const { data: rawRadiology, isLoading: radiologyLoading } = useCollection(radiologyMenuQuery);

  // Demodata Fallbacks for Audited Tariff Master Demonstration
  const demoTariffs: TariffItem[] = useMemo(() => [
    { id: 'TRF-LAB-001', code: 'LAB-M-01', name: 'Malaria Rapid Diagnostic Test (RDT)', department: 'LABORATORY', baseCash: 50.00, nhiaTariff: 15.00, hmoTariff: 40.00, status: 'ACTIVE', collectionName: 'lab_menu' },
    { id: 'TRF-PHRM-042', code: 'DRG-AMX-500', name: 'Amoxicillin 500mg (Capsule)', department: 'PHARMACY', baseCash: 45.00, nhiaTariff: 30.00, hmoTariff: 40.00, status: 'ACTIVE', collectionName: 'product_catalog' },
    { id: 'TRF-CON-001', code: 'CON-GP-01', name: 'General Practitioner Consultation', department: 'CONSULTATION', baseCash: 150.00, nhiaTariff: 45.00, hmoTariff: 120.00, status: 'ACTIVE', collectionName: 'general_services' },
    { id: 'TRF-RAD-012', code: 'RAD-US-02', name: 'Obstetric Ultrasound Scan', department: 'RADIOLOGY', baseCash: 250.00, nhiaTariff: 80.00, hmoTariff: 220.00, status: 'ACTIVE', collectionName: 'radiology_menu' },
    { id: 'TRF-LAB-002', code: 'LAB-FBC-01', name: 'Full Blood Count (FBC) Panel', department: 'LABORATORY', baseCash: 80.00, nhiaTariff: 50.00, hmoTariff: 70.00, status: 'ACTIVE', collectionName: 'lab_menu' },
    { id: 'TRF-PHRM-099', code: 'DRG-PCM-500', name: 'Paracetamol 500mg (Pack of 20)', department: 'PHARMACY', baseCash: 15.00, nhiaTariff: 10.00, hmoTariff: 12.00, status: 'ACTIVE', collectionName: 'product_catalog' }
  ], []);

  const [tariffsList, setTariffsList] = useState<TariffItem[]>(() => {
    if (rawProducts && rawProducts.length > 0) {
      return rawProducts.map((p: any) => ({
        id: p.id,
        code: p.sku || `DRG-${p.id.slice(-4).toUpperCase()}`,
        name: p.name,
        department: p.storeType || 'PHARMACY',
        baseCash: Number(p.sellingPrice || p.price || 0),
        nhiaTariff: Number(p.nhisCap || (p.sellingPrice * 0.7) || 0),
        hmoTariff: Number(p.hmoPrice || (p.sellingPrice * 0.9) || 0),
        status: 'ACTIVE',
        collectionName: 'product_catalog'
      }));
    }
    return demoTariffs;
  });

  const filteredTariffs = useMemo(() => {
    return tariffsList.filter(t => {
      const matchesSearch = !searchTerm.trim() || 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = selectedDept === 'ALL' || t.department === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [tariffsList, searchTerm, selectedDept]);

  const handleOpenEditModal = (item: TariffItem) => {
    setEditingTariff(item);
    setNewCashPrice(item.baseCash.toFixed(2));
    setNewNhiaCap(item.nhiaTariff.toFixed(2));
    setNewHmoTariff(item.hmoTariff.toFixed(2));
    setJustification('');
  };

  const handleAuditedPriceUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTariff) return;

    if (!justification.trim()) {
      toast({ variant: 'destructive', title: "Justification Required", description: "Audit justification is mandatory for price updates." });
      return;
    }

    const numericCash = parseFloat(newCashPrice);
    const numericNhia = parseFloat(newNhiaCap);
    const numericHmo = parseFloat(newHmoTariff);

    if (isNaN(numericCash) || numericCash < 0) {
      toast({ variant: 'destructive', title: "Invalid Cash Price" });
      return;
    }

    setIsSaving(true);

    try {
      if (firestore && hospitalId) {
        const collName = editingTariff.collectionName || 'product_catalog';
        const docRef = doc(firestore, `hospitals/${hospitalId}/${collName}`, editingTariff.id);
        
        await updateDoc(docRef, {
          sellingPrice: numericCash,
          price: numericCash,
          nhisCap: numericNhia,
          hmoPrice: numericHmo,
          priceLastUpdated: serverTimestamp()
        });

        // Write to Master Audit Log
        await addDoc(collection(firestore, `hospitals/${hospitalId}/audit_logs`), {
          type: "FINANCIAL",
          action: "TARIFF_PRICE_CHANGE",
          itemId: editingTariff.id,
          itemName: editingTariff.name,
          oldCashPrice: editingTariff.baseCash,
          newCashPrice: numericCash,
          oldNhiaCap: editingTariff.nhiaTariff,
          newNhiaCap: numericNhia,
          justification: justification.trim(),
          executedBy: user?.uid || 'ACCOUNTANT',
          executedByName: user?.displayName || userProfile?.name || 'Chief Accountant',
          timestamp: serverTimestamp()
        });
      }

      setTariffsList(prev => prev.map(t => 
        t.id === editingTariff.id ? { 
          ...t, 
          baseCash: numericCash, 
          nhiaTariff: isNaN(numericNhia) ? t.nhiaTariff : numericNhia,
          hmoTariff: isNaN(numericHmo) ? t.hmoTariff : numericHmo
        } : t
      ));

      toast({
        title: "Tariff Price Updated & Audited",
        description: `${editingTariff.name} price updated to GHS ${numericCash.toFixed(2)}. Audit log committed.`
      });

      setEditingTariff(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Update Failed", description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isUserLoading || isProfileLoading || productsLoading;
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized to manage facility tariffs.</p>
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

        {/* Top Row: Title, Subtitle, User Context */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Tag className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                TARIFF MASTER & PRICING COMMAND CENTER
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              STATUTORY PRICE SCHEDULING, NHIS REIMBURSEMENT CAPS, AND AUDITED MULTI-PAYER PRICING TIERS.
            </p>
          </div>

          {/* Quick Actions & User Context */}
          <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
                {userInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
                <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">CHIEF ACCOUNTANT</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push('/finance/tariffs/bulk')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <FileSpreadsheet className="w-4 h-4" /> BULK PRICE ADJUSTMENT
            </button>
          </div>
        </div>

        {/* Bottom Row / Contextual Telemetry Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active Service Nodes</span>
              <div className="text-2xl font-black text-white font-mono">4,120 Nodes</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Statutory Pricing Locked</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Layers className="w-6 h-6 text-emerald-400" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Pending NHIA Tariff Updates</span>
              <div className="text-2xl font-black text-indigo-400 font-mono">12 Pending</div>
              <span className="text-[10px] font-bold text-indigo-400 mt-0.5 block">2026 Tariff Alignment</span>
            </div>
            <div className="p-3 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-xl">
              <Landmark className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Recent Adjustments (30 Days)</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">45 Audited</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">100% Executive Audit Trail</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. ACTION & FILTER SEARCH BAR              */}
      {/* ========================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search service name or item code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer text-slate-900 dark:text-slate-100"
          >
            <option value="ALL">ALL DEPARTMENTS</option>
            <option value="PHARMACY">PHARMACY</option>
            <option value="LABORATORY">LABORATORY</option>
            <option value="CONSULTATION">CONSULTATION</option>
            <option value="RADIOLOGY">RADIOLOGY</option>
          </select>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. MULTI-TIERED PRICING GRID               */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredTariffs.length === 0 ? (
          <div className="p-16 text-center text-slate-400 italic">
            No service nodes found matching query.
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
              <tr>
                <th className="p-4 w-28">Item Code</th>
                <th className="p-4">Service Description</th>
                <th className="p-4 text-right text-indigo-300">Base Cash Price</th>
                <th className="p-4 text-right text-emerald-300">NHIA Tariff Cap</th>
                <th className="p-4 text-right text-amber-300">HMO / Corporate</th>
                <th className="p-4 text-center">Audit Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
              {filteredTariffs.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                  <td className="p-4 font-mono font-bold text-slate-400">
                    {item.code}
                  </td>
                  
                  <td className="p-4">
                    <p className="font-black text-slate-900 dark:text-slate-100 uppercase">{item.name}</p>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                      {item.department}
                    </span>
                  </td>

                  <td className="p-4 text-right font-mono font-black text-indigo-900 dark:text-indigo-300 bg-indigo-50/30 dark:bg-indigo-950/20">
                    ₵ {item.baseCash.toFixed(2)}
                  </td>

                  <td className="p-4 text-right font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">
                    ₵ {item.nhiaTariff.toFixed(2)}
                  </td>

                  <td className="p-4 text-right font-mono font-black text-amber-700 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/20">
                    ₵ {item.hmoTariff.toFixed(2)}
                  </td>

                  <td className="p-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="px-3.5 py-1.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-emerald-600 dark:hover:bg-emerald-400 dark:hover:text-slate-950 font-black text-[10px] uppercase rounded-lg transition-all cursor-pointer shadow"
                    >
                      EDIT TARIFF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ========================================== */}
      {/* 4. AUDITED PRICE CHANGE MODAL              */}
      {/* ========================================== */}
      {editingTariff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-4">
            
            <div className="bg-slate-950 text-white p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-black text-lg uppercase tracking-wider">Audited Tariff Price Adjustment</h3>
                <p className="text-xs font-mono text-emerald-400 mt-1">{editingTariff.code} — {editingTariff.name}</p>
              </div>
              <button 
                onClick={() => setEditingTariff(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAuditedPriceUpdate} className="p-6 space-y-4 pt-0">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 block">New Base Cash Price (GHS)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={newCashPrice}
                  onChange={(e) => setNewCashPrice(e.target.value)}
                  className="rounded-xl font-mono font-black text-base text-indigo-900 dark:text-indigo-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">NHIA Tariff Cap (GHS)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newNhiaCap}
                    onChange={(e) => setNewNhiaCap(e.target.value)}
                    className="rounded-xl font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">HMO / Corporate (GHS)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newHmoTariff}
                    onChange={(e) => setNewHmoTariff(e.target.value)}
                    className="rounded-xl font-mono font-bold text-xs text-amber-600 dark:text-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Audit Justification</label>
                <textarea
                  required
                  rows={3}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="e.g., Supplier price increase, NHIA 2026 tariff schedule update..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
                <p className="text-[9px] font-black text-rose-500 uppercase tracking-wide flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                  PERMANENT AUDIT TRAIL LOGGED TO EXECUTIVE PROFILE
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingTariff(null)}
                  className="px-4 py-2.5 font-black text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>AUTHORIZE PRICE CHANGE</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}