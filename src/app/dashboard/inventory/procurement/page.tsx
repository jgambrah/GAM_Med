'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Truck, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

/**
 * == Procurement & Supply Chain: Facility Purchase Orders ==
 * 
 * This module tracks external vendor orders. It prevents double-ordering 
 * and provides financial oversight, strictly scoped to the hospitalId.
 */
export default function ProcurementPage() {
    const { user } = useAuth();
    const firestore = useFirestore();

    // LIVE QUERY: Hospital-specific purchase orders
    const ordersQuery = useMemoFirebase(() => {
        if (!firestore || !user?.hospitalId) return null;
        return query(
            collection(firestore, "purchase_orders"),
            where("hospitalId", "==", user.hospitalId),
            orderBy("createdAt", "desc")
        );
    }, [firestore, user?.hospitalId]);

    const { data: orders, isLoading } = useCollection(ordersQuery);

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Procurement Tracking</h1>
                    <p className="text-muted-foreground">
                        Monitor active supply requests for <strong>{user?.hospitalId}</strong>
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {orders && orders.length > 0 ? (
                        orders.map((po: any) => (
                            <Card key={po.id} className="overflow-hidden hover:shadow-md transition-all shadow-sm border">
                                <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex gap-4">
                                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                            <ShoppingCart className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">Order #{po.id.slice(0, 8).toUpperCase()}</h3>
                                            <p className="text-sm text-muted-foreground font-medium">Vendor: {po.vendorName || po.supplierId}</p>
                                            <p className="text-[10px] uppercase font-black mt-1 text-primary tracking-widest">
                                                Total Value: ₵{(po.totalAmount || po.totalCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <Badge className={
                                            po.status === 'Delivered' || po.status === 'Received' ? 'bg-green-500 hover:bg-green-600 text-white border-none' : 
                                            po.status === 'Shipped' ? 'bg-blue-500 hover:bg-blue-600 text-white border-none' : 
                                            'bg-orange-500 hover:bg-orange-600 text-white border-none'
                                        }>
                                            {po.status?.toUpperCase()}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 uppercase">
                                            <Clock className="h-3 w-3" />
                                            Requested: {po.createdAt ? format(new Date(po.createdAt.seconds * 1000), 'MMM dd, yyyy') : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Progress Bar for Pipeline Visibility */}
                                <div className="h-1.5 w-full bg-slate-100">
                                    <div 
                                        className={cn(
                                            "h-full transition-all duration-1000",
                                            po.status === 'Delivered' || po.status === 'Received' ? 'bg-green-500' : 'bg-blue-500'
                                        )}
                                        style={{ 
                                            width: (po.status === 'Pending' || po.status === 'Submitted') ? '33%' : 
                                                   po.status === 'Shipped' ? '66%' : '100%' 
                                        }}
                                    />
                                </div>
                            </Card>
                        ))
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/10">
                            <Truck className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                            <p className="text-muted-foreground font-medium">No active procurement orders found.</p>
                            <p className="text-xs text-muted-foreground/70">Submitted purchase orders will appear here for tracking.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
