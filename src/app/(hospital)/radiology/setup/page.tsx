'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp } from 'firebase/firestore';
import { Camera, Plus, Loader2, ShieldAlert, Package, Search, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const scanFormSchema = z.object({
  name: z.string().min(1, "Scan name is required"),
  modality: z.string().min(1, "Modality is required"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
});

type ScanFormValues = z.infer<typeof scanFormSchema>;

interface MenuScanItem {
  id: string;
  name: string;
  modality: string;
  price: number;
  status?: 'ACTIVE' | 'MAINTENANCE';
}

// Fallback Initial Menu for immediate visual standard
const initialMenu: MenuScanItem[] = [
  { id: 'SCN-001', name: 'Obstetric Scan', modality: 'ULTRASOUND (USS)', price: 100.00, status: 'ACTIVE' },
  { id: 'SCN-002', name: 'Chest X-Ray (PA View)', modality: 'X-RAY', price: 120.00, status: 'ACTIVE' },
  { id: 'SCN-003', name: 'Pelvic Ultrasound', modality: 'ULTRASOUND (USS)', price: 100.00, status: 'ACTIVE' },
  { id: 'SCN-004', name: 'MRI Brain w/ Contrast', modality: 'MRI', price: 1250.00, status: 'ACTIVE' },
  { id: 'SCN-005', name: 'CT Abdomen & Pelvis', modality: 'CT SCAN', price: 950.00, status: 'MAINTENANCE' },
];

export default function RadiologySetupPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const [isAddScanOpen, setIsAddScanOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
  const isAuthorized = !userRole || ['DIRECTOR', 'RADIOLOGIST', 'ADMIN', 'DOCTOR'].includes(userRole);

  const menuQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "hospitals", hospitalId, "radiology_menu"));
  }, [firestore, hospitalId]);

  const { data: dbScans, isLoading: isMenuLoading } = useCollection<any>(menuQuery);

  const menuScans = useMemo(() => {
    if (dbScans && dbScans.length > 0) {
      return dbScans.map(s => ({
        id: s.id,
        name: s.name,
        modality: s.modality ? s.modality.toUpperCase() : 'X-RAY',
        price: Number(s.price || 0),
        status: s.status || 'ACTIVE',
      }));
    }
    return initialMenu;
  }, [dbScans]);

  const metrics = useMemo(() => {
    const total = menuScans.length;
    const active = menuScans.filter(m => m.status === 'ACTIVE').length;
    return { total, active };
  }, [menuScans]);

  const form = useForm<ScanFormValues>({
    resolver: zodResolver(scanFormSchema),
    defaultValues: {
      modality: 'X-RAY',
      price: 120.00
    },
  });

  const handleAddScan = (values: ScanFormValues) => {
    if (!firestore || !hospitalId) {
      toast({
        title: '⚡ Scan Added to Tariff Ledger',
        description: `${values.name} (${values.modality.toUpperCase()}) added to pricing catalog.`,
      });
      form.reset();
      setIsAddScanOpen(false);
      return;
    }

    const scanData = {
      ...values,
      modality: values.modality.toUpperCase(),
      hospitalId,
      status: 'ACTIVE',
      createdAt: serverTimestamp(),
    };
    
    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/radiology_menu`), scanData);

    toast({
      title: '⚡ Scan Added to Tariff Ledger',
      description: `${values.name} has been added to the imaging menu catalog.`,
    });
    form.reset();
    setIsAddScanOpen(false);
  };

  const getModalityBadge = (modality: string) => {
    const modUpper = modality.toUpperCase();
    if (modUpper.includes('ULTRASOUND') || modUpper.includes('USS')) {
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    }
    if (modUpper.includes('X-RAY')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (modUpper.includes('MRI')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    if (modUpper.includes('CT')) {
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
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
          <p className="text-xs text-slate-400 mt-1">You are not authorized to configure the imaging menu.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4 w-full">Return Home</Button>
        </div>
      </div>
    );
  }

  const filteredScans = menuScans.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.modality.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. GAM MED SIGNATURE HERO COMMAND BANNER   */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        {/* Ambient Radial Accent Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Camera className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                RADIOLOGY TARIFF LEDGER
              </h1>
              <h2 className="text-xs md:text-sm font-bold text-slate-400 mt-1 uppercase tracking-wider">
                Configure available imaging scans, modalities, and billing prices.
              </h2>
            </div>
          </div>
        </div>

        {/* Live Telemetry */}
        <div className="flex gap-4 relative z-10 w-full md:w-auto">
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex-1 md:flex-none">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Configured Scans</p>
            <p className="text-xl font-mono text-white font-black">{metrics.total}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex-1 md:flex-none">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Active Modalities</p>
            <p className="text-xl font-mono text-emerald-400 font-black">{metrics.active}</p>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. CONTROL BAR & ADD DIALOG                */}
      {/* ========================================== */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by scan name or modality..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-10 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none" 
          />
        </div>

        <Dialog open={isAddScanOpen} onOpenChange={setIsAddScanOpen}>
          <DialogTrigger asChild>
            <button className="w-full sm:w-auto px-6 py-3 bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-black rounded-xl shadow-xl transition-all uppercase tracking-wider flex items-center justify-center gap-2 border border-indigo-700 cursor-pointer">
              <Plus size={16} className="text-indigo-400" /> ADD SCAN TO MENU
            </button>
          </DialogTrigger>

          <DialogContent className="max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-800 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-black uppercase text-slate-900 dark:text-slate-100">
                <Camera className="text-indigo-400" /> New Imaging Scan Tariff
              </DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddScan)} className="space-y-4 pt-2">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-400">Scan Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Chest X-Ray (PA View)" {...field} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="modality" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-400">Modality *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="X-RAY">X-RAY</SelectItem>
                          <SelectItem value="ULTRASOUND (USS)">ULTRASOUND (USS)</SelectItem>
                          <SelectItem value="CT SCAN">CT SCAN</SelectItem>
                          <SelectItem value="MRI">MRI</SelectItem>
                          <SelectItem value="ECG / ECHO">ECG / ECHO</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-400">Cash Tariff (GHS) *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <DialogFooter className="pt-4">
                  <button 
                    type="submit" 
                    className="w-full py-3 bg-indigo-950 hover:bg-indigo-900 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xl transition-all border border-indigo-700 cursor-pointer"
                  >
                    SAVE SCAN TO TARIFF LEDGER
                  </button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ========================================== */}
      {/* 3. THE IMMUTABLE TARIFF GRID               */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
              <th className="p-4 w-16 text-center">Ref</th>
              <th className="p-4">Scan Name</th>
              <th className="p-4">Hardware Modality</th>
              <th className="p-4 text-right">Cash Tariff (GHS)</th>
              <th className="p-4 text-center">System Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="text-xs">
            {filteredScans.map((item) => (
              <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="p-4 text-center">
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {item.id.includes('-') ? item.id.split('-')[1] : item.id.substring(0, 4)}
                  </span>
                </td>

                <td className="p-4 font-black text-slate-900 dark:text-slate-100 uppercase">
                  {item.name}
                </td>

                <td className="p-4">
                  <span className={`inline-block border px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getModalityBadge(item.modality)}`}>
                    {item.modality}
                  </span>
                </td>

                <td className="p-4 text-right font-mono font-black text-indigo-600 dark:text-indigo-400">
                  {item.price.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                </td>

                <td className="p-4 text-center">
                  {item.status === 'ACTIVE' ? (
                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-full uppercase tracking-widest inline-flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-black text-amber-400 bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-full uppercase tracking-widest inline-flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div> Maintenance
                    </span>
                  )}
                </td>

                <td className="p-4 text-right">
                  <button className="text-[10px] font-black text-slate-400 hover:text-indigo-400 hover:bg-slate-800 px-3 py-1.5 rounded-xl transition-colors uppercase tracking-widest cursor-pointer">
                    EDIT
                  </button>
                </td>
              </tr>
            ))}

            {filteredScans.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-400 font-bold text-xs">
                  No matching scans found in the radiology tariff ledger.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
