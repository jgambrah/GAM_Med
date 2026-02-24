
'use client';

import * as React from 'react';
import { query, collection, where, orderBy, Timestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useTenant } from '@/hooks/use-tenant';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { format } from 'date-fns';
import { Patient } from '@/lib/types';

/**
 * == Core Hospital Engine: Live Patient List ==
 * 
 * This component displays a real-time stream of patients belonging to the current tenant.
 * It enforces logical isolation via the hospitalId filter.
 */
export default function PatientList() {
    const { hospitalId } = useTenant();
    const db = useFirestore();

    // 1. MEMOIZED TENANT QUERY
    const patientsQuery = useMemoFirebase(() => {
        if (!hospitalId) return null;
        return query(
            collection(db, "patients"),
            where("hospitalId", "==", hospitalId),
            orderBy("createdAt", "desc")
        );
    }, [db, hospitalId]);

    // 2. REAL-TIME HOOK
    const { data: patients, isLoading } = useCollection<Patient>(patientsQuery);

    const formatDate = (date: any) => {
        if (!date) return 'N/A';
        if (date instanceof Timestamp) return format(date.toDate(), 'PPP');
        if (date.seconds) return format(new Date(date.seconds * 1000), 'PPP');
        return format(new Date(date), 'PPP');
    }

    if (isLoading) {
        return <div className="p-6 text-center text-muted-foreground">Loading hospital directory...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Hospital Directory</h1>
                <p className="text-muted-foreground">A real-time view of all patients registered at your facility.</p>
            </div>

            <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[150px]">MRN</TableHead>
                            <TableHead>Full Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Registered On</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {patients && patients.length > 0 ? (
                            patients.map((p: any) => (
                                <TableRow key={p.id} className="hover:bg-muted/50 transition-colors">
                                    <TableCell className="font-mono text-sm">{p.mrn}</TableCell>
                                    <TableCell className="font-medium">
                                        {p.full_name || `${p.firstName} ${p.lastName}`}
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                            {p.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {formatDate(p.createdAt)}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                    No patients found in your hospital's directory.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
