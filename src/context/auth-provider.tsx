'use client';

import * as React from 'react';
import { User } from '@/lib/types';
import { allUsers } from '@/lib/data';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
}

export const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // In a real SaaS app, the hospitalId is retrieved from the Firebase Auth ID Token (Custom Claims)
    // For this prototype, we'll use the first user from our mock data which includes their hospitalId.
    const defaultUser = allUsers[0]; // Default to Admin at City General (hosp-1)
    setUser(defaultUser);
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
