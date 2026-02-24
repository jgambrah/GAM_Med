'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { LabResult, LabParameter } from '@/lib/types';
import { useParams } from 'next/navigation';
import { Download, Loader2, FileText, Printer } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

function LabReportDialog({ result }: { result: LabResult }) {
    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-2 text-purple-700 hover:text-purple-800 hover:bg-purple-50">
                    <FileText className="h-4 w-4" />
                    View Report
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-full print:p-0 print:shadow-none">
                <style jsx global>{`
                    @media print {
                        body * { visibility: hidden; }
                        #lab-print-section, #lab-report-content * { visibility: visible; }
                        #lab-print-section {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            padding: 2rem;
                        }
                        .no-print { display: none !important; }
                    }
                `}</style>
                <div id="lab-print-section" className="space-y-8 py-4">
                    <DialogHeader className="text-center space-y-1">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded bg-purple-600 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-white" />
                            </div>
                            <DialogTitle className="text-2xl font-black tracking-tight uppercase">Formal Laboratory Return</DialogTitle>
                        </div>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Official Clinical Diagnostic Report
                        </DialogDescription>
                    </DialogHeader>

                    {/* Patient Header Block */}
                    <div className="grid grid-cols-2 gap-8 border p-6 rounded-xl bg-muted/10">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Patient Information</p>
                            <p className="text-lg font-bold leading-none">{result.patientName}</p>
                            <p className="text-xs font-mono">MRN: {result.patientMrn || 'N/A'}</p>
                        </div>
                        <div className="text-right space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Order Details</p>
                            <p className="text-sm font-bold">Report ID: {result.id.toUpperCase()}</p>
                            <p className="text-xs">Ordered: {format(new Date(result.orderedAt), 'PPP p')}</p>
                            <p className="text-xs">Completed: {result.completedAt ? format(new Date(result.completedAt), 'PPP p') : 'N/A'}</p>
                        </div>
                    </div>

                    <div id="lab-report-content">
                        <h3 className="text-lg font-black uppercase tracking-tight mb-4 border-b-2 border-purple-600 inline-block">
                            {result.testName}
                        </h3>
                        <div className="rounded-xl border shadow-sm overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-bold text-xs uppercase">Parameter</TableHead>
                                        <TableHead className="text-right font-bold text-xs uppercase">Result</TableHead>
                                        <TableHead className="font-bold text-xs uppercase">Unit</TableHead>
                                        <TableHead className="font-bold text-xs uppercase">Ref. Range</TableHead>
                                        <TableHead className="text-center font-bold text-xs uppercase">Flag</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {result.parameters && result.parameters.length > 0 ? (
                                        result.parameters.map((param, i) => (
                                            <TableRow key={i} className={param.flag !== 'Normal' ? 'bg-orange-50/30' : ''}>
                                                <TableCell className="font-semibold text-sm">{param.name}</TableCell>
                                                <TableCell className={`text-right font-black font-mono text-sm ${param.flag !== 'Normal' ? 'text-destructive' : 'text-slate-900'}`}>
                                                    {param.value}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{param.unit}</TableCell>
                                                <TableCell className="text-xs font-medium">{param.range}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge 
                                                        variant={param.flag === 'Normal' ? 'secondary' : 'destructive'}
                                                        className="text-[9px] font-black uppercase tracking-tighter px-1.5 h-5"
                                                    >
                                                        {param.flag}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-12 text-sm text-muted-foreground italic">
                                                No structured parameters found. Summary: {result.resultDetails || 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Report Footer */}
                    <div className="pt-8 border-t space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            <div>
                                <p>Verified By</p>
                                <p className="text-slate-900 mt-1">Automated System / {result.completedBy || 'Lab Staff'}</p>
                            </div>
                            <div className="text-right">
                                <p>Electronic Signature</p>
                                <p className="text-slate-900 mt-1 font-mono">{result.id.slice(0,16).toUpperCase()}</p>
                            </div>
                        </div>
                        <p className="text-[9px] text-center text-muted-foreground italic">
                            This report is for clinical use only. All critical values have been verbally communicated to the ordering physician.
                        </p>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6 no-print">
                    <Button variant="outline" onClick={handlePrint}>
                        <Printer className="h-4 w-4 mr-2" />
                        Print Report
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function LabResultsTab() {
    const params = useParams();
    const patientId = params.patientId as string;
    const { user } = useAuth();
    const firestore = useFirestore();
    
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
                    <CardDescription className="text-xs uppercase font-black tracking-widest">Formal Laboratory Returns</CardDescription>
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
                                            <p className="text-[10px] text-muted-foreground font-mono">Ref: {result.id.slice(0,8)}</p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={result.status === 'Completed' ? 'secondary' : 'outline'} className="text-[9px] uppercase font-black tracking-tighter">
                                                {result.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs font-medium text-muted-foreground">
                                            {result.completedAt ? format(new Date(result.completedAt), 'MMM dd, yyyy') : 'Pending'}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            {result.status === 'Completed' ? (
                                                <LabReportDialog result={result} />
                                            ) : (
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Processing...</span>
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
