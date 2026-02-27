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
import { Loader2, FolderSearch, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

/**
 * == Core Hospital Engine: Live Patient Directory ==
 * 
 * This component displays a real-time stream of patients belonging to the current tenant.
 * It enforces logical isolation via the hospitalId filter (The SaaS Wall).
 * Includes an integrated search feature for rapid patient retrieval.
 */
export default function PatientList() {
    const { hospitalId } = useTenant();
    const db = useFirestore();
    const [searchQuery, setSearchQuery] = React.useState('');

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
    const { data: allPatients, isLoading } = useCollection<Patient>(patientsQuery);

    // 3. CLIENT-SIDE SEARCH LOGIC
    const filteredPatients = React.useMemo(() => {
        if (!allPatients) return [];
        if (!searchQuery) return allPatients;

        const lowerQuery = searchQuery.toLowerCase().trim();
        return allPatients.filter(p => 
            p.full_name?.toLowerCase().includes(lowerQuery) ||
            p.mrn?.toLowerCase().includes(lowerQuery) ||
            p.patient_id?.toLowerCase().includes(lowerQuery) ||
            p.phone_search?.includes(lowerQuery.replace(/\D/g, ''))
        );
    }, [allPatients, searchQuery]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-slate-900">
                        <FolderSearch className="h-8 w-8 text-primary" />
                        Hospital Directory
                    </h1>
                    <p className="text-muted-foreground font-medium">Master Patient Index for <strong>{hospitalId}</strong>.</p>
                </div>

                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by Name, MRN, or Phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-white shadow-sm"
                    />
                </div>
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
                        {filteredPatients && filteredPatients.length > 0 ? (
                            filteredPatients.map((p) => (
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
                                        <p className="text-sm font-medium">
                                            {searchQuery ? `No results found for "${searchQuery}"` : "No patient records found for this facility."}
                                        </p>
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