'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bed as BedIcon, User, Loader2, CheckCircle2 } from 'lucide-react';
import { AssignBedDialog } from '@/components/wards/assign-bed-dialog';
import { toast } from '@/hooks/use-toast';
import { Bed } from '@/lib/types';

/**
 * == Ward Management: Live Facility Map ==
 * 
 * Provides a real-time, visual overview of all beds in the hospital.
 * Enforces strict multi-tenant isolation via the hospitalId wall.
 */
export default function WardManagementPage() {
    const { user } = useAuth();
    const firestore = useFirestore();
    const [selectedWard, setSelectedWard] = React.useState('All');

    // 1. LIVE QUERY: Listen for all beds in this hospital
    const bedsQuery = useMemoFirebase(() => {
        if (!firestore || !user?.hospitalId) return null;
        return query(
            collection(firestore, "beds"),
            where("hospitalId", "==", user.hospitalId)
        );
    }, [firestore, user?.hospitalId]);

    const { data: beds, isLoading } = useCollection<Bed>(bedsQuery);

    // Filter logic for ward selection
    const filteredBeds = React.useMemo(() => {
        if (!beds) return [];
        return selectedWard === 'All' ? beds : beds.filter((b) => b.wardName === selectedWard);
    }, [beds, selectedWard]);

    // Extract unique ward names for the filter bar
    const wardNames = React.useMemo(() => {
        if (!beds) return [];
        return Array.from(new Set(beds.map(b => b.wardName).filter(Boolean)));
    }, [beds]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Ward Management</h1>
                    <p className="text-muted-foreground">Live census and bed status map for <strong>{user?.hospitalId}</strong>.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                   <Button 
                        variant={selectedWard === 'All' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setSelectedWard('All')}
                    >
                        All Units
                    </Button>
                   {wardNames.map(name => (
                       <Button 
                            key={name}
                            variant={selectedWard === name ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => setSelectedWard(name!)}
                        >
                            {name}
                        </Button>
                   ))}
                </div>
            </div>

            {/* Live Grid of Beds */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {filteredBeds.length > 0 ? (
                    filteredBeds.map((bed) => (
                        <BedCard key={bed.id} bed={bed} />
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl bg-muted/10">
                        <p className="text-muted-foreground">No beds found for the selected ward.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function BedCard({ bed }: { bed: Bed }) {
    const firestore = useFirestore();
    
    // Support for both PascalCase and lowercase status values from different data sources
    const statusColors: any = {
        Available: "bg-green-50 border-green-200 text-green-700",
        vacant: "bg-green-50 border-green-200 text-green-700",
        Occupied: "bg-blue-50 border-blue-200 text-blue-700 shadow-sm",
        occupied: "bg-blue-50 border-blue-200 text-blue-700 shadow-sm",
        Cleaning: "bg-yellow-50 border-yellow-200 text-yellow-700 animate-pulse",
        Maintenance: "bg-red-50 border-red-200 text-red-700",
        Reserved: "bg-purple-50 border-purple-200 text-purple-700"
    };

    const handleMarkReady = () => {
        if (!firestore) return;
        const bedRef = doc(firestore, 'beds', bed.id);
        
        updateDocumentNonBlocking(bedRef, {
            status: 'Available',
            updatedAt: serverTimestamp()
        });

        toast.success("Unit Ready", { description: `${bed.bedNumber} is now available for admission.` });
    };

    const config = statusColors[bed.status] || statusColors.Available;

    return (
        <Card className={`relative overflow-hidden border-2 transition-all hover:scale-[1.02] ${config}`}>
            <CardContent className="p-4 flex flex-col items-center text-center space-y-3 min-h-[140px] justify-center">
                <div className="absolute top-2 right-2 opacity-40">
                   {(bed.status === 'Occupied' || bed.status === 'occupied') ? <User size={14} /> : <BedIcon size={14} />}
                </div>
                
                <div className="space-y-0.5">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{bed.bedNumber}</p>
                    <h4 className="text-[9px] font-bold uppercase tracking-tighter opacity-50">{bed.wardName}</h4>
                </div>
                
                <div className="py-1">
                    {(bed.status === 'Occupied' || bed.status === 'occupied') ? (
                        <div className="space-y-1">
                            <p className="text-xs font-black truncate w-24 leading-none">{bed.currentPatientName}</p>
                            <p className="text-[8px] font-bold uppercase opacity-60">Admitted</p>
                        </div>
                    ) : (
                        <Badge variant="outline" className="text-[9px] font-black uppercase border-current/20 bg-background/50">
                            {bed.status}
                        </Badge>
                    )}
                </div>

                <div className="pt-1">
                    {(bed.status === 'Available' || bed.status === 'vacant') && <AssignBedDialog bedId={bed.id} bedNumber={bed.bedNumber} wardName={bed.wardName!} />}
                    {bed.status === 'Cleaning' && (
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-[9px] h-7 font-black uppercase bg-white/50 hover:bg-white shadow-sm gap-1"
                            onClick={handleMarkReady}
                        >
                            <CheckCircle2 className="h-3 w-3" />
                            Mark Ready
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
