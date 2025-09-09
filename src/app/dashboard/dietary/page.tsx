
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DietaryProfileManager } from './components/dietary-profile-manager';
import { MealOrdersDashboard } from './components/meal-orders-dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DietaryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dietary Management</h1>
        <p className="text-muted-foreground">
          Manage patient dietary profiles and track meal orders.
        </p>
      </div>

       <Tabs defaultValue="profiles">
        <TabsList>
            <TabsTrigger value="profiles">Patient Profiles</TabsTrigger>
            <TabsTrigger value="orders">Meal Orders</TabsTrigger>
        </TabsList>
        <TabsContent value="profiles" className="mt-4">
            <Card>
                <CardHeader>
                <CardTitle>Dietary Profiles</CardTitle>
                <CardDescription>
                    Select a patient to view and manage their dietary needs.
                </CardDescription>
                </CardHeader>
                <CardContent>
                    <DietaryProfileManager />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="orders" className="mt-4">
            <Card>
                <CardHeader>
                <CardTitle>Meal Order Queue</CardTitle>
                <CardDescription>
                    A real-time list of meal orders for the kitchen.
                </CardDescription>
                </CardHeader>
                <CardContent>
                    <MealOrdersDashboard />
                </CardContent>
            </Card>
        </TabsContent>
       </Tabs>
    </div>
  );
}
