
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
import { mockBills, mockStaffClaims, mockSuppliers, mockPayrollRuns } from '@/lib/data';
import { Bill, StaffExpenseClaim } from '@/lib/types';
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
import { toast } from '@/hooks/use-toast';
import { LedgerPostingDialog } from './ledger-posting-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Paperclip } from 'lucide-react';
import Link from 'next/link';
import { useLocalStorage } from '@/hooks/use-local-storage';

const getBillStatusVariant = (status: Bill['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Paid': return 'secondary';
        case 'Pending': return 'default';
        case 'Overdue': return 'destructive';
        default: return 'outline';
    }
}

function PayBillDialog({ bill, onPaymentLogged }: { bill: Bill, onPaymentLogged: (amount: number, description: string) => void }) {
    const [open, setOpen] = React.useState(false);
    const [whtRate, setWhtRate] = React.useState('0');
    const [customWhtRate, setCustomWhtRate] = React.useState('');
    const [vatOption, setVatOption] = React.useState('zero');

    const { subtotal, netPayment, whtAmount } = React.useMemo(() => {
        let calculatedSubtotal = bill.totalAmount;
        if (vatOption === 'flat') {
            calculatedSubtotal = bill.totalAmount / 1.04;
        } else if (vatOption === 'standard') {
            calculatedSubtotal = bill.totalAmount / 1.219;
        }

        const currentWhtRateValue = whtRate === 'custom' ? parseFloat(customWhtRate) / 100 : parseFloat(whtRate) / 100;
        const calculatedWhtAmount = calculatedSubtotal * (isNaN(currentWhtRateValue) ? 0 : currentWhtRateValue);
        const calculatedNetPayment = bill.totalAmount - calculatedWhtAmount;
        
        return { subtotal: calculatedSubtotal, netPayment: calculatedNetPayment, whtAmount: calculatedWhtAmount };
    }, [bill.totalAmount, vatOption, whtRate, customWhtRate]);


    const handlePayBill = () => {
        toast.success("Payment Logged", {
            description: `Payment for bill ${bill.billId} has been logged.`
        });
        const taxDescription = whtAmount > 0 ? ` (after WHT)` : '';
        const paymentDescription = `Payment for Bill ${bill.billId} to ${mockSuppliers.find(s => s.supplierId === bill.supplierId)?.name || 'Unknown'}${taxDescription}`;
        onPaymentLogged(netPayment, paymentDescription);
        setOpen(false);
    }

    React.useEffect(() => {
        if (!open) {
            setWhtRate('0');
            setCustomWhtRate('');
            setVatOption('zero');
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
                            <Label>Total Bill Amount (VAT Inclusive)</Label>
                            <Input value={`₵${bill.totalAmount.toFixed(2)}`} readOnly disabled />
                        </div>
                        <div>
                           <Label>VAT Type on Invoice</Label>
                             <Select value={vatOption} onValueChange={setVatOption}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select VAT type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="zero">Zero Rated VAT</SelectItem>
                                    <SelectItem value="flat">Flat Rate (4%)</SelectItem>
                                    <SelectItem value="standard">Standard Rate</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                           <Label>Withholding Tax Rate</Label>
                             <Select value={whtRate} onValueChange={setWhtRate}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select tax rate" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">No WHT (0%)</SelectItem>
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
                         {whtRate === 'custom' && (
                            <div>
                                <Label>Custom WHT Rate (%)</Label>
                                <Input 
                                    type="number"
                                    placeholder="e.g., 8"
                                    value={customWhtRate}
                                    onChange={(e) => setCustomWhtRate(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                   
                    <div className="grid grid-cols-3 gap-4 rounded-md bg-muted p-4">
                         <div>
                            <Label>Subtotal (VAT-Ex.)</Label>
                            <Input value={`₵${subtotal.toFixed(2)}`} readOnly disabled />
                        </div>
                         <div>
                            <Label>WHT Amount</Label>
                            <Input value={`₵${whtAmount.toFixed(2)}`} readOnly disabled />
                        </div>
                         <div>
                            <Label className="font-bold">Net Payment Due</Label>
                            <Input className="font-bold text-lg" value={`₵${netPayment.toFixed(2)}`} readOnly disabled />
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

function PayClaimDialog({ claim, onPaymentLogged }: { claim: StaffExpenseClaim, onPaymentLogged: (amount: number, description: string) => void }) {
    const [open, setOpen] = React.useState(false);
    const [whtRate, setWhtRate] = React.useState('0');
    const [customWhtRate, setCustomWhtRate] = React.useState('');
    const [vatOption, setVatOption] = React.useState('zero');

    const { subtotal, netPayment, whtAmount } = React.useMemo(() => {
        let calculatedSubtotal = claim.amount;
        if (vatOption === 'flat') {
            calculatedSubtotal = claim.amount / 1.04;
        } else if (vatOption === 'standard') {
            calculatedSubtotal = claim.amount / 1.219;
        }

        const currentWhtRateValue = whtRate === 'custom' ? parseFloat(customWhtRate) / 100 : parseFloat(whtRate) / 100;
        const calculatedWhtAmount = calculatedSubtotal * (isNaN(currentWhtRateValue) ? 0 : currentWhtRateValue);
        const calculatedNetPayment = claim.amount - calculatedWhtAmount;
        
        return { subtotal: calculatedSubtotal, netPayment: calculatedNetPayment, whtAmount: calculatedWhtAmount };
    }, [claim.amount, vatOption, whtRate, customWhtRate]);


    const handlePayClaim = () => {
        toast.success("Payment Logged", {
            description: `Payment for claim ${claim.claimId} has been logged.`
        });
        const taxDescription = whtAmount > 0 ? ` (after WHT)` : '';
        const paymentDescription = `Staff Claim Payment: ${claim.description} for ${claim.staffName}${taxDescription}`;
        onPaymentLogged(netPayment, paymentDescription);
        setOpen(false);
    }

    React.useEffect(() => {
        if (!open) {
            setWhtRate('0');
            setCustomWhtRate('');
            setVatOption('zero');
        }
    }, [open]);


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                 <Button size="sm">
                    Log Payment
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log Payment for Staff Claim: {claim.claimId}</DialogTitle>
                    <DialogDescription>
                        Confirm claim payment to staff member: {claim.staffName}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Total Claim Amount (VAT Inclusive)</Label>
                            <Input value={`₵${claim.amount.toFixed(2)}`} readOnly disabled />
                        </div>
                        <div>
                           <Label>VAT Type on Invoice (If any)</Label>
                             <Select value={vatOption} onValueChange={setVatOption}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select VAT type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="zero">Zero Rated VAT</SelectItem>
                                    <SelectItem value="flat">Flat Rate (4%)</SelectItem>
                                    <SelectItem value="standard">Standard Rate</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                           <Label>Withholding Tax Rate</Label>
                             <Select value={whtRate} onValueChange={setWhtRate}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select tax rate" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">No WHT (0%)</SelectItem>
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
                         {whtRate === 'custom' && (
                            <div>
                                <Label>Custom WHT Rate (%)</Label>
                                <Input 
                                    type="number"
                                    placeholder="e.g., 8"
                                    value={customWhtRate}
                                    onChange={(e) => setCustomWhtRate(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                   
                    <div className="grid grid-cols-3 gap-4 rounded-md bg-muted p-4">
                         <div>
                            <Label>Subtotal (VAT-Ex.)</Label>
                            <Input value={`₵${subtotal.toFixed(2)}`} readOnly disabled />
                        </div>
                         <div>
                            <Label>WHT Amount</Label>
                            <Input value={`₵${whtAmount.toFixed(2)}`} readOnly disabled />
                        </div>
                         <div>
                            <Label className="font-bold">Net Payment Due</Label>
                            <Input className="font-bold text-lg" value={`₵${netPayment.toFixed(2)}`} readOnly disabled />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handlePayClaim}>Confirm Payment & Post to Ledger</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function VendorBillsTab({ onPaymentLogged }: { onPaymentLogged: (amount: number, description: string) => void }) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Bill ID</TableHead>
                        <TableHead>Supplier</TableHead>
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
                            <TableCell>{format(new Date(bill.dueDate), 'PPP')}</TableCell>
                            <TableCell>₵{bill.totalAmount.toFixed(2)}</TableCell>
                            <TableCell>
                                <Badge variant={getBillStatusVariant(bill.status)}>{bill.status}</Badge>
                            </TableCell>
                            <TableCell className="space-x-2">
                                {bill.attachmentUrl && (
                                    <Button asChild variant="outline" size="icon">
                                        <a href={bill.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                            <Paperclip className="h-4 w-4" />
                                        </a>
                                    </Button>
                                )}
                                <PayBillDialog bill={bill} onPaymentLogged={onPaymentLogged} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function StaffClaimsTab({ onPaymentLogged }: { onPaymentLogged: (amount: number, description: string) => void }) {
    const [allClaims] = useLocalStorage<StaffExpenseClaim[]>('allStaffClaims', mockStaffClaims);
    const unpaidClaims = allClaims.filter(c => c.paymentStatus === 'Unpaid' && c.approvalStatus === 'Approved');

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Staff Name</TableHead>
                        <TableHead>Submission Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {unpaidClaims.length > 0 ? (
                        unpaidClaims.map((claim) => (
                            <TableRow key={claim.claimId}>
                                <TableCell className="font-medium">{claim.staffName}</TableCell>
                                <TableCell>{format(new Date(claim.submissionDate), 'PPP')}</TableCell>
                                <TableCell>{claim.description}</TableCell>
                                <TableCell>₵{claim.amount.toFixed(2)}</TableCell>
                                <TableCell className="space-x-2">
                                    {claim.attachmentUrl && (
                                        <Button asChild variant="outline" size="icon">
                                            <a href={claim.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                                <Paperclip className="h-4 w-4" />
                                            </a>
                                        </Button>
                                    )}
                                    <PayClaimDialog claim={claim} onPaymentLogged={onPaymentLogged} />
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No approved staff claims are pending payment.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
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
                    <CardTitle className="text-sm font-medium">Total Vendor Payables</CardTitle>
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
                    <CardTitle className="text-sm font-medium">Overdue Vendor Payables</CardTitle>
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
                    <CardTitle className="text-sm font-medium">Last Payroll (Net)</CardTitle>
                     <span className="text-muted-foreground">₵</span>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₵{mockPayrollRuns[0]?.totalNetPay.toFixed(2) || '0.00'}</div>
                    <p className="text-xs text-muted-foreground">
                       Net pay for {mockPayrollRuns[0]?.payPeriod}.
                    </p>
                </CardContent>
            </Card>
        </div>
        <Card>
            <Tabs defaultValue="vendor-bills">
                <CardHeader>
                    <TabsList className="h-auto flex-wrap justify-start">
                        <TabsTrigger value="vendor-bills">Vendor Bills</TabsTrigger>
                        <TabsTrigger value="staff-claims">Staff Claims</TabsTrigger>
                        <TabsTrigger value="payroll">
                            <Link href="/dashboard/payroll">Payroll</Link>
                        </TabsTrigger>
                    </TabsList>
                </CardHeader>
                <CardContent>
                     <TabsContent value="vendor-bills">
                        <VendorBillsTab onPaymentLogged={handlePaymentLogged} />
                    </TabsContent>
                    <TabsContent value="staff-claims">
                        <StaffClaimsTab onPaymentLogged={handlePaymentLogged} />
                    </TabsContent>
                </CardContent>
            </Tabs>
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

    