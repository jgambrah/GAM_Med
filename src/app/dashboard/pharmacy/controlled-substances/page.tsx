
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ControlledSubstance, ControlledSubstanceLog } from '@/lib/types';
import { TransactionLogDialog } from './components/transaction-log-dialog';
import { LogNarcoticTransaction } from '@/components/pharmacy/LogNarcoticTransaction';
import { ShieldCheck, History, DownloadCloud, Loader2, FileText, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

/**
 * == High-Security Pharmacy: Controlled Substances (Narcotics) Dashboard ==
 * 
 * Provides a high-fidelity workspace for managing regulated substances.
 * Strictly logically isolated via the hospitalId SaaS wall.
 */
export default function ControlledSubstancesPage() {
    const { user } = useAuth();
    const firestore = useFirestore();
    const [selectedSubstance, setSelectedSubstance] = React.useState<ControlledSubstance | null>(null);
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [isReportOpen, setIsReportOpen] = React.useState(false);
    const [reportData, setReportData] = React.useState<Record<string, any> | null>(null);
    const [reportMonth, setReportMonth] = React.useState(new Date().getMonth().toString());
    const [reportYear, setReportYear] = React.useState(new Date().getFullYear().toString());

    // 1. LIVE QUERY: Listen for all regulated substances in THIS hospital
    const substancesQuery = useMemoFirebase(() => {
        if (!firestore || !user?.hospitalId) return null;
        return query(
            collection(firestore, "controlled_substances"),
            where("hospitalId", "==", user.hospitalId),
            orderBy("name", "asc")
        );
    }, [firestore, user?.hospitalId]);

    const { data: substances, isLoading } = useCollection<ControlledSubstance>(substancesQuery);

    /**
     * == REGULATORY REPORTING ENGINE ==
     * Aggregates all narcotic movements for a specific month.
     * Essential for MoH/Narcotics Board statutory returns.
     */
    const generateNarcoticReport = async () => {
        if (!firestore || !user?.hospitalId) return;
        
        setIsGenerating(true);
        const month = parseInt(reportMonth);
        const year = parseInt(reportYear);
        
        const start = new Date(year, month, 1).toISOString();
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();

        try {
            // Query the immutable audit log (SaaS Wall Enforced)
            const q = query(
                collection(firestore, "controlled_substance_logs"),
                where("hospitalId", "==", user.hospitalId),
                where("date", ">=", start),
                where("date", "<=", end)
            );

            const snap = await getDocs(q);
            
            // AGGREGATION LOGIC
            const summary: Record<string, { name: string, strength: string, dispensed: number, refilled: number, wasted: number, count: number }> = {};
            
            snap.forEach(doc => {
                const log = doc.data() as ControlledSubstanceLog;
                const sid = log.substanceId;
                
                if (!summary[sid]) {
                    summary[sid] = { 
                        name: log.substanceName || 'Unknown', 
                        strength: '', // Would normally fetch from inventory
                        dispensed: 0, 
                        refilled: 0, 
                        wasted: 0, 
                        count: 0 
                    };
                }
                
                const qty = Math.abs(log.quantityChange);
                if (log.transactionType === 'Dispense') summary[sid].dispensed += qty;
                if (log.transactionType === 'Restock') summary[sid].refilled += qty;
                if (log.transactionType === 'Waste') summary[sid].wasted += qty;
                summary[sid].count++;
            });

            setReportData(summary);
            setIsReportOpen(true);
            toast.success("Regulatory Report Compiled", {
                description: `Aggregated usage for ${Object.keys(summary).length} substances.`
            });
        } catch (error) {
            console.error("Report generation failed:", error);
            toast.error("Process Failed", { description: "Insufficient permissions to access audit records." });
        } finally {
            setIsGenerating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
        <div className="p-8 space-y-8 bg-slate-50/30 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-slate-900">
                        <ShieldCheck className="text-red-600 h-8 w-8" />
                        Controlled Substances Inventory
                    </h1>
                    <p className="text-muted-foreground font-medium italic">Regulated Narcotics Audit & Statutory Compliance for <strong>{user?.hospitalId}</strong></p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-white border rounded-lg px-3 h-10 shadow-sm">
                        <CalendarIcon size={14} className="text-muted-foreground" />
                        <Select value={reportMonth} onValueChange={setReportMonth}>
                            <SelectTrigger className="border-none shadow-none w-28 h-8 focus:ring-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {monthNames.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={reportYear} onValueChange={setReportYear}>
                            <SelectTrigger className="border-none shadow-none w-20 h-8 focus:ring-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2024">2024</SelectItem>
                                <SelectItem value="2023">2023</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={generateNarcoticReport} disabled={isGenerating} className="bg-red-600 hover:bg-red-700 shadow-md h-10 font-bold">
                        <DownloadCloud className="h-4 w-4 mr-2" />
                        {isGenerating ? 'Compiling...' : 'Run Statutory Return'}
                    </Button>
                </div>
            </div>

            <Card className="shadow-xl overflow-hidden border-none ring-1 ring-slate-200">
                <CardHeader className="bg-slate-900 text-white pb-6">
                    <CardTitle className="text-sm font-black uppercase tracking-widest opacity-80">Digital Dangerous Drugs Register (DDDR)</CardTitle>
                    <CardDescription className="text-slate-400 text-xs">Real-time balances and secure movement logs with double sign-off enforcement.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 bg-white">
                    <Table>
                        <TableHeader className="bg-slate-50 border-b">
                            <TableRow>
                                <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest">Substance Name</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Strength</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Form</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Total Quantity</TableHead>
                                <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-widest">Secure Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {substances && substances.length > 0 ? (
                                substances.map((substance) => (
                                    <TableRow key={substance.id} className="hover:bg-slate-50/80 transition-colors border-b last:border-0 h-20">
                                        <TableCell className="pl-6">
                                            <p className="font-black text-slate-900 text-base">{substance.name}</p>
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Controlled Item</p>
                                        </TableCell>
                                        <TableCell className="font-bold text-xs text-slate-600">{substance.strength}</TableCell>
                                        <TableCell className="text-[10px] font-black text-slate-500 uppercase">{substance.form}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className={`text-xl font-black font-mono leading-none ${substance.totalQuantity < 10 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
                                                    {substance.totalQuantity}
                                                </span>
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase">{substance.unit}s Rem.</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-2">
                                                <LogNarcoticTransaction substance={substance} action="Refill" />
                                                <LogNarcoticTransaction substance={substance} action="Dispense" />
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-9 w-9 text-muted-foreground hover:text-primary"
                                                    onClick={() => setSelectedSubstance(substance)}
                                                >
                                                    <History className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-40 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-30">
                                            <ShieldCheck className="h-12 w-12 mb-2" />
                                            <p className="text-sm font-medium tracking-tighter">Register is currently empty.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-4">
                <History className="h-5 w-5 text-blue-600" />
                <p className="text-xs text-blue-800 font-medium">
                    <strong>Notice:</strong> This dashboard is an immutable legal record. All movements require a witness sign-off. Register discrepancies are automatically flagged to the <strong>GamMed Compliance Monitor</strong>.
                </p>
            </div>

            {/* TRANSACTION LOG VIEWER */}
            {selectedSubstance && (
                <TransactionLogDialog
                    substance={selectedSubstance}
                    isOpen={!!selectedSubstance}
                    onOpenChange={() => setSelectedSubstance(null)}
                />
            )}

            {/* STATUTORY REPORT VIEWER */}
            <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto border-t-8 border-t-red-600">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-red-600 mb-2">
                            <FileText size={20} />
                            <DialogTitle className="font-black uppercase tracking-tighter">Statutory Narcotic Return</DialogTitle>
                        </div>
                        <DialogDescription>
                            Aggregated movements for {monthNames[parseInt(reportMonth)]} {reportYear}. Scoped to <strong>{user?.hospitalId}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="mt-4 border rounded-xl overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="text-[10px] font-black uppercase pl-6">Substance</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-right">Refilled</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-right">Dispensed</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-right">Wasted</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase pr-6 text-right">Actions Logged</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportData && Object.keys(reportData).length > 0 ? (
                                    Object.entries(reportData).map(([id, data]) => (
                                        <TableRow key={id}>
                                            <TableCell className="pl-6 font-bold text-sm">{data.name}</TableCell>
                                            <TableCell className="text-right font-mono text-green-600">+{data.refilled}</TableCell>
                                            <TableCell className="text-right font-mono text-blue-600">-{data.dispensed}</TableCell>
                                            <TableCell className="text-right font-mono text-red-600">-{data.wasted}</TableCell>
                                            <TableCell className="text-right pr-6 text-xs font-bold text-muted-foreground">{data.count}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center italic text-muted-foreground">No transactions recorded for this period.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button variant="ghost" onClick={() => setIsReportOpen(false)}>Close Review</Button>
                        <Button className="bg-slate-900 font-bold uppercase text-[10px] tracking-widest">
                            Print Formal Return
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
