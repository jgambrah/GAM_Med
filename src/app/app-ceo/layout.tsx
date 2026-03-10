'use client';

import { CeoSidebar } from "@/components/app/ceo-sidebar";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { doc } from 'firebase/firestore';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);
  
  const isLoading = isUserLoading || isProfileLoading;

  useEffect(() => {
    // This effect handles the redirection logic once loading is complete
    if (!isLoading) {
      if (!user) {
        router.replace('/');
      } else if (userProfile?.role !== 'SUPER_ADMIN') {
        router.replace('/dashboard'); // Or a generic access denied page
      } else if (userProfile?.mustChangePassword && pathname !== '/auth/force-password-change') {
        router.replace('/auth/force-password-change');
      }
    }
  }, [isLoading, user, userProfile, router, pathname]);

  // While loading, or if conditions for redirection are met, show a loader.
  // This prevents rendering children prematurely.
  if (isLoading || !user || userProfile?.role !== 'SUPER_ADMIN' || (userProfile?.mustChangePassword && pathname !== '/auth/force-password-change')) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0f172a]">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // If authorized and ready, render the layout
  return (
    <div className="flex min-h-screen bg-[#0f172a] text-slate-200">
        <CeoSidebar />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            {children}
        </main>
    </div>
  );
}
