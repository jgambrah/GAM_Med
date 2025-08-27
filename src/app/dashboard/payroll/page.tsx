
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
import { mockPayrollRuns } from '@/lib/data';
import { PayrollRun, PayrollRecord } from '@/lib/types';
import { format } from 'date-fns';
import { Download, WalletCards } from 'lucide-react';
import { StartPayrollRunDialog } from './components/start-payroll-run-dialog';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PayrollConfigurationDashboard } from './components/payroll-configuration';

function getStatusVariant(status: PayrollRun['status']): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'Processing': return 'default';
    case 'Review': return 'outline';
    case 'Completed': return 'secondary';
    case 'Posted': return 'secondary';
    default: return 'outline';
  }
}

function PayrollDetailsDialog({ run, records }: { run: PayrollRun, records: PayrollRecord[] }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">View Details</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Payroll Details: {run.payPeriod}</DialogTitle>
          <DialogDescription>
            A detailed breakdown of the payroll run. Current status: {run.status}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
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
        </div>
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayrollRunsDashboard() {
    const { toast } = useToast();
    const [runs, setRuns] = React.useState<PayrollRun[]>(mockPayrollRuns);
    const [runRecords, setRunRecords] = React.useState<Record<string, PayrollRecord[]>>({});

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
         toast.success('Payroll Run Processed', {
            description: `Payroll for ${newRun.payPeriod} is ready for your review.`
        });
      } else {
         toast.info('Payroll Run Started', {
            description: `Payroll for ${newRun.payPeriod} is now processing...`
        });
      }
    };
    
    const handleFinalize = (runId: string) => {
        setRuns(prev => prev.map(run => 
            run.runId === runId ? { ...run, status: 'Completed' } : run
        ));
         toast.success('Payroll Finalized', {
            description: `Payroll run ${runId} has been finalized and posted to the ledger.`
        });
    }

  return (
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
                          <PayrollDetailsDialog run={run} records={runRecords[run.runId] || []} />
                      )}
                      {run.status === 'Review' && (
                           <Button size="sm" onClick={() => handleFinalize(run.runId)}>
                              <WalletCards className="h-4 w-4 mr-2" />
                              Finalize & Post
                          </Button>
                      )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
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
            <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>
        <TabsContent value="runs" className="mt-4">
            <PayrollRunsDashboard />
        </TabsContent>
        <TabsContent value="config" className="mt-4">
            <PayrollConfigurationDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
