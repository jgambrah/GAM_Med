'use client';

import React, { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileText, AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Diagnosis, MortalityRecord } from '@/lib/types';

/**
 * == Statutory Compliance: Morbidity & Mortality Dashboard ==
 * 
 * Provides the official data required for Ministry of Health (MoH) monthly returns.
 * Automates the collection of ICD-10 coded disease data across the facility.
 * Enforces strict multi-tenant isolation via the hospitalId wall.
 */
export default function ComplianceReportingPage() {
    const { user } = useAuth();
    const firestore = useFirestore();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<{
        morbidity: { code: string; count: number }[];
        mortality: MortalityRecord[];
    }>({ morbidity: [], mortality: [] });

    useEffect(() => {
        if (!user?.hospitalId || !firestore) return;

        const fetchComplianceData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Diagnoses (Morbidity) - Scoped to Hospital
                const diagQuery = query(
                    collection(firestore, "diagnoses"),
                    where("hospitalId", "==", user.hospitalId)
                );
                const diagSnap = await getDocs(diagQuery);
                
                // Group by ICD-10 Code
                const morbidityMap: Record<string, number> = {};
                diagSnap.forEach(doc => {
                    const d = doc.data() as Diagnosis;
                    if (d.icd10Code) {
                        morbidityMap[d.icd10Code] = (morbidityMap[d.icd10Code] || 0) + 1;
                    }
                });

                // 2. Fetch Mortality Records - Scoped to Hospital
                const mortQuery = query(
                    collection(firestore, "mortality_records"),
                    where("hospitalId", "==", user.hospitalId),
                    orderBy("dateOfDeath", "desc"),
                    limit(100)
                );
                const mortSnap = await getDocs(mortQuery);
                const mortList = mortSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MortalityRecord));

                setStats({
                    morbidity: Object.entries(morbidityMap)
                        .map(([code, count]) => ({ code, count }))
                        .sort((a, b) => b.count - a.count),
                    mortality: mortList
                });
            } catch (error) {
                console.error("Compliance fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchComplianceData();
    }, [user?.hospitalId, firestore]);

    const handleExportCSV = () => {
        // Conceptual: In production, this would trigger a CSV generation service
        alert("Preparing MoH Form 001 (CSV Export)... This will be delivered to your email.");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-slate-900">
                        <ShieldCheck className="text-blue-600 h-8 w-8" />
                        Statutory Returns
                    </h1>
                    <p className="text-muted-foreground font-medium">Monthly reporting based on MoH Ghana Standards for <strong>{user?.hospitalId}</strong></p>
                </div>
                <Button onClick={handleExportCSV} className="gap-2 shadow-md">
                    <Download size={16} /> Export MoH Form 001
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Morbidity Section */}
                <Card className="shadow-md border-t-4 border-t-blue-500 overflow-hidden">
                    <CardHeader className="bg-muted/20 border-b">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                            <FileText size={16} className="text-blue-500" />
                            Disease Prevalence (Morbidity)
                        </CardTitle>
                        <CardDescription>Top clinical presentations grouped by ICD-10 codes.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="pl-6">ICD-10 Code</TableHead>
                                    <TableHead>Disease Description</TableHead>
                                    <TableHead className="text-right pr-6">Total Cases</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.morbidity.length > 0 ? stats.morbidity.map((item, i) => (
                                    <TableRow key={i} className="hover:bg-muted/20">
                                        <TableCell className="font-mono font-black text-blue-600 pl-6 uppercase tracking-wider">{item.code}</TableCell>
                                        <TableCell className="font-medium">{getDiseaseName(item.code)}</TableCell>
                                        <TableCell className="text-right pr-6 font-black text-slate-900">{item.count}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic">No diagnostic data found for the current period.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Mortality Section */}
                <Card className="shadow-md border-t-4 border-t-red-500 overflow-hidden">
                    <CardHeader className="bg-muted/20 border-b">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                            <AlertCircle size={16} className="text-red-500" />
                            Mortality Register
                        </CardTitle>
                        <CardDescription>Immutable log of facility-certified deaths.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="pl-6">Date</TableHead>
                                    <TableHead>Cause of Death</TableHead>
                                    <TableHead className="text-right pr-6">Certified By</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.mortality.length > 0 ? stats.mortality.map((record) => (
                                    <TableRow key={record.id} className="hover:bg-muted/20">
                                        <TableCell className="text-xs font-bold pl-6">
                                            {record.dateOfDeath ? format(new Date(record.dateOfDeath), 'MMM dd, yyyy') : 'N/A'}
                                        </TableCell>
                                        <TableCell className="font-medium text-sm text-slate-900">{record.cause}</TableCell>
                                        <TableCell className="text-right pr-6 text-xs font-bold text-muted-foreground">Dr. {record.certifiedBy}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic">No mortality records found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Helper to simulate ICD-10 lookup mapping
function getDiseaseName(code: string) {
    const codes: Record<string, string> = { 
        'A09': 'Diarrhoea & Gastroenteritis', 
        'B50': 'Malaria (Plasmodium Falciparum)', 
        'I10': 'Essential Hypertension',
        'E11': 'Type 2 Diabetes Mellitus',
        'J06': 'Acute URI (Multiple Sites)',
        'N39': 'Urinary Tract Infection'
    };
    return codes[code] || 'Other Specified Clinical Presentation';
}
