
'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Microscope, AlertCircle, Loader2, PenTool, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddEquipmentDialog } from '@/components/inventory/add-equipment-dialog';
import { format } from 'date-fns';
import { MedicalEquipment } from '@/lib/types';

/**
 * == SaaS Medical Equipment Dashboard ==
 * 
 * Clinical asset tracking for hospital machines.
 * Strictly isolated by hospitalId to prevent cross-tenant data leaks.
 */
export default function EquipmentRegistryPage() {
    const { user } = useAuth();
    const firestore = useFirestore();

    // 1. LIVE QUERY: Listen for all capital assets in this hospital
    const equipmentQuery = useMemoFirebase(() => {
        if (!firestore || !user?.hospitalId) return null;
        return query(
            collection(firestore, "medical_equipment"),
            where("hospitalId", "==", user.hospitalId),
            orderBy("category", "asc")
        );
    }, [firestore, user?.hospitalId]);

    const { data: equipment, isLoading } = useCollection<MedicalEquipment>(equipmentQuery);

    // Aggregate stats for KPIs
    const stats = React.useMemo(() => {
        if (!equipment) return { total: 0, maintenance: 0, faulty: 0 };
        return equipment.reduce((acc, item) => {
            acc.total++;
            if (item.status === 'Maintenance') acc.maintenance++;
            if (item.status === 'Faulty') acc.faulty++;
            return acc;
        }, { total: 0, maintenance: 0, faulty: 0 });
    }, [equipment]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Microscope className="text-blue-600 h-8 w-8" />
                        Medical Equipment Registry
                    </h1>
                    <p className="text-muted-foreground">
                        Capital asset tracking and maintenance for <strong>{user?.hospitalId}</strong>
                    </p>
                </div>
                <AddEquipmentDialog />
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-sm border-t-4 border-t-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Assets</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">{stats.total}</div>
                        <p className="text-[10px] text-muted-foreground uppercase mt-1 font-semibold">Tracked machines</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-t-4 border-t-orange-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-orange-700 uppercase tracking-wider flex items-center gap-2">
                            <PenTool className="h-3 w-3" />
                            In Maintenance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-orange-900">{stats.maintenance}</div>
                        <p className="text-[10px] text-orange-700/70 mt-1 font-semibold uppercase">Periodic servicing</p>
                    </CardContent>
                </Card>

                <Card className={stats.faulty > 0 ? "border-red-200 bg-red-50 shadow-md border-t-4 border-t-red-500" : "shadow-sm border-t-4 border-t-green-500"}>
                    <CardHeader className="pb-2">
                        <CardTitle className={stats.faulty > 0 ? "text-xs font-bold text-red-700 uppercase flex items-center gap-2" : "text-xs font-bold text-muted-foreground uppercase tracking-wider"}>
                            {stats.faulty > 0 && <AlertCircle className="h-4 w-4 animate-pulse" />} 
                            Faulty Equipment
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={stats.faulty > 0 ? "text-3xl font-black text-red-700" : "text-3xl font-black text-green-600"}>
                            {stats.faulty > 0 ? stats.faulty : "CLEAR"}
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase mt-1 font-semibold">
                            {stats.faulty > 0 ? "Requiring urgent repair" : "Systems operational"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Equipment Registry Table */}
            <Card className="shadow-md overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Facility Machine Inventory</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6">Equipment Name</TableHead>
                                <TableHead>Serial Number</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Next Service</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right pr-6">Assignment</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {equipment && equipment.length > 0 ? (
                                equipment.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-muted/20 transition-colors">
                                        <TableCell className="font-bold pl-6">{item.name}</TableCell>
                                        <TableCell className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{item.serialNumber}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="text-[9px] uppercase font-black">{item.category}</Badge>
                                        </TableCell>
                                        <TableCell className="text-xs font-medium">
                                            {item.nextMaintenance ? format(new Date(item.nextMaintenance), 'MMM dd, yyyy') : 'NOT SET'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={
                                                item.status === 'Available' ? 'bg-green-500 hover:bg-green-600 text-white' : 
                                                item.status === 'In Use' ? 'bg-blue-500 hover:bg-blue-600 text-white' :
                                                item.status === 'Maintenance' ? 'bg-orange-500 hover:bg-orange-600 text-white' :
                                                'bg-red-500 hover:bg-red-600 text-white'
                                            }>
                                                {item.status.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            {item.status === 'In Use' ? (
                                                <div className="text-[10px] font-bold text-blue-700">
                                                    PATIENT: {item.currentPatientName || item.currentPatientId}
                                                </div>
                                            ) : (
                                                <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold">ASSIGN UNIT</Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-40 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-30">
                                            <Microscope className="h-12 w-12 mb-2" />
                                            <p className="text-sm font-medium tracking-tighter">No equipment registered for this facility.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
