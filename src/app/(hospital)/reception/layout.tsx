'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ReceptionSidebar } from '@/components/app/reception-sidebar';
import { NurseSidebar } from '@/components/app/nurse-sidebar';
import { DoctorSidebar } from '@/components/app/doctor-sidebar';
import { DirectorSidebar } from '@/components/app/director-sidebar';

export default function ReceptionLayout({
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
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'RECEPTIONIST', 'NURSE', 'DOCTOR'].includes(userRole || '');

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You do not have clearance for this operational desk.</p>
          <Button onClick={() => router.push('/dashboard')}>Return Home</Button>
        </div>
      </div>
    );
  }

  // Dynamically render sidebar matching the authenticated user's role
  const activeSidebar = 
    userRole === 'NURSE' ? <NurseSidebar /> :
    userRole === 'DOCTOR' ? <DoctorSidebar /> :
    userRole === 'DIRECTOR' || userRole === 'ADMIN' ? <DirectorSidebar userProfile={userProfile} /> :
    <ReceptionSidebar />;

  return (
    <>
      {activeSidebar}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
    </>
  );
}
