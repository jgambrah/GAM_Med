'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Monitor, Wind, BatteryCharging, AlertCircle, Wrench, Loader2, Microscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddEquipmentDialog } from '@/components/inventory/add-equipment-dialog';
import { UpdateOxygenLevelDialog } from '@/components/inventory/update-oxygen-level-dialog';
import { format } from 'date-fns';
import { MedicalEquipment } from '@/lib/types';

/**
 * == SaaS Medical Equipment & Bio-Med Dashboard ==
 * 
 * Provides high-level visibility into the status and availability of 
 * critical medical machinery. Strictly logically isolated by hospitalId.
 */
export default function EquipmentInventoryPage() {
    const { user } = useAuth();
    const firestore = useFirestore();

    // 1. LIVE QUERY: Listen for all medical equipment in this hospital
    const equipmentQuery = useMemoFirebase(() => {
        if (!firestore || !user?.hospitalId) return null;
        return query(
            collection(firestore, "medical_equipment"),
            where("hospitalId", "==", user.hospitalId),
            orderBy("category", "asc")
        );
    }, [firestore, user?.hospitalId]);

    const { data: equipment, isLoading } = useCollection<MedicalEquipment>(equipmentQuery);

    // 2. AGGREGATE KPIS: Real-time calculation from live data
    const stats = React.useMemo(() => {
        if (!equipment) return { 
            ventilators: { available: 0, total: 0 }, 
            oxygen: { available: 0, total: 0 }, 
            maintenance: 0, 
            faulty: 0 
        };

        return equipment.reduce((acc, item) => {
            if (item.category === 'Ventilator') {
                acc.ventilators.total++;
                if (item.status === 'Available') acc.ventilators.available++;
            }
            if (item.category === 'Oxygen Tank') {
                acc.oxygen.total++;
                if (item.status === 'Available') acc.oxygen.available++;
            }
            if (item.status === 'Maintenance') acc.maintenance++;
            if (item.status === 'Faulty') acc.faulty++;
            return acc;
        }, { 
            ventilators: { available: 0, total: 0 }, 
            oxygen: { available: 0, total: 0 }, 
            maintenance: 0, 
            faulty: 0 
        });
    }, [equipment]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-slate-900">
                        <Monitor className="text-blue-600 h-8 w-8" />
                        Medical Equipment & Bio-Med
                    </h1>
                    <p className="text-muted-foreground">
                        Capital asset tracking and machine maintenance for <strong>{user?.hospitalId}</strong>
                    </p>
                </div>
                <AddEquipmentDialog />
            </div>

            {/* Quick Stats: Critical Availability */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard 
                    title="Ventilators" 
                    available={stats.ventilators.available}
                    total={stats.ventilators.total}
                    icon={<Wind className="text-blue-500 h-5 w-5" />}
                />
                <StatCard 
                    title="Oxygen Tanks" 
                    available={stats.oxygen.available}
                    total={stats.oxygen.total}
                    icon={<BatteryCharging className="text-green-500 h-5 w-5" />}
                />
                <StatCard 
                    title="Maintenance Due" 
                    value={stats.maintenance}
                    icon={<Wrench className="text-orange-500 h-5 w-5" />}
                />
                <StatCard 
                    title="Faulty / Down" 
                    value={stats.faulty}
                    icon={<AlertCircle className="text-red-500 h-5 w-5" />}
                />
            </div>

            {/* Inventory Registry Table */}
            <Card className="shadow-md overflow-hidden border-t-4 border-t-primary">
                <CardHeader className="bg-muted/20 border-b">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Facility Asset Registry</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6">Serial Number</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Clinical Reading</TableHead>
                                <TableHead>Next Service</TableHead>
                                <TableHead className="text-right pr-6">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {equipment && equipment.length > 0 ? (
                                equipment.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-muted/20 transition-colors">
                                        <TableCell className="font-mono text-xs font-bold pl-6 text-primary uppercase tracking-wider">
                                            {item.serialNumber}
                                        </TableCell>
                                        <TableCell className="font-medium">{item.category}</TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant={item.status === 'Available' ? 'secondary' : 'default'}
                                                className={
                                                    item.status === 'Available' ? 'bg-green-500 hover:bg-green-600 text-white border-none' : 
                                                    item.status === 'In Use' ? 'bg-blue-500 hover:bg-blue-600 text-white border-none' :
                                                    item.status === 'Maintenance' ? 'bg-orange-500 hover:bg-orange-600 text-white border-none' :
                                                    'bg-red-500 hover:bg-red-600 text-white border-none'
                                                }
                                            >
                                                {item.status.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {item.category === 'Oxygen Tank' && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold font-mono">
                                                        {item.oxygenLevel ?? 0}%
                                                    </span>
                                                    <Badge 
                                                        variant="outline" 
                                                        className={cn(
                                                            "text-[9px] font-black uppercase",
                                                            (item.oxygenLevel ?? 0) < 20 ? "border-red-500 text-red-600 animate-pulse" : 
                                                            (item.oxygenLevel ?? 0) < 50 ? "border-orange-500 text-orange-600" : 
                                                            "border-green-500 text-green-600"
                                                        )}
                                                    >
                                                        {(item.oxygenLevel ?? 0) < 20 ? "CRITICAL" : (item.oxygenLevel ?? 0) < 50 ? "LOW" : "OK"}
                                                    </Badge>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs font-medium">
                                            {item.nextMaintenance ? format(new Date(item.nextMaintenance), 'MMM dd, yyyy') : 'NOT SET'}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-2">
                                                {item.category === 'Oxygen Tank' && (
                                                    <UpdateOxygenLevelDialog tank={{ id: item.id, serialNumber: item.serialNumber, currentLevel: item.oxygenLevel }} />
                                                )}
                                                <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase">Manage</Button>
                                            </div>
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

function StatCard({ title, available, total, value, icon }: { title: string, available?: number, total?: number, value?: number, icon: React.ReactNode }) {
    return (
        <Card className="shadow-sm border-none bg-card hover:shadow-md transition-all group">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">{title}</p>
                    <h3 className="text-2xl font-black text-slate-900 leading-none">
                        {value !== undefined ? value : `${available} / ${total}`}
                    </h3>
                </div>
                <div className="p-3 bg-muted rounded-2xl group-hover:bg-primary/5 transition-colors">
                    {icon}
                </div>
            </CardContent>
        </Card>
    );
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
