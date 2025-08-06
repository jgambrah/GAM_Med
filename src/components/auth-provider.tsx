
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

let lastDoctorIndex = 0;

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Helper function to find a user by role
  const findUserByRole = (role: UserRole): User => {
    let mockUser;
    if (role === 'Doctor') {
      const doctors = allUsers.filter(u => u.role === 'Doctor');
      if (doctors.length > 0) {
        mockUser = doctors[lastDoctorIndex % doctors.length];
        lastDoctorIndex++;
      }
    } else {
      mockUser = allUsers.find(u => u.role === role);
    }
    return mockUser || allUsers.find(u => u.role === 'Admin')!;
  };

  const setMockUserRole = (role: UserRole) => {
    if (useMockAuth) {
      const newActiveUser = findUserByRole(role);
      sessionStorage.setItem('mockUserRole', role); // Persist role choice
      setUser(newActiveUser);
      
      switch(newActiveUser.role) {
        case 'Doctor':
          router.push('/doctor/dashboard');
          break;
        case 'Patient':
          router.push('/patient/dashboard');
          break;
        default:
          router.push('/');
      }
    }
  };

  useEffect(() => {
    if (useMockAuth) {
      // On initial load, try to get the role from sessionStorage, or default to 'Admin'
      const savedRole = sessionStorage.getItem('mockUserRole') as UserRole | null;
      const initialRole = savedRole || 'Admin';
      const initialUser = findUserByRole(initialRole);
      setUser(initialUser);
      setLoading(false);
      return; // End of mock auth logic
    }
    
    // Real Firebase auth logic
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
  }, [router, pathname]); // router and pathname are for real auth redirects

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
