'use client';

import { DirectorSidebar } from "@/components/app/director-sidebar";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { ClinicalAssistant } from '@/components/clinical/ClinicalAssistant';


export default function HospitalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  // Fetch the user's full profile from Firestore
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  const isLoading = isUserLoading || isProfileLoading;

  useEffect(() => {
    // This effect handles the redirection logic after loading is complete
    if (!isLoading) {
      if (!user) {
        router.replace('/');
      } else if (userProfile?.mustChangePassword && pathname !== '/auth/force-password-change') {
        router.replace('/auth/force-password-change');
      }
    }
  }, [isLoading, user, userProfile, router, pathname]);

  // This is the main guard. It shows a loader until we know for sure the user is authenticated and ready.
  // It prevents child pages from rendering and attempting to fetch data while unauthenticated.
  if (isLoading || !user || (userProfile?.mustChangePassword && pathname !== '/auth/force-password-change')) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
  }

  // --- Layout Routing ---
  const isSupplyChainRoute = pathname.startsWith('/supply-chain');
  const isAccountantRoute = pathname.startsWith('/accountant');
  const isFinanceRoute = pathname.startsWith('/finance');
  const isHrRoute = pathname.startsWith('/hr');
  const isAuditorRoute = pathname.startsWith('/auditor');
  const isPharmacyRoute = pathname.startsWith('/pharmacy');
  const isRadiologyRoute = pathname.startsWith('/radiology');
  const isLabRoute = pathname.startsWith('/lab');
  const isReceptionRoute = pathname.startsWith('/reception');
  const isMortuaryRoute = pathname.startsWith('/mortuary');


  // If the path matches a specialized layout, render children directly within a basic container.
  // The specialized layout component itself will provide the sidebar.
  if (isSupplyChainRoute || isAccountantRoute || isFinanceRoute || isHrRoute || isAuditorRoute || isPharmacyRoute || isRadiologyRoute || isLabRoute || isReceptionRoute || isMortuaryRoute) {
    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900">
            {children}
            <ClinicalAssistant />
        </div>
    )
  }

  // This is the default layout for Director, Doctor, Nurse, etc., using the main DirectorSidebar.
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
        <DirectorSidebar userProfile={userProfile} />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            {children}
        </main>
        <ClinicalAssistant />
    </div>
  );
}
