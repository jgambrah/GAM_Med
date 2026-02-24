'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Clock, Loader2, ImagePlus } from 'lucide-react';
import { UploadResultDialog } from '@/components/radiology/upload-result-dialog';

/**
 * == Radiology Module: Live Worklist Dashboard ==
 * 
 * Provides a real-time stream of pending imaging orders for the current facility.
 * Every query is tenant-locked using the hospitalId SaaS Wall.
 */
export default function RadiologyDashboardPage() {
    const { user } = useAuth();
    const firestore = useFirestore();

    // LIVE QUERY: Listen for Pending Radiology Orders for THIS hospital
    const ordersQuery = useMemoFirebase(() => {
        if (!firestore || !user?.hospitalId) return null;
        return query(
            collection(firestore, "radiology_orders"),
            where("hospitalId", "==", user.hospitalId),
            where("status", "==", "Pending"),
            orderBy("dateOrdered", "desc")
        );
    }, [firestore, user?.hospitalId]);

    const { data: orders, isLoading } = useCollection(ordersQuery);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-slate-900">
                        <Camera className="h-8 w-8 text-blue-600" />
                        Radiology Worklist
                    </h1>
                    <p className="text-muted-foreground">
                        Real-time imaging queue for <strong>{user?.hospitalId}</strong>.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="h-8 px-4 border-blue-200 text-blue-700 bg-blue-50/50">
                        {orders?.length || 0} PENDING STUDIES
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
                            <Card key={order.id} className="hover:shadow-md transition-all border-t-4 border-t-orange-500 overflow-hidden shadow-sm">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg font-bold">{order.patientName}</CardTitle>
                                            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                                                MRN: {order.patientMrn || 'N/A'}
                                            </p>
                                        </div>
                                        <Badge variant="secondary" className="text-[10px] font-bold uppercase">
                                            {order.modality}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="bg-orange-50/50 p-3 rounded-md border border-orange-100">
                                        <p className="text-xs font-bold text-orange-900 uppercase mb-1">Clinical Indication:</p>
                                        <p className="text-sm text-orange-800 line-clamp-2 italic">
                                            "{order.indication || 'No specific notes provided.'}"
                                        </p>
                                        <p className="text-[10px] text-orange-700 mt-2 uppercase font-black">
                                            Ordered by: Dr. {order.doctorName || 'Medical Staff'}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            <span>
                                                {order.dateOrdered ? new Date(order.dateOrdered).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                                            </span>
                                        </div>
                                        
                                        <UploadResultDialog order={order} />
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20 border-2 border-dashed rounded-xl bg-muted/10">
                            <ImagePlus className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                            <p className="text-muted-foreground font-medium">All imaging requests cleared.</p>
                            <p className="text-xs text-muted-foreground/70">New orders from EHR will appear here instantly.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
