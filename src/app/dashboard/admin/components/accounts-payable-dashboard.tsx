

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
import { mockBills as initialBills, mockStaffClaims as initialClaims, mockSuppliers, mockPayrollRuns, mockLedgerAccounts as initialAccounts, mockLedgerEntries as initialEntries } from '@/lib/data';
import { Bill, StaffExpenseClaim, LedgerAccount, LedgerEntry } from '@/lib/types';
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

function PayBillDialog({ bill, onPaymentLogged, onPostToLedger }: { bill: Bill, onPaymentLogged: (billId: string, amount: number, whtAmount: number, description: string, payableAccountId: string) => void, onPostToLedger: (debitAccountId: string, creditAccountId: string, amount: number, description: string) => Promise<boolean>}) {
    const [open, setOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [whtRate, setWhtRate] = React.useState('0');
    const [customWhtRate, setCustomWhtRate] = React.useState('');
    const [vatOption, setVatOption] = React.useState('zero');
    const [accounts] = useLocalStorage<LedgerAccount[]>('ledgerAccounts', initialAccounts);
    const [expenseAccountId, setExpenseAccountId] = React.useState('');
    const [payableAccountId, setPayableAccountId] = React.useState('2011'); // Default to Trade Payables

    const expenseAccounts = accounts.filter(acc => acc.accountType === 'Expense');
    const apSubAccounts = accounts.filter(acc => acc.parentAccountId === '2010');

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


    const handlePayBill = async () => {
        if (!expenseAccountId || !payableAccountId) {
            toast.error("Please select an expense and a payable account.");
            return;
        }
        setIsSubmitting(true);

        const accrualDescription = `Accrue expense for Bill ${bill.billId} from ${mockSuppliers.find(s => s.supplierId === bill.supplierId)?.name || 'Unknown'}`;
        const accrualResult = await onPostToLedger(expenseAccountId, payableAccountId, subtotal, accrualDescription);

        if (accrualResult) {
            toast.success("Expense Accrued", { description: `Bill ${bill.billId} posted to the ledger.` });

            const taxDescription = whtAmount > 0 ? ` (WHT of ₵${whtAmount.toFixed(2)} deducted)` : '';
            const paymentDescription = `Payment for Bill ${bill.billId}${taxDescription}`;
            
            onPaymentLogged(bill.billId, netPayment, whtAmount, paymentDescription, payableAccountId);
            
            setOpen(false);
        } else {
             toast.error("Failed to post expense accrual.", { description: 'An unknown error occurred.' });
        }
        
        setIsSubmitting(false);
    }

    React.useEffect(() => {
        if (!open) {
            setWhtRate('0');
            setCustomWhtRate('');
            setVatOption('zero');
            setExpenseAccountId('');
            setPayableAccountId('2011');
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
                            <Label>Expense Account (to Debit)</Label>
                            <Select value={expenseAccountId} onValueChange={setExpenseAccountId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an expense account..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {expenseAccounts.map(acc => (
                                        <SelectItem key={acc.accountId} value={acc.accountId}>
                                            {acc.accountName} ({acc.accountCode})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                         <div>
                            <Label>Payable Account (to Credit)</Label>
                            <Select value={payableAccountId} onValueChange={setPayableAccountId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a payable account..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {apSubAccounts.map(acc => (
                                        <SelectItem key={acc.accountId} value={acc.accountId}>
                                            {acc.accountName} ({acc.accountCode})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

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
                    <Button onClick={handlePayBill} disabled={isSubmitting || !expenseAccountId}>
                        {isSubmitting ? 'Processing...' : 'Confirm & Post to Ledger'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function PayClaimDialog({ claim, onPaymentLogged, onPostToLedger }: { claim: StaffExpenseClaim, onPaymentLogged: (claimId: string, amount: number, whtAmount: number, description: string, payableAccountId: string) => void, onPostToLedger: (debitAccountId: string, creditAccountId: string, amount: number, description: string) => Promise<boolean> }) {
    const [open, setOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [whtRate, setWhtRate] = React.useState('0');
    const [customWhtRate, setCustomWhtRate] = React.useState('');
    const [vatOption, setVatOption] = React.useState('zero');
    const [accounts] = useLocalStorage<LedgerAccount[]>('ledgerAccounts', initialAccounts);
    const [expenseAccountId, setExpenseAccountId] = React.useState(claim.expenseAccountId);
    const [payableAccountId, setPayableAccountId] = React.useState('2012'); // Default to Staff Payables

    const expenseAccounts = accounts.filter(acc => acc.accountType === 'Expense');
    const apSubAccounts = accounts.filter(acc => acc.parentAccountId === '2010');

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


    const handlePayClaim = async () => {
        setIsSubmitting(true);
        
        const accrualDescription = `Accrue expense for Staff Claim: ${claim.description}`;
        const accrualResult = await onPostToLedger(expenseAccountId, payableAccountId, subtotal, accrualDescription);

        if (accrualResult) {
            toast.success("Expense Accrued", { description: `Claim ${claim.claimId} posted to ledger.` });
            
            const taxDescription = whtAmount > 0 ? ` (WHT of ₵${whtAmount.toFixed(2)} deducted)` : '';
            const paymentDescription = `Staff Claim Payment: ${claim.description} for ${claim.staffName}${taxDescription}`;
            
            onPaymentLogged(claim.claimId, netPayment, whtAmount, paymentDescription, payableAccountId);
            
            setOpen(false);
        } else {
            toast.error("Failed to post expense accrual.", { description: 'An unknown error occurred.' });
        }
        
        setIsSubmitting(false);
    }

    React.useEffect(() => {
        if (open) {
           setExpenseAccountId(claim.expenseAccountId);
           setWhtRate('0');
           setCustomWhtRate('');
           setVatOption('zero');
           setPayableAccountId('2012');
        }
    }, [open, claim.expenseAccountId]);


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
                        Confirm claim payment to staff member: {claim.staffName}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Expense Account (to Debit)</Label>
                            <Select value={expenseAccountId} onValueChange={setExpenseAccountId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an expense account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {expenseAccounts.map(acc => (
                                        <SelectItem key={acc.accountId} value={acc.accountId}>
                                            {acc.accountName} ({acc.accountCode})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Payable Account (to Credit)</Label>
                             <Select value={payableAccountId} onValueChange={setPayableAccountId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a payable account..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {apSubAccounts.map(acc => (
                                        <SelectItem key={acc.accountId} value={acc.accountId}>
                                            {acc.accountName} ({acc.accountCode})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>


                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Total Claim Amount (VAT Inclusive)</Label>
                            <Input value={`₵${claim.amount.toFixed(2)}`} readOnly disabled />
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
                    <Button onClick={handlePayClaim} disabled={isSubmitting}>
                        {isSubmitting ? 'Posting...' : 'Confirm & Post to Ledger'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function VendorBillsTab({ bills, onPaymentLogged, onPostToLedger }: { bills: Bill[], onPaymentLogged: (billId: string, amount: number, whtAmount: number, description: string, payableAccountId: string) => void, onPostToLedger: (debitAccountId: string, creditAccountId: string, amount: number, description: string) => Promise<boolean> }) {
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
                    {bills.map((bill) => (
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
                                <PayBillDialog bill={bill} onPaymentLogged={onPaymentLogged} onPostToLedger={onPostToLedger} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function StaffClaimsTab({ onPaymentLogged, allClaims, setAllClaims, onPostToLedger }: { onPaymentLogged: (claimId: string, amount: number, whtAmount: number, description: string, payableAccountId: string) => void, allClaims: StaffExpenseClaim[], setAllClaims: React.Dispatch<React.SetStateAction<StaffExpenseClaim[]>>, onPostToLedger: (debitAccountId: string, creditAccountId: string, amount: number, description: string) => Promise<boolean> }) {
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
                                    <PayClaimDialog claim={claim} onPaymentLogged={onPaymentLogged} onPostToLedger={onPostToLedger} />
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
  const [postingInfo, setPostingInfo] = React.useState<{ amount: number; description: string; debitAccountId: string, creditAccountId: string, claimIdToUpdate?: string, billIdToUpdate?: string } | null>(null);
  const [bills, setBills] = useLocalStorage<Bill[]>('bills', initialBills);
  const [allStaffClaims, setAllStaffClaims] = useLocalStorage<StaffExpenseClaim[]>('allStaffClaims', initialClaims);
  const [accounts, setAccounts] = useLocalStorage<LedgerAccount[]>('ledgerAccounts', initialAccounts);
  const [entries, setEntries] = useLocalStorage<LedgerEntry[]>('ledgerEntries', initialEntries);

  const totalPayables = bills
    .filter(b => b.status === 'Pending' || b.status === 'Overdue')
    .reduce((sum, bill) => sum + bill.totalAmount, 0);

  const overduePayables = bills
    .filter(b => b.status === 'Overdue')
    .reduce((sum, bill) => sum + bill.totalAmount, 0);

  const handlePostToLedger = async (debitAccountId: string, creditAccountId: string, amount: number, description: string): Promise<boolean> => {
    // This simulates the postToLedger server action client-side
    try {
        const now = new Date().toISOString();

        const newDebitEntry: LedgerEntry = {
            entryId: `entry-${Date.now()}-dr`,
            accountId: debitAccountId,
            date: now,
            description: description,
            debit: amount
        };
        const newCreditEntry: LedgerEntry = {
            entryId: `entry-${Date.now()}-cr`,
            accountId: creditAccountId,
            date: now,
            description: description,
            credit: amount
        };
        
        setEntries(prev => [...prev, newDebitEntry, newCreditEntry]);

        setAccounts(prev => prev.map(acc => {
            if (acc.accountId === debitAccountId) {
                 const isDebitType = ['Asset', 'Expense'].includes(acc.accountType);
                 return { ...acc, balance: acc.balance + (isDebitType ? amount : -amount) };
            }
            if (acc.accountId === creditAccountId) {
                 const isDebitType = ['Asset', 'Expense'].includes(acc.accountType);
                 return { ...acc, balance: acc.balance + (isDebitType ? -amount : amount) };
            }
            return acc;
        }));
        return true;
    } catch(e) {
        console.error(e);
        return false;
    }
  };

  const handleBillPaymentLogged = (billId: string, netAmount: number, whtAmount: number, description: string, payableAccountId: string) => {
    if (whtAmount > 0) {
        // Debit AP sub-account, Credit WHT Payable (2020)
        handlePostToLedger(payableAccountId, '2020', whtAmount, `WHT for Bill ${billId}`);
    }
    setPostingInfo({ billIdToUpdate: billId, amount: netAmount, description, debitAccountId: payableAccountId, creditAccountId: '1010' }); // Debit AP, Credit Cash
  };
  
  const handleStaffClaimPaymentLogged = (claimId: string, netAmount: number, whtAmount: number, description: string, payableAccountId: string) => {
      if (whtAmount > 0) {
        // Debit AP sub-account, Credit WHT Payable (2020)
        handlePostToLedger(payableAccountId, '2020', whtAmount, `WHT for Claim ${claimId}`);
      }
      setPostingInfo({ 
          amount: netAmount, 
          description, 
          debitAccountId: payableAccountId, // Debit Staff Payables
          creditAccountId: '1010', // Credit Cash/Bank
          claimIdToUpdate: claimId,
      });
  };
  
  const handleLedgerDialogClose = (isOpen: boolean, posted?: boolean) => {
      if (!isOpen) {
          if (posted) {
              if (postingInfo?.claimIdToUpdate) {
                  setAllStaffClaims(prevClaims => 
                      prevClaims.map(claim => 
                          claim.claimId === postingInfo.claimIdToUpdate ? { ...claim, paymentStatus: 'Paid' } : claim
                      )
                  );
                  toast.success("Claim Paid", {
                      description: `Payment for claim ${postingInfo.claimIdToUpdate} has been successfully logged.`
                  });
              }
               if (postingInfo?.billIdToUpdate) {
                  setBills(prevBills => 
                      prevBills.map(bill => 
                          bill.billId === postingInfo.billIdToUpdate ? { ...bill, status: 'Paid' } : bill
                      )
                  );
                  toast.success("Bill Paid", {
                      description: `Payment for bill ${postingInfo.billIdToUpdate} has been successfully logged.`
                  });
              }
          }
          setPostingInfo(null);
      }
  }


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
                        <VendorBillsTab bills={bills} onPaymentLogged={handleBillPaymentLogged} onPostToLedger={handlePostToLedger} />
                    </TabsContent>
                    <TabsContent value="staff-claims">
                        <StaffClaimsTab allClaims={allStaffClaims} setAllClaims={setAllStaffClaims} onPaymentLogged={handleStaffClaimPaymentLogged} onPostToLedger={handlePostToLedger}/>
                    </TabsContent>
                </CardContent>
            </Tabs>
        </Card>
    </div>
    {postingInfo && (
        <LedgerPostingDialog 
            isOpen={!!postingInfo}
            onOpenChange={handleLedgerDialogClose}
            amount={postingInfo.amount}
            description={postingInfo.description}
            defaultDebit={postingInfo.debitAccountId}
            defaultCredit={postingInfo.creditAccountId}
        />
    )}
    </>
  );
}
