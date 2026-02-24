'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PharmacyWorkQueue } from '../prescriptions/components/pharmacy-work-queue';
import { InventoryTable } from './inventory/components/inventory-table';
import { PointOfSaleDashboard } from './pos/components/pos-dashboard';
import { RfqDashboard } from './procurement/components/rfq-dashboard';
import { ProcurementDashboard } from './procurement/components/procurement-dashboard';
import { useAuth } from '@/hooks/use-auth';
import { Input } from '@/components/ui/input';
import { Pill } from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { PurchaseOrder, RequestForQuotation } from '@/lib/types';
import { mockPurchaseOrders, mockRfqs } from '@/lib/data';

/**
 * == Core Hospital Engine: Pharmacy Workbench ==
 * 
 * This is the central hub for pharmacists. It aggregates the live prescription 
 * queue from the EHR and the hospital's private inventory.
 */
export default function PharmacyPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [purchaseOrders, setPurchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', mockPurchaseOrders);
  const [rfqs, setRfqs] = useLocalStorage<RequestForQuotation[]>('rfqs', mockRfqs);

  const canViewWorkQueue = ['admin', 'pharmacist', 'doctor', 'director'].includes(user?.role || '');
  const canViewInventory = ['admin', 'pharmacist', 'doctor', 'nurse', 'director'].includes(user?.role || '');
  const canViewProcurement = ['admin', 'pharmacist', 'director'].includes(user?.role || '');
  const canUsePos = ['admin', 'pharmacist', 'billing_clerk', 'director'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Pill className="h-8 w-8 text-blue-600" />
            Pharmacy Operations
          </h1>
          <p className="text-muted-foreground">
            Inventory management and prescription fulfillment for <strong>{user?.hospitalId}</strong>.
          </p>
        </div>
      </div>

      <Tabs defaultValue="work-queue" className="w-full">
        <TabsList className="bg-muted/50 p-1 flex-wrap h-auto">
            {canViewWorkQueue && <TabsTrigger value="work-queue">Dispensing Queue</TabsTrigger>}
            {canViewInventory && <TabsTrigger value="inventory">Inventory Catalog</TabsTrigger>}
            {canUsePos && <TabsTrigger value="pos">OTC Point of Sale</TabsTrigger>}
            {canViewProcurement && <TabsTrigger value="rfq">Procurement (RFQs)</TabsTrigger>}
            {canViewProcurement && <TabsTrigger value="procurement">Purchase Orders</TabsTrigger>}
        </TabsList>
        
        {canViewWorkQueue && (
            <TabsContent value="work-queue" className="mt-4">
                <Card className="border-t-4 border-t-blue-500">
                    <CardHeader>
                        <CardTitle>Prescription Fulfillment</CardTitle>
                        <CardDescription>Live queue of pending orders from the clinical team.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PharmacyWorkQueue />
                    </CardContent>
                </Card>
            </TabsContent>
        )}
        
        {canViewInventory && (
            <TabsContent value="inventory" className="mt-4">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div>
                                <CardTitle>Drug & Supplies Registry</CardTitle>
                                <CardDescription>Hospital-wide stock levels and batch tracking.</CardDescription>
                            </div>
                            <div className="w-full sm:w-auto">
                                <Input
                                    placeholder="Search by drug name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="max-w-sm"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <InventoryTable searchQuery={searchQuery} />
                    </CardContent>
                </Card>
            </TabsContent>
        )}
        
        {canUsePos && (
            <TabsContent value="pos" className="mt-4">
                <PointOfSaleDashboard />
            </TabsContent>
        )}
        
        {canViewProcurement && (
            <TabsContent value="rfq" className="mt-4">
                <RfqDashboard 
                    rfqs={rfqs}
                    setRfqs={setRfqs}
                    setPurchaseOrders={setPurchaseOrders}
                />
            </TabsContent>
        )}
        
        {canViewProcurement && (
            <TabsContent value="procurement" className="mt-4">
                <ProcurementDashboard 
                    orders={purchaseOrders}
                    setOrders={setPurchaseOrders}
                />
            </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
