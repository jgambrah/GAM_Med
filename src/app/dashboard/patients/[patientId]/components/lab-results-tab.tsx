'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { LabResult } from '@/lib/types';
import { useParams } from 'next/navigation';
import { Download, Loader2 } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';

export function LabResultsTab() {
    const params = useParams();
    const patientId = params.patientId as string;
    const { user } = useAuth();
    const firestore = useFirestore();
    
    // LIVE QUERY: Real-time lab results
    const labQuery = useMemoFirebase(() => {
        if (!firestore || !patientId || !user?.hospitalId) return null;
        return query(
            collection(firestore, 'lab_results'),
            where('hospitalId', '==', user.hospitalId),
            where('patientId', '==', patientId),
            orderBy('orderedAt', 'desc')
        );
    }, [firestore, patientId, user?.hospitalId]);

    const { data: labResults, isLoading } = useCollection<LabResult>(labQuery);
    
    return (
         <Card>
            <CardHeader>
                <CardTitle>Laboratory History</CardTitle>
                <CardDescription>Validated test results.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Test</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={3} className="text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></TableCell></TableRow>
                            ) : labResults && labResults.length > 0 ? (
                                labResults.map((result) => (
                                    <TableRow key={result.id}>
                                        <TableCell className="text-sm font-medium">{result.testName}</TableCell>
                                        <TableCell><Badge variant="outline" className="text-[10px]">{result.status}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            {result.resultPdfUrl && (
                                                <Button variant="ghost" size="icon" asChild>
                                                    <a href={result.resultPdfUrl} target="_blank"><Download className="h-4 w-4" /></a>
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                 <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">None.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
