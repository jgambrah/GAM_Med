
'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, serverTimestamp, doc, runTransaction, increment } from 'firebase/firestore';
import { Truck, Plus, Save, Loader2, ShieldAlert, ArrowLeft, Package, Briefcase, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const poSchema = z.object({
  supplierId: z.string().min(1, "Please select a supplier."),
});
type POFormValues = z.infer<typeof poSchema>;

type NewPOItem = {
    name: string;
    quantityOrdered: number;
    price: number;
}

export default function NewPurchaseOrderPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [poType, setPoType] = useState<'GOODS' | 'SERVICE' | 'WORKS'>('GOODS');
    const [items, setItems] = useState<NewPOItem[]>([{ name: '', quantityOrdered: 1, price: 0 }]);
    const [loading, setLoading] = useState(false);
    
    const userProfileRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
    const hospitalId = userProfile?.hospitalId;

    const suppliersQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/suppliers`)) : null, [firestore, hospitalId]);
    const { data: suppliers, isLoading: suppliersLoading } = useCollection(suppliersQuery);

    const form = useForm<POFormValues>({
        resolver: zodResolver(poSchema),
    });

    const addItem = () => setItems([...items, { name: '', quantityOrdered: 1, price: 0 }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
    const updateItem = (index: number, field: keyof NewPOItem, value: string | number) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        setItems(newItems);
    };
    
    const handleCreateOrder = async (values: POFormValues) => {
        if (items.length === 0 || items.some(i => !i.name || i.price <= 0)) {
            toast({ variant: 'destructive', title: "Please complete all line items." });
            return;
        }
        if (!hospitalId || !user || !firestore) return;
        setLoading(true);

        const selectedSupplier = suppliers?.find(s => s.id === values.supplierId);
        if (!selectedSupplier) {
            toast({ variant: 'destructive', title: 'Supplier not found.' });
            setLoading(false);
            return;
        }

        try {
            await runTransaction(firestore, async (transaction) => {
                const hospitalRef = doc(firestore, "hospitals", hospitalId);
                const hospitalSnap = await transaction.get(hospitalRef);
                if (!hospitalSnap.exists()) throw new Error("Hospital not found.");
                
                const hData = hospitalSnap.data();
                const prefix = hData?.mrnPrefix || 'GAM';
                const currentCount = (hData?.poCounter || 0) + 1;
                const year = new Date().getFullYear().toString().slice(-2);
                const poNumber = `${prefix}/PO/${year}/${currentCount.toString().padStart(4, '0')}`;
                
                const poRef = doc(collection(firestore, `hospitals/${hospitalId}/purchase_orders`));
                
                transaction.set(poRef, {
                    poNumber, poType, hospitalId,
                    supplierId: values.supplierId,
                    supplierName: selectedSupplier.name,
                    items: items.map(i => ({
                        name: i.name,
                        quantityOrdered: poType === 'GOODS' ? i.quantityOrdered : 1,
                        price: i.price,
                        quantityReceived: 0
                    })),
                    status: 'PENDING_DELIVERY',
                    orderedBy: user.uid,
                    orderedByName: user.displayName,
                    orderedAt: serverTimestamp(),
                });

                transaction.update(hospitalRef, { poCounter: increment(1) });
            });

            toast({ title: "Purchase Order Issued Successfully." });
            router.push('/supply-chain/orders');
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setLoading(false);
        }
    };

    if (isUserLoading || isProfileLoading) return <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin h-16 w-16" /></div>;

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2">
                    <ArrowLeft size={16}/> Back to Orders
                </Button>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateOrder)} className="space-y-6">
                    <div className="flex justify-between items-end border-b-4 border-slate-900 pb-4">
                        <h1 className="text-3xl font-black uppercase tracking-tighter italic">New Purchase Order</h1>
                        <div className="flex items-center gap-2 bg-card p-1 rounded-xl border">
                            <Button type="button" onClick={() => setPoType('GOODS')} variant={poType==='GOODS' ? 'default' : 'ghost'} size="sm" className="flex gap-2"><Package size={14}/> Goods</Button>
                            <Button type="button" onClick={() => setPoType('SERVICE')} variant={poType==='SERVICE' ? 'default' : 'ghost'} size="sm" className="flex gap-2"><Briefcase size={14}/> Service</Button>
                        </div>
                    </div>
                    
                    <FormField
                        control={form.control}
                        name="supplierId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Supplier</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={suppliersLoading}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select from approved vendors..." /></SelectTrigger></FormControl>
                                    <SelectContent>{suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <div className="bg-card rounded-[40px] border shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-muted text-[10px] uppercase font-black">
                                <tr>
                                    <th className="p-4">{poType === 'GOODS' ? 'Item Description' : 'Scope of Work / Milestone'}</th>
                                    {poType === 'GOODS' && <th className="p-4 w-28 text-center">Quantity</th>}
                                    <th className="p-4 w-40 text-right">{poType === 'GOODS' ? 'Unit Price (₵)' : 'Contract Sum (₵)'}</th>
                                    <th className="p-4 w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={idx} className="border-t">
                                        <td className="p-2"><Input required placeholder={poType==='GOODS' ? "e.g. Oxygen Cylinder Refill" : "e.g. Quarterly Air-Conditioner Servicing"} className="font-bold" onChange={e => updateItem(idx, 'name', e.target.value)} /></td>
                                        {poType === 'GOODS' && <td className="p-2 text-center"><Input type="number" className="w-24 text-center" value={item.quantityOrdered} onChange={e => updateItem(idx, 'quantityOrdered', Number(e.target.value))} /></td>}
                                        <td className="p-2 text-right"><Input type="number" step="0.01" className="w-36 text-right" value={item.price} onChange={e => updateItem(idx, 'price', Number(e.target.value))} /></td>
                                        <td className="p-2 text-center"><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 size={16} /></Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="p-4 bg-muted/50 border-t">
                            <Button type="button" onClick={addItem} variant="ghost" className="text-xs font-bold"><Plus size={14}/> Add Line Item</Button>
                        </div>
                    </div>
                    
                    <Button type="submit" disabled={loading} className="w-full h-12">
                        {loading ? <Loader2 className="animate-spin" /> : <Save size={16}/>}
                        Issue Purchase Order
                    </Button>
                </form>
            </Form>
        </div>
    );
}
