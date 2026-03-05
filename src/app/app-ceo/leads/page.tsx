'use client';

import { useUser, useAuth, useFirestore, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { LeadsTable } from '@/components/app/leads-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AppCeoLeadsPage() {
  const { user, isUserLoading: isUserAuthLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setIsClaimsLoading(true);
      user.getIdTokenResult(true).then((idTokenResult) => {
        setClaims(idTokenResult.claims);
        setIsClaimsLoading(false);
      });
    } else if (!isUserAuthLoading) {
      setIsClaimsLoading(false);
    }
  }, [user, isUserAuthLoading]);

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'leads'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: leads, isLoading: areLeadsLoading } = useCollection(leadsQuery);

  const isOverallLoading = isUserAuthLoading || isClaimsLoading;

  if (isOverallLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || claims?.role !== 'SUPER_ADMIN') {
     return (
         <div className="flex flex-1 items-center justify-center bg-background p-4">
            <div className="text-center">
                <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">You do not have SUPER_ADMIN privileges.</p>
                 <Button onClick={() => router.push('/')} className="mt-4">Return to Login</Button>
            </div>
         </div>
    );
  }

  return (
    <>
        <div className="flex justify-between items-center mb-8">
             <div>
                <h2 className="text-3xl md:text-4xl font-headline font-bold">Lead Management</h2>
                <p className="text-muted-foreground mt-2">
                    Review and provision new hospital demo requests.
                </p>
            </div>
        </div>
        <LeadsTable leads={leads} isLoading={areLeadsLoading} />
    </>
  );
}
