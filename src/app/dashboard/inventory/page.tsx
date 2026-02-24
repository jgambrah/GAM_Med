
'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * == Medical Supplies & Assets: Facility Register ==
 * 
 * This module tracks non-pharmaceutical supplies (syringes, PPE, etc).
 * It enforces logical isolation via the hospitalId SaaS wall.
 */
export default function InventoryAssetsPage() {
    const { user } = useAuth();
    const firestore = useFirestore();

    // LIVE QUERY: Hospital-specific assets
    const assetsQuery = useMemoFirebase(() => {
        if (!firestore || !user?.hospitalId) return null;
        return query(
            collection(firestore, "inventory_assets"),
            where("hospitalId", "==", user.hospitalId),
            orderBy("name", "asc")
        );
    }, [firestore, user?.hospitalId]);

    const { data: assets, isLoading } = useCollection(assetsQuery);

    // Calculate low stock based on minimum thresholds
    const lowStockItems = React.useMemo(() => {
        return assets?.filter((item: any) => item.quantity <= (item.minLevel || 0)) || [];
    }, [assets]);

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Package className="text-blue-600 h-8 w-8" />
                        Medical Supplies & Assets
                    </h1>
                    <p className="text-muted-foreground">
                        Real-time stock tracking for <strong>{user?.hospitalId}</strong>
                    </p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700 shadow-md">
                    <Plus className="mr-2 h-4 w-4" /> Add Asset
                </Button>
            </div>

            {/* Status Overview KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-sm border-t-4 border-t-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Catalog Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">{assets?.length || 0}</div>
                        <p className="text-[10px] text-muted-foreground uppercase mt-1">Unique supply types</p>
                    </CardContent>
                </Card>

                <Card className={lowStockItems.length > 0 ? "border-red-200 bg-red-50 shadow-md border-t-4 border-t-red-500" : "shadow-sm border-t-4 border-t-green-500"}>
                    <CardHeader className="pb-2">
                        <CardTitle className={lowStockItems.length > 0 ? "text-xs font-bold text-red-700 uppercase flex items-center gap-2" : "text-xs font-bold text-muted-foreground uppercase tracking-wider"}>
                            {lowStockItems.length > 0 && <AlertTriangle className="h-4 w-4 animate-pulse" />} 
                            Inventory Alerts
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={lowStockItems.length > 0 ? "text-3xl font-black text-red-700" : "text-3xl font-black text-green-600"}>
                            {lowStockItems.length > 0 ? `${lowStockItems.length} CRITICAL` : "STABLE"}
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase mt-1">
                            {lowStockItems.length > 0 ? "Items below min level" : "Stock levels healthy"}
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-t-4 border-t-slate-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Procurement</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-400 italic">--</div>
                        <p className="text-[10px] text-muted-foreground uppercase mt-1">Live Purchase Orders</p>
                    </CardContent>
                </Card>
            </div>

            {/* Supply Registry Table */}
            <Card className="shadow-md overflow-hidden">
                <CardHeader className="bg-muted/30 border-b font-bold text-sm uppercase tracking-widest text-muted-foreground">
                    Facility Supply Register
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="pl-6">Item Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">On Hand</TableHead>
                                    <TableHead className="text-right">Min. Level</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right pr-6">Management</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assets && assets.length > 0 ? (
                                    assets.map((item: any) => (
                                        <TableRow key={item.id} className="hover:bg-muted/20 transition-colors">
                                            <TableCell className="font-bold pl-6">{item.name}</TableCell>
                                            <TableCell className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                                                {item.category}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-black text-blue-900">
                                                {item.quantity.toLocaleString()} 
                                                <span className="ml-1 text-[10px] font-medium text-muted-foreground lowercase">{item.unit || 'units'}</span>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground text-xs">{item.minLevel}</TableCell>
                                            <TableCell>
                                                {item.quantity <= (item.minLevel || 0) ? 
                                                    <Badge variant="destructive" className="uppercase text-[9px] font-black tracking-widest px-2 py-0.5 shadow-sm">
                                                        Reorder Now
                                                    </Badge> : 
                                                    <Badge className="bg-green-500 hover:bg-green-600 text-white border-none uppercase text-[9px] font-black tracking-widest px-2 py-0.5 shadow-sm">
                                                        Healthy
                                                    </Badge>
                                                }
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold">ADJUST</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-40 text-center">
                                            <div className="flex flex-col items-center justify-center opacity-30">
                                                <Package className="h-12 w-12 mb-2" />
                                                <p className="text-sm font-medium tracking-tighter">No assets registered for this facility.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
