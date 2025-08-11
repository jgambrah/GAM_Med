
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { LabResult } from '@/lib/types';
import { useParams } from 'next/navigation';
import { mockLabResults as allMockLabResults } from '@/lib/data';


const getStatusVariant = (status: LabResult['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Completed': return 'secondary';
        case 'Ordered': return 'default';
        case 'In Progress': return 'outline';
        default: return 'outline';
    }
}

export function LabResultsTab() {
    const params = useParams();
    const patientId = params.patientId as string;
    
    // In a real application, this data would come from a real-time listener
    // on the /patients/{patientId}/lab_results sub-collection.
    const mockLabResults = allMockLabResults.filter(lr => lr.patientId === patientId);
    
    return (
         <Card>
            <CardHeader>
                <CardTitle>Lab Results</CardTitle>
                <CardDescription>A record of all laboratory tests and their results.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Test Name</TableHead>
                                <TableHead>Ordered</TableHead>
                                <TableHead>Completed</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockLabResults.length > 0 ? (
                                mockLabResults.map((result) => (
                                    <TableRow key={result.testId}>
                                        <TableCell className="font-medium">{result.testName}</TableCell>
                                        <TableCell>{format(new Date(result.orderedAt), 'PPP p')}</TableCell>
                                        <TableCell>{result.completedAt ? format(new Date(result.completedAt), 'PPP p') : 'N/A'}</TableCell>
                                        <TableCell><Badge variant={getStatusVariant(result.status)}>{result.status}</Badge></TableCell>
                                        <TableCell>
                                            <Button variant="outline" size="sm" disabled={result.status !== 'Completed'}>
                                                View Result
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                 <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No lab results found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
