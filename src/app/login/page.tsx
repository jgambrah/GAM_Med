'use client';

import { AuthForm } from '@/components/app/auth-form';
import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  useEffect(() => {
    // If the user is authenticated, redirect them away from the login page.
    if (!isUserLoading && user && firestore) {
        const userProfileRef = doc(firestore, 'users', user.uid);
        getDoc(userProfileRef).then(userProfileSnap => {
            if (!userProfileSnap.exists()) {
                console.warn(`Login redirect failed: User profile not found for UID: ${user.uid}`);
                // Don't redirect if profile is missing, as we can't determine the role.
                return;
            }

            const userProfile = userProfileSnap.data();
            
            if (userProfile.mustChangePassword) {
                router.replace('/auth/force-password-change');
                return;
            }
            
            const userRole = userProfile.role;

            const portalRoutes: { [key: string]: string } = {
                'SUPER_ADMIN': '/app-ceo/dashboard',
                'DIRECTOR': '/dashboard',
                'ADMIN': '/dashboard',
                'HR_MANAGER': '/hr',
                'DOCTOR': '/doctor',
                'NURSE': '/nurse',
                'PHARMACIST': '/pharmacy',
                'RECEPTIONIST': '/patients',
                'LAB_TECH': '/lab/queue',
                'RADIOLOGIST': '/radiology/queue',
                'ACCOUNTANT': '/accountant',
                'CASHIER': '/finance/billing',
                'STORE_MANAGER': '/supply-chain',
            };
            const destination = userRole ? portalRoutes[userRole] : '/dashboard';
            router.replace(destination || '/dashboard');
        }).catch(error => {
            console.error("Error fetching user profile on login:", error);
        });
    }
  }, [user, isUserLoading, router, firestore]);

  // Show a loader while checking auth state or if the user is already logged in (to prevent flashing the login form).
  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <AuthForm />
      </div>
    </div>
  );
}
