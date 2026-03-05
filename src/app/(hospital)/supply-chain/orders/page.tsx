'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp, orderBy, writeBatch, doc, increment, runTransaction } from 'firebase/firestore';
import { Truck, Plus, Package, Building2, Save, Loader2, ShieldAlert, Trash2, Check, ChevronsUpDown, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import ProductSearchDropdown from '@/components/inventory/ProductSearchDropdown';

const poSchema = z.object({
  supplierId: z.string().min(1, "Please select a supplier."),
});
type POFormValues = z.infer<typeof poSchema>;

type POItem = {
    itemId: string;
    name: string;
    sku: string;
    quantityOrdered: number;
    price: number;
}

export default function PurchaseOrderPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [items, setItems] = useState<POItem[]>([]);
  
  const [selectedPO, setSelectedPO] = useState<any | null>(null);

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
  
  useEffect(() => {
    const sku = searchParams.get('prefill_sku');
    const name = searchParams.get('prefill_name');
    const itemId = searchParams.get('prefill_itemId');
    const qty = searchParams.get('suggested_qty');
    const price = searchParams.get('prefill_price');

    if (sku && name && itemId) {
      const newItem: POItem = {
        itemId: itemId,
        name: decodeURIComponent(name),
        sku: sku,
        quantityOrdered: Number(qty) || 1,
        price: Number(price) || 0,
      };

      if (!items.some(i => i.itemId === itemId)) {
          setItems([newItem]);
      }
      setIsCreateOrderOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const hospitalId = claims?.hospitalId;
  const userRole = claims?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'STORE_MANAGER', 'PHARMACIST'].includes(userRole);

  // Data fetching
  const suppliersQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/suppliers`)) : null, [firestore, hospitalId]);
  const { data: suppliers, isLoading: suppliersLoading } = useCollection(suppliersQuery);

  const catalogQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/product_catalog`)) : null, [firestore, hospitalId]);
  const { data: catalog, isLoading: catalogLoading } = useCollection(catalogQuery);

  const purchaseOrdersQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/purchase_orders`), orderBy('orderedAt', 'desc')) : null, [firestore, hospitalId]);
  const { data: purchaseOrders, isLoading: ordersLoading } = useCollection(purchaseOrdersQuery);

  const form = useForm<POFormValues>({
      resolver: zodResolver(poSchema),
  });
  
  const handleForceClose = async (poId: string) => {
    if (!firestore || !user) return;
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

  const addItemToOrder = (product: any) => {
    if (!items.some(i => i.itemId === product.id)) {
        setItems([...items, { 
            itemId: product.id, 
            name: product.name,
            sku: product.sku,
            quantityOrdered: 1, 
            price: product.basePrice 
        }]);
    }
  };
  
  const updateItemQuantity = (itemId: string, quantity: number) => {
    setItems(items.map(item => item.itemId === itemId ? { ...item, quantityOrdered: quantity || 0 } : item));
  };

  const removeItem = (itemId: string) => {
      setItems(items.filter(item => item.itemId !== itemId));
  }

  const handleCreateOrder = (values: POFormValues) => {
    if (items.length === 0) {
        toast({ variant: 'destructive', title: "Cannot create empty order." });
        return;
    }
    if (!hospitalId || !user) return;

    const selectedSupplier = suppliers?.find(s => s.id === values.supplierId);

    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/purchase_orders`), {
      hospitalId,
      supplierId: values.supplierId,
      supplierName: selectedSupplier?.name || 'Unknown Supplier',
      items: items.map(item => ({ ...item, quantityReceived: 0 })), // Initialize qty received
      status: 'PENDING_DELIVERY',
      orderedBy: user.uid,
      orderedAt: serverTimestamp(),
    });

    toast({ title: "Purchase Order Issued", description: `PO sent to ${selectedSupplier?.name}.` });
    form.reset();
    setItems([]);
    setIsCreateOrderOpen(false);
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
          <p className="text-muted-foreground">You are not authorized for this module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <div className="flex justify-between items-end border-b pb-6">
          <div>
            <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Purchase <span className="text-primary">Orders</span></h1>
            <p className="text-muted-foreground font-medium">Issue and track orders to registered suppliers.</p>
          </div>
          <Dialog open={isCreateOrderOpen} onOpenChange={setIsCreateOrderOpen}>
            <DialogTrigger asChild>
              <Button><Plus size={16} /> New Purchase Order</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>New Purchase Order</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateOrder)} className="space-y-4">
                   <FormField
                      control={form.control}
                      name="supplierId"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Supplier</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                      <SelectTrigger disabled={suppliersLoading}>
                                          <SelectValue placeholder={suppliersLoading ? "Loading suppliers..." : "Select from approved vendors"} />
                                      </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                      {suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                  </SelectContent>
                              </Select>
                              <FormMessage />
                          </FormItem>
                      )}
                   />
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                        <Package size={16} /> Search Approved Catalog
                    </h3>
                    <ProductSearchDropdown catalog={catalog || []} onSelect={addItemToOrder} />
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                      {items.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                              <Package size={16} className="text-primary"/>
                              <div className="flex-1">
                                <p className="font-bold text-sm">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.sku}</p>
                              </div>
                              <Input 
                                  type="number" 
                                  value={item.quantityOrdered}
                                  onChange={(e) => updateItemQuantity(item.itemId, parseInt(e.target.value) || 0)}
                                  className="w-20 h-8"
                              />
                               <span className="text-sm font-bold w-20 text-right">₵ {item.price.toFixed(2)}</span>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.itemId)} className="text-destructive h-8 w-8"><Trash2 size={16}/></Button>
                          </div>
                      ))}
                  </div>


                  <DialogFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>Issue Purchase Order</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

         <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>PO Number</TableHead><TableHead>Supplier</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Items</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {ordersLoading && <TableRow><TableCell colSpan={6} className="text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>}
              {purchaseOrders?.map(po => (
                  <TableRow key={po.id}>
                      <TableCell className="font-mono font-bold text-primary">{po.id.slice(-6).toUpperCase()}</TableCell>
                      <TableCell className="font-bold">{po.supplierName}</TableCell>
                      <TableCell>
                          <Badge variant={po.status === 'RECEIVED' ? 'default' : po.status === 'FORCE_CLOSED' ? 'destructive' : 'secondary'}>{po.status}</Badge>
                      </TableCell>
                      <TableCell>{po.orderedAt ? format(po.orderedAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                      <TableCell>{po.items.length}</TableCell>
                      <TableCell className="text-right">
                          {(po.status === 'PENDING_DELIVERY' || po.status === 'PARTIALLY_RECEIVED') && (
                              <Button size="sm" onClick={() => setSelectedPO(po)}>Receive Goods</Button>
                          )}
                          {po.status === 'PARTIALLY_RECEIVED' && (
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleForceClose(po.id)}><XCircle size={16}/> Force Close</Button>
                          )}
                      </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
         </div>
      </div>
      {selectedPO && <ReceiveGoodsDialog po={selectedPO} hospitalId={hospitalId} user={user} open={!!selectedPO} onOpenChange={() => setSelectedPO(null)} catalog={catalog || []} />}
    </>
  );
}


// --- RECEIVE GOODS DIALOG COMPONENT ---

const grnItemSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  sku: z.string().optional(),
  quantityOrdered: z.number(),
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
    hospitalId: string;
    user: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    catalog: any[];
}

function ReceiveGoodsDialog({ po, hospitalId, user, open, onOpenChange, catalog }: ReceiveGoodsDialogProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const form = useForm<GRNFormValues>({
        resolver: zodResolver(grnSchema),
        defaultValues: {
            items: po.items.map((item: any) => ({ 
                ...item, 
                quantityReceived: 0, // Default to receiving 0
                batchNumber: '', 
                expiryDate: '' 
            }))
        }
    });

    const onSubmit = async (values: GRNFormValues) => {
        setLoading(true);
        const grnNumber = `GRN-${po.id.slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;

        const totalValue = values.items.reduce((acc, item) => {
            const poItem = po.items.find((i:any) => i.itemId === item.itemId);
            return acc + (item.quantityReceived * (poItem?.price || 0));
        }, 0);

        if(totalValue <= 0) {
            toast({ variant: 'destructive', title: 'Empty GRN', description: "You haven't received any items."});
            setLoading(false);
            return;
        }
        
        try {
            if (!firestore) throw new Error("Firestore not available");

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

                const newStatus = allItemsFulfilled ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

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
                    itemsReceived: values.items.filter(i => i.quantityReceived > 0),
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
                    supplierId: po.supplierId,
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

            toast({ title: newStatus === 'RECEIVED' ? "PO Fully Received" : "Partial Delivery Logged. PO remains Open.", description: `GRN ${grnNumber} created. Inventory updated.` });
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
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Receive Goods for PO #{po.id.slice(-6).toUpperCase()}</DialogTitle>
                    <DialogDescription>Supplier: {po.supplierName}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-center">Ordered</TableHead>
                                    <TableHead className="text-center">Prev. Rec'd</TableHead>
                                    <TableHead className="text-center">Receiving</TableHead>
                                    <TableHead className="text-center">Batch No.</TableHead>
                                    <TableHead className="text-right">Expiry</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {po.items.map((item: any, index: number) => {
                                    const balance = item.quantityOrdered - (item.quantityReceived || 0);
                                    const receivingQty = form.watch(`items.${index}.quantityReceived`) || 0;
                                    return (
                                    <TableRow key={item.itemId}>
                                        <TableCell className="font-bold">{item.name}</TableCell>
                                        <TableCell className="text-center">{item.quantityOrdered}</TableCell>
                                        <TableCell className="text-center text-blue-600">{item.quantityReceived || 0}</TableCell>
                                        <TableCell>
                                            <FormField control={form.control} name={`items.${index}.quantityReceived`}
                                                render={({ field }) => ( <Input type="number" max={balance} {...field} className="w-20 text-center" /> )}
                                            />
                                        </TableCell>
                                         <TableCell>
                                            <FormField control={form.control} name={`items.${index}.batchNumber`}
                                                render={({ field }) => ( <Input {...field} className="w-24"/> )}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <FormField control={form.control} name={`items.${index}.expiryDate`}
                                                render={({ field }) => ( <Input type="date" {...field} className="w-32"/> )}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right text-red-600 font-bold">{balance - receivingQty}</TableCell>
                                    </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="animate-spin" />}
                                Confirm Receipt
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
