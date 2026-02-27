'use client';

import * as React from 'react';
import { query, collection, where, orderBy } from 'firebase/firestore';
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
import { Loader2, FolderSearch } from 'lucide-react';

/**
 * == Core Hospital Engine: Live Patient Directory ==
 * 
 * This component displays a real-time stream of patients belonging to the current tenant.
 * It enforces logical isolation via the hospitalId filter (The SaaS Wall).
 */
export default function PatientList() {
    const { hospitalId } = useTenant();
    const db = useFirestore();

    // 1. MEMOIZED TENANT QUERY
    // CRITICAL: The filter must match the Security Rule constraint exactly.
    const patientsQuery = useMemoFirebase(() => {
        if (!hospitalId) return null;
        return query(
            collection(db, "patients"),
            where("hospitalId", "==", hospitalId),
            orderBy("created_at", "desc")
        );
    }, [db, hospitalId]);

    // 2. REAL-TIME DATA HOOK
    const { data: patients, isLoading } = useCollection<Patient>(patientsQuery);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <FolderSearch className="h-8 w-8 text-primary" />
                    Hospital Directory
                </h1>
                <p className="text-muted-foreground font-medium">A real-time view of all patients registered at <strong>{hospitalId}</strong>.</p>
            </div>

            <div className="border rounded-xl bg-card shadow-sm overflow-hidden ring-1 ring-slate-200">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[150px] text-[10px] font-black uppercase tracking-widest pl-6">MRN</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Full Name</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                            <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-widest">Registered On</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {patients && patients.length > 0 ? (
                            patients.map((p) => (
                                <TableRow key={p.id} className="hover:bg-muted/50 transition-colors h-16 border-b last:border-0">
                                    <TableCell className="font-mono text-xs pl-6 font-bold text-primary">{p.mrn}</TableCell>
                                    <TableCell className="font-bold text-sm text-slate-900">
                                        {p.full_name}
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-100">
                                            {p.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right pr-6 text-xs font-medium text-muted-foreground">
                                        {p.created_at ? format(new Date(p.created_at), 'PPP') : 'N/A'}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-40 text-center">
                                    <div className="flex flex-col items-center justify-center opacity-30">
                                        <FolderSearch className="h-12 w-12 mb-2" />
                                        <p className="text-sm font-medium">No patient records found for this facility.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}