
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { mockBills, mockSuppliers } from '@/lib/data';
import { Bill } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { LedgerPostingDialog } from './ledger-posting-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const getStatusVariant = (status: Bill['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Paid': return 'secondary';
        case 'Pending': return 'default';
        case 'Overdue': return 'destructive';
        default: return 'outline';
    }
}

function PayBillDialog({ bill, onPaymentLogged }: { bill: Bill, onPaymentLogged: (amount: number, description: string) => void }) {
    const [open, setOpen] = React.useState(false);
    const { toast } = useToast();
    const [taxRate, setTaxRate] = React.useState('0');
    const [customTaxRate, setCustomTaxRate] = React.useState('');

    const currentTaxRate = taxRate === 'custom' ? parseFloat(customTaxRate) / 100 : parseFloat(taxRate) / 100;
    const taxAmount = bill.totalAmount * (isNaN(currentTaxRate) ? 0 : currentTaxRate);
    const netAmount = bill.totalAmount - taxAmount;

    const handlePayBill = () => {
        // In a real app, this would call the payBill Cloud Function
        toast({
            title: "Payment Logged",
            description: `Payment for bill ${bill.billId} has been logged.`
        });
        const taxDescription = currentTaxRate > 0 ? ` (after ${currentTaxRate * 100}% WHT)` : '';
        const paymentDescription = `Payment for Bill ${bill.billId} to ${mockSuppliers.find(s => s.supplierId === bill.supplierId)?.name || 'Unknown'}${taxDescription}`;
        onPaymentLogged(netAmount, paymentDescription);
        setOpen(false);
    }

    React.useEffect(() => {
        if (!open) {
            setTaxRate('0');
            setCustomTaxRate('');
        }
    }, [open]);


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={bill.status === 'Paid'}>
                    Log Payment
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log Payment for Bill: {bill.billId}</DialogTitle>
                    <DialogDescription>
                        Confirm payment to supplier: {mockSuppliers.find(s => s.supplierId === bill.supplierId)?.name || 'Unknown'}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Total Bill Amount</Label>
                            <Input value={`₵${bill.totalAmount.toFixed(2)}`} readOnly disabled />
                        </div>
                         <div>
                            <Label>Withholding Tax Rate</Label>
                             <Select value={taxRate} onValueChange={setTaxRate}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select tax rate" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">No Tax (0%)</SelectItem>
                                    <SelectItem value="3">3%</SelectItem>
                                    <SelectItem value="5">5%</SelectItem>
                                    <SelectItem value="7.5">7.5%</SelectItem>
                                    <SelectItem value="10">10%</SelectItem>
                                    <SelectItem value="15">15%</SelectItem>
                                    <SelectItem value="20">20%</SelectItem>
                                    <SelectItem value="25">25%</SelectItem>
                                    <SelectItem value="custom">Custom Rate</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     {taxRate === 'custom' && (
                        <div>
                            <Label>Custom Tax Rate (%)</Label>
                            <Input 
                                type="number"
                                placeholder="Enter custom rate, e.g., 8"
                                value={customTaxRate}
                                onChange={(e) => setCustomTaxRate(e.target.value)}
                            />
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 rounded-md bg-muted p-4">
                         <div>
                            <Label>Tax Amount</Label>
                            <Input value={`₵${taxAmount.toFixed(2)}`} readOnly disabled />
                        </div>
                         <div>
                            <Label className="font-bold">Net Payment Due</Label>
                            <Input className="font-bold text-lg" value={`₵${netAmount.toFixed(2)}`} readOnly disabled />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handlePayBill}>Confirm Payment & Post to Ledger</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export function AccountsPayableDashboard() {
  const [postingInfo, setPostingInfo] = React.useState<{ amount: number; description: string } | null>(null);

  const totalPayables = mockBills
    .filter(b => b.status === 'Pending' || b.status === 'Overdue')
    .reduce((sum, bill) => sum + bill.totalAmount, 0);

  const overduePayables = mockBills
    .filter(b => b.status === 'Overdue')
    .reduce((sum, bill) => sum + bill.totalAmount, 0);

  const handlePaymentLogged = (amount: number, description: string) => {
    setPostingInfo({ amount, description });
  };

  return (
    <>
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Payables</CardTitle>
                    <span className="text-muted-foreground">₵</span>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₵{totalPayables.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">
                        Total amount owed to suppliers.
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Overdue Payables</CardTitle>
                     <span className="text-muted-foreground">₵</span>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">₵{overduePayables.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">
                        Total amount past due date.
                    </p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Payroll (Monthly)</CardTitle>
                     <span className="text-muted-foreground">₵</span>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₵55,000.00</div>
                    <p className="text-xs text-muted-foreground">
                       Estimated next payroll cycle.
                    </p>
                </CardContent>
            </Card>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Outstanding Bills</CardTitle>
                <CardDescription>A list of all unpaid bills from suppliers.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Bill ID</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Issue Date</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockBills.map((bill) => (
                                <TableRow key={bill.billId}>
                                    <TableCell className="font-medium">{bill.billId}</TableCell>
                                    <TableCell>
                                        {mockSuppliers.find(s => s.supplierId === bill.supplierId)?.name || 'Unknown'}
                                    </TableCell>
                                    <TableCell>{format(new Date(bill.issueDate), 'PPP')}</TableCell>
                                    <TableCell>{format(new Date(bill.dueDate), 'PPP')}</TableCell>
                                    <TableCell>₵{bill.totalAmount.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(bill.status)}>{bill.status}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <PayBillDialog bill={bill} onPaymentLogged={handlePaymentLogged} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </div>
    {postingInfo && (
        <LedgerPostingDialog 
            isOpen={!!postingInfo}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setPostingInfo(null);
                }
            }}
            amount={postingInfo.amount}
            description={postingInfo.description}
            defaultDebit="2010" // Accounts Payable
            defaultCredit="1010" // Cash and Bank
        />
    )}
    </>
  );
}
