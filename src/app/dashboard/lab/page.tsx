
'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Beaker, Clock, Loader2, ClipboardCheck } from 'lucide-react';
import { RecordResultDialog } from '@/components/laboratory/record-result-dialog';

/**
 * == Laboratory Module: Technician Worklist ==
 * 
 * This is the central hub for the lab. It displays a real-time stream of
 * pending test orders for the current facility.
 */
export default function LaboratoryPage() {
    const { user } = useAuth();
    const firestore = useFirestore();

    // LIVE QUERY: Listen for active Lab Orders for THIS hospital
    const ordersQuery = useMemoFirebase(() => {
        if (!firestore || !user?.hospitalId) return null;
        return query(
            collection(firestore, "lab_orders"),
            where("hospitalId", "==", user.hospitalId),
            where("status", "in", ["Requested", "Sample Collected", "Processing"])
        );
    }, [firestore, user?.hospitalId]);

    const { data: orders, isLoading } = useCollection(ordersQuery);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-purple-900">
                        <Beaker className="h-8 w-8 text-purple-600" />
                        Laboratory Worklist
                    </h1>
                    <p className="text-muted-foreground">
                        Real-time diagnostic queue for <strong>{user?.hospitalId}</strong>.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="h-8 px-4 border-purple-200 text-purple-700 bg-purple-50/50">
                        {orders?.length || 0} ACTIVE ORDERS
                    </Badge>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orders && orders.length > 0 ? (
                        orders.map((order: any) => (
                            <Card key={order.id} className="hover:shadow-md transition-all border-t-4 border-t-purple-500 overflow-hidden shadow-sm">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg font-bold">{order.patientName}</CardTitle>
                                            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                                                MRN: {order.patientMrn || 'N/A'}
                                            </p>
                                        </div>
                                        <Badge variant={order.priority === 'Urgent' ? 'destructive' : 'secondary'} className="text-[10px] font-bold">
                                            {order.priority || 'ROUTINE'}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="bg-purple-50/50 p-3 rounded-md border border-purple-100">
                                        <p className="text-sm font-bold text-purple-900">{order.testName}</p>
                                        <p className="text-[10px] text-purple-700 mt-1 uppercase font-black">
                                            Ordered by: Dr. {order.doctorName || 'Medical Staff'}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            <span>
                                                {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                                            </span>
                                        </div>
                                        
                                        <RecordResultDialog order={order} />
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20 border-2 border-dashed rounded-xl bg-muted/10">
                            <ClipboardCheck className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                            <p className="text-muted-foreground font-medium">All diagnostic requests processed.</p>
                            <p className="text-xs text-muted-foreground/70">New orders from EHR will appear here instantly.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
