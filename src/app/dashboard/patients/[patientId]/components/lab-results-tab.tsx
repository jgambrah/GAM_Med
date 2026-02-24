'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { LabResult, Patient } from '@/lib/types';
import { useParams } from 'next/navigation';
import { Loader2, FileText, Printer } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { useTenant } from '@/hooks/use-tenant';
import { calculateAge } from '@/lib/utils';
import { LabReportPrintable } from '@/components/laboratory/LabReportPrintable';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';

function LabReportDialog({ result, patient, hospitalName }: { result: LabResult, patient?: Patient, hospitalName: string }) {
    const handlePrint = () => {
        window.print();
    };

    const reportData = {
        ...result,
        hospitalName,
        gender: patient?.gender || 'Unknown',
        age: patient?.dob ? calculateAge(patient.dob) : 'N/A',
        patientMrn: patient?.mrn || result.patientMrn || 'N/A'
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-2 text-purple-700 hover:text-purple-800 hover:bg-purple-50">
                    <FileText className="h-4 w-4" />
                    View Report
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-full print:p-0 print:shadow-none">
                <style jsx global>{`
                    @media print {
                        body * { visibility: hidden; }
                        #lab-print-area, #lab-print-area * { visibility: visible; }
                        #lab-print-area {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                        }
                        .no-print { display: none !important; }
                    }
                `}</style>
                <div id="lab-print-area">
                    <LabReportPrintable report={reportData} />
                </div>
                <DialogFooter className="no-print border-t pt-4">
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={handlePrint}>
                            <Printer className="h-4 w-4 mr-2" />
                            Print Formal Report
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function LabResultsTab({ patientId: propPatientId, patient: propPatient }: { patientId?: string, patient?: Patient }) {
    const params = useParams();
    const patientId = propPatientId || params.patientId as string;
    const { user } = useAuth();
    const { hospitalName } = useTenant();
    const firestore = useFirestore();

    // Fetch patient if not provided (essential for portal view)
    const patientRef = useMemoFirebase(() => {
        if (!firestore || !patientId) return null;
        return doc(firestore, 'patients', patientId);
    }, [firestore, patientId]);
    const { data: fetchedPatient } = useDoc<Patient>(patientRef);
    
    const activePatient = propPatient || fetchedPatient;
    
    const labQuery = useMemoFirebase(() => {
        if (!firestore || !patientId || !user?.hospitalId) return null;
        return query(
            collection(firestore, 'lab_orders'),
            where('hospitalId', '==', user.hospitalId),
            where('patientId', '==', patientId),
            orderBy('orderedAt', 'desc')
        );
    }, [firestore, patientId, user?.hospitalId]);

    const { data: labResults, isLoading } = useCollection<LabResult>(labQuery);
    
    return (
         <Card className="shadow-sm border-t-4 border-t-purple-500">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg font-bold">Diagnostic History</CardTitle>
                    <CardDescription className="text-xs uppercase font-black tracking-widest">Official Laboratory Records</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-xl border overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="text-xs font-black uppercase">Test Description</TableHead>
                                <TableHead className="text-xs font-black uppercase">Status</TableHead>
                                <TableHead className="text-xs font-black uppercase">Completed</TableHead>
                                <TableHead className="text-right pr-6 text-xs font-black uppercase">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                            ) : labResults && labResults.length > 0 ? (
                                labResults.map((result) => (
                                    <TableRow key={result.id} className="hover:bg-muted/20 transition-colors">
                                        <TableCell>
                                            <p className="font-bold text-slate-900">{result.testName}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono">Ref: {result.id.slice(0,8).toUpperCase()}</p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={result.status === 'Completed' || result.status === 'Validated' ? 'secondary' : 'outline'} className="text-[9px] uppercase font-black tracking-tighter">
                                                {result.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs font-medium text-muted-foreground">
                                            {result.completedAt ? format(new Date(result.completedAt), 'MMM dd, yyyy') : 'Processing'}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            {result.status === 'Completed' || result.status === 'Validated' || result.status === 'Final' ? (
                                                <LabReportDialog 
                                                    result={result} 
                                                    patient={activePatient || undefined} 
                                                    hospitalName={hospitalName} 
                                                />
                                            ) : (
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase italic">Pending Result</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                 <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">No diagnostic results found for this chart.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
