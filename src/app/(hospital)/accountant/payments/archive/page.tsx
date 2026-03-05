'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { 
  History, Eye, Printer, Loader2, ShieldAlert,
  Wallet, FileText, Landmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function PaymentVoucherArchive() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [selectedPV, setSelectedPV] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userRole || '');

  const vouchersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/payment_vouchers`), orderBy('createdAt', 'desc'));
  }, [firestore, hospitalId]);
  const { data: vouchers, isLoading: areVouchersLoading } = useCollection(vouchersQuery);
  
  const hospitalRef = useMemoFirebase(() => hospitalId ? doc(firestore, "hospitals", hospitalId) : null, [firestore, hospitalId]);
  const { data: hospitalData } = useDoc(hospitalRef);

  const filteredVouchers = useMemo(() => {
      if (!vouchers) return [];
      if (!searchTerm) return vouchers;
      const lowercasedTerm = searchTerm.toLowerCase();
      return vouchers.filter(pv => 
          pv.pvNumber?.toLowerCase().includes(lowercasedTerm) ||
          pv.payee?.toLowerCase().includes(lowercasedTerm)
      );
  }, [vouchers, searchTerm]);

  const isLoading = isUserLoading || isProfileLoading;
  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin h-16 w-16" /></div>;
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
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Voucher <span className="text-primary">Archive</span></h1>
          <p className="text-muted-foreground font-medium">Search and reprint all historical payment vouchers.</p>
        </div>
      </div>

       <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <Input 
          placeholder="Search by PV Number or Payee..."
          className="w-full pl-12 pr-4 py-5 rounded-2xl border-2 bg-card"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-card rounded-[32px] border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PV Number</TableHead>
              <TableHead>Payee</TableHead>
              <TableHead>Net Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areVouchersLoading ? <TableRow><TableCell colSpan={5} className="text-center p-12"><Loader2 className="animate-spin" /></TableCell></TableRow> : 
            filteredVouchers?.map(pv => (
              <TableRow key={pv.id}>
                <TableCell className="font-mono font-bold text-primary">{pv.pvNumber}</TableCell>
                <TableCell className="font-bold uppercase">{pv.payee}</TableCell>
                <TableCell className="font-mono">GHS {pv.netAmount.toFixed(2)}</TableCell>
                <TableCell>{pv.createdAt ? format(pv.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelectedPV(pv)}><Eye size={14}/> View/Print</Button>
                </TableCell>
              </TableRow>
            ))}
            {!areVouchersLoading && filteredVouchers.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground p-12 italic">No vouchers found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {selectedPV && (
        <Dialog open={!!selectedPV} onOpenChange={() => setSelectedPV(null)}>
            <DialogContent className="max-w-4xl p-0 max-h-[95vh] flex flex-col">
                <DialogHeader className="sr-only">
                  <DialogTitle>Payment Voucher Details</DialogTitle>
                </DialogHeader>
                <PrintablePV voucher={selectedPV} hospitalName={hospitalData?.name} user={user} />
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function PrintablePV({ voucher, hospitalName, user }: any) {
  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=800,width=800');
    if (printWindow) {
      const printableContent = document.getElementById('printable-voucher-content')?.innerHTML;
      if (printableContent) {
        printWindow.document.write('<html><head><title>Print Voucher</title>');
        // You might need to link to your stylesheet or embed styles for it to look correct
        printWindow.document.write('<style>@media print { body { -webkit-print-color-adjust: exact; } }</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(printableContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }
  }

  return (
    <>
      <div className="flex-grow overflow-y-auto">
        <div id="printable-voucher-content" className="bg-white text-black p-0 font-serif">
            <div className="border-4 border-black p-8">
                <div className="text-center border-b-4 border-black pb-4 mb-6">
                <h1 className="text-3xl font-black uppercase tracking-tighter">{hospitalName}</h1>
                <h2 className="text-xl font-bold uppercase tracking-[0.3em] bg-black text-white inline-block px-8 py-1 mt-2">Payment Voucher</h2>
                </div>
                <div className="flex justify-between items-start mb-8">
                <div className="space-y-2 text-sm"><p className="font-bold uppercase">PV No: <span className="border-b-2 border-dotted border-black ml-2 px-4">{voucher.pvNumber}</span></p><p className="font-bold uppercase">Date: <span className="border-b-2 border-dotted border-black ml-2 px-4">{voucher.createdAt ? new Date(voucher.createdAt.toDate()).toLocaleDateString('en-GB') : 'N/A'}</span></p><p className="font-bold uppercase">Payee: <span className="border-b-2 border-dotted border-black ml-2 px-4">{voucher.payee}</span></p></div>
                <div className="text-right"><div className="border-4 border-black p-4 text-center"><p className="text-[10px] font-black uppercase">Currency</p><p className="text-2xl font-black uppercase">GHS</p></div></div>
                </div>
                <table className="w-full border-4 border-black mb-8"><thead className="bg-slate-200"><tr className="border-b-4 border-black"><th className="p-4 text-left font-black uppercase text-sm border-r-4 border-black">Description of Payment / Narration</th><th className="p-4 text-right font-black uppercase text-sm">Amount (GHS)</th></tr></thead><tbody className="font-bold"><tr className="border-b-2 border-black"><td className="p-6 h-40 align-top border-r-4 border-black">{voucher.narration}</td><td className="p-6 text-right">{voucher.grossAmount.toFixed(2)}</td></tr><tr className="border-b-2 border-black"><td className="p-3 text-right font-black uppercase text-xs border-r-4 border-black">Add: VAT & Statutory Levies (Effective 21.9%)</td><td className="p-3 text-right">{voucher.vatAmount.toFixed(2)}</td></tr><tr className="border-b-4 border-black"><td className="p-3 text-right font-black uppercase text-xs border-r-4 border-black text-red-600 italic underline">Less: Withholding Tax ({voucher.whtLabel || `${voucher.whtRate*100}%`})</td><td className="p-3 text-right text-red-600">({voucher.whtAmount.toFixed(2)})</td></tr><tr className="bg-slate-100"><td className="p-6 text-right font-black text-xl uppercase border-r-4 border-black">Net Amount Payable</td><td className="p-6 text-right font-black text-2xl">GHS {voucher.netAmount.toFixed(2)}</td></tr></tbody></table>
                <div className="grid grid-cols-3 gap-8 mt-12"><div className="space-y-12"><div className="border-t-2 border-black pt-2 text-center"><p className="text-[10px] font-black uppercase">Prepared By (Accountant)</p><p className="text-[11px] font-bold mt-1 uppercase italic">{voucher.processedByName}</p></div></div><div className="space-y-12"><div className="border-t-2 border-black pt-2 text-center"><p className="text-[10px] font-black uppercase">Internal Audit (Pre-Audit)</p><div className="h-6"></div><p className="text-[8px] italic">Certification Stamp Required</p></div></div><div className="space-y-12"><div className="border-t-2 border-black pt-2 text-center"><p className="text-[10px] font-black uppercase">Approved By (Director)</p></div></div></div>
                <div className="mt-16 text-center border-t border-slate-200 pt-4 opacity-50"><p className="text-[8px] font-black uppercase tracking-[0.5em]">Digitally Generated by GamMed ERP Ecosystem • Powered by Gam IT Solutions</p></div>
            </div>
        </div>
      </div>
      <div className="p-4 bg-muted flex justify-end flex-shrink-0">
          <Button onClick={handlePrint}><Printer size={16}/> Print</Button>
      </div>
    </>
  );
}
    