'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

export default function OpdSmartRedirectPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading && userProfile) {
      if (userProfile.role === 'NURSE') {
        router.replace('/nurse');
      } else if (userProfile.role === 'DOCTOR' || userProfile.role === 'DIRECTOR' || userProfile.role === 'ADMIN') {
        router.replace('/doctor');
      } else if (userProfile.role === 'RECEPTIONIST') {
        router.replace('/reception');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [isUserLoading, isProfileLoading, userProfile, router]);

  return (
    <div className="flex h-[70vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
        <p className="text-xs font-semibold">Routing to your clinical outpatient desk...</p>
      </div>
    </div>
  );
}
