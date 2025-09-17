

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
import { ChevronRight, ChevronsRight, FileDown, Play, Share2 } from 'lucide-react';
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

export default function CustomReportBuilderPage() {
    const { user } = useAuth();
    const [selectedSource, setSelectedSource] = React.useState('');
    const [selectedMetrics, setSelectedMetrics] = React.useState<string[]>([]);
    const [selectedFilters, setSelectedFilters] = React.useState<any[]>([]);
    const [groupBy, setGroupBy] = React.useState('');
    const [results, setResults] = React.useState<any[] | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);

    const sourceFields = dataSources.find(ds => ds.id === selectedSource)?.fields || [];
    
    const handleRunReport = async (report?: SavedReport) => {
        const queryDetails = report ? report.queryDetails : { selectedSource, selectedMetrics, selectedFilters, groupBy };
        
        if (!queryDetails.collections || queryDetails.collections.length === 0) {
            toast.error('Please select a data source and at least one metric.');
            return;
        }
        setIsLoading(true);
        setResults(null);
        
        // In a real app, this would call the generateCustomReport Cloud Function
        console.log('Running report with:', queryDetails);
        
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
        
        // Mock results based on selection
        let mockResults = [];
        if (queryDetails.collections[0] === 'admissions' && queryDetails.groupBy === 'ward') {
            mockResults = [
                { ward: 'Cardiology', count: 50 },
                { ward: 'General Ward', count: 120 },
                { ward: 'Maternity', count: 30 },
            ];
        } else {
            mockResults = [
                { result_1: 'Value A', result_2: 123 },
                { result_1: 'Value B', result_2: 456 },
            ];
        }

        setResults(mockResults);
        setIsLoading(false);
    };

    const handleSaveReport = () => {
        // In a real app, this would call the saveReportTemplate Cloud Function
        toast.success('Report template has been saved to your personal dashboard.');
    };

    const userReports = mockSavedReports.filter(r => r.userId === user?.uid);


    return (
        <div className="space-y-6">
             <div>
                <h1 className="text-3xl font-bold">Ad-hoc Report Builder</h1>
                <p className="text-muted-foreground">
                    Create and run your own custom reports from the hospital's data.
                </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* -- Configuration Pane -- */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">1</span>Data Source</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Select onValueChange={setSelectedSource}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a data source..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {dataSources.map(ds => <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">2</span>Metrics & Filters</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Metrics</Label>
                                <div className="space-y-2 mt-2">
                                    {metricsOptions.map(m => (
                                        <div key={m.id} className="flex items-center space-x-2">
                                            <Checkbox id={`metric-${m.id}`} onCheckedChange={(checked) => {
                                                setSelectedMetrics(prev => checked ? [...prev, m.id] : prev.filter(p => p !== m.id))
                                            }} />
                                            <Label htmlFor={`metric-${m.id}`} className="font-normal">{m.name}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <Label>Filters</Label>
                                <div className="mt-2 space-y-2">
                                    <Input placeholder="e.g., Status == 'Admitted'" disabled />
                                     <Button variant="outline" size="sm" disabled>Add Filter</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">3</span>Grouping</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Select onValueChange={setGroupBy} disabled={!selectedSource}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Group results by..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {sourceFields.map(field => <SelectItem key={field} value={field}>{field}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>
                </div>

                {/* -- Results Pane -- */}
                <div className="lg:col-span-3">
                     <Card className="h-full">
                        <CardHeader>
                             <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div>
                                    <CardTitle>Report Results</CardTitle>
                                    <CardDescription>Click 'Run Report' to see your results here.</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                     <Button variant="outline" onClick={handleSaveReport} disabled={!results}>
                                        <FileDown className="h-4 w-4 mr-2" />
                                        Save Report Template
                                    </Button>
                                    <Button onClick={() => handleRunReport()} disabled={isLoading}>
                                        <Play className="h-4 w-4 mr-2" />
                                        {isLoading ? 'Running...' : 'Run Report'}
                                    </Button>
                                </div>
                             </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading && <p className="text-center text-muted-foreground">Generating report...</p>}
                            {!isLoading && !results && (
                                <div className="h-96 flex items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                                    <p className="text-muted-foreground">Your results will be displayed here.</p>
                                </div>
                            )}
                            {results && (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {Object.keys(results[0]).map(key => <TableHead key={key}>{key}</TableHead>)}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {results.map((row, index) => (
                                                <TableRow key={index}>
                                                    {Object.values(row).map((value, i) => <TableCell key={i}>{value as any}</TableCell>)}
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

             <Card>
                <CardHeader>
                    <CardTitle>Saved Reports Library</CardTitle>
                    <CardDescription>Re-run your frequently used custom reports with a single click.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Report Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {userReports.map(report => (
                                    <TableRow key={report.reportId}>
                                        <TableCell className="font-medium">{report.reportName}</TableCell>
                                        <TableCell className="text-muted-foreground">{report.description}</TableCell>
                                        <TableCell className="space-x-2">
                                            <Button size="sm" onClick={() => handleRunReport(report)}>
                                                <Play className="h-4 w-4 mr-2" /> Run
                                            </Button>
                                            <Button size="sm" variant="outline" disabled>
                                                <Share2 className="h-4 w-4 mr-2" /> Share
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
