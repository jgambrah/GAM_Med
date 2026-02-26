'use client';

import * as React from 'react';
import { User, Hospital } from '@/lib/types';
import { allUsers, mockHospitals } from '@/lib/data';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  hospital: Hospital | null;
  setUser: (user: User | null) => void;
  loading: boolean;
}

export const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const firestore = useFirestore();

  // STABILIZE REFERENCE: Fetch the hospital document if a user is logged in
  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !user?.hospitalId) return null;
    return doc(firestore, 'hospitals', user.hospitalId);
  }, [firestore, user?.hospitalId]);

  const { data: hospital, isLoading: isHospitalLoading } = useDoc<Hospital>(hospitalRef);

  React.useEffect(() => {
    // In a real SaaS app, the user is retrieved from the Firebase Auth observer.
    // For this prototype, we'll use the first user from our mock data.
    const defaultUser = allUsers[0]; 
    setUser(defaultUser);
    setLoading(false);
  }, []);

  const value = React.useMemo(() => ({
    user,
    hospital: hospital || (user ? mockHospitals.find(h => h.hospitalId === user.hospitalId) : null) as Hospital | null,
    setUser,
    loading: loading || isHospitalLoading,
  }), [user, hospital, loading, isHospitalLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
