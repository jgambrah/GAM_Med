'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { AlertCircle, CheckCircle2, XCircle, Loader2, ShieldAlert, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface CatalogProduct {
    id: string;
    name: string;
    sku: string;
    minLevel: number;
}

interface InventoryItem {
    id: string;
    name: string; // This should match a name in the catalog
    quantity: number;
}

export default function InventoryPulsePage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const [claims, setClaims] = useState<any>(null);
    const [isClaimsLoading, setIsClaimsLoading] = useState(true);

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
    const isAuthorized = ['DIRECTOR', 'ADMIN', 'STORE_MANAGER', 'PHARMACIST'].includes(userRole);

    // Fetch master catalog and inventory
    const catalogQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/product_catalog`)) : null, [firestore, hospitalId]);
    const { data: catalog, isLoading: catalogLoading } = useCollection<CatalogProduct>(catalogQuery);

    const inventoryQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/pharmacy_inventory`)) : null, [firestore, hospitalId]);
    const { data: inventory, isLoading: inventoryLoading } = useCollection<InventoryItem>(inventoryQuery);

    const getStockStatus = (qty: number, minLevel: number) => {
        if (qty <= 0) return { label: 'STOCK OUT', variant: 'destructive' as const, className: 'bg-red-100 text-red-700 border-red-200' };
        if (qty <= minLevel) return { label: 'LOW STOCK', variant: 'secondary' as const, className: 'bg-orange-100 text-orange-700 border-orange-200' };
        return { label: 'ADEQUATE', variant: 'default' as const, className: 'bg-green-100 text-green-700 border-green-200' };
    };

    const stockStatusData = useMemo(() => {
        if (!catalog || !inventory) return [];

        // Aggregate inventory quantities by name
        const aggregatedInventory = inventory.reduce((acc, item) => {
            acc[item.name] = (acc[item.name] || 0) + item.quantity;
            return acc;
        }, {} as Record<string, number>);

        return catalog.map(product => {
            const currentQty = aggregatedInventory[product.name] || 0;
            return {
                ...product,
                currentQty,
            };
        });
    }, [catalog, inventory]);

    const stats = useMemo(() => {
        const adequate = stockStatusData.filter(s => getStockStatus(s.currentQty, s.minLevel).label === 'ADEQUATE').length;
        const low = stockStatusData.filter(s => getStockStatus(s.currentQty, s.minLevel).label === 'LOW STOCK').length;
        const stockOut = stockStatusData.filter(s => getStockStatus(s.currentQty, s.minLevel).label === 'STOCK OUT').length;
        return { adequate, low, stockOut };
    }, [stockStatusData]);
    
    const pageIsLoading = isUserLoading || isClaimsLoading;
    const dataIsLoading = catalogLoading || inventoryLoading;

    if (pageIsLoading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
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
            <h1 className="text-3xl font-black uppercase tracking-tighter italic">Inventory <span className="text-primary">Health Pulse</span></h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatusCard label="Adequate Stock" count={dataIsLoading ? '...' : stats.adequate} icon={<CheckCircle2 />} color="green" />
                <StatusCard label="Low Level Alerts" count={dataIsLoading ? '...' : stats.low} icon={<AlertCircle />} color="orange" />
                <StatusCard label="Stock-Out Crisis" count={dataIsLoading ? '...' : stats.stockOut} icon={<XCircle />} color="red" />
            </div>

            <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>SKU / Name</TableHead>
                            <TableHead className="text-center">Min. Level</TableHead>
                            <TableHead className="text-center">Current Qty</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dataIsLoading ? (
                            <TableRow><TableCell colSpan={4} className="text-center h-48"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                        ) : stockStatusData.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center p-20 text-muted-foreground italic"><Package/>No products in catalog to monitor.</TableCell></TableRow>
                        ) : (
                            stockStatusData.map(item => {
                                const status = getStockStatus(item.currentQty, item.minLevel);
                                return (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <p className="font-bold text-primary text-xs">{item.sku}</p>
                                        <p className="uppercase text-card-foreground font-semibold text-sm">{item.name}</p>
                                    </TableCell>
                                    <TableCell className="text-center font-bold">{item.minLevel}</TableCell>
                                    <TableCell className="text-center font-black text-lg">{item.currentQty}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={'outline'} className={status.className}>
                                            {status.label}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            )})
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function StatusCard({ label, count, icon, color }: any) {
    const colors: any = {
        green: "bg-green-50 border-green-100 text-green-700",
        orange: "bg-orange-50 border-orange-100 text-orange-700",
        red: "bg-red-50 border-red-100 text-red-700"
    };
    return (
        <div className={`p-8 rounded-[40px] border-2 ${colors[color]} flex items-center justify-between shadow-sm`}>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
                <p className="text-4xl font-black tracking-tighter">{count}</p>
            </div>
            <div className="p-4 bg-white/50 rounded-3xl">{icon}</div>
        </div>
    );
}
