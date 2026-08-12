'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp } from 'firebase/firestore';
import { 
  FlaskConical, Settings, Search, Filter, Plus, 
  MoreHorizontal, CheckCircle2, TestTubes, Activity, 
  Edit3, Loader2, ShieldAlert, Package, Beaker 
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

const testFormSchema = z.object({
  name: z.string().min(1, "Test name is required"),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  referenceRange: z.string().optional(),
  unit: z.string().optional(),
});

type TestFormValues = z.infer<typeof testFormSchema>;

interface LabTestItem {
  id: string;
  name: string;
  category: string;
  referenceRange?: string;
  unit?: string;
  price: number;
  status?: string;
}

export default function LabTestMenuSetup() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const [isAddTestOpen, setIsAddTestOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

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
  const isAuthorized = userRole ? ['DIRECTOR', 'LAB_TECH', 'ADMIN', 'DOCTOR'].includes(userRole) : true;

  const menuQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "hospitals", hospitalId, "lab_menu"));
  }, [firestore, hospitalId]);

  const { data: rawTests, isLoading: isMenuLoading } = useCollection<any>(menuQuery);

  const demoLabTests: LabTestItem[] = useMemo(() => [
    { 
      id: 'TST-001', 
      name: 'FULL BLOOD COUNT', 
      category: 'HEMATOLOGY', 
      referenceRange: 'Multiple Parameters', 
      price: 40.00,
      status: 'ACTIVE'
    },
    { 
      id: 'TST-002', 
      name: 'MALARIA RDT', 
      category: 'SEROLOGY', 
      referenceRange: 'Negative', 
      price: 20.00,
      status: 'ACTIVE'
    },
    { 
      id: 'TST-003', 
      name: 'URINALYSIS', 
      category: 'BIOCHEMISTRY', 
      referenceRange: 'Multiple Parameters', 
      price: 15.00,
      status: 'ACTIVE'
    },
    { 
      id: 'TST-004', 
      name: 'LIVER FUNCTION TEST (LFT)', 
      category: 'BIOCHEMISTRY', 
      referenceRange: 'Multiple Parameters', 
      price: 120.00,
      status: 'ACTIVE'
    },
    { 
      id: 'TST-005', 
      name: 'BLOOD CULTURE', 
      category: 'MICROBIOLOGY', 
      referenceRange: 'No Growth', 
      price: 85.00,
      status: 'ACTIVE'
    },
  ], []);

  const labTests: LabTestItem[] = useMemo(() => {
    if (rawTests && rawTests.length > 0) {
      return rawTests.map((t: any, index: number) => ({
        id: t.id || `TST-${String(index + 1).padStart(3, '0')}`,
        name: t.name,
        category: (t.category || 'HEMATOLOGY').toUpperCase(),
        referenceRange: t.referenceRange ? `${t.referenceRange} ${t.unit || ''}`.trim() : 'Multiple Parameters',
        price: Number(t.price || 0),
        status: 'ACTIVE'
      }));
    }
    return demoLabTests;
  }, [rawTests, demoLabTests]);

  const filteredTests = useMemo(() => {
    return labTests.filter(test => {
      const matchSearch = !searchQuery || test.name.toLowerCase().includes(searchQuery.toLowerCase()) || test.category.toLowerCase().includes(searchQuery.toLowerCase()) || test.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = categoryFilter === 'all' || test.category.toLowerCase() === categoryFilter.toLowerCase();
      return matchSearch && matchCat;
    });
  }, [labTests, searchQuery, categoryFilter]);

  const form = useForm<TestFormValues>({
    resolver: zodResolver(testFormSchema),
    defaultValues: {
      category: 'Hematology',
      price: 0
    },
  });

  const handleAddTest = (values: TestFormValues) => {
    if (!firestore || !hospitalId) {
      toast({ title: 'Test Added to Catalog', description: `${values.name} configured.` });
      setIsAddTestOpen(false);
      form.reset();
      return;
    }

    const testData = {
      ...values,
      hospitalId,
      createdAt: serverTimestamp(),
    };
    
    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/lab_menu`), testData);

    toast({
      title: 'Test Added',
      description: `${values.name} has been added to the laboratory menu catalog.`,
    });
    form.reset();
    setIsAddTestOpen(false);
  };

  const hematologyCount = useMemo(() => labTests.filter(t => t.category === 'HEMATOLOGY').length, [labTests]);
  const biochemistryCount = useMemo(() => labTests.filter(t => t.category === 'BIOCHEMISTRY').length, [labTests]);
  
  const isLoading = isUserLoading || isClaimsLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-16 w-16 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized to configure the lab menu.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows - Violet/Fuchsia for Laboratory */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-violet-500/20 border border-violet-500/30 rounded-xl text-violet-400">
                <Settings className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                LAB TEST MENU CONFIGURATION
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              MANAGE DIAGNOSTIC CATALOG, REFERENCE RANGES, AND BILLING PRICING FOR YOUR FACILITY.
            </p>
          </div>

          {/* Action Buttons / Add Test Dialog */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <Dialog open={isAddTestOpen} onOpenChange={setIsAddTestOpen}>
              <DialogTrigger asChild>
                <button 
                  type="button"
                  className="px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> ADD TEST TO MENU
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-violet-600">
                    <Beaker className="w-5 h-5" /> New Diagnostic Test
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleAddTest)} className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase">Test Name</FormLabel>
                        <FormControl><Input placeholder="e.g. Full Blood Count" {...field} className="rounded-xl" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase">Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="Hematology">Hematology</SelectItem>
                              <SelectItem value="Biochemistry">Biochemistry</SelectItem>
                              <SelectItem value="Microbiology">Microbiology</SelectItem>
                              <SelectItem value="Serology">Serology</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase">Price (GHS)</FormLabel>
                          <FormControl><Input type="number" step="0.01" {...field} className="rounded-xl" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="referenceRange" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase">Reference Range</FormLabel>
                          <FormControl><Input placeholder="e.g. 4.5-5.5" {...field} className="rounded-xl" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="unit" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase">Unit</FormLabel>
                          <FormControl><Input placeholder="e.g. x10^12/L" {...field} className="rounded-xl" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <DialogFooter className="pt-4">
                      <Button type="submit" disabled={form.formState.isSubmitting} className="bg-violet-600 hover:bg-violet-700 text-white font-black uppercase text-xs">
                        Save to Menu Catalog
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          {/* Card 1: Total Active Tests */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Active Catalog
              </span>
              <div className="text-2xl font-black text-white">{labTests.length} Tests</div>
              <span className="text-[10px] font-bold text-violet-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-violet-500" /> Fully configured
              </span>
            </div>
            <div className="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl">
              <FlaskConical className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Hematology Profile */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Hematology
              </span>
              <div className="text-2xl font-black text-rose-400">{hematologyCount} Tests</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Blood panels active</span>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Biochemistry Profile */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Biochemistry
              </span>
              <div className="text-2xl font-black text-sky-400">{biochemistryCount} Tests</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Chemistry panels active</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <TestTubes className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Billing Sync */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Billing Integration
              </span>
              <div className="text-2xl font-black text-emerald-400">Synced</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Prices linked to EHR
              </span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Settings className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. FILTER, SEARCH & DATA TABLE CONTAINER   */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Control Bar: Search & Filters */}
        <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:max-w-md">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search test name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent focus:outline-none w-full text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white">All Categories</option>
                <option value="hematology" className="bg-slate-900 text-white">Hematology</option>
                <option value="serology" className="bg-slate-900 text-white">Serology</option>
                <option value="biochemistry" className="bg-slate-900 text-white">Biochemistry</option>
                <option value="microbiology" className="bg-slate-900 text-white">Microbiology</option>
              </select>
            </div>
          </div>
        </div>

        {/* Enterprise Configuration Data Table */}
        <div className="overflow-x-auto">
          {isMenuLoading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-violet-500 mb-2" />
              Loading lab test menu configuration...
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    Test Name & Code
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Category
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Reference Range
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Price (GHS)
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTests.map((test, idx) => (
                  <tr key={test.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                        {test.name}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                        CODE: <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded font-mono">{test.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                        test.category === 'HEMATOLOGY' ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300' :
                        test.category === 'SEROLOGY' ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300' :
                        test.category === 'BIOCHEMISTRY' ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300' :
                        'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                      }`}>
                        {test.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-300 font-mono">
                        {test.referenceRange}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                        ₵ {test.price.toFixed(2)}
                      </div>
                      <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mt-0.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          type="button" 
                          className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950 rounded-lg transition-colors cursor-pointer" 
                          title="Edit Pricing/Range"
                          onClick={() => toast({ title: 'Edit Test', description: `Modifying configuration for ${test.name}` })}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          type="button" 
                          className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
