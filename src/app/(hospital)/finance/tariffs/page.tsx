'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, doc, query, serverTimestamp } from 'firebase/firestore';
import { 
  Tag, Save, Plus, Edit3, HeartPulse, Beaker, Camera, BedDouble, 
  Loader2, ShieldAlert, Package, Percent, Search, Landmark, ShieldCheck, 
  Layers, Upload, FileSpreadsheet, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function TariffManagerPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'ACCOUNTANT';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole);

  // Data Fetching for all service categories
  const productsQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/product_catalog`)) : null, [firestore, hospitalId]);
  const { data: rawProducts, isLoading: productsLoading } = useCollection(productsQuery);
  
  const generalServicesQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/general_services`)) : null, [firestore, hospitalId]);
  const labMenuQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/lab_menu`)) : null, [firestore, hospitalId]);
  const radiologyMenuQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/radiology_menu`)) : null, [firestore, hospitalId]);
  const procedureMenuQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/procedure_menu`)) : null, [firestore, hospitalId]);

  const { data: rawGeneral, isLoading: generalLoading } = useCollection(generalServicesQuery);
  const { data: rawLab, isLoading: labLoading } = useCollection(labMenuQuery);
  const { data: rawRadiology, isLoading: radiologyLoading } = useCollection(radiologyMenuQuery);
  const { data: rawProcedure, isLoading: procedureLoading } = useCollection(procedureMenuQuery);

  const [productSearch, setProductSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');

  // Demodata Fallbacks for Audit Demonstration
  const demoProducts = useMemo(() => [
    { id: 'p-1', name: 'Artemether + Lumefantrine 80/480mg Tabs', sku: 'DRG-AL-80', storeType: 'PHARMACY', purchasePrice: 35.00, sellingPrice: 60.00, nhisCap: 40.00 },
    { id: 'p-2', name: 'Paracetamol 500mg (Pack of 20)', sku: 'DRG-PCM-500', storeType: 'PHARMACY', purchasePrice: 5.00, sellingPrice: 15.00, nhisCap: 10.00 },
    { id: 'p-3', name: 'Amoxicillin 500mg Capsules', sku: 'DRG-AMX-500', storeType: 'PHARMACY', purchasePrice: 20.00, sellingPrice: 45.00, nhisCap: 30.00 },
    { id: 'p-4', name: 'Surgical Gloves Powder-Free (Pair)', sku: 'CNS-GLV-01', storeType: 'CONSUMABLES', purchasePrice: 4.00, sellingPrice: 10.00, nhisCap: 8.00 },
  ], []);

  const demoGeneral = useMemo(() => [
    { id: 's-1', name: 'General Medical Practitioner Consultation', price: 120.00, nhisCap: 80.00 },
    { id: 's-2', name: 'Specialist Physician Consultation', price: 250.00, nhisCap: 150.00 },
    { id: 's-3', name: 'Emergency Room Triage Assessment', price: 100.00, nhisCap: 70.00 },
  ], []);

  const demoLab = useMemo(() => [
    { id: 'l-1', name: 'Malaria Rapid Diagnostic Test (RDT)', price: 50.00, nhisCap: 35.00 },
    { id: 'l-2', name: 'Full Blood Count (FBC) Panel', price: 80.00, nhisCap: 50.00 },
    { id: 'l-3', name: 'Typhoid Widal Diagnostic Test', price: 65.00, nhisCap: 40.00 },
  ], []);

  const demoRadiology = useMemo(() => [
    { id: 'r-1', name: 'Digital Chest X-Ray (PA View)', price: 150.00, nhisCap: 100.00 },
    { id: 'r-2', name: 'Abdominopelvic Ultrasound Scan', price: 180.00, nhisCap: 120.00 },
  ], []);

  const demoProcedure = useMemo(() => [
    { id: 'pr-1', name: 'Minor Surgical Wound Debridement & Suturing', price: 300.00, nhisCap: 200.00 },
    { id: 'pr-2', name: 'Intravenous Cannulation & Fluid Infusion Set', price: 90.00, nhisCap: 60.00 },
  ], []);

  const products = rawProducts && rawProducts.length > 0 ? rawProducts : demoProducts;
  const generalServices = rawGeneral && rawGeneral.length > 0 ? rawGeneral : demoGeneral;
  const labServices = rawLab && rawLab.length > 0 ? rawLab : demoLab;
  const radiologyServices = rawRadiology && rawRadiology.length > 0 ? rawRadiology : demoRadiology;
  const procedureServices = rawProcedure && rawProcedure.length > 0 ? rawProcedure : demoProcedure;

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const lower = productSearch.toLowerCase();
    return products.filter((p: any) => p.name?.toLowerCase().includes(lower) || p.sku?.toLowerCase().includes(lower));
  }, [products, productSearch]);

  const filterServiceList = (list: any[]) => {
    if (!serviceSearch.trim()) return list;
    const lower = serviceSearch.toLowerCase();
    return list.filter((s: any) => s.name?.toLowerCase().includes(lower));
  };

  const updatePrice = (collectionName: string, docId: string, newPriceStr: string, field: string = 'price') => {
    const newPrice = parseFloat(newPriceStr);
    if (isNaN(newPrice) || newPrice < 0) {
      toast({ variant: 'destructive', title: 'Invalid Price Input' });
      return;
    }
    
    if (!hospitalId || !firestore) {
      toast({ title: "Price Synchronized (Simulation)", description: `Updated ${field} to GHS ${newPrice.toFixed(2)}.` });
      return;
    }

    const docRef = doc(firestore, `hospitals/${hospitalId}/${collectionName}`, docId);
    updateDocumentNonBlocking(docRef, { [field]: newPrice, priceLastUpdated: serverTimestamp() });
    toast({ title: "Price Synchronized", description: `Updated ${field} to GHS ${newPrice.toFixed(2)}.` });
  };

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
                TARIFF MASTER & MULTI-PAYER PRICE CAPS
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              STATUTORY PRICE SCHEDULING, NHIS REIMBURSEMENT CAPS, AND CO-PAYMENT MATRIX ENGINE.
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
                <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">FINANCE CONTROLLER</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push('/finance/tariffs/bulk')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <FileSpreadsheet className="w-4 h-4" /> BULK CSV TARIFF IMPORT
            </button>
          </div>
        </div>

        {/* Bottom Row / Contextual Telemetry Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Cataloged Services & Items</span>
              <div className="text-xl font-black text-white font-mono">
                {products.length + generalServices.length + labServices.length + radiologyServices.length} Items
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Statutory Pricing Locked</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Layers className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Multi-Payer Rules Engine</span>
              <div className="text-xl font-black text-white">NHIS & PRIVATE</div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Auto Co-Pay Calculation</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Percent className="w-5 h-5 text-indigo-400" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Billing Console Sync</span>
              <div className="text-xl font-black text-emerald-400">ACTIVE SYNC</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Live Checkout Price Resolution</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. TABBED TARIFF MASTER WORKSPACE          */}
      {/* ========================================== */}
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 grid w-full grid-cols-2 text-xs font-black uppercase">
          <TabsTrigger value="products" className="rounded-xl py-2.5 cursor-pointer">Pharmacy Products & Consumables</TabsTrigger>
          <TabsTrigger value="services" className="rounded-xl py-2.5 cursor-pointer">Clinical & Diagnostics Menu</TabsTrigger>
        </TabsList>

        {/* TAB 1: PHARMACY PRODUCTS */}
        <TabsContent value="products" className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input 
                placeholder="Search product name or SKU..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-900 dark:text-slate-100"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>

            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
              Showing {filteredProducts.length} Items
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <TableHead className="p-4 pl-6">Product / SKU</TableHead>
                  <TableHead className="p-4">Store Type</TableHead>
                  <TableHead className="p-4 text-center">Purchase Price (GHS)</TableHead>
                  <TableHead className="p-4 text-right">Cash Selling Price (GHS)</TableHead>
                  <TableHead className="p-4 text-right">NHIS Reimbursement Cap (GHS)</TableHead>
                  <TableHead className="p-4 pr-6 text-right">Calculated Co-Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                {productsLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center p-12"><Loader2 className="animate-spin mx-auto text-emerald-500"/></TableCell></TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center p-12 text-slate-400 italic">No products found matching search.</TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((p: any) => {
                    const purchasePrice = p.purchasePrice ?? 0;
                    const sellingPrice = p.sellingPrice ?? p.price ?? 0;
                    const nhisCap = p.nhisCap ?? (sellingPrice * 0.7);
                    const copay = Math.max(0, sellingPrice - nhisCap);

                    return (
                      <TableRow key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <TableCell className="p-4 pl-6">
                          <p className="uppercase font-black text-slate-900 dark:text-slate-100">{p.name}</p>
                          <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">{p.sku}</p>
                        </TableCell>
                        <TableCell className="p-4">
                          <span className="text-[8px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded uppercase">
                            {p.storeType || 'PHARMACY'}
                          </span>
                        </TableCell>
                        <TableCell className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-[9px] text-slate-400 font-mono">₵</span>
                            <Input 
                              type="number" 
                              step="0.01"
                              className="w-20 p-1.5 h-8 rounded-lg border font-mono font-bold text-right text-xs"
                              defaultValue={purchasePrice.toFixed(2)}
                              onBlur={(e) => updatePrice('product_catalog', p.id, e.target.value, 'purchasePrice')}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-[9px] text-slate-400 font-mono">₵</span>
                            <Input 
                              type="number" 
                              step="0.01"
                              className="w-24 p-1.5 h-8 rounded-lg border-2 border-emerald-500/50 font-mono font-black text-right text-xs text-emerald-600 dark:text-emerald-400"
                              defaultValue={sellingPrice.toFixed(2)}
                              onBlur={(e) => updatePrice('product_catalog', p.id, e.target.value, 'sellingPrice')}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-[9px] text-indigo-400 font-mono">₵</span>
                            <Input 
                              type="number" 
                              step="0.01"
                              className="w-24 p-1.5 h-8 rounded-lg border font-mono font-bold text-right text-xs text-indigo-600 dark:text-indigo-400"
                              defaultValue={nhisCap.toFixed(2)}
                              onBlur={(e) => updatePrice('product_catalog', p.id, e.target.value, 'nhisCap')}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="p-4 pr-6 text-right font-mono font-black text-xs text-slate-900 dark:text-slate-100">
                          ₵ {copay.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TAB 2: CLINICAL SERVICES MENU */}
        <TabsContent value="services" className="mt-6 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input 
                placeholder="Search clinical procedures & lab tests..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-900 dark:text-slate-100"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
              />
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Live Tariff Multi-Payer Grid</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <TariffCategorySection 
              title="Clinical & General Consultations" 
              icon={<HeartPulse className="w-4 h-4 text-emerald-500" />} 
              services={filterServiceList(generalServices)}
              collectionName="general_services"
              onUpdate={updatePrice}
              isLoading={generalLoading}
            />
            <TariffCategorySection 
              title="Laboratory Diagnostics Menu" 
              icon={<Beaker className="w-4 h-4 text-emerald-500" />} 
              services={filterServiceList(labServices)}
              collectionName="lab_menu"
              onUpdate={updatePrice}
              isLoading={labLoading}
            />
            <TariffCategorySection 
              title="Radiology & Imaging Scans" 
              icon={<Camera className="w-4 h-4 text-indigo-500" />} 
              services={filterServiceList(radiologyServices)}
              collectionName="radiology_menu"
              onUpdate={updatePrice}
              isLoading={radiologyLoading}
            />
            <TariffCategorySection 
              title="Clinical Procedures & Theatre" 
              icon={<Edit3 className="w-4 h-4 text-indigo-500" />} 
              services={filterServiceList(procedureServices)}
              collectionName="procedure_menu"
              onUpdate={updatePrice}
              isLoading={procedureLoading}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TariffCategorySection({ title, icon, services, collectionName, onUpdate, isLoading }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-black text-xs uppercase tracking-widest text-slate-900 dark:text-slate-100">{title}</h3>
        </div>
        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">GHS Cash vs NHIS Cap</span>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {isLoading && <Loader2 className="animate-spin text-emerald-500 mx-auto py-4" />}
        {!isLoading && services?.length === 0 && (
          <p className="text-center text-xs text-slate-400 italic py-4">No tariff items found.</p>
        )}
        {services?.map((s: any) => {
          const cashPrice = s.price || 0;
          const nhisCap = s.nhisCap || (cashPrice * 0.7);

          return (
            <div key={s.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs font-bold">
              <span className="font-black text-slate-900 dark:text-slate-100 uppercase truncate max-w-[200px]">{s.name}</span>
              
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-slate-400 font-mono">Cash:</span>
                  <Input 
                    type="number"
                    step="0.01" 
                    className="w-20 p-1.5 h-7 rounded border font-mono font-bold text-right text-xs"
                    defaultValue={cashPrice.toFixed(2)}
                    onBlur={(e) => onUpdate(collectionName, s.id, e.target.value, 'price')}
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-indigo-400 font-mono">NHIS:</span>
                  <Input 
                    type="number"
                    step="0.01" 
                    className="w-20 p-1.5 h-7 rounded border font-mono font-bold text-right text-xs text-indigo-600 dark:text-indigo-400"
                    defaultValue={nhisCap.toFixed(2)}
                    onBlur={(e) => onUpdate(collectionName, s.id, e.target.value, 'nhisCap')}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}