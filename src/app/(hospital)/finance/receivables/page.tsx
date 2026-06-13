'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, serverTimestamp, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, Plus, ShieldCheck, Landmark, Loader2, 
  ShieldAlert, FileText, Printer, Calendar, ArrowUpRight, 
  ArrowDownLeft, X, ArrowLeft 
} from 'lucide-react';
import { format } from 'date-fns';

const payerSchema = z.object({
  name: z.string().min(1, "Payer name is required."),
  type: z.string().min(1, "Payer type is required."),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  creditLimit: z.coerce.number().min(0).optional(),
});

type PayerFormValues = z.infer<typeof payerSchema>;

interface StatementLine {
  id: string;
  date: Date;
  type: 'DEBIT' | 'CREDIT'; // DEBIT = Claim, CREDIT = Payment/Receipt
  reference: string;
  description: string;
  amount: number;
}

export default function PayerRegistryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isAddPayerOpen, setIsAddPayerOpen] = useState(false);
  const [selectedPayerForStatement, setSelectedPayerForStatement] = useState<any>(null);

  // Default date range: 30 days ago to today
  const [startDateStr, setStartDateStr] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDateStr, setEndDateStr] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userRole);

  const payersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/payers`));
  }, [firestore, hospitalId]);

  const { data: payers, isLoading: arePayersLoading } = useCollection(payersQuery);

  // Fetch all receivables to calculate statements on the fly
  const receivablesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/receivables`));
  }, [firestore, hospitalId]);

  const { data: allReceivables, isLoading: areReceivablesLoading } = useCollection(receivablesQuery);

  const form = useForm<PayerFormValues>({
    resolver: zodResolver(payerSchema),
    defaultValues: { name: '', type: 'PRIVATE_INSURANCE', creditLimit: 0 },
  });

  const handleAddPayer = (values: PayerFormValues) => {
    if (!firestore || !hospitalId) return;
    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/payers`), {
      ...values,
      currentBalance: 0,
      hospitalId,
      createdAt: serverTimestamp(),
    });
    toast({ title: 'Payer Entity Registered', description: `${values.name} has been added to the master list.` });
    form.reset();
    setIsAddPayerOpen(false);
  };

  // Build the double-entry chronological statement lines
  const statementData = useMemo(() => {
    if (!selectedPayerForStatement || !allReceivables) {
      return { lines: [], openingBalance: 0, totalClaims: 0, totalPayments: 0, closingBalance: 0 };
    }

    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T23:59:59');

    // Filter receivables for this specific payer
    const payerReceivables = allReceivables.filter(r => r.payerId === selectedPayerForStatement.id);

    const rawLines: StatementLine[] = [];

    payerReceivables.forEach(r => {
      const claimDate = r.createdAt ? new Date(r.createdAt.seconds * 1000) : new Date();
      
      // 1. Add Debit line (Claim invoice)
      rawLines.push({
        id: `claim-${r.id}`,
        date: claimDate,
        type: 'DEBIT',
        reference: `CLM-${r.id.slice(-6).toUpperCase()}`,
        description: `Medical claim invoice for patient ${r.patientName}`,
        amount: r.amount || 0
      });

      // 2. Add Credit line if Paid (Receipt settlement)
      if (r.status === 'PAID') {
        const paymentDate = r.reconciledAt 
          ? new Date(r.reconciledAt.seconds * 1000) 
          : new Date(claimDate.getTime() + 24 * 60 * 60 * 1000); // fallback +1 day if reconciledAt is blank
        
        rawLines.push({
          id: `pay-${r.id}`,
          date: paymentDate,
          type: 'CREDIT',
          reference: r.paymentId ? `REC-${r.paymentId.slice(-6).toUpperCase()}` : `REC-${r.id.slice(-6).toUpperCase()}`,
          description: `Settlement receipt for claim CLM-${r.id.slice(-6).toUpperCase()}`,
          amount: r.amount || 0
        });
      }
    });

    // Sort all lines chronologically
    rawLines.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate balances
    let runningBalance = 0;
    let openingBalance = 0;
    let totalClaims = 0;
    let totalPayments = 0;

    const filteredLines = rawLines.filter(line => {
      const isBeforeStart = line.date < start;
      const isInRange = line.date >= start && line.date <= end;

      const delta = line.type === 'DEBIT' ? line.amount : -line.amount;

      if (isBeforeStart) {
        openingBalance += delta;
      } else if (isInRange) {
        if (line.type === 'DEBIT') {
          totalClaims += line.amount;
        } else {
          totalPayments += line.amount;
        }
      }

      return isInRange;
    });

    const closingBalance = openingBalance + totalClaims - totalPayments;

    return {
      lines: filteredLines,
      openingBalance,
      totalClaims,
      totalPayments,
      closingBalance
    };
  }, [selectedPayerForStatement, allReceivables, startDateStr, endDateStr]);

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized for this module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Dynamic Print CSS Overrides */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .print-full-page {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: white !important;
            z-index: 99999;
          }
        }
      `}} />

      <div className="flex justify-between items-end border-b pb-6 no-print">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Payer <span className="text-primary">Master List</span></h1>
          <p className="text-muted-foreground font-medium">Managing Insurance, Corporate, and Third-Party Debtors.</p>
        </div>
        <Dialog open={isAddPayerOpen} onOpenChange={setIsAddPayerOpen}>
          <DialogTrigger asChild>
            <Button><Plus size={16} /> Register New Payer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Payer Registration</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddPayer)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Entity Name</FormLabel><FormControl><Input placeholder="e.g. Acacia Health Insurance" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>Payer Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="PRIVATE_INSURANCE">Private Health Insurance</SelectItem>
                        <SelectItem value="NHIS">National Health Insurance (NHIA)</SelectItem>
                        <SelectItem value="CORPORATE">Corporate Client (Company)</SelectItem>
                        <SelectItem value="PATIENT_CREDIT">Patient Credit Facility</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="contactPerson" render={({ field }) => (
                    <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="creditLimit" render={({ field }) => (
                    <FormItem><FormLabel>Credit Limit (GHS)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>Authorize Entity</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 no-print">
        {arePayersLoading ? <p>Loading payers...</p> : payers?.map(p => (
          <div key={p.id} className="bg-card p-8 rounded-[40px] border-2 shadow-sm space-y-6 hover:border-primary/20 transition-all flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div className="bg-primary/10 p-3 rounded-2xl text-primary">
                  {p.type === 'NHIS' ? <Landmark size={24} /> : p.type === 'CORPORATE' ? <Building2 size={24}/> : <ShieldCheck size={24}/>}
                </div>
                <span className="text-[10px] font-black bg-muted px-3 py-1 rounded-full uppercase italic">{p.type.replace('_', ' ')}</span>
              </div>
              <div>
                <h3 className="font-black text-lg uppercase tracking-tight leading-tight text-card-foreground">{p.name}</h3>
                <p className="text-[9px] text-muted-foreground font-black uppercase mt-1">Contact: {p.contactPerson || 'N/A'}</p>
              </div>
              <div className="bg-foreground p-6 rounded-3xl text-background">
                <p className="text-[10px] font-black text-primary/70 uppercase tracking-widest">Total Outstanding</p>
                <p className="text-2xl font-black italic">GHS {p.currentBalance.toLocaleString()}</p>
              </div>
            </div>
            <Button 
              onClick={() => setSelectedPayerForStatement(p)}
              className="w-full mt-6 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl py-3.5 h-auto hover:bg-primary transition-all"
            >
              <FileText size={14} className="mr-2" /> Statement of Account
            </Button>
          </div>
        ))}
        {!arePayersLoading && payers?.length === 0 && (
            <div className="md:col-span-3 text-center p-20 bg-card border-2 border-dashed rounded-2xl text-muted-foreground">
                No payers registered yet. Add the first one to begin tracking receivables.
            </div>
        )}
      </div>

      {/* Statement of Account Modal / Printable Overlay */}
      {selectedPayerForStatement && (
        <Dialog open={!!selectedPayerForStatement} onOpenChange={(open) => { if(!open) setSelectedPayerForStatement(null); }}>
          <DialogContent className="max-w-5xl rounded-[40px] p-0 overflow-hidden border-2 bg-white print-full-page">
            
            {/* Modal Header Controls */}
            <div className="bg-slate-950 p-6 text-white flex justify-between items-center no-print">
              <div className="flex items-center gap-2">
                <FileText className="text-primary" size={20} />
                <span className="text-xs font-black uppercase tracking-wider">Statement Generator</span>
              </div>
              <div className="flex items-center gap-4">
                <Button 
                  onClick={() => window.print()} 
                  size="sm" 
                  className="bg-primary hover:bg-white hover:text-black font-black uppercase text-[10px] tracking-widest px-4"
                >
                  <Printer size={14} className="mr-2" /> Print Statement
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSelectedPayerForStatement(null)}
                  className="text-white/60 hover:text-white"
                >
                  <X size={18} />
                </Button>
              </div>
            </div>

            {/* Date Range Selector Bar */}
            <div className="bg-slate-50 border-b p-6 flex flex-wrap gap-4 items-center justify-between no-print">
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar size={16} />
                <span className="text-xs font-bold uppercase">Statement Period:</span>
              </div>
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">From:</label>
                  <input 
                    type="date" 
                    value={startDateStr} 
                    onChange={e => setStartDateStr(e.target.value)} 
                    className="border rounded-xl p-2 text-xs font-bold text-slate-700 bg-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">To:</label>
                  <input 
                    type="date" 
                    value={endDateStr} 
                    onChange={e => setEndDateStr(e.target.value)} 
                    className="border rounded-xl p-2 text-xs font-bold text-slate-700 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Statement Printable Layout */}
            <div className="p-8 md:p-12 space-y-8 max-h-[70vh] overflow-y-auto print:max-h-none print:overflow-visible">
              
              {/* Corporate Letterhead Section */}
              <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6">
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                    {userProfile?.hospitalName || 'GAM_MED CLINICAL HUB'}
                  </h1>
                  <p className="text-xs text-slate-500 font-bold uppercase mt-1">
                    Corporate & Insurance Debtor Statement of Accounts
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Generated on: {format(new Date(), 'dd MMMM yyyy, hh:mm a')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-full uppercase tracking-widest">
                    Statement
                  </span>
                </div>
              </div>

              {/* Payer and Date Details */}
              <div className="grid grid-cols-2 gap-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Account Holder (Payer)</p>
                  <p className="text-lg font-black uppercase text-slate-950">{selectedPayerForStatement.name}</p>
                  <p className="text-xs font-bold text-slate-600 uppercase">Type: {selectedPayerForStatement.type.replace('_', ' ')}</p>
                  {selectedPayerForStatement.contactPerson && (
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Contact: {selectedPayerForStatement.contactPerson}</p>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Statement Summary Period</p>
                  <p className="text-sm font-bold text-slate-800">
                    {format(new Date(startDateStr + 'T00:00:00'), 'dd MMM yyyy')} — {format(new Date(endDateStr + 'T23:59:59'), 'dd MMM yyyy')}
                  </p>
                  <p className="text-xs font-bold text-slate-600 uppercase">Credit Limit: GHS {(selectedPayerForStatement.creditLimit || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Quick Balances Grid */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-slate-100 rounded-2xl border text-center">
                  <p className="text-[9px] font-black uppercase text-slate-400">Opening Balance</p>
                  <p className="text-base font-black text-slate-700 mt-1">₵ {statementData.openingBalance.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl text-center">
                  <p className="text-[9px] font-black uppercase text-blue-500">Total Claims (+)</p>
                  <p className="text-base font-black text-blue-700 mt-1">₵ {statementData.totalClaims.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-green-50/50 border border-green-100 rounded-2xl text-center">
                  <p className="text-[9px] font-black uppercase text-green-500">Total Settlements (-)</p>
                  <p className="text-base font-black text-green-700 mt-1">₵ {statementData.totalPayments.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-slate-900 text-white rounded-2xl text-center border-b-4 border-primary">
                  <p className="text-[9px] font-black uppercase text-primary">Closing Outstanding</p>
                  <p className="text-base font-black mt-1">₵ {statementData.closingBalance.toFixed(2)}</p>
                </div>
              </div>

              {/* Transactions Ledger */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Chronological Transaction Log</h3>
                
                {areReceivablesLoading ? (
                  <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-slate-400" /></div>
                ) : statementData.lines.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 italic bg-slate-50 border rounded-2xl uppercase text-xs">
                    No transactions recorded in this date range.
                  </div>
                ) : (
                  <div className="border rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b font-black text-slate-500 uppercase tracking-widest">
                        <tr>
                          <th className="p-4 text-[9px]">Date</th>
                          <th className="p-4 text-[9px]">Reference</th>
                          <th className="p-4 text-[9px]">Description</th>
                          <th className="p-4 text-[9px]">Type</th>
                          <th className="p-4 text-[9px] text-right">Debit (Claims)</th>
                          <th className="p-4 text-[9px] text-right">Credit (Payments)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-medium text-slate-700">
                        {statementData.lines.map((line) => (
                          <tr key={line.id} className="hover:bg-slate-50/40">
                            <td className="p-4 font-mono">{format(line.date, 'dd/MM/yyyy')}</td>
                            <td className="p-4 font-mono font-bold text-slate-900">{line.reference}</td>
                            <td className="p-4 text-slate-500 uppercase text-[10px]">{line.description}</td>
                            <td className="p-4">
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                                line.type === 'DEBIT' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {line.type === 'DEBIT' ? 'Claim' : 'Receipt'}
                              </span>
                            </td>
                            <td className="p-4 text-right font-mono font-bold">
                              {line.type === 'DEBIT' ? `₵ ${line.amount.toFixed(2)}` : '-'}
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-green-600">
                              {line.type === 'CREDIT' ? `₵ ${line.amount.toFixed(2)}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Verification & Auditor Signatures */}
              <div className="pt-12 grid grid-cols-2 gap-8 items-end opacity-60 print:pt-20">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-green-600" />
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    Verified Ledger: GamMed Internal Audit Hub
                  </span>
                </div>
                <div className="text-right space-y-6">
                  <p className="text-[10px] italic">Sign: ____________________________________ (Internal Auditor)</p>
                  <p className="text-[9px] font-black uppercase text-slate-400">GAM_MED CLINICAL ACCOUNTING PROTOCOL</p>
                </div>
              </div>

            </div>

          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
