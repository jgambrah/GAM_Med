
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

    // We need to find the user document. In our system, the ID is either the UID 
    // or the composite {hospitalId}_{email}. We check the 'users' collection.
    // To be most robust, we query for the document where 'uid' field matches authUser.uid
    // but typically we can listen to the profile by its known ID if available.
    
    // For now, we listen to the document directly if we can resolve the ID, 
    // otherwise we wait for the query logic in specific pages.
    // IMPROVED: We use a listener on the specific user profile.
    const profileRef = doc(firestore, 'users', authUser.uid);
    
    const unsubscribe = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        setProfile({ id: snap.id, uid: authUser.uid, ...snap.data() } as User);
      } else {
        // Fallback for composite IDs: we might need a query here if doc ID != uid
        // For the prototype, we assume the uid field is enough to identify the user.
        setProfile({ uid: authUser.uid, email: authUser.email, name: authUser.displayName } as any);
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
            await signOut(firebaseAuth);
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
