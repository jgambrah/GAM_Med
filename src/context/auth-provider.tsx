
'use client';

import * as React from 'react';
import { User, Hospital } from '@/lib/types';
import { allUsers, mockHospitals } from '@/lib/data';
import { useFirestore, useDoc, useMemoFirebase, useAuth as useFirebaseHandler } from '@/firebase';
import { doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  hospital: Hospital | null;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  loading: boolean;
}

export const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const firestore = useFirestore();
  const firebaseAuth = useFirebaseHandler();

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

  const logout = async () => {
    try {
        if (firebaseAuth) {
            await signOut(firebaseAuth);
        }
        setUser(null);
        // Hard redirect to clear any residual state and force re-auth
        window.location.href = "/login";
    } catch (error) {
        console.error("Logout Error:", error);
    }
  };

  const value = React.useMemo(() => ({
    user,
    hospital: hospital || (user ? mockHospitals.find(h => h.hospitalId === user.hospitalId) : null) as Hospital | null,
    setUser,
    logout,
    loading: loading || isHospitalLoading,
  }), [user, hospital, loading, isHospitalLoading, firebaseAuth]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
