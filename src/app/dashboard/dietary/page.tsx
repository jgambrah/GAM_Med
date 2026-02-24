'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Utensils, AlertCircle, CheckCircle2, Loader2, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DietaryOrder } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

/**
 * == Hospital Kitchen & Nutrition Station ==
 * 
 * This dashboard manages real-time patient meal logistics.
 * Every order is strictly logically isolated via the hospitalId SaaS Wall.
 */
export default function DietaryDashboard() {
    const { user } = useAuth();
    const firestore = useFirestore();

    // 1. LIVE SAAS QUERY: Listen for pending meal orders for THIS hospital
    const ordersQuery = useMemoFirebase(() => {
        if (!firestore || !user?.hospitalId) return null;
        return query(
            collection(firestore, "dietary_orders"),
            where("hospitalId", "==", user.hospitalId),
            where("status", "in", ["Requested", "Preparing"]),
            orderBy("createdAt", "asc")
        );
    }, [firestore, user?.hospitalId]);

    const { data: orders, isLoading } = useCollection<DietaryOrder>(ordersQuery);

    const markDelivered = async (id: string, patientName: string) => {
        if (!firestore) return;
        
        const orderRef = doc(firestore, 'dietary_orders', id);
        
        // Non-blocking update for fast kitchen operations
        updateDocumentNonBlocking(orderRef, { 
            status: 'Delivered',
            deliveredAt: new Date().toISOString()
        });

        toast.success("Meal Delivered", {
            description: `Order for ${patientName} has been cleared from the queue.`
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6 bg-slate-50/30 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-slate-900">
                        <Utensils className="text-orange-500 h-8 w-8" />
                        Kitchen & Nutrition Station
                    </h1>
                    <p className="text-muted-foreground font-medium">Real-time dietary logistics for <strong>{user?.hospitalId}</strong></p>
                </div>
                <Badge variant="outline" className="h-8 px-4 border-orange-200 text-orange-700 bg-orange-50 uppercase font-black tracking-widest">
                    {orders?.length || 0} PENDING MEALS
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orders && orders.length > 0 ? (
                    orders.map((order) => (
                        <Card key={order.id} className="border-t-4 border-t-orange-400 hover:shadow-lg transition-all shadow-sm group">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg font-bold text-slate-900">{order.patientName}</CardTitle>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                                            {order.wardName} | {order.bedId}
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className="text-[9px] font-bold uppercase">
                                        {order.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            
                            <CardContent className="space-y-4">
                                {/* Clinical Diet Type - Highlighted */}
                                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                                    <p className="text-[9px] font-black text-orange-700 uppercase mb-1 tracking-tighter">Clinical Diet Order</p>
                                    <p className="text-sm font-bold text-orange-900">{order.dietType}</p>
                                </div>

                                {/* Allergy Warning - High Visibility */}
                                {order.allergies && (
                                    <div className="flex items-center gap-2 text-red-600 text-[11px] font-bold bg-red-50 p-2 rounded-md border border-red-100 animate-pulse">
                                        <AlertCircle size={14} className="shrink-0" />
                                        <span>SAFETY ALERT: {order.allergies}</span>
                                    </div>
                                )}

                                {order.specialInstructions && (
                                    <div className="p-2 bg-muted/30 rounded text-[11px] text-slate-600 italic border">
                                        "{order.specialInstructions}"
                                    </div>
                                )}

                                <Button 
                                    onClick={() => markDelivered(order.id, order.patientName)} 
                                    className="w-full bg-orange-500 hover:bg-orange-600 font-bold shadow-md group-hover:scale-[1.02] transition-transform"
                                >
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Mark as Delivered
                                </Button>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full text-center py-32 border-2 border-dashed rounded-2xl bg-white/50">
                        <ClipboardList className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
                        <h3 className="text-lg font-bold text-slate-900">All Clear</h3>
                        <p className="text-sm text-muted-foreground">No pending meal orders for the current service period.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
