'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, addDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { 
  Cog, Plus, Loader2, ShieldAlert, Package, Trash2, Search, 
  HeartPulse, Activity, BedDouble, Stethoscope, TestTube2, Scan, 
  CheckCircle2, Building2, Landmark, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const serviceFormSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  nhisCap: z.coerce.number().min(0, "NHIS Cap cannot be negative").optional(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export default function GeneralServicesSetupPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'GENERAL' | 'LAB' | 'RADIOLOGY' | 'PROCEDURE'>('ALL');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = userRole === 'DIRECTOR' || userRole === 'ADMIN' || userRole === 'ACCOUNTANT' || userRole === 'SUPER_ADMIN';

  // Real-time subscriptions across all 4 setup collections
  const generalQuery = useMemoFirebase(() => hospitalId && firestore ? query(collection(firestore, `hospitals/${hospitalId}/general_services`)) : null, [firestore, hospitalId]);
  const labQuery = useMemoFirebase(() => hospitalId && firestore ? query(collection(firestore, `hospitals/${hospitalId}/lab_menu`)) : null, [firestore, hospitalId]);
  const radiologyQuery = useMemoFirebase(() => hospitalId && firestore ? query(collection(firestore, `hospitals/${hospitalId}/radiology_menu`)) : null, [firestore, hospitalId]);
  const procedureQuery = useMemoFirebase(() => hospitalId && firestore ? query(collection(firestore, `hospitals/${hospitalId}/procedure_menu`)) : null, [firestore, hospitalId]);

  const { data: generalServices, isLoading: generalLoading } = useCollection(generalQuery);
  const { data: labServices, isLoading: labLoading } = useCollection(labQuery);
  const { data: radiologyServices, isLoading: radiologyLoading } = useCollection(radiologyQuery);
  const { data: procedureServices, isLoading: procedureLoading } = useCollection(procedureQuery);

  // Demodata Fallback for Immediate Setup Demonstration
  const demoServices = useMemo(() => [
    { id: 's-001', name: 'General OPD Specialist Consultation', price: 150.00, nhisCap: 80.00, sourceCollection: 'general_services', displayCategory: 'Consultation' },
    { id: 's-002', name: 'VIP ICU Bed Charge (Per Day)', price: 850.00, nhisCap: 350.00, sourceCollection: 'general_services', displayCategory: 'Bed Ward Tariff' },
    { id: 's-003', name: 'Full Blood Count (FBC) Automated Panel', price: 120.00, nhisCap: 45.00, sourceCollection: 'lab_menu', displayCategory: 'Laboratory Test' },
    { id: 's-004', name: 'Abdominal & Pelvic Ultrasound Scan', price: 250.00, nhisCap: 120.00, sourceCollection: 'radiology_menu', displayCategory: 'Radiology / Imaging' },
    { id: 's-005', name: 'Emergency Minor Surgical Suturing & Dressing', price: 450.00, nhisCap: 200.00, sourceCollection: 'procedure_menu', displayCategory: 'Clinical Procedure' }
  ], []);

  // Combine all services
  const allServices = useMemo(() => {
    const list: any[] = [];
    if (generalServices && generalServices.length > 0) {
      generalServices.forEach((s: any) => {
        list.push({ ...s, sourceCollection: 'general_services', displayCategory: s.category || 'General Service' });
      });
    }
    if (labServices && labServices.length > 0) {
      labServices.forEach((s: any) => {
        list.push({ ...s, sourceCollection: 'lab_menu', displayCategory: 'Laboratory Test' });
      });
    }
    if (radiologyServices && radiologyServices.length > 0) {
      radiologyServices.forEach((s: any) => {
        list.push({ ...s, sourceCollection: 'radiology_menu', displayCategory: 'Radiology / Imaging' });
      });
    }
    if (procedureServices && procedureServices.length > 0) {
      procedureServices.forEach((s: any) => {
        list.push({ ...s, sourceCollection: 'procedure_menu', displayCategory: 'Clinical Procedure' });
      });
    }
    return list.length > 0 ? list : demoServices;
  }, [generalServices, labServices, radiologyServices, procedureServices, demoServices]);

  // Filtered Services based on search query & tab
  const filteredServices = useMemo(() => {
    let list = allServices;

    if (activeTab === 'GENERAL') {
      list = list.filter(s => s.sourceCollection === 'general_services');
    } else if (activeTab === 'LAB') {
      list = list.filter(s => s.sourceCollection === 'lab_menu');
    } else if (activeTab === 'RADIOLOGY') {
      list = list.filter(s => s.sourceCollection === 'radiology_menu');
    } else if (activeTab === 'PROCEDURE') {
      list = list.filter(s => s.sourceCollection === 'procedure_menu');
    }

    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      list = list.filter(s => 
        s.name?.toLowerCase().includes(lower) || 
        s.displayCategory?.toLowerCase().includes(lower)
      );
    }
    return list;
  }, [allServices, searchQuery, activeTab]);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: '',
      category: 'CONSULTATION',
      price: 0,
      nhisCap: 0
    },
  });

  const handleAddService = (values: ServiceFormValues) => {
    if (!firestore || !hospitalId) return;

    let targetCollection = '';
    let payload: any = {
      name: values.name,
      price: values.price,
      nhisCap: values.nhisCap || 0,
      hospitalId,
      createdAt: serverTimestamp(),
    };

    if (values.category === 'LAB_TEST') {
      targetCollection = 'lab_menu';
      payload.category = 'Laboratory';
    } else if (values.category === 'RADIOLOGY_SCAN') {
      targetCollection = 'radiology_menu';
      payload.category = 'Radiology';
    } else if (values.category === 'CLINICAL_PROCEDURE') {
      targetCollection = 'procedure_menu';
      payload.category = 'Procedure';
    } else {
      targetCollection = 'general_services';
      payload.category = values.category;
    }
    
    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/${targetCollection}`), payload);

    toast({
      title: 'Service Node Configured',
      description: `${values.name} added to ${targetCollection}.`,
    });
    form.reset({
      name: '',
      category: 'CONSULTATION',
      price: 0,
      nhisCap: 0
    });
    setIsAddServiceOpen(false);
  };

  const handleDeleteService = async (collectionName: string, serviceId: string, serviceName: string) => {
    if (!firestore || !hospitalId) return;
    try {
      await deleteDoc(doc(firestore, `hospitals/${hospitalId}/${collectionName}`, serviceId));
      toast({
        title: 'Service Node Removed',
        description: `${serviceName} has been deleted.`,
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
    }
  };

  const isLoading = isUserLoading || isProfileLoading || generalLoading || labLoading || radiologyLoading || procedureLoading;
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for General Services Master Setup.</p>
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
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, User Context */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Cog className="w-7 h-7 animate-spin-slow" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                GENERAL SERVICES MASTER SETUP & TARIFF MATRIX
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              CONFIGURE CLINICAL DEPARTMENTS, BED TARIFFS, LAB MENUS, RADIOLOGY SCANS, AND PROCEDURE NODES.
            </p>
          </div>

          {/* User Context */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 self-start xl:self-auto">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
              {userInitials}
            </div>
            <div>
              <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
              <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">CHIEF ACCOUNTANT</div>
            </div>
          </div>
        </div>

        {/* Bottom Row / Contextual Setup Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active Service Nodes</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {allServices.length} Configured
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Cross-Departmental Tariff Master</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Package className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Service Sub-Menus</span>
              <div className="text-2xl font-black text-sky-400 font-mono">4 Modules</div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">General, Lab, Radiology, Procedures</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Tariff Master Status</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">100% Active</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Feeds POS Checkout & Billing</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. FILTER TABS & SEARCH CONTROLS           */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search service by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Module Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-2 text-xs font-black uppercase rounded-xl transition-all cursor-pointer ${
                activeTab === 'ALL' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              ALL ({allServices.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('GENERAL')}
              className={`px-3.5 py-2 text-xs font-black uppercase rounded-xl transition-all cursor-pointer ${
                activeTab === 'GENERAL' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              CONSULTATIONS & BEDS
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('LAB')}
              className={`px-3.5 py-2 text-xs font-black uppercase rounded-xl transition-all cursor-pointer ${
                activeTab === 'LAB' ? 'bg-sky-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              LABORATORY MENU
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('RADIOLOGY')}
              className={`px-3.5 py-2 text-xs font-black uppercase rounded-xl transition-all cursor-pointer ${
                activeTab === 'RADIOLOGY' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              RADIOLOGY SCANS
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PROCEDURE')}
              className={`px-3.5 py-2 text-xs font-black uppercase rounded-xl transition-all cursor-pointer ${
                activeTab === 'PROCEDURE' ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              CLINICAL PROCEDURES
            </button>
          </div>

          {/* Configure New Service Modal Trigger */}
          <Dialog open={isAddServiceOpen} onOpenChange={setIsAddServiceOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg self-start lg:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>CONFIGURE NEW SERVICE</span>
              </button>
            </DialogTrigger>
            <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Cog className="w-5 h-5 text-emerald-500" />
                  <span>Configure Hospital Service Node</span>
                </DialogTitle>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddService)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase text-slate-500">Service Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. ICU Day Bed Charge or Abdominal Scan" {...field} className="rounded-xl text-xs" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase text-slate-500">Category Module</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl text-xs font-bold">
                              <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CONSULTATION">Consultation / OPD</SelectItem>
                            <SelectItem value="BED_WARD">Bed Ward Tariff</SelectItem>
                            <SelectItem value="LAB_TEST">Laboratory Menu</SelectItem>
                            <SelectItem value="RADIOLOGY_SCAN">Radiology / Imaging</SelectItem>
                            <SelectItem value="CLINICAL_PROCEDURE">Clinical Procedure</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-slate-500">Base Cash Price (GHS)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} className="rounded-xl font-mono text-xs font-bold" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nhisCap"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-slate-500">NHIS Tariff Cap (GHS)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} className="rounded-xl font-mono text-xs font-bold" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter className="pt-4">
                    <button
                      type="submit"
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer"
                    >
                      SAVE SERVICE TO MASTER TARIFF
                    </button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

        </div>
      </div>

      {/* ========================================== */}
      {/* 3. MASTER SERVICE NODE DATA GRID           */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredServices.length === 0 ? (
          <div className="p-16 text-center text-slate-400 italic">
            No hospital service nodes found matching query.
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
              <tr>
                <th className="p-4">Service Node Name</th>
                <th className="p-4">Category Module</th>
                <th className="p-4 text-right">Base Cash Price (₵)</th>
                <th className="p-4 text-right">NHIS Reimbursement Cap (₵)</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredServices.map(service => {
                const cashPrice = Number(service.price || 0);
                const nhisCap = Number(service.nhisCap || 0);

                return (
                  <tr key={service.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                    <td className="p-4 font-black uppercase text-slate-900 dark:text-slate-100">
                      {service.name}
                    </td>
                    <td className="p-4 font-bold text-slate-600 dark:text-slate-400">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px]">
                        {service.displayCategory || 'General Service'}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                      ₵ {cashPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-sky-600 dark:text-sky-400">
                      ₵ {nhisCap.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteService(service.sourceCollection, service.id, service.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                        title="Delete Service Node"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
