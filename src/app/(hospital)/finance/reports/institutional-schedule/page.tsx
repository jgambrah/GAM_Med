'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { Landmark, FileText, Printer, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function InstitutionalSchedule() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const [selectedPayerId, setSelectedPayerId] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  
  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userProfile?.role || '');

  // Fetch all payers for the dropdown
  const payersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/payers`), orderBy('name', 'asc'));
  }, [firestore, hospitalId]);
  const { data: payers, isLoading: payersLoading } = useCollection(payersQuery);
  
  // Fetch claims based on the selected payer from receivables
  const claimsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !selectedPayerId) return null;
    return query(
        collection(firestore, `hospitals/${hospitalId}/receivables`), 
        where("payerId", "==", selectedPayerId),
        where("status", "==", "UNPAID"),
        orderBy("createdAt", "asc")
    );
  }, [firestore, hospitalId, selectedPayerId]);
  const { data: claims, isLoading: claimsLoading } = useCollection(claimsQuery);
  
  const selectedPayerName = useMemo(() => payers?.find(p => p.id === selectedPayerId)?.name || 'Select a Payer', [payers, selectedPayerId]);

  const totalRemittance = useMemo(() => {
    if (!claims) return 0;
    return claims.reduce((acc, claim) => acc + (claim.amount || 0), 0);
  }, [claims]);
  
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
    <div className="p-8 max-w-6xl mx-auto space-y-8 text-black font-bold">
      <div className="flex justify-between items-end print:hidden">
         <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Institutional <span className="text-primary">Schedule</span></h1>
         <div className="w-72">
            <Select onValueChange={setSelectedPayerId} disabled={payersLoading}>
                <SelectTrigger className="font-bold uppercase text-xs tracking-widest"><SelectValue placeholder="Select Payer..." /></SelectTrigger>
                <SelectContent>
                    {payers?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
            </Select>
         </div>
      </div>

      <div className="bg-white p-10 rounded-[40px] border shadow-sm print:shadow-none print:border-0 font-serif">
        <div className="text-center border-b-4 border-black pb-4 print:pb-2">
           <h1 className="text-3xl font-black uppercase tracking-tighter">{selectedPayerName}</h1>
           <p className="text-sm font-bold text-slate-400">Claims Schedule & Medical Consumption Report</p>
        </div>

        {(claimsLoading && selectedPayerId) && <div className="py-20 text-center"><Loader2 className="animate-spin text-primary"/></div>}
        
        {(!claimsLoading || !selectedPayerId) && (
            <>
            <table className="w-full border-4 border-black text-sm my-8">
                <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-widest">
                <tr>
                    <th className="p-4 border-r border-slate-700">Patient / Staff ID</th>
                    <th className="p-4 border-r border-slate-700">Service Date</th>
                    <th className="p-4 border-r border-slate-700">Medical Service Rendered</th>
                    <th className="p-4 text-right">Claim (₵)</th>
                </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-100">
                {claims && claims.length > 0 ? claims.map((claim: any, i: number) => (
                    <tr key={i}>
                    <td className="p-4 border-r">
                        <p className="font-black uppercase">{claim.patientName}</p>
                        <p className="text-[9px] text-blue-600">{claim.policyNumber || 'N/A'}</p>
                    </td>
                    <td className="p-4 border-r text-xs">{claim.createdAt ? new Date(claim.createdAt?.toDate()).toLocaleDateString() : 'N/A'}</td>
                    <td className="p-4 border-r italic text-slate-600">{claim.description || 'General Service'}</td>
                    <td className="p-4 text-right font-black">₵ {(Number(claim.amount || claim.totalAmount || 0)).toFixed(2)}</td>
                    </tr>
                )) : (
                    <tr><td colSpan={4} className="p-12 text-center text-slate-400 italic">
                        {selectedPayerId ? 'No outstanding claims for this payer.' : 'Please select a payer to generate a report.'}
                    </td></tr>
                )}
                </tbody>
                <tfoot className="bg-slate-50 border-t-4 border-black font-black text-lg">
                <tr>
                    <td colSpan={3} className="p-6 text-right uppercase text-xs">Total Remittance Due</td>
                    <td className="p-6 text-right text-blue-600 italic">₵ {(Number(totalRemittance || 0)).toFixed(2)}</td>
                </tr>
                </tfoot>
            </table>

            <div className="pt-10 flex justify-between items-center opacity-40 print:pt-20">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={16}/>
                    <span className="text-[8px] font-black uppercase tracking-widest">Verified via GamMed Institutional Hub</span>
                </div>
                <p className="text-[8px] italic">Sign: __________________________ (Director)</p>
            </div>
            </>
        )}
      </div>

       <div className="flex justify-end print:hidden">
          <Button onClick={() => window.print()} disabled={!claims || claims.length === 0}><Printer className="mr-2"/> Print Report</Button>
       </div>
    </div>
  );
}
