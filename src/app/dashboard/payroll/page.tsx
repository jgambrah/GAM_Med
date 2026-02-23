
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { mockPayrollRuns, mockLedgerAccounts, mockLedgerEntries } from '@/lib/data';
import { PayrollRun, PayrollRecord, LedgerAccount, LedgerEntry } from '@/lib/types';
import { format } from 'date-fns';
import { Download, WalletCards } from 'lucide-react';
import { StartPayrollRunDialog } from './components/start-payroll-run-dialog';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PayrollConfigurationDashboard } from './components/payroll-configuration';
import { PayrollAllowancesDashboard } from './components/payroll-allowances';
import { PayrollDeductionsDashboard } from './components/payroll-deductions';
import { LedgerPostingDialog } from '../admin/components/ledger-posting-dialog';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { z } from 'zod';

const PostingSchema = z.object({
  debitAccountId: z.string().min(1, 'Debit account is required.'),
  creditAccountId: z.string().min(1, 'Credit account is required.'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than zero.'),
  description: z.string().min(3, 'Description is required.'),
  paymentMethod: z.enum(['Cheque', 'Bank Transfer']),
  chequeNumber: z.string().optional(),
});

function getStatusVariant(status: PayrollRun['status']): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'Processing': return 'default';
    case 'Review': return 'outline';
    case 'Completed': return 'default';
    case 'Posted': return 'secondary';
    default: return 'outline';
  }
}

interface PayrollDetailsDialogProps {
  run: PayrollRun;
  records: PayrollRecord[];
  onFinalize: (runId: string) => void;
  onPostToLedger: (run: PayrollRun) => void;
}

