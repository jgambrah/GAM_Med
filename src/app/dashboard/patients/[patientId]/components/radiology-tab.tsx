'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { RadiologyOrder, RadiologyReport } from '@/lib/types';
import { mockRadiologyOrders, mockRadiologyReports } from '@/lib/data';
import { Download, ScanEye } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useLocalStorage } from '@/hooks/use-local-storage';

const getStatusVariant = (status: RadiologyOrder['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Completed': return 'secondary';
        case 'Pending Scheduling': return 'default';
        case 'Scheduled': return 'outline';
        case 'Awaiting Report': return 'outline';
        default: return 'outline';
    }
}

export function RadiologyTab({ patientId }: { patientId: string }) {
    const { user } = useAuth();
    
    // In a real app, these would be Firestore queries.
    const [patientOrders] = useLocalStorage<RadiologyOrder[]>(
        'radiologyOrders', 
        mockRadiologyOrders
    );
    const [patientReports] = useLocalStorage<RadiologyReport[]>(
        'radiologyReports', 
        mockRadiologyReports
    );

    const ordersForPatient = patientOrders.filter(o => o.patientId === patientId);

    return (
         <Card>
            <CardHeader>
                <CardTitle>Imaging History</CardTitle>
                <CardDescription>A record of all your radiology and imaging studies.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Study</TableHead>
                                <TableHead>Ordered</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ordersForPatient.length > 0 ? (
                                ordersForPatient.map((order) => {
                                    const report = patientReports.find(r => r.orderId === order.orderId);
                                    return (
                                        <TableRow key={order.orderId}>
                                            <TableCell className="font-medium">{order.studyIds.join(', ')}</TableCell>
                                            <TableCell>{format(new Date(order.dateOrdered), 'PPP')}</TableCell>
                                            <TableCell><Badge variant={getStatusVariant(order.status)}>{order.status}</Badge></TableCell>
                                            <TableCell className="text-right space-x-2">
                                                 <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    disabled={!report?.pacsLink}
                                                    asChild
                                                >
                                                    <a href={report?.pacsLink || '#'} target="_blank" rel="noopener noreferrer">
                                                        <ScanEye className="h-3 w-3 mr-2" />
                                                        View Images
                                                    </a>
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    disabled={!report?.reportPdfUrl}
                                                    asChild
                                                >
                                                    <a href={report?.reportPdfUrl || '#'} target="_blank" rel="noopener noreferrer">
                                                        <Download className="h-3 w-3 mr-2" />
                                                        Report
                                                    </a>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                 <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No imaging studies found.
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
