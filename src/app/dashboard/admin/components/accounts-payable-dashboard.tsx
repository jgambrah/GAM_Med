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
import { Paperclip, WalletCards, Printer } from 'lucide-react';
import Link from 'next/link';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { PaymentVoucher } from './payment-voucher';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';


const getBillStatusVariant = (status: Bill['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Paid': return 'secondary';
        case 'Pending': return 'default';
        case 'Overdue': return 'destructive';
        default: return 'outline';
    }
}

function PayBillDialog({ bill, onBillAccrued }: { bill: Bill, onBillAccrued: (billId: string, expenseAccId: string, payableAccId: string, subtotal: number, whtAmount: number) => void }) {
    const [open, setOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [whtRate, setWhtRate] = React.useState('0');
    const [customWhtRate, setCustomWhtRate] = React.useState('');
    const [vatOption, setVatOption] = React.useState('zero');
    const [accounts] = useLocalStorage<LedgerAccount[]>('ledgerAccounts', initialAccounts);
    const [expenseAccountId, setExpenseAccountId] = React.useState('');
    const [payableAccountId, setPayableAccountId] = React.useState(''); 

    const expenseAccounts = accounts.filter(acc => acc.accountType === 'Expense');
    const apSubAccounts = accounts.filter(acc => acc.accountCode.startsWith('20'));

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
        await onBillAccrued(bill.billId, expenseAccountId, payableAccountId, subtotal, whtAmount);
        setOpen(false);
        setIsSubmitting(false);
    }

    React.useEffect(() => {
        if (!open) {
            setWhtRate('0');
            setCustomWhtRate('');
            setVatOption('zero');
            setExpenseAccountId('');
            setPayableAccountId('');
        }
    }, [open]);


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={bill.status !== 'Pending' && bill.status !== 'Overdue'}>
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
                            <CircleSelect value={expenseAccountId} onValueChange={setExpenseAccountId} options={expenseAccounts.map(acc => ({ value: acc.accountId, label: `${acc.accountName} (${acc.accountCode})` }))} />
                        </div>
                         <div>
                            <Label>Payable Account (to Credit)</Label>
                            <CircleSelect value={payableAccountId} onValueChange={setPayableAccountId} options={apSubAccounts.map(acc => ({ value: acc.accountId, label: `${acc.accountName} (${acc.accountCode})` }))} />
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
                    <Button onClick={handlePayBill} disabled={isSubmitting || !expenseAccountId || !payableAccountId}>
                        {isSubmitting ? 'Processing...' : 'Confirm & Post to Ledger'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function CircleSelect({ value, onValueChange, options }: { value: string, onValueChange: (v: string) => void, options: { value: string, label: string }[] }) {
    return (
        <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger>
                <SelectValue placeholder="Select an account..." />
            </SelectTrigger>
            <SelectContent>
                {options.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

function PayClaimDialog({ claim, onClaimAccrued }: { claim: StaffExpenseClaim, onClaimAccrued: (claimId: string, expenseAccountId: string, subtotal: number, whtAmount: number) => void }) {
    const [open, setOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [whtRate, setWhtRate] = React.useState('0');
    const [customWhtRate, setCustomWhtRate] = React.useState('');
    const [vatOption, setVatOption] = React.useState('zero');
    const [accounts] = useLocalStorage<LedgerAccount[]>('ledgerAccounts', initialAccounts);
    const [expenseAccountId, setExpenseAccountId] = React.useState(claim.expenseAccountId);
    
    const expenseAccounts = accounts.filter(acc => acc.accountType === 'Expense');
    
     const { subtotal, whtAmount } = React.useMemo(() => {
        let calculatedSubtotal = claim.amount;
        if (vatOption === 'flat') {
            calculatedSubtotal = claim.amount / 1.04;
        } else if (vatOption === 'standard') {
            calculatedSubtotal = claim.amount / 1.219;
        }

        const currentWhtRateValue = whtRate === 'custom' ? parseFloat(customWhtRate) / 100 : parseFloat(whtRate) / 100;
        const calculatedWhtAmount = calculatedSubtotal * (isNaN(currentWhtRateValue) ? 0 : currentWhtRateValue);
        
        return { subtotal: calculatedSubtotal, whtAmount: calculatedWhtAmount };
    }, [claim.amount, vatOption, whtRate, customWhtRate]);

    const netPayment = claim.amount - whtAmount;

    const handlePayClaim = async () => {
        if (!expenseAccountId) {
            toast.error("Please select an expense account.");
            return;
        }
        setIsSubmitting(true);
        await onClaimAccrued(claim.claimId, expenseAccountId, subtotal, whtAmount);
        setIsSubmitting(false);
        setOpen(false);
    }

    React.useEffect(() => {
        if (open) {
           setExpenseAccountId(claim.expenseAccountId);
           setWhtRate('0');
           setCustomWhtRate('');
           setVatOption('zero');
        }
    }, [open, claim.expenseAccountId]);


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                 <Button size="sm">
                    Accrue Expense
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Accrue Expense for Staff Claim: {claim.claimId}</DialogTitle>
                    <DialogDescription>
                       Confirm the expense details before creating the liability.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Expense Account (to Debit)</Label>
                            <CircleSelect value={expenseAccountId} onValueChange={setExpenseAccountId} options={expenseAccounts.map(acc => ({ value: acc.accountId, label: `${acc.accountName} (${acc.accountCode})` }))} />
                        </div>
                        <div>
                            <Label>Payable Account (to Credit)</Label>
                            <Input value="Staff Claim Account Payable (2050)" readOnly disabled />
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
                    <Button onClick={handlePayClaim} disabled={isSubmitting || !expenseAccountId}>
                        {isSubmitting ? 'Posting...' : 'Confirm & Post to Ledger'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function StaffClaimsTab({ onClaimAccrued, allClaims, setAllClaims, handlePostPayment }: { onClaimAccrued: (claimId: string, expenseAccountId: string, subtotal: number, whtAmount: number) => void, allClaims: StaffExpenseClaim[], setAllClaims: React.Dispatch<React.SetStateAction<StaffExpenseClaim[]>>, handlePostPayment: (claim: StaffExpenseClaim, entryType: 'net' | 'wht') => void }) {
    const claimsToPay = allClaims.filter(c => c.approvalStatus === 'Approved');

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Staff Name</TableHead>
                        <TableHead>Submission Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {claimsToPay.length > 0 ? (
                        claimsToPay.map((claim) => (
                            <TableRow key={claim.claimId}>
                                <TableCell className="font-medium">{claim.staffName}</TableCell>
                                <TableCell>{format(new Date(claim.submissionDate), 'PPP')}</TableCell>
                                <TableCell>{claim.description}</TableCell>
                                <TableCell>₵{claim.amount.toFixed(2)}</TableCell>
                                <TableCell>
                                    <Badge variant={claim.paymentStatus === 'Paid' ? 'secondary' : 'default'}>
                                        {claim.paymentStatus}
                                    </Badge>
                                </TableCell>
                                <TableCell className="space-x-2 text-right">
                                    {claim.attachmentUrl && (
                                        <Button asChild variant="outline" size="icon">
                                            <a href={claim.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                                <Paperclip className="h-4 w-4" />
                                            </a>
                                        </Button>
                                    )}
                                    {claim.paymentStatus === 'Unpaid' && (
                                        <PayClaimDialog claim={claim} onClaimAccrued={onClaimAccrued} />
                                    )}
                                    {claim.paymentStatus === 'Accrued' && (
                                        <>
                                            <Button size="sm" variant="outline" onClick={() => handlePostPayment(claim, 'net')}>
                                                <WalletCards className="h-4 w-4 mr-2"/>
                                                Post Net Payment
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handlePostPayment(claim, 'wht')}>
                                                <WalletCards className="h-4 w-4 mr-2"/>
                                                Post WHT
                                            </Button>
                                        </>
                                    )}
                                     {claim.paymentStatus === 'Paid' && (
                                        <>
                                            <PaymentVoucher claim={claim} voucherType="Net Payment" trigger={<Button size="sm" variant="outline"><Printer className="h-4 w-4 mr-2" /> Voucher (Net)</Button>} />
                                            {claim.whtAmount && claim.whtAmount > 0 && (
                                                <PaymentVoucher claim={claim} voucherType="WHT Payment" trigger={<Button size="sm" variant="outline"><Printer className="h-4 w-4 mr-2" /> Voucher (WHT)</Button>} />
                                            )}
                                        </>
                                    )}
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

function VendorBillsTab({ bills, setBills, onBillAccrued, handlePostPayment }: { bills: Bill[], setBills: React.Dispatch<React.SetStateAction<Bill[]>>, onBillAccrued: (billId: string, expenseAccId: string, payableAccId: string, subtotal: number, whtAmount: number) => void, handlePostPayment: (bill: Bill, entryType: 'net' | 'wht') => void }) {
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
                        <TableHead className="text-right">Actions</TableHead>
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
                            <TableCell className="space-x-2 text-right">
                                {bill.attachmentUrl && (
                                    <Button asChild variant="outline" size="icon">
                                        <a href={bill.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                            <Paperclip className="h-4 w-4" />
                                        </a>
                                    </Button>
                                )}
                                {bill.status === 'Accrued' && (
                                    <>
                                        <Button size="sm" variant="outline" onClick={() => handlePostPayment(bill, 'net')}>
                                            <WalletCards className="h-4 w-4 mr-2"/>
                                            Post Net Payment
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => handlePostPayment(bill, 'wht')}>
                                            <WalletCards className="h-4 w-4 mr-2"/>
                                            Post WHT
                                        </Button>
                                    </>
                                )}
                                 {(bill.status === 'Pending' || bill.status === 'Overdue') && (
                                    <PayBillDialog bill={bill} onBillAccrued={onBillAccrued} />
                                )}
                                 {bill.status === 'Paid' && (
                                     <>
                                        <PaymentVoucher bill={bill} voucherType="Net Payment" trigger={<Button size="sm" variant="outline"><Printer className="h-4 w-4 mr-2" /> Voucher (Net)</Button>} />
                                        {bill.whtAmount && bill.whtAmount > 0 && (
                                            <PaymentVoucher bill={bill} voucherType="WHT Payment" trigger={<Button size="sm" variant="outline"><Printer className="h-4 w-4 mr-2" /> Voucher (WHT)</Button>} />
                                        )}
                                    </>
                                 )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

const PostingSchema = z.object({
  debitAccountId: z.string().min(1, 'Debit account is required.'),
  creditAccountId: z.string().min(1, 'Credit account is required.'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than zero.'),
  description: z.string().min(3, 'Description is required.'),
  paymentMethod: z.enum(['Cheque', 'Bank Transfer']),
  chequeNumber: z.string().optional(),
});


export function AccountsPayableDashboard() {
  const { user } = useAuth();
  const [postingInfo, setPostingInfo] = React.useState<{ debitAccountId: string, creditAccountId: string, amount: number; description: string; onPostComplete: () => void } | null>(null);
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

 const handlePostToLedger = async (values: z.infer<typeof PostingSchema>) => {
    const { debitAccountId, creditAccountId, amount, paymentMethod, chequeNumber } = values;

    if (amount <= 0) {
        toast.success("Zero-amount transaction skipped.");
        return;
    }

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

        const newDebitEntry: LedgerEntry = { hospitalId: user?.hospitalId || 'hosp-1', entryId: `entry-${Date.now()}-dr`, accountId: debitAccountId, date: now, description: finalDescription, debit: amount };
        const newCreditEntry: LedgerEntry = { hospitalId: user?.hospitalId || 'hosp-1', entryId: `entry-${Date.now()}-cr`, accountId: creditAccountId, date: now, description: finalDescription, credit: amount };
        
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
        
        toast.success("Transaction Posted", { description: `${finalDescription} for ₵${amount.toFixed(2)}` });
    } catch (e) {
        console.error(e);
        toast.error("Failed to post transaction.", { description: 'An unknown error occurred.' });
    }
  };


  const handleBillAccrued = async (billId: string, expenseAccId: string, payableAccId: string, subtotal: number, whtAmount: number) => {
     const bill = bills.find(b => b.billId === billId);
    if (!bill) return;

    await handlePostToLedger({
      debitAccountId: expenseAccId,
      creditAccountId: payableAccId,
      amount: subtotal,
      description: `Accrue expense for Bill ${billId}`,
      paymentMethod: 'Bank Transfer', // Default for accrual
    });
    
    setBills(prev => prev.map(b => b.billId === billId ? { ...b, status: 'Accrued', whtAmount: whtAmount, netAmount: bill.totalAmount - (whtAmount || 0) } : b));
  };
  
  const handleClaimAccrued = async (claimId: string, expenseAccountId: string, subtotal: number, whtAmount: number) => {
      const staffPayableAccount = accounts.find(acc => acc.accountCode === '2050');
      if (!staffPayableAccount) {
          toast.error("Staff Payable Account (2050) not found.");
          return;
      }
      
      await handlePostToLedger({
          debitAccountId: expenseAccountId,
          creditAccountId: staffPayableAccount.accountId,
          amount: subtotal,
          description: `Accrue expense for Staff Claim: ${claimId}`,
          paymentMethod: 'Bank Transfer', // Default for accrual
      });

      setAllStaffClaims(prev => prev.map(c => 
        c.claimId === claimId 
        ? { ...c, paymentStatus: 'Accrued', whtAmount, netAmount: c.amount - (whtAmount || 0) } 
        : c
      ));
      toast.success("Expense accrued. Ready to post payment.");
  };

  const handlePostPayment = (item: StaffExpenseClaim | Bill, entryType: 'net' | 'wht') => {
    let debitAccountId: string;
    let creditAccountId: string;
    let description: string;
    let amount: number;
    let onPostComplete: () => void;

    const cashAccount = accounts.find(acc => acc.accountCode === '1010');
    const whtPayableAccount = accounts.find(acc => acc.accountCode === '2040');

    if (!cashAccount || !whtPayableAccount) {
        toast.error("A required ledger account is missing (Cash or WHT Payable).");
        return;
    }
    
    if ('claimId' in item) { // It's a StaffExpenseClaim
        const staffPayableAccount = accounts.find(acc => acc.accountCode === '2050');
        if (!staffPayableAccount) {
            toast.error("Staff Payable Account (2050) not found.");
            return;
        }
        debitAccountId = staffPayableAccount.accountId;
        
        if (entryType === 'net') {
            description = `Net Payment for Claim ${item.claimId}`;
            amount = item.netAmount || item.amount;
            creditAccountId = cashAccount.accountId;
            onPostComplete = () => {
                setAllStaffClaims(prev => prev.map(c => c.claimId === item.claimId ? { ...c, isNetPaid: true, paymentStatus: (c.isWhtPosted || !(c.whtAmount && c.whtAmount > 0)) ? 'Paid' : 'Accrued' } : c));
            };
        } else { // WHT
            description = `WHT for Claim ${item.claimId}`;
            amount = item.whtAmount || 0;
            creditAccountId = whtPayableAccount.accountId;
            onPostComplete = () => {
                 setAllStaffClaims(prev => prev.map(c => c.claimId === item.claimId ? { ...c, isWhtPosted: true, paymentStatus: c.isNetPaid ? 'Paid' : 'Accrued' } : c));
            };
        }
    } else { // It's a Bill
        const supplierPayableAccount = accounts.find(acc => acc.accountCode === '2011');
        if (!supplierPayableAccount) {
            toast.error("Trade Payables Account (2011) not found.");
            return;
        }
        debitAccountId = supplierPayableAccount.accountId;
        if (entryType === 'net') {
            description = `Net Payment for Bill ${item.billId}`;
            amount = item.netAmount || item.totalAmount;
            creditAccountId = cashAccount.accountId;
            onPostComplete = () => {
                 setBills(prev => prev.map(b => b.billId === item.billId ? { ...b, isNetPaid: true, status: (b.isWhtPosted || !(b.whtAmount && b.whtAmount > 0)) ? 'Paid' : 'Accrued' } : b));
            };
        } else { // WHT
            description = `WHT for Bill ${item.billId}`;
            amount = item.whtAmount || 0;
            creditAccountId = whtPayableAccount.accountId;
            onPostComplete = () => {
                setBills(prev => prev.map(b => b.billId === item.billId ? { ...b, isWhtPosted: true, status: b.isNetPaid ? 'Paid' : 'Accrued' } : b));
            };
        }
    }

    setPostingInfo({
        debitAccountId: debitAccountId,
        creditAccountId: creditAccountId,
        amount: amount,
        description: description,
        onPostComplete: () => {
            onPostComplete();
            setPostingInfo(null);
        }
    });
};
  
  return (
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
            <Tabs defaultValue="staff-claims">
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
                        <VendorBillsTab bills={bills} setBills={setBills} onBillAccrued={handleBillAccrued} handlePostPayment={handlePostPayment} />
                    </TabsContent>
                    <TabsContent value="staff-claims">
                        <StaffClaimsTab allClaims={allStaffClaims} setAllClaims={setAllStaffClaims} onClaimAccrued={handleClaimAccrued} handlePostPayment={handlePostPayment}/>
                    </TabsContent>
                </CardContent>
            </Tabs>
        </Card>
        {postingInfo && (
            <LedgerPostingDialog
                isOpen={!!postingInfo}
                onPost={async (values) => {
                    await handlePostToLedger(values);
                    if (postingInfo.onPostComplete) {
                      postingInfo.onPostComplete();
                    }
                }}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setPostingInfo(null);
                    }
                }}
                amount={postingInfo.amount}
                description={postingInfo.description}
                defaultDebit={postingInfo.debitAccountId}
                defaultCredit={postingInfo.creditAccountId}
            />
        )}
    </div>
  );
}
