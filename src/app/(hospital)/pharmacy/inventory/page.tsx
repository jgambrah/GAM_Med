'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp, doc } from 'firebase/firestore';
import { Pill, Plus, AlertCircle, Package, Loader2, ShieldAlert, Edit3, Edit2, Trash2, Search, FileText, AlertTriangle, Clock, Download, Printer, Filter, CheckCircle, XCircle } from 'lucide-react';
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
import { PharmacyDrugLedgerDrawerDialog } from '@/components/pharmacy/PharmacyDrugLedgerDrawerDialog';

const stockFormSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  genericName: z.string().min(1, "Generic name is required"),
  strength: z.string().optional(),
  form: z.string().min(1, "Drug form is required"),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
});

type StockFormValues = z.infer<typeof stockFormSchema>;

export default function PharmacyInventoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isEditStockOpen, setIsEditStockOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedLedgerItem, setSelectedLedgerItem] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChip, setFilterChip] = useState<'all' | 'low' | 'expiry' | 'narcotics'>('all');

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

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile } = useDoc(userProfileRef);

  const hospitalId = claims?.hospitalId || userProfile?.hospitalId;
  const userRole = claims?.role || userProfile?.role;
  const isAuthorized = userRole === 'DIRECTOR' || userRole === 'PHARMACIST' || userRole === 'ADMIN';
  const isManager = userRole === 'DIRECTOR' || userRole === 'ADMIN';

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "hospitals", hospitalId, "pharmacy_inventory"));
  }, [firestore, hospitalId]);

  const { data: inventory, isLoading: isInventoryLoading } = useCollection(inventoryQuery);

  const filteredInventory = useMemo(() => {
    if (!inventory) return [];

    const map = new Map<string, any>();

    // 1. DEDUPLICATE & CONSOLIDATE INVENTORY RECORDS BY DRUG KEY
    inventory.forEach((item: any) => {
      const rawName = item.name || item.drugName || item.itemName || item.title || '';
      if (!rawName.trim()) return; // Filter out blank ghost documents

      const key = rawName.toLowerCase().trim();

      if (!map.has(key)) {
        map.set(key, { ...item });
      } else {
        const existing = map.get(key);
        // Merge metadata: prioritize non-empty fields
        existing.name = existing.name || item.name || item.drugName;
        existing.genericName = (existing.genericName && existing.genericName !== '') ? existing.genericName : (item.genericName || item.generic);
        existing.strength = (existing.strength && existing.strength !== '') ? existing.strength : (item.strength || item.dosage);
        existing.form = (existing.form && existing.form !== '') ? existing.form : item.form;
        existing.batchNumber = (existing.batchNumber && existing.batchNumber !== 'N/A') ? existing.batchNumber : (item.batchNumber || item.batchNo || 'N/A');
        existing.expiryDate = (existing.expiryDate && existing.expiryDate !== 'N/A') ? existing.expiryDate : (item.expiryDate || item.expirationDate || 'N/A');
        existing.price = existing.price || item.price || item.unitPrice || 25.0;

        // Consolidate quantity: pick highest active stock
        const qty1 = typeof existing.quantity === 'number' ? existing.quantity : (typeof existing.quantityInStock === 'number' ? existing.quantityInStock : 0);
        const qty2 = typeof item.quantity === 'number' ? item.quantity : (typeof item.quantityInStock === 'number' ? item.quantityInStock : 0);
        const consolidatedQty = Math.max(qty1, qty2);
        existing.quantity = consolidatedQty > 0 ? consolidatedQty : 100;
        existing.quantityInStock = existing.quantity;
      }
    });

    let list = Array.from(map.values());

    // 2. QUICK FILTER CHIPS
    if (filterChip === 'low') {
      list = list.filter((item: any) => {
        const qty = typeof item.quantity === 'number' ? item.quantity : (typeof item.quantityInStock === 'number' ? item.quantityInStock : 0);
        return qty <= 100;
      });
    } else if (filterChip === 'expiry') {
      list = list.filter((item: any) => {
        const displayExpiry = item.expiryDate || item.expirationDate || item.expiry || '';
        if (!displayExpiry || displayExpiry === 'N/A') return false;
        const expDate = new Date(displayExpiry);
        if (isNaN(expDate.getTime())) return false;
        const now = new Date();
        const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        return diffDays <= 90;
      });
    } else if (filterChip === 'narcotics') {
      list = list.filter((item: any) => {
        const nameStr = (item.name || item.drugName || '').toLowerCase();
        return (
          item.isControlled ||
          item.isNarcotic ||
          nameStr.includes('morphine') ||
          nameStr.includes('pethidine') ||
          nameStr.includes('fentanyl') ||
          nameStr.includes('expertsed') ||
          nameStr.includes('tramadol') ||
          nameStr.includes('diazepam')
        );
      });
    }

    const queryStr = searchQuery.toLowerCase().trim();
    if (!queryStr) return list;

    return list.filter((item: any) => {
      const nameStr = item.name || item.drugName || item.itemName || item.title || '';
      const genStr = item.genericName || item.generic || '';
      const batchStr = item.batchNumber || item.batchNo || item.batch || '';
      return (
        nameStr.toLowerCase().includes(queryStr) ||
        genStr.toLowerCase().includes(queryStr) ||
        batchStr.toLowerCase().includes(queryStr)
      );
    });
  }, [inventory, searchQuery, filterChip]);

  const form = useForm<StockFormValues>({
    resolver: zodResolver(stockFormSchema),
    defaultValues: {
      form: 'Tablet',
      quantity: 0,
      price: 0
    },
  });

  const editForm = useForm<StockFormValues>({
    resolver: zodResolver(stockFormSchema),
  });

  const handleAddStock = (values: StockFormValues) => {
    if (!firestore || !hospitalId) return;
    if (!isManager) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You do not have permission to manually add inventory.',
      });
      return;
    }

    // Deterministic Single Source of Truth Document ID (e.g. DRUG-vita-c)
    const docId = `DRUG-${values.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')}`;
    const itemRef = doc(firestore, `hospitals/${hospitalId}/pharmacy_inventory`, docId);

    const stockData = {
      ...values,
      id: docId,
      drugName: values.name,
      itemName: values.name,
      name: values.name,
      genericName: values.genericName,
      generic: values.genericName,
      strength: values.strength || '',
      dosage: values.strength || '',
      quantity: values.quantity,
      quantityInStock: values.quantity,
      price: values.price,
      unitPrice: values.price,
      batchNumber: values.batchNumber || 'N/A',
      batchNo: values.batchNumber || 'N/A',
      expiryDate: values.expiryDate || 'N/A',
      expirationDate: values.expiryDate || 'N/A',
      hospitalId,
      lastUpdated: serverTimestamp(),
    };
    
    updateDocumentNonBlocking(itemRef, stockData);

    toast({
      title: 'Single-Source Stock Consolidated',
      description: `${values.name} stock consolidated under document ID ${docId}.`,
    });
    form.reset();
    setIsAddStockOpen(false);
  };

  const openEditDialog = (item: any) => {
    if (!isAuthorized) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You do not have permission to edit inventory items.',
      });
      return;
    }
    setEditingItem(item);
    editForm.reset({
      name: item.name || item.drugName || item.itemName || '',
      genericName: item.genericName || item.generic || '',
      strength: item.strength || item.dosage || '',
      form: item.form || 'Tablet',
      quantity: item.quantity ?? item.quantityInStock ?? 0,
      price: item.price ?? item.unitPrice ?? 0,
      batchNumber: item.batchNumber || item.batchNo || '',
      expiryDate: item.expiryDate || item.expirationDate || '',
    });
    setIsEditStockOpen(true);
  };

  const handleEditStock = (values: StockFormValues) => {
    if (!firestore || !hospitalId || !editingItem) return;
    if (!isAuthorized) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You do not have permission to manually modify inventory.',
      });
      return;
    }

    const docId = editingItem.id || `DRUG-${values.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '-')}`;
    const itemRef = doc(firestore, `hospitals/${hospitalId}/pharmacy_inventory`, docId);
    
    updateDocumentNonBlocking(itemRef, {
      ...values,
      drugName: values.name,
      itemName: values.name,
      generic: values.genericName,
      quantityInStock: values.quantity,
      unitPrice: values.price,
      batchNo: values.batchNumber || 'N/A',
      expirationDate: values.expiryDate || 'N/A',
      lastUpdated: serverTimestamp()
    });
    toast({
      title: 'Stock Updated',
      description: `${values.name} has been updated in inventory.`,
    });
    setIsEditStockOpen(false);
    setEditingItem(null);
  };

  const handleDeleteStock = (id: string, name: string) => {
    if (!firestore || !hospitalId) return;
    if (!isManager) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You do not have permission to delete inventory.',
      });
      return;
    }

    if (confirm(`Are you sure you want to delete ${name} from inventory?`)) {
      const itemRef = doc(firestore, `hospitals/${hospitalId}/pharmacy_inventory`, id);
      deleteDocumentNonBlocking(itemRef);
      toast({
        title: 'Stock Deleted',
        description: `${name} has been removed from inventory.`,
      });
    }
  };

  const getFormulationLabel = (item: any, name: string) => {
    if (item.form) return item.form;
    const n = name.toLowerCase();
    if (n.includes('syrup') || n.includes('suspension') || n.includes('nugel')) return 'Syrup';
    if (n.includes('capsule') || n.includes('amoxicillin')) return 'Capsule';
    if (n.includes('injection') || n.includes('iv') || n.includes('fluid')) return 'IV Injection';
    if (n.includes('ointment') || n.includes('cream')) return 'Ointment';
    return 'Tablet';
  };

  const isNarcoticCheck = (item: any, displayName: string) => {
    const nameLower = displayName.toLowerCase();
    return (
      item.isControlled === true ||
      item.isNarcotic === true ||
      nameLower.includes('morphine') ||
      nameLower.includes('pethidine') ||
      nameLower.includes('fentanyl') ||
      nameLower.includes('expertsed') ||
      nameLower.includes('tramadol') ||
      nameLower.includes('diazepam')
    );
  };

  const handleExportCSV = () => {
    if (filteredInventory.length === 0) {
      toast({ variant: 'destructive', title: 'No Data', description: 'No inventory items to export.' });
      return;
    }

    const headers = ['Brand Name', 'Generic Name', 'Formulation', 'Batch Number', 'Expiry Date', 'Stock Quantity', 'Status', 'Unit Price (GHS)', 'Controlled Narcotic'];
    const rows = filteredInventory.map((item: any) => {
      const name = item.name || item.drugName || 'UNNAMED ITEM';
      const generic = item.genericName || item.generic || 'N/A';
      const form = getFormulationLabel(item, name);
      const batch = item.batchNumber || item.batchNo || 'N/A';
      const expiry = item.expiryDate || item.expirationDate || 'N/A';
      const qty = item.quantity ?? item.quantityInStock ?? 0;
      const status = qty > 100 ? 'Healthy' : (qty > 0 ? 'Low Stock' : 'Stockout');
      const price = (item.price ?? item.unitPrice ?? 0).toFixed(2);
      const controlled = isNarcoticCheck(item, name) ? 'YES (Class II Narcotic)' : 'NO';

      return `"${name}","${generic}","${form}","${batch}","${expiry}",${qty},"${status}",${price},"${controlled}"`;
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pharmacy_inventory_audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: '📥 Inventory Audit Exported',
      description: `Exported ${filteredInventory.length} lines to CSV.`
    });
  };

  const getStockHealth = (level: number) => {
    if (level <= 0) {
      return { label: 'Out of Stock', css: 'bg-red-500/10 text-red-600 border-red-500/20', Icon: XCircle };
    }
    if (level <= 50) {
      return { label: 'Low Stock', css: 'bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse', Icon: AlertTriangle };
    }
    return { label: 'Healthy', css: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', Icon: CheckCircle };
  };

  const getExpiryDisplay = (expiryDate: string) => {
    if (!expiryDate || expiryDate === 'N/A') return <span className="text-slate-400 font-mono">N/A</span>;
    
    const expDate = new Date(expiryDate);
    if (isNaN(expDate.getTime())) return <span className="text-slate-600 font-mono">{expiryDate}</span>;

    const daysUntilExpiry = Math.floor((expDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-600 text-[10px] font-bold border border-red-500/30 font-mono uppercase">EXPIRED</span>;
    }
    if (daysUntilExpiry <= 90) {
      return <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 text-[10px] font-bold border border-amber-500/30 font-mono uppercase">⚠️ IN {daysUntilExpiry}d</span>;
    }
    return <span className="text-slate-600 dark:text-slate-400 font-mono font-bold">{expiryDate}</span>;
  };

  const handlePrintAudit = () => {
    window.print();
  };
  
  const isLoading = isUserLoading || isClaimsLoading;

  if (isLoading) {
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
          <p className="text-muted-foreground">You are not authorized to manage pharmacy inventory.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Pharmacy <span className="text-primary">Inventory Command Center</span></h1>
           <p className="text-muted-foreground font-medium text-xs uppercase">Single Source of Truth drug stock levels, FEFO telemetry & audit trail log.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={handleExportCSV}
            className="bg-card hover:bg-muted font-black text-xs uppercase px-3 py-2 rounded-xl border shadow-sm flex items-center gap-1.5"
          >
            <Download size={14} className="text-primary" /> Export CSV
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handlePrintAudit}
            className="bg-card hover:bg-muted font-black text-xs uppercase px-3 py-2 rounded-xl border shadow-sm flex items-center gap-1.5"
          >
            <Printer size={14} className="text-primary" /> Print Audit Sheet
          </Button>

          {isManager && (
           <Dialog open={isAddStockOpen} onOpenChange={setIsAddStockOpen}>
              <DialogTrigger asChild>
                  <Button className="font-black text-xs uppercase rounded-xl py-2 px-4 flex items-center gap-1.5 shadow-md">
                      <Plus size={14} /> Add New Stock
                  </Button>
              </DialogTrigger>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>New Drug Entry</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleAddStock)} className="space-y-4">
                          <FormField control={form.control} name="name" render={({ field }) => (
                             <FormItem><FormLabel>Brand Name</FormLabel><FormControl><Input placeholder="e.g. Panadol" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="genericName" render={({ field }) => (
                             <FormItem><FormLabel>Generic Name</FormLabel><FormControl><Input placeholder="e.g. Paracetamol" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="strength" render={({ field }) => (
                                <FormItem><FormLabel>Strength</FormLabel><FormControl><Input placeholder="e.g. 500mg" {...field} /></FormControl><FormMessage /></FormItem>
                             )} />
                             <FormField control={form.control} name="form" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Form</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="Tablet">Tablet</SelectItem>
                                    <SelectItem value="Capsule">Capsule</SelectItem>
                                    <SelectItem value="Syrup">Syrup</SelectItem>
                                    <SelectItem value="Injection">Injection</SelectItem>
                                    <SelectItem value="Ointment">Ointment</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                           <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="quantity" render={({ field }) => (
                                <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                             )} />
                             <FormField control={form.control} name="price" render={({ field }) => (
                                <FormItem><FormLabel>Price (GHS)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                             )} />
                          </div>
                           <div className="grid grid-cols-2 gap-4">
                              <FormField control={form.control} name="batchNumber" render={({ field }) => (
                                <FormItem><FormLabel>Batch Number</FormLabel><FormControl><Input placeholder="e.g. AB1234" {...field} /></FormControl><FormMessage /></FormItem>
                             )} />
                             <FormField control={form.control} name="expiryDate" render={({ field }) => (
                                <FormItem><FormLabel>Expiry Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                             )} />
                           </div>

                           <DialogFooter>
                              <Button type="submit" disabled={form.formState.isSubmitting}>Save to Store</Button>
                          </DialogFooter>
                      </form>
                  </Form>
              </DialogContent>
           </Dialog>
          )}
        </div>
      </div>

      {/* SEARCH BAR & ADVANCED FILTER CHIPS TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-md">
        <div className="max-w-md relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input 
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by brand name, generic name, or batch..."
            className="pl-11 bg-slate-950 border-slate-800 rounded-xl font-bold h-10 text-white placeholder:text-slate-500 text-xs"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            type="button"
            onClick={() => setFilterChip('all')}
            className={`h-8 px-3 rounded-lg font-black text-[10px] uppercase transition-all ${
              filterChip === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Show All ({inventory?.length || 0})
          </Button>

          <Button
            type="button"
            onClick={() => setFilterChip('low')}
            className={`h-8 px-3 rounded-lg font-black text-[10px] uppercase transition-all ${
              filterChip === 'low'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            🟡 Low Stock
          </Button>

          <Button
            type="button"
            onClick={() => setFilterChip('expiry')}
            className={`h-8 px-3 rounded-lg font-black text-[10px] uppercase transition-all ${
              filterChip === 'expiry'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            ⏱️ Near Expiry (90d)
          </Button>

          <Button
            type="button"
            onClick={() => setFilterChip('narcotics')}
            className={`h-8 px-3 rounded-lg font-black text-[10px] uppercase transition-all ${
              filterChip === 'narcotics'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            ⚠️ Narcotics & Controlled
          </Button>
        </div>
      </div>

      {/* STOCK TABLE */}
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-900 hover:bg-slate-900 border-b-0 text-white">
              <TableHead className="p-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">DRUG NAME & TYPE</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">BATCH NO.</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">EXPIRY</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">STOCK HEALTH</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-slate-300 uppercase tracking-widest text-right">PRICE (GHS)</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-slate-300 uppercase tracking-widest text-right">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isInventoryLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24">Loading inventory...</TableCell></TableRow>
            ) : filteredInventory.length === 0 ? (
                 <TableRow><TableCell colSpan={6} className="text-center h-48 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 text-slate-400" />
                    No stock items match your search query.
                </TableCell></TableRow>
            ) : (
                filteredInventory.map(item => {
                  const displayName = item.name || item.drugName || item.itemName || item.title || 'UNNAMED DRUG ITEM';
                  const displayGeneric = item.genericName || item.generic || '';
                  const displayStrength = item.strength || item.dosage || item.dose || '';
                  const displayBatch = item.batchNumber || item.batchNo || item.batch || 'N/A';
                  const displayExpiry = item.expiryDate || item.expirationDate || item.expiry || 'N/A';
                  const displayQty = typeof item.quantity === 'number' ? item.quantity : (typeof item.quantityInStock === 'number' ? item.quantityInStock : Number(item.quantity || item.quantityInStock) || 0);
                  const displayPrice = typeof item.price === 'number' ? item.price : (typeof item.unitPrice === 'number' ? item.unitPrice : Number(item.price || item.unitPrice) || 0);

                  const displayForm = getFormulationLabel(item, displayName);
                  const isControlled = isNarcoticCheck(item, displayName);
                  const formIcon = displayForm.includes('Syrup') ? '🧪' : displayForm.includes('Injection') ? '💉' : displayForm.includes('Ointment') ? '🧴' : '💊';

                  const stockStatus = getStockHealth(displayQty);
                  const StatusIcon = stockStatus.Icon;

                  return (
                    <TableRow key={item.id} className="border-b border-gray-100 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                      {/* DRUG NAME & FORMULATION */}
                      <TableCell className="py-4 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 uppercase">
                              <span>{formIcon}</span> {displayName}
                            </p>
                            
                            {isControlled && (
                              <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse shadow-sm">
                                <ShieldAlert size={10} /> ⚠️ Class II Narcotic
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm text-gray-500 font-medium">
                              {displayGeneric ? `${displayGeneric} • ` : ''}{displayStrength || 'Standard Dose'}
                            </span>
                            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">
                              {displayForm}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* BATCH NUMBER */}
                      <TableCell className="py-4 px-4 text-sm text-gray-600 dark:text-gray-300 font-mono font-bold">
                        {displayBatch}
                      </TableCell>

                      {/* EXPIRY WITH WARNINGS */}
                      <TableCell className="py-4 px-4">
                        {getExpiryDisplay(displayExpiry)}
                      </TableCell>

                      {/* DYNAMIC STOCK HEALTH BADGE */}
                      <TableCell className="py-4 px-4">
                        <div className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold ${stockStatus.css}`}>
                          <StatusIcon size={16} />
                          <span>{displayQty} {stockStatus.label}</span>
                        </div>
                      </TableCell>

                      {/* UNIT PRICE */}
                      <TableCell className="py-4 px-4 text-sm font-bold text-gray-900 dark:text-gray-100 text-right font-mono">
                        GHS {displayPrice.toFixed(2)}
                      </TableCell>

                      {/* ACTIONS COLUMN */}
                      <TableCell className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            type="button"
                            onClick={() => openEditDialog(item)}
                            title="Adjust Stock"
                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950 rounded-md transition"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => setSelectedLedgerItem({ ...item, name: displayName, quantity: displayQty, price: displayPrice, batchNumber: displayBatch, expiryDate: displayExpiry })}
                            title="View Ledger"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-md transition"
                          >
                            <FileText size={18} />
                          </button>
                          {isManager && (
                            <button 
                              type="button"
                              onClick={() => handleDeleteStock(item.id, displayName)}
                              title="Delete Item"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
      </div>

      {/* EDIT STOCK DIALOG */}
      <Dialog open={isEditStockOpen} onOpenChange={setIsEditStockOpen}>
         <DialogContent>
             <DialogHeader>
                 <DialogTitle>Edit Drug Entry</DialogTitle>
             </DialogHeader>
             <Form {...editForm}>
                 <form onSubmit={editForm.handleSubmit(handleEditStock)} className="space-y-4">
                     <FormField control={editForm.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Brand Name</FormLabel><FormControl><Input placeholder="e.g. Panadol" {...field} /></FormControl><FormMessage /></FormItem>
                     )} />
                     <FormField control={editForm.control} name="genericName" render={({ field }) => (
                        <FormItem><FormLabel>Generic Name</FormLabel><FormControl><Input placeholder="e.g. Paracetamol" {...field} /></FormControl><FormMessage /></FormItem>
                     )} />
                     <div className="grid grid-cols-2 gap-4">
                        <FormField control={editForm.control} name="strength" render={({ field }) => (
                           <FormItem><FormLabel>Strength</FormLabel><FormControl><Input placeholder="e.g. 500mg" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={editForm.control} name="form" render={({ field }) => (
                         <FormItem>
                           <FormLabel>Form</FormLabel>
                           <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                             <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                             <SelectContent>
                               <SelectItem value="Tablet">Tablet</SelectItem>
                               <SelectItem value="Capsule">Capsule</SelectItem>
                               <SelectItem value="Syrup">Syrup</SelectItem>
                               <SelectItem value="Injection">Injection</SelectItem>
                               <SelectItem value="Ointment">Ointment</SelectItem>
                               <SelectItem value="Other">Other</SelectItem>
                             </SelectContent>
                           </Select>
                           <FormMessage />
                         </FormItem>
                       )} />
                     </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={editForm.control} name="quantity" render={({ field }) => (
                           <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={editForm.control} name="price" render={({ field }) => (
                           <FormItem><FormLabel>Price (GHS)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                     </div>
                      <div className="grid grid-cols-2 gap-4">
                         <FormField control={editForm.control} name="batchNumber" render={({ field }) => (
                           <FormItem><FormLabel>Batch Number</FormLabel><FormControl><Input placeholder="e.g. AB1234" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={editForm.control} name="expiryDate" render={({ field }) => (
                           <FormItem><FormLabel>Expiry Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>

                      <DialogFooter>
                         <Button type="button" variant="outline" onClick={() => setIsEditStockOpen(false)}>Cancel</Button>
                         <Button type="submit" disabled={editForm.formState.isSubmitting}>Update Stock</Button>
                      </DialogFooter>
                 </form>
             </Form>
         </DialogContent>
      </Dialog>

      {/* DRUG LEDGER & AUDIT TRAIL DIALOG */}
      <PharmacyDrugLedgerDrawerDialog
        isOpen={!!selectedLedgerItem}
        onClose={() => setSelectedLedgerItem(null)}
        drugItem={selectedLedgerItem}
      />
    </div>
  );
}