function PayrollDetailsDialog({ run, records, onFinalize, onPostToLedger }: PayrollDetailsDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [postingRemittanceInfo, setPostingRemittanceInfo] = React.useState<{ name: string; amount: number } | null>(null);
  const [accounts, setAccounts] = useLocalStorage<LedgerAccount[]>('ledgerAccounts', mockLedgerAccounts);
  const [entries, setEntries] = useLocalStorage<LedgerEntry[]>('ledgerEntries', mockLedgerEntries);

  const handlePostRemittance = (name: string, amount: number) => {
    setPostingRemittanceInfo({ name, amount });
  };

  const handleRemittanceDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      setPostingRemittanceInfo(null);
    }
  }

  const handlePostRemittanceToLedger = async (values: z.infer<typeof PostingSchema>) => {
    const { debitAccountId, creditAccountId, amount, paymentMethod, chequeNumber } = values;

    try {
        const now = new Date().toISOString();
        const debitAccount = accounts.find(a => a.accountId === debitAccountId);
        const creditAccount = accounts.find(a => a.accountId === creditAccountId);

        if (!debitAccount || !creditAccount) {
            toast.error("One or more accounts not found for ledger posting.");
            return;
        }
        
        let finalDescription = values.description;
        if (paymentMethod === 'Cheque' && chequeNumber) {
            finalDescription = `${finalDescription} (Cheque No: ${chequeNumber})`;
        } else if (paymentMethod === 'Bank Transfer') {
            finalDescription = `${finalDescription} (Bank Transfer)`;
        }

        const newDebitEntry: LedgerEntry = { entryId: `entry-${Date.now()}-dr`, accountId: debitAccountId, date: now, description: finalDescription, debit: amount };
        const newCreditEntry: LedgerEntry = { entryId: `entry-${Date.now()}-cr`, accountId: creditAccountId, date: now, description: finalDescription, credit: amount };
        
        setEntries(prev => [...prev, newDebitEntry, newCreditEntry]);

        setAccounts(prev => prev.map(acc => {
            let balanceChange = 0;
            if (acc.accountId === debitAccountId) {
                const isDebitType = ['Asset', 'Expense'].includes(acc.accountType);
                balanceChange = isDebitType ? amount : -amount;
            } else if (acc.accountId === creditAccountId) {
                const isDebitType = ['Asset', 'Expense'].includes(acc.accountType);
                balanceChange = isDebitType ? -amount : amount;
            }
            return balanceChange !== 0 ? { ...acc, balance: acc.balance + balanceChange } : acc;
        }));
        
        toast.success("Remittance Posted", { description: `${finalDescription} for ₵${amount.toFixed(2)}` });
    } catch (e) {
        console.error(e);
        toast.error("Failed to post remittance.");
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">View Details</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Payroll Details: {run.payPeriod}</DialogTitle>
          <DialogDescription>
            A detailed breakdown of the payroll run. Current status: {run.status}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
           <Tabs defaultValue="details">
            <TabsList>
                <TabsTrigger value="details">Payroll Breakdown</TabsTrigger>
                <TabsTrigger value="remittance">Remittance Summary</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-4">
                <div className="grid grid-cols-4 gap-4 mb-4 text-center">
                    <div>
                    <p className="text-sm text-muted-foreground">Total Gross Pay</p>
                    <p className="text-xl font-bold">₵{run.totalGrossPay.toFixed(2)}</p>
                    </div>
                    <div>
                    <p className="text-sm text-muted-foreground">Total Deductions</p>
                    <p className="text-xl font-bold">₵{run.totalDeductions.toFixed(2)}</p>
                    </div>
                    <div>
                    <p className="text-sm text-muted-foreground">Total Tax (PAYE)</p>
                    <p className="text-xl font-bold">₵{run.totalTaxes.toFixed(2)}</p>
                    </div>
                    <div>
                    <p className="text-sm text-muted-foreground">Total Net Pay</p>
                    <p className="text-xl font-bold text-primary">₵{run.totalNetPay.toFixed(2)}</p>
                    </div>
                </div>
                <ScrollArea className="h-96">
                    <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Staff Name</TableHead>
                            <TableHead>Gross Pay</TableHead>
                            <TableHead>Tax</TableHead>
                            <TableHead>Deductions</TableHead>
                            <TableHead>Net Pay</TableHead>
                            <TableHead>Payslip</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {records.map(record => (
                            <TableRow key={record.recordId}>
                            <TableCell className="font-medium">{record.staffName}</TableCell>
                            <TableCell>₵{record.grossPay.toFixed(2)}</TableCell>
                            <TableCell>₵{record.taxAmount.toFixed(2)}</TableCell>
                            <TableCell>₵{(Object.values(record.deductions).reduce((a, b) => a + b, 0)).toFixed(2)}</TableCell>
                            <TableCell className="font-bold">₵{record.netPay.toFixed(2)}</TableCell>
                            <TableCell>
                                <Button asChild variant="link" size="sm">
                                <a href={record.payslipUrl} target="_blank" rel="noopener noreferrer">
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                </a>
                                </Button>
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    </div>
                </ScrollArea>
            </TabsContent>
            <TabsContent value="remittance" className="mt-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>Remittance Report</CardTitle>
                        <CardDescription>Total amounts to be remitted to statutory bodies and other institutions for this pay period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Institution / Deduction Type</TableHead>
                                        <TableHead className="text-right">Amount Due (₵)</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(run.deductionTotals || {}).map(([name, amount]) => (
                                        <TableRow key={name}>
                                            <TableCell className="font-medium">{name}</TableCell>
                                            <TableCell className="text-right font-mono">{amount.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" onClick={() => handlePostRemittance(name, amount)}>Log Payment</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         </div>
                    </CardContent>
                 </Card>
            </TabsContent>
           </Tabs>
        </div>
        <DialogFooter className="justify-between">
            <div>
                {run.status === 'Completed' && (
                    <Button onClick={() => { onPostToLedger(run); setOpen(false); }}>
                        <WalletCards className="h-4 w-4 mr-2" />
                        Post to Ledger
                    </Button>
                )}
            </div>
            <div className="flex gap-2">
                 <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
                 {run.status === 'Review' && (
                    <Button onClick={() => { onFinalize(run.runId); setOpen(false); }}>
                        Finalize
                    </Button>
                )}
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
     {postingRemittanceInfo && (
        <LedgerPostingDialog 
            isOpen={!!postingRemittanceInfo}
            onOpenChange={handleRemittanceDialogClose}
            onPost={handlePostRemittanceToLedger}
            amount={postingRemittanceInfo.amount}
            description={`Remittance for ${postingRemittanceInfo.name} - ${run.payPeriod}`}
            defaultDebit="2010" // Accounts Payable
            defaultCredit="1010" // Cash and Bank
        />
    )}
    </>
  );
}

function PayrollRunsDashboard() {
    const [runs, setRuns] = React.useState<PayrollRun[]>(mockPayrollRuns);
    const [runRecords, setRunRecords] = React.useState<Record<string, PayrollRecord[]>>({});
    const [postingInfo, setPostingInfo] = React.useState<{ amount: number; description: string; runId: string; } | null>(null);
    const [accounts, setAccounts] = useLocalStorage<LedgerAccount[]>('ledgerAccounts', mockLedgerAccounts);
    const [entries, setEntries] = useLocalStorage<LedgerEntry[]>('ledgerEntries', mockLedgerEntries);

    const handlePayrollStarted = (newRun: PayrollRun, newRecords: PayrollRecord[]) => {
      setRuns(prev => {
          const existingRunIndex = prev.findIndex(r => r.runId === newRun.runId);
          if (existingRunIndex > -1) {
              const updatedRuns = [...prev];
              updatedRuns[existingRunIndex] = newRun;
              return updatedRuns;
          }
          return [newRun, ...prev];
      });

      if (newRun.status === 'Review') {
        setRunRecords(prev => ({ ...prev, [newRun.runId]: newRecords }));
        toast.success(`Payroll for ${newRun.payPeriod} is ready for your review.`);
      } else {
        toast.info(`Payroll for ${newRun.payPeriod} is now processing...`);
      }
    };
    
    const handleFinalize = (runId: string) => {
        setRuns(prev => prev.map(run => 
            run.runId === runId ? { ...run, status: 'Completed' } : run
        ));
        toast.success(`Payroll run ${runId} has been finalized. You can now post it to the ledger.`);
    };

    const handlePostToLedger = (run: PayrollRun) => {
        setPostingInfo({
            amount: run.totalGrossPay,
            description: `Payroll for ${run.payPeriod}`,
            runId: run.runId,
        });
    };

    const handlePostToLedgerAction = async (values: z.infer<typeof PostingSchema>) => {
        const { debitAccountId, creditAccountId, amount, paymentMethod, chequeNumber } = values;

        try {
            const now = new Date().toISOString();
            const debitAccount = accounts.find(a => a.accountId === debitAccountId);
            const creditAccount = accounts.find(a => a.accountId === creditAccountId);

            if (!debitAccount || !creditAccount) {
                toast.error("One or more accounts not found for ledger posting.");
                return;
            }
            
            let finalDescription = values.description;
            if (paymentMethod === 'Cheque' && chequeNumber) {
                finalDescription = `${finalDescription} (Cheque No: ${chequeNumber})`;
            } else if (paymentMethod === 'Bank Transfer') {
                finalDescription = `${finalDescription} (Bank Transfer)`;
            }

            const newDebitEntry: LedgerEntry = { entryId: `entry-${Date.now()}-dr`, accountId: debitAccountId, date: now, description: finalDescription, debit: amount };
            const newCreditEntry: LedgerEntry = { entryId: `entry-${Date.now()}-cr`, accountId: creditAccountId, date: now, description: finalDescription, credit: amount };
            
            setEntries(prev => [...prev, newDebitEntry, newCreditEntry]);

            setAccounts(prev => prev.map(acc => {
                let balanceChange = 0;
                if (acc.accountId === debitAccountId) {
                    const isDebitType = ['Asset', 'Expense'].includes(acc.accountType);
                    balanceChange = isDebitType ? amount : -amount;
                } else if (acc.accountId === creditAccountId) {
                    const isDebitType = ['Asset', 'Expense'].includes(acc.accountType);
                    balanceChange = isDebitType ? -amount : amount;
                }
                return balanceChange !== 0 ? { ...acc, balance: acc.balance + balanceChange } : acc;
            }));
            
            toast.success("Payroll Posted", { description: `${finalDescription} for ₵${amount.toFixed(2)}` });
        } catch (e) {
            console.error(e);
            toast.error("Failed to post payroll.");
        }
    }

    const handleLedgerDialogClose = (isOpen: boolean, posted?: boolean) => {
        if (!isOpen) {
            if (posted && postingInfo) {
                setRuns(prev => prev.map(run => 
                    run.runId === postingInfo.runId ? { ...run, status: 'Posted' } : run
                ));
            }
            setPostingInfo(null);
        }
    }

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle>Payroll Run History</CardTitle>
          <CardDescription>
            A log of all initiated and completed payroll runs.
          </CardDescription>
        </div>
         <StartPayrollRunDialog onPayrollStarted={handlePayrollStarted} />
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pay Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Date Initiated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map(run => (
                <TableRow key={run.runId}>
                  <TableCell className="font-medium">{run.payPeriod}</TableCell>
                  <TableCell><Badge variant={getStatusVariant(run.status)}>{run.status}</Badge></TableCell>
                  <TableCell>₵{run.totalNetPay.toFixed(2)}</TableCell>
                  <TableCell>{run.totalEmployees}</TableCell>
                  <TableCell>{format(new Date(run.createdAt), 'PPP')}</TableCell>
                  <TableCell className="text-right space-x-2">
                      {run.status !== 'Processing' && (
                          <PayrollDetailsDialog 
                            run={run} 
                            records={runRecords[run.runId] || []}
                            onFinalize={handleFinalize}
                            onPostToLedger={handlePostToLedger}
                          />
                      )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
    {postingInfo && (
        <LedgerPostingDialog 
            isOpen={!!postingInfo}
            onOpenChange={(isOpen, posted) => handleLedgerDialogClose(isOpen, posted || false)}
            onPost={handlePostToLedgerAction}
            amount={postingInfo.amount}
            description={postingInfo.description}
            defaultDebit="5010" // Salaries and Wages (Expense)
            defaultCredit="2010" // Accounts Payable (Liability)
        />
    )}
    </>
  )
}

export default function PayrollPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payroll Management</h1>
        <p className="text-muted-foreground">
          Initiate payroll runs and configure payroll settings.
        </p>
      </div>

      <Tabs defaultValue="runs">
        <TabsList>
            <TabsTrigger value="runs">Payroll Runs</TabsTrigger>
            <TabsTrigger value="config">Statutory Configuration</TabsTrigger>
            <TabsTrigger value="allowances">Allowances</TabsTrigger>
            <TabsTrigger value="deductions">Deductions</TabsTrigger>
        </TabsList>
        <TabsContent value="runs" className="mt-4">
            <PayrollRunsDashboard />
        </TabsContent>
        <TabsContent value="config" className="mt-4">
            <PayrollConfigurationDashboard />
        </TabsContent>
        <TabsContent value="allowances" className="mt-4">
            <PayrollAllowancesDashboard />
        </TabsContent>
         <TabsContent value="deductions" className="mt-4">
            <PayrollDeductionsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
