'use client';

import { CeoSidebar } from "@/components/app/ceo-sidebar";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

export default function CeoLayout({
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

  // While checking auth state or profile, show a loader
  if (isUserLoading || isProfileLoading || (userProfile && userProfile.mustChangePassword && pathname !== '/auth/force-password-change')) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-[#0f172a]">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
  }

  return (
    <div className="flex min-h-screen bg-[#0f172a] text-slate-200">
        <CeoSidebar />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            {children}
        </main>
    </div>
  );
}
