
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PharmacyWorkQueue } from '../prescriptions/components/pharmacy-work-queue';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InventoryTable } from './inventory/components/inventory-table';
import { Input } from '@/components/ui/input';
import { ProcurementDashboard } from './procurement/components/procurement-dashboard';
import { useAuth } from '@/hooks/use-auth';
import { PointOfSaleDashboard } from './pos/components/pos-dashboard';

export default function PharmacyPage() {
  const { user } = useAuth();
  // Add a key to force re-render when a prescription is dispensed.
  const [key, setKey] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleDispense = () => {
    setKey(prev => prev + 1);
  };
  
  const canViewWorkQueue = user?.role === 'admin' || user?.role === 'pharmacist' || user?.role === 'doctor';
  const canViewInventory = user?.role === 'admin' || user?.role === 'pharmacist' || user?.role === 'doctor' || user?.role === 'nurse';
  const canViewProcurement = user?.role === 'admin' || user?.role === 'pharmacist';
  const canUsePos = user?.role === 'admin' || user?.role === 'pharmacist' || user?.role === 'billing_clerk';


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pharmacy Dashboard</h1>
        <p className="text-muted-foreground">
          View and manage all incoming prescription orders, inventory, and procurement.
        </p>
      </div>

       <Tabs defaultValue="work-queue">
        <TabsList className="h-auto flex-wrap justify-start">
            {canViewWorkQueue && <TabsTrigger value="work-queue">Prescription Work Queue</TabsTrigger>}
            {canViewInventory && <TabsTrigger value="inventory">Inventory</TabsTrigger>}
            {canUsePos && <TabsTrigger value="pos">Point of Sale</TabsTrigger>}
            {canViewProcurement && <TabsTrigger value="procurement">Procurement</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="work-queue" className="mt-4">
            <Card>
                <CardHeader>
                <CardTitle>Prescription Fulfillment Queue</CardTitle>
                <CardDescription>
                    A real-time list of all prescriptions waiting to be filled.
                </CardDescription>
                </CardHeader>
                <CardContent>
                    {canViewWorkQueue ? (
                        <PharmacyWorkQueue key={key} onDispense={handleDispense} />
                    ) : (
                        <p className="text-muted-foreground text-center p-4">You do not have permission to view this content.</p>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="inventory" className="mt-4">
             <Card>
                <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                    <CardTitle>Inventory Catalog</CardTitle>
                    <CardDescription>
                        Search and manage all items in the inventory.
                    </CardDescription>
                    </div>
                    <div className="w-full sm:w-auto">
                    <Input
                        placeholder="Search by item name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-sm"
                    />
                    </div>
                </div>
                </CardHeader>
                <CardContent>
                    {canViewInventory ? (
                        <InventoryTable searchQuery={searchQuery} />
                    ) : (
                        <p className="text-muted-foreground text-center p-4">You do not have permission to view this content.</p>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
        
         <TabsContent value="pos" className="mt-4">
            {canUsePos ? (
                <PointOfSaleDashboard />
            ) : (
                <Card><CardContent><p className="text-muted-foreground text-center p-4">You do not have permission to view this content.</p></CardContent></Card>
            )}
        </TabsContent>
        
        <TabsContent value="procurement" className="mt-4">
            {canViewProcurement ? (
                <ProcurementDashboard />
            ) : (
                <Card><CardContent><p className="text-muted-foreground text-center p-4">You do not have permission to view this content.</p></CardContent></Card>
            )}
        </TabsContent>

      </Tabs>
    </div>
  );
}
