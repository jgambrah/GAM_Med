
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AddMaintenanceRequestDialog } from '@/app/dashboard/admin/resources/components/add-maintenance-request-dialog';
import { MaintenanceDashboard } from './components/maintenance-dashboard';
import { SparePartsDashboard } from './components/spare-parts-dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


export default function MaintenancePage() {
  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold">Maintenance Dashboard</h1>
                <p className="text-muted-foreground">
                    A central hub for maintenance staff to track work orders and manage spare parts inventory.
                </p>
            </div>
            <AddMaintenanceRequestDialog />
       </div>
        <Tabs defaultValue="work-orders">
            <TabsList>
                <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
                <TabsTrigger value="spare-parts">Spare Parts</TabsTrigger>
            </TabsList>
            <TabsContent value="work-orders" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Maintenance Work Orders</CardTitle>
                        <CardDescription>A list of all open and resolved maintenance requests.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <MaintenanceDashboard />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="spare-parts" className="mt-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>Spare Parts Inventory</CardTitle>
                        <CardDescription>A real-time inventory of all maintenance spare parts.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SparePartsDashboard />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}
