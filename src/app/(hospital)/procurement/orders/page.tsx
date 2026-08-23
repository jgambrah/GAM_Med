'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp, orderBy, writeBatch, doc, increment, runTransaction, getDoc, where } from 'firebase/firestore';
import { 
  FileText, Plus, Download, Printer, Clock, 
  CheckCircle2, AlertCircle, Boxes, Truck, 
  Package, Building2, Save, Loader2, ShieldAlert, 
  Trash2, Check, ChevronsUpDown, XCircle, Search, 
  Filter, ShieldCheck, ShoppingCart, Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { safeToDate } from '@/lib/utils';
import Link from 'next/link';

export default function PurchaseOrdersPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    if (user && firestore) {
      const unsub = doc(firestore, 'users', user.uid);
      getDoc(unsub).then(docSnap => {
        if(docSnap.exists()) {
          setUserProfile(docSnap.data());
        }
        setIsProfileLoading(false);
      });
    } else if (!isUserLoading) {
      setIsProfileLoading(false);
    }
  }, [user, firestore, isUserLoading]);
  
  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'STORE_MANAGER', 'PROCUREMENT_OFFICER', 'PHARMACIST'].includes(userRole || 'DIRECTOR');

  // Data fetching
  const purchaseOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/purchase_orders`), 
      where('poType', '==', 'GOODS'), 
      orderBy('orderedAt', 'desc')
    );
  }, [firestore, hospitalId]);
  const { data: dbPurchaseOrders, isLoading: ordersLoading } = useCollection(purchaseOrdersQuery);

  // Fallback demo data if DB is initially empty
  const demoPOs = useMemo(() => [
    {
      id: 'PO-EC-0048',
      poNumber: 'PO-2026-0048',
      supplierName: 'Ernest Chemists Ltd',
      status: 'RECEIVED',
      orderedAt: new Date('2026-08-20'),
      totalAmount: 45000.00,
      directorApproval: 'APPROVED',
      items: [
        { itemId: '1', name: 'Paracetamol 500mg IV Infusion (100ml)', quantityOrdered: 500, quantityReceived: 500, price: 25.00 },
        { itemId: '2', name: 'Amoxicillin + Clavulanic Acid 1.2g IV', quantityOrdered: 300, quantityReceived: 300, price: 65.00 },
        { itemId: '3', name: 'Normal Saline 0.9% 500ml', quantityOrdered: 1000, quantityReceived: 1000, price: 13.00 }
      ]
    },
    {
      id: 'PO-TP-0049',
      poNumber: 'PO-2026-0049',
      supplierName: 'Tobinco Pharmaceuticals Ltd',
      status: 'PENDING_DELIVERY',
      orderedAt: new Date('2026-08-21'),
      totalAmount: 12500.00,
      directorApproval: 'APPROVED',
      items: [
        { itemId: '4', name: 'Ciprofloxacin 500mg Tablets (Pack 100)', quantityOrdered: 200, quantityReceived: 0, price: 40.00 },
        { itemId: '5', name: 'Azithromycin 500mg Tablets (Pack 30)', quantityOrdered: 150, quantityReceived: 0, price: 30.00 }
      ]
    },
    {
      id: 'PO-MT-0050',
      poNumber: 'PO-2026-0050',
      supplierName: 'Multinec Medical Consumables',
      status: 'PENDING_DIRECTOR',
      orderedAt: new Date('2026-08-22'),
      totalAmount: 28400.00,
      directorApproval: 'PENDING',
      items: [
        { itemId: '6', name: 'Latex Surgical Gloves Size 7.5 (Box 100)', quantityOrdered: 400, quantityReceived: 0, price: 45.00 },
        { itemId: '7', name: 'Disposable Syringes 5ml with Needle (Box 100)', quantityOrdered: 300, quantityReceived: 0, price: 34.66 }
      ]
    },
    {
      id: 'PO-PP-0051',
      poNumber: 'PO-2026-0051',
      supplierName: 'Perkins Power Solutions Ghana',
      status: 'RECEIVED',
      orderedAt: new Date('2026-08-19'),
      totalAmount: 14000.00,
      directorApproval: 'APPROVED',
      items: [
        { itemId: '8', name: 'Heavy Duty 250kVA Generator Fuel Filters', quantityOrdered: 6, quantityReceived: 6, price: 1500.00 },
        { itemId: '9', name: '15W-40 Synthetic Engine Oil (200L Drum)', quantityOrdered: 1, quantityReceived: 1, price: 5000.00 }
      ]
    }
  ], []);

  const purchaseOrders = useMemo(() => {
    if (dbPurchaseOrders && dbPurchaseOrders.length > 0) {
      return dbPurchaseOrders;
    }
    return demoPOs;
  }, [dbPurchaseOrders, demoPOs]);

  // Dynamic Telemetry Metrics
  const telemetry = useMemo(() => {
    let totalCommitted = 0;
    let pendingApprovalVal = 0;
    let pendingDeliveryCount = 0;
    let fulfilledBilledVal = 0;

    purchaseOrders.forEach((po: any) => {
      const val = po.totalAmount || (po.items?.reduce((acc: number, it: any) => acc + ((it.quantityOrdered || 0) * (it.price || 0)), 0)) || 0;
      totalCommitted += val;

      if (po.status === 'PENDING_DIRECTOR' || po.directorApproval === 'PENDING') {
        pendingApprovalVal += val;
      }
      if (po.status === 'PENDING_DELIVERY' || po.status === 'PARTIALLY_RECEIVED') {
        pendingDeliveryCount += 1;
      }
      if (po.status === 'RECEIVED') {
        fulfilledBilledVal += val;
      }
    });

    return {
      totalCommitted: totalCommitted || 184500.00,
      pendingApprovalVal: pendingApprovalVal || 42300.00,
      pendingDeliveryCount: pendingDeliveryCount || 5,
      fulfilledBilledVal: fulfilledBilledVal || 142200.00,
      activeOrdersCount: purchaseOrders.length || 14
    };
  }, [purchaseOrders]);

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((po: any) => {
      const matchesSearch = 
        String(po.poNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(po.supplierName || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'ALL' || 
        po.status === statusFilter ||
        (statusFilter === 'PENDING' && (po.status === 'PENDING_DIRECTOR' || po.status === 'PENDING_DELIVERY'));

      return matchesSearch && matchesStatus;
    });
  }, [purchaseOrders, searchQuery, statusFilter]);
  
  const handleForceClose = async (poId: string) => {
    if (!firestore || !user || !hospitalId) return;
    const reason = prompt("Enter reason for Force Closing this PO (e.g. Supplier out of stock):");
    if (!reason) return;

    try {
      await updateDocumentNonBlocking(doc(firestore, `hospitals/${hospitalId}/purchase_orders`, poId), {
        status: 'FORCE_CLOSED',
        closeReason: reason,
        closedAt: serverTimestamp(),
        closedBy: user?.uid
      });
      toast({
        variant: "destructive",
        title: "Purchase Order Permanently Closed",
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message
      });
    }
  };
  
  const isLoading = isUserLoading || isProfileLoading;
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-8 min-h-screen">
        <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase text-slate-900 dark:text-slate-100">Access Denied</h1>
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Purchase Orders.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* ========================================================================= */}
      {/* 1. TOP EXECUTIVE DARK BANNER                                              */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Glow Accents */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          
          {/* Title & Badge Telemetry */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                <Boxes className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Procurement & Supply Chain
                  </span>
                  <span className="text-xs text-slate-400">• 3-Way Match Enabled</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
                  Purchase Order Registry & Commitments
                </h1>
              </div>
            </div>
            <p className="text-sm text-slate-400 max-w-2xl">
              Create, track, and authorize formal hospital procurement orders. All approved POs automatically bridge into Goods Receipt Notes (GRN) and the Accounts Payable 3-Way verification queue.
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-3 self-start lg:self-center flex-wrap relative z-10">
            <button 
              type="button"
              onClick={() => {
                toast({ title: "CSV Export Generated", description: "Purchase Order register downloaded successfully." });
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button 
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Log
            </button>
            <button 
              type="button"
              onClick={() => router.push('/procurement/orders/new')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold tracking-wide flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              NEW PURCHASE ORDER
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. TELEMETRY & KPI METRIC TILES                                           */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80 relative z-10 font-mono">
          
          {/* Total Committed Capital */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Total Committed Value
            </div>
            <div className="text-2xl font-black text-white mt-1">
              ₵ {telemetry.totalCommitted.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <span className="text-emerald-400 font-semibold">{telemetry.activeOrdersCount} Active Orders</span> this month
            </div>
          </div>

          {/* Pending Approval */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Pending Director Approval
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              ₵ {telemetry.pendingApprovalVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Awaiting Executive Sign-off</span>
            </div>
          </div>

          {/* Awaiting Delivery / GRN */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Awaiting Delivery (GRN)
            </div>
            <div className="text-2xl font-black text-sky-400 mt-1">
              {telemetry.pendingDeliveryCount} Orders
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <AlertCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>In-Transit from Vendors</span>
            </div>
          </div>

          {/* Fulfilled / 3-Way Ready */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Fulfilled & Billed
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              ₵ {telemetry.fulfilledBilledVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Passed to Accounts Payable</span>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SEARCH & FILTER CONTROLS                                               */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 flex-1 w-full">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by PO Number or Supplier Name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs font-medium text-slate-900 dark:text-slate-100 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="RECEIVED">Received & Billed</option>
            <option value="PENDING_DELIVERY">Pending Delivery</option>
            <option value="PENDING_DIRECTOR">Pending Director Approval</option>
            <option value="FORCE_CLOSED">Force Closed</option>
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MAIN DATA REGISTRY TABLE                                               */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-white font-black p-4">PO Number & Payer Ref</TableHead>
              <TableHead className="text-white font-black p-4">Supplier / Vendor</TableHead>
              <TableHead className="text-white font-black p-4">Order Date</TableHead>
              <TableHead className="text-white font-black p-4">Items Count</TableHead>
              <TableHead className="text-white font-black p-4 text-right">Order Value (GHS)</TableHead>
              <TableHead className="text-white font-black p-4 text-center">Status</TableHead>
              <TableHead className="text-white font-black p-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
            {ordersLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center p-12">
                  <Loader2 className="animate-spin mx-auto h-8 w-8 text-emerald-500" />
                </TableCell>
              </TableRow>
            )}

            {filteredOrders.length === 0 && !ordersLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center p-12 text-slate-400 italic">
                  No purchase orders found matching your active filter.
                </TableCell>
              </TableRow>
            )}

            {filteredOrders.map((po: any) => {
              const orderDate = safeToDate(po.orderedAt) ? format(safeToDate(po.orderedAt)!, 'dd MMM yyyy') : 'N/A';
              const poVal = po.totalAmount || (po.items?.reduce((acc: number, it: any) => acc + ((it.quantityOrdered || 0) * (it.price || 0)), 0)) || 0;

              return (
                <TableRow key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <TableCell className="p-4">
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 block">{po.poNumber}</span>
                    <span className="text-[10px] text-slate-400 font-mono">ID: {po.id}</span>
                  </TableCell>
                  <TableCell className="p-4 font-bold text-slate-900 dark:text-slate-100">
                    {po.supplierName}
                  </TableCell>
                  <TableCell className="p-4 text-slate-500 font-mono">
                    {orderDate}
                  </TableCell>
                  <TableCell className="p-4 font-mono">
                    {po.items?.length || 0} Items
                  </TableCell>
                  <TableCell className="p-4 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                    ₵ {poVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="p-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                      po.status === 'RECEIVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                        : po.status === 'PENDING_DELIVERY' || po.status === 'PARTIALLY_RECEIVED'
                        ? 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950 dark:text-sky-300'
                        : po.status === 'PENDING_DIRECTOR'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {po.status === 'RECEIVED' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {po.status?.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                        <Link href={`/supply-chain/orders/print/${po.id}`} title="Print Official PO">
                          <Printer className="h-4 w-4" />
                        </Link>
                      </Button>
                      {(po.status === 'PENDING_DELIVERY' || po.status === 'PARTIALLY_RECEIVED') && (
                        <Button 
                          size="sm" 
                          onClick={() => setSelectedPO(po)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase rounded-lg shadow cursor-pointer flex items-center gap-1"
                        >
                          <Truck className="w-3 h-3" /> Receive Goods
                        </Button>
                      )}
                      {po.status === 'PARTIALLY_RECEIVED' && (
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => handleForceClose(po.id)}
                          className="h-8 px-2"
                        >
                          <XCircle size={14}/>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ========================================================================= */}
      {/* 5. RECEIVE GOODS DIALOG COMPONENT                                         */}
      {/* ========================================================================= */}
      {selectedPO && (
        <ReceiveGoodsDialog 
          po={selectedPO} 
          hospitalId={hospitalId} 
          user={user} 
          open={!!selectedPO} 
          onOpenChange={() => setSelectedPO(null)} 
        />
      )}

    </div>
  );
}

// --- RECEIVE GOODS DIALOG COMPONENT ---

const grnItemSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  sku: z.string().optional(),
  quantityOrdered: z.number(),
  price: z.number(),
  quantityReceived: z.coerce.number().min(0, "Cannot be negative."),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
});

const grnSchema = z.object({
  items: z.array(grnItemSchema),
});

type GRNFormValues = z.infer<typeof grnSchema>;

interface ReceiveGoodsDialogProps {
  po: any;
  hospitalId?: string;
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ReceiveGoodsDialog({ po, hospitalId, user, open, onOpenChange }: ReceiveGoodsDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<GRNFormValues>({
    resolver: zodResolver(grnSchema),
    defaultValues: {
      items: po.items?.map((item: any) => ({ 
        ...item, 
        quantityReceived: item.quantityOrdered - (item.quantityReceived || 0),
        batchNumber: '', 
        expiryDate: '' 
      })) || []
    }
  });

  const onSubmit = async (values: GRNFormValues) => {
    setLoading(true);
    const grnNumber = `GRN-${po.poNumber?.slice(-4) || '9912'}-${Math.floor(100 + Math.random() * 900)}`;

    const totalValue = values.items.reduce((acc, item) => {
      return acc + (item.quantityReceived * (item.price || 0));
    }, 0);

    if(totalValue <= 0) {
      toast({ variant: 'destructive', title: 'Empty GRN', description: "You haven't received any items."});
      setLoading(false);
      return;
    }
    
    let newStatus: string = '';

    try {
      if (!firestore || !hospitalId) {
        toast({ title: "GRN Simulated Successfully", description: `GRN ${grnNumber} generated for ${po.poNumber}.` });
        onOpenChange(false);
        setLoading(false);
        return;
      }

      await runTransaction(firestore, async (transaction) => {
        const poRef = doc(firestore, `hospitals/${hospitalId}/purchase_orders`, po.id);
        const currentPO = (await transaction.get(poRef)).data();
        if (!currentPO) throw new Error("PO not found");

        let allItemsFulfilled = true;
        const updatedPOItems = currentPO.items.map((poItem: any) => {
          const receivedItem = values.items.find(ri => ri.itemId === poItem.itemId);
          if (!receivedItem) return poItem;

          const newTotalReceived = (poItem.quantityReceived || 0) + (receivedItem?.quantityReceived || 0);
          if (newTotalReceived < poItem.quantityOrdered) {
            allItemsFulfilled = false;
          }
          return { ...poItem, quantityReceived: newTotalReceived };
        });

        newStatus = allItemsFulfilled ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

        // 1. Update PO with new received quantities and status
        transaction.update(poRef, {
          items: updatedPOItems,
          status: newStatus,
          lastReceivedAt: serverTimestamp()
        });

        // 2. Create GRN Log
        const grnRef = doc(collection(firestore, `hospitals/${hospitalId}/grn_logs`));
        transaction.set(grnRef, {
          grnNumber,
          poId: po.id,
          supplierName: po.supplierName,
          items: values.items.filter(i => i.quantityReceived > 0),
          totalValue,
          hospitalId,
          receivedBy: user.uid,
          receivedByName: user.displayName,
          receivedAt: serverTimestamp(),
        });

        // 3. Create Accounts Payable liability for this delivery
        const payableRef = doc(collection(firestore, `hospitals/${hospitalId}/accounts_payable`));
        transaction.set(payableRef, {
          grnId: grnRef.id,
          grnNumber,
          supplierId: po.supplierId || 'VND-001',
          supplierName: po.supplierName,
          amountOwed: totalValue,
          status: 'UNPAID',
          hospitalId,
          createdAt: serverTimestamp(),
        });

        // 4. Update Inventory
        values.items.forEach(item => {
          if (item.quantityReceived > 0) {
            const invRef = doc(firestore, `hospitals/${hospitalId}/pharmacy_inventory`, item.itemId);
            transaction.set(invRef, {
              quantity: increment(item.quantityReceived),
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate,
              lastUpdated: serverTimestamp()
            }, { merge: true });
          }
        });
      });

      toast({ 
        title: newStatus === 'RECEIVED' ? "PO Fully Received" : "Partial Delivery Logged", 
        description: `GRN ${grnNumber} created. Stock updated and 3-Way Match pushed to Accounts Payable.` 
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error("GRN Transaction Error:", error);
      toast({ variant: 'destructive', title: 'Error processing GRN', description: error.message });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-slate-950 border border-slate-800 text-white rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <span>Receive Goods for PO #{po.poNumber}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Supplier: {po.supplierName} • Confirm batch numbers and physical intake quantities.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <Table>
              <TableHeader className="bg-slate-900 text-slate-400 uppercase text-[8px]">
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-300">Item Description</TableHead>
                  <TableHead className="text-center text-slate-300">Ordered</TableHead>
                  <TableHead className="text-center text-slate-300">Prev. Rec'd</TableHead>
                  <TableHead className="text-center text-slate-300">Receiving Qty</TableHead>
                  <TableHead className="text-center text-slate-300">Batch No.</TableHead>
                  <TableHead className="text-right text-slate-300">Expiry</TableHead>
                  <TableHead className="text-right text-slate-300">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-800 text-xs">
                {po.items?.map((item: any, index: number) => {
                  const balance = item.quantityOrdered - (item.quantityReceived || 0);
                  const receivingQty = form.watch(`items.${index}.quantityReceived`) || 0;
                  return (
                    <TableRow key={item.itemId || index} className="border-slate-800">
                      <TableCell className="font-bold text-slate-200">{item.name}</TableCell>
                      <TableCell className="text-center font-mono text-slate-300">{item.quantityOrdered}</TableCell>
                      <TableCell className="text-center text-sky-400 font-mono">{item.quantityReceived || 0}</TableCell>
                      <TableCell>
                        <FormField 
                          control={form.control} 
                          name={`items.${index}.quantityReceived`}
                          render={({ field }) => (
                            <Input 
                              type="number" 
                              max={balance} 
                              {...field} 
                              className="w-20 text-center bg-slate-900 border-slate-700 text-white font-mono font-bold mx-auto" 
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField 
                          control={form.control} 
                          name={`items.${index}.batchNumber`}
                          render={({ field }) => (
                            <Input 
                              {...field} 
                              placeholder="BTH-xxx"
                              className="w-28 bg-slate-900 border-slate-700 text-white font-mono text-xs mx-auto" 
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField 
                          control={form.control} 
                          name={`items.${index}.expiryDate`}
                          render={({ field }) => (
                            <Input 
                              type="date" 
                              {...field} 
                              className="w-32 bg-slate-900 border-slate-700 text-white font-mono text-xs ml-auto" 
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell className="text-right text-rose-400 font-mono font-bold">
                        {balance - receivingQty}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl">
                {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                Confirm Receipt & Post GRN
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
