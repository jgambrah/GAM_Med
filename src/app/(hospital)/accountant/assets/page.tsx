'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, serverTimestamp, doc, writeBatch, increment, getDocs, where } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2, Truck, Zap, Activity,
  Plus, Search, TrendingDown, Wrench,
  ShieldCheck, Calculator, Calendar, Loader2, ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { ASSET_GROUPS, PPE_SUB_DIVISIONS } from '@/lib/constants';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const assetGroupIds = ASSET_GROUPS.map(g => g.id) as [string, ...string[]];

const assetSchema = z.object({
  name: z.string().min(1, "Asset Name is required."),
  category: z.enum(assetGroupIds, { required_error: "Category is required."}),
  subDivision: z.string().optional(),
  tagId: z.string().min(1, "Asset Tag ID is required."),
  purchaseDate: z.string().min(1, "Purchase Date is required."),
  purchasePrice: z.coerce.number().min(0, "Purchase Price must be a positive number."),
  usefulLife: z.coerce.number().min(1, "Useful Life must be at least 1 year."),
  salvageValue: z.coerce.number().min(0, "Salvage Value cannot be negative."),
  status: z.string().min(1, "Status is required."),
}).refine(data => {
    if (data.category === 'PPE' && !data.subDivision) {
        return false;
    }
    return true;
}, {
    message: "Sub-Division is required for PPE assets.",
    path: ["subDivision"],
});

type AssetFormValues = z.infer<typeof assetSchema>;

