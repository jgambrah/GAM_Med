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

  useEffect(() => {
    // Redirect unauthenticated users
    if (!isUserLoading && !user) {
      router.replace('/');
      return;
    }
    
    // Once we have the profile, check for password change requirement
    if (userProfile && userProfile.mustChangePassword) {
      // Prevent redirect loop if already on the change password page
      if (pathname !== '/auth/force-password-change') {
        router.replace('/auth/force-password-change');
      }
    }
    
  }, [user, isUserLoading, userProfile, router, pathname]);

  const isSupplyChainRoute = pathname.startsWith('/supply-chain');
  const isAccountantRoute = pathname.startsWith('/accountant');
  const isFinanceRoute = pathname.startsWith('/finance');
  const isHrRoute = pathname.startsWith('/hr');
  const isAuditorRoute = pathname.startsWith('/auditor');
  const isPharmacyRoute = pathname.startsWith('/pharmacy');
  const isRadiologyRoute = pathname.startsWith('/radiology');
  const isLabRoute = pathname.startsWith('/lab');


  // While checking auth state or profile, show a loader
  // This also prevents a flash of content for users who will be redirected
  if (isUserLoading || isProfileLoading || (userProfile && userProfile.mustChangePassword && pathname !== '/auth/force-password-change')) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
  }


  // This is the router for specialized layouts.
  // If the path matches, we render the children directly, because the specialized layout will be inside.
  if (isSupplyChainRoute || isAccountantRoute || isFinanceRoute || isHrRoute || isAuditorRoute || isPharmacyRoute || isRadiologyRoute || isLabRoute) {
    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900">
            {children}
            <ClinicalAssistant />
        </div>
    )
  }

  // This is the default layout for Director, Doctor, Nurse, etc.
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
