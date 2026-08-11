'use client';

import { DirectorSidebar } from "@/components/app/director-sidebar";
import { PharmacySidebar } from "@/components/app/pharmacy-sidebar";
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
    if (!isLoading) {
      if (!user) {
        router.replace('/');
      } else if (userProfile?.role === 'SUPER_ADMIN') {
        router.replace('/app-ceo/dashboard');
      } else if (userProfile?.mustChangePassword && pathname !== '/auth/force-password-change') {
        router.replace('/auth/force-password-change');
      }
    }
  }, [isLoading, user, userProfile, router, pathname]);

  if (isLoading || !user || !userProfile || !userProfile.hospitalId || userProfile?.role === 'SUPER_ADMIN' || (userProfile?.mustChangePassword && pathname !== '/auth/force-password-change')) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-16 w-16 animate-spin text-rose-500" />
      </div>
    );
  }

  // Specialized department route checks
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

  // If user is a Pharmacist navigating across shared non-pharmacy routes (like /staff/*, /requisitions/*, /patients), retain PharmacySidebar without duplicating on /pharmacy routes
  if (userProfile?.role === 'PHARMACIST' && !isPharmacyRoute && !isSupplyChainRoute && !isAccountantRoute && !isFinanceRoute && !isHrRoute && !isAuditorRoute && !isRadiologyRoute && !isLabRoute && !isReceptionRoute && !isMortuaryRoute) {
    return (
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <PharmacySidebar />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
        <ClinicalAssistant />
      </div>
    );
  }

  // If the path matches a specialized layout (e.g. /pharmacy, /hr, /accountant), render children directly within container (the nested layout itself provides the single sidebar)
  if (isSupplyChainRoute || isAccountantRoute || isFinanceRoute || isHrRoute || isAuditorRoute || isPharmacyRoute || isRadiologyRoute || isLabRoute || isReceptionRoute || isMortuaryRoute) {
    return (
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {children}
        <ClinicalAssistant />
      </div>
    );
  }

  // Default layout for Director, Doctor, Nurse, etc., using the main DirectorSidebar.
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <DirectorSidebar userProfile={userProfile} />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
      <ClinicalAssistant />
    </div>
  );
}
