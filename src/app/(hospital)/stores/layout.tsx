'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert, ArrowRight } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { StoresSidebar } from '@/components/app/stores-sidebar';

export default function StoresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'STORE_MANAGER', 'SUPER_ADMIN', 'PHARMACIST'].includes(userRole || 'DIRECTOR');

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="text-center bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl max-w-md text-white space-y-4">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20 w-fit mx-auto">
            <ShieldAlert className="h-12 w-12" />
          </div>
          <h1 className="text-xl font-black uppercase tracking-tight">Segregation of Duties (SoD) Active</h1>
          <p className="text-slate-400 text-xs leading-relaxed">
            As a <strong>Procurement Officer</strong>, you are cleared for Sourcing and Purchase Orders, but restricted from physical Warehouse Intake & Inventory to maintain internal audit compliance.
          </p>
          <Button 
            onClick={() => router.push('/procurement')} 
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider py-3 cursor-pointer"
          >
            Return to Procurement Portal &rarr;
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <StoresSidebar />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 min-h-screen">
        {children}
      </main>
    </>
  );
}
