
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

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = React.useState<Supplier[]>(mockSuppliers);

    const handleSupplierCreated = (newSupplier: Supplier) => {
        setSuppliers(prev => [...prev, newSupplier]);
    }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Supplier Management</h1>
          <p className="text-muted-foreground">
            Manage all hospital vendors and suppliers.
          </p>
        </div>
        <AddSupplierDialog onSupplierCreated={handleSupplierCreated} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Supplier Directory</CardTitle>
          <CardDescription>
            A list of all registered suppliers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupplierTable data={suppliers} />
        </CardContent>
      </Card>
    </div>
  );
}
