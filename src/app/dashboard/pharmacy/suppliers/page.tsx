
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SupplierTable } from './components/supplier-table';
import { AddSupplierDialog } from './components/add-supplier-dialog';
import { mockSuppliers } from '@/lib/data';
import { Supplier } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useAuth } from '@/hooks/use-auth';

export default function SuppliersPage() {
    const { user } = useAuth();
    const [allSuppliers, setSuppliers] = useLocalStorage<Supplier[]>('suppliers', mockSuppliers);

    // SaaS LOGIC: Only show suppliers for the current hospital
    const hospitalSuppliers = React.useMemo(() => {
        if (!user) return [];
        return allSuppliers.filter(s => s.hospitalId === user.hospitalId);
    }, [allSuppliers, user]);

    const handleSupplierCreated = (newSupplier: Supplier) => {
        setSuppliers(prev => [...prev, newSupplier]);
    }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Supplier Management</h1>
          <p className="text-muted-foreground">
            Manage all hospital vendors and suppliers for <strong>{user?.hospitalId}</strong>.
          </p>
        </div>
        <AddSupplierDialog onSupplierCreated={handleSupplierCreated} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Supplier Directory</CardTitle>
          <CardDescription>
            A list of all registered suppliers for your facility.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupplierTable data={hospitalSuppliers} />
        </CardContent>
      </Card>
    </div>
  );
}
