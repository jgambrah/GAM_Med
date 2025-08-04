'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { app } from '@/lib/firebase';
import type { User, UserRole } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { allUsers } from '@/lib/data';
import { MockRoleSwitcher } from './dashboard/mock-role-switcher';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  setMockUserRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  setMockUserRole: () => {},
});

export const useAuth = () => useContext(AuthContext);

const useMockAuth = process.env.NEXT_PUBLIC_FIREBASE_API_KEY === undefined;

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  

  const setMockUserRole = (role: UserRole) => {
    if (useMockAuth) {
      // Corrected logic: Find the specific mock user for the selected role.
      // We will default to Dr. Kofi Anan for 'Doctor' to ensure referrals are visible.
      let mockUser;
      if (role === 'Doctor') {
        mockUser = allUsers.find(u => u.id === 'doc2'); // Ensures we get Dr. Kofi Anan
      } else {
        mockUser = allUsers.find(u => u.role === role);
      }
      
      setUser(mockUser || allUsers.find(u => u.role === 'Admin')!); // Fallback to admin
    }
  };

  useEffect(() => {
    if (useMockAuth) {
      // Initialize with Admin role
      const initialUser = allUsers.find(u => u.role === 'Admin')!
      setUser(initialUser);
      setLoading(false);
      return;
    }
    
    const auth = getAuth(app);
    const db = getFirestore(app);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUser({ id: userDoc.id, ...userDoc.data() } as User);
        } else {
            // Handle case where user exists in Auth but not Firestore
            setUser(null);
        }
        if (pathname === '/login' || pathname === '/register') {
            router.push('/');
        }
      } else {
        setUser(null);
         if (pathname !== '/login' && pathname !== '/register') {
            router.push('/login');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, pathname]);

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
             <Skeleton className="w-full h-full" />
        </div>
    )
  }
  
  if (!useMockAuth) {
    if (!user && (pathname !== '/login' && pathname !== '/register')) {
      return (
          <div className="flex items-center justify-center min-h-screen">
              <p>Redirecting to login...</p>
          </div>
      );
    }

    if (user && (pathname === '/login' || pathname === '/register')) {
      return (
          <div className="flex items-center justify-center min-h-screen">
              <p>Redirecting to dashboard...</p>
          </div>
      );
    }
  }


  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, setMockUserRole }}>
      {useMockAuth && <MockRoleSwitcher />}
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
