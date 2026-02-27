'use client';

import * as React from 'react';
import { User, Hospital } from '@/lib/types';
import { useFirestore, useDoc, useMemoFirebase, useAuth as useFirebaseHandler, useUser } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  hospital: Hospital | null;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  loading: boolean;
}

export const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

/**
 * == Robust SaaS Auth Provider ==
 * 
 * Manages the professional session and facility context.
 * Implements a live listener to the user's Firestore profile to ensure
 * that role and hospitalId persist across page reloads.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = React.useState<User | null>(null);
  const [isProfileLoading, setIsProfileLoading] = React.useState(true);
  const firestore = useFirestore();
  const firebaseAuth = useFirebaseHandler();
  const { user: authUser, isUserLoading } = useUser();

  // 1. Restore Profile from Firestore on Refresh
  React.useEffect(() => {
    if (isUserLoading) return;

    if (!authUser) {
      setProfile(null);
      setIsProfileLoading(false);
      return;
    }

    // We listen to the document directly if we can resolve the ID, 
    // otherwise we wait for the query logic in specific pages.
    const profileRef = doc(firestore, 'users', authUser.uid);
    
    const unsubscribe = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        // Use double assertion to satisfy strict overlap checks
        setProfile({ id: snap.id, uid: authUser.uid, ...snap.data() } as unknown as User);
      } else {
        // Fallback for composite IDs if doc ID != uid
        setProfile({ 
            uid: authUser.uid, 
            email: authUser.email || '', 
            name: authUser.displayName || 'User',
            role: 'staff',
            is_active: true,
            hospitalId: '',
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString()
        } as unknown as User);
      }
      setIsProfileLoading(false);
    }, (err) => {
      console.error("Profile Sync Error:", err);
      setIsProfileLoading(false);
    });

    return () => unsubscribe();
  }, [authUser, isUserLoading, firestore]);

  // 2. Fetch the hospital document if a user is logged in
  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !profile?.hospitalId) return null;
    return doc(firestore, 'hospitals', profile.hospitalId);
  }, [firestore, profile?.hospitalId]);

  const { data: hospital, isLoading: isHospitalLoading } = useDoc<Hospital>(hospitalRef);

  const logout = async () => {
    try {
        if (firebaseAuth) {
            await firebaseAuth.signOut();
        }
        setProfile(null);
        window.location.href = "/login";
    } catch (error) {
        console.error("Logout Error:", error);
    }
  };

  const value = React.useMemo(() => ({
    user: profile,
    hospital: hospital as Hospital | null,
    setUser: setProfile,
    logout,
    loading: isUserLoading || isProfileLoading || isHospitalLoading,
  }), [profile, hospital, isUserLoading, isProfileLoading, isHospitalLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
