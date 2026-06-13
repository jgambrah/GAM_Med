'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { FileStack, Eye, Download, Printer, ShieldCheck, History, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function PayrollArchives() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [selectedArchive, setSelectedArchive] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const downloadReport = (archive: any) => {
    if (!archive || !archive.fullData) return;

    const headers = [
      "Staff Number",
      "Employee Name",
      "Role",
      "Basic Salary (GHS)",
      "Gross Salary (GHS)",
      "SSNIT Employee (5.5% GHS)",
      "PAYE Tax (GHS)",
      "Other Deductions (GHS)",
      "Net Salary (GHS)",
      "Bank",
      "Account Number",
      "SSNIT Number",
      "TIN Number"
    ];

    const rows = archive.fullData.map((p: any) => {
      const otherDeductions = (p.deductions || []).reduce((acc: number, d: any) => acc + d.amount, 0);
      return [
        `"${p.staffNumber || ''}"`,
        `"${p.name || ''}"`,
        `"${p.role || ''}"`,
        Number(p.basic || 0).toFixed(2),
        Number(p.gross || 0).toFixed(2),
        Number(p.ssnitEmployee || 0).toFixed(2),
        Number(p.paye || 0).toFixed(2),
        otherDeductions.toFixed(2),
        Number(p.netSalary || 0).toFixed(2),
        `"${p.bankName || ''}"`,
        `"'${p.accountNumber || ''}"`,
        `"${p.ssnitNumber || ''}"`,
        `"${p.tinNumber || ''}"`
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `PAYROLL_ARCHIVE_${archive.period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'HR_MANAGER', 'ACCOUNTANT'].includes(userProfile?.role || '');

  const archivesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/payroll_archives`),
      orderBy("createdAt", "desc")
    );
  }, [firestore, hospitalId]);
  
  const { data: archives, isLoading: areArchivesLoading } = useCollection(archivesQuery);

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
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-black font-bold">
       <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Payroll <span className="text-primary">Audit Vault</span></h1>
          <p className="text-muted-foreground font-medium">Historical archive of all finalized payroll runs.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {areArchivesLoading ? (
            <div className="text-center p-20">
                <Loader2 className="animate-spin text-primary" />
            </div>
        ) : !archives || archives.length === 0 ? (
            <div className="p-20 bg-card rounded-[40px] text-center italic text-muted-foreground border-2 border-dashed">
                No payroll archives found.
            </div>
        ) : archives.map(archive => (
          <div key={archive.id} className="bg-card p-8 rounded-[40px] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 hover:border-primary/20 transition-all">
             <div className="flex items-center gap-6">
                <div className="bg-muted p-4 rounded-3xl text-primary"><History size={24}/></div>
                <div>
                   <p className="text-primary font-black text-xs uppercase tracking-[0.2em]">Period: {archive.period}</p>
                   <h3 className="text-xl font-black uppercase text-card-foreground">Master Payroll Summary</h3>
                   <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Authorized by: {archive.processedByName}</p>
                </div>
             </div>

             <div className="flex items-center gap-8">
                <div className="text-right">
                   <p className="text-[10px] font-black uppercase text-muted-foreground">Total Net Disbursed</p>
                   <p className="text-xl font-black">₵ {archive.totalNet.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
                <div className="flex gap-2">
                   <Button 
                     onClick={() => {
                       setSelectedArchive(archive);
                       setIsModalOpen(true);
                     }} 
                     variant="outline" 
                     size="icon"
                   >
                     <Eye size={20}/>
                   </Button>
                   <Button 
                     onClick={() => downloadReport(archive)} 
                     className="bg-foreground text-background font-black uppercase text-xs"
                   >
                      <Download size={16} /> Download Report
                   </Button>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Dialog for details */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto rounded-[32px] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-800">Payroll Archive Details ({selectedArchive?.period})</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-bold uppercase">
              Processed by {selectedArchive?.processedByName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 font-sans text-xs">
            <div className="grid grid-cols-3 gap-6 border border-slate-100 p-6 rounded-[24px] bg-muted/30">
               <div>
                  <p className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider">Total Gross Salary</p>
                  <p className="text-xl font-black text-slate-800">₵ {selectedArchive?.totalGross?.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
               </div>
               <div>
                  <p className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider">Total PAYE Tax</p>
                  <p className="text-xl font-black text-red-600">₵ {selectedArchive?.totalTax?.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
               </div>
               <div>
                  <p className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider">Total Net Disbursed</p>
                  <p className="text-xl font-black text-green-600">₵ {selectedArchive?.totalNet?.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
               </div>
            </div>

            <div className="border rounded-[24px] overflow-hidden shadow-sm">
               <Table>
                  <TableHeader className="bg-slate-950 text-white font-black uppercase text-[9px] tracking-wider">
                     <TableRow className="hover:bg-slate-950">
                        <TableHead className="p-4 text-white">Employee</TableHead>
                        <TableHead className="p-4 text-right text-white">Basic (₵)</TableHead>
                        <TableHead className="p-4 text-right text-white">Gross (₵)</TableHead>
                        <TableHead className="p-4 text-right text-white">SSNIT (₵)</TableHead>
                        <TableHead className="p-4 text-right text-white">PAYE (₵)</TableHead>
                        <TableHead className="p-4 text-right text-white">Other Ded. (₵)</TableHead>
                        <TableHead className="p-4 text-right text-white">Net Salary (₵)</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y bg-card">
                     {selectedArchive?.fullData?.map((item: any, idx: number) => {
                        const totalDeductions = (item.deductions || []).reduce((acc: number, d: any) => acc + d.amount, 0);
                        return (
                           <TableRow key={idx} className="hover:bg-muted/50 transition-all">
                              <TableCell className="p-4 font-bold uppercase">
                                 <p className="text-sm font-black text-slate-800">{item.name}</p>
                                 <p className="text-[9px] text-muted-foreground font-bold mt-0.5">{item.role} • {item.staffNumber}</p>
                              </TableCell>
                              <TableCell className="p-4 text-right font-mono font-medium text-slate-600">{Number(item.basic || 0).toFixed(2)}</TableCell>
                              <TableCell className="p-4 text-right font-mono font-medium text-slate-600">{Number(item.gross || 0).toFixed(2)}</TableCell>
                              <TableCell className="p-4 text-right font-mono font-bold text-orange-600">({Number(item.ssnitEmployee || 0).toFixed(2)})</TableCell>
                              <TableCell className="p-4 text-right font-mono font-bold text-destructive">({Number(item.paye || 0).toFixed(2)})</TableCell>
                              <TableCell className="p-4 text-right font-mono text-muted-foreground">({totalDeductions.toFixed(2)})</TableCell>
                              <TableCell className="p-4 text-right font-mono font-black text-primary text-sm">₵ {Number(item.netSalary || 0).toFixed(2)}</TableCell>
                           </TableRow>
                        );
                     })}
                  </TableBody>
               </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
