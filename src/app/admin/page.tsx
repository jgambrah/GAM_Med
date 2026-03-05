'use client';

import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Header } from '@/components/app/header';
import { useRouter } from 'next/navigation';
import { OnboardHospitalForm } from '@/components/app/onboard-hospital-form';
import { addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const appCeoRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'app_ceos', user.uid);
  }, [user, firestore]);

  const { data: appCeoDoc, isLoading: isCeoLoading } = useDoc(appCeoRef);

  const isCeo = !!appCeoDoc;

  const handleLogout = () => {
    router.push('/');
  };

  const handleOnboardHospital = async (values: { hospitalName: string; location: string; directorEmail: string; }) => {
    if (!firestore) return;
    
    // In a real app, you would have a backend function to:
    // 1. Look up the director's UID by their email.
    // 2. Create the hospital document.
    // 3. Update the director's user profile with the hospitalId and 'DIRECTOR' role.
    // For now, we will just create the hospital document.
    
    const hospitalsRef = collection(firestore, 'hospitals');
    const newHospital = {
        name: values.hospitalName,
        location: values.location,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    
    // The security rules only allow an AppCEO to do this.
    await addDocumentNonBlocking(hospitalsRef, newHospital);

    alert(`Hospital '${values.hospitalName}' created! \nNext steps: Manually assign director role to ${values.directorEmail} in the /users collection.`);
  };

  if (isUserLoading || isCeoLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!isCeo) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <div className="text-center">
            <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary/50">
        <Header user={user} onLogout={handleLogout} />
        <main className="flex-1 w-full container mx-auto p-4 md:p-8">
            <div className="mb-8">
                <h2 className="text-3xl md:text-4xl font-headline font-bold">CEO Command Centre</h2>
                <p className="text-muted-foreground mt-2">
                    Onboard new hospitals and manage the GAM_Med system.
                </p>
            </div>
            <OnboardHospitalForm onSubmit={handleOnboardHospital} isLoading={false} />
        </main>
    </div>
  );
}
