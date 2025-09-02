
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
import { mockControlledSubstances, allUsers } from '@/lib/data';
import { ControlledSubstance } from '@/lib/types';
import { TransactionLogDialog } from './components/transaction-log-dialog';
import { LogTransactionDialog } from './components/log-transaction-dialog';

export default function ControlledSubstancesPage() {
    const [substances, setSubstances] = React.useState<ControlledSubstance[]>(mockControlledSubstances);
    const [selectedSubstance, setSelectedSubstance] = React.useState<ControlledSubstance | null>(null);
    const [transactionSubstance, setTransactionSubstance] = React.useState<ControlledSubstance | null>(null);

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
