'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { AccountantSidebar } from '@/components/app/accountant-sidebar';

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'CASHIER'].includes(userRole);

  // Check for cashier's outstanding queries
  const queriedTillsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !userProfile?.hospitalId || userRole !== 'CASHIER') return null;
    return query(
        collection(firestore, `hospitals/${userProfile.hospitalId}/cash_tills`),
        where("cashierId", "==", user.uid),
        where("status", "==", "QUERIED")
    );
  }, [firestore, user, userProfile]);
  const { data: queriedTills, isLoading: areQueriesLoading } = useCollection(queriedTillsQuery);
  
  // Redirect cashier if they have an active query and aren't on the query page
  useEffect(() => {
    if (queriedTills && queriedTills.length > 0 && pathname !== '/finance/queries') {
      router.replace('/finance/queries');
    }
  }, [queriedTills, pathname, router]);

  const isLoading = isUserLoading || isProfileLoading || areQueriesLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // Prevent rendering children if a redirect is imminent
  if (queriedTills && queriedTills.length > 0 && pathname !== '/finance/queries') {
    return (
         <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="ml-4">Redirecting to query page...</p>
        </div>
    );
  }


  if (!isAuthorized) {
    return (
      <div className="h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You do not have clearance for the Finance Desk.</p>
          <Button onClick={() => router.push('/dashboard')}>Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
        <AccountantSidebar />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            {children}
        </main>
    </div>
  );
}
