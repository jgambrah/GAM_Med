'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { FileStack, Eye, Download, Printer, ShieldCheck, History, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function PayrollArchives() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

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
        ) : archives?.length === 0 ? (
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
                   <Button variant="outline" size="icon"><Eye size={20}/></Button>
                   <Button className="bg-foreground text-background">
                      <Download size={16} /> Download Report
                   </Button>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}