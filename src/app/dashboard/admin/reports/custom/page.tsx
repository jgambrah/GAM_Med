'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { FileDown, Play, Share2, ShieldCheck, Loader2 } from 'lucide-react';
import { mockSavedReports } from '@/lib/data';
import { SavedReport } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

const dataSources = [
    { id: 'invoices', name: 'Invoices', fields: ['status', 'patientType', 'totalAmount', 'issueDate'] },
    { id: 'admissions', name: 'Admissions', fields: ['ward', 'type', 'attending_doctor_name', 'status'] },
    { id: 'lab_orders', name: 'Lab Orders', fields: ['status', 'testName', 'orderedByDoctorId'] },
];

const metricsOptions = [
    { id: 'count', name: 'Count of Records' },
    { id: 'sum', name: 'Sum of a Field' },
    { id: 'avg', name: 'Average of a Field' },
];

/**
 * == SaaS Ad-hoc Report Builder ==
 * 
 * Allows directors to perform complex queries. 
 * The system automatically injects the hospitalId to ensure 
 * logical isolation of cross-sectional data.
 */
export default function CustomReportBuilderPage() {
    const { user } = useAuth();
    const [selectedSource, setSelectedSource] = React.useState('');
    const [selectedMetrics, setSelectedMetrics] = React.useState<string[]>([]);
    const [groupBy, setGroupBy] = React.useState('');
    const [results, setResults] = React.useState<any[] | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);

    const sourceFields = dataSources.find(ds => ds.id === selectedSource)?.fields || [];
    
    const handleRunReport = async (report?: SavedReport) => {
        if (!user?.hospitalId) {
            toast.error("Security Context Missing. Access Denied.");
            return;
        }

        const queryDetails = report ? report.queryDetails : { 
            collections: [selectedSource], 
            metrics: selectedMetrics, 
            groupBy,
            hospitalId: user.hospitalId // MANDATORY SAAS STAMP
        };
        
        if (!queryDetails.collections || queryDetails.collections.length === 0 || queryDetails.collections[0] === '') {
            toast.error('Please select a data source.');
            return;
        }

        setIsLoading(true);
        setResults(null);
        
        // CONCEPTUAL: In production, this calls a Cloud Function that executes 
        // the query scoped by the hospitalId parameter.
        console.log(`Executing Facility-Locked Query for ${user.hospitalId}:`, queryDetails);
        
        await new Promise(resolve => setTimeout(resolve, 1500)); 
        
        // Mock results strictly based on the user's hospital context
        const mockResults = [
            { [queryDetails.groupBy || 'Dimension']: 'Facility Result A', value: 1250.00, count: 42 },
            { [queryDetails.groupBy || 'Dimension']: 'Facility Result B', value: 3400.50, count: 18 },
        ];

        setResults(mockResults);
        setIsLoading(false);
    };

    if (!user) return null;

    return (
        <div className="space-y-6">
             <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Ad-hoc Insights Builder</h1>
                    <p className="text-muted-foreground font-medium italic">
                        Strategic data mining for <strong>{user.hospitalId}</strong>
                    </p>
                </div>
                <Badge variant="outline" className="h-8 px-4 border-blue-200 text-blue-700 bg-blue-50 font-black uppercase tracking-widest">
                    <ShieldCheck className="h-3 w-3 mr-2" />
                    Logical Isolation Enabled
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card className="shadow-sm ring-1 ring-slate-200 border-none">
                        <CardHeader className="bg-muted/30 pb-4">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">1. Choose Dataset</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                             <Select onValueChange={setSelectedSource}>
                                <SelectTrigger className="h-11 bg-white">
                                    <SelectValue placeholder="Select Data Source" />
                                </SelectTrigger>
                                <SelectContent>
                                    {dataSources.map(ds => <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>

                     <Card className="shadow-sm ring-1 ring-slate-200 border-none">
                        <CardHeader className="bg-muted/30 pb-4">
                             <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">2. Aggregation Logic</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="space-y-2">
                                {metricsOptions.map(m => (
                                    <div key={m.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md transition-colors">
                                        <Checkbox id={`metric-${m.id}`} onCheckedChange={(checked) => {
                                            setSelectedMetrics(prev => checked ? [...prev, m.id] : prev.filter(p => p !== m.id))
                                        }} />
                                        <Label htmlFor={`metric-${m.id}`} className="text-xs font-bold text-slate-700">{m.name}</Label>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                     <Card className="shadow-sm ring-1 ring-slate-200 border-none">
                        <CardHeader className="bg-muted/30 pb-4">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">3. Visual Grouping</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                             <Select onValueChange={setGroupBy} disabled={!selectedSource}>
                                <SelectTrigger className="h-11 bg-white">
                                    <SelectValue placeholder="Group Results By..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {sourceFields.map(field => <SelectItem key={field} value={field}>{field}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-3">
                     <Card className="h-full shadow-lg border-none ring-1 ring-slate-200 overflow-hidden">
                        <CardHeader className="bg-slate-900 text-white pb-6">
                             <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div>
                                    <CardTitle className="text-lg">Report Output</CardTitle>
                                    <CardDescription className="text-slate-400 text-xs">Cross-sectional results strictly scoped to {user.hospitalId}.</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={() => handleRunReport()} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 font-bold uppercase text-[10px] tracking-widest px-6">
                                        {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Play className="h-3 w-3 mr-2" />}
                                        Run Query
                                    </Button>
                                </div>
                             </div>
                        </CardHeader>
                        <CardContent className="pt-8">
                            {isLoading && (
                                <div className="h-96 flex flex-col items-center justify-center text-center">
                                    <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
                                    <p className="text-sm font-bold text-slate-900 uppercase tracking-widest animate-pulse">Querying Facility Vault...</p>
                                </div>
                            )}
                            {!isLoading && !results && (
                                <div className="h-96 flex flex-col items-center justify-center text-center p-8 border-4 border-dashed rounded-3xl bg-muted/5 opacity-40">
                                    <Play className="h-16 w-16 mb-4 text-slate-300" />
                                    <h3 className="text-xl font-bold text-slate-900">Ready to Query</h3>
                                    <p className="text-sm text-muted-foreground mt-2">Configure your metrics and click 'Run Query' to begin data mining.</p>
                                </div>
                            )}
                            {results && (
                                <div className="rounded-xl border overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow>
                                                {Object.keys(results[0]).map(key => (
                                                    <TableHead key={key} className="text-[10px] font-black uppercase tracking-widest">{key}</TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {results.map((row, index) => (
                                                <TableRow key={index} className="hover:bg-muted/20">
                                                    {Object.values(row).map((value, i) => (
                                                        <TableCell key={i} className="font-bold text-sm">{typeof value === 'number' ? `₵${value.toLocaleString()}` : (value as any)}</TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}