'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface TenantInfo {
  hospitalId: string;
  hospitalName: string;
  role: string;
}

const TenantContext = createContext<TenantInfo | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [tenantInfo, setTenantInfo] = useState<TenantInfo>({
    hospitalId: '',
    hospitalName: '',
    role: '',
  });

  useEffect(() => {
    if (user) {
      setTenantInfo({
        hospitalId: user.hospitalId,
        hospitalName: (user as any).hospitalName || 'GamMed Facility', // Fallback if name isn't in user object
        role: user.role,
      });
    }
  }, [user]);

  return (
    <TenantContext.Provider value={tenantInfo}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
