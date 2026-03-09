
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp, orderBy, writeBatch, doc, increment, runTransaction, getDoc, where } from 'firebase/firestore';
import { Truck, Plus, Package, Building2, Save, Loader2, ShieldAlert, Trash2, Check, ChevronsUpDown, XCircle, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
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
import Link from 'next/link';


export default function PurchaseOrderPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);

  useEffect(() => {
    if (user && firestore) {
      const unsub = doc(firestore, 'users', user.uid);
      getDoc(unsub).then(docSnap => {
        if(docSnap.exists()) {
          setUserProfile(docSnap.data());
        }
        setIsProfileLoading(false);
      })
    } else if (!isUserLoading) {
      setIsProfileLoading(false);
    }
  }, [user, firestore, isUserLoading]);
  
  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'STORE_MANAGER', 'PHARMACIST'].includes(userRole);

  // Data fetching
  const purchaseOrdersQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/purchase_orders`), where('poType', '==', 'GOODS'), orderBy('orderedAt', 'desc')) : null, [firestore, hospitalId]);
  const { data: purchaseOrders, isLoading: ordersLoading } = useCollection(purchaseOrdersQuery);
  
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
  
  const isLoading = isUserLoading || isProfileLoading;
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
          <Button asChild>
            <Link href="/supply-chain/orders/new"><Plus size={16} /> New Purchase Order</Link>
          </Button>
        </div>

         <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>PO Number</TableHead><TableHead>Supplier</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Items</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {ordersLoading && <TableRow><TableCell colSpan={6} className="text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>}
              {purchaseOrders?.map(po => (
                  <TableRow key={po.id}>
                      <TableCell className="font-mono font-bold text-primary">{po.poNumber}</TableCell>
                      <TableCell className="font-bold">{po.supplierName}</TableCell>
                      <TableCell>
                          <Badge variant={po.status === 'RECEIVED' ? 'default' : po.status === 'FORCE_CLOSED' ? 'destructive' : 'secondary'}>{po.status}</Badge>
                      </TableCell>
                      <TableCell>{po.orderedAt ? format(po.orderedAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                      <TableCell>{po.items.length}</TableCell>
                      <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                              <Button asChild size="sm" variant="ghost">
                                  <Link href={`/supply-chain/orders/print/${po.id}`} title="Print PO">
                                      <Printer className="h-4 w-4" />
                                  </Link>
                              </Button>
                              {(po.status === 'PENDING_DELIVERY' || po.status === 'PARTIALLY_RECEIVED') && (
                                  <Button size="sm" onClick={() => setSelectedPO(po)}>Receive Goods</Button>
                              )}
                              {po.status === 'PARTIALLY_RECEIVED' && (
                                  <Button size="sm" variant="destructive" onClick={() => handleForceClose(po.id)}>
                                      <XCircle size={16}/>
                                  </Button>
                              )}
                          </div>
                      </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
         </div>
      </div>
      {selectedPO && <ReceiveGoodsDialog po={selectedPO} hospitalId={hospitalId} user={user} open={!!selectedPO} onOpenChange={() => setSelectedPO(null)} />}
    </>
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
    hospitalId: string;
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
        const grnNumber = `GRN-${po.poNumber.slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;

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
                    <DialogTitle>Receive Goods for PO #{po.poNumber}</DialogTitle>
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

