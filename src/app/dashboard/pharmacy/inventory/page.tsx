
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { InventoryTable } from './components/inventory-table';

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = React.useState('');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pharmacy Inventory</h1>
          <p className="text-muted-foreground">
            A real-time overview of all medications and medical supplies.
          </p>
        </div>
        {/* Placeholder for future actions like "Add New Item" */}
      </div>

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
          <InventoryTable searchQuery={searchQuery} />
        </CardContent>
      </Card>
    </div>
  );
}
