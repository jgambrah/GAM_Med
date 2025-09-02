
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { mockControlledSubstances } from '@/lib/data';
import { ControlledSubstance } from '@/lib/types';
import { TransactionLogDialog } from './components/transaction-log-dialog';
import { LogTransactionDialog } from './components/log-transaction-dialog';
import { DownloadCloud } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function ControlledSubstancesPage() {
    const [substances, setSubstances] = React.useState<ControlledSubstance[]>(mockControlledSubstances);
    const [selectedSubstance, setSelectedSubstance] = React.useState<ControlledSubstance | null>(null);
    const [transactionSubstance, setTransactionSubstance] = React.useState<ControlledSubstance | null>(null);
    const [isGenerating, setIsGenerating] = React.useState(false);

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        toast.info('Generating compliance report...', {
            description: 'This may take a few moments.'
        });
        
        // Simulate the backend report generation process
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        toast.success('Report Generated & Submitted', {
            description: 'The compliance report for the previous month has been submitted.'
        });
        setIsGenerating(false);
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Controlled Substances</h1>
                        <p className="text-muted-foreground">
                            Secure inventory and audit log for narcotics and controlled substances.
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Compliance Reporting</CardTitle>
                        <CardDescription>
                            Generate and submit reports for regulatory bodies.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">
                            Last Submitted Report: <strong>{format(new Date('2024-08-01T09:00:00Z'), 'PPP')}</strong> (for July 2024 period).
                        </p>
                    </CardContent>
                    <CardFooter>
                         <Button onClick={handleGenerateReport} disabled={isGenerating}>
                            <DownloadCloud className="h-4 w-4 mr-2" />
                            {isGenerating ? 'Generating...' : 'Generate & Submit Monthly Report'}
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Secure Inventory</CardTitle>
                        <CardDescription>
                            A real-time list of all controlled substances.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Substance Name</TableHead>
                                        <TableHead>Strength</TableHead>
                                        <TableHead>Form</TableHead>
                                        <TableHead className="text-right">Total Quantity</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {substances.map((substance) => (
                                        <TableRow key={substance.substanceId}>
                                            <TableCell className="font-medium">{substance.name}</TableCell>
                                            <TableCell>{substance.strength}</TableCell>
                                            <TableCell>{substance.form}</TableCell>
                                            <TableCell className="text-right font-mono">{substance.totalQuantity} {substance.unit}(s)</TableCell>
                                            <TableCell className="space-x-2">
                                                <Button variant="outline" size="sm" onClick={() => setSelectedSubstance(substance)}>
                                                    View Log
                                                </Button>
                                                 <Button variant="default" size="sm" onClick={() => setTransactionSubstance(substance)}>
                                                    Log Transaction
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
            {selectedSubstance && (
                <TransactionLogDialog
                    substance={selectedSubstance}
                    isOpen={!!selectedSubstance}
                    onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setSelectedSubstance(null);
                        }
                    }}
                />
            )}
             {transactionSubstance && (
                <LogTransactionDialog
                    substance={transactionSubstance}
                    isOpen={!!transactionSubstance}
                    onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setTransactionSubstance(null);
                        }
                    }}
                />
            )}
        </>
    );
}