export default function FixedAssetManagementPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userRole);

  const assetsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'assets'));
  }, [firestore, hospitalId]);
  const { data: assets, isLoading: areAssetsLoading } = useCollection(assetsQuery);

  // Fetch chart of accounts to find 5005 & 1099
  const coaQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`));
  }, [firestore, hospitalId]);
  const { data: coa } = useCollection(coaQuery);

  const [periodMonth, setPeriodMonth] = useState(() => new Date().getMonth());
  const [periodYear, setPeriodYear] = useState(() => new Date().getFullYear());

  const periodKey = useMemo(() => {
    return `${periodYear}-${String(periodMonth + 1).padStart(2, '0')}`;
  }, [periodMonth, periodYear]);

  const calculateDepreciation = (asset: any) => {
    if (!asset.purchaseDate) return { accumulatedDep: 0, netBookValue: asset.purchasePrice };
    const purchaseDate = new Date(asset.purchaseDate);
    const today = new Date();
    const ageInYears = (today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    
    const yearlyDep = (asset.purchasePrice - asset.salvageValue) / asset.usefulLife;
    const accumulatedDep = Math.min(asset.purchasePrice - asset.salvageValue, yearlyDep * ageInYears);
    const netBookValue = asset.purchasePrice - accumulatedDep;

    return { accumulatedDep, netBookValue };
  };

  const calculateMonthlyDep = (asset: any) => {
    if (!asset.usefulLife || asset.usefulLife <= 0) return 0;
    const yearlyDep = (asset.purchasePrice - (asset.salvageValue || 0)) / asset.usefulLife;
    const monthlyDep = yearlyDep / 12;
    
    const currentDep = asset.accumulatedDepreciation || 0;
    const maxDep = asset.purchasePrice - (asset.salvageValue || 0);
    const remainingDep = maxDep - currentDep;
    
    return Math.max(0, Math.min(monthlyDep, remainingDep));
  };

  // Filter assets that are operational and have not been depreciated this period
  const eligibleAssets = useMemo(() => {
    if (!assets) return [];
    return assets.filter((a: any) => 
      a.status === 'OPERATIONAL' && 
      a.lastDepreciationPeriod !== periodKey &&
      calculateMonthlyDep(a) > 0
    );
  }, [assets, periodKey]);
  
  const pageIsLoading = isUserLoading || isProfileLoading;
  
  if (pageIsLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized for this module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Fixed <span className="text-primary">Assets</span></h1>
          <p className="text-muted-foreground font-medium">Capital Asset Tracking & Depreciation Management.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Target Period Selectors */}
          <div className="flex gap-1.5 no-print">
            <select 
              value={periodMonth} 
              onChange={e => setPeriodMonth(parseInt(e.target.value))}
              className="border-2 border-slate-200 rounded-xl px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-800 bg-white outline-none"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={i}>
                  {new Date(2026, i).toLocaleString('en-US', { month: 'short' })}
                </option>
              ))}
            </select>
            <select 
              value={periodYear} 
              onChange={e => setPeriodYear(parseInt(e.target.value))}
              className="border-2 border-slate-200 rounded-xl px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-800 bg-white outline-none"
            >
              {[2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {hospitalId && (
            <PostDepreciationButton 
              hospitalId={hospitalId} 
              eligibleAssets={eligibleAssets} 
              coa={coa} 
              periodKey={periodKey} 
              calculateMonthlyDep={calculateMonthlyDep}
            />
          )}
          <AddAssetDialog hospitalId={hospitalId} isOpen={isAddAssetOpen} setIsOpen={setIsAddAssetOpen} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <AssetKPI label="Total Asset Cost" value={`GHS ${assets?.reduce((a,b) => a + b.purchasePrice, 0).toLocaleString() ?? 0}`} icon={<Building2/>} color="blue" />
         <AssetKPI label="Net Book Value" value={`GHS ${assets?.reduce((a,b) => a + calculateDepreciation(b).netBookValue, 0).toLocaleString(undefined, {minimumFractionDigits: 2}) ?? 0}`} icon={<TrendingDown/>} color="orange" />
         <AssetKPI label="Maintenance Due" value="0" icon={<Wrench/>} color="red" />
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset Identity & Tag</TableHead>
              <TableHead>Major Category</TableHead>
              <TableHead>Sub-Division</TableHead>
              <TableHead>Cost Price (GHS)</TableHead>
              <TableHead>Net Book Value (GHS)</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areAssetsLoading ? <TableRow><TableCell colSpan={6} className="text-center p-12"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow> :
            assets?.map(asset => {
              const { netBookValue } = calculateDepreciation(asset);
              return (
                <TableRow key={asset.id}>
                  <TableCell>
                     <p className="uppercase font-bold text-sm">{asset.name}</p>
                     <p className="text-[10px] text-primary font-black">TAG: {asset.tagId}</p>
                  </TableCell>
                  <TableCell>
                     <span className="text-[9px] font-black bg-muted px-3 py-1 rounded-full text-muted-foreground uppercase">{asset.category.replace('_', ' ')}</span>
                  </TableCell>
                   <TableCell>
                     <span className="text-[9px] font-bold text-slate-500 uppercase">{asset.subDivision?.replace('_', ' ') || 'N/A'}</span>
                  </TableCell>
                  <TableCell className="font-mono">{asset.purchasePrice.toLocaleString()}</TableCell>
                  <TableCell className="font-mono font-bold">{netBookValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell>
                  <td className="p-6 text-right">
                     <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase italic ${asset.status === 'OPERATIONAL' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {asset.status}
                     </span>
                  </td>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

const PostDepreciationButton = ({ 
  hospitalId, 
  eligibleAssets, 
  coa, 
  periodKey,
  calculateMonthlyDep
}: { 
  hospitalId: string; 
  eligibleAssets: any[]; 
  coa: any[] | undefined; 
  periodKey: string; 
  calculateMonthlyDep: (asset: any) => number;
}) => {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  const totalMonthlyDepreciation = useMemo(() => {
    return eligibleAssets.reduce((acc, curr) => acc + calculateMonthlyDep(curr), 0);
  }, [eligibleAssets, calculateMonthlyDep]);

  const handlePostDepreciation = async () => {
    if (!firestore || !hospitalId || !user) return;
    if (eligibleAssets.length === 0) {
      toast({ title: "No Assets Pending Depreciation", description: "All operational assets are already up to date for this period." });
      return;
    }

    setLoading(true);
    const batch = writeBatch(firestore);

    try {
      // Find the account codes in COA
      const expenseAccount = coa?.find(a => a.accountCode === "5005");
      const contraAssetAccount = coa?.find(a => a.accountCode === "1099");

      if (!expenseAccount) throw new Error("Depreciation Expense Account (5005) not found in Chart of Accounts.");
      if (!contraAssetAccount) throw new Error("Accumulated Depreciation Account (1099) not found in Chart of Accounts.");

      // Create Pending Journal Voucher
      const jvRef = doc(collection(firestore, `hospitals/${hospitalId}/journal_entries`));
      const jvNumber = `JV-DEP-${periodKey}-${Date.now().toString().slice(-4)}`;

      batch.set(jvRef, {
        jvNumber,
        narration: `Automated Depreciation Charge for ${periodKey} (${eligibleAssets.length} assets processed)`,
        totalAmount: totalMonthlyDepreciation,
        hospitalId,
        createdBy: user.uid,
        createdByName: user.displayName || "Accountant",
        createdAt: serverTimestamp(),
        type: 'DEPRECIATION',
        status: 'PENDING_APPROVAL',
        lines: [
          { accountId: expenseAccount.id, accountName: expenseAccount.name, debit: totalMonthlyDepreciation, credit: 0 },
          { accountId: contraAssetAccount.id, accountName: contraAssetAccount.name, debit: 0, credit: totalMonthlyDepreciation }
        ]
      });

      // Update assets and create history
      eligibleAssets.forEach(asset => {
        const monthlyDep = calculateMonthlyDep(asset);
        const assetRef = doc(firestore, `hospitals/${hospitalId}/assets`, asset.id);
        
        batch.update(assetRef, {
          lastDepreciationPeriod: periodKey,
          accumulatedDepreciation: increment(monthlyDep)
        });

        const historyRef = doc(collection(firestore, `hospitals/${hospitalId}/depreciation_history`));
        batch.set(historyRef, {
          assetId: asset.id,
          assetName: asset.name,
          assetCategory: asset.category,
          subDivision: asset.subDivision || null,
          hospitalId,
          period: periodKey,
          amount: monthlyDep,
          createdAt: serverTimestamp()
        });
      });

      // Write Global Audit Log
      const auditRef = doc(collection(firestore, "global_audit_logs"));
      batch.set(auditRef, {
        type: 'FINANCIAL',
        action: 'DEPRECIATION_JV_STAGED',
        hospitalId,
        actorId: user.uid,
        actorName: user.displayName || "Accountant",
        details: `Staged GHS ${totalMonthlyDepreciation.toFixed(2)} depreciation JV for period ${periodKey}`,
        timestamp: serverTimestamp()
      });

      await batch.commit();
      toast({ title: "Depreciation JV Submitted", description: `Journal Voucher ${jvNumber} has been sent to the Auditor console.` });
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Depreciation Posting Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          disabled={eligibleAssets.length === 0} 
          className="bg-slate-900 text-white hover:bg-slate-800 font-black uppercase text-[10px] tracking-widest rounded-2xl py-3.5 h-auto transition-all flex items-center gap-2 border-0"
        >
          <Calculator size={14} /> Post Depreciation JV ({eligibleAssets.length})
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Depreciation Journal Entry</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              This will stage a depreciation charge of <span className="font-extrabold text-foreground">GHS {totalMonthlyDepreciation.toLocaleString(undefined, {minimumFractionDigits: 2})}</span> for the period <span className="font-extrabold text-slate-900">{periodKey}</span>.
            </p>
            <p className="text-xs text-muted-foreground uppercase leading-relaxed font-bold">
              It will create a pending double-entry Journal Voucher (Debit: Depreciation Expense, Credit: Accumulated Depreciation) and submit it for Auditor approval. Individual asset wear-and-tear records will be locked for this period.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handlePostDepreciation}
            disabled={loading}
            className="bg-slate-900 hover:bg-primary text-white"
          >
            {loading ? "Posting..." : "Confirm & Send to Auditor"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const AddAssetDialog = ({ hospitalId, isOpen, setIsOpen }: { hospitalId: string, isOpen: boolean, setIsOpen: (open: boolean) => void }) => {
    const { toast } = useToast();
    const firestore = useFirestore();

    const form = useForm<AssetFormValues>({
        resolver: zodResolver(assetSchema),
        defaultValues: {
            name: '',
            category: 'PPE',
            subDivision: '',
            tagId: '',
            purchaseDate: '',
            purchasePrice: 0,
            usefulLife: 5,
            salvageValue: 0,
            status: 'OPERATIONAL'
        }
    });
    
    const category = form.watch('category');

    const onSubmit = (values: AssetFormValues) => {
        if (!firestore) return;
        addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/assets`), {
            ...values,
            hospitalId,
            accumulatedDepreciation: 0, // Initialize
            createdAt: serverTimestamp()
        });
        toast({ title: "Asset Registered", description: `${values.name} added to the master ledger.` });
        setIsOpen(false);
        form.reset();
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button><Plus/> Register Asset</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Asset Registration</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Asset Name (e.g. 250kVA Perkins Generator)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                        )}/>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="category" render={({ field }) => (
                                <FormItem><FormLabel>Category (IFRS Standard)</FormLabel><Select 
                                    onValueChange={(value) => {
                                        field.onChange(value);
                                        form.setValue('subDivision', '');
                                    }} 
                                    defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {ASSET_GROUPS.map(group => (
                                            <SelectItem key={group.id} value={group.id}>{group.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select><FormMessage/></FormItem>
                            )}/>
                            {category === 'PPE' && (
                                <FormField control={form.control} name="subDivision" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>PPE Sub-Division</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select Sub-Division..."/></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {PPE_SUB_DIVISIONS.map(group => (
                                                    <SelectItem key={group.id} value={group.id}>{group.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage/>
                                    </FormItem>
                                )} />
                            )}
                        </div>
                         <FormField control={form.control} name="tagId" render={({ field }) => (
                            <FormItem><FormLabel>Asset Tag ID</FormLabel><FormControl><Input placeholder="e.g. GH-ACC-001" {...field} /></FormControl><FormMessage/></FormItem>
                        )}/>
                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="purchasePrice" render={({ field }) => (
                                <FormItem><FormLabel>Purchase Price (GHS)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>
                            )}/>
                             <FormField control={form.control} name="purchaseDate" render={({ field }) => (
                                <FormItem><FormLabel>Purchase Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage/></FormItem>
                            )}/>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="usefulLife" render={({ field }) => (
                                <FormItem><FormLabel>Useful Life (Years)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>
                            )}/>
                             <FormField control={form.control} name="salvageValue" render={({ field }) => (
                                <FormItem><FormLabel>Salvage Value (GHS)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>
                            )}/>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>Authorize Capital Expenditure</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function AssetKPI({ label, value, icon, color }: any) {
    const colors: any = {
        blue: "bg-blue-50 border-blue-100 text-blue-700",
        orange: "bg-orange-50 border-orange-100 text-orange-700",
        red: "bg-red-50 border-red-100 text-red-700"
    };
    return (
        <div className={`p-8 rounded-[40px] border-2 ${colors[color]} flex items-center justify-between`}>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
                <p className="text-2xl font-black">{value}</p>
            </div>
            <div className="p-4 bg-white/50 rounded-3xl">{icon}</div>
        </div>
    );
}
