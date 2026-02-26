'use client';

import * as React from 'react';
import { User, Hospital } from '@/lib/types';
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

  // Fetch the hospital document if a user is logged in
  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !user?.hospitalId) return null;
    return doc(firestore, 'hospitals', user.hospitalId);
  }, [firestore, user?.hospitalId]);

  const { data: hospital, isLoading: isHospitalLoading } = useDoc<Hospital>(hospitalRef);

  React.useEffect(() => {
    // Sync with Firebase Auth state
    setLoading(false);
  }, []);

  /**
   * == Professional Logout Workflow ==
   * 1. Terminates Firebase session.
   * 2. Clears local application state.
   * 3. Performs hard redirect to purge all caches.
   */
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
    hospital: hospital as Hospital | null,
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
