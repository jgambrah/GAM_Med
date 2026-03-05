'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, serverTimestamp, doc } from 'firebase/firestore';
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

const assetSchema = z.object({
  name: z.string().min(1, "Asset Name is required."),
  category: z.string().min(1, "Category is required."),
  tagId: z.string().min(1, "Asset Tag ID is required."),
  purchaseDate: z.string().min(1, "Purchase Date is required."),
  purchasePrice: z.coerce.number().min(0, "Purchase Price must be a positive number."),
  usefulLife: z.coerce.number().min(1, "Useful Life must be at least 1 year."),
  salvageValue: z.coerce.number().min(0, "Salvage Value cannot be negative."),
  status: z.string().min(1, "Status is required."),
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
        <AddAssetDialog hospitalId={hospitalId} isOpen={isAddAssetOpen} setIsOpen={setIsAddAssetOpen} />
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
              <TableHead>Category</TableHead>
              <TableHead>Cost Price (GHS)</TableHead>
              <TableHead>Net Book Value (GHS)</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areAssetsLoading ? <TableRow><TableCell colSpan={5} className="text-center p-12"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow> :
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

const AddAssetDialog = ({ hospitalId, isOpen, setIsOpen }: { hospitalId: string, isOpen: boolean, setIsOpen: (open: boolean) => void }) => {
    const { toast } = useToast();
    const firestore = useFirestore();

    const form = useForm<AssetFormValues>({
        resolver: zodResolver(assetSchema),
        defaultValues: {
            name: '',
            category: 'MEDICAL_EQUIPMENT',
            tagId: '',
            purchaseDate: '',
            purchasePrice: 0,
            usefulLife: 5,
            salvageValue: 0,
            status: 'OPERATIONAL'
        }
    });

    const onSubmit = (values: AssetFormValues) => {
        if (!firestore) return;
        addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/assets`), {
            ...values,
            hospitalId,
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
                                <FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="MEDICAL_EQUIPMENT">Medical Equipment</SelectItem>
                                        <SelectItem value="VEHICLE">Hospital Vehicle</SelectItem>
                                        <SelectItem value="INFRASTRUCTURE">Infrastructure/Power</SelectItem>
                                        <SelectItem value="IT">IT/Computers</SelectItem>
                                    </SelectContent>
                                </Select><FormMessage/></FormItem>
                            )}/>
                            <FormField control={form.control} name="tagId" render={({ field }) => (
                                <FormItem><FormLabel>Asset Tag ID</FormLabel><FormControl><Input placeholder="e.g. GH-ACC-001" {...field} /></FormControl><FormMessage/></FormItem>
                            )}/>
                        </div>
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
