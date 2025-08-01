'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { app } from '@/lib/firebase';
import type { User } from '@/lib/types';
import { Skeleton } from './ui/skeleton';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const auth = getAuth(app);
  const db = getFirestore(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
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
  }, [auth, db, router, pathname]);

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
             <Skeleton className="w-full h-full" />
        </div>
    )
  }

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

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
